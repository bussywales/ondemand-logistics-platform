"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { ProductUpdateAnnouncement } from "./product-updates";
import { ShipWrightIcon } from "./shipwright-icon";
import { useBusinessAuth } from "./business-auth-provider";
import { getUserFacingApiError, listAdminDriverReadiness } from "../_lib/api";
import { formatDateTime, type AdminDriverReadinessItem } from "../_lib/product-state";
import { buildAuthRedirectTarget } from "../_lib/route-protection";

const DRIVER_READINESS_UNAVAILABLE_MESSAGE = "Driver readiness data unavailable. Refresh or contact support.";

function readinessTone(status: AdminDriverReadinessItem["readinessStatus"]) {
  if (status === "READY") {
    return "status-positive";
  }

  if (status === "NEEDS_REVIEW") {
    return "status-live";
  }

  return "status-negative";
}

function checklistTone(result: AdminDriverReadinessItem["checklist"][number]["result"]) {
  if (result === "pass") {
    return "status-positive";
  }

  if (result === "warn") {
    return "status-live";
  }

  return "status-negative";
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function CountCard(props: { label: string; value: number; copy: string; tone: "success" | "warning" | "danger" | "info" }) {
  return (
    <div className="sw-metric-card sw-supporting-surface admin-command-metric-card">
      <span className={`sw-metric-icon sw-icon-badge ${props.tone === "success" ? "sw-icon-badge--success" : props.tone === "danger" ? "sw-icon-badge--warning" : "sw-icon-badge--info"}`} aria-hidden="true">
        <ShipWrightIcon name={props.tone === "success" ? "check" : props.tone === "danger" ? "alert" : "driver"} />
      </span>
      <span className="sw-metric-label">{props.label}</span>
      <strong className="sw-metric-value">{props.value}</strong>
      <p className="sw-metric-copy">{props.copy}</p>
    </div>
  );
}

export function AdminDriversView(props: { items: AdminDriverReadinessItem[] }) {
  const summary = useMemo(
    () => ({
      ready: props.items.filter((item) => item.readinessStatus === "READY").length,
      needsReview: props.items.filter((item) => item.readinessStatus === "NEEDS_REVIEW").length,
      notEligible: props.items.filter((item) => item.readinessStatus === "NOT_ELIGIBLE").length,
      online: props.items.filter((item) => item.availabilityStatus === "ONLINE").length
    }),
    [props.items]
  );
  const needsAction = summary.needsReview + summary.notEligible;

  return (
    <section className="ops-stack admin-command-stack">
      <section className={`${needsAction ? "sw-decision-surface" : "sw-command-surface"} admin-command-page-hero`}>
        <div className="sw-row admin-command-page-copy">
          <span className={`sw-icon-badge ${needsAction ? "sw-icon-badge--warning" : "sw-icon-badge--success"}`} aria-hidden="true">
            <ShipWrightIcon name={needsAction ? "warning" : "check"} />
          </span>
          <div>
            <span className="sw-badge sw-badge--info admin-command-page-badge">Courier compliance</span>
            <p className="eyebrow">Driver readiness</p>
            <h2>{needsAction ? `${needsAction} courier${needsAction === 1 ? "" : "s"} need review` : "Courier pool ready for pilot review"}</h2>
            <p>Read-only compliance and assignment readiness for pilot operations. Human approval is required before any courier is approved or relied on for dispatch.</p>
          </div>
        </div>

        <div className="admin-command-page-counts">
          <CountCard copy="Approved, online, registered, and recently seen." label="Ready" tone="success" value={summary.ready} />
          <CountCard copy="Requires human review before dispatch reliance." label="Needs review" tone={summary.needsReview ? "warning" : "info"} value={summary.needsReview} />
          <CountCard copy="Not currently eligible for pilot dispatch." label="Not eligible" tone={summary.notEligible ? "danger" : "info"} value={summary.notEligible} />
          <CountCard copy="Couriers currently online." label="Online" tone={summary.online ? "success" : "info"} value={summary.online} />
        </div>
      </section>

      <section className="sw-operational-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Readiness queue</p>
            <h2>Courier compliance and assignment state</h2>
            <p className="ops-detail-note">This surface is visibility-only in v1. It does not approve, suspend, score, or assign couriers.</p>
          </div>
        </div>

        {props.items.length ? (
          <div className="admin-command-list">
            {props.items.map((driver) => (
              <article className="sw-queue-row sw-list-row admin-command-item" key={driver.driverId}>
                <div className="sw-queue-row-main">
                  <div className="admin-command-item-title">
                    <span className="sw-icon-badge admin-command-item-icon admin-command-item-icon-info" aria-hidden="true">
                      <ShipWrightIcon name="driver" />
                    </span>
                    <div>
                      <div className="admin-command-item-meta">
                        <span className={`status-badge ${readinessTone(driver.readinessStatus)}`}>{formatStatus(driver.readinessStatus)}</span>
                        <span>{driver.availabilityStatus}</span>
                        <span>{driver.vehicleType ?? "No vehicle"}</span>
                        {driver.orgName ? <span>{driver.orgName}</span> : null}
                      </div>
                      <h3>{driver.driverName}</h3>
                      <p>{driver.recommendedNextAction}</p>
                    </div>
                  </div>

                  <div className="admin-fact-grid admin-detail-grid">
                    <div><span>Verification</span><strong>{formatStatus(driver.verificationStatus)}</strong></div>
                    <div><span>Active job</span><strong>{driver.activeJobId ? driver.activeJobId.slice(0, 8).toUpperCase() : "None"}</strong></div>
                    <div><span>Last seen</span><strong>{driver.lastLocationAt ? formatDateTime(driver.lastLocationAt) : "Not recorded"}</strong></div>
                    <div><span>Updated</span><strong>{formatDateTime(driver.updatedAt)}</strong></div>
                  </div>

                  <div className="sw-supporting-surface admin-detail-panel">
                    <div className="briefing-evidence-row">
                      {driver.checklist.map((item) => (
                        <span className={`status-badge ${checklistTone(item.result)}`} key={item.key}>
                          {item.label}: {item.reason}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="sw-queue-row-actions admin-command-item-actions">
                  {driver.activeJobId ? (
                    <Link className="sw-button sw-button--secondary button button-secondary" href={`/app/jobs/${driver.activeJobId}`}>
                      <ShipWrightIcon name="arrow" />
                      <span>Open job</span>
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="sw-empty-state admin-empty-state">
            <span className="empty-state-icon" aria-hidden="true">
              <ShipWrightIcon name="driver" />
            </span>
            <strong className="sw-empty-title">No courier profiles found</strong>
            <p className="sw-empty-copy">Driver readiness will appear here once courier profiles exist in staging.</p>
          </div>
        )}
      </section>

      <section className="sw-supporting-surface admin-command-section admin-command-guidance">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Human approval</p>
            <h2>Courier approval remains operator-led</h2>
          </div>
        </div>
        <p>ShipWright shows readiness signals only. Platform operators remain responsible for verification approval, courier communication, and pilot eligibility decisions.</p>
      </section>
    </section>
  );
}

export function AdminDriversShell() {
  const router = useRouter();
  const { status, session, error, refreshBusinessSession, signOut } = useBusinessAuth();
  const [items, setItems] = useState<AdminDriverReadinessItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(buildAuthRedirectTarget({ pathname: "/admin/drivers" }));
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

    void listAdminDriverReadiness(session)
      .then((nextItems) => {
        if (active) {
          setItems(nextItems);
        }
      })
      .catch((issue) => {
        if (active) {
          setLoadError(getUserFacingApiError(issue, DRIVER_READINESS_UNAVAILABLE_MESSAGE));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [session, status]);

  async function handleRefresh() {
    const nextSession = await refreshBusinessSession();
    if (!nextSession) {
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      setItems(await listAdminDriverReadiness(nextSession));
    } catch (issue) {
      setLoadError(getUserFacingApiError(issue, DRIVER_READINESS_UNAVAILABLE_MESSAGE));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push("/get-started");
  }

  if (status === "loading" || loading) {
    return (
      <main className="app-shell loading-shell">
        <section className="ops-empty-state">
          <strong>Loading driver readiness</strong>
          <p>Checking courier profiles, verification, availability, and assignment blockers.</p>
        </section>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="app-shell loading-shell">
        <section className="ops-empty-state">
          <p className="eyebrow">Session issue</p>
          <h1>Platform session could not be restored.</h1>
          <p>{error ?? "Retry the session restore or sign out and start again."}</p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={() => void refreshBusinessSession()} type="button">
              Retry Session
            </button>
            <button className="button button-secondary" onClick={() => void handleSignOut()} type="button">
              Sign Out
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (status !== "authenticated") {
    return null;
  }

  if (!session?.context.platformAdmin) {
    return (
      <main className="app-shell loading-shell">
        <section className="ops-empty-state">
          <p className="eyebrow">Platform admin required</p>
          <h1>Driver readiness is restricted.</h1>
          <p>Sign in with a seeded `PLATFORM_ADMIN` account to review courier compliance signals.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell admin-shell-page admin-command-page">
      <div className="sw-row-between admin-shell-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Platform control plane</p>
          <h1>Driver readiness</h1>
          <p>Read-only courier compliance, availability, and assignment readiness for controlled pilot operations.</p>
        </div>
        <div className="hero-actions">
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin">
            Back to Admin
          </Link>
          <button className="button button-secondary" onClick={() => void handleRefresh()} type="button">
            Refresh
          </button>
          <button className="button button-primary" onClick={() => void handleSignOut()} type="button">
            Sign Out
          </button>
        </div>
      </div>

      <ProductUpdateAnnouncement routePath="/admin/drivers" viewer="platform_admin" viewerKey={session.userId} />

      {loadError ? (
        <section className="sw-empty-state admin-empty-state admin-empty-state-danger">
          <span className="empty-state-icon" aria-hidden="true">
            <ShipWrightIcon name="alert" />
          </span>
          <strong className="sw-empty-title">Unable to load driver readiness</strong>
          <p className="sw-empty-copy">{loadError}</p>
        </section>
      ) : null}

      <AdminDriversView items={items} />
    </main>
  );
}
