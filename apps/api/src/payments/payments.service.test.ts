import { describe, expect, it, vi } from "vitest";
import { PaymentsService } from "./payments.service.js";

const JOB_ID = "57bf7cf0-7ac2-47a7-8fd5-83a96be6c848";
const PAYMENT_ID = "97077fd3-d5dc-4c4d-9d40-db262f6eab54";
const USER_ID = "cac11f1f-00da-4e24-96d9-b8f7620901a1";
const DRIVER_ID = "b07a5bfd-c96e-4de8-a061-858b2c61df8e";
const PROVIDER_PAYMENT_INTENT_ID = "pi_123";

function paymentContextRow(overrides: Record<string, unknown> = {}) {
  return {
    payment_id: PAYMENT_ID,
    job_id: JOB_ID,
    provider: "stripe",
    provider_payment_intent_id: PROVIDER_PAYMENT_INTENT_ID,
    payment_status: "REQUIRES_PAYMENT_METHOD",
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
    payment_created_at: new Date().toISOString(),
    payment_updated_at: new Date().toISOString(),
    job_status: "REQUESTED",
    consumer_id: USER_ID,
    assigned_driver_id: DRIVER_ID,
    org_id: null,
    ...overrides
  };
}

function paymentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: PAYMENT_ID,
    job_id: JOB_ID,
    provider: "stripe",
    provider_payment_intent_id: PROVIDER_PAYMENT_INTENT_ID,
    status: "AUTHORIZED",
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
    ...overrides
  };
}

function providerStub(overrides: Record<string, unknown> = {}) {
  return {
    provider: "stripe",
    isConfigured: vi.fn().mockReturnValue(true),
    createPaymentIntent: vi.fn(),
    authorizePaymentIntent: vi.fn(),
    capturePaymentIntent: vi.fn(),
    cancelPaymentIntent: vi.fn(),
    refundPaymentIntent: vi.fn(),
    verifyWebhookSignature: vi.fn(),
    ...overrides
  };
}

describe("PaymentsService", () => {
  it("authorizes a job payment and persists provider state", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [paymentContextRow()] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          paymentRow({
            status: "AUTHORIZED",
            amount_authorized_cents: 1600,
            provider_payment_intent_id: PROVIDER_PAYMENT_INTENT_ID
          })
        ]
      })
      .mockResolvedValue({ rowCount: 1, rows: [] });

    const pg = {
      withIdempotency: vi.fn().mockImplementation(async ({ execute }) => ({
        replay: false,
        ...(await execute({ query }))
      }))
    };
    const provider = providerStub({
      authorizePaymentIntent: vi.fn().mockResolvedValue({
        provider: "stripe",
        providerPaymentIntentId: PROVIDER_PAYMENT_INTENT_ID,
        status: "AUTHORIZED",
        amountAuthorizedCents: 1600,
        amountCapturedCents: 0,
        amountRefundedCents: 0,
        currency: "gbp",
        captureMethod: "manual",
        clientSecret: "secret_123",
        rawPayload: {}
      })
    });

    const service = new PaymentsService(pg as never, provider as never);
    const result = await service.authorizeJobPayment(
      JOB_ID,
      { paymentMethodId: "pm_card_visa" },
      USER_ID,
      "idem-pay-1"
    );

    expect(result.body.status).toBe("AUTHORIZED");
    expect(provider.authorizePaymentIntent).toHaveBeenCalledOnce();
  });

  it("deduplicates repeated Stripe webhook events", async () => {
    const query = vi.fn().mockResolvedValueOnce({ rowCount: 1, rows: [{ exists: 1 }] });
    const pg = {
      withTransaction: vi.fn().mockImplementation(async (callback) => callback({ query }))
    };
    const provider = providerStub({
      verifyWebhookSignature: vi.fn().mockReturnValue({
        id: "evt_123",
        type: "payment_intent.succeeded",
        raw: {} as never,
        paymentIntent: null,
        refund: null
      })
    });

    const service = new PaymentsService(pg as never, provider as never);
    const result = await service.handleStripeWebhook(Buffer.from("{}"), "sig_123");

    expect(result).toEqual({ received: true, duplicate: true, eventId: "evt_123" });
  });

  it("records refund webhook state transitions", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [paymentRow({ amount_captured_cents: 1600, amount_refunded_cents: 0 })] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: "refund-1",
            payment_id: PAYMENT_ID,
            job_id: JOB_ID,
            provider_refund_id: "re_123",
            status: "SUCCEEDED",
            amount_cents: 400,
            currency: "gbp",
            reason_code: "refund.updated",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]
      })
      .mockResolvedValue({ rowCount: 1, rows: [] });
    const pg = {
      withTransaction: vi.fn().mockImplementation(async (callback) => callback({ query }))
    };
    const provider = providerStub({
      verifyWebhookSignature: vi.fn().mockReturnValue({
        id: "evt_refund_1",
        type: "refund.updated",
        raw: {} as never,
        paymentIntent: null,
        refund: {
          id: "re_123",
          amount: 400,
          currency: "gbp",
          status: "succeeded",
          payment_intent: PROVIDER_PAYMENT_INTENT_ID
        }
      })
    });

    const service = new PaymentsService(pg as never, provider as never);
    const result = await service.handleStripeWebhook(Buffer.from("{}"), "sig_123");

    expect(result.received).toBe(true);
    expect(query.mock.calls.some(([sql]) => String(sql).includes("insert into public.refunds"))).toBe(true);
    expect(query.mock.calls.some(([sql]) => String(sql).includes("update public.payments"))).toBe(true);
  });
});
