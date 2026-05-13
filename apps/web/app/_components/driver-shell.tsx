"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { ContextualHelpLink } from "./help";
import { ProductUpdateAnnouncement } from "./product-updates";
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
import {
  getDriverActiveStep,
  getDriverBlockedState,
  getDriverExecutionSteps,
  getDriverHeroState,
  getDriverOfferEmptyState
} from "../_lib/driver-execution";
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
    return "sw-badge--info";
  }

  if (["DELIVERED", "COMPLETED", "ACCEPTED"].includes(status)) {
    return "sw-badge--success";
  }

  if (["OFFLINE", "REJECTED", "EXPIRED", "CANCELLED", "DISPATCH_FAILED"].includes(status)) {
    return "sw-badge--danger";
  }

  return "sw-badge--neutral";
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function formatVehicleLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function DriverBlockedState(props: {
  title: string;
  message: string;
  supporting: string;
  onSignOut: () => void;
}) {
  return (
    <main className="app-shell driver-shell driver-loading-shell">
      <section className="sw-command-surface driver-blocked-card">
        <span className="driver-hero-icon driver-hero-icon-warning" aria-hidden="true">
          <ShipWrightIcon name="warning" />
        </span>
        <p className="eyebrow">Driver access</p>
        <h1>{props.title}</h1>
        <p>{props.message}</p>
        <p className="driver-blocked-supporting">{props.supporting}</p>
        <div className="driver-action-row">
          <Link className="sw-button sw-button--primary button button-primary" href="/get-started">
            <ShipWrightIcon name="driver" />
            <span>Open onboarding</span>
          </Link>
          <button className="sw-button sw-button--secondary button button-secondary" onClick={props.onSignOut} type="button">
            Sign out
          </button>
          <ContextualHelpLink href="/help/driver" />
        </div>
      </section>
    </main>
  );
}

function OfferCard(props: {
  offer: DriverOffer;
  pendingAction: "accept" | "reject" | null;
  onAccept: (offer: DriverOffer) => void;
  onReject: (offer: DriverOffer) => void;
}) {
  return (
    <article className="sw-queue-row sw-list-row driver-offer-card">
      <div className="sw-queue-row-main">
        <div className="driver-offer-header">
          <div className="driver-offer-title">
            <span className="sw-icon-badge sw-icon-badge--info" aria-hidden="true">
              <ShipWrightIcon name="route" />
            </span>
            <div>
              <span className="ops-section-label">Offer {shortId(props.offer.offerId)}</span>
              <h3>Pickup to drop-off</h3>
              <p>Expires {formatDateTime(props.offer.expiresAt)}</p>
            </div>
          </div>
          <span className={`sw-badge ${statusTone(props.offer.status)}`}>
            <ShipWrightIcon name="queue" />
            <span>{formatStatusLabel(props.offer.status)}</span>
          </span>
        </div>

        <div className="driver-offer-route">
          <div className="driver-route-stop">
            <span className="driver-route-stop-label">Pickup</span>
            <strong>{props.offer.pickupAddress}</strong>
          </div>
          <span className="driver-route-arrow" aria-hidden="true">
            <ShipWrightIcon name="arrow" />
          </span>
          <div className="driver-route-stop">
            <span className="driver-route-stop-label">Drop-off</span>
            <strong>{props.offer.dropoffAddress}</strong>
          </div>
        </div>

        <div className="driver-fact-grid">
          <div>
            <span>Vehicle</span>
            <strong>{formatVehicleLabel(props.offer.vehicleRequired)}</strong>
          </div>
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
        </div>
      </div>
      <div className="sw-queue-row-actions driver-offer-actions">
        <button
          className="sw-button sw-button--primary button button-primary"
          disabled={props.pendingAction !== null}
          onClick={() => props.onAccept(props.offer)}
          type="button"
        >
          <ShipWrightIcon name="check" />
          <span>{props.pendingAction === "accept" ? "Accepting..." : "Accept"}</span>
        </button>
        <button
          className="sw-button sw-button--secondary button button-secondary"
          disabled={props.pendingAction !== null}
          onClick={() => props.onReject(props.offer)}
          type="button"
        >
          <ShipWrightIcon name="cancel" />
          <span>{props.pendingAction === "reject" ? "Rejecting..." : "Reject"}</span>
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
  activeMutation: string | null;
  onPodFormChange: (value: { recipientName: string; deliveryNote: string; latitude: string; longitude: string }) => void;
  onTransition: (transition: "en-route-pickup" | "picked-up" | "en-route-drop" | "delivered") => void;
  onCreatePod: () => void;
  onRequestUploadUrl: () => void;
}) {
  const steps = getDriverExecutionSteps(props.job, props.hasProofOfDelivery);
  const proofStepActive = steps.some((step) => step.key === "proof_of_delivery" && step.active);
  const currentStep = getDriverActiveStep(steps);
  const completedStepCount = steps.filter((step) => step.complete).length;

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
        <span className={`sw-badge ${statusTone(props.job.status)}`}>
          <ShipWrightIcon name="queue" />
          <span>{formatStatusLabel(props.job.status)}</span>
        </span>
      </div>

      <div className="driver-current-step-card">
        <div className="driver-current-step-copy">
          <span className="sw-icon-badge sw-icon-badge--info" aria-hidden="true">
            <ShipWrightIcon name={proofStepActive ? "document" : "arrow"} />
          </span>
          <div>
            <p className="eyebrow">Current step</p>
            <h3>{currentStep?.label ?? "Delivery complete"}</h3>
            <p>{currentStep?.description ?? "All delivery execution steps are complete."}</p>
          </div>
        </div>
        <div className="driver-current-step-meta">
          <span className="ops-count-pill">
            {completedStepCount}/{steps.length} complete
          </span>
          {currentStep?.actionLabel && currentStep.transition ? (
            <button
              className="sw-button sw-button--primary button button-primary driver-step-primary-action"
              disabled={props.busy}
              onClick={() => props.onTransition(currentStep.transition!)}
              type="button"
            >
              <ShipWrightIcon name="arrow" />
              <span>
                {props.activeMutation === `transition:${currentStep.transition}` ? "Updating..." : currentStep.actionLabel}
              </span>
            </button>
          ) : null}
        </div>
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
        <div>
          <span>Vehicle</span>
          <strong>{formatVehicleLabel(props.job.vehicleRequired)}</strong>
        </div>
        <div>
          <span>Pickup code path</span>
          <strong>{proofStepActive ? "Proof required next" : "Execution in motion"}</strong>
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
                <ShipWrightIcon name="arrow" />
                <span>{props.activeMutation === `transition:${step.transition}` ? "Updating..." : step.actionLabel}</span>
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
            <p>Record the recipient and any handoff notes first. Image upload stays optional until the staged upload path is fully proven.</p>
          </div>
          <div className="driver-pod-callout">
            <span className="sw-icon-badge sw-icon-badge--warning" aria-hidden="true">
              <ShipWrightIcon name="warning" />
            </span>
            <div>
              <strong>Image upload is optional in this pilot.</strong>
              <p>Request the upload URL only if you need it. The delivery can still be completed without a photo.</p>
            </div>
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
              <span className="sw-label">Delivery notes optional</span>
              <textarea
                className="sw-input"
                onChange={(event) => props.onPodFormChange({ ...props.podForm, deliveryNote: event.target.value })}
                placeholder="Left with reception or handed to customer"
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
            <button
              className="sw-button sw-button--secondary button button-secondary"
              disabled={props.busy}
              onClick={props.onRequestUploadUrl}
              type="button"
            >
              <ShipWrightIcon name="document" />
              <span>{props.activeMutation === "upload-url" ? "Preparing..." : "Request optional image URL"}</span>
            </button>
            <button
              className="sw-button sw-button--primary button button-primary"
              disabled={props.busy || props.podForm.recipientName.trim().length < 2}
              onClick={props.onCreatePod}
              type="button"
            >
              <ShipWrightIcon name="check" />
              <span>{props.activeMutation === "pod" ? "Recording..." : "Record POD"}</span>
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
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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

  const blockedState = useMemo(
    () => getDriverBlockedState({ hasSession: Boolean(session), driverError: error }),
    [error, session]
  );
  const heroState = useMemo(
    () =>
      driverState
        ? getDriverHeroState({
            availability: driverState.availability,
            hasCurrentJob: Boolean(currentJob),
            offerCount: offers.length
          })
        : null,
    [currentJob, driverState, offers.length]
  );
  const offerEmptyState = useMemo(
    () =>
      driverState
        ? getDriverOfferEmptyState({
            availability: driverState.availability,
            hasCurrentJob: Boolean(currentJob)
          })
        : null,
    [currentJob, driverState]
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
      setPendingAction(null);
    }
  }

  async function handleToggleAvailability() {
    if (!session || !driverState) {
      return;
    }

    setBusy(true);
    setPendingAction("availability");
    setError(null);
    setNotice(null);

    try {
      const next = await updateDriverAvailability(session, driverState.availability === "ONLINE" ? "OFFLINE" : "ONLINE");
      setDriverState(next);
      const nextOffers = await listDriverOffers(session).catch(() => offers);
      setOffers(nextOffers);
      setNotice(next.availability === "ONLINE" ? "You are online and ready to receive offers." : "You are offline. Dispatch is paused.");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to update driver availability.");
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  async function handleAcceptOffer(offer: DriverOffer) {
    if (!session) {
      return;
    }

    setBusy(true);
    setPendingAction(`accept:${offer.offerId}`);
    setError(null);
    setNotice(null);

    try {
      await acceptDriverOffer(session, offer.offerId);
      setNotice(`Offer ${shortId(offer.offerId)} accepted. Active delivery loaded.`);
      await refreshDriverWorkspace(session);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to accept offer.");
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  async function handleRejectOffer(offer: DriverOffer) {
    if (!session) {
      return;
    }

    setBusy(true);
    setPendingAction(`reject:${offer.offerId}`);
    setError(null);
    setNotice(null);

    try {
      await rejectDriverOffer(session, offer.offerId);
      setOffers((current) => current.filter((item) => item.offerId !== offer.offerId));
      setNotice(`Offer ${shortId(offer.offerId)} rejected.`);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to reject offer.");
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  async function handleTransition(transition: "en-route-pickup" | "picked-up" | "en-route-drop" | "delivered") {
    if (!session || !currentJob) {
      return;
    }

    setBusy(true);
    setPendingAction(`transition:${transition}`);
    setError(null);
    setNotice(null);

    try {
      const job = await transitionDriverJob(session, currentJob.id, transition);
      setCurrentJob(job.status === "DELIVERED" ? null : job);
      if (transition === "delivered") {
        setHasProofOfDelivery(false);
        setUploadUrl(null);
        setNotice("Delivery completed.");
      } else {
        setNotice("Delivery step updated.");
      }
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to update delivery step.");
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  async function handleRequestUploadUrl() {
    if (!session || !currentJob) {
      return;
    }

    setBusy(true);
    setPendingAction("upload-url");
    setError(null);
    setNotice(null);

    try {
      const url = await createProofOfDeliveryUploadUrl(session, currentJob.id);
      setUploadUrl(url);
      setNotice("Optional proof-of-delivery upload URL created.");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to create the optional POD upload URL.");
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  async function handleCreatePod() {
    if (!session || !currentJob) {
      return;
    }

    setBusy(true);
    setPendingAction("pod");
    setError(null);
    setNotice(null);

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
      setNotice("Proof of delivery recorded. You can now complete the delivery.");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to record proof of delivery.");
    } finally {
      setBusy(false);
      setPendingAction(null);
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
    return <DriverBlockedState {...blockedState} onSignOut={() => void handleSignOut()} />;
  }

  if (!driverState) {
    return <DriverBlockedState {...blockedState} onSignOut={() => void handleSignOut()} />;
  }

  return (
    <main className="app-shell driver-shell">
      <header className="driver-topbar">
        <BrandLogo href="/" mode="responsive" />
        <div className="driver-topbar-actions">
          <Link className="button button-secondary" href="/driver/updates">
            What’s new
          </Link>
          <ContextualHelpLink href="/help/driver" />
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

      <ProductUpdateAnnouncement routePath="/driver" viewer="driver" viewerKey={session.userId} />

      <section className={`sw-command-surface driver-hero ${heroState?.tone === "online" ? "driver-hero-online" : heroState?.tone === "active" ? "driver-hero-active" : ""}`}>
        <div className="driver-hero-copy">
          <span
            className={`driver-hero-icon ${
              heroState?.tone === "active"
                ? "driver-hero-icon-info"
                : driverState.availability === "ONLINE"
                  ? "driver-hero-icon-success"
                  : "driver-hero-icon-warning"
            }`}
            aria-hidden="true"
          >
            <ShipWrightIcon name={heroState?.tone === "active" ? "route" : driverState.availability === "ONLINE" ? "check" : "driver"} />
          </span>
          <div>
            <p className="eyebrow">Driver execution</p>
            <h1>{heroState?.title ?? "Driver execution"}</h1>
            <p>{heroState?.message ?? "Track availability, offers, and the next delivery action."}</p>
          </div>
        </div>
        <div className="driver-hero-side">
          <div className="driver-hero-signals">
            <div className="driver-hero-signal">
              <span>Availability</span>
              <strong>{formatStatusLabel(driverState.availability)}</strong>
            </div>
            <div className="driver-hero-signal">
              <span>{heroState?.readinessLabel ?? "Dispatch state"}</span>
              <strong>{heroState?.readinessCopy ?? "Ready."}</strong>
            </div>
            <div className="driver-hero-signal">
              <span>Offers waiting</span>
              <strong>{offers.length}</strong>
            </div>
          </div>
          <button className="sw-button sw-button--primary button button-primary driver-online-toggle" disabled={busy} onClick={() => void handleToggleAvailability()} type="button">
            <ShipWrightIcon name={driverState.availability === "ONLINE" ? "cancel" : "check"} />
            <span>
              {pendingAction === "availability"
                ? "Updating..."
                : driverState.availability === "ONLINE"
                  ? "Go offline"
                  : "Go online"}
            </span>
          </button>
        </div>
      </section>

      {notice ? <div className="driver-notice-banner">{notice}</div> : null}
      {error && !error.includes("driver_record_required") ? <div className="form-error-banner">{error}</div> : null}

      <section className="driver-grid">
        <div className="driver-main-stack">
          {currentJob ? (
            <ActiveJobPanel
              activeMutation={pendingAction}
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
              <strong>{driverState.availability === "ONLINE" ? "No active job" : "Go online before your next delivery"}</strong>
              <p>
                {driverState.availability === "ONLINE"
                  ? "Accepted delivery work will appear here with the next operational step."
                  : "Dispatch is paused while the driver is offline, so no active work will appear yet."}
              </p>
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
                <strong className="sw-empty-title">{offerEmptyState?.title ?? "No offers available"}</strong>
                <p className="sw-empty-copy">
                  {offerEmptyState?.copy ?? "Dispatch offers will appear here while you are online and eligible."}
                </p>
              </div>
            ) : (
              <div className="driver-offer-list">
                {offers.map((offer) => (
                  <OfferCard
                    key={offer.offerId}
                    offer={offer}
                    onAccept={handleAcceptOffer}
                    onReject={handleRejectOffer}
                    pendingAction={
                      pendingAction === `accept:${offer.offerId}`
                        ? "accept"
                        : pendingAction === `reject:${offer.offerId}`
                          ? "reject"
                          : null
                    }
                  />
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
