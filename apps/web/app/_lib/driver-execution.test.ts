import { describe, expect, it } from "vitest";
import { getDriverBlockedReason, getDriverExecutionSteps } from "./driver-execution";
import type { DriverJob } from "./product-state";

const baseJob: DriverJob = {
  id: "job-1",
  orgId: null,
  consumerId: "consumer-1",
  assignedDriverId: "driver-1",
  quoteId: null,
  status: "ASSIGNED",
  pickupAddress: "12 Exmouth Market, London",
  dropoffAddress: "184 Upper Street, London",
  pickupCoordinates: { latitude: 51.5, longitude: -0.1 },
  dropoffCoordinates: { latitude: 51.51, longitude: -0.09 },
  distanceMiles: 4.2,
  etaMinutes: 16,
  vehicleRequired: "BIKE",
  customerTotalCents: 1600,
  driverPayoutGrossCents: 1100,
  platformFeeCents: 500,
  pricingVersion: "phase1_test_v1",
  premiumDistanceFlag: false,
  attentionLevel: "NORMAL",
  attentionReason: null,
  createdByUserId: "creator-1",
  createdAt: "2026-04-28T12:00:00.000Z"
};

describe("driver execution helpers", () => {
  it("maps assigned jobs to the first active step", () => {
    const steps = getDriverExecutionSteps(baseJob, false);

    expect(steps[0]).toEqual(expect.objectContaining({ active: true, actionLabel: "Go to pickup" }));
    expect(steps[1].complete).toBe(false);
  });

  it("requires proof before delivery completion", () => {
    const withoutProof = getDriverExecutionSteps({ ...baseJob, status: "EN_ROUTE_DROP" }, false);
    const withProof = getDriverExecutionSteps({ ...baseJob, status: "EN_ROUTE_DROP" }, true);

    expect(withoutProof.find((step) => step.key === "proof_of_delivery")?.active).toBe(true);
    expect(withoutProof.find((step) => step.key === "delivered")?.actionLabel).toBeNull();
    expect(withProof.find((step) => step.key === "delivered")?.actionLabel).toBe("Complete delivery");
  });

  it("returns a clear blocked-state message for users without driver profile", () => {
    expect(getDriverBlockedReason({ hasSession: true, driverError: "driver_record_required" })).toContain(
      "Driver profile not ready"
    );
  });
});
