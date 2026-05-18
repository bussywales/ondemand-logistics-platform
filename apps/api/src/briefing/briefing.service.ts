import { Injectable } from "@nestjs/common";
import {
  DailyBriefingSchema,
  type CustomerOrderStatus,
  type DailyBriefingDto,
  type DailyBriefingEntityType,
  type DailyBriefingItemCategory,
  type DailyBriefingItemDto,
  type DailyBriefingRecommendationDto,
  type DailyBriefingScope,
  type JobStatus,
  type PaymentStatus,
  type PayoutLedgerStatus,
  type SupportEscalationSeverity,
  type SupportEscalationStatus
} from "@shipwright/contracts";
import { toIsoDateTime, toNullableIsoDateTime } from "../database/mapper.js";
import { PgService } from "../database/pg.service.js";
import { DispatchRecoveryService } from "./dispatch-recovery.service.js";
import { IncidentIntelligenceService } from "./incident-intelligence.service.js";

type BriefingRow = {
  org_id: string | null;
  org_name: string | null;
  order_id: string;
  customer_name: string;
  order_status: CustomerOrderStatus;
  order_created_at: string | Date;
  order_updated_at: string | Date;
  payment_id: string;
  payment_status: PaymentStatus;
  amount_captured_cents: number;
  payout_status: PayoutLedgerStatus | null;
  payout_hold_reason: string | null;
  payment_updated_at: string | Date;
  job_id: string;
  job_status: JobStatus;
  assigned_driver_id: string | null;
  eta_minutes: number;
  job_updated_at: string | Date;
  dispatch_failed_at: string | Date | null;
  restaurant_name: string;
  restaurant_slug: string;
};

type SupportPostureRow = {
  id: string;
  org_id: string | null;
  org_name: string | null;
  order_id: string | null;
  job_id: string | null;
  status: SupportEscalationStatus;
  severity: SupportEscalationSeverity;
  title: string;
  note: string;
  created_at: string | Date;
  updated_at: string | Date;
  restaurant_name: string | null;
  customer_name: string | null;
};

type OperationalBriefingCategory = Exclude<DailyBriefingItemCategory, "support_follow_up">;

type DailyBriefingCategoryConfig = {
  category: OperationalBriefingCategory;
  severity: DailyBriefingItemDto["severity"];
  title: string;
  entityType: DailyBriefingEntityType;
  href: (row: BriefingRow) => string;
  summary: (row: BriefingRow, ageMinutes: number) => string;
  reason: (row: BriefingRow) => string;
  detectedAt: (row: BriefingRow) => string;
};

const ACTIVE_JOB_STATUSES: JobStatus[] = [
  "REQUESTED",
  "ASSIGNED",
  "EN_ROUTE_PICKUP",
  "PICKED_UP",
  "EN_ROUTE_DROP",
  "IN_PROGRESS"
];

const REQUESTED_THRESHOLD_MINUTES = 15;
const ASSIGNED_THRESHOLD_MINUTES = 20;
const EN_ROUTE_THRESHOLD_MINUTES = 30;
const MAX_CRITICAL_ITEMS = 5;
const MAX_RECOMMENDATIONS = 5;
const UNRESOLVED_SUPPORT_STATUSES: SupportEscalationStatus[] = [
  "OPEN",
  "IN_REVIEW",
  "WAITING_ON_CUSTOMER",
  "WAITING_ON_MERCHANT",
  "WAITING_ON_COURIER"
];
const GUIDANCE =
  "This briefing is based on current ShipWright operational signals. Human approval is required for all recovery actions.";

function minutesBetween(now: Date, value: string) {
  const deltaMs = now.getTime() - new Date(value).getTime();
  return Math.max(0, Math.floor(deltaMs / 60000));
}

function isActiveJob(status: JobStatus) {
  return ACTIVE_JOB_STATUSES.includes(status);
}

function isToday(value: string, now: Date) {
  return new Date(value).toDateString() === now.toDateString();
}

function isPaymentRisk(row: BriefingRow) {
  if (row.payment_status === "FAILED" || row.order_status === "PAYMENT_FAILED") {
    return true;
  }

  if (row.job_status === "DELIVERED" && row.payment_status !== "CAPTURED") {
    return true;
  }

  if (row.payout_status === "FAILED" || Boolean(row.payout_hold_reason)) {
    return true;
  }

  return row.job_status === "DELIVERED" && row.payment_status === "CAPTURED" && row.payout_status === null;
}

function getBriefingCategory(row: BriefingRow, now: Date): OperationalBriefingCategory | null {
  if (row.job_status === "DISPATCH_FAILED") {
    return "dispatch_failed";
  }

  if (row.payment_status === "FAILED" || row.order_status === "PAYMENT_FAILED") {
    return "payment_failed";
  }

  if (row.job_status === "DELIVERED" && row.payment_status !== "CAPTURED") {
    return "delivered_uncaptured";
  }

  if (row.job_status === "REQUESTED" && !row.assigned_driver_id && minutesBetween(now, toIsoDateTime(row.job_updated_at)) >= REQUESTED_THRESHOLD_MINUTES) {
    return "active_without_driver";
  }

  if (row.job_status === "ASSIGNED" && minutesBetween(now, toIsoDateTime(row.job_updated_at)) >= ASSIGNED_THRESHOLD_MINUTES) {
    return "stale_job";
  }

  if (
    ["EN_ROUTE_PICKUP", "PICKED_UP", "EN_ROUTE_DROP"].includes(row.job_status) &&
    minutesBetween(now, toIsoDateTime(row.job_updated_at)) >= EN_ROUTE_THRESHOLD_MINUTES
  ) {
    return "stale_job";
  }

  return null;
}

const CATEGORY_CONFIG: Record<OperationalBriefingCategory, DailyBriefingCategoryConfig> = {
  dispatch_failed: {
    category: "dispatch_failed",
    severity: "danger",
    title: "Dispatch failed",
    entityType: "job",
    href: (row) => `/app/jobs/${row.job_id}`,
    summary: (row, ageMinutes) => `${row.restaurant_name} order for ${row.customer_name} is still waiting for a courier ${ageMinutes} min after dispatch failed.`,
    reason: () => "No eligible driver accepted the latest dispatch attempt.",
    detectedAt: (row) => toNullableIsoDateTime(row.dispatch_failed_at) ?? toIsoDateTime(row.job_updated_at)
  },
  payment_failed: {
    category: "payment_failed",
    severity: "danger",
    title: "Payment failed",
    entityType: "order",
    href: (row) => `/app/orders/${row.order_id}`,
    summary: (row, ageMinutes) => `${row.customer_name}'s order at ${row.restaurant_name} has a failed payment signal after ${ageMinutes} min without recovery.`,
    reason: (row) => `Order is ${row.order_status.replace(/_/g, " ").toLowerCase()} and payment is ${row.payment_status.replace(/_/g, " ").toLowerCase()}.`,
    detectedAt: (row) => toIsoDateTime(row.payment_updated_at)
  },
  delivered_uncaptured: {
    category: "delivered_uncaptured",
    severity: "danger",
    title: "Delivered but payment not captured",
    entityType: "payment",
    href: () => "/app/payments",
    summary: (row, ageMinutes) => `${row.restaurant_name} delivery for ${row.customer_name} completed ${ageMinutes} min ago but the payment is still ${row.payment_status.replace(/_/g, " ").toLowerCase()}.`,
    reason: () => "Delivery reached a terminal state before capture completed.",
    detectedAt: (row) => toIsoDateTime(row.job_updated_at)
  },
  active_without_driver: {
    category: "active_without_driver",
    severity: "warning",
    title: "Active order has no driver",
    entityType: "job",
    href: (row) => `/app/jobs/${row.job_id}`,
    summary: (row, ageMinutes) => `${row.restaurant_name} order for ${row.customer_name} has no assigned driver ${ageMinutes} min into the current job state.`,
    reason: () => "The job is active but no courier is assigned yet.",
    detectedAt: (row) => toIsoDateTime(row.job_updated_at)
  },
  stale_job: {
    category: "stale_job",
    severity: "warning",
    title: "Delivery looks stale",
    entityType: "job",
    href: (row) => `/app/jobs/${row.job_id}`,
    summary: (row, ageMinutes) => `${row.restaurant_name} delivery for ${row.customer_name} has had no fresh job movement for ${ageMinutes} min.`,
    reason: () => "Active delivery state has not advanced within the expected operating window.",
    detectedAt: (row) => toIsoDateTime(row.job_updated_at)
  }
};

export function buildDailyBriefing(rows: BriefingRow[], scope: DailyBriefingScope, now = new Date()): DailyBriefingDto {
  return buildDailyBriefingWithSupport(rows, [], scope, now);
}

export function buildDailyBriefingWithSupport(
  rows: BriefingRow[],
  supportRows: SupportPostureRow[],
  scope: DailyBriefingScope,
  now = new Date()
): DailyBriefingDto {
  const criticalItems: DailyBriefingItemDto[] = [];
  for (const row of rows) {
    const category = getBriefingCategory(row, now);
    if (!category) {
      continue;
    }

    const config = CATEGORY_CONFIG[category];
    const detectedAt = config.detectedAt(row);
    const ageMinutes = minutesBetween(now, detectedAt);

    criticalItems.push({
      id: `${category}:${row.order_id}`,
      category: config.category,
      severity: config.severity,
      title: config.title,
      summary: config.summary(row, ageMinutes),
      reason: config.reason(row),
      entityType: config.entityType,
      entityId:
        config.entityType === "job"
          ? row.job_id
          : config.entityType === "payment"
            ? row.payment_id
            : row.order_id,
      orderId: row.order_id,
      jobId: row.job_id,
      paymentId: row.payment_id,
      orgId: row.org_id,
      orgName: row.org_name,
      restaurantName: row.restaurant_name,
      customerName: row.customer_name,
      orderStatus: row.order_status,
      jobStatus: row.job_status,
      paymentStatus: row.payment_status,
      detectedAt,
      ageMinutes,
      href: config.href(row)
    });
  }

  const openSupportEscalations = supportRows.length;
  const highCriticalSupportEscalations = supportRows.filter((row) => row.severity === "HIGH" || row.severity === "CRITICAL").length;
  const oldestSupportRow = supportRows
    .slice()
    .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime())[0] ?? null;
  const oldestOpenSupportEscalationAgeMinutes = oldestSupportRow ? minutesBetween(now, toIsoDateTime(oldestSupportRow.created_at)) : null;

  if (oldestSupportRow) {
    const entityType: DailyBriefingEntityType = oldestSupportRow.order_id ? "order" : "job";
    const entityId = oldestSupportRow.order_id ?? oldestSupportRow.job_id!;
    const href = oldestSupportRow.order_id ? `/app/orders/${oldestSupportRow.order_id}` : `/app/jobs/${oldestSupportRow.job_id}`;
    const supportAge = oldestOpenSupportEscalationAgeMinutes ?? 0;

    criticalItems.push({
      id: `support_follow_up:${oldestSupportRow.id}`,
      category: "support_follow_up",
      severity: highCriticalSupportEscalations > 0 ? "danger" : "warning",
      title: "Human follow-up open",
      summary: `${openSupportEscalations} support or escalation record${openSupportEscalations === 1 ? "" : "s"} ${openSupportEscalations === 1 ? "needs" : "need"} operator review.`,
      reason: "Support or escalation records need operator review.",
      entityType,
      entityId,
      orderId: oldestSupportRow.order_id,
      jobId: oldestSupportRow.job_id,
      paymentId: null,
      orgId: oldestSupportRow.org_id,
      orgName: oldestSupportRow.org_name,
      restaurantName: oldestSupportRow.restaurant_name,
      customerName: oldestSupportRow.customer_name,
      orderStatus: null,
      jobStatus: null,
      paymentStatus: null,
      detectedAt: toIsoDateTime(oldestSupportRow.created_at),
      ageMinutes: supportAge,
      href
    });
  }

  criticalItems
    .sort((left, right) => {
      const severityWeight = { danger: 0, warning: 1, success: 2 };
      const severityDelta = severityWeight[left.severity] - severityWeight[right.severity];
      if (severityDelta !== 0) {
        return severityDelta;
      }
      return right.ageMinutes - left.ageMinutes;
    });

  criticalItems.length = Math.min(criticalItems.length, MAX_CRITICAL_ITEMS);

  const recommendations: DailyBriefingRecommendationDto[] = criticalItems.map((item) => {
    const action =
      item.category === "support_follow_up"
        ? {
            label: "Review support follow-up",
            summary: "Open the linked order or job and update the support log.",
            href: item.href,
            entityType: item.entityType,
            entityId: item.entityId
          }
        : item.category === "dispatch_failed"
        ? {
            label: "Retry or reassign dispatch",
            summary: "Open the job, retry dispatch, or manually assign a courier after reviewing eligibility.",
            href: item.href,
            entityType: "job" as const,
            entityId: item.jobId ?? item.entityId
          }
        : item.category === "payment_failed"
          ? {
              label: "Review payment risk",
              summary: "Open the order and confirm whether payment recovery or customer escalation is required.",
              href: item.href,
              entityType: "order" as const,
              entityId: item.orderId ?? item.entityId
            }
          : item.category === "delivered_uncaptured"
            ? {
                label: "Open payment risk",
                summary: "Review capture state before treating this delivery as commercially clear.",
                href: "/app/payments",
                entityType: "payment" as const,
                entityId: item.paymentId ?? item.entityId
              }
            : item.category === "active_without_driver"
              ? {
                  label: "Assign driver",
                  summary: "Open the delivery job and review driver assignment options before service slips.",
                  href: item.href,
                  entityType: "job" as const,
                  entityId: item.jobId ?? item.entityId
                }
              : {
                  label: "Review stale delivery",
                  summary: "Open the job timeline and confirm whether the delivery is delayed or missing an update.",
                  href: item.href,
                  entityType: "job" as const,
                  entityId: item.jobId ?? item.entityId
                };

    return {
      id: `rec:${item.id}`,
      label: action.label,
      summary: action.summary,
      href: action.href,
      entityType: action.entityType,
      entityId: action.entityId,
      orderId: item.orderId,
      jobId: item.jobId,
      paymentId: item.paymentId
    };
  }).slice(0, MAX_RECOMMENDATIONS);

  const operatingState = {
    ordersToday: rows.filter((row) => isToday(toIsoDateTime(row.order_created_at), now)).length,
    activeJobs: rows.filter((row) => isActiveJob(row.job_status)).length,
    fulfilledOrders: rows.filter((row) => row.order_status === "FULFILLED" && isToday(toIsoDateTime(row.order_updated_at), now)).length,
    paymentRisks: rows.filter((row) => isPaymentRisk(row)).length,
    openSupportEscalations,
    highCriticalSupportEscalations,
    oldestOpenSupportEscalationAgeMinutes,
    availableDrivers: null
  };

  const attentionCount = criticalItems.length;
  const headline = attentionCount === 0 ? "Operations look clear" : `${attentionCount} item${attentionCount === 1 ? "" : "s"} need attention before service`;
  const summary =
    attentionCount === 0
      ? "No current dispatch, payment, delivery, or support signals require immediate operator intervention."
      : "Review dispatch, payment, delivery, and support follow-up exceptions before expanding service volume.";

  return DailyBriefingSchema.parse({
    scope,
    generatedAt: now.toISOString(),
    headline,
    summary,
    attentionCount,
    criticalItems,
    operatingState,
    recommendations,
    guidance: GUIDANCE
  });
}

@Injectable()
export class BriefingService {
  constructor(
    private readonly pg: PgService,
    private readonly recoveryService?: DispatchRecoveryService,
    private readonly incidentService?: IncidentIntelligenceService
  ) {}

  async getBusinessDailyBriefing(userId: string) {
    const [result, supportResult] = await Promise.all([
      this.pg.query<BriefingRow>(this.buildDailyBriefingQuery(true), [userId]),
      this.pg.query<SupportPostureRow>(this.buildSupportEscalationsQuery(true), [userId])
    ]);
    return this.enrichIntelligence(buildDailyBriefingWithSupport(result.rows, supportResult.rows, "business"), userId, false);
  }

  async getAdminDailyBriefing() {
    const [result, supportResult] = await Promise.all([
      this.pg.query<BriefingRow>(this.buildDailyBriefingQuery(false)),
      this.pg.query<SupportPostureRow>(this.buildSupportEscalationsQuery(false))
    ]);
    return this.enrichIntelligence(buildDailyBriefingWithSupport(result.rows, supportResult.rows, "admin"), null, true);
  }

  private async enrichIntelligence(
    briefing: DailyBriefingDto,
    userId: string | null,
    admin: boolean
  ) {
    if ((!this.recoveryService && !this.incidentService) || briefing.criticalItems.length === 0) {
      return briefing;
    }

    const criticalItems = await Promise.all(
      briefing.criticalItems.map(async (item) => {
        if (!item.jobId || item.category === "support_follow_up") {
          return item;
        }

        const [recoverySuggestion, incidentSummary] = await Promise.all([
          this.recoveryService
            ? admin
              ? this.recoveryService.getAdminRecoverySuggestion(item.jobId)
              : this.recoveryService.getBusinessRecoverySuggestion(item.jobId, userId!)
            : Promise.resolve(null),
          this.incidentService
            ? admin
              ? this.incidentService.getAdminIncidentSummary(item.jobId)
              : this.incidentService.getBusinessIncidentSummary(item.jobId, userId!)
            : Promise.resolve(null)
        ]);

        return {
          ...item,
          recoverySuggestion,
          incidentSummary
        };
      })
    );

    return DailyBriefingSchema.parse({
      ...briefing,
      criticalItems
    });
  }

  private buildDailyBriefingQuery(scopeToMemberships: boolean) {
    const whereClause = scopeToMemberships
      ? `where exists (
           select 1
           from public.org_memberships m
           where m.org_id = o.org_id
             and m.user_id = $1
             and m.is_active = true
             and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
         )`
      : "";

    return `select
        o.org_id,
        org.name as org_name,
        o.id as order_id,
        o.customer_name,
        o.status::text as order_status,
        o.created_at as order_created_at,
        o.updated_at as order_updated_at,
        p.id as payment_id,
        p.status::text as payment_status,
        p.amount_captured_cents,
        pl.status::text as payout_status,
        pl.hold_reason as payout_hold_reason,
        p.updated_at as payment_updated_at,
        j.id as job_id,
        j.status::text as job_status,
        j.assigned_driver_id,
        j.eta_minutes,
        j.updated_at as job_updated_at,
        j.dispatch_failed_at,
        r.name as restaurant_name,
        r.slug as restaurant_slug
      from public.customer_orders o
      join public.orgs org on org.id = o.org_id
      join public.restaurants r on r.id = o.restaurant_id
      join public.jobs j on j.id = o.job_id
      join public.payments p on p.id = o.payment_id
      left join public.payout_ledger pl on pl.job_id = j.id
      ${whereClause}
      order by greatest(o.updated_at, j.updated_at, p.updated_at) desc
      limit 100`;
  }

  private buildSupportEscalationsQuery(scopeToMemberships: boolean) {
    const whereClause = scopeToMemberships
      ? `and exists (
           select 1
           from public.org_memberships m
           where m.org_id = se.org_id
             and m.user_id = $1
             and m.is_active = true
             and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
         )`
      : "";

    return `select
        se.id,
        se.org_id,
        org.name as org_name,
        coalesce(order_from_escalation.id, order_from_job.id) as order_id,
        se.job_id,
        se.status::text as status,
        se.severity::text as severity,
        se.title,
        se.note,
        se.created_at,
        se.updated_at,
        restaurant.name as restaurant_name,
        coalesce(order_from_escalation.customer_name, order_from_job.customer_name) as customer_name
      from public.support_escalations se
      left join public.orgs org on org.id = se.org_id
      left join public.customer_orders order_from_escalation on order_from_escalation.id = se.order_id
      left join public.jobs job_from_escalation on job_from_escalation.id = se.job_id
      left join public.customer_orders order_from_job on order_from_job.job_id = job_from_escalation.id
      left join public.restaurants restaurant on restaurant.id = coalesce(order_from_escalation.restaurant_id, order_from_job.restaurant_id)
      where se.status::text = any(array[${UNRESOLVED_SUPPORT_STATUSES.map((status) => `'${status}'`).join(", ")}])
      ${whereClause}
      order by se.created_at asc
      limit 50`;
  }
}
