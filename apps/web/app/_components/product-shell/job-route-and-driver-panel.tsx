import type { AppJob } from "../../_lib/product-state";
import { SectionTitle, summarizeDriver } from "./shared";

type JobRouteAndDriverPanelProps = {
  job: AppJob;
};

export function JobRouteAndDriverPanel(props: JobRouteAndDriverPanelProps) {
  const { job } = props;

  return (
    <div className="ops-detail-grid">
      <section className="sw-operational-surface ops-zone ops-route-zone">
        <div className="sw-card-header">
          <SectionTitle eyebrow="Route" icon="route" title="Pickup and drop" />
        </div>
        <div className="ops-definition-list">
          <div>
            <dt>Pickup</dt>
            <dd>{job.pickupAddress}</dd>
          </div>
          <div>
            <dt>Drop</dt>
            <dd>{job.dropoffAddress}</dd>
          </div>
          <div>
            <dt>ETA</dt>
            <dd>{job.etaMinutes} minutes</dd>
          </div>
          <div>
            <dt>Distance</dt>
            <dd>{job.distanceMiles.toFixed(1)} miles</dd>
          </div>
        </div>
      </section>

      <section className="sw-operational-surface ops-zone ops-driver-zone">
        <div className="sw-card-header">
          <SectionTitle eyebrow="Driver" icon="driver" title="Assignment" />
        </div>
        <div className="ops-definition-list">
          <div>
            <dt>Driver</dt>
            <dd>{summarizeDriver(job)}</dd>
          </div>
          <div>
            <dt>Vehicle</dt>
            <dd>{job.vehicleRequired}</dd>
          </div>
          <div>
            <dt>Latest coordinates</dt>
            <dd>
              {job.tracking.latestLocation
                ? `${job.tracking.latestLocation.latitude.toFixed(4)}, ${job.tracking.latestLocation.longitude.toFixed(4)}`
                : "No live coordinates"}
            </dd>
          </div>
          <div>
            <dt>Pricing version</dt>
            <dd>{job.pricingVersion}</dd>
          </div>
        </div>
      </section>
    </div>
  );
}
