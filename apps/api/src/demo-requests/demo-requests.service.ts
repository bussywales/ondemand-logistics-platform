import { Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import type { PoolClient } from "pg";
import { z } from "zod";
import {
  CreateDemoRequestSchema,
  DemoRequestListSchema,
  DemoRequestSchema,
  DemoRequestStatusSchema,
  UpdateDemoRequestSchema,
  type CreateDemoRequestInput,
  type DemoRequestDto,
  type DemoRequestStatus,
  type UpdateDemoRequestInput
} from "@shipwright/contracts";
import { toIsoDateTime } from "../database/mapper.js";
import { PgService } from "../database/pg.service.js";

const ListDemoRequestsFilterSchema = z.object({
  status: DemoRequestStatusSchema.optional()
});

type DemoRequestRow = {
  id: string;
  name: string;
  email: string;
  organisation: string | null;
  role: string | null;
  interest_type: string;
  message: string | null;
  source: string | null;
  status: string;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
};

function nullableText(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function mapDemoRequest(row: DemoRequestRow): DemoRequestDto {
  return DemoRequestSchema.parse({
    id: row.id,
    name: row.name,
    email: row.email,
    organisation: row.organisation,
    role: row.role,
    interestType: row.interest_type,
    message: row.message,
    source: row.source,
    status: row.status,
    adminNote: row.admin_note,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at ? toIsoDateTime(row.reviewed_at) : null,
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at)
  });
}

async function enqueueAdminDemoRequestNotification(client: PoolClient, row: DemoRequestRow) {
  await client.query(
    `insert into public.outbox_messages (
       aggregate_type,
       aggregate_id,
       event_type,
       payload,
       idempotency_key
     )
     values ($1, $2, $3, $4::jsonb, $5)
     on conflict (event_type, idempotency_key) do nothing`,
    [
      "demo_request",
      row.id,
      "NOTIFY_ADMIN_DEMO_REQUEST_CREATED",
      JSON.stringify({
        demoRequestId: row.id,
        interestType: row.interest_type,
        organisation: row.organisation,
        requesterName: row.name,
        requesterEmail: row.email,
        createdAt: toIsoDateTime(row.created_at)
      }),
      `demo-request-created:${row.id}`
    ]
  );
}

@Injectable()
export class DemoRequestsService {
  constructor(private readonly pg: PgService) {}

  async createDemoRequest(rawInput: unknown): Promise<DemoRequestDto> {
    const parsed = CreateDemoRequestSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new UnprocessableEntityException({ message: "invalid_demo_request_payload", issues: parsed.error.issues });
    }

    const input = parsed.data;
    if (input.website && input.website.trim().length > 0) {
      throw new UnprocessableEntityException("demo_request_rejected");
    }

    return this.pg.withTransaction(async (client) => {
      const result = await client.query<DemoRequestRow>(
        `insert into public.demo_requests (
            name,
            email,
            organisation,
            role,
            interest_type,
            message,
            source
         )
         values ($1, $2, $3, $4, $5, $6, coalesce($7, 'landing_page'))
         returning *`,
        [
          input.name.trim(),
          input.email.trim().toLowerCase(),
          nullableText(input.organisation),
          nullableText(input.role),
          input.interestType,
          nullableText(input.message),
          nullableText(input.source)
        ]
      );

      const row = result.rows[0];
      if (!row) {
        throw new UnprocessableEntityException("demo_request_create_failed");
      }

      await enqueueAdminDemoRequestNotification(client, row);

      return mapDemoRequest(row);
    });
  }

  async listAdminDemoRequests(rawQuery: Record<string, string | undefined>) {
    const parsed = ListDemoRequestsFilterSchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw new UnprocessableEntityException("invalid_demo_request_filter");
    }

    const filters = parsed.data;
    const values: unknown[] = [];
    const where: string[] = [];
    if (filters.status) {
      values.push(filters.status);
      where.push(`status = $${values.length}`);
    }

    const result = await this.pg.query<DemoRequestRow>(
      `select *
       from public.demo_requests
       ${where.length ? `where ${where.join(" and ")}` : ""}
       order by created_at desc
       limit 100`,
      values
    );

    return DemoRequestListSchema.parse({ items: result.rows.map(mapDemoRequest) });
  }

  async updateAdminDemoRequest(userId: string, id: string, rawInput: unknown): Promise<DemoRequestDto> {
    const parsed = UpdateDemoRequestSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new UnprocessableEntityException(parsed.error.issues[0]?.message ?? "invalid_demo_request_update");
    }

    const input: UpdateDemoRequestInput = parsed.data;
    const result = await this.pg.query<DemoRequestRow>(
      `update public.demo_requests
       set status = coalesce($2, status),
           admin_note = case when $3::boolean then $4 else admin_note end,
           reviewed_by = $5,
           reviewed_at = now()
       where id = $1
       returning *`,
      [
        id,
        input.status ?? null,
        Object.prototype.hasOwnProperty.call(input, "adminNote"),
        nullableText(input.adminNote),
        userId
      ]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("demo_request_not_found");
    }

    return mapDemoRequest(row);
  }
}

export type { CreateDemoRequestInput, DemoRequestStatus, UpdateDemoRequestInput };
