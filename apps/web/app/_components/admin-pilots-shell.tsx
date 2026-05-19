"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBusinessAuth } from "./business-auth-provider";
import { BrandLogo } from "./brand-logo";
import { ShipWrightIcon } from "./shipwright-icon";
import { AdminWorkspaceLink } from "./workspace-nav";
import {
  createAdminPilot,
  getUserFacingApiError,
  listAdminPilotChecks,
  listAdminPilots,
  updateAdminPilot,
  updateAdminPilotCheck
} from "../_lib/api";
import { getPilotGuardrailState, pilotGuardrailBadgeClass } from "../_lib/pilot-guardrails";
import type {
  BusinessSession,
  PilotReadinessCheck,
  PilotReadinessCheckStatus,
  PilotReadinessStage,
  PilotWorkspace,
  PilotWorkspaceMode,
  PilotWorkspaceStatus
} from "../_lib/product-state";
import { buildAuthRedirectTarget } from "../_lib/route-protection";

const MODE_OPTIONS: PilotWorkspaceMode[] = ["DEMO", "CONTROLLED_PILOT", "INTERNAL_TEST", "LIVE_READY"];
const STATUS_OPTIONS: PilotWorkspaceStatus[] = ["DRAFT", "ONBOARDING", "READY_FOR_REHEARSAL", "IN_REHEARSAL", "PAUSED", "ACTIVE", "CLOSED"];
const STAGE_OPTIONS: PilotReadinessStage[] = [
  "NOT_STARTED",
  "MERCHANT_SETUP",
  "COURIER_SETUP",
  "PAYMENT_CHECKS",
  "SUPPORT_OWNERS_ASSIGNED",
  "REHEARSAL_READY",
  "PILOT_READY"
];
const CHECK_STATUS_OPTIONS: PilotReadinessCheckStatus[] = ["NOT_STARTED", "IN_PROGRESS", "PASSED", "BLOCKED", "WAIVED"];

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function badgeClass(value: string) {
  if (["ACTIVE", "PILOT_READY", "LIVE_READY", "PASSED", "WAIVED"].includes(value)) {
    return "sw-badge--success";
  }
  if (["PAUSED", "BLOCKED"].includes(value)) {
    return "sw-badge--warning";
  }
  return "sw-badge--info";
}

function completionCopy(pilot: PilotWorkspace) {
  if (pilot.checklistTotal === 0) {
    return "No checklist";
  }
  return `${pilot.checklistPassed}/${pilot.checklistTotal} checks clear`;
}

type PilotFormState = {
  orgId: string;
  mode: PilotWorkspaceMode;
  status: PilotWorkspaceStatus;
  readinessStage: PilotReadinessStage;
  pilotOwner: string;
  supportOwner: string;
  courierOwner: string;
  paymentOwner: string;
  goLiveTargetDate: string;
  notes: string;
};

function buildFormState(pilot?: PilotWorkspace | null): PilotFormState {
  return {
    orgId: pilot?.orgId ?? "",
    mode: pilot?.mode ?? "DEMO",
    status: pilot?.status ?? "DRAFT",
    readinessStage: pilot?.readinessStage ?? "NOT_STARTED",
    pilotOwner: pilot?.pilotOwner ?? "",
    supportOwner: pilot?.supportOwner ?? "",
    courierOwner: pilot?.courierOwner ?? "",
    paymentOwner: pilot?.paymentOwner ?? "",
    goLiveTargetDate: pilot?.goLiveTargetDate ?? "",
    notes: pilot?.notes ?? ""
  };
}

function toNullable(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function PilotForm(props: {
  disabled: boolean;
  selectedPilot: PilotWorkspace | null;
  session: BusinessSession;
  onSaved: (pilot: PilotWorkspace) => void;
  onError: (message: string) => void;
}) {
  const [form, setForm] = useState<PilotFormState>(() => buildFormState(props.selectedPilot));

  useEffect(() => {
    setForm(buildFormState(props.selectedPilot));
  }, [props.selectedPilot]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = {
      mode: form.mode,
      status: form.status,
      readinessStage: form.readinessStage,
      pilotOwner: toNullable(form.pilotOwner),
      supportOwner: toNullable(form.supportOwner),
      courierOwner: toNullable(form.courierOwner),
      paymentOwner: toNullable(form.paymentOwner),
      goLiveTargetDate: toNullable(form.goLiveTargetDate),
      notes: toNullable(form.notes)
    };

    try {
      const saved = props.selectedPilot
        ? await updateAdminPilot(props.session, props.selectedPilot.id, input)
        : await createAdminPilot(props.session, { orgId: form.orgId, ...input });
      props.onSaved(saved);
      if (!props.selectedPilot) {
        setForm(buildFormState(null));
      }
    } catch (issue) {
      props.onError(getUserFacingApiError(issue, "Unable to save pilot workspace."));
    }
  }

  return (
    <form className="sw-operational-surface admin-pilot-form" onSubmit={handleSubmit}>
      <div className="sw-card-header">
        <div>
          <p className="eyebrow">{props.selectedPilot ? "Update pilot" : "Create pilot"}</p>
          <h2>{props.selectedPilot ? props.selectedPilot.orgName ?? "Pilot workspace" : "New pilot workspace"}</h2>
          <p className="ops-detail-note">Admin-led profile only. This does not disable or automate operations in v1.</p>
        </div>
      </div>
      <div className="form-grid">
        <label>
          <span>Org ID</span>
          <input
            disabled={Boolean(props.selectedPilot) || props.disabled}
            onChange={(event) => setForm((current) => ({ ...current, orgId: event.target.value }))}
            placeholder="org uuid"
            required
            value={form.orgId}
          />
        </label>
        <label>
          <span>Mode</span>
          <select disabled={props.disabled} onChange={(event) => setForm((current) => ({ ...current, mode: event.target.value as PilotWorkspaceMode }))} value={form.mode}>
            {MODE_OPTIONS.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select disabled={props.disabled} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as PilotWorkspaceStatus }))} value={form.status}>
            {STATUS_OPTIONS.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
          </select>
        </label>
        <label>
          <span>Readiness stage</span>
          <select disabled={props.disabled} onChange={(event) => setForm((current) => ({ ...current, readinessStage: event.target.value as PilotReadinessStage }))} value={form.readinessStage}>
            {STAGE_OPTIONS.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
          </select>
        </label>
        <label>
          <span>Pilot owner</span>
          <input disabled={props.disabled} onChange={(event) => setForm((current) => ({ ...current, pilotOwner: event.target.value }))} value={form.pilotOwner} />
        </label>
        <label>
          <span>Support owner</span>
          <input disabled={props.disabled} onChange={(event) => setForm((current) => ({ ...current, supportOwner: event.target.value }))} value={form.supportOwner} />
        </label>
        <label>
          <span>Courier owner</span>
          <input disabled={props.disabled} onChange={(event) => setForm((current) => ({ ...current, courierOwner: event.target.value }))} value={form.courierOwner} />
        </label>
        <label>
          <span>Payment owner</span>
          <input disabled={props.disabled} onChange={(event) => setForm((current) => ({ ...current, paymentOwner: event.target.value }))} value={form.paymentOwner} />
        </label>
        <label>
          <span>Go-live target</span>
          <input disabled={props.disabled} onChange={(event) => setForm((current) => ({ ...current, goLiveTargetDate: event.target.value }))} type="date" value={form.goLiveTargetDate} />
        </label>
      </div>
      <label>
        <span>Notes</span>
        <textarea disabled={props.disabled} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={3} value={form.notes} />
      </label>
      <div className="sw-row">
        <button className="sw-button sw-button--primary button button-primary" disabled={props.disabled} type="submit">
          {props.selectedPilot ? "Update pilot profile" : "Create pilot profile"}
        </button>
      </div>
    </form>
  );
}

export function PilotRow(props: { pilot: PilotWorkspace; active: boolean; onSelect: (pilot: PilotWorkspace) => void }) {
  const guardrail = getPilotGuardrailState({ workspace: props.pilot, checks: [], guidance: "" }, { canManagePilots: true });

  return (
    <button className={`sw-list-row admin-pilot-row ${props.active ? "admin-pilot-row-active" : ""}`} onClick={() => props.onSelect(props.pilot)} type="button">
      <div>
        <div className="briefing-evidence-row">
          <span className={`sw-badge ${pilotGuardrailBadgeClass(guardrail.guardrailLevel)}`}>{guardrail.badgeCopy}</span>
          <span className={`sw-badge ${badgeClass(props.pilot.mode)}`}>{formatLabel(props.pilot.mode)}</span>
          <span className={`sw-badge ${badgeClass(props.pilot.status)}`}>{formatLabel(props.pilot.status)}</span>
          <span>{completionCopy(props.pilot)}</span>
        </div>
        <strong>{props.pilot.orgName ?? props.pilot.orgId}</strong>
        <p>{formatLabel(props.pilot.readinessStage)} · owner {props.pilot.pilotOwner ?? "unassigned"}</p>
        <p className="ops-detail-note">Guardrail: {guardrail.recommendedAction}</p>
      </div>
      <div className="admin-pilot-row-posture">
        <span>{props.pilot.posture.activeJobs} active jobs</span>
        <span>{props.pilot.posture.unresolvedSupportEscalations} support</span>
        <span>{props.pilot.posture.paymentRisks} payment risks</span>
      </div>
    </button>
  );
}

function ChecklistEditor(props: {
  checks: PilotReadinessCheck[];
  disabled: boolean;
  onUpdate: (check: PilotReadinessCheck, status: PilotReadinessCheckStatus, evidence: string | null) => void;
}) {
  if (!props.checks.length) {
    return (
      <div className="sw-empty-state admin-empty-state">
        <strong className="sw-empty-title">Select a pilot workspace</strong>
        <p className="sw-empty-copy">Checklist controls appear after a pilot profile is selected.</p>
      </div>
    );
  }

  return (
    <div className="admin-pilot-check-list">
      {props.checks.map((check) => (
        <article className="sw-list-row admin-pilot-check-row" key={check.id}>
          <div>
            <span className={`sw-badge ${badgeClass(check.status)}`}>{formatLabel(check.status)}</span>
            <strong>{check.label}</strong>
            <p>{check.evidence ?? "No evidence recorded yet."}</p>
          </div>
          <div className="admin-pilot-check-actions">
            <select
              disabled={props.disabled}
              onChange={(event) => props.onUpdate(check, event.target.value as PilotReadinessCheckStatus, check.evidence)}
              value={check.status}
            >
              {CHECK_STATUS_OPTIONS.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
            </select>
            <button
              className="sw-button sw-button--secondary button button-secondary"
              disabled={props.disabled}
              onClick={() => props.onUpdate(check, check.status, check.evidence ?? "Reviewed by platform admin.")}
              type="button"
            >
              Add evidence note
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

export function AdminPilotsShell() {
  const router = useRouter();
  const { status, session, error, refreshBusinessSession, signOut } = useBusinessAuth();
  const [pilots, setPilots] = useState<PilotWorkspace[]>([]);
  const [selectedPilot, setSelectedPilot] = useState<PilotWorkspace | null>(null);
  const [checks, setChecks] = useState<PilotReadinessCheck[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const summary = useMemo(() => ({
    total: pilots.length,
    active: pilots.filter((pilot) => pilot.status === "ACTIVE").length,
    paused: pilots.filter((pilot) => pilot.status === "PAUSED").length,
    liveReady: pilots.filter((pilot) => pilot.mode === "LIVE_READY" && pilot.readinessStage === "PILOT_READY").length,
    notRehearsalReady: pilots.filter((pilot) => !["REHEARSAL_READY", "PILOT_READY"].includes(pilot.readinessStage)).length
  }), [pilots]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(buildAuthRedirectTarget({ pathname: "/admin/pilots" }));
    }
  }, [router, status]);

  useEffect(() => {
    if (status !== "authenticated" || !session) {
      return;
    }

    let active = true;
    setLoadError(null);
    void listAdminPilots(session)
      .then((items) => {
        if (!active) return;
        setPilots(items);
        setSelectedPilot((current) => current ?? items[0] ?? null);
      })
      .catch((issue) => {
        if (active) setLoadError(getUserFacingApiError(issue, "Unable to load pilot workspaces."));
      });

    return () => {
      active = false;
    };
  }, [session, status]);

  useEffect(() => {
    if (!session || !selectedPilot) {
      setChecks([]);
      return;
    }

    let active = true;
    void listAdminPilotChecks(session, selectedPilot.id)
      .then((items) => {
        if (active) setChecks(items);
      })
      .catch((issue) => {
        if (active) setLoadError(getUserFacingApiError(issue, "Unable to load pilot readiness checks."));
      });
    return () => {
      active = false;
    };
  }, [selectedPilot, session]);

  if (status === "loading") {
    return <main className="app-shell loading-shell"><section className="ops-empty-state"><h1>Loading pilot management...</h1></section></main>;
  }

  if (status === "error") {
    return <main className="app-shell loading-shell"><section className="ops-empty-state"><h1>Unable to restore session</h1><p>{error}</p></section></main>;
  }

  if (status !== "authenticated") {
    return null;
  }

  if (!session?.context.platformAdmin) {
    return <main className="app-shell loading-shell"><section className="ops-empty-state"><h1>Platform admin required</h1><p>Pilot management is restricted to platform admins.</p></section></main>;
  }

  async function handleSaved(pilot: PilotWorkspace) {
    setPilots((current) => {
      const exists = current.some((item) => item.id === pilot.id);
      return exists ? current.map((item) => (item.id === pilot.id ? pilot : item)) : [pilot, ...current];
    });
    setSelectedPilot(pilot);
  }

  async function handleUpdateCheck(check: PilotReadinessCheck, nextStatus: PilotReadinessCheckStatus, evidence: string | null) {
    if (!session || !selectedPilot) return;
    setSubmitting(true);
    setLoadError(null);
    try {
      const updated = await updateAdminPilotCheck(session, selectedPilot.id, check.id, { status: nextStatus, evidence });
      setChecks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      const refreshed = await listAdminPilots(session);
      setPilots(refreshed);
      setSelectedPilot(refreshed.find((item) => item.id === selectedPilot.id) ?? selectedPilot);
    } catch (issue) {
      setLoadError(getUserFacingApiError(issue, "Unable to update readiness check."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="app-shell admin-shell-page">
      <div className="sw-row-between admin-shell-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Pilot management</p>
          <h1>Pilot Workspaces</h1>
          <p>Admin-led readiness, owner, and operating-mode tracking for controlled pilots.</p>
        </div>
        <div className="hero-actions">
          <AdminWorkspaceLink />
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/command">Command view</Link>
          <button className="button button-secondary" onClick={() => void refreshBusinessSession()} type="button">Refresh</button>
          <button className="button button-primary" onClick={() => void signOut().then(() => router.replace("/get-started"))} type="button">Sign Out</button>
        </div>
      </div>

      {loadError ? <div className="form-error-banner">{loadError}</div> : null}

      <section className="sw-command-surface admin-command-page-hero">
        <div className="sw-row admin-command-page-copy">
          <span className="sw-icon-badge sw-icon-badge--info" aria-hidden="true"><ShipWrightIcon name="queue" /></span>
          <div>
            <span className="sw-badge sw-badge--info">Human reviewed</span>
            <p className="eyebrow">Pilot posture</p>
            <h2>{summary.total} pilot workspace{summary.total === 1 ? "" : "s"} tracked</h2>
            <p>No workflows are disabled by this layer in v1. Platform admins review readiness before expanding real-world usage.</p>
          </div>
        </div>
        <div className="admin-command-page-counts">
          <div className="sw-metric-card sw-supporting-surface admin-command-metric-card"><span className="sw-metric-label">Active pilots</span><strong className="sw-metric-value">{summary.active}</strong></div>
          <div className="sw-metric-card sw-supporting-surface admin-command-metric-card"><span className="sw-metric-label">Live-ready</span><strong className="sw-metric-value">{summary.liveReady}</strong></div>
          <div className="sw-metric-card sw-supporting-surface admin-command-metric-card"><span className="sw-metric-label">Paused pilots</span><strong className="sw-metric-value">{summary.paused}</strong></div>
          <div className="sw-metric-card sw-supporting-surface admin-command-metric-card"><span className="sw-metric-label">Not rehearsal-ready</span><strong className="sw-metric-value">{summary.notRehearsalReady}</strong></div>
        </div>
      </section>

      <div className="admin-pilot-layout">
        <section className="sw-operational-surface admin-section">
          <div className="sw-card-header admin-section-header">
            <div>
              <p className="eyebrow">Pilot queue</p>
              <h2>Workspaces</h2>
            </div>
          </div>
          <div className="admin-command-list">
            {pilots.length ? pilots.map((pilot) => (
              <PilotRow active={selectedPilot?.id === pilot.id} key={pilot.id} onSelect={setSelectedPilot} pilot={pilot} />
            )) : (
              <div className="sw-empty-state admin-empty-state">
                <strong className="sw-empty-title">No pilot workspaces yet</strong>
                <p className="sw-empty-copy">Create a profile with a staging org ID to start tracking readiness.</p>
              </div>
            )}
          </div>
        </section>

        <div className="sw-stack">
          <PilotForm disabled={submitting} onError={setLoadError} onSaved={(pilot) => void handleSaved(pilot)} selectedPilot={selectedPilot} session={session} />
          <section className="sw-supporting-surface admin-section">
          <div className="sw-card-header admin-section-header">
            <div>
              <p className="eyebrow">Readiness checklist</p>
              <h2>{selectedPilot?.orgName ?? "Checklist"}</h2>
            </div>
            {selectedPilot ? (
              <Link className="sw-button sw-button--secondary button button-secondary" href={`/admin/pilots/${selectedPilot.id}/rehearsal`}>
                Rehearsal cockpit
              </Link>
            ) : null}
          </div>
            <ChecklistEditor checks={checks} disabled={submitting} onUpdate={(check, statusValue, evidence) => void handleUpdateCheck(check, statusValue, evidence)} />
          </section>
        </div>
      </div>
    </main>
  );
}
