import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  AcceptDriverOfferResponseSchema,
  CreateProofOfDeliverySchema,
  DriverOfferSchema,
  DriverStateSchema,
  JobSchema,
  OfferDecisionSchema,
  PaginatedJobsSchema,
  ProofOfDeliverySchema,
  ProofOfDeliveryUploadUrlResponseSchema,
  UpdateDriverAvailabilitySchema,
  UpdateDriverLocationSchema,
  type DriverAvailabilityStatus,
  type DriverOfferDto,
  type DriverStateDto,
  type JobAttentionLevel,
  type JobDto,
  type PaginatedJobsDto,
  type ProofOfDeliveryDto,
  type ProofOfDeliveryUploadUrlResponse
} from "@shipwright/contracts";
import { createLogger, enrichLogContext, getRequestContext } from "@shipwright/observability";
import type { PoolClient } from "pg";
import { PgService } from "../database/pg.service.js";
import { PaymentsService } from "../payments/payments.service.js";

type DriverRecord = {
  id: string;
  availability_status: DriverAvailabilityStatus;
  latest_latitude: string | null;
  latest_longitude: string | null;
  available_since: string | null;
  last_location_at: string | null;
  active_job_id: string | null;
};

type OfferRow = {
  id: string;
  job_id: string;
  status: string;
  expires_at: string;
  distance_miles_snapshot: string;
  eta_minutes_snapshot: number;
  payout_gross_snapshot: number;
  pickup_address: string;
  dropoff_address: string;
};

type OfferOwnershipRow = {
  offer_id: string;
  job_id: string;
  org_id: string | null;
  driver_id: string;
  driver_user_id: string;
  status: string;
  expires_at: string;
  distance_miles_snapshot: string;
  eta_minutes_snapshot: number;
  payout_gross_snapshot: number;
  assigned_driver_id: string | null;
  job_status: string;
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
  dispatch_requested_at: string;
  dispatch_failed_at: string | null;
  updated_at: string;
};

type ProofOfDeliveryRow = {
  id: string;
  job_id: string;
  delivered_by_driver_id: string;
  photo_url: string | null;
  recipient_name: string | null;
  delivery_note: string | null;
  delivered_at: string;
  latitude: string | null;
  longitude: string | null;
  otp_verified: boolean;
};

const JOB_COLUMNS = `j.id, j.org_id, j.consumer_id, j.assigned_driver_id, j.quote_id, j.status,
  j.pickup_address, j.dropoff_address, j.pickup_latitude, j.pickup_longitude,
  j.dropoff_latitude, j.dropoff_longitude, j.distance_miles, j.eta_minutes,
  j.vehicle_required, j.customer_total_cents, j.driver_payout_gross_cents,
  j.platform_fee_cents, j.pricing_version, j.premium_distance_flag,
  j.created_by_user_id, j.created_at, j.dispatch_requested_at, j.dispatch_failed_at, j.updated_at`;

const ACTIVE_DRIVER_JOB_STATUSES = ["ASSIGNED", "EN_ROUTE_PICKUP", "PICKED_UP", "EN_ROUTE_DROP"] as const;

@Injectable()
export class DriverService {
  private readonly logger = createLogger({ name: "api-driver" });
  private readonly locationThrottleMs = Number(process.env.DRIVER_LOCATION_THROTTLE_MS ?? 5000);
  private readonly podStorageBucket = process.env.POD_STORAGE_BUCKET ?? "proof-of-delivery";
  private readonly podUploadUrlTtlSeconds = Number(process.env.POD_UPLOAD_URL_TTL_SECONDS ?? 900);
  private readonly supabaseUrl = process.env.SUPABASE_URL?.trim() || "https://example.supabase.co";

  constructor(
    private readonly pg: PgService,
    private readonly payments: PaymentsService
  ) {}

  async updateAvailability(input: unknown, userId: string, idempotencyKey: string) {
    const parsed = UpdateDriverAvailabilitySchema.safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        message: "invalid_driver_availability_payload",
        issues: parsed.error.issues
      });
    }

    const requestId = getRequestContext()?.requestId ?? randomUUID();
    const driver = await this.getDriverByUserId(userId);
    const log = enrichLogContext(this.logger, { actor_id: userId, entity_id: driver.id });

    const result = await this.pg.withIdempotency({
      actorId: userId,
      endpoint: "/v1/driver/me/availability",
      idempotencyKey,
      execute: async (client) => {
        const updated = await client.query<DriverRecord>(
          `update public.drivers
           set availability_status = $1,
               available_since = case when $1 = 'ONLINE' then now() else null end
           where id = $2
           returning id, availability_status, latest_latitude, latest_longitude, available_since, last_location_at, active_job_id`,
          [parsed.data.availability, driver.id]
        );

        await this.insertAuditLog(client, {
          requestId,
          actorId: userId,
          orgId: null,
          entityType: "driver",
          entityId: driver.id,
          action: "driver_availability_updated",
          metadata: {
            availability: parsed.data.availability
          }
        });

        return {
          responseCode: 200,
          body: this.mapDriverState(updated.rows[0])
        };
      }
    });

    log.info({ replay: result.replay, availability: parsed.data.availability }, "driver_availability_updated");
    return result;
  }

  async updateLocation(input: unknown, userId: string, idempotencyKey: string) {
    const parsed = UpdateDriverLocationSchema.safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        message: "invalid_driver_location_payload",
        issues: parsed.error.issues
      });
    }

    const requestId = getRequestContext()?.requestId ?? randomUUID();
    const driver = await this.getDriverByUserId(userId);

    const result = await this.pg.withIdempotency({
      actorId: userId,
      endpoint: "/v1/driver/me/location",
      idempotencyKey,
      execute: async (client) => {
        const locked = await client.query<DriverRecord>(
          `select id, availability_status, latest_latitude, latest_longitude, available_since, last_location_at, active_job_id
           from public.drivers
           where id = $1
           for update`,
          [driver.id]
        );

        const current = locked.rows[0];
        if (current.last_location_at) {
          const elapsedMs = Date.now() - new Date(current.last_location_at).getTime();
          if (elapsedMs < this.locationThrottleMs) {
            throw new HttpException("driver_location_update_throttled", HttpStatus.TOO_MANY_REQUESTS);
          }
        }

        const updated = await client.query<DriverRecord>(
          `update public.drivers
           set latest_latitude = $1,
               latest_longitude = $2,
               last_location_at = now()
           where id = $3
           returning id, availability_status, latest_latitude, latest_longitude, available_since, last_location_at, active_job_id`,
          [parsed.data.latitude, parsed.data.longitude, driver.id]
        );

        await this.insertAuditLog(client, {
          requestId,
          actorId: userId,
          orgId: null,
          entityType: "driver",
          entityId: driver.id,
          action: "driver_location_updated",
          metadata: {
            latitude: parsed.data.latitude,
            longitude: parsed.data.longitude
          }
        });

        return {
          responseCode: 200,
          body: this.mapDriverState(updated.rows[0])
        };
      }
    });

    return result;
  }

  async listOffers(userId: string): Promise<DriverOfferDto[]> {
    await this.getDriverByUserId(userId);
    const result = await this.pg.query<OfferRow>(
      `select o.id, o.job_id, o.status, o.expires_at, o.distance_miles_snapshot,
              o.eta_minutes_snapshot, o.payout_gross_snapshot,
              j.pickup_address, j.dropoff_address
       from public.job_offers o
       join public.drivers d on d.id = o.driver_id
       join public.jobs j on j.id = o.job_id
       where d.user_id = $1
         and o.status = 'OFFERED'
         and o.expires_at > now()
       order by o.expires_at asc`,
      [userId]
    );

    return result.rows.map((row) =>
      DriverOfferSchema.parse({
        offerId: row.id,
        jobId: row.job_id,
        status: row.status,
        expiresAt: row.expires_at,
        distanceMiles: Number(row.distance_miles_snapshot),
        etaMinutes: row.eta_minutes_snapshot,
        payoutGrossCents: row.payout_gross_snapshot,
        pickupAddress: row.pickup_address,
        dropoffAddress: row.dropoff_address
      })
    );
  }

  async acceptOffer(offerId: string, userId: string, idempotencyKey: string) {
    const requestId = getRequestContext()?.requestId ?? randomUUID();
    const driver = await this.getDriverByUserId(userId);

    const result = await this.pg.withIdempotency({
      actorId: userId,
      endpoint: `/v1/driver/me/offers/${offerId}/accept`,
      idempotencyKey,
      execute: async (client) => {
        const offer = await this.loadOfferForUpdate(client, offerId);

        if (offer.driver_user_id !== userId || offer.driver_id !== driver.id) {
          throw new ForbiddenException("offer_not_owned_by_driver");
        }

        if (offer.status !== "OFFERED") {
          throw new ConflictException("offer_not_open");
        }

        if (new Date(offer.expires_at).getTime() <= Date.now()) {
          await client.query(
            `update public.job_offers
             set status = 'EXPIRED', responded_at = now()
             where id = $1 and status = 'OFFERED'`,
            [offerId]
          );
          throw new ConflictException("offer_expired");
        }

        const jobUpdate = await client.query<{ id: string }>(
          `update public.jobs
           set status = 'ASSIGNED',
               assigned_driver_id = $1,
               updated_at = now()
           where id = $2 and status = 'REQUESTED'
           returning id`,
          [driver.id, offer.job_id]
        );

        if ((jobUpdate.rowCount ?? 0) !== 1) {
          throw new ConflictException("job_no_longer_assignable");
        }

        const accepted = await client.query(
          `update public.job_offers
           set status = 'ACCEPTED', responded_at = now()
           where id = $1 and status = 'OFFERED'
           returning id`,
          [offerId]
        );

        if ((accepted.rowCount ?? 0) !== 1) {
          throw new ConflictException("offer_already_processed");
        }

        await client.query(
          `update public.job_offers
           set status = 'EXPIRED', responded_at = now()
           where job_id = $1 and id <> $2 and status = 'OFFERED'`,
          [offer.job_id, offerId]
        );

        await client.query(
          `update public.drivers
           set active_job_id = $1,
               availability_status = 'OFFLINE',
               available_since = null
           where id = $2`,
          [offer.job_id, driver.id]
        );

        await this.insertJobEvent(client, {
          jobId: offer.job_id,
          eventType: "JOB_ASSIGNED",
          actorId: userId,
          payload: {
            requestId,
            offerId,
            driverId: driver.id
          }
        });

        await this.insertAuditLog(client, {
          requestId,
          actorId: userId,
          orgId: offer.org_id,
          entityType: "job",
          entityId: offer.job_id,
          action: "job_offer_accepted",
          metadata: {
            offerId,
            driverId: driver.id
          }
        });

        await this.insertOutboxMessage(client, {
          aggregateType: "job",
          aggregateId: offer.job_id,
          eventType: "NOTIFY_JOB_ASSIGNED",
          payload: {
            requestId,
            jobId: offer.job_id,
            offerId,
            driverId: driver.id,
            status: "ASSIGNED"
          },
          idempotencyKey: `notify-job-assigned:${offer.job_id}:${offerId}`
        });

        return {
          responseCode: 200,
          body: AcceptDriverOfferResponseSchema.parse({
            offerId,
            jobId: offer.job_id,
            status: "ASSIGNED",
            distanceMiles: Number(offer.distance_miles_snapshot),
            etaMinutes: offer.eta_minutes_snapshot,
            payoutGrossCents: offer.payout_gross_snapshot
          })
        };
      }
    });

    return result;
  }

  async rejectOffer(offerId: string, userId: string, idempotencyKey: string) {
    const requestId = getRequestContext()?.requestId ?? randomUUID();
    const driver = await this.getDriverByUserId(userId);

    return this.pg.withIdempotency({
      actorId: userId,
      endpoint: `/v1/driver/me/offers/${offerId}/reject`,
      idempotencyKey,
      execute: async (client) => {
        const offer = await this.loadOfferForUpdate(client, offerId);

        if (offer.driver_user_id !== userId || offer.driver_id !== driver.id) {
          throw new ForbiddenException("offer_not_owned_by_driver");
        }

        if (offer.status !== "OFFERED") {
          throw new ConflictException("offer_not_open");
        }

        const rejected = await client.query(
          `update public.job_offers
           set status = 'REJECTED', responded_at = now()
           where id = $1 and status = 'OFFERED'
           returning id`,
          [offerId]
        );

        if ((rejected.rowCount ?? 0) !== 1) {
          throw new ConflictException("offer_already_processed");
        }

        await this.insertJobEvent(client, {
          jobId: offer.job_id,
          eventType: "JOB_OFFER_REJECTED",
          actorId: userId,
          payload: {
            requestId,
            offerId,
            driverId: driver.id
          }
        });

        await this.insertAuditLog(client, {
          requestId,
          actorId: userId,
          orgId: offer.org_id,
          entityType: "job_offer",
          entityId: offerId,
          action: "job_offer_rejected",
          metadata: {
            jobId: offer.job_id,
            driverId: driver.id
          }
        });

        await this.insertOutboxMessage(client, {
          aggregateType: "job",
          aggregateId: offer.job_id,
          eventType: "NOTIFY_JOB_REDISPATCH_REQUESTED",
          payload: {
            requestId,
            jobId: offer.job_id,
            offerId,
            driverId: driver.id,
            trigger: "offer_rejected"
          },
          idempotencyKey: `notify-redispatch:${offer.job_id}:${offerId}:rejected`
        });

        if (offer.job_status === "REQUESTED" && !offer.assigned_driver_id) {
          await this.insertOutboxMessage(client, {
            aggregateType: "job",
            aggregateId: offer.job_id,
            eventType: "JOB_DISPATCH_REQUESTED",
            payload: {
              jobId: offer.job_id,
              requestId,
              trigger: "offer_rejected",
              rejectedOfferId: offerId
            },
            idempotencyKey: `redispatch:${offer.job_id}:${offerId}`
          });
        }

        return {
          responseCode: 200,
          body: OfferDecisionSchema.parse({
            offerId,
            jobId: offer.job_id,
            status: "REJECTED"
          })
        };
      }
    });
  }

  async getCurrentJob(userId: string): Promise<JobDto | null> {
    const driver = await this.getDriverByUserId(userId);
    if (!driver.active_job_id) {
      return null;
    }

    const result = await this.pg.query<JobRow>(
      `select ${JOB_COLUMNS}
       from public.jobs j
       where j.id = $1
         and j.assigned_driver_id = $2
         and j.status = any($3::public.job_status[])`,
      [driver.active_job_id, driver.id, ACTIVE_DRIVER_JOB_STATUSES]
    );

    if ((result.rowCount ?? 0) === 0) {
      return null;
    }

    return this.mapJob(result.rows[0]);
  }

  async listJobHistory(userId: string, page: number, limit: number): Promise<PaginatedJobsDto> {
    const driver = await this.getDriverByUserId(userId);
    const safePage = this.normalizePage(page);
    const safeLimit = this.normalizeLimit(limit);
    const offset = (safePage - 1) * safeLimit;

    const result = await this.pg.query<JobRow>(
      `select ${JOB_COLUMNS}
       from public.jobs j
       where j.assigned_driver_id = $1
         and ($2::uuid is null or j.id <> $2)
       order by j.created_at desc
       limit $3 offset $4`,
      [driver.id, driver.active_job_id, safeLimit + 1, offset]
    );

    return PaginatedJobsSchema.parse({
      items: result.rows.slice(0, safeLimit).map((row) => this.mapJob(row)),
      page: safePage,
      limit: safeLimit,
      hasMore: result.rows.length > safeLimit
    });
  }

  async transitionToEnRoutePickup(jobId: string, userId: string, idempotencyKey: string) {
    return this.transitionJobStatus({
      jobId,
      userId,
      idempotencyKey,
      endpoint: `/v1/driver/me/jobs/${jobId}/en-route-pickup`,
      fromStatus: "ASSIGNED",
      toStatus: "EN_ROUTE_PICKUP",
      eventType: "JOB_EN_ROUTE_PICKUP",
      action: "job_en_route_pickup",
      notificationEventType: "NOTIFY_JOB_EN_ROUTE_PICKUP"
    });
  }

  async transitionToPickedUp(jobId: string, userId: string, idempotencyKey: string) {
    return this.transitionJobStatus({
      jobId,
      userId,
      idempotencyKey,
      endpoint: `/v1/driver/me/jobs/${jobId}/picked-up`,
      fromStatus: "EN_ROUTE_PICKUP",
      toStatus: "PICKED_UP",
      eventType: "JOB_PICKED_UP",
      action: "job_picked_up",
      notificationEventType: "NOTIFY_JOB_PICKED_UP"
    });
  }

  async transitionToEnRouteDrop(jobId: string, userId: string, idempotencyKey: string) {
    return this.transitionJobStatus({
      jobId,
      userId,
      idempotencyKey,
      endpoint: `/v1/driver/me/jobs/${jobId}/en-route-drop`,
      fromStatus: "PICKED_UP",
      toStatus: "EN_ROUTE_DROP",
      eventType: "JOB_EN_ROUTE_DROP",
      action: "job_en_route_drop",
      notificationEventType: "NOTIFY_JOB_EN_ROUTE_DROP"
    });
  }

  async transitionToDelivered(jobId: string, userId: string, idempotencyKey: string) {
    return this.transitionJobStatus({
      jobId,
      userId,
      idempotencyKey,
      endpoint: `/v1/driver/me/jobs/${jobId}/delivered`,
      fromStatus: "EN_ROUTE_DROP",
      toStatus: "DELIVERED",
      eventType: "JOB_DELIVERED",
      action: "job_delivered",
      notificationEventType: "NOTIFY_JOB_DELIVERED",
      requireProofOfDelivery: true
    });
  }

  async createProofOfDeliveryUploadUrl(
    jobId: string,
    userId: string,
    idempotencyKey: string
  ): Promise<{ replay: boolean; responseCode: number; body: ProofOfDeliveryUploadUrlResponse }> {
    const driver = await this.getDriverByUserId(userId);

    return this.pg.withIdempotency({
      actorId: userId,
      endpoint: `/v1/driver/me/jobs/${jobId}/proof-of-delivery/upload-url`,
      idempotencyKey,
      execute: async (client) => {
        await this.loadAssignedJobForUpdate(client, jobId, driver.id, ["EN_ROUTE_DROP"]);

        const storagePath = `jobs/${jobId}/${randomUUID()}.jpg`;
        return {
          responseCode: 200,
          body: ProofOfDeliveryUploadUrlResponseSchema.parse({
            jobId,
            storageBucket: this.podStorageBucket,
            storagePath,
            uploadMethod: "PUT",
            uploadUrl: `${this.supabaseUrl}/storage/v1/object/${this.podStorageBucket}/${storagePath}`,
            photoUrl: `${this.supabaseUrl}/storage/v1/object/public/${this.podStorageBucket}/${storagePath}`,
            expiresAt: new Date(Date.now() + this.podUploadUrlTtlSeconds * 1000).toISOString()
          })
        };
      }
    });
  }

  async createProofOfDelivery(
    jobId: string,
    input: unknown,
    userId: string,
    idempotencyKey: string
  ): Promise<{ replay: boolean; responseCode: number; body: ProofOfDeliveryDto }> {
    const parsed = CreateProofOfDeliverySchema.safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        message: "invalid_proof_of_delivery_payload",
        issues: parsed.error.issues
      });
    }

    const requestId = getRequestContext()?.requestId ?? randomUUID();
    const driver = await this.getDriverByUserId(userId);

    return this.pg.withIdempotency({
      actorId: userId,
      endpoint: `/v1/driver/me/jobs/${jobId}/proof-of-delivery`,
      idempotencyKey,
      execute: async (client) => {
        const job = await this.loadAssignedJobForUpdate(client, jobId, driver.id, ["EN_ROUTE_DROP"]);
        const existing = await client.query(`select id from public.proof_of_delivery where job_id = $1`, [jobId]);
        if ((existing.rowCount ?? 0) > 0) {
          throw new ConflictException("proof_of_delivery_already_exists");
        }

        const created = await client.query<ProofOfDeliveryRow>(
          `insert into public.proof_of_delivery (
             job_id,
             delivered_by_driver_id,
             photo_url,
             recipient_name,
             delivery_note,
             delivered_at,
             latitude,
             longitude,
             otp_verified
           ) values ($1, $2, $3, $4, $5, now(), $6, $7, $8)
           returning id, job_id, delivered_by_driver_id, photo_url, recipient_name, delivery_note,
                     delivered_at, latitude, longitude, otp_verified`,
          [
            jobId,
            driver.id,
            parsed.data.photoUrl ?? null,
            parsed.data.recipientName ?? null,
            parsed.data.deliveryNote ?? null,
            parsed.data.coordinates?.latitude ?? null,
            parsed.data.coordinates?.longitude ?? null,
            parsed.data.otpVerified ?? false
          ]
        );

        await this.insertJobEvent(client, {
          jobId,
          eventType: "JOB_PROOF_OF_DELIVERY_RECORDED",
          actorId: userId,
          payload: {
            requestId,
            proofOfDeliveryId: created.rows[0].id,
            hasPhoto: Boolean(parsed.data.photoUrl),
            recipientName: parsed.data.recipientName ?? null
          }
        });

        await this.insertAuditLog(client, {
          requestId,
          actorId: userId,
          orgId: job.org_id,
          entityType: "proof_of_delivery",
          entityId: created.rows[0].id,
          action: "proof_of_delivery_recorded",
          metadata: {
            jobId,
            driverId: driver.id,
            hasPhoto: Boolean(parsed.data.photoUrl),
            otpVerified: parsed.data.otpVerified ?? false
          }
        });

        return {
          responseCode: 201,
          body: this.mapProofOfDelivery(created.rows[0])
        };
      }
    });
  }

  private async transitionJobStatus(input: {
    jobId: string;
    userId: string;
    idempotencyKey: string;
    endpoint: string;
    fromStatus: string;
    toStatus: string;
    eventType: string;
    action: string;
    notificationEventType?: string;
    requireProofOfDelivery?: boolean;
  }) {
    const requestId = getRequestContext()?.requestId ?? randomUUID();
    const driver = await this.getDriverByUserId(input.userId);

    return this.pg.withIdempotency({
      actorId: input.userId,
      endpoint: input.endpoint,
      idempotencyKey: input.idempotencyKey,
      execute: async (client) => {
        const job = await this.loadAssignedJobForUpdate(client, input.jobId, driver.id, [input.fromStatus]);

        if (input.requireProofOfDelivery) {
          const proofResult = await client.query(
            `select 1
             from public.proof_of_delivery
             where job_id = $1
               and delivered_by_driver_id = $2`,
            [input.jobId, driver.id]
          );

          if ((proofResult.rowCount ?? 0) !== 1) {
            throw new ConflictException("proof_of_delivery_required");
          }
        }

        const updated = await client.query<JobRow>(
          `update public.jobs
           set status = $1,
               updated_at = now()
           where id = $2
           returning ${JOB_COLUMNS.replaceAll("j.", "")}`,
          [input.toStatus, input.jobId]
        );

        await client.query(
          `update public.drivers
           set active_job_id = $1,
               availability_status = 'OFFLINE',
               available_since = null
           where id = $2`,
          [input.toStatus === "DELIVERED" ? null : input.jobId, driver.id]
        );

        await this.insertJobEvent(client, {
          jobId: input.jobId,
          eventType: input.eventType,
          actorId: input.userId,
          payload: {
            requestId,
            fromStatus: input.fromStatus,
            toStatus: input.toStatus,
            driverId: driver.id
          }
        });

        await this.insertAuditLog(client, {
          requestId,
          actorId: input.userId,
          orgId: updated.rows[0].org_id,
          entityType: "job",
          entityId: input.jobId,
          action: input.action,
          metadata: {
            fromStatus: input.fromStatus,
            toStatus: input.toStatus,
            driverId: driver.id
          }
        });

        if (input.notificationEventType) {
          await this.insertOutboxMessage(client, {
            aggregateType: "job",
            aggregateId: input.jobId,
            eventType: input.notificationEventType,
            payload: {
              requestId,
              jobId: input.jobId,
              driverId: driver.id,
              status: input.toStatus
            },
            idempotencyKey: `${input.notificationEventType.toLowerCase()}:${input.jobId}:${input.idempotencyKey}`
          });
        }

        if (input.toStatus === "DELIVERED") {
          await this.payments.enqueueCaptureForDeliveredJob(client, {
            jobId: input.jobId,
            requestId,
            idempotencyKey: input.idempotencyKey
          });
        }

        return {
          responseCode: 200,
          body: this.mapJob(updated.rows[0])
        };
      }
    });
  }

  private async loadOfferForUpdate(client: PoolClient, offerId: string) {
    const offerResult = await client.query<OfferOwnershipRow>(
      `select o.id as offer_id,
              o.job_id,
              j.org_id,
              o.driver_id,
              d.user_id as driver_user_id,
              o.status,
              o.expires_at,
              o.distance_miles_snapshot,
              o.eta_minutes_snapshot,
              o.payout_gross_snapshot,
              j.assigned_driver_id,
              j.status as job_status
       from public.job_offers o
       join public.drivers d on d.id = o.driver_id
       join public.jobs j on j.id = o.job_id
       where o.id = $1
       for update of o, j`,
      [offerId]
    );

    if ((offerResult.rowCount ?? 0) !== 1) {
      throw new NotFoundException("offer_not_found");
    }

    return offerResult.rows[0];
  }

  private async loadAssignedJobForUpdate(
    client: PoolClient,
    jobId: string,
    driverId: string,
    expectedStatuses: string[]
  ) {
    const jobResult = await client.query<JobRow>(
      `select ${JOB_COLUMNS}
       from public.jobs j
       where j.id = $1 and j.assigned_driver_id = $2
       for update`,
      [jobId, driverId]
    );

    if ((jobResult.rowCount ?? 0) !== 1) {
      throw new NotFoundException("job_not_found");
    }

    const job = jobResult.rows[0];
    if (!expectedStatuses.includes(job.status)) {
      throw new ConflictException("invalid_job_status_transition");
    }

    return job;
  }

  private async getDriverByUserId(userId: string) {
    const result = await this.pg.query<DriverRecord>(
      `select id, availability_status, latest_latitude, latest_longitude, available_since, last_location_at, active_job_id
       from public.drivers
       where user_id = $1 and is_active = true`,
      [userId]
    );

    if ((result.rowCount ?? 0) !== 1) {
      throw new ForbiddenException("driver_record_required");
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

  private mapDriverState(row: DriverRecord): DriverStateDto {
    return DriverStateSchema.parse({
      driverId: row.id,
      availability: row.availability_status,
      latestLocation:
        row.latest_latitude && row.latest_longitude
          ? {
              latitude: Number(row.latest_latitude),
              longitude: Number(row.latest_longitude)
            }
          : null,
      availableSince: row.available_since,
      lastLocationAt: row.last_location_at
    });
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
      attentionLevel: attention.level,
      attentionReason: attention.reason,
      createdByUserId: row.created_by_user_id,
      createdAt: row.created_at
    });
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

  private mapProofOfDelivery(row: ProofOfDeliveryRow): ProofOfDeliveryDto {
    return ProofOfDeliverySchema.parse({
      id: row.id,
      jobId: row.job_id,
      deliveredByDriverId: row.delivered_by_driver_id,
      photoUrl: row.photo_url,
      recipientName: row.recipient_name,
      deliveryNote: row.delivery_note,
      deliveredAt: row.delivered_at,
      coordinates:
        row.latitude && row.longitude
          ? {
              latitude: Number(row.latitude),
              longitude: Number(row.longitude)
            }
          : null,
      otpVerified: row.otp_verified
    });
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
}
