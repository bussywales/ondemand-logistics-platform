"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { useEffect, useMemo, useState } from "react";
import { getUserFacingApiError, listAdminDemoRequests, updateAdminDemoRequest } from "../_lib/api";
import type { DemoRequest, DemoRequestStatus } from "../_lib/product-state";
import { buildAuthRedirectTarget } from "../_lib/route-protection";
import { BrandLogo } from "./brand-logo";
import { useBusinessAuth } from "./business-auth-provider";

const FILTERS: Array<"ALL" | DemoRequestStatus> = ["ALL", "NEW", "REVIEWED", "CONTACTED", "QUALIFIED", "CLOSED", "SPAM"];
const STATUS_OPTIONS: DemoRequestStatus[] = ["NEW", "REVIEWED", "CONTACTED", "QUALIFIED", "CLOSED", "SPAM"];

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusTone(status: DemoRequestStatus) {
  if (status === "NEW") return "sw-badge--info";
  if (status === "QUALIFIED") return "sw-badge--success";
  if (status === "SPAM") return "sw-badge--danger";
  if (status === "CONTACTED" || status === "REVIEWED") return "sw-badge--warning";
  return "sw-badge--neutral";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function getDemoRequestNextAction(status: DemoRequestStatus) {
  switch (status) {
    case "NEW":
      return "Review request";
    case "REVIEWED":
      return "Contact requester";
    case "CONTACTED":
      return "Qualify opportunity";
    case "QUALIFIED":
      return "Prepare pilot/investor follow-up";
    case "CLOSED":
    case "SPAM":
      return "No action";
  }
}

function getNextStatus(status: DemoRequestStatus): DemoRequestStatus | null {
  switch (status) {
    case "NEW":
      return "REVIEWED";
    case "REVIEWED":
      return "CONTACTED";
    case "CONTACTED":
      return "QUALIFIED";
    case "QUALIFIED":
      return "CLOSED";
    case "CLOSED":
    case "SPAM":
      return null;
  }
}

function RequestRow(props: {
  request: DemoRequest;
  busy: boolean;
  onUpdate: (id: string, input: { status: DemoRequestStatus; adminNote: string | null }) => void;
}) {
  const [status, setStatus] = useState<DemoRequestStatus>(props.request.status);
  const [note, setNote] = useState(props.request.adminNote ?? "");
  const nextStatus = getNextStatus(props.request.status);

  useEffect(() => {
    setStatus(props.request.status);
    setNote(props.request.adminNote ?? "");
  }, [props.request]);

  return (
    <article className="sw-list-row admin-command-report-action">
      <div className="sw-stack-sm">
        <div className="admin-command-item-meta">
          <span className={`sw-badge ${statusTone(props.request.status)}`}>{formatLabel(props.request.status)}</span>
          <span className="sw-badge sw-badge--neutral">{formatLabel(props.request.interestType)}</span>
          <span>{formatDate(props.request.createdAt)}</span>
        </div>
        <strong>{props.request.name}</strong>
        <p className="ops-detail-note">
          {props.request.email} {props.request.organisation ? `· ${props.request.organisation}` : ""} {props.request.role ? `· ${props.request.role}` : ""}
        </p>
        {props.request.message ? <p>{props.request.message}</p> : <p className="ops-detail-note">No message provided.</p>}
        <p className="admin-command-recommendation">Next action: {getDemoRequestNextAction(props.request.status)}</p>
        {props.request.reviewedAt ? (
          <p className="ops-detail-note">
            Reviewed {formatDate(props.request.reviewedAt)}
            {props.request.reviewedBy ? ` by ${props.request.reviewedBy.slice(0, 8).toUpperCase()}` : ""}
          </p>
        ) : null}
      </div>

      <div className="support-escalation-form admin-demo-request-review">
        <label>
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as DemoRequestStatus)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>{formatLabel(option)}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Admin note</span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Add review context or follow-up note." />
        </label>
        <button
          className="sw-button sw-button--primary button button-primary"
          disabled={props.busy}
          onClick={() => props.onUpdate(props.request.id, { status, adminNote: note.trim() || null })}
          type="button"
        >
          Save review
        </button>
        {nextStatus ? (
          <button
            className="sw-button sw-button--secondary button button-secondary"
            disabled={props.busy}
            onClick={() => {
              setStatus(nextStatus);
              props.onUpdate(props.request.id, { status: nextStatus, adminNote: note.trim() || null });
            }}
            type="button"
          >
            Mark {formatLabel(nextStatus)}
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function AdminDemoRequestsView(props: {
  requests: DemoRequest[];
  filter: "ALL" | DemoRequestStatus;
  counts: Record<string, number>;
  busyId: string | null;
  onFilterChange: (filter: "ALL" | DemoRequestStatus) => void;
  onUpdate: (id: string, input: { status: DemoRequestStatus; adminNote: string | null }) => void;
}) {
  return (
    <section className="sw-operational-surface admin-command-section">
      <div className="sw-card-header admin-section-header">
        <div>
          <p className="eyebrow">Review queue</p>
          <h2>{props.requests.length ? `${props.requests.length} request${props.requests.length === 1 ? "" : "s"}` : "No demo requests in this view"}</h2>
          <p className="ops-detail-note">Update status and notes after human review. Keep sensitive lead follow-up outside ShipWright until CRM/email integration exists.</p>
        </div>
      </div>
      <div className="orders-filter-row admin-filter-row">
        {FILTERS.map((nextFilter) => (
          <button
            className={`mode-chip orders-filter-chip admin-filter-chip ${props.filter === nextFilter ? "mode-chip-active orders-filter-chip-active admin-filter-chip-active" : ""}`}
            key={nextFilter}
            onClick={() => props.onFilterChange(nextFilter)}
            type="button"
          >
            <strong>{formatLabel(nextFilter)}</strong>
            <span>{props.counts[nextFilter] ?? 0}</span>
          </button>
        ))}
      </div>
      {props.requests.length ? (
        <div className="admin-command-list">
          {props.requests.map((request) => (
            <RequestRow busy={props.busyId === request.id} key={request.id} onUpdate={props.onUpdate} request={request} />
          ))}
        </div>
      ) : (
        <div className="sw-empty-state admin-empty-state">
          <strong className="sw-empty-title">No requests yet</strong>
          <p className="sw-empty-copy">Public demo requests submitted through `/demo/request` will appear here for platform admin review.</p>
        </div>
      )}
    </section>
  );
}

export function AdminDemoRequestsShell() {
  const router = useRouter();
  const { status, session, error, refreshBusinessSession, signOut } = useBusinessAuth();
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [filter, setFilter] = useState<"ALL" | DemoRequestStatus>("ALL");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const counts = useMemo(() => {
    return requests.reduce<Record<string, number>>((acc, request) => {
      acc.ALL += 1;
      acc[request.status] = (acc[request.status] ?? 0) + 1;
      return acc;
    }, { ALL: 0 });
  }, [requests]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(buildAuthRedirectTarget({ pathname: "/admin/demo-requests" }));
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

    void listAdminDemoRequests(session, filter === "ALL" ? undefined : filter)
      .then((items) => {
        if (!active) return;
        setRequests(items);
      })
      .catch((issue) => {
        if (!active) return;
        setLoadError(getUserFacingApiError(issue, "Demo requests unavailable. Refresh or contact support."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filter, session, status]);

  async function handleUpdate(id: string, input: { status: DemoRequestStatus; adminNote: string | null }) {
    if (!session) return;
    setBusyId(id);
    setLoadError(null);
    try {
      const updated = await updateAdminDemoRequest(session, id, input);
      setRequests((current) => current.map((item) => (item.id === id ? updated : item)));
    } catch (issue) {
      setLoadError(getUserFacingApiError(issue, "Unable to update demo request."));
    } finally {
      setBusyId(null);
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="app-shell loading-shell">
        <section className="sw-empty-state"><strong className="sw-empty-title">Loading demo requests</strong></section>
      </main>
    );
  }

  if (!session?.context.platformAdmin) {
    return (
      <main className="app-shell loading-shell">
        <section className="sw-empty-state">
          <p className="eyebrow">Platform admin required</p>
          <h1>Demo request review is restricted.</h1>
          <p>{error ?? "Sign in with a platform admin account to review commercial interest."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell admin-shell-page">
      <div className="sw-row-between admin-shell-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Commercial intake</p>
          <h1>Demo requests</h1>
          <p>Review controlled pilot, operator, and investor interest. No email or CRM automation is triggered in v1.</p>
        </div>
        <div className="hero-actions">
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin">Admin home</Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/demo/request">Public form</Link>
          <button className="button button-secondary" onClick={() => void refreshBusinessSession()} type="button">Refresh session</button>
          <button className="button button-primary" onClick={() => void signOut().then(() => router.replace("/get-started"))} type="button">Sign out</button>
        </div>
      </div>

      {loadError ? <p className="form-error" role="alert">{loadError}</p> : null}

      <AdminDemoRequestsView
        busyId={busyId}
        counts={counts}
        filter={filter}
        onFilterChange={setFilter}
        onUpdate={handleUpdate}
        requests={requests}
      />
    </main>
  );
}
