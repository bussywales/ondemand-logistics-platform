import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdminGovernanceView, AdminOrgsView, AdminUsersView, BusinessTeamView, OrgMembersView } from "./identity-shell";
import type { BusinessTeam, IdentityAccessEvent, IdentityOrg, IdentityOrgMembers, IdentityUser } from "../_lib/product-state";

const org: IdentityOrg = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Pilot Org",
  type: "RESTAURANT",
  status: "ACTIVE",
  contactName: null,
  contactEmail: "ops@example.com",
  city: "London",
  memberCount: 1,
  activeMemberCount: 1,
  createdAt: "2026-05-19T10:00:00.000Z",
  updatedAt: "2026-05-19T10:00:00.000Z"
};

const member = {
  id: "33333333-3333-4333-8333-333333333333",
  orgId: org.id,
  orgName: org.name,
  orgType: org.type,
  orgStatus: org.status,
  userId: "11111111-1111-4111-8111-111111111111",
  email: "operator@example.com",
  displayName: "Operator One",
  role: "OPERATOR" as const,
  isActive: true,
  createdAt: "2026-05-19T10:00:00.000Z",
  updatedAt: "2026-05-19T10:00:00.000Z"
};

const fleetOrg: IdentityOrg = {
  id: "55555555-5555-4555-8555-555555555555",
  name: "Staging Fleet",
  type: "DRIVER_COMPANY",
  status: "ACTIVE",
  contactName: null,
  contactEmail: "fleet@example.com",
  city: "London",
  memberCount: 1,
  activeMemberCount: 1,
  createdAt: "2026-05-19T10:00:00.000Z",
  updatedAt: "2026-05-19T10:00:00.000Z"
};

const fleetMember = {
  id: "66666666-6666-4666-8666-666666666666",
  orgId: fleetOrg.id,
  orgName: fleetOrg.name,
  orgType: fleetOrg.type,
  orgStatus: fleetOrg.status,
  userId: "77777777-7777-4777-8777-777777777777",
  email: "fleet@example.com",
  displayName: "Fleet Manager",
  role: "FLEET_MANAGER" as const,
  isActive: true,
  createdAt: "2026-05-19T10:00:00.000Z",
  updatedAt: "2026-05-19T10:00:00.000Z"
};

const invitation = {
  id: "44444444-4444-4444-8444-444444444444",
  orgId: org.id,
  email: "new@example.com",
  role: "OPERATOR" as const,
  status: "PENDING" as const,
  invitedBy: member.userId,
  createdAt: "2026-05-19T10:00:00.000Z",
  updatedAt: "2026-05-19T10:00:00.000Z"
};

const accessEvent: IdentityAccessEvent = {
  id: "1",
  orgId: org.id,
  eventType: "team_invite_created",
  actorName: "Operator One",
  actorEmail: "operator@example.com",
  createdAt: "2026-05-19T10:00:00.000Z",
  summary: "Invite created for new@example.com as Operator.",
  metadata: { email: "new@example.com", role: "OPERATOR" }
};

describe("identity shells", () => {
  it("renders admin users as a compact directory with drawer detail", () => {
    const users: IdentityUser[] = [
      {
        id: member.userId,
        email: member.email,
        displayName: member.displayName,
        status: "ACTIVE",
        platformAdmin: true,
        lastSignInAt: null,
        createdAt: "2026-05-19T10:00:00.000Z",
        updatedAt: "2026-05-19T10:00:00.000Z",
        memberships: [member]
      }
    ];

    const html = renderToStaticMarkup(
      <AdminUsersView
        accessEvents={[{ ...accessEvent, summary: "operator@example.com user status changed from Active to Suspended." }]}
        initialSelectedUserId={member.userId}
        onPreviewImpersonation={vi.fn()}
        onSearch={vi.fn()}
        onUpdateStatus={vi.fn()}
        search=""
        users={users}
      />
    );
    expect(html).toContain("Identity, membership, role, profile");
    expect(html).toContain("Admin user directory");
    expect(html).toContain("operator@example.com");
    expect(html).toContain("Open details");
    expect(html).toContain("User detail");
    expect(html).toContain("Platform Admin");
    expect(html).toContain("Operator");
    expect(html).toContain("Governance");
    expect(html).toContain("Suspend or reactivate access");
    expect(html).toContain("Preview impersonation requirements");
    expect(html).toContain("Access history");
    expect(html).toContain("Invitation records are scoped to organisations");
    expect(html).toContain("/admin/orgs/22222222-2222-4222-8222-222222222222/members");
    expect(html).not.toMatch(/delete account|delete user|permanent delete/i);
  });

  it("filters the admin user directory by search text", () => {
    const users: IdentityUser[] = [
      {
        id: member.userId,
        email: member.email,
        displayName: member.displayName,
        status: "ACTIVE",
        platformAdmin: true,
        lastSignInAt: null,
        createdAt: "2026-05-19T10:00:00.000Z",
        updatedAt: "2026-05-19T10:00:00.000Z",
        memberships: [member]
      },
      {
        id: fleetMember.userId,
        email: fleetMember.email,
        displayName: fleetMember.displayName,
        status: "ACTIVE",
        platformAdmin: false,
        lastSignInAt: null,
        createdAt: "2026-05-19T10:00:00.000Z",
        updatedAt: "2026-05-19T10:00:00.000Z",
        memberships: [fleetMember]
      }
    ];

    const html = renderToStaticMarkup(<AdminUsersView users={users} search="fleet" onSearch={vi.fn()} />);
    expect(html).toContain("Admin user directory");
    expect(html).toContain("Fleet Manager");
    expect(html).toContain("Fleet Manager");
    expect(html).toContain("Staging Fleet");
    expect(html).not.toContain("operator@example.com");
  });

  it("renders admin orgs and org member controls", () => {
    const orgHtml = renderToStaticMarkup(<AdminOrgsView orgs={[org]} search="" onSearch={vi.fn()} />);
    expect(orgHtml).toContain("Organisation registry");
    expect(orgHtml).toContain("Manage members");

    const data: IdentityOrgMembers = { org, members: [member], invitations: [invitation], accessEvents: [accessEvent] };
    const membersHtml = renderToStaticMarkup(<OrgMembersView data={data} onCancelInvite={vi.fn()} onResendInvite={vi.fn()} onUpdate={vi.fn()} />);
    expect(membersHtml).toContain("Role and activation changes are human-reviewed");
    expect(membersHtml).toContain("Deactivate");
    expect(membersHtml).toContain("Pending invitations");
    expect(membersHtml).toContain("Resend invite");
    expect(membersHtml).toContain("Access history");
  });

  it("renders the business team page", () => {
    const team: BusinessTeam = { org, members: [member], invitations: [invitation], accessEvents: [accessEvent] };
    const html = renderToStaticMarkup(
      <BusinessTeamView
        team={team}
        onCancelInvite={vi.fn()}
        onInvite={vi.fn()}
        onResendInvite={vi.fn()}
        onUpdate={vi.fn()}
      />
    );
    expect(html).toContain("Manage who belongs to this workspace");
    expect(html).toContain("Add access by email");
    expect(html).toContain("Operator One");
    expect(html).toContain("new@example.com");
    expect(html).toContain("Email delivery may depend on notification configuration");
  });

  it("renders enterprise governance posture and suspended workspace copy", () => {
    const governanceHtml = renderToStaticMarkup(
      <AdminGovernanceView
        summary={{
          suspendedOrgs: [{ ...org, status: "SUSPENDED" }],
          suspendedUsers: [
            {
              id: member.userId,
              email: member.email,
              displayName: member.displayName,
              status: "DISABLED",
              platformAdmin: false,
              lastSignInAt: null,
              createdAt: "2026-05-19T10:00:00.000Z",
              updatedAt: "2026-05-19T10:00:00.000Z",
              memberships: [member]
            }
          ],
          recentEvents: [{ ...accessEvent, orgId: null, eventType: "user_status_changed", summary: "User status changed from Active to Disabled." }]
        }}
      />
    );

    expect(governanceHtml).toContain("Suspension and support access audit");
    expect(governanceHtml).toContain("Impersonation remains disabled");
    expect(governanceHtml).toContain("Restricted organisations");

    const teamHtml = renderToStaticMarkup(
      <BusinessTeamView
        team={{ org: { ...org, status: "SUSPENDED" }, members: [member], invitations: [invitation], accessEvents: [accessEvent] }}
        onCancelInvite={vi.fn()}
        onInvite={vi.fn()}
        onResendInvite={vi.fn()}
        onUpdate={vi.fn()}
      />
    );
    expect(teamHtml).toContain("Treat operations as restricted");
  });
});
