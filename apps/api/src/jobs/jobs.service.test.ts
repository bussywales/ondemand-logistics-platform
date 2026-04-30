import { ConflictException, NotFoundException } from "@nestjs/common";
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

  it("returns empty-state tracking payloads and coerces timeline ids from pg strings", async () => {
    const createdAt = new Date("2026-04-22T22:40:00.000Z");
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            createJobRow({
              status: "REQUESTED",
              assigned_driver_id: null,
              driver_user_id: null,
              driver_display_name: null,
              driver_latest_latitude: null,
              driver_latest_longitude: null,
              driver_last_location_at: null
            })
          ]
        })
        .mockResolvedValueOnce({
          rowCount: 0,
          rows: []
        })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: "7",
              event_type: "JOB_REQUESTED",
              actor_id: ACTOR_ID,
              created_at: createdAt,
              payload: {}
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

    expect(tracking.assignedDriver).toBeNull();
    expect(tracking.dispatchAttempts).toEqual([]);
    expect(tracking.timeline).toEqual([
      {
        id: 7,
        eventType: "JOB_REQUESTED",
        actorId: ACTOR_ID,
        createdAt: createdAt.toISOString(),
        payload: {}
      }
    ]);
  });

  it("returns an empty business jobs page for an onboarded operator with no jobs", async () => {
    const pg = {
      query: vi.fn().mockResolvedValue({
        rowCount: 0,
        rows: []
      })
    };
    const payments = {
      createPaymentForJob: vi.fn(),
      previewCancellationSettlementForJob: vi.fn(),
      enqueueCancellationSettlement: vi.fn()
    };

    const service = new JobsService(pg as never, payments as never);
    const result = await service.listBusinessJobs(ACTOR_ID, 1, 20);

    expect(result).toEqual({
      items: [],
      page: 1,
      limit: 20,
      hasMore: false
    });
  });

  it("returns org-scoped business jobs", async () => {
    const pg = {
      query: vi.fn().mockResolvedValue({
        rowCount: 1,
        rows: [createJobRow({ org_id: QUOTE_ID, created_at: new Date().toISOString() })]
      })
    };
    const payments = {
      createPaymentForJob: vi.fn(),
      previewCancellationSettlementForJob: vi.fn(),
      enqueueCancellationSettlement: vi.fn()
    };

    const service = new JobsService(pg as never, payments as never);
    const result = await service.listBusinessJobs(ACTOR_ID, 1, 20);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.orgId).toBe(QUOTE_ID);
    expect(result.items[0]?.id).toBe(JOB_ID);
  });

  it("serializes pg dates in business jobs responses", async () => {
    const createdAt = new Date("2026-04-22T13:10:00.000Z");
    const pg = {
      query: vi.fn().mockResolvedValue({
        rowCount: 1,
        rows: [createJobRow({ org_id: QUOTE_ID, created_at: createdAt })]
      })
    };
    const payments = {
      createPaymentForJob: vi.fn(),
      previewCancellationSettlementForJob: vi.fn(),
      enqueueCancellationSettlement: vi.fn()
    };

    const service = new JobsService(pg as never, payments as never);
    const result = await service.listBusinessJobs(ACTOR_ID, 1, 20);

    expect(result.items[0]?.createdAt).toBe(createdAt.toISOString());
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

  it("replays retry dispatch idempotently without creating duplicate side effects", async () => {
    const pg = {
      withIdempotency: vi.fn().mockResolvedValue({
        replay: true,
        responseCode: 200,
        body: { ...createJobRow({ org_id: QUOTE_ID, status: "REQUESTED" }), orgId: QUOTE_ID }
      })
    };
    const payments = {
      createPaymentForJob: vi.fn(),
      previewCancellationSettlementForJob: vi.fn(),
      enqueueCancellationSettlement: vi.fn()
    };

    const service = new JobsService(pg as never, payments as never);
    const result = await service.retryDispatch(JOB_ID, ACTOR_ID, "idem-retry-replay-1");

    expect(result.replay).toBe(true);
    expect(pg.withIdempotency).toHaveBeenCalledOnce();
  });

  it("blocks retry dispatch for delivered jobs", async () => {
    const pg = {
      withIdempotency: vi.fn().mockImplementation(async ({ execute }) =>
        execute({
          query: vi.fn().mockResolvedValueOnce({
            rowCount: 1,
            rows: [createJobRow({ org_id: QUOTE_ID, status: "DELIVERED" })]
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

    await expect(service.retryDispatch(JOB_ID, ACTOR_ID, "idem-retry-delivered-1")).rejects.toThrow(
      new ConflictException("job_not_retryable")
    );
  });

  it("blocks retry dispatch for cancelled jobs", async () => {
    const pg = {
      withIdempotency: vi.fn().mockImplementation(async ({ execute }) =>
        execute({
          query: vi.fn().mockResolvedValueOnce({
            rowCount: 1,
            rows: [createJobRow({ org_id: QUOTE_ID, status: "CANCELLED" })]
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

    await expect(service.retryDispatch(JOB_ID, ACTOR_ID, "idem-retry-cancelled-1")).rejects.toThrow(
      new ConflictException("job_not_retryable")
    );
  });

  it("fails closed for cross-org retry dispatch access", async () => {
    const pg = {
      withIdempotency: vi.fn().mockImplementation(async ({ execute }) =>
        execute({
          query: vi.fn().mockResolvedValueOnce({ rowCount: 0, rows: [] })
        })
      )
    };
    const payments = {
      createPaymentForJob: vi.fn(),
      previewCancellationSettlementForJob: vi.fn(),
      enqueueCancellationSettlement: vi.fn()
    };

    const service = new JobsService(pg as never, payments as never);

    await expect(service.retryDispatch(JOB_ID, ACTOR_ID, "idem-retry-cross-org-1")).rejects.toThrow(
      new NotFoundException("job_not_found")
    );
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
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            driver_id: DRIVER_ID,
            display_name: "Alex Rider",
            is_active: true,
            availability_status: "ONLINE",
            latest_latitude: "51.500000",
            latest_longitude: "-0.100000",
            last_location_at: new Date("2026-04-29T09:00:00.000Z"),
            active_job_id: null,
            active_job_status: null,
            verification_status: "APPROVED",
            vehicle_type: "BIKE",
            has_matching_vehicle: true,
            has_open_offer: false,
            distance_miles: "0.40"
          }
        ]
      })
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

  it("allows manual assignment for dispatch-failed jobs", async () => {
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          createJobRow({
            org_id: QUOTE_ID,
            status: "DISPATCH_FAILED",
            assigned_driver_id: null,
            operator_role: "BUSINESS_OPERATOR"
          })
        ]
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            driver_id: DRIVER_ID,
            display_name: "Alex Rider",
            is_active: true,
            availability_status: "ONLINE",
            latest_latitude: "51.500000",
            latest_longitude: "-0.100000",
            last_location_at: new Date("2026-04-29T09:00:00.000Z"),
            active_job_id: null,
            active_job_status: null,
            verification_status: "APPROVED",
            vehicle_type: "BIKE",
            has_matching_vehicle: true,
            has_open_offer: false,
            distance_miles: "0.40"
          }
        ]
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [createJobRow({ org_id: QUOTE_ID, status: "REQUESTED", assigned_driver_id: null })]
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "offer-manual-2" }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ next_attempt_number: 2 }] })
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
    const result = await service.reassignDriver(JOB_ID, { driverId: DRIVER_ID }, ACTOR_ID, "idem-reassign-2");

    expect(result.body.status).toBe("REQUESTED");
  });

  it("rejects manual reassignment for ineligible drivers with a machine-readable reason", async () => {
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          createJobRow({
            org_id: QUOTE_ID,
            status: "DISPATCH_FAILED"
          })
        ]
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            driver_id: DRIVER_ID,
            display_name: "Jamie Offline",
            is_active: true,
            availability_status: "OFFLINE",
            latest_latitude: null,
            latest_longitude: null,
            last_location_at: null,
            active_job_id: null,
            active_job_status: null,
            verification_status: "APPROVED",
            vehicle_type: "BIKE",
            has_matching_vehicle: true,
            has_open_offer: false,
            distance_miles: null
          }
        ]
      });

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

    await expect(
      service.reassignDriver(JOB_ID, { driverId: DRIVER_ID }, ACTOR_ID, "idem-reassign-ineligible-1")
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        message: "driver_not_eligible_for_reassign",
        reason: "OFFLINE",
        suitabilityFlags: ["OFFLINE", "NO_LIVE_LOCATION"]
      })
    });
    expect(clientQuery).toHaveBeenCalledTimes(2);
  });

  it("replays reassign driver idempotently without creating duplicate side effects", async () => {
    const pg = {
      withIdempotency: vi.fn().mockResolvedValue({
        replay: true,
        responseCode: 200,
        body: { ...createJobRow({ org_id: QUOTE_ID, status: "REQUESTED" }), orgId: QUOTE_ID }
      })
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
      "idem-reassign-replay-1"
    );

    expect(result.replay).toBe(true);
    expect(pg.withIdempotency).toHaveBeenCalledOnce();
  });

  it("lists eligible and blocked drivers for operator assignment", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [createJobRow({ org_id: QUOTE_ID, operator_role: "BUSINESS_OPERATOR" })]
      })
      .mockResolvedValueOnce({
        rowCount: 2,
        rows: [
          {
            driver_id: DRIVER_ID,
            display_name: "Alex Rider",
            availability_status: "ONLINE",
            latest_latitude: "51.500000",
            latest_longitude: "-0.100000",
            last_location_at: new Date("2026-04-29T09:00:00.000Z"),
            active_job_id: null,
            active_job_status: null,
            verification_status: "APPROVED",
            vehicle_type: "BIKE",
            has_matching_vehicle: true,
            has_open_offer: false,
            distance_miles: "0.40"
          },
          {
            driver_id: "4819d6ff-860c-4e92-b899-4d7c28dfeb85",
            display_name: "Jamie Offline",
            availability_status: "OFFLINE",
            latest_latitude: null,
            latest_longitude: null,
            last_location_at: null,
            active_job_id: "8ae1ea9d-5e86-4c27-a84b-f9b7e2dd5af0",
            active_job_status: "ASSIGNED",
            verification_status: "PENDING",
            vehicle_type: "CAR",
            has_matching_vehicle: false,
            has_open_offer: true,
            distance_miles: null
          }
        ]
      });
    const pg = { query };
    const payments = {
      createPaymentForJob: vi.fn(),
      previewCancellationSettlementForJob: vi.fn(),
      enqueueCancellationSettlement: vi.fn()
    };

    const service = new JobsService(pg as never, payments as never);
    const result = await service.listEligibleDrivers(JOB_ID, ACTOR_ID);

    expect(result.items).toEqual([
      expect.objectContaining({
        id: DRIVER_ID,
        displayName: "Alex Rider",
        eligible: true,
        suitabilityFlags: ["READY"],
        suitabilityReason: "Online, approved, and ready for manual assignment."
      }),
      expect.objectContaining({
        id: "4819d6ff-860c-4e92-b899-4d7c28dfeb85",
        eligible: false,
        suitabilityFlags: expect.arrayContaining([
          "OFFLINE",
          "ACTIVE_JOB",
          "VEHICLE_MISMATCH",
          "VERIFICATION_NOT_APPROVED",
          "NO_LIVE_LOCATION",
          "EXISTING_OPEN_OFFER"
        ]),
        suitabilityReason: "Driver already has an active job and cannot be reassigned."
      })
    ]);
  });

  it("blocks eligible driver lookup for non-operators", async () => {
    const query = vi.fn().mockResolvedValueOnce({
      rowCount: 0,
      rows: []
    });
    const pg = { query };
    const payments = {
      createPaymentForJob: vi.fn(),
      previewCancellationSettlementForJob: vi.fn(),
      enqueueCancellationSettlement: vi.fn()
    };

    const service = new JobsService(pg as never, payments as never);

    await expect(service.listEligibleDrivers(JOB_ID, ACTOR_ID)).rejects.toThrow(new NotFoundException("job_not_found"));
  });

  it("fails closed for unauthorized cancellation access", async () => {
    const pg = {
      withIdempotency: vi.fn().mockImplementation(async ({ execute }) =>
        execute({
          query: vi.fn().mockResolvedValueOnce({ rowCount: 0, rows: [] })
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
    ).rejects.toThrow(new NotFoundException("job_not_found"));
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

  it("replays cancel idempotently without duplicate side effects", async () => {
    const pg = {
      withIdempotency: vi.fn().mockResolvedValue({
        replay: true,
        responseCode: 200,
        body: { ...createJobRow({ status: "CANCELLED" }), orgId: null }
      })
    };
    const payments = {
      createPaymentForJob: vi.fn(),
      previewCancellationSettlementForJob: vi.fn(),
      enqueueCancellationSettlement: vi.fn()
    };

    const service = new JobsService(pg as never, payments as never);
    const result = await service.cancelJob(
      JOB_ID,
      { reason: "Store closed early", settlementPolicyCode: "PENDING_PAYMENT_RULES" },
      ACTOR_ID,
      "idem-cancel-replay-1"
    );

    expect(result.replay).toBe(true);
    expect(payments.enqueueCancellationSettlement).not.toHaveBeenCalled();
  });

  it("blocks cancellation for delivered jobs", async () => {
    const pg = {
      withIdempotency: vi.fn().mockImplementation(async ({ execute }) =>
        execute({
          query: vi.fn().mockResolvedValueOnce({
            rowCount: 1,
            rows: [createJobRow({ status: "DELIVERED", consumer_id: ACTOR_ID, operator_role: null })]
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
        { reason: "Store closed early", settlementPolicyCode: "PENDING_PAYMENT_RULES" },
        ACTOR_ID,
        "idem-cancel-delivered-1"
      )
    ).rejects.toThrow(new ConflictException("job_not_cancelable"));
  });

  it("fails closed for cross-org cancel access", async () => {
    const pg = {
      withIdempotency: vi.fn().mockImplementation(async ({ execute }) =>
        execute({
          query: vi.fn().mockResolvedValueOnce({ rowCount: 0, rows: [] })
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
        { reason: "Store closed early", settlementPolicyCode: "PENDING_PAYMENT_RULES" },
        ACTOR_ID,
        "idem-cancel-cross-org-1"
      )
    ).rejects.toThrow(new NotFoundException("job_not_found"));
  });
});
