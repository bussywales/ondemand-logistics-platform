"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "./brand-logo";
import { useBusinessAuth } from "./business-auth-provider";
import { ProductUpdateAnnouncement } from "./product-updates";
import { ShipWrightIcon } from "./shipwright-icon";
import { AdminWorkspaceLink, WorkspaceNav } from "./workspace-nav";
import {
  cancelAdminOrgInvite,
  cancelBusinessTeamInvite,
  createBusinessTeamInvite,
  getAdminOrgMembers,
  getAdminGovernanceSummary,
  getBusinessTeam,
  getUserFacingApiError,
  listAdminOrgs,
  listAdminUsers,
  previewAdminUserImpersonation,
  resendAdminOrgInvite,
  resendBusinessTeamInvite,
  updateAdminOrgStatus,
  updateAdminOrgMembership,
  updateAdminUserStatus,
  updateBusinessTeamMembership
} from "../_lib/api";
import { buildAuthRedirectTarget } from "../_lib/route-protection";
import type {
  BusinessSession,
  BusinessTeam,
  AdminGovernanceSummary,
  IdentityAccessEvent,
  IdentityInvitation,
  IdentityMembership,
  IdentityOrg,
  IdentityOrgMembers,
  IdentityUser,
  OrgRole
} from "../_lib/product-state";

const BUSINESS_ROLE_OPTIONS: OrgRole[] = ["OWNER", "MANAGER", "OPERATOR", "FINANCE_VIEWER", "SUPPORT_USER", "MENU_MANAGER"];
const ADMIN_ROLE_OPTIONS: OrgRole[] = [
  "OWNER",
  "MANAGER",
  "OPERATOR",
  "FINANCE_VIEWER",
  "SUPPORT_USER",
  "MENU_MANAGER",
  "BUSINESS_OPERATOR",
  "ADMIN",
  "FLEET_OWNER",
  "FLEET_MANAGER",
  "DISPATCHER",
  "DRIVER",
  "COMPLIANCE_MANAGER"
];

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusBadgeClass(value: string) {
  if (["ACTIVE", "READY", "PLATFORM_ADMIN"].includes(value)) {
    return "sw-badge--success";
  }
  if (["INACTIVE", "SUSPENDED", "CANCELLED", "EXPIRED"].includes(value)) {
    return "sw-badge--warning";
  }
  return "sw-badge--info";
}

function LoadingState(props: { copy: string }) {
  return (
    <main className="app-shell loading-shell">
      <section className="sw-empty-state">
        <strong className="sw-empty-title">Loading identity controls</strong>
        <p className="sw-empty-copy">{props.copy}</p>
      </section>
    </main>
  );
}

function PlatformAdminRequired() {
  return (
    <main className="app-shell loading-shell">
      <section className="sw-empty-state">
        <strong className="sw-empty-title">Platform admin required</strong>
        <p className="sw-empty-copy">Sign in with a platform admin account to manage users, organisations, and access posture.</p>
      </section>
    </main>
  );
}

function MemberRow(props: {
  member: IdentityMembership;
  roleOptions: OrgRole[];
  onUpdate?: (member: IdentityMembership, patch: { role?: OrgRole; isActive?: boolean }) => void;
}) {
  return (
    <div className="sw-list-row">
      <div className="sw-stack-sm">
        <div className="sw-row">
          <strong>{props.member.displayName}</strong>
          <span className={`sw-badge ${statusBadgeClass(props.member.isActive ? "ACTIVE" : "INACTIVE")}`}>
            {props.member.isActive ? "Active" : "Inactive"}
          </span>
        </div>
        <p className="ops-detail-note">{props.member.email}</p>
        <p className="ops-detail-note">{props.member.orgName}</p>
      </div>
      <div className="sw-row">
        <label className="sw-label">
          <span>Role</span>
          <select
            disabled={!props.onUpdate}
            onChange={(event) => props.onUpdate?.(props.member, { role: event.target.value as OrgRole })}
            value={props.member.role}
          >
            {props.roleOptions.includes(props.member.role) ? null : <option value={props.member.role}>{formatLabel(props.member.role)}</option>}
            {props.roleOptions.map((role) => (
              <option key={role} value={role}>
                {formatLabel(role)}
              </option>
            ))}
          </select>
        </label>
        {props.onUpdate ? (
          <button
            className="sw-button sw-button--secondary button button-secondary"
            onClick={() => props.onUpdate?.(props.member, { isActive: !props.member.isActive })}
            type="button"
          >
            {props.member.isActive ? "Deactivate" : "Reactivate"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function canResendInvite(invite: IdentityInvitation) {
  return invite.status === "PENDING" || invite.status === "EXPIRED";
}

function canCancelInvite(invite: IdentityInvitation) {
  return invite.status === "PENDING" || invite.status === "EXPIRED";
}

function InviteRow(props: {
  invite: IdentityInvitation;
  disabled?: boolean;
  onCancel?: (invite: IdentityInvitation) => void;
  onResend?: (invite: IdentityInvitation) => void;
}) {
  return (
    <div className="sw-list-row team-invite-row">
      <div className="sw-stack-sm">
        <div className="sw-row">
          <strong>{props.invite.email}</strong>
          <span className={`sw-badge ${statusBadgeClass(props.invite.status)}`}>{formatLabel(props.invite.status)}</span>
        </div>
        <p className="ops-detail-note">
          {formatLabel(props.invite.role)} · Created {new Date(props.invite.createdAt).toLocaleDateString()}
        </p>
      </div>
      {props.onResend || props.onCancel ? (
        <div className="sw-row">
          <button
            className="sw-button sw-button--secondary button button-secondary"
            disabled={props.disabled || !canResendInvite(props.invite)}
            onClick={() => props.onResend?.(props.invite)}
            type="button"
          >
            Resend invite
          </button>
          <button
            className="sw-button sw-button--ghost button button-secondary"
            disabled={props.disabled || !canCancelInvite(props.invite)}
            onClick={() => props.onCancel?.(props.invite)}
            type="button"
          >
            Cancel invite
          </button>
        </div>
      ) : null}
    </div>
  );
}

function AccessHistoryPanel(props: { events: IdentityAccessEvent[] }) {
  return (
    <section className="sw-supporting-surface team-members-surface">
      <div className="sw-card-header">
        <div>
          <p className="eyebrow">Access history</p>
          <h2>{props.events.length} recent access changes</h2>
          <p className="ops-detail-note">Invitation and membership changes are recorded for pilot support and audit review.</p>
        </div>
      </div>
      {props.events.length === 0 ? (
        <p className="ops-detail-note">Access changes will appear here after invites, role updates, or membership status changes.</p>
      ) : (
        <div className="sw-stack">
          {props.events.map((event) => (
            <div className="sw-list-row" key={event.id}>
              <div className="sw-stack-sm">
                <div className="sw-row">
                  <strong>{event.summary}</strong>
                  <span className="sw-badge sw-badge--neutral">{formatLabel(event.eventType)}</span>
                </div>
                <p className="ops-detail-note">
                  {event.actorName ?? event.actorEmail ?? "System"} · {new Date(event.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function GovernanceStatusControl(props: {
  currentStatus: string;
  disabled?: boolean;
  kind: "org" | "user";
  onSubmit: (input: { status: "ACTIVE" | "SUSPENDED" | "CLOSED" | "DISABLED"; reason?: string; note?: string | null; confirmation?: string }) => void;
}) {
  const [status, setStatus] = useState<"ACTIVE" | "SUSPENDED" | "CLOSED" | "DISABLED">("ACTIVE");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const restricted = status !== "ACTIVE";
  const confirmationCopy = props.kind === "org" ? "CONFIRM ORG STATUS CHANGE" : "CONFIRM USER STATUS CHANGE";
  const options = props.kind === "org" ? ["ACTIVE", "SUSPENDED", "CLOSED"] : ["ACTIVE", "SUSPENDED", "DISABLED"];

  return (
    <form
      className="sw-stack-sm"
      onSubmit={(event) => {
        event.preventDefault();
        props.onSubmit({
          status,
          reason: reason.trim() || undefined,
          note: note.trim() || null,
          confirmation: confirmation.trim() || undefined
        });
        setReason("");
        setNote("");
        setConfirmation("");
      }}
    >
      <p className="ops-detail-note">Current status: {formatLabel(props.currentStatus)}. Changes are reversible except any future CLOSED policy review.</p>
      <div className="form-grid two-column">
        <label className="sw-field">
          <span className="sw-label">Next status</span>
          <select className="sw-input" disabled={props.disabled} onChange={(event) => setStatus(event.target.value as typeof status)} value={status}>
            {options.map((option) => <option key={option} value={option}>{formatLabel(option)}</option>)}
          </select>
        </label>
        <label className="sw-field">
          <span className="sw-label">Reason {restricted ? "required" : "optional"}</span>
          <input className="sw-input" disabled={props.disabled} onChange={(event) => setReason(event.target.value)} value={reason} />
        </label>
      </div>
      <label className="sw-field">
        <span className="sw-label">Governance note optional</span>
        <textarea className="sw-input" disabled={props.disabled} onChange={(event) => setNote(event.target.value)} rows={2} value={note} />
      </label>
      {restricted ? (
        <label className="sw-field">
          <span className="sw-label">Typed confirmation</span>
          <input className="sw-input" disabled={props.disabled} onChange={(event) => setConfirmation(event.target.value)} placeholder={confirmationCopy} value={confirmation} />
        </label>
      ) : null}
      <button className="sw-button sw-button--secondary button button-secondary" disabled={props.disabled || (restricted && confirmation.trim() !== confirmationCopy)} type="submit">
        Apply status change
      </button>
    </form>
  );
}

export function AdminUsersView(props: {
  users: IdentityUser[];
  search: string;
  accessEvents?: IdentityAccessEvent[];
  initialSelectedUserId?: string | null;
  onSearch: (value: string) => void;
  onPreviewImpersonation?: (user: IdentityUser) => void;
  onUpdateStatus?: (user: IdentityUser, input: { status: "ACTIVE" | "SUSPENDED" | "DISABLED"; reason?: string; note?: string | null; confirmation?: string }) => void;
  pending?: boolean;
}) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(props.initialSelectedUserId ?? null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const normalizedSearch = props.search.trim().toLowerCase();
  const statusOptions = useMemo(() => ["ALL", ...Array.from(new Set(props.users.map((user) => user.status))).sort()], [props.users]);
  const roleOptions = useMemo(() => {
    const roles = new Set<string>();
    for (const user of props.users) {
      if (user.platformAdmin) roles.add("PLATFORM_ADMIN");
      for (const membership of user.memberships) roles.add(membership.role);
    }
    return ["ALL", ...Array.from(roles).sort()];
  }, [props.users]);
  const filteredUsers = useMemo(() => props.users.filter((user) => {
    const roleValues = [user.platformAdmin ? "PLATFORM_ADMIN" : null, ...user.memberships.map((membership) => membership.role)].filter(Boolean);
    const searchable = [
      user.displayName,
      user.email,
      user.status,
      user.platformAdmin ? "platform admin" : "",
      ...user.memberships.flatMap((membership) => [membership.orgName, membership.role, membership.orgType])
    ].join(" ").toLowerCase();
    return (
      (!normalizedSearch || searchable.includes(normalizedSearch)) &&
      (statusFilter === "ALL" || user.status === statusFilter) &&
      (roleFilter === "ALL" || roleValues.includes(roleFilter))
    );
  }), [normalizedSearch, props.users, roleFilter, statusFilter]);
  const selectedUser = props.users.find((user) => user.id === selectedUserId) ?? null;

  const selectedUserEvents = useMemo(() => {
    if (!selectedUser) return [];
    const userTokens = [selectedUser.id, selectedUser.email.toLowerCase(), selectedUser.displayName.toLowerCase()];
    return (props.accessEvents ?? []).filter((event) => {
      const summary = event.summary.toLowerCase();
      const actorEmail = event.actorEmail?.toLowerCase() ?? "";
      const metadata = JSON.stringify(event.metadata ?? {}).toLowerCase();
      return userTokens.some((token) => summary.includes(token) || actorEmail.includes(token) || metadata.includes(token));
    });
  }, [props.accessEvents, selectedUser]);

  return (
    <main className="app-shell admin-shell-page admin-users-directory-page">
      <div className="sw-row-between admin-shell-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Platform IAM</p>
          <h1>Users</h1>
          <p>Global identity visibility. Membership and role changes remain explicit and audited.</p>
        </div>
        <div className="hero-actions">
          <AdminWorkspaceLink />
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/orgs">Organisations</Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/governance">Governance</Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin">Admin home</Link>
        </div>
      </div>
      <section className="sw-command-surface admin-users-model-strip">
        <div className="sw-card-header">
          <div>
            <p className="eyebrow">Identity model</p>
            <h2>Identity, membership, role, profile</h2>
            <p>Identity is who someone is. Membership is where they belong. Role controls what they can do. Profile stores operational details.</p>
          </div>
          <div className="admin-users-directory-metrics">
            <span><strong>{props.users.length}</strong> users</span>
            <span><strong>{props.users.filter((user) => user.platformAdmin).length}</strong> platform</span>
            <span><strong>{props.users.filter((user) => user.status !== "ACTIVE").length}</strong> restricted</span>
          </div>
        </div>
      </section>
      <section className="sw-operational-surface admin-users-directory">
        <div className="sw-card-header admin-users-directory-header">
          <div>
            <p className="eyebrow">Global user list</p>
            <h2>{filteredUsers.length} visible users</h2>
            <p className="ops-detail-note">Scan first, then open a user for governance controls, affiliations, and support-access preparation.</p>
          </div>
          <div className="admin-users-toolbar" role="search">
            <label className="sw-field">
              <span className="sw-label">Search</span>
              <input aria-label="Search users" className="sw-input" onChange={(event) => props.onSearch(event.target.value)} placeholder="Name, email, org, role" value={props.search} />
            </label>
            <label className="sw-field">
              <span className="sw-label">Status</span>
              <select aria-label="Filter users by status" className="sw-input" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
                {statusOptions.map((option) => <option key={option} value={option}>{option === "ALL" ? "All statuses" : formatLabel(option)}</option>)}
              </select>
            </label>
            <label className="sw-field">
              <span className="sw-label">Role</span>
              <select aria-label="Filter users by role" className="sw-input" onChange={(event) => setRoleFilter(event.target.value)} value={roleFilter}>
                {roleOptions.map((option) => <option key={option} value={option}>{option === "ALL" ? "All roles" : formatLabel(option)}</option>)}
              </select>
            </label>
          </div>
        </div>
        <div className="admin-users-table" aria-label="Admin user directory">
          <div className="admin-users-table-head" aria-hidden="true">
            <span>User</span>
            <span>Status</span>
            <span>Platform role</span>
            <span>Organisations</span>
            <span>Last active</span>
            <span>Governance</span>
            <span>Actions</span>
          </div>
          {filteredUsers.length === 0 ? (
            <div className="sw-empty-state">
              <strong className="sw-empty-title">No users found</strong>
              <p className="sw-empty-copy">Adjust search or filters. Users appear after onboarding, team invite, or seeded staging setup.</p>
            </div>
          ) : filteredUsers.map((user) => (
            <button
              className={`admin-users-row ${selectedUserId === user.id ? "admin-users-row-active" : ""}`}
              key={user.id}
              onClick={() => setSelectedUserId(user.id)}
              aria-label={`Open details for ${user.displayName}`}
              type="button"
            >
              <span className="admin-user-primary admin-users-cell">
                <strong>{user.displayName}</strong>
                <span>{user.email}</span>
              </span>
              <span className="admin-users-cell"><span className={`sw-badge ${statusBadgeClass(user.status)}`}>{formatLabel(user.status)}</span></span>
              <span className="admin-users-cell">
                {user.platformAdmin ? <span className="sw-badge sw-badge--info">Platform Admin</span> : <span className="sw-badge sw-badge--neutral">None</span>}
              </span>
              <span className="admin-users-org-cell admin-users-cell">
                {user.memberships.length ? (
                  <>
                    <strong>{user.memberships.length}</strong>
                    <span>{user.memberships.slice(0, 2).map((membership) => membership.orgName).join(", ")}{user.memberships.length > 2 ? ` +${user.memberships.length - 2}` : ""}</span>
                  </>
                ) : (
                  <span>No memberships</span>
                )}
              </span>
              <span className="admin-users-cell">{user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString() : "Not available"}</span>
              <span className="admin-users-cell">
                {user.status === "ACTIVE" ? <span className="sw-badge sw-badge--success">Clear</span> : <span className="sw-badge sw-badge--warning">Review</span>}
              </span>
              <span className="admin-users-cell"><span className="admin-users-row-action">Open details</span></span>
            </button>
          ))}
        </div>
      </section>
      {selectedUser ? (
        <UserDetailDrawer
          accessEvents={selectedUserEvents}
          onClose={() => setSelectedUserId(null)}
          onPreviewImpersonation={props.onPreviewImpersonation}
          onUpdateStatus={props.onUpdateStatus}
          pending={props.pending}
          user={selectedUser}
        />
      ) : null}
    </main>
  );
}

function UserRoleChips(props: { user: IdentityUser }) {
  const roleChips = [
    props.user.platformAdmin ? "PLATFORM_ADMIN" : null,
    ...props.user.memberships.map((membership) => membership.role)
  ].filter((role): role is string => Boolean(role));
  const uniqueRoles = Array.from(new Set(roleChips));
  return (
    <div className="admin-user-role-chips">
      {uniqueRoles.length === 0 ? (
        <span className="sw-badge sw-badge--neutral">No roles</span>
      ) : uniqueRoles.map((role) => (
        <span className={`sw-badge ${role === "PLATFORM_ADMIN" ? "sw-badge--info" : "sw-badge--neutral"}`} key={role}>{formatLabel(role)}</span>
      ))}
    </div>
  );
}

function UserDetailDrawer(props: {
  accessEvents: IdentityAccessEvent[];
  onClose: () => void;
  onPreviewImpersonation?: (user: IdentityUser) => void;
  onUpdateStatus?: (user: IdentityUser, input: { status: "ACTIVE" | "SUSPENDED" | "DISABLED"; reason?: string; note?: string | null; confirmation?: string }) => void;
  pending?: boolean;
  user: IdentityUser;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") props.onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [props.onClose]);

  const fleetAffiliations = props.user.memberships.filter((membership) => membership.orgType === "DRIVER_COMPANY");
  const businessAffiliations = props.user.memberships.filter((membership) => membership.orgType === "RESTAURANT" || membership.orgType === "RETAILER");
  const otherAffiliations = props.user.memberships.filter((membership) => !fleetAffiliations.includes(membership) && !businessAffiliations.includes(membership));
  return (
    <div className="admin-user-drawer-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) props.onClose();
    }} role="presentation">
      <aside aria-label={`User details for ${props.user.displayName}`} className="admin-user-drawer" role="dialog" aria-modal="true">
        <div className="admin-user-drawer-header">
          <div>
            <p className="eyebrow">User detail</p>
            <h2>{props.user.displayName}</h2>
            <p className="ops-detail-note">{props.user.email}</p>
          </div>
          <button className="sw-button sw-button--ghost button button-secondary" onClick={props.onClose} type="button">Close</button>
        </div>

        <section className="admin-user-drawer-section">
          <div className="sw-row">
            <span className={`sw-badge ${statusBadgeClass(props.user.status)}`}>{formatLabel(props.user.status)}</span>
            {props.user.platformAdmin ? <span className="sw-badge sw-badge--info">Global platform role</span> : null}
          </div>
          <dl className="admin-user-detail-grid">
            <div><dt>User ID</dt><dd>{props.user.id}</dd></div>
            <div><dt>Created</dt><dd>{new Date(props.user.createdAt).toLocaleString()}</dd></div>
            <div><dt>Updated</dt><dd>{new Date(props.user.updatedAt).toLocaleString()}</dd></div>
            <div><dt>Last active</dt><dd>{props.user.lastSignInAt ? new Date(props.user.lastSignInAt).toLocaleString() : "Not available"}</dd></div>
          </dl>
        </section>

        <section className="admin-user-drawer-section">
          <div className="sw-card-header">
            <div>
              <p className="eyebrow">Roles</p>
              <h3>Global and organisation roles</h3>
            </div>
          </div>
          <UserRoleChips user={props.user} />
        </section>

        <section className="admin-user-drawer-section">
          <div className="sw-card-header">
            <div>
              <p className="eyebrow">Affiliations</p>
              <h3>{props.user.memberships.length} organisation memberships</h3>
            </div>
          </div>
          <div className="admin-user-memberships">
            {props.user.memberships.length === 0 ? <p className="ops-detail-note">No organisation memberships recorded.</p> : props.user.memberships.map((membership) => (
              <Link className="admin-user-membership-row" href={`/admin/orgs/${membership.orgId}/members`} key={membership.id}>
                <span>
                  <strong>{membership.orgName}</strong>
                  <small>{formatLabel(membership.orgType)} · {formatLabel(membership.role)}</small>
                </span>
                <span className={`sw-badge ${statusBadgeClass(membership.isActive ? "ACTIVE" : "INACTIVE")}`}>{membership.isActive ? "Active" : "Inactive"}</span>
              </Link>
            ))}
          </div>
          <div className="admin-user-affiliation-summary">
            <span>Business: {businessAffiliations.length}</span>
            <span>Fleet: {fleetAffiliations.length}</span>
            <span>Other: {otherAffiliations.length}</span>
          </div>
        </section>

        <section className="admin-user-drawer-section admin-user-governance-section">
          <div className="sw-card-header">
            <div>
              <p className="eyebrow">Governance</p>
              <h3>Suspend or reactivate access</h3>
              <p className="ops-detail-note">No account deletion. Restricted status changes require reason and typed confirmation.</p>
            </div>
          </div>
          {props.onUpdateStatus ? (
            <GovernanceStatusControl
              currentStatus={props.user.status}
              disabled={props.pending}
              kind="user"
              onSubmit={(input) => props.onUpdateStatus?.(props.user, input as { status: "ACTIVE" | "SUSPENDED" | "DISABLED"; reason?: string; note?: string | null; confirmation?: string })}
            />
          ) : <p className="ops-detail-note">Governance mutation controls are unavailable in this context.</p>}
        </section>

        <section className="admin-user-drawer-section">
          <div className="sw-card-header">
            <div>
              <p className="eyebrow">Support access</p>
              <h3>Impersonation preview</h3>
              <p className="ops-detail-note">Live impersonation is disabled. Preview only lists requirements for a future audited support session.</p>
            </div>
          </div>
          {props.onPreviewImpersonation ? (
            <button className="sw-button sw-button--secondary button button-secondary" disabled={props.pending} onClick={() => props.onPreviewImpersonation?.(props.user)} type="button">
              Preview impersonation requirements
            </button>
          ) : null}
        </section>

        <section className="admin-user-drawer-section">
          <div className="sw-card-header">
            <div>
              <p className="eyebrow">Access history</p>
              <h3>{props.accessEvents.length} recent matching events</h3>
            </div>
          </div>
          {props.accessEvents.length === 0 ? (
            <p className="ops-detail-note">No recent governance events matched this user. Organisation-level invite history is available from membership detail pages.</p>
          ) : (
            <div className="admin-user-access-list">
              {props.accessEvents.slice(0, 6).map((event) => (
                <div className="sw-list-row" key={event.id}>
                  <div>
                    <strong>{event.summary}</strong>
                    <p className="ops-detail-note">{event.actorName ?? event.actorEmail ?? "System"} · {new Date(event.createdAt).toLocaleString()}</p>
                  </div>
                  <span className="sw-badge sw-badge--neutral">{formatLabel(event.eventType)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="admin-user-drawer-section">
          <div className="sw-card-header">
            <div>
              <p className="eyebrow">Invitation history</p>
              <h3>Organisation invite records</h3>
              <p className="ops-detail-note">Invitation records are scoped to organisations. Open an affiliation above to review resend, cancel, and invite audit history.</p>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}

export function AdminOrgsView(props: {
  orgs: IdentityOrg[];
  search: string;
  onSearch: (value: string) => void;
  onUpdateStatus?: (org: IdentityOrg, input: { status: "ACTIVE" | "SUSPENDED" | "CLOSED"; reason?: string; note?: string | null; confirmation?: string }) => void;
  pending?: boolean;
}) {
  return (
    <main className="app-shell admin-shell-page">
      <div className="sw-row-between admin-shell-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Platform IAM</p>
          <h1>Organisations</h1>
          <p>Organisation visibility for restaurants, retailers, driver companies, couriers, and support partners.</p>
        </div>
        <div className="hero-actions">
          <AdminWorkspaceLink />
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/users">Users</Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/governance">Governance</Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin">Admin home</Link>
        </div>
      </div>
      <section className="sw-operational-surface">
        <div className="sw-card-header">
          <div>
            <p className="eyebrow">Organisation registry</p>
            <h2>{props.orgs.length} organisations</h2>
          </div>
          <input aria-label="Search organisations" onChange={(event) => props.onSearch(event.target.value)} placeholder="Search organisations" value={props.search} />
        </div>
        <div className="sw-stack">
          {props.orgs.length === 0 ? (
            <div className="sw-empty-state">
              <strong className="sw-empty-title">No organisations found</strong>
              <p className="sw-empty-copy">Pilot, merchant, and fleet organisations will appear here as they are created.</p>
            </div>
          ) : props.orgs.map((org) => (
            <article className="sw-list-row" key={org.id}>
              <div className="sw-stack-sm">
                <div className="sw-row">
                  <strong>{org.name}</strong>
                  <span className="sw-badge sw-badge--info">{formatLabel(org.type)}</span>
                  <span className={`sw-badge ${statusBadgeClass(org.status)}`}>{formatLabel(org.status)}</span>
                </div>
                <p className="ops-detail-note">{org.city ?? "City not set"} · {org.contactEmail ?? "No contact email"}</p>
              </div>
              <div className="sw-row">
                <span className="sw-badge sw-badge--neutral">{org.activeMemberCount}/{org.memberCount} active members</span>
                <Link className="sw-button sw-button--secondary button button-secondary" href={`/admin/orgs/${org.id}/members`}>Manage members</Link>
              </div>
              {props.onUpdateStatus ? (
                <GovernanceStatusControl
                  currentStatus={org.status}
                  disabled={props.pending}
                  kind="org"
                  onSubmit={(input) => props.onUpdateStatus?.(org, input as { status: "ACTIVE" | "SUSPENDED" | "CLOSED"; reason?: string; note?: string | null; confirmation?: string })}
                />
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export function OrgMembersView(props: {
  data: IdentityOrgMembers;
  pending?: boolean;
  onCancelInvite?: (invite: IdentityInvitation) => void;
  onResendInvite?: (invite: IdentityInvitation) => void;
  onUpdateOrgStatus?: (input: { status: "ACTIVE" | "SUSPENDED" | "CLOSED"; reason?: string; note?: string | null; confirmation?: string }) => void;
  onUpdate?: (member: IdentityMembership, patch: { role?: OrgRole; isActive?: boolean }) => void;
}) {
  const pendingInvitations = props.data.invitations.filter((invite) => invite.status === "PENDING" || invite.status === "EXPIRED");
  const historicalInvitations = props.data.invitations.filter((invite) => invite.status === "ACCEPTED" || invite.status === "CANCELLED");
  return (
    <main className="app-shell admin-shell-page">
      <div className="sw-row-between admin-shell-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Memberships</p>
          <h1>{props.data.org.name}</h1>
          <p>{formatLabel(props.data.org.type)} · {formatLabel(props.data.org.status)}</p>
        </div>
        <div className="hero-actions">
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/orgs">All organisations</Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/users">Users</Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/governance">Governance</Link>
        </div>
      </div>
      <section className="sw-command-surface">
        <div className="sw-card-header">
          <div>
            <p className="eyebrow">Enterprise governance</p>
            <h2>Organisation access status</h2>
            <p className="ops-detail-note">Suspension and closure are human-reviewed controls. No data is deleted.</p>
          </div>
        </div>
        {props.data.org.status === "SUSPENDED" || props.data.org.status === "CLOSED" ? (
          <div className="form-error-banner support-escalation-error">This organisation is {formatLabel(props.data.org.status)}. Business users should treat workspace operations as restricted until reactivated.</div>
        ) : null}
        {props.onUpdateOrgStatus ? (
          <GovernanceStatusControl
            currentStatus={props.data.org.status}
            disabled={props.pending}
            kind="org"
            onSubmit={(input) => props.onUpdateOrgStatus?.(input as { status: "ACTIVE" | "SUSPENDED" | "CLOSED"; reason?: string; note?: string | null; confirmation?: string })}
          />
        ) : null}
      </section>
      <section className="sw-operational-surface">
        <div className="sw-card-header">
          <div>
            <p className="eyebrow">Members</p>
            <h2>{props.data.members.length} memberships</h2>
            <p className="ops-detail-note">Role and activation changes are human-reviewed and written to the access audit trail.</p>
          </div>
        </div>
        <div className="sw-stack">
          {props.data.members.map((member) => <MemberRow key={member.id} member={member} onUpdate={props.onUpdate} roleOptions={ADMIN_ROLE_OPTIONS} />)}
        </div>
      </section>
      <section className="sw-supporting-surface">
        <div className="sw-card-header">
          <div>
            <p className="eyebrow">Pending invitations</p>
            <h2>{pendingInvitations.length} awaiting action</h2>
            <p className="ops-detail-note">Email delivery may depend on notification configuration. Resend records a new delivery event without creating a duplicate invite.</p>
          </div>
        </div>
        <div className="sw-stack">
          {pendingInvitations.length === 0 ? <p className="ops-detail-note">No pending invitation records.</p> : pendingInvitations.map((invite) => (
            <InviteRow disabled={props.pending} invite={invite} key={invite.id} onCancel={props.onCancelInvite} onResend={props.onResendInvite} />
          ))}
        </div>
      </section>
      <section className="sw-supporting-surface">
        <div className="sw-card-header">
          <div>
            <p className="eyebrow">Invitation history</p>
            <h2>{historicalInvitations.length} completed records</h2>
          </div>
        </div>
        {historicalInvitations.length === 0 ? (
          <p className="ops-detail-note">Accepted and cancelled invitations will appear here.</p>
        ) : (
          <div className="sw-stack">
            {historicalInvitations.map((invite) => <InviteRow invite={invite} key={invite.id} />)}
          </div>
        )}
      </section>
      <AccessHistoryPanel events={props.data.accessEvents ?? []} />
    </main>
  );
}

function TeamInviteForm(props: { disabled: boolean; onInvite: (input: { email: string; displayName?: string; role: OrgRole }) => void }) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<OrgRole>("OPERATOR");

  return (
    <form
      className="sw-supporting-surface team-invite-surface"
      onSubmit={(event) => {
        event.preventDefault();
        props.onInvite({ email, displayName: displayName || undefined, role });
        setEmail("");
        setDisplayName("");
      }}
    >
      <div className="sw-card-header">
        <div>
          <p className="eyebrow">Invite team member</p>
          <h2>Add access by email</h2>
          <p className="ops-detail-note">Existing users receive membership access. New emails are tracked as invitation records; no external email is sent in v1.</p>
        </div>
      </div>
      <div className="form-grid team-invite-grid">
        <label className="sw-field">
          <span className="sw-label">Email</span>
          <input className="sw-input" disabled={props.disabled} onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
        </label>
        <label className="sw-field">
          <span className="sw-label">Name</span>
          <input className="sw-input" disabled={props.disabled} onChange={(event) => setDisplayName(event.target.value)} placeholder="Optional display name" value={displayName} />
        </label>
        <label className="sw-field">
          <span className="sw-label">Role</span>
          <select className="sw-input" disabled={props.disabled} onChange={(event) => setRole(event.target.value as OrgRole)} value={role}>{BUSINESS_ROLE_OPTIONS.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}</select>
        </label>
      </div>
      <button className="sw-button sw-button--primary button button-primary" disabled={props.disabled} type="submit">Add team member</button>
    </form>
  );
}

export function BusinessTeamView(props: {
  team: BusinessTeam;
  session?: BusinessSession | null;
  onCancelInvite?: (invite: IdentityInvitation) => void;
  onInvite?: (input: { email: string; displayName?: string; role: OrgRole }) => void;
  onResendInvite?: (invite: IdentityInvitation) => void;
  onUpdate?: (member: IdentityMembership, patch: { role?: OrgRole; isActive?: boolean }) => void;
  pending?: boolean;
}) {
  const activeMembers = props.team.members.filter((member) => member.isActive).length;
  const inactiveMembers = props.team.members.length - activeMembers;
  const pendingInvites = props.team.invitations.filter((invite) => invite.status === "PENDING" || invite.status === "EXPIRED");
  const historicalInvites = props.team.invitations.filter((invite) => invite.status === "ACCEPTED" || invite.status === "CANCELLED");
  const platformAdmin = Boolean(props.session?.context.platformAdmin);
  const currentUserRole =
    props.session?.context.memberships.find((item) => item.membership.orgId === props.team.org.id)?.membership.role ?? null;

  return (
    <main className="app-shell ops-shell orders-shell team-settings-shell">
      <header className="ops-topbar">
        <div className="ops-branding">
          <BrandLogo href="/" mode="responsive" />
          <p className="eyebrow">Workspace settings</p>
          <h1>Team</h1>
        </div>
      </header>
      <section className="ops-layout">
        <aside className="ops-sidebar">
          <WorkspaceNav active="team" platformAdmin={platformAdmin} />
          <section className="sw-supporting-surface team-sidebar-card">
            <div className="sw-stack-sm">
              <p className="eyebrow">Workspace</p>
              <h2>{props.team.org.name}</h2>
              <p className="ops-detail-note">{formatLabel(props.team.org.type)} · {formatLabel(props.team.org.status)}</p>
            </div>
            <div className="sw-stack-sm">
              <span className="sw-badge sw-badge--success">{activeMembers} active</span>
              <span className="sw-badge sw-badge--neutral">{inactiveMembers} inactive</span>
              <span className="sw-badge sw-badge--info">{pendingInvites.length} pending invites</span>
            </div>
          </section>
          {props.session ? (
            <section className="sw-supporting-surface team-sidebar-card">
              <p className="eyebrow">Signed in</p>
              <p className="ops-detail-note">{props.session.email}</p>
              {currentUserRole ? <span className="sw-badge sw-badge--info">{formatLabel(currentUserRole)}</span> : null}
            </section>
          ) : null}
        </aside>
        <div className="ops-main">
          <ProductUpdateAnnouncement routePath="/app/settings/team" viewer="business" viewerKey={props.session?.userId ?? props.team.org.id} />
          <section className="sw-command-surface team-identity-card">
            <div className="sw-card-header">
              <div>
                <p className="eyebrow">Identity & Access</p>
                <h2>{props.team.org.name}</h2>
                <p>Manage who belongs to this workspace and which operational role they hold. Changes are audited.</p>
              </div>
            </div>
            {props.team.org.status === "SUSPENDED" || props.team.org.status === "CLOSED" ? (
              <div className="form-error-banner support-escalation-error">
                This workspace is {formatLabel(props.team.org.status)}. Treat operations as restricted and contact platform support before making changes.
              </div>
            ) : null}
            <div className="team-summary-grid">
              <div className="sw-list-row">
                <span>Active members</span>
                <strong>{activeMembers}</strong>
              </div>
              <div className="sw-list-row">
                <span>Inactive members</span>
                <strong>{inactiveMembers}</strong>
              </div>
              <div className="sw-list-row">
                <span>Pending invites</span>
                <strong>{pendingInvites.length}</strong>
              </div>
            </div>
          </section>
          {props.onInvite ? <TeamInviteForm disabled={Boolean(props.pending)} onInvite={props.onInvite} /> : null}
          <section className="sw-operational-surface team-members-surface">
            <div className="sw-card-header">
              <div>
                <p className="eyebrow">Current team</p>
                <h2>{props.team.members.length} members</h2>
                <p className="ops-detail-note">Use role and activation controls deliberately. Access changes are part of the workspace audit trail.</p>
              </div>
            </div>
            <div className="sw-stack">
              {props.team.members.map((member) => <MemberRow key={member.id} member={member} onUpdate={props.onUpdate} roleOptions={BUSINESS_ROLE_OPTIONS} />)}
            </div>
          </section>
          <section className="sw-supporting-surface team-members-surface">
            <div className="sw-card-header">
              <div>
                <p className="eyebrow">Pending invitations</p>
                <h2>{pendingInvites.length} awaiting action</h2>
                <p className="ops-detail-note">Email delivery may depend on notification configuration. Resend records follow-up without creating duplicate access.</p>
              </div>
            </div>
            {pendingInvites.length === 0 ? (
              <p className="ops-detail-note">No pending invitation records.</p>
            ) : (
              <div className="sw-stack">
                {pendingInvites.map((invite) => (
                  <InviteRow
                    disabled={props.pending}
                    invite={invite}
                    key={invite.id}
                    onCancel={props.onCancelInvite}
                    onResend={props.onResendInvite}
                  />
                ))}
              </div>
            )}
          </section>
          <section className="sw-supporting-surface team-members-surface">
            <div className="sw-card-header">
              <div>
                <p className="eyebrow">Invitation history</p>
                <h2>{historicalInvites.length} completed records</h2>
              </div>
            </div>
            {historicalInvites.length === 0 ? (
              <p className="ops-detail-note">Accepted and cancelled invitations will appear here.</p>
            ) : (
              <div className="sw-stack">
                {historicalInvites.map((invite) => <InviteRow invite={invite} key={invite.id} />)}
              </div>
            )}
          </section>
          <AccessHistoryPanel events={props.team.accessEvents ?? []} />
        </div>
      </section>
    </main>
  );
}

export function AdminGovernanceView(props: { summary: AdminGovernanceSummary }) {
  return (
    <main className="app-shell admin-shell-page">
      <div className="sw-row-between admin-shell-header">
        <div>
          <BrandLogo />
          <p className="eyebrow">Enterprise governance</p>
          <h1>Suspension and support access audit</h1>
          <p>Reversible access controls and audited support-access preparation. No impersonation session is active in v1.</p>
        </div>
        <div className="hero-actions">
          <AdminWorkspaceLink />
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/users">Users</Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin/orgs">Organisations</Link>
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin">Admin home</Link>
        </div>
      </div>
      <section className="sw-command-surface">
        <div className="sw-card-header">
          <div>
            <p className="eyebrow">Governance posture</p>
            <h2>{props.summary.suspendedOrgs.length + props.summary.suspendedUsers.length} restricted records</h2>
            <p className="ops-detail-note">Suspension is non-destructive. Impersonation remains disabled pending audited session controls, expiry, and explicit end action.</p>
          </div>
        </div>
        <div className="team-summary-grid">
          <div className="sw-list-row"><span>Suspended or closed orgs</span><strong>{props.summary.suspendedOrgs.length}</strong></div>
          <div className="sw-list-row"><span>Suspended or disabled users</span><strong>{props.summary.suspendedUsers.length}</strong></div>
          <div className="sw-list-row"><span>Recent governance events</span><strong>{props.summary.recentEvents.length}</strong></div>
        </div>
      </section>
      <section className="sw-operational-surface">
        <div className="sw-card-header"><div><p className="eyebrow">Organisations</p><h2>Restricted organisations</h2></div></div>
        <div className="sw-stack">
          {props.summary.suspendedOrgs.length === 0 ? <p className="ops-detail-note">No suspended or closed organisations.</p> : props.summary.suspendedOrgs.map((org) => (
            <div className="sw-list-row" key={org.id}>
              <div><strong>{org.name}</strong><p className="ops-detail-note">{formatLabel(org.type)} · {org.contactEmail ?? "No contact email"}</p></div>
              <div className="sw-row">
                <span className={`sw-badge ${statusBadgeClass(org.status)}`}>{formatLabel(org.status)}</span>
                <Link className="sw-button sw-button--secondary button button-secondary" href={`/admin/orgs/${org.id}/members`}>Review</Link>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="sw-operational-surface">
        <div className="sw-card-header"><div><p className="eyebrow">Users</p><h2>Restricted users</h2></div></div>
        <div className="sw-stack">
          {props.summary.suspendedUsers.length === 0 ? <p className="ops-detail-note">No suspended or disabled users.</p> : props.summary.suspendedUsers.map((user) => (
            <div className="sw-list-row" key={user.id}>
              <div><strong>{user.displayName}</strong><p className="ops-detail-note">{user.email}</p></div>
              <span className={`sw-badge ${statusBadgeClass(user.status)}`}>{formatLabel(user.status)}</span>
            </div>
          ))}
        </div>
      </section>
      <AccessHistoryPanel events={props.summary.recentEvents} />
    </main>
  );
}

export function AdminGovernanceShell() {
  const router = useRouter();
  const { status, session } = useBusinessAuth();
  const [summary, setSummary] = useState<AdminGovernanceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace(buildAuthRedirectTarget({ pathname: "/admin/governance" }));
  }, [router, status]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.context.platformAdmin) return;
    void getAdminGovernanceSummary(session)
      .then(setSummary)
      .catch((issue) => setError(getUserFacingApiError(issue, "Unable to load governance controls.")));
  }, [session, status]);

  if (status === "loading" || !session) return <LoadingState copy="Restoring platform admin session." />;
  if (!session.context.platformAdmin) return <PlatformAdminRequired />;
  if (!summary) return <LoadingState copy={error ?? "Loading enterprise governance posture."} />;
  return <AdminGovernanceView summary={summary} />;
}

export function AdminUsersShell() {
  const router = useRouter();
  const { status, session } = useBusinessAuth();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<IdentityUser[]>([]);
  const [accessEvents, setAccessEvents] = useState<IdentityAccessEvent[]>([]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace(buildAuthRedirectTarget({ pathname: "/admin/users" }));
  }, [router, status]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.context.platformAdmin) return;
    void listAdminUsers(session, search).then(setUsers);
  }, [search, session, status]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.context.platformAdmin) return;
    void getAdminGovernanceSummary(session)
      .then((summary) => setAccessEvents(summary.recentEvents))
      .catch(() => setAccessEvents([]));
  }, [session, status]);

  async function refresh(currentSession = session) {
    if (!currentSession) return;
    setUsers(await listAdminUsers(currentSession, search));
    try {
      const summary = await getAdminGovernanceSummary(currentSession);
      setAccessEvents(summary.recentEvents);
    } catch {
      setAccessEvents([]);
    }
  }

  async function handleUpdateStatus(user: IdentityUser, input: { status: "ACTIVE" | "SUSPENDED" | "DISABLED"; reason?: string; note?: string | null; confirmation?: string }) {
    if (!session) return;
    setPending(true);
    setMessage(null);
    try {
      await updateAdminUserStatus(session, user.id, input);
      await refresh(session);
      setMessage("User status change recorded in the access audit.");
    } catch (issue) {
      setMessage(getUserFacingApiError(issue, "Unable to update user status."));
    } finally {
      setPending(false);
    }
  }

  async function handlePreviewImpersonation(user: IdentityUser) {
    if (!session) return;
    setPending(true);
    setMessage(null);
    try {
      const preview = await previewAdminUserImpersonation(session, user.id);
      setMessage(`${preview.message} Requirements: ${preview.requirements.join(", ")}.`);
    } catch (issue) {
      setMessage(getUserFacingApiError(issue, "Unable to preview impersonation requirements."));
    } finally {
      setPending(false);
    }
  }

  if (status === "loading" || !session) return <LoadingState copy="Restoring platform admin session." />;
  if (!session.context.platformAdmin) return <PlatformAdminRequired />;

  return (
    <>
      <ProductUpdateAnnouncement routePath="/admin/users" viewer="platform_admin" viewerKey={session.userId} />
      {message ? <div className="form-error-banner support-escalation-error">{message}</div> : null}
      <AdminUsersView
        users={users}
        accessEvents={accessEvents}
        search={search}
        onPreviewImpersonation={handlePreviewImpersonation}
        onSearch={setSearch}
        onUpdateStatus={handleUpdateStatus}
        pending={pending}
      />
    </>
  );
}

export function AdminOrgsShell() {
  const router = useRouter();
  const { status, session } = useBusinessAuth();
  const [search, setSearch] = useState("");
  const [orgs, setOrgs] = useState<IdentityOrg[]>([]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace(buildAuthRedirectTarget({ pathname: "/admin/orgs" }));
  }, [router, status]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.context.platformAdmin) return;
    void listAdminOrgs(session, search).then(setOrgs);
  }, [search, session, status]);

  async function refresh(currentSession = session) {
    if (!currentSession) return;
    setOrgs(await listAdminOrgs(currentSession, search));
  }

  async function handleUpdateStatus(org: IdentityOrg, input: { status: "ACTIVE" | "SUSPENDED" | "CLOSED"; reason?: string; note?: string | null; confirmation?: string }) {
    if (!session) return;
    setPending(true);
    setMessage(null);
    try {
      await updateAdminOrgStatus(session, org.id, input);
      await refresh(session);
      setMessage("Organisation status change recorded in the access audit.");
    } catch (issue) {
      setMessage(getUserFacingApiError(issue, "Unable to update organisation status."));
    } finally {
      setPending(false);
    }
  }

  if (status === "loading" || !session) return <LoadingState copy="Restoring platform admin session." />;
  if (!session.context.platformAdmin) return <PlatformAdminRequired />;
  return (
    <>
      {message ? <div className="form-error-banner support-escalation-error">{message}</div> : null}
      <AdminOrgsView orgs={orgs} search={search} onSearch={setSearch} onUpdateStatus={handleUpdateStatus} pending={pending} />
    </>
  );
}

export function AdminOrgMembersShell(props: { orgId: string }) {
  const router = useRouter();
  const { status, session } = useBusinessAuth();
  const [data, setData] = useState<IdentityOrgMembers | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace(buildAuthRedirectTarget({ pathname: `/admin/orgs/${props.orgId}/members` }));
  }, [props.orgId, router, status]);

  async function refresh(currentSession = session) {
    if (!currentSession) return;
    setData(await getAdminOrgMembers(currentSession, props.orgId));
  }

  useEffect(() => {
    if (status !== "authenticated" || !session?.context.platformAdmin) return;
    void refresh(session).catch((issue) => setError(getUserFacingApiError(issue, "Unable to load organisation members.")));
  }, [props.orgId, session, status]);

  async function handleUpdate(member: IdentityMembership, patch: { role?: OrgRole; isActive?: boolean }) {
    if (!session) return;
    setPending(true);
    try {
      await updateAdminOrgMembership(session, props.orgId, member.id, patch);
      await refresh(session);
    } catch (issue) {
      setError(getUserFacingApiError(issue, "Unable to update membership."));
    } finally {
      setPending(false);
    }
  }

  async function handleResendInvite(invite: IdentityInvitation) {
    if (!session) return;
    setPending(true);
    try {
      await resendAdminOrgInvite(session, props.orgId, invite.id);
      await refresh(session);
    } catch (issue) {
      setError(getUserFacingApiError(issue, "Unable to resend invite."));
    } finally {
      setPending(false);
    }
  }

  async function handleCancelInvite(invite: IdentityInvitation) {
    if (!session) return;
    setPending(true);
    try {
      await cancelAdminOrgInvite(session, props.orgId, invite.id);
      await refresh(session);
    } catch (issue) {
      setError(getUserFacingApiError(issue, "Unable to cancel invite."));
    } finally {
      setPending(false);
    }
  }

  async function handleUpdateOrgStatus(input: { status: "ACTIVE" | "SUSPENDED" | "CLOSED"; reason?: string; note?: string | null; confirmation?: string }) {
    if (!session) return;
    setPending(true);
    try {
      await updateAdminOrgStatus(session, props.orgId, input);
      await refresh(session);
    } catch (issue) {
      setError(getUserFacingApiError(issue, "Unable to update organisation status."));
    } finally {
      setPending(false);
    }
  }

  if (status === "loading" || !session) return <LoadingState copy="Restoring platform admin session." />;
  if (!session.context.platformAdmin) return <PlatformAdminRequired />;
  if (!data) return <LoadingState copy={error ?? "Loading organisation members."} />;
  return (
    <OrgMembersView
      data={data}
      onCancelInvite={handleCancelInvite}
      onResendInvite={handleResendInvite}
      onUpdateOrgStatus={handleUpdateOrgStatus}
      onUpdate={handleUpdate}
      pending={pending}
    />
  );
}

export function BusinessTeamShell() {
  const router = useRouter();
  const { status, session } = useBusinessAuth();
  const [team, setTeam] = useState<BusinessTeam | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace(buildAuthRedirectTarget({ pathname: "/app/settings/team" }));
  }, [router, status]);

  async function refresh(currentSession = session) {
    if (!currentSession) return;
    setTeam(await getBusinessTeam(currentSession));
  }

  useEffect(() => {
    if (status !== "authenticated" || !session) return;
    void refresh(session).catch((issue) => setError(getUserFacingApiError(issue, "Unable to load team settings.")));
  }, [session, status]);

  async function handleInvite(input: { email: string; displayName?: string; role: OrgRole }) {
    if (!session) return;
    setPending(true);
    try {
      await createBusinessTeamInvite(session, input);
      await refresh(session);
    } catch (issue) {
      setError(getUserFacingApiError(issue, "Unable to add team member."));
    } finally {
      setPending(false);
    }
  }

  async function handleUpdate(member: IdentityMembership, patch: { role?: OrgRole; isActive?: boolean }) {
    if (!session) return;
    setPending(true);
    try {
      await updateBusinessTeamMembership(session, member.id, patch);
      await refresh(session);
    } catch (issue) {
      setError(getUserFacingApiError(issue, "Unable to update team member."));
    } finally {
      setPending(false);
    }
  }

  async function handleResendInvite(invite: IdentityInvitation) {
    if (!session) return;
    setPending(true);
    try {
      await resendBusinessTeamInvite(session, invite.id);
      await refresh(session);
    } catch (issue) {
      setError(getUserFacingApiError(issue, "Unable to resend invite."));
    } finally {
      setPending(false);
    }
  }

  async function handleCancelInvite(invite: IdentityInvitation) {
    if (!session) return;
    setPending(true);
    try {
      await cancelBusinessTeamInvite(session, invite.id);
      await refresh(session);
    } catch (issue) {
      setError(getUserFacingApiError(issue, "Unable to cancel invite."));
    } finally {
      setPending(false);
    }
  }

  const content = useMemo(() => {
    if (status === "loading" || !session) return <LoadingState copy="Restoring workspace session." />;
    if (!team) return <LoadingState copy={error ?? "Loading team settings."} />;
    return (
      <BusinessTeamView
        onCancelInvite={handleCancelInvite}
        onInvite={handleInvite}
        onResendInvite={handleResendInvite}
        onUpdate={handleUpdate}
        pending={pending}
        session={session}
        team={team}
      />
    );
  }, [error, pending, session, status, team]);

  return content;
}
