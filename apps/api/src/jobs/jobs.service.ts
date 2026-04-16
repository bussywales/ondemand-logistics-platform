import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnprocessableEntityException
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  CreateJobRequestSchema,
  JobSchema,
  type JobDto
} from "@shipwright/contracts";
import { createLogger, enrichLogContext, getRequestContext } from "@shipwright/observability";
import type { PoolClient } from "pg";
import { PgService } from "../database/pg.service.js";

type QuoteRecord = {
  id: string;
  org_id: string | null;
  created_by_user_id: string;
  distance_miles: string;
  eta_minutes: number;
  vehicle_type: string;
  customer_total_cents: number;
  driver_payout_gross_cents: number;
  platform_fee_cents: number;
  pricing_version: string;
  premium_distance_flag: boolean;
};

type JobRow = {
  id: string;
  org_id: string | null;
  consumer_id: string;
  assigned_driver_id: string | null;
  quote_id: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_latitude: string;
  pickup_longitude: string;
  dropoff_latitude: string;
  dropoff_longitude: string;
  distance_miles: string;
  eta_minutes: number;
  vehicle_required: string;
  customer_total_cents: number;
  driver_payout_gross_cents: number;
  platform_fee_cents: number;
  pricing_version: string;
  premium_distance_flag: boolean;
  created_by_user_id: string;
  created_at: string;
};

@Injectable()
export class JobsService {
  private readonly logger = createLogger({ name: "api-jobs" });

  constructor(private readonly pg: PgService) {}

  async createJobRequest(input: unknown, userId: string, idempotencyKey: string) {
    const parsed = CreateJobRequestSchema.safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        message: "invalid_job_request_payload",
        issues: parsed.error.issues
      });
    }

    const payload = parsed.data;
    const quote = await this.loadQuote(payload.quoteId);
    const orgId = payload.orgId ?? quote.org_id;

    if (quote.org_id !== orgId) {
      throw new ConflictException("quote_org_mismatch");
    }

    if (orgId) {
      await this.assertOrgOperator(orgId, userId);
    } else if (payload.consumerId !== userId || quote.created_by_user_id !== userId) {
      throw new ForbiddenException("consumer_job_must_be_self_created");
    }

    const requestId = getRequestContext()?.requestId ?? randomUUID();
    const log = enrichLogContext(this.logger, { actor_id: userId, entity_id: payload.quoteId });

    const result = await this.pg.withIdempotency({
      actorId: userId,
      endpoint: "/v1/jobs",
      idempotencyKey,
      execute: async (client) => {
        try {
          const inserted = await client.query<JobRow>(
            `insert into public.jobs (
               org_id,
               consumer_id,
               status,
               pickup_address,
               dropoff_address,
               pickup_latitude,
               pickup_longitude,
               dropoff_latitude,
               dropoff_longitude,
               distance_miles,
               eta_minutes,
               customer_total_cents,
               driver_payout_gross_cents,
               platform_fee_cents,
               vehicle_required,
               quote_id,
               idempotency_key,
               created_by_user_id,
               pricing_version,
               premium_distance_flag,
               dispatch_requested_at
             ) values (
               $1, $2, 'REQUESTED', $3, $4, $5, $6, $7, $8,
               $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, now()
             )
             returning id, org_id, consumer_id, assigned_driver_id, quote_id, status,
               pickup_address, dropoff_address, pickup_latitude, pickup_longitude,
               dropoff_latitude, dropoff_longitude, distance_miles, eta_minutes,
               vehicle_required, customer_total_cents, driver_payout_gross_cents,
               platform_fee_cents, pricing_version, premium_distance_flag,
               created_by_user_id, created_at`,
            [
              orgId ?? null,
              payload.consumerId,
              payload.pickupAddress,
              payload.dropoffAddress,
              payload.pickupCoordinates.latitude,
              payload.pickupCoordinates.longitude,
              payload.dropoffCoordinates.latitude,
              payload.dropoffCoordinates.longitude,
              Number(quote.distance_miles),
              quote.eta_minutes,
              quote.customer_total_cents,
              quote.driver_payout_gross_cents,
              quote.platform_fee_cents,
              quote.vehicle_type,
              quote.id,
              idempotencyKey,
              userId,
              quote.pricing_version,
              quote.premium_distance_flag
            ]
          );

          const job = inserted.rows[0];
          await this.insertJobEvent(client, {
            jobId: job.id,
            eventType: "JOB_REQUESTED",
            actorId: userId,
            payload: {
              requestId,
              quoteId: quote.id,
              premiumDistanceFlag: quote.premium_distance_flag
            }
          });

          await this.insertAuditLog(client, {
            requestId,
            actorId: userId,
            orgId,
            entityType: "job",
            entityId: job.id,
            action: "job_requested",
            metadata: {
              quoteId: quote.id,
              consumerId: payload.consumerId,
              vehicleRequired: quote.vehicle_type
            }
          });

          await client.query(
            `insert into public.outbox_messages (
               aggregate_type,
               aggregate_id,
               event_type,
               payload,
               idempotency_key
             ) values ($1, $2, $3, $4::jsonb, $5)`,
            [
              "job",
              job.id,
              "JOB_DISPATCH_REQUESTED",
              JSON.stringify({
                jobId: job.id,
                requestId,
                trigger: "job_requested"
              }),
              `dispatch:${job.id}`
            ]
          );

          return {
            responseCode: 201,
            body: this.mapJob(job)
          };
        } catch (error) {
          if ((error as { code?: string }).code === "23505") {
            throw new ConflictException("quote_already_used_or_duplicate_job");
          }
          throw error;
        }
      }
    });

    log.info({ replay: result.replay, quote_id: quote.id }, "job_requested");
    return result;
  }

  private async loadQuote(quoteId: string) {
    const result = await this.pg.query<QuoteRecord>(
      `select id, org_id, created_by_user_id, distance_miles, eta_minutes, vehicle_type,
              customer_total_cents, driver_payout_gross_cents, platform_fee_cents,
              pricing_version, premium_distance_flag
       from public.quotes
       where id = $1`,
      [quoteId]
    );

    if (result.rowCount !== 1) {
      throw new ConflictException("quote_not_found");
    }

    return result.rows[0];
  }

  private async assertOrgOperator(orgId: string, userId: string) {
    const membership = await this.pg.query(
      `select 1
       from public.org_memberships
       where org_id = $1 and user_id = $2 and is_active = true
         and role in ('BUSINESS_OPERATOR', 'ADMIN')`,
      [orgId, userId]
    );

    if (membership.rowCount === 0) {
      throw new ForbiddenException("org_operator_required");
    }
  }

  private async insertJobEvent(
    client: PoolClient,
    input: { jobId: string; eventType: string; actorId: string | null; payload: Record<string, unknown> }
  ) {
    await client.query(
      `insert into public.job_events (job_id, event_type, payload, actor_id)
       values ($1, $2, $3::jsonb, $4)`,
      [input.jobId, input.eventType, JSON.stringify(input.payload), input.actorId]
    );
  }

  private async insertAuditLog(
    client: PoolClient,
    input: {
      requestId: string;
      actorId: string | null;
      orgId: string | null;
      entityType: string;
      entityId: string;
      action: string;
      metadata: Record<string, unknown>;
    }
  ) {
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
        input.requestId,
        input.actorId,
        input.orgId,
        input.entityType,
        input.entityId,
        input.action,
        JSON.stringify(input.metadata)
      ]
    );
  }

  private mapJob(row: JobRow): JobDto {
    return JobSchema.parse({
      id: row.id,
      orgId: row.org_id,
      consumerId: row.consumer_id,
      assignedDriverId: row.assigned_driver_id,
      quoteId: row.quote_id,
      status: row.status,
      pickupAddress: row.pickup_address,
      dropoffAddress: row.dropoff_address,
      pickupCoordinates: {
        latitude: Number(row.pickup_latitude),
        longitude: Number(row.pickup_longitude)
      },
      dropoffCoordinates: {
        latitude: Number(row.dropoff_latitude),
        longitude: Number(row.dropoff_longitude)
      },
      distanceMiles: Number(row.distance_miles),
      etaMinutes: row.eta_minutes,
      vehicleRequired: row.vehicle_required,
      customerTotalCents: row.customer_total_cents,
      driverPayoutGrossCents: row.driver_payout_gross_cents,
      platformFeeCents: row.platform_fee_cents,
      pricingVersion: row.pricing_version,
      premiumDistanceFlag: row.premium_distance_flag,
      createdByUserId: row.created_by_user_id,
      createdAt: row.created_at
    });
  }
}
