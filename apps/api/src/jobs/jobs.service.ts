import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  CancelJobSchema,
  CreateDispatchOverrideSchema,
  CreateJobRequestSchema,
  DispatchAuditListSchema,
  EligibleDriverListSchema,
  JobSchema,
  JobTrackingSchema,
  PaginatedJobsSchema,
  ReassignJobSchema,
  type CreateDispatchOverrideInput,
  type DispatchAuditListDto,
  type DispatchCourierAffiliationDto,
  type DispatchOverrideEventDto,
  type DispatchOverrideType,
  type EligibleDriverDto,
  type JobAttentionLevel,
  type JobDto,
  type JobTrackingDto,
  type PaginatedJobsDto
} from "@shipwright/contracts";
import { createLogger, enrichLogContext, getRequestContext } from "@shipwright/observability";
import type { PoolClient } from "pg";
import { toFiniteNumber, toInteger, toIsoDateTime, toNullableIsoDateTime } from "../database/mapper.js";
import { PgService } from "../database/pg.service.js";
import { PaymentsService } from "../payments/payments.service.js";
import { DispatchRecoveryService } from "../briefing/dispatch-recovery.service.js";
import { IncidentIntelligenceService } from "../briefing/incident-intelligence.service.js";

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
  created_at: string | Date;
  dispatch_requested_at: string | Date;
  dispatch_failed_at: string | Date | null;
  updated_at: string | Date;
};

type TrackingJobRow = JobRow & {
  driver_user_id: string | null;
  driver_display_name: string | null;
  driver_latest_latitude: string | null;
  driver_latest_longitude: string | null;
  driver_last_location_at: string | Date | null;
};

type CancelJobRow = JobRow & {
  operator_role: "BUSINESS_OPERATOR" | "ADMIN" | null;
};

type OperatorJobRow = JobRow & {
  operator_role: "BUSINESS_OPERATOR" | "ADMIN" | null;
};

type TimelineRow = {
  id: number | string;
  event_type: string;
  actor_id: string | null;
  created_at: string | Date;
  payload: Record<string, unknown>;
};

type DispatchAttemptRow = {
  id: string;
  attempt_number: number;
  trigger_source: string;
  outcome: string;
  driver_id: string | null;
  driver_display_name: string | null;
  offer_id: string | null;
  notes: string | null;
  created_at: string | Date;
};

type EligibleDriverRow = {
  driver_id: string;
  display_name: string;
  is_active: boolean;
  availability_status: "ONLINE" | "OFFLINE";
  latest_latitude: string | null;
  latest_longitude: string | null;
  last_location_at: string | Date | null;
  active_job_id: string | null;
  active_job_status: string | null;
  verification_status: "APPROVED" | "PENDING" | "REJECTED" | "MISSING";
  vehicle_type: "BIKE" | "CAR" | null;
  has_matching_vehicle: boolean;
  has_open_offer: boolean;
  distance_miles: string | null;
};

type DispatchAuditRow = {
  id: string | number;
  org_id: string | null;
  org_name: string | null;
  job_id: string;
  order_id: string | null;
  event_type: string;
  actor_id: string | null;
  actor_label: string | null;
  previous_driver_id: string | null;
  previous_driver_name: string | null;
  previous_driver_fleet_org_id: string | null;
  previous_driver_fleet_org_name: string | null;
  previous_driver_fleet_role: string | null;
  new_driver_id: string | null;
  new_driver_name: string | null;
  new_driver_fleet_org_id: string | null;
  new_driver_fleet_org_name: string | null;
  new_driver_fleet_role: string | null;
  created_at: string | Date;
  payload: Record<string, unknown>;
};

const JOB_COLUMNS = `j.id, j.org_id, j.consumer_id, j.assigned_driver_id, j.quote_id, j.status,
  j.pickup_address, j.dropoff_address, j.pickup_latitude, j.pickup_longitude,
  j.dropoff_latitude, j.dropoff_longitude, j.distance_miles, j.eta_minutes,
  j.vehicle_required, j.customer_total_cents, j.driver_payout_gross_cents,
  j.platform_fee_cents, j.pricing_version, j.premium_distance_flag,
  j.created_by_user_id, j.created_at, j.dispatch_requested_at, j.dispatch_failed_at, j.updated_at`;

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
const RETRYABLE_JOB_STATUSES = ["REQUESTED", "DISPATCH_FAILED"] as const;
const REASSIGNABLE_JOB_STATUSES = ["REQUESTED", "ASSIGNED", "DISPATCH_FAILED"] as const;
const DISPATCH_AUDIT_EVENT_TYPES = [
  "JOB_REASSIGNED",
  "DISPATCH_OVERRIDE_APPLIED",
  "DISPATCH_MANUAL_RECOVERY_NOTE",
  "DISPATCH_REVIEWED",
  "DISPATCH_BLOCKED",
  "JOB_DISPATCH_RETRIED"
] as const;
const DISPATCH_OFFER_TTL_SECONDS = Number(process.env.DISPATCH_OFFER_TTL_SECONDS ?? 30);
const DISPATCH_OVERRIDE_CONFIRMATION = "CONFIRM DISPATCH OVERRIDE";

@Injectable()
export class JobsService {
  private readonly logger = createLogger({ name: "api-jobs" });

  constructor(
    private readonly pg: PgService,
    private readonly payments: PaymentsService,
    private readonly recoveryService?: DispatchRecoveryService,
    private readonly incidentService?: IncidentIntelligenceService
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
    const consumerId = payload.consumerId ?? userId;

    if (quote.org_id !== orgId) {
      throw new ConflictException("quote_org_mismatch");
    }

    if (orgId) {
      await this.assertOrgOperator(orgId, userId);
      if (payload.consumerId && payload.consumerId !== userId) {
        throw new ForbiddenException("business_job_consumer_must_match_actor");
      }
    } else if (consumerId !== userId || quote.created_by_user_id !== userId) {
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
              consumerId,
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
              consumerId,
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
            consumerId,
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
    const attention = this.computeAttention(job);
    const [dispatchAttempts, timeline, recoverySuggestion, incidentSummary] = await Promise.all([
      this.loadDispatchAttempts(jobId),
      this.pg.query<TimelineRow>(
        `select id, event_type, actor_id, created_at, payload
         from public.job_events
         where job_id = $1
         order by created_at asc
         limit 100`,
        [jobId]
      ),
      this.recoveryService?.getBusinessRecoverySuggestion(jobId, userId) ?? Promise.resolve(null),
      this.incidentService?.getBusinessIncidentSummary(jobId, userId) ?? Promise.resolve(null)
    ]);

    return JobTrackingSchema.parse({
      jobId: job.id,
      status: job.status,
      attentionLevel: attention.level,
      attentionReason: attention.reason,
      pickup: {
        address: job.pickup_address,
        coordinates: {
          latitude: toFiniteNumber(job.pickup_latitude, "job.pickup_latitude"),
          longitude: toFiniteNumber(job.pickup_longitude, "job.pickup_longitude")
        }
      },
      dropoff: {
        address: job.dropoff_address,
        coordinates: {
          latitude: toFiniteNumber(job.dropoff_latitude, "job.dropoff_latitude"),
          longitude: toFiniteNumber(job.dropoff_longitude, "job.dropoff_longitude")
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
                      latitude: toFiniteNumber(job.driver_latest_latitude, "job.driver_latest_latitude"),
                      longitude: toFiniteNumber(job.driver_latest_longitude, "job.driver_latest_longitude")
                    }
                  : null,
              lastLocationAt: toNullableIsoDateTime(job.driver_last_location_at)
            }
          : null,
      dispatchAttempts,
      timeline: timeline.rows.map((event) => ({
        id: toInteger(event.id, "job_event.id"),
        eventType: event.event_type,
        actorId: event.actor_id,
        createdAt: toIsoDateTime(event.created_at),
        payload: event.payload
      })),
      recoverySuggestion,
      incidentSummary
    });
  }

  async retryDispatch(jobId: string, userId: string, idempotencyKey: string) {
    const requestId = getRequestContext()?.requestId ?? randomUUID();

    return this.pg.withIdempotency({
      actorId: userId,
      endpoint: `/v1/jobs/${jobId}/retry-dispatch`,
      idempotencyKey,
      execute: async (client) => {
        const job = await this.loadOperatorJobForUpdate(client, jobId, userId);

        if (!RETRYABLE_JOB_STATUSES.includes(job.status as (typeof RETRYABLE_JOB_STATUSES)[number])) {
          throw new ConflictException("job_not_retryable");
        }

        if (job.assigned_driver_id) {
          throw new ConflictException("job_already_assigned");
        }

        if (await this.hasOpenOffer(client, jobId)) {
          throw new ConflictException("job_dispatch_already_in_progress");
        }

        const updated = await client.query<JobRow>(
          `update public.jobs
           set status = 'REQUESTED',
               dispatch_requested_at = now(),
               dispatch_failed_at = null,
               updated_at = now()
           where id = $1
           returning ${JOB_COLUMNS.replaceAll("j.", "")}`,
          [jobId]
        );

        await this.insertJobEvent(client, {
          jobId,
          eventType: "JOB_DISPATCH_RETRIED",
          actorId: userId,
          payload: {
            requestId,
            previousStatus: job.status
          }
        });

        await this.insertAuditLog(client, {
          requestId,
          actorId: userId,
          orgId: job.org_id,
          entityType: "job",
          entityId: jobId,
          action: "job_dispatch_retried",
          metadata: {
            previousStatus: job.status
          }
        });

        await this.insertOutboxMessage(client, {
          aggregateType: "job",
          aggregateId: jobId,
          eventType: "JOB_DISPATCH_REQUESTED",
          payload: {
            jobId,
            requestId,
            trigger: "operator_retry"
          },
          idempotencyKey: `dispatch-retry:${jobId}:${idempotencyKey}`
        });

        return {
          responseCode: 200,
          body: this.mapJob(updated.rows[0])
        };
      }
    });
  }

  async reassignDriver(jobId: string, input: unknown, userId: string, idempotencyKey: string) {
    const parsed = ReassignJobSchema.safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        message: "invalid_job_reassign_payload",
        issues: parsed.error.issues
      });
    }

    const requestId = getRequestContext()?.requestId ?? randomUUID();

    return this.pg.withIdempotency({
      actorId: userId,
      endpoint: `/v1/jobs/${jobId}/reassign-driver`,
      idempotencyKey,
      execute: async (client) => {
        const job = await this.loadOperatorJobForUpdate(client, jobId, userId);

        if (!REASSIGNABLE_JOB_STATUSES.includes(job.status as (typeof REASSIGNABLE_JOB_STATUSES)[number])) {
          throw new ConflictException("job_not_reassignable");
        }

        const driver = await this.loadEligibleDriverForReassign(
          client,
          parsed.data.driverId,
          jobId,
          job.vehicle_required
        );

        if (job.assigned_driver_id) {
          await client.query(
            `update public.drivers
             set active_job_id = null,
                 availability_status = 'ONLINE',
                 available_since = now()
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
             and status in ('OFFERED', 'ACCEPTED')`,
          [jobId]
        );

        const updated = await client.query<JobRow>(
          `update public.jobs
           set status = 'REQUESTED',
               assigned_driver_id = null,
               dispatch_requested_at = now(),
               dispatch_failed_at = null,
               updated_at = now()
           where id = $1
           returning ${JOB_COLUMNS.replaceAll("j.", "")}`,
          [jobId]
        );

        const offer = await client.query<{ id: string }>(
          `insert into public.job_offers (
             job_id,
             driver_id,
             offered_at,
             expires_at,
             status,
             payout_gross_snapshot,
             distance_miles_snapshot,
             eta_minutes_snapshot
           ) values (
             $1,
             $2,
             now(),
             now() + make_interval(secs => $3),
             'OFFERED',
             $4,
             $5,
             $6
           )
           returning id`,
          [
            jobId,
            driver.driver_id,
            DISPATCH_OFFER_TTL_SECONDS,
            updated.rows[0].driver_payout_gross_cents,
            Number(updated.rows[0].distance_miles),
            updated.rows[0].eta_minutes
          ]
        );

        const attemptNumber = await this.nextDispatchAttemptNumber(client, jobId);
        await this.insertDispatchAttempt(client, {
          jobId,
          attemptNumber,
          triggerSource: "operator_reassign",
          outcome: "MANUAL_REASSIGN",
          driverId: driver.driver_id,
          offerId: offer.rows[0].id,
          notes: "Operator selected a specific driver"
        });

        await this.insertJobEvent(client, {
          jobId,
          eventType: "JOB_REASSIGNED",
          actorId: userId,
          payload: {
            requestId,
            driverId: driver.driver_id,
            offerId: offer.rows[0].id,
            previousDriverId: job.assigned_driver_id
          }
        });

        await this.insertAuditLog(client, {
          requestId,
          actorId: userId,
          orgId: job.org_id,
          entityType: "job",
          entityId: jobId,
          action: "job_reassigned",
          metadata: {
            driverId: driver.driver_id,
            offerId: offer.rows[0].id,
            previousDriverId: job.assigned_driver_id
          }
        });

        await this.insertOutboxMessage(client, {
          aggregateType: "job_offer",
          aggregateId: offer.rows[0].id,
          eventType: "JOB_OFFER_EXPIRY_CHECK",
          payload: {
            jobId,
            offerId: offer.rows[0].id,
            requestId
          },
          idempotencyKey: `offer-expiry:${offer.rows[0].id}`,
          nextAttemptAt: new Date(Date.now() + DISPATCH_OFFER_TTL_SECONDS * 1000).toISOString()
        });

        return {
          responseCode: 200,
          body: this.mapJob(updated.rows[0])
        };
      }
    });
  }

  async listEligibleDrivers(jobId: string, userId: string) {
    const job = await this.loadOperatorJob(jobId, userId);
    const rows = await this.loadEligibleDriverCandidates(jobId, job.vehicle_required);

    return EligibleDriverListSchema.parse({
      items: rows.map((row) => this.mapEligibleDriver(row))
    });
  }

  async listBusinessDispatchAudit(jobId: string, userId: string): Promise<DispatchAuditListDto> {
    await this.loadOperatorJob(jobId, userId);
    const rows = await this.queryDispatchAudit({ jobId, limit: 50 });
    return DispatchAuditListSchema.parse({ items: rows.map((row) => this.mapDispatchAuditRow(row)) });
  }

  async listAdminDispatchAudit(query: Record<string, string | undefined>): Promise<DispatchAuditListDto> {
    const rows = await this.queryDispatchAudit({
      jobId: query.jobId,
      orgId: query.orgId,
      overrideType: query.overrideType,
      from: query.from,
      to: query.to,
      limit: this.normalizeLimit(Number(query.limit ?? "50"))
    });
    return DispatchAuditListSchema.parse({ items: rows.map((row) => this.mapDispatchAuditRow(row)) });
  }

  async createDispatchOverride(jobId: string, input: unknown, userId: string, idempotencyKey: string) {
    const parsed = CreateDispatchOverrideSchema.safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        message: "invalid_dispatch_override_payload",
        issues: parsed.error.issues
      });
    }

    const payload = parsed.data;
    this.assertDispatchOverridePolicy(payload);
    const requestId = getRequestContext()?.requestId ?? randomUUID();

    return this.pg.withIdempotency({
      actorId: userId,
      endpoint: `/v1/business/jobs/${jobId}/dispatch-override`,
      idempotencyKey,
      execute: async (client) => {
        const job = await this.loadOperatorJobForUpdate(client, jobId, userId);
        const metadata = {
          requestId,
          overrideType: payload.overrideType,
          reason: payload.reason,
          note: payload.note ?? null,
          previousDriverId: job.assigned_driver_id,
          newDriverId: payload.newDriverId ?? null,
          confirmation: payload.confirmation ?? null,
          humanReviewed: true,
          autonomousAction: false
        };

        let eventType = "DISPATCH_OVERRIDE_APPLIED";
        let updatedJob: JobRow | null = null;

        if (payload.overrideType === "ASSIGN_DRIVER" || payload.overrideType === "REASSIGN_DRIVER") {
          const driver = await this.loadEligibleDriverForReassign(
            client,
            payload.newDriverId as string,
            jobId,
            job.vehicle_required
          );
          updatedJob = await this.applyManualReassign(client, job, driver.driver_id, userId, requestId, metadata);
          eventType = "JOB_REASSIGNED";
        } else if (payload.overrideType === "UNASSIGN_DRIVER") {
          updatedJob = await this.applyManualUnassign(client, job, metadata);
        } else if (payload.overrideType === "MANUAL_RECOVERY_NOTE") {
          eventType = "DISPATCH_MANUAL_RECOVERY_NOTE";
        } else if (payload.overrideType === "MARK_DISPATCH_REVIEWED") {
          eventType = "DISPATCH_REVIEWED";
        } else if (payload.overrideType === "MARK_DISPATCH_BLOCKED") {
          eventType = "DISPATCH_BLOCKED";
        }

        const eventId = await this.insertJobEvent(client, {
          jobId,
          eventType,
          actorId: userId,
          payload: metadata
        });

        await this.insertAuditLog(client, {
          requestId,
          actorId: userId,
          orgId: job.org_id,
          entityType: "job",
          entityId: jobId,
          action: "dispatch_override_recorded",
          metadata
        });

        const rows = await this.queryDispatchAudit({ jobId, eventId, limit: 1 }, client);
        return {
          responseCode: 200,
          body: {
            event: rows[0] ? this.mapDispatchAuditRow(rows[0]) : null,
            job: updatedJob ? this.mapJob(updatedJob) : null
          }
        };
      }
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
             and (
               j.consumer_id = $2
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
             )
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

  private async loadOperatorJob(jobId: string, userId: string) {
    const result = await this.pg.query<OperatorJobRow>(
      `select ${JOB_COLUMNS}
       from public.jobs j
       where j.id = $1
         and j.org_id is not null
         and exists (
           select 1
           from public.org_memberships m
           where m.org_id = j.org_id
             and m.user_id = $2
             and m.is_active = true
             and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
         )`,
      [jobId, userId]
    );

    if ((result.rowCount ?? 0) !== 1) {
      throw new NotFoundException("job_not_found");
    }
    return result.rows[0];
  }

  private async loadOperatorJobForUpdate(client: PoolClient, jobId: string, userId: string) {
    const result = await client.query<OperatorJobRow>(
      `select ${JOB_COLUMNS}
       from public.jobs j
       where j.id = $1
         and j.org_id is not null
         and exists (
           select 1
           from public.org_memberships m
           where m.org_id = j.org_id
             and m.user_id = $2
             and m.is_active = true
             and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
         )
       for update`,
      [jobId, userId]
    );

    if ((result.rowCount ?? 0) !== 1) {
      throw new NotFoundException("job_not_found");
    }
    return result.rows[0];
  }

  private async loadEligibleDriverCandidates(jobId: string, vehicleRequired: string) {
    const result = await this.pg.query<EligibleDriverRow>(
      `select d.id as driver_id,
              u.display_name,
              d.is_active,
              d.availability_status,
              d.latest_latitude,
              d.latest_longitude,
              d.last_location_at,
              d.active_job_id,
              aj.status::text as active_job_status,
              coalesce(vmatch.vehicle_type, vprimary.vehicle_type) as vehicle_type,
              (vmatch.vehicle_type is not null) as has_matching_vehicle,
              coalesce(vstatus.status, 'MISSING')::text as verification_status,
              exists (
                select 1
                from public.job_offers o
                where o.job_id = $1
                  and o.driver_id = d.id
                  and o.status in ('OFFERED', 'ACCEPTED')
              ) as has_open_offer,
              case
                when d.latest_latitude is null or d.latest_longitude is null then null
                else (
                  3959 * acos(
                    least(
                      1,
                      greatest(
                        -1,
                        cos(radians(j.pickup_latitude::float8)) * cos(radians(d.latest_latitude::float8))
                        * cos(radians(d.latest_longitude::float8) - radians(j.pickup_longitude::float8))
                        + sin(radians(j.pickup_latitude::float8)) * sin(radians(d.latest_latitude::float8))
                      )
                    )
                  )
                )::numeric(6,2)::text
              end as distance_miles
       from public.jobs j
       join public.drivers d on d.is_active = true
       join public.users u on u.id = d.user_id
       left join public.jobs aj on aj.id = d.active_job_id
       left join lateral (
         select dv.vehicle_type::text as vehicle_type
         from public.driver_vehicle dv
         where dv.driver_id = d.id
           and dv.vehicle_type = $2::public.vehicle_type
         limit 1
       ) vmatch on true
       left join lateral (
         select dv.vehicle_type::text as vehicle_type
         from public.driver_vehicle dv
         where dv.driver_id = d.id
         order by dv.is_primary desc, dv.created_at asc
         limit 1
       ) vprimary on true
       left join lateral (
         select dvf.status::text as status
         from public.driver_verifications dvf
         where dvf.driver_id = d.id
         order by
           case dvf.status
             when 'APPROVED' then 1
             when 'PENDING' then 2
             else 3
           end,
           dvf.updated_at desc
         limit 1
       ) vstatus on true
       where j.id = $1
       order by
         case
           when d.availability_status = 'ONLINE'
             and d.active_job_id is null
             and vmatch.vehicle_type is not null
             and coalesce(vstatus.status, 'MISSING') = 'APPROVED'
             and not exists (
               select 1
               from public.job_offers o
               where o.job_id = $1
                 and o.driver_id = d.id
                 and o.status in ('OFFERED', 'ACCEPTED')
             )
           then 0
           else 1
         end,
         case when d.last_location_at is null then 1 else 0 end,
         distance_miles nulls last,
         u.display_name asc`,
      [jobId, vehicleRequired]
    );

    return result.rows;
  }

  private async hasOpenOffer(client: PoolClient, jobId: string) {
    const result = await client.query(
      `select 1
       from public.job_offers
       where job_id = $1
         and status = 'OFFERED'
         and expires_at > now()
       limit 1`,
      [jobId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  private async loadEligibleDriverForReassign(
    client: PoolClient,
    driverId: string,
    jobId: string,
    vehicleRequired: string
  ) {
    const result = await client.query<EligibleDriverRow>(
      `select d.id as driver_id,
              u.display_name,
              d.is_active,
              d.availability_status,
              d.latest_latitude,
              d.latest_longitude,
              d.last_location_at,
              d.active_job_id,
              aj.status::text as active_job_status,
              coalesce(vmatch.vehicle_type, vprimary.vehicle_type) as vehicle_type,
              (vmatch.vehicle_type is not null) as has_matching_vehicle,
              coalesce(vstatus.status, 'MISSING')::text as verification_status,
              exists (
                select 1
                from public.job_offers o
                where o.job_id = $3
                  and o.driver_id = d.id
                  and o.status in ('OFFERED', 'ACCEPTED')
              ) as has_open_offer,
              case
                when d.latest_latitude is null or d.latest_longitude is null then null
                else (
                  3959 * acos(
                    least(
                      1,
                      greatest(
                        -1,
                        cos(radians(j.pickup_latitude::float8)) * cos(radians(d.latest_latitude::float8))
                        * cos(radians(d.latest_longitude::float8) - radians(j.pickup_longitude::float8))
                        + sin(radians(j.pickup_latitude::float8)) * sin(radians(d.latest_latitude::float8))
                      )
                    )
                  )
                )::numeric(6,2)::text
              end as distance_miles
       from public.drivers d
       join public.jobs j on j.id = $3
       join public.users u on u.id = d.user_id
       left join public.jobs aj on aj.id = d.active_job_id
       left join lateral (
         select dv.vehicle_type::text as vehicle_type
         from public.driver_vehicle dv
         where dv.driver_id = d.id
           and dv.vehicle_type = $2::public.vehicle_type
         limit 1
       ) vmatch on true
       left join lateral (
         select dv.vehicle_type::text as vehicle_type
         from public.driver_vehicle dv
         where dv.driver_id = d.id
         order by dv.is_primary desc, dv.created_at asc
         limit 1
       ) vprimary on true
       left join lateral (
         select dvf.status::text as status
         from public.driver_verifications dvf
         where dvf.driver_id = d.id
         order by
           case dvf.status
             when 'APPROVED' then 1
             when 'PENDING' then 2
             else 3
           end,
           dvf.updated_at desc
         limit 1
       ) vstatus on true
       where d.id = $1`,
      [driverId, vehicleRequired, jobId]
    );

    if ((result.rowCount ?? 0) !== 1) {
      throw new UnprocessableEntityException({
        message: "driver_not_eligible_for_reassign",
        reason: "DRIVER_NOT_FOUND",
        suitabilityFlags: [],
        suitabilityReason: "Driver could not be found for reassignment."
      });
    }

    const driver = result.rows[0];
    const eligibility = this.evaluateDriverEligibility(driver);

    if (!driver.is_active) {
      throw new UnprocessableEntityException({
        message: "driver_not_eligible_for_reassign",
        reason: "INACTIVE_DRIVER",
        suitabilityFlags: [],
        suitabilityReason: "Driver is inactive and cannot receive manual assignment."
      });
    }

    if (!eligibility.eligible) {
      throw new UnprocessableEntityException({
        message: "driver_not_eligible_for_reassign",
        reason: eligibility.suitabilityFlags[0] ?? "UNKNOWN",
        suitabilityFlags: eligibility.suitabilityFlags,
        suitabilityReason: eligibility.suitabilityReason
      });
    }

    return { driver_id: driver.driver_id };
  }

  private mapEligibleDriver(row: EligibleDriverRow): EligibleDriverDto {
    const { eligible, suitabilityFlags, suitabilityReason } = this.evaluateDriverEligibility(row);

    return {
      id: row.driver_id,
      displayName: row.display_name,
      vehicleType: row.vehicle_type,
      availabilityStatus: row.availability_status,
      distanceMiles: row.distance_miles === null ? null : toFiniteNumber(row.distance_miles, "eligible_driver.distance_miles"),
      lastLocationAt: toNullableIsoDateTime(row.last_location_at),
      verificationStatus: row.verification_status,
      activeJobId: row.active_job_id,
      activeJobStatus: row.active_job_status as EligibleDriverDto["activeJobStatus"],
      eligible,
      suitabilityFlags,
      suitabilityReason
    };
  }

  private evaluateDriverEligibility(row: EligibleDriverRow) {
    const flags: EligibleDriverDto["suitabilityFlags"] = [];

    if (row.availability_status !== "ONLINE") {
      flags.push("OFFLINE");
    }

    if (row.active_job_id) {
      flags.push("ACTIVE_JOB");
    }

    if (!row.has_matching_vehicle) {
      flags.push("VEHICLE_MISMATCH");
    }

    if (row.verification_status !== "APPROVED") {
      flags.push("VERIFICATION_NOT_APPROVED");
    }

    if (!row.last_location_at) {
      flags.push("NO_LIVE_LOCATION");
    }

    if (row.has_open_offer) {
      flags.push("EXISTING_OPEN_OFFER");
    }

    const eligible = flags.every((flag) => flag === "NO_LIVE_LOCATION") || flags.length === 0;
    const suitabilityFlags: EligibleDriverDto["suitabilityFlags"] = eligible
      ? ["READY", ...flags.filter((flag) => flag === "NO_LIVE_LOCATION")]
      : flags;

    return {
      eligible,
      suitabilityFlags,
      suitabilityReason: this.buildEligibleDriverReason(suitabilityFlags)
    };
  }

  private buildEligibleDriverReason(flags: EligibleDriverDto["suitabilityFlags"]) {
    if (flags[0] === "READY") {
      if (flags.includes("NO_LIVE_LOCATION")) {
        return "Driver is assignable now, but live location has not updated recently.";
      }

      return "Online, approved, and ready for manual assignment.";
    }

    if (flags.includes("ACTIVE_JOB")) {
      return "Driver already has an active job and cannot be reassigned.";
    }

    if (flags.includes("OFFLINE")) {
      return "Driver is offline and will not receive manual assignment.";
    }

    if (flags.includes("VEHICLE_MISMATCH")) {
      return "Driver does not have the required vehicle for this delivery.";
    }

    if (flags.includes("VERIFICATION_NOT_APPROVED")) {
      return "Driver verification is not approved yet.";
    }

    if (flags.includes("EXISTING_OPEN_OFFER")) {
      return "Driver already has an open offer for this job.";
    }

    return "Driver is not currently suitable for assignment.";
  }

  private async loadDispatchAttempts(jobId: string) {
    const result = await this.pg.query<DispatchAttemptRow>(
      `select a.id,
              a.attempt_number,
              a.trigger_source,
              a.outcome,
              a.driver_id,
              u.display_name as driver_display_name,
              a.offer_id,
              a.notes,
              a.created_at
       from public.job_dispatch_attempts a
       left join public.drivers d on d.id = a.driver_id
       left join public.users u on u.id = d.user_id
       where a.job_id = $1
       order by a.created_at asc`,
      [jobId]
    );

    return result.rows.map((attempt) => ({
      id: attempt.id,
      attemptNumber: attempt.attempt_number,
      triggerSource: attempt.trigger_source,
      outcome: attempt.outcome,
      driverId: attempt.driver_id,
      driverDisplayName: attempt.driver_display_name,
      offerId: attempt.offer_id,
      notes: attempt.notes,
      createdAt: toIsoDateTime(attempt.created_at)
    }));
  }

  private async nextDispatchAttemptNumber(client: PoolClient, jobId: string) {
    const result = await client.query<{ next_attempt_number: number }>(
      `select coalesce(max(attempt_number), 0) + 1 as next_attempt_number
       from public.job_dispatch_attempts
       where job_id = $1`,
      [jobId]
    );

    return result.rows[0]?.next_attempt_number ?? 1;
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

  private assertDispatchOverridePolicy(payload: CreateDispatchOverrideInput) {
    if (
      (payload.overrideType === "ASSIGN_DRIVER" || payload.overrideType === "REASSIGN_DRIVER") &&
      !payload.newDriverId
    ) {
      throw new BadRequestException("dispatch_override_driver_required");
    }

    if (
      ["ASSIGN_DRIVER", "REASSIGN_DRIVER", "UNASSIGN_DRIVER"].includes(payload.overrideType) &&
      payload.confirmation !== DISPATCH_OVERRIDE_CONFIRMATION
    ) {
      throw new BadRequestException("dispatch_override_confirmation_required");
    }
  }

  private async applyManualReassign(
    client: PoolClient,
    job: OperatorJobRow,
    driverId: string,
    userId: string,
    requestId: string,
    metadata: Record<string, unknown>
  ) {
    if (!REASSIGNABLE_JOB_STATUSES.includes(job.status as (typeof REASSIGNABLE_JOB_STATUSES)[number])) {
      throw new ConflictException("job_not_reassignable");
    }

    if (job.assigned_driver_id) {
      await client.query(
        `update public.drivers
         set active_job_id = null,
             availability_status = 'ONLINE',
             available_since = now()
         where id = $1
           and active_job_id = $2`,
        [job.assigned_driver_id, job.id]
      );
    }

    await client.query(
      `update public.job_offers
       set status = 'EXPIRED',
           responded_at = coalesce(responded_at, now())
       where job_id = $1
         and status in ('OFFERED', 'ACCEPTED')`,
      [job.id]
    );

    const updated = await client.query<JobRow>(
      `update public.jobs
       set status = 'REQUESTED',
           assigned_driver_id = null,
           dispatch_requested_at = now(),
           dispatch_failed_at = null,
           updated_at = now()
       where id = $1
       returning ${JOB_COLUMNS.replaceAll("j.", "")}`,
      [job.id]
    );

    const offer = await client.query<{ id: string }>(
      `insert into public.job_offers (
         job_id,
         driver_id,
         offered_at,
         expires_at,
         status,
         payout_gross_snapshot,
         distance_miles_snapshot,
         eta_minutes_snapshot
       ) values (
         $1,
         $2,
         now(),
         now() + make_interval(secs => $3),
         'OFFERED',
         $4,
         $5,
         $6
       )
       returning id`,
      [
        job.id,
        driverId,
        DISPATCH_OFFER_TTL_SECONDS,
        updated.rows[0].driver_payout_gross_cents,
        Number(updated.rows[0].distance_miles),
        updated.rows[0].eta_minutes
      ]
    );

    const attemptNumber = await this.nextDispatchAttemptNumber(client, job.id);
    await this.insertDispatchAttempt(client, {
      jobId: job.id,
      attemptNumber,
      triggerSource: "operator_override",
      outcome: "MANUAL_REASSIGN",
      driverId,
      offerId: offer.rows[0].id,
      notes: typeof metadata.reason === "string" ? metadata.reason : "Operator selected a specific driver"
    });

    await this.insertOutboxMessage(client, {
      aggregateType: "job_offer",
      aggregateId: offer.rows[0].id,
      eventType: "JOB_OFFER_EXPIRY_CHECK",
      payload: {
        jobId: job.id,
        offerId: offer.rows[0].id,
        requestId
      },
      idempotencyKey: `offer-expiry:${offer.rows[0].id}`,
      nextAttemptAt: new Date(Date.now() + DISPATCH_OFFER_TTL_SECONDS * 1000).toISOString()
    });

    metadata.offerId = offer.rows[0].id;
    return updated.rows[0];
  }

  private async applyManualUnassign(
    client: PoolClient,
    job: OperatorJobRow,
    metadata: Record<string, unknown>
  ) {
    if (!job.assigned_driver_id) {
      throw new ConflictException("job_has_no_assigned_driver");
    }

    await client.query(
      `update public.drivers
       set active_job_id = null,
           availability_status = 'ONLINE',
           available_since = now()
       where id = $1
         and active_job_id = $2`,
      [job.assigned_driver_id, job.id]
    );

    await client.query(
      `update public.job_offers
       set status = 'EXPIRED',
           responded_at = coalesce(responded_at, now())
       where job_id = $1
         and status in ('OFFERED', 'ACCEPTED')`,
      [job.id]
    );

    const updated = await client.query<JobRow>(
      `update public.jobs
       set status = 'REQUESTED',
           assigned_driver_id = null,
           dispatch_requested_at = now(),
           dispatch_failed_at = null,
           updated_at = now()
       where id = $1
       returning ${JOB_COLUMNS.replaceAll("j.", "")}`,
      [job.id]
    );

    metadata.newDriverId = null;
    return updated.rows[0];
  }

  private async queryDispatchAudit(
    input: {
      jobId?: string;
      orgId?: string;
      eventId?: string;
      overrideType?: string;
      from?: string;
      to?: string;
      limit: number;
    },
    runner: { query: (text: string, values?: unknown[]) => Promise<{ rows: DispatchAuditRow[] }> } = this.pg as unknown as {
      query: (text: string, values?: unknown[]) => Promise<{ rows: DispatchAuditRow[] }>;
    }
  ): Promise<DispatchAuditRow[]> {
    const values: unknown[] = [DISPATCH_AUDIT_EVENT_TYPES];
    const filters = [`e.event_type = any($1::text[])`];

    if (input.jobId) {
      values.push(input.jobId);
      filters.push(`j.id = $${values.length}`);
    }
    if (input.orgId) {
      values.push(input.orgId);
      filters.push(`j.org_id = $${values.length}`);
    }
    if (input.eventId) {
      values.push(input.eventId);
      filters.push(`e.id::text = $${values.length}`);
    }
    if (input.overrideType) {
      values.push(input.overrideType);
      filters.push(`coalesce(e.payload->>'overrideType', case when e.event_type = 'JOB_REASSIGNED' then 'REASSIGN_DRIVER' else null end) = $${values.length}`);
    }
    if (input.from) {
      values.push(input.from);
      filters.push(`e.created_at >= $${values.length}::timestamptz`);
    }
    if (input.to) {
      values.push(input.to);
      filters.push(`e.created_at <= $${values.length}::timestamptz`);
    }

    values.push(this.normalizeLimit(input.limit));

    const result = await runner.query(
      `select
          e.id::text,
          j.org_id,
          org.name as org_name,
          j.id as job_id,
          co.id as order_id,
          e.event_type,
          e.actor_id,
          coalesce(actor.display_name, actor.email) as actor_label,
          nullif(coalesce(e.payload->>'previousDriverId', e.payload->>'previous_driver_id'), '') as previous_driver_id,
          prev_user.display_name as previous_driver_name,
          prev_fleet.org_id as previous_driver_fleet_org_id,
          prev_fleet.org_name as previous_driver_fleet_org_name,
          prev_fleet.role as previous_driver_fleet_role,
          nullif(coalesce(e.payload->>'newDriverId', e.payload->>'driverId'), '') as new_driver_id,
          next_user.display_name as new_driver_name,
          next_fleet.org_id as new_driver_fleet_org_id,
          next_fleet.org_name as new_driver_fleet_org_name,
          next_fleet.role as new_driver_fleet_role,
          e.created_at,
          e.payload
       from public.job_events e
       join public.jobs j on j.id = e.job_id
       left join public.orgs org on org.id = j.org_id
       left join public.customer_orders co on co.job_id = j.id
       left join public.users actor on actor.id = e.actor_id
       left join public.drivers prev_driver on prev_driver.id = nullif(coalesce(e.payload->>'previousDriverId', e.payload->>'previous_driver_id'), '')::uuid
       left join public.users prev_user on prev_user.id = prev_driver.user_id
       left join lateral (
         select m.org_id, o.name as org_name, m.role::text as role
         from public.org_memberships m
         join public.orgs o on o.id = m.org_id
         where m.user_id = prev_driver.user_id
           and m.is_active = true
           and o.org_type = 'DRIVER_COMPANY'
         order by m.updated_at desc
         limit 1
       ) prev_fleet on true
       left join public.drivers next_driver on next_driver.id = nullif(coalesce(e.payload->>'newDriverId', e.payload->>'driverId'), '')::uuid
       left join public.users next_user on next_user.id = next_driver.user_id
       left join lateral (
         select m.org_id, o.name as org_name, m.role::text as role
         from public.org_memberships m
         join public.orgs o on o.id = m.org_id
         where m.user_id = next_driver.user_id
           and m.is_active = true
           and o.org_type = 'DRIVER_COMPANY'
         order by m.updated_at desc
         limit 1
       ) next_fleet on true
       where ${filters.join(" and ")}
       order by e.created_at desc, e.id desc
       limit $${values.length}`,
      values
    );

    return result.rows;
  }

  private mapDriverAffiliation(
    driverId: string | null,
    fleetOrgId: string | null,
    fleetOrgName: string | null,
    fleetRole: string | null
  ): DispatchCourierAffiliationDto | null {
    if (!driverId) {
      return null;
    }

    return {
      courierType: fleetOrgId ? "FLEET_MANAGED_COURIER" : "INDEPENDENT_COURIER",
      fleetOrgId,
      fleetOrgName,
      fleetRole: fleetRole as DispatchCourierAffiliationDto["fleetRole"]
    };
  }

  private mapDispatchAuditRow(row: DispatchAuditRow): DispatchOverrideEventDto {
    const payload = row.payload ?? {};
    const overrideType =
      (typeof payload.overrideType === "string" ? payload.overrideType : null) ??
      (row.event_type === "JOB_REASSIGNED" ? "REASSIGN_DRIVER" : null);

    return {
      id: String(row.id),
      orgId: row.org_id,
      orgName: row.org_name,
      jobId: row.job_id,
      orderId: row.order_id,
      eventType: row.event_type,
      overrideType: overrideType as DispatchOverrideType | null,
      reason: typeof payload.reason === "string" ? payload.reason : null,
      note: typeof payload.note === "string" ? payload.note : null,
      actorId: row.actor_id,
      actorLabel: row.actor_label,
      previousDriverId: row.previous_driver_id,
      previousDriverName: row.previous_driver_name,
      previousDriverAffiliation: this.mapDriverAffiliation(
        row.previous_driver_id,
        row.previous_driver_fleet_org_id,
        row.previous_driver_fleet_org_name,
        row.previous_driver_fleet_role
      ),
      newDriverId: row.new_driver_id,
      newDriverName: row.new_driver_name,
      newDriverAffiliation: this.mapDriverAffiliation(
        row.new_driver_id,
        row.new_driver_fleet_org_id,
        row.new_driver_fleet_org_name,
        row.new_driver_fleet_role
      ),
      metadata: payload,
      createdAt: toIsoDateTime(row.created_at)
    };
  }

  private async insertJobEvent(
    client: PoolClient,
    input: { jobId: string; eventType: string; actorId: string | null; payload: Record<string, unknown> }
  ) {
    const result = await client.query<{ id: string }>(
      `insert into public.job_events (job_id, event_type, payload, actor_id)
       values ($1, $2, $3::jsonb, $4)
       returning id::text as id`,
      [input.jobId, input.eventType, JSON.stringify(input.payload), input.actorId]
    );
    return result.rows[0]?.id ?? null;
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

  private async insertDispatchAttempt(
    client: PoolClient,
    input: {
      jobId: string;
      attemptNumber: number;
      triggerSource: string;
      outcome: string;
      driverId: string | null;
      offerId: string | null;
      notes: string | null;
    }
  ) {
    await client.query(
      `insert into public.job_dispatch_attempts (
         job_id,
         attempt_number,
         trigger_source,
         outcome,
         driver_id,
         offer_id,
         notes
       ) values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        input.jobId,
        input.attemptNumber,
        input.triggerSource,
        input.outcome,
        input.driverId,
        input.offerId,
        input.notes
      ]
    );
  }

  private computeAttention(row: JobRow): { level: JobAttentionLevel; reason: string | null } {
    if (row.status === "DISPATCH_FAILED") {
      return { level: "BLOCKER", reason: "Dispatch failed" };
    }

    if (row.status === "REQUESTED" && !row.assigned_driver_id) {
      const dispatchAgeMs = Date.now() - new Date(row.dispatch_requested_at).getTime();
      if (dispatchAgeMs >= 10 * 60 * 1000) {
        return { level: "BLOCKER", reason: "No driver assigned" };
      }
    }

    if (
      ["ASSIGNED", "EN_ROUTE_PICKUP", "PICKED_UP", "EN_ROUTE_DROP"].includes(row.status) &&
      Date.now() - new Date(row.created_at).getTime() >= (row.eta_minutes + 15) * 60 * 1000
    ) {
      return { level: "RISK", reason: "Delayed against ETA" };
    }

    return { level: "NORMAL", reason: null };
  }

  private mapJob(row: JobRow): JobDto {
    const attention = this.computeAttention(row);
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
        latitude: toFiniteNumber(row.pickup_latitude, "job.pickup_latitude"),
        longitude: toFiniteNumber(row.pickup_longitude, "job.pickup_longitude")
      },
      dropoffCoordinates: {
        latitude: toFiniteNumber(row.dropoff_latitude, "job.dropoff_latitude"),
        longitude: toFiniteNumber(row.dropoff_longitude, "job.dropoff_longitude")
      },
      distanceMiles: toFiniteNumber(row.distance_miles, "job.distance_miles"),
      etaMinutes: row.eta_minutes,
      vehicleRequired: row.vehicle_required,
      customerTotalCents: row.customer_total_cents,
      driverPayoutGrossCents: row.driver_payout_gross_cents,
      platformFeeCents: row.platform_fee_cents,
      pricingVersion: row.pricing_version,
      premiumDistanceFlag: row.premium_distance_flag,
      attentionLevel: attention.level,
      attentionReason: attention.reason,
      createdByUserId: row.created_by_user_id,
      createdAt: toIsoDateTime(row.created_at)
    });
  }
}
