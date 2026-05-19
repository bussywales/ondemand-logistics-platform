import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { z } from "zod";
import {
  CreateSupportEscalationSchema,
  SupportEscalationEventListSchema,
  SupportEscalationEventSchema,
  SupportEscalationCategorySchema,
  SupportEscalationListSchema,
  SupportEscalationSchema,
  SupportEscalationSeveritySchema,
  SupportEscalationStatusSchema,
  UpdateSupportEscalationSchema,
  type CreateSupportEscalationInput,
  type SupportEscalationDto,
  type SupportEscalationEventDto,
  type SupportEscalationEventType,
  type SupportEscalationStatus,
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

type SupportEscalationEventRow = {
  id: string;
  support_escalation_id: string;
  org_id: string;
  event_type: string;
  actor_id: string | null;
  actor_label: string | null;
  previous_status: string | null;
  new_status: string | null;
  note: string | null;
  metadata: Record<string, unknown>;
  created_at: string | Date;
};

type SupportEscalationEventInsert = {
  supportEscalationId: string;
  orgId: string;
  eventType: SupportEscalationEventType;
  actorId: string | null;
  previousStatus: SupportEscalationStatus | null;
  newStatus: SupportEscalationStatus | null;
  note: string | null;
  metadata: Record<string, unknown>;
};

type Queryable = Pick<PgService, "query">;

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

function mapSupportEscalationEvent(row: SupportEscalationEventRow): SupportEscalationEventDto {
  return SupportEscalationEventSchema.parse({
    id: row.id,
    supportEscalationId: row.support_escalation_id,
    orgId: row.org_id,
    eventType: row.event_type,
    actorId: row.actor_id,
    actorLabel: row.actor_label,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    note: row.note,
    metadata: row.metadata ?? {},
    createdAt: toIsoDateTime(row.created_at)
  });
}

function isFinalStatus(status: string | null | undefined) {
  return status === "RESOLVED" || status === "CANCELLED";
}

function buildCreateEvent(row: SupportEscalationRow, actorId: string): SupportEscalationEventInsert {
  return {
    supportEscalationId: row.id,
    orgId: row.org_id,
    eventType: "CREATED",
    actorId,
    previousStatus: null,
    newStatus: row.status as SupportEscalationStatus,
    note: "Support escalation created.",
    metadata: {
      title: row.title,
      category: row.category,
      severity: row.severity,
      orderId: row.order_id,
      jobId: row.job_id
    }
  };
}

function buildPatchEvents(
  before: SupportEscalationRow,
  after: SupportEscalationRow,
  input: UpdateSupportEscalationInput,
  actorId: string
): SupportEscalationEventInsert[] {
  const events: SupportEscalationEventInsert[] = [];
  const base = {
    supportEscalationId: after.id,
    orgId: after.org_id,
    actorId
  };

  if (before.status !== after.status) {
    let eventType: SupportEscalationEventType = "STATUS_CHANGED";
    if (after.status === "RESOLVED") eventType = "RESOLVED";
    if (after.status === "CANCELLED") eventType = "CANCELLED";
    if (isFinalStatus(before.status) && !isFinalStatus(after.status)) eventType = "REOPENED";

    events.push({
      ...base,
      eventType,
      previousStatus: before.status as SupportEscalationStatus,
      newStatus: after.status as SupportEscalationStatus,
      note: eventType === "REOPENED" ? "Support escalation reopened and closeout metadata cleared." : `Status changed to ${after.status.toLowerCase().replaceAll("_", " ")}.`,
      metadata: {
        previousStatus: before.status,
        newStatus: after.status,
        ...(isFinalStatus(after.status)
          ? {
              resolutionAction: after.resolution_action,
              resolutionReason: after.resolution_reason,
              resolutionNote: after.resolution_note
            }
          : {})
      }
    });
  }

  if (input.note !== undefined && before.note !== after.note) {
    events.push({
      ...base,
      eventType: "NOTE_UPDATED",
      previousStatus: before.status as SupportEscalationStatus,
      newStatus: after.status as SupportEscalationStatus,
      note: "Support note updated.",
      metadata: { previousNote: before.note, newNote: after.note }
    });
  }

  if (input.followUpOwner !== undefined && before.follow_up_owner !== after.follow_up_owner) {
    events.push({
      ...base,
      eventType: "OWNER_UPDATED",
      previousStatus: before.status as SupportEscalationStatus,
      newStatus: after.status as SupportEscalationStatus,
      note: "Follow-up owner updated.",
      metadata: { previousOwner: before.follow_up_owner, newOwner: after.follow_up_owner }
    });
  }

  const contactFlagsChanged =
    (input.customerContactRequired !== undefined && before.customer_contact_required !== after.customer_contact_required) ||
    (input.merchantContactRequired !== undefined && before.merchant_contact_required !== after.merchant_contact_required) ||
    (input.courierContactRequired !== undefined && before.courier_contact_required !== after.courier_contact_required);
  if (contactFlagsChanged) {
    events.push({
      ...base,
      eventType: "CONTACT_FLAGS_UPDATED",
      previousStatus: before.status as SupportEscalationStatus,
      newStatus: after.status as SupportEscalationStatus,
      note: "Contact requirements updated.",
      metadata: {
        previous: {
          customerContactRequired: before.customer_contact_required,
          merchantContactRequired: before.merchant_contact_required,
          courierContactRequired: before.courier_contact_required
        },
        next: {
          customerContactRequired: after.customer_contact_required,
          merchantContactRequired: after.merchant_contact_required,
          courierContactRequired: after.courier_contact_required
        }
      }
    });
  }

  const resolutionChanged =
    (input.resolutionNote !== undefined && before.resolution_note !== after.resolution_note) ||
    (input.resolutionAction !== undefined && before.resolution_action !== after.resolution_action) ||
    (input.resolutionReason !== undefined && before.resolution_reason !== after.resolution_reason);
  const statusEventAlreadyCapturedResolution = before.status !== after.status && isFinalStatus(after.status);
  if (resolutionChanged && !statusEventAlreadyCapturedResolution) {
    events.push({
      ...base,
      eventType: "RESOLUTION_UPDATED",
      previousStatus: before.status as SupportEscalationStatus,
      newStatus: after.status as SupportEscalationStatus,
      note: "Resolution closeout context updated.",
      metadata: {
        resolutionAction: after.resolution_action,
        resolutionReason: after.resolution_reason,
        resolutionNote: after.resolution_note
      }
    });
  }

  return events;
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

  async listBusinessEscalationEvents(userId: string, escalationId: string) {
    const result = await this.pg.query<SupportEscalationEventRow>(
      `${this.baseEventSelect()}
       where see.support_escalation_id = $1
         and exists (
           select 1
           from public.org_memberships m
           where m.org_id = see.org_id
             and m.user_id = $2
             and m.is_active = true
             and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
         )
       order by see.created_at desc
       limit 100`,
      [escalationId, userId]
    );

    return SupportEscalationEventListSchema.parse({ items: result.rows.map(mapSupportEscalationEvent) });
  }

  async listAdminEscalationEvents(escalationId: string) {
    const result = await this.pg.query<SupportEscalationEventRow>(
      `${this.baseEventSelect()}
       where see.support_escalation_id = $1
       order by see.created_at desc
       limit 100`,
      [escalationId]
    );

    return SupportEscalationEventListSchema.parse({ items: result.rows.map(mapSupportEscalationEvent) });
  }

  async createBusinessEscalation(userId: string, rawInput: unknown) {
    const input = CreateSupportEscalationSchema.parse(rawInput);
    const context = await this.resolveBusinessEscalationContext(userId, input);
    const row = await this.pg.withTransaction(async (client) => {
      const inserted = await client.query<{ id: string }>(
        `insert into public.support_escalations (
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
        returning id`,
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

      const insertedId = inserted.rows[0]?.id;
      if (!insertedId) {
        throw new UnprocessableEntityException("support_escalation_create_failed");
      }

      const nextRow = await this.getEscalationById(client, insertedId);
      if (!nextRow) {
        throw new UnprocessableEntityException("support_escalation_create_failed");
      }

      await this.insertEvents(client, [buildCreateEvent(nextRow, userId)]);
      return nextRow;
    });

    return mapSupportEscalation(row);
  }

  async updateBusinessEscalation(userId: string, escalationId: string, rawInput: unknown) {
    const parsedInput = UpdateSupportEscalationSchema.safeParse(rawInput);
    if (!parsedInput.success) {
      throw new UnprocessableEntityException(parsedInput.error.issues[0]?.message ?? "support_escalation_update_invalid");
    }
    const input = parsedInput.data;
    const row = await this.pg.withTransaction(async (client) => {
      const beforeResult = await client.query<SupportEscalationRow>(
        `${this.baseSelect()}
         where se.id = $1
           and exists (
             select 1
             from public.org_memberships m
             where m.org_id = se.org_id
               and m.user_id = $2
               and m.is_active = true
               and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
           )
         limit 1`,
        [escalationId, userId]
      );

      const before = beforeResult.rows[0];
      if (!before) {
        throw new NotFoundException("support_escalation_not_found");
      }

      const assignments: string[] = [];
      const values: unknown[] = [escalationId];
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

      const updated = await client.query<{ id: string }>(
        `update public.support_escalations
         set ${assignments.join(", ")}
         where id = $1
         returning id`,
        values
      );

      const updatedId = updated.rows[0]?.id;
      if (!updatedId) {
        throw new NotFoundException("support_escalation_not_found");
      }

      const after = await this.getEscalationById(client, updatedId);
      if (!after) {
        throw new NotFoundException("support_escalation_not_found");
      }

      await this.insertEvents(client, buildPatchEvents(before, after, input, userId));
      return after;
    });

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

  private async getEscalationById(queryable: Queryable, id: string) {
    const result = await queryable.query<SupportEscalationRow>(
      `${this.baseSelect()}
       where se.id = $1
       limit 1`,
      [id]
    );

    return result.rows[0] ?? null;
  }

  private async insertEvents(queryable: Queryable, events: SupportEscalationEventInsert[]) {
    for (const event of events) {
      await queryable.query(
        `insert into public.support_escalation_events (
          support_escalation_id,
          org_id,
          event_type,
          actor_id,
          actor_label,
          previous_status,
          new_status,
          note,
          metadata
        )
        values ($1, $2, $3, $4, null, $5, $6, $7, $8::jsonb)`,
        [
          event.supportEscalationId,
          event.orgId,
          event.eventType,
          event.actorId,
          event.previousStatus,
          event.newStatus,
          event.note,
          JSON.stringify(event.metadata)
        ]
      );
    }
  }

  private baseEventSelect() {
    return `select
        see.id,
        see.support_escalation_id,
        see.org_id,
        see.event_type,
        see.actor_id,
        see.actor_label,
        see.previous_status,
        see.new_status,
        see.note,
        see.metadata,
        see.created_at
      from public.support_escalation_events see`;
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
