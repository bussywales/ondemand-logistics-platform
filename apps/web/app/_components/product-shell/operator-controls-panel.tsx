import type { AppJob, EligibleDriver } from "../../_lib/product-state";
import type { DriverAssignmentFailureModel } from "../../_lib/driver-assignment";
import { DriverAssignmentPanel } from "./driver-assignment-panel";
import { SectionTitle } from "./shared";
import { ShipWrightIcon } from "../shipwright-icon";

type OperatorControlsPanelProps = {
  actionSubmitting: boolean;
  cancelReason: string;
  driverAssignmentError: DriverAssignmentFailureModel | null;
  driverPickerOpen: boolean;
  driverPickerQuery: string;
  eligibleDrivers: EligibleDriver[];
  eligibleDriversLoading: boolean;
  filteredEligibleDrivers: EligibleDriver[];
  job: AppJob;
  onAssignDriver: (driverId: string) => void;
  onCancelJob: (job: AppJob) => void;
  onCancelReasonChange: (value: string) => void;
  onCloseDriverPicker: () => void;
  onDriverPickerQueryChange: (value: string) => void;
  onOpenOrRefreshDriverPicker: () => void;
  onRetryDispatch: (job: AppJob) => void;
  selectedDriverId: string | null;
};

export function OperatorControlsPanel(props: OperatorControlsPanelProps) {
  return (
    <section className="sw-utility-surface ops-section ops-zone ops-actions-zone" id="operator-controls">
      <div className="ops-section-header">
        <SectionTitle
          eyebrow="Advanced"
          icon="warning"
          note="Use these controls when the decision banner calls for direct intervention."
          title="Operator controls"
        />
      </div>
      <div className="ops-definition-list">
        <div>
          <dt>Retry dispatch</dt>
          <dd>Re-open the job for dispatch when it is blocked or needs another attempt.</dd>
        </div>
      </div>
      <div className="ops-actions ops-actions-inline">
        <button
          className="sw-button sw-button--secondary button button-secondary"
          disabled={props.actionSubmitting}
          onClick={() => props.onRetryDispatch(props.job)}
          type="button"
        >
          <ShipWrightIcon name="retry" />
          <span>Retry Dispatch</span>
        </button>
      </div>

      <div className="ops-actions ops-actions-inline" id="assign-driver">
        <button
          className="sw-button sw-button--secondary button button-secondary"
          disabled={props.actionSubmitting}
          onClick={props.onOpenOrRefreshDriverPicker}
          type="button"
        >
          <ShipWrightIcon name="assign" />
          <span>{props.driverPickerOpen ? "Refresh eligible drivers" : "Assign driver"}</span>
        </button>
      </div>

      {props.driverPickerOpen ? (
        <DriverAssignmentPanel
          actionSubmitting={props.actionSubmitting}
          driverAssignmentError={props.driverAssignmentError}
          driverPickerQuery={props.driverPickerQuery}
          eligibleDrivers={props.eligibleDrivers}
          eligibleDriversLoading={props.eligibleDriversLoading}
          filteredEligibleDrivers={props.filteredEligibleDrivers}
          onAssignDriver={props.onAssignDriver}
          onClose={props.onCloseDriverPicker}
          onQueryChange={props.onDriverPickerQueryChange}
          selectedDriverId={props.selectedDriverId}
        />
      ) : null}

      <label className="ops-field sw-field">
        <span className="sw-label">Cancel reason</span>
        <input className="sw-input" onChange={(event) => props.onCancelReasonChange(event.target.value)} value={props.cancelReason} />
      </label>

      <div className="ops-actions ops-actions-inline">
        <button
          className="sw-button sw-button--secondary button button-secondary"
          disabled={props.actionSubmitting || !props.cancelReason.trim()}
          onClick={() => props.onCancelJob(props.job)}
          type="button"
        >
          <ShipWrightIcon name="cancel" />
          <span>Cancel Job</span>
        </button>
      </div>
    </section>
  );
}
