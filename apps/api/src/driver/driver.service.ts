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
  DriverOfferSchema,
  DriverStateSchema,
  JobSchema,
  OfferDecisionSchema,
  PaginatedJobsSchema,
  UpdateDriverAvailabilitySchema,
  UpdateDriverLocationSchema,
  type DriverAvailabilityStatus,
  type DriverOfferDto,
  type DriverStateDto,
  type JobDto,
  type PaginatedJobsDto
} from "@shipwright/contracts";
import { createLogger, enrichLogContext, getRequestContext } from "@shipwright/observability";
import type { PoolClient } from "pg";
import { PgService } from "../database/pg.service.js";

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
};

const JOB_COLUMNS = `j.id, j.org_id, j.consumer_id, j.assigned_driver_id, j.quote_id, j.status,
  j.pickup_address, j.dropoff_address, j.pickup_latitude, j.pickup_longitude,
  j.dropoff_latitude, j.dropoff_longitude, j.distance_miles, j.eta_minutes,
  j.vehicle_required, j.customer_total_cents, j.driver_payout_gross_cents,
  j.platform_fee_cents, j.pricing_version, j.premium_distance_flag,
  j.created_by_user_id, j.created_at`;

const ACTIVE_DRIVER_JOB_STATUSES = ["ASSIGNED", "EN_ROUTE_PICKUP", "PICKED_UP", "EN_ROUTE_DROP"] as const;

@Injectable()
export class DriverService {
  private readonly logger = createLogger({ name: "api-driver" });
  private readonly locationThrottleMs = Number(process.env.DRIVER_LOCATION_THROTTLE_MS ?? 5000);

  constructor(private readonly pg: PgService) {}

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

        if (offer.job_status === "REQUESTED" && !offer.assigned_driver_id) {
          await client.query(
            `insert into public.outbox_messages (
               aggregate_type,
               aggregate_id,
               event_type,
               payload,
               idempotency_key
             ) values ($1, $2, $3, $4::jsonb, $5)
             on conflict (event_type, idempotency_key) do nothing`,
            [
              "job",
              offer.job_id,
              "JOB_DISPATCH_REQUESTED",
              JSON.stringify({
                jobId: offer.job_id,
                requestId,
                trigger: "offer_rejected",
                rejectedOfferId: offerId
              }),
              `redispatch:${offer.job_id}:${offerId}`
            ]
          );
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
      action: "job_en_route_pickup"
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
      action: "job_picked_up"
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
      action: "job_en_route_drop"
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
      action: "job_delivered"
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
  }) {
    const requestId = getRequestContext()?.requestId ?? randomUUID();
    const driver = await this.getDriverByUserId(input.userId);

    return this.pg.withIdempotency({
      actorId: input.userId,
      endpoint: input.endpoint,
      idempotencyKey: input.idempotencyKey,
      execute: async (client) => {
        const jobResult = await client.query<JobRow>(
          `select ${JOB_COLUMNS}
           from public.jobs j
           where j.id = $1 and j.assigned_driver_id = $2
           for update`,
          [input.jobId, driver.id]
        );

        if ((jobResult.rowCount ?? 0) !== 1) {
          throw new NotFoundException("job_not_found");
        }

        const job = jobResult.rows[0];
        if (job.status !== input.fromStatus) {
          throw new ConflictException("invalid_job_status_transition");
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
}
