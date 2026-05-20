"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  executeAdminOperationalReset,
  getUserFacingApiError,
  listAdminOperationalResets,
  previewAdminOperationalReset
} from "../_lib/api";
import type {
  ExecuteOperationalResetInput,
  OperationalResetMode,
  OperationalResetPreview,
  OperationalResetRequestInput,
  OperationalResetRun
} from "../_lib/product-state";
import { buildAuthRedirectTarget } from "../_lib/route-protection";
import { BrandLogo } from "./brand-logo";
import { useBusinessAuth } from "./business-auth-provider";
import { ShipWrightIcon } from "./shipwright-icon";

const RESET_MODES: Array<Exclude<OperationalResetMode, "PREVIEW">> = [
  "FULL_DEMO_TIDY",
  "ARCHIVE_DEMO_REQUESTS",
  "CLOSE_TEST_ESCALATIONS",
  "MARK_STALE_PILOT_REHEARSAL"
];

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function defaultOlderThanInput() {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().slice(0, 10);
}

function toOlderThanIso(value: string) {
  return value ? new Date(`${value}T00:00:00.000Z`).toISOString() : null;
}

export function getOperationalResetModeCopy(mode: Exclude<OperationalResetMode, "PREVIEW">) {
  switch (mode) {
    case "ARCHIVE_DEMO_REQUESTS":
      return "Close/archive old demo requests without deleting lead history.";
    case "CLOSE_TEST_ESCALATIONS":
      return "Resolve support escalations clearly marked test, demo, smoke, or staging.";
    case "MARK_STALE_PILOT_REHEARSAL":
      return "Record stale pilot rehearsal recommendations without mutating pilot state.";
    case "FULL_DEMO_TIDY":
      return "Run all safe demo tidy actions. Proof orders, jobs, and payments remain untouched.";
  }
}

function SummaryTile(props: { label: string; value: number | string; copy: string }) {
  return (
    <div className="sw-metric-card sw-supporting-surface admin-command-metric-card">
      <span className="sw-metric-label">{props.label}</span>
      <strong className="sw-metric-value">{props.value}</strong>
      <p className="sw-metric-copy">{props.copy}</p>
    </div>
  );
}

export function AdminOperationalResetsView(props: {
  busy: boolean;
  confirmation: string;
  error: string | null;
  mode: Exclude<OperationalResetMode, "PREVIEW">;
  olderThan: string;
  onConfirmationChange: (value: string) => void;
  onExecute: () => void;
  onModeChange: (mode: Exclude<OperationalResetMode, "PREVIEW">) => void;
  onOlderThanChange: (value: string) => void;
  onPreview: () => void;
  onReasonChange: (value: string) => void;
  preview: OperationalResetPreview | null;
  reason: string;
  runs: OperationalResetRun[];
}) {
  const canExecute = props.confirmation === "RESET DEMO DATA" && Boolean(props.preview?.items.length) && !props.busy;
  const latestRun = props.runs[0] ?? null;

  return (
    <section className="admin-operational-reset-layout">
      <section className="sw-command-surface admin-command-surface admin-operational-reset-hero">
        <div className="sw-row admin-command-copy">
          <span className="sw-icon-badge sw-icon-badge--info" aria-hidden="true">
            <ShipWrightIcon name="queue" />
          </span>
          <div>
            <p className="eyebrow">Operational reset tools</p>
            <h1>Prepare staging demos without deleting evidence</h1>
            <p>
              Preview and record non-destructive tidy actions. Reset tools never delete audit history, payment evidence,
              paid-delivery proof records, orders, or jobs.
            </p>
          </div>
        </div>
        <div className="admin-section-actions">
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/command">Admin command</Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/pilots">Pilot workspaces</Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/demo-requests">Demo requests</Link>
        </div>
      </section>

      {props.error ? <p className="form-error" role="alert">{props.error}</p> : null}

      <section className="sw-operational-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Preview first</p>
            <h2>Reset mode</h2>
            <p className="ops-detail-note">Execute requires typed confirmation. Preview does not mutate data.</p>
          </div>
        </div>

        <div className="support-escalation-form admin-operational-reset-form">
          <label>
            <span>Mode</span>
            <select value={props.mode} onChange={(event) => props.onModeChange(event.target.value as Exclude<OperationalResetMode, "PREVIEW">)}>
              {RESET_MODES.map((mode) => (
                <option key={mode} value={mode}>{formatLabel(mode)}</option>
              ))}
            </select>
          </label>
          <p className="ops-detail-note">{getOperationalResetModeCopy(props.mode)}</p>
          <label>
            <span>Older than</span>
            <input type="date" value={props.olderThan} onChange={(event) => props.onOlderThanChange(event.target.value)} />
          </label>
          <label>
            <span>Reason</span>
            <textarea value={props.reason} onChange={(event) => props.onReasonChange(event.target.value)} rows={3} />
          </label>
          <div className="hero-actions">
            <button className="sw-button sw-button--secondary button button-secondary" disabled={props.busy} onClick={props.onPreview} type="button">
              Preview reset
            </button>
          </div>
        </div>
      </section>

      <section className="sw-supporting-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Affected items</p>
            <h2>{props.preview ? `${props.preview.summary.affectedCount} item${props.preview.summary.affectedCount === 1 ? "" : "s"} in preview` : "No preview yet"}</h2>
            <p className="ops-detail-note">{props.preview?.summary.message ?? "Run a preview before executing any tidy action."}</p>
          </div>
          {props.preview?.summary.proofRecordsUntouched ? <span className="sw-badge sw-badge--success">Proof untouched</span> : null}
        </div>

        {props.preview ? (
          <>
            <div className="admin-command-page-counts">
              <SummaryTile label="Demo requests" value={props.preview.summary.demoRequests} copy="Old or already closed commercial intake records." />
              <SummaryTile label="Support records" value={props.preview.summary.supportEscalations} copy="Clearly marked test/demo support escalations." />
              <SummaryTile label="Pilot recommendations" value={props.preview.summary.pilotRecommendations} copy="Stale rehearsal states reported but not mutated." />
              <SummaryTile label="Hard deletes" value="0" copy="Reset tools only close, record, or recommend." />
            </div>
            {props.preview.items.length ? (
              <div className="admin-command-list">
                {props.preview.items.map((item) => (
                  <article className="sw-list-row admin-command-report-action" key={`${item.resourceType}:${item.resourceId}`}>
                    <div>
                      <div className="admin-command-item-meta">
                        <span className="sw-badge sw-badge--neutral">{item.resourceType.replaceAll("_", " ")}</span>
                        <span>{item.resourceId.slice(0, 8).toUpperCase()}</span>
                      </div>
                      <strong>{item.label}</strong>
                      <p>{item.reason}</p>
                    </div>
                    <span className="sw-badge sw-badge--info">{item.action}</span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="sw-empty-state admin-empty-state">
                <strong className="sw-empty-title">Nothing to tidy</strong>
                <p className="sw-empty-copy">No records match this reset mode and threshold.</p>
              </div>
            )}
          </>
        ) : null}
      </section>

      <section className="sw-operational-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Execute</p>
            <h2>Typed confirmation required</h2>
            <p className="ops-detail-note">Type RESET DEMO DATA to execute the current preview. This records a reset run and affected reset items.</p>
          </div>
        </div>
        <div className="support-escalation-form admin-operational-reset-form">
          <label>
            <span>Confirmation</span>
            <input value={props.confirmation} onChange={(event) => props.onConfirmationChange(event.target.value)} placeholder="RESET DEMO DATA" />
          </label>
          <button className="sw-button sw-button--primary button button-primary" disabled={!canExecute} onClick={props.onExecute} type="button">
            Execute non-destructive reset
          </button>
        </div>
      </section>

      <section className="sw-supporting-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Reset history</p>
            <h2>{latestRun ? `Latest run ${formatDateTime(latestRun.createdAt)}` : "No reset runs yet"}</h2>
            <p className="ops-detail-note">History records who ran the reset, why, and the non-destructive summary.</p>
          </div>
        </div>
        {props.runs.length ? (
          <div className="admin-command-list">
            {props.runs.map((run) => (
              <article className="sw-list-row admin-command-report-action" key={run.id}>
                <div>
                  <div className="admin-command-item-meta">
                    <span className="sw-badge sw-badge--success">{run.status.toLowerCase()}</span>
                    <span>{formatLabel(run.mode)}</span>
                    <span>{formatDateTime(run.createdAt)}</span>
                  </div>
                  <strong>{run.reason}</strong>
                  <p>{run.summary.message}</p>
                </div>
                <span className="sw-badge sw-badge--neutral">{run.summary.affectedCount} affected</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="sw-empty-state admin-empty-state">
            <strong className="sw-empty-title">No reset evidence yet</strong>
            <p className="sw-empty-copy">Completed reset runs will appear here. Proof artifacts remain historical and unmodified.</p>
          </div>
        )}
      </section>
    </section>
  );
}

export function AdminOperationalResetsShell() {
  const router = useRouter();
  const { status, session, error, refreshBusinessSession, signOut } = useBusinessAuth();
  const [runs, setRuns] = useState<OperationalResetRun[]>([]);
  const [preview, setPreview] = useState<OperationalResetPreview | null>(null);
  const [mode, setMode] = useState<Exclude<OperationalResetMode, "PREVIEW">>("FULL_DEMO_TIDY");
  const [olderThan, setOlderThan] = useState(defaultOlderThanInput());
  const [reason, setReason] = useState("Prepare staging for a controlled demo rehearsal.");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(buildAuthRedirectTarget({ pathname: "/admin/operational-resets" }));
    }
  }, [router, status]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.context.platformAdmin) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setLoadError(null);
    void listAdminOperationalResets(session)
      .then((items) => {
        if (active) setRuns(items);
      })
      .catch((issue) => {
        if (active) setLoadError(getUserFacingApiError(issue, "Operational reset history unavailable. Refresh or contact support."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session, status]);

  const currentInput = useMemo<OperationalResetRequestInput>(() => ({
    mode,
    scope: "staging_demo",
    reason,
    olderThan: toOlderThanIso(olderThan)
  }), [mode, olderThan, reason]);

  async function handlePreview() {
    if (!session) return;
    setBusy(true);
    setLoadError(null);
    try {
      setPreview(await previewAdminOperationalReset(session, currentInput));
      setConfirmation("");
    } catch (issue) {
      setLoadError(getUserFacingApiError(issue, "Unable to preview reset. Check the reason and threshold."));
    } finally {
      setBusy(false);
    }
  }

  async function handleExecute() {
    if (!session || confirmation !== "RESET DEMO DATA") return;
    setBusy(true);
    setLoadError(null);
    try {
      const run = await executeAdminOperationalReset(session, {
        ...currentInput,
        confirmation
      } as ExecuteOperationalResetInput);
      setRuns((current) => [run, ...current]);
      setPreview(null);
      setConfirmation("");
    } catch (issue) {
      setLoadError(getUserFacingApiError(issue, "Unable to execute reset. No hard deletes were attempted."));
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="app-shell loading-shell">
        <section className="sw-empty-state"><strong className="sw-empty-title">Loading operational reset tools</strong></section>
      </main>
    );
  }

  if (!session?.context.platformAdmin) {
    return (
      <main className="app-shell loading-shell">
        <section className="sw-empty-state">
          <p className="eyebrow">Platform admin required</p>
          <h1>Operational reset tools are restricted.</h1>
          <p>{error ?? "Sign in with a platform admin account to prepare controlled demo resets."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell admin-shell-page">
      <div className="sw-row-between admin-shell-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Admin utility</p>
          <h1>Operational resets</h1>
          <p>Non-destructive staging/demo tidy controls with reset-run evidence.</p>
        </div>
        <div className="hero-actions">
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin">Admin home</Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/command">Command view</Link>
          <button className="button button-secondary" onClick={() => void refreshBusinessSession()} type="button">Refresh session</button>
          <button className="button button-primary" onClick={() => void signOut().then(() => router.replace("/get-started"))} type="button">Sign out</button>
        </div>
      </div>

      <AdminOperationalResetsView
        busy={busy}
        confirmation={confirmation}
        error={loadError}
        mode={mode}
        olderThan={olderThan}
        onConfirmationChange={setConfirmation}
        onExecute={() => void handleExecute()}
        onModeChange={setMode}
        onOlderThanChange={setOlderThan}
        onPreview={() => void handlePreview()}
        onReasonChange={setReason}
        preview={preview}
        reason={reason}
        runs={runs}
      />
    </main>
  );
}
