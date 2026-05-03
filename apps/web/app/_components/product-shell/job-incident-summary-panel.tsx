import React from "react";
import Link from "next/link";
import type { OperationalIncidentSummary } from "../../_lib/product-state";
import { ShipWrightIcon } from "../shipwright-icon";
import { COMMAND_INTELLIGENCE_SIGNAL_COPY, formatStatusLabel } from "./shared";

function formatElapsed(value: number) {
  if (value < 60) {
    return `${value} min`;
  }

  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
}

function DraftBox(props: { title: string; copy: string }) {
  return (
    <section className="sw-supporting-surface incident-draft-box">
      <p className="eyebrow">{props.title}</p>
      <p>{props.copy}</p>
    </section>
  );
}

export function JobIncidentSummaryPanel(props: { incidentSummary: OperationalIncidentSummary | null | undefined }) {
  const incident = props.incidentSummary;
  if (!incident) {
    return null;
  }

  const toneClass = incident.severity === "critical" ? "sw-decision-surface" : "sw-operational-surface";

  return (
    <section className={`${toneClass} incident-summary-panel`}>
      <div className="sw-card-header">
        <div>
          <span className="sw-badge sw-badge--info incident-command-badge">Command Intelligence</span>
          <p className="eyebrow">Incident summary</p>
          <h2>{incident.title}</h2>
          <p>{incident.summary}</p>
        </div>
        <span className={`sw-badge ${incident.severity === "critical" ? "sw-badge--danger" : "sw-badge--warning"}`}>
          {incident.severity === "critical" ? "Critical" : "Warning"}
        </span>
      </div>

      <div className="incident-summary-grid">
        <div className="sw-supporting-surface incident-summary-card">
          <p className="eyebrow">What happened</p>
          <strong>{incident.currentState}</strong>
          <p>{incident.likelyCause ?? "We are checking the latest operational signals."}</p>
        </div>
        <div className="sw-supporting-surface incident-summary-card">
          <p className="eyebrow">Why it matters</p>
          <strong>{formatElapsed(incident.elapsedMinutes)} in the current stage</strong>
          <p>Service timing and customer confidence may slip if this state is not reviewed.</p>
        </div>
        <div className="sw-supporting-surface incident-summary-card">
          <p className="eyebrow">Recommended next step</p>
          <strong>{incident.recommendedNextAction}</strong>
          <p>{COMMAND_INTELLIGENCE_SIGNAL_COPY}</p>
        </div>
      </div>

      <div className="briefing-evidence-row incident-summary-evidence">
        <span>Job {formatStatusLabel(incident.evidence.currentJobStatus)}</span>
        {incident.evidence.currentOrderStatus ? <span>Order {formatStatusLabel(incident.evidence.currentOrderStatus)}</span> : null}
        {incident.evidence.currentPaymentStatus ? <span>Payment {formatStatusLabel(incident.evidence.currentPaymentStatus)}</span> : null}
        <span>Dispatch attempts {incident.evidence.dispatchAttemptsCount}</span>
        {incident.evidence.assignedDriverName ? <span>Driver {incident.evidence.assignedDriverName}</span> : null}
      </div>

      <section className="sw-supporting-surface incident-drafts-panel">
        <div className="sw-card-header">
          <div>
            <p className="eyebrow">Communication drafts</p>
            <h3>Draft only — review before sending</h3>
            <p className="ops-detail-note">Based on current operational signals. Drafts are suggestions and are never sent automatically.</p>
          </div>
        </div>
        <div className="incident-drafts-grid">
          {incident.communicationDrafts.customerDraft ? <DraftBox copy={incident.communicationDrafts.customerDraft} title="Customer draft" /> : null}
          {incident.communicationDrafts.restaurantDraft ? <DraftBox copy={incident.communicationDrafts.restaurantDraft} title="Restaurant draft" /> : null}
          {incident.communicationDrafts.driverDraft ? <DraftBox copy={incident.communicationDrafts.driverDraft} title="Driver draft" /> : null}
        </div>
      </section>

      <div className="sw-action-row">
        <Link className="sw-button sw-button--secondary button button-secondary" href={incident.links.jobHref}>
          <ShipWrightIcon name="arrow" />
          <span>Open job</span>
        </Link>
        {incident.links.orderHref ? (
          <Link className="sw-button sw-button--secondary button button-secondary" href={incident.links.orderHref}>
            <ShipWrightIcon name="document" />
            <span>Open order</span>
          </Link>
        ) : null}
        {incident.links.paymentsHref ? (
          <Link className="sw-button sw-button--secondary button button-secondary" href={incident.links.paymentsHref}>
            <ShipWrightIcon name="payment" />
            <span>Open payment risk</span>
          </Link>
        ) : null}
      </div>
    </section>
  );
}
