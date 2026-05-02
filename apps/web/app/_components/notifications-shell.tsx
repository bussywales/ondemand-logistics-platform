"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listBusinessNotifications, markAllBusinessNotificationsRead, markBusinessNotificationRead } from "../_lib/api";
import {
  resolveNotificationsLoadFailure,
  resolveNotificationsLoadSuccess
} from "../_lib/notifications-state";
import type { BusinessNotification, BusinessSession } from "../_lib/product-state";
import { useBusinessAuth } from "./business-auth-provider";
import { BrandLogo } from "./brand-logo";
import { ContextualHelpLink } from "./help";
import { GroupedNotificationFeed, NotificationsAuthExpiredState, NotificationsBell } from "./notifications";
import { ShipWrightIcon } from "./shipwright-icon";
import { WorkspaceNav } from "./workspace-nav";

function severityCount(items: BusinessNotification[], severity: BusinessNotification["severity"]) {
  return items.filter((item) => item.severity === severity).length;
}

export function NotificationsShell() {
  const router = useBusinessAuth();
  const session = router.session;
  const [items, setItems] = useState<BusinessNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authExpired, setAuthExpired] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    void refreshNotifications(session);
  }, [session?.accessToken]);

  async function refreshNotifications(currentSession: BusinessSession) {
    setLoading(true);
    if (!authExpired) {
      setError(null);
    }

    try {
      const next = await listBusinessNotifications(currentSession);
      const result = resolveNotificationsLoadSuccess(next);
      setItems(result.items);
      setAuthExpired(result.authExpired);
      setError(result.error);
    } catch (issue) {
      const result = resolveNotificationsLoadFailure(issue);
      setItems(result.items);
      setAuthExpired(result.authExpired);
      setError(result.error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await router.signOut();
    window.location.href = "/";
  }

  async function handleOpenNotification(item: BusinessNotification) {
    if (!session || authExpired || item.read) {
      return;
    }

    setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)));

    try {
      await markBusinessNotificationRead(session, item.id);
    } catch (issue) {
      setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, read: false } : entry)));
      setError(issue instanceof Error ? issue.message : "Unable to update notification state.");
    }
  }

  async function handleMarkAllRead() {
    if (!session || authExpired || markingAll || items.every((item) => item.read)) {
      return;
    }

    const previous = items;
    setMarkingAll(true);
    setItems((current) => current.map((item) => ({ ...item, read: true })));

    try {
      await markAllBusinessNotificationsRead(session);
    } catch (issue) {
      setItems(previous);
      setError(issue instanceof Error ? issue.message : "Unable to update notification state.");
    } finally {
      setMarkingAll(false);
    }
  }

  if (router.status === "loading") {
    return (
      <main className="app-shell loading-shell">
        <section className="ops-empty-state">
          <strong>Loading notifications</strong>
          <p>Checking the business workspace and recent system events.</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="app-shell loading-shell">
        <section className="ops-empty-state">
          <p className="eyebrow">Authentication required</p>
          <h1>Sign in before reviewing notifications.</h1>
          <p>Notifications are only available inside the business operator workspace.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/get-started">
              Open onboarding
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const workspaceName = session.context.currentOrg?.name ?? "ShipWright workspace";
  const unreadCount = items.filter((item) => !item.read).length;
  const dangerCount = severityCount(items, "danger");
  const warningCount = severityCount(items, "warning");

  return (
    <main className="app-shell ops-shell orders-shell notifications-shell">
      <header className="ops-topbar">
        <div className="ops-branding">
          <BrandLogo href="/" mode="responsive" />
          <p className="eyebrow">Operations console</p>
          <h1>{workspaceName}</h1>
        </div>
        <div className="ops-topbar-actions">
          <NotificationsBell session={session} />
          <ContextualHelpLink href="/help/troubleshooting" />
          <button
            className="button button-secondary"
            onClick={() =>
              void router.refreshBusinessSession().then((nextSession) => {
                if (nextSession) {
                  return refreshNotifications(nextSession);
                }
              })
            }
            type="button"
          >
            Refresh
          </button>
          <button className="button button-secondary" onClick={() => void handleSignOut()} type="button">
            Sign Out
          </button>
        </div>
      </header>

      <section className="ops-layout">
        <aside className="ops-sidebar">
          <WorkspaceNav active="notifications" platformAdmin={session.context.platformAdmin} />

          <section className="ops-sidebar-section">
            <span className="ops-section-label">Operator</span>
            <strong>{session.context.displayName}</strong>
            <p>{session.context.email}</p>
          </section>

          <section className="ops-sidebar-section">
            <span className="ops-section-label">Notification flow</span>
            <div className="ops-summary-list">
              <div>
                <strong>{items.length}</strong>
                <span>Total</span>
              </div>
              <div>
                <strong>{unreadCount}</strong>
                <span>Unread</span>
              </div>
              <div>
                <strong>{dangerCount + warningCount}</strong>
                <span>Review</span>
              </div>
            </div>
          </section>

          <section className="ops-sidebar-section ops-sidebar-live">
            <span className="sidebar-live-icon" aria-hidden="true">
              <ShipWrightIcon name={dangerCount > 0 ? "alert" : warningCount > 0 ? "warning" : "check"} />
            </span>
            <span className="ops-section-label">System posture</span>
            <strong>{dangerCount > 0 ? "Attention required" : warningCount > 0 ? "Watch list" : "System clear"}</strong>
            <p>
              {dangerCount > 0
                ? `${dangerCount} high-severity notification${dangerCount === 1 ? "" : "s"} need review.`
                : warningCount > 0
                  ? `${warningCount} risk notification${warningCount === 1 ? "" : "s"} should be checked.`
                  : "No blocker or risk notifications are open right now."}
            </p>
            <span className="sidebar-live-action">
              {dangerCount > 0 ? "Open the latest blocker and resolve it from the linked job or order." : "Monitor new delivery and payment events."}
            </span>
          </section>
        </aside>

        <div className="ops-main">
          {error ? <div className="form-error-banner">{error}</div> : null}

          <section className="ops-stack notifications-stack">
            <section
              className={`sw-command-surface notifications-command-surface ${
                dangerCount > 0 || warningCount > 0 ? "sw-command-surface--warning" : ""
              }`}
            >
              <div className="ops-command-copy">
                <span className="ops-command-icon" aria-hidden="true">
                  <ShipWrightIcon name={dangerCount > 0 ? "alert" : "bell"} />
                </span>
                <div>
                  <p className="eyebrow">Notifications</p>
                  <h2>{dangerCount > 0 ? "Operator review queue" : "Recent system events"}</h2>
                  <p>
                    {dangerCount > 0
                      ? "Blockers, risk signals, delivery milestones, and payment events are collected here for the current workspace."
                      : "Dispatch, payment, and delivery events are collected here for the current workspace."}
                  </p>
                </div>
              </div>
              <div className="orders-command-actions">
                <span className={`ops-count-pill ${dangerCount > 0 ? "ops-count-pill-alert" : ""}`}>{unreadCount} unread</span>
                <span className="ops-count-pill">{items.length} total</span>
                {!authExpired && unreadCount > 0 ? (
                  <button className="button button-secondary" onClick={() => void handleMarkAllRead()} type="button">
                    {markingAll ? "Marking..." : "Mark all read"}
                  </button>
                ) : null}
              </div>
            </section>

            <section className="sw-operational-surface ops-section notifications-list-section">
              <div className="ops-section-header">
                <div className="section-title-row">
                  <span className="section-title-icon" aria-hidden="true">
                    <ShipWrightIcon name="bell" />
                  </span>
                  <div>
                    <p className="eyebrow">Notifications</p>
                    <h2>Recent activity</h2>
                    <p className="ops-detail-note">Grouped by recency and linked to the relevant order or delivery job.</p>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="sw-empty-state notifications-empty-state">
                  <strong className="sw-empty-title">Loading notifications</strong>
                  <p className="sw-empty-copy">Checking the latest dispatch, payment, and delivery events.</p>
                </div>
              ) : authExpired ? (
                <NotificationsAuthExpiredState />
              ) : (
                <GroupedNotificationFeed items={items} onOpenNotification={(item) => void handleOpenNotification(item)} />
              )}
            </section>
          </section>
        </div>
      </section>
    </main>
  );
}
