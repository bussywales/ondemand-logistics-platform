"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { useBusinessAuth } from "./business-auth-provider";
import { ShipWrightIcon } from "./shipwright-icon";
import { getUserFacingApiError, listAdminMenuHistory } from "../_lib/api";
import type { AdminMenuHistoryEvent, MenuHistoryEventType, MenuHistoryResourceType } from "../_lib/product-state";
import { buildAuthRedirectTarget } from "../_lib/route-protection";

const MENU_HISTORY_UNAVAILABLE = "Menu history unavailable. Refresh or contact support.";

const EVENT_OPTIONS: Array<{ label: string; value: MenuHistoryEventType }> = [
  { label: "Category created", value: "MENU_CATEGORY_CREATED" },
  { label: "Category updated", value: "MENU_CATEGORY_UPDATED" },
  { label: "Category reordered", value: "MENU_CATEGORY_REORDERED" },
  { label: "Item created", value: "MENU_ITEM_CREATED" },
  { label: "Item updated", value: "MENU_ITEM_UPDATED" },
  { label: "Price updated", value: "MENU_ITEM_PRICE_UPDATED" },
  { label: "Visibility updated", value: "MENU_ITEM_VISIBILITY_UPDATED" },
  { label: "Item reordered", value: "MENU_ITEM_REORDERED" },
  { label: "Item moved section", value: "MENU_ITEM_MOVED_CATEGORY" },
  { label: "Category rollback applied", value: "MENU_CATEGORY_ROLLBACK_APPLIED" },
  { label: "Item rollback applied", value: "MENU_ITEM_ROLLBACK_APPLIED" }
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function eventTone(eventType: MenuHistoryEventType) {
  if (eventType.includes("PRICE")) return "sw-badge--warning";
  if (eventType.includes("VISIBILITY")) return "sw-badge--info";
  if (eventType.includes("CREATED")) return "sw-badge--success";
  return "sw-badge--neutral";
}

function rollbackReadinessBadge(value: AdminMenuHistoryEvent["rollbackReadiness"]) {
  if (value === "ROLLBACK_PREPARED") {
    return { label: "Rollback prepared", className: "sw-badge sw-badge--success" };
  }

  if (value === "NOT_REVERSIBLE") {
    return { label: "Not reversible", className: "sw-badge sw-badge--neutral" };
  }

  return { label: "Needs more metadata", className: "sw-badge sw-badge--warning" };
}

function MenuHistoryRow(props: { event: AdminMenuHistoryEvent }) {
  const actor = props.event.actorName ?? props.event.actorEmail ?? "Unknown actor";
  const org = props.event.orgName ?? props.event.orgId ?? "Unknown org";
  const restaurant = props.event.restaurantName ?? props.event.restaurantId ?? "Unknown restaurant";
  const rollbackBadge = rollbackReadinessBadge(props.event.rollbackReadiness);

  return (
    <article className="sw-list-row admin-menu-history-row">
      <div className="sw-stack-sm admin-menu-history-row-copy">
        <div className="admin-command-item-meta">
          <span className={`sw-badge ${eventTone(props.event.eventType)}`}>{formatLabel(props.event.eventType)}</span>
          <span className={rollbackBadge.className}>{rollbackBadge.label}</span>
          <span>{formatLabel(props.event.resourceType)}</span>
          <span>{formatDate(props.event.createdAt)}</span>
        </div>
        <strong>{props.event.summary}</strong>
        <p className="ops-detail-note">
          {org} · {restaurant} · {actor}
        </p>
        <p className="ops-detail-note">{props.event.rollbackReason}</p>
        {props.event.rollbackReadiness === "ROLLBACK_PREPARED" ? (
          <p className="ops-detail-note">Rollback is available only from the merchant business workspace after preview and typed confirmation.</p>
        ) : null}
        <div className="admin-demo-request-follow-up-meta">
          <span>Resource: {props.event.resourceName ?? props.event.resourceType}</span>
          <span>Org: {props.event.orgId ?? "not recorded"}</span>
          <span>Restaurant: {props.event.restaurantId ?? "not recorded"}</span>
        </div>
        {props.event.changedFields.length ? (
          <div className="admin-menu-history-field-list" aria-label="Changed fields">
            {props.event.changedFields.map((field) => (
              <span className="sw-badge sw-badge--neutral" key={field}>{field}</span>
            ))}
          </div>
        ) : null}
        {Object.keys(props.event.metadata).length ? (
          <details className="admin-demo-request-history">
            <summary>Safe metadata</summary>
            <pre className="ops-code-block">{JSON.stringify(props.event.metadata, null, 2)}</pre>
          </details>
        ) : null}
      </div>
    </article>
  );
}

export function AdminMenuHistoryView(props: { history: AdminMenuHistoryEvent[] }) {
  const counts = useMemo(() => {
    const itemCount = props.history.filter((event) => event.resourceType === "item").length;
    const categoryCount = props.history.filter((event) => event.resourceType === "category").length;
    const priceCount = props.history.filter((event) => event.eventType === "MENU_ITEM_PRICE_UPDATED").length;
    return { itemCount, categoryCount, priceCount };
  }, [props.history]);

  return (
    <section className="ops-stack admin-command-stack">
      <section className="sw-command-surface admin-command-page-hero">
        <div className="admin-command-page-copy">
          <span className="sw-badge sw-badge--info">Read-only audit</span>
          <p className="eyebrow">Admin menu history</p>
          <h2>Cross-org restaurant menu changes</h2>
          <p>
            Platform support can review merchant menu edits, pricing changes, visibility updates, and ordering changes without entering a business workspace.
          </p>
          <p className="ops-detail-note">This page reads the append-only audit log. It does not mutate menus or roll back changes.</p>
        </div>
        <div className="hero-actions">
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin">Admin overview</Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/command">Admin command</Link>
        </div>
      </section>

      <section className="admin-command-page-counts">
        <article className="sw-metric-card sw-supporting-surface admin-command-metric-card">
          <span className="sw-metric-label">Menu events</span>
          <strong className="sw-metric-value">{props.history.length}</strong>
          <p className="sw-metric-copy">Latest audit events returned by the current filters.</p>
        </article>
        <article className="sw-metric-card sw-supporting-surface admin-command-metric-card">
          <span className="sw-metric-label">Item changes</span>
          <strong className="sw-metric-value">{counts.itemCount}</strong>
          <p className="sw-metric-copy">Item detail, price, visibility, or ordering updates.</p>
        </article>
        <article className="sw-metric-card sw-supporting-surface admin-command-metric-card">
          <span className="sw-metric-label">Section changes</span>
          <strong className="sw-metric-value">{counts.categoryCount}</strong>
          <p className="sw-metric-copy">Menu section creation, details, or ordering updates.</p>
        </article>
        <article className="sw-metric-card sw-supporting-surface admin-command-metric-card">
          <span className="sw-metric-label">Price changes</span>
          <strong className="sw-metric-value">{counts.priceCount}</strong>
          <p className="sw-metric-copy">Customer-facing menu price edits in this result set.</p>
        </article>
      </section>

      <section className="sw-operational-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Audit trail</p>
            <h2>{props.history.length ? "Recent menu changes" : "No menu changes found"}</h2>
            <p className="ops-detail-note">Use filters to narrow by organisation, restaurant, event type, resource type, rollback readiness, or date range.</p>
          </div>
        </div>
        {props.history.length ? (
          <div className="admin-command-list">
            {props.history.map((event) => <MenuHistoryRow event={event} key={event.id} />)}
          </div>
        ) : (
          <div className="sw-empty-state">
            <span className="empty-state-icon" aria-hidden="true"><ShipWrightIcon name="timeline" /></span>
            <strong className="sw-empty-title">Menu changes will appear here after merchant edits.</strong>
            <p className="sw-empty-copy">No matching menu audit events were returned for the current filters.</p>
          </div>
        )}
      </section>
    </section>
  );
}

export function AdminMenuHistoryShell() {
  const router = useRouter();
  const { status, session, error, refreshBusinessSession, signOut } = useBusinessAuth();
  const [history, setHistory] = useState<AdminMenuHistoryEvent[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    orgId: "",
    restaurantId: "",
    eventType: "",
    resourceType: "",
    rollbackReadiness: "",
    from: "",
    to: "",
    limit: "50"
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(buildAuthRedirectTarget({ pathname: "/admin/menu-history" }));
    }
  }, [router, status]);

  useEffect(() => {
    if (status !== "authenticated" || !session) return;
    let active = true;
    setLoading(true);
    setLoadError(null);

    listAdminMenuHistory(session, {
      orgId: appliedFilters.orgId || undefined,
      restaurantId: appliedFilters.restaurantId || undefined,
      eventType: appliedFilters.eventType || undefined,
      resourceType: appliedFilters.resourceType || undefined,
      rollbackReadiness: appliedFilters.rollbackReadiness || undefined,
      from: appliedFilters.from || undefined,
      to: appliedFilters.to || undefined,
      limit: appliedFilters.limit ? Number(appliedFilters.limit) : 50
    })
      .then((result) => {
        if (active) setHistory(result.items);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setLoadError(getUserFacingApiError(requestError, MENU_HISTORY_UNAVAILABLE));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [appliedFilters, session, status]);

  if (status === "loading" || status === "unauthenticated") {
    return <div className="app-shell-loading">Loading ShipWright...</div>;
  }

  return (
    <main className="app-shell admin-shell-page">
      <aside className="sidebar app-sidebar" aria-label="Admin workspace navigation">
        <BrandLogo />
        <nav className="sidebar-nav">
          <Link href="/admin">Admin overview</Link>
          <Link href="/admin/command">Command intelligence</Link>
          <Link href="/admin/menu-history">Menu history</Link>
          <Link href="/admin/demo-requests">Demo requests</Link>
          <Link href="/admin/release-readiness">Release readiness</Link>
          <Link href="/app">Workspace</Link>
        </nav>
        <div className="sidebar-footer">
          <span>{session?.email}</span>
          <button type="button" onClick={() => void refreshBusinessSession()}>Refresh</button>
          <button type="button" onClick={() => void signOut()}>Sign out</button>
        </div>
      </aside>

      <section className="dashboard-content">
        <header className="dashboard-header admin-page-header">
          <div>
            <p className="eyebrow">Platform support</p>
            <h1>Menu history</h1>
            <p>Read-only visibility into restaurant menu changes across organisations.</p>
          </div>
        </header>

        <form
          className="sw-operational-surface admin-menu-history-filters"
          onSubmit={(event) => {
            event.preventDefault();
            setAppliedFilters(filters);
          }}
        >
          <label>
            <span>Org ID</span>
            <input value={filters.orgId} onChange={(event) => setFilters((current) => ({ ...current, orgId: event.target.value }))} placeholder="Optional organisation ID" />
          </label>
          <label>
            <span>Restaurant ID</span>
            <input value={filters.restaurantId} onChange={(event) => setFilters((current) => ({ ...current, restaurantId: event.target.value }))} placeholder="Optional restaurant ID" />
          </label>
          <label>
            <span>Event type</span>
            <select value={filters.eventType} onChange={(event) => setFilters((current) => ({ ...current, eventType: event.target.value }))}>
              <option value="">All events</option>
              {EVENT_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span>Resource</span>
            <select value={filters.resourceType} onChange={(event) => setFilters((current) => ({ ...current, resourceType: event.target.value as "" | MenuHistoryResourceType }))}>
              <option value="">All resources</option>
              <option value="category">Sections</option>
              <option value="item">Items</option>
            </select>
          </label>
          <label>
            <span>Rollback readiness</span>
            <select value={filters.rollbackReadiness} onChange={(event) => setFilters((current) => ({ ...current, rollbackReadiness: event.target.value }))}>
              <option value="">All readiness states</option>
              <option value="ROLLBACK_PREPARED">Rollback prepared</option>
              <option value="NOT_REVERSIBLE">Not reversible</option>
              <option value="INSUFFICIENT_METADATA">Needs more metadata</option>
            </select>
          </label>
          <label>
            <span>From</span>
            <input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} />
          </label>
          <label>
            <span>To</span>
            <input type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} />
          </label>
          <label>
            <span>Limit</span>
            <input min="1" max="100" type="number" value={filters.limit} onChange={(event) => setFilters((current) => ({ ...current, limit: event.target.value }))} />
          </label>
          <div className="admin-menu-history-filter-actions">
            <button className="sw-button sw-button--primary button button-primary" disabled={loading} type="submit">Apply filters</button>
            <button
              className="sw-button sw-button--secondary button button-secondary"
              type="button"
              onClick={() => {
                const reset = { orgId: "", restaurantId: "", eventType: "", resourceType: "", rollbackReadiness: "", from: "", to: "", limit: "50" };
                setFilters(reset);
                setAppliedFilters(reset);
              }}
            >
              Reset
            </button>
          </div>
        </form>

        {error ? <div className="form-error-banner support-escalation-error">{error}</div> : null}
        {loadError ? <div className="form-error-banner support-escalation-error">{loadError}</div> : null}
        {loading ? <div className="app-shell-loading">Loading menu history...</div> : <AdminMenuHistoryView history={history} />}
      </section>
    </main>
  );
}
