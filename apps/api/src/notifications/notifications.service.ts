import { Injectable } from "@nestjs/common";
import {
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

const OUTBOX_NOTIFICATION_EVENTS = ["JOB_DISPATCH_REQUESTED", "PAYMENT_CAPTURE_REQUESTED"] as const;
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
  if ((row.event_type.startsWith("PAYMENT_") || row.event_type === "CUSTOMER_ORDER_SUBMITTED") && row.order_id) {
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

@Injectable()
export class NotificationsService {
  private readonly logger = createLogger({ name: "api-notifications" });

  constructor(private readonly pg: PgService) {}

  async listBusinessNotifications(userId: string) {
    const [jobEvents, outboxEvents, paymentEvents] = await Promise.all([
      this.loadJobEvents(userId),
      this.loadOutboxEvents(userId),
      this.loadPaymentEvents(userId)
    ]);

    const items = [...jobEvents, ...outboxEvents, ...paymentEvents]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 50);

    this.logger.info({ actor_id: userId, notification_count: items.length }, "business_notifications_listed");
    return BusinessNotificationListSchema.parse({ items });
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
              j.id as job_id,
              co.id as order_id,
              co.payment_id,
              om.payload
       from public.outbox_messages om
       join public.jobs j
         on om.aggregate_type = 'job'
        and om.aggregate_id = j.id
       left join public.customer_orders co on co.job_id = j.id
       where exists (
         select 1
         from public.org_memberships m
         where m.org_id = j.org_id
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

  private mapNotification(source: NotificationSource, row: NotificationEventRow): BusinessNotificationDto {
    const entity = resolveEntity(row);
    const copy = mapNotificationCopy(row.event_type, row.payload);

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
