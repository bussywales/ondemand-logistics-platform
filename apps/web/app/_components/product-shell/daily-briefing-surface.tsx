import React from "react";
import Link from "next/link";
import { type DailyBriefing, type DispatchRecoverySuggestion, type OperationalIncidentSummary } from "../../_lib/product-state";
import { ShipWrightIcon } from "../shipwright-icon";
import { COMMAND_INTELLIGENCE_SIGNAL_COPY, CommandIntelligenceNote, formatStatusLabel } from "./shared";

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

function MetricCard(props: { label: string; value: number | null; copy: string; icon: "document" | "queue" | "check" | "payment" | "driver" }) {
  return (
    <div className="sw-metric-card sw-supporting-surface briefing-metric-card">
      <span className="sw-metric-icon sw-icon-badge sw-icon-badge--info" aria-hidden="true">
        <ShipWrightIcon name={props.icon} />
      </span>
      <span className="sw-metric-label">{props.label}</span>
      <strong className="sw-metric-value">{props.value ?? "--"}</strong>
      <p className="sw-metric-copy">{props.copy}</p>
    </div>
  );
}

function formatRecoveryActionLabel(value: DispatchRecoverySuggestion["recommendedAction"]) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function RecoverySuggestionBlock(props: { suggestion: DispatchRecoverySuggestion }) {
  const { suggestion } = props;

  return (
    <div className="briefing-recovery-block">
      <div className="briefing-recovery-header">
        <span className="sw-badge sw-badge--warning">Recovery suggestion</span>
        <strong>Recommended next step: {formatRecoveryActionLabel(suggestion.recommendedAction)}</strong>
      </div>
      <p>{suggestion.explanation}</p>
      <div className="briefing-evidence-row">
        <span>Offers {suggestion.evidence.offerCount ?? "--"}</span>
        <span>Eligible drivers {suggestion.evidence.eligibleDriverCount ?? "--"}</span>
        <span>Payment {formatStatusLabel(suggestion.evidence.paymentStatus)}</span>
        {suggestion.evidence.latestOfferStatus ? <span>Latest offer {formatStatusLabel(suggestion.evidence.latestOfferStatus)}</span> : null}
      </div>
      <p className="briefing-recovery-note">{COMMAND_INTELLIGENCE_SIGNAL_COPY}</p>
    </div>
  );
}

function IncidentSummaryBlock(props: { incident: OperationalIncidentSummary }) {
  return (
    <div className="briefing-incident-block">
      <div className="briefing-recovery-header">
        <span className={`sw-badge ${props.incident.severity === "critical" ? "sw-badge--danger" : "sw-badge--warning"}`}>
          Incident summary
        </span>
        <strong>{props.incident.title}</strong>
      </div>
      <p>{props.incident.summary}</p>
      <div className="briefing-evidence-row">
        <span>{props.incident.currentState}</span>
        <span>{props.incident.elapsedMinutes} min in state</span>
      </div>
      {props.incident.likelyCause ? <p className="briefing-recovery-note">{props.incident.likelyCause}</p> : null}
    </div>
  );
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
          <Link className="sw-button sw-button--secondary button button-secondary" href="/app/reports/end-of-day">
            <ShipWrightIcon name="document" />
            <span>Open end-of-day report</span>
          </Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/app/payments">
            <ShipWrightIcon name="payment" />
            <span>Open payment risk</span>
          </Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/app/jobs">
            <ShipWrightIcon name="queue" />
            <span>Open jobs</span>
          </Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/app/orders">
            <ShipWrightIcon name="arrow" />
            <span>Open orders</span>
          </Link>
        </div>
      </div>

      <p className="briefing-guidance">{props.briefing.guidance}</p>
      <CommandIntelligenceNote compact />

      <div className="briefing-metrics-grid">
        <MetricCard copy="Customer orders opened today." icon="document" label="Orders today" value={props.briefing.operatingState.ordersToday} />
        <MetricCard copy="Requested, assigned, or moving." icon="queue" label="Active jobs" value={props.briefing.operatingState.activeJobs} />
        <MetricCard copy="Orders fully fulfilled today." icon="check" label="Fulfilled" value={props.briefing.operatingState.fulfilledOrders} />
        <MetricCard copy="Commercial issues needing review." icon="payment" label="Payment risks" value={props.briefing.operatingState.paymentRisks} />
      </div>

      {hasAttention ? (
        <div className="sw-stack-sm briefing-content-grid">
          <div className="briefing-critical-list" aria-label="Critical attention items">
            {props.briefing.criticalItems.map((item) => (
              <article className={`sw-list-row sw-queue-row briefing-item briefing-item-${item.severity}`} key={item.id}>
                <div className="sw-queue-row-main briefing-item-copy">
                  <div className="briefing-item-topline">
                    <span className={`sw-badge ${item.severity === "danger" ? "sw-badge--danger" : "sw-badge--warning"}`}>{item.title}</span>
                    <span>{formatAgeMinutes(item.ageMinutes)}</span>
                  </div>
                  <strong>{item.summary}</strong>
                  <p>{item.reason}</p>
                  <div className="briefing-evidence-row">
                    {item.customerName ? <span>{item.customerName}</span> : null}
                    {item.restaurantName ? <span>{item.restaurantName}</span> : null}
                    {item.orderStatus ? <span>Order {formatStatusLabel(item.orderStatus)}</span> : null}
                    {item.jobStatus ? <span>Job {formatStatusLabel(item.jobStatus)}</span> : null}
                    {item.paymentStatus ? <span>Payment {formatStatusLabel(item.paymentStatus)}</span> : null}
                  </div>
                  {item.incidentSummary ? <IncidentSummaryBlock incident={item.incidentSummary} /> : null}
                  {item.recoverySuggestion ? <RecoverySuggestionBlock suggestion={item.recoverySuggestion} /> : null}
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

          <div className="sw-supporting-surface briefing-recommendations">
            <div className="sw-card-header">
              <div>
                <p className="eyebrow">Recommended next actions</p>
                <h3>Operator review queue</h3>
              </div>
            </div>
            <div className="sw-stack-sm">
              {props.briefing.recommendations.map((recommendation) => (
                <Link className="sw-list-row briefing-recommendation-row" href={recommendation.href} key={recommendation.id}>
                  <div>
                    <strong>{recommendation.label}</strong>
                    <p>{recommendation.summary}</p>
                  </div>
                  <span aria-hidden="true">
                    <ShipWrightIcon name="arrow" />
                  </span>
                </Link>
              ))}
            </div>
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
    </section>
  );
}
