import type { AdminInterventionItem, AdminOverview, AdminOutboxItem, BusinessSession } from "./product-state";

export function formatAdminShortId(value: string) {
  return value.slice(0, 8);
}

export function formatInterventionSeverityLabel(value: AdminInterventionItem["severity"]) {
  if (value === "danger") {
    return "Blocker";
  }

  if (value === "warning") {
    return "Risk";
  }

  return "Info";
}

export function formatOutboxEventLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part, index) => (index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
}

export function getAdminCommandState(overview: AdminOverview) {
  if (overview.interventionQueue.length > 0) {
    return {
      tone: "warning" as const,
      title: "Review required",
      body: `${overview.interventionQueue.length} cross-org issues need platform intervention.`
    };
  }

  if (overview.health.readiness.status !== "ok") {
    return {
      tone: "danger" as const,
      title: "Readiness degraded",
      body: overview.health.readiness.message ?? "Schema readiness is failing and traffic should not be trusted."
    };
  }

  return {
    tone: "success" as const,
    title: "System clear",
    body: "No immediate platform blockers are visible across active operations."
  };
}

export function canOpenOrgConsole(session: BusinessSession, orgId: string | null) {
  if (!orgId) {
    return false;
  }

  return session.context.currentOrg?.id === orgId || session.context.memberships.some((entry) => entry.org.id === orgId);
}

export function getOutboxTone(item: AdminOutboxItem) {
  if (item.lastError) {
    return "danger" as const;
  }

  if (!item.processedAt && item.retryCount > 0) {
    return "warning" as const;
  }

  return "info" as const;
}
