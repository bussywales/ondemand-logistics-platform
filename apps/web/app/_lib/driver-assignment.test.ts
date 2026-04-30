import { describe, expect, it } from "vitest";
import {
  filterEligibleDrivers,
  getEligibleDriverEmptyState,
  getEligibleDriverFlagLabel,
  getEligibleDriverTone
} from "./driver-assignment";
import type { EligibleDriver } from "./product-state";

const drivers: EligibleDriver[] = [
  {
    id: "driver-1",
    displayName: "Alex Rider",
    vehicleType: "BIKE",
    availabilityStatus: "ONLINE",
    distanceMiles: 0.4,
    lastLocationAt: "2026-04-29T09:00:00.000Z",
    verificationStatus: "APPROVED",
    activeJobId: null,
    activeJobStatus: null,
    eligible: true,
    suitabilityFlags: ["READY"],
    suitabilityReason: "Online, approved, and ready for manual assignment."
  },
  {
    id: "driver-2",
    displayName: "Jamie Offline",
    vehicleType: "CAR",
    availabilityStatus: "OFFLINE",
    distanceMiles: null,
    lastLocationAt: null,
    verificationStatus: "PENDING",
    activeJobId: "job-2",
    activeJobStatus: "ASSIGNED",
    eligible: false,
    suitabilityFlags: ["OFFLINE", "ACTIVE_JOB", "VEHICLE_MISMATCH", "VERIFICATION_NOT_APPROVED"],
    suitabilityReason: "Driver already has an active job and cannot be reassigned."
  }
];

describe("driver assignment helpers", () => {
  it("labels and tones suitability flags", () => {
    expect(getEligibleDriverFlagLabel("READY")).toBe("Ready");
    expect(getEligibleDriverTone("READY")).toBe("status-positive");
    expect(getEligibleDriverFlagLabel("VEHICLE_MISMATCH")).toBe("Vehicle mismatch");
    expect(getEligibleDriverTone("VEHICLE_MISMATCH")).toBe("status-negative");
  });

  it("summarizes empty-state causes from blocked drivers", () => {
    expect(getEligibleDriverEmptyState(drivers.slice(1))).toContain("No online drivers");
  });

  it("filters drivers by text query", () => {
    expect(filterEligibleDrivers(drivers, "alex")).toHaveLength(1);
    expect(filterEligibleDrivers(drivers, "bike")).toHaveLength(1);
    expect(filterEligibleDrivers(drivers, "pending")).toHaveLength(1);
  });
});
