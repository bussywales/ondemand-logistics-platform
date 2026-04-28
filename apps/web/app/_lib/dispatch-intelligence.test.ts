import { describe, expect, it } from "vitest";
import { getDispatchIntelligence, getJobShortId, shouldShowInReviewQueue, sortReviewQueue } from "./dispatch-intelligence";
import type { AppJob } from "./product-state";

const baseJob: AppJob = {
  id: "job_1234567890",
  quoteId: "quote_1",
  status: "REQUESTED",
  pickupAddress: "12 Exmouth Market, London",
  dropoffAddress: "184 Upper Street, London",
  distanceMiles: 4.8,
  etaMinutes: 22,
  vehicleRequired: "BIKE",
  premiumDistanceFlag: false,
  attentionLevel: "NORMAL",
  attentionReason: null,
  customerTotalCents: 2400,
  driverPayoutGrossCents: 1600,
  platformFeeCents: 400,
  pricingVersion: "v1",
  createdAt: "2026-04-28T10:00:00.000Z",
  tracking: {
    latestLocation: null,
    assignedDriverName: null,
    dispatchAttempts: [],
    timeline: []
  },
  payment: {
    id: "payment_1",
    status: "AUTHORIZED",
    customerTotalCents: 2400,
    platformFeeCents: 400,
    payoutGrossCents: 1600,
    amountAuthorizedCents: 2400,
    amountCapturedCents: 0,
    amountRefundedCents: 0,
    currency: "gbp",
    clientSecret: null,
    lastError: null
  }
};

describe("dispatch intelligence", () => {
  it("turns dispatch failure into a blocker with retry guidance", () => {
    const model = getDispatchIntelligence({ ...baseJob, status: "DISPATCH_FAILED", attentionLevel: "BLOCKER" });

    expect(model.severity).toBe("BLOCKER");
    expect(model.headline).toContain("Dispatch failed");
    expect(model.diagnosis).toContain("No driver accepted");
    expect(model.recommendedActionType).toBe("RETRY_DISPATCH");
    expect(shouldShowInReviewQueue(model)).toBe(true);
  });

  it("turns missing payment method into an operational blocker for active jobs", () => {
    const model = getDispatchIntelligence({
      ...baseJob,
      status: "ASSIGNED",
      payment: { ...baseJob.payment, status: "REQUIRES_PAYMENT_METHOD", amountAuthorizedCents: 0 }
    });

    expect(model.severity).toBe("BLOCKER");
    expect(model.headline).toBe("Payment method required");
    expect(model.recommendedActionType).toBe("COLLECT_PAYMENT_METHOD");
  });

  it("flags assigned jobs without live coordinates as risk", () => {
    const model = getDispatchIntelligence({
      ...baseJob,
      status: "ASSIGNED",
      tracking: { ...baseJob.tracking, assignedDriverName: "Alex Rider", latestLocation: null }
    });

    expect(model.severity).toBe("RISK");
    expect(model.diagnosis).toContain("live coordinates");
    expect(model.recommendedActionType).toBe("REVIEW_DRIVER");
  });

  it("keeps normal jobs out of the review queue", () => {
    const model = getDispatchIntelligence({
      ...baseJob,
      status: "ASSIGNED",
      tracking: {
        ...baseJob.tracking,
        assignedDriverName: "Alex Rider",
        latestLocation: { latitude: 51.5, longitude: -0.1 }
      }
    });

    expect(model.severity).toBe("NORMAL");
    expect(shouldShowInReviewQueue(model)).toBe(false);
  });

  it("sorts blockers before risks and newer items inside each severity", () => {
    const risk = { job: { ...baseJob, id: "risk", createdAt: "2026-04-28T12:00:00.000Z" }, intelligence: { ...getDispatchIntelligence(baseJob), severity: "RISK" as const } };
    const blocker = { job: { ...baseJob, id: "blocker", createdAt: "2026-04-28T11:00:00.000Z" }, intelligence: { ...getDispatchIntelligence(baseJob), severity: "BLOCKER" as const } };

    expect([risk, blocker].sort(sortReviewQueue).map((item) => item.job.id)).toEqual(["blocker", "risk"]);
  });

  it("creates compact job ids for queue rows", () => {
    expect(getJobShortId("job_1234567890")).toBe("job_1234");
  });
});
