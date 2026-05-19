import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdminFleetDriversView, AdminFleetsView } from "./admin-fleets-shell";
import type { FleetDriver, FleetOrganisation } from "../_lib/product-state";

const fleet: FleetOrganisation = {
  id: "33333333-3333-4333-8333-333333333333",
  name: "Northside Couriers",
  status: "ONBOARDING",
  contactName: "Fleet Owner",
  contactEmail: "fleet@example.com",
  city: "London",
  memberCount: 2,
  activeDriverCount: 2,
  readyDriverCount: 1,
  needsReviewDriverCount: 1,
  notEligibleDriverCount: 0,
  activeJobCount: 0,
  createdAt: "2026-05-19T10:00:00.000Z",
  updatedAt: "2026-05-19T10:00:00.000Z"
};

const driver: FleetDriver = {
  membershipId: "44444444-4444-4444-8444-444444444444",
  fleetOrgId: fleet.id,
  fleetOrgName: fleet.name,
  userId: "22222222-2222-4222-8222-222222222222",
  email: "driver@example.com",
  displayName: "Fleet Driver",
  fleetRole: "DRIVER",
  membershipActive: true,
  driverId: "55555555-5555-4555-8555-555555555555",
  availabilityStatus: "ONLINE",
  verificationStatus: "APPROVED",
  vehicleType: "BIKE",
  activeJobId: null,
  activeJobStatus: null,
  lastLocationAt: "2026-05-19T10:00:00.000Z",
  readinessStatus: "READY",
  recommendedNextAction: "Courier is ready for fleet-managed pilot assignment after operator review.",
  createdAt: "2026-05-19T10:00:00.000Z",
  updatedAt: "2026-05-19T10:00:00.000Z"
};

describe("admin fleet shells", () => {
  it("renders fleet organisation readiness counts", () => {
    const markup = renderToStaticMarkup(<AdminFleetsView fleets={[fleet]} onCreate={vi.fn()} />);

    expect(markup).toContain("Fleet companies");
    expect(markup).toContain("Northside Couriers");
    expect(markup).toContain("1 ready");
    expect(markup).toContain(`/admin/fleets/${fleet.id}`);
  });

  it("renders fleet driver rows and human-review copy", () => {
    const markup = renderToStaticMarkup(
      <AdminFleetDriversView fleetOrgId={fleet.id} drivers={[driver]} onAdd={vi.fn()} onUpdate={vi.fn()} />
    );

    expect(markup).toContain("Fleet Driver");
    expect(markup).toContain("No scoring, suspension, billing, payout, or dispatch preference automation");
    expect(markup).toContain("Add an existing user or courier");
  });
});
