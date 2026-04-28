import type { AppJob, JobAttentionLevel } from "./product-state";

export type DispatchSeverity = "BLOCKER" | "RISK" | "NORMAL" | "INFO";

export type RecommendedActionType =
  | "RETRY_DISPATCH"
  | "ASSIGN_DRIVER"
  | "COLLECT_PAYMENT_METHOD"
  | "AUTHORIZE_PAYMENT"
  | "REVIEW_DRIVER"
  | "VIEW_JOB"
  | "NONE";

export type DispatchIntelligence = {
  severity: DispatchSeverity;
  headline: string;
  currentIssue: string;
  diagnosis: string;
  impact: string;
  recommendedActionLabel: string;
  recommendedActionType: RecommendedActionType;
  explanation: string;
};

const activeJobStatuses: AppJob["status"][] = [
  "REQUESTED",
  "ASSIGNED",
  "EN_ROUTE_PICKUP",
  "PICKED_UP",
  "EN_ROUTE_DROP",
  "IN_PROGRESS"
];

function attentionSeverity(level: JobAttentionLevel): DispatchSeverity {
  if (level === "BLOCKER") {
    return "BLOCKER";
  }

  if (level === "RISK") {
    return "RISK";
  }

  return "NORMAL";
}

function isActiveJob(job: AppJob) {
  return activeJobStatuses.includes(job.status);
}

export function getJobShortId(jobId: string) {
  return jobId.length <= 8 ? jobId : jobId.slice(0, 8);
}

export function getDispatchIntelligence(job: AppJob): DispatchIntelligence {
  if (job.status === "DISPATCH_FAILED") {
    return {
      severity: "BLOCKER",
      headline: "Dispatch failed — no driver accepted",
      currentIssue: "Dispatch failed",
      diagnosis: "No driver accepted this dispatch attempt.",
      impact: `The job is not moving. Customer ETA is still ${job.etaMinutes} min.`,
      recommendedActionLabel: "Retry dispatch",
      recommendedActionType: "RETRY_DISPATCH",
      explanation: "The job needs operator action before it can continue through the delivery lifecycle."
    };
  }

  if (job.payment.status === "REQUIRES_PAYMENT_METHOD") {
    return {
      severity: isActiveJob(job) ? "BLOCKER" : "RISK",
      headline: "Payment method required",
      currentIssue: "Payment blocked",
      diagnosis: "Payment method is missing.",
      impact: "Payment cannot be authorised for this job.",
      recommendedActionLabel: "Add payment method",
      recommendedActionType: "COLLECT_PAYMENT_METHOD",
      explanation: "Collect a valid payment method before authorising payment or progressing the job commercially."
    };
  }

  if (job.payment.status === "REQUIRES_CONFIRMATION") {
    return {
      severity: "RISK",
      headline: "Payment authorization required",
      currentIssue: "Payment awaiting authorization",
      diagnosis: "A payment method is ready but payment has not been authorised.",
      impact: "The job may continue operationally, but payment is not secured yet.",
      recommendedActionLabel: "Authorize payment",
      recommendedActionType: "AUTHORIZE_PAYMENT",
      explanation: "Authorize the payment from the payment panel before treating the job as commercially clear."
    };
  }

  if (job.attentionLevel === "BLOCKER") {
    return {
      severity: "BLOCKER",
      headline: job.attentionReason ?? "Job blocked",
      currentIssue: job.attentionReason ?? "Operator review required",
      diagnosis: job.tracking.assignedDriverName ? "The job is blocked by an operational condition." : "No driver is assigned to the job.",
      impact: `Customer ETA is ${job.etaMinutes} min, but the job needs intervention.`,
      recommendedActionLabel: job.tracking.assignedDriverName ? "View job" : "Retry dispatch",
      recommendedActionType: job.tracking.assignedDriverName ? "VIEW_JOB" : "RETRY_DISPATCH",
      explanation: "The backend has flagged this job as blocked. Review the job state before creating more work."
    };
  }

  if (isActiveJob(job) && job.tracking.assignedDriverName && !job.tracking.latestLocation) {
    return {
      severity: "RISK",
      headline: "Driver progress needs review",
      currentIssue: "No live location",
      diagnosis: "Driver progress has not produced live coordinates yet.",
      impact: "Pickup or drop timing may be unclear.",
      recommendedActionLabel: "Review driver status",
      recommendedActionType: "REVIEW_DRIVER",
      explanation: "The driver is assigned, but tracking has not supplied a live location for operators to verify movement."
    };
  }

  if (job.attentionLevel === "RISK") {
    return {
      severity: "RISK",
      headline: job.attentionReason ?? "Job at risk",
      currentIssue: job.attentionReason ?? "Delay risk",
      diagnosis: "The job has an active risk signal.",
      impact: `Customer ETA is ${job.etaMinutes} min; review before the risk becomes a blocker.`,
      recommendedActionLabel: "View job",
      recommendedActionType: "VIEW_JOB",
      explanation: "The backend attention state is not normal, so this job should stay visible in the review queue."
    };
  }

  if (job.status === "DELIVERED" || job.status === "COMPLETED") {
    return {
      severity: "INFO",
      headline: "Delivery complete",
      currentIssue: "Completion recorded",
      diagnosis: "The job has reached a completed delivery state.",
      impact: "No live operator action is required.",
      recommendedActionLabel: "View job",
      recommendedActionType: "VIEW_JOB",
      explanation: "Completed jobs remain available for audit and customer support review."
    };
  }

  const severity = attentionSeverity(job.attentionLevel);

  return {
    severity,
    headline: severity === "NORMAL" ? "Job progressing normally" : "Job needs review",
    currentIssue: severity === "NORMAL" ? "No active issue" : (job.attentionReason ?? "Operator review required"),
    diagnosis: severity === "NORMAL" ? "No blocker or risk signal is active." : "The job has a non-normal attention state.",
    impact: severity === "NORMAL" ? "No operator intervention required." : `Customer ETA is ${job.etaMinutes} min.`,
    recommendedActionLabel: severity === "NORMAL" ? "Monitor job" : "View job",
    recommendedActionType: severity === "NORMAL" ? "NONE" : "VIEW_JOB",
    explanation: severity === "NORMAL" ? "The job is within the expected operating posture." : "Review the job before it escalates."
  };
}

export function shouldShowInReviewQueue(intelligence: DispatchIntelligence) {
  return intelligence.severity === "BLOCKER" || intelligence.severity === "RISK";
}

export function sortReviewQueue(
  left: { job: AppJob; intelligence: DispatchIntelligence },
  right: { job: AppJob; intelligence: DispatchIntelligence }
) {
  const weight: Record<DispatchSeverity, number> = {
    BLOCKER: 0,
    RISK: 1,
    INFO: 2,
    NORMAL: 3
  };

  const severityDelta = weight[left.intelligence.severity] - weight[right.intelligence.severity];
  if (severityDelta !== 0) {
    return severityDelta;
  }

  return right.job.createdAt.localeCompare(left.job.createdAt);
}
