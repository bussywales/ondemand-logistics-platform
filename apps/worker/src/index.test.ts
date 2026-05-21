import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  computeRetrySeconds,
  dispatchSideEffect,
  processBatchWithLogger,
  setAdminNotificationConfigForTests,
  setNotificationProviderForTests,
  setPaymentProviderForTests
} from "./index.js";

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
  const query = vi.fn(async (sql: string, _params?: unknown[]) => {
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

function latestAuditMetadata(client: ReturnType<typeof createClientStub>) {
  const auditCall = client.query.mock.calls.find(([sql]) => String(sql).includes("insert into public.audit_log"));
  const metadata = auditCall?.[1]?.[6];
  if (typeof metadata !== "string") {
    throw new Error("Expected audit metadata JSON");
  }
  return JSON.parse(metadata) as Record<string, unknown>;
}

beforeEach(() => {
  vi.unstubAllGlobals();
  setAdminNotificationConfigForTests({ webhookUrl: null, adminEmail: null });
  setNotificationProviderForTests({
    provider: "noop",
    isConfigured: () => false,
    sendEmail: vi.fn()
  });
});

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
      { match: "insert into public.outbox_messages" },
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
      { match: "insert into public.outbox_messages" },
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
      { match: "update public.customer_orders", result: { rowCount: 1, rows: [{ id: "order-1", status: "FULFILLED" }] } },
      { match: "insert into public.audit_log" },
      { match: "insert into public.outbox_messages" },
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

  it("completes a customer order on replay when payment is already captured and job is delivered", async () => {
    const client = createClientStub([
      {
        match: "from public.payments p",
        result: {
          rows: [
            {
              id: "pay-replay",
              job_id: "job-replay",
              provider: "stripe",
              provider_payment_intent_id: "pi_replay",
              status: "CAPTURED",
              amount_authorized_cents: 1600,
              amount_captured_cents: 1600,
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
      { match: "update public.customer_orders", result: { rowCount: 1, rows: [{ id: "order-replay", status: "FULFILLED" }] } },
      { match: "insert into public.audit_log" },
      { match: "insert into public.outbox_messages" }
    ]);

    await dispatchSideEffect(
      client as never,
      {
        id: "msg-pay-replay",
        aggregate_type: "payment",
        aggregate_id: "pay-replay",
        event_type: "PAYMENT_CAPTURE_REQUESTED",
        payload: { paymentId: "pay-replay", requestId: "req-pay-replay" },
        retry_count: 0
      },
      createLoggerStub()
    );

    expect(client.remainingSteps()).toBe(0);
  });

  it("does not complete a customer order when job is not delivered", async () => {
    const client = createClientStub([
      {
        match: "from public.payments p",
        result: {
          rows: [
            {
              id: "pay-not-delivered",
              job_id: "job-not-delivered",
              provider: "stripe",
              provider_payment_intent_id: "pi_not_delivered",
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
              job_status: "ASSIGNED",
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
        id: "msg-pay-not-delivered",
        aggregate_type: "payment",
        aggregate_id: "pay-not-delivered",
        event_type: "PAYMENT_CAPTURE_REQUESTED",
        payload: { paymentId: "pay-not-delivered", requestId: "req-pay-not-delivered" },
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

  it("skips external notifications safely when the provider is not configured", async () => {
    setNotificationProviderForTests({
      provider: "noop",
      isConfigured: () => false,
      sendEmail: vi.fn()
    });

    const client = createClientStub([
      {
        match: "from public.customer_orders o",
        result: {
          rows: [
            {
              order_id: "order-10",
              org_id: "org-10",
              job_id: "job-10",
              payment_id: "payment-10",
              customer_name: "Ada Customer",
              customer_email: "ada@example.com",
              delivery_address: "10 Pilot Street, London",
              total_cents: 1886,
              currency: "gbp",
              restaurant_name: "Pilot Kitchen",
              restaurant_slug: "pilot-kitchen",
              org_name: "Pilot Org",
              business_email: "ops@example.com"
            }
          ]
        }
      },
      { match: "insert into public.audit_log" }
    ]);

    await dispatchSideEffect(
      client as never,
      {
        id: "msg-notify-1",
        aggregate_type: "customer_order",
        aggregate_id: "order-10",
        event_type: "NOTIFY_CUSTOMER_ORDER_CONFIRMATION",
        payload: { orderId: "order-10", requestId: "req-notify-1" },
        retry_count: 0
      },
      createLoggerStub()
    );

    expect(client.remainingSteps()).toBe(0);
  });

  it("sends external notifications successfully with a mocked provider", async () => {
    const sendEmail = vi.fn().mockResolvedValue({ providerMessageId: "email_123" });
    setNotificationProviderForTests({
      provider: "resend",
      isConfigured: () => true,
      sendEmail
    });

    const client = createClientStub([
      {
        match: "from public.customer_orders o",
        result: {
          rows: [
            {
              order_id: "order-11",
              org_id: "org-11",
              job_id: "job-11",
              payment_id: "payment-11",
              customer_name: "Ada Customer",
              customer_email: "ada@example.com",
              delivery_address: "10 Pilot Street, London",
              total_cents: 1886,
              currency: "gbp",
              restaurant_name: "Pilot Kitchen",
              restaurant_slug: "pilot-kitchen",
              org_name: "Pilot Org",
              business_email: "ops@example.com"
            }
          ]
        }
      },
      { match: "insert into public.audit_log" }
    ]);

    await dispatchSideEffect(
      client as never,
      {
        id: "msg-notify-2",
        aggregate_type: "customer_order",
        aggregate_id: "order-11",
        event_type: "NOTIFY_BUSINESS_NEW_ORDER",
        payload: { orderId: "order-11", requestId: "req-notify-2" },
        retry_count: 0
      },
      createLoggerStub()
    );

    expect(sendEmail).toHaveBeenCalledOnce();
    expect(client.remainingSteps()).toBe(0);
  });

  it("skips admin demo request notifications safely when no channel is configured", async () => {
    setAdminNotificationConfigForTests({ webhookUrl: null, adminEmail: null });
    setNotificationProviderForTests({
      provider: "noop",
      isConfigured: () => false,
      sendEmail: vi.fn()
    });

    const client = createClientStub([{ match: "insert into public.audit_log" }]);

    await dispatchSideEffect(
      client as never,
      {
        id: "msg-demo-1",
        aggregate_type: "demo_request",
        aggregate_id: "demo-1",
        event_type: "NOTIFY_ADMIN_DEMO_REQUEST_CREATED",
        payload: {
          demoRequestId: "demo-1",
          requesterEmail: "buyer@example.com",
          interestType: "PILOT_MERCHANT"
        },
        retry_count: 0
      },
      createLoggerStub()
    );

    expect(client.remainingSteps()).toBe(0);
    expect(latestAuditMetadata(client)).toMatchObject({
      eventType: "NOTIFY_ADMIN_DEMO_REQUEST_CREATED",
      reason: "admin_notification_not_configured",
      sentChannels: [],
      skippedChannels: ["webhook:not_configured", "email:admin_notification_email_not_configured"],
      webhookConfigured: false,
      adminEmailConfigured: false
    });
  });

  it("posts admin demo request notifications to the configured webhook", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => ""
    });
    vi.stubGlobal("fetch", fetchMock);
    setAdminNotificationConfigForTests({ webhookUrl: "https://hooks.example.test/demo", adminEmail: null });
    setNotificationProviderForTests({
      provider: "noop",
      isConfigured: () => false,
      sendEmail: vi.fn()
    });

    const client = createClientStub([{ match: "insert into public.audit_log" }]);

    await dispatchSideEffect(
      client as never,
      {
        id: "msg-demo-2",
        aggregate_type: "demo_request",
        aggregate_id: "demo-2",
        event_type: "DEMO_REQUEST_STATUS_UPDATED",
        payload: {
          demoRequestId: "demo-2",
          requesterEmail: "buyer@example.com",
          previousStatus: "NEW",
          newStatus: "REVIEWED",
          status: "REVIEWED",
          updatedAt: "2026-05-20T10:00:00.000Z"
        },
        retry_count: 0
      },
      createLoggerStub()
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://hooks.example.test/demo",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"eventType":"DEMO_REQUEST_STATUS_UPDATED"')
      })
    );
    expect(client.remainingSteps()).toBe(0);
    expect(latestAuditMetadata(client)).toMatchObject({
      eventType: "DEMO_REQUEST_STATUS_UPDATED",
      sentChannels: ["webhook"],
      skippedChannels: ["email:admin_notification_email_not_configured"],
      webhookConfigured: true
    });
  });

  it("sends admin demo request email when admin email and provider are configured", async () => {
    const sendEmail = vi.fn().mockResolvedValue({ providerMessageId: "email_demo_1" });
    setAdminNotificationConfigForTests({ webhookUrl: null, adminEmail: "admin@example.com" });
    setNotificationProviderForTests({
      provider: "resend",
      isConfigured: () => true,
      sendEmail
    });

    const client = createClientStub([{ match: "insert into public.audit_log" }]);

    await dispatchSideEffect(
      client as never,
      {
        id: "msg-demo-3",
        aggregate_type: "demo_request",
        aggregate_id: "demo-3",
        event_type: "DEMO_REQUEST_CONTACT_RECORDED",
        payload: {
          demoRequestId: "demo-3",
          requesterName: "Buyer One",
          requesterEmail: "buyer@example.com",
          lastContactedAt: "2026-05-20T10:00:00.000Z"
        },
        retry_count: 0
      },
      createLoggerStub()
    );

    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "admin@example.com" }));
    expect(client.remainingSteps()).toBe(0);
    expect(latestAuditMetadata(client)).toMatchObject({
      eventType: "DEMO_REQUEST_CONTACT_RECORDED",
      sentChannels: ["email"],
      skippedChannels: ["webhook:not_configured"],
      adminEmailConfigured: true,
      emailProvider: "resend"
    });
  });

  it("processes test admin notification events as skipped when config is absent", async () => {
    setAdminNotificationConfigForTests({ webhookUrl: null, adminEmail: null });
    setNotificationProviderForTests({
      provider: "noop",
      isConfigured: () => false,
      sendEmail: vi.fn()
    });

    const client = createClientStub([{ match: "insert into public.audit_log" }]);

    await dispatchSideEffect(
      client as never,
      {
        id: "msg-test-1",
        aggregate_type: "admin_notification_test",
        aggregate_id: "test-1",
        event_type: "TEST_ADMIN_NOTIFICATION",
        payload: {
          test: true,
          notificationType: "DEMO_REQUEST_CREATED",
          requestedChannel: "WEBHOOK",
          requestedBy: "admin-1",
          createdAt: "2026-05-21T10:00:00.000Z"
        },
        retry_count: 0
      },
      createLoggerStub()
    );

    expect(client.remainingSteps()).toBe(0);
    expect(latestAuditMetadata(client)).toMatchObject({
      eventType: "TEST_ADMIN_NOTIFICATION",
      test: true,
      notificationType: "DEMO_REQUEST_CREATED",
      requestedChannel: "WEBHOOK",
      sentChannels: [],
      skippedChannels: ["webhook:not_configured", "email:not_requested"],
      reason: "admin_notification_not_configured"
    });
  });

  it("processes invite lifecycle events through configured admin email", async () => {
    const sendEmail = vi.fn().mockResolvedValue({ providerMessageId: "email_invite_1" });
    setAdminNotificationConfigForTests({ webhookUrl: null, adminEmail: "admin@example.com" });
    setNotificationProviderForTests({
      provider: "resend",
      isConfigured: () => true,
      sendEmail
    });

    const client = createClientStub([{ match: "insert into public.audit_log" }]);

    await dispatchSideEffect(
      client as never,
      {
        id: "msg-invite-1",
        aggregate_type: "org_invitation",
        aggregate_id: "invite-1",
        event_type: "ORG_INVITE_CREATED",
        payload: {
          inviteId: "invite-1",
          orgId: "org-1",
          email: "operator@example.com",
          role: "OPERATOR",
          status: "PENDING",
          updatedAt: "2026-05-21T10:00:00.000Z"
        },
        retry_count: 0
      },
      createLoggerStub()
    );

    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "admin@example.com",
      subject: expect.stringContaining("ORG_INVITE_CREATED")
    }));
    expect(latestAuditMetadata(client)).toMatchObject({
      eventType: "ORG_INVITE_CREATED",
      inviteId: "invite-1",
      sentChannels: ["email"],
      skippedChannels: ["webhook:not_configured"]
    });
  });
});

describe("processBatchWithLogger", () => {
  it("records retry metadata when admin demo request webhook delivery fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => "temporary outage"
      })
    );
    setAdminNotificationConfigForTests({ webhookUrl: "https://hooks.example.test/demo", adminEmail: null });

    const client = createClientStub([
      {
        match: "from public.outbox_messages",
        result: {
          rows: [
            {
              id: "msg-demo-fail",
              aggregate_type: "demo_request",
              aggregate_id: "demo-fail",
              event_type: "NOTIFY_ADMIN_DEMO_REQUEST_CREATED",
              payload: { demoRequestId: "demo-fail", requestId: "req-demo-fail" },
              retry_count: 0
            }
          ]
        }
      },
      { match: "update public.outbox_messages" }
    ]);

    const handled = await processBatchWithLogger(
      client as never,
      {
        databaseUrl: "postgres://example",
        pollIntervalMs: 1000,
        batchSize: 20,
        maxRetries: 10
      },
      createLoggerStub()
    );

    expect(handled).toBe(1);
    expect(client.remainingSteps()).toBe(0);
    const updateCall = client.query.mock.calls.find(([sql]) => String(sql).includes("update public.outbox_messages"));
    expect(updateCall?.[1]).toEqual(expect.arrayContaining(["msg-demo-fail", false, 2, expect.stringContaining("admin_notification_webhook_failed:503")]));
  });

  it("does not crash the worker loop when an external notification provider fails", async () => {
    setNotificationProviderForTests({
      provider: "resend",
      isConfigured: () => true,
      sendEmail: vi.fn().mockRejectedValue(new Error("provider_down"))
    });

    const client = createClientStub([
      {
        match: "from public.outbox_messages",
        result: {
          rows: [
            {
              id: "msg-batch-1",
              aggregate_type: "customer_order",
              aggregate_id: "order-12",
              event_type: "NOTIFY_CUSTOMER_ORDER_CONFIRMATION",
              payload: { orderId: "order-12", requestId: "req-batch-1" },
              retry_count: 0
            }
          ]
        }
      },
      {
        match: "from public.customer_orders o",
        result: {
          rows: [
            {
              order_id: "order-12",
              org_id: "org-12",
              job_id: "job-12",
              payment_id: "payment-12",
              customer_name: "Ada Customer",
              customer_email: "ada@example.com",
              delivery_address: "10 Pilot Street, London",
              total_cents: 1886,
              currency: "gbp",
              restaurant_name: "Pilot Kitchen",
              restaurant_slug: "pilot-kitchen",
              org_name: "Pilot Org",
              business_email: "ops@example.com"
            }
          ]
        }
      },
      { match: "update public.outbox_messages" }
    ]);

    const handled = await processBatchWithLogger(
      client as never,
      {
        databaseUrl: "postgres://example",
        pollIntervalMs: 1000,
        batchSize: 20,
        maxRetries: 10
      },
      createLoggerStub()
    );

    expect(handled).toBe(1);
    expect(client.remainingSteps()).toBe(0);
  });
});
