import type { BusinessPilotStatus, PilotWorkspace } from "./product-state";

export type PilotGuardrailLevel = "INFO" | "CAUTION" | "WARNING" | "PAUSED" | "READY";

export type PilotGuardrailState = {
  guardrailLevel: PilotGuardrailLevel;
  title: string;
  message: string;
  recommendedAction: string;
  badgeCopy: string;
  adminHref: string | null;
  helpHref: string;
  checklistCopy: string;
};

function isRehearsalReady(workspace: PilotWorkspace) {
  return ["REHEARSAL_READY", "PILOT_READY"].includes(workspace.readinessStage);
}

function checklistCopy(workspace: PilotWorkspace | null) {
  if (!workspace || workspace.checklistTotal === 0) {
    return "No readiness checklist evidence recorded.";
  }

  return `${workspace.checklistPassed}/${workspace.checklistTotal} readiness checks clear.`;
}

function adminHref(canManagePilots: boolean) {
  return canManagePilots ? "/admin/pilots" : null;
}

export function getPilotGuardrailState(
  pilotStatus: BusinessPilotStatus | null,
  options: { canManagePilots?: boolean } = {}
): PilotGuardrailState {
  const workspace = pilotStatus?.workspace ?? null;
  const canManagePilots = Boolean(options.canManagePilots);
  const commonLinks = {
    adminHref: adminHref(canManagePilots),
    helpHref: "/help/pilot-operations",
    checklistCopy: checklistCopy(workspace)
  };

  if (!workspace) {
    return {
      guardrailLevel: "INFO",
      title: "Pilot profile not configured",
      message: "This workspace is not yet classified as demo, internal test, controlled pilot, or live-ready.",
      recommendedAction: canManagePilots
        ? "Create a pilot profile before presenting or expanding live operations."
        : "Ask a platform admin to confirm the workspace pilot profile before live operations.",
      badgeCopy: "Pilot profile missing",
      ...commonLinks
    };
  }

  if (workspace.status === "PAUSED") {
    return {
      guardrailLevel: "PAUSED",
      title: "Pilot workspace paused",
      message: "This workspace is marked paused for pilot operations. Existing workflows remain available, but operators should not treat activity as live-ready.",
      recommendedAction: "Review the pilot checklist and owner notes before running additional live workflows.",
      badgeCopy: "Paused",
      ...commonLinks
    };
  }

  if (workspace.mode === "DEMO") {
    return {
      guardrailLevel: "INFO",
      title: "Demo workspace",
      message: "This workspace is intended for demonstrations and proof-backed walkthroughs, not unattended real-world operations.",
      recommendedAction: "Keep activity controlled and reference proof artifacts for delivery claims.",
      badgeCopy: "Demo workspace",
      ...commonLinks
    };
  }

  if (workspace.mode === "INTERNAL_TEST") {
    const activeTest = ["ACTIVE", "IN_REHEARSAL"].includes(workspace.status);
    return {
      guardrailLevel: activeTest ? "CAUTION" : "INFO",
      title: "Internal test workspace",
      message: "This workspace is for internal tester activity. It can exercise workflows, but should not be presented as open pilot readiness.",
      recommendedAction: "Keep tests bounded and record issues before moving to controlled pilot mode.",
      badgeCopy: "Internal test",
      ...commonLinks
    };
  }

  if (workspace.mode === "CONTROLLED_PILOT") {
    if (!isRehearsalReady(workspace)) {
      return {
        guardrailLevel: "WARNING",
        title: "Pilot readiness review needed",
        message: "This controlled pilot workspace is not rehearsal-ready yet.",
        recommendedAction: "Review the pilot checklist before live operations.",
        badgeCopy: "Controlled pilot",
        ...commonLinks
      };
    }

    if (workspace.status === "ACTIVE") {
      return {
        guardrailLevel: "CAUTION",
        title: "Controlled pilot mode",
        message: "This workspace is active for controlled pilot operations. Human review remains required for readiness, support, payment, and courier ownership.",
        recommendedAction: "Proceed with managed workflows only and keep support/playbook owners visible.",
        badgeCopy: "Controlled pilot",
        ...commonLinks
      };
    }

    return {
      guardrailLevel: "CAUTION",
      title: "Controlled pilot preparing",
      message: "This workspace is classified as controlled pilot but is not currently active.",
      recommendedAction: "Confirm rehearsal status and owner coverage before presenting it as pilot-active.",
      badgeCopy: "Controlled pilot",
      ...commonLinks
    };
  }

  if (workspace.mode === "LIVE_READY" && workspace.readinessStage === "PILOT_READY") {
    return {
      guardrailLevel: "READY",
      title: "Live-ready workspace",
      message: "This workspace is marked live-ready by platform admins. Operators still own recovery, refund, cancellation, and customer communication decisions.",
      recommendedAction: "Proceed with normal controlled operations and keep validation gates current.",
      badgeCopy: "Live-ready",
      ...commonLinks
    };
  }

  return {
    guardrailLevel: "WARNING",
    title: "Live-ready review needed",
    message: "This workspace is marked live-ready mode but has not reached the pilot-ready stage.",
    recommendedAction: "Review the pilot checklist before live operations.",
    badgeCopy: "Live-ready review",
    ...commonLinks
  };
}

export function shouldSurfacePilotAttention(guardrail: PilotGuardrailState) {
  return guardrail.guardrailLevel === "PAUSED" || guardrail.guardrailLevel === "WARNING";
}

export function pilotGuardrailBadgeClass(level: PilotGuardrailLevel) {
  if (level === "READY") return "sw-badge--success";
  if (level === "PAUSED") return "sw-badge--danger";
  if (level === "WARNING" || level === "CAUTION") return "sw-badge--warning";
  return "sw-badge--info";
}
