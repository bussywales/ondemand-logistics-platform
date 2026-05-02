import { describe, expect, it } from "vitest";
import {
  getPaymentRiskReasons,
  getPaymentRiskState,
  getPaymentShortId,
  getPayoutStatusLabel,
  isPayoutReady,
  matchesPaymentFilter,
  summarizePaymentPortfolio
} from "./payments-state";
import type { BusinessPaymentSummary } from "./product-state";

function payment(overrides: Partial<BusinessPaymentSummary> = {}): BusinessPaymentSummary {
  return {
    id: "payment-12345678",
    orderId: "order-1",
    jobId: "job-1",
    restaurant: {
      id: "restaurant-1",
      name: "Pilot Kitchen",
      slug: "pilot-kitchen"
    },
    customerName: "Ada Customer",
    orderStatus: "PAYMENT_AUTHORIZED",
    jobStatus: "REQUESTED",
    paymentStatus: "AUTHORIZED",
    customerTotalCents: 1886,
    amountAuthorizedCents: 1886,
    amountCapturedCents: 0,
    amountRefundedCents: 0,
    currency: "GBP",
    platformFeeCents: 500,
    payoutGrossCents: 1386,
    payoutStatus: null,
    payoutHoldReason: null,
    createdAt: new Date("2026-05-02T09:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-05-02T09:30:00.000Z").toISOString(),
    ...overrides
  };
}

describe("payments-state", () => {
  it("summarizes portfolio counts", () => {
    const summary = summarizePaymentPortfolio([
      payment(),
      payment({ id: "payment-2", paymentStatus: "CAPTURED", payoutStatus: "READY" }),
      payment({ id: "payment-3", paymentStatus: "FAILED", orderStatus: "PAYMENT_FAILED" }),
      payment({ id: "payment-4", paymentStatus: "REFUNDED" })
    ]);

    expect(summary.authorized).toBe(1);
    expect(summary.captured).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.refundedOrCancelled).toBe(1);
    expect(summary.payoutReady).toBe(1);
    expect(summary.risks).toBe(1);
  });

  it("detects delivery/capture and payout risks", () => {
    const item = payment({
      jobStatus: "DELIVERED",
      paymentStatus: "AUTHORIZED",
      payoutHoldReason: "Driver banking check pending"
    });

    expect(getPaymentRiskReasons(item)).toEqual([
      "Delivered but capture still pending",
      "Driver banking check pending"
    ]);
    expect(getPaymentRiskState(item).title).toBe("Needs review");
  });

  it("marks payout ready and labels payout states", () => {
    const item = payment({
      paymentStatus: "CAPTURED",
      payoutStatus: "READY"
    });

    expect(isPayoutReady(item)).toBe(true);
    expect(getPayoutStatusLabel(item.payoutStatus)).toBe("Ready to release");
    expect(getPaymentRiskState(item).title).toBe("Ready for payout");
  });

  it("matches payment filters", () => {
    expect(matchesPaymentFilter(payment(), "authorized")).toBe(true);
    expect(matchesPaymentFilter(payment({ paymentStatus: "CAPTURED" }), "captured")).toBe(true);
    expect(matchesPaymentFilter(payment({ paymentStatus: "REFUNDED" }), "refunded")).toBe(true);
    expect(matchesPaymentFilter(payment({ paymentStatus: "CAPTURED", payoutStatus: "PAID" }), "payout_ready")).toBe(true);
    expect(matchesPaymentFilter(payment({ paymentStatus: "FAILED" }), "risks")).toBe(true);
  });

  it("formats short payment ids", () => {
    expect(getPaymentShortId("payment-12345678")).toBe("payment-");
  });
});
