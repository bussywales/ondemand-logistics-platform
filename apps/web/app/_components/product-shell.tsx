"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { PaymentMethodForm, isStripeFrontendConfigured, type CollectedPaymentMethod } from "./payment-method-form";
import { useBusinessAuth } from "./business-auth-provider";
import {
  authorizePayment,
  cancelJob,
  createLiveJob,
  getLiveJob,
  listLiveJobs,
  reassignDriver,
  retryDispatch
} from "../_lib/api";
import {
  formatCurrency,
  formatDateTime,
  type AppJob,
  type BusinessSession,
  type DeliveryFormInput,
  type VehicleType
} from "../_lib/product-state";
import {
  getDispatchIntelligence,
  getJobShortId,
  shouldShowInReviewQueue,
  sortReviewQueue
} from "../_lib/dispatch-intelligence";
import { getPaymentPanelModel } from "../_lib/payment-ui";

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

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function statusTone(status: AppJob["status"] | AppJob["payment"]["status"]) {
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

function summarizeDriver(job: AppJob) {
  if (!job.tracking.assignedDriverName) {
    return "No driver assigned";
  }

  return `${job.tracking.assignedDriverName} · ${job.vehicleRequired}`;
}

function attentionTone(level: AppJob["attentionLevel"]) {
  if (level === "BLOCKER") {
    return "status-negative";
  }

  if (level === "RISK") {
    return "status-live";
  }

  return "status-neutral";
}

function severityTone(level: "BLOCKER" | "RISK" | "NORMAL" | "INFO") {
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

function queueStateCopy(kind: "active" | "attention" | "all") {
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

function QueueEmptyState(props: { copy: { title: string; body: string } }) {
  return (
    <div className="ops-empty-state ops-queue-empty">
      <strong>{props.copy.title}</strong>
      <p>{props.copy.body}</p>
    </div>
  );
}

export function ProductShell(props: ProductShellProps) {
  const router = useRouter();
  const { status, session, signOut, refreshBusinessSession } = useBusinessAuth();
  const [jobs, setJobs] = useState<AppJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<AppJob | null>(null);
  const [deliveryForm, setDeliveryForm] = useState<DeliveryFormInput>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collectedPaymentMethod, setCollectedPaymentMethod] = useState<CollectedPaymentMethod | null>(null);
  const [reassignDriverId, setReassignDriverId] = useState("");
  const [cancelReason, setCancelReason] = useState("Operator cancelled");

  useEffect(() => {
    if (!session) {
      return;
    }

    void refreshJobs(session);
  }, [session?.accessToken]);

  useEffect(() => {
    if (!props.jobId || !session) {
      setSelectedJob(null);
      return;
    }

    void refreshLiveJob(props.jobId, session);
  }, [props.jobId, session?.accessToken]);

  useEffect(() => {
    setCollectedPaymentMethod(null);
  }, [props.jobId]);

  const workspaceSummary = useMemo(() => {
    const activeJobs = jobs.filter((job) =>
      ["REQUESTED", "ASSIGNED", "EN_ROUTE_PICKUP", "PICKED_UP", "EN_ROUTE_DROP"].includes(job.status)
    ).length;

    return {
      orgName: session?.context.currentOrg?.name ?? "No org",
      activeJobs,
      totalJobs: jobs.length
    };
  }, [jobs, session]);

  const activeJobs = useMemo(
    () =>
      jobs
        .filter((job) =>
          ["REQUESTED", "ASSIGNED", "EN_ROUTE_PICKUP", "PICKED_UP", "EN_ROUTE_DROP"].includes(job.status)
        )
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [jobs]
  );

  const attentionJobs = useMemo(
    () =>
      jobs
        .map((job) => ({ job, intelligence: getDispatchIntelligence(job) }))
        .filter((item) => shouldShowInReviewQueue(item.intelligence))
        .sort(sortReviewQueue),
    [jobs]
  );

  function syncJob(nextJob: AppJob) {
    setSelectedJob(nextJob);
    setJobs((current) => current.map((item) => (item.id === nextJob.id ? nextJob : item)));
  }

  async function refreshJobs(currentSession: NonNullable<typeof session>) {
    try {
      const liveJobs = await listLiveJobs(currentSession);
      setJobs(liveJobs);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to load operations workspace.");
    }
  }

  async function refreshLiveJob(jobId: string, currentSession: BusinessSession) {
    try {
      const job = await getLiveJob(currentSession, jobId);
      setSelectedJob(job);
      setJobs((current) =>
        [job, ...current.filter((item) => item.id !== job.id)].sort((left, right) =>
          right.createdAt.localeCompare(left.createdAt)
        )
      );
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to load job.");
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

      setJobs((current) =>
        [created, ...current.filter((item) => item.id !== created.id)].sort((left, right) =>
          right.createdAt.localeCompare(left.createdAt)
        )
      );
      router.push(`/app/jobs/${created.id}`);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to create delivery.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAuthorizePayment(job: AppJob) {
    if (!session || !collectedPaymentMethod) {
      return;
    }

    setPaymentSubmitting(true);
    setError(null);

    try {
      const payment = await authorizePayment(session, job.id, collectedPaymentMethod.id);
      const nextJob = { ...job, payment: { ...job.payment, ...payment } };
      syncJob(nextJob);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to authorize payment.");
    } finally {
      setPaymentSubmitting(false);
    }
  }

  async function handleRetryDispatch(job: AppJob) {
    if (!session) {
      return;
    }

    setActionSubmitting(true);
    setError(null);

    try {
      const nextJob = await retryDispatch(session, job.id);
      syncJob(nextJob);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to retry dispatch.");
    } finally {
      setActionSubmitting(false);
    }
  }

  async function handleReassignDriver(job: AppJob) {
    if (!session) {
      return;
    }

    setActionSubmitting(true);
    setError(null);

    try {
      const nextJob = await reassignDriver(session, job.id, reassignDriverId.trim());
      syncJob(nextJob);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to reassign driver.");
    } finally {
      setActionSubmitting(false);
    }
  }

  async function handleCancelJob(job: AppJob) {
    if (!session) {
      return;
    }

    setActionSubmitting(true);
    setError(null);

    try {
      const nextJob = await cancelJob(session, job.id, cancelReason.trim());
      syncJob(nextJob);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to cancel job.");
    } finally {
      setActionSubmitting(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    setJobs([]);
    setSelectedJob(null);
    router.push("/get-started");
  }

  if (status === "loading") {
    return (
      <main className="app-shell loading-shell">
        <section className="ops-empty-state">
          <strong>Loading operations console</strong>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="app-shell loading-shell">
        <section className="ops-empty-state">
          <p className="eyebrow">Business onboarding required</p>
          <h1>Sign in before using operations.</h1>
          <p>Open onboarding, create or resume the operator account, then return here.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/get-started">
              Go to Get Started
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!session.context.currentOrg) {
    return (
      <main className="app-shell loading-shell">
        <section className="ops-empty-state">
          <p className="eyebrow">Business org missing</p>
          <h1>Finish org setup before using operations.</h1>
          <p>The account is authenticated but not attached to a business operator membership yet.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/get-started">
              Complete Onboarding
            </Link>
            <button className="button button-secondary" onClick={() => void handleSignOut()} type="button">
              Sign Out
            </button>
          </div>
        </section>
      </main>
    );
  }

  const job = props.view === "job-detail" ? selectedJob : null;
  const jobDecision = job ? getDispatchIntelligence(job) : null;
  const paymentPanel =
    job && session
      ? getPaymentPanelModel({
          payment: job.payment,
          stripeEnabled: isStripeFrontendConfigured(),
          hasCollectedPaymentMethod: Boolean(collectedPaymentMethod)
        })
      : null;
  const jobsToRender = jobs.slice(0, 20);

  return (
    <main className="app-shell ops-shell">
      <header className="ops-topbar">
        <div className="ops-branding">
          <BrandLogo href="/" mode="responsive" />
          <p className="eyebrow">Operations console</p>
          <h1>{workspaceSummary.orgName}</h1>
        </div>
        <div className="ops-topbar-actions">
          <button
            className="button button-secondary"
            onClick={() =>
              void refreshBusinessSession().then((nextSession) => {
                if (nextSession) {
                  return refreshJobs(nextSession);
                }
              })
            }
            type="button"
          >
            Refresh
          </button>
          <button className="button button-secondary" onClick={() => void handleSignOut()} type="button">
            Sign Out
          </button>
        </div>
      </header>

      <section className="ops-layout">
        <aside className="ops-sidebar">
          <nav className="ops-nav" aria-label="Workspace navigation">
            <Link className={props.view === "home" ? "ops-nav-link active" : "ops-nav-link"} href="/app">
              Operations
            </Link>
            <Link className={props.view !== "home" ? "ops-nav-link active" : "ops-nav-link"} href="/app/jobs">
              Jobs
            </Link>
            <Link className="ops-nav-link" href="/app/restaurant">
              Restaurant
            </Link>
          </nav>

          <section className="ops-sidebar-section">
            <span className="ops-section-label">Operator</span>
            <strong>{session.context.displayName}</strong>
            <p>{session.context.email}</p>
          </section>

          <section className="ops-sidebar-section">
            <span className="ops-section-label">Workspace</span>
            <div className="ops-summary-list">
              <div>
                <strong>{workspaceSummary.activeJobs}</strong>
                <span>Active</span>
              </div>
              <div>
                <strong>{attentionJobs.length}</strong>
                <span>Attention</span>
              </div>
              <div>
                <strong>{workspaceSummary.totalJobs}</strong>
                <span>Total</span>
              </div>
            </div>
          </section>

          <section className="ops-sidebar-section ops-sidebar-live">
            <span className="ops-section-label">Live posture</span>
            <strong>{attentionJobs.length > 0 ? "Review required" : "Stable"}</strong>
            <p>
              {attentionJobs.length > 0
                ? "Open the review queue and clear blockers before creating more work."
                : "Queues are in normal operating range."}
            </p>
          </section>
        </aside>

        <div className="ops-main">
          {error ? <div className="form-error-banner">{error}</div> : null}

          {props.view === "home" ? (
            <section className="ops-stack">
              <section className="ops-section ops-queue-section">
                <div className="ops-section-header">
                  <div>
                    <p className="eyebrow">Operations</p>
                    <h2>Active queue</h2>
                    <p className="ops-detail-note">Live work that is requested, assigned, or moving.</p>
                  </div>
                  <div className="ops-header-actions">
                    <span className="ops-count-pill">{activeJobs.length} active</span>
                    <Link className="button button-secondary" href="/app/jobs">
                      Open Jobs
                    </Link>
                  </div>
                </div>

                {activeJobs.length === 0 ? (
                  <QueueEmptyState copy={queueStateCopy("active")} />
                ) : (
                  <div className="jobs-table" role="table" aria-label="Active jobs">
                    <div className="jobs-table-head" role="row">
                      <span>Job</span>
                      <span>Status</span>
                      <span>Route</span>
                      <span>Driver</span>
                      <span>ETA</span>
                      <span>Action</span>
                    </div>
                    {activeJobs.map((item) => (
                      <Link className="jobs-table-row" href={`/app/jobs/${item.id}`} key={item.id} role="row">
                        <div className="jobs-cell jobs-cell-id">
                          <strong>{item.id}</strong>
                          <span>{formatDateTime(item.createdAt)}</span>
                        </div>
                        <div className="jobs-cell">
                          <span className={`status-badge ${statusTone(item.status)}`}>
                            {formatStatusLabel(item.status)}
                          </span>
                        </div>
                        <div className="jobs-cell jobs-cell-route">
                          <strong>{item.pickupAddress}</strong>
                          <span>to {item.dropoffAddress}</span>
                        </div>
                        <div className="jobs-cell">
                          <strong>{summarizeDriver(item)}</strong>
                        </div>
                        <div className="jobs-cell">
                          <strong>{item.etaMinutes} min</strong>
                          <span>{item.distanceMiles.toFixed(1)} mi</span>
                        </div>
                        <div className="jobs-cell jobs-cell-action">
                          <span>Track</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section className="ops-section ops-queue-section ops-review-section">
                <div className="ops-section-header">
                  <div>
                    <p className="eyebrow">Attention</p>
                    <h2>Needs review</h2>
                    <p className="ops-detail-note">Failed dispatches, no-driver states, and delay signals.</p>
                  </div>
                  <span className={`ops-count-pill ${attentionJobs.length > 0 ? "ops-count-pill-alert" : ""}`}>
                    {attentionJobs.length} open
                  </span>
                </div>

                {attentionJobs.length === 0 ? (
                  <QueueEmptyState copy={queueStateCopy("attention")} />
                ) : (
                  <div className="attention-list">
                    {attentionJobs.map(({ job: item, intelligence }) => (
                      <article
                        className={`attention-row attention-queue-row attention-severity-${intelligence.severity.toLowerCase()}`}
                        key={item.id}
                      >
                        <div className="attention-copy">
                          <div className="attention-title-row">
                            <span className={`status-badge ${severityTone(intelligence.severity)}`}>
                              {intelligence.severity}
                            </span>
                            <strong>{getJobShortId(item.id)}</strong>
                            <span>{formatStatusLabel(item.status)}</span>
                          </div>
                          <h3>{intelligence.currentIssue}</h3>
                          <dl className="attention-facts">
                            <div>
                              <dt>Diagnosis</dt>
                              <dd>{intelligence.diagnosis}</dd>
                            </div>
                            <div>
                              <dt>Impact</dt>
                              <dd>{intelligence.impact}</dd>
                            </div>
                            <div>
                              <dt>Suggested action</dt>
                              <dd>{intelligence.explanation}</dd>
                            </div>
                          </dl>
                        </div>
                        <div className="attention-actions">
                          {intelligence.recommendedActionType === "RETRY_DISPATCH" ? (
                            <button
                              className="button button-primary"
                              disabled={actionSubmitting}
                              onClick={() => void handleRetryDispatch(item)}
                              type="button"
                            >
                              {actionSubmitting ? "Retrying..." : intelligence.recommendedActionLabel}
                            </button>
                          ) : null}
                          <Link className="button button-secondary" href={`/app/jobs/${item.id}`}>
                            View job
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </section>
          ) : null}

          {props.view === "jobs" ? (
            <section className="ops-stack">
              <section className="ops-section ops-creation-panel">
                <div className="ops-section-header">
                  <div>
                    <p className="eyebrow">Jobs</p>
                    <h2>Create delivery</h2>
                    <p className="ops-detail-note">Enter the operational facts first. Coordinates stay available for controlled pilot overrides.</p>
                  </div>
                </div>

                <form className="ops-form" onSubmit={handleCreateDelivery}>
                  <div className="form-grid-two">
                    <label>
                      <span>Pickup</span>
                      <input
                        onChange={(event) =>
                          setDeliveryForm((current) => ({ ...current, pickupAddress: event.target.value }))
                        }
                        value={deliveryForm.pickupAddress}
                      />
                    </label>
                    <label>
                      <span>Drop</span>
                      <input
                        onChange={(event) =>
                          setDeliveryForm((current) => ({ ...current, dropoffAddress: event.target.value }))
                        }
                        value={deliveryForm.dropoffAddress}
                      />
                    </label>
                  </div>

                  <div className="form-grid-three">
                    <label>
                      <span>Estimated distance</span>
                      <input
                        max="12"
                        min="0.1"
                        onChange={(event) =>
                          setDeliveryForm((current) => ({ ...current, distanceMiles: Number(event.target.value) }))
                        }
                        step="0.1"
                        type="number"
                        value={deliveryForm.distanceMiles}
                      />
                    </label>
                    <label>
                      <span>Estimated ETA</span>
                      <input
                        min="1"
                        onChange={(event) =>
                          setDeliveryForm((current) => ({ ...current, etaMinutes: Number(event.target.value) }))
                        }
                        step="1"
                        type="number"
                        value={deliveryForm.etaMinutes}
                      />
                    </label>
                    <label>
                      <span>Vehicle</span>
                      <select
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

                  <details className="ops-advanced-section">
                    <summary>
                      <span>Advanced location controls</span>
                      <small>Coordinate overrides for pilot testing</small>
                    </summary>
                    <div className="form-grid-two">
                      <label>
                        <span>Pickup coordinates</span>
                        <div className="coordinate-grid">
                          <input
                            aria-label="Pickup latitude"
                            onChange={(event) =>
                              setDeliveryForm((current) => ({ ...current, pickupLatitude: Number(event.target.value) }))
                            }
                            step="0.0001"
                            type="number"
                            value={deliveryForm.pickupLatitude}
                          />
                          <input
                            aria-label="Pickup longitude"
                            onChange={(event) =>
                              setDeliveryForm((current) => ({
                                ...current,
                                pickupLongitude: Number(event.target.value)
                              }))
                            }
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
                            aria-label="Drop latitude"
                            onChange={(event) =>
                              setDeliveryForm((current) => ({ ...current, dropoffLatitude: Number(event.target.value) }))
                            }
                            step="0.0001"
                            type="number"
                            value={deliveryForm.dropoffLatitude}
                          />
                          <input
                            aria-label="Drop longitude"
                            onChange={(event) =>
                              setDeliveryForm((current) => ({
                                ...current,
                                dropoffLongitude: Number(event.target.value)
                              }))
                            }
                            step="0.0001"
                            type="number"
                            value={deliveryForm.dropoffLongitude}
                          />
                        </div>
                      </label>
                    </div>
                  </details>

                  <div className="ops-actions">
                    <button className="button button-primary" disabled={submitting} type="submit">
                      {submitting ? "Creating delivery..." : "Create delivery"}
                    </button>
                  </div>
                </form>
              </section>

              <section className="ops-section ops-queue-section">
                <div className="ops-section-header">
                  <div>
                    <p className="eyebrow">Jobs</p>
                    <h2>All jobs</h2>
                    <p className="ops-detail-note">Full operational record for this workspace.</p>
                  </div>
                  <span className="ops-count-pill">{jobsToRender.length} shown</span>
                </div>

                {jobsToRender.length === 0 ? (
                  <QueueEmptyState copy={queueStateCopy("all")} />
                ) : (
                  <div className="jobs-table" role="table" aria-label="All jobs">
                    <div className="jobs-table-head" role="row">
                      <span>Job</span>
                      <span>Status</span>
                      <span>Pickup</span>
                      <span>Drop</span>
                      <span>ETA</span>
                      <span>Action</span>
                    </div>
                    {jobsToRender.map((item) => (
                      <Link className="jobs-table-row" href={`/app/jobs/${item.id}`} key={item.id} role="row">
                        <div className="jobs-cell jobs-cell-id">
                          <strong>{item.id}</strong>
                          <span>{formatDateTime(item.createdAt)}</span>
                        </div>
                        <div className="jobs-cell">
                          <span className={`status-badge ${statusTone(item.status)}`}>
                            {formatStatusLabel(item.status)}
                          </span>
                        </div>
                        <div className="jobs-cell jobs-cell-route">
                          <strong>{item.pickupAddress}</strong>
                        </div>
                        <div className="jobs-cell jobs-cell-route">
                          <strong>{item.dropoffAddress}</strong>
                        </div>
                        <div className="jobs-cell">
                          <strong>{item.etaMinutes} min</strong>
                          <span>{item.distanceMiles.toFixed(1)} mi</span>
                        </div>
                        <div className="jobs-cell jobs-cell-action">
                          <span>View</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </section>
          ) : null}

          {props.view === "job-detail" ? (
            job ? (
              <section className="ops-stack">
                <section
                  className={`ops-section ops-job-hero ops-decision-banner ${
                    jobDecision?.severity === "BLOCKER" ? "ops-job-hero-blocker" : ""
                  }`}
                >
                  <div className="ops-job-header">
                    <div>
                      <p className="eyebrow">Decision surface</p>
                      <h2>{jobDecision?.headline ?? "Job detail"}</h2>
                      <p className="ops-detail-note">{jobDecision?.explanation ?? "Review job state and next action."}</p>
                    </div>
                    <div className="ops-job-statuses">
                      <span className={`status-badge ${statusTone(job.status)}`}>
                        {formatStatusLabel(job.status)}
                      </span>
                      <span className={`status-badge ${attentionTone(job.attentionLevel)}`}>
                        {job.attentionLevel}
                      </span>
                      <span className={`status-badge ${statusTone(job.payment.status)}`}>
                        {formatStatusLabel(job.payment.status)}
                      </span>
                    </div>
                  </div>
                  {jobDecision ? (
                    <div className="ops-decision-grid">
                      <div>
                        <span className="ops-section-label">Current state</span>
                        <strong>{jobDecision.currentIssue}</strong>
                      </div>
                      <div>
                        <span className="ops-section-label">Operational meaning</span>
                        <strong>{jobDecision.diagnosis}</strong>
                      </div>
                      <div>
                        <span className="ops-section-label">Impact</span>
                        <strong>{jobDecision.impact}</strong>
                      </div>
                      <div>
                        <span className="ops-section-label">Next action</span>
                        <strong>{jobDecision.recommendedActionLabel}</strong>
                      </div>
                    </div>
                  ) : null}
                  <div className="ops-decision-actions">
                    {jobDecision?.recommendedActionType === "RETRY_DISPATCH" ? (
                      <button
                        className="button button-primary"
                        disabled={actionSubmitting}
                        onClick={() => void handleRetryDispatch(job)}
                        type="button"
                      >
                        {actionSubmitting ? "Retrying dispatch..." : "Retry dispatch"}
                      </button>
                    ) : null}
                    {jobDecision?.recommendedActionType === "AUTHORIZE_PAYMENT" ||
                    jobDecision?.recommendedActionType === "COLLECT_PAYMENT_METHOD" ? (
                      <a className="button button-primary" href="#payment">
                        Open payment
                      </a>
                    ) : null}
                    {jobDecision?.severity === "BLOCKER" ? (
                      <>
                        <a className="button button-secondary" href="#operator-controls">
                          Assign driver
                        </a>
                        <a className="button button-secondary" href="#operator-controls">
                          Cancel job
                        </a>
                      </>
                    ) : (
                      <a className="button button-secondary" href="#operator-controls">
                        Operator controls
                      </a>
                    )}
                  </div>
                </section>

                <div className="ops-detail-grid">
                  <section className="ops-section ops-zone">
                    <div className="ops-section-header">
                      <div>
                        <p className="eyebrow">Route</p>
                        <h2>Pickup and drop</h2>
                      </div>
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

                  <section className="ops-section ops-zone">
                    <div className="ops-section-header">
                      <div>
                        <p className="eyebrow">Driver</p>
                        <h2>Assignment</h2>
                      </div>
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

                <div className="ops-detail-grid">
                  <section className="ops-section ops-zone">
                    <div className="ops-section-header">
                      <div>
                        <p className="eyebrow">Dispatch</p>
                        <h2>Attempts</h2>
                      </div>
                    </div>
                    {job.tracking.dispatchAttempts.length === 0 ? (
                      <div className="ops-empty-state">
                        <strong>No attempts recorded</strong>
                        <p>Dispatch attempts will appear here as the job is offered or retried.</p>
                      </div>
                    ) : (
                      <div className="timeline-table" role="table" aria-label="Dispatch attempts">
                        {job.tracking.dispatchAttempts.map((attempt) => (
                          <div className="timeline-table-row" key={attempt.id} role="row">
                            <div>
                              <strong>
                                Attempt {attempt.attemptNumber} · {attempt.outcome}
                              </strong>
                              <span>
                                {attempt.driverDisplayName ?? attempt.driverId ?? "No driver"} · {attempt.triggerSource}
                              </span>
                            </div>
                            <span>{formatDateTime(attempt.createdAt)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="ops-section ops-zone">
                    <div className="ops-section-header">
                      <div>
                        <p className="eyebrow">Timeline</p>
                        <h2>Events</h2>
                      </div>
                    </div>
                    {job.tracking.timeline.length === 0 ? (
                      <div className="ops-empty-state">
                        <strong>No events yet</strong>
                        <p>Dispatch and delivery events will appear here as the job progresses.</p>
                      </div>
                    ) : (
                      <div className="timeline-table" role="table" aria-label="Timeline">
                        {job.tracking.timeline.map((item) => (
                          <div className="timeline-table-row" key={item.id} role="row">
                            <div>
                              <strong>{formatStatusLabel(item.eventType)}</strong>
                              <span>{item.summary}</span>
                            </div>
                            <span>{formatDateTime(item.createdAt)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                </div>

                <div className="ops-detail-grid">
                  <section className="ops-section ops-zone ops-payment-zone" id="payment">
                    <div className="ops-section-header">
                      <div>
                        <p className="eyebrow">Payment</p>
                        <h2>Status</h2>
                      </div>
                    </div>
                    <div className="ops-definition-list">
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
                    </div>

                    {paymentPanel ? (
                      <div className="payment-panel">
                        <div className="payment-panel-copy">
                          <strong>{paymentPanel.headline}</strong>
                          <p>{paymentPanel.detail}</p>
                        </div>

                        {collectedPaymentMethod ? (
                          <div className="inline-details payment-method-summary">
                            <span className="support-note">Collected payment method</span>
                            <strong>
                              {collectedPaymentMethod.brand?.toUpperCase() ?? "Card"}{" "}
                              {collectedPaymentMethod.last4 ? `•••• ${collectedPaymentMethod.last4}` : collectedPaymentMethod.id}
                            </strong>
                            <span>
                              {collectedPaymentMethod.expMonth && collectedPaymentMethod.expYear
                                ? `Expires ${String(collectedPaymentMethod.expMonth).padStart(2, "0")}/${String(collectedPaymentMethod.expYear).slice(-2)}`
                                : "Ready for authorization"}
                            </span>
                            {!paymentPanel.isFinal ? (
                              <button
                                className="text-action"
                                onClick={() => setCollectedPaymentMethod(null)}
                                type="button"
                              >
                                Replace payment method
                              </button>
                            ) : null}
                          </div>
                        ) : null}

                        {paymentPanel.requiresMethodCollection ? (
                          <PaymentMethodForm
                            disabled={paymentSubmitting}
                            email={session.email}
                            onCollected={(paymentMethod) => {
                              setCollectedPaymentMethod(paymentMethod);
                              setError(null);
                            }}
                          />
                        ) : null}

                        <div className="ops-actions">
                          <button
                            className="button button-primary"
                            disabled={paymentSubmitting || !paymentPanel.canAuthorize}
                            onClick={() => void handleAuthorizePayment(job)}
                            type="button"
                          >
                            {paymentSubmitting ? "Authorizing payment..." : "Authorize Payment"}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {job.payment.lastError ? <p className="form-error form-error-surface">{job.payment.lastError}</p> : null}
                  </section>
                </div>

                <section className="ops-section ops-zone ops-actions-zone" id="operator-controls">
                  <div className="ops-section-header">
                    <div>
                      <p className="eyebrow">Advanced</p>
                      <h2>Operator controls</h2>
                      <p className="ops-detail-note">Use these controls when the decision banner calls for direct intervention.</p>
                    </div>
                  </div>
                  <div className="ops-definition-list">
                    <div>
                      <dt>Retry dispatch</dt>
                      <dd>Re-open the job for dispatch when it is blocked or needs another attempt.</dd>
                    </div>
                  </div>
                  <div className="ops-actions ops-actions-inline">
                    <button
                      className="button button-secondary"
                      disabled={actionSubmitting}
                      onClick={() => void handleRetryDispatch(job)}
                      type="button"
                    >
                      Retry Dispatch
                    </button>
                  </div>

                  <label className="ops-field">
                    <span>Reassign to driver ID</span>
                    <input
                      onChange={(event) => setReassignDriverId(event.target.value)}
                      placeholder="driver UUID"
                      value={reassignDriverId}
                    />
                  </label>

                  <div className="ops-actions ops-actions-inline">
                    <button
                      className="button button-secondary"
                      disabled={actionSubmitting || !reassignDriverId.trim()}
                      onClick={() => void handleReassignDriver(job)}
                      type="button"
                    >
                      Reassign Driver
                    </button>
                  </div>

                  <label className="ops-field">
                    <span>Cancel reason</span>
                    <input onChange={(event) => setCancelReason(event.target.value)} value={cancelReason} />
                  </label>

                  <div className="ops-actions ops-actions-inline">
                    <button
                      className="button button-secondary"
                      disabled={actionSubmitting || !cancelReason.trim()}
                      onClick={() => void handleCancelJob(job)}
                      type="button"
                    >
                      Cancel Job
                    </button>
                  </div>
                </section>
              </section>
            ) : (
              <div className="ops-empty-state">
                <strong>Job not found</strong>
                <p>Return to the jobs list and open another delivery.</p>
              </div>
            )
          ) : null}
        </div>
      </section>
    </main>
  );
}
