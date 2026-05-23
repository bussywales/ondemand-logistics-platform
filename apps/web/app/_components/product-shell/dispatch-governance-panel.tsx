"use client";

import React, { useMemo, useState, type FormEvent } from "react";
import type { AppJob, DispatchAuditEvent } from "../../_lib/product-state";
import { formatDateTime } from "../../_lib/product-state";
import { SectionTitle, summarizeDriver } from "./shared";

type GovernedOverrideType = "MARK_DISPATCH_REVIEWED" | "MARK_DISPATCH_BLOCKED" | "MANUAL_RECOVERY_NOTE";

const reasonOptions = [
  "Courier unavailable",
  "Customer timing issue",
  "Merchant preparation delay",
  "Failed delivery recovery",
  "Support escalation",
  "Fleet manager instruction",
  "Other"
];

function formatLabel(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function summarizeAffiliation(event: DispatchAuditEvent) {
  const affiliation = event.newDriverAffiliation ?? event.previousDriverAffiliation;
  if (!affiliation) return "Courier affiliation not recorded";
  if (affiliation.courierType === "FLEET_MANAGED_COURIER") {
    return `Fleet-managed courier${affiliation.fleetOrgName ? ` · ${affiliation.fleetOrgName}` : ""}`;
  }
  if (affiliation.courierType === "INDEPENDENT_COURIER") {
    return "Independent courier";
  }
  return "Courier affiliation unknown";
}

function eventTitle(event: DispatchAuditEvent) {
  if (event.overrideType) return formatLabel(event.overrideType);
  return formatLabel(event.eventType);
}

export function DispatchGovernancePanel(props: {
  audit: DispatchAuditEvent[];
  error?: string | null;
  job: AppJob;
  onCreateOverride: (input: { overrideType: GovernedOverrideType; reason: string; note?: string | null }) => Promise<void> | void;
  submitting: boolean;
}) {
  const [overrideType, setOverrideType] = useState<GovernedOverrideType>("MANUAL_RECOVERY_NOTE");
  const [reason, setReason] = useState(reasonOptions[0]);
  const [note, setNote] = useState("");
  const latestManualOverride = useMemo(
    () => props.audit.find((event) => event.eventType !== "JOB_DISPATCH_RETRIED"),
    [props.audit]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await props.onCreateOverride({
      overrideType,
      reason,
      note: note.trim() || null
    });
    setNote("");
  }

  return (
    <section className="sw-operational-surface ops-zone dispatch-governance-panel">
      <div className="sw-card-header">
        <div>
          <SectionTitle eyebrow="Dispatch governance" icon="assign" title="Manual review and assignment audit" />
          <p className="ops-detail-note">
            Human-reviewed dispatch notes and override markers are append-only. No autonomous dispatch changes, scoring, or suspension occurs here.
          </p>
        </div>
        <span className={`sw-badge ${latestManualOverride ? "sw-badge--info" : "sw-badge--neutral"}`}>
          {latestManualOverride ? "Human reviewed" : "No override recorded"}
        </span>
      </div>

      <div className="ops-detail-grid">
        <div className="sw-supporting-surface sw-stack-sm">
          <p className="eyebrow">Current assignment posture</p>
          <div className="ops-definition-list">
            <div>
              <dt>Assigned courier</dt>
              <dd>{summarizeDriver(props.job)}</dd>
            </div>
            <div>
              <dt>Readiness posture</dt>
              <dd>{props.job.attentionLevel === "BLOCKER" ? "Needs review" : props.job.attentionLevel === "RISK" ? "Monitor" : "Normal"}</dd>
            </div>
            <div>
              <dt>Next action</dt>
              <dd>
                {props.job.recoverySuggestion?.explanation ??
                  "Use eligible-driver assignment controls below for reassignment; record the human reason here for audit."}
              </dd>
            </div>
          </div>
        </div>

        <form className="sw-supporting-surface sw-stack-sm" onSubmit={(event) => void handleSubmit(event)}>
          <p className="eyebrow">Record human review</p>
          <label className="sw-field">
            <span className="sw-label">Review type</span>
            <select className="sw-input" onChange={(event) => setOverrideType(event.target.value as GovernedOverrideType)} value={overrideType}>
              <option value="MANUAL_RECOVERY_NOTE">Manual recovery note</option>
              <option value="MARK_DISPATCH_REVIEWED">Mark dispatch reviewed</option>
              <option value="MARK_DISPATCH_BLOCKED">Mark dispatch blocked</option>
            </select>
          </label>
          <label className="sw-field">
            <span className="sw-label">Reason</span>
            <select className="sw-input" onChange={(event) => setReason(event.target.value)} value={reason}>
              {reasonOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="sw-field">
            <span className="sw-label">Note</span>
            <textarea
              className="sw-input"
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add operator context for support, fleet, or recovery follow-up."
              rows={3}
              value={note}
            />
          </label>
          {props.error ? <div className="form-error" role="alert">{props.error}</div> : null}
          <button className="sw-button sw-button--primary button button-primary" disabled={props.submitting} type="submit">
            {props.submitting ? "Recording..." : "Record review"}
          </button>
        </form>
      </div>

      <div className="sw-stack-sm">
        <div className="sw-card-header">
          <div>
            <p className="eyebrow">Assignment audit</p>
            <h3>Dispatch history</h3>
          </div>
        </div>
        {props.audit.length === 0 ? (
          <div className="sw-empty-state">
            <strong className="sw-empty-title">No dispatch override history</strong>
            <p className="sw-empty-copy">Manual review notes, reassignment events, and dispatch recovery markers will appear here.</p>
          </div>
        ) : (
          <div className="admin-command-list">
            {props.audit.slice(0, 8).map((event) => (
              <article className="sw-list-row" key={event.id}>
                <div className="sw-stack-sm">
                  <div className="sw-row">
                    <strong>{eventTitle(event)}</strong>
                    <span className="sw-badge sw-badge--neutral">{formatDateTime(event.createdAt)}</span>
                    <span className="sw-badge sw-badge--info">{summarizeAffiliation(event)}</span>
                  </div>
                  <p className="ops-detail-note">
                    {event.reason ?? "No reason recorded"}{event.actorLabel ? ` · ${event.actorLabel}` : ""}
                  </p>
                  {event.note ? <p className="ops-detail-note">{event.note}</p> : null}
                  {event.previousDriverName || event.newDriverName ? (
                    <p className="ops-detail-note">
                      Driver: {event.previousDriverName ?? "Unassigned"} → {event.newDriverName ?? "Unassigned"}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
