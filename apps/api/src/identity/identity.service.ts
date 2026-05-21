import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException
} from "@nestjs/common";
import {
  BusinessTeamSchema,
  CreateTeamInviteSchema,
  IdentityAccessEventSchema,
  IdentityInvitationSchema,
  IdentityOrgListSchema,
  IdentityOrgMembersSchema,
  IdentityUserListSchema,
  OrgRoleSchema,
  UpdateMembershipSchema,
  type BusinessTeamDto,
  type IdentityAccessEventDto,
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

const ACCESS_AUDIT_ACTIONS = [
  "team_invite_created",
  "team_member_added",
  "business_membership_updated",
  "admin_membership_updated",
  "team_invite_resent",
  "team_invite_cancelled",
  "admin_invite_resent",
  "admin_invite_cancelled"
];

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
  status: "PENDING" | "ACCEPTED" | "CANCELLED" | "EXPIRED";
  invited_by: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type AccessEventRow = QueryResultRow & {
  id: string | number;
  org_id: string;
  action: string;
  actor_name: string | null;
  actor_email: string | null;
  metadata: Record<string, unknown> | string | null;
  created_at: string | Date;
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
    const [members, invitations, accessEvents] = await Promise.all([
      this.listOrgMembers(orgId),
      this.listOrgInvitations(orgId),
      this.listAccessEvents(orgId)
    ]);

    return IdentityOrgMembersSchema.parse({ org, members, invitations, accessEvents });
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
      await this.insertAuditLog({
        actorId: user.id,
        orgId,
        entityType: "org_membership",
        entityId: userId,
        action: "team_member_added",
        metadata: { email: parsed.data.email, role }
      });
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
    await this.enqueueInviteOutbox("ORG_INVITE_CREATED", invitation.rows[0], {
      action: "created",
      actorId: user.id
    });

    return IdentityInvitationSchema.parse(this.mapInvitation(invitation.rows[0]));
  }

  async resendBusinessInvite(inviteId: string, actor: AuthenticatedUser): Promise<IdentityInvitationDto> {
    const orgId = await this.getManageableBusinessOrgId(actor.id);
    return this.resendInvite({
      orgId,
      inviteId,
      actor,
      auditAction: "team_invite_resent"
    });
  }

  async cancelBusinessInvite(inviteId: string, actor: AuthenticatedUser): Promise<IdentityInvitationDto> {
    const orgId = await this.getManageableBusinessOrgId(actor.id);
    return this.cancelInvite({
      orgId,
      inviteId,
      actor,
      auditAction: "team_invite_cancelled"
    });
  }

  async resendAdminInvite(orgId: string, inviteId: string, actor: AuthenticatedUser): Promise<IdentityInvitationDto> {
    await this.getOrg(orgId);
    return this.resendInvite({
      orgId,
      inviteId,
      actor,
      auditAction: "admin_invite_resent"
    });
  }

  async cancelAdminInvite(orgId: string, inviteId: string, actor: AuthenticatedUser): Promise<IdentityInvitationDto> {
    await this.getOrg(orgId);
    return this.cancelInvite({
      orgId,
      inviteId,
      actor,
      auditAction: "admin_invite_cancelled"
    });
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

  private async resendInvite(input: {
    orgId: string;
    inviteId: string;
    actor: AuthenticatedUser;
    auditAction: "team_invite_resent" | "admin_invite_resent";
  }) {
    const existing = await this.getInvitation(input.orgId, input.inviteId);
    if (existing.status === "ACCEPTED" || existing.status === "CANCELLED") {
      throw new UnprocessableEntityException("invite_not_resendable");
    }

    const result = await this.pg.query<InvitationRow>(
      `update public.org_invitations
       set status = 'PENDING',
           invited_by = $3,
           updated_at = now()
       where id = $1
         and org_id = $2
       returning id, org_id, email, role::text as role, status, invited_by, created_at, updated_at`,
      [input.inviteId, input.orgId, input.actor.id]
    );
    const invite = result.rows[0];

    await this.insertAuditLog({
      actorId: input.actor.id,
      orgId: input.orgId,
      entityType: "org_invitation",
      entityId: input.inviteId,
      action: input.auditAction,
      metadata: {
        email: invite.email,
        role: invite.role,
        previousStatus: existing.status,
        nextStatus: invite.status
      }
    });
    await this.enqueueInviteOutbox("ORG_INVITE_RESENT", invite, {
      action: "resent",
      actorId: input.actor.id,
      previousStatus: existing.status
    });

    return IdentityInvitationSchema.parse(this.mapInvitation(invite));
  }

  private async cancelInvite(input: {
    orgId: string;
    inviteId: string;
    actor: AuthenticatedUser;
    auditAction: "team_invite_cancelled" | "admin_invite_cancelled";
  }) {
    const existing = await this.getInvitation(input.orgId, input.inviteId);
    if (existing.status === "ACCEPTED") {
      throw new UnprocessableEntityException("accepted_invite_cannot_be_cancelled");
    }
    if (existing.status === "CANCELLED") {
      throw new UnprocessableEntityException("invite_already_cancelled");
    }

    const result = await this.pg.query<InvitationRow>(
      `update public.org_invitations
       set status = 'CANCELLED',
           updated_at = now()
       where id = $1
         and org_id = $2
       returning id, org_id, email, role::text as role, status, invited_by, created_at, updated_at`,
      [input.inviteId, input.orgId]
    );
    const invite = result.rows[0];

    await this.insertAuditLog({
      actorId: input.actor.id,
      orgId: input.orgId,
      entityType: "org_invitation",
      entityId: input.inviteId,
      action: input.auditAction,
      metadata: {
        email: invite.email,
        role: invite.role,
        previousStatus: existing.status,
        nextStatus: invite.status
      }
    });
    await this.enqueueInviteOutbox("ORG_INVITE_CANCELLED", invite, {
      action: "cancelled",
      actorId: input.actor.id,
      previousStatus: existing.status
    });

    return IdentityInvitationSchema.parse(this.mapInvitation(invite));
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

  private async listAccessEvents(orgId: string): Promise<IdentityAccessEventDto[]> {
    const result = await this.pg.query<AccessEventRow>(
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
      [orgId, ACCESS_AUDIT_ACTIONS]
    );
    return result.rows.map((row) => this.mapAccessEvent(row));
  }

  private async getInvitation(orgId: string, inviteId: string) {
    const result = await this.pg.query<InvitationRow>(
      `select id, org_id, email, role::text as role, status, invited_by, created_at, updated_at
       from public.org_invitations
       where id = $1
         and org_id = $2
       limit 1`,
      [inviteId, orgId]
    );
    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("invite_not_found");
    }
    return row;
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

  private mapAccessEvent(row: AccessEventRow): IdentityAccessEventDto {
    const metadata = typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata ?? {};
    return IdentityAccessEventSchema.parse({
      id: String(row.id),
      orgId: row.org_id,
      eventType: row.action,
      actorName: row.actor_name,
      actorEmail: row.actor_email,
      createdAt: toIsoDateTime(row.created_at),
      summary: this.accessEventSummary(row.action, metadata),
      metadata
    });
  }

  private accessEventSummary(action: string, metadata: Record<string, unknown>) {
    const email = typeof metadata.email === "string" ? metadata.email : "team access";
    const role = typeof metadata.role === "string" ? ` as ${roleLabel(metadata.role)}` : "";
    switch (action) {
      case "team_invite_created":
        return `Invite created for ${email}${role}.`;
      case "team_invite_resent":
      case "admin_invite_resent":
        return `Invite resent to ${email}.`;
      case "team_invite_cancelled":
      case "admin_invite_cancelled":
        return `Invite cancelled for ${email}.`;
      case "team_member_added":
        return `Member access added for ${email}${role}.`;
      case "business_membership_updated":
      case "admin_membership_updated": {
        const previousRole = typeof metadata.previousRole === "string" ? roleLabel(metadata.previousRole) : "previous role";
        const nextRole = typeof metadata.nextRole === "string" ? roleLabel(metadata.nextRole) : "next role";
        const nextActive = typeof metadata.nextActive === "boolean" ? (metadata.nextActive ? "active" : "inactive") : "updated";
        return `Membership changed from ${previousRole} to ${nextRole}; status ${nextActive}.`;
      }
      default:
        return action.replace(/_/g, " ").toLowerCase();
    }
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

  private async enqueueInviteOutbox(eventType: "ORG_INVITE_CREATED" | "ORG_INVITE_RESENT" | "ORG_INVITE_CANCELLED", invite: InvitationRow, metadata: Record<string, unknown>) {
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
          updatedAt: toIsoDateTime(invite.updated_at),
          ...metadata
        }),
        `${eventType.toLowerCase()}:${invite.id}:${toIsoDateTime(invite.updated_at)}`
      ]
    );
  }
}

function roleLabel(role: string) {
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
