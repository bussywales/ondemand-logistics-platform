import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdminOrgsView, AdminUsersView, BusinessTeamView, OrgMembersView } from "./identity-shell";
import type { BusinessTeam, IdentityOrg, IdentityOrgMembers, IdentityUser } from "../_lib/product-state";

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

describe("identity shells", () => {
  it("renders admin users with membership links", () => {
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

    const html = renderToStaticMarkup(<AdminUsersView users={users} search="" onSearch={vi.fn()} />);
    expect(html).toContain("Identity, membership, role, profile");
    expect(html).toContain("operator@example.com");
    expect(html).toContain("/admin/orgs/22222222-2222-4222-8222-222222222222/members");
  });

  it("renders admin orgs and org member controls", () => {
    const orgHtml = renderToStaticMarkup(<AdminOrgsView orgs={[org]} search="" onSearch={vi.fn()} />);
    expect(orgHtml).toContain("Organisation registry");
    expect(orgHtml).toContain("Manage members");

    const data: IdentityOrgMembers = { org, members: [member], invitations: [] };
    const membersHtml = renderToStaticMarkup(<OrgMembersView data={data} onUpdate={vi.fn()} />);
    expect(membersHtml).toContain("Role and activation changes are human-reviewed");
    expect(membersHtml).toContain("Deactivate");
  });

  it("renders the business team page", () => {
    const team: BusinessTeam = { org, members: [member], invitations: [] };
    const html = renderToStaticMarkup(<BusinessTeamView team={team} onInvite={vi.fn()} onUpdate={vi.fn()} />);
    expect(html).toContain("Manage who belongs to this workspace");
    expect(html).toContain("Add access by email");
    expect(html).toContain("Operator One");
  });
});
