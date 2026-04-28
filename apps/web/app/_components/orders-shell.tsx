"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { ShipWrightIcon, type ShipWrightIconName } from "./shipwright-icon";
import { useBusinessAuth } from "./business-auth-provider";
import { getBusinessOrder, listBusinessOrders } from "../_lib/api";
import {
  formatCurrency,
  formatDateTime,
  type BusinessCustomerOrder,
  type BusinessSession
} from "../_lib/product-state";

export type OrdersShellProps = {
  orderId?: string;
};

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function getShortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function statusTone(status: string) {
  if (["PAYMENT_AUTHORIZED", "AUTHORIZED", "ASSIGNED", "EN_ROUTE_PICKUP", "PICKED_UP", "EN_ROUTE_DROP"].includes(status)) {
    return "status-live";
  }

  if (["DELIVERED", "COMPLETED", "CAPTURED"].includes(status)) {
    return "status-positive";
  }

  if (["PAYMENT_FAILED", "FAILED", "CANCELLED", "DISPATCH_FAILED"].includes(status)) {
    return "status-negative";
  }

  return "status-neutral";
}

function statusIconName(status: string): ShipWrightIconName {
  if (["DELIVERED", "COMPLETED", "CAPTURED"].includes(status)) {
    return "check";
  }

  if (["PAYMENT_FAILED", "FAILED", "CANCELLED", "DISPATCH_FAILED"].includes(status)) {
    return "alert";
  }

  if (["REQUIRES_PAYMENT_METHOD", "REQUIRES_CONFIRMATION", "AUTHORIZED", "PAYMENT_AUTHORIZED"].includes(status)) {
    return "payment";
  }

  return "queue";
}

function paymentCopy(order: BusinessCustomerOrder) {
  if (order.payment.status === "AUTHORIZED") {
    return "Payment authorized and ready for operational fulfilment.";
  }

  if (order.payment.status === "FAILED") {
    return order.payment.lastError ?? "Payment failed. The customer order cannot proceed until payment is resolved.";
  }

  if (order.payment.status === "REQUIRES_PAYMENT_METHOD") {
    return "Payment method is required before this order can move forward.";
  }

  return `Payment is ${formatStatusLabel(order.payment.status).toLowerCase()}.`;
}

function deliveryCopy(order: BusinessCustomerOrder) {
  if (order.job.status === "DISPATCH_FAILED") {
    return "Delivery job is blocked because dispatch did not secure a driver.";
  }

  if (order.job.status === "DELIVERED" || order.job.status === "COMPLETED") {
    return "Delivery has been completed.";
  }

  return `Linked delivery job is ${formatStatusLabel(order.job.status).toLowerCase()}.`;
}

function OrdersEmptyState() {
  return (
    <div className="sw-empty-state orders-empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        <ShipWrightIcon name="document" />
      </span>
      <strong className="sw-empty-title">No customer orders yet</strong>
      <p className="sw-empty-copy">Paid orders from public restaurant checkout will appear here for operator review.</p>
      <Link className="sw-button sw-button--secondary button button-secondary" href="/app/restaurant">
        <ShipWrightIcon name="restaurant" />
        <span>Review restaurant setup</span>
      </Link>
    </div>
  );
}

function StatusBadge(props: { status: string }) {
  return (
    <span className={`status-badge status-with-icon ${statusTone(props.status)}`}>
      <ShipWrightIcon name={statusIconName(props.status)} />
      <span>{formatStatusLabel(props.status)}</span>
    </span>
  );
}

function OrderQueueRow({ order }: { order: BusinessCustomerOrder }) {
  const isBlocked = order.payment.status === "FAILED" || order.job.status === "DISPATCH_FAILED";

  return (
    <article className={`sw-queue-row orders-queue-row ${isBlocked ? "sw-queue-row--danger" : ""}`}>
      <div className="sw-queue-row-main orders-queue-main">
        <div className="orders-queue-title">
          <span className={`icon-chip ${isBlocked ? "icon-chip-blocker" : "icon-chip-info"}`} aria-hidden="true">
            <ShipWrightIcon name={isBlocked ? "alert" : "document"} />
          </span>
          <div>
            <span className="ops-section-label">Order {getShortId(order.id)}</span>
            <h3>{order.customer.name}</h3>
          </div>
        </div>
        <div className="orders-queue-meta">
          <span>{order.restaurant.name}</span>
          <span>{order.delivery.addressSummary}</span>
          <span>{formatDateTime(order.createdAt)}</span>
        </div>
        <div className="orders-status-row" aria-label="Order status summary">
          <StatusBadge status={order.status} />
          <StatusBadge status={order.payment.status} />
          <StatusBadge status={order.job.status} />
          <strong>{formatCurrency(order.totalCents, order.currency)}</strong>
        </div>
      </div>
      <div className="sw-queue-row-actions orders-queue-actions">
        <Link className="sw-button sw-button--primary button button-primary" href={`/app/orders/${order.id}`}>
          <ShipWrightIcon name="arrow" />
          <span>View order</span>
        </Link>
        <Link className="sw-button sw-button--secondary button button-secondary" href={`/app/jobs/${order.job.id}`}>
          <ShipWrightIcon name="route" />
          <span>View delivery</span>
        </Link>
      </div>
    </article>
  );
}

function OrderDetail({ order }: { order: BusinessCustomerOrder }) {
  return (
    <section className="ops-stack orders-detail-stack">
      <section className="sw-command-surface orders-command-surface">
        <div className="ops-command-copy">
          <span className="ops-command-icon" aria-hidden="true">
            <ShipWrightIcon name={order.job.status === "DISPATCH_FAILED" ? "alert" : "document"} />
          </span>
          <div>
            <p className="eyebrow">Customer order</p>
            <h2>Order {getShortId(order.id)}</h2>
            <p>
              {order.customer.name} ordered from {order.restaurant.name}. {deliveryCopy(order)}
            </p>
          </div>
        </div>
        <div className="orders-command-actions">
          <StatusBadge status={order.status} />
          <StatusBadge status={order.payment.status} />
          <StatusBadge status={order.job.status} />
        </div>
      </section>

      <div className="orders-detail-grid">
        <section className="sw-operational-surface ops-section orders-detail-card">
          <div className="section-title-row">
            <span className="section-title-icon" aria-hidden="true">
              <ShipWrightIcon name="driver" />
            </span>
            <div>
              <p className="eyebrow">Customer</p>
              <h2>Contact details</h2>
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
              <h2>Destination</h2>
            </div>
          </div>
          <div className="ops-definition-list">
            <div>
              <span>Address</span>
              <strong>{order.delivery.address}</strong>
            </div>
            <div>
              <span>Notes</span>
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
              <h2>Status</h2>
            </div>
          </div>
          <p className="ops-detail-note">{paymentCopy(order)}</p>
          <div className="ops-definition-list">
            <div>
              <span>Payment ID</span>
              <strong>{order.payment.id}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{formatStatusLabel(order.payment.status)}</strong>
            </div>
            <div>
              <span>Authorized</span>
              <strong>{formatCurrency(order.payment.amountAuthorizedCents, order.payment.currency)}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>{formatCurrency(order.payment.totalCents, order.payment.currency)}</strong>
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
              <h2>Linked fulfilment</h2>
            </div>
          </div>
          <p className="ops-detail-note">{deliveryCopy(order)}</p>
          <div className="ops-definition-list">
            <div>
              <span>Job ID</span>
              <strong>{order.job.id}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{formatStatusLabel(order.job.status)}</strong>
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
                  <strong>{formatStatusLabel(event.eventType)}</strong>
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

    return {
      total: orders.length,
      paymentAuthorized,
      dispatchFailed
    };
  }, [orders]);

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
            <Link className="ops-nav-link" href="/app/restaurant">
              Restaurant
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
                <strong>{orderSummary.paymentAuthorized}</strong>
                <span>Paid</span>
              </div>
              <div>
                <strong>{orderSummary.dispatchFailed}</strong>
                <span>Blocked</span>
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
              {orderSummary.dispatchFailed > 0 ? "Open blocked orders and resolve linked delivery jobs." : "Monitor new paid orders."}
            </span>
          </section>
        </aside>

        <div className="ops-main">
          {error ? <div className="form-error-banner">{error}</div> : null}

          {!detailMode ? (
            <section className="ops-stack orders-stack">
              <section className="sw-command-surface orders-command-surface">
                <div className="ops-command-copy">
                  <span className="ops-command-icon" aria-hidden="true">
                    <ShipWrightIcon name="document" />
                  </span>
                  <div>
                    <p className="eyebrow">Customer orders</p>
                    <h2>Paid orders entering operations</h2>
                    <p>
                      Review customer checkout orders, payment authorization, and linked delivery job state from one queue.
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
                      <h2>Order queue</h2>
                      <p className="ops-detail-note">Latest paid customer orders for this workspace.</p>
                    </div>
                  </div>
                  <Link className="sw-button sw-button--secondary button button-secondary" href="/app/restaurant">
                    <ShipWrightIcon name="restaurant" />
                    <span>Merchant setup</span>
                  </Link>
                </div>

                {loading ? (
                  <div className="sw-empty-state orders-empty-state">
                    <strong className="sw-empty-title">Loading orders</strong>
                    <p className="sw-empty-copy">Checking customer order records for this workspace.</p>
                  </div>
                ) : orders.length === 0 ? (
                  <OrdersEmptyState />
                ) : (
                  <div className="orders-queue-list" aria-label="Customer orders">
                    {orders.map((order) => (
                      <OrderQueueRow key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </section>
            </section>
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
