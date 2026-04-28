"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { ShipWrightIcon } from "./shipwright-icon";
import { useBusinessAuth } from "./business-auth-provider";
import {
  acceptDriverOffer,
  createProofOfDelivery,
  createProofOfDeliveryUploadUrl,
  getCurrentDriverJob,
  getDriverState,
  listDriverOffers,
  rejectDriverOffer,
  transitionDriverJob,
  updateDriverAvailability
} from "../_lib/api";
import { getDriverBlockedReason, getDriverExecutionSteps } from "../_lib/driver-execution";
import {
  formatCurrency,
  formatDateTime,
  type BusinessSession,
  type DriverJob,
  type DriverOffer,
  type DriverState,
  type ProofOfDeliveryUploadUrl
} from "../_lib/product-state";

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function statusTone(status: string) {
  if (["ONLINE", "ASSIGNED", "EN_ROUTE_PICKUP", "PICKED_UP", "EN_ROUTE_DROP"].includes(status)) {
    return "status-live";
  }

  if (["DELIVERED", "COMPLETED", "ACCEPTED"].includes(status)) {
    return "status-positive";
  }

  if (["OFFLINE", "REJECTED", "EXPIRED", "CANCELLED", "DISPATCH_FAILED"].includes(status)) {
    return "status-negative";
  }

  return "status-neutral";
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function DriverBlockedState(props: { message: string; onSignOut: () => void }) {
  return (
    <main className="app-shell driver-shell driver-loading-shell">
      <section className="sw-command-surface driver-blocked-card">
        <span className="driver-hero-icon driver-hero-icon-warning" aria-hidden="true">
          <ShipWrightIcon name="warning" />
        </span>
        <p className="eyebrow">Driver access</p>
        <h1>Driver profile not ready</h1>
        <p>{props.message}</p>
        <div className="driver-action-row">
          <Link className="sw-button sw-button--primary button button-primary" href="/get-started">
            <ShipWrightIcon name="driver" />
            <span>Open onboarding</span>
          </Link>
          <button className="sw-button sw-button--secondary button button-secondary" onClick={props.onSignOut} type="button">
            Sign out
          </button>
        </div>
      </section>
    </main>
  );
}

function OfferCard(props: {
  offer: DriverOffer;
  busy: boolean;
  onAccept: (offer: DriverOffer) => void;
  onReject: (offer: DriverOffer) => void;
}) {
  return (
    <article className="sw-queue-row driver-offer-card">
      <div className="sw-queue-row-main">
        <div className="driver-offer-title">
          <span className="sw-icon-badge sw-icon-badge--info" aria-hidden="true">
            <ShipWrightIcon name="route" />
          </span>
          <div>
            <span className="ops-section-label">Offer {shortId(props.offer.offerId)}</span>
            <h3>{props.offer.pickupAddress}</h3>
            <p>to {props.offer.dropoffAddress}</p>
          </div>
        </div>
        <div className="driver-fact-grid">
          <div>
            <span>ETA</span>
            <strong>{props.offer.etaMinutes} min</strong>
          </div>
          <div>
            <span>Distance</span>
            <strong>{props.offer.distanceMiles.toFixed(1)} mi</strong>
          </div>
          <div>
            <span>Payout</span>
            <strong>{formatCurrency(props.offer.payoutGrossCents, "GBP")}</strong>
          </div>
          <div>
            <span>Expires</span>
            <strong>{formatDateTime(props.offer.expiresAt)}</strong>
          </div>
        </div>
      </div>
      <div className="sw-queue-row-actions driver-offer-actions">
        <button
          className="sw-button sw-button--primary button button-primary"
          disabled={props.busy}
          onClick={() => props.onAccept(props.offer)}
          type="button"
        >
          <ShipWrightIcon name="check" />
          <span>Accept</span>
        </button>
        <button
          className="sw-button sw-button--secondary button button-secondary"
          disabled={props.busy}
          onClick={() => props.onReject(props.offer)}
          type="button"
        >
          Reject
        </button>
      </div>
    </article>
  );
}

function ActiveJobPanel(props: {
  job: DriverJob;
  hasProofOfDelivery: boolean;
  podForm: { recipientName: string; deliveryNote: string; latitude: string; longitude: string };
  uploadUrl: ProofOfDeliveryUploadUrl | null;
  busy: boolean;
  onPodFormChange: (value: { recipientName: string; deliveryNote: string; latitude: string; longitude: string }) => void;
  onTransition: (transition: "en-route-pickup" | "picked-up" | "en-route-drop" | "delivered") => void;
  onCreatePod: () => void;
  onRequestUploadUrl: () => void;
}) {
  const steps = getDriverExecutionSteps(props.job, props.hasProofOfDelivery);
  const proofStepActive = steps.some((step) => step.key === "proof_of_delivery" && step.active);

  return (
    <section className="sw-operational-surface driver-active-job">
      <div className="driver-section-header">
        <span className="sw-icon-badge sw-icon-badge--info" aria-hidden="true">
          <ShipWrightIcon name="route" />
        </span>
        <div>
          <p className="eyebrow">Active job</p>
          <h2>Delivery {shortId(props.job.id)}</h2>
          <p>{props.job.pickupAddress} to {props.job.dropoffAddress}</p>
        </div>
        <span className={`status-badge status-with-icon ${statusTone(props.job.status)}`}>
          <ShipWrightIcon name="queue" />
          <span>{formatStatusLabel(props.job.status)}</span>
        </span>
      </div>

      <div className="driver-fact-grid driver-job-facts">
        <div>
          <span>Pickup</span>
          <strong>{props.job.pickupAddress}</strong>
        </div>
        <div>
          <span>Drop</span>
          <strong>{props.job.dropoffAddress}</strong>
        </div>
        <div>
          <span>ETA</span>
          <strong>{props.job.etaMinutes} min</strong>
        </div>
        <div>
          <span>Payout</span>
          <strong>{formatCurrency(props.job.driverPayoutGrossCents, "GBP")}</strong>
        </div>
      </div>

      <div className="driver-stepper" aria-label="Delivery progression">
        {steps.map((step, index) => (
          <div className={`driver-step ${step.complete ? "driver-step-complete" : ""} ${step.active ? "driver-step-active" : ""}`} key={step.key}>
            <span>{step.complete ? <ShipWrightIcon name="check" /> : index + 1}</span>
            <div>
              <strong>{step.label}</strong>
              <p>{step.description}</p>
            </div>
            {step.actionLabel && step.transition ? (
              <button
                className="sw-button sw-button--primary button button-primary"
                disabled={props.busy}
                onClick={() => props.onTransition(step.transition!)}
                type="button"
              >
                {props.busy ? "Updating..." : step.actionLabel}
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {proofStepActive ? (
        <section className="driver-pod-panel">
          <div>
            <p className="eyebrow">Proof of delivery</p>
            <h3>Record recipient details</h3>
            <p>Image upload is staged for pilot use. Record the POD details now; attach a photo URL only after upload is proven.</p>
          </div>
          <div className="driver-form-grid">
            <label className="sw-field">
              <span className="sw-label">Recipient name</span>
              <input
                className="sw-input"
                onChange={(event) => props.onPodFormChange({ ...props.podForm, recipientName: event.target.value })}
                placeholder="Taylor Smith"
                value={props.podForm.recipientName}
              />
            </label>
            <label className="sw-field">
              <span className="sw-label">Notes</span>
              <textarea
                className="sw-input"
                onChange={(event) => props.onPodFormChange({ ...props.podForm, deliveryNote: event.target.value })}
                placeholder="Left with reception"
                value={props.podForm.deliveryNote}
              />
            </label>
            <label className="sw-field">
              <span className="sw-label">Latitude optional</span>
              <input
                className="sw-input"
                onChange={(event) => props.onPodFormChange({ ...props.podForm, latitude: event.target.value })}
                placeholder="51.5254"
                value={props.podForm.latitude}
              />
            </label>
            <label className="sw-field">
              <span className="sw-label">Longitude optional</span>
              <input
                className="sw-input"
                onChange={(event) => props.onPodFormChange({ ...props.podForm, longitude: event.target.value })}
                placeholder="-0.1099"
                value={props.podForm.longitude}
              />
            </label>
          </div>
          {props.uploadUrl ? (
            <div className="driver-staged-upload">
              <strong>Upload URL created</strong>
              <p>Use this only after the file upload path is proven: {props.uploadUrl.storagePath}</p>
            </div>
          ) : null}
          <div className="driver-action-row">
            <button className="sw-button sw-button--secondary button button-secondary" disabled={props.busy} onClick={props.onRequestUploadUrl} type="button">
              Request optional image URL
            </button>
            <button className="sw-button sw-button--primary button button-primary" disabled={props.busy || props.podForm.recipientName.trim().length < 2} onClick={props.onCreatePod} type="button">
              <ShipWrightIcon name="document" />
              <span>{props.busy ? "Recording..." : "Record POD"}</span>
            </button>
          </div>
        </section>
      ) : null}
    </section>
  );
}

export function DriverShell() {
  const router = useRouter();
  const { status, session, signOut, refreshBusinessSession } = useBusinessAuth();
  const [driverState, setDriverState] = useState<DriverState | null>(null);
  const [offers, setOffers] = useState<DriverOffer[]>([]);
  const [currentJob, setCurrentJob] = useState<DriverJob | null>(null);
  const [hasProofOfDelivery, setHasProofOfDelivery] = useState(false);
  const [uploadUrl, setUploadUrl] = useState<ProofOfDeliveryUploadUrl | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [podForm, setPodForm] = useState({ recipientName: "", deliveryNote: "", latitude: "", longitude: "" });

  useEffect(() => {
    if (!session) {
      if (status !== "loading") {
        setLoading(false);
      }
      return;
    }

    void refreshDriverWorkspace(session);
  }, [session?.accessToken, status]);

  const blockedReason = useMemo(
    () => getDriverBlockedReason({ hasSession: Boolean(session), driverError: error }),
    [error, session]
  );

  async function refreshDriverWorkspace(currentSession: BusinessSession) {
    setLoading(true);
    setError(null);

    try {
      const [state, current, availableOffers] = await Promise.all([
        getDriverState(currentSession),
        getCurrentDriverJob(currentSession),
        listDriverOffers(currentSession)
      ]);
      setDriverState(state);
      setCurrentJob(current);
      setOffers(availableOffers);
      if (!current || current.id !== currentJob?.id) {
        setHasProofOfDelivery(false);
        setUploadUrl(null);
      }
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to load driver workspace.");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleAvailability() {
    if (!session || !driverState) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const next = await updateDriverAvailability(session, driverState.availability === "ONLINE" ? "OFFLINE" : "ONLINE");
      setDriverState(next);
      const nextOffers = await listDriverOffers(session).catch(() => offers);
      setOffers(nextOffers);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to update driver availability.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAcceptOffer(offer: DriverOffer) {
    if (!session) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await acceptDriverOffer(session, offer.offerId);
      await refreshDriverWorkspace(session);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to accept offer.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRejectOffer(offer: DriverOffer) {
    if (!session) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await rejectDriverOffer(session, offer.offerId);
      setOffers((current) => current.filter((item) => item.offerId !== offer.offerId));
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to reject offer.");
    } finally {
      setBusy(false);
    }
  }

  async function handleTransition(transition: "en-route-pickup" | "picked-up" | "en-route-drop" | "delivered") {
    if (!session || !currentJob) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const job = await transitionDriverJob(session, currentJob.id, transition);
      setCurrentJob(job.status === "DELIVERED" ? null : job);
      if (transition === "delivered") {
        setHasProofOfDelivery(false);
        setUploadUrl(null);
      }
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to update delivery step.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRequestUploadUrl() {
    if (!session || !currentJob) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const url = await createProofOfDeliveryUploadUrl(session, currentJob.id);
      setUploadUrl(url);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to create the optional POD upload URL.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreatePod() {
    if (!session || !currentJob) {
      return;
    }

    setBusy(true);
    setError(null);

    const latitude = Number(podForm.latitude);
    const longitude = Number(podForm.longitude);
    const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

    try {
      await createProofOfDelivery(session, currentJob.id, {
        recipientName: podForm.recipientName.trim(),
        deliveryNote: podForm.deliveryNote.trim() || null,
        coordinates: hasCoordinates ? { latitude, longitude } : null
      });
      setHasProofOfDelivery(true);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to record proof of delivery.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push("/get-started");
  }

  if (status === "loading" || loading) {
    return (
      <main className="app-shell driver-shell driver-loading-shell">
        <section className="sw-empty-state driver-empty-state">
          <strong className="sw-empty-title">Loading driver workspace</strong>
          <p className="sw-empty-copy">Checking Supabase session, driver profile, offers, and active job.</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return <DriverBlockedState message={blockedReason ?? "Sign in before using the driver execution app."} onSignOut={() => void handleSignOut()} />;
  }

  if (!driverState) {
    return <DriverBlockedState message={blockedReason ?? "Driver profile not ready. Dispatch access requires driver approval."} onSignOut={() => void handleSignOut()} />;
  }

  return (
    <main className="app-shell driver-shell">
      <header className="driver-topbar">
        <BrandLogo href="/" mode="responsive" />
        <div className="driver-topbar-actions">
          <button
            className="button button-secondary"
            onClick={() =>
              void refreshBusinessSession().then((nextSession) => {
                if (nextSession) {
                  return refreshDriverWorkspace(nextSession);
                }
              })
            }
            type="button"
          >
            Refresh
          </button>
          <button className="button button-secondary" onClick={() => void handleSignOut()} type="button">
            Sign out
          </button>
        </div>
      </header>

      <section className={`sw-command-surface driver-hero ${driverState.availability === "ONLINE" ? "driver-hero-online" : ""}`}>
        <div className="driver-hero-copy">
          <span className={`driver-hero-icon ${driverState.availability === "ONLINE" ? "driver-hero-icon-success" : "driver-hero-icon-warning"}`} aria-hidden="true">
            <ShipWrightIcon name={driverState.availability === "ONLINE" ? "check" : "driver"} />
          </span>
          <div>
            <p className="eyebrow">Driver execution</p>
            <h1>{driverState.availability === "ONLINE" ? "Online and ready" : "Offline"}</h1>
            <p>
              {currentJob
                ? "Complete the active delivery step by step."
                : driverState.availability === "ONLINE"
                  ? "New offers will appear as dispatch assigns work."
                  : "Go online to receive staged dispatch offers."}
            </p>
          </div>
        </div>
        <button className="sw-button sw-button--primary button button-primary driver-online-toggle" disabled={busy} onClick={() => void handleToggleAvailability()} type="button">
          <ShipWrightIcon name={driverState.availability === "ONLINE" ? "cancel" : "check"} />
          <span>{busy ? "Updating..." : driverState.availability === "ONLINE" ? "Go offline" : "Go online"}</span>
        </button>
      </section>

      {error && !blockedReason?.includes("Driver profile not ready") ? <div className="form-error-banner">{error}</div> : null}

      <section className="driver-grid">
        <div className="driver-main-stack">
          {currentJob ? (
            <ActiveJobPanel
              busy={busy}
              hasProofOfDelivery={hasProofOfDelivery}
              job={currentJob}
              onCreatePod={() => void handleCreatePod()}
              onPodFormChange={setPodForm}
              onRequestUploadUrl={() => void handleRequestUploadUrl()}
              onTransition={(transition) => void handleTransition(transition)}
              podForm={podForm}
              uploadUrl={uploadUrl}
            />
          ) : (
            <section className="sw-operational-surface driver-empty-state">
              <span className="empty-state-icon" aria-hidden="true">
                <ShipWrightIcon name="route" />
              </span>
              <strong>No active job</strong>
              <p>Accepted delivery work will appear here with the next operational step.</p>
            </section>
          )}
        </div>

        <aside className="driver-side-stack">
          <section className="sw-operational-surface driver-offers-panel">
            <div className="driver-section-header">
              <span className="sw-icon-badge sw-icon-badge--info" aria-hidden="true">
                <ShipWrightIcon name="queue" />
              </span>
              <div>
                <p className="eyebrow">Offers</p>
                <h2>Available work</h2>
              </div>
              <span className="ops-count-pill">{offers.length}</span>
            </div>
            {offers.length === 0 ? (
              <div className="sw-empty-state driver-inline-empty">
                <strong className="sw-empty-title">No offers available</strong>
                <p className="sw-empty-copy">Dispatch offers will appear here while you are online and eligible.</p>
              </div>
            ) : (
              <div className="driver-offer-list">
                {offers.map((offer) => (
                  <OfferCard busy={busy} key={offer.offerId} offer={offer} onAccept={handleAcceptOffer} onReject={handleRejectOffer} />
                ))}
              </div>
            )}
          </section>

          <section className="sw-supporting-surface driver-state-card">
            <p className="eyebrow">Driver state</p>
            <div className="ops-definition-list">
              <div>
                <span>Availability</span>
                <strong>{driverState.availability}</strong>
              </div>
              <div>
                <span>Available since</span>
                <strong>{driverState.availableSince ? formatDateTime(driverState.availableSince) : "Not online"}</strong>
              </div>
              <div>
                <span>Last location</span>
                <strong>{driverState.lastLocationAt ? formatDateTime(driverState.lastLocationAt) : "No live location"}</strong>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
