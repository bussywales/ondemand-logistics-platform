"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { ProductUpdateAnnouncement } from "./product-updates";
import { AdminWorkspaceLink } from "./workspace-nav";
import { useBusinessAuth } from "./business-auth-provider";
import { getAdminAnalyticsSummary, getUserFacingApiError } from "../_lib/api";
import { buildAuthRedirectTarget } from "../_lib/route-protection";
import type { AdminAnalyticsSummary, AnalyticsBreakdownRow, AnalyticsEvent, AnalyticsMetricWindow, BusinessSession } from "../_lib/product-state";

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatRate(value: number | null) {
  if (value === null) return "n/a";
  return `${Math.round(value * 100)}%`;
}

function MetricCard(props: { label: string; value: string | number; copy: string }) {
  return (
    <div className="sw-list-row">
      <div>
        <span className="ops-detail-note">{props.label}</span>
        <strong>{props.value}</strong>
      </div>
      <p className="ops-detail-note">{props.copy}</p>
    </div>
  );
}

function MetricGrid(props: { window: AnalyticsMetricWindow }) {
  return (
    <div className="team-summary-grid">
      <MetricCard copy="Public marketing page views." label="Page views" value={props.window.pageViews} />
      <MetricCard copy="Public CTA and pricing CTA clicks." label="CTA clicks" value={props.window.ctaClicks} />
      <MetricCard copy="Demo request form starts." label="Form starts" value={props.window.demoFormStarts} />
      <MetricCard copy="Persisted demo request submissions." label="Submits" value={props.window.demoRequestSubmits} />
      <MetricCard copy="Form start to recorded request." label="Start -> submit" value={formatRate(props.window.formStartToSubmitRate)} />
      <MetricCard copy="CTA click to recorded request." label="CTA -> request" value={formatRate(props.window.ctaToDemoRequestRate)} />
    </div>
  );
}

function BreakdownTable(props: { empty: string; items: AnalyticsBreakdownRow[]; title: string }) {
  return (
    <section className="sw-operational-surface">
      <div className="sw-card-header">
        <div>
          <p className="eyebrow">Public funnel</p>
          <h2>{props.title}</h2>
        </div>
      </div>
      <div className="sw-stack">
        {props.items.length === 0 ? (
          <div className="sw-empty-state">
            <strong className="sw-empty-title">{props.empty}</strong>
            <p className="sw-empty-copy">Events will appear after public visitors interact with CTAs or pricing paths.</p>
          </div>
        ) : (
          props.items.map((item) => (
            <div className="sw-list-row" key={`${item.label}:${item.source ?? "none"}`}>
              <div>
                <strong>{item.label}</strong>
                <p className="ops-detail-note">{item.source ?? "source not recorded"}</p>
              </div>
              <span className="sw-badge sw-badge--info">{item.count}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function RecentEventRow(props: { event: AnalyticsEvent }) {
  const label = typeof props.event.metadata.label === "string" ? props.event.metadata.label : null;
  const source = typeof props.event.metadata.source === "string" ? props.event.metadata.source : props.event.source;
  return (
    <div className="sw-list-row">
      <div>
        <div className="sw-row">
          <strong>{label ?? formatLabel(props.event.eventName)}</strong>
          <span className="sw-badge sw-badge--neutral">{formatLabel(props.event.eventName)}</span>
        </div>
        <p className="ops-detail-note">
          {props.event.path ?? "path not recorded"} · {source} · {new Date(props.event.createdAt).toLocaleString()}
        </p>
        {props.event.demoRequestId ? <p className="ops-detail-note">Demo request: {props.event.demoRequestId}</p> : null}
      </div>
    </div>
  );
}

export function AdminAnalyticsView(props: { summary: AdminAnalyticsSummary }) {
  return (
    <main className="app-shell admin-shell-page">
      <div className="sw-row-between admin-shell-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Product analytics</p>
          <h1>Public funnel analytics</h1>
          <p>First-party operational analytics for public conversion behaviour. Raw IP addresses and raw user agents are not stored.</p>
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
            <p className="eyebrow">Last 30 days</p>
            <h2>{props.summary.windows.last30Days.demoRequestSubmits} demo requests recorded from tracked public intent</h2>
            <p className="ops-detail-note">Analytics failure is non-blocking for public journeys; demo request persistence remains the source of commercial truth.</p>
          </div>
        </div>
        <MetricGrid window={props.summary.windows.last30Days} />
      </section>

      <section className="sw-supporting-surface">
        <div className="sw-card-header">
          <div>
            <p className="eyebrow">Last 7 days</p>
            <h2>Recent funnel movement</h2>
          </div>
        </div>
        <MetricGrid window={props.summary.windows.last7Days} />
      </section>

      <BreakdownTable empty="No CTA events yet" items={props.summary.ctaPerformance} title="CTA performance" />
      <BreakdownTable empty="No pricing interest events yet" items={props.summary.pricingInterest} title="Pricing interest breakdown" />

      <section className="sw-operational-surface">
        <div className="sw-card-header">
          <div>
            <p className="eyebrow">Recent events</p>
            <h2>{props.summary.recentEvents.length} recent public events</h2>
          </div>
        </div>
        <div className="sw-stack">
          {props.summary.recentEvents.length === 0 ? (
            <div className="sw-empty-state">
              <strong className="sw-empty-title">No analytics events yet</strong>
              <p className="sw-empty-copy">Page views, CTA clicks, and demo request form events will appear here after the public site records them.</p>
            </div>
          ) : props.summary.recentEvents.map((event) => <RecentEventRow event={event} key={event.id} />)}
        </div>
      </section>
    </main>
  );
}

export function AdminAnalyticsShell() {
  const router = useRouter();
  const { status, session } = useBusinessAuth();
  const [summary, setSummary] = useState<AdminAnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace(buildAuthRedirectTarget({ pathname: "/admin/analytics" }));
  }, [router, status]);

  async function refresh(currentSession: BusinessSession | null = session) {
    if (!currentSession) return;
    setSummary(await getAdminAnalyticsSummary(currentSession));
  }

  useEffect(() => {
    if (status !== "authenticated" || !session?.context.platformAdmin) return;
    void refresh(session).catch((issue) => setError(getUserFacingApiError(issue, "Unable to load analytics summary.")));
  }, [session, status]);

  if (status === "loading" || !session) {
    return <main className="app-shell loading-shell"><section className="sw-empty-state"><strong className="sw-empty-title">Loading analytics</strong></section></main>;
  }

  if (!session.context.platformAdmin) {
    return <main className="app-shell loading-shell"><section className="sw-empty-state"><strong className="sw-empty-title">Platform admin required</strong></section></main>;
  }

  if (!summary) {
    return <main className="app-shell loading-shell"><section className="sw-empty-state"><strong className="sw-empty-title">{error ?? "Loading analytics"}</strong></section></main>;
  }

  return (
    <>
      <ProductUpdateAnnouncement routePath="/admin/analytics" viewer="platform_admin" viewerKey={session.userId} />
      <AdminAnalyticsView summary={summary} />
    </>
  );
}
