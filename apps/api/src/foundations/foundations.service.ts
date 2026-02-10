import {
  ConflictException,
  Injectable,
  InternalServerErrorException
} from "@nestjs/common";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { PgService } from "../database/pg.service.js";
import { createLogger, enrichLogContext, getRequestContext } from "@shipwright/observability";

const WriteProbeSchema = z.object({
  orgId: z.string().uuid(),
  entityType: z.string().min(2),
  entityId: z.string().uuid(),
  action: z.string().min(2),
  metadata: z.record(z.unknown()).default({})
});

export type WriteProbeInput = z.infer<typeof WriteProbeSchema>;

@Injectable()
export class FoundationsService {
  private readonly logger = createLogger({ name: "api-foundations" });

  constructor(private readonly pg: PgService) {}

  async recordWrite(input: unknown, actorId: string, idempotencyKey: string) {
    const parsed = WriteProbeSchema.safeParse(input);
    if (!parsed.success) {
      throw new ConflictException({
        message: "invalid_payload",
        issues: parsed.error.issues
      });
    }

    const payload = parsed.data;
    const requestId = getRequestContext()?.requestId ?? randomUUID();

    const log = enrichLogContext(this.logger, {
      actor_id: actorId,
      entity_id: payload.entityId
    });

    try {
      const result = await this.pg.withTransaction(async (client) => {
        const endpoint = "/v1/foundations/write-probe";

        const insertKeyResult = await client.query<{
          id: string;
        }>(
          `insert into public.idempotency_keys (actor_id, key, endpoint)
           values ($1, $2, $3)
           on conflict (actor_id, endpoint, key) do nothing
           returning id`,
          [actorId, idempotencyKey, endpoint]
        );

        if (insertKeyResult.rowCount === 0) {
          const cached = await client.query<{
            response_code: number | null;
            response_body: Record<string, unknown> | null;
          }>(
            `select response_code, response_body
             from public.idempotency_keys
             where actor_id = $1 and endpoint = $2 and key = $3`,
            [actorId, endpoint, idempotencyKey]
          );

          if (cached.rowCount !== 1 || !cached.rows[0].response_body) {
            throw new ConflictException("idempotency_record_missing_response");
          }

          return {
            replay: true,
            responseCode: cached.rows[0].response_code ?? 200,
            body: cached.rows[0].response_body
          };
        }

        await client.query(
          `insert into public.audit_log (
            request_id,
            actor_id,
            org_id,
            entity_type,
            entity_id,
            action,
            metadata
          ) values ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
          [
            requestId,
            actorId,
            payload.orgId,
            payload.entityType,
            payload.entityId,
            payload.action,
            JSON.stringify(payload.metadata)
          ]
        );

        const outboxInsert = await client.query<{ id: string }>(
          `insert into public.outbox_messages (
            aggregate_type,
            aggregate_id,
            event_type,
            payload,
            idempotency_key
          ) values ($1, $2, $3, $4::jsonb, $5)
          returning id`,
          [
            payload.entityType,
            payload.entityId,
            "FOUNDATION_WRITE_RECORDED",
            JSON.stringify({
              actorId,
              orgId: payload.orgId,
              action: payload.action,
              metadata: payload.metadata,
              requestId
            }),
            idempotencyKey
          ]
        );

        const responseBody = {
          status: "accepted",
          requestId,
          outboxMessageId: outboxInsert.rows[0].id
        };

        await client.query(
          `update public.idempotency_keys
           set response_code = 201,
               response_body = $1::jsonb
           where actor_id = $2 and endpoint = $3 and key = $4`,
          [JSON.stringify(responseBody), actorId, endpoint, idempotencyKey]
        );

        return {
          replay: false,
          responseCode: 201,
          body: responseBody
        };
      });

      log.info(
        {
          request_id: requestId,
          entity_id: payload.entityId,
          org_id: payload.orgId,
          replay: result.replay
        },
        "write_probe_recorded"
      );

      return result;
    } catch (error) {
      log.error(
        {
          request_id: requestId,
          entity_id: payload.entityId,
          org_id: payload.orgId,
          err: error
        },
        "write_probe_failed"
      );

      if (error instanceof ConflictException) {
        throw error;
      }

      throw new InternalServerErrorException("write_probe_failed");
    }
  }
}
