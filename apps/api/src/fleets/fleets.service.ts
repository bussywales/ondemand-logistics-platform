import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import {
  AddFleetDriverSchema,
  CreateFleetInviteSchema,
  CreateFleetOrganisationSchema,
  FleetDriverDetailSchema,
  FleetDriverListSchema,
  FleetDriverSchema,
  FleetOrganisationListSchema,
  FleetOrganisationSchema,
  FleetReadinessSummarySchema,
  FleetTeamSchema,
  IdentityAccessEventSchema,
  IdentityInvitationSchema,
  IdentityMembershipSchema,
  UpdateFleetDriverMembershipSchema,
  type FleetDriverDto,
  type FleetDriverRecentWorkDto,
  type FleetOrganisationDto,
  type OrgRole
} from "@shipwright/contracts";
import { randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";
import { toIsoDateTime, toNullableIsoDateTime } from "../database/mapper.js";
import { PgService } from "../database/pg.service.js";
import type { AuthenticatedUser } from "../security/types.js";

const FLEET_ROLES = new Set<OrgRole>(["FLEET_OWNER", "FLEET_MANAGER", "DISPATCHER", "DRIVER", "COMPLIANCE_MANAGER"]);
const FLEET_WORKSPACE_ROLES = new Set<OrgRole>(["FLEET_OWNER", "FLEET_MANAGER", "DISPATCHER", "COMPLIANCE_MANAGER"]);
const FLEET_INVITE_MANAGEMENT_ROLES = new Set<OrgRole>(["FLEET_OWNER", "FLEET_MANAGER", "COMPLIANCE_MANAGER"]);
const FLEET_INVITE_BASE_ROLES = new Set<OrgRole>(["DRIVER", "DISPATCHER", "COMPLIANCE_MANAGER"]);
const FLEET_ACCESS_AUDIT_ACTIONS = [
  "fleet_driver_added",
  "fleet_driver_membership_updated",
  "fleet_invite_created",
  "fleet_invite_resent",
  "fleet_invite_cancelled"
];

type FleetOrgRow = QueryResultRow & {
  id: string;
  name: string;
  status: string;
  contact_name: string | null;
  contact_email: string | null;
  operating_city: string | null;
  member_count: string | number;
  active_driver_count: string | number;
  ready_driver_count: string | number;
  needs_review_driver_count: string | number;
  not_eligible_driver_count: string | number;
  active_job_count: string | number;
  created_at: string | Date;
  updated_at: string | Date;
};

type FleetDriverRow = QueryResultRow & {
  membership_id: string;
  fleet_org_id: string;
  fleet_org_name: string;
  user_id: string;
  email: string;
  display_name: string;
  fleet_role: OrgRole;
  membership_active: boolean;
  driver_id: string | null;
  availability_status: string | null;
  verification_status: string | null;
  vehicle_type: string | null;
  active_job_id: string | null;
  active_job_status: string | null;
  last_location_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type ResolvedFleetUserRow = QueryResultRow & {
  user_id: string;
  driver_id: string | null;
};

type FleetContextRow = QueryResultRow & {
  org_id: string;
  org_name: string;
  role: OrgRole;
};

type FleetMembershipRow = QueryResultRow & {
  membership_id: string;
  org_id: string;
  org_name: string;
  org_type: string;
  org_status: string;
  user_id: string;
  email: string;
  display_name: string;
  role: OrgRole;
  is_active: boolean;
  membership_created_at: string | Date;
  membership_updated_at: string | Date;
};

type FleetInvitationRow = QueryResultRow & {
  id: string;
  org_id: string;
  email: string;
  role: OrgRole;
  status: "PENDING" | "ACCEPTED" | "CANCELLED" | "EXPIRED";
  invited_by: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type FleetAccessEventRow = QueryResultRow & {
  id: string | number;
  org_id: string;
  action: string;
  actor_name: string | null;
  actor_email: string | null;
  metadata: Record<string, unknown> | string | null;
  created_at: string | Date;
};

type FleetDriverRecentWorkRow = QueryResultRow & {
  job_id: string;
  status: string;
  pickup_address: string | null;
  dropoff_address: string | null;
  completed_at: string | Date | null;
  created_at: string | Date;
};

function toNumber(value: string | number) {
  return typeof value === "number" ? value : Number.parseInt(value, 10);
}

function locationRecentlySeen(value: string | Date | null) {
  if (!value) {
    return false;
  }

  return Date.now() - new Date(value).getTime() <= 15 * 60 * 1000;
}

function assertFleetRole(role: OrgRole) {
  if (!FLEET_ROLES.has(role)) {
    throw new UnprocessableEntityException("role_not_assignable_to_fleet");
  }
}

function parseMetadata(value: Record<string, unknown> | string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return value;
}

function roleLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

@Injectable()
export class FleetsService {
  constructor(private readonly pg: PgService) {}

  async listAdminFleets() {
    const result = await this.pg.query<FleetOrgRow>(
      this.fleetOrgSelectSql("where o.org_type = 'DRIVER_COMPANY'", "order by o.created_at desc limit 250")
    );
    return FleetOrganisationListSchema.parse({ items: result.rows.map((row) => this.mapFleetOrg(row)) });
  }

  async createAdminFleet(input: unknown, actor: AuthenticatedUser): Promise<FleetOrganisationDto> {
    const parsed = CreateFleetOrganisationSchema.safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException({ message: "invalid_fleet_payload", issues: parsed.error.issues });
    }

    const inserted = await this.pg.query<{ id: string }>(
      `insert into public.orgs (name, created_by, contact_name, contact_email, operating_city, org_type, status)
       values ($1, $2, $3, $4, $5, 'DRIVER_COMPANY', $6)
       returning id`,
      [
        parsed.data.name,
        actor.id,
        parsed.data.contactName ?? null,
        parsed.data.contactEmail ?? null,
        parsed.data.city ?? null,
        parsed.data.status
      ]
    );

    await this.insertAuditLog({
      actorId: actor.id,
      orgId: inserted.rows[0].id,
      entityType: "fleet_org",
      entityId: inserted.rows[0].id,
      action: "fleet_org_created",
      metadata: { name: parsed.data.name }
    });

    return this.getAdminFleet(inserted.rows[0].id);
  }

  async getAdminFleet(fleetOrgId: string): Promise<FleetOrganisationDto> {
    const result = await this.pg.query<FleetOrgRow>(this.fleetOrgSelectSql("where o.id = $1 and o.org_type = 'DRIVER_COMPANY'"), [fleetOrgId]);
    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("fleet_org_not_found");
    }
    return this.mapFleetOrg(row);
  }

  async listAdminFleetDrivers(fleetOrgId: string) {
    await this.assertFleetOrg(fleetOrgId);
    return FleetDriverListSchema.parse({ items: await this.listFleetDriversForOrg(fleetOrgId) });
  }

  async addAdminFleetDriver(fleetOrgId: string, input: unknown, actor: AuthenticatedUser): Promise<FleetDriverDto> {
    await this.assertFleetOrg(fleetOrgId);
    const parsed = AddFleetDriverSchema.safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException({ message: "invalid_fleet_driver_payload", issues: parsed.error.issues });
    }
    assertFleetRole(parsed.data.role);

    const resolved = await this.resolveFleetUser(parsed.data);
    await this.pg.query(
      `insert into public.org_memberships (org_id, user_id, role, is_active)
       values ($1, $2, $3::public.org_role, true)
       on conflict (org_id, user_id) do update
       set role = excluded.role,
           is_active = true,
           updated_at = now()`,
      [fleetOrgId, resolved.user_id, parsed.data.role]
    );

    const membership = await this.pg.query<{ id: string }>(
      `select id from public.org_memberships where org_id = $1 and user_id = $2`,
      [fleetOrgId, resolved.user_id]
    );

    await this.insertAuditLog({
      actorId: actor.id,
      orgId: fleetOrgId,
      entityType: "org_membership",
      entityId: membership.rows[0].id,
      action: "fleet_driver_added",
      metadata: { userId: resolved.user_id, driverId: resolved.driver_id, role: parsed.data.role }
    });

    return this.getFleetDriverByMembership(fleetOrgId, membership.rows[0].id);
  }

  async updateAdminFleetDriver(fleetOrgId: string, membershipId: string, input: unknown, actor: AuthenticatedUser): Promise<FleetDriverDto> {
    await this.assertFleetOrg(fleetOrgId);
    return this.updateFleetDriverMembership(fleetOrgId, membershipId, input, actor, "fleet_driver_membership_updated");
  }

  async listScopedFleetDrivers(user: AuthenticatedUser) {
    const { orgId: fleetOrgId } = await this.getFleetContext(user.id, FLEET_WORKSPACE_ROLES);
    return FleetDriverListSchema.parse({ items: await this.listFleetDriversForOrg(fleetOrgId) });
  }

  async getScopedFleetDriverDetail(user: AuthenticatedUser, driverId: string) {
    const { orgId: fleetOrgId } = await this.getFleetContext(user.id, FLEET_WORKSPACE_ROLES);
    const driver = await this.getFleetDriverByDriverOrUserId(fleetOrgId, driverId);
    const recentWork = driver.driverId ? await this.listFleetDriverRecentWork(driver.driverId) : [];
    return FleetDriverDetailSchema.parse({
      driver,
      recentWork,
      readinessHistory: [],
      readinessHistoryNote: "Readiness history will appear here after driver signal changes are captured as fleet readiness events."
    });
  }

  async getScopedFleetReadiness(user: AuthenticatedUser) {
    const { orgId: fleetOrgId } = await this.getFleetContext(user.id, FLEET_WORKSPACE_ROLES);
    const fleet = await this.getAdminFleet(fleetOrgId);
    return FleetReadinessSummarySchema.parse({
      fleetOrgId: fleet.id,
      fleetOrgName: fleet.name,
      totalDrivers: fleet.activeDriverCount,
      readyDrivers: fleet.readyDriverCount,
      needsReviewDrivers: fleet.needsReviewDriverCount,
      notEligibleDrivers: fleet.notEligibleDriverCount,
      onlineDrivers: (await this.listFleetDriversForOrg(fleetOrgId)).filter((driver) => driver.availabilityStatus === "ONLINE").length,
      activeJobs: fleet.activeJobCount,
      humanReviewNote: "Fleet readiness is visibility-only in v1. Fleet managers remain responsible for compliance review and courier communication."
    });
  }

  async getScopedFleetTeam(user: AuthenticatedUser) {
    const context = await this.getFleetContext(user.id, FLEET_WORKSPACE_ROLES);
    const [members, invitations, accessEvents] = await Promise.all([
      this.listFleetMembers(context.orgId),
      this.listFleetInvitations(context.orgId),
      this.listFleetAccessEvents(context.orgId)
    ]);

    return FleetTeamSchema.parse({
      fleetOrgId: context.orgId,
      fleetOrgName: context.orgName,
      currentUserRole: context.role,
      canManageInvites: FLEET_INVITE_MANAGEMENT_ROLES.has(context.role),
      members,
      invitations,
      accessEvents
    });
  }

  async createScopedFleetInvite(user: AuthenticatedUser, rawInput: unknown) {
    const context = await this.getFleetContext(user.id, FLEET_INVITE_MANAGEMENT_ROLES);
    const parsed = CreateFleetInviteSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new UnprocessableEntityException({ message: "invalid_fleet_invite", issues: parsed.error.issues });
    }
    this.assertFleetInviteRole(parsed.data.role, context.role);

    const invitation = await this.pg.query<FleetInvitationRow>(
      `insert into public.org_invitations (org_id, email, role, status, invited_by)
       values ($1, lower($2), $3::public.org_role, 'PENDING', $4)
       on conflict (org_id, email) do update
       set role = excluded.role,
           status = 'PENDING',
           invited_by = excluded.invited_by,
           updated_at = now()
       returning id, org_id, email, role::text as role, status, invited_by, created_at, updated_at`,
      [context.orgId, parsed.data.email, parsed.data.role, user.id]
    );

    await this.insertAuditLog({
      actorId: user.id,
      orgId: context.orgId,
      entityType: "org_invitation",
      entityId: invitation.rows[0].id,
      action: "fleet_invite_created",
      metadata: { email: parsed.data.email, role: parsed.data.role }
    });
    await this.enqueueFleetInviteOutbox("ORG_INVITE_CREATED", invitation.rows[0], user.id, "created");

    return IdentityInvitationSchema.parse(this.mapFleetInvitation(invitation.rows[0]));
  }

  async resendScopedFleetInvite(user: AuthenticatedUser, inviteId: string) {
    const context = await this.getFleetContext(user.id, FLEET_INVITE_MANAGEMENT_ROLES);
    const existing = await this.getFleetInvitation(context.orgId, inviteId);
    if (existing.status === "ACCEPTED" || existing.status === "CANCELLED") {
      throw new UnprocessableEntityException("invite_not_resendable");
    }

    const result = await this.pg.query<FleetInvitationRow>(
      `update public.org_invitations
       set status = 'PENDING',
           invited_by = $3,
           updated_at = now()
       where id = $1 and org_id = $2
       returning id, org_id, email, role::text as role, status, invited_by, created_at, updated_at`,
      [inviteId, context.orgId, user.id]
    );
    const invite = result.rows[0];
    await this.insertAuditLog({
      actorId: user.id,
      orgId: context.orgId,
      entityType: "org_invitation",
      entityId: inviteId,
      action: "fleet_invite_resent",
      metadata: { email: invite.email, role: invite.role, previousStatus: existing.status, nextStatus: invite.status }
    });
    await this.enqueueFleetInviteOutbox("ORG_INVITE_RESENT", invite, user.id, "resent", existing.status);

    return IdentityInvitationSchema.parse(this.mapFleetInvitation(invite));
  }

  async cancelScopedFleetInvite(user: AuthenticatedUser, inviteId: string) {
    const context = await this.getFleetContext(user.id, FLEET_INVITE_MANAGEMENT_ROLES);
    const existing = await this.getFleetInvitation(context.orgId, inviteId);
    if (existing.status === "ACCEPTED") {
      throw new UnprocessableEntityException("accepted_invite_cannot_be_cancelled");
    }
    if (existing.status === "CANCELLED") {
      throw new UnprocessableEntityException("invite_already_cancelled");
    }

    const result = await this.pg.query<FleetInvitationRow>(
      `update public.org_invitations
       set status = 'CANCELLED',
           updated_at = now()
       where id = $1 and org_id = $2
       returning id, org_id, email, role::text as role, status, invited_by, created_at, updated_at`,
      [inviteId, context.orgId]
    );
    const invite = result.rows[0];
    await this.insertAuditLog({
      actorId: user.id,
      orgId: context.orgId,
      entityType: "org_invitation",
      entityId: inviteId,
      action: "fleet_invite_cancelled",
      metadata: { email: invite.email, role: invite.role, previousStatus: existing.status, nextStatus: invite.status }
    });
    await this.enqueueFleetInviteOutbox("ORG_INVITE_CANCELLED", invite, user.id, "cancelled", existing.status);

    return IdentityInvitationSchema.parse(this.mapFleetInvitation(invite));
  }

  private fleetOrgSelectSql(whereClause: string, suffix = "") {
    const readinessCase = `
      case
        when d.id is not null
         and m.is_active = true
         and coalesce(vstatus.status, 'MISSING') = 'APPROVED'
         and vprimary.vehicle_type is not null
         and d.availability_status = 'ONLINE'
         and d.active_job_id is null
         and d.last_location_at >= now() - interval '15 minutes'
        then 'READY'
        when m.is_active = true
         and (
           d.id is null
           or coalesce(vstatus.status, 'MISSING') = 'PENDING'
           or (
             coalesce(vstatus.status, 'MISSING') = 'APPROVED'
             and vprimary.vehicle_type is not null
             and d.availability_status = 'ONLINE'
             and d.active_job_id is null
             and (d.last_location_at is null or d.last_location_at < now() - interval '15 minutes')
           )
         )
        then 'NEEDS_REVIEW'
        else 'NOT_ELIGIBLE'
      end`;

    return `select
        o.id,
        o.name,
        coalesce(o.status, 'ACTIVE') as status,
        o.contact_name,
        o.contact_email,
        o.operating_city,
        count(m.id) as member_count,
        count(m.id) filter (where m.is_active = true and m.role::text in ('FLEET_OWNER', 'FLEET_MANAGER', 'DISPATCHER', 'DRIVER', 'COMPLIANCE_MANAGER')) as active_driver_count,
        count(m.id) filter (where ${readinessCase} = 'READY') as ready_driver_count,
        count(m.id) filter (where ${readinessCase} = 'NEEDS_REVIEW') as needs_review_driver_count,
        count(m.id) filter (where m.is_active = true and ${readinessCase} = 'NOT_ELIGIBLE') as not_eligible_driver_count,
        count(distinct d.active_job_id) filter (where d.active_job_id is not null) as active_job_count,
        o.created_at,
        o.updated_at
      from public.orgs o
      left join public.org_memberships m on m.org_id = o.id and m.role::text in ('FLEET_OWNER', 'FLEET_MANAGER', 'DISPATCHER', 'DRIVER', 'COMPLIANCE_MANAGER')
      left join public.drivers d on d.user_id = m.user_id
      left join lateral (
        select dv.vehicle_type::text as vehicle_type
        from public.driver_vehicle dv
        where dv.driver_id = d.id and dv.is_primary = true
        order by dv.updated_at desc
        limit 1
      ) vprimary on true
      left join lateral (
        select dvf.status::text as status
        from public.driver_verifications dvf
        where dvf.driver_id = d.id
        order by case dvf.status when 'APPROVED' then 1 when 'PENDING' then 2 else 3 end, dvf.updated_at desc
        limit 1
      ) vstatus on true
      ${whereClause}
      group by o.id
      ${suffix}`;
  }

  private async assertFleetOrg(fleetOrgId: string) {
    const result = await this.pg.query<{ id: string }>(
      `select id from public.orgs where id = $1 and org_type = 'DRIVER_COMPANY'`,
      [fleetOrgId]
    );
    if (!result.rows[0]) {
      throw new NotFoundException("fleet_org_not_found");
    }
  }

  private async resolveFleetUser(input: { userId?: string; driverId?: string; email?: string }): Promise<ResolvedFleetUserRow> {
    const result = await this.pg.query<ResolvedFleetUserRow>(
      `select u.id as user_id, d.id as driver_id
       from public.users u
       left join public.drivers d on d.user_id = u.id
       where ($1::uuid is not null and u.id = $1::uuid)
          or ($2::uuid is not null and d.id = $2::uuid)
          or ($3::text is not null and lower(u.email) = lower($3::text))
       limit 1`,
      [input.userId ?? null, input.driverId ?? null, input.email ?? null]
    );
    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("fleet_user_not_found");
    }
    return row;
  }

  private async updateFleetDriverMembership(
    fleetOrgId: string,
    membershipId: string,
    input: unknown,
    actor: AuthenticatedUser,
    action: string
  ) {
    const parsed = UpdateFleetDriverMembershipSchema.safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException({ message: "invalid_fleet_membership_update", issues: parsed.error.issues });
    }
    if (parsed.data.role) {
      assertFleetRole(parsed.data.role);
    }

    const existing = await this.pg.query<{ role: OrgRole; is_active: boolean }>(
      `select role::text as role, is_active from public.org_memberships where id = $1 and org_id = $2`,
      [membershipId, fleetOrgId]
    );
    if (!existing.rows[0]) {
      throw new NotFoundException("fleet_membership_not_found");
    }

    const nextRole = parsed.data.role ?? existing.rows[0].role;
    const nextActive = parsed.data.isActive ?? existing.rows[0].is_active;
    await this.pg.query(
      `update public.org_memberships
       set role = $3::public.org_role,
           is_active = $4,
           updated_at = now()
       where id = $1 and org_id = $2`,
      [membershipId, fleetOrgId, nextRole, nextActive]
    );

    await this.insertAuditLog({
      actorId: actor.id,
      orgId: fleetOrgId,
      entityType: "org_membership",
      entityId: membershipId,
      action,
      metadata: {
        previousRole: existing.rows[0].role,
        nextRole,
        previousActive: existing.rows[0].is_active,
        nextActive
      }
    });

    return this.getFleetDriverByMembership(fleetOrgId, membershipId);
  }

  private async getFleetContext(userId: string, allowedRoles: Set<OrgRole>) {
    const result = await this.pg.query<FleetContextRow>(
      `select m.org_id, o.name as org_name, m.role::text as role
       from public.org_memberships m
       join public.orgs o on o.id = m.org_id
       where m.user_id = $1
         and m.is_active = true
         and o.org_type = 'DRIVER_COMPANY'
         and m.role::text = any($2::text[])
       order by m.created_at desc
       limit 1`,
      [userId, [...allowedRoles]]
    );
    const row = result.rows[0];
    if (!row) {
      throw new ForbiddenException("fleet_management_role_required");
    }
    return {
      orgId: row.org_id,
      orgName: row.org_name,
      role: row.role
    };
  }

  private assertFleetInviteRole(role: OrgRole, currentUserRole: OrgRole) {
    if (role === "FLEET_MANAGER" && currentUserRole === "FLEET_OWNER") {
      return;
    }
    if (!FLEET_INVITE_BASE_ROLES.has(role)) {
      throw new UnprocessableEntityException("role_not_assignable_to_fleet_invite");
    }
  }

  private async listFleetDriversForOrg(fleetOrgId: string) {
    const result = await this.pg.query<FleetDriverRow>(this.fleetDriverSelectSql("where m.org_id = $1 order by m.updated_at desc"), [fleetOrgId]);
    return result.rows.map((row) => this.mapFleetDriver(row));
  }

  private async getFleetDriverByDriverOrUserId(fleetOrgId: string, driverId: string) {
    const result = await this.pg.query<FleetDriverRow>(
      this.fleetDriverSelectSql("where m.org_id = $1 and (d.id = $2::uuid or u.id = $2::uuid) limit 1"),
      [fleetOrgId, driverId]
    );
    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("fleet_driver_not_found");
    }
    return FleetDriverSchema.parse(this.mapFleetDriver(row));
  }

  private async listFleetDriverRecentWork(driverId: string): Promise<FleetDriverRecentWorkDto[]> {
    const result = await this.pg.query<FleetDriverRecentWorkRow>(
      `select id as job_id,
              status::text as status,
              pickup_address,
              dropoff_address,
              case when status::text in ('DELIVERED', 'COMPLETED', 'CANCELLED', 'DISPATCH_FAILED') then updated_at else null end as completed_at,
              created_at
       from public.jobs
       where assigned_driver_id = $1
       order by created_at desc
       limit 8`,
      [driverId]
    );

    return result.rows.map((row) => ({
      jobId: row.job_id,
      status: row.status as FleetDriverRecentWorkDto["status"],
      pickupAddress: row.pickup_address,
      dropoffAddress: row.dropoff_address,
      completedAt: toNullableIsoDateTime(row.completed_at),
      createdAt: toIsoDateTime(row.created_at)
    }));
  }

  private async listFleetMembers(fleetOrgId: string) {
    const result = await this.pg.query<FleetMembershipRow>(
      `select
          m.id as membership_id,
          o.id as org_id,
          o.name as org_name,
          coalesce(o.org_type, 'DRIVER_COMPANY') as org_type,
          coalesce(o.status, 'ACTIVE') as org_status,
          u.id as user_id,
          u.email,
          u.display_name,
          m.role::text as role,
          m.is_active,
          m.created_at as membership_created_at,
          m.updated_at as membership_updated_at
       from public.org_memberships m
       join public.users u on u.id = m.user_id
       join public.orgs o on o.id = m.org_id and o.org_type = 'DRIVER_COMPANY'
       where m.org_id = $1
         and m.role::text in ('FLEET_OWNER', 'FLEET_MANAGER', 'DISPATCHER', 'DRIVER', 'COMPLIANCE_MANAGER')
       order by m.created_at desc`,
      [fleetOrgId]
    );
    return result.rows.map((row) => IdentityMembershipSchema.parse(this.mapFleetMembership(row)));
  }

  private async listFleetInvitations(fleetOrgId: string) {
    const result = await this.pg.query<FleetInvitationRow>(
      `select id, org_id, email, role::text as role, status, invited_by, created_at, updated_at
       from public.org_invitations
       where org_id = $1
         and role::text in ('FLEET_OWNER', 'FLEET_MANAGER', 'DISPATCHER', 'DRIVER', 'COMPLIANCE_MANAGER')
       order by created_at desc`,
      [fleetOrgId]
    );
    return result.rows.map((row) => IdentityInvitationSchema.parse(this.mapFleetInvitation(row)));
  }

  private async listFleetAccessEvents(fleetOrgId: string) {
    const result = await this.pg.query<FleetAccessEventRow>(
      `select
          a.id,
          a.org_id,
          a.action,
          u.display_name as actor_name,
          u.email as actor_email,
          a.metadata,
          a.created_at
       from public.audit_log a
       left join public.users u on u.id = a.actor_id
       where a.org_id = $1
         and a.action = any($2::text[])
       order by a.created_at desc
       limit 30`,
      [fleetOrgId, FLEET_ACCESS_AUDIT_ACTIONS]
    );
    return result.rows.map((row) => IdentityAccessEventSchema.parse(this.mapFleetAccessEvent(row)));
  }

  private async getFleetInvitation(fleetOrgId: string, inviteId: string) {
    const result = await this.pg.query<FleetInvitationRow>(
      `select id, org_id, email, role::text as role, status, invited_by, created_at, updated_at
       from public.org_invitations
       where id = $1 and org_id = $2
       limit 1`,
      [inviteId, fleetOrgId]
    );
    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("invite_not_found");
    }
    return row;
  }

  private async getFleetDriverByMembership(fleetOrgId: string, membershipId: string) {
    const result = await this.pg.query<FleetDriverRow>(
      this.fleetDriverSelectSql("where m.org_id = $1 and m.id = $2"),
      [fleetOrgId, membershipId]
    );
    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("fleet_membership_not_found");
    }
    return FleetDriverSchema.parse(this.mapFleetDriver(row));
  }

  private fleetDriverSelectSql(whereClause: string) {
    return `select
        m.id as membership_id,
        o.id as fleet_org_id,
        o.name as fleet_org_name,
        u.id as user_id,
        u.email,
        u.display_name,
        m.role::text as fleet_role,
        m.is_active as membership_active,
        d.id as driver_id,
        d.availability_status::text as availability_status,
        coalesce(vstatus.status, 'MISSING')::text as verification_status,
        vprimary.vehicle_type::text as vehicle_type,
        d.active_job_id,
        aj.status::text as active_job_status,
        d.last_location_at,
        m.created_at,
        m.updated_at
      from public.org_memberships m
      join public.orgs o on o.id = m.org_id and o.org_type = 'DRIVER_COMPANY'
      join public.users u on u.id = m.user_id
      left join public.drivers d on d.user_id = u.id
      left join public.jobs aj on aj.id = d.active_job_id
      left join lateral (
        select dv.vehicle_type::text as vehicle_type
        from public.driver_vehicle dv
        where dv.driver_id = d.id and dv.is_primary = true
        order by dv.updated_at desc
        limit 1
      ) vprimary on true
      left join lateral (
        select dvf.status::text as status
        from public.driver_verifications dvf
        where dvf.driver_id = d.id
        order by case dvf.status when 'APPROVED' then 1 when 'PENDING' then 2 else 3 end, dvf.updated_at desc
        limit 1
      ) vstatus on true
      ${whereClause}`;
  }

  private mapFleetOrg(row: FleetOrgRow): FleetOrganisationDto {
    return FleetOrganisationSchema.parse({
      id: row.id,
      name: row.name,
      status: row.status,
      contactName: row.contact_name,
      contactEmail: row.contact_email,
      city: row.operating_city,
      memberCount: toNumber(row.member_count),
      activeDriverCount: toNumber(row.active_driver_count),
      readyDriverCount: toNumber(row.ready_driver_count),
      needsReviewDriverCount: toNumber(row.needs_review_driver_count),
      notEligibleDriverCount: toNumber(row.not_eligible_driver_count),
      activeJobCount: toNumber(row.active_job_count),
      createdAt: toIsoDateTime(row.created_at),
      updatedAt: toIsoDateTime(row.updated_at)
    });
  }

  private mapFleetDriver(row: FleetDriverRow): FleetDriverDto {
    const readinessStatus = this.computeReadiness(row);
    return FleetDriverSchema.parse({
      membershipId: row.membership_id,
      fleetOrgId: row.fleet_org_id,
      fleetOrgName: row.fleet_org_name,
      userId: row.user_id,
      email: row.email,
      displayName: row.display_name,
      fleetRole: row.fleet_role,
      membershipActive: row.membership_active,
      driverId: row.driver_id,
      availabilityStatus: row.availability_status,
      verificationStatus: row.verification_status ?? "MISSING",
      vehicleType: row.vehicle_type,
      activeJobId: row.active_job_id,
      activeJobStatus: row.active_job_status,
      lastLocationAt: toNullableIsoDateTime(row.last_location_at),
      readinessStatus,
      recommendedNextAction: this.getRecommendedAction(row, readinessStatus),
      createdAt: toIsoDateTime(row.created_at),
      updatedAt: toIsoDateTime(row.updated_at)
    });
  }

  private mapFleetMembership(row: FleetMembershipRow) {
    return {
      id: row.membership_id,
      orgId: row.org_id,
      orgName: row.org_name,
      orgType: row.org_type,
      orgStatus: row.org_status,
      userId: row.user_id,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      isActive: row.is_active,
      createdAt: toIsoDateTime(row.membership_created_at),
      updatedAt: toIsoDateTime(row.membership_updated_at)
    };
  }

  private mapFleetInvitation(row: FleetInvitationRow) {
    return {
      id: row.id,
      orgId: row.org_id,
      email: row.email,
      role: row.role,
      status: row.status,
      invitedBy: row.invited_by,
      createdAt: toIsoDateTime(row.created_at),
      updatedAt: toIsoDateTime(row.updated_at)
    };
  }

  private mapFleetAccessEvent(row: FleetAccessEventRow) {
    const metadata = parseMetadata(row.metadata);
    return {
      id: String(row.id),
      orgId: row.org_id,
      eventType: row.action,
      actorName: row.actor_name,
      actorEmail: row.actor_email,
      createdAt: toIsoDateTime(row.created_at),
      summary: this.fleetAccessEventSummary(row.action, metadata),
      metadata
    };
  }

  private fleetAccessEventSummary(action: string, metadata: Record<string, unknown>) {
    const email = typeof metadata.email === "string" ? metadata.email : "fleet member";
    const role = typeof metadata.role === "string" ? ` as ${roleLabel(metadata.role)}` : "";
    switch (action) {
      case "fleet_invite_created":
        return `Fleet invite created for ${email}${role}.`;
      case "fleet_invite_resent":
        return `Fleet invite resent to ${email}.`;
      case "fleet_invite_cancelled":
        return `Fleet invite cancelled for ${email}.`;
      case "fleet_driver_added":
        return `Fleet membership added${role}.`;
      case "fleet_driver_membership_updated":
        return "Fleet membership updated.";
      default:
        return role ? `Fleet access changed${role}.` : "Fleet access changed.";
    }
  }

  private computeReadiness(row: FleetDriverRow): "READY" | "NEEDS_REVIEW" | "NOT_ELIGIBLE" {
    if (!row.membership_active) {
      return "NOT_ELIGIBLE";
    }
    if (!row.driver_id || row.verification_status === "PENDING") {
      return "NEEDS_REVIEW";
    }
    if (
      row.verification_status !== "APPROVED" ||
      !row.vehicle_type ||
      row.availability_status !== "ONLINE" ||
      row.active_job_id
    ) {
      return "NOT_ELIGIBLE";
    }
    return locationRecentlySeen(row.last_location_at) ? "READY" : "NEEDS_REVIEW";
  }

  private getRecommendedAction(row: FleetDriverRow, readinessStatus: "READY" | "NEEDS_REVIEW" | "NOT_ELIGIBLE") {
    if (!row.membership_active) {
      return "Reactivate the fleet membership only after human review.";
    }
    if (!row.driver_id) {
      return "Create or link a driver profile before relying on this fleet member for dispatch.";
    }
    if (row.verification_status === "PENDING") {
      return "Review courier verification before pilot dispatch.";
    }
    if (row.verification_status !== "APPROVED") {
      return "Request verification update before making this courier eligible.";
    }
    if (!row.vehicle_type) {
      return "Add a primary vehicle before making this courier eligible.";
    }
    if (row.active_job_id) {
      return "Clear or complete the active job before assigning another delivery.";
    }
    if (row.availability_status !== "ONLINE") {
      return "Ask courier to go online before dispatch.";
    }
    if (readinessStatus === "NEEDS_REVIEW") {
      return "Ask courier to refresh location before relying on assignment.";
    }
    return "Courier is ready for fleet-managed pilot assignment after operator review.";
  }

  private async insertAuditLog(input: {
    actorId: string;
    orgId: string;
    entityType: string;
    entityId: string;
    action: string;
    metadata: Record<string, unknown>;
  }) {
    await this.pg.query(
      `insert into public.audit_log (request_id, actor_id, org_id, entity_type, entity_id, action, metadata)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [randomUUID(), input.actorId, input.orgId, input.entityType, input.entityId, input.action, JSON.stringify(input.metadata)]
    );
  }

  private async enqueueFleetInviteOutbox(
    eventType: "ORG_INVITE_CREATED" | "ORG_INVITE_RESENT" | "ORG_INVITE_CANCELLED",
    invite: FleetInvitationRow,
    actorId: string,
    action: "created" | "resent" | "cancelled",
    previousStatus?: string
  ) {
    await this.pg.query(
      `insert into public.outbox_messages (
         aggregate_type,
         aggregate_id,
         event_type,
         payload,
         idempotency_key
       )
       values ($1, $2, $3, $4::jsonb, $5)
       on conflict (event_type, idempotency_key) do nothing`,
      [
        "org_invitation",
        invite.id,
        eventType,
        JSON.stringify({
          inviteId: invite.id,
          orgId: invite.org_id,
          email: invite.email,
          role: invite.role,
          status: invite.status,
          action,
          actorId,
          previousStatus: previousStatus ?? null,
          createdAt: toIsoDateTime(invite.created_at),
          updatedAt: toIsoDateTime(invite.updated_at)
        }),
        `${eventType.toLowerCase()}:fleet:${invite.id}:${toIsoDateTime(invite.updated_at)}`
      ]
    );
  }
}
