import { ShipWrightIcon, type ShipWrightIconName } from "../shipwright-icon";
import type { AppJob, BusinessCustomerOrder, EligibleDriver } from "../../_lib/product-state";
import { getEligibleDriverEmptyState } from "../../_lib/driver-assignment";

export function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export function statusTone(status: AppJob["status"] | AppJob["payment"]["status"]) {
  if (
    status === "ASSIGNED" ||
    status === "EN_ROUTE_PICKUP" ||
    status === "PICKED_UP" ||
    status === "EN_ROUTE_DROP" ||
    status === "AUTHORIZED"
  ) {
    return "status-live";
  }

  if (status === "DELIVERED" || status === "CAPTURED") {
    return "status-positive";
  }

  if (status === "FAILED" || status === "CANCELLED" || status === "DISPATCH_FAILED") {
    return "status-negative";
  }

  return "status-neutral";
}

export function orderStatusTone(status: BusinessCustomerOrder["status"]) {
  if (status === "FULFILLED") {
    return "status-positive";
  }

  if (status === "PAYMENT_AUTHORIZED") {
    return "status-live";
  }

  if (status === "PAYMENT_FAILED") {
    return "status-negative";
  }

  return "status-neutral";
}

export function summarizeDriver(job: AppJob) {
  if (!job.tracking.assignedDriverName) {
    return "No driver assigned";
  }

  return `${job.tracking.assignedDriverName} · ${job.vehicleRequired}`;
}

export function attentionTone(level: AppJob["attentionLevel"]) {
  if (level === "BLOCKER") {
    return "status-negative";
  }

  if (level === "RISK") {
    return "status-live";
  }

  return "status-neutral";
}

export function severityTone(level: "BLOCKER" | "RISK" | "NORMAL" | "INFO") {
  if (level === "BLOCKER") {
    return "status-negative";
  }

  if (level === "RISK") {
    return "status-live";
  }

  if (level === "INFO") {
    return "status-neutral";
  }

  return "status-positive";
}

export function statusIconName(status: AppJob["status"] | AppJob["payment"]["status"]): ShipWrightIconName {
  if (status === "DELIVERED" || status === "CAPTURED") {
    return "check";
  }

  if (status === "FAILED" || status === "CANCELLED" || status === "DISPATCH_FAILED") {
    return "alert";
  }

  if (status === "REQUIRES_PAYMENT_METHOD" || status === "REQUIRES_CONFIRMATION") {
    return "payment";
  }

  return "queue";
}

export function severityIconName(level: "BLOCKER" | "RISK" | "NORMAL" | "INFO"): ShipWrightIconName {
  if (level === "BLOCKER") {
    return "alert";
  }

  if (level === "RISK") {
    return "warning";
  }

  if (level === "NORMAL") {
    return "check";
  }

  return "queue";
}

export function queueStateCopy(kind: "active" | "attention" | "all") {
  if (kind === "active") {
    return {
      title: "No active jobs",
      body: "The live queue is clear. New delivery requests will appear here as soon as they are created."
    };
  }

  if (kind === "attention") {
    return {
      title: "No jobs need review",
      body: "Failed dispatches, no-driver states, and delays will appear here."
    };
  }

  return {
    title: "No jobs yet",
    body: "Create the first delivery request to populate this workspace."
  };
}

export function QueueEmptyState(props: { copy: { title: string; body: string }; icon?: ShipWrightIconName }) {
  return (
    <div className="ops-empty-state ops-queue-empty sw-empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        <ShipWrightIcon name={props.icon ?? "queue"} />
      </span>
      <strong className="sw-empty-title">{props.copy.title}</strong>
      <p className="sw-empty-copy">{props.copy.body}</p>
    </div>
  );
}

export function DriverPickerEmptyState(props: { drivers: EligibleDriver[] }) {
  return (
    <div className="ops-empty-state ops-queue-empty assignment-empty-state sw-empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        <ShipWrightIcon name="driver" />
      </span>
      <strong className="sw-empty-title">No eligible drivers available</strong>
      <p className="sw-empty-copy">{getEligibleDriverEmptyState(props.drivers)}</p>
      <p className="support-note">
        Likely causes: no online drivers, vehicle mismatch, driver already active, or verification not approved.
      </p>
    </div>
  );
}

export function SectionTitle(props: { eyebrow: string; icon: ShipWrightIconName; note?: string; title: string }) {
  return (
    <div className="section-title-row sw-card-header">
      <span className="section-title-icon" aria-hidden="true">
        <ShipWrightIcon name={props.icon} />
      </span>
      <div>
        <p className="eyebrow">{props.eyebrow}</p>
        <h2>{props.title}</h2>
        {props.note ? <p className="ops-detail-note">{props.note}</p> : null}
      </div>
    </div>
  );
}

export function isCompletedToday(job: AppJob) {
  if (job.status !== "DELIVERED" && job.status !== "COMPLETED") {
    return false;
  }

  return new Date(job.createdAt).toDateString() === new Date().toDateString();
}
