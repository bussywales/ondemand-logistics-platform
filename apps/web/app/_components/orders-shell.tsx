"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { ContextualHelpLink } from "./help";
import { NotificationsBell } from "./notifications";
import { ProductUpdateAnnouncement } from "./product-updates";
import { ShipWrightIcon, type ShipWrightIconName } from "./shipwright-icon";
import { WorkspaceNav } from "./workspace-nav";
import { useBusinessAuth } from "./business-auth-provider";
import {
  createBusinessSupportEscalation,
  fetchTracking,
  getBusinessOrder,
  getBusinessPilotStatus,
  getUserFacingApiError,
  listBusinessSupportEscalationEvents,
  listBusinessOrders,
  listBusinessPayments,
  listBusinessSupportEscalations,
  updateBusinessSupportEscalation
} from "../_lib/api";
import {
  formatCurrency,
  formatDateTime,
  type BusinessCustomerOrder,
  type BusinessPaymentSummary,
  type BusinessPilotStatus,
  type BusinessSession,
  type CreateSupportEscalationInput,
  type SupportEscalation,
  type SupportEscalationEvent,
  type UpdateSupportEscalationInput
} from "../_lib/product-state";
import type { DispatchRecoverySuggestion, OperationalIncidentSummary } from "../_lib/product-state";
import {
  formatOrderStatusLabel,
  formatOrderTimeAgo,
  getDeliveryCopy,
  getOrderDecisionState,
  getOrderFinancialRiskReasons,
  getOrderNextAction,
  getOrderRiskState,
  getOrderShortId,
  getPaymentCopy,
  hasOrderPaymentRisk,
  isOrderBlocked,
  isOrderFulfilled,
  isOrderInDelivery,
  matchesOrderFilter,
  ORDER_FILTERS,
  type OrderFilterKey,
  type OrderFinancialView,
  withOrderFinancials
} from "../_lib/orders-state";
import { buildPublicTrackingHref, getCustomerTrackingTimelineEntry } from "../_lib/tracking-state";
import { COMMAND_INTELLIGENCE_SIGNAL_COPY, CommandIntelligenceNote } from "./product-shell/shared";
import { JobIncidentSummaryPanel } from "./product-shell/job-incident-summary-panel";
import { PilotGuardrailBanner } from "./pilot-guardrail";
import { SupportEscalationLog } from "./support-escalation-log";

type OrderTrackingIntelligence = {
  assignedDriverName: string | null;
  recoverySuggestion: DispatchRecoverySuggestion | null;
  incidentSummary: OperationalIncidentSummary | null;
};

async function loadSupportEscalationEvents(session: BusinessSession, items: SupportEscalation[]) {
  const entries = await Promise.all(
    items.map(async (item) => {
      try {
        return [item.id, await listBusinessSupportEscalationEvents(session, item.id)] as const;
      } catch {
        return [item.id, []] as const;
      }
    })
  );

  return Object.fromEntries(entries);
}

export type OrdersShellProps = {
  orderId?: string;
};

function statusTone(status: string) {
  if (["PAYMENT_AUTHORIZED", "AUTHORIZED", "ASSIGNED", "EN_ROUTE_PICKUP", "PICKED_UP", "EN_ROUTE_DROP"].includes(status)) {
    return "sw-badge--info";
  }

  if (["DELIVERED", "COMPLETED", "FULFILLED", "CAPTURED"].includes(status)) {
    return "sw-badge--success";
  }

  if (["PAYMENT_FAILED", "FAILED", "CANCELLED", "DISPATCH_FAILED"].includes(status)) {
    return "sw-badge--danger";
  }

  return "sw-badge--neutral";
}

function statusIconName(status: string): ShipWrightIconName {
  if (["DELIVERED", "COMPLETED", "FULFILLED", "CAPTURED"].includes(status)) {
    return "check";
  }

  if (["PAYMENT_FAILED", "FAILED", "CANCELLED", "DISPATCH_FAILED"].includes(status)) {
    return "alert";
  }

  if (["REQUIRES_PAYMENT_METHOD", "REQUIRES_CONFIRMATION", "AUTHORIZED", "PAYMENT_AUTHORIZED"].includes(status)) {
    return "payment";
  }

  if (["ASSIGNED", "EN_ROUTE_PICKUP", "PICKED_UP", "EN_ROUTE_DROP"].includes(status)) {
    return "route";
  }

  return "queue";
}

function statusSummaryLabel(status: BusinessCustomerOrder["status"]) {
  if (status === "PAYMENT_AUTHORIZED") {
    return "Authorised";
  }

  if (status === "FULFILLED") {
    return "Fulfilled";
  }

  if (status === "PAYMENT_FAILED") {
    return "Payment failed";
  }

  return "Submitted";
}

function StatusBadge(props: { status: string }) {
  return (
    <span className={`sw-badge ${statusTone(props.status)}`}>
      <ShipWrightIcon name={statusIconName(props.status)} />
      <span>{formatOrderStatusLabel(props.status)}</span>
    </span>
  );
}

function OrdersEmptyState() {
  return (
    <div className="sw-empty-state orders-empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        <ShipWrightIcon name="document" />
      </span>
      <strong className="sw-empty-title">No customer orders yet</strong>
      <p className="sw-empty-copy">Paid orders from the public restaurant checkout will appear here for operator fulfilment review.</p>
      <Link className="sw-button sw-button--secondary button button-secondary" href="/app/restaurant">
        <ShipWrightIcon name="restaurant" />
        <span>Open merchant setup</span>
      </Link>
    </div>
  );
}

function OrdersErrorState(props: { message: string }) {
  return (
    <div className="sw-empty-state orders-empty-state orders-empty-state-danger">
      <span className="empty-state-icon" aria-hidden="true">
        <ShipWrightIcon name="alert" />
      </span>
      <strong className="sw-empty-title">Unable to load orders</strong>
      <p className="sw-empty-copy">{props.message}</p>
    </div>
  );
}

function FilterChip(props: {
  active: boolean;
  count: number;
  filter: { key: OrderFilterKey; label: string };
  onClick: (key: OrderFilterKey) => void;
}) {
  return (
    <button
      className={`mode-chip orders-filter-chip ${props.active ? "mode-chip-active orders-filter-chip-active" : ""}`}
      onClick={() => props.onClick(props.filter.key)}
      type="button"
    >
      <span>{props.filter.label}</span>
      <strong>{props.count}</strong>
    </button>
  );
}

function OrderQueueRow({ order }: { order: OrderFinancialView }) {
  const blocked = isOrderBlocked(order);
  const inDelivery = isOrderInDelivery(order);
  const fulfilled = isOrderFulfilled(order);
  const riskState = getOrderRiskState(order);
  const nextAction = getOrderNextAction(order);
  const riskReasons = getOrderFinancialRiskReasons(order);
  const toneClass =
    riskState.tone === "danger"
      ? "orders-queue-row-danger"
      : inDelivery
        ? "orders-queue-row-info"
        : fulfilled
          ? "orders-queue-row-success"
          : "";

  return (
    <article className={`sw-queue-row sw-list-row orders-queue-row ${toneClass}`}>
      <div className="sw-queue-row-main orders-queue-main">
        <div className="orders-queue-identity">
          <span
            className={`icon-chip ${
              blocked ? "icon-chip-blocker" : fulfilled ? "icon-chip-success" : inDelivery ? "icon-chip-info" : "icon-chip-risk"
            }`}
            aria-hidden="true"
          >
            <ShipWrightIcon name={blocked ? "alert" : fulfilled ? "check" : inDelivery ? "route" : "document"} />
          </span>
          <div>
            <span className="ops-section-label">Order {getOrderShortId(order.id)}</span>
            <h3>{order.customer.name}</h3>
            <p>
              {order.restaurant.name} · {formatOrderTimeAgo(order.createdAt)}
            </p>
          </div>
        </div>

        <div className="orders-queue-facts" aria-label="Order queue facts">
          <div>
            <span>Customer</span>
            <strong>{order.customer.email}</strong>
          </div>
          <div>
            <span>Total</span>
            <strong>{formatCurrency(order.totalCents, order.currency)}</strong>
          </div>
          <div>
            <span>Platform fee</span>
            <strong>{order.financials?.platformFeeCents != null ? formatCurrency(order.financials.platformFeeCents, order.currency) : "Not available"}</strong>
          </div>
          <div>
            <span>Driver payout</span>
            <strong>{order.financials?.driverPayoutCents != null ? formatCurrency(order.financials.driverPayoutCents, order.currency) : "Not available"}</strong>
          </div>
          <div>
            <span>Next action</span>
            <strong>{nextAction.label}</strong>
          </div>
        </div>

        <div className="orders-queue-status-cluster" aria-label="Order status summary">
          <div className="orders-status-block">
            <span>Fulfilment</span>
            <StatusBadge status={order.status} />
          </div>
          <div className="orders-status-block">
            <span>Payment</span>
            <StatusBadge status={order.payment.status} />
          </div>
          <div className="orders-status-block">
            <span>Delivery</span>
            <StatusBadge status={order.job.status} />
          </div>
          <div className="orders-status-block">
            <span>Risk</span>
            <strong>{riskState.title}</strong>
          </div>
        </div>

        <div className="payments-risk-strip orders-risk-strip">
          <strong>{riskState.title}</strong>
          <p>{riskReasons.length ? riskReasons.join(" · ") : riskState.summary}</p>
        </div>
      </div>

      <div className="sw-queue-row-actions orders-queue-actions">
        <Link className="sw-button sw-button--primary button button-primary" href={`/app/orders/${order.id}`}>
          <ShipWrightIcon name="arrow" />
          <span>View order</span>
        </Link>
        <Link className="sw-button sw-button--secondary button button-secondary" href={`/app/jobs/${order.job.id}`}>
          <ShipWrightIcon name="route" />
          <span>View delivery job</span>
        </Link>
        {hasOrderPaymentRisk(order) ? (
          <Link className="sw-button sw-button--secondary button button-secondary" href={`/app/orders/${order.id}`}>
            <ShipWrightIcon name="payment" />
            <span>Review payment risk</span>
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function DetailInsight(props: {
  icon: ShipWrightIconName;
  label: string;
  tone: "danger" | "warning" | "info" | "success";
  value: string;
  copy: string;
}) {
  return (
    <div className="sw-list-row ops-decision-tile orders-decision-tile orders-decision-summary-row">
      <span className={`decision-tile-icon decision-tile-icon-${props.tone === "danger" ? "danger" : props.tone === "warning" ? "warning" : props.tone === "success" ? "success" : "teal"}`} aria-hidden="true">
        <ShipWrightIcon name={props.icon} />
      </span>
      <span className="ops-section-label">{props.label}</span>
      <strong>{props.value}</strong>
      <p>{props.copy}</p>
    </div>
  );
}

type OrderDetailProps = {
  order: OrderFinancialView;
  tracking: OrderTrackingIntelligence | null;
  supportEscalations?: SupportEscalation[];
  supportEscalationEvents?: Record<string, SupportEscalationEvent[]>;
  supportError?: string | null;
  supportSubmitting?: boolean;
  onCreateSupportEscalation?: (input: CreateSupportEscalationInput) => Promise<void> | void;
  onUpdateSupportEscalationStatus?: (id: string, input: UpdateSupportEscalationInput) => Promise<void> | void;
};

function RecoverySuggestionPanel(props: { suggestion: DispatchRecoverySuggestion }) {
  return (
    <section className="sw-operational-surface orders-recovery-panel">
      <div className="sw-card-header">
        <p className="eyebrow">Recovery suggestion</p>
        <h2>{props.suggestion.explanation}</h2>
      </div>
      <p>{props.suggestion.advisory}</p>
      <p>Recommended next step: {props.suggestion.recommendedAction.replaceAll("_", " ")}</p>
      <p>{COMMAND_INTELLIGENCE_SIGNAL_COPY}</p>
      <div className="sw-action-row">
        <Link className="sw-button sw-button--secondary button button-secondary" href={props.suggestion.links.jobHref}>
          <ShipWrightIcon name="route" />
          <span>Open linked job</span>
        </Link>
        {props.suggestion.links.orderHref ? (
          <Link className="sw-button sw-button--secondary button button-secondary" href={props.suggestion.links.orderHref}>
            <ShipWrightIcon name="document" />
            <span>Open linked order</span>
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function DeliveryCopy(order: OrderFinancialView) {
  if (order.job.status === "DISPATCH_FAILED") {
    return "Delivery is blocked and requires operator review.";
  }

  if (isOrderInDelivery(order)) {
    return "Delivery is in progress with active operational signals.";
  }

  if (order.job.status === "REQUESTED") {
    return "Job is requested and waiting for courier assignment.";
  }

  return "Delivery state is waiting for operator action.";
}

function trackingStateLabel(order: OrderFinancialView, tracking: OrderTrackingIntelligence | null) {
  if (order.job.status === "DISPATCH_FAILED") {
    return "Operator review required";
  }

  if (tracking?.assignedDriverName) {
    return `Courier assigned: ${tracking.assignedDriverName}`;
  }

  if (isOrderInDelivery(order)) {
    return "Courier attached";
  }

  return "Awaiting tracking signal";
}

export function OrderDetail({
  order,
  tracking,
  supportEscalations = [],
  supportEscalationEvents = {},
  supportError = null,
  supportSubmitting = false,
  onCreateSupportEscalation = () => undefined,
  onUpdateSupportEscalationStatus = () => undefined
}: OrderDetailProps) {
  const decision = getOrderDecisionState(order);
  const riskReasons = getOrderFinancialRiskReasons(order);
  const fulfilled = isOrderFulfilled(order);
  const hasRisk = riskReasons.length > 0;
  const trackingReady = Boolean(order.id);
  const paymentCopy = getPaymentCopy(order);
  const timelineItems = order.timeline.map((event) => {
    const readable = getCustomerTrackingTimelineEntry(event.eventType);
    return {
      ...event,
      readableTitle: readable.title,
      readableSummary: readable.summary
    };
  });

  return (
    <section className="ops-stack orders-detail-stack">
      <section
        className={`sw-decision-surface ops-decision-banner orders-decision-surface ${
          decision.severity === "danger"
            ? "ops-job-hero-blocker"
            : decision.severity === "success"
              ? "orders-decision-surface-success"
              : "orders-decision-surface-neutral"
        }`}
      >
        <div className="ops-decision-header">
          <div className="ops-decision-lead">
            <span
              className={`decision-hero-icon ${
                decision.severity === "danger"
                  ? "decision-hero-icon-blocker"
                  : decision.severity === "success"
                    ? "orders-decision-hero-success"
                    : "orders-decision-hero-neutral"
              }`}
              aria-hidden="true"
            >
              <ShipWrightIcon name={decision.severity === "danger" ? "alert" : decision.severity === "success" ? "check" : "document"} />
            </span>
            <div className="ops-job-header ops-decision-copy">
              <p className="eyebrow">Customer order</p>
              <h2>
                {decision.headline} — Order {getOrderShortId(order.id)}
              </h2>
              <p className="ops-detail-note">{decision.summary}</p>
              <p className="ops-detail-note">Impact: {decision.impact}</p>
              <p className="ops-detail-note">Recommended next step: {decision.nextAction}</p>
            </div>
          </div>

          <div className="ops-job-statuses orders-decision-statuses">
            <StatusBadge status={order.status} />
            <StatusBadge status={order.payment.status} />
            <StatusBadge status={order.job.status} />
          </div>
        </div>

        <div className="ops-decision-grid orders-decision-grid">
          <DetailInsight
            copy="Fulfilment and job lifecycle visibility for the active order record."
            icon="document"
            label="Fulfilment"
            tone={fulfilled ? "success" : isOrderInDelivery(order) ? "info" : isOrderBlocked(order) ? "danger" : "warning"}
            value={statusSummaryLabel(order.status)}
          />
          <DetailInsight
            copy={paymentCopy}
            icon="payment"
            label="Payment"
            tone={hasRisk ? "danger" : order.payment.status === "CAPTURED" ? "success" : "info"}
            value={formatOrderStatusLabel(order.payment.status)}
          />
          <DetailInsight copy={DeliveryCopy(order)} icon="route" label="Delivery" tone={order.job.status === "DISPATCH_FAILED" ? "danger" : isOrderInDelivery(order) ? "info" : "warning"} value={formatOrderStatusLabel(order.job.status)} />
          <DetailInsight
            copy="Tracking state for customer communication and support context."
            icon="timeline"
            label="Customer tracking"
            tone={tracking?.assignedDriverName ? "info" : "warning"}
            value={trackingStateLabel(order, tracking)}
          />
          <DetailInsight
            copy="All recovery actions remain operator-managed."
            icon="queue"
            label="Next action"
            tone={decision.severity}
            value={decision.nextAction}
          />
        </div>

        <div className="ops-decision-actions orders-decision-actions">
          <Link className="sw-button sw-button--primary button button-primary" href={decision.nextHref}>
            <ShipWrightIcon name={fulfilled ? "timeline" : "route"} />
            <span>{fulfilled ? "Review delivery timeline" : "Open linked delivery job"}</span>
          </Link>
          {trackingReady ? (
            <Link className="sw-button sw-button--secondary button button-secondary" href={buildPublicTrackingHref(order.id)}>
              <ShipWrightIcon name="route" />
              <span>Open customer tracking</span>
            </Link>
          ) : null}
          {hasRisk ? (
            <Link className="sw-button sw-button--secondary button button-secondary" href="/app/payments">
              <ShipWrightIcon name="payment" />
              <span>Review payment risk</span>
            </Link>
          ) : null}
          <Link className="sw-button sw-button--secondary button button-secondary" href={`/app/jobs/${order.job.id}`}>
            <ShipWrightIcon name="route" />
            <span>Open linked job</span>
          </Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/app/orders">
            <ShipWrightIcon name="queue" />
            <span>Back to orders queue</span>
          </Link>
        </div>

        <CommandIntelligenceNote compact copy={COMMAND_INTELLIGENCE_SIGNAL_COPY} />
      </section>

      {tracking?.recoverySuggestion ? <RecoverySuggestionPanel suggestion={tracking.recoverySuggestion} /> : null}
      {tracking?.incidentSummary ? <JobIncidentSummaryPanel incidentSummary={tracking.incidentSummary} /> : null}
      {!tracking?.recoverySuggestion && !tracking?.incidentSummary ? (
        <section className="sw-supporting-surface orders-recommendation-note">
          <p className="eyebrow">Incident context</p>
          <p>Review linked delivery job for incident intelligence and operator-safe recovery options.</p>
          <Link className="sw-button sw-button--secondary button button-secondary" href={`/app/jobs/${order.job.id}`}>
            <ShipWrightIcon name="document" />
            <span>Review linked job for incident intelligence</span>
          </Link>
        </section>
      ) : null}

      {fulfilled ? (
        <section className="sw-command-surface orders-success-callout">
          <span className="orders-success-icon" aria-hidden="true">
            <ShipWrightIcon name="check" />
          </span>
          <div>
            <p className="eyebrow">Completed</p>
            <h3>Customer order fulfilled</h3>
            <p>Delivery is complete and payment is captured. Keep this order as a support and audit record.</p>
          </div>
        </section>
      ) : null}

      <SupportEscalationLog
        context="order"
        error={supportError}
        eventsByEscalationId={supportEscalationEvents}
        items={supportEscalations}
        jobId={order.job.id}
        onCreate={onCreateSupportEscalation}
        onUpdateStatus={onUpdateSupportEscalationStatus}
        orderId={order.id}
        submitting={supportSubmitting}
      />

      <div className="orders-detail-grid">
        <section className="sw-operational-surface ops-section orders-detail-card">
          <div className="section-title-row">
            <span className="section-title-icon" aria-hidden="true">
              <ShipWrightIcon name="driver" />
            </span>
            <div>
              <p className="eyebrow">Customer</p>
              <h2>Customer details</h2>
            </div>
          </div>
          <div className="ops-definition-list">
            <div>
              <span>Name</span>
              <strong>{order.customer.name}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{order.customer.email}</strong>
            </div>
            <div>
              <span>Phone</span>
              <strong>{order.customer.phone}</strong>
            </div>
          </div>
        </section>

        <section className="sw-operational-surface ops-section orders-detail-card">
          <div className="section-title-row">
            <span className="section-title-icon" aria-hidden="true">
              <ShipWrightIcon name="route" />
            </span>
            <div>
              <p className="eyebrow">Delivery</p>
              <h2>Delivery address</h2>
            </div>
          </div>
          <div className="ops-definition-list">
            <div>
              <span>Address</span>
              <strong>{order.delivery.address}</strong>
            </div>
            <div>
              <span>Delivery notes</span>
              <strong>{order.delivery.notes ?? "No delivery notes"}</strong>
            </div>
            <div>
              <span>Received</span>
              <strong>{formatDateTime(order.createdAt)}</strong>
            </div>
          </div>
        </section>
      </div>

      <div className="orders-detail-grid orders-detail-grid-wide">
        <section className="sw-operational-surface ops-section orders-detail-card">
          <div className="section-title-row">
            <span className="section-title-icon" aria-hidden="true">
              <ShipWrightIcon name="menu" />
            </span>
            <div>
              <p className="eyebrow">Items</p>
              <h2>Order contents</h2>
            </div>
          </div>
          <div className="order-items-list">
            {order.items.map((item) => (
              <div className="order-item-row" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>
                    {item.quantity} x {formatCurrency(item.unitPriceCents, item.currency)}
                  </span>
                </div>
                <strong>{formatCurrency(item.lineTotalCents, item.currency)}</strong>
              </div>
            ))}
          </div>
          <div className="order-total-stack">
            <div>
              <span>Subtotal</span>
              <strong>{formatCurrency(order.subtotalCents, order.currency)}</strong>
            </div>
            <div>
              <span>Delivery</span>
              <strong>{formatCurrency(order.deliveryFeeCents, order.currency)}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>{formatCurrency(order.totalCents, order.currency)}</strong>
            </div>
          </div>
        </section>

        <section className="sw-operational-surface ops-section orders-detail-card">
          <div className="section-title-row">
            <span className="section-title-icon" aria-hidden="true">
              <ShipWrightIcon name="payment" />
            </span>
            <div>
              <p className="eyebrow">Payment</p>
              <h2>Payment state</h2>
            </div>
          </div>
          <p className="ops-detail-note">{getPaymentCopy(order)}</p>
          <div className="ops-definition-list">
            <div>
              <span>Payment ID</span>
              <strong>{order.payment.id}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{formatOrderStatusLabel(order.payment.status)}</strong>
            </div>
            <div>
              <span>Authorised</span>
              <strong>{formatCurrency(order.payment.amountAuthorizedCents, order.payment.currency)}</strong>
            </div>
            <div>
              <span>Captured</span>
              <strong>{formatCurrency(order.payment.amountCapturedCents, order.payment.currency)}</strong>
            </div>
            <div>
              <span>Platform fee</span>
              <strong>{order.financials?.platformFeeCents != null ? formatCurrency(order.financials.platformFeeCents, order.currency) : "Not available"}</strong>
            </div>
            <div>
              <span>Driver payout</span>
              <strong>{order.financials?.driverPayoutCents != null ? formatCurrency(order.financials.driverPayoutCents, order.currency) : "Not available"}</strong>
            </div>
            <div>
              <span>Payout status</span>
              <strong>{order.financials?.payoutStatus ?? "Awaiting ledger"}</strong>
            </div>
          </div>
        </section>
      </div>

      <div className="orders-detail-grid orders-detail-grid-wide">
        <section className="sw-operational-surface ops-section orders-detail-card">
          <div className="section-title-row">
            <span className="section-title-icon" aria-hidden="true">
              <ShipWrightIcon name="route" />
            </span>
            <div>
              <p className="eyebrow">Delivery job</p>
              <h2>Linked fulfilment job</h2>
            </div>
          </div>
          <p className="ops-detail-note">{getDeliveryCopy(order)}</p>
          <div className="ops-definition-list">
            <div>
              <span>Job ID</span>
              <strong>{order.job.id}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{formatOrderStatusLabel(order.job.status)}</strong>
            </div>
            <div>
              <span>ETA</span>
              <strong>{order.job.etaMinutes} min</strong>
            </div>
            <div>
              <span>Pickup</span>
              <strong>{order.job.pickupAddress}</strong>
            </div>
            <div>
              <span>Drop</span>
              <strong>{order.job.dropoffAddress}</strong>
            </div>
            <div>
              <span>Assigned courier</span>
              <strong>{tracking?.assignedDriverName ?? "Awaiting assignment"}</strong>
            </div>
            {tracking?.recoverySuggestion?.links.paymentsHref ? (
              <div>
                <span>Payment risk check</span>
                <Link href={tracking.recoverySuggestion.links.paymentsHref}>
                  Open related payment context
                </Link>
              </div>
            ) : null}
            <div>
              <span>Risk signal</span>
              <strong>{hasRisk ? "Review before closing" : "Clear"}</strong>
            </div>
            {hasRisk ? <p className="sw-micro-copy">{riskReasons.join(" · ")}</p> : null}
          </div>
          <Link className="sw-button sw-button--primary button button-primary" href={`/app/jobs/${order.job.id}`}>
            <ShipWrightIcon name="arrow" />
            <span>Open delivery job</span>
          </Link>
          {trackingReady ? (
            <Link className="sw-button sw-button--secondary button button-secondary" href={buildPublicTrackingHref(order.id)}>
              <ShipWrightIcon name="route" />
              <span>Open customer tracking</span>
            </Link>
          ) : null}
          {hasRisk ? (
            <Link className="sw-button sw-button--secondary button button-secondary" href="/app/payments">
              <ShipWrightIcon name="payment" />
              <span>Review payment risk</span>
            </Link>
          ) : null}
        </section>

        <section className="sw-supporting-surface ops-section orders-detail-card">
          <div className="section-title-row">
            <span className="section-title-icon" aria-hidden="true">
              <ShipWrightIcon name="timeline" />
            </span>
            <div>
              <p className="eyebrow">Timeline</p>
              <h2>Order events</h2>
            </div>
          </div>
          {order.timeline.length === 0 ? (
            <div className="sw-empty-state orders-inline-empty">
              <strong className="sw-empty-title">No timeline events yet</strong>
              <p className="sw-empty-copy">Delivery lifecycle events will appear as the linked job progresses.</p>
            </div>
          ) : (
            <div className="timeline-list">
              {timelineItems.map((event) => (
                <div className="timeline-item" key={event.id}>
                  <span>{formatDateTime(event.createdAt)}</span>
                  <strong>{event.readableTitle}</strong>
                  <p>{event.readableSummary}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

export function OrdersShell({ orderId }: OrdersShellProps) {
  const router = useRouter();
  const { status, session, signOut, refreshBusinessSession } = useBusinessAuth();
  const [orders, setOrders] = useState<BusinessCustomerOrder[]>([]);
  const [payments, setPayments] = useState<BusinessPaymentSummary[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<BusinessCustomerOrder | null>(null);
  const [selectedOrderTracking, setSelectedOrderTracking] = useState<OrderTrackingIntelligence | null>(null);
  const [selectedOrderEscalations, setSelectedOrderEscalations] = useState<SupportEscalation[]>([]);
  const [selectedOrderEscalationEvents, setSelectedOrderEscalationEvents] = useState<Record<string, SupportEscalationEvent[]>>({});
  const [pilotStatus, setPilotStatus] = useState<BusinessPilotStatus | null>(null);
  const [supportLogError, setSupportLogError] = useState<string | null>(null);
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(Boolean(orderId));
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<OrderFilterKey>("all");

  useEffect(() => {
    if (!session) {
      return;
    }

    void refreshOrders(session);
  }, [session?.accessToken]);

  useEffect(() => {
    if (!session || !orderId) {
      setSelectedOrder(null);
      setSelectedOrderTracking(null);
      setSelectedOrderEscalations([]);
      setSupportLogError(null);
      return;
    }

    void refreshOrderDetail(orderId, session);
  }, [orderId, session?.accessToken]);

  const workspaceName = session?.context.currentOrg?.name ?? "No org";
  const orderViews = useMemo(() => {
    const paymentByOrderId = new Map(payments.map((item) => [item.orderId, item]));
    return orders.map((order) => withOrderFinancials(order, paymentByOrderId.get(order.id) ?? null));
  }, [orders, payments]);
  const selectedOrderView = useMemo(() => {
    if (!selectedOrder) {
      return null;
    }
    return withOrderFinancials(
      selectedOrder,
      payments.find((item) => item.orderId === selectedOrder.id) ?? null
    );
  }, [payments, selectedOrder]);

  const orderSummary = useMemo(() => {
    const paymentAuthorized = orderViews.filter((order) => order.payment.status === "AUTHORIZED").length;
    const dispatchFailed = orderViews.filter((order) => order.job.status === "DISPATCH_FAILED").length;
    const inDelivery = orderViews.filter((order) => isOrderInDelivery(order)).length;
    const fulfilled = orderViews.filter((order) => isOrderFulfilled(order)).length;
    const paymentRisk = orderViews.filter((order) => hasOrderPaymentRisk(order)).length;

    return {
      total: orderViews.length,
      paymentAuthorized,
      dispatchFailed,
      inDelivery,
      fulfilled,
      paymentRisk
    };
  }, [orderViews]);

  const filterCounts = useMemo(
    () =>
      ORDER_FILTERS.reduce<Record<OrderFilterKey, number>>((accumulator, filter) => {
        accumulator[filter.key] = orderViews.filter((order) => matchesOrderFilter(order, filter.key)).length;
        return accumulator;
      }, { all: 0, "needs-action": 0, "in-delivery": 0, "payment-risk": 0, fulfilled: 0 }),
    [orderViews]
  );

  const filteredOrders = useMemo(
    () => orderViews.filter((order) => matchesOrderFilter(order, activeFilter)),
    [activeFilter, orderViews]
  );

  async function refreshOrders(currentSession: BusinessSession) {
    setLoading(true);
    setError(null);

    try {
      const [orderItems, paymentItems, nextPilotStatus] = await Promise.all([
        listBusinessOrders(currentSession),
        listBusinessPayments(currentSession),
        getBusinessPilotStatus(currentSession).catch(() => null)
      ]);
      setOrders(orderItems);
      setPayments(paymentItems);
      setPilotStatus(nextPilotStatus);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to load customer orders.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshOrderDetail(id: string, currentSession: BusinessSession) {
    setDetailLoading(true);
    setError(null);
    setSelectedOrderTracking(null);
    setSelectedOrderEscalations([]);
    setSupportLogError(null);

    try {
      const order = await getBusinessOrder(currentSession, id);
      const [paymentItems, escalationItems, nextPilotStatus] = await Promise.all([
        listBusinessPayments(currentSession),
        listBusinessSupportEscalations(currentSession, { orderId: id }).catch((issue) => {
          setSupportLogError(getUserFacingApiError(issue, "Support log unavailable. Refresh or contact support."));
          return [];
        }),
        getBusinessPilotStatus(currentSession).catch(() => null)
      ]);
      const tracking = await fetchTracking(currentSession, order.job.id).catch(() => null);
      setSelectedOrder(order);
      setPayments(paymentItems);
      setPilotStatus(nextPilotStatus);
      setSelectedOrderEscalations(escalationItems);
      setSelectedOrderEscalationEvents(await loadSupportEscalationEvents(currentSession, escalationItems));
      setOrders((current) => [order, ...current.filter((item) => item.id !== order.id)]);

      setSelectedOrderTracking(
        tracking
          ? {
              assignedDriverName: tracking.assignedDriver?.displayName ?? null,
              recoverySuggestion: tracking.recoverySuggestion ?? null,
              incidentSummary: tracking.incidentSummary ?? null
            }
          : null
      );
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to load customer order.");
      setSelectedOrderTracking(null);
      setSelectedOrderEscalations([]);
      setSelectedOrderEscalationEvents({});
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleCreateSupportEscalation(input: CreateSupportEscalationInput) {
    if (!session || !selectedOrder) {
      return;
    }

    setSupportSubmitting(true);
    setError(null);

    try {
      const created = await createBusinessSupportEscalation(session, {
        ...input,
        orderId: selectedOrder.id,
        jobId: selectedOrder.job.id
      });
      setSelectedOrderEscalations((current) => [created, ...current]);
      setSelectedOrderEscalationEvents((current) => ({ ...current, [created.id]: [] }));
      const events = await listBusinessSupportEscalationEvents(session, created.id);
      setSelectedOrderEscalationEvents((current) => ({ ...current, [created.id]: events }));
    } catch (issue) {
      setSupportLogError(getUserFacingApiError(issue, "Support log unavailable. Refresh or contact support."));
    } finally {
      setSupportSubmitting(false);
    }
  }

  async function handleUpdateSupportEscalationStatus(id: string, input: UpdateSupportEscalationInput) {
    if (!session) {
      return;
    }

    setSupportSubmitting(true);
    setError(null);

    try {
      const updated = await updateBusinessSupportEscalation(session, id, input);
      setSelectedOrderEscalations((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      const events = await listBusinessSupportEscalationEvents(session, updated.id);
      setSelectedOrderEscalationEvents((current) => ({ ...current, [updated.id]: events }));
    } catch (issue) {
      setSupportLogError(getUserFacingApiError(issue, "Support log unavailable. Refresh or contact support."));
    } finally {
      setSupportSubmitting(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    setOrders([]);
    setPayments([]);
    setSelectedOrder(null);
    setPilotStatus(null);
    setSelectedOrderEscalations([]);
    setSelectedOrderEscalationEvents({});
    setSupportLogError(null);
    router.push("/get-started");
  }

  if (status === "loading") {
    return (
      <main className="app-shell loading-shell">
        <section className="ops-empty-state">
          <strong>Loading customer orders</strong>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="app-shell loading-shell">
        <section className="ops-empty-state">
          <p className="eyebrow">Business onboarding required</p>
          <h1>Sign in before using orders.</h1>
          <p>Open onboarding, create or resume the operator account, then return here.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/get-started">
              Go to Get Started
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!session.context.currentOrg) {
    return (
      <main className="app-shell loading-shell">
        <section className="ops-empty-state">
          <p className="eyebrow">Business org missing</p>
          <h1>Finish org setup before using orders.</h1>
          <p>The account is authenticated but not attached to a business operator membership yet.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/get-started">
              Complete Onboarding
            </Link>
            <button className="button button-secondary" onClick={() => void handleSignOut()} type="button">
              Sign Out
            </button>
          </div>
        </section>
      </main>
    );
  }

  const detailMode = Boolean(orderId);

  return (
    <main className="app-shell ops-shell orders-shell">
      <header className="ops-topbar">
        <div className="ops-branding">
          <BrandLogo href="/" mode="responsive" />
          <p className="eyebrow">Operations console</p>
          <h1>{workspaceName}</h1>
        </div>
        <div className="ops-topbar-actions">
          <NotificationsBell session={session} />
          <ContextualHelpLink href="/help/orders" />
          <button
            className="button button-secondary"
            onClick={() =>
              void refreshBusinessSession().then((nextSession) => {
                if (nextSession) {
                  return detailMode && orderId ? refreshOrderDetail(orderId, nextSession) : refreshOrders(nextSession);
                }
              })
            }
            type="button"
          >
            Refresh
          </button>
          <button className="button button-secondary" onClick={() => void handleSignOut()} type="button">
            Sign Out
          </button>
        </div>
      </header>

      <section className="ops-layout">
        <aside className="ops-sidebar">
          <WorkspaceNav active="orders" platformAdmin={session.context.platformAdmin} />

          <section className="ops-sidebar-section">
            <span className="ops-section-label">Operator</span>
            <strong>{session.context.displayName}</strong>
            <p>{session.context.email}</p>
          </section>

          <section className="ops-sidebar-section">
            <span className="ops-section-label">Customer orders</span>
            <div className="ops-summary-list">
              <div>
                <strong>{orderSummary.total}</strong>
                <span>Total</span>
              </div>
              <div>
                <strong>{orderSummary.inDelivery}</strong>
                <span>In delivery</span>
              </div>
              <div>
                <strong>{orderSummary.fulfilled}</strong>
                <span>Fulfilled</span>
              </div>
              <div>
                <strong>{orderSummary.paymentRisk}</strong>
                <span>Payment risk</span>
              </div>
            </div>
          </section>

          <section className="ops-sidebar-section ops-sidebar-live">
            <span className="sidebar-live-icon" aria-hidden="true">
              <ShipWrightIcon name={orderSummary.paymentRisk > 0 || orderSummary.dispatchFailed > 0 ? "warning" : "check"} />
            </span>
            <span className="ops-section-label">Order posture</span>
            <strong>{orderSummary.paymentRisk > 0 ? "Payment review" : orderSummary.dispatchFailed > 0 ? "Delivery review" : "Orders clear"}</strong>
            <p>
              {orderSummary.paymentRisk > 0
                ? `${orderSummary.paymentRisk} order${orderSummary.paymentRisk === 1 ? "" : "s"} have payment or payout risk signals.`
                : orderSummary.dispatchFailed > 0
                  ? `${orderSummary.dispatchFailed} order${orderSummary.dispatchFailed === 1 ? "" : "s"} have blocked delivery jobs.`
                  : "No customer orders need payment or delivery review."}
            </p>
            <span className="sidebar-live-action">
              {orderSummary.paymentRisk > 0
                ? "Open risk-bearing orders and verify capture, refunds, or payout posture."
                : orderSummary.dispatchFailed > 0
                  ? "Open blocked orders and resolve the linked delivery jobs."
                  : "Monitor new paid orders."}
            </span>
          </section>
        </aside>

        <div className="ops-main">
          <ProductUpdateAnnouncement routePath="/app/orders" viewer="business" viewerKey={session.userId} />
          <PilotGuardrailBanner canManagePilots={Boolean(session.context.platformAdmin)} compact pilotStatus={pilotStatus} />

          {!detailMode ? (
            <section className="ops-stack orders-stack">
              <section className={`sw-command-surface orders-command-surface ${orderSummary.dispatchFailed > 0 || orderSummary.paymentRisk > 0 ? "orders-command-surface-alert" : ""}`}>
                <div className="ops-command-copy">
                  <span className="ops-command-icon" aria-hidden="true">
                    <ShipWrightIcon name={orderSummary.paymentRisk > 0 || orderSummary.dispatchFailed > 0 ? "warning" : "document"} />
                  </span>
                  <div>
                    <p className="eyebrow">Customer orders</p>
                    <h2>Orders stay in control even when payment risk appears</h2>
                    <p>
                      Review payment state, delivery progress, fulfilment, and next action from one order-first queue.
                    </p>
                  </div>
                </div>
                <div className="orders-command-actions">
                  <span className="ops-count-pill">{orderSummary.total} total</span>
                  <span className={`ops-count-pill ${orderSummary.paymentRisk > 0 ? "ops-count-pill-alert" : ""}`}>
                    {orderSummary.paymentRisk} payment risk
                  </span>
                  <span className={`ops-count-pill ${orderSummary.dispatchFailed > 0 ? "ops-count-pill-alert" : ""}`}>{orderSummary.dispatchFailed} blocked</span>
                </div>
              </section>

              <section className="sw-operational-surface ops-section orders-list-section">
                <div className="ops-section-header">
                  <div className="section-title-row">
                    <span className="section-title-icon" aria-hidden="true">
                      <ShipWrightIcon name="queue" />
                    </span>
                    <div>
                      <p className="eyebrow">Orders</p>
                      <h2>Operational order queue</h2>
                      <p className="ops-detail-note">Order, payment, delivery, fulfilment, financial risk, and next action stay connected in one operator queue.</p>
                    </div>
                  </div>
                  <Link className="sw-button sw-button--secondary button button-secondary" href="/app/restaurant">
                    <ShipWrightIcon name="restaurant" />
                    <span>Merchant setup</span>
                  </Link>
                </div>

                <div className="orders-filter-row" aria-label="Order queue filters">
                  {ORDER_FILTERS.map((filter) => (
                    <FilterChip
                      active={activeFilter === filter.key}
                      count={filterCounts[filter.key]}
                      filter={filter}
                      key={filter.key}
                      onClick={setActiveFilter}
                    />
                  ))}
                </div>

                {error ? (
                  <OrdersErrorState message={error} />
                ) : loading ? (
                  <div className="sw-empty-state orders-empty-state">
                    <strong className="sw-empty-title">Loading orders</strong>
                    <p className="sw-empty-copy">Checking customer order records for this workspace.</p>
                  </div>
                ) : orders.length === 0 ? (
                  <OrdersEmptyState />
                ) : filteredOrders.length === 0 ? (
                  <div className="sw-empty-state orders-empty-state">
                    <span className="empty-state-icon" aria-hidden="true">
                      <ShipWrightIcon name="queue" />
                    </span>
                    <strong className="sw-empty-title">No orders in this filter</strong>
                    <p className="sw-empty-copy">Switch filters to review other paid orders, delivery states, or fulfilled records.</p>
                  </div>
                ) : (
                  <div className="orders-queue-list" aria-label="Customer orders">
                    {filteredOrders.map((order) => (
                      <OrderQueueRow key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </section>
            </section>
          ) : error ? (
            <OrdersErrorState message={error} />
          ) : detailLoading ? (
            <section className="sw-empty-state orders-empty-state">
              <strong className="sw-empty-title">Loading order</strong>
              <p className="sw-empty-copy">Fetching customer order detail and linked delivery state.</p>
            </section>
          ) : selectedOrderView ? (
            <OrderDetail
              onCreateSupportEscalation={handleCreateSupportEscalation}
              onUpdateSupportEscalationStatus={handleUpdateSupportEscalationStatus}
              order={selectedOrderView}
              supportEscalations={selectedOrderEscalations}
              supportEscalationEvents={selectedOrderEscalationEvents}
              supportError={supportLogError}
              supportSubmitting={supportSubmitting}
              tracking={selectedOrderTracking}
            />
          ) : (
            <section className="sw-empty-state orders-empty-state">
              <strong className="sw-empty-title">Order not found</strong>
              <p className="sw-empty-copy">This order is unavailable or not visible to this operator account.</p>
              <Link className="button button-secondary" href="/app/orders">
                Back to orders
              </Link>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
