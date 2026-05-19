import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FleetWorkspaceDeniedState, FleetWorkspaceView } from "./fleet-shell";
import type { FleetDriver, FleetReadinessSummary } from "../_lib/product-state";

const readiness: FleetReadinessSummary = {
  fleetOrgId: "33333333-3333-4333-8333-333333333333",
  fleetOrgName: "Northside Couriers",
  totalDrivers: 2,
  readyDrivers: 1,
  needsReviewDrivers: 1,
  notEligibleDrivers: 0,
  onlineDrivers: 1,
  activeJobs: 1,
  humanReviewNote: "Fleet readiness is visibility-only in v1. Fleet managers remain responsible for compliance review and courier communication."
};

const driver: FleetDriver = {
  membershipId: "44444444-4444-4444-8444-444444444444",
  fleetOrgId: readiness.fleetOrgId,
  fleetOrgName: readiness.fleetOrgName,
  userId: "22222222-2222-4222-8222-222222222222",
  email: "driver@example.com",
  displayName: "Fleet Driver",
  fleetRole: "DISPATCHER",
  membershipActive: true,
  driverId: "55555555-5555-4555-8555-555555555555",
  availabilityStatus: "ONLINE",
  verificationStatus: "APPROVED",
  vehicleType: "BIKE",
  activeJobId: "66666666-6666-4666-8666-666666666666",
  activeJobStatus: "ASSIGNED",
  lastLocationAt: "2026-05-19T10:00:00.000Z",
  readinessStatus: "READY",
  recommendedNextAction: "Courier is ready for fleet-managed pilot assignment after operator review.",
  createdAt: "2026-05-19T09:00:00.000Z",
  updatedAt: "2026-05-19T10:00:00.000Z"
};

describe("FleetWorkspaceView", () => {
  it("renders fleet overview, readiness counts, and driver operational fields", () => {
    const markup = renderToStaticMarkup(<FleetWorkspaceView drivers={[driver]} readiness={readiness} />);

    expect(markup).toContain("Northside Couriers");
    expect(markup).toContain("1 ready of 2 fleet drivers");
    expect(markup).toContain("Fleet Driver");
    expect(markup).toContain("Verification");
    expect(markup).toContain("Vehicle");
    expect(markup).toContain("Active job");
    expect(markup).toContain("Last seen");
    expect(markup).toContain("No scoring, suspension, billing, payout, or dispatch preference automation");
  });

  it("renders a non-punitive denied state for ordinary drivers and non-fleet users", () => {
    const markup = renderToStaticMarkup(<FleetWorkspaceDeniedState />);

    expect(markup).toContain("Fleet manager access required");
    expect(markup).toContain("Ordinary driver accounts cannot manage fleet readiness");
    expect(markup).toContain("/driver");
  });
});
