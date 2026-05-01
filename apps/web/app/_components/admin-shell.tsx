"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { BrandLogo } from "./brand-logo";
import { ProductUpdateAnnouncement } from "./product-updates";
import { ShipWrightIcon, type ShipWrightIconName } from "./shipwright-icon";
import { AdminWorkspaceLink } from "./workspace-nav";
import { useBusinessAuth } from "./business-auth-provider";
import { getAdminOverview, listAdminJobs, listAdminOrders, listAdminOutbox } from "../_lib/api";
import { formatCurrency, formatDateTime, type AdminInterventionItem, type AdminJobSummary, type AdminOrderSummary, type AdminOutboxItem } from "../_lib/product-state";
import {
  canOpenOrgConsole,
  type AdminInterventionFilter,
  type AdminOutboxFilter,
  type AdminProofSummary,
  filterAdminInterventions,
  filterAdminOutbox,
  formatAdminShortId,
  formatInterventionSeverityLabel,
  formatOutboxEventLabel,
  getAdminCommandState,
  getOutboxBucket,
  getOutboxTone,
  summarizeInterventionDetail,
  summarizeOutboxDetail
} from "../_lib/admin-state";
import { formatNotificationTimeAgo } from "../_lib/notification-mapper";
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

function FilterChip(props: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`mode-chip orders-filter-chip admin-filter-chip ${props.active ? "mode-chip-active orders-filter-chip-active admin-filter-chip-active" : ""}`}
      onClick={props.onClick}
      type="button"
    >
      <strong>{props.label}</strong>
      <span>{props.count}</span>
    </button>
  );
}

function ToggleButton(props: { expanded: boolean; onClick: () => void }) {
  return (
    <button className="sw-button sw-button--ghost button button-secondary admin-row-toggle" onClick={props.onClick} type="button">
      <ShipWrightIcon name={props.expanded ? "timeline" : "arrow"} />
      <span>{props.expanded ? "Hide detail" : "Show detail"}</span>
    </button>
  );
}

export function AdminShell(props: { latestProof: AdminProofSummary | null }) {
  const router = useRouter();
  const { status, session, error, refreshBusinessSession, signOut } = useBusinessAuth();
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof getAdminOverview>> | null>(null);
  const [jobs, setJobs] = useState<AdminJobSummary[]>([]);
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [outbox, setOutbox] = useState<AdminOutboxItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [interventionFilter, setInterventionFilter] = useState<AdminInterventionFilter>("all");
  const [outboxFilter, setOutboxFilter] = useState<AdminOutboxFilter>("all");
  const [expandedInterventions, setExpandedInterventions] = useState<Record<string, boolean>>({});
  const [expandedJobs, setExpandedJobs] = useState<Record<string, boolean>>({});
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [expandedOutbox, setExpandedOutbox] = useState<Record<string, boolean>>({});

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
  const filteredInterventions = useMemo(
    () => filterAdminInterventions(overview?.interventionQueue ?? [], interventionFilter),
    [interventionFilter, overview]
  );
  const filteredOutbox = useMemo(() => filterAdminOutbox(outbox, outboxFilter), [outbox, outboxFilter]);
  const recentSkippedNotifications = useMemo(
    () => outbox.filter((item) => getOutboxBucket(item) === "skipped").length,
    [outbox]
  );
  const latestProofLabel = props.latestProof
    ? `${formatNotificationTimeAgo(props.latestProof.timestamp)} · ${props.latestProof.fileName}`
    : null;

  function toggleExpanded(
    setter: Dispatch<SetStateAction<Record<string, boolean>>>,
    key: string
  ) {
    setter((current) => ({ ...current, [key]: !current[key] }));
  }

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
      <div className="sw-row-between admin-shell-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Platform control plane</p>
          <h1>Admin Control Plane</h1>
          <p>Cross-org oversight for pilot support, intervention, and release confidence.</p>
        </div>
        <div className="hero-actions">
          <AdminWorkspaceLink />
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/updates">
            What’s new
          </Link>
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

      <ProductUpdateAnnouncement routePath="/admin" viewer="platform_admin" viewerKey={session.userId} />

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
          <div className="sw-row admin-command-copy">
            <span className={`sw-icon-badge admin-command-icon admin-command-icon-${commandState.tone}`} aria-hidden="true">
              <ShipWrightIcon name={toneToIcon(commandState.tone)} />
            </span>
            <div>
              <p className="eyebrow">Command summary</p>
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
          <div className="sw-card-header admin-section-header">
            <div>
              <p className="eyebrow">Intervention queue</p>
              <h2>Needs review</h2>
            </div>
            <span className="status-badge status-negative">{overview?.interventionQueue.length ?? 0} open</span>
          </div>
          <div className="admin-filter-bar" role="tablist" aria-label="Intervention filters">
            <FilterChip active={interventionFilter === "all"} count={overview?.interventionQueue.length ?? 0} label="All" onClick={() => setInterventionFilter("all")} />
            <FilterChip active={interventionFilter === "dispatch"} count={filterAdminInterventions(overview?.interventionQueue ?? [], "dispatch").length} label="Dispatch" onClick={() => setInterventionFilter("dispatch")} />
            <FilterChip active={interventionFilter === "payment"} count={filterAdminInterventions(overview?.interventionQueue ?? [], "payment").length} label="Payment" onClick={() => setInterventionFilter("payment")} />
            <FilterChip active={interventionFilter === "notification"} count={filterAdminInterventions(overview?.interventionQueue ?? [], "notification").length} label="Notification" onClick={() => setInterventionFilter("notification")} />
            <FilterChip active={interventionFilter === "stuck"} count={filterAdminInterventions(overview?.interventionQueue ?? [], "stuck").length} label="Stuck" onClick={() => setInterventionFilter("stuck")} />
          </div>
          {filteredInterventions.length ? (
            <div className="admin-list">
              {filteredInterventions.map((item: AdminInterventionItem) => {
                const canOpen = canOpenOrgConsole(session, item.orgId);
                const expanded = Boolean(expandedInterventions[item.id]);
                return (
                  <article className={`sw-queue-row sw-admin-row admin-intervention-row admin-intervention-row-${item.severity}`} key={item.id}>
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
                      {expanded ? (
                        <div className="sw-supporting-surface admin-detail-panel">
                          <div className="admin-fact-grid admin-detail-grid">
                            <div>
                              <span>Diagnosis</span>
                              <strong>{summarizeInterventionDetail(item)}</strong>
                            </div>
                            <div>
                              <span>Entity</span>
                              <strong>{item.entityType} {formatAdminShortId(item.entityId)}</strong>
                            </div>
                            <div>
                              <span>Created</span>
                              <strong>{formatDateTime(item.createdAt)}</strong>
                            </div>
                            <div>
                              <span>IDs</span>
                              <strong>{item.jobId ? `Job ${formatAdminShortId(item.jobId)}` : item.orderId ? `Order ${formatAdminShortId(item.orderId)}` : "Review admin queue"}</strong>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className="sw-queue-row-actions admin-row-actions">
                      <span className="admin-inline-note">{formatDateTime(item.createdAt)}</span>
                      <ToggleButton expanded={expanded} onClick={() => toggleExpanded(setExpandedInterventions, item.id)} />
                      {item.jobId ? <SafeOrgLink canOpen={canOpen} href={`/app/jobs/${item.jobId}`} label="Open job" /> : null}
                      {item.orderId ? <SafeOrgLink canOpen={canOpen} href={`/app/orders/${item.orderId}`} label="Open order" /> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={interventionFilter === "payment" ? "payment" : interventionFilter === "notification" ? "timeline" : "check"}
              title={
                interventionFilter === "all"
                  ? "No interventions right now"
                  : interventionFilter === "payment"
                    ? "No payment issues"
                    : interventionFilter === "notification"
                      ? "No notification issues"
                      : interventionFilter === "dispatch"
                        ? "No dispatch blockers"
                        : "No stuck jobs"
              }
              body="Platform-level blockers will surface here as soon as dispatch, payment, notification, or timing signals degrade."
            />
          )}
        </section>

        <section className="sw-operational-surface admin-section" id="system-health">
          <div className="sw-card-header admin-section-header">
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
                <span className="sw-metric-label">Outbox pressure</span>
                <strong className="sw-metric-value">{overview.health.outboxFailedCount + overview.health.outboxRetryingCount}</strong>
                <p className="sw-metric-copy">
                  {overview.health.outboxFailedCount} failed and {overview.health.outboxRetryingCount} retrying worker messages.
                </p>
              </article>
              <article className="sw-metric-card admin-health-card">
                <span className="sw-metric-label">Skipped notifications</span>
                <strong className="sw-metric-value">{overview.health.notificationIssueCount}</strong>
                <p className="sw-metric-copy">External notification skips recorded in the last 24 hours.</p>
              </article>
              <article className="sw-metric-card admin-health-card">
                <span className="sw-metric-label">Latest release proof</span>
                <strong className="sw-metric-value">
                  {props.latestProof?.readyzOk ? "Ready" : props.latestProof ? "Recorded" : "Unavailable"}
                </strong>
                <p className="sw-metric-copy">
                  {latestProofLabel ?? "No archived release verification artifact is available in docs/proofs yet."}
                </p>
                {props.latestProof?.apiBaseUrl ? (
                  <span className="admin-inline-note">Target {props.latestProof.apiBaseUrl}</span>
                ) : null}
              </article>
            </div>
          ) : null}
        </section>
      </div>

      <section className="sw-operational-surface admin-section" id="active-operations">
        <div className="sw-card-header admin-section-header">
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
              const expanded = Boolean(expandedJobs[job.id]);
              return (
                <article className="sw-queue-row sw-admin-row admin-ops-row" key={job.id}>
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
                    {expanded ? (
                      <div className="sw-supporting-surface admin-detail-panel">
                        <div className="admin-fact-grid admin-detail-grid">
                          <div>
                            <span>Attention</span>
                            <strong>{job.attentionReason ?? "No current operator warning."}</strong>
                          </div>
                          <div>
                            <span>Vehicle</span>
                            <strong>{job.vehicleRequired}</strong>
                          </div>
                          <div>
                            <span>Updated</span>
                            <strong>{formatDateTime(job.updatedAt)}</strong>
                          </div>
                          <div>
                            <span>Payment ID</span>
                            <strong>{job.paymentId ? formatAdminShortId(job.paymentId) : "Unlinked"}</strong>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="sw-queue-row-actions admin-row-actions">
                    <span className="admin-inline-note">ETA {job.etaMinutes} min</span>
                    <ToggleButton expanded={expanded} onClick={() => toggleExpanded(setExpandedJobs, job.id)} />
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
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Paid orders</p>
            <h2>Paid customer demand</h2>
          </div>
          <span className="status-badge status-neutral">{orders.length} visible</span>
        </div>
        {orders.length ? (
          <div className="admin-list">
            {orders.map((order) => {
              const canOpen = canOpenOrgConsole(session, order.orgId);
              const expanded = Boolean(expandedOrders[order.id]);
              return (
                <article className="sw-queue-row sw-admin-row admin-order-row" key={order.id}>
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
                    {expanded ? (
                      <div className="sw-supporting-surface admin-detail-panel">
                        <div className="admin-fact-grid admin-detail-grid">
                          <div>
                            <span>Customer</span>
                            <strong>{order.customerEmail}</strong>
                          </div>
                          <div>
                            <span>Phone</span>
                            <strong>{order.customerPhone}</strong>
                          </div>
                          <div>
                            <span>Payment ID</span>
                            <strong>{formatAdminShortId(order.paymentId)}</strong>
                          </div>
                          <div>
                            <span>Updated</span>
                            <strong>{formatDateTime(order.updatedAt)}</strong>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="sw-queue-row-actions admin-row-actions">
                    <span className="admin-inline-note">{formatDateTime(order.createdAt)}</span>
                    <ToggleButton expanded={expanded} onClick={() => toggleExpanded(setExpandedOrders, order.id)} />
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
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Worker / outbox health</p>
            <h2>Worker pressure and retries</h2>
          </div>
          <span className="status-badge status-neutral">{outbox.length} visible</span>
        </div>
        <div className="admin-filter-bar" role="tablist" aria-label="Outbox filters">
          <FilterChip active={outboxFilter === "all"} count={outbox.length} label="All" onClick={() => setOutboxFilter("all")} />
          <FilterChip active={outboxFilter === "failed"} count={filterAdminOutbox(outbox, "failed").length} label="Failed" onClick={() => setOutboxFilter("failed")} />
          <FilterChip active={outboxFilter === "retrying"} count={filterAdminOutbox(outbox, "retrying").length} label="Retrying" onClick={() => setOutboxFilter("retrying")} />
          <FilterChip active={outboxFilter === "skipped"} count={filterAdminOutbox(outbox, "skipped").length} label="Skipped" onClick={() => setOutboxFilter("skipped")} />
          <FilterChip active={outboxFilter === "processed_recent"} count={filterAdminOutbox(outbox, "processed_recent").length} label="Processed recent" onClick={() => setOutboxFilter("processed_recent")} />
        </div>
        {filteredOutbox.length ? (
          <div className="admin-list">
            {filteredOutbox.map((item) => {
              const tone = getOutboxTone(item);
              const expanded = Boolean(expandedOutbox[item.id]);
              return (
                <article className={`sw-queue-row sw-admin-row admin-outbox-row admin-outbox-row-${tone}`} key={item.id}>
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
                    {expanded ? (
                      <div className="sw-supporting-surface admin-detail-panel">
                        <div className="admin-fact-grid admin-detail-grid">
                          <div>
                            <span>Diagnosis</span>
                            <strong>{summarizeOutboxDetail(item)}</strong>
                          </div>
                          <div>
                            <span>Status</span>
                            <strong>{getOutboxBucket(item).replace(/_/g, " ")}</strong>
                          </div>
                          <div>
                            <span>Created</span>
                            <strong>{formatDateTime(item.createdAt)}</strong>
                          </div>
                          <div>
                            <span>Processed</span>
                            <strong>{item.processedAt ? formatDateTime(item.processedAt) : "Pending"}</strong>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="sw-queue-row-actions admin-row-actions">
                    <span className="admin-inline-note">{item.processedAt ? `Processed ${formatDateTime(item.processedAt)}` : `Next attempt ${formatDateTime(item.nextAttemptAt)}`}</span>
                    <ToggleButton expanded={expanded} onClick={() => toggleExpanded(setExpandedOutbox, item.id)} />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={outboxFilter === "failed" ? "alert" : outboxFilter === "retrying" ? "warning" : "check"}
            title={
              outboxFilter === "failed"
                ? "No failed outbox messages"
                : outboxFilter === "retrying"
                  ? "No retrying outbox messages"
                  : outboxFilter === "skipped"
                    ? "No skipped notification events"
                    : "Outbox queue is clear"
            }
            body="Worker backlog, failed events, and notification processing signals will appear here when background operations need review."
          />
        )}
        {overview ? (
          <div className="admin-inline-summary">
            <span className="admin-inline-note">
              Recent skipped external notifications: {recentSkippedNotifications || overview.health.notificationIssueCount}
            </span>
            <span className="admin-inline-note">
              Payment capture pending: {overview.health.paymentCapturePendingCount}
            </span>
          </div>
        ) : null}
      </section>
    </main>
  );
}
