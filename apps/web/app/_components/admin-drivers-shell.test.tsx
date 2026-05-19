import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminDriversView } from "./admin-drivers-shell";
import type { AdminDriverReadinessItem } from "../_lib/product-state";

const baseDriver: AdminDriverReadinessItem = {
  driverId: "11111111-1111-4111-8111-111111111111",
  driverName: "Ready Courier",
  availabilityStatus: "ONLINE",
  verificationStatus: "APPROVED",
  vehicleType: "BIKE",
  activeJobId: null,
  activeJobStatus: null,
  orgId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
  orgName: "Pilot Org",
  fleetOrgId: "99999999-9999-4999-8999-999999999999",
  fleetOrgName: "Northside Couriers",
  fleetRole: "DRIVER",
  restaurantName: null,
  restaurantSlug: null,
  lastLocationAt: "2026-05-04T08:00:00.000Z",
  locationRecentlySeen: true,
  readinessStatus: "READY",
  checklist: [
    {
      key: "verification_approved",
      label: "Verification approved",
      result: "pass",
      reason: "Verification is approved for pilot operations."
    },
    {
      key: "no_active_blocking_job",
      label: "No active blocking job",
      result: "pass",
      reason: "No active job is blocking assignment."
    }
  ],
  recommendedNextAction: "Courier is ready for pilot assignment after operator review.",
  createdAt: "2026-05-04T07:30:00.000Z",
  updatedAt: "2026-05-04T08:00:00.000Z"
};

describe("AdminDriversView", () => {
  it("renders driver readiness, checklist evidence, and human approval copy", () => {
    const markup = renderToStaticMarkup(
      <AdminDriversView
        items={[
          baseDriver,
          {
            ...baseDriver,
            driverId: "22222222-2222-4222-8222-222222222222",
            driverName: "Pending Courier",
            verificationStatus: "PENDING",
            readinessStatus: "NEEDS_REVIEW",
            recommendedNextAction: "Review verification and approve only after human checks are complete.",
            checklist: [
              {
                key: "verification_approved",
                label: "Verification approved",
                result: "warn",
                reason: "Verification is pending human approval."
              }
            ]
          },
          {
            ...baseDriver,
            driverId: "33333333-3333-4333-8333-333333333333",
            driverName: "Busy Courier",
            activeJobId: "44444444-4444-4444-8444-444444444444",
            activeJobStatus: "ASSIGNED",
            readinessStatus: "NOT_ELIGIBLE",
            recommendedNextAction: "Clear or complete the active job before assigning another delivery."
          }
        ]}
      />
    );

    expect(markup).toContain("1 ready, 1 need review, 1 not eligible");
    expect(markup).toContain("Ready Courier");
    expect(markup).toContain("Pending Courier");
    expect(markup).toContain("Busy Courier");
    expect(markup).toContain("Verification approved");
    expect(markup).toContain("Human approval is required");
    expect(markup).toContain("No automated approval");
    expect(markup).toContain("Review before acting");
    expect(markup).toContain("Fleet: Northside Couriers");
    expect(markup).toContain("Fleet role");
    expect(markup).toContain("href=\"/app/jobs/44444444-4444-4444-8444-444444444444\"");
  });

  it("renders an empty state when no courier profiles exist", () => {
    const markup = renderToStaticMarkup(<AdminDriversView items={[]} />);

    expect(markup).toContain("No courier profiles found");
    expect(markup).toContain("Driver readiness will appear here");
    expect(markup).toContain("Do not treat an empty list as an approved courier pool");
  });
});
