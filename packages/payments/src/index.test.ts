import { describe, expect, it } from "vitest";
import {
  determineCancellationSettlement,
  manualCardPaymentMethodOptions,
  mapStripePaymentIntentStatus,
  mapStripeRefundStatus
} from "./index.js";

describe("determineCancellationSettlement", () => {
  it("returns full release before assignment", () => {
    const outcome = determineCancellationSettlement({
      jobStatus: "REQUESTED",
      customerTotalCents: 2200,
      platformFeeCents: 700,
      driverPayoutGrossCents: 1500,
      paymentStatus: "AUTHORIZED",
      amountCapturedCents: 0,
      amountAuthorizedCents: 2200
    });

    expect(outcome.settlementCode).toBe("BEFORE_ASSIGNMENT_FULL_RELEASE");
    expect(outcome.providerAction).toBe("CANCEL_AUTHORIZATION");
    expect(outcome.customerChargeRetainedCents).toBe(0);
  });

  it("applies a cancellation fee after assignment", () => {
    const outcome = determineCancellationSettlement({
      jobStatus: "ASSIGNED",
      customerTotalCents: 2200,
      platformFeeCents: 700,
      driverPayoutGrossCents: 1500,
      paymentStatus: "AUTHORIZED",
      amountCapturedCents: 0,
      amountAuthorizedCents: 2200
    });

    expect(outcome.settlementCode).toBe("AFTER_ASSIGNMENT_CANCELLATION_FEE");
    expect(outcome.providerAction).toBe("CAPTURE_CANCELLATION_FEE");
    expect(outcome.cancellationFeeCents).toBeGreaterThan(0);
  });

  it("flags in-progress cancellation for manual review", () => {
    const outcome = determineCancellationSettlement({
      jobStatus: "PICKED_UP",
      customerTotalCents: 2200,
      platformFeeCents: 700,
      driverPayoutGrossCents: 1500,
      paymentStatus: "CAPTURED",
      amountCapturedCents: 2200,
      amountAuthorizedCents: 2200
    });

    expect(outcome.settlementCode).toBe("IN_PROGRESS_MANUAL_REVIEW");
    expect(outcome.holdReason).toBe("manual_review_required_in_progress_cancellation");
  });
});

describe("status mappers", () => {
  it("maps Stripe payment intent status to internal status", () => {
    expect(
      mapStripePaymentIntentStatus({ status: "requires_capture", amount: 1000, amount_capturable: 1000 } as never)
    ).toBe("AUTHORIZED");
    expect(mapStripePaymentIntentStatus({ status: "requires_payment_method" } as never)).toBe(
      "REQUIRES_PAYMENT_METHOD"
    );
    expect(mapStripePaymentIntentStatus({ status: "canceled" } as never)).toBe("CANCELLED");
  });

  it("maps Stripe refund status", () => {
    expect(mapStripeRefundStatus({ status: "succeeded" } as never)).toBe("SUCCEEDED");
    expect(mapStripeRefundStatus({ status: "pending" } as never)).toBe("PENDING");
  });
});

describe("Stripe payment intent options", () => {
  it("uses card payment methods for manual capture without automatic payment method params", () => {
    expect(manualCardPaymentMethodOptions()).toEqual({
      capture_method: "manual",
      confirmation_method: "manual",
      payment_method_types: ["card"]
    });
    expect(manualCardPaymentMethodOptions()).not.toHaveProperty("automatic_payment_methods");
  });
});
