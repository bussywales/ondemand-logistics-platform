import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException
} from "@nestjs/common";
import {
  BusinessTeamSchema,
  CreateTeamInviteSchema,
  IdentityInvitationSchema,
  IdentityOrgListSchema,
  IdentityOrgMembersSchema,
  IdentityUserListSchema,
  OrgRoleSchema,
  UpdateMembershipSchema,
  type BusinessTeamDto,
  type CreateTeamInviteInput,
  type IdentityInvitationDto,
  type IdentityMembershipDto,
  type IdentityOrgDto,
  type IdentityOrgMembersDto,
  type IdentityUserDto,
  type OrgRole,
  type UpdateMembershipInput
} from "@shipwright/contracts";
import { randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";
import { toIsoDateTime } from "../database/mapper.js";
import { PgService } from "../database/pg.service.js";
import type { AuthenticatedUser } from "../security/types.js";

const BUSINESS_MANAGEMENT_ROLES = new Set<OrgRole>([
  "ADMIN",
  "BUSINESS_OPERATOR",
  "OWNER",
  "MANAGER",
  "OPERATOR",
  "SUPPORT_USER",
  "MENU_MANAGER"
]);

const BUSINESS_ASSIGNABLE_ROLES = new Set<OrgRole>([
  "OWNER",
  "MANAGER",
  "OPERATOR",
  "FINANCE_VIEWER",
  "SUPPORT_USER",
  "MENU_MANAGER",
  "BUSINESS_OPERATOR",
  "ADMIN"
]);

type UserMembershipRow = QueryResultRow & {
  user_id: string;
  email: string;
  display_name: string;
  user_created_at: string | Date;
  user_updated_at: string | Date;
  platform_admin: boolean;
  membership_id: string | null;
  org_id: string | null;
  org_name: string | null;
  org_type: string | null;
  org_status: string | null;
  role: OrgRole | null;
  is_active: boolean | null;
  membership_created_at: string | Date | null;
  membership_updated_at: string | Date | null;
};

type OrgRow = QueryResultRow & {
  id: string;
  name: string;
  org_type: string;
  status: string;
  contact_name: string | null;
  contact_email: string | null;
  operating_city: string | null;
  member_count: string | number;
  active_member_count: string | number;
  created_at: string | Date;
  updated_at: string | Date;
};

type InvitationRow = QueryResultRow & {
  id: string;
  org_id: string;
  email: string;
  role: OrgRole;
  status: "PENDING" | "ACCEPTED" | "CANCELLED";
  invited_by: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type MembershipRow = UserMembershipRow & {
  membership_id: string;
  org_id: string;
  org_name: string;
  org_type: string;
  org_status: string;
  role: OrgRole;
  is_active: boolean;
  membership_created_at: string | Date;
  membership_updated_at: string | Date;
};

function toNumber(value: string | number) {
  return typeof value === "number" ? value : Number.parseInt(value, 10);
}

function parseRole(value: unknown) {
  const parsed = OrgRoleSchema.safeParse(value);
  if (!parsed.success) {
    throw new UnprocessableEntityException("invalid_role");
  }
  return parsed.data;
}

function membershipStatus(active: boolean) {
  return active ? "ACTIVE" : "INACTIVE";
}

@Injectable()
export class IdentityService {
  constructor(private readonly pg: PgService) {}

  async listAdminUsers(search?: string) {
    const rows = await this.pg.query<UserMembershipRow>(
      `select
          u.id as user_id,
          u.email,
          u.display_name,
          u.created_at as user_created_at,
          u.updated_at as user_updated_at,
          (pa.user_id is not null and pa.is_active = true) as platform_admin,
          m.id as membership_id,
          o.id as org_id,
          o.name as org_name,
          coalesce(o.org_type, 'RESTAURANT') as org_type,
          coalesce(o.status, 'ACTIVE') as org_status,
          m.role::text as role,
          m.is_active,
          m.created_at as membership_created_at,
          m.updated_at as membership_updated_at
       from public.users u
       left join public.platform_admins pa on pa.user_id = u.id
       left join public.org_memberships m on m.user_id = u.id
       left join public.orgs o on o.id = m.org_id
       where ($1::text is null or u.email ilike '%' || $1 || '%' or u.display_name ilike '%' || $1 || '%')
       order by u.created_at desc, m.created_at desc
       limit 250`,
      [search?.trim() || null]
    );

    const users = new Map<string, IdentityUserDto>();
    for (const row of rows.rows) {
      const current = users.get(row.user_id) ?? {
        id: row.user_id,
        email: row.email,
        displayName: row.display_name,
        status: "ACTIVE",
        platformAdmin: row.platform_admin,
        lastSignInAt: null,
        createdAt: toIsoDateTime(row.user_created_at),
        updatedAt: toIsoDateTime(row.user_updated_at),
        memberships: []
      };

      if (row.membership_id && row.org_id && row.org_name && row.role && row.membership_created_at && row.membership_updated_at) {
        current.memberships.push(this.mapMembership(row as MembershipRow));
      }

      users.set(row.user_id, current);
    }

    return IdentityUserListSchema.parse({ items: [...users.values()] });
  }

  async listAdminOrgs(search?: string) {
    const result = await this.pg.query<OrgRow>(
      `select
          o.id,
          o.name,
          coalesce(o.org_type, 'RESTAURANT') as org_type,
          coalesce(o.status, 'ACTIVE') as status,
          o.contact_name,
          o.contact_email,
          o.operating_city,
          count(m.id) as member_count,
          count(m.id) filter (where m.is_active = true) as active_member_count,
          o.created_at,
          o.updated_at
       from public.orgs o
       left join public.org_memberships m on m.org_id = o.id
       where ($1::text is null or o.name ilike '%' || $1 || '%' or o.contact_email ilike '%' || $1 || '%')
       group by o.id
       order by o.created_at desc
       limit 250`,
      [search?.trim() || null]
    );

    return IdentityOrgListSchema.parse({ items: result.rows.map((row) => this.mapOrg(row)) });
  }

  async getAdminOrgMembers(orgId: string): Promise<IdentityOrgMembersDto> {
    const org = await this.getOrg(orgId);
    const [members, invitations] = await Promise.all([
      this.listOrgMembers(orgId),
      this.listOrgInvitations(orgId)
    ]);

    return IdentityOrgMembersSchema.parse({ org, members, invitations });
  }

  async updateAdminMembership(orgId: string, membershipId: string, input: unknown, actor: AuthenticatedUser) {
    const parsed = UpdateMembershipSchema.safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        message: "invalid_membership_update",
        issues: parsed.error.issues
      });
    }

    return this.updateMembership({
      actor,
      orgId,
      membershipId,
      input: parsed.data,
      allowedRoles: null,
      auditAction: "admin_membership_updated"
    });
  }

  async getBusinessTeam(user: AuthenticatedUser): Promise<BusinessTeamDto> {
    const orgId = await this.getCurrentBusinessOrgId(user.id);
    const team = await this.getAdminOrgMembers(orgId);
    return BusinessTeamSchema.parse(team);
  }

  async createBusinessInvite(input: unknown, user: AuthenticatedUser): Promise<IdentityInvitationDto> {
    const parsed = CreateTeamInviteSchema.safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        message: "invalid_team_invite",
        issues: parsed.error.issues
      });
    }

    const role = parseRole(parsed.data.role);
    if (!BUSINESS_ASSIGNABLE_ROLES.has(role)) {
      throw new UnprocessableEntityException("role_not_assignable_to_business_team");
    }

    const orgId = await this.getManageableBusinessOrgId(user.id);
    const existingUser = await this.pg.query<{ id: string }>(
      `select id from public.users where lower(email) = lower($1) limit 1`,
      [parsed.data.email]
    );
    const userId = existingUser.rows[0]?.id;

    if (userId) {
      await this.pg.query(
        `insert into public.org_memberships (org_id, user_id, role, is_active)
         values ($1, $2, $3::public.org_role, true)
         on conflict (org_id, user_id) do update
         set role = excluded.role,
             is_active = true,
             updated_at = now()`,
        [orgId, userId, role]
      );
    }

    const invitation = await this.pg.query<InvitationRow>(
      `insert into public.org_invitations (org_id, email, role, status, invited_by)
       values ($1, lower($2), $3::public.org_role, 'PENDING', $4)
       on conflict (org_id, email) do update
       set role = excluded.role,
           status = 'PENDING',
           invited_by = excluded.invited_by,
           updated_at = now()
       returning id, org_id, email, role::text as role, status, invited_by, created_at, updated_at`,
      [orgId, parsed.data.email, role, user.id]
    );

    await this.insertAuditLog({
      actorId: user.id,
      orgId,
      entityType: "org_invitation",
      entityId: invitation.rows[0].id,
      action: "team_invite_created",
      metadata: { email: parsed.data.email, role }
    });

    return IdentityInvitationSchema.parse(this.mapInvitation(invitation.rows[0]));
  }

  async updateBusinessMembership(membershipId: string, input: unknown, actor: AuthenticatedUser) {
    const parsed = UpdateMembershipSchema.safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        message: "invalid_membership_update",
        issues: parsed.error.issues
      });
    }

    const orgId = await this.getManageableBusinessOrgId(actor.id);
    if (parsed.data.role && !BUSINESS_ASSIGNABLE_ROLES.has(parsed.data.role)) {
      throw new UnprocessableEntityException("role_not_assignable_to_business_team");
    }

    return this.updateMembership({
      actor,
      orgId,
      membershipId,
      input: parsed.data,
      allowedRoles: BUSINESS_ASSIGNABLE_ROLES,
      auditAction: "business_membership_updated"
    });
  }

  private async updateMembership(input: {
    actor: AuthenticatedUser;
    orgId: string;
    membershipId: string;
    input: UpdateMembershipInput;
    allowedRoles: Set<OrgRole> | null;
    auditAction: string;
  }) {
    if (input.input.role && input.allowedRoles && !input.allowedRoles.has(input.input.role)) {
      throw new UnprocessableEntityException("role_not_assignable");
    }

    const existing = await this.pg.query<MembershipRow>(
      this.membershipSelectSql("where m.id = $1 and m.org_id = $2"),
      [input.membershipId, input.orgId]
    );
    if (!existing.rows[0]) {
      throw new NotFoundException("membership_not_found");
    }

    const nextRole = input.input.role ?? existing.rows[0].role;
    const nextActive = input.input.isActive ?? existing.rows[0].is_active;
    await this.pg.query(
      `update public.org_memberships
       set role = $3::public.org_role,
           is_active = $4,
           updated_at = now()
       where id = $1
         and org_id = $2`,
      [input.membershipId, input.orgId, nextRole, nextActive]
    );

    const result = await this.pg.query<MembershipRow>(
      this.membershipSelectSql("where m.id = $1 and m.org_id = $2"),
      [input.membershipId, input.orgId]
    );
    const updated = result.rows[0];
    await this.insertAuditLog({
      actorId: input.actor.id,
      orgId: input.orgId,
      entityType: "org_membership",
      entityId: input.membershipId,
      action: input.auditAction,
      metadata: {
        previousRole: existing.rows[0].role,
        nextRole,
        previousActive: existing.rows[0].is_active,
        nextActive
      }
    });

    return this.mapMembership(updated);
  }

  private async getCurrentBusinessOrgId(userId: string) {
    const result = await this.pg.query<{ org_id: string }>(
      `select m.org_id
       from public.org_memberships m
       where m.user_id = $1
         and m.is_active = true
         and m.role in ('BUSINESS_OPERATOR', 'ADMIN', 'OWNER', 'MANAGER', 'OPERATOR', 'FINANCE_VIEWER', 'SUPPORT_USER', 'MENU_MANAGER')
       order by m.created_at desc
       limit 1`,
      [userId]
    );
    const orgId = result.rows[0]?.org_id;
    if (!orgId) {
      throw new ForbiddenException("business_membership_required");
    }
    return orgId;
  }

  private async getManageableBusinessOrgId(userId: string) {
    const result = await this.pg.query<{ org_id: string }>(
      `select m.org_id
       from public.org_memberships m
       where m.user_id = $1
         and m.is_active = true
         and m.role in ('BUSINESS_OPERATOR', 'ADMIN', 'OWNER', 'MANAGER')
       order by m.created_at desc
       limit 1`,
      [userId]
    );
    const orgId = result.rows[0]?.org_id;
    if (!orgId) {
      throw new ForbiddenException("team_management_role_required");
    }
    return orgId;
  }

  private async getOrg(orgId: string): Promise<IdentityOrgDto> {
    const result = await this.pg.query<OrgRow>(
      `select
          o.id,
          o.name,
          coalesce(o.org_type, 'RESTAURANT') as org_type,
          coalesce(o.status, 'ACTIVE') as status,
          o.contact_name,
          o.contact_email,
          o.operating_city,
          count(m.id) as member_count,
          count(m.id) filter (where m.is_active = true) as active_member_count,
          o.created_at,
          o.updated_at
       from public.orgs o
       left join public.org_memberships m on m.org_id = o.id
       where o.id = $1
       group by o.id`,
      [orgId]
    );
    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("org_not_found");
    }
    return this.mapOrg(row);
  }

  private async listOrgMembers(orgId: string) {
    const result = await this.pg.query<MembershipRow>(
      this.membershipSelectSql("where m.org_id = $1 order by m.created_at desc"),
      [orgId]
    );
    return result.rows.map((row) => this.mapMembership(row));
  }

  private async listOrgInvitations(orgId: string) {
    const result = await this.pg.query<InvitationRow>(
      `select id, org_id, email, role::text as role, status, invited_by, created_at, updated_at
       from public.org_invitations
       where org_id = $1
       order by created_at desc`,
      [orgId]
    );
    return result.rows.map((row) => this.mapInvitation(row));
  }

  private membershipSelectSql(whereClause: string) {
    return `select
        u.id as user_id,
        u.email,
        u.display_name,
        u.created_at as user_created_at,
        u.updated_at as user_updated_at,
        false as platform_admin,
        m.id as membership_id,
        o.id as org_id,
        o.name as org_name,
        coalesce(o.org_type, 'RESTAURANT') as org_type,
        coalesce(o.status, 'ACTIVE') as org_status,
        m.role::text as role,
        m.is_active,
        m.created_at as membership_created_at,
        m.updated_at as membership_updated_at
      from public.org_memberships m
      join public.users u on u.id = m.user_id
      join public.orgs o on o.id = m.org_id
      ${whereClause}`;
  }

  private mapOrg(row: OrgRow): IdentityOrgDto {
    return {
      id: row.id,
      name: row.name,
      type: row.org_type as IdentityOrgDto["type"],
      status: row.status as IdentityOrgDto["status"],
      contactName: row.contact_name,
      contactEmail: row.contact_email,
      city: row.operating_city,
      memberCount: toNumber(row.member_count),
      activeMemberCount: toNumber(row.active_member_count),
      createdAt: toIsoDateTime(row.created_at),
      updatedAt: toIsoDateTime(row.updated_at)
    };
  }

  private mapMembership(row: MembershipRow): IdentityMembershipDto {
    return {
      id: row.membership_id,
      orgId: row.org_id,
      orgName: row.org_name,
      orgType: row.org_type as IdentityMembershipDto["orgType"],
      orgStatus: row.org_status as IdentityMembershipDto["orgStatus"],
      userId: row.user_id,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      isActive: row.is_active,
      createdAt: toIsoDateTime(row.membership_created_at),
      updatedAt: toIsoDateTime(row.membership_updated_at)
    };
  }

  private mapInvitation(row: InvitationRow): IdentityInvitationDto {
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
