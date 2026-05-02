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
import { listBusinessOrders, listBusinessPayments } from "../_lib/api";
import {
  formatCurrency,
  formatDateTime,
  type BusinessCustomerOrder,
  type BusinessPaymentSummary,
  type BusinessSession
} from "../_lib/product-state";
import {
  formatOrderStatusLabel,
  formatOrderTimeAgo,
  getOrderFinancialRiskReasons,
  getOrderNextAction,
  getOrderRiskState,
  getOrderShortId,
  getPaymentCopy,
  isOrderFulfilled,
  isOrderInDelivery,
  matchesPaymentRiskFilter,
  PAYMENT_RISK_FILTERS,
  type OrderFinancialView,
  type PaymentRiskFilterKey,
  withOrderFinancials
} from "../_lib/orders-state";
import { buildAuthRedirectTarget } from "../_lib/route-protection";

function statusTone(status: string) {
  if (["PAYMENT_FAILED", "FAILED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED", "DISPATCH_FAILED"].includes(status)) {
    return "status-negative";
  }

  if (["DELIVERED", "FULFILLED", "CAPTURED", "PAID"].includes(status)) {
    return "status-positive";
  }

  if (["AUTHORIZED", "PAYMENT_AUTHORIZED", "ASSIGNED", "EN_ROUTE_PICKUP", "PICKED_UP", "EN_ROUTE_DROP", "READY", "PENDING"].includes(status)) {
    return "status-live";
  }

  return "status-neutral";
}

function statusIconName(status: string): ShipWrightIconName {
  if (["PAYMENT_FAILED", "FAILED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED", "DISPATCH_FAILED"].includes(status)) {
    return "alert";
  }

  if (["DELIVERED", "FULFILLED", "CAPTURED", "PAID"].includes(status)) {
    return "check";
  }

  if (["AUTHORIZED", "PAYMENT_AUTHORIZED"].includes(status)) {
    return "payment";
  }

  if (["ASSIGNED", "EN_ROUTE_PICKUP", "PICKED_UP", "EN_ROUTE_DROP"].includes(status)) {
    return "route";
  }

  return "queue";
}

function StatusBadge(props: { status: string; label?: string }) {
  return (
    <span className={`status-badge status-with-icon ${statusTone(props.status)}`}>
      <ShipWrightIcon name={statusIconName(props.status)} />
      <span>{props.label ?? formatOrderStatusLabel(props.status)}</span>
    </span>
  );
}

function FilterChip(props: {
  active: boolean;
  count: number;
  filter: { key: PaymentRiskFilterKey; label: string };
  onClick: (key: PaymentRiskFilterKey) => void;
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

export function PaymentRiskEmptyState() {
  return (
    <div className="sw-empty-state payments-empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        <ShipWrightIcon name="check" />
      </span>
      <strong className="sw-empty-title">No payment risks right now</strong>
      <p className="sw-empty-copy">Payment state is still visible on each order.</p>
      <Link className="sw-button sw-button--secondary button button-secondary" href="/app/orders">
        <ShipWrightIcon name="arrow" />
        <span>Open orders</span>
      </Link>
    </div>
  );
}

export function PaymentRiskQueueRow(props: { order: OrderFinancialView }) {
  const { order } = props;
  const riskState = getOrderRiskState(order);
  const nextAction = getOrderNextAction(order);
  const riskReasons = getOrderFinancialRiskReasons(order);

  return (
    <article className={`sw-queue-row sw-list-row payments-queue-row payments-queue-row-${riskState.tone}`}>
      <div className="sw-queue-row-main payments-queue-main">
        <div className="payments-queue-identity">
          <span
            className={`icon-chip ${riskState.tone === "danger" ? "icon-chip-blocker" : riskState.tone === "warning" ? "icon-chip-risk" : riskState.tone === "info" ? "icon-chip-info" : "icon-chip-success"}`}
            aria-hidden="true"
          >
            <ShipWrightIcon name={riskState.tone === "danger" ? "alert" : riskState.tone === "warning" ? "payment" : riskState.tone === "info" ? "route" : "check"} />
          </span>
          <div>
            <span className="ops-section-label">Order {getOrderShortId(order.id)}</span>
            <h3>{order.customer.name}</h3>
            <p>
              {order.restaurant.name} · {formatOrderTimeAgo(order.createdAt)}
            </p>
          </div>
        </div>

        <div className="payments-queue-facts" aria-label="Payment risk order facts">
          <div>
            <span>Order</span>
            <strong>{getOrderShortId(order.id)}</strong>
          </div>
          <div>
            <span>Customer total</span>
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
        </div>

        <div className="payments-status-cluster" aria-label="Order risk state summary">
          <div className="orders-status-block">
            <span>Payment</span>
            <StatusBadge status={order.payment.status} />
          </div>
          <div className="orders-status-block">
            <span>Delivery</span>
            <StatusBadge status={order.job.status} />
          </div>
          <div className="orders-status-block">
            <span>Fulfilment</span>
            <StatusBadge status={order.status} />
          </div>
          <div className="orders-status-block">
            <span>Next action</span>
            <strong>{nextAction.label}</strong>
          </div>
        </div>

        <div className="payments-risk-strip">
          <strong>{riskState.title}</strong>
          <p>{riskReasons.length ? riskReasons.join(" · ") : getPaymentCopy(order)}</p>
        </div>
      </div>

      <div className="sw-queue-row-actions payments-queue-actions">
        <Link className="sw-button sw-button--primary button button-primary" href={`/app/orders/${order.id}`}>
          <ShipWrightIcon name="arrow" />
          <span>View order</span>
        </Link>
        <Link className="sw-button sw-button--secondary button button-secondary" href={`/app/jobs/${order.job.id}`}>
          <ShipWrightIcon name="route" />
          <span>View delivery job</span>
        </Link>
        {riskReasons.length ? (
          <Link className="sw-button sw-button--secondary button button-secondary" href={nextAction.href}>
            <ShipWrightIcon name="payment" />
            <span>Review payment risk</span>
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function buildOrderViews(
  orders: BusinessCustomerOrder[],
  payments: BusinessPaymentSummary[]
) {
  const paymentByOrderId = new Map(payments.map((item) => [item.orderId, item]));
  return orders.map((order) => withOrderFinancials(order, paymentByOrderId.get(order.id) ?? null));
}

export function PaymentsShell() {
  const router = useRouter();
  const { status, session, error, refreshBusinessSession, signOut } = useBusinessAuth();
  const [orders, setOrders] = useState<BusinessCustomerOrder[]>([]);
  const [payments, setPayments] = useState<BusinessPaymentSummary[]>([]);
  const [filter, setFilter] = useState<PaymentRiskFilterKey>("needs-action");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(buildAuthRedirectTarget({ pathname: "/app/payments" }));
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

    void Promise.all([listBusinessOrders(session), listBusinessPayments(session)])
      .then(([nextOrders, nextPayments]) => {
        if (!active) {
          return;
        }

        setOrders(nextOrders);
        setPayments(nextPayments);
      })
      .catch((issue) => {
        if (active) {
          setLoadError(issue instanceof Error ? issue.message : "Unable to load payment risk.");
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
  }, [session, status]);

  const orderViews = useMemo(() => buildOrderViews(orders, payments), [orders, payments]);
  const riskOrders = useMemo(() => orderViews.filter((order) => getOrderFinancialRiskReasons(order).length > 0), [orderViews]);
  const filteredOrders = useMemo(() => orderViews.filter((order) => matchesPaymentRiskFilter(order, filter)), [filter, orderViews]);
  const counts = useMemo(
    () =>
      Object.fromEntries(PAYMENT_RISK_FILTERS.map((item) => [item.key, orderViews.filter((order) => matchesPaymentRiskFilter(order, item.key)).length])) as Record<PaymentRiskFilterKey, number>,
    [orderViews]
  );
  const inDeliveryCount = useMemo(() => orderViews.filter((order) => isOrderInDelivery(order)).length, [orderViews]);
  const fulfilledCount = useMemo(() => orderViews.filter((order) => isOrderFulfilled(order)).length, [orderViews]);

  async function handleSignOut() {
    await signOut();
    setOrders([]);
    setPayments([]);
    router.push("/get-started");
  }

  if (status === "loading" || loading) {
    return (
      <main className="app-shell loading-shell">
        <section className="ops-empty-state">
          <strong>Loading payment risk</strong>
          <p>Checking orders where payment, capture, refund, or payout state could affect fulfilment.</p>
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
    <main className="app-shell payments-shell-page">
      <header className="app-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Operational finance lens</p>
          <h1>Payment risk</h1>
          <p>Review orders where payment, capture, refund, or payout state may affect fulfilment.</p>
        </div>
        <div className="hero-actions">
          <NotificationsBell session={session} />
          <ContextualHelpLink href="/help/pilot-operations" label="Help" />
        </div>
      </header>

      <WorkspaceNav active="payments" platformAdmin={Boolean(session.context.platformAdmin)} />
      <ProductUpdateAnnouncement routePath="/app/payments" viewer="business" viewerKey={session.userId} />

      {loadError ? (
        <section className="sw-empty-state payments-empty-state payments-empty-state-danger">
          <span className="empty-state-icon" aria-hidden="true">
            <ShipWrightIcon name="alert" />
          </span>
          <strong className="sw-empty-title">Unable to load payment risk</strong>
          <p className="sw-empty-copy">{loadError}</p>
        </section>
      ) : null}

      <section className={`sw-${riskOrders.length ? "decision" : "command"}-surface payments-command-surface ${riskOrders.length ? "" : "payments-healthy-surface"}`}>
        <div className="sw-row payments-command-copy">
          <span className={`sw-icon-badge payments-command-icon ${riskOrders.length ? "admin-command-icon-warning" : "admin-command-icon-success"}`} aria-hidden="true">
            <ShipWrightIcon name={riskOrders.length ? "alert" : "check"} />
          </span>
          <div>
            <p className="eyebrow">Payment risk</p>
            <h2>{riskOrders.length ? `${riskOrders.length} orders need payment review` : "No payment risks"}</h2>
            <p>
              {riskOrders.length
                ? "Orders below have payment, capture, refund, or payout signals that may block fulfilment or support closeout."
                : "Payment state is still visible on each order. Use the orders queue as the primary operational surface."}
            </p>
          </div>
        </div>
        <div className="payments-filter-summary">
          <span className="ops-count-pill">{orderViews.length} orders checked</span>
          <span className={`ops-count-pill ${riskOrders.length ? "ops-count-pill-alert" : ""}`}>{riskOrders.length} risks</span>
          <span className="ops-count-pill">{inDeliveryCount} in delivery</span>
          <span className="ops-count-pill">{fulfilledCount} fulfilled</span>
        </div>
      </section>

      <section className="sw-operational-surface payments-section">
        <div className="sw-card-header payments-section-header">
          <div>
            <p className="eyebrow">Order risk queue</p>
            <h2>Orders first, finance visible</h2>
            <p className="ops-detail-note">Payment state stays connected to dispatch, delivery, and fulfilment rather than sitting in a separate ledger view.</p>
          </div>
          <span className={`status-badge ${riskOrders.length ? "status-negative" : "status-positive"}`}>
            {riskOrders.length ? "Payment action required" : "No payment blockers"}
          </span>
        </div>
        <div className="payments-filter-bar" aria-label="Payment risk filters">
          {PAYMENT_RISK_FILTERS.map((item) => (
            <FilterChip
              active={filter === item.key}
              count={counts[item.key]}
              filter={item}
              key={item.key}
              onClick={setFilter}
            />
          ))}
        </div>
        {riskOrders.length === 0 ? (
          <PaymentRiskEmptyState />
        ) : filteredOrders.length ? (
          <div className="payments-list">
            {filteredOrders.map((order) => (
              <PaymentRiskQueueRow key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <div className="sw-empty-state payments-empty-state">
            <span className="empty-state-icon" aria-hidden="true">
              <ShipWrightIcon name="queue" />
            </span>
            <strong className="sw-empty-title">No orders in this filter</strong>
            <p className="sw-empty-copy">Try another risk lens to inspect authorised, captured, failed, refunded, or payout-review orders.</p>
          </div>
        )}
      </section>
    </main>
  );
}
