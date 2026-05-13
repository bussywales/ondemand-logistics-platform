import Link from "next/link";
import { ShipWrightIcon } from "../shipwright-icon";
import { formatDateTime, type AppJob } from "../../_lib/product-state";
import { formatStatusLabel, QueueEmptyState, queueStateCopy, SectionTitle, statusIconName, statusTone } from "./shared";

type JobsListViewProps = {
  jobs: AppJob[];
};

export function JobsListView(props: JobsListViewProps) {
  return (
    <section className="sw-operational-surface ops-queue-section">
      <div className="sw-card-header">
        <SectionTitle eyebrow="Jobs" icon="queue" note="Full operational record for this workspace." title="All jobs" />
        <span className="ops-count-pill">{props.jobs.length} shown</span>
      </div>

      {props.jobs.length === 0 ? (
        <QueueEmptyState copy={queueStateCopy("all")} icon="queue" />
      ) : (
        <div className="jobs-table" role="table" aria-label="All jobs">
          <div className="jobs-table-head" role="row">
            <span>Job</span>
            <span>Status</span>
            <span>Pickup</span>
            <span>Drop</span>
            <span>ETA</span>
            <span>Action</span>
          </div>
          {props.jobs.map((item) => (
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
              </div>
              <div className="jobs-cell jobs-cell-route">
                <strong>{item.dropoffAddress}</strong>
              </div>
              <div className="jobs-cell">
                <strong>{item.etaMinutes} min</strong>
                <span>{item.distanceMiles.toFixed(1)} mi</span>
              </div>
              <div className="jobs-cell jobs-cell-action">
                <span>View</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
