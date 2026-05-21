import { Injectable } from "@nestjs/common";
import {
  AdminInterventionItemSchema,
  AdminJobListSchema,
  AdminJobSummarySchema,
  AdminNotificationDiagnosticEventSchema,
  AdminOrderListSchema,
  AdminOrderSummarySchema,
  AdminOutboxListSchema,
  AdminOutboxItemSchema,
  AdminOverviewSchema,
  CreateNotificationTestSchema,
  NotificationDiagnosticsSchema,
  NotificationTestResponseSchema,
  type AdminInterventionItemDto,
  type AdminInterventionSeverity,
  type AdminDriverReadinessStatus,
  type AdminDriverReadinessItemDto,
  type AdminDriverReadinessChecklistItemDto,
  type AdminNotificationDiagnosticEventDto,
  AdminDriverReadinessListSchema,
  type AdminJobSummaryDto,
  type AdminOrderSummaryDto,
  type AdminOutboxItemDto,
  type AdminOverviewDto,
  type NotificationDiagnosticsDto,
  type NotificationTestResponseDto
} from "@shipwright/contracts";
import { randomUUID } from "node:crypto";
import { UnprocessableEntityException } from "@nestjs/common";
import { toIsoDateTime, toNullableIsoDateTime } from "../database/mapper.js";
import { PgService } from "../database/pg.service.js";
import {
  SchemaCompatibilityError,
  SchemaReadinessService
} from "../database/schema-readiness.service.js";

type AdminJobRow = {
  id: string;
  org_id: string | null;
  org_name: string | null;
  restaurant_name: string | null;
  restaurant_slug: string | null;
  status: AdminJobSummaryDto["status"];
  customer_name: string | null;
  driver_name: string | null;
  vehicle_required: AdminJobSummaryDto["vehicleRequired"];
  payment_id: string | null;
  payment_status: AdminJobSummaryDto["paymentStatus"];
  pickup_address: string;
  dropoff_address: string;
  eta_minutes: number;
  total_cents: number;
  currency: string;
  created_at: string | Date;
  updated_at: string | Date;
};

type AdminOrderRow = {
  id: string;
  org_id: string;
  org_name: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_slug: string;
  status: AdminOrderSummaryDto["status"] | "COMPLETED";
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address_summary: string;
  total_cents: number;
  currency: string;
  payment_id: string;
  payment_status: AdminOrderSummaryDto["paymentStatus"];
  job_id: string;
  job_status: AdminOrderSummaryDto["jobStatus"];
  created_at: string | Date;
  updated_at: string | Date;
};

type OutboxRow = {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  retry_count: number;
  last_error: string | null;
  processed_at: string | Date | null;
  next_attempt_at: string | Date;
  created_at: string | Date;
};

type NotificationAuditRow = {
  id: string;
  org_id: string | null;
  org_name: string | null;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | Date;
};

type NotificationDiagnosticRow = {
  id: string;
  outbox_message_id: string | null;
  event_type: string;
  notification_type: string | null;
  channel: string | null;
  status: "pending" | "sent" | "skipped" | "failed" | "retrying";
  provider: string | null;
  last_attempt_at: string | Date | null;
  retry_count: string | number;
  safe_error_summary: string | null;
  created_at: string | Date;
};

type AdminDriverReadinessRow = {
  driver_id: string;
  driver_name: string | null;
  availability_status: string | null;
  verification_status: string | null;
  vehicle_type: string | null;
  active_job_id: string | null;
  active_job_status: string | null;
  org_id: string | null;
  org_name: string | null;
  fleet_org_id: string | null;
  fleet_org_name: string | null;
  fleet_role: string | null;
  restaurant_name: string | null;
  restaurant_slug: string | null;
  last_location_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
};

const ACTIVE_JOB_STATUSES = [
  "REQUESTED",
  "ASSIGNED",
  "EN_ROUTE_PICKUP",
  "PICKED_UP",
  "EN_ROUTE_DROP",
  "DISPATCH_FAILED"
] as const;

const DRIVER_LOCATION_RECENT_MINUTES = 15;
const ADMIN_NOTIFICATION_EVENT_TYPES = [
  "NOTIFY_ADMIN_DEMO_REQUEST_CREATED",
  "DEMO_REQUEST_STATUS_UPDATED",
  "DEMO_REQUEST_FOLLOW_UP_SCHEDULED",
  "DEMO_REQUEST_CONTACT_RECORDED",
  "ORG_INVITE_CREATED",
  "ORG_INVITE_RESENT",
  "ORG_INVITE_CANCELLED",
  "TEST_ADMIN_NOTIFICATION"
];

function normalizeOrderStatus(status: AdminOrderRow["status"]) {
  return status === "COMPLETED" ? "FULFILLED" : status;
}

function isRecentLocation(value: string | Date | null, now = Date.now()) {
  if (!value) {
    return false;
  }

  return now - new Date(value).getTime() <= DRIVER_LOCATION_RECENT_MINUTES * 60 * 1000;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly pg: PgService,
    private readonly schemaReadiness: SchemaReadinessService
  ) {}

  async getOverview(): Promise<AdminOverviewDto> {
    const [interventionQueue, activeJobs, recentOrders, health] = await Promise.all([
      this.listInterventionQueue(),
      this.listJobs(),
      this.listOrders(),
      this.getSystemHealth()
    ]);

    return AdminOverviewSchema.parse({
      interventionQueue: interventionQueue.slice(0, 20),
      activeJobs: activeJobs.slice(0, 20),
      recentOrders: recentOrders.slice(0, 20),
      health
    });
  }

  async listJobs() {
    const result = await this.pg.query<AdminJobRow>(
      `select
          j.id,
          j.org_id,
          o.name as org_name,
          r.name as restaurant_name,
          r.slug as restaurant_slug,
          j.status::text as status,
          cu.display_name as customer_name,
          du.display_name as driver_name,
          j.vehicle_required::text as vehicle_required,
          p.id as payment_id,
          p.status::text as payment_status,
          j.pickup_address,
          j.dropoff_address,
          j.eta_minutes,
          coalesce(p.customer_total_cents, j.customer_total_cents) as total_cents,
          coalesce(p.currency, 'gbp') as currency,
          j.created_at,
          j.updated_at
       from public.jobs j
       left join public.orgs o on o.id = j.org_id
       left join public.customer_orders coo on coo.job_id = j.id
       left join public.restaurants r on r.id = coo.restaurant_id
       left join public.users cu on cu.id = j.consumer_id
       left join public.drivers d on d.id = j.assigned_driver_id
       left join public.users du on du.id = d.user_id
       left join public.payments p on p.job_id = j.id
       where j.org_id is not null
         and j.status::text = any($1::text[])
       order by j.updated_at desc
       limit 50`,
      [ACTIVE_JOB_STATUSES]
    );

    return AdminJobListSchema.parse({
      items: result.rows.map((row) => this.mapJob(row))
    }).items;
  }

  async listOrders() {
    const result = await this.pg.query<AdminOrderRow>(
      `select
          o.id,
          o.org_id,
          org.name as org_name,
          r.id as restaurant_id,
          r.name as restaurant_name,
          r.slug as restaurant_slug,
          o.status::text as status,
          o.customer_name,
          o.customer_email,
          o.customer_phone,
          coalesce(nullif(split_part(o.delivery_address, ',', 1), ''), o.delivery_address) as delivery_address_summary,
          o.total_cents,
          o.currency,
          p.id as payment_id,
          p.status::text as payment_status,
          j.id as job_id,
          j.status::text as job_status,
          o.created_at,
          o.updated_at
       from public.customer_orders o
       join public.orgs org on org.id = o.org_id
       join public.restaurants r on r.id = o.restaurant_id
       join public.jobs j on j.id = o.job_id
       join public.payments p on p.id = o.payment_id
       order by o.created_at desc
       limit 50`
    );

    return AdminOrderListSchema.parse({
      items: result.rows.map((row) => this.mapOrder(row))
    }).items;
  }

  async listOutbox() {
    const result = await this.pg.query<OutboxRow>(
      `select id, aggregate_type, aggregate_id, event_type, retry_count, last_error, processed_at, next_attempt_at, created_at
       from public.outbox_messages
       where processed_at is null
          or retry_count > 0
          or last_error is not null
       order by created_at desc
       limit 50`
    );

    return AdminOutboxListSchema.parse({
      items: result.rows.map((row) => this.mapOutbox(row))
    }).items;
  }

  async getNotificationDiagnostics(): Promise<NotificationDiagnosticsDto> {
    const [counts, events, tests] = await Promise.all([
      this.getNotificationCounts(),
      this.listNotificationDiagnosticEvents(false),
      this.listNotificationDiagnosticEvents(true)
    ]);

    return NotificationDiagnosticsSchema.parse({
      configuration: {
        emailConfigured: Boolean(process.env.RESEND_API_KEY?.trim() && process.env.NOTIFICATION_FROM_EMAIL?.trim() && process.env.ADMIN_NOTIFICATION_EMAIL?.trim()),
        webhookConfigured: Boolean(process.env.DEMO_REQUEST_WEBHOOK_URL?.trim()),
        adminEmailConfigured: Boolean(process.env.ADMIN_NOTIFICATION_EMAIL?.trim()),
        fromEmailConfigured: Boolean(process.env.NOTIFICATION_FROM_EMAIL?.trim())
      },
      counts,
      recentEvents: events,
      recentTestEvents: tests
    });
  }

  async createNotificationTest(input: unknown, actorId: string): Promise<NotificationTestResponseDto> {
    const parsed = CreateNotificationTestSchema.safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        message: "invalid_notification_test",
        issues: parsed.error.issues
      });
    }

    const outboxId = randomUUID();
    const aggregateId = randomUUID();
    const createdAt = new Date().toISOString();
    await this.pg.query(
      `insert into public.outbox_messages (
         id,
         aggregate_type,
         aggregate_id,
         event_type,
         payload,
         idempotency_key
       )
       values ($1, $2, $3, 'TEST_ADMIN_NOTIFICATION', $4::jsonb, $5)
       on conflict (event_type, idempotency_key) do nothing`,
      [
        outboxId,
        "admin_notification_test",
        aggregateId,
        JSON.stringify({
          test: true,
          notificationType: parsed.data.notificationType,
          requestedChannel: parsed.data.channel,
          recipientEmail: parsed.data.recipientEmail ?? null,
          requestedBy: actorId,
          createdAt
        }),
        `admin-notification-test:${outboxId}`
      ]
    );

    return NotificationTestResponseSchema.parse({
      outboxMessageId: outboxId,
      eventType: "TEST_ADMIN_NOTIFICATION",
      channel: parsed.data.channel,
      notificationType: parsed.data.notificationType,
      status: "queued",
      message: "Notification test event queued for worker processing."
    });
  }

  async listDriverReadiness() {
    const result = await this.pg.query<AdminDriverReadinessRow>(
      `select
          d.id as driver_id,
          u.display_name as driver_name,
          d.availability_status::text as availability_status,
          coalesce(vstatus.status, 'MISSING')::text as verification_status,
          vprimary.vehicle_type::text as vehicle_type,
          d.active_job_id,
          aj.status::text as active_job_status,
          d.home_org_id as org_id,
          o.name as org_name,
          fleet.org_id as fleet_org_id,
          fleet.org_name as fleet_org_name,
          fleet.role as fleet_role,
          r.name as restaurant_name,
          r.slug as restaurant_slug,
          d.last_location_at,
          d.created_at,
          d.updated_at
       from public.drivers d
       left join public.users u on u.id = d.user_id
       left join public.orgs o on o.id = d.home_org_id
       left join lateral (
         select fo.id as org_id, fo.name as org_name, fm.role::text as role
         from public.org_memberships fm
         join public.orgs fo on fo.id = fm.org_id
         where fm.user_id = d.user_id
           and fm.is_active = true
           and fo.org_type = 'DRIVER_COMPANY'
           and fm.role::text in ('FLEET_OWNER', 'FLEET_MANAGER', 'DISPATCHER', 'DRIVER', 'COMPLIANCE_MANAGER')
         order by fm.updated_at desc
         limit 1
       ) fleet on true
       left join public.jobs aj on aj.id = d.active_job_id
       left join public.customer_orders co on co.job_id = d.active_job_id
       left join public.restaurants r on r.id = co.restaurant_id
       left join lateral (
         select dv.vehicle_type::text as vehicle_type
         from public.driver_vehicle dv
         where dv.driver_id = d.id
           and dv.is_primary = true
         order by dv.updated_at desc
         limit 1
       ) vprimary on true
       left join lateral (
         select dvf.status::text as status
         from public.driver_verifications dvf
         where dvf.driver_id = d.id
         order by
           case dvf.status
             when 'APPROVED' then 1
             when 'PENDING' then 2
             else 3
           end,
           dvf.updated_at desc
         limit 1
       ) vstatus on true
       order by
         case
           when coalesce(vstatus.status, 'MISSING') <> 'APPROVED' then 1
           when d.active_job_id is not null then 2
           when d.availability_status <> 'ONLINE' then 3
           when vprimary.vehicle_type is null then 4
           when d.last_location_at is null or d.last_location_at < now() - interval '15 minutes' then 5
           else 6
         end,
         d.updated_at desc`
    );

    return AdminDriverReadinessListSchema.parse({
      items: result.rows.map((row) => this.mapDriverReadiness(row))
    });
  }

  private async listInterventionQueue() {
    const [dispatchFailedJobs, stuckJobs, paymentFailures, paymentCapturePending, notificationIssues] = await Promise.all([
      this.pg.query<AdminJobRow>(
        `select
            j.id,
            j.org_id,
            o.name as org_name,
            r.name as restaurant_name,
            r.slug as restaurant_slug,
            j.status::text as status,
            cu.display_name as customer_name,
            du.display_name as driver_name,
            j.vehicle_required::text as vehicle_required,
            p.id as payment_id,
            p.status::text as payment_status,
            j.pickup_address,
            j.dropoff_address,
            j.eta_minutes,
            coalesce(p.customer_total_cents, j.customer_total_cents) as total_cents,
            coalesce(p.currency, 'gbp') as currency,
            j.created_at,
            j.updated_at
         from public.jobs j
         left join public.orgs o on o.id = j.org_id
         left join public.customer_orders coo on coo.job_id = j.id
         left join public.restaurants r on r.id = coo.restaurant_id
         left join public.users cu on cu.id = j.consumer_id
         left join public.drivers d on d.id = j.assigned_driver_id
         left join public.users du on du.id = d.user_id
         left join public.payments p on p.job_id = j.id
         where j.org_id is not null
           and j.status = 'DISPATCH_FAILED'
         order by j.updated_at desc
         limit 12`
      ),
      this.pg.query<AdminJobRow>(
        `select
            j.id,
            j.org_id,
            o.name as org_name,
            r.name as restaurant_name,
            r.slug as restaurant_slug,
            j.status::text as status,
            cu.display_name as customer_name,
            du.display_name as driver_name,
            j.vehicle_required::text as vehicle_required,
            p.id as payment_id,
            p.status::text as payment_status,
            j.pickup_address,
            j.dropoff_address,
            j.eta_minutes,
            coalesce(p.customer_total_cents, j.customer_total_cents) as total_cents,
            coalesce(p.currency, 'gbp') as currency,
            j.created_at,
            j.updated_at
         from public.jobs j
         left join public.orgs o on o.id = j.org_id
         left join public.customer_orders coo on coo.job_id = j.id
         left join public.restaurants r on r.id = coo.restaurant_id
         left join public.users cu on cu.id = j.consumer_id
         left join public.drivers d on d.id = j.assigned_driver_id
         left join public.users du on du.id = d.user_id
         left join public.payments p on p.job_id = j.id
         where j.org_id is not null
           and j.status::text = any($1::text[])
           and j.updated_at < now() - interval '30 minutes'
         order by j.updated_at asc
         limit 12`,
        [["ASSIGNED", "EN_ROUTE_PICKUP", "PICKED_UP", "EN_ROUTE_DROP"]]
      ),
      this.pg.query<AdminOrderRow>(
        `select
            o.id,
            o.org_id,
            org.name as org_name,
            r.id as restaurant_id,
            r.name as restaurant_name,
            r.slug as restaurant_slug,
            o.status::text as status,
            o.customer_name,
            o.customer_email,
            o.customer_phone,
            coalesce(nullif(split_part(o.delivery_address, ',', 1), ''), o.delivery_address) as delivery_address_summary,
            o.total_cents,
            o.currency,
            p.id as payment_id,
            p.status::text as payment_status,
            j.id as job_id,
            j.status::text as job_status,
            o.created_at,
            o.updated_at
         from public.customer_orders o
         join public.orgs org on org.id = o.org_id
         join public.restaurants r on r.id = o.restaurant_id
         join public.jobs j on j.id = o.job_id
         join public.payments p on p.id = o.payment_id
         where p.status = 'FAILED' or o.status = 'PAYMENT_FAILED'
         order by o.updated_at desc
         limit 12`
      ),
      this.pg.query<AdminOrderRow>(
        `select
            o.id,
            o.org_id,
            org.name as org_name,
            r.id as restaurant_id,
            r.name as restaurant_name,
            r.slug as restaurant_slug,
            o.status::text as status,
            o.customer_name,
            o.customer_email,
            o.customer_phone,
            coalesce(nullif(split_part(o.delivery_address, ',', 1), ''), o.delivery_address) as delivery_address_summary,
            o.total_cents,
            o.currency,
            p.id as payment_id,
            p.status::text as payment_status,
            j.id as job_id,
            j.status::text as job_status,
            o.created_at,
            o.updated_at
         from public.customer_orders o
         join public.orgs org on org.id = o.org_id
         join public.restaurants r on r.id = o.restaurant_id
         join public.jobs j on j.id = o.job_id
         join public.payments p on p.id = o.payment_id
         where p.status = 'AUTHORIZED'
           and j.status = 'DELIVERED'
         order by o.updated_at desc
         limit 12`
      ),
      this.pg.query<NotificationAuditRow>(
        `select
            a.id,
            a.org_id,
            o.name as org_name,
            a.entity_type,
            a.entity_id,
            a.metadata,
            a.created_at
         from public.audit_log a
         left join public.orgs o on o.id = a.org_id
         where a.action = 'external_notification_skipped'
           and a.created_at > now() - interval '24 hours'
         order by a.created_at desc
         limit 12`
      )
    ]);

    const items = [
      ...dispatchFailedJobs.rows.map((row) =>
        this.makeIntervention({
          id: `dispatch:${row.id}`,
          category: "dispatch_failed",
          severity: "danger",
          title: "Dispatch failed",
          summary: `${row.org_name ?? "Unknown org"} needs manual driver intervention for ${row.pickup_address}.`,
          orgId: row.org_id,
          orgName: row.org_name,
          restaurantName: row.restaurant_name,
          entityType: "job",
          entityId: row.id,
          jobId: row.id,
          paymentId: row.payment_id,
          createdAt: row.updated_at
        })
      ),
      ...stuckJobs.rows.map((row) =>
        this.makeIntervention({
          id: `stuck:${row.id}`,
          category: "stuck_job",
          severity: "warning",
          title: "Job looks stuck",
          summary: `${row.status.replace(/_/g, " ").toLowerCase()} has not progressed for over 30 minutes.`,
          orgId: row.org_id,
          orgName: row.org_name,
          restaurantName: row.restaurant_name,
          entityType: "job",
          entityId: row.id,
          jobId: row.id,
          paymentId: row.payment_id,
          createdAt: row.updated_at
        })
      ),
      ...paymentFailures.rows.map((row) =>
        this.makeIntervention({
          id: `payment-failure:${row.id}`,
          category: "payment_failure",
          severity: "danger",
          title: "Payment failed",
          summary: `${row.customer_name} has a failed payment and the order needs review.`,
          orgId: row.org_id,
          orgName: row.org_name,
          restaurantName: row.restaurant_name,
          entityType: "order",
          entityId: row.id,
          jobId: row.job_id,
          orderId: row.id,
          paymentId: row.payment_id,
          createdAt: row.updated_at
        })
      ),
      ...paymentCapturePending.rows.map((row) =>
        this.makeIntervention({
          id: `payment-pending:${row.id}`,
          category: "payment_capture_pending",
          severity: "warning",
          title: "Payment still authorised",
          summary: `Delivery completed for ${row.customer_name}, but payment has not captured yet.`,
          orgId: row.org_id,
          orgName: row.org_name,
          restaurantName: row.restaurant_name,
          entityType: "order",
          entityId: row.id,
          jobId: row.job_id,
          orderId: row.id,
          paymentId: row.payment_id,
          createdAt: row.updated_at
        })
      ),
      ...notificationIssues.rows.map((row) =>
        this.makeIntervention({
          id: `notification:${row.id}`,
          category: "notification_issue",
          severity: "info",
          title: "Notification skipped",
          summary: typeof row.metadata?.reason === "string" ? row.metadata.reason : "External notification was skipped safely.",
          orgId: row.org_id,
          orgName: row.org_name,
          restaurantName: null,
          entityType: row.entity_type === "payment" ? "payment" : row.entity_type === "order" ? "order" : "notification",
          entityId: row.entity_id ?? String(row.id),
          createdAt: row.created_at
        })
      )
    ];

    return items
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 20)
      .map((item) => AdminInterventionItemSchema.parse(item));
  }

  private async getSystemHealth() {
    const outboxCounts = await this.pg.query<{
      backlog_count: string | number;
      retrying_count: string | number;
      failed_count: string | number;
    }>(
      `select
          count(*) filter (where processed_at is null) as backlog_count,
          count(*) filter (where processed_at is null and retry_count > 0) as retrying_count,
          count(*) filter (where processed_at is null and last_error is not null) as failed_count
       from public.outbox_messages`
    );

    const paymentCapturePending = await this.pg.query<{ count: string | number }>(
      `select count(*)::int as count
       from public.payments p
       join public.jobs j on j.id = p.job_id
       where p.status = 'AUTHORIZED'
         and j.status = 'DELIVERED'`
    );

    const notificationIssues = await this.pg.query<{ count: string | number }>(
      `select count(*)::int as count
       from public.audit_log
       where action = 'external_notification_skipped'
         and created_at > now() - interval '24 hours'`
    );

    let readiness: { status: "ok" | "error"; service: "api"; message: string | null } = {
      status: "ok",
      service: "api",
      message: null
    };

    try {
      await this.schemaReadiness.assertCriticalSchemaCompatibility();
    } catch (error) {
      readiness = {
        status: "error",
        service: "api",
        message:
          error instanceof SchemaCompatibilityError
            ? `schema_compatibility_not_ready: ${error.missingElements.join(", ")}`
            : error instanceof Error
              ? error.message
              : "database_not_ready"
      };
    }

    return {
      liveness: {
        status: "ok" as const,
        service: "api" as const
      },
      readiness,
      outboxBacklogCount: Number(outboxCounts.rows[0]?.backlog_count ?? 0),
      outboxRetryingCount: Number(outboxCounts.rows[0]?.retrying_count ?? 0),
      outboxFailedCount: Number(outboxCounts.rows[0]?.failed_count ?? 0),
      paymentCapturePendingCount: Number(paymentCapturePending.rows[0]?.count ?? 0),
      notificationIssueCount: Number(notificationIssues.rows[0]?.count ?? 0)
    };
  }

  private async getNotificationCounts() {
    const result = await this.pg.query<{
      pending: string | number;
      retrying: string | number;
      failed: string | number;
      sent: string | number;
      skipped: string | number;
    }>(
      `with outbox_counts as (
         select
           count(*) filter (where processed_at is null and coalesce(last_error, '') = '') as pending,
           count(*) filter (where processed_at is null and retry_count > 0 and last_error is not null) as retrying,
           count(*) filter (where processed_at is null and last_error is not null) as failed
         from public.outbox_messages
         where event_type = any($1::text[])
       ),
       audit_counts as (
         select
           count(*) filter (where action = 'external_notification_sent') as sent,
           count(*) filter (where action = 'external_notification_skipped') as skipped
         from public.audit_log
         where action in ('external_notification_sent', 'external_notification_skipped')
           and metadata->>'eventType' = any($1::text[])
       )
       select
         coalesce(o.pending, 0) as pending,
         coalesce(o.retrying, 0) as retrying,
         coalesce(o.failed, 0) as failed,
         coalesce(a.sent, 0) as sent,
         coalesce(a.skipped, 0) as skipped
       from outbox_counts o cross join audit_counts a`,
      [ADMIN_NOTIFICATION_EVENT_TYPES]
    );
    const row = result.rows[0] ?? { pending: 0, retrying: 0, failed: 0, sent: 0, skipped: 0 };
    return {
      pending: Number(row.pending),
      retrying: Number(row.retrying),
      failed: Number(row.failed),
      sent: Number(row.sent),
      skipped: Number(row.skipped)
    };
  }

  private async listNotificationDiagnosticEvents(testOnly: boolean): Promise<AdminNotificationDiagnosticEventDto[]> {
    const result = await this.pg.query<NotificationDiagnosticRow>(
      `with outbox_events as (
         select
           om.id::text as id,
           om.id as outbox_message_id,
           om.event_type,
           coalesce(om.payload->>'notificationType', om.payload->>'interestType') as notification_type,
           om.payload->>'requestedChannel' as channel,
           case
             when om.processed_at is not null then 'sent'
             when om.retry_count > 0 and om.last_error is not null then 'retrying'
             when om.last_error is not null then 'failed'
             else 'pending'
           end as status,
           null::text as provider,
           coalesce(om.processed_at, om.next_attempt_at, om.created_at) as last_attempt_at,
           om.retry_count,
           om.last_error as safe_error_summary,
           om.created_at
         from public.outbox_messages om
         where om.event_type = any($1::text[])
           and (($2::boolean = false) or om.event_type = 'TEST_ADMIN_NOTIFICATION')
       ),
       audit_events as (
         select
           a.id::text as id,
           null::uuid as outbox_message_id,
           coalesce(a.metadata->>'eventType', a.action) as event_type,
           coalesce(a.metadata->>'notificationType', a.metadata->>'interestType') as notification_type,
           nullif(array_to_string(array(
             select jsonb_array_elements_text(coalesce(a.metadata->'sentChannels', a.metadata->'skippedChannels', '[]'::jsonb))
           ), ', '), '') as channel,
           case
             when a.action = 'external_notification_sent' then 'sent'
             when a.action = 'external_notification_skipped' then 'skipped'
             else 'failed'
           end as status,
           coalesce(a.metadata->>'emailProvider', a.metadata->>'provider') as provider,
           a.created_at as last_attempt_at,
           0 as retry_count,
           coalesce(a.metadata->>'reason', a.metadata->>'error') as safe_error_summary,
           a.created_at
         from public.audit_log a
         where a.action in ('external_notification_sent', 'external_notification_skipped')
           and a.metadata->>'eventType' = any($1::text[])
           and (($2::boolean = false) or coalesce((a.metadata->>'test')::boolean, false) = true)
       )
       select *
       from (
         select * from outbox_events
         union all
         select * from audit_events
       ) combined
       order by created_at desc
       limit 30`,
      [ADMIN_NOTIFICATION_EVENT_TYPES, testOnly]
    );

    return result.rows.map((row) => this.mapNotificationDiagnosticEvent(row));
  }

  private mapJob(row: AdminJobRow): AdminJobSummaryDto {
    const attention = this.computeJobAttention(row);
    return AdminJobSummarySchema.parse({
      id: row.id,
      orgId: row.org_id,
      orgName: row.org_name,
      restaurantName: row.restaurant_name,
      restaurantSlug: row.restaurant_slug,
      status: row.status,
      attentionLevel: attention.level,
      attentionReason: attention.reason,
      customerName: row.customer_name,
      driverName: row.driver_name,
      vehicleRequired: row.vehicle_required,
      paymentId: row.payment_id,
      paymentStatus: row.payment_status,
      pickupAddress: row.pickup_address,
      dropoffAddress: row.dropoff_address,
      etaMinutes: row.eta_minutes,
      totalCents: row.total_cents,
      currency: row.currency,
      createdAt: toIsoDateTime(row.created_at),
      updatedAt: toIsoDateTime(row.updated_at)
    });
  }

  private mapOrder(row: AdminOrderRow): AdminOrderSummaryDto {
    return AdminOrderSummarySchema.parse({
      id: row.id,
      orgId: row.org_id,
      orgName: row.org_name,
      restaurantId: row.restaurant_id,
      restaurantName: row.restaurant_name,
      restaurantSlug: row.restaurant_slug,
      status: normalizeOrderStatus(row.status),
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      customerPhone: row.customer_phone,
      deliveryAddressSummary: row.delivery_address_summary,
      totalCents: row.total_cents,
      currency: row.currency,
      paymentId: row.payment_id,
      paymentStatus: row.payment_status,
      jobId: row.job_id,
      jobStatus: row.job_status,
      createdAt: toIsoDateTime(row.created_at),
      updatedAt: toIsoDateTime(row.updated_at)
    });
  }

  private mapOutbox(row: OutboxRow): AdminOutboxItemDto {
    return AdminOutboxItemSchema.parse({
      id: row.id,
      aggregateType: row.aggregate_type,
      aggregateId: row.aggregate_id,
      eventType: row.event_type,
      retryCount: row.retry_count,
      lastError: row.last_error,
      processedAt: row.processed_at ? toIsoDateTime(row.processed_at) : null,
      nextAttemptAt: toIsoDateTime(row.next_attempt_at),
      createdAt: toIsoDateTime(row.created_at)
    });
  }

  private mapNotificationDiagnosticEvent(row: NotificationDiagnosticRow) {
    return AdminNotificationDiagnosticEventSchema.parse({
      id: row.id,
      outboxMessageId: row.outbox_message_id,
      eventType: row.event_type,
      notificationType: row.notification_type,
      channel: row.channel,
      status: row.status,
      provider: row.provider,
      lastAttemptAt: toNullableIsoDateTime(row.last_attempt_at),
      retryCount: Number(row.retry_count),
      safeErrorSummary: row.safe_error_summary ? row.safe_error_summary.slice(0, 240) : null,
      createdAt: toIsoDateTime(row.created_at)
    });
  }

  private mapDriverReadiness(row: AdminDriverReadinessRow): AdminDriverReadinessItemDto {
    const verificationStatus = (row.verification_status ?? "MISSING") as AdminDriverReadinessItemDto["verificationStatus"];
    const availabilityStatus = (row.availability_status ?? "OFFLINE") as AdminDriverReadinessItemDto["availabilityStatus"];
    const vehicleType = row.vehicle_type as AdminDriverReadinessItemDto["vehicleType"];
    const activeJobStatus = row.active_job_status as AdminDriverReadinessItemDto["activeJobStatus"];
    const locationRecentlySeen = isRecentLocation(row.last_location_at);

    const checklist: AdminDriverReadinessChecklistItemDto[] = [
      {
        key: "profile_exists",
        label: "Profile exists",
        result: row.driver_name ? "pass" : "fail",
        reason: row.driver_name ? "Driver profile is linked to a user account." : "Driver profile is missing a user display name."
      },
      {
        key: "verification_approved",
        label: "Verification approved",
        result: verificationStatus === "APPROVED" ? "pass" : verificationStatus === "PENDING" ? "warn" : "fail",
        reason:
          verificationStatus === "APPROVED"
            ? "Verification is approved for pilot operations."
            : verificationStatus === "PENDING"
              ? "Verification is pending human approval."
              : "Verification is missing or rejected."
      },
      {
        key: "vehicle_registered",
        label: "Vehicle registered",
        result: vehicleType ? "pass" : "fail",
        reason: vehicleType ? `${vehicleType} vehicle is registered.` : "No primary vehicle is registered."
      },
      {
        key: "currently_active",
        label: "Currently active",
        result: availabilityStatus === "ONLINE" ? "pass" : "fail",
        reason:
          availabilityStatus === "ONLINE"
            ? "Courier is online and can receive pilot dispatch."
            : "Courier is offline. This is not a compliance failure, but they are not eligible for dispatch now."
      },
      {
        key: "location_recently_seen",
        label: "Location recently seen",
        result: locationRecentlySeen ? "pass" : "warn",
        reason: locationRecentlySeen ? "Location was seen recently." : "Location is missing or older than the pilot freshness window."
      },
      {
        key: "no_active_blocking_job",
        label: "No active blocking job",
        result: row.active_job_id ? "fail" : "pass",
        reason: row.active_job_id
          ? `Courier is already linked to job ${row.active_job_id.slice(0, 8)}.`
          : "No active job is blocking assignment."
      }
    ];

    const readinessStatus = this.computeDriverReadinessStatus({
      availabilityStatus,
      verificationStatus,
      vehicleType,
      activeJobId: row.active_job_id,
      locationRecentlySeen
    });

    return {
      driverId: row.driver_id,
      driverName: row.driver_name ?? "Unnamed courier",
      availabilityStatus,
      verificationStatus,
      vehicleType,
      activeJobId: row.active_job_id,
      activeJobStatus,
      orgId: row.org_id,
      orgName: row.org_name,
      fleetOrgId: row.fleet_org_id,
      fleetOrgName: row.fleet_org_name,
      fleetRole: row.fleet_role as AdminDriverReadinessItemDto["fleetRole"],
      restaurantName: row.restaurant_name,
      restaurantSlug: row.restaurant_slug,
      lastLocationAt: toNullableIsoDateTime(row.last_location_at),
      locationRecentlySeen,
      readinessStatus,
      checklist,
      recommendedNextAction: this.getDriverReadinessAction({
        availabilityStatus,
        verificationStatus,
        vehicleType,
        activeJobId: row.active_job_id,
        locationRecentlySeen
      }),
      createdAt: toIsoDateTime(row.created_at),
      updatedAt: toIsoDateTime(row.updated_at)
    };
  }

  private computeDriverReadinessStatus(input: {
    availabilityStatus: AdminDriverReadinessItemDto["availabilityStatus"];
    verificationStatus: AdminDriverReadinessItemDto["verificationStatus"];
    vehicleType: AdminDriverReadinessItemDto["vehicleType"];
    activeJobId: string | null;
    locationRecentlySeen: boolean;
  }): AdminDriverReadinessStatus {
    if (input.verificationStatus === "PENDING") {
      return "NEEDS_REVIEW";
    }

    if (
      input.verificationStatus !== "APPROVED" ||
      !input.vehicleType ||
      input.availabilityStatus !== "ONLINE" ||
      input.activeJobId
    ) {
      return "NOT_ELIGIBLE";
    }

    return input.locationRecentlySeen ? "READY" : "NEEDS_REVIEW";
  }

  private getDriverReadinessAction(input: {
    availabilityStatus: AdminDriverReadinessItemDto["availabilityStatus"];
    verificationStatus: AdminDriverReadinessItemDto["verificationStatus"];
    vehicleType: AdminDriverReadinessItemDto["vehicleType"];
    activeJobId: string | null;
    locationRecentlySeen: boolean;
  }) {
    if (input.verificationStatus === "PENDING") {
      return "Review verification and approve only after human checks are complete.";
    }

    if (input.verificationStatus !== "APPROVED") {
      return "Request profile or verification update before pilot dispatch.";
    }

    if (!input.vehicleType) {
      return "Check vehicle registration before making the courier eligible.";
    }

    if (input.activeJobId) {
      return "Clear or complete the active job before assigning another delivery.";
    }

    if (input.availabilityStatus !== "ONLINE") {
      return "Ask courier to go online before dispatch.";
    }

    if (!input.locationRecentlySeen) {
      return "Ask courier to refresh location before relying on assignment.";
    }

    return "Courier is ready for pilot assignment after operator review.";
  }

  private makeIntervention(input: {
    id: string;
    category: AdminInterventionItemDto["category"];
    severity: AdminInterventionSeverity;
    title: string;
    summary: string;
    orgId: string | null;
    orgName: string | null;
    restaurantName: string | null;
    entityType: AdminInterventionItemDto["entityType"];
    entityId: string;
    jobId?: string | null;
    orderId?: string | null;
    paymentId?: string | null;
    createdAt: string | Date;
  }) {
    return {
      id: input.id,
      category: input.category,
      severity: input.severity,
      title: input.title,
      summary: input.summary,
      orgId: input.orgId,
      orgName: input.orgName,
      restaurantName: input.restaurantName,
      entityType: input.entityType,
      entityId: input.entityId,
      jobId: input.jobId ?? null,
      orderId: input.orderId ?? null,
      paymentId: input.paymentId ?? null,
      createdAt: toIsoDateTime(input.createdAt)
    };
  }

  private computeJobAttention(row: AdminJobRow): { level: AdminJobSummaryDto["attentionLevel"]; reason: string | null } {
    if (row.status === "DISPATCH_FAILED") {
      return {
        level: "BLOCKER",
        reason: "Dispatch failed and the job needs manual intervention."
      };
    }

    if (row.payment_status === "FAILED") {
      return {
        level: "BLOCKER",
        reason: "Payment failed and the order cannot continue without review."
      };
    }

    if (["ASSIGNED", "EN_ROUTE_PICKUP", "PICKED_UP", "EN_ROUTE_DROP"].includes(row.status)) {
      const stale = Date.now() - new Date(row.updated_at).getTime() > 30 * 60 * 1000;
      if (stale) {
        return {
          level: "RISK",
          reason: "This live job has not progressed in over 30 minutes."
        };
      }
    }

    return {
      level: "NORMAL",
      reason: row.payment_status === "AUTHORIZED" ? "Payment is authorised and the delivery is live." : null
    };
  }
}
