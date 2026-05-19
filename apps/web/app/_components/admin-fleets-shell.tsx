"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { ProductUpdateAnnouncement } from "./product-updates";
import { AdminWorkspaceLink } from "./workspace-nav";
import { useBusinessAuth } from "./business-auth-provider";
import {
  addAdminFleetDriver,
  createAdminFleet,
  getUserFacingApiError,
  listAdminFleetDrivers,
  listAdminFleets,
  updateAdminFleetDriver
} from "../_lib/api";
import { buildAuthRedirectTarget } from "../_lib/route-protection";
import { formatDateTime, type FleetDriver, type FleetOrganisation, type OrgRole } from "../_lib/product-state";

const FLEET_ROLES: OrgRole[] = ["FLEET_OWNER", "FLEET_MANAGER", "DISPATCHER", "DRIVER", "COMPLIANCE_MANAGER"];
const FLEET_UNAVAILABLE_MESSAGE = "Fleet data unavailable. Refresh or contact support.";

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function readinessTone(value: FleetDriver["readinessStatus"]) {
  if (value === "READY") return "sw-badge--success";
  if (value === "NEEDS_REVIEW") return "sw-badge--warning";
  return "sw-badge--danger";
}

function FleetCount(props: { label: string; value: number; copy: string }) {
  return (
    <div className="sw-metric-card sw-supporting-surface admin-command-metric-card">
      <span className="sw-metric-label">{props.label}</span>
      <strong className="sw-metric-value">{props.value}</strong>
      <p className="sw-metric-copy">{props.copy}</p>
    </div>
  );
}

export function AdminFleetsView(props: {
  fleets: FleetOrganisation[];
  onCreate?: (input: { name: string; contactEmail?: string | null; city?: string | null }) => Promise<void>;
}) {
  const [form, setForm] = useState({ name: "", contactEmail: "", city: "" });
  const summary = useMemo(
    () => ({
      fleets: props.fleets.length,
      readyDrivers: props.fleets.reduce((total, fleet) => total + fleet.readyDriverCount, 0),
      needsReview: props.fleets.reduce((total, fleet) => total + fleet.needsReviewDriverCount, 0),
      activeJobs: props.fleets.reduce((total, fleet) => total + fleet.activeJobCount, 0)
    }),
    [props.fleets]
  );

  return (
    <main className="app-shell admin-shell-page">
      <div className="sw-row-between admin-shell-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Driver fleet organisations</p>
          <h1>Fleet companies</h1>
          <p>Management groups for courier pools. This v1 surface is visibility-first and does not change dispatch preference.</p>
        </div>
        <div className="hero-actions">
          <AdminWorkspaceLink />
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/drivers">Driver readiness</Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin">Admin</Link>
        </div>
      </div>

      <ProductUpdateAnnouncement routePath="/admin/fleets" viewer="platform_admin" viewerKey="admin-fleets" />

      <section className="sw-command-surface admin-command-page-hero">
        <div>
          <span className="sw-badge sw-badge--info">Human-reviewed fleet management</span>
          <h2>{summary.fleets ? `${summary.fleets} fleet organisation${summary.fleets === 1 ? "" : "s"} configured` : "No fleet organisations configured"}</h2>
          <p>Fleet companies group couriers for compliance visibility. Approval, dispatch reliance, and courier communication remain operator-led.</p>
        </div>
        <div className="admin-command-page-counts">
          <FleetCount copy="Driver-company organisations." label="Fleets" value={summary.fleets} />
          <FleetCount copy="Couriers currently ready by readiness signals." label="Ready drivers" value={summary.readyDrivers} />
          <FleetCount copy="Courier records requiring review." label="Needs review" value={summary.needsReview} />
          <FleetCount copy="Active jobs linked to fleet couriers." label="Active jobs" value={summary.activeJobs} />
        </div>
      </section>

      <section className="sw-operational-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Fleet registry</p>
            <h2>Driver-company groups</h2>
          </div>
        </div>
        {props.fleets.length ? (
          <div className="admin-command-list">
            {props.fleets.map((fleet) => (
              <div className="sw-list-row" key={fleet.id}>
                <div className="sw-stack-sm">
                  <div className="sw-row">
                    <strong>{fleet.name}</strong>
                    <span className="sw-badge sw-badge--info">{formatLabel(fleet.status)}</span>
                  </div>
                  <p className="ops-detail-note">{fleet.city ?? "City not set"} · {fleet.contactEmail ?? "No contact email"}</p>
                  <p className="ops-detail-note">{fleet.readyDriverCount} ready · {fleet.needsReviewDriverCount} need review · {fleet.notEligibleDriverCount} not eligible</p>
                </div>
                <Link className="sw-button sw-button--secondary button button-secondary" href={`/admin/fleets/${fleet.id}`}>
                  Manage drivers
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="sw-empty-state admin-empty-state">
            <strong className="sw-empty-title">No fleet companies yet</strong>
            <p className="sw-empty-copy">Create a driver-company organisation when a managed courier group joins a controlled pilot.</p>
          </div>
        )}
      </section>

      {props.onCreate ? (
        <section className="sw-supporting-surface admin-command-section">
          <div className="sw-card-header admin-section-header">
            <div>
              <p className="eyebrow">Create fleet</p>
              <h2>Add a driver company</h2>
            </div>
          </div>
          <form
            className="sw-stack"
            onSubmit={(event) => {
              event.preventDefault();
              void props.onCreate?.({
                name: form.name.trim(),
                contactEmail: form.contactEmail.trim() || null,
                city: form.city.trim() || null
              }).then(() => setForm({ name: "", contactEmail: "", city: "" }));
            }}
          >
            <div className="merchant-form-split">
              <label><span>Name</span><input onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} value={form.name} /></label>
              <label><span>Contact email</span><input onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))} type="email" value={form.contactEmail} /></label>
            </div>
            <label><span>Operating city</span><input onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} value={form.city} /></label>
            <button className="sw-button sw-button--primary button button-primary" disabled={!form.name.trim()} type="submit">Create fleet</button>
          </form>
        </section>
      ) : null}
    </main>
  );
}

export function AdminFleetDriversView(props: {
  fleetOrgId: string;
  drivers: FleetDriver[];
  onAdd?: (input: { email: string; role: OrgRole }) => Promise<void>;
  onUpdate?: (driver: FleetDriver, input: { role?: OrgRole; isActive?: boolean }) => Promise<void>;
}) {
  const fleetName = props.drivers[0]?.fleetOrgName ?? "Fleet drivers";
  const [form, setForm] = useState({ email: "", role: "DRIVER" as OrgRole });

  return (
    <main className="app-shell admin-shell-page">
      <div className="sw-row-between admin-shell-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Fleet driver pool</p>
          <h1>{fleetName}</h1>
          <p>Courier membership, role, and readiness visibility for a driver-company organisation.</p>
        </div>
        <div className="hero-actions">
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/fleets">All fleets</Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/drivers">Driver readiness</Link>
        </div>
      </div>

      <section className="sw-operational-surface admin-command-section">
        <div className="sw-card-header admin-section-header">
          <div>
            <p className="eyebrow">Drivers</p>
            <h2>Fleet-managed couriers</h2>
            <p className="ops-detail-note">No scoring, suspension, billing, payout, or dispatch preference automation is applied in v1.</p>
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
                    <span className="sw-badge sw-badge--neutral">{formatLabel(driver.fleetRole)}</span>
                  </div>
                  <p className="ops-detail-note">{driver.email}</p>
                  <p className="ops-detail-note">{driver.recommendedNextAction}</p>
                  <p className="ops-detail-note">Last seen {driver.lastLocationAt ? formatDateTime(driver.lastLocationAt) : "not recorded"}</p>
                </div>
                <div className="sw-row">
                  <label className="sw-label">
                    <span>Role</span>
                    <select
                      disabled={!props.onUpdate}
                      onChange={(event) => void props.onUpdate?.(driver, { role: event.target.value as OrgRole })}
                      value={driver.fleetRole}
                    >
                      {FLEET_ROLES.map((role) => <option key={role} value={role}>{formatLabel(role)}</option>)}
                    </select>
                  </label>
                  {props.onUpdate ? (
                    <button className="sw-button sw-button--secondary button button-secondary" onClick={() => void props.onUpdate?.(driver, { isActive: !driver.membershipActive })} type="button">
                      {driver.membershipActive ? "Deactivate" : "Reactivate"}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="sw-empty-state admin-empty-state">
            <strong className="sw-empty-title">No fleet drivers yet</strong>
            <p className="sw-empty-copy">Add existing users or drivers to this driver-company group before using it for pilot readiness review.</p>
          </div>
        )}
      </section>

      {props.onAdd ? (
        <section className="sw-supporting-surface admin-command-section">
          <div className="sw-card-header admin-section-header">
            <div>
              <p className="eyebrow">Add driver</p>
              <h2>Add an existing user or courier</h2>
            </div>
          </div>
          <form
            className="sw-stack"
            onSubmit={(event) => {
              event.preventDefault();
              void props.onAdd?.({ email: form.email.trim(), role: form.role }).then(() => setForm({ email: "", role: "DRIVER" }));
            }}
          >
            <div className="merchant-form-split">
              <label><span>User email</span><input onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} type="email" value={form.email} /></label>
              <label>
                <span>Fleet role</span>
                <select onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as OrgRole }))} value={form.role}>
                  {FLEET_ROLES.map((role) => <option key={role} value={role}>{formatLabel(role)}</option>)}
                </select>
              </label>
            </div>
            <button className="sw-button sw-button--primary button button-primary" disabled={!form.email.trim()} type="submit">Add to fleet</button>
          </form>
        </section>
      ) : null}
    </main>
  );
}

function LoadingState(props: { copy: string }) {
  return (
    <main className="app-shell loading-shell">
      <section className="sw-empty-state">
        <strong className="sw-empty-title">Loading fleet controls</strong>
        <p className="sw-empty-copy">{props.copy}</p>
      </section>
    </main>
  );
}

function RestrictedState() {
  return (
    <main className="app-shell loading-shell">
      <section className="sw-empty-state">
        <strong className="sw-empty-title">Platform admin required</strong>
        <p className="sw-empty-copy">Sign in with a platform admin account to manage fleet organisations.</p>
      </section>
    </main>
  );
}

export function AdminFleetsShell() {
  const router = useRouter();
  const { status, session } = useBusinessAuth();
  const [fleets, setFleets] = useState<FleetOrganisation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(buildAuthRedirectTarget({ pathname: "/admin/fleets" }));
    }
  }, [router, status]);

  useEffect(() => {
    if (!session?.context.platformAdmin) return;
    void listAdminFleets(session).then(setFleets).catch((issue) => setError(getUserFacingApiError(issue, FLEET_UNAVAILABLE_MESSAGE)));
  }, [session]);

  if (status === "loading") return <LoadingState copy="Checking platform admin access." />;
  if (!session?.context.platformAdmin) return <RestrictedState />;

  async function handleCreate(input: { name: string; contactEmail?: string | null; city?: string | null }) {
    if (!session) return;
    await createAdminFleet(session, input);
    setFleets(await listAdminFleets(session));
  }

  return (
    <>
      {error ? <main className="app-shell"><section className="sw-empty-state"><strong>{error}</strong></section></main> : null}
      <AdminFleetsView fleets={fleets} onCreate={handleCreate} />
    </>
  );
}

export function AdminFleetDriversShell(props: { fleetOrgId: string }) {
  const router = useRouter();
  const { status, session } = useBusinessAuth();
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(buildAuthRedirectTarget({ pathname: `/admin/fleets/${props.fleetOrgId}` }));
    }
  }, [props.fleetOrgId, router, status]);

  useEffect(() => {
    if (!session?.context.platformAdmin) return;
    void listAdminFleetDrivers(session, props.fleetOrgId).then(setDrivers).catch((issue) => setError(getUserFacingApiError(issue, FLEET_UNAVAILABLE_MESSAGE)));
  }, [props.fleetOrgId, session]);

  if (status === "loading") return <LoadingState copy="Loading fleet driver pool." />;
  if (!session?.context.platformAdmin) return <RestrictedState />;

  async function reload() {
    if (!session) return;
    setDrivers(await listAdminFleetDrivers(session, props.fleetOrgId));
  }

  async function handleAdd(input: { email: string; role: OrgRole }) {
    if (!session) return;
    await addAdminFleetDriver(session, props.fleetOrgId, input);
    await reload();
  }

  async function handleUpdate(driver: FleetDriver, input: { role?: OrgRole; isActive?: boolean }) {
    if (!session) return;
    await updateAdminFleetDriver(session, props.fleetOrgId, driver.membershipId, input);
    await reload();
  }

  return (
    <>
      {error ? <main className="app-shell"><section className="sw-empty-state"><strong>{error}</strong></section></main> : null}
      <AdminFleetDriversView fleetOrgId={props.fleetOrgId} drivers={drivers} onAdd={handleAdd} onUpdate={handleUpdate} />
    </>
  );
}
