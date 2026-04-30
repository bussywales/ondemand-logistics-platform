"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { ShipWrightIcon, type ShipWrightIconName } from "./shipwright-icon";
import { AdminWorkspaceLink } from "./workspace-nav";
import { useBusinessAuth } from "./business-auth-provider";
import { getAdminOverview, listAdminJobs, listAdminOrders, listAdminOutbox } from "../_lib/api";
import { formatCurrency, formatDateTime, type AdminInterventionItem, type AdminJobSummary, type AdminOrderSummary, type AdminOutboxItem } from "../_lib/product-state";
import { canOpenOrgConsole, formatAdminShortId, formatInterventionSeverityLabel, formatOutboxEventLabel, getAdminCommandState, getOutboxTone } from "../_lib/admin-state";
import { buildAuthRedirectTarget } from "../_lib/route-protection";

function toneToClass(value: "danger" | "warning" | "info" | "success") {
  if (value === "danger") {
    return "status-negative";
  }

  if (value === "warning") {
    return "status-live";
  }

  if (value === "success") {
    return "status-positive";
  }

  return "status-neutral";
}

function toneToIcon(value: "danger" | "warning" | "info" | "success"): ShipWrightIconName {
  if (value === "danger") {
    return "alert";
  }

  if (value === "warning") {
    return "warning";
  }

  if (value === "success") {
    return "check";
  }

  return "queue";
}

function statusTone(value: string) {
  if (["DISPATCH_FAILED", "FAILED", "PAYMENT_FAILED", "CANCELLED"].includes(value)) {
    return "status-negative";
  }

  if (["FULFILLED", "DELIVERED", "CAPTURED"].includes(value)) {
    return "status-positive";
  }

  if (["AUTHORIZED", "PAYMENT_AUTHORIZED", "ASSIGNED", "EN_ROUTE_PICKUP", "PICKED_UP", "EN_ROUTE_DROP", "REQUESTED"].includes(value)) {
    return "status-live";
  }

  return "status-neutral";
}

function statusIcon(value: string): ShipWrightIconName {
  if (["DISPATCH_FAILED", "FAILED", "PAYMENT_FAILED", "CANCELLED"].includes(value)) {
    return "alert";
  }

  if (["FULFILLED", "DELIVERED", "CAPTURED"].includes(value)) {
    return "check";
  }

  if (["AUTHORIZED", "PAYMENT_AUTHORIZED"].includes(value)) {
    return "payment";
  }

  if (["ASSIGNED", "EN_ROUTE_PICKUP", "PICKED_UP", "EN_ROUTE_DROP", "REQUESTED"].includes(value)) {
    return "route";
  }

  return "queue";
}

function StatusBadge(props: { value: string }) {
  return (
    <span className={`status-badge status-with-icon ${statusTone(props.value)}`}>
      <ShipWrightIcon name={statusIcon(props.value)} />
      <span>{props.value.replace(/_/g, " ")}</span>
    </span>
  );
}

function EmptyState(props: { icon: ShipWrightIconName; title: string; body: string }) {
  return (
    <div className="sw-empty-state admin-empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        <ShipWrightIcon name={props.icon} />
      </span>
      <strong className="sw-empty-title">{props.title}</strong>
      <p className="sw-empty-copy">{props.body}</p>
    </div>
  );
}

function SafeOrgLink(props: { href: string; label: string; canOpen: boolean }) {
  if (!props.canOpen) {
    return <span className="admin-inline-note">Cross-org detail remains in the admin queue for this session.</span>;
  }

  return (
    <Link className="sw-button sw-button--secondary button button-secondary" href={props.href}>
      <ShipWrightIcon name="arrow" />
      <span>{props.label}</span>
    </Link>
  );
}

export function AdminShell() {
  const router = useRouter();
  const { status, session, error, refreshBusinessSession, signOut } = useBusinessAuth();
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof getAdminOverview>> | null>(null);
  const [jobs, setJobs] = useState<AdminJobSummary[]>([]);
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [outbox, setOutbox] = useState<AdminOutboxItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(buildAuthRedirectTarget({ pathname: "/admin" }));
    }
  }, [router, status]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.context.platformAdmin) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setLoadError(null);

    void Promise.all([
      getAdminOverview(session),
      listAdminJobs(session),
      listAdminOrders(session),
      listAdminOutbox(session)
    ])
      .then(([nextOverview, nextJobs, nextOrders, nextOutbox]) => {
        if (!active) {
          return;
        }

        setOverview(nextOverview);
        setJobs(nextJobs);
        setOrders(nextOrders);
        setOutbox(nextOutbox);
      })
      .catch((issue) => {
        if (!active) {
          return;
        }

        setLoadError(issue instanceof Error ? issue.message : "Unable to load the admin control plane.");
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

  const commandState = useMemo(() => (overview ? getAdminCommandState(overview) : null), [overview]);

  if (status === "loading" || loading) {
    return (
      <main className="app-shell loading-shell">
        <section className="ops-empty-state">
          <strong>Restoring control plane</strong>
          <p>Checking the authenticated session and loading platform operations.</p>
        </section>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="app-shell loading-shell">
        <section className="ops-empty-state">
          <p className="eyebrow">Session issue</p>
          <h1>Platform session could not be restored.</h1>
          <p>{error ?? "Retry the session restore or sign out and start again."}</p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={() => void refreshBusinessSession()} type="button">
              Retry Session
            </button>
            <button
              className="button button-secondary"
              onClick={() => {
                void signOut().then(() => router.replace("/get-started"));
              }}
              type="button"
            >
              Sign Out
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (status !== "authenticated") {
    return null;
  }

  if (!session?.context.platformAdmin) {
    return (
      <main className="app-shell loading-shell">
        <section className="ops-empty-state">
          <p className="eyebrow">Platform admin required</p>
          <h1>Control plane access is restricted.</h1>
          <p>Sign in with a seeded `PLATFORM_ADMIN` account to access cross-org oversight and intervention queues.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell admin-shell-page">
      <div className="admin-shell-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Platform control plane</p>
          <h1>Admin Control Plane</h1>
          <p>Cross-org oversight for pilot support, intervention, and release confidence.</p>
        </div>
        <div className="hero-actions">
          <AdminWorkspaceLink />
          <button className="button button-secondary" onClick={() => void refreshBusinessSession()} type="button">
            Refresh
          </button>
          <button
            className="button button-primary"
            onClick={() => {
              void signOut().then(() => router.replace("/get-started"));
            }}
            type="button"
          >
            Sign Out
          </button>
        </div>
      </div>

      {loadError ? (
        <section className="sw-empty-state admin-empty-state admin-empty-state-danger">
          <span className="empty-state-icon" aria-hidden="true">
            <ShipWrightIcon name="alert" />
          </span>
          <strong className="sw-empty-title">Unable to load admin operations</strong>
          <p className="sw-empty-copy">{loadError}</p>
        </section>
      ) : null}

      {overview && commandState ? (
        <section className={`sw-command-surface admin-command-surface ${commandState.tone === "warning" ? "sw-command-surface--warning" : ""}`}>
          <div className="admin-command-copy">
            <span className={`sw-icon-badge admin-command-icon admin-command-icon-${commandState.tone}`} aria-hidden="true">
              <ShipWrightIcon name={toneToIcon(commandState.tone)} />
            </span>
            <div>
              <p className="eyebrow">Platform posture</p>
              <h2>{commandState.title}</h2>
              <p>{commandState.body}</p>
            </div>
          </div>
          <div className="admin-command-metrics">
            <article className="sw-metric-card admin-metric-card">
              <span className="sw-metric-label">Interventions</span>
              <strong className="sw-metric-value">{overview.interventionQueue.length}</strong>
              <p className="sw-metric-copy">Dispatch, payment, and notification issues needing review.</p>
            </article>
            <article className="sw-metric-card admin-metric-card">
              <span className="sw-metric-label">Active jobs</span>
              <strong className="sw-metric-value">{overview.activeJobs.length}</strong>
              <p className="sw-metric-copy">Cross-org live deliveries currently in motion or blocked.</p>
            </article>
            <article className="sw-metric-card admin-metric-card">
              <span className="sw-metric-label">Outbox backlog</span>
              <strong className="sw-metric-value">{overview.health.outboxBacklogCount}</strong>
              <p className="sw-metric-copy">Queued messages still waiting for worker processing.</p>
            </article>
          </div>
        </section>
      ) : null}

      <div className="admin-grid">
        <section className="sw-operational-surface admin-section" id="intervention-queue">
          <div className="admin-section-header">
            <div>
              <p className="eyebrow">Intervention queue</p>
              <h2>Needs review</h2>
            </div>
            <span className="status-badge status-negative">{overview?.interventionQueue.length ?? 0} open</span>
          </div>
          {overview?.interventionQueue.length ? (
            <div className="admin-list">
              {overview.interventionQueue.map((item: AdminInterventionItem) => {
                const canOpen = canOpenOrgConsole(session, item.orgId);
                return (
                  <article className={`sw-queue-row admin-intervention-row admin-intervention-row-${item.severity}`} key={item.id}>
                    <div className="sw-queue-row-main">
                      <div className="admin-row-title">
                        <span className={`sw-icon-badge admin-row-icon admin-row-icon-${item.severity}`} aria-hidden="true">
                          <ShipWrightIcon name={item.entityType === "job" ? "route" : item.entityType === "order" ? "document" : "alert"} />
                        </span>
                        <div>
                          <div className="admin-row-meta">
                            <span className={`status-badge ${toneToClass(item.severity)}`}>{formatInterventionSeverityLabel(item.severity)}</span>
                            <span>{item.orgName ?? "Unknown org"}</span>
                            {item.restaurantName ? <span>{item.restaurantName}</span> : null}
                          </div>
                          <h3>{item.title}</h3>
                          <p>{item.summary}</p>
                        </div>
                      </div>
                    </div>
                    <div className="sw-queue-row-actions admin-row-actions">
                      <span className="admin-inline-note">{formatDateTime(item.createdAt)}</span>
                      {item.jobId ? <SafeOrgLink canOpen={canOpen} href={`/app/jobs/${item.jobId}`} label="Open job" /> : null}
                      {item.orderId ? <SafeOrgLink canOpen={canOpen} href={`/app/orders/${item.orderId}`} label="Open order" /> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState icon="check" title="No intervention queue items" body="Dispatch failures, stuck jobs, payment blockers, and notification skips will surface here." />
          )}
        </section>

        <section className="sw-operational-surface admin-section" id="system-health">
          <div className="admin-section-header">
            <div>
              <p className="eyebrow">System health</p>
              <h2>Release posture</h2>
            </div>
          </div>
          {overview ? (
            <div className="admin-health-grid">
              <article className="sw-metric-card admin-health-card">
                <span className="sw-metric-label">Healthz</span>
                <strong className="sw-metric-value">{overview.health.liveness.status.toUpperCase()}</strong>
                <p className="sw-metric-copy">Liveness probe for the staging API process.</p>
              </article>
              <article className="sw-metric-card admin-health-card">
                <span className="sw-metric-label">Readyz</span>
                <strong className={`sw-metric-value ${overview.health.readiness.status === "ok" ? "admin-copy-success" : "admin-copy-danger"}`}>
                  {overview.health.readiness.status.toUpperCase()}
                </strong>
                <p className="sw-metric-copy">{overview.health.readiness.message ?? "Critical schema compatibility checks are currently passing."}</p>
              </article>
              <article className="sw-metric-card admin-health-card">
                <span className="sw-metric-label">Retrying outbox</span>
                <strong className="sw-metric-value">{overview.health.outboxRetryingCount}</strong>
                <p className="sw-metric-copy">Messages actively retrying inside the worker loop.</p>
              </article>
              <article className="sw-metric-card admin-health-card">
                <span className="sw-metric-label">Notification issues</span>
                <strong className="sw-metric-value">{overview.health.notificationIssueCount}</strong>
                <p className="sw-metric-copy">External notification skips recorded in the last 24 hours.</p>
              </article>
            </div>
          ) : null}
        </section>
      </div>

      <section className="sw-operational-surface admin-section" id="active-operations">
        <div className="admin-section-header">
          <div>
            <p className="eyebrow">Active operations</p>
            <h2>Live jobs across orgs</h2>
          </div>
          <span className="status-badge status-live">{jobs.length} visible</span>
        </div>
        {jobs.length ? (
          <div className="admin-list">
            {jobs.map((job) => {
              const canOpen = canOpenOrgConsole(session, job.orgId);
              return (
                <article className="sw-queue-row admin-ops-row" key={job.id}>
                  <div className="sw-queue-row-main">
                    <div className="admin-row-title">
                      <span className="sw-icon-badge admin-row-icon admin-row-icon-info" aria-hidden="true">
                        <ShipWrightIcon name="route" />
                      </span>
                      <div>
                        <div className="admin-row-meta">
                          <span>Job {formatAdminShortId(job.id)}</span>
                          {job.orgName ? <span>{job.orgName}</span> : null}
                          {job.restaurantName ? <span>{job.restaurantName}</span> : null}
                        </div>
                        <h3>{job.pickupAddress}</h3>
                        <p>{job.dropoffAddress}</p>
                      </div>
                    </div>
                    <div className="admin-fact-grid">
                      <div>
                        <span>Status</span>
                        <StatusBadge value={job.status} />
                      </div>
                      <div>
                        <span>Payment</span>
                        <StatusBadge value={job.paymentStatus ?? "UNLINKED"} />
                      </div>
                      <div>
                        <span>Driver</span>
                        <strong>{job.driverName ?? "Unassigned"}</strong>
                      </div>
                      <div>
                        <span>Total</span>
                        <strong>{formatCurrency(job.totalCents, job.currency)}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="sw-queue-row-actions admin-row-actions">
                    <span className="admin-inline-note">ETA {job.etaMinutes} min</span>
                    <SafeOrgLink canOpen={canOpen} href={`/app/jobs/${job.id}`} label="Open job" />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState icon="queue" title="No active jobs" body="Live jobs across tenant orgs will appear here when dispatch and delivery work is in progress." />
        )}
      </section>

      <section className="sw-operational-surface admin-section" id="recent-orders">
        <div className="admin-section-header">
          <div>
            <p className="eyebrow">Recent orders</p>
            <h2>Paid customer demand</h2>
          </div>
          <span className="status-badge status-neutral">{orders.length} visible</span>
        </div>
        {orders.length ? (
          <div className="admin-list">
            {orders.map((order) => {
              const canOpen = canOpenOrgConsole(session, order.orgId);
              return (
                <article className="sw-queue-row admin-order-row" key={order.id}>
                  <div className="sw-queue-row-main">
                    <div className="admin-row-title">
                      <span className="sw-icon-badge admin-row-icon admin-row-icon-success" aria-hidden="true">
                        <ShipWrightIcon name="document" />
                      </span>
                      <div>
                        <div className="admin-row-meta">
                          <span>Order {formatAdminShortId(order.id)}</span>
                          <span>{order.orgName}</span>
                          <span>{order.restaurantName}</span>
                        </div>
                        <h3>{order.customerName}</h3>
                        <p>{order.deliveryAddressSummary}</p>
                      </div>
                    </div>
                    <div className="admin-fact-grid">
                      <div>
                        <span>Fulfilment</span>
                        <StatusBadge value={order.status} />
                      </div>
                      <div>
                        <span>Payment</span>
                        <StatusBadge value={order.paymentStatus} />
                      </div>
                      <div>
                        <span>Delivery</span>
                        <StatusBadge value={order.jobStatus} />
                      </div>
                      <div>
                        <span>Total</span>
                        <strong>{formatCurrency(order.totalCents, order.currency)}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="sw-queue-row-actions admin-row-actions">
                    <span className="admin-inline-note">{formatDateTime(order.createdAt)}</span>
                    <SafeOrgLink canOpen={canOpen} href={`/app/orders/${order.id}`} label="Open order" />
                    <SafeOrgLink canOpen={canOpen} href={`/app/jobs/${order.jobId}`} label="Open job" />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState icon="document" title="No recent orders" body="Public checkout demand will appear here after orders enter the delivery lifecycle." />
        )}
      </section>

      <section className="sw-operational-surface admin-section" id="outbox-monitor">
        <div className="admin-section-header">
          <div>
            <p className="eyebrow">Outbox monitor</p>
            <h2>Worker pressure and retries</h2>
          </div>
          <span className="status-badge status-neutral">{outbox.length} visible</span>
        </div>
        {outbox.length ? (
          <div className="admin-list">
            {outbox.map((item) => {
              const tone = getOutboxTone(item);
              return (
                <article className={`sw-queue-row admin-outbox-row admin-outbox-row-${tone}`} key={item.id}>
                  <div className="sw-queue-row-main">
                    <div className="admin-row-title">
                      <span className={`sw-icon-badge admin-row-icon admin-row-icon-${tone}`} aria-hidden="true">
                        <ShipWrightIcon name={tone === "danger" ? "alert" : tone === "warning" ? "warning" : "queue"} />
                      </span>
                      <div>
                        <div className="admin-row-meta">
                          <span>{item.aggregateType}</span>
                          <span>{formatAdminShortId(item.aggregateId)}</span>
                          <span>Retry {item.retryCount}</span>
                        </div>
                        <h3>{formatOutboxEventLabel(item.eventType)}</h3>
                        <p>{item.lastError ?? "Queued or processed without a recorded error."}</p>
                      </div>
                    </div>
                  </div>
                  <div className="sw-queue-row-actions admin-row-actions">
                    <span className="admin-inline-note">Next attempt {formatDateTime(item.nextAttemptAt)}</span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState icon="check" title="Outbox queue is clear" body="Retrying and failed worker messages will surface here when background delivery processing needs review." />
        )}
      </section>
    </main>
  );
}
