import { Injectable } from "@nestjs/common";
import {
  OperationalIncidentSummarySchema,
  type CustomerOrderStatus,
  type JobStatus,
  type OperationalIncidentSummaryDto,
  type PaymentStatus
} from "@shipwright/contracts";
import { toIsoDateTime, toNullableIsoDateTime } from "../database/mapper.js";
import { PgService } from "../database/pg.service.js";

type IncidentContextRow = {
  order_id: string | null;
  payment_id: string | null;
  job_id: string;
  job_status: JobStatus;
  order_status: CustomerOrderStatus | null;
  payment_status: PaymentStatus | null;
  customer_name: string | null;
  restaurant_name: string | null;
  assigned_driver_id: string | null;
  assigned_driver_name: string | null;
  job_created_at: string | Date;
  job_updated_at: string | Date;
  dispatch_failed_at: string | Date | null;
};

type IncidentTimelineRow = {
  event_type: string;
  created_at: string | Date;
};

type BuildIncidentInput = {
  jobId: string;
  orderId: string | null;
  paymentId: string | null;
  customerName: string | null;
  restaurantName: string | null;
  jobStatus: JobStatus;
  orderStatus: CustomerOrderStatus | null;
  paymentStatus: PaymentStatus | null;
  assignedDriverId: string | null;
  assignedDriverName: string | null;
  jobCreatedAt: string;
  jobUpdatedAt: string;
  dispatchFailedAt: string | null;
  dispatchAttemptsCount: number;
  lastTimelineEventType: string | null;
  lastTimelineEventAt: string | null;
  stageAnchorAt: string;
};

const THRESHOLDS = {
  requested: 15,
  assigned: 20,
  enRoutePickup: 30,
  pickedUp: 30,
  enRouteDrop: 30
} as const;

function minutesBetween(now: Date, value: string) {
  return Math.max(0, Math.floor((now.getTime() - new Date(value).getTime()) / 60000));
}

function buildCustomerDraft(input: {
  title: string;
  restaurantName: string | null;
  needsCheck: boolean;
}) {
  const restaurant = input.restaurantName ? ` at ${input.restaurantName}` : "";
  if (input.needsCheck) {
    return `We are reviewing a delay with your delivery${restaurant} and checking the current courier status. We will share the next confirmed update as soon as we have it.`;
  }

  return `We are reviewing the current delivery state${restaurant}. We are checking the latest operational signals and will confirm the next update shortly.`;
}

function buildRestaurantDraft(input: {
  customerName: string | null;
  needsCheck: boolean;
}) {
  const customer = input.customerName ? ` for ${input.customerName}` : "";
  if (input.needsCheck) {
    return `We are reviewing a delivery delay${customer} and checking the current dispatch or courier state. Please hold any operational changes until we confirm the next step.`;
  }

  return `We are checking the current delivery state${customer} and will confirm the next operational step shortly.`;
}

function buildDriverDraft(input: {
  assignedDriverName: string | null;
  shouldAskForUpdate: boolean;
}) {
  if (!input.assignedDriverName) {
    return null;
  }

  if (input.shouldAskForUpdate) {
    return `We are reviewing the current delivery state on this job. Please confirm whether you can continue and whether any blocker needs operator support.`;
  }

  return `We are checking the current delivery state on this job. Please confirm the latest status when you can.`;
}

function findLatestEvent(rows: IncidentTimelineRow[]) {
  const latest = rows[0];
  return latest
    ? {
        type: latest.event_type,
        at: toIsoDateTime(latest.created_at)
      }
    : {
        type: null,
        at: null
      };
}

function findStageAnchor(jobStatus: JobStatus, rows: IncidentTimelineRow[], fallback: string, dispatchFailedAt: string | null) {
  if (jobStatus === "DISPATCH_FAILED") {
    return dispatchFailedAt ?? fallback;
  }

  const targetEventType =
    jobStatus === "REQUESTED"
      ? "JOB_REQUESTED"
      : jobStatus === "ASSIGNED"
        ? "JOB_ASSIGNED"
        : jobStatus === "EN_ROUTE_PICKUP"
          ? "JOB_EN_ROUTE_PICKUP"
          : jobStatus === "PICKED_UP"
            ? "JOB_PICKED_UP"
            : jobStatus === "EN_ROUTE_DROP"
              ? "JOB_EN_ROUTE_DROP"
              : null;

  if (!targetEventType) {
    return fallback;
  }

  const matching = rows.find((row) => row.event_type === targetEventType);
  return matching ? toIsoDateTime(matching.created_at) : fallback;
}

export function buildOperationalIncidentSummary(
  input: BuildIncidentInput,
  now = new Date()
): OperationalIncidentSummaryDto | null {
  const elapsedMinutes = minutesBetween(now, input.stageAnchorAt);
  const isCommerciallyBlocked =
    input.paymentStatus === "AUTHORIZED" &&
    (input.jobStatus === "REQUESTED" || input.jobStatus === "DISPATCH_FAILED");

  let incidentType: OperationalIncidentSummaryDto["incidentType"] | null = null;
  let severity: OperationalIncidentSummaryDto["severity"] | null = null;
  let title = "";
  let summary = "";
  let likelyCause: string | null = null;
  let currentState = "";
  let recommendedNextAction = "";

  if (input.jobStatus === "DISPATCH_FAILED") {
    incidentType = "DISPATCH_FAILED_UNRESOLVED";
    severity = "critical";
    title = "Dispatch failed and remains unresolved";
    summary = `${input.restaurantName ?? "This order"} is still blocked ${elapsedMinutes} min after dispatch failed.`;
    likelyCause =
      input.paymentStatus === "FAILED"
        ? "Payment must be reviewed before dispatch can recover."
        : "No courier accepted or completed the latest dispatch path.";
    currentState = "The job is in DISPATCH_FAILED and no active courier movement is recorded.";
    recommendedNextAction =
      input.paymentStatus === "FAILED"
        ? "Review payment risk before retrying dispatch or contacting the customer."
        : "Open the job, review dispatch recovery guidance, and confirm whether to retry dispatch or reassign manually.";
  } else if (input.jobStatus === "REQUESTED" && !input.assignedDriverId && elapsedMinutes >= THRESHOLDS.requested) {
    incidentType = isCommerciallyBlocked ? "PAYMENT_AUTHORIZED_DELIVERY_BLOCKED" : "REQUESTED_STALE";
    severity = isCommerciallyBlocked ? "critical" : "warning";
    title = isCommerciallyBlocked ? "Paid order is blocked before dispatch" : "Requested job has not progressed";
    summary = `${input.restaurantName ?? "This order"} has been waiting ${elapsedMinutes} min without courier assignment.`;
    likelyCause = isCommerciallyBlocked
      ? "Payment is authorised, but no courier has been assigned yet."
      : "The job has remained in the request queue without assignment.";
    currentState = "The job is still REQUESTED and no courier is assigned.";
    recommendedNextAction = "Open the job, confirm the driver pool, and decide whether dispatch should be retried or assigned manually.";
  } else if (input.jobStatus === "ASSIGNED" && elapsedMinutes >= THRESHOLDS.assigned) {
    incidentType = "ASSIGNED_STALE";
    severity = "warning";
    title = "Assigned courier has not moved to pickup";
    summary = `${input.assignedDriverName ?? "The assigned courier"} has not progressed to pickup after ${elapsedMinutes} min.`;
    likelyCause = "The courier may be delayed, unavailable, or has not advanced the job state.";
    currentState = "The job is ASSIGNED but pickup travel has not been confirmed.";
    recommendedNextAction = "Open the job, confirm courier status, and prepare a delay update if pickup movement is still blocked.";
  } else if (input.jobStatus === "EN_ROUTE_PICKUP" && elapsedMinutes >= THRESHOLDS.enRoutePickup) {
    incidentType = "EN_ROUTE_PICKUP_STALE";
    severity = "warning";
    title = "Pickup leg is taking longer than expected";
    summary = `${input.assignedDriverName ?? "The courier"} has been travelling to pickup for ${elapsedMinutes} min without stage progress.`;
    likelyCause = "Pickup readiness, courier movement, or route progress may need review.";
    currentState = "The job is EN_ROUTE_PICKUP and has not advanced to picked up.";
    recommendedNextAction = "Review pickup readiness and courier status before sending a delay update.";
  } else if (input.jobStatus === "PICKED_UP" && elapsedMinutes >= THRESHOLDS.pickedUp) {
    incidentType = "PICKED_UP_STALE";
    severity = "warning";
    title = "Picked-up order has not started drop-off travel";
    summary = `${input.restaurantName ?? "This order"} was picked up ${elapsedMinutes} min ago and drop-off progress is still not confirmed.`;
    likelyCause = "Courier progress after pickup has not advanced into the expected drop-off leg.";
    currentState = "The job is PICKED_UP and has not advanced to EN_ROUTE_DROP.";
    recommendedNextAction = "Open the job, confirm courier progress, and prepare a customer update if the route is still blocked.";
  } else if (input.jobStatus === "EN_ROUTE_DROP" && elapsedMinutes >= THRESHOLDS.enRouteDrop) {
    incidentType = "EN_ROUTE_DROP_STALE";
    severity = "warning";
    title = "Drop-off travel looks delayed";
    summary = `${input.assignedDriverName ?? "The courier"} has been en route to drop-off for ${elapsedMinutes} min without delivery completion.`;
    likelyCause = "Traffic, routing, or courier progress may need review.";
    currentState = "The job is EN_ROUTE_DROP and delivery completion is late against the current stage.";
    recommendedNextAction = "Review the job timeline, confirm courier progress, and send a calm delay update if needed.";
  }

  if (!incidentType || !severity) {
    return null;
  }

  const reviewCustomer = severity === "critical" || input.jobStatus !== "EN_ROUTE_DROP";

  return OperationalIncidentSummarySchema.parse({
    incidentType,
    severity,
    jobId: input.jobId,
    orderId: input.orderId,
    title,
    summary,
    likelyCause,
    currentState,
    elapsedMinutes,
    evidence: {
      currentJobStatus: input.jobStatus,
      currentOrderStatus: input.orderStatus,
      currentPaymentStatus: input.paymentStatus,
      assignedDriverName: input.assignedDriverName,
      lastTimelineEventType: input.lastTimelineEventType,
      lastTimelineEventAt: input.lastTimelineEventAt,
      dispatchAttemptsCount: input.dispatchAttemptsCount
    },
    recommendedNextAction,
    links: {
      jobHref: `/app/jobs/${input.jobId}`,
      orderHref: input.orderId ? `/app/orders/${input.orderId}` : null,
      paymentsHref:
        incidentType === "PAYMENT_AUTHORIZED_DELIVERY_BLOCKED" || input.paymentStatus === "FAILED"
          ? "/app/payments"
          : null
    },
    communicationDrafts: {
      customerDraft: buildCustomerDraft({ title, restaurantName: input.restaurantName, needsCheck: reviewCustomer }),
      restaurantDraft: buildRestaurantDraft({ customerName: input.customerName, needsCheck: true }),
      driverDraft: buildDriverDraft({
        assignedDriverName: input.assignedDriverName,
        shouldAskForUpdate: ["ASSIGNED", "EN_ROUTE_PICKUP", "PICKED_UP", "EN_ROUTE_DROP"].includes(input.jobStatus)
      })
    }
  });
}

@Injectable()
export class IncidentIntelligenceService {
  constructor(private readonly pg: PgService) {}

  async getBusinessIncidentSummary(jobId: string, userId: string) {
    const context = await this.pg.query<IncidentContextRow>(
      `select
          o.id as order_id,
          p.id as payment_id,
          j.id as job_id,
          j.status::text as job_status,
          o.status::text as order_status,
          p.status::text as payment_status,
          o.customer_name,
          r.name as restaurant_name,
          j.assigned_driver_id,
          du.display_name as assigned_driver_name,
          j.created_at as job_created_at,
          j.updated_at as job_updated_at,
          j.dispatch_failed_at
       from public.jobs j
       left join public.customer_orders o on o.job_id = j.id
       left join public.payments p on p.job_id = j.id
       left join public.restaurants r on r.id = o.restaurant_id
       left join public.drivers d on d.id = j.assigned_driver_id
       left join public.users du on du.id = d.user_id
       where j.id = $1
         and exists (
           select 1
           from public.org_memberships m
           where m.org_id = j.org_id
             and m.user_id = $2
             and m.is_active = true
             and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
         )
       limit 1`,
      [jobId, userId]
    );

    const row = context.rows[0];
    if (!row) {
      return null;
    }

    return this.buildForContext(row);
  }

  async getAdminIncidentSummary(jobId: string) {
    const context = await this.pg.query<IncidentContextRow>(
      `select
          o.id as order_id,
          p.id as payment_id,
          j.id as job_id,
          j.status::text as job_status,
          o.status::text as order_status,
          p.status::text as payment_status,
          o.customer_name,
          r.name as restaurant_name,
          j.assigned_driver_id,
          du.display_name as assigned_driver_name,
          j.created_at as job_created_at,
          j.updated_at as job_updated_at,
          j.dispatch_failed_at
       from public.jobs j
       left join public.customer_orders o on o.job_id = j.id
       left join public.payments p on p.job_id = j.id
       left join public.restaurants r on r.id = o.restaurant_id
       left join public.drivers d on d.id = j.assigned_driver_id
       left join public.users du on du.id = d.user_id
       where j.id = $1
       limit 1`,
      [jobId]
    );

    const row = context.rows[0];
    if (!row) {
      return null;
    }

    return this.buildForContext(row);
  }

  private async buildForContext(row: IncidentContextRow) {
    const [timelineResult, attemptsResult] = await Promise.all([
      this.pg.query<IncidentTimelineRow>(
        `select event_type, created_at
         from public.job_events
         where job_id = $1
         order by created_at desc
         limit 25`,
        [row.job_id]
      ),
      this.pg.query<{ count: string | number }>(
        `select count(*)::text as count
         from public.job_dispatch_attempts
         where job_id = $1`,
        [row.job_id]
      )
    ]);

    const lastEvent = findLatestEvent(timelineResult.rows);
    const stageAnchorAt = findStageAnchor(
      row.job_status,
      timelineResult.rows,
      toIsoDateTime(row.job_updated_at ?? row.job_created_at),
      toNullableIsoDateTime(row.dispatch_failed_at)
    );

    return buildOperationalIncidentSummary({
      jobId: row.job_id,
      orderId: row.order_id,
      paymentId: row.payment_id,
      customerName: row.customer_name,
      restaurantName: row.restaurant_name,
      jobStatus: row.job_status,
      orderStatus: row.order_status,
      paymentStatus: row.payment_status,
      assignedDriverId: row.assigned_driver_id,
      assignedDriverName: row.assigned_driver_name,
      jobCreatedAt: toIsoDateTime(row.job_created_at),
      jobUpdatedAt: toIsoDateTime(row.job_updated_at),
      dispatchFailedAt: toNullableIsoDateTime(row.dispatch_failed_at),
      dispatchAttemptsCount: Number(attemptsResult.rows[0]?.count ?? 0),
      lastTimelineEventType: lastEvent.type,
      lastTimelineEventAt: lastEvent.at,
      stageAnchorAt
    });
  }
}
