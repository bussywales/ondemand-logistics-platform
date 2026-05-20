"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { useEffect, useMemo, useState } from "react";
import { getUserFacingApiError, listAdminDemoRequestEvents, listAdminDemoRequests, updateAdminDemoRequest } from "../_lib/api";
import type { DemoRequest, DemoRequestEvent, DemoRequestFollowUpPriority, DemoRequestStatus, UpdateDemoRequestInput } from "../_lib/product-state";
import { buildAuthRedirectTarget } from "../_lib/route-protection";
import { BrandLogo } from "./brand-logo";
import { useBusinessAuth } from "./business-auth-provider";

const FILTERS: Array<"ALL" | DemoRequestStatus> = ["ALL", "NEW", "REVIEWED", "CONTACTED", "QUALIFIED", "CLOSED", "SPAM"];
const STATUS_OPTIONS: DemoRequestStatus[] = ["NEW", "REVIEWED", "CONTACTED", "QUALIFIED", "CLOSED", "SPAM"];
const PRIORITY_OPTIONS: Array<"NONE" | DemoRequestFollowUpPriority> = ["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"];
const ACTIVE_STATUSES: DemoRequestStatus[] = ["NEW", "REVIEWED", "CONTACTED", "QUALIFIED"];

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

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function isActiveRequest(request: DemoRequest) {
  return ACTIVE_STATUSES.includes(request.status);
}

export function getDemoRequestFollowUpState(request: DemoRequest, now = new Date()) {
  if (!isActiveRequest(request) || !request.nextFollowUpAt) {
    return "none" as const;
  }

  const followUpAt = new Date(request.nextFollowUpAt);
  if (followUpAt.getTime() < now.getTime()) {
    return "overdue" as const;
  }

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  if (followUpAt >= start && followUpAt < end) {
    return "dueToday" as const;
  }

  return "scheduled" as const;
}

export function getDemoRequestQueueSummary(requests: DemoRequest[], now = new Date()) {
  return requests.reduce(
    (acc, request) => {
      if (request.status === "NEW") acc.new += 1;
      if (request.status === "QUALIFIED") acc.qualified += 1;
      if (request.followUpPriority === "HIGH" || request.followUpPriority === "URGENT") acc.highPriority += 1;
      const followUpState = getDemoRequestFollowUpState(request, now);
      if (followUpState === "overdue") acc.overdue += 1;
      if (followUpState === "dueToday") acc.dueToday += 1;
      return acc;
    },
    { dueToday: 0, highPriority: 0, new: 0, overdue: 0, qualified: 0 }
  );
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

function getEventLabel(event: DemoRequestEvent) {
  return formatLabel(event.eventType);
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
  events: DemoRequestEvent[] | undefined;
  eventsBusy: boolean;
  onLoadEvents: (id: string) => void;
  onUpdate: (id: string, input: UpdateDemoRequestInput) => void;
}) {
  const [status, setStatus] = useState<DemoRequestStatus>(props.request.status);
  const [note, setNote] = useState(props.request.adminNote ?? "");
  const [assignedOwner, setAssignedOwner] = useState(props.request.assignedOwner ?? "");
  const [priority, setPriority] = useState<"NONE" | DemoRequestFollowUpPriority>(props.request.followUpPriority ?? "NONE");
  const [nextFollowUpAt, setNextFollowUpAt] = useState(toDateTimeLocal(props.request.nextFollowUpAt));
  const [closeReason, setCloseReason] = useState(props.request.closeReason ?? "");
  const [historyOpen, setHistoryOpen] = useState(false);
  const nextStatus = getNextStatus(props.request.status);
  const followUpState = getDemoRequestFollowUpState(props.request);

  useEffect(() => {
    setStatus(props.request.status);
    setNote(props.request.adminNote ?? "");
    setAssignedOwner(props.request.assignedOwner ?? "");
    setPriority(props.request.followUpPriority ?? "NONE");
    setNextFollowUpAt(toDateTimeLocal(props.request.nextFollowUpAt));
    setCloseReason(props.request.closeReason ?? "");
  }, [props.request]);

  function currentFormInput(nextStatusOverride?: DemoRequestStatus): UpdateDemoRequestInput {
    return {
      status: nextStatusOverride ?? status,
      adminNote: note.trim() || null,
      assignedOwner: assignedOwner.trim() || null,
      followUpPriority: priority === "NONE" ? null : priority,
      nextFollowUpAt: fromDateTimeLocal(nextFollowUpAt),
      closeReason: closeReason.trim() || null
    };
  }

  function openHistory() {
    setHistoryOpen((current) => {
      const next = !current;
      if (next && !props.events) {
        props.onLoadEvents(props.request.id);
      }
      return next;
    });
  }

  return (
    <article className="sw-list-row admin-command-report-action">
      <div className="sw-stack-sm">
        <div className="admin-command-item-meta">
          <span className={`sw-badge ${statusTone(props.request.status)}`}>{formatLabel(props.request.status)}</span>
          <span className="sw-badge sw-badge--neutral">{formatLabel(props.request.interestType)}</span>
          {props.request.followUpPriority ? <span className={`sw-badge ${props.request.followUpPriority === "URGENT" || props.request.followUpPriority === "HIGH" ? "sw-badge--warning" : "sw-badge--info"}`}>{formatLabel(props.request.followUpPriority)} priority</span> : null}
          {followUpState === "overdue" ? <span className="sw-badge sw-badge--danger">Overdue</span> : null}
          {followUpState === "dueToday" ? <span className="sw-badge sw-badge--warning">Due today</span> : null}
          <span>{formatDate(props.request.createdAt)}</span>
        </div>
        <strong>{props.request.name}</strong>
        <p className="ops-detail-note">
          {props.request.email} {props.request.organisation ? `· ${props.request.organisation}` : ""} {props.request.role ? `· ${props.request.role}` : ""}
        </p>
        {props.request.message ? <p>{props.request.message}</p> : <p className="ops-detail-note">No message provided.</p>}
        <p className="admin-command-recommendation">Next action: {getDemoRequestNextAction(props.request.status)}</p>
        <div className="admin-demo-request-follow-up-meta">
          <span>Owner: {props.request.assignedOwner ?? "Unassigned"}</span>
          <span>Next follow-up: {props.request.nextFollowUpAt ? formatDate(props.request.nextFollowUpAt) : "Not scheduled"}</span>
          <span>Last contacted: {props.request.lastContactedAt ? formatDate(props.request.lastContactedAt) : "Not recorded"}</span>
        </div>
        {props.request.reviewedAt ? (
          <p className="ops-detail-note">
            Reviewed {formatDate(props.request.reviewedAt)}
            {props.request.reviewedBy ? ` by ${props.request.reviewedBy.slice(0, 8).toUpperCase()}` : ""}
          </p>
        ) : null}
        <button className="button button-secondary admin-demo-request-history-toggle" onClick={openHistory} type="button">
          {historyOpen ? "Hide history" : "Show history"}
        </button>
        {historyOpen ? (
          <div className="admin-demo-request-history">
            {props.eventsBusy ? <p className="ops-detail-note">Loading history...</p> : null}
            {props.events?.length ? (
              props.events.map((event) => (
                <div className="admin-demo-request-event" key={event.id}>
                  <strong>{getEventLabel(event)}</strong>
                  <span>{formatDate(event.createdAt)}</span>
                  {event.previousStatus || event.newStatus ? (
                    <p>{event.previousStatus ? formatLabel(event.previousStatus) : "New"} → {event.newStatus ? formatLabel(event.newStatus) : "Unset"}</p>
                  ) : null}
                  {event.note ? <p>{event.note}</p> : null}
                </div>
              ))
            ) : !props.eventsBusy ? (
              <p className="ops-detail-note">No event history recorded yet.</p>
            ) : null}
          </div>
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
        <label>
          <span>Assigned owner</span>
          <input value={assignedOwner} onChange={(event) => setAssignedOwner(event.target.value)} placeholder="Platform owner or follow-up lead" />
        </label>
        <label>
          <span>Priority</span>
          <select value={priority} onChange={(event) => setPriority(event.target.value as "NONE" | DemoRequestFollowUpPriority)}>
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option} value={option}>{formatLabel(option)}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Next follow-up</span>
          <input type="datetime-local" value={nextFollowUpAt} onChange={(event) => setNextFollowUpAt(event.target.value)} />
        </label>
        <label>
          <span>Close reason</span>
          <input value={closeReason} onChange={(event) => setCloseReason(event.target.value)} placeholder="Required context when closing." />
        </label>
        <button
          className="sw-button sw-button--primary button button-primary"
          disabled={props.busy}
          onClick={() => props.onUpdate(props.request.id, currentFormInput())}
          type="button"
        >
          Save follow-up
        </button>
        <div className="admin-demo-request-quick-actions">
          {nextStatus ? (
            <button
              className="sw-button sw-button--secondary button button-secondary"
              disabled={props.busy}
              onClick={() => {
                setStatus(nextStatus);
                props.onUpdate(props.request.id, {
                  ...currentFormInput(nextStatus),
                  lastContactedAt: nextStatus === "CONTACTED" ? new Date().toISOString() : props.request.lastContactedAt
                });
              }}
              type="button"
            >
              Mark {formatLabel(nextStatus)}
            </button>
          ) : null}
          <button
            className="sw-button sw-button--secondary button button-secondary"
            disabled={props.busy}
            onClick={() => props.onUpdate(props.request.id, { ...currentFormInput("CONTACTED"), lastContactedAt: new Date().toISOString() })}
            type="button"
          >
            Mark contacted
          </button>
          <button
            className="sw-button sw-button--secondary button button-secondary"
            disabled={props.busy}
            onClick={() => props.onUpdate(props.request.id, { ...currentFormInput("CLOSED"), closeReason: closeReason.trim() || "Closed from follow-up queue." })}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </article>
  );
}

export function AdminDemoRequestsView(props: {
  requests: DemoRequest[];
  filter: "ALL" | DemoRequestStatus;
  counts: Record<string, number>;
  busyId: string | null;
  eventsByRequestId: Record<string, DemoRequestEvent[] | undefined>;
  eventsBusyId: string | null;
  onFilterChange: (filter: "ALL" | DemoRequestStatus) => void;
  onLoadEvents: (id: string) => void;
  onUpdate: (id: string, input: UpdateDemoRequestInput) => void;
}) {
  const queueSummary = getDemoRequestQueueSummary(props.requests);

  return (
    <section className="sw-operational-surface admin-command-section">
      <div className="sw-card-header admin-section-header">
        <div>
          <p className="eyebrow">Review queue</p>
          <h2>{props.requests.length ? `${props.requests.length} request${props.requests.length === 1 ? "" : "s"}` : "No demo requests in this view"}</h2>
          <p className="ops-detail-note">Update status and notes after human review. Keep sensitive lead follow-up outside ShipWright until CRM/email integration exists.</p>
        </div>
      </div>
      <div className="admin-demo-request-summary-grid">
        <div><span>New</span><strong>{queueSummary.new}</strong></div>
        <div><span>Due today</span><strong>{queueSummary.dueToday}</strong></div>
        <div><span>Overdue</span><strong>{queueSummary.overdue}</strong></div>
        <div><span>High priority</span><strong>{queueSummary.highPriority}</strong></div>
        <div><span>Qualified</span><strong>{queueSummary.qualified}</strong></div>
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
            <RequestRow
              busy={props.busyId === request.id}
              events={props.eventsByRequestId[request.id]}
              eventsBusy={props.eventsBusyId === request.id}
              key={request.id}
              onLoadEvents={props.onLoadEvents}
              onUpdate={props.onUpdate}
              request={request}
            />
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
  const [eventsByRequestId, setEventsByRequestId] = useState<Record<string, DemoRequestEvent[] | undefined>>({});
  const [eventsBusyId, setEventsBusyId] = useState<string | null>(null);

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

  async function handleUpdate(id: string, input: UpdateDemoRequestInput) {
    if (!session) return;
    setBusyId(id);
    setLoadError(null);
    try {
      const updated = await updateAdminDemoRequest(session, id, input);
      setRequests((current) => current.map((item) => (item.id === id ? updated : item)));
      setEventsByRequestId((current) => ({ ...current, [id]: undefined }));
    } catch (issue) {
      setLoadError(getUserFacingApiError(issue, "Unable to update demo request."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleLoadEvents(id: string) {
    if (!session || eventsByRequestId[id]) return;
    setEventsBusyId(id);
    setLoadError(null);
    try {
      const events = await listAdminDemoRequestEvents(session, id);
      setEventsByRequestId((current) => ({ ...current, [id]: events }));
    } catch (issue) {
      setLoadError(getUserFacingApiError(issue, "Demo request history unavailable. Refresh or contact support."));
    } finally {
      setEventsBusyId(null);
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
        eventsBusyId={eventsBusyId}
        eventsByRequestId={eventsByRequestId}
        filter={filter}
        onFilterChange={setFilter}
        onLoadEvents={handleLoadEvents}
        onUpdate={handleUpdate}
        requests={requests}
      />
    </main>
  );
}
