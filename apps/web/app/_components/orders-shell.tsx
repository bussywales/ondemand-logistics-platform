"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { ContextualHelpLink } from "./help";
import { NotificationsBell } from "./notifications";
import { ShipWrightIcon, type ShipWrightIconName } from "./shipwright-icon";
import { useBusinessAuth } from "./business-auth-provider";
import { getBusinessOrder, listBusinessOrders } from "../_lib/api";
import {
  formatCurrency,
  formatDateTime,
  type BusinessCustomerOrder,
  type BusinessSession
} from "../_lib/product-state";
import {
  formatOrderStatusLabel,
  formatOrderTimeAgo,
  getDeliveryCopy,
  getOrderDecisionState,
  getOrderShortId,
  getPaymentCopy,
  isOrderBlocked,
  isOrderFulfilled,
  isOrderInDelivery,
  matchesOrderFilter,
  ORDER_FILTERS,
  type OrderFilterKey
} from "../_lib/orders-state";

export type OrdersShellProps = {
  orderId?: string;
};

function statusTone(status: string) {
  if (["PAYMENT_AUTHORIZED", "AUTHORIZED", "ASSIGNED", "EN_ROUTE_PICKUP", "PICKED_UP", "EN_ROUTE_DROP"].includes(status)) {
    return "status-live";
  }

  if (["DELIVERED", "COMPLETED", "FULFILLED", "CAPTURED"].includes(status)) {
    return "status-positive";
  }

  if (["PAYMENT_FAILED", "FAILED", "CANCELLED", "DISPATCH_FAILED"].includes(status)) {
    return "status-negative";
  }

  return "status-neutral";
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
    <span className={`status-badge status-with-icon ${statusTone(props.status)}`}>
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

function OrderQueueRow({ order }: { order: BusinessCustomerOrder }) {
  const blocked = isOrderBlocked(order);
  const inDelivery = isOrderInDelivery(order);
  const fulfilled = isOrderFulfilled(order);
  const toneClass = blocked ? "orders-queue-row-danger" : inDelivery ? "orders-queue-row-info" : fulfilled ? "orders-queue-row-success" : "";

  return (
    <article className={`sw-queue-row orders-queue-row ${toneClass}`}>
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
            <span>Restaurant</span>
            <strong>{order.restaurant.name}</strong>
          </div>
          <div>
            <span>Received</span>
            <strong>{formatDateTime(order.createdAt)}</strong>
          </div>
          <div>
            <span>Total</span>
            <strong>{formatCurrency(order.totalCents, order.currency)}</strong>
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
    <div className="ops-decision-tile orders-decision-tile">
      <span className={`decision-tile-icon decision-tile-icon-${props.tone === "danger" ? "danger" : props.tone === "warning" ? "warning" : props.tone === "success" ? "success" : "teal"}`} aria-hidden="true">
        <ShipWrightIcon name={props.icon} />
      </span>
      <span className="ops-section-label">{props.label}</span>
      <strong>{props.value}</strong>
      <p>{props.copy}</p>
    </div>
  );
}

function OrderDetail({ order }: { order: BusinessCustomerOrder }) {
  const decision = getOrderDecisionState(order);
  const fulfilled = isOrderFulfilled(order);

  return (
    <section className="ops-stack orders-detail-stack">
      <section
        className={`sw-decision-surface ops-decision-banner orders-decision-surface ${
          decision.severity === "danger" ? "ops-job-hero-blocker" : decision.severity === "success" ? "orders-decision-surface-success" : "orders-decision-surface-neutral"
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
            copy="Customer fulfilment state visible in the business queue."
            icon="document"
            label="Fulfilment"
            tone={decision.severity === "success" ? "success" : decision.severity === "danger" ? "danger" : "warning"}
            value={statusSummaryLabel(order.status)}
          />
          <DetailInsight copy={getPaymentCopy(order)} icon="payment" label="Payment" tone={order.payment.status === "FAILED" ? "danger" : order.payment.status === "CAPTURED" ? "success" : "info"} value={formatOrderStatusLabel(order.payment.status)} />
          <DetailInsight copy={getDeliveryCopy(order)} icon="route" label="Delivery job" tone={order.job.status === "DISPATCH_FAILED" ? "danger" : order.job.status === "DELIVERED" ? "success" : isOrderInDelivery(order) ? "info" : "warning"} value={formatOrderStatusLabel(order.job.status)} />
          <DetailInsight copy={decision.impact} icon={fulfilled ? "check" : decision.severity === "danger" ? "warning" : "arrow"} label="Next action" tone={decision.severity} value={decision.nextAction} />
        </div>

        <div className="ops-decision-actions orders-decision-actions">
          <Link className="sw-button sw-button--primary button button-primary" href={decision.nextHref}>
            <ShipWrightIcon name={fulfilled ? "timeline" : "route"} />
            <span>{fulfilled ? "Review delivery timeline" : "Open linked delivery job"}</span>
          </Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/app/orders">
            <ShipWrightIcon name="queue" />
            <span>Back to orders queue</span>
          </Link>
        </div>
      </section>

      {fulfilled ? (
        <section className="sw-command-surface orders-success-callout">
          <span className="orders-success-icon" aria-hidden="true">
            <ShipWrightIcon name="check" />
          </span>
          <div>
            <p className="eyebrow">Completed</p>
            <h3>Customer order fulfilled</h3>
            <p>Delivery is complete and payment has been captured. This order now serves as the final operational record for support or audit review.</p>
          </div>
        </section>
      ) : null}

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
          </div>
          <Link className="sw-button sw-button--primary button button-primary" href={`/app/jobs/${order.job.id}`}>
            <ShipWrightIcon name="arrow" />
            <span>Open delivery job</span>
          </Link>
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
              {order.timeline.map((event) => (
                <div className="timeline-item" key={event.id}>
                  <span>{formatDateTime(event.createdAt)}</span>
                  <strong>{formatOrderStatusLabel(event.eventType)}</strong>
                  <p>{event.summary}</p>
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
  const [selectedOrder, setSelectedOrder] = useState<BusinessCustomerOrder | null>(null);
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
      return;
    }

    void refreshOrderDetail(orderId, session);
  }, [orderId, session?.accessToken]);

  const workspaceName = session?.context.currentOrg?.name ?? "No org";

  const orderSummary = useMemo(() => {
    const paymentAuthorized = orders.filter((order) => order.payment.status === "AUTHORIZED").length;
    const dispatchFailed = orders.filter((order) => order.job.status === "DISPATCH_FAILED").length;
    const inDelivery = orders.filter((order) => isOrderInDelivery(order)).length;
    const fulfilled = orders.filter((order) => isOrderFulfilled(order)).length;

    return {
      total: orders.length,
      paymentAuthorized,
      dispatchFailed,
      inDelivery,
      fulfilled
    };
  }, [orders]);

  const filterCounts = useMemo(
    () =>
      ORDER_FILTERS.reduce<Record<OrderFilterKey, number>>((accumulator, filter) => {
        accumulator[filter.key] = orders.filter((order) => matchesOrderFilter(order, filter.key)).length;
        return accumulator;
      }, { all: 0, "new-authorized": 0, "in-delivery": 0, fulfilled: 0, "payment-failed": 0 }),
    [orders]
  );

  const filteredOrders = useMemo(
    () => orders.filter((order) => matchesOrderFilter(order, activeFilter)),
    [activeFilter, orders]
  );

  async function refreshOrders(currentSession: BusinessSession) {
    setLoading(true);
    setError(null);

    try {
      const items = await listBusinessOrders(currentSession);
      setOrders(items);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to load customer orders.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshOrderDetail(id: string, currentSession: BusinessSession) {
    setDetailLoading(true);
    setError(null);

    try {
      const order = await getBusinessOrder(currentSession, id);
      setSelectedOrder(order);
      setOrders((current) => [order, ...current.filter((item) => item.id !== order.id)]);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to load customer order.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    setOrders([]);
    setSelectedOrder(null);
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
          <nav className="ops-nav" aria-label="Workspace navigation">
            <Link className="ops-nav-link" href="/app">
              Operations
            </Link>
            <Link className="ops-nav-link" href="/app/jobs">
              Jobs
            </Link>
            <Link className="ops-nav-link active" href="/app/orders">
              Orders
            </Link>
            <Link className="ops-nav-link" href="/app/notifications">
              Notifications
            </Link>
            <Link className="ops-nav-link" href="/app/restaurant">
              Restaurant
            </Link>
            <Link className="ops-nav-link" href="/help">
              Help
            </Link>
          </nav>

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
            </div>
          </section>

          <section className="ops-sidebar-section ops-sidebar-live">
            <span className="sidebar-live-icon" aria-hidden="true">
              <ShipWrightIcon name={orderSummary.dispatchFailed > 0 ? "warning" : "check"} />
            </span>
            <span className="ops-section-label">Order posture</span>
            <strong>{orderSummary.dispatchFailed > 0 ? "Delivery review" : "Orders clear"}</strong>
            <p>
              {orderSummary.dispatchFailed > 0
                ? `${orderSummary.dispatchFailed} order${orderSummary.dispatchFailed === 1 ? "" : "s"} have blocked delivery jobs.`
                : "No customer orders need delivery review."}
            </p>
            <span className="sidebar-live-action">
              {orderSummary.dispatchFailed > 0 ? "Open blocked orders and resolve the linked delivery jobs." : "Monitor new paid orders."}
            </span>
          </section>
        </aside>

        <div className="ops-main">
          {!detailMode ? (
            <section className="ops-stack orders-stack">
              <section className={`sw-command-surface orders-command-surface ${orderSummary.dispatchFailed > 0 ? "orders-command-surface-alert" : ""}`}>
                <div className="ops-command-copy">
                  <span className="ops-command-icon" aria-hidden="true">
                    <ShipWrightIcon name={orderSummary.dispatchFailed > 0 ? "warning" : "document"} />
                  </span>
                  <div>
                    <p className="eyebrow">Customer orders</p>
                    <h2>Customer order → payment → delivery → fulfilment</h2>
                    <p>
                      Track each paid order through payment authorisation, dispatch, driver execution, and final fulfilment from one operator queue.
                    </p>
                  </div>
                </div>
                <div className="orders-command-actions">
                  <span className="ops-count-pill">{orderSummary.total} total</span>
                  <span className={`ops-count-pill ${orderSummary.dispatchFailed > 0 ? "ops-count-pill-alert" : ""}`}>
                    {orderSummary.dispatchFailed} blocked
                  </span>
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
                      <p className="ops-detail-note">Filter by payment and fulfilment state, then jump into the order or its linked delivery job.</p>
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
          ) : selectedOrder ? (
            <OrderDetail order={selectedOrder} />
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
