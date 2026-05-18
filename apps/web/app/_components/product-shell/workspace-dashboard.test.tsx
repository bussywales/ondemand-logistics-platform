import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PilotStatusSurface } from "./workspace-dashboard";
import type { BusinessPilotStatus } from "../../_lib/product-state";

const pilotStatus: BusinessPilotStatus = {
  workspace: {
    id: "4cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
    orgId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
    orgName: "Pilot Kitchen Org",
    mode: "CONTROLLED_PILOT",
    status: "IN_REHEARSAL",
    readinessStage: "REHEARSAL_READY",
    pilotOwner: "Ops lead",
    supportOwner: "Support lead",
    courierOwner: "Courier lead",
    paymentOwner: "Finance lead",
    goLiveTargetDate: "2026-05-30",
    notes: null,
    checklistTotal: 10,
    checklistPassed: 9,
    posture: {
      activeJobs: 1,
      unresolvedSupportEscalations: 0,
      paymentRisks: 0,
      readyCouriers: 2
    },
    createdAt: "2026-05-04T08:00:00.000Z",
    updatedAt: "2026-05-04T08:00:00.000Z"
  },
  checks: [],
  guidance: "Pilot mode is informational in v1. Operators remain responsible for readiness review before live use."
};

describe("PilotStatusSurface", () => {
  it("renders business pilot status as read-only context", () => {
    const markup = renderToStaticMarkup(<PilotStatusSurface pilotStatus={pilotStatus} />);

    expect(markup).toContain("Pilot posture");
    expect(markup).toContain("Controlled pilot mode");
    expect(markup).toContain("informational in v1");
    expect(markup).toContain("Support: Support lead");
    expect(markup).toContain("9/10 checks clear");
  });

  it("does not render when no pilot profile exists", () => {
    const markup = renderToStaticMarkup(<PilotStatusSurface pilotStatus={{ workspace: null, checks: [], guidance: "No pilot profile is configured for this workspace yet." }} />);

    expect(markup).toBe("");
  });
});
