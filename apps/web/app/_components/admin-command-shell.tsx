"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { ProductUpdateAnnouncement } from "./product-updates";
import { ShipWrightIcon, type ShipWrightIconName } from "./shipwright-icon";
import { useBusinessAuth } from "./business-auth-provider";
import { getAdminDailyBriefing, getAdminEndOfDayReport, getUserFacingApiError } from "../_lib/api";
import { canOpenOrgConsole } from "../_lib/admin-state";
import { formatDateTime, type BusinessSession, type DailyBriefing, type DailyBriefingItem, type EndOfDayReport } from "../_lib/product-state";
import { buildAuthRedirectTarget } from "../_lib/route-protection";
import { COMMAND_INTELLIGENCE_EXPLAINER, COMMAND_INTELLIGENCE_SIGNAL_COPY, CommandIntelligenceNote } from "./product-shell/shared";

const COMMAND_INTELLIGENCE_UNAVAILABLE_MESSAGE = "Command intelligence data unavailable. Refresh or contact support.";

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
    return "status-negative";
  }

  if (value === "warning") {
    return "status-live";
  }

  return "status-positive";
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
  report: EndOfDayReport;
  selectedDate: string;
  session: BusinessSession;
}) {
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
  const currentOrgReportHref = props.session.context.currentOrg
    ? `/app/reports/end-of-day?date=${encodeURIComponent(props.selectedDate)}`
    : null;

  return (
    <section className="ops-stack admin-command-stack">
      <section className={`${hasAttention ? "sw-decision-surface" : "sw-command-surface"} admin-command-page-hero`}>
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
        </div>
      </section>

      <CommandIntelligenceNote compact copy={COMMAND_INTELLIGENCE_EXPLAINER} />

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
              <section className="sw-supporting-surface admin-command-group" key={group.key}>
                <div className="sw-card-header admin-section-header">
                  <div>
                    <p className="eyebrow">{group.orgName}</p>
                    <h3>{group.restaurantName ?? "Cross-org issue queue"}</h3>
                    <p className="ops-detail-note">{group.items.length} attention item{group.items.length === 1 ? "" : "s"} in this support cluster.</p>
                  </div>
                </div>
                <div className="admin-command-list">
                  {group.items.map((item) => {
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
                                <span className={`status-badge ${severityClass(item.severity)}`}>{toReadableIssue(item.category)}</span>
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
            {incidentItems.map((item) => {
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
                          <span className={`status-badge ${severityClass(item.severity)}`}>{item.incidentSummary ? "Incident summary" : toReadableIssue(item.category)}</span>
                          <span>{item.orgName ?? "Unknown organisation"}</span>
                          {item.restaurantName ? <span>{item.restaurantName}</span> : null}
                          {hasDraft ? <span className="status-badge status-neutral">Draft only — review before sending</span> : null}
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
                <span className={`status-badge ${item.severity === "danger" ? "status-negative" : item.severity === "warning" ? "status-live" : "status-neutral"}`}>
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
  return Promise.all([
    getAdminDailyBriefing(session),
    getAdminEndOfDayReport(session, date)
  ]);
}

export function AdminCommandShell() {
  const router = useRouter();
  const { status, session, error, refreshBusinessSession, signOut } = useBusinessAuth();
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [report, setReport] = useState<EndOfDayReport | null>(null);
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

    void loadAdminCommandData(session, selectedDate)
      .then(([nextBriefing, nextReport]) => {
        if (!active) {
          return;
        }

        setBriefing(nextBriefing);
        setReport(nextReport);
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

    try {
      const [nextBriefing, nextReport] = await loadAdminCommandData(nextSession, selectedDate);
      setBriefing(nextBriefing);
      setReport(nextReport);
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
          report={report}
          selectedDate={selectedDate}
          session={session}
        />
      ) : null}
    </main>
  );
}
