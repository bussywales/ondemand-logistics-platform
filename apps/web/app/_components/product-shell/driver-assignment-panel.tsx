import { ShipWrightIcon } from "../shipwright-icon";
import { formatDateTime, type EligibleDriver } from "../../_lib/product-state";
import {
  getBlockedDriverLabel,
  getEligibleDriverFlagLabel,
  getEligibleDriverTone,
  type DriverAssignmentFailureModel
} from "../../_lib/driver-assignment";
import { DriverPickerEmptyState } from "./shared";

type DriverAssignmentPanelProps = {
  actionSubmitting: boolean;
  driverAssignmentError: DriverAssignmentFailureModel | null;
  driverPickerQuery: string;
  eligibleDrivers: EligibleDriver[];
  eligibleDriversLoading: boolean;
  filteredEligibleDrivers: EligibleDriver[];
  onAssignDriver: (driverId: string) => void;
  onClose: () => void;
  onQueryChange: (value: string) => void;
  selectedDriverId: string | null;
};

export function DriverAssignmentPanel(props: DriverAssignmentPanelProps) {
  return (
    <div className="sw-supporting-surface sw-stack assignment-picker">
      <div className="assignment-picker-header">
        <div>
          <p className="eyebrow">Eligible drivers</p>
          <strong>Assign the best staged driver for this job.</strong>
        </div>
        <button className="text-action" onClick={props.onClose} type="button">
          Close
        </button>
      </div>

      <label className="assignment-picker-search sw-field">
        <span className="sw-label">Search drivers</span>
        <input
          className="sw-input"
          onChange={(event) => props.onQueryChange(event.target.value)}
          placeholder="Search by name, vehicle, or verification"
          value={props.driverPickerQuery}
        />
      </label>

      {props.driverAssignmentError ? (
        <div className="sw-decision-surface assignment-error-panel" role="alert">
          <div className="assignment-error-header">
            <span className="sw-icon-badge sw-icon-badge--danger" aria-hidden="true">
              <ShipWrightIcon name="alert" />
            </span>
            <div>
              <p className="eyebrow">Assignment blocked</p>
              <strong>{props.driverAssignmentError.title}</strong>
            </div>
          </div>
          <p className="assignment-error-copy">{props.driverAssignmentError.suitabilityReason}</p>
          <div className="assignment-flag-list">
            {props.driverAssignmentError.suitabilityFlags.map((flag) => (
              <span className={`sw-badge ${getEligibleDriverTone(flag)}`} key={`assignment-error-${flag}`}>
                {getEligibleDriverFlagLabel(flag)}
              </span>
            ))}
          </div>
          <div className="assignment-next-steps">
            <p className="sw-label">What to do next</p>
            <ul>
              {props.driverAssignmentError.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
              <li>Choose another driver from the eligible pool below.</li>
            </ul>
          </div>
        </div>
      ) : null}

      {props.eligibleDriversLoading ? (
        <div className="assignment-empty-state sw-empty-state">
          <strong className="sw-empty-title">Loading driver pool</strong>
          <p className="sw-empty-copy">Checking availability, verification, location, and vehicle match.</p>
        </div>
      ) : props.filteredEligibleDrivers.length === 0 && props.driverPickerQuery.trim() ? (
        <div className="assignment-empty-state sw-empty-state">
          <strong className="sw-empty-title">No matching drivers</strong>
          <p className="sw-empty-copy">Try another name, vehicle, or verification filter.</p>
        </div>
      ) : props.filteredEligibleDrivers.length === 0 ? (
        <DriverPickerEmptyState drivers={props.eligibleDrivers} />
      ) : (
        <div className="assignment-list">
          {props.filteredEligibleDrivers.map((driver) => (
            <div
              className={`sw-queue-row sw-list-row assignment-row ${driver.eligible ? "assignment-row-ready" : "assignment-row-blocked"}`}
              key={driver.id}
            >
              <div className="sw-queue-row-main assignment-row-main">
                <div className="assignment-row-head">
                  <div>
                    <strong>{driver.displayName}</strong>
                    <p>
                      {driver.vehicleType ?? "No vehicle set"} · {driver.availabilityStatus} ·{" "}
                      {driver.distanceMiles === null ? "Distance unavailable" : `${driver.distanceMiles.toFixed(1)} mi from pickup`}
                    </p>
                  </div>
                  <span className={`sw-badge ${driver.eligible ? "sw-badge--success" : "sw-badge--danger"}`}>
                    {getBlockedDriverLabel(driver)}
                  </span>
                </div>

                <p className="assignment-row-reason">{driver.suitabilityReason}</p>

                <div className="assignment-row-meta">
                  <span>
                    Verification: <strong>{driver.verificationStatus}</strong>
                  </span>
                  <span>
                    Latest location: <strong>{driver.lastLocationAt ? formatDateTime(driver.lastLocationAt) : "No update"}</strong>
                  </span>
                  <span>
                    Active job: <strong>{driver.activeJobStatus ?? "None"}</strong>
                  </span>
                </div>

                <div className="assignment-flag-list">
                  {driver.suitabilityFlags.map((flag) => (
                    <span className={`sw-badge ${getEligibleDriverTone(flag)}`} key={`${driver.id}-${flag}`}>
                      {getEligibleDriverFlagLabel(flag)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="sw-queue-row-actions assignment-row-actions">
                <button
                  className="sw-button sw-button--primary button button-primary"
                  disabled={props.actionSubmitting || !driver.eligible}
                  onClick={() => props.onAssignDriver(driver.id)}
                  type="button"
                >
                  <ShipWrightIcon name="assign" />
                  <span>
                    {props.actionSubmitting && props.selectedDriverId === driver.id ? "Assigning..." : "Assign driver"}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
