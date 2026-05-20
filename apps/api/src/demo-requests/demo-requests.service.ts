import { Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import type { PoolClient, QueryResult, QueryResultRow } from "pg";
import { z } from "zod";
import {
  CreateDemoRequestSchema,
  DemoRequestEventListSchema,
  DemoRequestEventSchema,
  DemoRequestFollowUpPrioritySchema,
  DemoRequestListSchema,
  DemoRequestSchema,
  DemoRequestInterestTypeSchema,
  DemoRequestStatusSchema,
  type DemoRequestNotificationStatusDto,
  UpdateDemoRequestSchema,
  type CreateDemoRequestInput,
  type DemoRequestDto,
  type DemoRequestEventDto,
  type DemoRequestEventType,
  type DemoRequestStatus,
  type UpdateDemoRequestInput
} from "@shipwright/contracts";
import { toIsoDateTime } from "../database/mapper.js";
import { PgService } from "../database/pg.service.js";

const ListDemoRequestsFilterSchema = z.object({
  status: DemoRequestStatusSchema.optional(),
  priority: DemoRequestFollowUpPrioritySchema.optional(),
  owner: z.string().trim().min(2).max(160).optional(),
  due: z.enum(["overdue", "today", "upcoming", "none"]).optional(),
  interestType: DemoRequestInterestTypeSchema.optional()
});

type DemoRequestRow = {
  id: string;
  name: string;
  email: string;
  organisation: string | null;
  role: string | null;
  interest_type: string;
  message: string | null;
  source: string | null;
  status: string;
  admin_note: string | null;
  assigned_owner: string | null;
  next_follow_up_at: string | Date | null;
  follow_up_priority: string | null;
  last_contacted_at: string | Date | null;
  close_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
  notification_outbox_id?: string | null;
  notification_event_type?: string | null;
  notification_retry_count?: string | number | null;
  notification_last_error?: string | null;
  notification_processed_at?: string | Date | null;
  notification_next_attempt_at?: string | Date | null;
  notification_created_at?: string | Date | null;
  notification_audit_action?: string | null;
  notification_audit_metadata?: Record<string, unknown> | string | null;
  notification_audit_created_at?: string | Date | null;
};

type DemoRequestEventRow = {
  id: string;
  demo_request_id: string;
  event_type: string;
  actor_id: string | null;
  actor_label: string | null;
  previous_status: string | null;
  new_status: string | null;
  note: string | null;
  metadata: Record<string, unknown> | string | null;
  created_at: string | Date;
};

type DemoRequestEventInsert = {
  eventType: DemoRequestEventType;
  previousStatus?: DemoRequestStatus | null;
  newStatus?: DemoRequestStatus | null;
  note?: string | null;
  metadata?: Record<string, unknown>;
};

type Queryable = {
  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
};

function nullableText(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function nullableDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value);
}

function valuesDiffer(left: unknown, right: unknown) {
  return (left ?? null) !== (right ?? null);
}

function metadataFromRow(row: DemoRequestRow) {
  return {
    title: row.name,
    email: row.email,
    interestType: row.interest_type,
    organisation: row.organisation
  };
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

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function safeErrorSummary(value: string | null | undefined) {
  const text = value?.trim();
  if (!text) return null;
  return text.length > 180 ? `${text.slice(0, 180)}...` : text;
}

function mapDemoRequestNotification(row: DemoRequestRow): DemoRequestNotificationStatusDto | null {
  const hasOutbox = Boolean(row.notification_outbox_id);
  const hasAudit = Boolean(row.notification_audit_action);
  if (!hasOutbox && !hasAudit) {
    return null;
  }

  const metadata = parseMetadata(row.notification_audit_metadata);
  const sentChannels = stringArray(metadata.sentChannels);
  const skippedChannels = stringArray(metadata.skippedChannels);
  const channelList = sentChannels.length ? sentChannels : skippedChannels.map((item) => item.split(":")[0]).filter(Boolean);
  const channel = channelList.length ? Array.from(new Set(channelList)).join(", ") : null;
  const provider = typeof metadata.emailProvider === "string" ? metadata.emailProvider : typeof metadata.provider === "string" ? metadata.provider : null;

  let status: DemoRequestNotificationStatusDto["status"] = "unknown";
  if (row.notification_audit_action === "external_notification_sent") {
    status = "sent";
  } else if (row.notification_audit_action === "external_notification_skipped") {
    status = "skipped";
  } else if (row.notification_last_error && row.notification_processed_at) {
    status = "failed";
  } else if (row.notification_last_error) {
    status = "retrying";
  } else if (hasOutbox && !row.notification_processed_at) {
    status = "pending";
  } else if (hasOutbox && row.notification_processed_at) {
    status = "sent";
  }

  return {
    status,
    channel,
    provider,
    lastAttemptAt: row.notification_audit_created_at
      ? toIsoDateTime(row.notification_audit_created_at)
      : row.notification_processed_at
        ? toIsoDateTime(row.notification_processed_at)
        : row.notification_next_attempt_at
          ? toIsoDateTime(row.notification_next_attempt_at)
          : row.notification_created_at
            ? toIsoDateTime(row.notification_created_at)
            : null,
    lastEventType: row.notification_event_type ?? null,
    outboxMessageId: row.notification_outbox_id ?? null,
    retryCount: Number(row.notification_retry_count ?? 0),
    safeErrorSummary: safeErrorSummary(row.notification_last_error)
  };
}

function mapDemoRequest(row: DemoRequestRow): DemoRequestDto {
  return DemoRequestSchema.parse({
    id: row.id,
    name: row.name,
    email: row.email,
    organisation: row.organisation,
    role: row.role,
    interestType: row.interest_type,
    message: row.message,
    source: row.source,
    status: row.status,
    adminNote: row.admin_note,
    assignedOwner: row.assigned_owner ?? null,
    nextFollowUpAt: row.next_follow_up_at ? toIsoDateTime(row.next_follow_up_at) : null,
    followUpPriority: row.follow_up_priority ?? null,
    lastContactedAt: row.last_contacted_at ? toIsoDateTime(row.last_contacted_at) : null,
    closeReason: row.close_reason ?? null,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at ? toIsoDateTime(row.reviewed_at) : null,
    notification: mapDemoRequestNotification(row),
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at)
  });
}

function mapDemoRequestEvent(row: DemoRequestEventRow): DemoRequestEventDto {
  return DemoRequestEventSchema.parse({
    id: row.id,
    demoRequestId: row.demo_request_id,
    eventType: row.event_type,
    actorId: row.actor_id,
    actorLabel: row.actor_label,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    note: row.note,
    metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata ?? {},
    createdAt: toIsoDateTime(row.created_at)
  });
}

async function enqueueAdminDemoRequestNotification(client: PoolClient, row: DemoRequestRow) {
  await client.query(
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
      "demo_request",
      row.id,
      "NOTIFY_ADMIN_DEMO_REQUEST_CREATED",
      JSON.stringify({
        demoRequestId: row.id,
        interestType: row.interest_type,
        organisation: row.organisation,
        requesterName: row.name,
        requesterEmail: row.email,
        createdAt: toIsoDateTime(row.created_at)
      }),
      `demo-request-created:${row.id}`
    ]
  );
}

async function enqueueDemoRequestUpdateOutbox(
  client: PoolClient,
  row: DemoRequestRow,
  eventType: "DEMO_REQUEST_STATUS_UPDATED" | "DEMO_REQUEST_FOLLOW_UP_SCHEDULED" | "DEMO_REQUEST_CONTACT_RECORDED",
  payload: Record<string, unknown>
) {
  await client.query(
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
      "demo_request",
      row.id,
      eventType,
      JSON.stringify({
        demoRequestId: row.id,
        status: row.status,
        interestType: row.interest_type,
        requesterEmail: row.email,
        updatedAt: toIsoDateTime(row.updated_at),
        ...payload
      }),
      `${eventType.toLowerCase()}:${row.id}:${toIsoDateTime(row.updated_at)}`
    ]
  );
}

@Injectable()
export class DemoRequestsService {
  constructor(private readonly pg: PgService) {}

  async createDemoRequest(rawInput: unknown): Promise<DemoRequestDto> {
    const parsed = CreateDemoRequestSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new UnprocessableEntityException({ message: "invalid_demo_request_payload", issues: parsed.error.issues });
    }

    const input = parsed.data;
    if (input.website && input.website.trim().length > 0) {
      throw new UnprocessableEntityException("demo_request_rejected");
    }

    return this.pg.withTransaction(async (client) => {
      const result = await client.query<DemoRequestRow>(
        `insert into public.demo_requests (
            name,
            email,
            organisation,
            role,
            interest_type,
            message,
            source
         )
         values ($1, $2, $3, $4, $5, $6, coalesce($7, 'landing_page'))
         returning *`,
        [
          input.name.trim(),
          input.email.trim().toLowerCase(),
          nullableText(input.organisation),
          nullableText(input.role),
          input.interestType,
          nullableText(input.message),
          nullableText(input.source)
        ]
      );

      const row = result.rows[0];
      if (!row) {
        throw new UnprocessableEntityException("demo_request_create_failed");
      }

      await enqueueAdminDemoRequestNotification(client, row);
      await this.insertEvent(client, row.id, null, {
        eventType: "CREATED",
        newStatus: "NEW",
        note: "Demo request created from public intake.",
        metadata: metadataFromRow(row)
      });

      return mapDemoRequest(row);
    });
  }

  async listAdminDemoRequests(rawQuery: Record<string, string | undefined>) {
    const parsed = ListDemoRequestsFilterSchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw new UnprocessableEntityException("invalid_demo_request_filter");
    }

    const filters = parsed.data;
    const values: unknown[] = [];
    const where: string[] = [];
    if (filters.status) {
      values.push(filters.status);
      where.push(`d.status = $${values.length}`);
    }
    if (filters.priority) {
      values.push(filters.priority);
      where.push(`d.follow_up_priority = $${values.length}`);
    }
    if (filters.owner) {
      values.push(filters.owner.toLowerCase());
      where.push(`lower(d.assigned_owner) = $${values.length}`);
    }
    if (filters.interestType) {
      values.push(filters.interestType);
      where.push(`d.interest_type = $${values.length}`);
    }
    if (filters.due === "overdue") {
      where.push(`d.next_follow_up_at is not null and d.next_follow_up_at < now() and d.status not in ('CLOSED', 'SPAM')`);
    }
    if (filters.due === "today") {
      where.push(`d.next_follow_up_at >= date_trunc('day', now()) and d.next_follow_up_at < date_trunc('day', now()) + interval '1 day' and d.status not in ('CLOSED', 'SPAM')`);
    }
    if (filters.due === "upcoming") {
      where.push(`d.next_follow_up_at is not null and d.next_follow_up_at >= now() and d.status not in ('CLOSED', 'SPAM')`);
    }
    if (filters.due === "none") {
      where.push(`d.next_follow_up_at is null and d.status not in ('CLOSED', 'SPAM')`);
    }

    const result = await this.pg.query<DemoRequestRow>(
      `select d.*,
              latest_outbox.id as notification_outbox_id,
              latest_outbox.event_type as notification_event_type,
              latest_outbox.retry_count as notification_retry_count,
              latest_outbox.last_error as notification_last_error,
              latest_outbox.processed_at as notification_processed_at,
              latest_outbox.next_attempt_at as notification_next_attempt_at,
              latest_outbox.created_at as notification_created_at,
              latest_audit.action as notification_audit_action,
              latest_audit.metadata as notification_audit_metadata,
              latest_audit.created_at as notification_audit_created_at
       from public.demo_requests d
       left join lateral (
         select id, event_type, retry_count, last_error, processed_at, next_attempt_at, created_at
         from public.outbox_messages om
         where om.aggregate_type = 'demo_request'
           and om.aggregate_id = d.id
           and om.event_type in (
             'NOTIFY_ADMIN_DEMO_REQUEST_CREATED',
             'DEMO_REQUEST_STATUS_UPDATED',
             'DEMO_REQUEST_FOLLOW_UP_SCHEDULED',
             'DEMO_REQUEST_CONTACT_RECORDED'
           )
         order by om.created_at desc
         limit 1
       ) latest_outbox on true
       left join lateral (
         select action, metadata, created_at
         from public.audit_log a
         where a.entity_type = 'demo_request'
           and a.entity_id = d.id
           and a.action in ('external_notification_sent', 'external_notification_skipped')
         order by a.created_at desc
         limit 1
       ) latest_audit on true
       ${where.length ? `where ${where.join(" and ")}` : ""}
       order by d.created_at desc
       limit 100`,
      values
    );

    return DemoRequestListSchema.parse({ items: result.rows.map(mapDemoRequest) });
  }

  async updateAdminDemoRequest(userId: string, id: string, rawInput: unknown): Promise<DemoRequestDto> {
    const parsed = UpdateDemoRequestSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new UnprocessableEntityException(parsed.error.issues[0]?.message ?? "invalid_demo_request_update");
    }

    const input: UpdateDemoRequestInput = parsed.data;

    return this.pg.withTransaction(async (client) => {
      const previous = await this.getDemoRequestById(client, id);
      if (!previous) {
        throw new NotFoundException("demo_request_not_found");
      }

      const result = await client.query<DemoRequestRow>(
        `update public.demo_requests
         set status = coalesce($2, status),
             admin_note = case when $3::boolean then $4 else admin_note end,
             assigned_owner = case when $5::boolean then $6 else assigned_owner end,
             next_follow_up_at = case when $7::boolean then $8 else next_follow_up_at end,
             follow_up_priority = case when $9::boolean then $10 else follow_up_priority end,
             last_contacted_at = case when $11::boolean then $12 else last_contacted_at end,
             close_reason = case when $13::boolean then $14 else close_reason end,
             reviewed_by = $15,
             reviewed_at = now()
         where id = $1
         returning *`,
        [
          id,
          input.status ?? null,
          Object.prototype.hasOwnProperty.call(input, "adminNote"),
          nullableText(input.adminNote),
          Object.prototype.hasOwnProperty.call(input, "assignedOwner"),
          nullableText(input.assignedOwner),
          Object.prototype.hasOwnProperty.call(input, "nextFollowUpAt"),
          nullableDate(input.nextFollowUpAt),
          Object.prototype.hasOwnProperty.call(input, "followUpPriority"),
          input.followUpPriority ?? null,
          Object.prototype.hasOwnProperty.call(input, "lastContactedAt"),
          nullableDate(input.lastContactedAt),
          Object.prototype.hasOwnProperty.call(input, "closeReason"),
          nullableText(input.closeReason),
          userId
        ]
      );

      const row = result.rows[0];
      if (!row) {
        throw new NotFoundException("demo_request_not_found");
      }

      const events = this.buildUpdateEvents(previous, row, input);
      for (const event of events) {
        await this.insertEvent(client, row.id, userId, event);
      }
      await this.enqueueUpdateOutboxEvents(client, previous, row);

      return mapDemoRequest(row);
    });
  }

  async listAdminDemoRequestEvents(id: string) {
    const request = await this.getDemoRequestById(this.pg, id);
    if (!request) {
      throw new NotFoundException("demo_request_not_found");
    }

    const result = await this.pg.query<DemoRequestEventRow>(
      `select *
       from public.demo_request_events
       where demo_request_id = $1
       order by created_at desc
       limit 100`,
      [id]
    );

    return DemoRequestEventListSchema.parse({ items: result.rows.map(mapDemoRequestEvent) });
  }

  private async getDemoRequestById(queryable: Queryable, id: string) {
    const result = await queryable.query<DemoRequestRow>(
      `select *
       from public.demo_requests
       where id = $1
       limit 1`,
      [id]
    );

    return result.rows[0] ?? null;
  }

  private async insertEvent(
    queryable: Queryable,
    demoRequestId: string,
    actorId: string | null,
    event: DemoRequestEventInsert
  ) {
    await queryable.query(
      `insert into public.demo_request_events (
         demo_request_id,
         event_type,
         actor_id,
         actor_label,
         previous_status,
         new_status,
         note,
         metadata
       )
       values ($1, $2, $3, null, $4, $5, $6, $7::jsonb)`,
      [
        demoRequestId,
        event.eventType,
        actorId,
        event.previousStatus ?? null,
        event.newStatus ?? null,
        event.note ?? null,
        JSON.stringify(event.metadata ?? {})
      ]
    );
  }

  private buildUpdateEvents(previous: DemoRequestRow, next: DemoRequestRow, input: UpdateDemoRequestInput) {
    const events: DemoRequestEventInsert[] = [];

    if (previous.status !== next.status) {
      const wasClosed = previous.status === "CLOSED" || previous.status === "SPAM";
      const isClosed = next.status === "CLOSED" || next.status === "SPAM";
      events.push({
        eventType: wasClosed && !isClosed ? "REOPENED" : isClosed ? "CLOSED" : "STATUS_CHANGED",
        previousStatus: previous.status as DemoRequestStatus,
        newStatus: next.status as DemoRequestStatus,
        note: input.adminNote ?? null,
        metadata: { previousStatus: previous.status, newStatus: next.status }
      });
    }

    if (valuesDiffer(previous.admin_note, next.admin_note)) {
      events.push({ eventType: "NOTE_UPDATED", note: next.admin_note, metadata: { previousPresent: Boolean(previous.admin_note), nextPresent: Boolean(next.admin_note) } });
    }
    if (valuesDiffer(previous.assigned_owner, next.assigned_owner)) {
      events.push({ eventType: "OWNER_ASSIGNED", note: next.assigned_owner ? `Assigned to ${next.assigned_owner}.` : "Owner cleared.", metadata: { assignedOwner: next.assigned_owner } });
    }
    if (valuesDiffer(previous.next_follow_up_at ? toIsoDateTime(previous.next_follow_up_at) : null, next.next_follow_up_at ? toIsoDateTime(next.next_follow_up_at) : null)) {
      events.push({ eventType: "FOLLOW_UP_SCHEDULED", note: next.next_follow_up_at ? `Follow-up scheduled for ${toIsoDateTime(next.next_follow_up_at)}.` : "Follow-up date cleared.", metadata: { nextFollowUpAt: next.next_follow_up_at ? toIsoDateTime(next.next_follow_up_at) : null } });
    }
    if (valuesDiffer(previous.last_contacted_at ? toIsoDateTime(previous.last_contacted_at) : null, next.last_contacted_at ? toIsoDateTime(next.last_contacted_at) : null)) {
      events.push({ eventType: "CONTACT_RECORDED", note: next.last_contacted_at ? `Contact recorded at ${toIsoDateTime(next.last_contacted_at)}.` : "Last contacted date cleared.", metadata: { lastContactedAt: next.last_contacted_at ? toIsoDateTime(next.last_contacted_at) : null } });
    }
    if (valuesDiffer(previous.follow_up_priority, next.follow_up_priority)) {
      events.push({ eventType: "PRIORITY_CHANGED", note: next.follow_up_priority ? `Priority set to ${next.follow_up_priority}.` : "Priority cleared.", metadata: { followUpPriority: next.follow_up_priority } });
    }

    return events;
  }

  private async enqueueUpdateOutboxEvents(client: PoolClient, previous: DemoRequestRow, next: DemoRequestRow) {
    if (previous.status !== next.status) {
      await enqueueDemoRequestUpdateOutbox(client, next, "DEMO_REQUEST_STATUS_UPDATED", {
        previousStatus: previous.status,
        newStatus: next.status
      });
    }
    if (valuesDiffer(previous.next_follow_up_at ? toIsoDateTime(previous.next_follow_up_at) : null, next.next_follow_up_at ? toIsoDateTime(next.next_follow_up_at) : null)) {
      await enqueueDemoRequestUpdateOutbox(client, next, "DEMO_REQUEST_FOLLOW_UP_SCHEDULED", {
        nextFollowUpAt: next.next_follow_up_at ? toIsoDateTime(next.next_follow_up_at) : null
      });
    }
    if (valuesDiffer(previous.last_contacted_at ? toIsoDateTime(previous.last_contacted_at) : null, next.last_contacted_at ? toIsoDateTime(next.last_contacted_at) : null)) {
      await enqueueDemoRequestUpdateOutbox(client, next, "DEMO_REQUEST_CONTACT_RECORDED", {
        lastContactedAt: next.last_contacted_at ? toIsoDateTime(next.last_contacted_at) : null
      });
    }
  }
}

export type { CreateDemoRequestInput, DemoRequestStatus, UpdateDemoRequestInput };
