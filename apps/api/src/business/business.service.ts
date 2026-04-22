import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnprocessableEntityException
} from "@nestjs/common";
import {
  BusinessContextSchema,
  CreateBusinessOrgSchema,
  OrgMembershipSummarySchema,
  OrgSummarySchema,
  type BusinessContextDto
} from "@shipwright/contracts";
import { createLogger, enrichLogContext, getRequestContext } from "@shipwright/observability";
import { randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { PgService } from "../database/pg.service.js";
import type { AuthenticatedUser } from "../security/types.js";

type UserRow = {
  id: string;
  email: string;
  display_name: string;
};

type OrgRow = {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  operating_city: string | null;
  created_by: string;
  created_at: string;
};

type MembershipRow = {
  id: string;
  org_id: string;
  user_id: string;
  role: "BUSINESS_OPERATOR" | "ADMIN";
  is_active: boolean;
  created_at: string;
};

type ContextRow = {
  membership_id: string;
  membership_org_id: string;
  membership_user_id: string;
  membership_role: "BUSINESS_OPERATOR" | "ADMIN";
  membership_is_active: boolean;
  membership_created_at: string;
  org_id: string;
  org_name: string;
  org_contact_name: string | null;
  org_contact_email: string | null;
  org_contact_phone: string | null;
  org_operating_city: string | null;
  org_created_by: string;
  org_created_at: string;
};

type Queryable = {
  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
};

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : value;
}

@Injectable()
export class BusinessService {
  private readonly logger = createLogger({ name: "api-business" });
  private orgProfileColumnsAvailable: Promise<boolean> | null = null;

  constructor(private readonly pg: PgService) {}

  async createBusinessOrg(input: unknown, user: AuthenticatedUser, idempotencyKey: string) {
    const parsed = CreateBusinessOrgSchema.safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        message: "invalid_business_org_payload",
        issues: parsed.error.issues
      });
    }

    const email = this.getUserEmail(user);
    if (email && email.toLowerCase() !== parsed.data.email.toLowerCase()) {
      throw new ForbiddenException("authenticated_email_mismatch");
    }

    const requestId = getRequestContext()?.requestId ?? randomUUID();
    const log = enrichLogContext(this.logger, { actor_id: user.id });

    try {
      await this.ensureUserRowExists(user, {
        email: parsed.data.email,
        displayName: parsed.data.contactName
      });

      const result = await this.pg.withIdempotency({
        actorId: user.id,
        endpoint: "/v1/business/orgs",
        idempotencyKey,
        execute: async (client) => {
          const hasOrgProfileColumns = await this.hasOrgProfileColumns(client);
          const userRow = await this.upsertUser(client, user, {
            email: parsed.data.email,
            displayName: parsed.data.contactName
          });
          await client.query("select id from public.users where id = $1 for update", [user.id]);

          const existingMemberships = await this.readBusinessMemberships(client, user.id, hasOrgProfileColumns);
          if (existingMemberships.length > 0) {
            return {
              responseCode: 200,
              body: this.mapContext(userRow, existingMemberships)
            };
          }

          const orgResult = hasOrgProfileColumns
            ? await client.query<OrgRow>(
                `insert into public.orgs (
                   name,
                   created_by,
                   contact_name,
                   contact_email,
                   contact_phone,
                   operating_city
                 ) values ($1, $2, $3, $4, $5, $6)
                 returning id, name, contact_name, contact_email, contact_phone, operating_city, created_by, created_at`,
                [
                  parsed.data.businessName,
                  user.id,
                  parsed.data.contactName,
                  parsed.data.email,
                  parsed.data.phone,
                  parsed.data.city
                ]
              )
            : await client.query<OrgRow>(
                `insert into public.orgs (
                   name,
                   created_by
                 ) values ($1, $2)
                 returning
                   id,
                   name,
                   null::text as contact_name,
                   null::text as contact_email,
                   null::text as contact_phone,
                   null::text as operating_city,
                   created_by,
                   created_at`,
                [parsed.data.businessName, user.id]
              );
          const org = orgResult.rows[0];

          const membershipResult = await client.query<MembershipRow>(
            `insert into public.org_memberships (
               org_id,
               user_id,
               role,
               is_active
             ) values ($1, $2, 'BUSINESS_OPERATOR', true)
             on conflict (org_id, user_id) do update
             set role = excluded.role,
                 is_active = true,
                 updated_at = now()
             returning id, org_id, user_id, role, is_active, created_at`,
            [org.id, user.id]
          );

          await this.insertAuditLog(client, {
            requestId,
            actorId: user.id,
            orgId: org.id,
            entityType: "org",
            entityId: org.id,
            action: "business_org_created",
            metadata: {
              membershipRole: membershipResult.rows[0].role,
              contactEmail: parsed.data.email,
              city: parsed.data.city
            }
          });

          return {
            responseCode: 201,
            body: this.mapContext(userRow, [
              {
                membership: membershipResult.rows[0],
                org
              }
            ])
          };
        }
      });

      log.info({ replay: result.replay }, "business_org_created");
      return result;
    } catch (error) {
      log.error({ err: error }, "business_org_create_failed");
      if (error instanceof ConflictException || error instanceof ForbiddenException || error instanceof UnprocessableEntityException) {
        throw error;
      }
      throw new InternalServerErrorException("business_org_create_failed");
    }
  }

  async getBusinessContext(user: AuthenticatedUser): Promise<BusinessContextDto> {
    const hasOrgProfileColumns = await this.hasOrgProfileColumns(this.pg);
    const userResult = await this.pg.query<UserRow>(
      `select id, email, display_name
       from public.users
       where id = $1`,
      [user.id]
    );

    const memberships = await this.readBusinessMemberships(this.pg, user.id, hasOrgProfileColumns);

    const fallbackEmail = this.getUserEmail(user);
    const fallbackDisplayName = this.getUserDisplayName(user, fallbackEmail);
    const userRow = userResult.rows[0] ?? {
      id: user.id,
      email: fallbackEmail,
      display_name: fallbackDisplayName
    };

    return this.mapContext(
      userRow,
      memberships
    );
  }

  private hasOrgProfileColumns(queryable: Queryable) {
    if (!this.orgProfileColumnsAvailable) {
      this.orgProfileColumnsAvailable = this.readOrgProfileColumns(queryable);
    }

    return this.orgProfileColumnsAvailable;
  }

  private async readOrgProfileColumns(queryable: Queryable) {
    const result = await queryable.query<{ column_name: string }>(
      `select column_name
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'orgs'
         and column_name in ('contact_name', 'contact_email', 'contact_phone', 'operating_city')`
    );

    const columns = new Set(result.rows.map((row) => row.column_name));
    return (
      columns.has("contact_name") &&
      columns.has("contact_email") &&
      columns.has("contact_phone") &&
      columns.has("operating_city")
    );
  }

  private async upsertUser(
    client: PoolClient,
    user: AuthenticatedUser,
    input: { email: string; displayName: string }
  ) {
    const result = await client.query<UserRow>(
      `insert into public.users (id, email, display_name)
       values ($1, $2, $3)
       on conflict (id) do update
       set email = excluded.email,
           display_name = excluded.display_name,
           updated_at = now()
       returning id, email, display_name`,
      [user.id, input.email, input.displayName]
    );

    return result.rows[0];
  }

  private ensureUserRowExists(user: AuthenticatedUser, input: { email: string; displayName: string }) {
    return this.pg.query<UserRow>(
      `insert into public.users (id, email, display_name)
       values ($1, $2, $3)
       on conflict (id) do update
       set email = excluded.email,
           display_name = excluded.display_name,
           updated_at = now()
       returning id, email, display_name`,
      [user.id, input.email, input.displayName]
    );
  }

  private async readBusinessMemberships(queryable: Queryable, userId: string, hasOrgProfileColumns: boolean) {
    const memberships = await queryable.query<ContextRow>(
      `select
          m.id as membership_id,
          m.org_id as membership_org_id,
          m.user_id as membership_user_id,
          m.role::text as membership_role,
          m.is_active as membership_is_active,
          m.created_at as membership_created_at,
          o.id as org_id,
          o.name as org_name,
          ${
            hasOrgProfileColumns
              ? `o.contact_name as org_contact_name,
                 o.contact_email as org_contact_email,
                 o.contact_phone as org_contact_phone,
                 o.operating_city as org_operating_city,`
              : `null::text as org_contact_name,
                 null::text as org_contact_email,
                 null::text as org_contact_phone,
                 null::text as org_operating_city,`
          }
          o.created_by as org_created_by,
          o.created_at as org_created_at
       from public.org_memberships m
       join public.orgs o on o.id = m.org_id
       where m.user_id = $1
         and m.is_active = true
         and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
       order by m.created_at desc`,
      [userId]
    );

    return memberships.rows.map((row) => ({
      membership: {
        id: row.membership_id,
        org_id: row.membership_org_id,
        user_id: row.membership_user_id,
        role: row.membership_role,
        is_active: row.membership_is_active,
        created_at: row.membership_created_at
      },
      org: {
        id: row.org_id,
        name: row.org_name,
        contact_name: row.org_contact_name,
        contact_email: row.org_contact_email,
        contact_phone: row.org_contact_phone,
        operating_city: row.org_operating_city,
        created_by: row.org_created_by,
        created_at: row.org_created_at
      }
    }));
  }

  private mapContext(
    user: UserRow,
    rows: Array<{ membership: MembershipRow; org: OrgRow }>
  ): BusinessContextDto {
    const memberships = rows.map((row) => ({
      membership: OrgMembershipSummarySchema.parse({
        id: row.membership.id,
        orgId: row.membership.org_id,
        userId: row.membership.user_id,
        role: row.membership.role,
        isActive: row.membership.is_active,
        createdAt: toIsoString(row.membership.created_at)
      }),
      org: OrgSummarySchema.parse({
        id: row.org.id,
        name: row.org.name,
        contactName: row.org.contact_name,
        contactEmail: row.org.contact_email,
        contactPhone: row.org.contact_phone,
        city: row.org.operating_city,
        createdByUserId: row.org.created_by,
        createdAt: toIsoString(row.org.created_at)
      })
    }));

    return BusinessContextSchema.parse({
      userId: user.id,
      email: user.email,
      displayName: user.display_name,
      onboarded: memberships.length > 0,
      currentOrg: memberships[0]?.org ?? null,
      memberships
    });
  }

  private getUserEmail(user: AuthenticatedUser) {
    const email = user.token.email;
    if (typeof email === "string" && email.length > 0) {
      return email;
    }

    const identities = user.token.identities;
    if (Array.isArray(identities)) {
      for (const identity of identities) {
        if (
          typeof identity === "object" &&
          identity !== null &&
          typeof (identity as { email?: unknown }).email === "string"
        ) {
          return (identity as { email: string }).email;
        }
      }
    }

    throw new ConflictException("authenticated_email_missing");
  }

  private getUserDisplayName(user: AuthenticatedUser, email: string) {
    const userMetadata = user.token.user_metadata;
    if (
      typeof userMetadata === "object" &&
      userMetadata !== null &&
      typeof (userMetadata as { display_name?: unknown }).display_name === "string" &&
      (userMetadata as { display_name: string }).display_name.trim().length >= 2
    ) {
      return (userMetadata as { display_name: string }).display_name.trim();
    }

    const preferred = user.token.name;
    if (typeof preferred === "string" && preferred.trim().length >= 2) {
      return preferred.trim();
    }

    const fallback = email.split("@")[0]?.replace(/[._-]+/g, " ") ?? "Business User";
    return fallback.length >= 2 ? fallback : "Business User";
  }

  private async insertAuditLog(
    client: PoolClient,
    input: {
      requestId: string;
      actorId: string;
      orgId: string;
      entityType: string;
      entityId: string;
      action: string;
      metadata: Record<string, unknown>;
    }
  ) {
    await client.query(
      `insert into public.audit_log (
         request_id,
         actor_id,
         org_id,
         entity_type,
         entity_id,
         action,
         metadata
       ) values ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        input.requestId,
        input.actorId,
        input.orgId,
        input.entityType,
        input.entityId,
        input.action,
        JSON.stringify(input.metadata)
      ]
    );
  }
}
