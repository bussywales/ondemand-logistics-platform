import React from "react";
import Link from "next/link";
import { type DailyBriefing, type DailyBriefingItem, type DispatchRecoverySuggestion } from "../../_lib/product-state";
import { ShipWrightIcon } from "../shipwright-icon";
import { COMMAND_INTELLIGENCE_EXPLAINER, CommandIntelligenceNote, formatStatusLabel } from "./shared";

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

function formatRecoveryActionLabel(value: DispatchRecoverySuggestion["recommendedAction"]) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildBriefingNextAction(item: DailyBriefingItem) {
  if (item.recoverySuggestion) {
    return formatRecoveryActionLabel(item.recoverySuggestion.recommendedAction);
  }

  if (item.incidentSummary) {
    return item.incidentSummary.recommendedNextAction;
  }

  if (item.entityType === "payment" || item.category === "payment_failed" || item.category === "delivered_uncaptured") {
    return "Review payment risk";
  }

  if (item.category === "active_without_driver") {
    return "Assign driver";
  }

  if (item.category === "dispatch_failed") {
    return "Retry dispatch";
  }

  return "Open and review";
}

export function DailyBriefingSurface(props: { briefing: DailyBriefing | null; error?: string | null }) {
  if (!props.briefing) {
    return (
      <section className="sw-utility-surface briefing-surface">
        <div className="sw-card-header briefing-header">
          <div>
            <p className="eyebrow">Daily briefing</p>
            <h2>Briefing unavailable</h2>
            <p>{props.error ?? "ShipWright could not load the current operational briefing. Continue using orders, jobs, and payment risk directly."}</p>
          </div>
        </div>
      </section>
    );
  }

  const hasAttention = props.briefing.attentionCount > 0;
  const visibleCriticalItems = props.briefing.criticalItems.slice(0, 3);
  const hiddenCriticalCount = Math.max(0, props.briefing.criticalItems.length - visibleCriticalItems.length);
  const primaryRecommendation = props.briefing.recommendations[0] ?? null;
  const signalItems = [
    { label: "Attention", value: props.briefing.attentionCount, tone: hasAttention ? "warning" : "success" },
    { label: "Active jobs", value: props.briefing.operatingState.activeJobs, tone: "info" },
    { label: "Payment risks", value: props.briefing.operatingState.paymentRisks, tone: props.briefing.operatingState.paymentRisks ? "warning" : "success" }
  ];

  return (
    <section className={`sw-supporting-surface briefing-surface ${hasAttention ? "briefing-surface-alert" : "briefing-surface-clear"}`}>
      <div className="sw-card-header briefing-header">
        <div className="briefing-title-row">
          <span className={`sw-icon-badge ${hasAttention ? "sw-icon-badge--warning" : "sw-icon-badge--success"}`} aria-hidden="true">
            <ShipWrightIcon name={hasAttention ? "warning" : "check"} />
          </span>
          <div>
            <span className="sw-badge sw-badge--info briefing-command-badge">Command Intelligence</span>
            <p className="eyebrow">Daily briefing</p>
            <h2>{props.briefing.headline}</h2>
            <p>{props.briefing.summary}</p>
          </div>
        </div>
        <div className="briefing-header-actions">
          <Link className="sw-button sw-button--primary button button-primary" href={primaryRecommendation?.href ?? "/app/orders"}>
            <ShipWrightIcon name="arrow" />
            <span>{primaryRecommendation ? primaryRecommendation.label : "Open orders"}</span>
          </Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/app/reports/end-of-day">
            <ShipWrightIcon name="document" />
            <span>Open end-of-day report</span>
          </Link>
        </div>
      </div>

      <div className="briefing-signal-strip" aria-label="Briefing signals">
        {signalItems.map((signal) => (
          <div className={`briefing-signal briefing-signal-${signal.tone}`} key={signal.label}>
            <span>{signal.label}</span>
            <strong>{signal.value}</strong>
          </div>
        ))}
        <div className="briefing-signal briefing-signal-neutral">
          <span>Orders today</span>
          <strong>{props.briefing.operatingState.ordersToday}</strong>
        </div>
      </div>

      {hasAttention ? (
        <div className="briefing-advisory-stream">
          {primaryRecommendation ? (
            <Link className="sw-list-row briefing-primary-action-row" href={primaryRecommendation.href}>
              <div>
                <span className="sw-badge sw-badge--warning">Recommended next step</span>
                <strong>{primaryRecommendation.label}</strong>
                <p>{primaryRecommendation.summary}</p>
              </div>
              <span aria-hidden="true">
                <ShipWrightIcon name="arrow" />
              </span>
            </Link>
          ) : null}

          <div className="briefing-critical-list" aria-label="Key attention signals">
            {visibleCriticalItems.map((item) => (
              <article className={`sw-list-row sw-queue-row briefing-item briefing-item-${item.severity}`} key={item.id}>
                <div className="sw-queue-row-main briefing-item-copy">
                  <div className="briefing-item-topline">
                    <span className={`sw-badge ${item.severity === "danger" ? "sw-badge--danger" : "sw-badge--warning"}`}>{item.title}</span>
                    <span>{formatAgeMinutes(item.ageMinutes)}</span>
                  </div>
                  <strong>{item.summary}</strong>
                  <p>Next action: {buildBriefingNextAction(item)}</p>
                  <div className="briefing-evidence-row">
                    {item.customerName ? <span>{item.customerName}</span> : null}
                    {item.restaurantName ? <span>{item.restaurantName}</span> : null}
                    {item.orderStatus ? <span>Order {formatStatusLabel(item.orderStatus)}</span> : null}
                    {item.jobStatus ? <span>Job {formatStatusLabel(item.jobStatus)}</span> : null}
                    {item.paymentStatus ? <span>Payment {formatStatusLabel(item.paymentStatus)}</span> : null}
                  </div>
                </div>
                <div className="sw-queue-row-actions briefing-item-actions">
                  <Link className="sw-button sw-button--secondary button button-secondary" href={item.href}>
                    <ShipWrightIcon name="arrow" />
                    <span>{item.entityType === "payment" ? "Open payment risk" : item.entityType === "order" ? "Open order" : "Open job"}</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className="briefing-link-row">
            {hiddenCriticalCount > 0 ? <span className="ops-detail-note">{hiddenCriticalCount} more signal{hiddenCriticalCount === 1 ? "" : "s"} available in orders and jobs.</span> : null}
            <Link href="/app/jobs">Open jobs</Link>
            <Link href="/app/orders">Open orders</Link>
            <Link href="/app/payments">Open payment risk</Link>
          </div>
        </div>
      ) : (
        <div className="sw-empty-state briefing-empty-state">
          <span className="empty-state-icon" aria-hidden="true">
            <ShipWrightIcon name="check" />
          </span>
          <strong className="sw-empty-title">No immediate recovery actions are queued.</strong>
          <p className="sw-empty-copy">Payment, dispatch, and fulfilment signals are clear right now. Continue using the workspace queues for normal monitoring.</p>
        </div>
      )}
      <CommandIntelligenceNote compact copy={`${props.briefing.guidance} ${COMMAND_INTELLIGENCE_EXPLAINER}`} />
    </section>
  );
}
