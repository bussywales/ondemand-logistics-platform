import { describe, expect, it } from "vitest";
import { type AppJob, type PublicOrderTracking } from "./product-state";
import {
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
    expect(getCustomerTrackingSummary(tracking).headline.toLowerCase()).toContain("delivered");
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
    expect(getCustomerTrackingSupportCopy(tracking)).toContain("support");
  });

  it("maps operator tracking stage from the current job state", () => {
    expect(getOperatorTrackingStage(appJobFixture({ status: "ASSIGNED" }))).toBe("Driver assigned");
    expect(getOperatorTrackingStage(appJobFixture({ status: "EN_ROUTE_DROP" }))).toBe("Out for delivery");
    expect(getOperatorTrackingStage(appJobFixture({ status: "DISPATCH_FAILED" }))).toBe("Dispatch failed");
  });
});
