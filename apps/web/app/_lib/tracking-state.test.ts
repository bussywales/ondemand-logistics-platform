import { describe, expect, it } from "vitest";
import { type AppJob, type PublicOrderTracking } from "./product-state";
import {
  buildPublicTrackingHref,
  getCustomerJobStatusLabel,
  getCustomerTrackingTimelineEntry,
  getCustomerTrackingNextStep,
  getCustomerTrackingSummary,
  getCustomerTrackingSupportCopy,
  getOperatorTrackingStage,
  getTrackingSteps
} from "./tracking-state";

function trackingFixture(overrides: Partial<PublicOrderTracking> = {}): PublicOrderTracking {
  return {
    order: {
      id: "order_123",
      status: "PAYMENT_AUTHORIZED",
      totalCents: 1886,
      currency: "GBP",
      createdAt: "2026-05-02T10:00:00.000Z"
    },
    restaurant: {
      id: "restaurant_123",
      name: "Pilot Kitchen",
      slug: "pilot-kitchen"
    },
    delivery: {
      address: "10 Pilot Street, Stoke",
      addressSummary: "10 Pilot Street",
      notes: null
    },
    job: {
      id: "job_123",
      status: "REQUESTED",
      etaMinutes: 22,
      pickupAddress: "Pilot Kitchen pickup",
      dropoffAddress: "10 Pilot Street, Stoke"
    },
    payment: {
      id: "payment_123",
      status: "AUTHORIZED",
      amountAuthorizedCents: 1886,
      amountCapturedCents: 0,
      totalCents: 1886,
      currency: "GBP",
      lastError: null
    },
    tracking: {
      driverAssigned: false,
      latestLocationAt: null,
      dispatchAttemptsCount: 0,
      timeline: []
    },
    ...overrides
  };
}

function appJobFixture(overrides: Partial<AppJob> = {}): AppJob {
  return {
    id: "job_123",
    quoteId: "quote_123",
    status: "REQUESTED",
    pickupAddress: "Pilot Kitchen pickup",
    dropoffAddress: "10 Pilot Street, Stoke",
    distanceMiles: 3.2,
    etaMinutes: 18,
    vehicleRequired: "BIKE",
    premiumDistanceFlag: false,
    attentionLevel: "NORMAL",
    attentionReason: null,
    customerTotalCents: 1886,
    driverPayoutGrossCents: 1106,
    platformFeeCents: 780,
    pricingVersion: "v1",
    createdAt: "2026-05-02T10:00:00.000Z",
    tracking: {
      assignedDriverName: null,
      latestLocation: null,
      updatedAt: null
    },
    payment: {
      id: "payment_123",
      status: "AUTHORIZED",
      customerTotalCents: 1886,
      platformFeeCents: 780,
      payoutGrossCents: 1106,
      amountAuthorizedCents: 1886,
      amountCapturedCents: 0,
      amountRefundedCents: 0,
      currency: "GBP",
      clientSecret: null,
      lastError: null
    },
    ...overrides
  };
}

describe("tracking-state", () => {
  it("builds the public tracking href from the order id", () => {
    expect(buildPublicTrackingHref("order_123")).toBe("/track/order_123");
  });

  it("marks the delivered flow as complete and fulfilled", () => {
    const tracking = trackingFixture({
      order: { ...trackingFixture().order, status: "FULFILLED" },
      job: { ...trackingFixture().job, status: "DELIVERED" },
      payment: { ...trackingFixture().payment, status: "CAPTURED", amountCapturedCents: 1886 },
      tracking: {
        driverAssigned: true,
        latestLocationAt: "2026-05-02T10:30:00.000Z",
        dispatchAttemptsCount: 1,
        timeline: []
      }
    });

    const steps = getTrackingSteps(tracking);
    expect(steps.at(-1)).toEqual(expect.objectContaining({ key: "delivered", state: "complete" }));
    expect(getCustomerTrackingSummary(tracking).headline).toBe("Your order has been delivered");
    expect(getCustomerTrackingNextStep(tracking).title).toBe("Delivery complete");
  });

  it("surfaces dispatch failure and no-driver support copy", () => {
    const tracking = trackingFixture({
      job: { ...trackingFixture().job, status: "DISPATCH_FAILED" },
      tracking: {
        driverAssigned: false,
        latestLocationAt: null,
        dispatchAttemptsCount: 2,
        timeline: []
      }
    });

    const steps = getTrackingSteps(tracking);
    expect(steps.find((step) => step.key === "driver_assigned")).toEqual(
      expect.objectContaining({ state: "problem" })
    );
    expect(getCustomerTrackingSummary(tracking).headline).toBe("We're checking your delivery");
    expect(getCustomerTrackingNextStep(tracking).title).toBe("Our operator is reviewing this delivery");
    expect(getCustomerTrackingSupportCopy(tracking)).toContain("contact the restaurant");
  });

  it("describes the next step for authorised orders awaiting dispatch", () => {
    const tracking = trackingFixture();

    expect(getCustomerTrackingSummary(tracking).headline).toBe("We're tracking your order");
    expect(getCustomerTrackingNextStep(tracking)).toEqual(
      expect.objectContaining({
        title: "We're preparing dispatch"
      })
    );
  });

  it("maps customer timeline entries without leaking raw backend labels", () => {
    expect(getCustomerTrackingTimelineEntry("JOB_DISPATCH_FAILED")).toEqual({
      title: "Dispatch under review",
      summary: "We are checking this delivery and reviewing the next recovery step."
    });
    expect(getCustomerTrackingTimelineEntry("JOB_DISPATCH_FAILED").title).not.toContain("DISPATCH_FAILED");
    expect(getCustomerTrackingTimelineEntry("UNKNOWN_EVENT")).toEqual({
      title: "Order update",
      summary: "We recorded a new update for this order."
    });
  });

  it("uses customer-friendly job labels instead of raw backend statuses", () => {
    expect(getCustomerJobStatusLabel("DISPATCH_FAILED")).toBe("Under review");
    expect(getCustomerJobStatusLabel("EN_ROUTE_DROP")).toBe("On the way");
  });

  it("maps operator tracking stage from the current job state", () => {
    expect(getOperatorTrackingStage(appJobFixture({ status: "ASSIGNED" }))).toBe("Driver assigned");
    expect(getOperatorTrackingStage(appJobFixture({ status: "EN_ROUTE_DROP" }))).toBe("Out for delivery");
    expect(getOperatorTrackingStage(appJobFixture({ status: "DISPATCH_FAILED" }))).toBe("Dispatch failed");
  });
});
