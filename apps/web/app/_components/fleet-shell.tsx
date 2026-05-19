"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { useEffect, useState } from "react";
import { ApiRequestError, getFleetReadiness, getUserFacingApiError, isUnauthorizedApiError, listFleetDrivers } from "../_lib/api";
import { buildAuthRedirectTarget } from "../_lib/route-protection";
import { formatDateTime, type FleetDriver, type FleetReadinessSummary } from "../_lib/product-state";
import { BrandLogo } from "./brand-logo";
import { useBusinessAuth } from "./business-auth-provider";
import { ProductUpdateAnnouncement } from "./product-updates";

const FLEET_UNAVAILABLE_MESSAGE = "Fleet workspace unavailable. Refresh or contact support.";

function formatLabel(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function readinessTone(value: FleetDriver["readinessStatus"]) {
  if (value === "READY") return "sw-badge--success";
  if (value === "NEEDS_REVIEW") return "sw-badge--warning";
  return "sw-badge--neutral";
}

function availabilityTone(value: FleetDriver["availabilityStatus"]) {
  if (value === "ONLINE") return "sw-badge--success";
  if (value === "OFFLINE") return "sw-badge--neutral";
  return "sw-badge--warning";
}

function SummaryMetric(props: { label: string; value: number; copy: string }) {
  return (
    <div className="sw-metric-card sw-supporting-surface admin-command-metric-card">
      <span className="sw-metric-label">{props.label}</span>
      <strong className="sw-metric-value">{props.value}</strong>
      <p className="sw-metric-copy">{props.copy}</p>
    </div>
  );
}

export function FleetWorkspaceDeniedState() {
  return (
    <main className="app-shell admin-shell-page">
      <section className="sw-empty-state">
        <p className="eyebrow">Fleet workspace</p>
        <h1>Fleet manager access required</h1>
        <p className="sw-empty-copy">
          This workspace is for fleet owners, managers, dispatchers, and compliance managers. Ordinary driver accounts cannot manage fleet readiness.
        </p>
        <div className="hero-actions">
          <Link className="sw-button sw-button--secondary button button-secondary" href="/driver">
            Open driver route
          </Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/get-started">
            Switch account
          </Link>
        </div>
      </section>
    </main>
  );
}

export function FleetWorkspaceView(props: { readiness: FleetReadinessSummary; drivers: FleetDriver[] }) {
  return (
    <main className="app-shell admin-shell-page">
      <div className="sw-row-between admin-shell-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Fleet workspace</p>
          <h1>{props.readiness.fleetOrgName}</h1>
          <p>Read-only courier readiness for fleet managers, dispatchers, and compliance leads. Human review remains required.</p>
        </div>
        <div className="hero-actions">
          <Link className="sw-button sw-button--secondary button button-secondary" href="/driver">
            Driver route
          </Link>
        </div>
      </div>

      <ProductUpdateAnnouncement routePath="/fleet" viewer="driver" viewerKey="fleet-workspace" />

      <section className="sw-command-surface admin-command-page-hero">
        <div>
          <span className="sw-badge sw-badge--info">Fleet readiness</span>
          <h2>
            {props.readiness.readyDrivers} ready of {props.readiness.totalDrivers} fleet driver{props.readiness.totalDrivers === 1 ? "" : "s"}
          </h2>
          <p>{props.readiness.humanReviewNote}</p>
        </div>
        <div className="admin-command-page-counts">
          <SummaryMetric copy="Fleet members in the driver-company pool." label="Drivers" value={props.readiness.totalDrivers} />
          <SummaryMetric copy="Online, verified, vehicle-ready, and recently seen." label="Ready" value={props.readiness.readyDrivers} />
          <SummaryMetric copy="Records that need compliance or location review." label="Needs review" value={props.readiness.needsReviewDrivers} />
          <SummaryMetric copy="Currently linked active delivery jobs." label="Active jobs" value={props.readiness.activeJobs} />
        </div>
      </section>

      <section className="sw-operational-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Driver pool</p>
            <h2>Fleet-managed couriers</h2>
            <p className="ops-detail-note">No scoring, suspension, billing, payout, or dispatch preference automation is applied from this workspace.</p>
          </div>
        </div>

        {props.drivers.length ? (
          <div className="admin-command-list">
            {props.drivers.map((driver) => (
              <div className="sw-list-row" key={driver.membershipId}>
                <div className="sw-stack-sm">
                  <div className="sw-row">
                    <strong>{driver.displayName}</strong>
                    <span className={`sw-badge ${readinessTone(driver.readinessStatus)}`}>{formatLabel(driver.readinessStatus)}</span>
                    <span className={`sw-badge ${availabilityTone(driver.availabilityStatus)}`}>{formatLabel(driver.availabilityStatus)}</span>
                    <span className="sw-badge sw-badge--neutral">{formatLabel(driver.fleetRole)}</span>
                  </div>
                  <p className="ops-detail-note">{driver.email}</p>
                  <p className="ops-detail-note">{driver.recommendedNextAction}</p>
                </div>

                <div className="orders-financial-grid">
                  <div>
                    <span className="sw-metric-label">Verification</span>
                    <strong>{formatLabel(driver.verificationStatus)}</strong>
                  </div>
                  <div>
                    <span className="sw-metric-label">Vehicle</span>
                    <strong>{formatLabel(driver.vehicleType)}</strong>
                  </div>
                  <div>
                    <span className="sw-metric-label">Active job</span>
                    <strong>{driver.activeJobId ? `${formatLabel(driver.activeJobStatus)} · ${driver.activeJobId.slice(0, 8)}` : "None"}</strong>
                  </div>
                  <div>
                    <span className="sw-metric-label">Last seen</span>
                    <strong>{driver.lastLocationAt ? formatDateTime(driver.lastLocationAt) : "Not recorded"}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="sw-empty-state admin-empty-state">
            <strong className="sw-empty-title">No fleet drivers yet</strong>
            <p className="sw-empty-copy">Ask a platform admin to add existing couriers to this driver-company group before rehearsal.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function LoadingState() {
  return (
    <main className="app-shell loading-shell">
      <section className="sw-empty-state">
        <strong className="sw-empty-title">Loading fleet workspace</strong>
        <p className="sw-empty-copy">Checking your session and fleet membership.</p>
      </section>
    </main>
  );
}

function ErrorState(props: { message: string; onRefresh: () => void }) {
  return (
    <main className="app-shell loading-shell">
      <section className="sw-empty-state">
        <p className="eyebrow">Fleet workspace</p>
        <h1>Unable to load fleet readiness</h1>
        <p className="sw-empty-copy">{props.message}</p>
        <button className="sw-button sw-button--primary button button-primary" onClick={props.onRefresh} type="button">
          Refresh
        </button>
      </section>
    </main>
  );
}

export function FleetWorkspaceShell() {
  const router = useRouter();
  const { status, session, error, refreshBusinessSession } = useBusinessAuth();
  const [readiness, setReadiness] = useState<FleetReadinessSummary | null>(null);
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(buildAuthRedirectTarget({ pathname: "/fleet" }));
    }
  }, [router, status]);

  useEffect(() => {
    let active = true;

    if (!session) {
      return () => {
        active = false;
      };
    }

    setAccessDenied(false);
    setLoadError(null);

    void Promise.all([getFleetReadiness(session), listFleetDrivers(session)])
      .then(([nextReadiness, nextDrivers]) => {
        if (!active) return;
        setReadiness(nextReadiness);
        setDrivers(nextDrivers);
      })
      .catch((issue) => {
        if (!active) return;
        if (issue instanceof ApiRequestError && issue.status === 403) {
          setAccessDenied(true);
          return;
        }
        if (isUnauthorizedApiError(issue)) {
          router.replace(buildAuthRedirectTarget({ pathname: "/fleet" }));
          return;
        }
        setLoadError(getUserFacingApiError(issue, FLEET_UNAVAILABLE_MESSAGE));
      });

    return () => {
      active = false;
    };
  }, [router, session]);

  if (status === "loading") {
    return <LoadingState />;
  }

  if (status === "error") {
    return <ErrorState message={error ?? FLEET_UNAVAILABLE_MESSAGE} onRefresh={() => void refreshBusinessSession()} />;
  }

  if (status !== "authenticated") {
    return <LoadingState />;
  }

  if (accessDenied) {
    return <FleetWorkspaceDeniedState />;
  }

  if (loadError) {
    return <ErrorState message={loadError} onRefresh={() => void refreshBusinessSession()} />;
  }

  if (!readiness) {
    return <LoadingState />;
  }

  return <FleetWorkspaceView drivers={drivers} readiness={readiness} />;
}
