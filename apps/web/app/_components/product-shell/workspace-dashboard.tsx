import Link from "next/link";
import { ShipWrightIcon } from "../shipwright-icon";
import { formatCurrency, formatDateTime, type AppJob, type BusinessCustomerOrder, type DailyBriefing } from "../../_lib/product-state";
import { getDispatchIntelligence, getJobShortId } from "../../_lib/dispatch-intelligence";
import { DailyBriefingSurface } from "./daily-briefing-surface";
import {
  attentionTone,
  formatStatusLabel,
  orderStatusTone,
  QueueEmptyState,
  queueStateCopy,
  SectionTitle,
  severityIconName,
  severityTone,
  statusIconName,
  statusTone,
  summarizeDriver
} from "./shared";

type ReviewQueueItem = {
  job: AppJob;
  intelligence: ReturnType<typeof getDispatchIntelligence>;
};

type WorkspaceSummary = {
  orgName: string;
  activeJobs: number;
  completedToday: number;
  totalJobs: number;
};

type WorkspaceDashboardProps = {
  actionSubmitting: boolean;
  activeJobs: AppJob[];
  attentionJobs: ReviewQueueItem[];
  briefing: DailyBriefing | null;
  briefingError: string | null;
  onRefresh: () => void;
  onRetryDispatch: (job: AppJob) => void;
  recentOrders: BusinessCustomerOrder[];
  workspaceSummary: WorkspaceSummary;
};

export function WorkspaceCommandSummary(props: {
  activeJobsCount: number;
  attentionCount: number;
  onRefresh: () => void;
}) {
  const hasAttention = props.attentionCount > 0;

  return (
    <section
      className={`sw-command-surface ${hasAttention ? "sw-command-surface--warning" : ""} ops-command-strip ${
        hasAttention ? "ops-command-strip-alert" : ""
      }`}
      aria-label="Workspace command state"
    >
      <div className="ops-command-copy">
        <span className="ops-command-icon" aria-hidden="true">
          <ShipWrightIcon name={hasAttention ? "warning" : "check"} />
        </span>
        <div>
          <p className="eyebrow">Workspace state</p>
          <h2>{hasAttention ? "Review required" : "System clear"}</h2>
          <p>
            {hasAttention
              ? `${props.attentionCount} job${props.attentionCount === 1 ? "" : "s"} need operator action. ${
                  props.activeJobsCount > 0
                    ? `${props.activeJobsCount} active ${props.activeJobsCount === 1 ? "delivery is" : "deliveries are"} moving.`
                    : "No active deliveries are moving right now."
                }`
              : props.activeJobsCount > 0
                ? `${props.activeJobsCount} active ${props.activeJobsCount === 1 ? "delivery is" : "deliveries are"} moving without blocker signals.`
                : "No active deliveries are moving right now."}
          </p>
        </div>
      </div>
      <div className="ops-command-actions">
        <Link className="sw-button sw-button--primary button button-primary" href="/app/jobs">
          <ShipWrightIcon name="queue" />
          <span>Open jobs</span>
        </Link>
        <button className="sw-button sw-button--secondary button button-secondary" onClick={props.onRefresh} type="button">
          <ShipWrightIcon name="retry" />
          <span>Refresh</span>
        </button>
      </div>
    </section>
  );
}

export function MetricSignalGrid(props: { attentionCount: number; workspaceSummary: WorkspaceSummary }) {
  const { workspaceSummary } = props;

  return (
    <section className="ops-metric-grid" aria-label="Operations metrics">
      <div className="sw-metric-card sw-operational-surface ops-metric-card ops-metric-card-active">
        <span className="sw-metric-icon sw-icon-badge sw-icon-badge--info metric-icon metric-icon-teal" aria-hidden="true">
          <ShipWrightIcon name="queue" />
        </span>
        <span className="sw-metric-label metric-label">Active jobs</span>
        <strong className="sw-metric-value">{workspaceSummary.activeJobs}</strong>
        <p className="sw-metric-copy">Requested, assigned, or moving.</p>
      </div>
      <div
        className={`sw-metric-card sw-operational-surface ops-metric-card ops-metric-card-attention ${
          props.attentionCount > 0 ? "ops-metric-card-alert" : ""
        }`}
      >
        <span className="sw-metric-icon sw-icon-badge sw-icon-badge--warning metric-icon metric-icon-warning" aria-hidden="true">
          <ShipWrightIcon name="warning" />
        </span>
        <span className="sw-metric-label metric-label">Attention needed</span>
        <strong className="sw-metric-value">{props.attentionCount}</strong>
        <p className="sw-metric-copy">Blockers and risks requiring review.</p>
      </div>
      <div className="sw-metric-card sw-operational-surface ops-metric-card ops-metric-card-complete">
        <span className="sw-metric-icon sw-icon-badge sw-icon-badge--success metric-icon metric-icon-success" aria-hidden="true">
          <ShipWrightIcon name="check" />
        </span>
        <span className="sw-metric-label metric-label">Completed today</span>
        <strong className="sw-metric-value">{workspaceSummary.completedToday}</strong>
        <p className="sw-metric-copy">Closed delivery records for this workspace.</p>
      </div>
    </section>
  );
}

function RecentOrdersSurface(props: { recentOrders: BusinessCustomerOrder[] }) {
  return (
    <section className="sw-operational-surface recent-orders-section">
      <div className="sw-card-header">
        <SectionTitle
          eyebrow="Orders"
          icon="document"
          note="Latest paid customer orders entering fulfilment."
          title="Recent customer orders"
        />
        <Link className="sw-button sw-button--secondary button button-secondary" href="/app/orders">
          <ShipWrightIcon name="arrow" />
          <span>Open orders</span>
        </Link>
      </div>

      {props.recentOrders.length === 0 ? (
        <div className="sw-empty-state recent-orders-empty">
          <span className="empty-state-icon" aria-hidden="true">
            <ShipWrightIcon name="document" />
          </span>
          <strong className="sw-empty-title">No customer orders yet</strong>
          <p className="sw-empty-copy">Paid orders from the public restaurant checkout will appear here.</p>
        </div>
      ) : (
        <div className="recent-orders-list">
          {props.recentOrders.map((order) => (
            <Link className="sw-list-row recent-order-row" href={`/app/orders/${order.id}`} key={order.id}>
              <div>
                <span className="sw-label">Order {order.id.slice(0, 8).toUpperCase()}</span>
                <strong>{order.customer.name}</strong>
                <span>{order.restaurant.name}</span>
              </div>
              <span className={`sw-badge ${orderStatusTone(order.status)}`}>
                <ShipWrightIcon name={order.status === "PAYMENT_FAILED" ? "alert" : "payment"} />
                <span>{formatStatusLabel(order.status)}</span>
              </span>
              <strong>{formatCurrency(order.totalCents, order.currency)}</strong>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function ActiveJobsQueue(props: { activeJobs: AppJob[] }) {
  return (
    <section className="sw-operational-surface ops-queue-section">
      <div className="sw-card-header">
        <SectionTitle
          eyebrow="Operations"
          icon="queue"
          note="Live work that is requested, assigned, or moving."
          title="Active queue"
        />
        <div className="ops-header-actions">
          <span className="ops-count-pill">{props.activeJobs.length} active</span>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/app/jobs">
            <ShipWrightIcon name="arrow" />
            <span>Open Jobs</span>
          </Link>
        </div>
      </div>

      {props.activeJobs.length === 0 ? (
        <div className="sw-empty-state ops-queue-empty ops-queue-empty-premium">
          <span className="empty-state-icon" aria-hidden="true">
            <ShipWrightIcon name="queue" />
          </span>
          <strong className="sw-empty-title">{queueStateCopy("active").title}</strong>
          <p className="sw-empty-copy">{queueStateCopy("active").body}</p>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/app/jobs">
            <ShipWrightIcon name="route" />
            <span>Create delivery</span>
          </Link>
        </div>
      ) : (
        <div className="jobs-table" role="table" aria-label="Active jobs">
          <div className="jobs-table-head" role="row">
            <span>Job</span>
            <span>Status</span>
            <span>Route</span>
            <span>Driver</span>
            <span>ETA</span>
            <span>Action</span>
          </div>
          {props.activeJobs.map((item) => (
            <Link className="sw-list-row jobs-table-row" href={`/app/jobs/${item.id}`} key={item.id} role="row">
              <div className="jobs-cell jobs-cell-id">
                <strong>{item.id}</strong>
                <span>{formatDateTime(item.createdAt)}</span>
              </div>
              <div className="jobs-cell">
                <span className={`sw-badge ${statusTone(item.status)}`}>
                  <ShipWrightIcon name={statusIconName(item.status)} />
                  <span>{formatStatusLabel(item.status)}</span>
                </span>
              </div>
              <div className="jobs-cell jobs-cell-route">
                <strong>{item.pickupAddress}</strong>
                <span>to {item.dropoffAddress}</span>
              </div>
              <div className="jobs-cell">
                <strong>{summarizeDriver(item)}</strong>
              </div>
              <div className="jobs-cell">
                <strong>{item.etaMinutes} min</strong>
                <span>{item.distanceMiles.toFixed(1)} mi</span>
              </div>
              <div className="jobs-cell jobs-cell-action">
                <span>Track</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function NeedsReviewQueue(props: {
  actionSubmitting: boolean;
  attentionJobs: ReviewQueueItem[];
  onRetryDispatch: (job: AppJob) => void;
}) {
  return (
    <section className="sw-operational-surface ops-queue-section ops-review-section">
      <div className="sw-card-header">
        <SectionTitle
          eyebrow="Attention"
          icon="warning"
          note="Failed dispatches, no-driver states, and delay signals."
          title="Needs review"
        />
        <span className={`ops-count-pill ${props.attentionJobs.length > 0 ? "ops-count-pill-alert" : ""}`}>
          {props.attentionJobs.length} open
        </span>
      </div>

      {props.attentionJobs.length === 0 ? (
        <QueueEmptyState copy={queueStateCopy("attention")} icon="warning" />
      ) : (
        <div className="attention-list">
          {props.attentionJobs.map(({ job, intelligence }) => (
            <article
              className={`sw-queue-row sw-list-row ${
                intelligence.severity === "BLOCKER" ? "sw-queue-row--danger" : "sw-queue-row--warning"
              } attention-row attention-queue-row attention-severity-${intelligence.severity.toLowerCase()}`}
              key={job.id}
            >
              <div className="sw-queue-row-main attention-copy">
                <div className="attention-title-row">
                  <span className={`icon-chip icon-chip-${intelligence.severity.toLowerCase()}`} aria-hidden="true">
                    <ShipWrightIcon name={severityIconName(intelligence.severity)} />
                  </span>
                  <span className={`sw-badge ${severityTone(intelligence.severity)}`}>
                    {intelligence.severity}
                  </span>
                  <strong>{getJobShortId(job.id)}</strong>
                  <span>{formatStatusLabel(job.status)}</span>
                </div>
                <h3>{intelligence.currentIssue}</h3>
                <p className="attention-summary-line">{intelligence.diagnosis} · {intelligence.impact}</p>
                <p className="attention-next-action">
                  <span>Next action</span>
                  <strong>{intelligence.recommendedActionLabel}</strong>
                </p>
              </div>
              <div className="sw-queue-row-actions attention-actions">
                {intelligence.recommendedActionType === "RETRY_DISPATCH" ? (
                  <button
                    className="sw-button sw-button--danger button button-primary"
                    disabled={props.actionSubmitting}
                    onClick={() => props.onRetryDispatch(job)}
                    type="button"
                  >
                    <ShipWrightIcon name="retry" />
                    <span>{props.actionSubmitting ? "Retrying..." : intelligence.recommendedActionLabel}</span>
                  </button>
                ) : null}
                <Link className="sw-button sw-button--secondary button button-secondary" href={`/app/jobs/${job.id}`}>
                  <ShipWrightIcon name="arrow" />
                  <span>View job</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function WorkspaceDashboard(props: WorkspaceDashboardProps) {
  return (
    <section className="sw-stack">
      <WorkspaceCommandSummary
        activeJobsCount={props.activeJobs.length}
        attentionCount={props.attentionJobs.length}
        onRefresh={props.onRefresh}
      />
      <DailyBriefingSurface briefing={props.briefing} error={props.briefingError} />
      <MetricSignalGrid attentionCount={props.attentionJobs.length} workspaceSummary={props.workspaceSummary} />
      <RecentOrdersSurface recentOrders={props.recentOrders} />
      <ActiveJobsQueue activeJobs={props.activeJobs} />
      <NeedsReviewQueue
        actionSubmitting={props.actionSubmitting}
        attentionJobs={props.attentionJobs}
        onRetryDispatch={props.onRetryDispatch}
      />
    </section>
  );
}
