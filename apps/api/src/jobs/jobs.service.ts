import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  CancelJobSchema,
  CreateJobRequestSchema,
  JobSchema,
  JobTrackingSchema,
  PaginatedJobsSchema,
  type JobDto,
  type JobTrackingDto,
  type PaginatedJobsDto
} from "@shipwright/contracts";
import { createLogger, enrichLogContext, getRequestContext } from "@shipwright/observability";
import type { PoolClient } from "pg";
import { PgService } from "../database/pg.service.js";
import { PaymentsService } from "../payments/payments.service.js";

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
  quote_id: string | null;
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

type TrackingJobRow = JobRow & {
  driver_user_id: string | null;
  driver_display_name: string | null;
  driver_latest_latitude: string | null;
  driver_latest_longitude: string | null;
  driver_last_location_at: string | null;
};

type CancelJobRow = JobRow & {
  operator_role: "BUSINESS_OPERATOR" | "ADMIN" | null;
};

type TimelineRow = {
  id: number;
  event_type: string;
  actor_id: string | null;
  created_at: string;
  payload: Record<string, unknown>;
};

const JOB_COLUMNS = `j.id, j.org_id, j.consumer_id, j.assigned_driver_id, j.quote_id, j.status,
  j.pickup_address, j.dropoff_address, j.pickup_latitude, j.pickup_longitude,
  j.dropoff_latitude, j.dropoff_longitude, j.distance_miles, j.eta_minutes,
  j.vehicle_required, j.customer_total_cents, j.driver_payout_gross_cents,
  j.platform_fee_cents, j.pricing_version, j.premium_distance_flag,
  j.created_by_user_id, j.created_at`;

const ACCESS_CONDITION = `(
  j.consumer_id = $2
  or exists (
    select 1
    from public.drivers d
    where d.id = j.assigned_driver_id
      and d.user_id = $2
  )
  or (
    j.org_id is not null
    and exists (
      select 1
      from public.org_memberships m
      where m.org_id = j.org_id
        and m.user_id = $2
        and m.is_active = true
        and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
    )
  )
)`;

const CANCELLABLE_JOB_STATUSES = ["REQUESTED", "ASSIGNED", "EN_ROUTE_PICKUP", "DISPATCH_FAILED"] as const;

@Injectable()
export class JobsService {
  private readonly logger = createLogger({ name: "api-jobs" });

  constructor(
    private readonly pg: PgService,
    private readonly payments: PaymentsService
  ) {}

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
             returning ${JOB_COLUMNS.replaceAll("j.", "")}`,
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

          await this.payments.createPaymentForJob(client, {
            jobId: job.id,
            consumerId: payload.consumerId,
            customerTotalCents: job.customer_total_cents,
            platformFeeCents: job.platform_fee_cents,
            payoutGrossCents: job.driver_payout_gross_cents,
            requestId
          });

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

  async getJob(jobId: string, userId: string): Promise<JobDto> {
    const row = await this.loadAuthorizedJob(jobId, userId);
    return this.mapJob(row);
  }

  async listBusinessJobs(userId: string, page: number, limit: number): Promise<PaginatedJobsDto> {
    const safePage = this.normalizePage(page);
    const safeLimit = this.normalizeLimit(limit);
    const offset = (safePage - 1) * safeLimit;

    const result = await this.pg.query<JobRow>(
      `select ${JOB_COLUMNS}
       from public.jobs j
       where j.org_id is not null
         and exists (
           select 1
           from public.org_memberships m
           where m.org_id = j.org_id
             and m.user_id = $1
             and m.is_active = true
             and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
         )
       order by j.created_at desc
       limit $2 offset $3`,
      [userId, safeLimit + 1, offset]
    );

    const items = result.rows.slice(0, safeLimit).map((row) => this.mapJob(row));
    return PaginatedJobsSchema.parse({
      items,
      page: safePage,
      limit: safeLimit,
      hasMore: result.rows.length > safeLimit
    });
  }

  async getTracking(jobId: string, userId: string): Promise<JobTrackingDto> {
    const job = await this.loadAuthorizedTrackingJob(jobId, userId);
    const timeline = await this.pg.query<TimelineRow>(
      `select id, event_type, actor_id, created_at, payload
       from public.job_events
       where job_id = $1
       order by created_at desc
       limit 20`,
      [jobId]
    );

    return JobTrackingSchema.parse({
      jobId: job.id,
      status: job.status,
      pickup: {
        address: job.pickup_address,
        coordinates: {
          latitude: Number(job.pickup_latitude),
          longitude: Number(job.pickup_longitude)
        }
      },
      dropoff: {
        address: job.dropoff_address,
        coordinates: {
          latitude: Number(job.dropoff_latitude),
          longitude: Number(job.dropoff_longitude)
        }
      },
      etaMinutes: job.eta_minutes,
      premiumDistanceFlag: job.premium_distance_flag,
      assignedDriver:
        job.assigned_driver_id && job.driver_user_id && job.driver_display_name
          ? {
              driverId: job.assigned_driver_id,
              userId: job.driver_user_id,
              displayName: job.driver_display_name,
              latestLocation:
                job.driver_latest_latitude && job.driver_latest_longitude
                  ? {
                      latitude: Number(job.driver_latest_latitude),
                      longitude: Number(job.driver_latest_longitude)
                    }
                  : null,
              lastLocationAt: job.driver_last_location_at
            }
          : null,
      timeline: timeline.rows.map((event) => ({
        id: event.id,
        eventType: event.event_type,
        actorId: event.actor_id,
        createdAt: event.created_at,
        payload: event.payload
      }))
    });
  }

  async cancelJob(jobId: string, input: unknown, userId: string, idempotencyKey: string) {
    const parsed = CancelJobSchema.safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        message: "invalid_job_cancel_payload",
        issues: parsed.error.issues
      });
    }

    const requestId = getRequestContext()?.requestId ?? randomUUID();

    return this.pg.withIdempotency({
      actorId: userId,
      endpoint: `/v1/jobs/${jobId}/cancel`,
      idempotencyKey,
      execute: async (client) => {
        const jobResult = await client.query<CancelJobRow>(
          `select ${JOB_COLUMNS},
                  (
                    select m.role::text
                    from public.org_memberships m
                    where m.org_id = j.org_id
                      and m.user_id = $2
                      and m.is_active = true
                      and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
                    limit 1
                  ) as operator_role
           from public.jobs j
           where j.id = $1
           for update`,
          [jobId, userId]
        );

        if ((jobResult.rowCount ?? 0) !== 1) {
          throw new NotFoundException("job_not_found");
        }

        const job = jobResult.rows[0];
        const actorRole = job.operator_role ?? (job.consumer_id === userId ? "CONSUMER" : null);
        if (!actorRole) {
          throw new ForbiddenException("job_cancel_not_allowed");
        }

        if (!CANCELLABLE_JOB_STATUSES.includes(job.status as (typeof CANCELLABLE_JOB_STATUSES)[number])) {
          throw new ConflictException("job_not_cancelable");
        }

        const settlement = await this.payments.previewCancellationSettlementForJob(client, {
          jobId,
          jobStatus: job.status,
          driverPayoutGrossCents: job.driver_payout_gross_cents
        });

        const updated = await client.query<JobRow>(
          `update public.jobs
           set status = 'CANCELLED',
               cancelled_at = now(),
               cancelled_by_user_id = $1,
               cancellation_reason = $2,
               cancellation_actor_role = $3,
               cancellation_settlement_code = $4,
               cancellation_settlement_note = $5,
               cancellation_fee_cents = $6,
               cancellation_refund_cents = $7,
               cancellation_settlement_snapshot = $8::jsonb,
               updated_at = now()
           where id = $9
           returning ${JOB_COLUMNS.replaceAll("j.", "")}`,
          [
            userId,
            parsed.data.reason,
            actorRole,
            settlement.settlementCode,
            parsed.data.settlementNote ?? null,
            settlement.cancellationFeeCents,
            settlement.refundAmountCents,
            JSON.stringify(settlement.snapshot),
            jobId
          ]
        );

        if (job.assigned_driver_id) {
          await client.query(
            `update public.drivers
             set active_job_id = null
             where id = $1
               and active_job_id = $2`,
            [job.assigned_driver_id, jobId]
          );
        }

        await client.query(
          `update public.job_offers
           set status = 'EXPIRED',
               responded_at = coalesce(responded_at, now())
           where job_id = $1
             and status = 'OFFERED'`,
          [jobId]
        );

        await this.insertJobEvent(client, {
          jobId,
          eventType: "JOB_CANCELLED",
          actorId: userId,
          payload: {
            requestId,
            fromStatus: job.status,
            reason: parsed.data.reason,
            actorRole,
            settlementPolicyCode: settlement.settlementCode
          }
        });

        await this.insertAuditLog(client, {
          requestId,
          actorId: userId,
          orgId: job.org_id,
          entityType: "job",
          entityId: jobId,
          action: "job_cancelled",
          metadata: {
            fromStatus: job.status,
            reason: parsed.data.reason,
            actorRole,
            settlementPolicyCode: settlement.settlementCode,
            settlementNote: parsed.data.settlementNote ?? null
          }
        });

        await this.insertOutboxMessage(client, {
          aggregateType: "job",
          aggregateId: jobId,
          eventType: "NOTIFY_JOB_CANCELLED",
          payload: {
            requestId,
            jobId,
            actorId: userId,
            actorRole,
            reason: parsed.data.reason,
            status: "CANCELLED"
          },
          idempotencyKey: `notify-job-cancelled:${jobId}:${idempotencyKey}`
        });

        await this.payments.enqueueCancellationSettlement(client, {
          jobId,
          requestId,
          idempotencyKey
        });

        return {
          responseCode: 200,
          body: this.mapJob(updated.rows[0])
        };
      }
    });
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

    if ((result.rowCount ?? 0) !== 1) {
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

    if ((membership.rowCount ?? 0) === 0) {
      throw new ForbiddenException("org_operator_required");
    }
  }

  private async loadAuthorizedJob(jobId: string, userId: string) {
    const result = await this.pg.query<JobRow>(
      `select ${JOB_COLUMNS}
       from public.jobs j
       where j.id = $1
         and ${ACCESS_CONDITION}`,
      [jobId, userId]
    );

    if ((result.rowCount ?? 0) !== 1) {
      throw new NotFoundException("job_not_found");
    }

    return result.rows[0];
  }

  private async loadAuthorizedTrackingJob(jobId: string, userId: string) {
    const result = await this.pg.query<TrackingJobRow>(
      `select ${JOB_COLUMNS},
              du.id as driver_user_id,
              du.display_name as driver_display_name,
              d.latest_latitude as driver_latest_latitude,
              d.latest_longitude as driver_latest_longitude,
              d.last_location_at as driver_last_location_at
       from public.jobs j
       left join public.drivers d on d.id = j.assigned_driver_id
       left join public.users du on du.id = d.user_id
       where j.id = $1
         and ${ACCESS_CONDITION}`,
      [jobId, userId]
    );

    if ((result.rowCount ?? 0) !== 1) {
      throw new NotFoundException("job_not_found");
    }

    return result.rows[0];
  }

  private normalizePage(page: number) {
    return Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  }

  private normalizeLimit(limit: number) {
    if (!Number.isFinite(limit)) {
      return 20;
    }

    return Math.min(Math.max(Math.floor(limit), 1), 100);
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

  private async insertOutboxMessage(
    client: PoolClient,
    input: {
      aggregateType: string;
      aggregateId: string;
      eventType: string;
      payload: Record<string, unknown>;
      idempotencyKey: string;
      nextAttemptAt?: string;
    }
  ) {
    await client.query(
      `insert into public.outbox_messages (
         aggregate_type,
         aggregate_id,
         event_type,
         payload,
         idempotency_key,
         next_attempt_at
       ) values ($1, $2, $3, $4::jsonb, $5, coalesce($6::timestamptz, now()))
       on conflict (event_type, idempotency_key) do nothing`,
      [
        input.aggregateType,
        input.aggregateId,
        input.eventType,
        JSON.stringify(input.payload),
        input.idempotencyKey,
        input.nextAttemptAt ?? null
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
