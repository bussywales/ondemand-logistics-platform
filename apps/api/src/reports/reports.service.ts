import { Injectable, UnprocessableEntityException } from "@nestjs/common";
import {
  EndOfDayReportSchema,
  type CustomerOrderStatus,
  type EndOfDayActionItemDto,
  type EndOfDayActionType,
  type EndOfDayEvidenceLinkDto,
  type EndOfDayReportDate,
  type EndOfDayReportDto,
  type EndOfDayReportScope,
  type JobStatus,
  type PaymentStatus,
  type PayoutLedgerStatus,
  type SupportEscalationSeverity,
  type SupportEscalationStatus
} from "@shipwright/contracts";
import { toIsoDateTime } from "../database/mapper.js";
import { PgService } from "../database/pg.service.js";

type ReportRow = {
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
  job_updated_at: string | Date;
  dispatch_failed_at: string | Date | null;
  restaurant_name: string;
};

type SupportReportRow = {
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
  resolved_at: string | Date | null;
  restaurant_name: string | null;
  customer_name: string | null;
};

type ReportCategory =
  | "dispatch_failed"
  | "payment_failed"
  | "delivered_uncaptured"
  | "active_without_driver"
  | "stale_job"
  | "payout_review";

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
const MAX_ACTIONS = 8;
const MAX_EVIDENCE = 8;
const UNRESOLVED_SUPPORT_STATUSES: SupportEscalationStatus[] = [
  "OPEN",
  "IN_REVIEW",
  "WAITING_ON_CUSTOMER",
  "WAITING_ON_MERCHANT",
  "WAITING_ON_COURIER"
];
const GUIDANCE =
  "This report summarises operational signals. Operators remain responsible for recovery, refunds, cancellations, and customer communications.";

function minutesBetween(now: Date, value: string) {
  const deltaMs = now.getTime() - new Date(value).getTime();
  return Math.max(0, Math.floor(deltaMs / 60000));
}

function isActiveJob(status: JobStatus) {
  return ACTIVE_JOB_STATUSES.includes(status);
}

function isPaymentRisk(row: ReportRow) {
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

function isDelayedJob(row: ReportRow, now: Date) {
  const ageMinutes = minutesBetween(now, toIsoDateTime(row.job_updated_at));

  if (row.job_status === "REQUESTED" && !row.assigned_driver_id) {
    return ageMinutes >= REQUESTED_THRESHOLD_MINUTES;
  }

  if (row.job_status === "ASSIGNED") {
    return ageMinutes >= ASSIGNED_THRESHOLD_MINUTES;
  }

  if (["EN_ROUTE_PICKUP", "PICKED_UP", "EN_ROUTE_DROP"].includes(row.job_status)) {
    return ageMinutes >= EN_ROUTE_THRESHOLD_MINUTES;
  }

  return false;
}

function getReportCategory(row: ReportRow, now: Date): ReportCategory | null {
  if (row.job_status === "DISPATCH_FAILED") {
    return "dispatch_failed";
  }

  if (row.payment_status === "FAILED" || row.order_status === "PAYMENT_FAILED") {
    return "payment_failed";
  }

  if (row.job_status === "DELIVERED" && row.payment_status !== "CAPTURED") {
    return "delivered_uncaptured";
  }

  if (row.job_status === "REQUESTED" && !row.assigned_driver_id && isDelayedJob(row, now)) {
    return "active_without_driver";
  }

  if (isDelayedJob(row, now)) {
    return "stale_job";
  }

  if (row.payout_status === "FAILED" || Boolean(row.payout_hold_reason) || (row.job_status === "DELIVERED" && row.payment_status === "CAPTURED" && row.payout_status === null)) {
    return "payout_review";
  }

  return null;
}

function getDriverFollowUpIncidentCount(rows: ReportRow[], now: Date) {
  return rows.filter((row) => {
    const category = getReportCategory(row, now);
    return category === "stale_job" && ["ASSIGNED", "EN_ROUTE_PICKUP"].includes(row.job_status);
  }).length;
}

function buildAction(row: ReportRow, category: ReportCategory): EndOfDayActionItemDto[] {
  const base = {
    orderId: row.order_id,
    jobId: row.job_id,
    paymentId: row.payment_id
  };

  if (category === "dispatch_failed") {
    return [
      {
        id: `action:dispatch:${row.job_id}`,
        type: "RETRY_DISPATCH",
        severity: "danger",
        label: "Retry dispatch",
        summary: `${row.restaurant_name} delivery for ${row.customer_name} remains unresolved after dispatch failed.`,
        href: `/app/jobs/${row.job_id}`,
        entityType: "job",
        entityId: row.job_id,
        ...base
      }
    ];
  }

  if (category === "active_without_driver") {
    return [
      {
        id: `action:assign:${row.job_id}`,
        type: "ASSIGN_DRIVER",
        severity: "warning",
        label: "Assign driver",
        summary: `${row.customer_name}'s order is active but no courier is assigned yet.`,
        href: `/app/jobs/${row.job_id}`,
        entityType: "job",
        entityId: row.job_id,
        ...base
      }
    ];
  }

  if (category === "payment_failed" || category === "delivered_uncaptured" || category === "payout_review") {
    return [
      {
        id: `action:payment:${row.order_id}`,
        type: "REVIEW_PAYMENT_RISK",
        severity: category === "payment_failed" || category === "delivered_uncaptured" ? "danger" : "warning",
        label: "Review payment risk",
        summary: `${row.restaurant_name} order for ${row.customer_name} needs payment or payout review.`,
        href: "/app/payments",
        entityType: "payment",
        entityId: row.payment_id,
        ...base
      }
    ];
  }

  if (category === "stale_job") {
    return [
      {
        id: `action:delay:${row.job_id}`,
        type: "CHECK_DELAYED_ORDER",
        severity: "warning",
        label: "Check delayed order",
        summary: `${row.customer_name}'s delivery has not progressed within the expected operating window.`,
        href: `/app/jobs/${row.job_id}`,
        entityType: "job",
        entityId: row.job_id,
        ...base
      },
      {
        id: `action:communication:${row.job_id}`,
        type: "REVIEW_CUSTOMER_COMMUNICATION_DRAFT",
        severity: "info",
        label: "Review customer communication draft",
        summary: "Check whether a delay update should be reviewed before contacting the customer or restaurant.",
        href: `/app/jobs/${row.job_id}`,
        entityType: "job",
        entityId: row.job_id,
        ...base
      }
    ];
  }

  return [];
}

function buildEvidenceLink(row: ReportRow, category: ReportCategory): EndOfDayEvidenceLinkDto {
  if (category === "payment_failed" || category === "delivered_uncaptured" || category === "payout_review") {
    return {
      id: `evidence:order:${row.order_id}`,
      label: `Order ${row.order_id.slice(0, 8).toUpperCase()}`,
      summary: `${row.restaurant_name} · payment ${row.payment_status.toLowerCase().replaceAll("_", " ")}`,
      href: `/app/orders/${row.order_id}`,
      entityType: "order",
      entityId: row.order_id,
      orderId: row.order_id,
      jobId: row.job_id,
      paymentId: row.payment_id
    };
  }

  return {
    id: `evidence:job:${row.job_id}`,
    label: `Job ${row.job_id.slice(0, 8).toUpperCase()}`,
    summary: `${row.restaurant_name} · job ${row.job_status.toLowerCase().replaceAll("_", " ")}`,
    href: `/app/jobs/${row.job_id}`,
    entityType: "job",
    entityId: row.job_id,
    orderId: row.order_id,
    jobId: row.job_id,
    paymentId: row.payment_id
  };
}

function buildSupportAction(row: SupportReportRow): EndOfDayActionItemDto | null {
  const entityId = row.order_id ?? row.job_id;
  if (!entityId) {
    return null;
  }

  const entityType = row.order_id ? "order" : "job";
  const href = row.order_id ? `/app/orders/${row.order_id}` : `/app/jobs/${row.job_id}`;

  return {
    id: `action:support:${row.id}`,
    type: "REVIEW_SUPPORT_ESCALATION",
    severity: row.severity === "CRITICAL" ? "danger" : "warning",
    label: "Review support escalation",
    summary: `${row.title} remains ${row.status.toLowerCase().replaceAll("_", " ")}${row.customer_name ? ` for ${row.customer_name}` : ""}.`,
    href,
    entityType,
    entityId,
    orderId: row.order_id,
    jobId: row.job_id,
    paymentId: null
  };
}

function buildSupportEvidenceLink(row: SupportReportRow): EndOfDayEvidenceLinkDto | null {
  const entityId = row.order_id ?? row.job_id;
  if (!entityId) {
    return null;
  }

  const entityType = row.order_id ? "order" : "job";
  const href = row.order_id ? `/app/orders/${row.order_id}` : `/app/jobs/${row.job_id}`;

  return {
    id: `evidence:support:${row.id}`,
    label: `Support ${row.id.slice(0, 8).toUpperCase()}`,
    summary: `${row.restaurant_name ?? row.org_name ?? "Support"} · ${row.severity.toLowerCase()} ${row.status.toLowerCase().replaceAll("_", " ")}`,
    href,
    entityType,
    entityId,
    orderId: row.order_id,
    jobId: row.job_id,
    paymentId: null
  };
}

export function buildEndOfDayReport(
  rows: ReportRow[],
  scope: EndOfDayReportScope,
  date: EndOfDayReportDate,
  now = new Date(),
  supportRows: SupportReportRow[] = []
): EndOfDayReportDto {
  const unresolvedSupportRows = supportRows.filter((row) => UNRESOLVED_SUPPORT_STATUSES.includes(row.status));
  const supportClosedToday = supportRows.filter((row) => row.resolved_at !== null).length;
  const categories = rows
    .map((row) => ({ row, category: getReportCategory(row, now) }))
    .filter((item): item is { row: ReportRow; category: ReportCategory } => item.category !== null);

  const unresolvedActions = Array.from(
    new Map(
      categories
        .flatMap(({ row, category }) => buildAction(row, category))
        .concat(unresolvedSupportRows.map(buildSupportAction).filter((item): item is EndOfDayActionItemDto => item !== null))
        .map((item) => [item.id, item] as const)
    ).values()
  ).slice(0, MAX_ACTIONS);

  const evidenceLinks = Array.from(
    new Map(
      categories
        .map(({ row, category }) => buildEvidenceLink(row, category))
        .concat(unresolvedSupportRows.map(buildSupportEvidenceLink).filter((item): item is EndOfDayEvidenceLinkDto => item !== null))
        .map((item) => [item.id, item] as const)
    ).values()
  ).slice(0, MAX_EVIDENCE);

  const fulfilledOrders = rows.filter((row) => row.order_status === "FULFILLED").length;
  const unresolvedCount = unresolvedActions.length;
  const highCriticalSupportEscalations = unresolvedSupportRows.filter((row) => row.severity === "HIGH" || row.severity === "CRITICAL").length;

  return EndOfDayReportSchema.parse({
    scope,
    date,
    generatedAt: now.toISOString(),
    headline:
      unresolvedCount > 0
        ? `${fulfilledOrders} orders completed, ${unresolvedCount} item${unresolvedCount === 1 ? "" : "s"} need follow-up`
        : "No unresolved items today",
    summary:
      unresolvedCount > 0
        ? "Dispatch, payment, delay, support, and payout signals are summarised here for closeout review."
        : "The day closed without unresolved dispatch, payment, delay, or support follow-up items.",
    unresolvedCount,
    operatingSummary: {
      ordersReceived: rows.length,
      fulfilledOrders,
      activeOrUnresolvedOrders: rows.filter((row) => row.order_status !== "FULFILLED" && row.order_status !== "PAYMENT_FAILED").length,
      cancelledOrPaymentFailedOrders: rows.filter((row) => row.order_status === "PAYMENT_FAILED" || row.job_status === "CANCELLED").length,
      activeJobs: rows.filter((row) => isActiveJob(row.job_status)).length,
      deliveredJobs: rows.filter((row) => row.job_status === "DELIVERED" || row.job_status === "COMPLETED").length,
      dispatchFailures: rows.filter((row) => row.job_status === "DISPATCH_FAILED").length,
      staleOrDelayedJobs: rows.filter((row) => isDelayedJob(row, now)).length
    },
    paymentsSummary: {
      authorized: rows.filter((row) => row.payment_status === "AUTHORIZED").length,
      captured: rows.filter((row) => row.payment_status === "CAPTURED").length,
      failed: rows.filter((row) => row.payment_status === "FAILED" || row.order_status === "PAYMENT_FAILED").length,
      deliveredNotCaptured: rows.filter((row) => row.job_status === "DELIVERED" && row.payment_status !== "CAPTURED").length,
      payoutReviewCount: rows.filter((row) => row.payout_status === "FAILED" || Boolean(row.payout_hold_reason) || (row.job_status === "DELIVERED" && row.payment_status === "CAPTURED" && row.payout_status === null)).length
    },
    incidentsSummary: {
      dispatchFailed: rows.filter((row) => row.job_status === "DISPATCH_FAILED").length,
      delayIncidents: rows.filter((row) => isDelayedJob(row, now)).length,
      paymentRisks: rows.filter((row) => isPaymentRisk(row)).length,
      driverFollowUpIncidents: getDriverFollowUpIncidentCount(rows, now),
      openSupportEscalations: unresolvedSupportRows.length,
      highCriticalSupportEscalations,
      supportClosedToday,
      unresolvedRecommendations: unresolvedCount
    },
    unresolvedActions,
    evidenceLinks,
    guidance: GUIDANCE
  });
}

function normalizeDateInput(value?: string): EndOfDayReportDate {
  if (!value) {
    return new Date().toISOString().slice(0, 10) as EndOfDayReportDate;
  }

  const parsed = EndOfDayReportSchema.shape.date.safeParse(value);
  if (!parsed.success) {
    throw new UnprocessableEntityException("invalid_report_date");
  }

  return parsed.data;
}

@Injectable()
export class ReportsService {
  constructor(private readonly pg: PgService) {}

  async getBusinessEndOfDayReport(userId: string, date?: string) {
    const targetDate = normalizeDateInput(date);
    const [result, supportResult] = await Promise.all([
      this.pg.query<ReportRow>(this.buildEndOfDayQuery(true), [userId, targetDate]),
      this.pg.query<SupportReportRow>(this.buildSupportEscalationsQuery(true), [userId, targetDate])
    ]);
    return buildEndOfDayReport(result.rows, "business", targetDate, new Date(), supportResult.rows);
  }

  async getAdminEndOfDayReport(date?: string) {
    const targetDate = normalizeDateInput(date);
    const [result, supportResult] = await Promise.all([
      this.pg.query<ReportRow>(this.buildEndOfDayQuery(false), [targetDate]),
      this.pg.query<SupportReportRow>(this.buildSupportEscalationsQuery(false), [targetDate])
    ]);
    return buildEndOfDayReport(result.rows, "admin", targetDate, new Date(), supportResult.rows);
  }

  private buildEndOfDayQuery(scopeToMemberships: boolean) {
    return `
      select
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
        j.updated_at as job_updated_at,
        j.dispatch_failed_at,
        r.name as restaurant_name
      from public.customer_orders o
      join public.payments p on p.id = o.payment_id
      join public.jobs j on j.id = o.job_id
      join public.restaurants r on r.id = o.restaurant_id
      left join public.orgs org on org.id = o.org_id
      left join public.payout_ledger pl on pl.payment_id = p.id
      where o.created_at::date = $${scopeToMemberships ? "2" : "1"}::date
      ${scopeToMemberships ? `
        and exists (
          select 1
          from public.org_memberships m
          where m.org_id = o.org_id
            and m.user_id = $1
            and m.is_active = true
            and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
        )
      ` : ""}
      order by o.created_at desc
    `;
  }

  private buildSupportEscalationsQuery(scopeToMemberships: boolean) {
    return `
      select
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
        se.resolved_at,
        restaurant.name as restaurant_name,
        coalesce(order_from_escalation.customer_name, order_from_job.customer_name) as customer_name
      from public.support_escalations se
      left join public.orgs org on org.id = se.org_id
      left join public.customer_orders order_from_escalation on order_from_escalation.id = se.order_id
      left join public.jobs job_from_escalation on job_from_escalation.id = se.job_id
      left join public.customer_orders order_from_job on order_from_job.job_id = job_from_escalation.id
      left join public.restaurants restaurant on restaurant.id = coalesce(order_from_escalation.restaurant_id, order_from_job.restaurant_id)
      where (
          (
            se.status::text = any(array[${UNRESOLVED_SUPPORT_STATUSES.map((status) => `'${status}'`).join(", ")}])
            and se.created_at::date <= $${scopeToMemberships ? "2" : "1"}::date
          )
          or se.resolved_at::date = $${scopeToMemberships ? "2" : "1"}::date
        )
      ${scopeToMemberships ? `
        and exists (
          select 1
          from public.org_memberships m
          where m.org_id = se.org_id
            and m.user_id = $1
            and m.is_active = true
            and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
        )
      ` : ""}
      order by se.created_at asc
      limit 100
    `;
  }
}
