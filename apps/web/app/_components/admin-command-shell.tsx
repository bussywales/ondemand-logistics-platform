"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { ProductUpdateAnnouncement } from "./product-updates";
import { ShipWrightIcon, type ShipWrightIconName } from "./shipwright-icon";
import { useBusinessAuth } from "./business-auth-provider";
import { getAdminDailyBriefing, getAdminEndOfDayReport, getUserFacingApiError, listAdminDemoRequests, listAdminOperationalResets, listAdminPilots, listAdminSupportEscalations } from "../_lib/api";
import { canOpenOrgConsole } from "../_lib/admin-state";
import { getPilotGuardrailState } from "../_lib/pilot-guardrails";
import {
  type BusinessSession,
  type DailyBriefing,
  type DailyBriefingItem,
  type DemoRequest,
  type EndOfDayReport,
  type OperationalResetRun,
  type PilotWorkspace,
  type SupportEscalation
} from "../_lib/product-state";
import { buildAuthRedirectTarget } from "../_lib/route-protection";
import { COMMAND_INTELLIGENCE_EXPLAINER, COMMAND_INTELLIGENCE_SIGNAL_COPY, CommandIntelligenceNote } from "./product-shell/shared";

const COMMAND_INTELLIGENCE_UNAVAILABLE_MESSAGE = "Command intelligence data unavailable. Refresh or contact support.";
const ADMIN_COMMAND_GROUP_VISIBLE_LIMIT = 3;
const ADMIN_COMMAND_INCIDENT_VISIBLE_LIMIT = 5;

type AdminCommandGroup = {
  key: string;
  orgId: string | null;
  orgName: string;
  restaurantName: string | null;
  items: DailyBriefingItem[];
};

function formatAgeMinutes(value: number) {
  if (value < 1) {
    return "Just now";
  }

  if (value < 60) {
    return `${value} min ago`;
  }

  const hours = Math.floor(value / 60);
  return `${hours} hr${hours === 1 ? "" : "s"} ago`;
}

function severityClass(value: DailyBriefing["criticalItems"][number]["severity"]) {
  if (value === "danger") {
    return "sw-badge--danger";
  }

  if (value === "warning") {
    return "sw-badge--warning";
  }

  return "sw-badge--success";
}

function severityIcon(value: DailyBriefing["criticalItems"][number]["severity"]): ShipWrightIconName {
  if (value === "danger") {
    return "alert";
  }

  if (value === "warning") {
    return "warning";
  }

  return "check";
}

function toReadableIssue(category: DailyBriefingItem["category"]) {
  switch (category) {
    case "dispatch_failed":
      return "Dispatch failed";
    case "active_without_driver":
      return "No driver assigned";
    case "delivered_uncaptured":
      return "Delivered but uncaptured";
    case "payment_failed":
      return "Payment risk";
    case "stale_job":
      return "Delay incident";
    case "support_follow_up":
      return "Human follow-up";
  }
}

function buildRecommendedNextStep(item: DailyBriefingItem) {
  if (item.recoverySuggestion) {
    return item.recoverySuggestion.recommendedAction
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  if (item.incidentSummary) {
    return item.incidentSummary.recommendedNextAction;
  }

  if (item.category === "payment_failed" || item.category === "delivered_uncaptured") {
    return "Review payment risk";
  }

  if (item.category === "support_follow_up") {
    return "Open the linked order or job and update the support log";
  }

  if (item.category === "dispatch_failed") {
    return "Retry dispatch";
  }

  if (item.category === "active_without_driver") {
    return "Assign driver";
  }

  return "Check delayed order";
}

function hasCommunicationDraft(item: DailyBriefingItem) {
  return Boolean(
    item.incidentSummary?.communicationDrafts.customerDraft ||
      item.incidentSummary?.communicationDrafts.restaurantDraft ||
      item.incidentSummary?.communicationDrafts.driverDraft
  );
}

function minutesSince(value: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
}

function countDemoRequestsByStatus(requests: DemoRequest[]) {
  return requests.reduce(
    (acc, request) => {
      acc.total += 1;
      acc[request.status] = (acc[request.status] ?? 0) + 1;
      return acc;
    },
    {
      total: 0,
      NEW: 0,
      REVIEWED: 0,
      CONTACTED: 0,
      QUALIFIED: 0,
      CLOSED: 0,
      SPAM: 0
    } as Record<DemoRequest["status"] | "total", number>
  );
}

function getDemoRequestFollowUpCounts(requests: DemoRequest[]) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  return requests.reduce(
    (acc, request) => {
      const active = !["CLOSED", "SPAM"].includes(request.status);
      if ((request.followUpPriority === "HIGH" || request.followUpPriority === "URGENT") && active) {
        acc.highPriority += 1;
      }
      if (request.status === "QUALIFIED") {
        acc.qualified += 1;
      }
      if (!active || !request.nextFollowUpAt) {
        return acc;
      }
      const followUpAt = new Date(request.nextFollowUpAt);
      if (followUpAt < now) {
        acc.overdue += 1;
      }
      if (followUpAt >= start && followUpAt < end) {
        acc.dueToday += 1;
      }
      return acc;
    },
    { dueToday: 0, highPriority: 0, overdue: 0, qualified: 0 }
  );
}

function getDemoRequestNotificationCounts(requests: DemoRequest[]) {
  return requests.reduce(
    (acc, request) => {
      const status = request.notification?.status ?? "unknown";
      acc[status] += 1;
      return acc;
    },
    { failed: 0, pending: 0, retrying: 0, sent: 0, skipped: 0, unknown: 0 }
  );
}

function groupAttentionItems(items: DailyBriefingItem[]) {
  const groups = new Map<string, AdminCommandGroup>();

  for (const item of items) {
    const key = `${item.orgId ?? "unknown"}:${item.restaurantName ?? "unassigned"}`;
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
      continue;
    }

    groups.set(key, {
      key,
      orgId: item.orgId,
      orgName: item.orgName ?? "Unknown organisation",
      restaurantName: item.restaurantName,
      items: [item]
    });
  }

  return Array.from(groups.values()).sort((left, right) => left.orgName.localeCompare(right.orgName));
}

function CountCard(props: {
  label: string;
  value: number;
  copy: string;
  tone?: "danger" | "warning" | "success" | "info";
}) {
  return (
    <div className="sw-metric-card sw-supporting-surface admin-command-metric-card">
      <span className={`sw-metric-icon sw-icon-badge ${props.tone === "danger" ? "sw-icon-badge--warning" : props.tone === "success" ? "sw-icon-badge--success" : "sw-icon-badge--info"}`} aria-hidden="true">
        <ShipWrightIcon name={props.tone === "danger" ? "alert" : props.tone === "success" ? "check" : "queue"} />
      </span>
      <span className="sw-metric-label">{props.label}</span>
      <strong className="sw-metric-value">{props.value}</strong>
      <p className="sw-metric-copy">{props.copy}</p>
    </div>
  );
}

function WorkspaceLink(props: {
  href: string;
  label: string;
  canOpen: boolean;
}) {
  if (!props.canOpen) {
    return <span className="ops-detail-note">Business workspace link unavailable without org context.</span>;
  }

  return (
    <Link className="sw-button sw-button--secondary button button-secondary" href={props.href}>
      <ShipWrightIcon name="arrow" />
      <span>{props.label}</span>
    </Link>
  );
}

export function AdminCommandView(props: {
  briefing: DailyBriefing;
  pilots: PilotWorkspace[];
  report: EndOfDayReport;
  selectedDate: string;
  session: BusinessSession;
  demoRequests: DemoRequest[];
  demoRequestsError?: string | null;
  operationalResets: OperationalResetRun[];
  operationalResetsError?: string | null;
  supportError?: string | null;
  supportEscalations: SupportEscalation[];
}) {
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(() => new Set());
  const [incidentListExpanded, setIncidentListExpanded] = useState(false);
  const groups = useMemo(() => groupAttentionItems(props.briefing.criticalItems), [props.briefing.criticalItems]);
  const orgsWithAttention = useMemo(
    () => new Set(props.briefing.criticalItems.map((item) => item.orgId).filter(Boolean)).size,
    [props.briefing.criticalItems]
  );
  const hasAttention = props.briefing.attentionCount > 0 || props.report.unresolvedCount > 0;
  const incidentItems = useMemo(
    () =>
      props.briefing.criticalItems.filter(
        (item) =>
          item.incidentSummary ||
          item.category === "dispatch_failed" ||
          item.category === "stale_job" ||
          item.category === "delivered_uncaptured"
      ),
    [props.briefing.criticalItems]
  );
  const visibleIncidentItems = incidentListExpanded ? incidentItems : incidentItems.slice(0, ADMIN_COMMAND_INCIDENT_VISIBLE_LIMIT);
  const hiddenIncidentCount = Math.max(0, incidentItems.length - visibleIncidentItems.length);
  const currentOrgReportHref = props.session.context.currentOrg
    ? `/app/reports/end-of-day?date=${encodeURIComponent(props.selectedDate)}`
    : null;
  const supportPosture = props.briefing.operatingState;
  const openSupportItems = props.supportEscalations.filter((item) => !["RESOLVED", "CANCELLED"].includes(item.status));
  const activeControlledPilots = props.pilots.filter((pilot) => pilot.mode === "CONTROLLED_PILOT" && pilot.status === "ACTIVE").length;
  const liveReadyPilots = props.pilots.filter((pilot) => pilot.mode === "LIVE_READY" && pilot.readinessStage === "PILOT_READY").length;
  const pilotGuardrailGaps = props.pilots.filter((pilot) => {
    const state = getPilotGuardrailState({ workspace: pilot, checks: [], guidance: "" });
    return state.guardrailLevel === "PAUSED" || state.guardrailLevel === "WARNING";
  }).length;
  const demoRequestCounts = useMemo(() => countDemoRequestsByStatus(props.demoRequests), [props.demoRequests]);
  const demoFollowUpCounts = useMemo(() => getDemoRequestFollowUpCounts(props.demoRequests), [props.demoRequests]);
  const demoNotificationCounts = useMemo(() => getDemoRequestNotificationCounts(props.demoRequests), [props.demoRequests]);
  const latestResetRun = props.operationalResets[0] ?? null;
  const newDemoRequests = props.demoRequests.filter((request) => request.status === "NEW");
  const oldestNewDemoRequestAge =
    newDemoRequests.length > 0
      ? Math.max(...newDemoRequests.map((request) => minutesSince(request.createdAt)))
      : null;

  return (
    <section className="ops-stack admin-command-stack">
      <section className={`sw-command-surface admin-command-page-hero ${hasAttention ? "sw-command-surface--warning" : ""}`}>
        <div className="sw-row admin-command-page-copy">
          <span className={`sw-icon-badge ${hasAttention ? "sw-icon-badge--warning" : "sw-icon-badge--success"}`} aria-hidden="true">
            <ShipWrightIcon name={hasAttention ? "warning" : "check"} />
          </span>
          <div>
            <span className="sw-badge sw-badge--info admin-command-page-badge">Command Intelligence</span>
            <p className="eyebrow">Cross-org command view</p>
            <h2>{hasAttention ? `${orgsWithAttention} organisation${orgsWithAttention === 1 ? "" : "s"} need attention` : "All monitored operations clear"}</h2>
            <p>{hasAttention ? "Review support-heavy businesses, blocked orders, and delayed jobs without switching into every workspace first." : "No current cross-org dispatch, payment, or delay signals need platform follow-up."}</p>
          </div>
        </div>

        <div className="admin-command-page-counts">
          <CountCard copy="Businesses currently carrying cross-org attention items." label="Orgs with attention" tone={orgsWithAttention ? "warning" : "success"} value={orgsWithAttention} />
          <CountCard copy="Deliveries currently in dispatch-failed state." label="Dispatch failures" tone={props.report.incidentsSummary.dispatchFailed ? "danger" : "info"} value={props.report.incidentsSummary.dispatchFailed} />
          <CountCard copy="Delayed or stale delivery incidents currently detected." label="Delay incidents" tone={props.report.incidentsSummary.delayIncidents ? "warning" : "info"} value={props.report.incidentsSummary.delayIncidents} />
          <CountCard copy="Commercial follow-up items affecting delivery or closeout." label="Payment risks" tone={props.report.incidentsSummary.paymentRisks ? "danger" : "info"} value={props.report.incidentsSummary.paymentRisks} />
          <CountCard copy="Operator-approved follow-up items remaining for closeout." label="Unresolved actions" tone={props.report.unresolvedCount ? "warning" : "success"} value={props.report.unresolvedCount} />
          <CountCard copy="Human support records that remain open or in review." label="Support follow-up" tone={supportPosture.highCriticalSupportEscalations ? "warning" : supportPosture.openSupportEscalations ? "info" : "success"} value={supportPosture.openSupportEscalations} />
          <CountCard copy="Support records resolved or cancelled during the selected closeout date." label="Support closed today" tone="success" value={props.report.incidentsSummary.supportClosedToday} />
          <CountCard copy="Pilot profiles tracked for controlled operations." label="Pilot workspaces" tone={props.pilots.length ? "info" : "success"} value={props.pilots.length} />
          <CountCard copy="Controlled pilot workspaces currently active." label="Active controlled pilots" tone={activeControlledPilots ? "info" : "success"} value={activeControlledPilots} />
          <CountCard copy="Workspaces marked live-ready with pilot-ready evidence." label="Live-ready pilots" tone={liveReadyPilots ? "success" : "info"} value={liveReadyPilots} />
          <CountCard copy="Paused or not rehearsal-ready workspaces need review." label="Pilot guardrail gaps" tone={pilotGuardrailGaps ? "warning" : "success"} value={pilotGuardrailGaps} />
          <CountCard copy="Commercial intake requests waiting for platform review." label="New demo requests" tone={demoRequestCounts.NEW ? "info" : "success"} value={demoRequestCounts.NEW} />
          <CountCard copy="Requests already contacted or qualified for follow-up." label="Follow-up in motion" tone={demoRequestCounts.CONTACTED + demoRequestCounts.QUALIFIED ? "info" : "success"} value={demoRequestCounts.CONTACTED + demoRequestCounts.QUALIFIED} />
          <CountCard copy="Demo request follow-ups past their scheduled date." label="Overdue follow-ups" tone={demoFollowUpCounts.overdue ? "warning" : "success"} value={demoFollowUpCounts.overdue} />
          <CountCard copy="Demo request follow-ups scheduled for today." label="Due today" tone={demoFollowUpCounts.dueToday ? "info" : "success"} value={demoFollowUpCounts.dueToday} />
          <CountCard copy="Active requests marked high or urgent priority." label="High-priority leads" tone={demoFollowUpCounts.highPriority ? "warning" : "success"} value={demoFollowUpCounts.highPriority} />
          <CountCard copy="Qualified commercial opportunities ready for pilot or investor follow-up." label="Qualified opportunities" tone={demoFollowUpCounts.qualified ? "success" : "info"} value={demoFollowUpCounts.qualified} />
          <CountCard copy="Demo request notification outbox events not processed yet." label="Notification pending" tone={demoNotificationCounts.pending ? "info" : "success"} value={demoNotificationCounts.pending} />
          <CountCard copy="Demo request notification deliveries that need retry or investigation." label="Notification failed" tone={demoNotificationCounts.failed + demoNotificationCounts.retrying ? "warning" : "success"} value={demoNotificationCounts.failed + demoNotificationCounts.retrying} />
          <CountCard copy="Notification delivery skipped because optional email/webhook config is absent." label="Notification skipped" tone={demoNotificationCounts.skipped ? "info" : "success"} value={demoNotificationCounts.skipped} />
          <CountCard copy="Completed non-destructive staging/demo tidy runs." label="Reset runs" tone={props.operationalResets.length ? "info" : "success"} value={props.operationalResets.length} />
        </div>
      </section>

      <CommandIntelligenceNote compact copy={COMMAND_INTELLIGENCE_EXPLAINER} />

      <section className="sw-supporting-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Operational reset tools</p>
            <h2>{latestResetRun ? "Latest demo tidy run recorded" : "No reset runs recorded"}</h2>
            <p className="ops-detail-note">Reset tools are admin-only, non-destructive, and never mutate proof orders, jobs, payments, or audit evidence.</p>
          </div>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/operational-resets">
            Open reset tools
          </Link>
        </div>
        {props.operationalResetsError ? (
          <div className="form-error-banner support-escalation-error">{props.operationalResetsError}</div>
        ) : null}
        {latestResetRun ? (
          <article className="sw-list-row admin-command-report-action">
            <div>
              <div className="admin-command-item-meta">
                <span className="sw-badge sw-badge--success">{latestResetRun.status.toLowerCase()}</span>
                <span>{latestResetRun.mode.replaceAll("_", " ").toLowerCase()}</span>
                <span>{formatAgeMinutes(minutesSince(latestResetRun.createdAt))}</span>
              </div>
              <strong>{latestResetRun.reason}</strong>
              <p>{latestResetRun.summary.message}</p>
            </div>
            <span className="sw-badge sw-badge--neutral">{latestResetRun.summary.affectedCount} affected</span>
          </article>
        ) : (
          <p className="ops-detail-note">Use reset tools before controlled demos when staging data is cluttering admin/operator screens.</p>
        )}
      </section>

      <section className="sw-supporting-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Commercial intake</p>
            <h2>Demo request follow-up</h2>
            <p className="ops-detail-note">New demo and controlled-pilot requests are persisted for platform admin review. No email, CRM, or outbound automation is triggered yet.</p>
          </div>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/demo-requests">
            Open demo requests
          </Link>
        </div>
        {props.demoRequestsError ? (
          <div className="form-error-banner support-escalation-error">{props.demoRequestsError}</div>
        ) : null}
        <div className="admin-command-report-grid">
          <div className="sw-operational-surface admin-command-report-card">
            <p className="eyebrow">Request posture</p>
            <div className="admin-command-stat-list">
              <div><span>New</span><strong>{demoRequestCounts.NEW}</strong></div>
              <div><span>Reviewed</span><strong>{demoRequestCounts.REVIEWED}</strong></div>
              <div><span>Contacted</span><strong>{demoRequestCounts.CONTACTED}</strong></div>
              <div><span>Qualified</span><strong>{demoRequestCounts.QUALIFIED}</strong></div>
              <div><span>Overdue</span><strong>{demoFollowUpCounts.overdue}</strong></div>
              <div><span>Due today</span><strong>{demoFollowUpCounts.dueToday}</strong></div>
              <div><span>High priority</span><strong>{demoFollowUpCounts.highPriority}</strong></div>
              <div><span>Notification pending</span><strong>{demoNotificationCounts.pending}</strong></div>
              <div><span>Notification sent</span><strong>{demoNotificationCounts.sent}</strong></div>
              <div><span>Skipped / unconfigured</span><strong>{demoNotificationCounts.skipped}</strong></div>
              <div><span>Failed / retrying</span><strong>{demoNotificationCounts.failed + demoNotificationCounts.retrying}</strong></div>
            </div>
          </div>
          <div className="sw-operational-surface admin-command-report-card">
            <p className="eyebrow">Next action</p>
            <strong>{demoRequestCounts.NEW ? "Review new commercial interest" : "No new demo request review needed"}</strong>
            <p className="ops-detail-note">
              {oldestNewDemoRequestAge == null
                ? "The intake queue is clear for new requests."
                : `Oldest new request is ${formatAgeMinutes(oldestNewDemoRequestAge)}.`}
            </p>
            <p className="ops-detail-note">
              Skipped notification delivery is acceptable when optional email/webhook secrets are intentionally not configured.
            </p>
          </div>
        </div>
      </section>

      <section className="sw-supporting-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Pilot rehearsal</p>
            <h2>Rehearsal cockpit links</h2>
            <p className="ops-detail-note">Open a pilot-specific readiness cockpit before controlled demos or rehearsal windows.</p>
          </div>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/pilots">Manage pilots</Link>
        </div>
        {props.pilots.length ? (
          <div className="admin-command-list">
            {props.pilots.slice(0, 4).map((pilot) => {
              const state = getPilotGuardrailState({ workspace: pilot, checks: [], guidance: "" }, { canManagePilots: true });
              return (
                <article className="sw-list-row admin-command-report-action" key={pilot.id}>
                  <div>
                    <div className="admin-command-item-meta">
                      <span className="sw-badge sw-badge--info">{pilot.mode.replaceAll("_", " ").toLowerCase()}</span>
                      <span>{pilot.status.replaceAll("_", " ").toLowerCase()}</span>
                      <span>{pilot.checklistPassed}/{pilot.checklistTotal} checks clear</span>
                    </div>
                    <strong>{pilot.orgName ?? pilot.orgId}</strong>
                    <p>{state.recommendedAction}</p>
                  </div>
                  <Link className="sw-button sw-button--secondary button button-secondary" href={`/admin/pilots/${pilot.id}/rehearsal`}>
                    Open cockpit
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="sw-empty-state admin-empty-state">
            <strong className="sw-empty-title">No pilot profiles configured</strong>
            <p className="sw-empty-copy">Create a pilot profile before using rehearsal readiness workflows.</p>
          </div>
        )}
      </section>

      <section className="sw-supporting-surface admin-command-section admin-support-escalation-strip">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Support escalation overview</p>
            <h2>Open human follow-up records</h2>
            <p className="ops-detail-note">Read-only cross-org view. Admins can monitor severity and ownership, but business operators still own direct follow-up unless explicitly delegated.</p>
          </div>
          <span className={`sw-badge ${supportPosture.highCriticalSupportEscalations ? "sw-badge--warning" : "sw-badge--success"}`}>
            {supportPosture.highCriticalSupportEscalations} high severity
          </span>
        </div>

        {props.supportError ? (
          <div className="form-error-banner support-escalation-error">
            {props.supportError}
          </div>
        ) : null}

        {openSupportItems.length ? (
          <div className="admin-command-list">
            {openSupportItems.slice(0, 6).map((item) => (
              <article className="sw-list-row admin-command-report-action" key={item.id}>
                <div>
                  <div className="admin-command-item-meta">
                    <span className={`sw-badge ${item.severity === "CRITICAL" || item.severity === "HIGH" ? "sw-badge--warning" : "sw-badge--info"}`}>{item.severity.toLowerCase()}</span>
                    <span>{item.status.replaceAll("_", " ").toLowerCase()}</span>
                    <span>{item.orgName ?? "Unknown organisation"}</span>
                    {item.restaurantName ? <span>{item.restaurantName}</span> : null}
                  </div>
                  <strong>{item.title}</strong>
                  <p>{item.note}</p>
                  <div className="briefing-evidence-row">
                    {item.customerName ? <span>{item.customerName}</span> : null}
                    {item.orderId ? <span>Order {item.orderId.slice(0, 8).toUpperCase()}</span> : null}
                    {item.jobId ? <span>Job {item.jobId.slice(0, 8).toUpperCase()}</span> : null}
                    {item.followUpOwner ? <span>Owner: {item.followUpOwner}</span> : <span>No owner assigned</span>}
                  </div>
                </div>
                <span className="sw-badge sw-badge--neutral">{item.category.replaceAll("_", " ")}</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="sw-empty-state admin-empty-state">
            <span className="empty-state-icon" aria-hidden="true">
              <ShipWrightIcon name="check" />
            </span>
            <strong className="sw-empty-title">No open support escalations</strong>
            <p className="sw-empty-copy">Human follow-up records are clear across monitored organisations.</p>
          </div>
        )}
      </section>

      <section className="sw-operational-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Cross-org attention queue</p>
            <h2>Businesses and deliveries needing support</h2>
            <p className="ops-detail-note">{COMMAND_INTELLIGENCE_SIGNAL_COPY}</p>
          </div>
        </div>

        {groups.length ? (
          <div className="admin-command-groups">
            {groups.map((group) => (
              <section className="admin-command-group admin-command-group-flat" key={group.key}>
                <div className="sw-card-header admin-section-header">
                  <div>
                    <p className="eyebrow">{group.orgName}</p>
                    <h3>{group.restaurantName ?? "Cross-org issue queue"}</h3>
                    <p className="ops-detail-note">{group.items.length} attention item{group.items.length === 1 ? "" : "s"} in this support cluster.</p>
                  </div>
                </div>
                <div className="admin-command-list">
                  {(expandedGroupKeys.has(group.key) ? group.items : group.items.slice(0, ADMIN_COMMAND_GROUP_VISIBLE_LIMIT)).map((item) => {
                    const canOpen = canOpenOrgConsole(props.session, item.orgId);
                    return (
                      <article className={`sw-queue-row sw-list-row admin-command-item admin-command-item-${item.severity}`} key={item.id}>
                        <div className="sw-queue-row-main">
                          <div className="admin-command-item-title">
                            <span className={`sw-icon-badge admin-command-item-icon admin-command-item-icon-${item.severity}`} aria-hidden="true">
                              <ShipWrightIcon name={severityIcon(item.severity)} />
                            </span>
                            <div>
                              <div className="admin-command-item-meta">
                                <span className={`sw-badge ${severityClass(item.severity)}`}>{toReadableIssue(item.category)}</span>
                                <span>{formatAgeMinutes(item.ageMinutes)}</span>
                                {item.orderId ? <span>Order {item.orderId.slice(0, 8).toUpperCase()}</span> : null}
                                {item.jobId ? <span>Job {item.jobId.slice(0, 8).toUpperCase()}</span> : null}
                              </div>
                              <h3>{item.title}</h3>
                              <p>{item.summary}</p>
                              <p className="admin-command-recommendation">Recommended next step: {buildRecommendedNextStep(item)}</p>
                              <div className="briefing-evidence-row">
                                {item.customerName ? <span>{item.customerName}</span> : null}
                                {item.orderStatus ? <span>Order {item.orderStatus.replaceAll("_", " ")}</span> : null}
                                {item.jobStatus ? <span>Job {item.jobStatus.replaceAll("_", " ")}</span> : null}
                                {item.paymentStatus ? <span>Payment {item.paymentStatus.replaceAll("_", " ")}</span> : null}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="sw-queue-row-actions admin-command-item-actions">
                          <WorkspaceLink
                            canOpen={canOpen}
                            href={item.href}
                            label={
                              item.entityType === "payment"
                                ? "Open payment risk"
                                : item.entityType === "order"
                                  ? "Open order"
                                  : "Open job"
                            }
                          />
                        </div>
                      </article>
                    );
                  })}
                </div>
                {group.items.length > ADMIN_COMMAND_GROUP_VISIBLE_LIMIT ? (
                  <button
                    className="sw-button sw-button--ghost button button-secondary admin-command-disclosure"
                    onClick={() => {
                      setExpandedGroupKeys((current) => {
                        const next = new Set(current);
                        if (next.has(group.key)) {
                          next.delete(group.key);
                        } else {
                          next.add(group.key);
                        }
                        return next;
                      });
                    }}
                    type="button"
                  >
                    {expandedGroupKeys.has(group.key) ? "Collapse" : `Show ${group.items.length - ADMIN_COMMAND_GROUP_VISIBLE_LIMIT} more`}
                  </button>
                ) : null}
              </section>
            ))}
          </div>
        ) : (
          <div className="sw-empty-state admin-empty-state">
            <span className="empty-state-icon" aria-hidden="true">
              <ShipWrightIcon name="check" />
            </span>
            <strong className="sw-empty-title">All monitored operations clear</strong>
            <p className="sw-empty-copy">No cross-org dispatch, delay, or payment intelligence items need admin review right now.</p>
          </div>
        )}
      </section>

      <section className="sw-operational-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Incident intelligence</p>
            <h2>Delays, blocked delivery, and communication review</h2>
          </div>
        </div>

        {incidentItems.length ? (
          <div className="admin-command-list">
            {visibleIncidentItems.map((item) => {
              const canOpen = canOpenOrgConsole(props.session, item.orgId);
              const hasDraft = hasCommunicationDraft(item);

              return (
                <article className={`sw-queue-row sw-list-row admin-command-item admin-command-incident-row admin-command-item-${item.severity}`} key={`incident:${item.id}`}>
                  <div className="sw-queue-row-main">
                    <div className="admin-command-item-title">
                      <span className={`sw-icon-badge admin-command-item-icon admin-command-item-icon-${item.severity}`} aria-hidden="true">
                        <ShipWrightIcon name={item.incidentSummary?.severity === "critical" ? "alert" : "warning"} />
                      </span>
                      <div>
                        <div className="admin-command-item-meta">
                          <span className={`sw-badge ${severityClass(item.severity)}`}>{item.incidentSummary ? "Incident summary" : toReadableIssue(item.category)}</span>
                          <span>{item.orgName ?? "Unknown organisation"}</span>
                          {item.restaurantName ? <span>{item.restaurantName}</span> : null}
                          {hasDraft ? <span className="sw-badge sw-badge--neutral">Draft only — review before sending</span> : null}
                        </div>
                        <h3>{item.incidentSummary?.title ?? item.title}</h3>
                        <p>{item.incidentSummary?.summary ?? item.reason}</p>
                        <p className="admin-command-recommendation">
                          Recommended next step: {item.incidentSummary?.recommendedNextAction ?? buildRecommendedNextStep(item)}
                        </p>
                        <div className="briefing-evidence-row">
                          {item.incidentSummary?.currentState ? <span>{item.incidentSummary.currentState}</span> : null}
                          <span>{formatAgeMinutes(item.ageMinutes)}</span>
                          {item.incidentSummary?.elapsedMinutes != null ? <span>{item.incidentSummary.elapsedMinutes} min in state</span> : null}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="sw-queue-row-actions admin-command-item-actions">
                    <WorkspaceLink
                      canOpen={canOpen}
                      href={item.href}
                      label={
                        item.entityType === "payment"
                          ? "Open payment risk"
                          : item.entityType === "order"
                            ? "Open order"
                            : "Open job"
                      }
                    />
                  </div>
                </article>
              );
            })}
            {hiddenIncidentCount > 0 || incidentListExpanded ? (
              <button className="sw-button sw-button--ghost button button-secondary admin-command-disclosure" onClick={() => setIncidentListExpanded((value) => !value)} type="button">
                {incidentListExpanded ? "Collapse incidents" : `Show ${hiddenIncidentCount} more incident${hiddenIncidentCount === 1 ? "" : "s"}`}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="sw-empty-state admin-empty-state">
            <span className="empty-state-icon" aria-hidden="true">
              <ShipWrightIcon name="check" />
            </span>
            <strong className="sw-empty-title">No incident summaries need review</strong>
            <p className="sw-empty-copy">Delay, dispatch, and communication-draft signals are currently clear.</p>
          </div>
        )}
      </section>

      <section className="sw-supporting-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">End-of-day closeout preview</p>
            <h2>Cross-org report snapshot</h2>
            <p className="ops-detail-note">Date {props.selectedDate}. This is a deterministic closeout summary across monitored organisations.</p>
          </div>
          {currentOrgReportHref ? (
            <Link className="sw-button sw-button--secondary button button-secondary" href={currentOrgReportHref}>
              Open workspace report
            </Link>
          ) : null}
        </div>

        <div className="admin-command-report-grid">
          <div className="sw-operational-surface admin-command-report-card">
            <p className="eyebrow">Operating summary</p>
            <div className="admin-command-stat-list">
              <div><span>Orders received</span><strong>{props.report.operatingSummary.ordersReceived}</strong></div>
              <div><span>Fulfilled orders</span><strong>{props.report.operatingSummary.fulfilledOrders}</strong></div>
              <div><span>Active / unresolved</span><strong>{props.report.operatingSummary.activeOrUnresolvedOrders}</strong></div>
              <div><span>Dispatch failures</span><strong>{props.report.operatingSummary.dispatchFailures}</strong></div>
              <div><span>Delayed jobs</span><strong>{props.report.operatingSummary.staleOrDelayedJobs}</strong></div>
            </div>
          </div>

          <div className="sw-operational-surface admin-command-report-card">
            <p className="eyebrow">Commercial summary</p>
            <div className="admin-command-stat-list">
              <div><span>Captured</span><strong>{props.report.paymentsSummary.captured}</strong></div>
              <div><span>Failed</span><strong>{props.report.paymentsSummary.failed}</strong></div>
              <div><span>Delivered not captured</span><strong>{props.report.paymentsSummary.deliveredNotCaptured}</strong></div>
              <div><span>Payout review</span><strong>{props.report.paymentsSummary.payoutReviewCount}</strong></div>
              <div><span>Unresolved actions</span><strong>{props.report.unresolvedCount}</strong></div>
            </div>
          </div>
        </div>

        {props.report.unresolvedActions.length ? (
          <div className="admin-command-list">
            {props.report.unresolvedActions.map((item) => (
              <article className={`sw-list-row admin-command-report-action admin-command-item-${item.severity}`} key={item.id}>
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.summary}</p>
                </div>
                <span className={`sw-badge ${item.severity === "danger" ? "sw-badge--danger" : item.severity === "warning" ? "sw-badge--warning" : "sw-badge--neutral"}`}>
                  {item.type.replaceAll("_", " ")}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className="sw-empty-state admin-empty-state">
            <span className="empty-state-icon" aria-hidden="true">
              <ShipWrightIcon name="check" />
            </span>
            <strong className="sw-empty-title">No unresolved closeout actions</strong>
            <p className="sw-empty-copy">The selected date closes without outstanding dispatch, payment, or delay actions.</p>
          </div>
        )}
      </section>

      <section className="sw-supporting-surface admin-command-section admin-command-guidance">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Human approval</p>
            <h2>Oversight remains human-led</h2>
          </div>
        </div>
        <p>
          Command Intelligence summarises operational signals. Platform admins remain responsible for recovery oversight; business operators remain responsible for direct operational actions unless explicitly delegated.
        </p>
      </section>
    </section>
  );
}

async function loadAdminCommandData(session: BusinessSession, date: string) {
  const [briefing, report] = await Promise.all([
    getAdminDailyBriefing(session),
    getAdminEndOfDayReport(session, date)
  ]);
  return { briefing, report };
}

export function AdminCommandShell() {
  const router = useRouter();
  const { status, session, error, refreshBusinessSession, signOut } = useBusinessAuth();
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [report, setReport] = useState<EndOfDayReport | null>(null);
  const [pilots, setPilots] = useState<PilotWorkspace[]>([]);
  const [supportEscalations, setSupportEscalations] = useState<SupportEscalation[]>([]);
  const [demoRequests, setDemoRequests] = useState<DemoRequest[]>([]);
  const [operationalResets, setOperationalResets] = useState<OperationalResetRun[]>([]);
  const [supportLogError, setSupportLogError] = useState<string | null>(null);
  const [demoRequestsError, setDemoRequestsError] = useState<string | null>(null);
  const [operationalResetsError, setOperationalResetsError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(buildAuthRedirectTarget({ pathname: "/admin/command" }));
    }
  }, [router, status]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.context.platformAdmin) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setLoadError(null);
    setSupportLogError(null);
    setDemoRequestsError(null);
    setOperationalResetsError(null);

    void Promise.all([
      loadAdminCommandData(session, selectedDate),
      listAdminPilots(session).catch(() => []),
      listAdminSupportEscalations(session).catch((issue) => {
        setSupportLogError(getUserFacingApiError(issue, "Support log unavailable. Refresh or contact support."));
        return [];
      }),
      listAdminDemoRequests(session).catch((issue) => {
        setDemoRequestsError(getUserFacingApiError(issue, "Demo request posture unavailable. Refresh or contact support."));
        return [];
      }),
      listAdminOperationalResets(session).catch((issue) => {
        setOperationalResetsError(getUserFacingApiError(issue, "Operational reset posture unavailable. Refresh or contact support."));
        return [];
      })
    ])
      .then(([commandData, nextPilots, nextSupportEscalations, nextDemoRequests, nextOperationalResets]) => {
        if (!active) {
          return;
        }

        setBriefing(commandData.briefing);
        setReport(commandData.report);
        setPilots(nextPilots);
        setSupportEscalations(nextSupportEscalations);
        setDemoRequests(nextDemoRequests);
        setOperationalResets(nextOperationalResets);
      })
      .catch((issue) => {
        if (!active) {
          return;
        }

        setLoadError(getUserFacingApiError(issue, COMMAND_INTELLIGENCE_UNAVAILABLE_MESSAGE));
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedDate, session, status]);

  async function handleRefresh() {
    const nextSession = await refreshBusinessSession();
    if (!nextSession) {
      return;
    }

    setLoading(true);
    setLoadError(null);
    setSupportLogError(null);
    setDemoRequestsError(null);
    setOperationalResetsError(null);

    try {
      const [commandData, nextPilots, nextSupportEscalations, nextDemoRequests, nextOperationalResets] = await Promise.all([
        loadAdminCommandData(nextSession, selectedDate),
        listAdminPilots(nextSession).catch(() => []),
        listAdminSupportEscalations(nextSession).catch((issue) => {
          setSupportLogError(getUserFacingApiError(issue, "Support log unavailable. Refresh or contact support."));
          return [];
        }),
        listAdminDemoRequests(nextSession).catch((issue) => {
          setDemoRequestsError(getUserFacingApiError(issue, "Demo request posture unavailable. Refresh or contact support."));
          return [];
        }),
        listAdminOperationalResets(nextSession).catch((issue) => {
          setOperationalResetsError(getUserFacingApiError(issue, "Operational reset posture unavailable. Refresh or contact support."));
          return [];
        })
      ]);
      setBriefing(commandData.briefing);
      setReport(commandData.report);
      setPilots(nextPilots);
      setSupportEscalations(nextSupportEscalations);
      setDemoRequests(nextDemoRequests);
      setOperationalResets(nextOperationalResets);
    } catch (issue) {
      setLoadError(getUserFacingApiError(issue, COMMAND_INTELLIGENCE_UNAVAILABLE_MESSAGE));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push("/get-started");
  }

  if (status === "loading" || loading) {
    return (
      <main className="app-shell loading-shell">
        <section className="ops-empty-state">
          <strong>Loading admin command intelligence</strong>
          <p>Checking cross-org briefing, incidents, and closeout posture.</p>
        </section>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="app-shell loading-shell">
        <section className="ops-empty-state">
          <p className="eyebrow">Session issue</p>
          <h1>Platform session could not be restored.</h1>
          <p>{error ?? "Retry the session restore or sign out and start again."}</p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={() => void refreshBusinessSession()} type="button">
              Retry Session
            </button>
            <button className="button button-secondary" onClick={() => void handleSignOut()} type="button">
              Sign Out
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (status !== "authenticated") {
    return null;
  }

  if (!session?.context.platformAdmin) {
    return (
      <main className="app-shell loading-shell">
        <section className="ops-empty-state">
          <p className="eyebrow">Platform admin required</p>
          <h1>Command intelligence is restricted.</h1>
          <p>Sign in with a seeded `PLATFORM_ADMIN` account to view cross-org command intelligence.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell admin-shell-page admin-command-page">
      <div className="sw-row-between admin-shell-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Platform control plane</p>
          <h1>Admin Command Intelligence</h1>
          <p>Cross-org deterministic briefing, incident detection, and closeout review for platform support.</p>
        </div>
        <div className="hero-actions">
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin">
            Back to Admin
          </Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/demo-requests">
            Demo requests
          </Link>
          <button className="button button-secondary" onClick={() => void handleRefresh()} type="button">
            Refresh
          </button>
          <button className="button button-primary" onClick={() => void handleSignOut()} type="button">
            Sign Out
          </button>
        </div>
      </div>

      <ProductUpdateAnnouncement routePath="/admin/command" viewer="platform_admin" viewerKey={session.userId} />

      <section className="sw-supporting-surface admin-section admin-command-page-controls">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Closeout date</p>
            <h2>Review the selected day</h2>
          </div>
        </div>
        <label className="sw-field reports-date-field">
          <span className="sw-label">Report date</span>
          <input
            className="sw-input reports-date-input"
            max={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setSelectedDate(event.target.value)}
            type="date"
            value={selectedDate}
          />
        </label>
      </section>

      {loadError ? (
        <section className="sw-empty-state admin-empty-state admin-empty-state-danger">
          <span className="empty-state-icon" aria-hidden="true">
            <ShipWrightIcon name="alert" />
          </span>
          <strong className="sw-empty-title">Unable to load admin command intelligence</strong>
          <p className="sw-empty-copy">{loadError}</p>
        </section>
      ) : null}

      {briefing && report ? (
        <AdminCommandView
          briefing={briefing}
          demoRequests={demoRequests}
          demoRequestsError={demoRequestsError}
          operationalResets={operationalResets}
          operationalResetsError={operationalResetsError}
          pilots={pilots}
          report={report}
          selectedDate={selectedDate}
          session={session}
          supportError={supportLogError}
          supportEscalations={supportEscalations}
        />
      ) : null}
    </main>
  );
}
