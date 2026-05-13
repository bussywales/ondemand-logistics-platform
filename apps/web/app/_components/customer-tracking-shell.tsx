"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getPublicOrderTracking } from "../_lib/api";
import { formatCurrency, formatDateTime, type PublicOrderTracking } from "../_lib/product-state";
import {
  getCustomerJobStatusLabel,
  getCustomerOrderStatusLabel,
  getCustomerPaymentStatusLabel,
  getCustomerRouteNodes,
  getCustomerTrackingTimelineEntry,
  getCustomerTrackingNextStep,
  getCustomerTrackingSummary,
  getCustomerTrackingSupportCopy,
  getTrackingSteps
} from "../_lib/tracking-state";
import { buildRestaurantMenuHref } from "./customer-ordering-shell";
import { BrandLogo } from "./brand-logo";
import { ShipWrightIcon } from "./shipwright-icon";

function mapTrackingError(error: unknown) {
  if (error instanceof Error && (error.message === "customer_order_not_found" || error.message.includes("404"))) {
    return "This tracking link is not available.";
  }

  return "Tracking could not be loaded right now. Refresh and try again.";
}

function getStatusTone(status: string) {
  if (["FULFILLED", "DELIVERED", "CAPTURED"].includes(status)) {
    return "sw-badge--success";
  }

  if (["PAYMENT_FAILED", "FAILED", "DISPATCH_FAILED", "CANCELLED"].includes(status)) {
    return "sw-badge--danger";
  }

  if (["PAYMENT_AUTHORIZED", "AUTHORIZED", "ASSIGNED", "PICKED_UP", "EN_ROUTE_PICKUP", "EN_ROUTE_DROP"].includes(status)) {
    return "sw-badge--info";
  }

  return "sw-badge--neutral";
}

function getStepTone(state: ReturnType<typeof getTrackingSteps>[number]["state"]) {
  if (state === "complete") {
    return "sw-icon-badge--success";
  }

  if (state === "current") {
    return "sw-icon-badge--info";
  }

  if (state === "problem") {
    return "sw-icon-badge--danger";
  }

  return "sw-icon-badge--neutral";
}

function getStepIcon(state: ReturnType<typeof getTrackingSteps>[number]["state"]) {
  if (state === "complete") {
    return "check" as const;
  }

  if (state === "problem") {
    return "warning" as const;
  }

  if (state === "current") {
    return "route" as const;
  }

  return "document" as const;
}

function getRouteNodeTone(state: "complete" | "current" | "upcoming" | "problem") {
  if (state === "complete") {
    return "customer-route-node-complete";
  }

  if (state === "current") {
    return "customer-route-node-current";
  }

  if (state === "problem") {
    return "customer-route-node-problem";
  }

  return "customer-route-node-upcoming";
}

function TrackingEmptyState(props: { title: string; body: string }) {
  return (
    <section className="sw-empty-state sw-operational-surface customer-order-state">
      <p className="eyebrow">Tracking unavailable</p>
      <h1>{props.title}</h1>
      <p className="sw-empty-copy">{props.body}</p>
      <Link className="sw-button sw-button--secondary button button-secondary" href="/contact">
        Contact support
      </Link>
    </section>
  );
}

export function CustomerTrackingShell({ orderId }: { orderId: string }) {
  const [tracking, setTracking] = useState<PublicOrderTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadTracking() {
      setLoading(true);
      setError(null);

      try {
        const nextTracking = await getPublicOrderTracking(orderId);
        if (active) {
          setTracking(nextTracking);
        }
      } catch (issue) {
        if (active) {
          setError(mapTrackingError(issue));
          setTracking(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadTracking();
    return () => {
      active = false;
    };
  }, [orderId]);

  const trackingSteps = useMemo(() => (tracking ? getTrackingSteps(tracking) : []), [tracking]);
  const routeNodes = useMemo(() => (tracking ? getCustomerRouteNodes(tracking) : []), [tracking]);
  const summary = tracking ? getCustomerTrackingSummary(tracking) : null;
  const nextStep = tracking ? getCustomerTrackingNextStep(tracking) : null;

  return (
    <main className="customer-order-page customer-tracking-page">
      <header className="customer-order-header">
        <BrandLogo href="/" mode="responsive" />
        <Link className="customer-order-link" href="/contact">
          Help
        </Link>
      </header>

      {loading ? (
        <TrackingEmptyState title="Loading tracking" body="Reading the latest order and delivery state." />
      ) : error ? (
        <TrackingEmptyState title="Tracking unavailable" body={error} />
      ) : tracking ? (
        <div className="customer-tracking-layout sw-stack">
          <section className={`sw-command-surface customer-tracking-hero ${tracking.job.status === "DISPATCH_FAILED" ? "sw-command-surface--warning" : ""}`}>
            <div className="customer-success-hero">
              <span className={`sw-icon-badge customer-success-icon ${tracking.order.status === "FULFILLED" ? "sw-icon-badge--success" : tracking.job.status === "DISPATCH_FAILED" ? "sw-icon-badge--warning" : "sw-icon-badge--info"}`} aria-hidden="true">
                <ShipWrightIcon name={tracking.order.status === "FULFILLED" ? "check" : tracking.job.status === "DISPATCH_FAILED" ? "warning" : "route"} />
              </span>
              <div>
                <p className="eyebrow">Live tracking</p>
                <h1>{summary?.headline}</h1>
                <p className="customer-success-copy">{summary?.copy}</p>
              </div>
            </div>

            <div className="customer-confirmation-grid customer-tracking-status-grid">
              <div className="sw-supporting-surface customer-confirmation-tile">
                <span>Order</span>
                <strong>{getCustomerOrderStatusLabel(tracking.order.status)}</strong>
              </div>
              <div className="sw-supporting-surface customer-confirmation-tile">
                <span>Delivery job</span>
                <strong>{getCustomerJobStatusLabel(tracking.job.status)}</strong>
              </div>
              <div className="sw-supporting-surface customer-confirmation-tile">
                <span>Payment</span>
                <strong>{getCustomerPaymentStatusLabel(tracking.payment.status)}</strong>
              </div>
              <div className="sw-supporting-surface customer-confirmation-tile">
                <span>Driver</span>
                <strong>{tracking.tracking.driverAssigned ? "Assigned" : "Not assigned yet"}</strong>
              </div>
            </div>
          </section>

          <div className="customer-tracking-grid">
            <section className="sw-operational-surface customer-tracking-panel">
              <div className="sw-card-header">
                <div>
                  <p className="eyebrow">Progress</p>
                  <h2>Delivery progress</h2>
                  <p className="customer-tracking-note">Status and progress only. This is not a live map.</p>
                </div>
                <span className={`sw-badge ${getStatusTone(tracking.job.status)}`}>{getCustomerJobStatusLabel(tracking.job.status)}</span>
              </div>

              <div className="customer-route-visual sw-supporting-surface">
                {routeNodes.map((node, index) => (
                  <div className={`customer-route-node ${getRouteNodeTone(node.state)}`} key={node.key}>
                    <span className="sw-label">{node.label}</span>
                    <strong>{node.summary}</strong>
                    <span className="customer-route-node-status">{node.state === "problem" ? "Under review" : node.state === "current" ? "Current stage" : node.state === "complete" ? "Complete" : "Waiting"}</span>
                    {index < routeNodes.length - 1 ? (
                      <span className="customer-route-arrow" aria-hidden="true">
                        <ShipWrightIcon name="route" />
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="customer-tracking-stepper">
                {trackingSteps.map((step) => (
                  <div className={`customer-tracking-step customer-tracking-step-${step.state}`} key={step.key}>
                    <span className={`sw-icon-badge ${getStepTone(step.state)}`} aria-hidden="true">
                      <ShipWrightIcon name={getStepIcon(step.state)} />
                    </span>
                    <div>
                      <strong>{step.label}</strong>
                      <span>{step.state === "problem" ? "Needs attention" : step.state === "current" ? "Current stage" : step.state === "complete" ? "Done" : "Waiting"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="sw-operational-surface customer-tracking-panel">
              <div className="sw-card-header">
                <div>
                  <p className="eyebrow">What happens next</p>
                  <h2>{nextStep?.title}</h2>
                  <p className="customer-tracking-note">{nextStep?.copy}</p>
                </div>
                <span className={`sw-badge ${getStatusTone(tracking.payment.status)}`}>{getCustomerPaymentStatusLabel(tracking.payment.status)}</span>
              </div>

              <div className="sw-supporting-surface customer-tracking-support">
                <p className="eyebrow">Need help?</p>
                <p>{getCustomerTrackingSupportCopy(tracking)}</p>
                <div className="sw-action-row">
                  <Link className="sw-button sw-button--secondary button button-secondary" href="/help/pilot-operations">
                    Open help
                  </Link>
                </div>
              </div>

              <dl className="customer-tracking-facts">
                <div>
                  <dt>Order reference</dt>
                  <dd>{tracking.order.id}</dd>
                </div>
                <div>
                  <dt>Restaurant</dt>
                  <dd>{tracking.restaurant.name}</dd>
                </div>
                <div>
                  <dt>Total</dt>
                  <dd>{formatCurrency(tracking.order.totalCents, tracking.order.currency)}</dd>
                </div>
                <div>
                  <dt>Tracking view</dt>
                  <dd>Status and progress</dd>
                </div>
                <div>
                  <dt>Latest tracking update</dt>
                  <dd>{tracking.tracking.latestLocationAt ? formatDateTime(tracking.tracking.latestLocationAt) : "No live location yet"}</dd>
                </div>
                <div>
                  <dt>Dispatch attempts</dt>
                  <dd>{tracking.tracking.dispatchAttemptsCount}</dd>
                </div>
              </dl>

              <div className="customer-success-actions">
                <Link className="sw-button sw-button--secondary button button-secondary" href={buildRestaurantMenuHref(tracking.restaurant.slug)}>
                  Back to menu
                </Link>
              </div>
            </section>
          </div>

          <section className="sw-supporting-surface customer-tracking-timeline">
            <div className="sw-card-header">
              <div>
                <p className="eyebrow">Timeline</p>
                <h2>Order updates</h2>
              </div>
            </div>

            {tracking.tracking.timeline.length === 0 ? (
              <div className="sw-empty-state">
                <strong className="sw-empty-title">No timeline updates yet</strong>
                <p className="sw-empty-copy">The order exists, but no dispatch or delivery events have been recorded yet.</p>
              </div>
            ) : (
              <div className="timeline-table" role="table" aria-label="Tracking timeline">
                {tracking.tracking.timeline.map((item) => (
                  <div className="timeline-table-row" key={item.id} role="row">
                    <div>
                      <strong>{getCustomerTrackingTimelineEntry(item.eventType).title}</strong>
                      <span>{getCustomerTrackingTimelineEntry(item.eventType).summary}</span>
                    </div>
                    <span>{formatDateTime(item.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </main>
  );
}
