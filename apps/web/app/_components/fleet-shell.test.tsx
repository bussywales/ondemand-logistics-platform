import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FleetDriverDetailView, FleetTeamView, FleetWorkspaceDeniedState, FleetWorkspaceView } from "./fleet-shell";
import type { FleetDriver, FleetDriverDetail, FleetReadinessSummary, FleetTeam } from "../_lib/product-state";

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
    expect(markup).toContain("/fleet/team");
    expect(markup).toContain(`/fleet/drivers/${driver.driverId}`);
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

  it("renders fleet driver detail with readiness history empty state", () => {
    const detail: FleetDriverDetail = {
      driver,
      recentWork: [
        {
          jobId: "66666666-6666-4666-8666-666666666666",
          status: "DELIVERED",
          pickupAddress: "1 Market Street",
          dropoffAddress: "2 High Street",
          completedAt: "2026-05-19T11:00:00.000Z",
          createdAt: "2026-05-19T10:00:00.000Z"
        }
      ],
      readinessHistory: [],
      readinessHistoryNote: "Readiness history will appear here after driver signal changes are captured as fleet readiness events."
    };
    const markup = renderToStaticMarkup(<FleetDriverDetailView detail={detail} />);

    expect(markup).toContain("Fleet driver detail");
    expect(markup).toContain("Readiness signal timeline");
    expect(markup).toContain("No readiness history yet");
    expect(markup).toContain("no scoring");
  });

  it("renders fleet team invite management and access history", () => {
    const team: FleetTeam = {
      fleetOrgId: readiness.fleetOrgId,
      fleetOrgName: readiness.fleetOrgName,
      currentUserRole: "FLEET_MANAGER",
      canManageInvites: true,
      members: [
        {
          id: driver.membershipId,
          orgId: readiness.fleetOrgId,
          orgName: readiness.fleetOrgName,
          orgType: "DRIVER_COMPANY",
          orgStatus: "ACTIVE",
          userId: driver.userId,
          email: driver.email,
          displayName: driver.displayName,
          role: "DRIVER",
          isActive: true,
          createdAt: "2026-05-19T10:00:00.000Z",
          updatedAt: "2026-05-19T10:00:00.000Z"
        }
      ],
      invitations: [
        {
          id: "77777777-7777-4777-8777-777777777777",
          orgId: readiness.fleetOrgId,
          email: "new-driver@example.com",
          role: "DRIVER",
          status: "PENDING",
          invitedBy: "11111111-1111-4111-8111-111111111111",
          createdAt: "2026-05-19T10:00:00.000Z",
          updatedAt: "2026-05-19T10:00:00.000Z"
        }
      ],
      accessEvents: [
        {
          id: "1",
          orgId: readiness.fleetOrgId,
          eventType: "fleet_invite_created",
          actorName: "Fleet Manager",
          actorEmail: "manager@example.com",
          createdAt: "2026-05-19T10:00:00.000Z",
          summary: "Fleet invite created for new-driver@example.com.",
          metadata: {}
        }
      ]
    };

    const markup = renderToStaticMarkup(
      <FleetTeamView
        onCancelInvite={() => undefined}
        onCreateInvite={() => undefined}
        onResendInvite={() => undefined}
        team={team}
      />
    );

    expect(markup).toContain("Fleet team");
    expect(markup).toContain("Invite fleet member");
    expect(markup).toContain("new-driver@example.com");
    expect(markup).toContain("Access history");
  });
});
