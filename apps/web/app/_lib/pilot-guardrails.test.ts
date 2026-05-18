import { describe, expect, it } from "vitest";
import { getPilotGuardrailState, shouldSurfacePilotAttention } from "./pilot-guardrails";
import type { BusinessPilotStatus, PilotWorkspace } from "./product-state";

const baseWorkspace: PilotWorkspace = {
  id: "4cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
  orgId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
  orgName: "Pilot Org",
  mode: "CONTROLLED_PILOT",
  status: "ACTIVE",
  readinessStage: "REHEARSAL_READY",
  pilotOwner: "Ops lead",
  supportOwner: "Support lead",
  courierOwner: "Courier lead",
  paymentOwner: "Finance lead",
  goLiveTargetDate: "2026-05-30",
  notes: null,
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
};

function status(workspace: Partial<PilotWorkspace> | null, canManagePilots = false): BusinessPilotStatus | null {
  return workspace
    ? { workspace: { ...baseWorkspace, ...workspace }, checks: [], guidance: "Pilot mode is informational in v1." }
    : { workspace: null, checks: [], guidance: "No pilot profile is configured." };
}

describe("getPilotGuardrailState", () => {
  it("maps a missing pilot profile to informational guidance", () => {
    const guardrail = getPilotGuardrailState(status(null), { canManagePilots: true });

    expect(guardrail.guardrailLevel).toBe("INFO");
    expect(guardrail.title).toBe("Pilot profile not configured");
    expect(guardrail.adminHref).toBe("/admin/pilots");
  });

  it("maps demo and internal test workspaces without blocking workflows", () => {
    expect(getPilotGuardrailState(status({ mode: "DEMO" })).guardrailLevel).toBe("INFO");
    expect(getPilotGuardrailState(status({ mode: "INTERNAL_TEST", status: "ACTIVE" })).guardrailLevel).toBe("CAUTION");
  });

  it("prioritises paused and not rehearsal-ready controlled pilots", () => {
    const paused = getPilotGuardrailState(status({ status: "PAUSED" }));
    const notReady = getPilotGuardrailState(status({ readinessStage: "MERCHANT_SETUP" }));

    expect(paused.guardrailLevel).toBe("PAUSED");
    expect(notReady.guardrailLevel).toBe("WARNING");
    expect(shouldSurfacePilotAttention(paused)).toBe(true);
    expect(shouldSurfacePilotAttention(notReady)).toBe(true);
  });

  it("maps active controlled pilot and live-ready states", () => {
    expect(getPilotGuardrailState(status({ mode: "CONTROLLED_PILOT", status: "ACTIVE", readinessStage: "REHEARSAL_READY" })).guardrailLevel).toBe("CAUTION");
    expect(getPilotGuardrailState(status({ mode: "LIVE_READY", readinessStage: "PILOT_READY" })).guardrailLevel).toBe("READY");
    expect(getPilotGuardrailState(status({ mode: "LIVE_READY", readinessStage: "PAYMENT_CHECKS" })).guardrailLevel).toBe("WARNING");
  });
});
