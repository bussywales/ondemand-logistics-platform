"use client";

import React from "react";
import { useState, type FormEvent } from "react";
import {
  type CreateSupportEscalationInput,
  type SupportEscalation,
  type SupportEscalationCategory,
  type SupportEscalationResolutionAction,
  type SupportEscalationResolutionReason,
  type SupportEscalationSeverity,
  type SupportEscalationStatus,
  type UpdateSupportEscalationInput
} from "../_lib/product-state";
import { formatDateTime } from "../_lib/product-state";
import { ShipWrightIcon } from "./shipwright-icon";

const CATEGORY_OPTIONS: Array<{ value: SupportEscalationCategory; label: string }> = [
  { value: "DELIVERY_DELAY", label: "Delivery delay" },
  { value: "DISPATCH_FAILURE", label: "Dispatch failure" },
  { value: "PAYMENT_RISK", label: "Payment risk" },
  { value: "CUSTOMER_SUPPORT", label: "Customer support" },
  { value: "MERCHANT_SUPPORT", label: "Merchant support" },
  { value: "COURIER_SUPPORT", label: "Courier support" },
  { value: "REFUND_REVIEW", label: "Refund review" },
  { value: "GENERAL", label: "General" }
];

const STATUS_OPTIONS: Array<{ value: SupportEscalationStatus; label: string }> = [
  { value: "OPEN", label: "Open" },
  { value: "IN_REVIEW", label: "In review" },
  { value: "WAITING_ON_CUSTOMER", label: "Waiting on customer" },
  { value: "WAITING_ON_MERCHANT", label: "Waiting on merchant" },
  { value: "WAITING_ON_COURIER", label: "Waiting on courier" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CANCELLED", label: "Cancelled" }
];

const SEVERITY_OPTIONS: Array<{ value: SupportEscalationSeverity; label: string }> = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" }
];

const RESOLUTION_ACTION_OPTIONS: Array<{ value: SupportEscalationResolutionAction; label: string }> = [
  { value: "CUSTOMER_UPDATED", label: "Customer updated" },
  { value: "MERCHANT_UPDATED", label: "Merchant updated" },
  { value: "COURIER_UPDATED", label: "Courier updated" },
  { value: "DISPATCH_RETRIED", label: "Dispatch retried" },
  { value: "DRIVER_REASSIGNED", label: "Driver reassigned" },
  { value: "PAYMENT_REVIEWED", label: "Payment reviewed" },
  { value: "REFUND_REVIEWED", label: "Refund reviewed" },
  { value: "ORDER_CANCELLED_MANUALLY", label: "Order cancelled manually" },
  { value: "NO_ACTION_REQUIRED", label: "No action required" },
  { value: "OTHER", label: "Other" }
];

const RESOLUTION_REASON_OPTIONS: Array<{ value: SupportEscalationResolutionReason; label: string }> = [
  { value: "CUSTOMER_CONFIRMED", label: "Customer confirmed" },
  { value: "MERCHANT_CONFIRMED", label: "Merchant confirmed" },
  { value: "COURIER_CONFIRMED", label: "Courier confirmed" },
  { value: "DELIVERY_COMPLETED", label: "Delivery completed" },
  { value: "PAYMENT_RISK_CLEARED", label: "Payment risk cleared" },
  { value: "DUPLICATE_ESCALATION", label: "Duplicate escalation" },
  { value: "TEST_OR_DEMO_RECORD", label: "Test or demo record" },
  { value: "ESCALATED_OUTSIDE_SHIPWRIGHT", label: "Escalated outside ShipWright" },
  { value: "OTHER", label: "Other" }
];

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function severityBadgeClass(value: SupportEscalationSeverity) {
  if (value === "CRITICAL" || value === "HIGH") {
    return "sw-badge--warning";
  }

  if (value === "LOW") {
    return "sw-badge--neutral";
  }

  return "sw-badge--info";
}

function statusBadgeClass(value: SupportEscalationStatus) {
  if (value === "RESOLVED") {
    return "sw-badge--success";
  }

  if (value === "CANCELLED") {
    return "sw-badge--neutral";
  }

  if (value.startsWith("WAITING")) {
    return "sw-badge--warning";
  }

  return "sw-badge--info";
}

function isFinalStatus(value: SupportEscalationStatus) {
  return value === "RESOLVED" || value === "CANCELLED";
}

export function SupportEscalationLog(props: {
  context: "order" | "job";
  error?: string | null;
  items: SupportEscalation[];
  orderId?: string;
  jobId?: string;
  submitting: boolean;
  onCreate: (input: CreateSupportEscalationInput) => Promise<void> | void;
  onUpdateStatus: (id: string, input: UpdateSupportEscalationInput) => Promise<void> | void;
}) {
  const [category, setCategory] = useState<SupportEscalationCategory>(props.context === "job" ? "DISPATCH_FAILURE" : "CUSTOMER_SUPPORT");
  const [severity, setSeverity] = useState<SupportEscalationSeverity>("MEDIUM");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [followUpOwner, setFollowUpOwner] = useState("");
  const [customerContactRequired, setCustomerContactRequired] = useState(false);
  const [merchantContactRequired, setMerchantContactRequired] = useState(false);
  const [courierContactRequired, setCourierContactRequired] = useState(props.context === "job");
  const [statusById, setStatusById] = useState<Record<string, SupportEscalationStatus>>({});
  const [resolutionNoteById, setResolutionNoteById] = useState<Record<string, string>>({});
  const [resolutionActionById, setResolutionActionById] = useState<Record<string, SupportEscalationResolutionAction>>({});
  const [resolutionReasonById, setResolutionReasonById] = useState<Record<string, SupportEscalationResolutionReason>>({});
  const [resolutionErrorById, setResolutionErrorById] = useState<Record<string, string | null>>({});

  async function handleUpdateStatus(item: SupportEscalation, selectedStatus: SupportEscalationStatus) {
    if (!isFinalStatus(selectedStatus)) {
      setResolutionErrorById((current) => ({ ...current, [item.id]: null }));
      await props.onUpdateStatus(item.id, { status: selectedStatus });
      return;
    }

    const resolutionNote = resolutionNoteById[item.id]?.trim() ?? "";
    if (!resolutionNote) {
      setResolutionErrorById((current) => ({
        ...current,
        [item.id]: "Resolution note is required before closing this support record."
      }));
      return;
    }

    setResolutionErrorById((current) => ({ ...current, [item.id]: null }));
    await props.onUpdateStatus(item.id, {
      status: selectedStatus,
      resolutionNote,
      resolutionAction: resolutionActionById[item.id] ?? "NO_ACTION_REQUIRED",
      resolutionReason: resolutionReasonById[item.id] ?? "OTHER"
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await props.onCreate({
      orderId: props.orderId ?? null,
      jobId: props.jobId ?? null,
      category,
      severity,
      title,
      note,
      followUpOwner: followUpOwner.trim() ? followUpOwner.trim() : null,
      customerContactRequired,
      merchantContactRequired,
      courierContactRequired
    });
    setTitle("");
    setNote("");
    setFollowUpOwner("");
    setCustomerContactRequired(false);
    setMerchantContactRequired(false);
    setCourierContactRequired(props.context === "job");
  }

  return (
    <section className="sw-supporting-surface support-escalation-log">
      <div className="sw-card-header support-escalation-header">
        <div>
          <p className="eyebrow">Support &amp; escalation log</p>
          <h2>Human follow-up record</h2>
          <p className="ops-detail-note">
            Record customer, merchant, courier, payment, or delivery follow-up. Notes are audit context only; ShipWright does not send messages or execute refunds from this log.
          </p>
        </div>
        <span className="sw-badge sw-badge--neutral">Human approval required</span>
      </div>

      {props.error ? (
        <div className="form-error-banner support-escalation-error">
          {props.error}
        </div>
      ) : null}

      {props.items.length ? (
        <div className="support-escalation-list">
          {props.items.map((item) => {
            const selectedStatus = statusById[item.id] ?? item.status;
            const finalStatusSelected = isFinalStatus(selectedStatus);
            const itemResolved = isFinalStatus(item.status);
            return (
              <article className={`sw-list-row support-escalation-row${itemResolved ? " support-escalation-row-resolved" : ""}`} key={item.id}>
                <div className="support-escalation-row-main">
                  <div className="support-escalation-row-meta">
                    <span className={`sw-badge ${severityBadgeClass(item.severity)}`}>{formatEnumLabel(item.severity)}</span>
                    <span className={`sw-badge ${statusBadgeClass(item.status)}`}>{formatEnumLabel(item.status)}</span>
                    <span>{formatEnumLabel(item.category)}</span>
                    <span>{formatDateTime(item.updatedAt)}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.note}</p>
                  {item.resolvedAt ? (
                    <div className="support-escalation-resolution-summary">
                      <span className="sw-badge sw-badge--success">Closed out</span>
                      <span>{formatDateTime(item.resolvedAt)}</span>
                      {item.resolutionAction ? <span>Action: {formatEnumLabel(item.resolutionAction)}</span> : null}
                      {item.resolutionReason ? <span>Reason: {formatEnumLabel(item.resolutionReason)}</span> : null}
                      {item.resolutionNote ? <p>{item.resolutionNote}</p> : null}
                    </div>
                  ) : null}
                  <div className="briefing-evidence-row">
                    {item.followUpOwner ? <span>Owner: {item.followUpOwner}</span> : <span>No owner assigned</span>}
                    {item.customerContactRequired ? <span>Customer contact</span> : null}
                    {item.merchantContactRequired ? <span>Merchant contact</span> : null}
                    {item.courierContactRequired ? <span>Courier contact</span> : null}
                  </div>
                </div>
                <div className="support-escalation-status-control">
                  <label className="sw-field">
                    <span className="sw-label">Status</span>
                    <select
                      className="sw-input"
                      onChange={(event) => setStatusById((current) => ({ ...current, [item.id]: event.target.value as SupportEscalationStatus }))}
                      value={selectedStatus}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  {finalStatusSelected ? (
                    <div className="support-escalation-resolution-panel">
                      <p className="ops-detail-note">Closeout is human-reviewed. Record what happened before marking this record final.</p>
                      <label className="sw-field">
                        <span className="sw-label">Resolution action</span>
                        <select
                          className="sw-input"
                          onChange={(event) => setResolutionActionById((current) => ({ ...current, [item.id]: event.target.value as SupportEscalationResolutionAction }))}
                          value={resolutionActionById[item.id] ?? item.resolutionAction ?? "NO_ACTION_REQUIRED"}
                        >
                          {RESOLUTION_ACTION_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="sw-field">
                        <span className="sw-label">Resolution reason</span>
                        <select
                          className="sw-input"
                          onChange={(event) => setResolutionReasonById((current) => ({ ...current, [item.id]: event.target.value as SupportEscalationResolutionReason }))}
                          value={resolutionReasonById[item.id] ?? item.resolutionReason ?? "OTHER"}
                        >
                          {RESOLUTION_REASON_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="sw-field">
                        <span className="sw-label">Resolution note</span>
                        <textarea
                          className="sw-input support-escalation-note"
                          onChange={(event) => setResolutionNoteById((current) => ({ ...current, [item.id]: event.target.value }))}
                          placeholder="Final action taken, who was updated, and why this can be closed."
                          value={resolutionNoteById[item.id] ?? item.resolutionNote ?? ""}
                        />
                      </label>
                      {resolutionErrorById[item.id] ? <p className="form-field-error">{resolutionErrorById[item.id]}</p> : null}
                    </div>
                  ) : null}
                  <button
                    className="sw-button sw-button--secondary button button-secondary"
                    disabled={props.submitting || selectedStatus === item.status}
                    onClick={() => void handleUpdateStatus(item, selectedStatus)}
                    type="button"
                  >
                    Update
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="sw-empty-state support-escalation-empty">
          <span className="empty-state-icon" aria-hidden="true">
            <ShipWrightIcon name="document" />
          </span>
          <strong className="sw-empty-title">No support notes logged</strong>
          <p className="sw-empty-copy">Create a support record when a human follow-up, escalation owner, or resolution context needs to be preserved.</p>
        </div>
      )}

      <form className="support-escalation-form" onSubmit={handleSubmit}>
        <div className="support-escalation-form-grid">
          <label className="sw-field">
            <span className="sw-label">Category</span>
            <select className="sw-input" onChange={(event) => setCategory(event.target.value as SupportEscalationCategory)} value={category}>
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="sw-field">
            <span className="sw-label">Severity</span>
            <select className="sw-input" onChange={(event) => setSeverity(event.target.value as SupportEscalationSeverity)} value={severity}>
              {SEVERITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="sw-field">
            <span className="sw-label">Follow-up owner</span>
            <input className="sw-input" onChange={(event) => setFollowUpOwner(event.target.value)} placeholder="Ops lead, manager, courier coordinator" value={followUpOwner} />
          </label>
        </div>

        <label className="sw-field">
          <span className="sw-label">Title</span>
          <input className="sw-input" minLength={3} onChange={(event) => setTitle(event.target.value)} placeholder="Short operational title" required value={title} />
        </label>
        <label className="sw-field">
          <span className="sw-label">Note</span>
          <textarea className="sw-input support-escalation-note" minLength={3} onChange={(event) => setNote(event.target.value)} placeholder="What happened, who was contacted, and what evidence should be preserved?" required value={note} />
        </label>

        <div className="support-escalation-checks">
          <label><input checked={customerContactRequired} onChange={(event) => setCustomerContactRequired(event.target.checked)} type="checkbox" /> Customer contact required</label>
          <label><input checked={merchantContactRequired} onChange={(event) => setMerchantContactRequired(event.target.checked)} type="checkbox" /> Merchant contact required</label>
          <label><input checked={courierContactRequired} onChange={(event) => setCourierContactRequired(event.target.checked)} type="checkbox" /> Courier contact required</label>
        </div>

        <button className="sw-button sw-button--primary button button-primary" disabled={props.submitting} type="submit">
          <ShipWrightIcon name="document" />
          <span>{props.submitting ? "Saving support note" : "Add support note"}</span>
        </button>
      </form>
    </section>
  );
}
