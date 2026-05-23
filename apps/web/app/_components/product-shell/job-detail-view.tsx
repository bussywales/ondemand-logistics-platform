import { isStripeFrontendConfigured, type CollectedPaymentMethod } from "../payment-method-form";
import type {
  AppJob,
  BusinessSession,
  CreateSupportEscalationInput,
  DispatchAuditEvent,
  EligibleDriver,
  SupportEscalation,
  SupportEscalationEvent,
  UpdateSupportEscalationInput
} from "../../_lib/product-state";
import type { DriverAssignmentFailureModel } from "../../_lib/driver-assignment";
import { getDispatchIntelligence } from "../../_lib/dispatch-intelligence";
import { DispatchTimelinePanel } from "./dispatch-timeline-panel";
import { DispatchGovernancePanel } from "./dispatch-governance-panel";
import { JobIncidentSummaryPanel } from "./job-incident-summary-panel";
import { JobDecisionSurface } from "./job-decision-surface";
import { JobRouteAndDriverPanel } from "./job-route-and-driver-panel";
import { OperatorControlsPanel } from "./operator-controls-panel";
import { PaymentStatusPanel } from "./payment-status-panel";
import { SupportEscalationLog } from "../support-escalation-log";

type JobDetailViewProps = {
  actionSubmitting: boolean;
  cancelReason: string;
  collectedPaymentMethod: CollectedPaymentMethod | null;
  driverAssignmentError: DriverAssignmentFailureModel | null;
  driverPickerOpen: boolean;
  driverPickerQuery: string;
  dispatchAudit: DispatchAuditEvent[];
  dispatchGovernanceError?: string | null;
  dispatchOverrideSubmitting: boolean;
  eligibleDrivers: EligibleDriver[];
  eligibleDriversLoading: boolean;
  filteredEligibleDrivers: EligibleDriver[];
  job: AppJob;
  onAssignDriver: (driverId: string, governance: { reason: string; confirmation: string; note?: string | null }) => void;
  onAuthorizePayment: (job: AppJob) => void;
  onCancelJob: (job: AppJob) => void;
  onCancelReasonChange: (value: string) => void;
  onCloseDriverPicker: () => void;
  onCollectedPaymentMethod: (paymentMethod: CollectedPaymentMethod) => void;
  onCreateDispatchOverride: (input: {
    overrideType: "MARK_DISPATCH_REVIEWED" | "MARK_DISPATCH_BLOCKED" | "MANUAL_RECOVERY_NOTE";
    reason: string;
    note?: string | null;
  }) => Promise<void> | void;
  onDriverPickerQueryChange: (value: string) => void;
  onOpenDriverPicker: () => void;
  onOpenOrRefreshDriverPicker: () => void;
  onResetCollectedPaymentMethod: () => void;
  onRetryDispatch: (job: AppJob) => void;
  onCreateSupportEscalation: (input: CreateSupportEscalationInput) => Promise<void> | void;
  onUpdateSupportEscalationStatus: (id: string, input: UpdateSupportEscalationInput) => Promise<void> | void;
  paymentSubmitting: boolean;
  selectedDriverId: string | null;
  session: BusinessSession;
  supportEscalations: SupportEscalation[];
  supportEscalationEvents: Record<string, SupportEscalationEvent[]>;
  supportError?: string | null;
  supportSubmitting: boolean;
};

export function JobDetailView(props: JobDetailViewProps) {
  const jobDecision = getDispatchIntelligence(props.job);

  return (
    <section className="sw-stack">
      <JobDecisionSurface
        actionSubmitting={props.actionSubmitting}
        job={props.job}
        jobDecision={jobDecision}
        onAssignDriver={props.onOpenDriverPicker}
        onRetryDispatch={props.onRetryDispatch}
      />
      <JobIncidentSummaryPanel incidentSummary={props.job.incidentSummary} />
      <SupportEscalationLog
        context="job"
        error={props.supportError}
        eventsByEscalationId={props.supportEscalationEvents}
        items={props.supportEscalations}
        jobId={props.job.id}
        onCreate={props.onCreateSupportEscalation}
        onUpdateStatus={props.onUpdateSupportEscalationStatus}
        submitting={props.supportSubmitting}
      />
      <JobRouteAndDriverPanel job={props.job} />
      <DispatchGovernancePanel
        audit={props.dispatchAudit}
        error={props.dispatchGovernanceError}
        job={props.job}
        onCreateOverride={props.onCreateDispatchOverride}
        submitting={props.dispatchOverrideSubmitting}
      />
      <DispatchTimelinePanel job={props.job} />
      <PaymentStatusPanel
        collectedPaymentMethod={props.collectedPaymentMethod}
        job={props.job}
        onAuthorizePayment={props.onAuthorizePayment}
        onCollectedPaymentMethod={props.onCollectedPaymentMethod}
        onResetCollectedPaymentMethod={props.onResetCollectedPaymentMethod}
        paymentSubmitting={props.paymentSubmitting}
        session={props.session}
        stripeEnabled={isStripeFrontendConfigured()}
      />
      <OperatorControlsPanel
        actionSubmitting={props.actionSubmitting}
        cancelReason={props.cancelReason}
        driverAssignmentError={props.driverAssignmentError}
        driverPickerOpen={props.driverPickerOpen}
        driverPickerQuery={props.driverPickerQuery}
        eligibleDrivers={props.eligibleDrivers}
        eligibleDriversLoading={props.eligibleDriversLoading}
        filteredEligibleDrivers={props.filteredEligibleDrivers}
        job={props.job}
        onAssignDriver={props.onAssignDriver}
        onCancelJob={props.onCancelJob}
        onCancelReasonChange={props.onCancelReasonChange}
        onCloseDriverPicker={props.onCloseDriverPicker}
        onDriverPickerQueryChange={props.onDriverPickerQueryChange}
        onOpenOrRefreshDriverPicker={props.onOpenOrRefreshDriverPicker}
        onRetryDispatch={props.onRetryDispatch}
        selectedDriverId={props.selectedDriverId}
      />
    </section>
  );
}
