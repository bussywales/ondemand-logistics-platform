"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { authorizePayment, createLiveJob, getLiveJob, listLiveJobs } from "../_lib/api";
import {
  authorizeLocalJobPayment,
  createLocalJob,
  formatCurrency,
  formatDateTime,
  readBusinessProfile,
  readJobs,
  saveBusinessProfile,
  saveJobs,
  type AppJob,
  type AppMode,
  type BusinessProfile,
  type DeliveryFormInput,
  type VehicleType
} from "../_lib/product-state";

type ProductShellProps = {
  view: "home" | "jobs" | "job-detail";
  jobId?: string;
};

const defaultForm: DeliveryFormInput = {
  pickupAddress: "12 Exmouth Market, London",
  dropoffAddress: "184 Upper Street, London",
  distanceMiles: 4.8,
  etaMinutes: 22,
  vehicleType: "BIKE",
  pickupLatitude: 51.5254,
  pickupLongitude: -0.1099,
  dropoffLatitude: 51.5396,
  dropoffLongitude: -0.1026
};

function statusTone(status: AppJob["status"] | AppJob["payment"]["status"]) {
  if (status === "AUTHORIZED" || status === "CAPTURED" || status === "DELIVERED") {
    return "status-positive";
  }

  if (status === "FAILED" || status === "CANCELLED" || status === "DISPATCH_FAILED") {
    return "status-negative";
  }

  return "status-neutral";
}

export function ProductShell(props: ProductShellProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [jobs, setJobs] = useState<AppJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<AppJob | null>(null);
  const [deliveryForm, setDeliveryForm] = useState<DeliveryFormInput>(defaultForm);
  const [appMode, setAppMode] = useState<AppMode>("staged");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState("pm_card_visa");

  useEffect(() => {
    const nextProfile = readBusinessProfile();
    const nextJobs = readJobs();
    setProfile(nextProfile);
    setJobs(nextJobs);
    setAppMode(nextProfile?.authToken ? "live" : "staged");

    if (nextProfile?.operatingCity === "London") {
      setDeliveryForm(defaultForm);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (loading || !profile?.authToken || appMode !== "live") {
      return;
    }

    void refreshLiveJobs(profile);
  }, [loading, appMode]);

  useEffect(() => {
    if (!props.jobId) {
      setSelectedJob(null);
      return;
    }

    const local = jobs.find((job) => job.id === props.jobId) ?? null;
    setSelectedJob(local);

    if (profile?.authToken && appMode === "live") {
      void refreshLiveJob(props.jobId, profile);
    }
  }, [props.jobId, jobs, profile, appMode]);

  const overview = useMemo(() => {
    const authorizedJobs = jobs.filter((job) => job.payment.status === "AUTHORIZED" || job.payment.status === "CAPTURED").length;
    const liveJobs = jobs.filter((job) => job.mode === "live").length;
    return {
      totalJobs: jobs.length,
      authorizedJobs,
      liveJobs
    };
  }, [jobs]);

  async function refreshLiveJobs(currentProfile: BusinessProfile) {
    try {
      const liveJobs = await listLiveJobs(currentProfile);
      setJobs((existing) => {
        const stagedJobs = existing.filter((job) => job.mode === "staged");
        const nextJobs = [...liveJobs, ...stagedJobs].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
        saveJobs(nextJobs);
        return nextJobs;
      });
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to load live jobs.");
    }
  }

  async function refreshLiveJob(jobId: string, currentProfile: BusinessProfile) {
    try {
      const job = await getLiveJob(currentProfile, jobId);
      setJobs((existing) => {
        const stagedJobs = existing.filter((item) => item.mode === "staged");
        const withoutCurrent = stagedJobs.concat(existing.filter((item) => item.mode === "live" && item.id !== jobId));
        const nextJobs = [job, ...withoutCurrent].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
        saveJobs(nextJobs);
        return nextJobs;
      });
      setSelectedJob(job);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to refresh the selected job.");
    }
  }

  function updateProfileField<K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K]) {
    setProfile((current) => {
      const base = current ?? {
        role: "business" as const,
        businessName: "",
        contactName: "",
        email: "",
        phone: "",
        operatingCity: "London",
        apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api-staging-qvmv.onrender.com",
        authToken: "",
        orgId: "",
        consumerId: ""
      };

      const next = { ...base, [key]: value };
      saveBusinessProfile(next);
      return next;
    });
  }

  async function handleCreateDelivery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (appMode === "live") {
        if (!profile) {
          throw new Error("Complete business onboarding before using live mode.");
        }

        const created = await createLiveJob(profile, {
          pickupAddress: deliveryForm.pickupAddress,
          dropoffAddress: deliveryForm.dropoffAddress,
          distanceMiles: deliveryForm.distanceMiles,
          etaMinutes: deliveryForm.etaMinutes,
          vehicleType: deliveryForm.vehicleType,
          pickupCoordinates: {
            latitude: deliveryForm.pickupLatitude,
            longitude: deliveryForm.pickupLongitude
          },
          dropoffCoordinates: {
            latitude: deliveryForm.dropoffLatitude,
            longitude: deliveryForm.dropoffLongitude
          }
        });

        const nextJobs = [created, ...jobs.filter((job) => job.id !== created.id)].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
        setJobs(nextJobs);
        saveJobs(nextJobs);
        router.push(`/app/jobs/${created.id}`);
      } else {
        const created = createLocalJob(deliveryForm);
        const nextJobs = [created, ...jobs].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
        setJobs(nextJobs);
        saveJobs(nextJobs);
        router.push(`/app/jobs/${created.id}`);
      }
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to create delivery.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAuthorizePayment(job: AppJob) {
    setPaymentSubmitting(true);
    setError(null);

    try {
      if (job.mode === "live") {
        if (!profile) {
          throw new Error("Complete business onboarding before authorizing payment.");
        }

        const payment = await authorizePayment(profile, job.id, paymentMethodId.trim());
        const nextJob = {
          ...job,
          payment: {
            ...job.payment,
            ...payment
          }
        };
        const nextJobs = jobs.map((item) => (item.id === job.id ? nextJob : item));
        setJobs(nextJobs);
        setSelectedJob(nextJob);
        saveJobs(nextJobs);
      } else {
        const nextJob = authorizeLocalJobPayment(job.id);
        const nextJobs = readJobs();
        setJobs(nextJobs);
        setSelectedJob(nextJob);
      }
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to authorize payment.");
    } finally {
      setPaymentSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="app-shell loading-shell">
        <div className="app-panel app-loading-card">Loading product shell...</div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="app-shell loading-shell">
        <section className="app-panel onboarding-guard">
          <p className="eyebrow">Business onboarding required</p>
          <h1>Start with the operating profile.</h1>
          <p>
            This dashboard is wired for business users. Complete the staged onboarding first, then come back here to create deliveries and review payment state.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/get-started">
              Go to Get Started
            </Link>
            <Link className="button button-secondary" href="/demo">
              View Demo Overview
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const job = props.view === "job-detail" ? selectedJob : null;
  const recentJobs = jobs.slice(0, 5);

  return (
    <main className="app-shell">
      <header className="app-topbar app-panel">
        <div>
          <p className="eyebrow">Business workspace</p>
          <h1>{profile.businessName || "ShipWright dashboard"}</h1>
          <p className="section-copy">Dispatch deliveries, watch payment state, and keep the next handoff visible.</p>
        </div>
        <nav className="app-nav" aria-label="App navigation">
          <Link className={props.view === "home" ? "app-nav-link active" : "app-nav-link"} href="/app">
            Overview
          </Link>
          <Link className={props.view !== "home" ? "app-nav-link active" : "app-nav-link"} href="/app/jobs">
            Jobs
          </Link>
          <Link className="app-nav-link" href="/">
            Marketing site
          </Link>
        </nav>
      </header>

      <section className="app-grid">
        <aside className="app-sidebar">
          <div className="app-panel sidebar-card">
            <p className="eyebrow">Workspace</p>
            <h2>{profile.contactName}</h2>
            <p>{profile.email}</p>
            <p>{profile.operatingCity}</p>
            <div className="mode-switch">
              <button
                className={`mode-chip ${appMode === "staged" ? "mode-chip-active" : ""}`}
                onClick={() => setAppMode("staged")}
                type="button"
              >
                Staged mode
              </button>
              <button
                className={`mode-chip ${appMode === "live" ? "mode-chip-active" : ""}`}
                disabled={!profile.authToken}
                onClick={() => setAppMode("live")}
                type="button"
              >
                Live API mode
              </button>
            </div>
            <p className="support-note">
              Staged mode is fully usable without auth. Live mode calls the real quote, job, tracking, and payment endpoints with your staging token.
            </p>
          </div>

          <div className="app-panel sidebar-card">
            <p className="eyebrow">Live API settings</p>
            <label>
              <span>API base URL</span>
              <input
                onChange={(event) => updateProfileField("apiBaseUrl", event.target.value)}
                value={profile.apiBaseUrl}
              />
            </label>
            <label>
              <span>Bearer token</span>
              <textarea
                onChange={(event) => updateProfileField("authToken", event.target.value)}
                rows={4}
                value={profile.authToken}
              />
            </label>
            <div className="form-grid-two compact-grid">
              <label>
                <span>Org ID</span>
                <input onChange={(event) => updateProfileField("orgId", event.target.value)} value={profile.orgId} />
              </label>
              <label>
                <span>Consumer ID</span>
                <input onChange={(event) => updateProfileField("consumerId", event.target.value)} value={profile.consumerId} />
              </label>
            </div>
            <button className="button button-secondary button-block" onClick={() => void refreshLiveJobs(profile)} type="button">
              Refresh Live Jobs
            </button>
          </div>
        </aside>

        <div className="app-main">
          <section className="metrics-grid">
            <article className="app-panel metric-card">
              <span className="metric-label">Connection mode</span>
              <strong>{appMode === "live" ? "Live API" : "Staged shell"}</strong>
              <p>{appMode === "live" ? "Using backend quote, job, tracking, and payment reads." : "Using local staged state until auth is connected."}</p>
            </article>
            <article className="app-panel metric-card">
              <span className="metric-label">Jobs in workspace</span>
              <strong>{overview.totalJobs}</strong>
              <p>{overview.liveJobs} live-backed jobs, {overview.totalJobs - overview.liveJobs} staged jobs.</p>
            </article>
            <article className="app-panel metric-card">
              <span className="metric-label">Payment readiness</span>
              <strong>{overview.authorizedJobs}</strong>
              <p>Jobs with authorized or captured payment.</p>
            </article>
          </section>

          {error ? <div className="app-panel form-error-banner">{error}</div> : null}

          {(props.view === "home" || props.view === "jobs") ? (
            <section className="dashboard-stack">
              <div className="app-panel compose-card">
                <div className="panel-heading-row">
                  <div>
                    <p className="eyebrow">Create delivery</p>
                    <h2>Quote, request, and move into payment readiness.</h2>
                  </div>
                  <span className={`status-badge ${appMode === "live" ? "status-positive" : "status-neutral"}`}>
                    {appMode === "live" ? "Live backend enabled" : "Staged local flow"}
                  </span>
                </div>
                <form className="compose-form" onSubmit={handleCreateDelivery}>
                  <div className="form-grid-two">
                    <label>
                      <span>Pickup address</span>
                      <input
                        onChange={(event) => setDeliveryForm((current) => ({ ...current, pickupAddress: event.target.value }))}
                        value={deliveryForm.pickupAddress}
                      />
                    </label>
                    <label>
                      <span>Drop address</span>
                      <input
                        onChange={(event) => setDeliveryForm((current) => ({ ...current, dropoffAddress: event.target.value }))}
                        value={deliveryForm.dropoffAddress}
                      />
                    </label>
                  </div>
                  <div className="form-grid-three">
                    <label>
                      <span>Distance (miles)</span>
                      <input
                        max="12"
                        min="0.1"
                        onChange={(event) => setDeliveryForm((current) => ({ ...current, distanceMiles: Number(event.target.value) }))}
                        step="0.1"
                        type="number"
                        value={deliveryForm.distanceMiles}
                      />
                    </label>
                    <label>
                      <span>ETA (minutes)</span>
                      <input
                        min="1"
                        onChange={(event) => setDeliveryForm((current) => ({ ...current, etaMinutes: Number(event.target.value) }))}
                        step="1"
                        type="number"
                        value={deliveryForm.etaMinutes}
                      />
                    </label>
                    <label>
                      <span>Vehicle</span>
                      <select
                        onChange={(event) => setDeliveryForm((current) => ({ ...current, vehicleType: event.target.value as VehicleType }))}
                        value={deliveryForm.vehicleType}
                      >
                        <option value="BIKE">Bike</option>
                        <option value="CAR">Car</option>
                      </select>
                    </label>
                  </div>
                  <div className="form-grid-two">
                    <label>
                      <span>Pickup coordinates</span>
                      <div className="coordinate-grid">
                        <input
                          onChange={(event) => setDeliveryForm((current) => ({ ...current, pickupLatitude: Number(event.target.value) }))}
                          step="0.0001"
                          type="number"
                          value={deliveryForm.pickupLatitude}
                        />
                        <input
                          onChange={(event) => setDeliveryForm((current) => ({ ...current, pickupLongitude: Number(event.target.value) }))}
                          step="0.0001"
                          type="number"
                          value={deliveryForm.pickupLongitude}
                        />
                      </div>
                    </label>
                    <label>
                      <span>Drop coordinates</span>
                      <div className="coordinate-grid">
                        <input
                          onChange={(event) => setDeliveryForm((current) => ({ ...current, dropoffLatitude: Number(event.target.value) }))}
                          step="0.0001"
                          type="number"
                          value={deliveryForm.dropoffLatitude}
                        />
                        <input
                          onChange={(event) => setDeliveryForm((current) => ({ ...current, dropoffLongitude: Number(event.target.value) }))}
                          step="0.0001"
                          type="number"
                          value={deliveryForm.dropoffLongitude}
                        />
                      </div>
                    </label>
                  </div>
                  <div className="compose-actions">
                    <button className="button button-primary" disabled={submitting} type="submit">
                      {submitting ? "Creating delivery..." : "Create Delivery Request"}
                    </button>
                    <p className="support-note">
                      {appMode === "live"
                        ? "Live mode calls quote, job create, payment read, and tracking endpoints."
                        : "Staged mode mirrors the delivery and payment flow locally until auth is connected."}
                    </p>
                  </div>
                </form>
              </div>

              <div className="app-panel jobs-panel">
                <div className="panel-heading-row">
                  <div>
                    <p className="eyebrow">Jobs</p>
                    <h2>{props.view === "home" ? "Recent deliveries" : "Workspace jobs"}</h2>
                  </div>
                  <Link className="button button-secondary" href="/app/jobs">
                    Open jobs view
                  </Link>
                </div>
                {recentJobs.length === 0 ? (
                  <div className="empty-state">
                    <strong>No deliveries yet.</strong>
                    <p>Create the first request above to generate quote, tracking, and payment state.</p>
                  </div>
                ) : (
                  <div className="jobs-list">
                    {recentJobs.map((item) => (
                      <Link className="job-row" href={`/app/jobs/${item.id}`} key={item.id}>
                        <div>
                          <strong>{item.pickupAddress}</strong>
                          <p>{item.dropoffAddress}</p>
                        </div>
                        <div className="job-row-meta">
                          <span className={`status-badge ${statusTone(item.status)}`}>{item.status.replace(/_/g, " ")}</span>
                          <span>{formatCurrency(item.customerTotalCents, item.payment.currency)}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {props.view === "job-detail" ? (
            job ? (
              <section className="dashboard-stack">
                <div className="app-panel detail-hero">
                  <div>
                    <p className="eyebrow">Job detail</p>
                    <h2>{job.pickupAddress}</h2>
                    <p className="section-copy">{job.dropoffAddress}</p>
                  </div>
                  <div className="detail-statuses">
                    <span className={`status-badge ${statusTone(job.status)}`}>{job.status.replace(/_/g, " ")}</span>
                    <span className={`status-badge ${statusTone(job.payment.status)}`}>{job.payment.status.replace(/_/g, " ")}</span>
                  </div>
                </div>

                <div className="detail-grid">
                  <article className="app-panel detail-card">
                    <p className="eyebrow">Tracking</p>
                    <h3>Live delivery view</h3>
                    <dl className="detail-list">
                      <div>
                        <dt>Distance</dt>
                        <dd>{job.distanceMiles.toFixed(1)} miles</dd>
                      </div>
                      <div>
                        <dt>ETA</dt>
                        <dd>{job.etaMinutes} minutes</dd>
                      </div>
                      <div>
                        <dt>Driver</dt>
                        <dd>{job.tracking.assignedDriverName ?? "Awaiting assignment"}</dd>
                      </div>
                      <div>
                        <dt>Latest coordinates</dt>
                        <dd>
                          {job.tracking.latestLocation
                            ? `${job.tracking.latestLocation.latitude.toFixed(4)}, ${job.tracking.latestLocation.longitude.toFixed(4)}`
                            : "No live coordinates yet"}
                        </dd>
                      </div>
                    </dl>
                    <div className="timeline-list">
                      {job.tracking.timeline.length === 0 ? (
                        <p className="support-note">Tracking events will appear here as dispatch and delivery progress advance.</p>
                      ) : (
                        job.tracking.timeline.map((item) => (
                          <div className="timeline-row" key={item.id}>
                            <strong>{item.eventType.replace(/_/g, " ")}</strong>
                            <span>{formatDateTime(item.createdAt)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </article>

                  <article className="app-panel detail-card">
                    <p className="eyebrow">Payment state</p>
                    <h3>Authorization and readiness</h3>
                    <dl className="detail-list">
                      <div>
                        <dt>Customer total</dt>
                        <dd>{formatCurrency(job.customerTotalCents, job.payment.currency)}</dd>
                      </div>
                      <div>
                        <dt>Platform fee</dt>
                        <dd>{formatCurrency(job.platformFeeCents, job.payment.currency)}</dd>
                      </div>
                      <div>
                        <dt>Driver payout</dt>
                        <dd>{formatCurrency(job.driverPayoutGrossCents, job.payment.currency)}</dd>
                      </div>
                      <div>
                        <dt>Authorized</dt>
                        <dd>{formatCurrency(job.payment.amountAuthorizedCents, job.payment.currency)}</dd>
                      </div>
                    </dl>
                    <label>
                      <span>Payment method ID</span>
                      <input
                        onChange={(event) => setPaymentMethodId(event.target.value)}
                        placeholder="pm_card_visa"
                        value={paymentMethodId}
                      />
                    </label>
                    <div className="compose-actions">
                      <button
                        className="button button-primary"
                        disabled={paymentSubmitting || job.payment.status === "AUTHORIZED" || job.payment.status === "CAPTURED"}
                        onClick={() => void handleAuthorizePayment(job)}
                        type="button"
                      >
                        {paymentSubmitting ? "Authorizing..." : "Authorize Payment"}
                      </button>
                      <p className="support-note">
                        The button calls the backend payment authorization endpoint in live mode. In staged mode it advances the local payment state so the UI remains testable.
                      </p>
                    </div>
                    {job.payment.lastError ? <p className="form-error">{job.payment.lastError}</p> : null}
                  </article>
                </div>
              </section>
            ) : (
              <div className="app-panel empty-state">
                <strong>Job not found.</strong>
                <p>Return to the jobs list and create or select another delivery request.</p>
              </div>
            )
          ) : null}
        </div>
      </section>
    </main>
  );
}
