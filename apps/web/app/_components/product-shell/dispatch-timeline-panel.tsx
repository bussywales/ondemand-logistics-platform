import type { AppJob } from "../../_lib/product-state";
import { formatDateTime } from "../../_lib/product-state";
import { formatStatusLabel, SectionTitle } from "./shared";
import { ShipWrightIcon } from "../shipwright-icon";

type DispatchTimelinePanelProps = {
  job: AppJob;
};

export function DispatchTimelinePanel(props: DispatchTimelinePanelProps) {
  const { job } = props;

  return (
    <div className="ops-detail-grid">
      <section className="sw-supporting-surface ops-zone ops-dispatch-zone">
        <div className="sw-card-header">
          <SectionTitle eyebrow="Dispatch" icon="retry" title="Attempts" />
        </div>
        {job.tracking.dispatchAttempts.length === 0 ? (
          <div className="sw-empty-state">
            <span className="empty-state-icon" aria-hidden="true">
              <ShipWrightIcon name="retry" />
            </span>
            <strong className="sw-empty-title">No attempts recorded</strong>
            <p className="sw-empty-copy">Dispatch attempts will appear here as the job is offered or retried.</p>
          </div>
        ) : (
          <div className="timeline-table" role="table" aria-label="Dispatch attempts">
            {job.tracking.dispatchAttempts.map((attempt) => (
              <div className="timeline-table-row" key={attempt.id} role="row">
                <div>
                  <strong>
                    Attempt {attempt.attemptNumber} · {attempt.outcome}
                  </strong>
                  <span>
                    {attempt.driverDisplayName ?? attempt.driverId ?? "No driver"} · {attempt.triggerSource}
                  </span>
                </div>
                <span>{formatDateTime(attempt.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="sw-supporting-surface ops-zone ops-timeline-zone">
        <div className="sw-card-header">
          <SectionTitle eyebrow="Timeline" icon="timeline" title="Events" />
        </div>
        {job.tracking.timeline.length === 0 ? (
          <div className="sw-empty-state">
            <span className="empty-state-icon" aria-hidden="true">
              <ShipWrightIcon name="timeline" />
            </span>
            <strong className="sw-empty-title">No events yet</strong>
            <p className="sw-empty-copy">Dispatch and delivery events will appear here as the job progresses.</p>
          </div>
        ) : (
          <div className="timeline-table" role="table" aria-label="Timeline">
            {job.tracking.timeline.map((item) => (
              <div className="timeline-table-row" key={item.id} role="row">
                <div>
                  <strong>{formatStatusLabel(item.eventType)}</strong>
                  <span>{item.summary}</span>
                </div>
                <span>{formatDateTime(item.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
