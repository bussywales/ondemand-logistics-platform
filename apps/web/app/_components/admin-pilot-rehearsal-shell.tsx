"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { ShipWrightIcon } from "./shipwright-icon";
import { useBusinessAuth } from "./business-auth-provider";
import { getAdminPilotRehearsal, getUserFacingApiError } from "../_lib/api";
import { buildAuthRedirectTarget } from "../_lib/route-protection";
import type { PilotRehearsalRecommendation, PilotRehearsalSummary, PilotRehearsalValidationStatus } from "../_lib/product-state";

const REHEARSAL_UNAVAILABLE_MESSAGE = "Pilot rehearsal data unavailable. Refresh or contact support.";

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function recommendationTone(value: PilotRehearsalRecommendation) {
  if (value === "READY_FOR_REHEARSAL") return "sw-badge--success";
  if (value === "BLOCKED") return "sw-badge--danger";
  if (value === "UNKNOWN") return "sw-badge--neutral";
  return "sw-badge--warning";
}

function validationTone(value: PilotRehearsalValidationStatus) {
  if (value === "PASSED") return "sw-badge--success";
  if (value === "FAILED") return "sw-badge--danger";
  if (value === "SKIPPED") return "sw-badge--neutral";
  return "sw-badge--warning";
}

function CountCard(props: { label: string; value: number; copy: string; tone?: "success" | "warning" | "danger" | "info" }) {
  return (
    <div className="sw-metric-card sw-supporting-surface admin-command-metric-card">
      <span className={`sw-metric-icon sw-icon-badge ${props.tone === "success" ? "sw-icon-badge--success" : props.tone === "danger" || props.tone === "warning" ? "sw-icon-badge--warning" : "sw-icon-badge--info"}`} aria-hidden="true">
        <ShipWrightIcon name={props.tone === "success" ? "check" : props.tone === "danger" || props.tone === "warning" ? "warning" : "queue"} />
      </span>
      <span className="sw-metric-label">{props.label}</span>
      <strong className="sw-metric-value">{props.value}</strong>
      <p className="sw-metric-copy">{props.copy}</p>
    </div>
  );
}

export function AdminPilotRehearsalView(props: { summary: PilotRehearsalSummary }) {
  const { summary } = props;
  const blocked = summary.recommendation === "BLOCKED";
  const ready = summary.recommendation === "READY_FOR_REHEARSAL";
  const surfaceClass = blocked ? "sw-decision-surface" : ready ? "sw-command-surface" : "sw-operational-surface";
  const validationSignals = [
    summary.validationPosture.releaseVerification,
    summary.validationPosture.paidDeliveryProof,
    summary.validationPosture.browserSmoke,
    summary.validationPosture.requiredAuthSmoke
  ];

  return (
    <section className="ops-stack admin-command-stack">
      <section className={`${surfaceClass} admin-command-page-hero rehearsal-cockpit-hero`}>
        <div className="sw-row admin-command-page-copy">
          <span className={`sw-icon-badge ${ready ? "sw-icon-badge--success" : "sw-icon-badge--warning"}`} aria-hidden="true">
            <ShipWrightIcon name={ready ? "check" : "warning"} />
          </span>
          <div>
            <span className={`sw-badge ${recommendationTone(summary.recommendation)}`}>{formatLabel(summary.recommendation)}</span>
            <p className="eyebrow">Pilot rehearsal cockpit</p>
            <h2>{summary.workspace.orgName ?? "Pilot workspace"} rehearsal readiness</h2>
            <p>{summary.guardrailState.message}</p>
            <p className="ops-detail-note">Human review required. This cockpit does not run proof commands, block workflows, or approve pilot expansion automatically.</p>
          </div>
        </div>
        <div className="hero-actions">
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/pilots">Pilot management</Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/command">Admin command</Link>
        </div>
      </section>

      <section className="sw-supporting-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Pilot context</p>
            <h2>{summary.guardrailState.title}</h2>
            <p className="ops-detail-note">{summary.guardrailState.recommendedAction}</p>
          </div>
          <span className={`sw-badge ${recommendationTone(summary.recommendation)}`}>{summary.guardrailState.badgeCopy}</span>
        </div>
        <div className="admin-command-report-grid">
          <div className="sw-list-row"><span>Mode</span><strong>{formatLabel(summary.workspace.mode)}</strong></div>
          <div className="sw-list-row"><span>Status</span><strong>{formatLabel(summary.workspace.status)}</strong></div>
          <div className="sw-list-row"><span>Readiness stage</span><strong>{formatLabel(summary.workspace.readinessStage)}</strong></div>
          <div className="sw-list-row"><span>Go-live target</span><strong>{summary.workspace.goLiveTargetDate ?? "Not set"}</strong></div>
        </div>
        <div className="briefing-evidence-row rehearsal-owner-row">
          <span>Pilot owner: {summary.workspace.pilotOwner ?? "Unassigned"}</span>
          <span>Support: {summary.workspace.supportOwner ?? "Unassigned"}</span>
          <span>Courier: {summary.workspace.courierOwner ?? "Unassigned"}</span>
          <span>Payment: {summary.workspace.paymentOwner ?? "Unassigned"}</span>
        </div>
      </section>

      <section className="sw-operational-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Readiness checklist</p>
            <h2>{summary.checklistSummary.passed + summary.checklistSummary.waived}/{summary.checklistSummary.total} checks clear or waived</h2>
          </div>
        </div>
        <div className="admin-command-page-counts">
          <CountCard copy="Ready evidence recorded." label="Passed" tone="success" value={summary.checklistSummary.passed} />
          <CountCard copy="Needs owner review." label="In progress" tone={summary.checklistSummary.inProgress ? "warning" : "info"} value={summary.checklistSummary.inProgress} />
          <CountCard copy="Blocks rehearsal until resolved or waived." label="Blocked" tone={summary.checklistSummary.blocked ? "danger" : "info"} value={summary.checklistSummary.blocked} />
          <CountCard copy="Not started yet." label="Not started" tone={summary.checklistSummary.notStarted ? "warning" : "info"} value={summary.checklistSummary.notStarted} />
        </div>
        <div className="admin-command-list rehearsal-check-list">
          {summary.checks.map((check) => (
            <article className="sw-list-row admin-command-report-action" key={check.id}>
              <div>
                <strong>{check.label}</strong>
                <p>{check.evidence ?? "No evidence recorded yet."}</p>
              </div>
              <span className={`sw-badge ${check.status === "PASSED" || check.status === "WAIVED" ? "sw-badge--success" : check.status === "BLOCKED" ? "sw-badge--danger" : "sw-badge--warning"}`}>
                {formatLabel(check.status)}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="sw-operational-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Operational posture</p>
            <h2>Live signals before rehearsal</h2>
          </div>
        </div>
        <div className="admin-command-page-counts">
          <CountCard copy="Jobs still active in this pilot workspace." label="Active jobs" tone={summary.operationalPosture.activeJobs ? "warning" : "success"} value={summary.operationalPosture.activeJobs} />
          <CountCard copy="Open support records requiring human follow-up." label="Open support" tone={summary.operationalPosture.unresolvedSupportEscalations ? "warning" : "success"} value={summary.operationalPosture.unresolvedSupportEscalations} />
          <CountCard copy="High or critical support records block rehearsal." label="High support" tone={summary.operationalPosture.highCriticalSupportEscalations ? "danger" : "success"} value={summary.operationalPosture.highCriticalSupportEscalations} />
          <CountCard copy="Order-linked payment risks still open." label="Payment risks" tone={summary.operationalPosture.openPaymentRisks ? "warning" : "success"} value={summary.operationalPosture.openPaymentRisks} />
          <CountCard copy="Couriers currently ready by readiness checks." label="Ready couriers" tone={summary.operationalPosture.readyCouriers ? "success" : "warning"} value={summary.operationalPosture.readyCouriers} />
        </div>
      </section>

      <section className="sw-supporting-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Validation posture</p>
            <h2>{summary.validationPosture.overallStatus === "PASSED" ? "Stored validation evidence is current" : "Stored validation evidence needs review"}</h2>
            <p className="ops-detail-note">
              {summary.validationPosture.recommendedAction} Freshness window: {summary.validationPosture.freshnessWindowHours} hours. The UI remains read-only and does not run validation commands.
            </p>
          </div>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/validation-evidence">Open evidence</Link>
        </div>
        <div className="admin-command-list">
          {validationSignals.map((signal) => (
            <article className="sw-list-row admin-command-report-action" key={signal.label}>
              <div>
                <strong>{signal.label}</strong>
                <p>{signal.summary}</p>
                <p className="ops-detail-note">
                  Evidence: {signal.evidenceAt ? `${new Date(signal.evidenceAt).toLocaleString("en-GB")} · ${signal.freshness}` : "not stored"}
                  {signal.evidence?.artifactPath ? ` · ${signal.evidence.artifactPath}` : ""}
                </p>
              </div>
              <span className={`sw-badge ${validationTone(signal.status)}`}>{formatLabel(signal.status)}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="sw-supporting-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Recommended next actions</p>
            <h2>What to clear before rehearsal</h2>
          </div>
        </div>
        <div className="admin-command-list">
          {summary.recommendedNextActions.map((action) => (
            <div className="sw-list-row admin-command-report-action" key={action}>
              <span className="sw-icon-badge sw-icon-badge--info" aria-hidden="true"><ShipWrightIcon name="arrow" /></span>
              <strong>{action}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="sw-supporting-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Known limitations</p>
            <h2>Review before presenting</h2>
          </div>
        </div>
        <p>{summary.guidance}</p>
        <div className="briefing-evidence-row">
          <span>No autonomous recovery actions</span>
          <span>No UI-triggered proof commands</span>
          <span>Stored evidence is summary-only and keeps proof artifacts uncommitted</span>
        </div>
      </section>
    </section>
  );
}

export function AdminPilotRehearsalShell(props: { pilotId: string }) {
  const router = useRouter();
  const { status, session, error, refreshBusinessSession, signOut } = useBusinessAuth();
  const [summary, setSummary] = useState<PilotRehearsalSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(buildAuthRedirectTarget({ pathname: `/admin/pilots/${props.pilotId}/rehearsal` }));
    }
  }, [props.pilotId, router, status]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.context.platformAdmin) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setLoadError(null);
    void getAdminPilotRehearsal(session, props.pilotId)
      .then((nextSummary) => {
        if (!active) return;
        setSummary(nextSummary);
      })
      .catch((issue) => {
        if (active) setLoadError(getUserFacingApiError(issue, REHEARSAL_UNAVAILABLE_MESSAGE));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [props.pilotId, session, status]);

  if (status === "loading" || loading) {
    return <main className="app-shell loading-shell"><section className="ops-empty-state"><h1>Loading rehearsal cockpit...</h1></section></main>;
  }

  if (status === "error") {
    return <main className="app-shell loading-shell"><section className="ops-empty-state"><h1>Unable to restore session</h1><p>{error}</p></section></main>;
  }

  if (status !== "authenticated") {
    return null;
  }

  if (!session?.context.platformAdmin) {
    return <main className="app-shell loading-shell"><section className="ops-empty-state"><h1>Platform admin required</h1><p>Pilot rehearsal is restricted to platform admins.</p></section></main>;
  }

  return (
    <main className="app-shell admin-shell-page">
      <div className="sw-row-between admin-shell-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Pilot rehearsal</p>
          <h1>Rehearsal Cockpit</h1>
          <p>Read-only readiness cockpit for controlled demos and pilot rehearsals.</p>
        </div>
        <div className="hero-actions">
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/pilots">Pilot management</Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/command">Admin command</Link>
          <button className="button button-secondary" onClick={() => void refreshBusinessSession()} type="button">Refresh</button>
          <button className="button button-primary" onClick={() => void signOut().then(() => router.replace("/get-started"))} type="button">Sign Out</button>
        </div>
      </div>

      {loadError ? <div className="form-error-banner">{loadError}</div> : null}
      {summary ? <AdminPilotRehearsalView summary={summary} /> : null}
    </main>
  );
}
