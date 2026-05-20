"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { ShipWrightIcon } from "./shipwright-icon";
import { useBusinessAuth } from "./business-auth-provider";
import { getAdminReleaseReadiness, getUserFacingApiError } from "../_lib/api";
import { buildAuthRedirectTarget } from "../_lib/route-protection";
import type { ReleaseReadinessEvidenceItem, ReleaseReadinessSummary, ReleaseReadinessVerdict, ValidationEvidenceStatus } from "../_lib/product-state";

const RELEASE_READINESS_UNAVAILABLE = "Release readiness unavailable. Refresh or contact support.";

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function verdictTone(value: ReleaseReadinessVerdict) {
  if (value === "READY") return "sw-badge--success";
  if (value === "BLOCKED") return "sw-badge--danger";
  return "sw-badge--warning";
}

function statusTone(value: ValidationEvidenceStatus) {
  if (value === "PASSED") return "sw-badge--success";
  if (value === "FAILED") return "sw-badge--danger";
  if (value === "SKIPPED") return "sw-badge--neutral";
  return "sw-badge--warning";
}

function formatAge(minutes: number | null) {
  if (minutes === null) return "not recorded";
  if (minutes < 60) return `${minutes}m old`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m old`;
}

function EvidenceChecklistRow(props: { item: ReleaseReadinessEvidenceItem }) {
  return (
    <article className="sw-list-row admin-command-report-action">
      <div className="sw-stack-sm">
        <div className="admin-command-item-meta">
          <span className={`sw-badge ${statusTone(props.item.status)}`}>{formatLabel(props.item.status)}</span>
          <span className={`sw-badge ${props.item.isFresh ? "sw-badge--success" : "sw-badge--warning"}`}>
            {props.item.isFresh ? "Fresh" : "Needs refresh"}
          </span>
          <span>{props.item.required ? "Required" : "Optional"}</span>
        </div>
        <strong>{props.item.label}</strong>
        <p className="ops-detail-note">
          {props.item.evidenceId ? `${formatAge(props.item.ageMinutes)} · ${props.item.source ?? "source not recorded"}` : "No stored evidence yet."}
        </p>
        <div className="admin-demo-request-follow-up-meta">
          <span>Evidence: {props.item.evidenceId ? props.item.evidenceId.slice(0, 8).toUpperCase() : "none"}</span>
          <span>Order: {props.item.relatedOrderId ? props.item.relatedOrderId.slice(0, 8).toUpperCase() : "none"}</span>
          <span>Job: {props.item.relatedJobId ? props.item.relatedJobId.slice(0, 8).toUpperCase() : "none"}</span>
          <span>Payment: {props.item.relatedPaymentId ? props.item.relatedPaymentId.slice(0, 8).toUpperCase() : "none"}</span>
          <span>POD: {props.item.relatedPodId ? props.item.relatedPodId.slice(0, 8).toUpperCase() : "none"}</span>
        </div>
      </div>
    </article>
  );
}

export function AdminReleaseReadinessView(props: { readiness: ReleaseReadinessSummary }) {
  const verdictIcon = props.readiness.verdict === "READY" ? "check" : "warning";
  const latestProof = props.readiness.requiredEvidence.find((item) => item.evidenceType === "PAID_DELIVERY_PROOF");
  const passedRequired = useMemo(
    () => props.readiness.requiredEvidence.filter((item) => item.status === "PASSED" && item.isFresh).length,
    [props.readiness.requiredEvidence]
  );

  return (
    <section className="ops-stack admin-command-stack">
      <section className={`${props.readiness.verdict === "BLOCKED" ? "sw-decision-surface" : "sw-command-surface"} admin-command-page-hero`}>
        <div className="sw-row admin-command-page-copy">
          <span className={`sw-icon-badge ${props.readiness.verdict === "READY" ? "sw-icon-badge--success" : "sw-icon-badge--warning"}`} aria-hidden="true">
            <ShipWrightIcon name={verdictIcon} />
          </span>
          <div>
            <span className={`sw-badge ${verdictTone(props.readiness.verdict)}`}>{formatLabel(props.readiness.verdict)}</span>
            <p className="eyebrow">Release readiness</p>
            <h2>{props.readiness.title}</h2>
            <p>{props.readiness.summary}</p>
            <p className="ops-detail-note">
              Reads stored evidence only. It does not execute validation commands. Freshness window: {props.readiness.freshnessWindowHours} hours.
            </p>
          </div>
        </div>
        <div className="hero-actions">
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/validation-evidence">Stored evidence</Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/command">Admin command</Link>
        </div>
      </section>

      <section className="sw-operational-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Evidence checklist</p>
            <h2>{passedRequired}/{props.readiness.requiredEvidence.length} required gates fresh and passed</h2>
            <p className="ops-detail-note">Run `pnpm rehearsal:verify-staging` from the repo root to refresh stored release, proof, and smoke evidence.</p>
          </div>
        </div>
        <div className="admin-command-list">
          {props.readiness.requiredEvidence.map((item) => <EvidenceChecklistRow item={item} key={item.evidenceType} />)}
          {props.readiness.optionalEvidence.map((item) => <EvidenceChecklistRow item={item} key={item.evidenceType} />)}
        </div>
      </section>

      <section className="sw-supporting-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Latest proof IDs</p>
            <h2>{latestProof?.relatedOrderId ? "Paid-delivery proof IDs recorded" : "No paid proof IDs available"}</h2>
          </div>
        </div>
        <div className="admin-command-report-grid">
          <div className="sw-list-row"><span>Order</span><strong>{latestProof?.relatedOrderId ?? "not available"}</strong></div>
          <div className="sw-list-row"><span>Job</span><strong>{latestProof?.relatedJobId ?? "not available"}</strong></div>
          <div className="sw-list-row"><span>Payment</span><strong>{latestProof?.relatedPaymentId ?? "not available"}</strong></div>
          <div className="sw-list-row"><span>POD</span><strong>{latestProof?.relatedPodId ?? "not available"}</strong></div>
        </div>
      </section>

      <section className="sw-supporting-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Recommended next actions</p>
            <h2>What to do now</h2>
          </div>
        </div>
        <div className="admin-command-list">
          {props.readiness.recommendedActions.map((action) => (
            <div className="sw-list-row admin-command-report-action" key={action}>
              <span className="sw-icon-badge sw-icon-badge--info" aria-hidden="true"><ShipWrightIcon name="arrow" /></span>
              <strong>{action}</strong>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

export function AdminReleaseReadinessShell() {
  const router = useRouter();
  const { status, session, error, refreshBusinessSession, signOut } = useBusinessAuth();
  const [readiness, setReadiness] = useState<ReleaseReadinessSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(buildAuthRedirectTarget({ pathname: "/admin/release-readiness" }));
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
    void getAdminReleaseReadiness(session)
      .then((nextReadiness) => {
        if (active) setReadiness(nextReadiness);
      })
      .catch((issue) => {
        if (active) setLoadError(getUserFacingApiError(issue, RELEASE_READINESS_UNAVAILABLE));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session, status]);

  if (status === "loading" || loading) {
    return <main className="app-shell loading-shell"><section className="ops-empty-state"><h1>Loading release readiness...</h1></section></main>;
  }

  if (status === "error") {
    return <main className="app-shell loading-shell"><section className="ops-empty-state"><h1>Unable to restore session</h1><p>{error}</p></section></main>;
  }

  if (status !== "authenticated") {
    return null;
  }

  if (!session?.context.platformAdmin) {
    return <main className="app-shell loading-shell"><section className="ops-empty-state"><h1>Platform admin required</h1><p>Release readiness is restricted to platform admins.</p></section></main>;
  }

  return (
    <main className="app-shell admin-shell-page">
      <div className="sw-row-between admin-shell-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Release readiness</p>
          <h1>Release Readiness</h1>
          <p>Single source verdict for demo and release confidence from stored validation evidence.</p>
        </div>
        <div className="hero-actions">
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin">Admin home</Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/validation-evidence">Evidence</Link>
          <button className="button button-secondary" onClick={() => void refreshBusinessSession()} type="button">Refresh</button>
          <button className="button button-primary" onClick={() => void signOut().then(() => router.replace("/get-started"))} type="button">Sign Out</button>
        </div>
      </div>

      {loadError ? <div className="form-error-banner">{loadError}</div> : null}
      {readiness ? <AdminReleaseReadinessView readiness={readiness} /> : null}
    </main>
  );
}
