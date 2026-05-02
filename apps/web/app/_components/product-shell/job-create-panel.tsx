import type { Dispatch, FormEvent, SetStateAction } from "react";
import { ShipWrightIcon } from "../shipwright-icon";
import type { DeliveryFormInput, VehicleType } from "../../_lib/product-state";
import { SectionTitle } from "./shared";

type JobCreatePanelProps = {
  deliveryForm: DeliveryFormInput;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setDeliveryForm: Dispatch<SetStateAction<DeliveryFormInput>>;
  submitting: boolean;
};

export function JobCreatePanel(props: JobCreatePanelProps) {
  const { deliveryForm, setDeliveryForm, submitting } = props;

  return (
    <section className="sw-operational-surface ops-section ops-creation-panel">
      <div className="ops-section-header">
        <SectionTitle
          eyebrow="Jobs"
          icon="route"
          note="Enter the operational facts first. Coordinates stay available for controlled pilot overrides."
          title="Create delivery"
        />
      </div>

      <form className="ops-form" onSubmit={props.onSubmit}>
        <div className="form-grid-two">
          <label className="sw-field">
            <span className="sw-label">Pickup</span>
            <input
              className="sw-input"
              onChange={(event) => setDeliveryForm((current) => ({ ...current, pickupAddress: event.target.value }))}
              value={deliveryForm.pickupAddress}
            />
          </label>
          <label className="sw-field">
            <span className="sw-label">Drop</span>
            <input
              className="sw-input"
              onChange={(event) => setDeliveryForm((current) => ({ ...current, dropoffAddress: event.target.value }))}
              value={deliveryForm.dropoffAddress}
            />
          </label>
        </div>

        <div className="form-grid-three">
          <label className="sw-field">
            <span className="sw-label">Estimated distance</span>
            <input
              className="sw-input"
              max="12"
              min="0.1"
              onChange={(event) => setDeliveryForm((current) => ({ ...current, distanceMiles: Number(event.target.value) }))}
              step="0.1"
              type="number"
              value={deliveryForm.distanceMiles}
            />
          </label>
          <label className="sw-field">
            <span className="sw-label">Estimated ETA</span>
            <input
              className="sw-input"
              min="1"
              onChange={(event) => setDeliveryForm((current) => ({ ...current, etaMinutes: Number(event.target.value) }))}
              step="1"
              type="number"
              value={deliveryForm.etaMinutes}
            />
          </label>
          <label className="sw-field">
            <span className="sw-label">Vehicle</span>
            <select
              className="sw-input"
              onChange={(event) =>
                setDeliveryForm((current) => ({
                  ...current,
                  vehicleType: event.target.value as VehicleType
                }))
              }
              value={deliveryForm.vehicleType}
            >
              <option value="BIKE">Bike</option>
              <option value="CAR">Car</option>
            </select>
          </label>
        </div>

        <details className="ops-advanced-section sw-supporting-surface">
          <summary>
            <span>Advanced location controls</span>
            <small>Coordinate overrides for pilot testing</small>
          </summary>
          <div className="form-grid-two">
            <label className="sw-field">
              <span className="sw-label">Pickup coordinates</span>
              <div className="coordinate-grid">
                <input
                  aria-label="Pickup latitude"
                  className="sw-input"
                  onChange={(event) => setDeliveryForm((current) => ({ ...current, pickupLatitude: Number(event.target.value) }))}
                  step="0.0001"
                  type="number"
                  value={deliveryForm.pickupLatitude}
                />
                <input
                  aria-label="Pickup longitude"
                  className="sw-input"
                  onChange={(event) => setDeliveryForm((current) => ({ ...current, pickupLongitude: Number(event.target.value) }))}
                  step="0.0001"
                  type="number"
                  value={deliveryForm.pickupLongitude}
                />
              </div>
            </label>
            <label className="sw-field">
              <span className="sw-label">Drop coordinates</span>
              <div className="coordinate-grid">
                <input
                  aria-label="Drop latitude"
                  className="sw-input"
                  onChange={(event) => setDeliveryForm((current) => ({ ...current, dropoffLatitude: Number(event.target.value) }))}
                  step="0.0001"
                  type="number"
                  value={deliveryForm.dropoffLatitude}
                />
                <input
                  aria-label="Drop longitude"
                  className="sw-input"
                  onChange={(event) => setDeliveryForm((current) => ({ ...current, dropoffLongitude: Number(event.target.value) }))}
                  step="0.0001"
                  type="number"
                  value={deliveryForm.dropoffLongitude}
                />
              </div>
            </label>
          </div>
        </details>

        <div className="ops-actions">
          <button className="sw-button sw-button--primary button button-primary" disabled={submitting} type="submit">
            <ShipWrightIcon name="route" />
            <span>{submitting ? "Creating delivery..." : "Create delivery"}</span>
          </button>
        </div>
      </form>
    </section>
  );
}
