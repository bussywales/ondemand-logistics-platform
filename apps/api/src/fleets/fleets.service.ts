import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import {
  AddFleetDriverSchema,
  CreateFleetOrganisationSchema,
  FleetDriverListSchema,
  FleetDriverSchema,
  FleetOrganisationListSchema,
  FleetOrganisationSchema,
  FleetReadinessSummarySchema,
  UpdateFleetDriverMembershipSchema,
  type FleetDriverDto,
  type FleetOrganisationDto,
  type OrgRole
} from "@shipwright/contracts";
import { randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";
import { toIsoDateTime, toNullableIsoDateTime } from "../database/mapper.js";
import { PgService } from "../database/pg.service.js";
import type { AuthenticatedUser } from "../security/types.js";

const FLEET_ROLES = new Set<OrgRole>(["FLEET_OWNER", "FLEET_MANAGER", "DISPATCHER", "DRIVER", "COMPLIANCE_MANAGER"]);

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
    const fleetOrgId = await this.getManageableFleetOrgId(user.id);
    return FleetDriverListSchema.parse({ items: await this.listFleetDriversForOrg(fleetOrgId) });
  }

  async getScopedFleetReadiness(user: AuthenticatedUser) {
    const fleetOrgId = await this.getManageableFleetOrgId(user.id);
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

  private async getManageableFleetOrgId(userId: string) {
    const result = await this.pg.query<{ org_id: string }>(
      `select m.org_id
       from public.org_memberships m
       join public.orgs o on o.id = m.org_id
       where m.user_id = $1
         and m.is_active = true
         and o.org_type = 'DRIVER_COMPANY'
         and m.role::text in ('FLEET_OWNER', 'FLEET_MANAGER', 'DISPATCHER', 'COMPLIANCE_MANAGER')
       order by m.created_at desc
       limit 1`,
      [userId]
    );
    const orgId = result.rows[0]?.org_id;
    if (!orgId) {
      throw new ForbiddenException("fleet_management_role_required");
    }
    return orgId;
  }

  private async listFleetDriversForOrg(fleetOrgId: string) {
    const result = await this.pg.query<FleetDriverRow>(this.fleetDriverSelectSql("where m.org_id = $1 order by m.updated_at desc"), [fleetOrgId]);
    return result.rows.map((row) => this.mapFleetDriver(row));
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
}
