import { Injectable } from "@nestjs/common";
import {
  DispatchRecoverySuggestionSchema,
  type DispatchRecoveryAction,
  type DispatchRecoveryIssueType,
  type DispatchRecoverySuggestionDto,
  type JobOfferStatus,
  type JobStatus,
  type PaymentStatus,
  type VehicleType
} from "@shipwright/contracts";
import { toIsoDateTime, toNullableIsoDateTime } from "../database/mapper.js";
import { PgService } from "../database/pg.service.js";

type RecoveryContextRow = {
  order_id: string | null;
  payment_id: string | null;
  job_id: string;
  vehicle_required: VehicleType;
  job_status: JobStatus;
  assigned_driver_id: string | null;
  job_updated_at: string | Date;
  dispatch_failed_at: string | Date | null;
  payment_status: PaymentStatus | null;
};

type RecoveryOfferSummaryRow = {
  offer_count: string | number;
  latest_offer_status: JobOfferStatus | null;
  latest_offered_at: string | Date | null;
  latest_expires_at: string | Date | null;
};

type RecoveryDriverCandidateRow = {
  is_active: boolean;
  availability_status: "ONLINE" | "OFFLINE";
  active_job_id: string | null;
  verification_status: "APPROVED" | "PENDING" | "REJECTED" | "MISSING";
  has_matching_vehicle: boolean;
  has_open_offer: boolean;
  last_location_at: string | Date | null;
};

type RecoveryTelemetry = {
  offerCount: number;
  latestOfferStatus: JobOfferStatus | null;
  latestOfferedAt: string | null;
  latestExpiresAt: string | null;
  eligibleDriverCount: number;
  onlineReadyDriverCount: number;
  matchingVehicleOnlineCount: number;
  driverPoolCount: number;
};

type BuildDispatchRecoveryInput = {
  jobId: string;
  orderId: string | null;
  paymentId: string | null;
  jobStatus: JobStatus;
  paymentStatus: PaymentStatus | null;
  vehicleRequired: VehicleType;
  assignedDriverId: string | null;
  jobUpdatedAt: string;
  dispatchFailedAt: string | null;
  telemetry: RecoveryTelemetry;
};

const DISPATCH_RELEVANT_STATUSES: JobStatus[] = ["DISPATCH_FAILED", "REQUESTED", "ASSIGNED"];
const OFFER_STALE_MINUTES = Math.max(5, Math.ceil(Number(process.env.DISPATCH_OFFER_TTL_SECONDS ?? 30) / 60));
const ADVISORY =
  "Advisory only. Human approval is required before retrying dispatch, assigning a courier, contacting the customer, or cancelling the order.";

function minutesBetween(now: Date, value: string) {
  return Math.max(0, Math.floor((now.getTime() - new Date(value).getTime()) / 60000));
}

function evaluateDriverEligibility(row: RecoveryDriverCandidateRow) {
  const offline = row.availability_status !== "ONLINE";
  const activeJob = Boolean(row.active_job_id);
  const verificationBlocked = row.verification_status !== "APPROVED";
  const vehicleMismatch = !row.has_matching_vehicle;
  const openOffer = row.has_open_offer;
  const eligible = !offline && !activeJob && !verificationBlocked && !vehicleMismatch && !openOffer && row.is_active;

  return {
    eligible,
    onlineReady: row.is_active && !activeJob && !verificationBlocked && row.availability_status === "ONLINE",
    matchingVehicleReady:
      row.is_active && !activeJob && !verificationBlocked && row.availability_status === "ONLINE" && row.has_matching_vehicle
  };
}

export function buildDispatchRecoverySuggestion(
  input: BuildDispatchRecoveryInput,
  now = new Date()
): DispatchRecoverySuggestionDto | null {
  if (!DISPATCH_RELEVANT_STATUSES.includes(input.jobStatus) && input.paymentStatus !== "FAILED") {
    return null;
  }

  const issueAnchor = input.dispatchFailedAt ?? input.telemetry.latestOfferedAt ?? input.jobUpdatedAt;
  const ageMinutes = minutesBetween(now, issueAnchor);
  const paymentStatus = input.paymentStatus ?? "REQUIRES_PAYMENT_METHOD";
  const staleOffer =
    input.telemetry.latestOfferStatus === "OFFERED" &&
    input.telemetry.latestOfferedAt !== null &&
    ageMinutes >= OFFER_STALE_MINUTES;

  let issueType: DispatchRecoveryIssueType;
  let recommendedAction: DispatchRecoveryAction;
  let explanation: string;

  if (["FAILED", "REQUIRES_PAYMENT_METHOD", "REQUIRES_CONFIRMATION", "CANCELLED"].includes(paymentStatus)) {
    issueType = "PAYMENT_BLOCKER";
    recommendedAction = "REVIEW_PAYMENT_RISK";
    explanation = `Review payment before dispatch: payment is ${paymentStatus.replace(/_/g, " ").toLowerCase()}.`;
  } else if (staleOffer) {
    issueType = "OPEN_OFFER_STALE";
    if (input.telemetry.eligibleDriverCount > 0) {
      recommendedAction = "RETRY_DISPATCH";
      explanation = "Retry dispatch first: an older courier offer is still stale and an eligible courier is available now.";
    } else {
      recommendedAction = "REVIEW_DRIVER_POOL";
      explanation = "Review driver pool: the latest courier offer looks stale and no clearly eligible courier is available now.";
    }
  } else if (input.telemetry.eligibleDriverCount > 0) {
    issueType = "DISPATCH_FAILED";
    recommendedAction = "MANUAL_ASSIGN_DRIVER";
    explanation = `Manual assignment recommended: ${input.telemetry.eligibleDriverCount} eligible courier${input.telemetry.eligibleDriverCount === 1 ? " is" : "s are"} online.`;
  } else if (input.telemetry.driverPoolCount > 0 && input.telemetry.onlineReadyDriverCount > 0 && input.telemetry.matchingVehicleOnlineCount === 0) {
    issueType = "VEHICLE_MISMATCH";
    recommendedAction = "REVIEW_DRIVER_POOL";
    explanation = `Review driver pool: current job requires ${input.vehicleRequired} and no matching online courier is available.`;
  } else if (input.telemetry.driverPoolCount > 0 && input.telemetry.onlineReadyDriverCount === 0) {
    issueType = "DRIVER_UNAVAILABLE";
    recommendedAction = "REVIEW_DRIVER_POOL";
    explanation = "Review driver pool: no approved online courier is currently available for assignment.";
  } else if (input.telemetry.offerCount === 0) {
    issueType = "DISPATCH_FAILED";
    recommendedAction = "RETRY_DISPATCH";
    explanation = "Retry dispatch first: no open driver offer is active.";
  } else {
    issueType = "NO_ELIGIBLE_DRIVER";
    recommendedAction = "REVIEW_DRIVER_POOL";
    explanation = "Review driver pool: the current staged courier set does not produce an eligible assignment path.";
  }

  return DispatchRecoverySuggestionSchema.parse({
    jobId: input.jobId,
    orderId: input.orderId,
    issueType,
    recommendedAction,
    explanation,
    evidence: {
      currentJobStatus: input.jobStatus,
      paymentStatus,
      offerCount: input.telemetry.offerCount,
      latestOfferStatus: input.telemetry.latestOfferStatus,
      eligibleDriverCount: input.telemetry.eligibleDriverCount,
      ageMinutes
    },
    links: {
      jobHref: `/app/jobs/${input.jobId}`,
      orderHref: input.orderId ? `/app/orders/${input.orderId}` : null,
      paymentsHref: issueType === "PAYMENT_BLOCKER" ? "/app/payments" : null
    },
    advisory: ADVISORY
  });
}

@Injectable()
export class DispatchRecoveryService {
  constructor(private readonly pg: PgService) {}

  async getAuthorizedRecoverySuggestion(jobId: string, userId: string) {
    const context = await this.pg.query<RecoveryContextRow>(
      `select
          o.id as order_id,
          p.id as payment_id,
          j.id as job_id,
          j.vehicle_required::text as vehicle_required,
          j.status::text as job_status,
          j.assigned_driver_id,
          j.updated_at as job_updated_at,
          j.dispatch_failed_at,
          p.status::text as payment_status
       from public.jobs j
       left join public.customer_orders o on o.job_id = j.id
       left join public.payments p on p.job_id = j.id
       where j.id = $1
         and (
           j.consumer_id = $2
           or exists (
             select 1
             from public.drivers d
             where d.id = j.assigned_driver_id
               and d.user_id = $2
           )
           or (
             j.org_id is not null
             and exists (
               select 1
               from public.org_memberships m
               where m.org_id = j.org_id
                 and m.user_id = $2
                 and m.is_active = true
                 and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
             )
           )
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

  async getBusinessRecoverySuggestion(jobId: string, userId: string) {
    const context = await this.pg.query<RecoveryContextRow>(
      `select
          o.id as order_id,
          p.id as payment_id,
          j.id as job_id,
          j.vehicle_required::text as vehicle_required,
          j.status::text as job_status,
          j.assigned_driver_id,
          j.updated_at as job_updated_at,
          j.dispatch_failed_at,
          p.status::text as payment_status
       from public.jobs j
       left join public.customer_orders o on o.job_id = j.id
       left join public.payments p on p.job_id = j.id
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

  async getAdminRecoverySuggestion(jobId: string) {
    const context = await this.pg.query<RecoveryContextRow>(
      `select
          o.id as order_id,
          p.id as payment_id,
          j.id as job_id,
          j.vehicle_required::text as vehicle_required,
          j.status::text as job_status,
          j.assigned_driver_id,
          j.updated_at as job_updated_at,
          j.dispatch_failed_at,
          p.status::text as payment_status
       from public.jobs j
       left join public.customer_orders o on o.job_id = j.id
       left join public.payments p on p.job_id = j.id
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

  private async buildForContext(row: RecoveryContextRow) {
    const telemetry = await this.loadTelemetry(row.job_id, row.vehicle_required);
    return buildDispatchRecoverySuggestion({
      jobId: row.job_id,
      orderId: row.order_id,
      paymentId: row.payment_id,
      jobStatus: row.job_status,
      paymentStatus: row.payment_status,
      vehicleRequired: row.vehicle_required,
      assignedDriverId: row.assigned_driver_id,
      jobUpdatedAt: toIsoDateTime(row.job_updated_at),
      dispatchFailedAt: toNullableIsoDateTime(row.dispatch_failed_at),
      telemetry
    });
  }

  private async loadTelemetry(jobId: string, vehicleRequired: VehicleType): Promise<RecoveryTelemetry> {
    const [offerSummary, candidateRows] = await Promise.all([
      this.pg.query<RecoveryOfferSummaryRow>(
        `select
            count(*)::text as offer_count,
            (
              select o.status::text
              from public.job_offers o
              where o.job_id = $1
              order by o.offered_at desc
              limit 1
            ) as latest_offer_status,
            (
              select o.offered_at
              from public.job_offers o
              where o.job_id = $1
              order by o.offered_at desc
              limit 1
            ) as latest_offered_at,
            (
              select o.expires_at
              from public.job_offers o
              where o.job_id = $1
              order by o.offered_at desc
              limit 1
            ) as latest_expires_at`,
        [jobId]
      ),
      this.pg.query<RecoveryDriverCandidateRow>(
        `select
            d.is_active,
            d.availability_status,
            d.active_job_id,
            coalesce(vstatus.status, 'MISSING')::text as verification_status,
            (vmatch.vehicle_type is not null) as has_matching_vehicle,
            exists (
              select 1
              from public.job_offers o
              where o.job_id = $2
                and o.driver_id = d.id
                and o.status in ('OFFERED', 'ACCEPTED')
            ) as has_open_offer,
            d.last_location_at
         from public.drivers d
         left join lateral (
           select dv.vehicle_type::text as vehicle_type
           from public.driver_vehicle dv
           where dv.driver_id = d.id
             and dv.vehicle_type = $1::public.vehicle_type
           limit 1
         ) vmatch on true
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
         ) vstatus on true`,
        [vehicleRequired, jobId]
      )
    ]);

    const evaluated = candidateRows.rows.map(evaluateDriverEligibility);
    const latest = offerSummary.rows[0];

    return {
      offerCount: Number(latest?.offer_count ?? 0),
      latestOfferStatus: latest?.latest_offer_status ?? null,
      latestOfferedAt: latest?.latest_offered_at ? toIsoDateTime(latest.latest_offered_at) : null,
      latestExpiresAt: latest?.latest_expires_at ? toIsoDateTime(latest.latest_expires_at) : null,
      eligibleDriverCount: evaluated.filter((item) => item.eligible).length,
      onlineReadyDriverCount: evaluated.filter((item) => item.onlineReady).length,
      matchingVehicleOnlineCount: evaluated.filter((item) => item.matchingVehicleReady).length,
      driverPoolCount: candidateRows.rows.length
    };
  }
}
