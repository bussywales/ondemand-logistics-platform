"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { ProductUpdateAnnouncement } from "./product-updates";
import { AdminWorkspaceLink } from "./workspace-nav";
import { useBusinessAuth } from "./business-auth-provider";
import { createAdminNotificationTest, getAdminNotificationDiagnostics, getUserFacingApiError } from "../_lib/api";
import { buildAuthRedirectTarget } from "../_lib/route-protection";
import type {
  AdminNotificationChannel,
  AdminNotificationDiagnosticEvent,
  AdminNotificationTestType,
  BusinessSession,
  NotificationDiagnostics,
  NotificationTestResponse
} from "../_lib/product-state";

function statusBadgeClass(value: string) {
  if (value === "sent") return "sw-badge--success";
  if (value === "failed" || value === "retrying") return "sw-badge--warning";
  if (value === "skipped") return "sw-badge--neutral";
  return "sw-badge--info";
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ConfigRow(props: { configured: boolean; label: string; copy: string }) {
  return (
    <div className="sw-list-row">
      <div>
        <strong>{props.label}</strong>
        <p className="ops-detail-note">{props.copy}</p>
      </div>
      <span className={`sw-badge ${props.configured ? "sw-badge--success" : "sw-badge--neutral"}`}>
        {props.configured ? "Configured" : "Not configured"}
      </span>
    </div>
  );
}

function NotificationEventRow(props: { event: AdminNotificationDiagnosticEvent }) {
  return (
    <div className="sw-list-row">
      <div className="sw-stack-sm">
        <div className="sw-row">
          <strong>{formatLabel(props.event.eventType)}</strong>
          <span className={`sw-badge ${statusBadgeClass(props.event.status)}`}>{formatLabel(props.event.status)}</span>
        </div>
        <p className="ops-detail-note">
          {props.event.notificationType ? `${formatLabel(props.event.notificationType)} · ` : ""}
          {props.event.channel ?? "channel not recorded"} · {new Date(props.event.createdAt).toLocaleString()}
        </p>
        {props.event.safeErrorSummary ? <p className="ops-detail-note">Delivery note: {props.event.safeErrorSummary}</p> : null}
      </div>
      <div className="sw-stack-sm">
        <span className="sw-badge sw-badge--neutral">Attempts {props.event.retryCount}</span>
        {props.event.provider ? <span className="sw-badge sw-badge--info">{props.event.provider}</span> : null}
      </div>
    </div>
  );
}

export function AdminNotificationsView(props: {
  diagnostics: NotificationDiagnostics;
  error?: string | null;
  pending?: boolean;
  result?: NotificationTestResponse | null;
  onTest: (input: { channel: AdminNotificationChannel; notificationType: AdminNotificationTestType; recipientEmail?: string }) => void;
}) {
  const [channel, setChannel] = useState<AdminNotificationChannel>("WEBHOOK");
  const [notificationType, setNotificationType] = useState<AdminNotificationTestType>("DEMO_REQUEST_CREATED");
  const [recipientEmail, setRecipientEmail] = useState("");

  return (
    <main className="app-shell admin-shell-page">
      <div className="sw-row-between admin-shell-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Commercial notifications</p>
          <h1>Notification diagnostics</h1>
          <p>This tests configured channels only. It does not expose secrets or run CRM sync.</p>
        </div>
        <div className="hero-actions">
          <AdminWorkspaceLink />
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/command">Admin command</Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/demo-requests">Demo requests</Link>
        </div>
      </div>

      <section className="sw-command-surface">
        <div className="sw-card-header">
          <div>
            <p className="eyebrow">Delivery posture</p>
            <h2>{props.diagnostics.counts.pending + props.diagnostics.counts.retrying + props.diagnostics.counts.failed} events need worker attention</h2>
            <p>Skipped or unconfigured is acceptable when optional notification secrets are intentionally absent.</p>
          </div>
        </div>
        <div className="team-summary-grid">
          <div className="sw-list-row"><span>Pending</span><strong>{props.diagnostics.counts.pending}</strong></div>
          <div className="sw-list-row"><span>Sent</span><strong>{props.diagnostics.counts.sent}</strong></div>
          <div className="sw-list-row"><span>Skipped</span><strong>{props.diagnostics.counts.skipped}</strong></div>
          <div className="sw-list-row"><span>Failed / retrying</span><strong>{props.diagnostics.counts.failed + props.diagnostics.counts.retrying}</strong></div>
        </div>
      </section>

      <section className="sw-operational-surface">
        <div className="sw-card-header">
          <div>
            <p className="eyebrow">Configuration checklist</p>
            <h2>Optional delivery channels</h2>
          </div>
        </div>
        <div className="sw-stack">
          <ConfigRow configured={props.diagnostics.configuration.webhookConfigured} label="Webhook URL" copy="Uses DEMO_REQUEST_WEBHOOK_URL. The URL is never shown in the UI." />
          <ConfigRow configured={props.diagnostics.configuration.adminEmailConfigured} label="Admin notification email" copy="Uses ADMIN_NOTIFICATION_EMAIL as the default admin recipient." />
          <ConfigRow configured={props.diagnostics.configuration.fromEmailConfigured} label="From email" copy="Uses NOTIFICATION_FROM_EMAIL for provider-backed email sends." />
          <ConfigRow configured={props.diagnostics.configuration.emailConfigured} label="Email provider ready" copy="Requires ADMIN_NOTIFICATION_EMAIL, RESEND_API_KEY, and NOTIFICATION_FROM_EMAIL." />
        </div>
      </section>

      <section className="sw-operational-surface">
        <div className="sw-card-header">
          <div>
            <p className="eyebrow">Test controls</p>
            <h2>Queue a notification test</h2>
            <p className="ops-detail-note">The worker will send, skip, or retry using configured environment variables. Client-provided webhook URLs are not accepted.</p>
          </div>
        </div>
        <form
          className="form-grid team-invite-grid"
          onSubmit={(event) => {
            event.preventDefault();
            props.onTest({
              channel,
              notificationType,
              recipientEmail: recipientEmail.trim() || undefined
            });
          }}
        >
          <label className="sw-field">
            <span className="sw-label">Channel</span>
            <select className="sw-input" disabled={props.pending} onChange={(event) => setChannel(event.target.value as AdminNotificationChannel)} value={channel}>
              <option value="WEBHOOK">Webhook</option>
              <option value="EMAIL">Email</option>
            </select>
          </label>
          <label className="sw-field">
            <span className="sw-label">Notification type</span>
            <select className="sw-input" disabled={props.pending} onChange={(event) => setNotificationType(event.target.value as AdminNotificationTestType)} value={notificationType}>
              <option value="DEMO_REQUEST_CREATED">Demo request created</option>
              <option value="ORG_INVITE_CREATED">Org invite created</option>
            </select>
          </label>
          <label className="sw-field">
            <span className="sw-label">Recipient email</span>
            <input className="sw-input" disabled={props.pending || channel !== "EMAIL"} onChange={(event) => setRecipientEmail(event.target.value)} placeholder="Optional for email tests" type="email" value={recipientEmail} />
          </label>
          <button className="sw-button sw-button--primary button button-primary" disabled={props.pending} type="submit">
            {props.pending ? "Queueing test..." : channel === "EMAIL" ? "Send test email notification" : "Send test webhook notification"}
          </button>
        </form>
        {props.result ? <p className="ops-detail-note">Queued {formatLabel(props.result.notificationType)} test as {props.result.outboxMessageId}.</p> : null}
        {props.error ? <p className="form-error" role="alert">{props.error}</p> : null}
      </section>

      <section className="sw-operational-surface">
        <div className="sw-card-header">
          <div>
            <p className="eyebrow">Recent events</p>
            <h2>{props.diagnostics.recentEvents.length} notification records</h2>
          </div>
        </div>
        <div className="sw-stack">
          {props.diagnostics.recentEvents.length === 0 ? (
            <div className="sw-empty-state">
              <strong className="sw-empty-title">No notification events yet</strong>
              <p className="sw-empty-copy">Demo request, invite, and test notification events will appear here after they are queued or processed.</p>
            </div>
          ) : props.diagnostics.recentEvents.map((event) => <NotificationEventRow event={event} key={`${event.id}:${event.status}`} />)}
        </div>
      </section>
    </main>
  );
}

export function AdminNotificationsShell() {
  const router = useRouter();
  const { status, session } = useBusinessAuth();
  const [diagnostics, setDiagnostics] = useState<NotificationDiagnostics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NotificationTestResponse | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace(buildAuthRedirectTarget({ pathname: "/admin/notifications" }));
  }, [router, status]);

  async function refresh(currentSession: BusinessSession | null = session) {
    if (!currentSession) return;
    setDiagnostics(await getAdminNotificationDiagnostics(currentSession));
  }

  useEffect(() => {
    if (status !== "authenticated" || !session?.context.platformAdmin) return;
    void refresh(session).catch((issue) => setError(getUserFacingApiError(issue, "Unable to load notification diagnostics.")));
  }, [session, status]);

  async function handleTest(input: { channel: AdminNotificationChannel; notificationType: AdminNotificationTestType; recipientEmail?: string }) {
    if (!session) return;
    setPending(true);
    setError(null);
    try {
      const response = await createAdminNotificationTest(session, input);
      setResult(response);
      await refresh(session);
    } catch (issue) {
      setError(getUserFacingApiError(issue, "Unable to queue notification test."));
    } finally {
      setPending(false);
    }
  }

  if (status === "loading" || !session) {
    return <main className="app-shell loading-shell"><section className="sw-empty-state"><strong className="sw-empty-title">Loading notification diagnostics</strong></section></main>;
  }

  if (!session.context.platformAdmin) {
    return <main className="app-shell loading-shell"><section className="sw-empty-state"><strong className="sw-empty-title">Platform admin required</strong></section></main>;
  }

  if (!diagnostics) {
    return <main className="app-shell loading-shell"><section className="sw-empty-state"><strong className="sw-empty-title">{error ?? "Loading notification diagnostics"}</strong></section></main>;
  }

  return (
    <>
      <ProductUpdateAnnouncement routePath="/admin/notifications" viewer="platform_admin" viewerKey={session.userId} />
      <AdminNotificationsView diagnostics={diagnostics} error={error} onTest={handleTest} pending={pending} result={result} />
    </>
  );
}
