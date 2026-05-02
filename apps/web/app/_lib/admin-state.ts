import type { AdminInterventionItem, AdminOverview, AdminOutboxItem, BusinessSession } from "./product-state";

export type AdminInterventionFilter = "all" | "dispatch" | "payment" | "notification" | "stuck";
export type AdminOutboxFilter = "all" | "failed" | "retrying" | "skipped" | "processed_recent";
export type AdminSection = "interventions" | "jobs" | "orders" | "payments" | "outbox" | "health";
export type AdminProofSummary = {
  fileName: string;
  timestamp: string;
  apiBaseUrl: string | null;
  healthzOk: boolean | null;
  readyzOk: boolean | null;
  schemaOk: boolean | null;
  externalNotificationsStatus: "sent_recently" | "provider_unavailable" | "no_recent_signal" | null;
};

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

export function getInterventionBucket(item: AdminInterventionItem): Exclude<AdminInterventionFilter, "all"> {
  if (item.category === "dispatch_failed") {
    return "dispatch";
  }

  if (item.category === "stuck_job") {
    return "stuck";
  }

  if (item.category === "notification_issue") {
    return "notification";
  }

  return "payment";
}

export function filterAdminInterventions(
  items: AdminInterventionItem[],
  filter: AdminInterventionFilter
) {
  if (filter === "all") {
    return items;
  }

  return items.filter((item) => getInterventionBucket(item) === filter);
}

export function getOutboxBucket(item: AdminOutboxItem): Exclude<AdminOutboxFilter, "all"> {
  if (item.lastError) {
    return "failed";
  }

  if (!item.processedAt && item.retryCount > 0) {
    return "retrying";
  }

  if (
    item.processedAt &&
    !item.lastError &&
    item.eventType.startsWith("NOTIFY_")
  ) {
    return "skipped";
  }

  return "processed_recent";
}

export function filterAdminOutbox(items: AdminOutboxItem[], filter: AdminOutboxFilter) {
  if (filter === "all") {
    return items;
  }

  return items.filter((item) => getOutboxBucket(item) === filter);
}

export function limitAdminInterventions(
  items: AdminInterventionItem[],
  expanded: boolean,
  limit = 5
) {
  return expanded ? items : items.slice(0, limit);
}

export function summarizeInterventionDetail(item: AdminInterventionItem) {
  switch (item.category) {
    case "dispatch_failed":
      return "Dispatch stopped moving. Review driver coverage, retry posture, or manual assignment.";
    case "stuck_job":
      return "The job is active but not progressing. Review timing, tracking freshness, and driver response.";
    case "payment_failure":
      return "Payment has failed or is missing a required step. Check customer payment state before dispatch continues.";
    case "payment_capture_pending":
      return "Delivery appears complete, but capture is still pending. Review payment processing before closing the loop.";
    case "notification_issue":
      return "An outbound notification degraded or was skipped. Check provider configuration and recent audit activity.";
    default:
      return item.summary;
  }
}

export function summarizeOutboxDetail(item: AdminOutboxItem) {
  if (item.lastError) {
    return "The worker recorded a concrete processing error for this message. Review the event payload and retry path.";
  }

  if (!item.processedAt && item.retryCount > 0) {
    return "The worker is retrying this message. Watch the next attempt time and current backlog pressure.";
  }

  if (item.eventType.startsWith("NOTIFY_")) {
    return "This is an external-notification event. Inspect the recent audit trail to distinguish provider send from provider skip.";
  }

  return "The worker has processed this message recently without a recorded error.";
}
