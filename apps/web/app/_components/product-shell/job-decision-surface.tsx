import { ShipWrightIcon } from "../shipwright-icon";
import type { AppJob } from "../../_lib/product-state";
import { getDispatchIntelligence } from "../../_lib/dispatch-intelligence";
import { attentionTone, formatStatusLabel, severityIconName, statusIconName, statusTone } from "./shared";

type JobDecisionSurfaceProps = {
  actionSubmitting: boolean;
  job: AppJob;
  jobDecision: ReturnType<typeof getDispatchIntelligence> | null;
  onAssignDriver: () => void;
  onRetryDispatch: (job: AppJob) => void;
};

export function JobDecisionSurface(props: JobDecisionSurfaceProps) {
  const { job, jobDecision } = props;

  return (
    <section
      className={`sw-decision-surface ops-section ops-job-hero ops-decision-banner ${
        jobDecision?.severity === "BLOCKER" ? "ops-job-hero-blocker" : ""
      }`}
    >
      <div className="sw-decision-header ops-job-header ops-decision-header">
        <div className="ops-decision-lead">
          <span
            className={`decision-hero-icon decision-hero-icon-${(jobDecision?.severity ?? "INFO").toLowerCase()}`}
            aria-hidden="true"
          >
            <ShipWrightIcon name={severityIconName(jobDecision?.severity ?? "INFO")} />
          </span>
          <div className="sw-decision-copy ops-decision-copy">
            <p className="eyebrow">Decision surface</p>
            <h2 className="sw-decision-title">{jobDecision?.headline ?? "Job detail"}</h2>
            <p className="ops-detail-note">{jobDecision?.explanation ?? "Review job state and next action."}</p>
          </div>
        </div>
        <div className="ops-job-statuses">
          <span className={`status-badge status-with-icon ${statusTone(job.status)}`}>
            <ShipWrightIcon name={statusIconName(job.status)} />
            <span>{formatStatusLabel(job.status)}</span>
          </span>
          <span className={`status-badge status-with-icon ${attentionTone(job.attentionLevel)}`}>
            <ShipWrightIcon name={severityIconName(job.attentionLevel)} />
            <span>{job.attentionLevel}</span>
          </span>
          <span className={`status-badge status-with-icon ${statusTone(job.payment.status)}`}>
            <ShipWrightIcon name={statusIconName(job.payment.status)} />
            <span>{formatStatusLabel(job.payment.status)}</span>
          </span>
        </div>
      </div>
      {jobDecision ? (
        <div className="sw-decision-insight-grid ops-decision-grid">
          <div className="sw-decision-insight ops-decision-tile ops-decision-tile-state">
            <span className="decision-tile-icon decision-tile-icon-danger" aria-hidden="true">
              <ShipWrightIcon name="document" />
            </span>
            <span className="ops-section-label">Current state</span>
            <strong>{jobDecision.currentIssue}</strong>
            <p>{formatStatusLabel(job.status)}</p>
          </div>
          <div className="sw-decision-insight ops-decision-tile ops-decision-tile-meaning">
            <span className="decision-tile-icon decision-tile-icon-teal" aria-hidden="true">
              <ShipWrightIcon name="driver" />
            </span>
            <span className="ops-section-label">Operational meaning</span>
            <strong>{jobDecision.diagnosis}</strong>
            <p>{jobDecision.explanation}</p>
          </div>
          <div className="sw-decision-insight ops-decision-tile ops-decision-tile-impact">
            <span className="decision-tile-icon decision-tile-icon-warning" aria-hidden="true">
              <ShipWrightIcon name="timeline" />
            </span>
            <span className="ops-section-label">Impact</span>
            <strong>{jobDecision.impact}</strong>
            <p>Customer experience and SLA may be at risk.</p>
          </div>
          <div className="sw-decision-insight ops-decision-tile ops-decision-tile-action">
            <span className="decision-tile-icon decision-tile-icon-success" aria-hidden="true">
              <ShipWrightIcon name="arrow" />
            </span>
            <span className="ops-section-label">Next action</span>
            <strong>{jobDecision.recommendedActionLabel}</strong>
            <p>{jobDecision.explanation}</p>
          </div>
        </div>
      ) : null}
      <div className="sw-decision-actions ops-decision-actions">
        {jobDecision?.recommendedActionType === "RETRY_DISPATCH" ? (
          <button
            className="sw-button sw-button--danger button button-primary"
            disabled={props.actionSubmitting}
            onClick={() => props.onRetryDispatch(job)}
            type="button"
          >
            <ShipWrightIcon name="retry" />
            <span>{props.actionSubmitting ? "Retrying dispatch..." : "Retry dispatch"}</span>
          </button>
        ) : null}
        {jobDecision?.recommendedActionType === "AUTHORIZE_PAYMENT" ||
        jobDecision?.recommendedActionType === "COLLECT_PAYMENT_METHOD" ? (
          <a className="sw-button sw-button--primary button button-primary" href="#payment">
            <ShipWrightIcon name="payment" />
            <span>Open payment</span>
          </a>
        ) : null}
        {jobDecision?.severity === "BLOCKER" ? (
          <>
            <button className="sw-button sw-button--secondary button button-secondary" onClick={props.onAssignDriver} type="button">
              <ShipWrightIcon name="assign" />
              <span>Assign driver</span>
            </button>
            <a className="sw-button sw-button--secondary button button-secondary" href="#operator-controls">
              <ShipWrightIcon name="cancel" />
              <span>Cancel job</span>
            </a>
          </>
        ) : (
          <a className="sw-button sw-button--secondary button button-secondary" href="#operator-controls">
            <ShipWrightIcon name="warning" />
            <span>Operator controls</span>
          </a>
        )}
      </div>
    </section>
  );
}
