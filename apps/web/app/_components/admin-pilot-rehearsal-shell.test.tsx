import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminPilotRehearsalView } from "./admin-pilot-rehearsal-shell";
import type { PilotRehearsalSummary } from "../_lib/product-state";

const summary: PilotRehearsalSummary = {
  workspace: {
    id: "4cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
    orgId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
    orgName: "Pilot Kitchen Org",
    mode: "CONTROLLED_PILOT",
    status: "ACTIVE",
    readinessStage: "REHEARSAL_READY",
    pilotOwner: "Ops lead",
    supportOwner: "Support lead",
    courierOwner: "Courier lead",
    paymentOwner: "Finance lead",
    goLiveTargetDate: "2026-05-30",
    notes: "Controlled rehearsal only.",
    checklistTotal: 10,
    checklistPassed: 8,
    posture: {
      activeJobs: 1,
      unresolvedSupportEscalations: 0,
      paymentRisks: 0,
      readyCouriers: 2
    },
    createdAt: "2026-05-04T08:00:00.000Z",
    updatedAt: "2026-05-04T08:00:00.000Z"
  },
  guardrailState: {
    level: "CAUTION",
    title: "Controlled pilot mode",
    message: "This workspace can be rehearsed under human-reviewed controlled-pilot discipline.",
    recommendedAction: "Confirm validation gates before rehearsal.",
    badgeCopy: "Controlled pilot"
  },
  checks: [
    {
      id: "5cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
      pilotWorkspaceId: "4cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
      key: "browser_smoke_current",
      label: "Browser smoke current",
      status: "NOT_STARTED",
      evidence: null,
      updatedBy: null,
      updatedAt: "2026-05-04T08:00:00.000Z"
    }
  ],
  checklistSummary: {
    total: 10,
    passed: 8,
    blocked: 0,
    inProgress: 1,
    waived: 0,
    notStarted: 1
  },
  operationalPosture: {
    activeJobs: 1,
    unresolvedSupportEscalations: 0,
    highCriticalSupportEscalations: 0,
    openPaymentRisks: 0,
    readyCouriers: 2
  },
  validationPosture: {
    releaseVerification: {
      status: "UNKNOWN",
      label: "Release verification",
      summary: "Run pnpm release:verify-staging before rehearsal.",
      evidenceAt: null
    },
    paidDeliveryProof: {
      status: "UNKNOWN",
      label: "Paid delivery proof",
      summary: "Run pnpm proof:staging-paid-delivery before rehearsal.",
      evidenceAt: null
    },
    browserSmoke: {
      status: "UNKNOWN",
      label: "Browser smoke",
      summary: "Run pnpm --filter @shipwright/web test:smoke before rehearsal.",
      evidenceAt: null
    }
  },
  recommendation: "NEEDS_REVIEW",
  recommendedNextActions: ["Run release verification, paid-delivery proof, and browser smoke before rehearsal."],
  guidance: "Human review is required before any pilot rehearsal."
};

describe("AdminPilotRehearsalView", () => {
  it("renders recommendation, validation unknown copy, and admin links", () => {
    const markup = renderToStaticMarkup(<AdminPilotRehearsalView summary={summary} />);

    expect(markup).toContain("Pilot Kitchen Org rehearsal readiness");
    expect(markup).toContain("Needs Review");
    expect(markup).toContain("Proof commands remain outside the UI");
    expect(markup).toContain("Run pnpm --filter @shipwright/web test:smoke before rehearsal.");
    expect(markup).toContain("/admin/pilots");
    expect(markup).toContain("/admin/command");
  });
});
