import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { JobsService } from "./jobs.service.js";

const ACTOR_ID = "9d90d9cb-aaed-494e-aebf-d0f02b9618fe";
const QUOTE_ID = "07ce83ef-3d05-4f78-9f5f-a21191f2d07e";
const JOB_ID = "c028cb10-f12f-4300-8f0b-6d398e3dd870";
const DRIVER_ID = "708ddf09-159f-4f8a-9147-c0d85f7e608e";
const DRIVER_USER_ID = "9f114315-f1e6-4e4d-ae6f-aae01682a4c6";

function createJobRow(overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  return {
    id: JOB_ID,
    org_id: null,
    consumer_id: ACTOR_ID,
    assigned_driver_id: null,
    quote_id: QUOTE_ID,
    status: "REQUESTED",
    pickup_address: "101 Main St",
    dropoff_address: "202 Oak Ave",
    pickup_latitude: "51.500000",
    pickup_longitude: "-0.100000",
    dropoff_latitude: "51.510000",
    dropoff_longitude: "-0.090000",
    distance_miles: "4.25",
    eta_minutes: 18,
    vehicle_required: "BIKE",
    customer_total_cents: 1600,
    driver_payout_gross_cents: 980,
    platform_fee_cents: 620,
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

describe("JobsService", () => {
  it("creates a payment record when a job is created", async () => {
    const query = vi.fn().mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id: QUOTE_ID,
          org_id: null,
          created_by_user_id: ACTOR_ID,
          distance_miles: "4.25",
          eta_minutes: 18,
          vehicle_type: "BIKE",
          customer_total_cents: 1600,
          driver_payout_gross_cents: 980,
          platform_fee_cents: 620,
          pricing_version: "phase1_test_v1",
          premium_distance_flag: false
        }
      ]
    });
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [createJobRow()] })
      .mockResolvedValue({ rowCount: 1, rows: [] });
    const payments = {
      createPaymentForJob: vi.fn().mockResolvedValue(undefined),
      previewCancellationSettlementForJob: vi.fn(),
      enqueueCancellationSettlement: vi.fn()
    };
    const pg = {
      query,
      withIdempotency: vi.fn().mockImplementation(async ({ execute }) => ({
        replay: false,
        ...(await execute({ query: clientQuery }))
      }))
    };

    const service = new JobsService(pg as never, payments as never);
    const result = await service.createJobRequest(
      {
        consumerId: ACTOR_ID,
        quoteId: QUOTE_ID,
        pickupAddress: "101 Main St",
        dropoffAddress: "202 Oak Ave",
        pickupCoordinates: { latitude: 51.5, longitude: -0.1 },
        dropoffCoordinates: { latitude: 51.51, longitude: -0.09 }
      },
      ACTOR_ID,
      "idem-job-payment-1"
    );

    expect(result.body.id).toBe(JOB_ID);
    expect(payments.createPaymentForJob).toHaveBeenCalledOnce();
  });

  it("defaults business-created jobs to the authenticated user when consumerId is omitted", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: QUOTE_ID,
            org_id: "f6c5c290-5841-4b2d-b16c-cda4d0d3dfb7",
            created_by_user_id: ACTOR_ID,
            distance_miles: "4.25",
            eta_minutes: 18,
            vehicle_type: "BIKE",
            customer_total_cents: 1600,
            driver_payout_gross_cents: 980,
            platform_fee_cents: 620,
            pricing_version: "phase1_test_v1",
            premium_distance_flag: false
          }
        ]
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ role: "BUSINESS_OPERATOR" }] });

    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [createJobRow({ org_id: "f6c5c290-5841-4b2d-b16c-cda4d0d3dfb7" })] })
      .mockResolvedValue({ rowCount: 1, rows: [] });
    const payments = {
      createPaymentForJob: vi.fn().mockResolvedValue(undefined),
      previewCancellationSettlementForJob: vi.fn(),
      enqueueCancellationSettlement: vi.fn()
    };
    const pg = {
      query,
      withIdempotency: vi.fn().mockImplementation(async ({ execute }) => ({
        replay: false,
        ...(await execute({ query: clientQuery }))
      }))
    };

    const service = new JobsService(pg as never, payments as never);
    await service.createJobRequest(
      {
        orgId: "f6c5c290-5841-4b2d-b16c-cda4d0d3dfb7",
        quoteId: QUOTE_ID,
        pickupAddress: "101 Main St",
        dropoffAddress: "202 Oak Ave",
        pickupCoordinates: { latitude: 51.5, longitude: -0.1 },
        dropoffCoordinates: { latitude: 51.51, longitude: -0.09 }
      },
      ACTOR_ID,
      "idem-job-business-1"
    );

    expect(payments.createPaymentForJob).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ consumerId: ACTOR_ID })
    );
  });

  it("returns cached idempotent responses on retry", async () => {
    const pg = {
      query: vi.fn().mockResolvedValue({
        rowCount: 1,
        rows: [
          {
            id: QUOTE_ID,
            org_id: null,
            created_by_user_id: ACTOR_ID,
            distance_miles: "4.25",
            eta_minutes: 18,
            vehicle_type: "BIKE",
            customer_total_cents: 1600,
            driver_payout_gross_cents: 980,
            platform_fee_cents: 620,
            pricing_version: "phase1_test_v1",
            premium_distance_flag: false
          }
        ]
      }),
      withIdempotency: vi.fn().mockResolvedValue({
        replay: true,
        responseCode: 201,
        body: { id: JOB_ID }
      })
    };
    const payments = {
      createPaymentForJob: vi.fn(),
      previewCancellationSettlementForJob: vi.fn(),
      enqueueCancellationSettlement: vi.fn()
    };

    const service = new JobsService(pg as never, payments as never);
    const result = await service.createJobRequest(
      {
        consumerId: ACTOR_ID,
        quoteId: QUOTE_ID,
        pickupAddress: "101 Main St",
        dropoffAddress: "202 Oak Ave",
        pickupCoordinates: { latitude: 51.5, longitude: -0.1 },
        dropoffCoordinates: { latitude: 51.51, longitude: -0.09 }
      },
      ACTOR_ID,
      "idem-job-0001"
    );

    expect(result.replay).toBe(true);
    expect(result.body).toEqual({ id: JOB_ID });
    expect(pg.withIdempotency).toHaveBeenCalledOnce();
  });

  it("blocks unauthorized reads when no accessible job row exists", async () => {
    const pg = {
      query: vi.fn().mockResolvedValue({ rowCount: 0, rows: [] })
    };
    const payments = {
      createPaymentForJob: vi.fn(),
      previewCancellationSettlementForJob: vi.fn(),
      enqueueCancellationSettlement: vi.fn()
    };

    const service = new JobsService(pg as never, payments as never);

    await expect(service.getJob(JOB_ID, ACTOR_ID)).rejects.toThrow(NotFoundException);
  });

  it("returns normalized tracking payloads", async () => {
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            createJobRow({
              status: "ASSIGNED",
              assigned_driver_id: DRIVER_ID,
              driver_user_id: DRIVER_USER_ID,
              driver_display_name: "Driver One",
              driver_latest_latitude: "51.499000",
              driver_latest_longitude: "-0.101000",
              driver_last_location_at: new Date().toISOString()
            })
          ]
        })
      .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: "0cfb2cdb-00f6-4c01-a905-8e96a1b4382d",
              attempt_number: 1,
              trigger_source: "job_requested",
              outcome: "OFFERED",
              driver_id: DRIVER_ID,
              driver_display_name: "Driver One",
              offer_id: "18c26fd7-14c1-4d07-8e06-7f31707e36ce",
              notes: null,
              created_at: new Date().toISOString()
            }
          ]
        })
      .mockResolvedValueOnce({
        rowCount: 2,
        rows: [
          {
            id: 1,
            event_type: "JOB_REQUESTED",
            actor_id: ACTOR_ID,
            created_at: new Date().toISOString(),
            payload: { quoteId: QUOTE_ID }
          },
          {
            id: 2,
            event_type: "JOB_ASSIGNED",
            actor_id: DRIVER_USER_ID,
            created_at: new Date().toISOString(),
            payload: { offerId: "offer-1" }
          }
        ]
        })
    };
    const payments = {
      createPaymentForJob: vi.fn(),
      previewCancellationSettlementForJob: vi.fn(),
      enqueueCancellationSettlement: vi.fn()
    };

    const service = new JobsService(pg as never, payments as never);
    const tracking = await service.getTracking(JOB_ID, ACTOR_ID);

    expect(tracking.jobId).toBe(JOB_ID);
    expect(tracking.assignedDriver?.displayName).toBe("Driver One");
    expect(tracking.dispatchAttempts).toHaveLength(1);
    expect(tracking.timeline).toHaveLength(2);
  });

  it("retries dispatch for a blocked operator-owned job", async () => {
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [createJobRow({ org_id: QUOTE_ID, status: "DISPATCH_FAILED", operator_role: "BUSINESS_OPERATOR" })]
      })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [createJobRow({ org_id: QUOTE_ID, status: "REQUESTED", operator_role: "BUSINESS_OPERATOR" })]
      })
      .mockResolvedValue({ rowCount: 1, rows: [] });

    const pg = {
      withIdempotency: vi.fn().mockImplementation(async ({ execute }) => ({
        replay: false,
        ...(await execute({ query: clientQuery }))
      }))
    };
    const payments = {
      createPaymentForJob: vi.fn(),
      previewCancellationSettlementForJob: vi.fn(),
      enqueueCancellationSettlement: vi.fn()
    };

    const service = new JobsService(pg as never, payments as never);
    const result = await service.retryDispatch(JOB_ID, ACTOR_ID, "idem-retry-1");

    expect(result.body.status).toBe("REQUESTED");
    expect(
      clientQuery.mock.calls.some(
        ([sql, params]) =>
          String(sql).includes("insert into public.outbox_messages") && params?.[2] === "JOB_DISPATCH_REQUESTED"
      )
    ).toBe(true);
  });

  it("creates a manual reassign offer for an eligible driver", async () => {
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          createJobRow({
            org_id: QUOTE_ID,
            status: "ASSIGNED",
            assigned_driver_id: DRIVER_ID,
            operator_role: "BUSINESS_OPERATOR"
          })
        ]
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ driver_id: DRIVER_ID }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [createJobRow({ org_id: QUOTE_ID, status: "REQUESTED", assigned_driver_id: null })]
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "offer-manual-1" }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ next_attempt_number: 1 }] })
      .mockResolvedValue({ rowCount: 1, rows: [] });

    const pg = {
      withIdempotency: vi.fn().mockImplementation(async ({ execute }) => ({
        replay: false,
        ...(await execute({ query: clientQuery }))
      }))
    };
    const payments = {
      createPaymentForJob: vi.fn(),
      previewCancellationSettlementForJob: vi.fn(),
      enqueueCancellationSettlement: vi.fn()
    };

    const service = new JobsService(pg as never, payments as never);
    const result = await service.reassignDriver(
      JOB_ID,
      { driverId: DRIVER_ID },
      ACTOR_ID,
      "idem-reassign-1"
    );

    expect(result.body.status).toBe("REQUESTED");
    expect(
      clientQuery.mock.calls.some(([sql]) => String(sql).includes("insert into public.job_dispatch_attempts"))
    ).toBe(true);
  });

  it("blocks cancellation for unauthorized actors", async () => {
    const pg = {
      withIdempotency: vi.fn().mockImplementation(async ({ execute }) =>
        execute({
          query: vi.fn().mockResolvedValueOnce({
            rowCount: 1,
            rows: [createJobRow({ consumer_id: DRIVER_USER_ID, operator_role: null })]
          })
        })
      )
    };
    const payments = {
      createPaymentForJob: vi.fn(),
      previewCancellationSettlementForJob: vi.fn(),
      enqueueCancellationSettlement: vi.fn()
    };

    const service = new JobsService(pg as never, payments as never);

    await expect(
      service.cancelJob(
        JOB_ID,
        { reason: "Customer changed mind", settlementPolicyCode: "PENDING_PAYMENT_RULES" },
        ACTOR_ID,
        "idem-cancel-1"
      )
    ).rejects.toThrow(new ForbiddenException("job_cancel_not_allowed"));
  });

  it("rejects cancellation after pickup", async () => {
    const pg = {
      withIdempotency: vi.fn().mockImplementation(async ({ execute }) =>
        execute({
          query: vi.fn().mockResolvedValueOnce({
            rowCount: 1,
            rows: [createJobRow({ status: "PICKED_UP", consumer_id: ACTOR_ID, operator_role: null })]
          })
        })
      )
    };
    const payments = {
      createPaymentForJob: vi.fn(),
      previewCancellationSettlementForJob: vi.fn(),
      enqueueCancellationSettlement: vi.fn()
    };

    const service = new JobsService(pg as never, payments as never);

    await expect(
      service.cancelJob(
        JOB_ID,
        { reason: "Customer changed mind", settlementPolicyCode: "PENDING_PAYMENT_RULES" },
        ACTOR_ID,
        "idem-cancel-2"
      )
    ).rejects.toThrow(new ConflictException("job_not_cancelable"));
  });

  it("clears active_job_id and enqueues notification on cancellation", async () => {
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          createJobRow({
            status: "ASSIGNED",
            assigned_driver_id: DRIVER_ID,
            consumer_id: ACTOR_ID,
            operator_role: null
          })
        ]
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [createJobRow({ status: "CANCELLED", assigned_driver_id: DRIVER_ID })]
      })
      .mockResolvedValue({ rowCount: 1, rows: [] });

    const pg = {
      withIdempotency: vi.fn().mockImplementation(async ({ execute }) => ({
        replay: false,
        ...(await execute({ query: clientQuery }))
      }))
    };
    const payments = {
      createPaymentForJob: vi.fn(),
      previewCancellationSettlementForJob: vi.fn().mockResolvedValue({
        settlementCode: "AFTER_ASSIGNMENT_CANCELLATION_FEE",
        cancellationFeeCents: 250,
        refundAmountCents: 0,
        snapshot: { phase: "AFTER_ASSIGNMENT_BEFORE_PICKUP" }
      }),
      enqueueCancellationSettlement: vi.fn()
    };

    const service = new JobsService(pg as never, payments as never);
    const result = await service.cancelJob(
      JOB_ID,
      { reason: "Store closed early", settlementPolicyCode: "PENDING_PAYMENT_RULES" },
      ACTOR_ID,
      "idem-cancel-3"
    );

    expect(result.body.status).toBe("CANCELLED");
    const driverUpdateCall = clientQuery.mock.calls.find(([sql]) =>
      String(sql).includes("update public.drivers")
    );
    expect(driverUpdateCall?.[1]).toEqual([DRIVER_ID, JOB_ID]);
    const outboxCall = clientQuery.mock.calls.find(
      ([sql, params]) =>
        String(sql).includes("insert into public.outbox_messages") && params?.[2] === "NOTIFY_JOB_CANCELLED"
    );
    expect(outboxCall).toBeTruthy();
  });
});
