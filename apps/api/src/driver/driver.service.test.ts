import { ConflictException, ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { DriverService } from "./driver.service.js";

const ACTOR_ID = "ea24f6a3-aad4-4f58-a1b6-621e89658b34";
const DRIVER_ID = "2f38e3db-3f4d-4725-b071-b4ca67637dcc";
const OTHER_USER_ID = "42d79749-841d-42bf-b674-afed40ebf8e0";
const OFFER_ID = "45ac7a91-2a30-4586-aa66-e46e317bcaf9";
const JOB_ID = "3f84ca71-0da1-4dd4-a9a5-3d8162a379f4";

function driverRow(overrides: Record<string, unknown> = {}) {
  return {
    id: DRIVER_ID,
    availability_status: "ONLINE",
    latest_latitude: null,
    latest_longitude: null,
    available_since: null,
    last_location_at: null,
    active_job_id: null,
    ...overrides
  };
}

function jobRow(overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  return {
    id: JOB_ID,
    org_id: null,
    consumer_id: ACTOR_ID,
    assigned_driver_id: DRIVER_ID,
    quote_id: "3b9fe0a7-907c-4b5b-94a1-b9d6df7c54ab",
    status: "ASSIGNED",
    pickup_address: "101 Main St",
    dropoff_address: "202 Oak Ave",
    pickup_latitude: "51.500000",
    pickup_longitude: "-0.100000",
    dropoff_latitude: "51.510000",
    dropoff_longitude: "-0.090000",
    distance_miles: "4.2",
    eta_minutes: 16,
    vehicle_required: "BIKE",
    customer_total_cents: 1600,
    driver_payout_gross_cents: 1100,
    platform_fee_cents: 500,
    pricing_version: "phase1_test_v1",
    premium_distance_flag: false,
    created_by_user_id: ACTOR_ID,
    created_at: now,
    dispatch_requested_at: now,
    dispatch_failed_at: null,
    updated_at: now,
    ...overrides
  };
}

function makeService(clientQuery: ReturnType<typeof vi.fn>) {
  const pg = {
    query: vi.fn().mockResolvedValue({
      rowCount: 1,
      rows: [driverRow()]
    }),
    withIdempotency: vi.fn().mockImplementation(async ({ execute }) => ({
      replay: false,
      ...(await execute({ query: clientQuery }))
    }))
  };
  const payments = {
    enqueueCaptureForDeliveredJob: vi.fn().mockResolvedValue(undefined)
  };

  return { service: new DriverService(pg as never, payments as never), pg, payments };
}

describe("DriverService", () => {
  it("returns the current driver state for a staged driver", async () => {
    const pg = {
      query: vi.fn().mockResolvedValue({
        rowCount: 1,
        rows: [
          driverRow({
            availability_status: "OFFLINE",
            latest_latitude: "51.500000",
            latest_longitude: "-0.100000",
            available_since: null,
            last_location_at: new Date("2026-04-28T12:00:00.000Z").toISOString()
          })
        ]
      }),
      withIdempotency: vi.fn()
    };
    const payments = {
      enqueueCaptureForDeliveredJob: vi.fn().mockResolvedValue(undefined)
    };

    const service = new DriverService(pg as never, payments as never);
    const state = await service.getDriverState(ACTOR_ID);

    expect(state).toEqual(
      expect.objectContaining({
        driverId: DRIVER_ID,
        availability: "OFFLINE",
        latestLocation: {
          latitude: 51.5,
          longitude: -0.1
        }
      })
    );
  });

  it("blocks driver state when the user has no active driver profile", async () => {
    const pg = {
      query: vi.fn().mockResolvedValue({
        rowCount: 0,
        rows: []
      }),
      withIdempotency: vi.fn()
    };
    const payments = {
      enqueueCaptureForDeliveredJob: vi.fn().mockResolvedValue(undefined)
    };

    const service = new DriverService(pg as never, payments as never);

    await expect(service.getDriverState(ACTOR_ID)).rejects.toThrow(new ForbiddenException("driver_record_required"));
  });

  it("returns an empty offers list for drivers with no active offers", async () => {
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [driverRow()]
        })
        .mockResolvedValueOnce({
          rowCount: 0,
          rows: []
        }),
      withIdempotency: vi.fn()
    };
    const payments = {
      enqueueCaptureForDeliveredJob: vi.fn().mockResolvedValue(undefined)
    };

    const service = new DriverService(pg as never, payments as never);

    await expect(service.listOffers(ACTOR_ID)).resolves.toEqual([]);
  });

  it("normalizes driver offers with pg date values", async () => {
    const expiry = new Date("2026-04-23T12:00:00.000Z");
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [driverRow()]
        })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: OFFER_ID,
              job_id: JOB_ID,
              status: "OFFERED",
              expires_at: expiry,
              distance_miles_snapshot: "4.2",
              eta_minutes_snapshot: 16,
              payout_gross_snapshot: 1100,
              pickup_address: "101 Main St",
              dropoff_address: "202 Oak Ave"
            }
          ]
        }),
      withIdempotency: vi.fn()
    };
    const payments = {
      enqueueCaptureForDeliveredJob: vi.fn().mockResolvedValue(undefined)
    };

    const service = new DriverService(pg as never, payments as never);
    const offers = await service.listOffers(ACTOR_ID);

    expect(offers).toEqual([
      expect.objectContaining({
        offerId: OFFER_ID,
        expiresAt: expiry.toISOString(),
        distanceMiles: 4.2
      })
    ]);
  });

  it("rejects accepting another driver's offer", async () => {
    const clientQuery = vi.fn().mockResolvedValue({
      rowCount: 1,
      rows: [
        {
          offer_id: OFFER_ID,
          job_id: JOB_ID,
          org_id: null,
          driver_id: DRIVER_ID,
          driver_user_id: OTHER_USER_ID,
          status: "OFFERED",
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          distance_miles_snapshot: "4.2",
          eta_minutes_snapshot: 16,
          payout_gross_snapshot: 1100,
          assigned_driver_id: null,
          job_status: "REQUESTED"
        }
      ]
    });

    const { service } = makeService(clientQuery);

    await expect(service.acceptOffer(OFFER_ID, ACTOR_ID, "idem-offer-1")).rejects.toThrow(
      ForbiddenException
    );
  });

  it("prevents double accept when the job is no longer assignable", async () => {
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            offer_id: OFFER_ID,
            job_id: JOB_ID,
            org_id: null,
            driver_id: DRIVER_ID,
            driver_user_id: ACTOR_ID,
            status: "OFFERED",
            expires_at: new Date(Date.now() + 60_000).toISOString(),
            distance_miles_snapshot: "4.2",
            eta_minutes_snapshot: 16,
            payout_gross_snapshot: 1100,
            assigned_driver_id: null,
            job_status: "REQUESTED"
          }
        ]
      })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const { service } = makeService(clientQuery);

    await expect(service.acceptOffer(OFFER_ID, ACTOR_ID, "idem-offer-2")).rejects.toThrow(
      new ConflictException("job_no_longer_assignable")
    );
  });

  it("rejecting an offer enqueues redispatch", async () => {
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            offer_id: OFFER_ID,
            job_id: JOB_ID,
            org_id: null,
            driver_id: DRIVER_ID,
            driver_user_id: ACTOR_ID,
            status: "OFFERED",
            expires_at: new Date(Date.now() + 60_000).toISOString(),
            distance_miles_snapshot: "4.2",
            eta_minutes_snapshot: 16,
            payout_gross_snapshot: 1100,
            assigned_driver_id: null,
            job_status: "REQUESTED"
          }
        ]
      })
      .mockResolvedValue({ rowCount: 1, rows: [{ id: OFFER_ID }] });

    const { service } = makeService(clientQuery);
    const result = await service.rejectOffer(OFFER_ID, ACTOR_ID, "idem-offer-reject");

    expect(result.body.status).toBe("REJECTED");
    expect(
      clientQuery.mock.calls.filter(([sql]) => String(sql).includes("insert into public.outbox_messages")).length
    ).toBe(2);
  });

  it("allows valid driver status transitions", async () => {
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [jobRow({ status: "ASSIGNED" })] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [jobRow({ status: "EN_ROUTE_PICKUP" })] })
      .mockResolvedValue({ rowCount: 1, rows: [] });

    const { service } = makeService(clientQuery);
    const result = await service.transitionToEnRoutePickup(JOB_ID, ACTOR_ID, "idem-transition-1");

    expect(result.body.status).toBe("EN_ROUTE_PICKUP");
  });

  it("rejects invalid status transitions", async () => {
    const clientQuery = vi.fn().mockResolvedValueOnce({ rowCount: 1, rows: [jobRow({ status: "ASSIGNED" })] });

    const { service } = makeService(clientQuery);

    await expect(service.transitionToPickedUp(JOB_ID, ACTOR_ID, "idem-transition-2")).rejects.toThrow(
      new ConflictException("invalid_job_status_transition")
    );
  });

  it("clears active_job_id when a driver delivers a job", async () => {
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [jobRow({ status: "EN_ROUTE_DROP" })] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ exists: 1 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [jobRow({ status: "DELIVERED" })] })
      .mockResolvedValue({ rowCount: 1, rows: [] });

    const { service, payments } = makeService(clientQuery);
    const result = await service.transitionToDelivered(JOB_ID, ACTOR_ID, "idem-transition-3");

    expect(result.body.status).toBe("DELIVERED");
    const driverUpdateCall = clientQuery.mock.calls.find(([sql]) =>
      String(sql).includes("update public.drivers")
    );
    expect(driverUpdateCall?.[1]?.[0]).toBeNull();
    expect(payments.enqueueCaptureForDeliveredJob).toHaveBeenCalledOnce();
  });

  it("blocks delivered transition when proof of delivery is missing", async () => {
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [jobRow({ status: "EN_ROUTE_DROP" })] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const { service } = makeService(clientQuery);

    await expect(service.transitionToDelivered(JOB_ID, ACTOR_ID, "idem-transition-pod")).rejects.toThrow(
      new ConflictException("proof_of_delivery_required")
    );
  });

  it("records proof of delivery before delivery completion", async () => {
    const deliveredAt = new Date().toISOString();
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [jobRow({ status: "EN_ROUTE_DROP" })] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: "f4ff3dbd-d246-4db4-9367-4718dff7ef5f",
            job_id: JOB_ID,
            delivered_by_driver_id: DRIVER_ID,
            photo_url: "https://example.com/pod.jpg",
            recipient_name: "Alex",
            delivery_note: "Left with front desk",
            delivered_at: deliveredAt,
            latitude: "51.500000",
            longitude: "-0.100000",
            otp_verified: false
          }
        ]
      })
      .mockResolvedValue({ rowCount: 1, rows: [] });

    const { service } = makeService(clientQuery);
    const result = await service.createProofOfDelivery(
      JOB_ID,
      {
        photoUrl: "https://example.com/pod.jpg",
        recipientName: "Alex",
        deliveryNote: "Left with front desk",
        coordinates: { latitude: 51.5, longitude: -0.1 }
      },
      ACTOR_ID,
      "idem-pod-1"
    );

    expect(result.body.jobId).toBe(JOB_ID);
    expect(result.body.photoUrl).toBe("https://example.com/pod.jpg");
  });
});
