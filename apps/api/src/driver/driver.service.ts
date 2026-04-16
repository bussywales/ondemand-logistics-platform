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
  UpdateDriverAvailabilitySchema,
  UpdateDriverLocationSchema,
  type AcceptDriverOfferResponse,
  type DriverOfferDto,
  type DriverStateDto,
  type DriverAvailabilityStatus
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
               available_since = case when $1 = 'ONLINE' then now() else null end,
               active_job_id = case when $1 = 'OFFLINE' then active_job_id else active_job_id end
           where id = $2
           returning id, availability_status, latest_latitude, latest_longitude, available_since, last_location_at`,
          [parsed.data.availability, driver.id]
        );

        await this.insertAuditLog(client, {
          requestId,
          actorId: userId,
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
          `select id, availability_status, latest_latitude, latest_longitude, available_since, last_location_at
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
           returning id, availability_status, latest_latitude, latest_longitude, available_since, last_location_at`,
          [parsed.data.latitude, parsed.data.longitude, driver.id]
        );

        await this.insertAuditLog(client, {
          requestId,
          actorId: userId,
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
        const offerResult = await client.query<{
          offer_id: string;
          job_id: string;
          driver_id: string;
          driver_user_id: string;
          status: string;
          expires_at: string;
          distance_miles_snapshot: string;
          eta_minutes_snapshot: number;
          payout_gross_snapshot: number;
        }>(
          `select o.id as offer_id,
                  o.job_id,
                  o.driver_id,
                  d.user_id as driver_user_id,
                  o.status,
                  o.expires_at,
                  o.distance_miles_snapshot,
                  o.eta_minutes_snapshot,
                  o.payout_gross_snapshot
           from public.job_offers o
           join public.drivers d on d.id = o.driver_id
           where o.id = $1
           for update of o`,
          [offerId]
        );

        if (offerResult.rowCount !== 1) {
          throw new NotFoundException("offer_not_found");
        }

        const offer = offerResult.rows[0];
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

        if (jobUpdate.rowCount !== 1) {
          throw new ConflictException("job_no_longer_assignable");
        }

        const accepted = await client.query(
          `update public.job_offers
           set status = 'ACCEPTED', responded_at = now()
           where id = $1 and status = 'OFFERED'
           returning id`,
          [offerId]
        );

        if (accepted.rowCount !== 1) {
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
          entityType: "job",
          entityId: offer.job_id,
          action: "job_offer_accepted",
          metadata: {
            offerId,
            driverId: driver.id
          }
        });

        const body = AcceptDriverOfferResponseSchema.parse({
          offerId,
          jobId: offer.job_id,
          status: "ASSIGNED",
          distanceMiles: Number(offer.distance_miles_snapshot),
          etaMinutes: offer.eta_minutes_snapshot,
          payoutGrossCents: offer.payout_gross_snapshot
        });

        return {
          responseCode: 200,
          body
        };
      }
    });

    return result;
  }

  private async getDriverByUserId(userId: string) {
    const result = await this.pg.query<DriverRecord>(
      `select id, availability_status, latest_latitude, latest_longitude, available_since, last_location_at
       from public.drivers
       where user_id = $1 and is_active = true`,
      [userId]
    );

    if (result.rowCount !== 1) {
      throw new ForbiddenException("driver_record_required");
    }

    return result.rows[0];
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
       ) values ($1, $2, null, $3, $4, $5, $6::jsonb)`,
      [
        input.requestId,
        input.actorId,
        input.entityType,
        input.entityId,
        input.action,
        JSON.stringify(input.metadata)
      ]
    );
  }
}
