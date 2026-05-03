import { isStripeFrontendConfigured, type CollectedPaymentMethod } from "../payment-method-form";
import type { AppJob, BusinessSession, EligibleDriver } from "../../_lib/product-state";
import type { DriverAssignmentFailureModel } from "../../_lib/driver-assignment";
import { getDispatchIntelligence } from "../../_lib/dispatch-intelligence";
import { DispatchTimelinePanel } from "./dispatch-timeline-panel";
import { JobIncidentSummaryPanel } from "./job-incident-summary-panel";
import { JobDecisionSurface } from "./job-decision-surface";
import { JobRouteAndDriverPanel } from "./job-route-and-driver-panel";
import { OperatorControlsPanel } from "./operator-controls-panel";
import { PaymentStatusPanel } from "./payment-status-panel";

type JobDetailViewProps = {
  actionSubmitting: boolean;
  cancelReason: string;
  collectedPaymentMethod: CollectedPaymentMethod | null;
  driverAssignmentError: DriverAssignmentFailureModel | null;
  driverPickerOpen: boolean;
  driverPickerQuery: string;
  eligibleDrivers: EligibleDriver[];
  eligibleDriversLoading: boolean;
  filteredEligibleDrivers: EligibleDriver[];
  job: AppJob;
  onAssignDriver: (driverId: string) => void;
  onAuthorizePayment: (job: AppJob) => void;
  onCancelJob: (job: AppJob) => void;
  onCancelReasonChange: (value: string) => void;
  onCloseDriverPicker: () => void;
  onCollectedPaymentMethod: (paymentMethod: CollectedPaymentMethod) => void;
  onDriverPickerQueryChange: (value: string) => void;
  onOpenDriverPicker: () => void;
  onOpenOrRefreshDriverPicker: () => void;
  onResetCollectedPaymentMethod: () => void;
  onRetryDispatch: (job: AppJob) => void;
  paymentSubmitting: boolean;
  selectedDriverId: string | null;
  session: BusinessSession;
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
      <JobRouteAndDriverPanel job={props.job} />
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
