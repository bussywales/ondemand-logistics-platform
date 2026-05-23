import { ForbiddenException, UnprocessableEntityException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { FleetsService } from "./fleets.service.js";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const DRIVER_USER_ID = "22222222-2222-4222-8222-222222222222";
const FLEET_ORG_ID = "33333333-3333-4333-8333-333333333333";
const MEMBERSHIP_ID = "44444444-4444-4444-8444-444444444444";
const DRIVER_ID = "55555555-5555-4555-8555-555555555555";

const actor = { id: USER_ID, token: {} };

function fleetOrgRow(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-05-19T10:00:00.000Z");
  return {
    id: FLEET_ORG_ID,
    name: "Northside Couriers",
    status: "ONBOARDING",
    contact_name: "Fleet Owner",
    contact_email: "fleet@example.com",
    operating_city: "London",
    member_count: 2,
    active_driver_count: 2,
    ready_driver_count: 1,
    needs_review_driver_count: 1,
    not_eligible_driver_count: 0,
    active_job_count: 0,
    created_at: now,
    updated_at: now,
    ...overrides
  };
}

function fleetDriverRow(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-05-19T10:00:00.000Z");
  return {
    membership_id: MEMBERSHIP_ID,
    fleet_org_id: FLEET_ORG_ID,
    fleet_org_name: "Northside Couriers",
    user_id: DRIVER_USER_ID,
    email: "driver@example.com",
    display_name: "Fleet Driver",
    fleet_role: "DRIVER",
    membership_active: true,
    driver_id: DRIVER_ID,
    availability_status: "ONLINE",
    verification_status: "APPROVED",
    vehicle_type: "BIKE",
    active_job_id: null,
    active_job_status: null,
    last_location_at: new Date(),
    created_at: now,
    updated_at: now,
    ...overrides
  };
}

describe("FleetsService", () => {
  it("lists admin fleet organisations with readiness counts", async () => {
    const pg = { query: vi.fn().mockResolvedValueOnce({ rows: [fleetOrgRow()] }) };
    const service = new FleetsService(pg as never);

    const result = await service.listAdminFleets();

    expect(result.items[0]).toEqual(expect.objectContaining({
      id: FLEET_ORG_ID,
      name: "Northside Couriers",
      readyDriverCount: 1,
      needsReviewDriverCount: 1
    }));
  });

  it("creates a driver-company fleet org and writes audit", async () => {
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ id: FLEET_ORG_ID }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [fleetOrgRow()] })
    };
    const service = new FleetsService(pg as never);

    const result = await service.createAdminFleet({ name: "Northside Couriers", contactEmail: "fleet@example.com" }, actor);

    expect(result.id).toBe(FLEET_ORG_ID);
    expect(pg.query.mock.calls[0]?.[0]).toContain("insert into public.orgs");
    expect(pg.query.mock.calls[1]?.[0]).toContain("insert into public.audit_log");
  });

  it("adds an existing driver user to a fleet org", async () => {
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ id: FLEET_ORG_ID }] })
        .mockResolvedValueOnce({ rows: [{ user_id: DRIVER_USER_ID, driver_id: DRIVER_ID }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: MEMBERSHIP_ID }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [fleetDriverRow()] })
    };
    const service = new FleetsService(pg as never);

    const result = await service.addAdminFleetDriver(FLEET_ORG_ID, { driverId: DRIVER_ID, role: "DRIVER" }, actor);

    expect(result.driverId).toBe(DRIVER_ID);
    expect(result.readinessStatus).toBe("READY");
    expect(pg.query.mock.calls[2]?.[0]).toContain("insert into public.org_memberships");
  });

  it("rejects non-fleet roles", async () => {
    const pg = {
      query: vi.fn().mockResolvedValueOnce({ rows: [{ id: FLEET_ORG_ID }] })
    };
    const service = new FleetsService(pg as never);

    await expect(service.addAdminFleetDriver(FLEET_ORG_ID, { userId: DRIVER_USER_ID, role: "OWNER" }, actor)).rejects.toThrow(
      UnprocessableEntityException
    );
  });

  it("blocks ordinary drivers from fleet manager endpoints", async () => {
    const pg = { query: vi.fn().mockResolvedValueOnce({ rows: [] }) };
    const service = new FleetsService(pg as never);

    await expect(service.listScopedFleetDrivers({ id: DRIVER_USER_ID, token: {} })).rejects.toThrow(ForbiddenException);
  });

  it("returns scoped fleet driver detail with recent work and empty readiness history", async () => {
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ org_id: FLEET_ORG_ID, org_name: "Northside Couriers", role: "FLEET_MANAGER" }] })
        .mockResolvedValueOnce({ rows: [fleetDriverRow()] })
        .mockResolvedValueOnce({
          rows: [
            {
              job_id: "66666666-6666-4666-8666-666666666666",
              status: "DELIVERED",
              pickup_address: "1 Market Street",
              dropoff_address: "2 High Street",
              completed_at: new Date("2026-05-19T11:00:00.000Z"),
              created_at: new Date("2026-05-19T10:00:00.000Z")
            }
          ]
        })
    };
    const service = new FleetsService(pg as never);

    const detail = await service.getScopedFleetDriverDetail(actor, DRIVER_ID);

    expect(detail.driver.driverId).toBe(DRIVER_ID);
    expect(detail.recentWork).toHaveLength(1);
    expect(detail.readinessHistory).toEqual([]);
    expect(detail.readinessHistoryNote).toContain("Readiness history");
  });

  it("returns fleet team members, invitations, and access events", async () => {
    const now = new Date("2026-05-19T10:00:00.000Z");
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ org_id: FLEET_ORG_ID, org_name: "Northside Couriers", role: "FLEET_MANAGER" }] })
        .mockResolvedValueOnce({
          rows: [
            {
              membership_id: MEMBERSHIP_ID,
              org_id: FLEET_ORG_ID,
              org_name: "Northside Couriers",
              org_type: "DRIVER_COMPANY",
              org_status: "ACTIVE",
              user_id: DRIVER_USER_ID,
              email: "driver@example.com",
              display_name: "Fleet Driver",
              role: "DRIVER",
              is_active: true,
              membership_created_at: now,
              membership_updated_at: now
            }
          ]
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "77777777-7777-4777-8777-777777777777",
              org_id: FLEET_ORG_ID,
              email: "new-driver@example.com",
              role: "DRIVER",
              status: "PENDING",
              invited_by: USER_ID,
              created_at: now,
              updated_at: now
            }
          ]
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              org_id: FLEET_ORG_ID,
              action: "fleet_invite_created",
              actor_name: "Fleet Manager",
              actor_email: "manager@example.com",
              metadata: { email: "new-driver@example.com", role: "DRIVER" },
              created_at: now
            }
          ]
        })
    };
    const service = new FleetsService(pg as never);

    const team = await service.getScopedFleetTeam(actor);

    expect(team.canManageInvites).toBe(true);
    expect(team.members[0]?.role).toBe("DRIVER");
    expect(team.invitations[0]?.status).toBe("PENDING");
    expect(team.accessEvents[0]?.summary).toContain("Fleet invite created");
  });

  it("allows fleet managers to create driver invites and records audit/outbox", async () => {
    const now = new Date("2026-05-19T10:00:00.000Z");
    const invite = {
      id: "77777777-7777-4777-8777-777777777777",
      org_id: FLEET_ORG_ID,
      email: "new-driver@example.com",
      role: "DRIVER",
      status: "PENDING",
      invited_by: USER_ID,
      created_at: now,
      updated_at: now
    };
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ org_id: FLEET_ORG_ID, org_name: "Northside Couriers", role: "FLEET_MANAGER" }] })
        .mockResolvedValueOnce({ rows: [invite] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
    };
    const service = new FleetsService(pg as never);

    const result = await service.createScopedFleetInvite(actor, { email: "new-driver@example.com", role: "DRIVER" });

    expect(result.email).toBe("new-driver@example.com");
    expect(pg.query.mock.calls[1]?.[0]).toContain("insert into public.org_invitations");
    expect(pg.query.mock.calls[2]?.[0]).toContain("insert into public.audit_log");
    expect(pg.query.mock.calls[3]?.[0]).toContain("insert into public.outbox_messages");
  });

  it("prevents dispatchers from managing fleet invites", async () => {
    const pg = { query: vi.fn().mockResolvedValueOnce({ rows: [] }) };
    const service = new FleetsService(pg as never);

    await expect(service.createScopedFleetInvite(actor, { email: "driver@example.com", role: "DRIVER" })).rejects.toThrow(
      ForbiddenException
    );
  });
});
