"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { BrandLogo } from "./brand-logo";
import { useBusinessAuth } from "./business-auth-provider";
import { ContextualHelpLink } from "./help";
import { NotificationsBell } from "./notifications";
import { type CollectedPaymentMethod } from "./payment-method-form";
import { WorkspaceDashboard } from "./product-shell/workspace-dashboard";
import { JobCreatePanel } from "./product-shell/job-create-panel";
import { JobDetailView } from "./product-shell/job-detail-view";
import { JobsListView } from "./product-shell/jobs-list-view";
import { isCompletedToday } from "./product-shell/shared";
import { ProductUpdateAnnouncement } from "./product-updates";
import { PilotGuardrailBanner } from "./pilot-guardrail";
import { ShipWrightIcon } from "./shipwright-icon";
import { WorkspaceNav } from "./workspace-nav";
import {
  authorizePayment,
  cancelJob,
  createBusinessSupportEscalation,
  createLiveJob,
  getDriverAssignmentIneligibility,
  getBusinessDailyBriefing,
  getBusinessPilotStatus,
  getLiveJob,
  getUserFacingApiError,
  listBusinessSupportEscalations,
  listBusinessSupportEscalationEvents,
  listBusinessOrders,
  listEligibleDrivers,
  listLiveJobs,
  reassignDriver,
  retryDispatch,
  updateBusinessSupportEscalation
} from "../_lib/api";
import {
  filterEligibleDrivers,
  toDriverAssignmentFailureModel,
  type DriverAssignmentFailureModel
} from "../_lib/driver-assignment";
import { getDispatchIntelligence, shouldShowInReviewQueue, sortReviewQueue } from "../_lib/dispatch-intelligence";
import {
  type AppJob,
  type BusinessCustomerOrder,
  type BusinessPilotStatus,
  type DailyBriefing,
  type BusinessSession,
  type CreateSupportEscalationInput,
  type DeliveryFormInput,
  type EligibleDriver,
  type SupportEscalation,
  type SupportEscalationEvent,
  type UpdateSupportEscalationInput,
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

async function loadSupportEscalationEvents(session: BusinessSession, items: SupportEscalation[]) {
  const entries = await Promise.all(
    items.map(async (item) => {
      try {
        return [item.id, await listBusinessSupportEscalationEvents(session, item.id)] as const;
      } catch {
        return [item.id, []] as const;
      }
    })
  );

  return Object.fromEntries(entries);
}

export function ProductShell(props: ProductShellProps) {
  const router = useRouter();
  const { status, session, signOut, refreshBusinessSession } = useBusinessAuth();
  const [jobs, setJobs] = useState<AppJob[]>([]);
  const [orders, setOrders] = useState<BusinessCustomerOrder[]>([]);
  const [selectedJob, setSelectedJob] = useState<AppJob | null>(null);
  const [selectedJobEscalations, setSelectedJobEscalations] = useState<SupportEscalation[]>([]);
  const [selectedJobEscalationEvents, setSelectedJobEscalationEvents] = useState<Record<string, SupportEscalationEvent[]>>({});
  const [supportLogError, setSupportLogError] = useState<string | null>(null);
  const [dailyBriefing, setDailyBriefing] = useState<DailyBriefing | null>(null);
  const [briefingError, setBriefingError] = useState<string | null>(null);
  const [pilotStatus, setPilotStatus] = useState<BusinessPilotStatus | null>(null);
  const [deliveryForm, setDeliveryForm] = useState<DeliveryFormInput>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collectedPaymentMethod, setCollectedPaymentMethod] = useState<CollectedPaymentMethod | null>(null);
  const [eligibleDrivers, setEligibleDrivers] = useState<EligibleDriver[]>([]);
  const [eligibleDriversLoading, setEligibleDriversLoading] = useState(false);
  const [eligibleDriversLoadedForJob, setEligibleDriversLoadedForJob] = useState<string | null>(null);
  const [driverPickerOpen, setDriverPickerOpen] = useState(false);
  const [driverPickerQuery, setDriverPickerQuery] = useState("");
  const [driverAssignmentError, setDriverAssignmentError] = useState<DriverAssignmentFailureModel | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("Operator cancelled");
  const [supportSubmitting, setSupportSubmitting] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    void refreshJobs(session);
  }, [session?.accessToken]);

  useEffect(() => {
    if (!props.jobId || !session) {
      setSelectedJob(null);
      setSelectedJobEscalations([]);
      setSelectedJobEscalationEvents({});
      setSupportLogError(null);
      return;
    }

    void refreshLiveJob(props.jobId, session);
  }, [props.jobId, session?.accessToken]);

  useEffect(() => {
    setCollectedPaymentMethod(null);
    setDriverPickerOpen(false);
    setEligibleDrivers([]);
    setEligibleDriversLoadedForJob(null);
    setDriverPickerQuery("");
    setDriverAssignmentError(null);
    setSelectedDriverId(null);
  }, [props.jobId]);

  const workspaceSummary = useMemo(() => {
    const activeJobs = jobs.filter((job) =>
      ["REQUESTED", "ASSIGNED", "EN_ROUTE_PICKUP", "PICKED_UP", "EN_ROUTE_DROP"].includes(job.status)
    ).length;
    const completedToday = jobs.filter(isCompletedToday).length;

    return {
      orgName: session?.context.currentOrg?.name ?? "No org",
      activeJobs,
      completedToday,
      totalJobs: jobs.length
    };
  }, [jobs, session]);

  const activeJobs = useMemo(
    () =>
      jobs
        .filter((job) => ["REQUESTED", "ASSIGNED", "EN_ROUTE_PICKUP", "PICKED_UP", "EN_ROUTE_DROP"].includes(job.status))
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

  const filteredEligibleDrivers = useMemo(
    () => filterEligibleDrivers(eligibleDrivers, driverPickerQuery),
    [eligibleDrivers, driverPickerQuery]
  );

  function syncJob(nextJob: AppJob) {
    setSelectedJob(nextJob);
    setJobs((current) => current.map((item) => (item.id === nextJob.id ? nextJob : item)));
  }

  async function refreshJobs(currentSession: NonNullable<typeof session>) {
    try {
      const [liveJobs, nextBriefing, nextPilotStatus] = await Promise.all([
        listLiveJobs(currentSession),
        getBusinessDailyBriefing(currentSession)
          .then((briefing) => {
            setBriefingError(null);
            return briefing;
          })
          .catch((issue) => {
            setBriefingError(issue instanceof Error ? issue.message : "Unable to load daily briefing.");
            return null;
          }),
        getBusinessPilotStatus(currentSession).catch(() => null)
      ]);
      setJobs(liveJobs);
      setDailyBriefing(nextBriefing);
      setPilotStatus(nextPilotStatus);
      const customerOrders = await listBusinessOrders(currentSession).catch(() => []);
      setOrders(customerOrders);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to load operations workspace.");
    }
  }

  async function refreshLiveJob(jobId: string, currentSession: BusinessSession) {
    try {
      setSupportLogError(null);
      const [job, escalationItems] = await Promise.all([
        getLiveJob(currentSession, jobId),
        listBusinessSupportEscalations(currentSession, { jobId }).catch((issue) => {
          setSupportLogError(getUserFacingApiError(issue, "Support log unavailable. Refresh or contact support."));
          return [];
        })
      ]);
      setSelectedJob(job);
        setSelectedJobEscalations(escalationItems);
        setSelectedJobEscalationEvents(await loadSupportEscalationEvents(currentSession, escalationItems));
      setJobs((current) =>
        [job, ...current.filter((item) => item.id !== job.id)].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      );
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to load job.");
      setSelectedJobEscalations([]);
      setSelectedJobEscalationEvents({});
    }
  }

  async function handleCreateSupportEscalation(input: CreateSupportEscalationInput) {
    if (!session || !selectedJob) {
      return;
    }

    setSupportSubmitting(true);
    setError(null);

    try {
      const created = await createBusinessSupportEscalation(session, {
        ...input,
        jobId: selectedJob.id
      });
      setSelectedJobEscalations((current) => [created, ...current]);
      setSelectedJobEscalationEvents((current) => ({ ...current, [created.id]: [] }));
      const events = await listBusinessSupportEscalationEvents(session, created.id);
      setSelectedJobEscalationEvents((current) => ({ ...current, [created.id]: events }));
    } catch (issue) {
      setSupportLogError(getUserFacingApiError(issue, "Support log unavailable. Refresh or contact support."));
    } finally {
      setSupportSubmitting(false);
    }
  }

  async function handleUpdateSupportEscalationStatus(id: string, input: UpdateSupportEscalationInput) {
    if (!session) {
      return;
    }

    setSupportSubmitting(true);
    setError(null);

    try {
      const updated = await updateBusinessSupportEscalation(session, id, input);
      setSelectedJobEscalations((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      const events = await listBusinessSupportEscalationEvents(session, updated.id);
      setSelectedJobEscalationEvents((current) => ({ ...current, [updated.id]: events }));
    } catch (issue) {
      setSupportLogError(getUserFacingApiError(issue, "Support log unavailable. Refresh or contact support."));
    } finally {
      setSupportSubmitting(false);
    }
  }

  async function handleCreateDelivery(event: FormEvent<HTMLFormElement>) {
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

  async function loadEligibleDriversForJob(job: AppJob) {
    if (!session) {
      return;
    }

    setEligibleDriversLoading(true);
    setError(null);
    setDriverAssignmentError(null);

    try {
      const nextDrivers = await listEligibleDrivers(session, job.id);
      setEligibleDrivers(nextDrivers);
      setEligibleDriversLoadedForJob(job.id);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to load eligible drivers.");
    } finally {
      setEligibleDriversLoading(false);
    }
  }

  async function openDriverPicker(job: AppJob) {
    setDriverPickerOpen(true);
    setDriverPickerQuery("");
    setDriverAssignmentError(null);
    setSelectedDriverId(null);

    if (eligibleDriversLoadedForJob === job.id) {
      return;
    }

    await loadEligibleDriversForJob(job);
  }

  async function handleAssignEligibleDriver(job: AppJob, driverId: string) {
    if (!session) {
      return;
    }

    setActionSubmitting(true);
    setError(null);
    setDriverAssignmentError(null);
    setSelectedDriverId(driverId);

    try {
      const nextJob = await reassignDriver(session, job.id, driverId);
      syncJob(nextJob);
      setDriverPickerOpen(false);
      setSelectedDriverId(null);
      await loadEligibleDriversForJob(nextJob);
    } catch (issue) {
      const structured = getDriverAssignmentIneligibility(issue);
      if (structured) {
        setDriverAssignmentError(
          toDriverAssignmentFailureModel({
            suitabilityReason: structured.suitabilityReason,
            suitabilityFlags: structured.suitabilityFlags
          })
        );
      } else {
        setError(issue instanceof Error ? issue.message : "Unable to assign driver.");
      }
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

  async function handleRefresh() {
    const nextSession = await refreshBusinessSession();
    if (nextSession) {
      await refreshJobs(nextSession);
    }
  }

  async function handleSignOut() {
    await signOut();
    setJobs([]);
    setDailyBriefing(null);
    setBriefingError(null);
    setSelectedJob(null);
    setSelectedJobEscalations([]);
    setSelectedJobEscalationEvents({});
    setSupportLogError(null);
    router.push("/get-started");
  }

  if (status === "loading") {
    return (
      <main className="app-shell loading-shell">
        <section className="sw-empty-state">
          <strong className="sw-empty-title">Loading operations console</strong>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="app-shell loading-shell">
        <section className="sw-empty-state">
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
        <section className="sw-empty-state">
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
  const jobsToRender = jobs.slice(0, 20);
  const recentOrders = orders.slice(0, 3);

  return (
    <main className="app-shell ops-shell">
      <header className="ops-topbar">
        <div className="ops-branding">
          <BrandLogo href="/" mode="responsive" />
          <p className="eyebrow">Operations console</p>
          <h1>{workspaceSummary.orgName}</h1>
        </div>
        <div className="ops-topbar-actions">
          <NotificationsBell session={session} />
          <ContextualHelpLink href="/help/deliveries" />
          <button className="button button-secondary" onClick={() => void handleRefresh()} type="button">
            Refresh
          </button>
          <button className="button button-secondary" onClick={() => void handleSignOut()} type="button">
            Sign Out
          </button>
        </div>
      </header>

      <ProductUpdateAnnouncement routePath={props.view === "home" ? "/app" : "/app/jobs"} viewer="business" viewerKey={session.userId} />

      <section className="ops-layout">
        <aside className="ops-sidebar">
          <WorkspaceNav active={props.view === "home" ? "operations" : "jobs"} platformAdmin={session.context.platformAdmin} />

          <section className="ops-sidebar-section">
            <span className="sw-label">Operator</span>
            <strong>{session.context.displayName}</strong>
            <p>{session.context.email}</p>
          </section>

          <section className="ops-sidebar-section">
            <span className="sw-label">Workspace</span>
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
            <span className="sidebar-live-icon" aria-hidden="true">
              <ShipWrightIcon name={attentionJobs.length > 0 ? "warning" : "check"} />
            </span>
            <span className="sw-label">Live posture</span>
            <strong>{attentionJobs.length > 0 ? "Review required" : "System clear"}</strong>
            <p>
              {attentionJobs.length > 0
                ? `${attentionJobs.length} job${attentionJobs.length === 1 ? "" : "s"} need operator action.`
                : "No blockers or delay signals."}
            </p>
            <span className="sidebar-live-action">
              {attentionJobs.length > 0 ? "Clear blockers before creating more work." : "System clear."}
            </span>
          </section>
        </aside>

        <div className="ops-main">
          {error ? <div className="form-error-banner">{error}</div> : null}
          <PilotGuardrailBanner
            canManagePilots={Boolean(session.context.platformAdmin)}
            compact={props.view !== "home"}
            pilotStatus={pilotStatus}
          />

          {props.view === "home" ? (
            <WorkspaceDashboard
              actionSubmitting={actionSubmitting}
              activeJobs={activeJobs}
              attentionJobs={attentionJobs}
              briefing={dailyBriefing}
              briefingError={briefingError}
              onRefresh={() => void handleRefresh()}
              onRetryDispatch={(nextJob) => void handleRetryDispatch(nextJob)}
              recentOrders={recentOrders}
              workspaceSummary={workspaceSummary}
            />
          ) : null}

          {props.view === "jobs" ? (
            <section className="sw-stack">
              <JobCreatePanel
                deliveryForm={deliveryForm}
                onSubmit={handleCreateDelivery}
                setDeliveryForm={setDeliveryForm}
                submitting={submitting}
              />
              <JobsListView jobs={jobsToRender} />
            </section>
          ) : null}

          {props.view === "job-detail" ? (
            job ? (
              <JobDetailView
                actionSubmitting={actionSubmitting}
                cancelReason={cancelReason}
                collectedPaymentMethod={collectedPaymentMethod}
                driverAssignmentError={driverAssignmentError}
                driverPickerOpen={driverPickerOpen}
                driverPickerQuery={driverPickerQuery}
                eligibleDrivers={eligibleDrivers}
                eligibleDriversLoading={eligibleDriversLoading}
                filteredEligibleDrivers={filteredEligibleDrivers}
                job={job}
                onAssignDriver={(driverId) => void handleAssignEligibleDriver(job, driverId)}
                onAuthorizePayment={(nextJob) => void handleAuthorizePayment(nextJob)}
                onCancelJob={(nextJob) => void handleCancelJob(nextJob)}
                onCancelReasonChange={setCancelReason}
                onCloseDriverPicker={() => setDriverPickerOpen(false)}
                onCollectedPaymentMethod={(paymentMethod) => {
                  setCollectedPaymentMethod(paymentMethod);
                  setError(null);
                }}
                onDriverPickerQueryChange={setDriverPickerQuery}
                onOpenDriverPicker={() => void openDriverPicker(job)}
                onOpenOrRefreshDriverPicker={() =>
                  void (driverPickerOpen ? loadEligibleDriversForJob(job) : openDriverPicker(job))
                }
                onResetCollectedPaymentMethod={() => setCollectedPaymentMethod(null)}
                onRetryDispatch={(nextJob) => void handleRetryDispatch(nextJob)}
                onCreateSupportEscalation={handleCreateSupportEscalation}
                onUpdateSupportEscalationStatus={handleUpdateSupportEscalationStatus}
                paymentSubmitting={paymentSubmitting}
                selectedDriverId={selectedDriverId}
                session={session}
                supportEscalations={selectedJobEscalations}
                supportEscalationEvents={selectedJobEscalationEvents}
                supportError={supportLogError}
                supportSubmitting={supportSubmitting}
              />
            ) : (
              <div className="sw-empty-state">
                <strong className="sw-empty-title">Job not found</strong>
                <p className="sw-empty-copy">Return to the jobs list and open another delivery.</p>
              </div>
            )
          ) : null}
        </div>
      </section>
    </main>
  );
}
