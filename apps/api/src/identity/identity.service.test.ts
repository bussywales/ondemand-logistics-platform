import { ForbiddenException, UnprocessableEntityException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { IdentityService } from "./identity.service.js";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const ORG_ID = "22222222-2222-4222-8222-222222222222";
const MEMBERSHIP_ID = "33333333-3333-4333-8333-333333333333";

const orgRow = {
  id: ORG_ID,
  name: "Pilot Org",
  org_type: "RESTAURANT",
  status: "ACTIVE",
  contact_name: null,
  contact_email: null,
  operating_city: "London",
  member_count: 1,
  active_member_count: 1,
  created_at: new Date("2026-05-19T10:00:00.000Z"),
  updated_at: new Date("2026-05-19T10:00:00.000Z")
};

const membershipRow = {
  user_id: USER_ID,
  email: "operator@example.com",
  display_name: "Operator One",
  user_created_at: new Date("2026-05-19T10:00:00.000Z"),
  user_updated_at: new Date("2026-05-19T10:00:00.000Z"),
  user_status: "ACTIVE",
  platform_admin: false,
  membership_id: MEMBERSHIP_ID,
  org_id: ORG_ID,
  org_name: "Pilot Org",
  org_type: "RESTAURANT",
  org_status: "ACTIVE",
  role: "OPERATOR",
  is_active: true,
  membership_created_at: new Date("2026-05-19T10:00:00.000Z"),
  membership_updated_at: new Date("2026-05-19T10:00:00.000Z")
};

describe("IdentityService", () => {
  it("lists platform-admin user visibility with memberships", async () => {
    const pg = {
      query: vi.fn().mockResolvedValueOnce({
        rows: [
          {
            ...membershipRow,
            platform_admin: true
          }
        ]
      })
    };

    const result = await new IdentityService(pg as never).listAdminUsers("operator");

    expect(result.items[0]?.email).toBe("operator@example.com");
    expect(result.items[0]?.platformAdmin).toBe(true);
    expect(result.items[0]?.memberships[0]?.role).toBe("OPERATOR");
    expect(pg.query.mock.calls[0]?.[0]).toContain("from public.users u");
  });

  it("scopes business team to the current operator org", async () => {
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ org_id: ORG_ID }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: ORG_ID,
              name: "Pilot Org",
              org_type: "RESTAURANT",
              status: "ACTIVE",
              contact_name: null,
              contact_email: null,
              operating_city: "London",
              member_count: 1,
              active_member_count: 1,
              created_at: new Date("2026-05-19T10:00:00.000Z"),
              updated_at: new Date("2026-05-19T10:00:00.000Z")
            }
          ]
        })
        .mockResolvedValueOnce({ rows: [membershipRow] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
    };

    const result = await new IdentityService(pg as never).getBusinessTeam({ id: USER_ID, token: {} });

    expect(result.org.id).toBe(ORG_ID);
    expect(result.members).toHaveLength(1);
    expect(pg.query.mock.calls[0]?.[0]).toContain("from public.org_memberships m");
  });

  it("blocks business team management without a management role", async () => {
    const pg = {
      query: vi.fn().mockResolvedValueOnce({ rows: [] })
    };

    await expect(
      new IdentityService(pg as never).updateBusinessMembership(MEMBERSHIP_ID, { isActive: false }, { id: USER_ID, token: {} })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects business role updates outside assignable team roles", async () => {
    const pg = {
      query: vi.fn().mockResolvedValueOnce({ rows: [{ org_id: ORG_ID }] })
    };

    await expect(
      new IdentityService(pg as never).updateBusinessMembership(MEMBERSHIP_ID, { role: "PLATFORM_ADMIN" }, { id: USER_ID, token: {} })
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it("updates membership state and writes an access audit record", async () => {
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [membershipRow] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ ...membershipRow, role: "MANAGER", is_active: false }] })
        .mockResolvedValueOnce({ rows: [] })
    };

    const result = await new IdentityService(pg as never).updateAdminMembership(
      ORG_ID,
      MEMBERSHIP_ID,
      { role: "MANAGER", isActive: false },
      { id: USER_ID, token: {} }
    );

    expect(result.role).toBe("MANAGER");
    expect(result.isActive).toBe(false);
    expect(pg.query.mock.calls[1]?.[0]).toContain("update public.org_memberships");
    expect(pg.query.mock.calls[3]?.[0]).toContain("insert into public.audit_log");
  });

  it("creates invite records without fabricating unknown user identities", async () => {
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ org_id: ORG_ID }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "44444444-4444-4444-8444-444444444444",
              org_id: ORG_ID,
              email: "new@example.com",
              role: "OPERATOR",
              status: "PENDING",
              invited_by: USER_ID,
              created_at: new Date("2026-05-19T10:00:00.000Z"),
              updated_at: new Date("2026-05-19T10:00:00.000Z")
            }
          ]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
    };

    const result = await new IdentityService(pg as never).createBusinessInvite(
      { email: "new@example.com", role: "OPERATOR" },
      { id: USER_ID, token: {} }
    );

    expect(result.status).toBe("PENDING");
    expect(pg.query.mock.calls.map((call) => call[0]).join("\n")).not.toContain("insert into public.users");
    expect(pg.query.mock.calls[2]?.[0]).toContain("insert into public.org_invitations");
  });

  it("allows business managers to resend and cancel pending invites in their org", async () => {
    const inviteRow = {
      id: "44444444-4444-4444-8444-444444444444",
      org_id: ORG_ID,
      email: "new@example.com",
      role: "OPERATOR",
      status: "PENDING",
      invited_by: USER_ID,
      created_at: new Date("2026-05-19T10:00:00.000Z"),
      updated_at: new Date("2026-05-19T10:00:00.000Z")
    };
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ org_id: ORG_ID }] })
        .mockResolvedValueOnce({ rows: [inviteRow] })
        .mockResolvedValueOnce({ rows: [{ ...inviteRow, updated_at: new Date("2026-05-19T10:05:00.000Z") }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ org_id: ORG_ID }] })
        .mockResolvedValueOnce({ rows: [{ ...inviteRow, updated_at: new Date("2026-05-19T10:05:00.000Z") }] })
        .mockResolvedValueOnce({ rows: [{ ...inviteRow, status: "CANCELLED", updated_at: new Date("2026-05-19T10:06:00.000Z") }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
    };
    const service = new IdentityService(pg as never);

    const resent = await service.resendBusinessInvite(inviteRow.id, { id: USER_ID, token: {} });
    const cancelled = await service.cancelBusinessInvite(inviteRow.id, { id: USER_ID, token: {} });

    expect(resent.status).toBe("PENDING");
    expect(cancelled.status).toBe("CANCELLED");
    expect(pg.query.mock.calls.some((call) => String(call[0]).includes("insert into public.audit_log"))).toBe(true);
    expect(pg.query.mock.calls.some((call) => String(call[0]).includes("insert into public.outbox_messages"))).toBe(true);
  });

  it("rejects resending cancelled or accepted invites", async () => {
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ org_id: ORG_ID }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "44444444-4444-4444-8444-444444444444",
              org_id: ORG_ID,
              email: "new@example.com",
              role: "OPERATOR",
              status: "CANCELLED",
              invited_by: USER_ID,
              created_at: new Date("2026-05-19T10:00:00.000Z"),
              updated_at: new Date("2026-05-19T10:00:00.000Z")
            }
          ]
        })
    };

    await expect(
      new IdentityService(pg as never).resendBusinessInvite("44444444-4444-4444-8444-444444444444", { id: USER_ID, token: {} })
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it("rejects cancelling accepted invites", async () => {
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({
          rows: [
            {
              id: ORG_ID,
              name: "Pilot Org",
              org_type: "RESTAURANT",
              status: "ACTIVE",
              contact_name: null,
              contact_email: null,
              operating_city: "London",
              member_count: 1,
              active_member_count: 1,
              created_at: new Date("2026-05-19T10:00:00.000Z"),
              updated_at: new Date("2026-05-19T10:00:00.000Z")
            }
          ]
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "44444444-4444-4444-8444-444444444444",
              org_id: ORG_ID,
              email: "new@example.com",
              role: "OPERATOR",
              status: "ACCEPTED",
              invited_by: USER_ID,
              created_at: new Date("2026-05-19T10:00:00.000Z"),
              updated_at: new Date("2026-05-19T10:00:00.000Z")
            }
          ]
        })
    };

    await expect(
      new IdentityService(pg as never).cancelAdminInvite(ORG_ID, "44444444-4444-4444-8444-444444444444", { id: USER_ID, token: {} })
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it("updates organisation status with typed confirmation and writes an audit record", async () => {
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [orgRow] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ ...orgRow, status: "SUSPENDED" }] })
    };

    const result = await new IdentityService(pg as never).updateAdminOrgStatus(
      ORG_ID,
      {
        status: "SUSPENDED",
        reason: "Pilot paused",
        note: "Waiting on owner",
        confirmation: "CONFIRM ORG STATUS CHANGE"
      },
      { id: USER_ID, token: {} }
    );

    expect(result.status).toBe("SUSPENDED");
    expect(pg.query.mock.calls[1]?.[0]).toContain("update public.orgs");
    expect(pg.query.mock.calls[2]?.[0]).toContain("insert into public.audit_log");
  });

  it("rejects organisation suspension without reason or confirmation", async () => {
    await expect(
      new IdentityService({ query: vi.fn() } as never).updateAdminOrgStatus(
        ORG_ID,
        { status: "SUSPENDED" },
        { id: USER_ID, token: {} }
      )
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it("updates user status with audit metadata and blocks self suspension", async () => {
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [membershipRow] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ ...membershipRow, user_status: "SUSPENDED" }] })
    };

    const result = await new IdentityService(pg as never).updateAdminUserStatus(
      "55555555-5555-4555-8555-555555555555",
      {
        status: "SUSPENDED",
        reason: "Support review",
        confirmation: "CONFIRM USER STATUS CHANGE"
      },
      { id: USER_ID, token: {} }
    );

    expect(result.status).toBe("SUSPENDED");
    expect(pg.query.mock.calls[1]?.[0]).toContain("update public.users");
    expect(pg.query.mock.calls[2]?.[0]).toContain("insert into public.audit_log");

    await expect(
      new IdentityService({ query: vi.fn() } as never).updateAdminUserStatus(
        USER_ID,
        {
          status: "SUSPENDED",
          reason: "Accidental self suspension",
          confirmation: "CONFIRM USER STATUS CHANGE"
        },
        { id: USER_ID, token: {} }
      )
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it("records an impersonation preview audit event without creating a support session", async () => {
    const pg = {
      query: vi.fn().mockResolvedValueOnce({ rows: [membershipRow] }).mockResolvedValueOnce({ rows: [] })
    };

    const result = await new IdentityService(pg as never).previewImpersonation(USER_ID, { id: "55555555-5555-4555-8555-555555555555", token: {} });

    expect(result.allowed).toBe(false);
    expect(result.message).toContain("disabled");
    expect(pg.query.mock.calls[1]?.[0]).toContain("insert into public.audit_log");
    expect(JSON.stringify(pg.query.mock.calls[1]?.[1])).toContain("liveSessionCreated");
  });

  it("summarises suspended organisations, suspended users, and governance audit events", async () => {
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ ...orgRow, status: "SUSPENDED" }] })
        .mockResolvedValueOnce({ rows: [{ ...membershipRow, user_status: "DISABLED" }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "1",
              org_id: null,
              action: "user_status_changed",
              actor_name: "Platform Admin",
              actor_email: "admin@example.com",
              metadata: { previousStatus: "ACTIVE", nextStatus: "DISABLED" },
              created_at: new Date("2026-05-19T10:00:00.000Z")
            }
          ]
        })
    };

    const result = await new IdentityService(pg as never).getAdminGovernanceSummary();

    expect(result.suspendedOrgs[0]?.status).toBe("SUSPENDED");
    expect(result.suspendedUsers[0]?.status).toBe("DISABLED");
    expect(result.recentEvents[0]?.eventType).toBe("user_status_changed");
  });
});
