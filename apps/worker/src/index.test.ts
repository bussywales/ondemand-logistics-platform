import { describe, expect, it, vi } from "vitest";
import { computeRetrySeconds, dispatchSideEffect, setPaymentProviderForTests } from "./index.js";

function createLoggerStub() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  } as never;
}

function createClientStub(
  steps: Array<{ match: string; result?: { rowCount?: number; rows?: unknown[] } }>
) {
  const query = vi.fn(async (sql: string) => {
    const step = steps.shift();
    if (!step) {
      throw new Error(`Unexpected query: ${sql}`);
    }

    expect(sql).toContain(step.match);
    return {
      rowCount: step.result?.rowCount ?? step.result?.rows?.length ?? 0,
      rows: step.result?.rows ?? []
    };
  });

  return {
    query,
    remainingSteps: () => steps.length
  };
}

describe("computeRetrySeconds", () => {
  it("uses exponential backoff and caps growth", () => {
    expect(computeRetrySeconds(0)).toBe(1);
    expect(computeRetrySeconds(1)).toBe(2);
    expect(computeRetrySeconds(4)).toBe(16);
    expect(computeRetrySeconds(8)).toBe(64);
  });
});

describe("dispatchSideEffect", () => {
  it("records graceful dispatch failure when no drivers are available", async () => {
    const client = createClientStub([
      {
        match: "from public.jobs",
        result: {
          rows: [
            {
              id: "job-1",
              org_id: null,
              consumer_id: "consumer-1",
              assigned_driver_id: null,
              status: "REQUESTED",
              vehicle_required: "BIKE",
              distance_miles: "4.2",
              eta_minutes: 14,
              driver_payout_gross_cents: 900,
              pickup_latitude: "51.500000",
              pickup_longitude: "-0.100000"
            }
          ]
        }
      },
      { match: "from public.job_offers", result: { rows: [] } },
      { match: "from public.drivers d", result: { rows: [] } },
      { match: "from public.job_dispatch_attempts", result: { rows: [{ next_attempt_number: 1 }] } },
      { match: "insert into public.job_dispatch_attempts" },
      { match: "update public.jobs" },
      { match: "insert into public.job_events" },
      { match: "insert into public.audit_log" }
    ]);

    await dispatchSideEffect(
      client as never,
      {
        id: "msg-1",
        aggregate_type: "job",
        aggregate_id: "job-1",
        event_type: "JOB_DISPATCH_REQUESTED",
        payload: { jobId: "job-1", requestId: "req-1" },
        retry_count: 0
      },
      createLoggerStub()
    );

    expect(client.remainingSteps()).toBe(0);
  });

  it("creates an offer for the first eligible driver", async () => {
    const client = createClientStub([
      {
        match: "from public.jobs",
        result: {
          rows: [
            {
              id: "job-2",
              org_id: "org-1",
              consumer_id: "consumer-1",
              assigned_driver_id: null,
              status: "REQUESTED",
              vehicle_required: "CAR",
              distance_miles: "9.1",
              eta_minutes: 28,
              driver_payout_gross_cents: 1500,
              pickup_latitude: "51.500000",
              pickup_longitude: "-0.100000"
            }
          ]
        }
      },
      { match: "from public.job_offers", result: { rows: [] } },
      {
        match: "from public.drivers d",
        result: {
          rows: [
            {
              driver_id: "driver-1",
              user_id: "user-1",
              latest_latitude: "51.499000",
              latest_longitude: "-0.101000",
              reliability_score: "0.900"
            }
          ]
        }
      },
      {
        match: "insert into public.job_offers",
        result: {
          rows: [
            {
              id: "offer-1",
              driver_id: "driver-1",
              expires_at: new Date(Date.now() + 30_000).toISOString()
            }
          ]
        }
      },
      { match: "from public.job_dispatch_attempts", result: { rows: [{ next_attempt_number: 1 }] } },
      { match: "insert into public.job_dispatch_attempts" },
      { match: "update public.jobs" },
      { match: "insert into public.job_events" },
      { match: "insert into public.audit_log" },
      { match: "insert into public.outbox_messages" }
    ]);

    await dispatchSideEffect(
      client as never,
      {
        id: "msg-2",
        aggregate_type: "job",
        aggregate_id: "job-2",
        event_type: "JOB_DISPATCH_REQUESTED",
        payload: { jobId: "job-2", requestId: "req-2" },
        retry_count: 0
      },
      createLoggerStub()
    );

    expect(client.remainingSteps()).toBe(0);
  });

  it("redispatches after an expired offer", async () => {
    const client = createClientStub([
      {
        match: "from public.job_offers o",
        result: {
          rows: [
            {
              offer_id: "offer-9",
              job_id: "job-9",
              driver_id: "driver-old",
              status: "OFFERED",
              expires_at: new Date(Date.now() - 5_000).toISOString()
            }
          ]
        }
      },
      { match: "update public.job_offers", result: { rowCount: 1, rows: [] } },
      {
        match: "from public.jobs",
        result: {
          rows: [
            {
              id: "job-9",
              org_id: "org-1",
              consumer_id: "consumer-1",
              assigned_driver_id: null,
              status: "REQUESTED",
              vehicle_required: "CAR",
              distance_miles: "6.8",
              eta_minutes: 22,
              driver_payout_gross_cents: 1300,
              pickup_latitude: "51.500000",
              pickup_longitude: "-0.100000"
            }
          ]
        }
      },
      { match: "insert into public.job_events" },
      { match: "insert into public.audit_log" },
      { match: "insert into public.outbox_messages" },
      { match: "from public.drivers d", result: { rows: [{ driver_id: "driver-2", user_id: "user-2", latest_latitude: null, latest_longitude: null, reliability_score: "0.500" }] } },
      {
        match: "insert into public.job_offers",
        result: {
          rows: [
            {
              id: "offer-10",
              driver_id: "driver-2",
              expires_at: new Date(Date.now() + 30_000).toISOString()
            }
          ]
        }
      },
      { match: "from public.job_dispatch_attempts", result: { rows: [{ next_attempt_number: 2 }] } },
      { match: "insert into public.job_dispatch_attempts" },
      { match: "update public.jobs" },
      { match: "insert into public.job_events" },
      { match: "insert into public.audit_log" },
      { match: "insert into public.outbox_messages" }
    ]);

    await dispatchSideEffect(
      client as never,
      {
        id: "msg-3",
        aggregate_type: "job_offer",
        aggregate_id: "offer-9",
        event_type: "JOB_OFFER_EXPIRY_CHECK",
        payload: { offerId: "offer-9", requestId: "req-9" },
        retry_count: 0
      },
      createLoggerStub()
    );

    expect(client.remainingSteps()).toBe(0);
  });

  it("creates payout readiness after successful payment capture", async () => {
    setPaymentProviderForTests({
      provider: "stripe",
      isConfigured: () => true,
      createPaymentIntent: vi.fn(),
      authorizePaymentIntent: vi.fn(),
      capturePaymentIntent: vi.fn().mockResolvedValue({
        provider: "stripe",
        providerPaymentIntentId: "pi_123",
        status: "CAPTURED",
        amountAuthorizedCents: 1600,
        amountCapturedCents: 1600,
        amountRefundedCents: 0,
        currency: "gbp",
        captureMethod: "manual",
        clientSecret: null,
        rawPayload: {}
      }),
      cancelPaymentIntent: vi.fn(),
      refundPaymentIntent: vi.fn(),
      verifyWebhookSignature: vi.fn()
    } as never);

    const client = createClientStub([
      {
        match: "from public.payments p",
        result: {
          rows: [
            {
              id: "pay-1",
              job_id: "job-5",
              provider: "stripe",
              provider_payment_intent_id: "pi_123",
              status: "AUTHORIZED",
              amount_authorized_cents: 1600,
              amount_captured_cents: 0,
              amount_refunded_cents: 0,
              currency: "gbp",
              customer_total_cents: 1600,
              platform_fee_cents: 500,
              payout_gross_cents: 1100,
              settlement_snapshot: {},
              client_secret: null,
              last_error: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              consumer_id: "consumer-1",
              job_status: "DELIVERED",
              assigned_driver_id: "driver-1",
              org_id: "org-1"
            }
          ]
        }
      },
      { match: "update public.payments" },
      { match: "insert into public.payment_events" },
      { match: "insert into public.payout_ledger" },
      { match: "insert into public.audit_log" }
    ]);

    await dispatchSideEffect(
      client as never,
      {
        id: "msg-pay-1",
        aggregate_type: "payment",
        aggregate_id: "pay-1",
        event_type: "PAYMENT_CAPTURE_REQUESTED",
        payload: { paymentId: "pay-1", requestId: "req-pay-1" },
        retry_count: 0
      },
      createLoggerStub()
    );

    expect(client.remainingSteps()).toBe(0);
  });

  it("does not create payout ledger when payment is not authorized", async () => {
    const client = createClientStub([
      {
        match: "from public.payments p",
        result: {
          rows: [
            {
              id: "pay-2",
              job_id: "job-6",
              provider: "stripe",
              provider_payment_intent_id: "pi_456",
              status: "REQUIRES_PAYMENT_METHOD",
              amount_authorized_cents: 0,
              amount_captured_cents: 0,
              amount_refunded_cents: 0,
              currency: "gbp",
              customer_total_cents: 1600,
              platform_fee_cents: 500,
              payout_gross_cents: 1100,
              settlement_snapshot: {},
              client_secret: null,
              last_error: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              consumer_id: "consumer-1",
              job_status: "DELIVERED",
              assigned_driver_id: "driver-1",
              org_id: "org-1"
            }
          ]
        }
      }
    ]);

    await dispatchSideEffect(
      client as never,
      {
        id: "msg-pay-2",
        aggregate_type: "payment",
        aggregate_id: "pay-2",
        event_type: "PAYMENT_CAPTURE_REQUESTED",
        payload: { paymentId: "pay-2", requestId: "req-pay-2" },
        retry_count: 0
      },
      createLoggerStub()
    );

    expect(client.remainingSteps()).toBe(0);
  });
});
