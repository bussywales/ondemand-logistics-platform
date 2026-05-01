import { Injectable, NotFoundException } from "@nestjs/common";
import {
  BusinessNotificationReadAllSchema,
  BusinessNotificationReadSchema,
  BusinessNotificationListSchema,
  type BusinessNotificationDto,
  type BusinessNotificationEntityType,
  type BusinessNotificationSeverity
} from "@shipwright/contracts";
import { createLogger } from "@shipwright/observability";
import { toIsoDateTime } from "../database/mapper.js";
import { PgService } from "../database/pg.service.js";

type NotificationSource = "job_event" | "outbox" | "payment_event";

type NotificationEventRow = {
  source_id: string | number;
  event_type: string;
  created_at: string | Date;
  job_id: string | null;
  order_id: string | null;
  payment_id: string | null;
  payload: Record<string, unknown> | null;
  customer_name?: string | null;
  restaurant_name?: string | null;
  total_cents?: number | null;
  currency?: string | null;
};

type NotificationReadRow = {
  notification_id: string;
};

type ParsedNotificationId = {
  notificationId: string;
  source: NotificationSource;
  sourceId: string;
};

const JOB_NOTIFICATION_EVENTS = [
  "CUSTOMER_ORDER_SUBMITTED",
  "JOB_DISPATCH_FAILED",
  "JOB_DISPATCH_RETRIED",
  "JOB_ASSIGNED",
  "JOB_OFFERED",
  "JOB_OFFER_EXPIRED",
  "JOB_OFFER_REJECTED",
  "JOB_EN_ROUTE_PICKUP",
  "JOB_PICKED_UP",
  "JOB_EN_ROUTE_DROP",
  "JOB_PROOF_OF_DELIVERY_RECORDED",
  "JOB_DELIVERED",
  "JOB_CANCELLED"
] as const;

const OUTBOX_NOTIFICATION_EVENTS = ["JOB_DISPATCH_REQUESTED", "PAYMENT_CAPTURE_REQUESTED", "NOTIFY_BUSINESS_NEW_ORDER"] as const;
const PAYMENT_NOTIFICATION_EVENTS = ["PAYMENT_AUTHORIZED", "PAYMENT_AUTHORIZATION_FAILED", "PAYMENT_CAPTURED"] as const;

function humanizeEventType(value: string) {
  const words = value.toLowerCase().split("_").filter(Boolean);
  if (words.length === 0) {
    return "System event";
  }

  return words
    .map((word, index) => (index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function payloadString(payload: Record<string, unknown> | null, key: string) {
  const value = payload?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function mapNotificationCopy(
  type: string,
  payload: Record<string, unknown> | null
): { message: string; severity: BusinessNotificationSeverity; title: string } {
  switch (type) {
    case "JOB_DISPATCH_REQUESTED":
      return {
        title: "Dispatch started",
        message: "The delivery entered dispatch and is being offered to eligible drivers.",
        severity: "info"
      };
    case "JOB_DISPATCH_FAILED":
      return {
        title: "Dispatch failed",
        message:
          payloadString(payload, "reason") === "no_eligible_drivers"
            ? "No eligible driver accepted this job. Review and retry dispatch."
            : "The delivery is blocked and needs operator review.",
        severity: "danger"
      };
    case "JOB_DISPATCH_RETRIED":
      return {
        title: "Dispatch retried",
        message: "Another dispatch attempt has been requested for this delivery.",
        severity: "warning"
      };
    case "JOB_ASSIGNED":
      return {
        title: "Driver assigned",
        message: "A driver is now assigned to this delivery.",
        severity: "success"
      };
    case "JOB_OFFERED":
      return {
        title: "Driver offer sent",
        message: "A nearby driver has been offered this delivery.",
        severity: "info"
      };
    case "JOB_OFFER_EXPIRED":
      return {
        title: "Driver offer expired",
        message: "The offer expired without acceptance. Dispatch may try the next candidate.",
        severity: "warning"
      };
    case "JOB_OFFER_REJECTED":
      return {
        title: "Driver rejected offer",
        message: "The offered driver rejected this delivery.",
        severity: "warning"
      };
    case "JOB_EN_ROUTE_PICKUP":
      return {
        title: "Driver heading to pickup",
        message: "The assigned driver is travelling to the pickup point.",
        severity: "info"
      };
    case "JOB_PICKED_UP":
      return {
        title: "Order picked up",
        message: "The driver has collected the order and the delivery is progressing.",
        severity: "success"
      };
    case "JOB_EN_ROUTE_DROP":
      return {
        title: "Out for delivery",
        message: "The driver is travelling to the customer drop-off.",
        severity: "info"
      };
    case "JOB_PROOF_OF_DELIVERY_RECORDED":
      return {
        title: "Proof of delivery recorded",
        message: "Delivery evidence has been submitted for this job.",
        severity: "success"
      };
    case "JOB_DELIVERED":
      return {
        title: "Delivery completed",
        message: "The driver marked this delivery as completed.",
        severity: "success"
      };
    case "JOB_CANCELLED":
      return {
        title: "Delivery cancelled",
        message: "This delivery was cancelled and will not continue.",
        severity: "danger"
      };
    case "CUSTOMER_ORDER_SUBMITTED":
      return {
        title: "Customer order received",
        message: "A customer order entered operations and is ready for delivery fulfilment.",
        severity: "info"
      };
    case "NOTIFY_BUSINESS_NEW_ORDER": {
      const customerName = payloadString(payload, "customerName");
      const restaurantName = payloadString(payload, "restaurantName");
      const formattedTotal = payloadString(payload, "formattedTotal");

      return {
        title: "New paid order",
        message: [customerName, formattedTotal, restaurantName].filter(Boolean).join(" · ") || "A paid customer order is ready for fulfilment.",
        severity: "success"
      };
    }
    case "PAYMENT_AUTHORIZED":
      return {
        title: "Payment authorized",
        message: "Customer funds are authorized and the delivery can proceed.",
        severity: "success"
      };
    case "PAYMENT_AUTHORIZATION_FAILED":
      return {
        title: "Payment failed",
        message: payloadString(payload, "error") ?? "Payment authorization failed and needs review.",
        severity: "danger"
      };
    case "PAYMENT_CAPTURE_REQUESTED":
      return {
        title: "Capturing payment",
        message: "The system queued payment capture for this delivered job.",
        severity: "info"
      };
    case "PAYMENT_CAPTURED":
      return {
        title: "Payment captured",
        message: "Funds were captured successfully after delivery completion.",
        severity: "success"
      };
    default:
      return {
        title: humanizeEventType(type),
        message: "A new operational event was recorded for this workspace.",
        severity: "info"
      };
  }
}

function resolveEntity(row: NotificationEventRow): { entityId: string; entityType: BusinessNotificationEntityType } {
  if (
    (row.event_type.startsWith("PAYMENT_") ||
      row.event_type === "CUSTOMER_ORDER_SUBMITTED" ||
      row.event_type === "NOTIFY_BUSINESS_NEW_ORDER") &&
    row.order_id
  ) {
    return {
      entityType: "order",
      entityId: row.order_id
    };
  }

  if (row.job_id) {
    return {
      entityType: "job",
      entityId: row.job_id
    };
  }

  if (row.payment_id) {
    return {
      entityType: "payment",
      entityId: row.payment_id
    };
  }

  throw new Error("notification_entity_missing");
}

function parseNotificationId(notificationId: string): ParsedNotificationId | null {
  const separatorIndex = notificationId.indexOf(":");
  if (separatorIndex <= 0) {
    return null;
  }

  const source = notificationId.slice(0, separatorIndex);
  const sourceId = notificationId.slice(separatorIndex + 1);

  if (sourceId.length === 0) {
    return null;
  }

  if (source !== "job_event" && source !== "outbox" && source !== "payment_event") {
    return null;
  }

  return {
    notificationId,
    source,
    sourceId
  };
}

@Injectable()
export class NotificationsService {
  private readonly logger = createLogger({ name: "api-notifications" });

  constructor(private readonly pg: PgService) {}

  async listBusinessNotifications(userId: string) {
    const items = await this.buildBusinessNotifications(userId);

    this.logger.info({ actor_id: userId, notification_count: items.length }, "business_notifications_listed");
    return BusinessNotificationListSchema.parse({ items });
  }

  async markBusinessNotificationRead(userId: string, notificationId: string) {
    const notification = parseNotificationId(notificationId);
    if (!notification) {
      throw new NotFoundException("Notification not found.");
    }

    const visible = await this.notificationVisibleToUser(userId, notification);
    if (!visible) {
      throw new NotFoundException("Notification not found.");
    }

    const result = await this.pg.query<{ read_at: string | Date }>(
      `insert into public.notification_reads (user_id, notification_id, notification_source, read_at)
       values ($1, $2, $3, now())
       on conflict (user_id, notification_id)
       do update set read_at = excluded.read_at
       returning read_at`,
      [userId, notification.notificationId, notification.source]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("notification_read_persist_failed");
    }

    this.logger.info({ actor_id: userId, notification_id: notificationId }, "business_notification_read");
    return BusinessNotificationReadSchema.parse({
      ok: true,
      notificationId,
      readAt: toIsoDateTime(row.read_at)
    });
  }

  async markAllBusinessNotificationsRead(userId: string) {
    const items = await this.buildBusinessNotifications(userId, { includeReadState: false });
    const parsedNotifications = items
      .map((item) => parseNotificationId(item.id))
      .filter((item): item is ParsedNotificationId => item !== null);

    if (parsedNotifications.length === 0) {
      return BusinessNotificationReadAllSchema.parse({
        ok: true,
        readAt: new Date().toISOString(),
        updatedCount: 0
      });
    }

    const result = await this.pg.query<{ read_at: string | Date }>(
      `insert into public.notification_reads (user_id, notification_id, notification_source, read_at)
       select $1, entry.notification_id, entry.notification_source, now()
       from unnest($2::text[], $3::text[]) as entry(notification_id, notification_source)
       on conflict (user_id, notification_id)
       do update set read_at = excluded.read_at
       returning read_at`,
      [userId, parsedNotifications.map((item) => item.notificationId), parsedNotifications.map((item) => item.source)]
    );

    const readAt = result.rows[0]?.read_at ?? new Date().toISOString();
    this.logger.info({ actor_id: userId, notification_count: parsedNotifications.length }, "business_notifications_read_all");

    return BusinessNotificationReadAllSchema.parse({
      ok: true,
      readAt: toIsoDateTime(readAt),
      updatedCount: parsedNotifications.length
    });
  }

  private async loadJobEvents(userId: string): Promise<BusinessNotificationDto[]> {
    const result = await this.pg.query<NotificationEventRow>(
      `select je.id::text as source_id,
              je.event_type,
              je.created_at,
              j.id as job_id,
              co.id as order_id,
              co.payment_id,
              je.payload
       from public.job_events je
       join public.jobs j on j.id = je.job_id
       left join public.customer_orders co on co.job_id = j.id
       where exists (
         select 1
         from public.org_memberships m
         where m.org_id = j.org_id
           and m.user_id = $1
           and m.is_active = true
           and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
       )
         and je.event_type = any($2::text[])
       order by je.created_at desc
       limit 50`,
      [userId, [...JOB_NOTIFICATION_EVENTS]]
    );

    return result.rows.map((row) => this.mapNotification("job_event", row));
  }

  private async loadOutboxEvents(userId: string): Promise<BusinessNotificationDto[]> {
    const result = await this.pg.query<NotificationEventRow>(
      `select om.id::text as source_id,
              om.event_type,
              om.created_at,
              coalesce(job_from_order.id, direct_job.id) as job_id,
              co.id as order_id,
              co.payment_id,
              om.payload,
              co.customer_name,
              r.name as restaurant_name,
              co.total_cents,
              co.currency
       from public.outbox_messages om
       left join public.jobs direct_job
         on om.aggregate_type = 'job'
        and om.aggregate_id = direct_job.id
       left join public.customer_orders co
         on (om.aggregate_type = 'customer_order' and om.aggregate_id = co.id)
         or co.job_id = direct_job.id
       left join public.jobs job_from_order on job_from_order.id = co.job_id
       left join public.restaurants r on r.id = co.restaurant_id
       where exists (
         select 1
         from public.org_memberships m
         where m.org_id = coalesce(job_from_order.org_id, direct_job.org_id)
           and m.user_id = $1
           and m.is_active = true
           and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
       )
         and om.event_type = any($2::text[])
       order by om.created_at desc
       limit 50`,
      [userId, [...OUTBOX_NOTIFICATION_EVENTS]]
    );

    return result.rows.map((row) => this.mapNotification("outbox", row));
  }

  private async loadPaymentEvents(userId: string): Promise<BusinessNotificationDto[]> {
    const result = await this.pg.query<NotificationEventRow>(
      `select pe.id::text as source_id,
              pe.event_type,
              pe.created_at,
              j.id as job_id,
              co.id as order_id,
              p.id as payment_id,
              pe.payload
       from public.payment_events pe
       join public.payments p on p.id = pe.payment_id
       join public.jobs j on j.id = p.job_id
       left join public.customer_orders co on co.payment_id = p.id
       where exists (
         select 1
         from public.org_memberships m
         where m.org_id = j.org_id
           and m.user_id = $1
           and m.is_active = true
           and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
       )
         and pe.event_type = any($2::text[])
       order by pe.created_at desc
       limit 50`,
      [userId, [...PAYMENT_NOTIFICATION_EVENTS]]
    );

    return result.rows.map((row) => this.mapNotification("payment_event", row));
  }

  private async buildBusinessNotifications(userId: string, options?: { includeReadState?: boolean }) {
    const [jobEvents, outboxEvents, paymentEvents] = await Promise.all([
      this.loadJobEvents(userId),
      this.loadOutboxEvents(userId),
      this.loadPaymentEvents(userId)
    ]);

    const items = [...jobEvents, ...outboxEvents, ...paymentEvents]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 50);

    if (options?.includeReadState === false || items.length === 0) {
      return items;
    }

    const result = await this.pg.query<NotificationReadRow>(
      `select notification_id
       from public.notification_reads
       where user_id = $1
         and notification_id = any($2::text[])`,
      [userId, items.map((item) => item.id)]
    );

    const reads = new Set(result.rows.map((row) => row.notification_id));
    return items.map((item) => ({
      ...item,
      read: reads.has(item.id)
    }));
  }

  private async notificationVisibleToUser(userId: string, notification: ParsedNotificationId) {
    if (notification.source === "job_event") {
      const result = await this.pg.query(
        `select 1
         from public.job_events je
         join public.jobs j on j.id = je.job_id
         where je.id::text = $2
           and je.event_type = any($3::text[])
           and exists (
             select 1
             from public.org_memberships m
             where m.org_id = j.org_id
               and m.user_id = $1
               and m.is_active = true
               and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
           )
         limit 1`,
        [userId, notification.sourceId, [...JOB_NOTIFICATION_EVENTS]]
      );

      return (result.rowCount ?? 0) > 0;
    }

    if (notification.source === "outbox") {
      const result = await this.pg.query(
        `select 1
         from public.outbox_messages om
         left join public.jobs direct_job
           on om.aggregate_type = 'job'
          and om.aggregate_id = direct_job.id
         left join public.customer_orders co
           on om.aggregate_type = 'customer_order'
          and om.aggregate_id = co.id
         left join public.jobs j on j.id = coalesce(direct_job.id, co.job_id)
         where om.id::text = $2
           and om.event_type = any($3::text[])
           and exists (
             select 1
             from public.org_memberships m
             where m.org_id = j.org_id
               and m.user_id = $1
               and m.is_active = true
               and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
           )
         limit 1`,
        [userId, notification.sourceId, [...OUTBOX_NOTIFICATION_EVENTS]]
      );

      return (result.rowCount ?? 0) > 0;
    }

    const result = await this.pg.query(
      `select 1
       from public.payment_events pe
       join public.payments p on p.id = pe.payment_id
       join public.jobs j on j.id = p.job_id
       where pe.id::text = $2
         and pe.event_type = any($3::text[])
         and exists (
           select 1
           from public.org_memberships m
           where m.org_id = j.org_id
             and m.user_id = $1
             and m.is_active = true
             and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
         )
       limit 1`,
      [userId, notification.sourceId, [...PAYMENT_NOTIFICATION_EVENTS]]
    );

    return (result.rowCount ?? 0) > 0;
  }

  private mapNotification(source: NotificationSource, row: NotificationEventRow): BusinessNotificationDto {
    const entity = resolveEntity(row);
    const copy = mapNotificationCopy(row.event_type, {
      ...(row.payload ?? {}),
      ...(row.customer_name ? { customerName: row.customer_name } : {}),
      ...(row.restaurant_name ? { restaurantName: row.restaurant_name } : {}),
      ...(typeof row.total_cents === "number"
        ? {
            formattedTotal: new Intl.NumberFormat("en-GB", {
              style: "currency",
              currency: (row.currency ?? "GBP").toUpperCase()
            }).format(row.total_cents / 100)
          }
        : {})
    });

    return {
      id: `${source}:${row.source_id}`,
      type: row.event_type,
      title: copy.title,
      message: copy.message,
      severity: copy.severity,
      entityType: entity.entityType,
      entityId: entity.entityId,
      createdAt: toIsoDateTime(row.created_at),
      read: false
    };
  }
}
