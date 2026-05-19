import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { z } from "zod";
import {
  CreateSupportEscalationSchema,
  SupportEscalationCategorySchema,
  SupportEscalationListSchema,
  SupportEscalationSchema,
  SupportEscalationSeveritySchema,
  SupportEscalationStatusSchema,
  UpdateSupportEscalationSchema,
  type CreateSupportEscalationInput,
  type SupportEscalationDto,
  type UpdateSupportEscalationInput
} from "@shipwright/contracts";
import { toIsoDateTime } from "../database/mapper.js";
import { PgService } from "../database/pg.service.js";

const ListSupportEscalationsFilterSchema = z.object({
  orderId: z.string().uuid().optional(),
  jobId: z.string().uuid().optional(),
  status: SupportEscalationStatusSchema.optional(),
  category: SupportEscalationCategorySchema.optional(),
  severity: SupportEscalationSeveritySchema.optional()
});

export type ListSupportEscalationsFilters = z.infer<typeof ListSupportEscalationsFilterSchema>;

type SupportEscalationRow = {
  id: string;
  org_id: string;
  org_name: string | null;
  order_id: string | null;
  job_id: string | null;
  category: string;
  status: string;
  severity: string;
  title: string;
  note: string;
  follow_up_owner: string | null;
  customer_contact_required: boolean;
  merchant_contact_required: boolean;
  courier_contact_required: boolean;
  resolution_note: string | null;
  resolution_action: string | null;
  resolution_reason: string | null;
  resolved_by: string | null;
  resolved_at: string | Date | null;
  created_by: string | null;
  created_at: string | Date;
  updated_at: string | Date;
  restaurant_name: string | null;
  customer_name: string | null;
};

type EscalationContext = {
  orgId: string;
  orderId: string | null;
  jobId: string | null;
};

function mapSupportEscalation(row: SupportEscalationRow): SupportEscalationDto {
  return SupportEscalationSchema.parse({
    id: row.id,
    orgId: row.org_id,
    orgName: row.org_name,
    orderId: row.order_id,
    jobId: row.job_id,
    category: row.category,
    status: row.status,
    severity: row.severity,
    title: row.title,
    note: row.note,
    followUpOwner: row.follow_up_owner,
    customerContactRequired: row.customer_contact_required,
    merchantContactRequired: row.merchant_contact_required,
    courierContactRequired: row.courier_contact_required,
    resolutionNote: row.resolution_note,
    resolutionAction: row.resolution_action,
    resolutionReason: row.resolution_reason,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at ? toIsoDateTime(row.resolved_at) : null,
    createdBy: row.created_by,
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at),
    restaurantName: row.restaurant_name,
    customerName: row.customer_name
  });
}

@Injectable()
export class SupportEscalationsService {
  constructor(private readonly pg: PgService) {}

  async listBusinessEscalations(userId: string, rawFilters: unknown) {
    const filters = ListSupportEscalationsFilterSchema.parse(rawFilters ?? {});
    const result = await this.pg.query<SupportEscalationRow>(this.buildListQuery(true), [
      userId,
      filters.orderId ?? null,
      filters.jobId ?? null,
      filters.status ?? null,
      filters.category ?? null,
      filters.severity ?? null
    ]);

    return SupportEscalationListSchema.parse({ items: result.rows.map(mapSupportEscalation) });
  }

  async listAdminEscalations(rawFilters: unknown) {
    const filters = ListSupportEscalationsFilterSchema.parse(rawFilters ?? {});
    const result = await this.pg.query<SupportEscalationRow>(this.buildListQuery(false), [
      filters.orderId ?? null,
      filters.jobId ?? null,
      filters.status ?? null,
      filters.category ?? null,
      filters.severity ?? null
    ]);

    return SupportEscalationListSchema.parse({ items: result.rows.map(mapSupportEscalation) });
  }

  async createBusinessEscalation(userId: string, rawInput: unknown) {
    const input = CreateSupportEscalationSchema.parse(rawInput);
    const context = await this.resolveBusinessEscalationContext(userId, input);
    const result = await this.pg.query<SupportEscalationRow>(
      `with inserted as (
         insert into public.support_escalations (
           org_id,
           order_id,
           job_id,
           category,
           status,
           severity,
           title,
           note,
           follow_up_owner,
           customer_contact_required,
           merchant_contact_required,
           courier_contact_required,
           created_by
         )
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         returning id
       )
       ${this.baseSelect()}
       join inserted on inserted.id = se.id`,
      [
        context.orgId,
        context.orderId,
        context.jobId,
        input.category,
        input.status,
        input.severity,
        input.title,
        input.note,
        input.followUpOwner ?? null,
        input.customerContactRequired,
        input.merchantContactRequired,
        input.courierContactRequired,
        userId
      ]
    );

    const row = result.rows[0];
    if (!row) {
      throw new UnprocessableEntityException("support_escalation_create_failed");
    }

    return mapSupportEscalation(row);
  }

  async updateBusinessEscalation(userId: string, escalationId: string, rawInput: unknown) {
    const parsedInput = UpdateSupportEscalationSchema.safeParse(rawInput);
    if (!parsedInput.success) {
      throw new UnprocessableEntityException(parsedInput.error.issues[0]?.message ?? "support_escalation_update_invalid");
    }
    const input = parsedInput.data;
    const assignments: string[] = [];
    const values: unknown[] = [escalationId, userId];

    const add = (column: string, value: unknown) => {
      assignments.push(`${column} = $${values.length + 1}`);
      values.push(value);
    };

    if (input.status !== undefined) add("status", input.status);
    if (input.severity !== undefined) add("severity", input.severity);
    if (input.title !== undefined) add("title", input.title);
    if (input.note !== undefined) add("note", input.note);
    if (input.followUpOwner !== undefined) add("follow_up_owner", input.followUpOwner);
    if (input.customerContactRequired !== undefined) add("customer_contact_required", input.customerContactRequired);
    if (input.merchantContactRequired !== undefined) add("merchant_contact_required", input.merchantContactRequired);
    if (input.courierContactRequired !== undefined) add("courier_contact_required", input.courierContactRequired);

    if (input.status === "RESOLVED" || input.status === "CANCELLED") {
      if (!input.resolutionNote?.trim()) {
        throw new UnprocessableEntityException("support_escalation_resolution_note_required");
      }
      add("resolution_note", input.resolutionNote);
      add("resolution_action", input.resolutionAction ?? null);
      add("resolution_reason", input.resolutionReason ?? null);
      assignments.push("resolved_at = now()");
      add("resolved_by", userId);
    } else if (input.status) {
      // Reopening in v1 clears stale closeout metadata so unresolved records do not appear resolved.
      assignments.push("resolution_note = null", "resolution_action = null", "resolution_reason = null", "resolved_by = null", "resolved_at = null");
    } else {
      if (input.resolutionNote !== undefined) add("resolution_note", input.resolutionNote);
      if (input.resolutionAction !== undefined) add("resolution_action", input.resolutionAction);
      if (input.resolutionReason !== undefined) add("resolution_reason", input.resolutionReason);
    }

    const result = await this.pg.query<SupportEscalationRow>(
      `with updated as (
         update public.support_escalations target
         set ${assignments.join(", ")}
         where target.id = $1
           and exists (
             select 1
             from public.org_memberships m
             where m.org_id = target.org_id
               and m.user_id = $2
               and m.is_active = true
               and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
           )
         returning target.id
       )
       ${this.baseSelect()}
       join updated on updated.id = se.id`,
      values
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("support_escalation_not_found");
    }

    return mapSupportEscalation(row);
  }

  private async resolveBusinessEscalationContext(userId: string, input: CreateSupportEscalationInput): Promise<EscalationContext> {
    const contexts: EscalationContext[] = [];

    if (input.orderId) {
      const order = await this.pg.query<{ org_id: string; order_id: string; job_id: string | null }>(
        `select o.org_id, o.id as order_id, o.job_id
         from public.customer_orders o
         where o.id = $1
           and exists (
             select 1
             from public.org_memberships m
             where m.org_id = o.org_id
               and m.user_id = $2
               and m.is_active = true
               and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
           )`,
        [input.orderId, userId]
      );

      if (!order.rows[0]) {
        throw new ForbiddenException("order_not_available_for_support_escalation");
      }

      contexts.push({ orgId: order.rows[0].org_id, orderId: order.rows[0].order_id, jobId: order.rows[0].job_id });
    }

    if (input.jobId) {
      const job = await this.pg.query<{ org_id: string | null; order_id: string | null; job_id: string }>(
        `select j.org_id, co.id as order_id, j.id as job_id
         from public.jobs j
         left join public.customer_orders co on co.job_id = j.id
         where j.id = $1
           and j.org_id is not null
           and exists (
             select 1
             from public.org_memberships m
             where m.org_id = j.org_id
               and m.user_id = $2
               and m.is_active = true
               and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
           )`,
        [input.jobId, userId]
      );

      const row = job.rows[0];
      if (!row?.org_id) {
        throw new ForbiddenException("job_not_available_for_support_escalation");
      }

      contexts.push({ orgId: row.org_id, orderId: row.order_id, jobId: row.job_id });
    }

    if (contexts.length === 0) {
      throw new UnprocessableEntityException("support_escalation_requires_order_or_job");
    }

    const [first, second] = contexts;
    if (second && (first.orgId !== second.orgId || (first.orderId && second.orderId && first.orderId !== second.orderId))) {
      throw new UnprocessableEntityException("support_escalation_reference_mismatch");
    }

    return {
      orgId: first.orgId,
      orderId: input.orderId ?? first.orderId ?? second?.orderId ?? null,
      jobId: input.jobId ?? first.jobId ?? second?.jobId ?? null
    };
  }

  private buildListQuery(scopeToMemberships: boolean) {
    const membershipClause = scopeToMemberships
      ? `and exists (
           select 1
           from public.org_memberships m
           where m.org_id = se.org_id
             and m.user_id = $1
             and m.is_active = true
             and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
         )`
      : "";
    const offset = scopeToMemberships ? 1 : 0;

    return `${this.baseSelect()}
      where ($${offset + 1}::uuid is null or se.order_id = $${offset + 1}::uuid)
        and ($${offset + 2}::uuid is null or se.job_id = $${offset + 2}::uuid)
        and ($${offset + 3}::text is null or se.status = $${offset + 3}::text)
        and ($${offset + 4}::text is null or se.category = $${offset + 4}::text)
        and ($${offset + 5}::text is null or se.severity = $${offset + 5}::text)
        ${membershipClause}
      order by
        case se.severity when 'CRITICAL' then 0 when 'HIGH' then 1 when 'MEDIUM' then 2 else 3 end,
        se.updated_at desc
      limit 100`;
  }

  private baseSelect() {
    return `select
        se.id,
        se.org_id,
        org.name as org_name,
        se.order_id,
        se.job_id,
        se.category,
        se.status,
        se.severity,
        se.title,
        se.note,
        se.follow_up_owner,
        se.customer_contact_required,
        se.merchant_contact_required,
        se.courier_contact_required,
        se.resolution_note,
        se.resolution_action,
        se.resolution_reason,
        se.resolved_by,
        se.resolved_at,
        se.created_by,
        se.created_at,
        se.updated_at,
        r.name as restaurant_name,
        co.customer_name
      from public.support_escalations se
      join public.orgs org on org.id = se.org_id
      left join public.customer_orders co on co.id = se.order_id or (se.order_id is null and co.job_id = se.job_id)
      left join public.restaurants r on r.id = co.restaurant_id`;
  }
}
