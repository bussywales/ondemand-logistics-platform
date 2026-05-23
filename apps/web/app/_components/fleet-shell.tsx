"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { useEffect, useState, type FormEvent } from "react";
import {
  ApiRequestError,
  cancelFleetInvite,
  createFleetInvite,
  getFleetDriverDetail,
  getFleetReadiness,
  getFleetTeam,
  getUserFacingApiError,
  isUnauthorizedApiError,
  listFleetDrivers,
  resendFleetInvite
} from "../_lib/api";
import { buildAuthRedirectTarget } from "../_lib/route-protection";
import {
  formatDateTime,
  type BusinessSession,
  type FleetDriver,
  type FleetDriverDetail,
  type FleetReadinessSummary,
  type FleetTeam,
  type OrgRole
} from "../_lib/product-state";
import { BrandLogo } from "./brand-logo";
import { useBusinessAuth } from "./business-auth-provider";
import { ProductUpdateAnnouncement } from "./product-updates";

const FLEET_UNAVAILABLE_MESSAGE = "Fleet workspace unavailable. Refresh or contact support.";

function formatLabel(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function readinessTone(value: FleetDriver["readinessStatus"]) {
  if (value === "READY") return "sw-badge--success";
  if (value === "NEEDS_REVIEW") return "sw-badge--warning";
  return "sw-badge--neutral";
}

function availabilityTone(value: FleetDriver["availabilityStatus"]) {
  if (value === "ONLINE") return "sw-badge--success";
  if (value === "OFFLINE") return "sw-badge--neutral";
  return "sw-badge--warning";
}

function SummaryMetric(props: { label: string; value: number; copy: string }) {
  return (
    <div className="sw-metric-card sw-supporting-surface admin-command-metric-card">
      <span className="sw-metric-label">{props.label}</span>
      <strong className="sw-metric-value">{props.value}</strong>
      <p className="sw-metric-copy">{props.copy}</p>
    </div>
  );
}

function getDriverDetailHref(driver: FleetDriver) {
  return `/fleet/drivers/${encodeURIComponent(driver.driverId ?? driver.userId)}`;
}

export function FleetWorkspaceDeniedState() {
  return (
    <main className="app-shell admin-shell-page">
      <section className="sw-empty-state">
        <p className="eyebrow">Fleet workspace</p>
        <h1>Fleet manager access required</h1>
        <p className="sw-empty-copy">
          This workspace is for fleet owners, managers, dispatchers, and compliance managers. Ordinary driver accounts cannot manage fleet readiness.
        </p>
        <div className="hero-actions">
          <Link className="sw-button sw-button--secondary button button-secondary" href="/driver">
            Open driver route
          </Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/get-started">
            Switch account
          </Link>
        </div>
      </section>
    </main>
  );
}

export function FleetWorkspaceView(props: { readiness: FleetReadinessSummary; drivers: FleetDriver[]; team?: FleetTeam | null }) {
  const pendingInviteCount = props.team?.invitations.filter((invite) => invite.status === "PENDING").length ?? 0;
  return (
    <main className="app-shell admin-shell-page">
      <div className="sw-row-between admin-shell-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Fleet workspace</p>
          <h1>{props.readiness.fleetOrgName}</h1>
          <p>Read-only courier readiness for fleet managers, dispatchers, and compliance leads. Human review remains required.</p>
        </div>
        <div className="hero-actions">
          <Link className="sw-button sw-button--secondary button button-secondary" href="/fleet/team">
            Team management
          </Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/driver">
            Driver route
          </Link>
        </div>
      </div>

      <ProductUpdateAnnouncement routePath="/fleet" viewer="driver" viewerKey="fleet-workspace" />

      <section className="sw-command-surface admin-command-page-hero">
        <div>
          <span className="sw-badge sw-badge--info">Fleet readiness</span>
          <h2>
            {props.readiness.readyDrivers} ready of {props.readiness.totalDrivers} fleet driver{props.readiness.totalDrivers === 1 ? "" : "s"}
          </h2>
          <p>{props.readiness.humanReviewNote}</p>
        </div>
        <div className="admin-command-page-counts">
          <SummaryMetric copy="Fleet members in the driver-company pool." label="Drivers" value={props.readiness.totalDrivers} />
          <SummaryMetric copy="Online, verified, vehicle-ready, and recently seen." label="Ready" value={props.readiness.readyDrivers} />
          <SummaryMetric copy="Records that need compliance or location review." label="Needs review" value={props.readiness.needsReviewDrivers} />
          <SummaryMetric copy="Currently linked active delivery jobs." label="Active jobs" value={props.readiness.activeJobs} />
          <SummaryMetric copy="Pending fleet invitations awaiting acceptance." label="Pending invites" value={pendingInviteCount} />
        </div>
      </section>

      <section className="sw-operational-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Driver pool</p>
            <h2>Fleet-managed couriers</h2>
            <p className="ops-detail-note">No scoring, suspension, billing, payout, or dispatch preference automation is applied from this workspace.</p>
          </div>
        </div>

        {props.drivers.length ? (
          <div className="admin-command-list">
            {props.drivers.map((driver) => (
              <Link className="sw-list-row" href={getDriverDetailHref(driver)} key={driver.membershipId}>
                <div className="sw-stack-sm">
                  <div className="sw-row">
                    <strong>{driver.displayName}</strong>
                    <span className={`sw-badge ${readinessTone(driver.readinessStatus)}`}>{formatLabel(driver.readinessStatus)}</span>
                    <span className={`sw-badge ${availabilityTone(driver.availabilityStatus)}`}>{formatLabel(driver.availabilityStatus)}</span>
                    <span className="sw-badge sw-badge--neutral">{formatLabel(driver.fleetRole)}</span>
                  </div>
                  <p className="ops-detail-note">{driver.email}</p>
                  <p className="ops-detail-note">{driver.recommendedNextAction}</p>
                  <p className="ops-detail-note">Open driver readiness detail</p>
                </div>

                <div className="orders-financial-grid">
                  <div>
                    <span className="sw-metric-label">Verification</span>
                    <strong>{formatLabel(driver.verificationStatus)}</strong>
                  </div>
                  <div>
                    <span className="sw-metric-label">Vehicle</span>
                    <strong>{formatLabel(driver.vehicleType)}</strong>
                  </div>
                  <div>
                    <span className="sw-metric-label">Active job</span>
                    <strong>{driver.activeJobId ? `${formatLabel(driver.activeJobStatus)} · ${driver.activeJobId.slice(0, 8)}` : "None"}</strong>
                  </div>
                  <div>
                    <span className="sw-metric-label">Last seen</span>
                    <strong>{driver.lastLocationAt ? formatDateTime(driver.lastLocationAt) : "Not recorded"}</strong>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="sw-empty-state admin-empty-state">
            <strong className="sw-empty-title">No fleet drivers yet</strong>
            <p className="sw-empty-copy">Ask a platform admin to add existing couriers to this driver-company group before rehearsal.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function LoadingState() {
  return (
    <main className="app-shell loading-shell">
      <section className="sw-empty-state">
        <strong className="sw-empty-title">Loading fleet workspace</strong>
        <p className="sw-empty-copy">Checking your session and fleet membership.</p>
      </section>
    </main>
  );
}

function ErrorState(props: { message: string; onRefresh: () => void }) {
  return (
    <main className="app-shell loading-shell">
      <section className="sw-empty-state">
        <p className="eyebrow">Fleet workspace</p>
        <h1>Unable to load fleet readiness</h1>
        <p className="sw-empty-copy">{props.message}</p>
        <button className="sw-button sw-button--primary button button-primary" onClick={props.onRefresh} type="button">
          Refresh
        </button>
      </section>
    </main>
  );
}

export function FleetDriverDetailView(props: { detail: FleetDriverDetail }) {
  const driver = props.detail.driver;
  return (
    <main className="app-shell admin-shell-page">
      <div className="sw-row-between admin-shell-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Fleet driver detail</p>
          <h1>{driver.displayName}</h1>
          <p>Driver readiness context for fleet operators. This page is visibility-only with no scoring and does not change dispatch preference, payout, or compliance state.</p>
        </div>
        <div className="hero-actions">
          <Link className="sw-button sw-button--secondary button button-secondary" href="/fleet">
            Back to fleet
          </Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/help">
            Help
          </Link>
        </div>
      </div>

      <section className="sw-command-surface admin-command-page-hero">
        <div>
          <span className={`sw-badge ${readinessTone(driver.readinessStatus)}`}>{formatLabel(driver.readinessStatus)}</span>
          <h2>{driver.recommendedNextAction}</h2>
          <p className="ops-detail-note">
            {driver.email} · {formatLabel(driver.fleetRole)} · membership {driver.membershipActive ? "active" : "inactive"}
          </p>
        </div>
        <div className="admin-command-page-counts">
          <SummaryMetric copy="Current verification signal." label="Verification" value={driver.verificationStatus === "APPROVED" ? 1 : 0} />
          <SummaryMetric copy="Vehicle profile present." label="Vehicle ready" value={driver.vehicleType ? 1 : 0} />
          <SummaryMetric copy="Current active job link." label="Active jobs" value={driver.activeJobId ? 1 : 0} />
          <SummaryMetric copy="Recent assigned work shown below." label="Recent work" value={props.detail.recentWork.length} />
        </div>
      </section>

      <section className="sw-operational-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Driver profile</p>
            <h2>Operational signals</h2>
          </div>
        </div>
        <div className="orders-financial-grid">
          <div><span className="sw-metric-label">Fleet role</span><strong>{formatLabel(driver.fleetRole)}</strong></div>
          <div><span className="sw-metric-label">Membership</span><strong>{driver.membershipActive ? "Active" : "Inactive"}</strong></div>
          <div><span className="sw-metric-label">Availability</span><strong>{formatLabel(driver.availabilityStatus)}</strong></div>
          <div><span className="sw-metric-label">Vehicle</span><strong>{formatLabel(driver.vehicleType)}</strong></div>
          <div><span className="sw-metric-label">Last seen</span><strong>{driver.lastLocationAt ? formatDateTime(driver.lastLocationAt) : "Not recorded"}</strong></div>
          <div><span className="sw-metric-label">Driver profile</span><strong>{driver.driverId ? driver.driverId.slice(0, 8).toUpperCase() : "Missing"}</strong></div>
        </div>
      </section>

      <section className="sw-operational-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Work context</p>
            <h2>Active and recent work</h2>
          </div>
        </div>
        <div className="admin-command-list">
          {driver.activeJobId ? (
            <div className="sw-list-row">
              <div>
                <strong>Active job</strong>
                <p className="ops-detail-note">{formatLabel(driver.activeJobStatus)} · {driver.activeJobId}</p>
              </div>
            </div>
          ) : null}
          {props.detail.recentWork.length === 0 ? (
            <div className="sw-empty-state admin-empty-state">
              <strong className="sw-empty-title">No recent assigned work</strong>
              <p className="sw-empty-copy">Recent completed, cancelled, or failed jobs will appear here when available for this fleet driver.</p>
            </div>
          ) : props.detail.recentWork.map((job) => (
            <div className="sw-list-row" key={job.jobId}>
              <div>
                <strong>{formatLabel(job.status)}</strong>
                <p className="ops-detail-note">{job.pickupAddress ?? "Pickup not recorded"} → {job.dropoffAddress ?? "Drop-off not recorded"}</p>
              </div>
              <span className="sw-badge sw-badge--neutral">{job.completedAt ? formatDateTime(job.completedAt) : formatDateTime(job.createdAt)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="sw-supporting-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Readiness history</p>
            <h2>Readiness signal timeline</h2>
            <p className="ops-detail-note">{props.detail.readinessHistoryNote}</p>
          </div>
        </div>
        {props.detail.readinessHistory.length === 0 ? (
          <div className="sw-empty-state admin-empty-state">
            <strong className="sw-empty-title">No readiness history yet</strong>
            <p className="sw-empty-copy">Current readiness is visible now. Historical events will appear after driver signal changes are captured.</p>
          </div>
        ) : (
          <div className="admin-command-list">
            {props.detail.readinessHistory.map((event) => (
              <div className="sw-list-row" key={event.id}>
                <div>
                  <strong>{formatLabel(event.readinessStatus)}</strong>
                  <p className="ops-detail-note">{event.reason}</p>
                </div>
                <span className="sw-badge sw-badge--neutral">{formatDateTime(event.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

const FLEET_INVITE_ROLES: OrgRole[] = ["DRIVER", "DISPATCHER", "COMPLIANCE_MANAGER", "FLEET_MANAGER"];

export function FleetTeamView(props: {
  error?: string | null;
  onCancelInvite: (inviteId: string) => void;
  onCreateInvite: (input: { email: string; role: OrgRole }) => void;
  onResendInvite: (inviteId: string) => void;
  pending?: boolean;
  team: FleetTeam;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("DRIVER");
  const roleOptions = props.team.currentUserRole === "FLEET_OWNER" ? FLEET_INVITE_ROLES : FLEET_INVITE_ROLES.filter((item) => item !== "FLEET_MANAGER");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    props.onCreateInvite({ email, role });
    setEmail("");
    setRole("DRIVER");
  }

  return (
    <main className="app-shell admin-shell-page">
      <div className="sw-row-between admin-shell-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Fleet team</p>
          <h1>{props.team.fleetOrgName}</h1>
          <p>Manage pending fleet invitations and review access changes. Email delivery depends on notification configuration.</p>
        </div>
        <div className="hero-actions">
          <Link className="sw-button sw-button--secondary button button-secondary" href="/fleet">
            Fleet overview
          </Link>
        </div>
      </div>

      {props.team.canManageInvites ? (
        <section className="sw-operational-surface admin-command-section">
          <div className="sw-card-header admin-section-header">
            <div>
              <p className="eyebrow">Invite driver-company member</p>
              <h2>Add fleet access</h2>
              <p className="ops-detail-note">Invites are org-scoped and audit logged. No account deletion or automatic courier suspension is available here.</p>
            </div>
          </div>
          <form className="form-grid team-invite-grid" onSubmit={submit}>
            <label className="sw-field">
              <span className="sw-label">Email</span>
              <input className="sw-input" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
            </label>
            <label className="sw-field">
              <span className="sw-label">Role</span>
              <select className="sw-input" onChange={(event) => setRole(event.target.value as OrgRole)} value={role}>
                {roleOptions.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}
              </select>
            </label>
            <button className="sw-button sw-button--primary button button-primary" disabled={props.pending} type="submit">
              {props.pending ? "Recording invite..." : "Invite fleet member"}
            </button>
          </form>
          {props.error ? <p className="form-error" role="alert">{props.error}</p> : null}
        </section>
      ) : (
        <section className="sw-supporting-surface admin-command-section">
          <strong>Team management unavailable for dispatcher role</strong>
          <p className="ops-detail-note">Dispatchers can view fleet readiness, but invitation management is limited to fleet owners, fleet managers, and compliance managers.</p>
        </section>
      )}

      <section className="sw-operational-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Pending invitations</p>
            <h2>{props.team.invitations.filter((invite) => invite.status === "PENDING").length} pending invite{props.team.invitations.filter((invite) => invite.status === "PENDING").length === 1 ? "" : "s"}</h2>
          </div>
        </div>
        <div className="admin-command-list">
          {props.team.invitations.length === 0 ? (
            <div className="sw-empty-state admin-empty-state"><strong className="sw-empty-title">No fleet invitations</strong></div>
          ) : props.team.invitations.map((invite) => (
            <div className="sw-list-row" key={invite.id}>
              <div>
                <strong>{invite.email}</strong>
                <p className="ops-detail-note">{formatLabel(invite.role)} · {formatLabel(invite.status)} · {formatDateTime(invite.createdAt)}</p>
              </div>
              {props.team.canManageInvites && invite.status !== "ACCEPTED" && invite.status !== "CANCELLED" ? (
                <div className="hero-actions">
                  <button className="sw-button sw-button--secondary button button-secondary" disabled={props.pending} onClick={() => props.onResendInvite(invite.id)} type="button">Resend</button>
                  <button className="sw-button sw-button--secondary button button-secondary" disabled={props.pending} onClick={() => props.onCancelInvite(invite.id)} type="button">Cancel</button>
                </div>
              ) : <span className="sw-badge sw-badge--neutral">Read-only</span>}
            </div>
          ))}
        </div>
      </section>

      <section className="sw-operational-surface admin-command-section">
        <div className="sw-card-header admin-section-header"><div><p className="eyebrow">Active members</p><h2>Fleet access</h2></div></div>
        <div className="admin-command-list">
          {props.team.members.map((member) => (
            <div className="sw-list-row" key={member.id}>
              <div><strong>{member.displayName}</strong><p className="ops-detail-note">{member.email} · {formatLabel(member.role)}</p></div>
              <span className={`sw-badge ${member.isActive ? "sw-badge--success" : "sw-badge--neutral"}`}>{member.isActive ? "Active" : "Inactive"}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="sw-supporting-surface admin-command-section">
        <div className="sw-card-header admin-section-header"><div><p className="eyebrow">Access history</p><h2>Recent fleet access changes</h2></div></div>
        <div className="admin-command-list">
          {props.team.accessEvents.length === 0 ? (
            <div className="sw-empty-state admin-empty-state"><strong className="sw-empty-title">No access history yet</strong></div>
          ) : props.team.accessEvents.map((event) => (
            <div className="sw-list-row" key={event.id}>
              <div><strong>{event.summary}</strong><p className="ops-detail-note">{event.actorName ?? event.actorEmail ?? "System"} · {formatDateTime(event.createdAt)}</p></div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export function FleetWorkspaceShell() {
  const router = useRouter();
  const { status, session, error, refreshBusinessSession } = useBusinessAuth();
  const [readiness, setReadiness] = useState<FleetReadinessSummary | null>(null);
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  const [team, setTeam] = useState<FleetTeam | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(buildAuthRedirectTarget({ pathname: "/fleet" }));
    }
  }, [router, status]);

  useEffect(() => {
    let active = true;

    if (!session) {
      return () => {
        active = false;
      };
    }

    setAccessDenied(false);
    setLoadError(null);

    void Promise.all([getFleetReadiness(session), listFleetDrivers(session), getFleetTeam(session).catch(() => null)])
      .then(([nextReadiness, nextDrivers, nextTeam]) => {
        if (!active) return;
        setReadiness(nextReadiness);
        setDrivers(nextDrivers);
        setTeam(nextTeam);
      })
      .catch((issue) => {
        if (!active) return;
        if (issue instanceof ApiRequestError && issue.status === 403) {
          setAccessDenied(true);
          return;
        }
        if (isUnauthorizedApiError(issue)) {
          router.replace(buildAuthRedirectTarget({ pathname: "/fleet" }));
          return;
        }
        setLoadError(getUserFacingApiError(issue, FLEET_UNAVAILABLE_MESSAGE));
      });

    return () => {
      active = false;
    };
  }, [router, session]);

  if (status === "loading") {
    return <LoadingState />;
  }

  if (status === "error") {
    return <ErrorState message={error ?? FLEET_UNAVAILABLE_MESSAGE} onRefresh={() => void refreshBusinessSession()} />;
  }

  if (status !== "authenticated") {
    return <LoadingState />;
  }

  if (accessDenied) {
    return <FleetWorkspaceDeniedState />;
  }

  if (loadError) {
    return <ErrorState message={loadError} onRefresh={() => void refreshBusinessSession()} />;
  }

  if (!readiness) {
    return <LoadingState />;
  }

  return <FleetWorkspaceView drivers={drivers} readiness={readiness} team={team} />;
}

export function FleetDriverDetailShell(props: { driverId: string }) {
  const router = useRouter();
  const { status, session, error, refreshBusinessSession } = useBusinessAuth();
  const [detail, setDetail] = useState<FleetDriverDetail | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(buildAuthRedirectTarget({ pathname: `/fleet/drivers/${props.driverId}` }));
    }
  }, [props.driverId, router, status]);

  useEffect(() => {
    let active = true;
    if (!session) return () => { active = false; };
    setAccessDenied(false);
    setLoadError(null);
    void getFleetDriverDetail(session, props.driverId)
      .then((nextDetail) => {
        if (active) setDetail(nextDetail);
      })
      .catch((issue) => {
        if (!active) return;
        if (issue instanceof ApiRequestError && issue.status === 403) {
          setAccessDenied(true);
          return;
        }
        if (isUnauthorizedApiError(issue)) {
          router.replace(buildAuthRedirectTarget({ pathname: `/fleet/drivers/${props.driverId}` }));
          return;
        }
        setLoadError(getUserFacingApiError(issue, FLEET_UNAVAILABLE_MESSAGE));
      });
    return () => {
      active = false;
    };
  }, [props.driverId, router, session]);

  if (status === "loading") return <LoadingState />;
  if (status === "error") return <ErrorState message={error ?? FLEET_UNAVAILABLE_MESSAGE} onRefresh={() => void refreshBusinessSession()} />;
  if (status !== "authenticated") return <LoadingState />;
  if (accessDenied) return <FleetWorkspaceDeniedState />;
  if (loadError) return <ErrorState message={loadError} onRefresh={() => void refreshBusinessSession()} />;
  if (!detail) return <LoadingState />;
  return <FleetDriverDetailView detail={detail} />;
}

export function FleetTeamShell() {
  const router = useRouter();
  const { status, session, error, refreshBusinessSession } = useBusinessAuth();
  const [team, setTeam] = useState<FleetTeam | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(buildAuthRedirectTarget({ pathname: "/fleet/team" }));
    }
  }, [router, status]);

  async function refresh(currentSession: BusinessSession | null = session) {
    if (!currentSession) return;
    setTeam(await getFleetTeam(currentSession));
  }

  useEffect(() => {
    let active = true;
    if (!session) return () => { active = false; };
    setAccessDenied(false);
    setLoadError(null);
    void getFleetTeam(session)
      .then((nextTeam) => {
        if (active) setTeam(nextTeam);
      })
      .catch((issue) => {
        if (!active) return;
        if (issue instanceof ApiRequestError && issue.status === 403) {
          setAccessDenied(true);
          return;
        }
        if (isUnauthorizedApiError(issue)) {
          router.replace(buildAuthRedirectTarget({ pathname: "/fleet/team" }));
          return;
        }
        setLoadError(getUserFacingApiError(issue, FLEET_UNAVAILABLE_MESSAGE));
      });
    return () => {
      active = false;
    };
  }, [router, session]);

  async function runAction(action: (currentSession: BusinessSession) => Promise<unknown>) {
    if (!session) return;
    setPending(true);
    setActionError(null);
    try {
      await action(session);
      await refresh(session);
    } catch (issue) {
      setActionError(getUserFacingApiError(issue, "Unable to update fleet invitation."));
    } finally {
      setPending(false);
    }
  }

  if (status === "loading") return <LoadingState />;
  if (status === "error") return <ErrorState message={error ?? FLEET_UNAVAILABLE_MESSAGE} onRefresh={() => void refreshBusinessSession()} />;
  if (status !== "authenticated") return <LoadingState />;
  if (accessDenied) return <FleetWorkspaceDeniedState />;
  if (loadError) return <ErrorState message={loadError} onRefresh={() => void refreshBusinessSession()} />;
  if (!team) return <LoadingState />;

  return (
    <FleetTeamView
      error={actionError}
      onCancelInvite={(inviteId) => void runAction((currentSession) => cancelFleetInvite(currentSession, inviteId))}
      onCreateInvite={(input) => void runAction((currentSession) => createFleetInvite(currentSession, input))}
      onResendInvite={(inviteId) => void runAction((currentSession) => resendFleetInvite(currentSession, inviteId))}
      pending={pending}
      team={team}
    />
  );
}
