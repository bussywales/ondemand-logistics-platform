"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { ProductUpdateAnnouncement } from "./product-updates";
import { AdminWorkspaceLink } from "./workspace-nav";
import { useBusinessAuth } from "./business-auth-provider";
import { getUserFacingApiError, listAdminDispatchAudit } from "../_lib/api";
import { buildAuthRedirectTarget } from "../_lib/route-protection";
import { formatDateTime, type DispatchAuditEvent } from "../_lib/product-state";

const DISPATCH_AUDIT_UNAVAILABLE = "Dispatch audit unavailable. Refresh or contact support.";

function formatLabel(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function affiliationCopy(event: DispatchAuditEvent) {
  const affiliation = event.newDriverAffiliation ?? event.previousDriverAffiliation;
  if (!affiliation) return "Courier affiliation not recorded";
  if (affiliation.courierType === "FLEET_MANAGED_COURIER") {
    return `Fleet-managed${affiliation.fleetOrgName ? ` · ${affiliation.fleetOrgName}` : ""}`;
  }
  if (affiliation.courierType === "INDEPENDENT_COURIER") return "Independent courier";
  return "Courier affiliation unknown";
}

function DispatchAuditRow(props: { event: DispatchAuditEvent }) {
  const event = props.event;
  return (
    <article className="sw-list-row">
      <div className="sw-stack-sm">
        <div className="sw-row">
          <strong>{formatLabel(event.overrideType ?? event.eventType)}</strong>
          <span className="sw-badge sw-badge--neutral">{formatDateTime(event.createdAt)}</span>
          <span className="sw-badge sw-badge--info">{affiliationCopy(event)}</span>
        </div>
        <p className="ops-detail-note">
          {event.orgName ?? "Unknown org"} · Job {event.jobId.slice(0, 8)}
          {event.orderId ? ` · Order ${event.orderId.slice(0, 8)}` : ""}
        </p>
        <p className="ops-detail-note">
          {event.reason ?? "No reason recorded"}{event.actorLabel ? ` · ${event.actorLabel}` : ""}
        </p>
        {event.note ? <p className="ops-detail-note">{event.note}</p> : null}
        {event.previousDriverName || event.newDriverName ? (
          <p className="ops-detail-note">
            Driver: {event.previousDriverName ?? "Unassigned"} → {event.newDriverName ?? "Unassigned"}
          </p>
        ) : null}
      </div>
      <div className="hero-actions">
        <Link className="sw-button sw-button--secondary button button-secondary" href={`/admin/dispatch-audit?jobId=${event.jobId}`}>
          Filter job
        </Link>
      </div>
    </article>
  );
}

function LoadingState() {
  return <main className="app-shell loading-shell"><section className="sw-empty-state"><strong className="sw-empty-title">Loading dispatch audit</strong></section></main>;
}

function ErrorState(props: { message: string; onRefresh: () => void }) {
  return (
    <main className="app-shell loading-shell">
      <section className="sw-empty-state">
        <h1>Unable to load dispatch audit</h1>
        <p className="sw-empty-copy">{props.message}</p>
        <button className="sw-button sw-button--primary button button-primary" onClick={props.onRefresh} type="button">Refresh</button>
      </section>
    </main>
  );
}

export function AdminDispatchAuditShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, session, error, refreshBusinessSession } = useBusinessAuth();
  const [items, setItems] = useState<DispatchAuditEvent[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const jobIdFilter = searchParams.get("jobId") ?? undefined;

  useEffect(() => {
    if (status === "unauthenticated") router.replace(buildAuthRedirectTarget({ pathname: "/admin/dispatch-audit" }));
  }, [router, status]);

  useEffect(() => {
    let active = true;
    if (!session) return () => { active = false; };
    setLoadError(null);
    void listAdminDispatchAudit(session, { jobId: jobIdFilter })
      .then((nextItems) => {
        if (active) setItems(nextItems);
      })
      .catch((issue) => {
        if (active) setLoadError(getUserFacingApiError(issue, DISPATCH_AUDIT_UNAVAILABLE));
      });
    return () => { active = false; };
  }, [jobIdFilter, session]);

  if (status === "loading") return <LoadingState />;
  if (status === "error") return <ErrorState message={error ?? DISPATCH_AUDIT_UNAVAILABLE} onRefresh={() => void refreshBusinessSession()} />;
  if (status !== "authenticated" || !session) return <LoadingState />;
  if (loadError) return <ErrorState message={loadError} onRefresh={() => void refreshBusinessSession()} />;

  return (
    <main className="app-shell admin-shell-page">
      <div className="sw-row-between admin-shell-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Dispatch governance</p>
          <h1>Assignment audit</h1>
          <p>Cross-org manual dispatch review, reassignment, and recovery markers. Read-only for platform support.</p>
        </div>
        <div className="hero-actions">
          <AdminWorkspaceLink />
          {jobIdFilter ? (
            <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/dispatch-audit">Clear job filter</Link>
          ) : null}
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/command">Admin command</Link>
        </div>
      </div>

      <ProductUpdateAnnouncement routePath="/admin/dispatch-audit" viewer="platform_admin" viewerKey={session.userId} />

      <section className="sw-command-surface admin-command-page-hero">
        <div>
          <span className="sw-badge sw-badge--info">Human reviewed</span>
          <h2>{items.length} dispatch audit event{items.length === 1 ? "" : "s"}</h2>
          <p>Manual intervention remains operator-led. This view does not score, suspend, or automatically reassign couriers.</p>
        </div>
        <div className="team-summary-grid">
          <div className="sw-list-row"><span className="ops-detail-note">Reassignments</span><strong>{items.filter((item) => item.overrideType === "REASSIGN_DRIVER" || item.eventType === "JOB_REASSIGNED").length}</strong></div>
          <div className="sw-list-row"><span className="ops-detail-note">Blocked markers</span><strong>{items.filter((item) => item.overrideType === "MARK_DISPATCH_BLOCKED").length}</strong></div>
          <div className="sw-list-row"><span className="ops-detail-note">Fleet-managed signals</span><strong>{items.filter((item) => (item.newDriverAffiliation ?? item.previousDriverAffiliation)?.courierType === "FLEET_MANAGED_COURIER").length}</strong></div>
        </div>
      </section>

      <section className="sw-operational-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Audit rows</p>
            <h2>Recent dispatch decisions</h2>
            <p className="ops-detail-note">Append-only job events with safe courier affiliation context.</p>
            {jobIdFilter ? <p className="ops-detail-note">Filtered to job {jobIdFilter.slice(0, 8)}.</p> : null}
          </div>
        </div>
        <div className="admin-command-list">
          {items.length === 0 ? (
            <div className="sw-empty-state admin-empty-state">
              <strong className="sw-empty-title">No dispatch audit events</strong>
              <p className="sw-empty-copy">Manual override notes and reassignment events will appear here.</p>
            </div>
          ) : items.map((item) => <DispatchAuditRow event={item} key={item.id} />)}
        </div>
      </section>
    </main>
  );
}
