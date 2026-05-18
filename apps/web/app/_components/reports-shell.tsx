"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { ContextualHelpLink } from "./help";
import { NotificationsBell } from "./notifications";
import { ProductUpdateAnnouncement } from "./product-updates";
import { ShipWrightIcon, type ShipWrightIconName } from "./shipwright-icon";
import { WorkspaceNav } from "./workspace-nav";
import { useBusinessAuth } from "./business-auth-provider";
import { getBusinessEndOfDayReport, getUserFacingApiError } from "../_lib/api";
import { formatDateTime, type BusinessSession, type EndOfDayActionItem, type EndOfDayEvidenceLink, type EndOfDayReport } from "../_lib/product-state";
import { buildAuthRedirectTarget } from "../_lib/route-protection";
import { COMMAND_INTELLIGENCE_EXPLAINER, COMMAND_INTELLIGENCE_SIGNAL_COPY, CommandIntelligenceNote } from "./product-shell/shared";

const REPORT_DATA_UNAVAILABLE_MESSAGE = "Report data unavailable. Refresh or contact support.";

function toneToClass(value: EndOfDayActionItem["severity"]) {
  if (value === "danger") {
    return "sw-badge--danger";
  }

  if (value === "warning") {
    return "sw-badge--warning";
  }

  return "sw-badge--neutral";
}

function toneToIcon(value: EndOfDayActionItem["severity"]): ShipWrightIconName {
  if (value === "danger") {
    return "alert";
  }

  if (value === "warning") {
    return "warning";
  }

  return "queue";
}

function formatActionLabel(value: EndOfDayActionItem["type"]) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function SummaryItem(props: { label: string; value: number; copy: string; tone?: "info" | "warning" | "success" | "danger" }) {
  return (
    <div className={`reports-summary-item reports-summary-item-${props.tone ?? "info"}`}>
      <span className={`sw-icon-badge ${props.tone === "danger" ? "sw-icon-badge--warning" : props.tone === "success" ? "sw-icon-badge--success" : "sw-icon-badge--info"}`} aria-hidden="true">
        <ShipWrightIcon name={props.tone === "danger" ? "alert" : props.tone === "success" ? "check" : "queue"} />
      </span>
      <div>
        <span>{props.label}</span>
        <strong>{props.value}</strong>
        <p>{props.copy}</p>
      </div>
    </div>
  );
}

export function EndOfDayReportEmptyState() {
  return (
    <div className="sw-empty-state reports-empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        <ShipWrightIcon name="check" />
      </span>
      <strong className="sw-empty-title">No unresolved items today</strong>
      <p className="sw-empty-copy">The day closed without unresolved dispatch, payment, delay, or support follow-up items.</p>
      <Link className="sw-button sw-button--secondary button button-secondary" href="/app/orders">
        <ShipWrightIcon name="arrow" />
        <span>Open orders</span>
      </Link>
    </div>
  );
}

function ActionRow(props: { item: EndOfDayActionItem }) {
  const { item } = props;

  return (
    <article className={`sw-queue-row sw-list-row reports-action-row reports-action-row-${item.severity}`}>
      <div className="sw-queue-row-main">
        <div className="reports-action-title">
          <span className={`sw-icon-badge reports-action-icon reports-action-icon-${item.severity}`} aria-hidden="true">
            <ShipWrightIcon name={toneToIcon(item.severity)} />
          </span>
          <div>
            <div className="reports-action-meta">
              <span className={`sw-badge ${toneToClass(item.severity)}`}>{formatActionLabel(item.type)}</span>
              {item.orderId ? <span>Order {item.orderId.slice(0, 8).toUpperCase()}</span> : null}
              {item.jobId ? <span>Job {item.jobId.slice(0, 8).toUpperCase()}</span> : null}
            </div>
            <h3>{item.label}</h3>
            <p>{item.summary}</p>
          </div>
        </div>
      </div>
      <div className="sw-queue-row-actions">
        <Link className="sw-button sw-button--secondary button button-secondary" href={item.href}>
          <ShipWrightIcon name="arrow" />
          <span>
            {item.entityType === "payment"
              ? "Open payment risk"
              : item.entityType === "order"
                ? "Open order"
                : "Open job"}
          </span>
        </Link>
      </div>
    </article>
  );
}

function EvidenceRow(props: { item: EndOfDayEvidenceLink }) {
  return (
    <Link className="sw-list-row reports-evidence-row" href={props.item.href}>
      <div>
        <strong>{props.item.label}</strong>
        <p>{props.item.summary}</p>
      </div>
      <span aria-hidden="true">
        <ShipWrightIcon name="arrow" />
      </span>
    </Link>
  );
}

export function EndOfDayReportView(props: { report: EndOfDayReport }) {
  const hasUnresolved = props.report.unresolvedCount > 0;

  return (
    <section className="ops-stack reports-stack">
      <section className={`sw-command-surface reports-command-surface ${hasUnresolved ? "sw-command-surface--warning reports-command-surface-alert" : "reports-command-surface-clear"}`}>
        <div className="sw-row reports-command-copy">
          <span className={`sw-icon-badge reports-command-icon ${hasUnresolved ? "admin-command-icon-warning" : "admin-command-icon-success"}`} aria-hidden="true">
            <ShipWrightIcon name={hasUnresolved ? "warning" : "check"} />
          </span>
          <div>
            <span className="sw-badge sw-badge--info reports-command-badge">Command Intelligence</span>
            <p className="eyebrow">End-of-day report</p>
            <h2>{props.report.headline}</h2>
            <p>{props.report.summary}</p>
          </div>
        </div>
        <div className="reports-command-meta">
          <span className={`ops-count-pill ${hasUnresolved ? "ops-count-pill-alert" : ""}`}>{props.report.unresolvedCount} unresolved</span>
          <span className="ops-count-pill">Generated {formatDateTime(props.report.generatedAt)}</span>
          <span className="ops-count-pill">Date {props.report.date}</span>
        </div>
      </section>

      <CommandIntelligenceNote compact copy={COMMAND_INTELLIGENCE_EXPLAINER} />

      <section className="sw-operational-surface reports-section">
        <div className="sw-card-header reports-section-header">
          <div>
            <p className="eyebrow">Operating summary</p>
            <h2>Closeout posture</h2>
          </div>
        </div>
        <div className="reports-closeout-summary">
          <SummaryItem copy="Customer orders opened today." label="Orders received" value={props.report.operatingSummary.ordersReceived} />
          <SummaryItem copy="Orders completed through fulfilment." label="Fulfilled" tone="success" value={props.report.operatingSummary.fulfilledOrders} />
          <SummaryItem copy="Open or unresolved customer orders." label="Unresolved" tone={props.report.operatingSummary.activeOrUnresolvedOrders ? "warning" : "success"} value={props.report.operatingSummary.activeOrUnresolvedOrders} />
          <SummaryItem
            copy="Dispatch or delay follow-up."
            label="Delivery exceptions"
            tone={props.report.operatingSummary.dispatchFailures || props.report.operatingSummary.staleOrDelayedJobs ? "warning" : "success"}
            value={props.report.operatingSummary.dispatchFailures + props.report.operatingSummary.staleOrDelayedJobs}
          />
          <SummaryItem
            copy="Human support records still requiring closeout."
            label="Support follow-up"
            tone={props.report.incidentsSummary.highCriticalSupportEscalations ? "warning" : props.report.incidentsSummary.openSupportEscalations ? "info" : "success"}
            value={props.report.incidentsSummary.openSupportEscalations}
          />
        </div>
      </section>

      <div className="reports-summary-grid">
        <section className="sw-supporting-surface reports-section">
          <div className="sw-card-header reports-section-header">
            <div>
              <p className="eyebrow">Payments summary</p>
              <h2>Commercial signals</h2>
            </div>
          </div>
          <div className="reports-stat-list">
            <div><span>Authorised</span><strong>{props.report.paymentsSummary.authorized}</strong></div>
            <div><span>Captured</span><strong>{props.report.paymentsSummary.captured}</strong></div>
            <div><span>Failed</span><strong>{props.report.paymentsSummary.failed}</strong></div>
            <div><span>Delivered not captured</span><strong>{props.report.paymentsSummary.deliveredNotCaptured}</strong></div>
            <div><span>Payout review</span><strong>{props.report.paymentsSummary.payoutReviewCount}</strong></div>
          </div>
        </section>

        <section className="sw-supporting-surface reports-section">
          <div className="sw-card-header reports-section-header">
            <div>
              <p className="eyebrow">Incident summary</p>
              <h2>Recovery signals</h2>
            </div>
          </div>
          <div className="reports-stat-list">
            <div><span>Dispatch failed</span><strong>{props.report.incidentsSummary.dispatchFailed}</strong></div>
            <div><span>Delay incidents</span><strong>{props.report.incidentsSummary.delayIncidents}</strong></div>
            <div><span>Payment risks</span><strong>{props.report.incidentsSummary.paymentRisks}</strong></div>
            <div><span>Driver follow-up</span><strong>{props.report.incidentsSummary.driverFollowUpIncidents}</strong></div>
            <div><span>Support follow-up</span><strong>{props.report.incidentsSummary.openSupportEscalations}</strong></div>
            <div><span>High support severity</span><strong>{props.report.incidentsSummary.highCriticalSupportEscalations}</strong></div>
            <div><span>Unresolved recommendations</span><strong>{props.report.incidentsSummary.unresolvedRecommendations}</strong></div>
          </div>
        </section>
      </div>

      <section className={`${hasUnresolved ? "sw-operational-surface" : "sw-supporting-surface"} reports-section reports-actions-section`}>
        <div className="sw-card-header reports-section-header">
          <div>
            <p className="eyebrow">Unresolved actions</p>
            <h2>Operator review queue</h2>
            <p className="ops-detail-note">{COMMAND_INTELLIGENCE_SIGNAL_COPY}</p>
          </div>
        </div>
        {props.report.unresolvedActions.length ? (
          <div className="reports-action-list">
            {props.report.unresolvedActions.map((item) => (
              <ActionRow item={item} key={item.id} />
            ))}
          </div>
        ) : (
          <EndOfDayReportEmptyState />
        )}
      </section>

      <section className="sw-supporting-surface reports-section">
        <div className="sw-card-header reports-section-header">
          <div>
            <p className="eyebrow">Evidence</p>
            <h2>Closeout links</h2>
          </div>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/app/payments">
            <ShipWrightIcon name="payment" />
            <span>Open payment risk</span>
          </Link>
        </div>
        <div className="reports-evidence-list">
          {props.report.evidenceLinks.map((item) => (
            <EvidenceRow item={item} key={item.id} />
          ))}
        </div>
      </section>

      <section className="sw-supporting-surface reports-guidance-panel">
        <div className="sw-card-header reports-section-header">
          <div>
            <p className="eyebrow">Human approval</p>
            <h2>Operator remains accountable</h2>
          </div>
        </div>
        <p>{props.report.guidance}</p>
      </section>
    </section>
  );
}

async function loadEndOfDayReport(session: BusinessSession, date: string) {
  return getBusinessEndOfDayReport(session, date);
}

export function ReportsShell(props: { initialDate?: string }) {
  const router = useRouter();
  const { status, session, error, refreshBusinessSession, signOut } = useBusinessAuth();
  const [report, setReport] = useState<EndOfDayReport | null>(null);
  const [selectedDate, setSelectedDate] = useState(props.initialDate ?? new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(buildAuthRedirectTarget({ pathname: "/app/reports/end-of-day" }));
    }
  }, [router, status]);

  useEffect(() => {
    if (status !== "authenticated" || !session) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setLoadError(null);

    void loadEndOfDayReport(session, selectedDate)
      .then((nextReport) => {
        if (active) {
          setReport(nextReport);
        }
      })
      .catch((issue) => {
        if (active) {
          setLoadError(getUserFacingApiError(issue, REPORT_DATA_UNAVAILABLE_MESSAGE));
        }
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

  const workspaceName = session?.context.currentOrg?.name ?? "ShipWright workspace";
  const unresolvedCount = report?.unresolvedCount ?? 0;

  async function handleSignOut() {
    await signOut();
    setReport(null);
    router.push("/get-started");
  }

  async function handleRefresh() {
    const nextSession = await refreshBusinessSession();
    if (!nextSession) {
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const nextReport = await loadEndOfDayReport(nextSession, selectedDate);
      setReport(nextReport);
    } catch (issue) {
      setLoadError(getUserFacingApiError(issue, REPORT_DATA_UNAVAILABLE_MESSAGE));
    } finally {
      setLoading(false);
    }
  }

  const sidebarSummary = useMemo(() => {
    if (!report) {
      return null;
    }

    return [
      { value: report.operatingSummary.ordersReceived, label: "Orders" },
      { value: report.operatingSummary.fulfilledOrders, label: "Fulfilled" },
      { value: report.incidentsSummary.paymentRisks, label: "Payment risks" },
      { value: report.unresolvedCount, label: "Follow-up" }
    ];
  }, [report]);

  if (status === "loading" || loading) {
    return (
      <main className="app-shell loading-shell">
        <section className="ops-empty-state">
          <strong>Loading end-of-day report</strong>
          <p>Summarising orders, deliveries, incidents, and payment risks for closeout review.</p>
        </section>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="app-shell loading-shell">
        <section className="ops-empty-state">
          <p className="eyebrow">Session issue</p>
          <h1>Workspace session could not be restored.</h1>
          <p>{error ?? "Retry the session restore or sign out and start again."}</p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={() => void refreshBusinessSession()} type="button">
              Retry session
            </button>
            <button className="button button-secondary" onClick={() => void handleSignOut()} type="button">
              Sign out
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main className="app-shell ops-shell reports-shell-page">
      <header className="ops-topbar">
        <div className="ops-branding">
          <BrandLogo href="/" mode="responsive" />
          <p className="eyebrow">Operations console</p>
          <h1>{workspaceName}</h1>
        </div>
        <div className="ops-topbar-actions">
          <NotificationsBell session={session} />
          <ContextualHelpLink href="/help/pilot-operations" label="Help" />
          <button className="button button-secondary" onClick={() => void handleRefresh()} type="button">
            Refresh
          </button>
          <button className="button button-secondary" onClick={() => void handleSignOut()} type="button">
            Sign Out
          </button>
        </div>
      </header>

      <ProductUpdateAnnouncement routePath="/app/reports/end-of-day" viewer="business" viewerKey={session.userId} />

      <section className="ops-layout">
        <aside className="ops-sidebar">
          <WorkspaceNav active="reports" platformAdmin={Boolean(session.context.platformAdmin)} />

          <section className="ops-sidebar-section">
            <span className="ops-section-label">Report date</span>
            <label className="sw-field reports-date-field">
              <span className="sw-label">Closeout date</span>
              <input
                className="sw-input reports-date-input"
                max={new Date().toISOString().slice(0, 10)}
                onChange={(event) => setSelectedDate(event.target.value)}
                type="date"
                value={selectedDate}
              />
            </label>
          </section>

          <section className="ops-sidebar-section">
            <span className="ops-section-label">Operator</span>
            <strong>{session.context.displayName}</strong>
            <p>{session.context.email}</p>
          </section>

          {sidebarSummary ? (
            <section className="ops-sidebar-section">
              <span className="ops-section-label">Closeout summary</span>
              <div className="ops-summary-list">
                {sidebarSummary.map((item) => (
                  <div key={item.label}>
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="ops-sidebar-section ops-sidebar-live">
            <span className="sidebar-live-icon" aria-hidden="true">
              <ShipWrightIcon name={unresolvedCount ? "warning" : "check"} />
            </span>
            <span className="ops-section-label">Closeout posture</span>
            <strong>{unresolvedCount ? "Follow-up required" : "No unresolved items"}</strong>
            <p>
              {unresolvedCount
                ? `${unresolvedCount} action${unresolvedCount === 1 ? "" : "s"} still need human review before closeout is complete.`
                : "Dispatch, payment, and delay signals are clear for the selected closeout date."}
            </p>
            <span className="sidebar-live-action">
              {unresolvedCount
                ? "Review actions below before refunds, cancellations, or customer communication are approved."
                : "Use orders, jobs, and payment risk for routine monitoring during service."}
            </span>
          </section>
        </aside>

        <div className="ops-main">
          {loadError ? (
            <section className="sw-empty-state reports-empty-state reports-empty-state-danger">
              <span className="empty-state-icon" aria-hidden="true">
                <ShipWrightIcon name="alert" />
              </span>
              <strong className="sw-empty-title">Unable to load end-of-day report</strong>
              <p className="sw-empty-copy">{loadError}</p>
            </section>
          ) : null}

          {report ? <EndOfDayReportView report={report} /> : null}
        </div>
      </section>
    </main>
  );
}
