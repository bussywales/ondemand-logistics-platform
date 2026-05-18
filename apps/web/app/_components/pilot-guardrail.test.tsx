import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PilotGuardrailBanner } from "./pilot-guardrail";
import type { BusinessPilotStatus } from "../_lib/product-state";

const pilotStatus: BusinessPilotStatus = {
  workspace: {
    id: "4cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
    orgId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
    orgName: "Pilot Org",
    mode: "CONTROLLED_PILOT",
    status: "PAUSED",
    readinessStage: "MERCHANT_SETUP",
    pilotOwner: "Ops lead",
    supportOwner: "Support lead",
    courierOwner: "Courier lead",
    paymentOwner: "Finance lead",
    goLiveTargetDate: null,
    notes: null,
    checklistTotal: 10,
    checklistPassed: 4,
    posture: {
      activeJobs: 0,
      unresolvedSupportEscalations: 1,
      paymentRisks: 0,
      readyCouriers: 1
    },
    createdAt: "2026-05-04T08:00:00.000Z",
    updatedAt: "2026-05-04T08:00:00.000Z"
  },
  checks: [],
  guidance: "Pilot mode is informational in v1."
};

describe("PilotGuardrailBanner", () => {
  it("renders a compact non-blocking pilot guardrail with admin and help links", () => {
    const markup = renderToStaticMarkup(<PilotGuardrailBanner canManagePilots compact pilotStatus={pilotStatus} />);

    expect(markup).toContain("Pilot workspace paused");
    expect(markup).toContain("4/10 readiness checks clear");
    expect(markup).toContain("Review pilot profile");
    expect(markup).toContain("href=\"/admin/pilots\"");
    expect(markup).toContain("href=\"/help/pilot-operations\"");
  });
});
