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
    created_at: new Date().toISOString(),
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

  return { service: new DriverService(pg as never), pg };
}

describe("DriverService", () => {
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
    expect(clientQuery.mock.calls.some(([sql]) => String(sql).includes("insert into public.outbox_messages"))).toBe(
      true
    );
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
      .mockResolvedValueOnce({ rowCount: 1, rows: [jobRow({ status: "DELIVERED" })] })
      .mockResolvedValue({ rowCount: 1, rows: [] });

    const { service } = makeService(clientQuery);
    const result = await service.transitionToDelivered(JOB_ID, ACTOR_ID, "idem-transition-3");

    expect(result.body.status).toBe("DELIVERED");
    const driverUpdateCall = clientQuery.mock.calls.find(([sql]) =>
      String(sql).includes("update public.drivers")
    );
    expect(driverUpdateCall?.[1]?.[0]).toBeNull();
  });
});
