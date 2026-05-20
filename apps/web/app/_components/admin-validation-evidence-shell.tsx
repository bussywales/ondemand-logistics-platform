"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { useEffect, useMemo, useState } from "react";
import { getLatestAdminValidationEvidence, getUserFacingApiError, listAdminValidationEvidence } from "../_lib/api";
import type { ValidationEvidenceLatest, ValidationEvidenceRun, ValidationEvidenceStatus } from "../_lib/product-state";
import { buildAuthRedirectTarget } from "../_lib/route-protection";
import { BrandLogo } from "./brand-logo";
import { useBusinessAuth } from "./business-auth-provider";

const EVIDENCE_UNAVAILABLE = "Validation evidence unavailable. Refresh or contact support.";

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusTone(status: ValidationEvidenceStatus) {
  if (status === "PASSED") return "sw-badge--success";
  if (status === "FAILED") return "sw-badge--danger";
  if (status === "SKIPPED") return "sw-badge--neutral";
  return "sw-badge--warning";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function EvidenceCard(props: { label: string; run: ValidationEvidenceRun | null }) {
  return (
    <article className="sw-metric-card sw-supporting-surface admin-command-metric-card">
      <span className="sw-metric-label">{props.label}</span>
      <strong className="sw-metric-value">{props.run ? formatLabel(props.run.status) : "Missing"}</strong>
      <p className="sw-metric-copy">
        {props.run ? `${props.run.source} · ${formatDate(props.run.createdAt)}` : "No stored evidence yet."}
      </p>
      <span className={`sw-badge ${props.run ? statusTone(props.run.status) : "sw-badge--warning"}`}>
        {props.run ? formatLabel(props.run.evidenceType) : "Run and record"}
      </span>
    </article>
  );
}

function EvidenceRow(props: { run: ValidationEvidenceRun }) {
  return (
    <article className="sw-list-row admin-command-report-action">
      <div className="sw-stack-sm">
        <div className="admin-command-item-meta">
          <span className={`sw-badge ${statusTone(props.run.status)}`}>{formatLabel(props.run.status)}</span>
          <span>{formatLabel(props.run.evidenceType)}</span>
          <span>{props.run.environment}</span>
          <span>{formatDate(props.run.createdAt)}</span>
        </div>
        <strong>{props.run.source}</strong>
        <p className="ops-detail-note">{props.run.command ?? "Command not recorded."}</p>
        <div className="admin-demo-request-follow-up-meta">
          <span>Artifact: {props.run.artifactPath ?? "not stored"}</span>
          <span>Order: {props.run.relatedOrderId ? props.run.relatedOrderId.slice(0, 8).toUpperCase() : "none"}</span>
          <span>Job: {props.run.relatedJobId ? props.run.relatedJobId.slice(0, 8).toUpperCase() : "none"}</span>
        </div>
        {Object.keys(props.run.summary).length ? (
          <details className="admin-demo-request-history">
            <summary>Summary details</summary>
            <pre className="ops-code-block">{JSON.stringify(props.run.summary, null, 2)}</pre>
          </details>
        ) : null}
      </div>
    </article>
  );
}

export function AdminValidationEvidenceView(props: { latest: ValidationEvidenceLatest | null; runs: ValidationEvidenceRun[] }) {
  const latestCards = props.latest
    ? [
        { label: "Release verification", run: props.latest.items.releaseVerify },
        { label: "Paid-delivery proof", run: props.latest.items.paidDeliveryProof },
        { label: "Browser smoke", run: props.latest.items.playwrightSmoke },
        { label: "Required-auth smoke", run: props.latest.items.playwrightSmokeRequiredAuth }
      ]
    : [];
  const passedCount = useMemo(() => props.runs.filter((run) => run.status === "PASSED").length, [props.runs]);

  return (
    <section className="ops-stack admin-command-stack">
      <section className="sw-command-surface admin-command-page-hero">
        <div className="admin-command-page-copy">
          <span className="sw-badge sw-badge--info">Stored validation evidence</span>
          <p className="eyebrow">Pilot readiness proof</p>
          <h2>{props.runs.length ? `${passedCount}/${props.runs.length} stored runs passed` : "No stored validation evidence yet"}</h2>
          <p>
            Evidence is written by validation scripts or explicit recording commands. This page is read-only and does not run release verification, proof, or browser smoke.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/pilots">Pilot workspaces</Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/command">Admin command</Link>
        </div>
      </section>

      <section className="sw-operational-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Latest evidence</p>
            <h2>Current staging validation posture</h2>
            <p className="ops-detail-note">Rehearsal readiness treats evidence older than 24 hours as stale.</p>
          </div>
        </div>
        <div className="admin-command-page-counts">
          {latestCards.length ? latestCards.map((card) => <EvidenceCard key={card.label} {...card} />) : <p className="ops-detail-note">No latest evidence available.</p>}
        </div>
      </section>

      <section className="sw-supporting-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Evidence history</p>
            <h2>Recent validation runs</h2>
          </div>
        </div>
        {props.runs.length ? (
          <div className="admin-command-list">
            {props.runs.map((run) => <EvidenceRow key={run.id} run={run} />)}
          </div>
        ) : (
          <div className="sw-empty-state admin-empty-state">
            <strong className="sw-empty-title">No evidence recorded</strong>
            <p className="sw-empty-copy">Run validation commands with evidence recording enabled or use the evidence recording script after a successful smoke/proof run.</p>
          </div>
        )}
      </section>
    </section>
  );
}

export function AdminValidationEvidenceShell() {
  const router = useRouter();
  const { status, session, error, refreshBusinessSession, signOut } = useBusinessAuth();
  const [latest, setLatest] = useState<ValidationEvidenceLatest | null>(null);
  const [runs, setRuns] = useState<ValidationEvidenceRun[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(buildAuthRedirectTarget({ pathname: "/admin/validation-evidence" }));
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
    void Promise.all([getLatestAdminValidationEvidence(session), listAdminValidationEvidence(session, { limit: 50 })])
      .then(([nextLatest, nextRuns]) => {
        if (!active) return;
        setLatest(nextLatest);
        setRuns(nextRuns);
      })
      .catch((issue) => {
        if (active) setLoadError(getUserFacingApiError(issue, EVIDENCE_UNAVAILABLE));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session, status]);

  if (status === "loading" || loading) {
    return <main className="app-shell loading-shell"><section className="ops-empty-state"><h1>Loading validation evidence...</h1></section></main>;
  }

  if (status === "error") {
    return <main className="app-shell loading-shell"><section className="ops-empty-state"><h1>Unable to restore session</h1><p>{error}</p></section></main>;
  }

  if (status !== "authenticated") {
    return null;
  }

  if (!session?.context.platformAdmin) {
    return <main className="app-shell loading-shell"><section className="ops-empty-state"><h1>Platform admin required</h1><p>Validation evidence is restricted to platform admins.</p></section></main>;
  }

  return (
    <main className="app-shell admin-shell-page">
      <div className="sw-row-between admin-shell-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Validation evidence</p>
          <h1>Stored Evidence</h1>
          <p>Release verification, paid-delivery proof, and browser smoke history for pilot readiness.</p>
        </div>
        <div className="hero-actions">
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin">Admin home</Link>
          <button className="button button-secondary" onClick={() => void refreshBusinessSession()} type="button">Refresh</button>
          <button className="button button-primary" onClick={() => void signOut().then(() => router.replace("/get-started"))} type="button">Sign Out</button>
        </div>
      </div>

      {loadError ? <div className="form-error-banner">{loadError}</div> : null}
      <AdminValidationEvidenceView latest={latest} runs={runs} />
    </main>
  );
}
