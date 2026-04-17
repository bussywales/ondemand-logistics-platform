"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { fetchBusinessContext } from "../_lib/auth";
import { authorizePayment, createLiveJob, getLiveJob, listLiveJobs } from "../_lib/api";
import {
  clearBusinessSession,
  formatCurrency,
  formatDateTime,
  readBusinessSession,
  saveBusinessSession,
  type AppJob,
  type BusinessSession,
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
  const [session, setSession] = useState<BusinessSession | null>(null);
  const [jobs, setJobs] = useState<AppJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<AppJob | null>(null);
  const [deliveryForm, setDeliveryForm] = useState<DeliveryFormInput>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState("pm_card_visa");

  useEffect(() => {
    const nextSession = readBusinessSession();
    setSession(nextSession);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    void refreshContextAndJobs(session);
  }, [session?.accessToken]);

  useEffect(() => {
    if (!props.jobId || !session) {
      setSelectedJob(null);
      return;
    }

    void refreshLiveJob(props.jobId, session);
  }, [props.jobId, session?.accessToken]);

  const overview = useMemo(() => {
    const authorizedJobs = jobs.filter((job) => job.payment.status === "AUTHORIZED" || job.payment.status === "CAPTURED").length;
    return {
      totalJobs: jobs.length,
      authorizedJobs,
      currentOrgName: session?.context.currentOrg?.name ?? "No org"
    };
  }, [jobs, session]);

  async function refreshContextAndJobs(currentSession: BusinessSession) {
    try {
      const context = await fetchBusinessContext(currentSession.accessToken);
      const nextSession = { ...currentSession, context };
      setSession(saveBusinessSession(nextSession));
      const liveJobs = await listLiveJobs(nextSession);
      setJobs(liveJobs);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to load business workspace.");
    }
  }

  async function refreshLiveJob(jobId: string, currentSession: BusinessSession) {
    try {
      const job = await getLiveJob(currentSession, jobId);
      setSelectedJob(job);
      setJobs((current) => {
        const nextJobs = [job, ...current.filter((item) => item.id !== job.id)].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
        return nextJobs;
      });
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to load the selected job.");
    }
  }

  async function handleCreateDelivery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const created = await createLiveJob(session, {
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

      setJobs((current) => [created, ...current.filter((item) => item.id !== created.id)].sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
      router.push(`/app/jobs/${created.id}`);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to create delivery.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAuthorizePayment(job: AppJob) {
    if (!session) {
      return;
    }

    setPaymentSubmitting(true);
    setError(null);

    try {
      const payment = await authorizePayment(session, job.id, paymentMethodId.trim());
      const nextJob = {
        ...job,
        payment: {
          ...job.payment,
          ...payment
        }
      };
      setSelectedJob(nextJob);
      setJobs((current) => current.map((item) => (item.id === job.id ? nextJob : item)));
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to authorize payment.");
    } finally {
      setPaymentSubmitting(false);
    }
  }

  function handleSignOut() {
    clearBusinessSession();
    setSession(null);
    setJobs([]);
    setSelectedJob(null);
    router.push("/get-started");
  }

  if (loading) {
    return (
      <main className="app-shell loading-shell">
        <div className="app-panel app-loading-card">Loading product shell...</div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="app-shell loading-shell">
        <section className="app-panel onboarding-guard">
          <p className="eyebrow">Business onboarding required</p>
          <h1>Sign in and create the business org first.</h1>
          <p>
            The dashboard now expects a real authenticated business session. Start from onboarding to create or resume the business operator account, then come back here.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/get-started">
              Go to Get Started
            </Link>
            <Link className="button button-secondary" href="/contact">
              Talk to Team
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!session.context.currentOrg) {
    return (
      <main className="app-shell loading-shell">
        <section className="app-panel onboarding-guard">
          <p className="eyebrow">Business org missing</p>
          <h1>Finish onboarding before using the dashboard.</h1>
          <p>
            The account is authenticated, but there is no business org membership yet. Return to onboarding to create the organization and operator membership.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/get-started">
              Complete Onboarding
            </Link>
            <button className="button button-secondary" onClick={handleSignOut} type="button">
              Sign Out
            </button>
          </div>
        </section>
      </main>
    );
  }

  const job = props.view === "job-detail" ? selectedJob : null;
  const recentJobs = jobs.slice(0, props.view === "home" ? 5 : 20);

  return (
    <main className="app-shell">
      <header className="app-topbar app-panel">
        <div>
          <p className="eyebrow">Business workspace</p>
          <h1>{overview.currentOrgName}</h1>
          <p className="section-copy">Dispatch deliveries, review tracking, and move jobs through payment authorization with real org access.</p>
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
            <p className="eyebrow">Authenticated operator</p>
            <h2>{session.context.displayName}</h2>
            <p>{session.context.email}</p>
            <p>{session.context.currentOrg.contactPhone ?? "Phone not set"}</p>
            <p>{session.context.currentOrg.city ?? "City not set"}</p>
            <p className="support-note">
              Org-backed access is active. Quotes, jobs, tracking, and payment reads are now coming from the real API using the stored session.
            </p>
            <button className="button button-secondary button-block" onClick={handleSignOut} type="button">
              Sign Out
            </button>
          </div>

          <div className="app-panel sidebar-card">
            <p className="eyebrow">Org summary</p>
            <label>
              <span>Organization</span>
              <input readOnly value={session.context.currentOrg.name} />
            </label>
            <label>
              <span>Contact email</span>
              <input readOnly value={session.context.currentOrg.contactEmail ?? session.context.email} />
            </label>
            <label>
              <span>Membership role</span>
              <input readOnly value={session.context.memberships[0]?.membership.role ?? "BUSINESS_OPERATOR"} />
            </label>
            <button className="button button-secondary button-block" onClick={() => void refreshContextAndJobs(session)} type="button">
              Refresh Workspace
            </button>
          </div>
        </aside>

        <div className="app-main">
          <section className="metrics-grid">
            <article className="app-panel metric-card">
              <span className="metric-label">Business org</span>
              <strong>{overview.currentOrgName}</strong>
              <p>Authenticated dashboard access is scoped to the onboarded operator membership.</p>
            </article>
            <article className="app-panel metric-card">
              <span className="metric-label">Jobs in workspace</span>
              <strong>{overview.totalJobs}</strong>
              <p>Org-scoped jobs loaded from the backend business jobs endpoint.</p>
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
                  <span className="status-badge status-positive">Real org-backed flow</span>
                </div>
                <form className="compose-form" onSubmit={handleCreateDelivery}>
                  <div className="form-grid-two">
                    <label>
                      <span>Pickup address</span>
                      <input onChange={(event) => setDeliveryForm((current) => ({ ...current, pickupAddress: event.target.value }))} value={deliveryForm.pickupAddress} />
                    </label>
                    <label>
                      <span>Drop address</span>
                      <input onChange={(event) => setDeliveryForm((current) => ({ ...current, dropoffAddress: event.target.value }))} value={deliveryForm.dropoffAddress} />
                    </label>
                  </div>
                  <div className="form-grid-three">
                    <label>
                      <span>Distance (miles)</span>
                      <input max="12" min="0.1" onChange={(event) => setDeliveryForm((current) => ({ ...current, distanceMiles: Number(event.target.value) }))} step="0.1" type="number" value={deliveryForm.distanceMiles} />
                    </label>
                    <label>
                      <span>ETA (minutes)</span>
                      <input min="1" onChange={(event) => setDeliveryForm((current) => ({ ...current, etaMinutes: Number(event.target.value) }))} step="1" type="number" value={deliveryForm.etaMinutes} />
                    </label>
                    <label>
                      <span>Vehicle</span>
                      <select onChange={(event) => setDeliveryForm((current) => ({ ...current, vehicleType: event.target.value as VehicleType }))} value={deliveryForm.vehicleType}>
                        <option value="BIKE">Bike</option>
                        <option value="CAR">Car</option>
                      </select>
                    </label>
                  </div>
                  <div className="form-grid-two">
                    <label>
                      <span>Pickup coordinates</span>
                      <div className="coordinate-grid">
                        <input onChange={(event) => setDeliveryForm((current) => ({ ...current, pickupLatitude: Number(event.target.value) }))} step="0.0001" type="number" value={deliveryForm.pickupLatitude} />
                        <input onChange={(event) => setDeliveryForm((current) => ({ ...current, pickupLongitude: Number(event.target.value) }))} step="0.0001" type="number" value={deliveryForm.pickupLongitude} />
                      </div>
                    </label>
                    <label>
                      <span>Drop coordinates</span>
                      <div className="coordinate-grid">
                        <input onChange={(event) => setDeliveryForm((current) => ({ ...current, dropoffLatitude: Number(event.target.value) }))} step="0.0001" type="number" value={deliveryForm.dropoffLatitude} />
                        <input onChange={(event) => setDeliveryForm((current) => ({ ...current, dropoffLongitude: Number(event.target.value) }))} step="0.0001" type="number" value={deliveryForm.dropoffLongitude} />
                      </div>
                    </label>
                  </div>
                  <div className="compose-actions">
                    <button className="button button-primary" disabled={submitting} type="submit">
                      {submitting ? "Creating delivery..." : "Create Delivery Request"}
                    </button>
                    <p className="support-note">This form now uses the onboarded org context automatically. No bearer token, org ID, or consumer ID fields are required in the UI.</p>
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
                    <p>Create the first request above to generate a live quote, job, tracking, and payment record.</p>
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
                        <dd>{job.tracking.latestLocation ? `${job.tracking.latestLocation.latitude.toFixed(4)}, ${job.tracking.latestLocation.longitude.toFixed(4)}` : "No live coordinates yet"}</dd>
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
                      <input onChange={(event) => setPaymentMethodId(event.target.value)} placeholder="pm_card_visa" value={paymentMethodId} />
                    </label>
                    <div className="compose-actions">
                      <button className="button button-primary" disabled={paymentSubmitting || job.payment.status === "AUTHORIZED" || job.payment.status === "CAPTURED"} onClick={() => void handleAuthorizePayment(job)} type="button">
                        {paymentSubmitting ? "Authorizing..." : "Authorize Payment"}
                      </button>
                      <p className="support-note">This button calls the real backend payment authorization endpoint using the authenticated business session.</p>
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
