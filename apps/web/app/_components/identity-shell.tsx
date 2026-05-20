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
  createBusinessTeamInvite,
  getAdminOrgMembers,
  getBusinessTeam,
  getUserFacingApiError,
  listAdminOrgs,
  listAdminUsers,
  updateAdminOrgMembership,
  updateBusinessTeamMembership
} from "../_lib/api";
import { buildAuthRedirectTarget } from "../_lib/route-protection";
import type { BusinessSession, BusinessTeam, IdentityMembership, IdentityOrg, IdentityOrgMembers, IdentityUser, OrgRole } from "../_lib/product-state";

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
  if (["INACTIVE", "SUSPENDED"].includes(value)) {
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

export function AdminUsersView(props: { users: IdentityUser[]; search: string; onSearch: (value: string) => void }) {
  return (
    <main className="app-shell admin-shell-page">
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
          <Link className="sw-button sw-button--secondary button button-secondary" href="/admin">Admin home</Link>
        </div>
      </div>
      <section className="sw-command-surface">
        <div className="sw-card-header">
          <div>
            <p className="eyebrow">Identity model</p>
            <h2>Identity, membership, role, profile</h2>
            <p>Identity is who someone is. Membership is where they belong. Role controls what they can do. Profile stores operational details.</p>
          </div>
        </div>
      </section>
      <section className="sw-operational-surface">
        <div className="sw-card-header">
          <div>
            <p className="eyebrow">Global user list</p>
            <h2>{props.users.length} users</h2>
          </div>
          <input aria-label="Search users" onChange={(event) => props.onSearch(event.target.value)} placeholder="Search users" value={props.search} />
        </div>
        <div className="sw-stack">
          {props.users.length === 0 ? (
            <div className="sw-empty-state">
              <strong className="sw-empty-title">No users found</strong>
              <p className="sw-empty-copy">Users appear here after onboarding, team invite, or seeded staging setup.</p>
            </div>
          ) : props.users.map((user) => (
            <article className="sw-list-row" key={user.id}>
              <div className="sw-stack-sm">
                <div className="sw-row">
                  <strong>{user.displayName}</strong>
                  <span className={`sw-badge ${statusBadgeClass(user.status)}`}>{formatLabel(user.status)}</span>
                  {user.platformAdmin ? <span className="sw-badge sw-badge--info">Platform admin</span> : null}
                </div>
                <p className="ops-detail-note">{user.email}</p>
                <p className="ops-detail-note">Last sign-in {user.lastSignInAt ?? "not available"}</p>
              </div>
              <div className="sw-stack-sm">
                {user.memberships.length ? user.memberships.map((membership) => (
                  <Link className="sw-button sw-button--ghost button button-secondary" href={`/admin/orgs/${membership.orgId}/members`} key={membership.id}>
                    {membership.orgName} · {formatLabel(membership.role)}
                  </Link>
                )) : <span className="sw-badge sw-badge--neutral">No memberships</span>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export function AdminOrgsView(props: { orgs: IdentityOrg[]; search: string; onSearch: (value: string) => void }) {
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
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export function OrgMembersView(props: {
  data: IdentityOrgMembers;
  onUpdate?: (member: IdentityMembership, patch: { role?: OrgRole; isActive?: boolean }) => void;
}) {
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
        </div>
      </div>
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
            <p className="eyebrow">Invitations</p>
            <h2>{props.data.invitations.length} pending/history records</h2>
          </div>
        </div>
        <div className="sw-stack">
          {props.data.invitations.length === 0 ? <p className="ops-detail-note">No invitation records yet.</p> : props.data.invitations.map((invite) => (
            <div className="sw-list-row" key={invite.id}>
              <span>{invite.email}</span>
              <span className="sw-badge sw-badge--info">{formatLabel(invite.role)}</span>
              <span className={`sw-badge ${statusBadgeClass(invite.status)}`}>{formatLabel(invite.status)}</span>
            </div>
          ))}
        </div>
      </section>
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
  onInvite?: (input: { email: string; displayName?: string; role: OrgRole }) => void;
  onUpdate?: (member: IdentityMembership, patch: { role?: OrgRole; isActive?: boolean }) => void;
  pending?: boolean;
}) {
  const activeMembers = props.team.members.filter((member) => member.isActive).length;
  const inactiveMembers = props.team.members.length - activeMembers;
  const pendingInvites = props.team.invitations.filter((invite) => invite.status !== "ACCEPTED").length;
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
              <span className="sw-badge sw-badge--info">{pendingInvites} invite records</span>
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
                <span>Invitation records</span>
                <strong>{props.team.invitations.length}</strong>
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
                <p className="eyebrow">Invitation records</p>
                <h2>{props.team.invitations.length} records</h2>
              </div>
            </div>
            {props.team.invitations.length === 0 ? (
              <p className="ops-detail-note">No invitation records yet.</p>
            ) : (
              <div className="sw-stack">
                {props.team.invitations.map((invite) => (
                  <div className="sw-list-row" key={invite.id}>
                    <span>{invite.email}</span>
                    <span className="sw-badge sw-badge--info">{formatLabel(invite.role)}</span>
                    <span className={`sw-badge ${statusBadgeClass(invite.status)}`}>{formatLabel(invite.status)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

export function AdminUsersShell() {
  const router = useRouter();
  const { status, session } = useBusinessAuth();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<IdentityUser[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.replace(buildAuthRedirectTarget({ pathname: "/admin/users" }));
  }, [router, status]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.context.platformAdmin) return;
    void listAdminUsers(session, search).then(setUsers);
  }, [search, session, status]);

  if (status === "loading" || !session) return <LoadingState copy="Restoring platform admin session." />;
  if (!session.context.platformAdmin) return <PlatformAdminRequired />;

  return (
    <>
      <ProductUpdateAnnouncement routePath="/admin/users" viewer="platform_admin" viewerKey={session.userId} />
      <AdminUsersView users={users} search={search} onSearch={setSearch} />
    </>
  );
}

export function AdminOrgsShell() {
  const router = useRouter();
  const { status, session } = useBusinessAuth();
  const [search, setSearch] = useState("");
  const [orgs, setOrgs] = useState<IdentityOrg[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.replace(buildAuthRedirectTarget({ pathname: "/admin/orgs" }));
  }, [router, status]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.context.platformAdmin) return;
    void listAdminOrgs(session, search).then(setOrgs);
  }, [search, session, status]);

  if (status === "loading" || !session) return <LoadingState copy="Restoring platform admin session." />;
  if (!session.context.platformAdmin) return <PlatformAdminRequired />;
  return <AdminOrgsView orgs={orgs} search={search} onSearch={setSearch} />;
}

export function AdminOrgMembersShell(props: { orgId: string }) {
  const router = useRouter();
  const { status, session } = useBusinessAuth();
  const [data, setData] = useState<IdentityOrgMembers | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    try {
      await updateAdminOrgMembership(session, props.orgId, member.id, patch);
      await refresh(session);
    } catch (issue) {
      setError(getUserFacingApiError(issue, "Unable to update membership."));
    }
  }

  if (status === "loading" || !session) return <LoadingState copy="Restoring platform admin session." />;
  if (!session.context.platformAdmin) return <PlatformAdminRequired />;
  if (!data) return <LoadingState copy={error ?? "Loading organisation members."} />;
  return <OrgMembersView data={data} onUpdate={handleUpdate} />;
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

  const content = useMemo(() => {
    if (status === "loading" || !session) return <LoadingState copy="Restoring workspace session." />;
    if (!team) return <LoadingState copy={error ?? "Loading team settings."} />;
    return <BusinessTeamView onInvite={handleInvite} onUpdate={handleUpdate} pending={pending} session={session} team={team} />;
  }, [error, pending, session, status, team]);

  return content;
}
