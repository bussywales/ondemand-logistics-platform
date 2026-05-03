import { describe, expect, it } from "vitest";
import { buildDispatchRecoverySuggestion } from "./dispatch-recovery.service.js";

const baseInput = {
  jobId: "33333333-3333-4333-8333-333333333333",
  orderId: "11111111-1111-4111-8111-111111111111",
  paymentId: "22222222-2222-4222-8222-222222222222",
  jobStatus: "DISPATCH_FAILED" as const,
  paymentStatus: "AUTHORIZED" as const,
  vehicleRequired: "BIKE" as const,
  assignedDriverId: null,
  jobUpdatedAt: "2026-05-03T08:30:00.000Z",
  dispatchFailedAt: "2026-05-03T08:45:00.000Z",
  telemetry: {
    offerCount: 0,
    latestOfferStatus: null,
    latestOfferedAt: null,
    latestExpiresAt: null,
    eligibleDriverCount: 0,
    onlineReadyDriverCount: 0,
    matchingVehicleOnlineCount: 0,
    driverPoolCount: 0
  }
};

describe("buildDispatchRecoverySuggestion", () => {
  const now = new Date("2026-05-03T09:00:00.000Z");

  it("recommends retry dispatch when a failed job has no open offer", () => {
    const suggestion = buildDispatchRecoverySuggestion(baseInput, now);

    expect(suggestion?.issueType).toBe("DISPATCH_FAILED");
    expect(suggestion?.recommendedAction).toBe("RETRY_DISPATCH");
    expect(suggestion?.explanation).toContain("Retry dispatch first");
  });

  it("recommends manual assignment when eligible drivers exist", () => {
    const suggestion = buildDispatchRecoverySuggestion(
      {
        ...baseInput,
        telemetry: {
          ...baseInput.telemetry,
          offerCount: 1,
          eligibleDriverCount: 1,
          onlineReadyDriverCount: 1,
          matchingVehicleOnlineCount: 1,
          driverPoolCount: 3
        }
      },
      now
    );

    expect(suggestion?.recommendedAction).toBe("MANUAL_ASSIGN_DRIVER");
    expect(suggestion?.explanation).toContain("Manual assignment recommended");
  });

  it("recommends reviewing the driver pool when no matching vehicle is online", () => {
    const suggestion = buildDispatchRecoverySuggestion(
      {
        ...baseInput,
        telemetry: {
          ...baseInput.telemetry,
          offerCount: 1,
          eligibleDriverCount: 0,
          onlineReadyDriverCount: 2,
          matchingVehicleOnlineCount: 0,
          driverPoolCount: 4
        }
      },
      now
    );

    expect(suggestion?.issueType).toBe("VEHICLE_MISMATCH");
    expect(suggestion?.recommendedAction).toBe("REVIEW_DRIVER_POOL");
  });

  it("recommends reviewing payment risk when payment is failed", () => {
    const suggestion = buildDispatchRecoverySuggestion(
      {
        ...baseInput,
        paymentStatus: "FAILED"
      },
      now
    );

    expect(suggestion?.issueType).toBe("PAYMENT_BLOCKER");
    expect(suggestion?.recommendedAction).toBe("REVIEW_PAYMENT_RISK");
    expect(suggestion?.links.paymentsHref).toBe("/app/payments");
  });

  it("treats a stale open offer as a recovery trigger", () => {
    const suggestion = buildDispatchRecoverySuggestion(
      {
        ...baseInput,
        telemetry: {
          ...baseInput.telemetry,
          offerCount: 1,
          latestOfferStatus: "OFFERED",
          latestOfferedAt: "2026-05-03T08:45:00.000Z",
          eligibleDriverCount: 0,
          onlineReadyDriverCount: 0,
          matchingVehicleOnlineCount: 0,
          driverPoolCount: 2
        }
      },
      new Date("2026-05-03T09:10:00.000Z")
    );

    expect(suggestion?.issueType).toBe("OPEN_OFFER_STALE");
    expect(["RETRY_DISPATCH", "REVIEW_DRIVER_POOL"]).toContain(suggestion?.recommendedAction);
  });
});
