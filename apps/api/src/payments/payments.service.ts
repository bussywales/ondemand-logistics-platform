import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
  UnprocessableEntityException
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  AuthorizeJobPaymentSchema,
  BusinessPaymentListSchema,
  CreateFinanceReviewSchema,
  FinanceSummarySchema,
  FinanceReviewListSchema,
  FinanceReviewRecordSchema,
  FinanceTransactionListSchema,
  AdminPaymentListSchema,
  JobPaymentSummarySchema,
  PaymentSchema,
  RefundSchema,
  PayoutLedgerSchema,
  StripeWebhookAckSchema,
  UpdateFinanceReviewSchema,
  type BusinessPaymentSummaryDto,
  type AdminPaymentSummaryDto,
  type CreateFinanceReviewDto,
  type FinanceSummaryDto,
  type FinanceReviewRecordDto,
  type FinanceTransactionDto,
  type JobPaymentSummaryDto,
  type PaymentDto,
  type StripeWebhookAck
} from "@shipwright/contracts";
import {
  type PaymentProvider,
  StripePaymentProvider,
  determineCancellationSettlement,
  paymentIntentToSnapshot,
  type InternalPaymentStatus,
  type ProviderPaymentIntentSnapshot
} from "@shipwright/payments";
import { createLogger, getRequestContext } from "@shipwright/observability";
import type { PoolClient } from "pg";
import { toIsoDateTime, toNullableIsoDateTime } from "../database/mapper.js";
import { PgService } from "../database/pg.service.js";

type JobPaymentContextRow = {
  payment_id: string;
  job_id: string;
  provider: "stripe";
  provider_payment_intent_id: string | null;
  payment_status: InternalPaymentStatus;
  amount_authorized_cents: number;
  amount_captured_cents: number;
  amount_refunded_cents: number;
  currency: string;
  customer_total_cents: number;
  platform_fee_cents: number;
  payout_gross_cents: number;
  settlement_snapshot: Record<string, unknown>;
  client_secret: string | null;
  last_error: string | null;
  payment_created_at: string | Date;
  payment_updated_at: string | Date;
  job_status: string;
  consumer_id: string;
  assigned_driver_id: string | null;
  org_id: string | null;
};

type PaymentRow = {
  id: string;
  job_id: string;
  provider: "stripe";
  provider_payment_intent_id: string | null;
  status: InternalPaymentStatus;
  amount_authorized_cents: number;
  amount_captured_cents: number;
  amount_refunded_cents: number;
  currency: string;
  customer_total_cents: number;
  platform_fee_cents: number;
  payout_gross_cents: number;
  settlement_snapshot: Record<string, unknown>;
  client_secret: string | null;
  last_error: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type RefundRow = {
  id: string;
  payment_id: string;
  job_id: string;
  provider_refund_id: string | null;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  amount_cents: number;
  currency: string;
  reason_code: string;
  created_at: string | Date;
  updated_at: string | Date;
};

type PayoutLedgerRow = {
  id: string;
  job_id: string;
  driver_id: string;
  status: "PENDING" | "READY" | "PAID" | "FAILED" | "CANCELLED";
  gross_payout_cents: number;
  hold_reason: string | null;
  released_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type BusinessPaymentSummaryRow = {
  id: string;
  order_id: string;
  job_id: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_slug: string;
  customer_name: string;
  order_status: string;
  job_status: string;
  payment_status: InternalPaymentStatus;
  customer_total_cents: number;
  amount_authorized_cents: number;
  amount_captured_cents: number;
  amount_refunded_cents: number;
  currency: string;
  platform_fee_cents: number;
  payout_gross_cents: number;
  payout_status: PayoutLedgerRow["status"] | null;
  payout_hold_reason: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type AdminPaymentSummaryRow = BusinessPaymentSummaryRow & {
  org_id: string;
  org_name: string;
};

type FinanceFilters = {
  from?: string;
  to?: string;
  orgId?: string;
  status?: string;
};

type FinanceTransactionRow = AdminPaymentSummaryRow & {
  support_refund_review_count: string | number;
};

type FinanceReviewRow = {
  id: string;
  org_id: string;
  org_name: string | null;
  order_id: string | null;
  job_id: string | null;
  payment_id: string | null;
  support_escalation_id: string | null;
  review_type: string;
  status: string;
  severity: string;
  reason: string;
  summary: string | null;
  owner_user_id: string | null;
  owner_label: string | null;
  resolution: string | null;
  resolution_reason: string | null;
  resolved_at: string | Date | null;
  resolved_by: string | null;
  metadata: Record<string, unknown> | string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type FinanceReviewContextRow = {
  org_id: string;
  order_id: string | null;
  job_id: string | null;
  payment_id: string | null;
  support_escalation_id: string | null;
};

const FINANCE_REVIEW_ACTIVE_STATUSES = ["OPEN", "IN_REVIEW", "WAITING_SUPPORT"];

const PAYMENT_COLUMNS = `p.id, p.job_id, p.provider, p.provider_payment_intent_id, p.status,
  p.amount_authorized_cents, p.amount_captured_cents, p.amount_refunded_cents,
  p.currency, p.customer_total_cents, p.platform_fee_cents, p.payout_gross_cents,
  p.settlement_snapshot, p.client_secret, p.last_error, p.created_at, p.updated_at`;

const JOB_PAYMENT_ACCESS = `(
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
)`;

export const PAYMENT_PROVIDER = Symbol("PAYMENT_PROVIDER");

@Injectable()
export class PaymentsService {
  private readonly logger = createLogger({ name: "api-payments" });
  private readonly provider: PaymentProvider;
  private readonly currency = (process.env.PAYMENT_CURRENCY ?? "gbp").toLowerCase();

  constructor(
    private readonly pg: PgService,
    @Optional()
    @Inject(PAYMENT_PROVIDER)
    provider?: PaymentProvider
  ) {
    this.provider =
      provider ??
      new StripePaymentProvider({
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
      });
  }

  isProviderConfigured() {
    return this.provider.isConfigured();
  }

  async createPaymentForJob(
    client: PoolClient,
    input: {
      jobId: string;
      consumerId: string;
      customerTotalCents: number;
      platformFeeCents: number;
      payoutGrossCents: number;
      requestId: string;
    }
  ) {
    const inserted = await client.query<PaymentRow>(
      `insert into public.payments (
         job_id,
         provider,
         status,
         amount_authorized_cents,
         amount_captured_cents,
         amount_refunded_cents,
         currency,
         customer_total_cents,
         platform_fee_cents,
         payout_gross_cents,
         settlement_snapshot,
         client_secret,
         last_error
       ) values ($1, 'stripe', 'REQUIRES_PAYMENT_METHOD', 0, 0, 0, $2, $3, $4, $5, '{}'::jsonb, null, null)
       on conflict (job_id) do update
       set customer_total_cents = excluded.customer_total_cents,
           platform_fee_cents = excluded.platform_fee_cents,
           payout_gross_cents = excluded.payout_gross_cents,
           updated_at = now()
       returning ${PAYMENT_COLUMNS.replaceAll("p.", "")}`,
      [
        input.jobId,
        this.currency,
        input.customerTotalCents,
        input.platformFeeCents,
        input.payoutGrossCents
      ]
    );

    const payment = inserted.rows[0];

    await this.insertPaymentEvent(client, {
      paymentId: payment.id,
      jobId: input.jobId,
      eventType: "PAYMENT_CREATED",
      previousStatus: null,
      nextStatus: payment.status,
      providerEventId: null,
      payload: {
        requestId: input.requestId,
        provider: payment.provider,
        customerTotalCents: payment.customer_total_cents
      }
    });

    if (this.provider.isConfigured()) {
      await this.insertOutboxMessage(client, {
        aggregateType: "payment",
        aggregateId: payment.id,
        eventType: "PAYMENT_INTENT_CREATE_REQUESTED",
        payload: {
          paymentId: payment.id,
          jobId: input.jobId,
          consumerId: input.consumerId,
          requestId: input.requestId
        },
        idempotencyKey: `payment-intent-create:${payment.id}`
      });
    } else {
      await this.insertPaymentEvent(client, {
        paymentId: payment.id,
        jobId: input.jobId,
        eventType: "PAYMENT_PROVIDER_NOT_CONFIGURED",
        previousStatus: payment.status,
        nextStatus: payment.status,
        providerEventId: null,
        payload: {
          requestId: input.requestId,
          provider: payment.provider
        }
      });
    }

    return payment;
  }

  async enqueueCaptureForDeliveredJob(
    client: PoolClient,
    input: { jobId: string; requestId: string; idempotencyKey: string }
  ) {
    const result = await client.query<PaymentRow>(
      `select ${PAYMENT_COLUMNS}
       from public.payments p
       where p.job_id = $1
       for update`,
      [input.jobId]
    );

    if ((result.rowCount ?? 0) !== 1) {
      throw new ConflictException("payment_not_found_for_job");
    }

    const payment = result.rows[0];
    if (payment.status !== "AUTHORIZED") {
      await this.insertPaymentEvent(client, {
        paymentId: payment.id,
        jobId: input.jobId,
        eventType: "PAYMENT_CAPTURE_SKIPPED",
        previousStatus: payment.status,
        nextStatus: payment.status,
        providerEventId: null,
        payload: {
          requestId: input.requestId,
          reason: "payment_not_authorized"
        }
      });
      return;
    }

    await this.insertOutboxMessage(client, {
      aggregateType: "payment",
      aggregateId: payment.id,
      eventType: "PAYMENT_CAPTURE_REQUESTED",
      payload: {
        paymentId: payment.id,
        jobId: input.jobId,
        requestId: input.requestId
      },
      idempotencyKey: `payment-capture:${payment.id}:${input.idempotencyKey}`
    });
  }

  async enqueueCancellationSettlement(
    client: PoolClient,
    input: { jobId: string; requestId: string; idempotencyKey: string }
  ) {
    const result = await client.query<PaymentRow>(
      `select ${PAYMENT_COLUMNS}
       from public.payments p
       where p.job_id = $1
       for update`,
      [input.jobId]
    );

    if ((result.rowCount ?? 0) !== 1) {
      return;
    }

    await this.insertOutboxMessage(client, {
      aggregateType: "payment",
      aggregateId: result.rows[0].id,
      eventType: "PAYMENT_CANCELLATION_SETTLEMENT_REQUESTED",
      payload: {
        paymentId: result.rows[0].id,
        jobId: input.jobId,
        requestId: input.requestId
      },
      idempotencyKey: `payment-cancel-settlement:${result.rows[0].id}:${input.idempotencyKey}`
    });
  }

  async getJobPayment(jobId: string, userId: string): Promise<JobPaymentSummaryDto> {
    const context = await this.loadAuthorizedPaymentContext(jobId, userId);
    const refunds = await this.pg.query<RefundRow>(
      `select id, payment_id, job_id, provider_refund_id, status, amount_cents, currency, reason_code, created_at, updated_at
       from public.refunds
       where payment_id = $1
       order by created_at desc`,
      [context.payment_id]
    );
    const payout = await this.pg.query<PayoutLedgerRow>(
      `select id, job_id, driver_id, status, gross_payout_cents, hold_reason, released_at, created_at, updated_at
       from public.payout_ledger
       where job_id = $1`,
      [jobId]
    );

    return JobPaymentSummarySchema.parse({
      payment: this.mapPayment(context),
      refunds: refunds.rows.map((row) => this.mapRefund(row)),
      payoutLedger: payout.rows[0] ? this.mapPayoutLedger(payout.rows[0]) : null
    });
  }

  async listBusinessPayments(userId: string) {
    const result = await this.pg.query<BusinessPaymentSummaryRow>(
      `select
          p.id,
          o.id as order_id,
          j.id as job_id,
          r.id as restaurant_id,
          r.name as restaurant_name,
          r.slug as restaurant_slug,
          o.customer_name,
          o.status::text as order_status,
          j.status::text as job_status,
          p.status as payment_status,
          p.customer_total_cents,
          p.amount_authorized_cents,
          p.amount_captured_cents,
          p.amount_refunded_cents,
          p.currency,
          p.platform_fee_cents,
          p.payout_gross_cents,
          pl.status as payout_status,
          pl.hold_reason as payout_hold_reason,
          p.created_at,
          p.updated_at
       from public.customer_orders o
       join public.restaurants r on r.id = o.restaurant_id
       join public.jobs j on j.id = o.job_id
       join public.payments p on p.id = o.payment_id
       left join public.payout_ledger pl on pl.job_id = j.id
       where exists (
         select 1
         from public.org_memberships m
         where m.org_id = o.org_id
           and m.user_id = $1
           and m.is_active = true
           and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
       )
       order by p.updated_at desc
       limit 50`,
      [userId]
    );

    return BusinessPaymentListSchema.parse({
      items: result.rows.map((row) => this.mapBusinessPaymentSummary(row))
    }).items;
  }

  async listAdminPayments() {
    const result = await this.pg.query<AdminPaymentSummaryRow>(
      `select
          p.id,
          o.org_id,
          org.name as org_name,
          o.id as order_id,
          j.id as job_id,
          r.id as restaurant_id,
          r.name as restaurant_name,
          r.slug as restaurant_slug,
          o.customer_name,
          o.status::text as order_status,
          j.status::text as job_status,
          p.status as payment_status,
          p.customer_total_cents,
          p.amount_authorized_cents,
          p.amount_captured_cents,
          p.amount_refunded_cents,
          p.currency,
          p.platform_fee_cents,
          p.payout_gross_cents,
          pl.status as payout_status,
          pl.hold_reason as payout_hold_reason,
          p.created_at,
          p.updated_at
       from public.customer_orders o
       join public.orgs org on org.id = o.org_id
       join public.restaurants r on r.id = o.restaurant_id
       join public.jobs j on j.id = o.job_id
       join public.payments p on p.id = o.payment_id
       left join public.payout_ledger pl on pl.job_id = j.id
       order by p.updated_at desc
       limit 50`
    );

    return AdminPaymentListSchema.parse({
      items: result.rows.map((row) => this.mapAdminPaymentSummary(row))
    }).items;
  }

  async getBusinessFinanceSummary(userId: string, filters: FinanceFilters = {}): Promise<FinanceSummaryDto> {
    const [rows, reviewCounts] = await Promise.all([
      this.listFinanceRows({ userId, filters, limit: 500 }),
      this.getFinanceReviewCounts({ userId, filters })
    ]);
    return this.buildFinanceSummary("business", rows, reviewCounts);
  }

  async getAdminFinanceSummary(filters: FinanceFilters = {}): Promise<FinanceSummaryDto> {
    const [rows, reviewCounts] = await Promise.all([
      this.listFinanceRows({ filters, limit: 500 }),
      this.getFinanceReviewCounts({ filters })
    ]);
    return this.buildFinanceSummary("admin", rows, reviewCounts);
  }

  async listBusinessFinanceTransactions(userId: string, filters: FinanceFilters = {}) {
    const rows = await this.listFinanceRows({ userId, filters, limit: 100 });
    return FinanceTransactionListSchema.parse({ items: rows.map((row) => this.mapFinanceTransaction(row, "business")) }).items;
  }

  async listAdminFinanceTransactions(filters: FinanceFilters = {}) {
    const rows = await this.listFinanceRows({ filters, limit: 100 });
    return FinanceTransactionListSchema.parse({ items: rows.map((row) => this.mapFinanceTransaction(row, "admin")) }).items;
  }

  async listBusinessFinanceReviews(userId: string, filters: FinanceFilters = {}) {
    return FinanceReviewListSchema.parse({
      items: await this.listFinanceReviewRows({ userId, filters, limit: 100 }).then((rows) => rows.map((row) => this.mapFinanceReviewRow(row)))
    }).items;
  }

  async listAdminFinanceReviews(filters: FinanceFilters = {}) {
    return FinanceReviewListSchema.parse({
      items: await this.listFinanceReviewRows({ filters, limit: 100 }).then((rows) => rows.map((row) => this.mapFinanceReviewRow(row)))
    }).items;
  }

  async createBusinessFinanceReview(userId: string, input: unknown): Promise<FinanceReviewRecordDto> {
    const parsed = CreateFinanceReviewSchema.safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        message: "invalid_finance_review_payload",
        issues: parsed.error.issues
      });
    }

    return this.pg.withTransaction(async (client) => {
      const context = await this.loadFinanceReviewCreateContext(client, userId, parsed.data);
      const existing = await client.query<FinanceReviewRow>(
        `select fr.*, org.name as org_name
         from public.finance_review_records fr
         join public.orgs org on org.id = fr.org_id
         where fr.org_id = $1
           and fr.review_type = $2
           and fr.status = any($3::text[])
           and (
             ($4::uuid is not null and fr.payment_id = $4::uuid)
             or ($5::uuid is not null and fr.order_id = $5::uuid)
             or ($6::uuid is not null and fr.job_id = $6::uuid)
             or ($7::uuid is not null and fr.support_escalation_id = $7::uuid)
           )
         order by fr.created_at desc
         limit 1`,
        [
          context.org_id,
          parsed.data.reviewType,
          FINANCE_REVIEW_ACTIVE_STATUSES,
          context.payment_id,
          context.order_id,
          context.job_id,
          context.support_escalation_id
        ]
      );

      if (existing.rowCount) {
        return this.mapFinanceReviewRow(existing.rows[0]);
      }

      const inserted = await client.query<FinanceReviewRow>(
        `insert into public.finance_review_records (
           org_id,
           order_id,
           job_id,
           payment_id,
           support_escalation_id,
           review_type,
           status,
           severity,
           reason,
           summary,
           owner_user_id,
           owner_label,
           metadata
         )
         values ($1, $2, $3, $4, $5, $6, 'OPEN', $7, $8, $9, $10, $11, $12::jsonb)
         returning *, (select name from public.orgs where id = $1) as org_name`,
        [
          context.org_id,
          context.order_id,
          context.job_id,
          context.payment_id,
          context.support_escalation_id,
          parsed.data.reviewType,
          parsed.data.severity,
          parsed.data.reason,
          parsed.data.summary ?? null,
          parsed.data.ownerUserId ?? null,
          parsed.data.ownerLabel ?? null,
          JSON.stringify({
            ...(parsed.data.metadata ?? {}),
            createdFrom: "finance_candidate",
            noProviderMutation: true
          })
        ]
      );

      const row = inserted.rows[0];
      await this.insertFinanceReviewAudit(client, {
        actorId: userId,
        orgId: row.org_id,
        reviewId: row.id,
        action: "finance_review_created",
        metadata: {
          reviewType: row.review_type,
          status: row.status,
          severity: row.severity,
          orderId: row.order_id,
          jobId: row.job_id,
          paymentId: row.payment_id,
          supportEscalationId: row.support_escalation_id
        }
      });

      return this.mapFinanceReviewRow(row);
    });
  }

  async updateBusinessFinanceReview(userId: string, reviewId: string, input: unknown): Promise<FinanceReviewRecordDto> {
    const parsed = UpdateFinanceReviewSchema.safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        message: "invalid_finance_review_update_payload",
        issues: parsed.error.issues
      });
    }

    return this.pg.withTransaction(async (client) => {
      const existing = await client.query<FinanceReviewRow>(
        `select fr.*, org.name as org_name
         from public.finance_review_records fr
         join public.orgs org on org.id = fr.org_id
         where fr.id = $1
           and exists (
             select 1
             from public.org_memberships m
             where m.org_id = fr.org_id
               and m.user_id = $2
               and m.is_active = true
               and m.role::text in ('BUSINESS_OPERATOR', 'ADMIN', 'OWNER', 'MANAGER', 'OPERATOR', 'FINANCE_VIEWER', 'SUPPORT_USER')
           )
         for update`,
        [reviewId, userId]
      );
      if (existing.rowCount !== 1) {
        throw new NotFoundException("finance_review_not_found");
      }

      const current = existing.rows[0];
      const nextStatus = parsed.data.status ?? current.status;
      const isCloseout = nextStatus === "RESOLVED" || nextStatus === "CANCELLED";
      const resolvedAt = isCloseout ? new Date().toISOString() : null;
      const resolvedBy = isCloseout ? userId : null;
      const updated = await client.query<FinanceReviewRow>(
        `update public.finance_review_records
         set status = $1,
             severity = coalesce($2, severity),
             reason = coalesce($3, reason),
             summary = $4,
             owner_user_id = $5,
             owner_label = $6,
             resolution = $7,
             resolution_reason = $8,
             resolved_at = $9::timestamptz,
             resolved_by = $10
         where id = $11
         returning *, (select name from public.orgs where id = finance_review_records.org_id) as org_name`,
        [
          nextStatus,
          parsed.data.severity ?? null,
          parsed.data.reason ?? null,
          parsed.data.summary === undefined ? current.summary : parsed.data.summary,
          parsed.data.ownerUserId === undefined ? current.owner_user_id : parsed.data.ownerUserId,
          parsed.data.ownerLabel === undefined ? current.owner_label : parsed.data.ownerLabel,
          parsed.data.resolution === undefined ? current.resolution : parsed.data.resolution,
          parsed.data.resolutionReason === undefined ? current.resolution_reason : parsed.data.resolutionReason,
          isCloseout ? resolvedAt : current.resolved_at,
          isCloseout ? resolvedBy : current.resolved_by,
          reviewId
        ]
      );

      const row = updated.rows[0];
      await this.insertFinanceReviewAudit(client, {
        actorId: userId,
        orgId: row.org_id,
        reviewId: row.id,
        action: nextStatus === "RESOLVED"
          ? "finance_review_resolved"
          : nextStatus === "CANCELLED"
            ? "finance_review_cancelled"
            : "finance_review_updated",
        metadata: {
          previousStatus: current.status,
          newStatus: row.status,
          previousOwner: current.owner_label,
          newOwner: row.owner_label,
          severity: row.severity,
          noProviderMutation: true
        }
      });

      return this.mapFinanceReviewRow(row);
    });
  }

  async authorizeJobPayment(jobId: string, input: unknown, userId: string, idempotencyKey: string) {
    const parsed = AuthorizeJobPaymentSchema.safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        message: "invalid_payment_authorization_payload",
        issues: parsed.error.issues
      });
    }

    if (!this.provider.isConfigured()) {
      throw new ServiceUnavailableException("stripe_not_configured");
    }

    return this.pg.withIdempotency({
      actorId: userId,
      endpoint: `/v1/jobs/${jobId}/payment/authorize`,
      idempotencyKey,
      execute: async (client) => {
        const requestId = getRequestContext()?.requestId ?? randomUUID();
        const context = await this.loadAuthorizedPaymentContextForUpdate(client, jobId, userId);
        return this.authorizeLoadedPaymentContext(client, context, {
          jobId,
          paymentMethodId: parsed.data.paymentMethodId,
          idempotencyKey,
          requestId
        });
      }
    });
  }

  async authorizeCustomerOrderPayment(
    client: PoolClient,
    input: {
      jobId: string;
      consumerId: string;
      paymentMethodId: string;
      idempotencyKey: string;
      requestId: string;
    }
  ) {
    if (!this.provider.isConfigured()) {
      throw new ServiceUnavailableException("stripe_not_configured");
    }

    const context = await this.loadConsumerPaymentContextForUpdate(client, input.jobId, input.consumerId);
    return this.authorizeLoadedPaymentContext(client, context, input);
  }

  async handleStripeWebhook(rawBody: Buffer | string, signature: string): Promise<StripeWebhookAck> {
    if (!this.provider.isConfigured()) {
      throw new ServiceUnavailableException("stripe_not_configured");
    }

    const verified = this.provider.verifyWebhookSignature(rawBody, signature);

    return this.pg.withTransaction(async (client) => {
      const existing = await client.query(
        `select 1
         from public.payment_events
         where provider_event_id = $1`,
        [verified.id]
      );

      if ((existing.rowCount ?? 0) > 0) {
        return StripeWebhookAckSchema.parse({
          received: true,
          duplicate: true,
          eventId: verified.id
        });
      }

      const paymentIntentId = verified.paymentIntent?.id ?? verified.refund?.payment_intent ?? null;
      const paymentResult = paymentIntentId
        ? await client.query<PaymentRow>(
            `select ${PAYMENT_COLUMNS}
             from public.payments p
             where p.provider_payment_intent_id = $1
             for update`,
            [paymentIntentId]
          )
        : { rowCount: 0, rows: [] as PaymentRow[] };
      const payment = paymentResult.rows[0] ?? null;

      if (verified.paymentIntent && payment) {
        const updated = await this.updatePaymentFromSnapshot(client, payment.id, paymentIntentToSnapshot(verified.paymentIntent), null);
        await this.insertPaymentEvent(client, {
          paymentId: payment.id,
          jobId: payment.job_id,
          eventType: `STRIPE_${verified.type.replaceAll('.', '_').toUpperCase()}`,
          previousStatus: payment.status,
          nextStatus: updated.status,
          providerEventId: verified.id,
          payload: {
            stripeEventType: verified.type
          }
        });
      } else if (verified.refund && payment) {
        await this.upsertRefundFromProvider(client, {
          payment,
          providerEventId: verified.id,
          refund: verified.refund,
          eventType: verified.type
        });
      } else {
        await this.insertPaymentEvent(client, {
          paymentId: null,
          jobId: null,
          eventType: `STRIPE_${verified.type.replaceAll('.', '_').toUpperCase()}_IGNORED`,
          previousStatus: null,
          nextStatus: null,
          providerEventId: verified.id,
          payload: {
            stripeEventType: verified.type,
            paymentIntentId
          }
        });
      }

      return StripeWebhookAckSchema.parse({
        received: true,
        duplicate: false,
        eventId: verified.id
      });
    });
  }

  async previewCancellationSettlementForJob(
    client: PoolClient,
    input: { jobId: string; jobStatus: string; driverPayoutGrossCents: number }
  ) {
    const paymentResult = await client.query<PaymentRow>(
      `select ${PAYMENT_COLUMNS}
       from public.payments p
       where p.job_id = $1
       for update`,
      [input.jobId]
    );

    const payment =
      paymentResult.rows[0] ??
      ({
        id: randomUUID(),
        job_id: input.jobId,
        provider: "stripe",
        provider_payment_intent_id: null,
        status: "REQUIRES_PAYMENT_METHOD",
        amount_authorized_cents: 0,
        amount_captured_cents: 0,
        amount_refunded_cents: 0,
        currency: this.currency,
        customer_total_cents: 0,
        platform_fee_cents: 0,
        payout_gross_cents: input.driverPayoutGrossCents,
        settlement_snapshot: {},
        client_secret: null,
        last_error: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } satisfies PaymentRow);

    return determineCancellationSettlement({
      jobStatus: input.jobStatus,
      customerTotalCents: payment.customer_total_cents,
      platformFeeCents: payment.platform_fee_cents,
      driverPayoutGrossCents: input.driverPayoutGrossCents,
      paymentStatus: payment.status,
      amountCapturedCents: payment.amount_captured_cents,
      amountAuthorizedCents: payment.amount_authorized_cents
    });
  }

  private async loadAuthorizedPaymentContext(jobId: string, userId: string) {
    const result = await this.pg.query<JobPaymentContextRow>(
      `select p.id as payment_id,
              p.job_id,
              p.provider,
              p.provider_payment_intent_id,
              p.status as payment_status,
              p.amount_authorized_cents,
              p.amount_captured_cents,
              p.amount_refunded_cents,
              p.currency,
              p.customer_total_cents,
              p.platform_fee_cents,
              p.payout_gross_cents,
              p.settlement_snapshot,
              p.client_secret,
              p.last_error,
              p.created_at as payment_created_at,
              p.updated_at as payment_updated_at,
              j.status as job_status,
              j.consumer_id,
              j.assigned_driver_id,
              j.org_id
       from public.payments p
       join public.jobs j on j.id = p.job_id
       where p.job_id = $1
         and ${JOB_PAYMENT_ACCESS}`,
      [jobId, userId]
    );

    if ((result.rowCount ?? 0) !== 1) {
      throw new NotFoundException("payment_not_found");
    }

    return result.rows[0];
  }

  private async loadAuthorizedPaymentContextForUpdate(client: PoolClient, jobId: string, userId: string) {
    const result = await client.query<JobPaymentContextRow>(
      `select p.id as payment_id,
              p.job_id,
              p.provider,
              p.provider_payment_intent_id,
              p.status as payment_status,
              p.amount_authorized_cents,
              p.amount_captured_cents,
              p.amount_refunded_cents,
              p.currency,
              p.customer_total_cents,
              p.platform_fee_cents,
              p.payout_gross_cents,
              p.settlement_snapshot,
              p.client_secret,
              p.last_error,
              p.created_at as payment_created_at,
              p.updated_at as payment_updated_at,
              j.status as job_status,
              j.consumer_id,
              j.assigned_driver_id,
              j.org_id
       from public.payments p
       join public.jobs j on j.id = p.job_id
       where p.job_id = $1
         and ${JOB_PAYMENT_ACCESS}
       for update of p`,
      [jobId, userId]
    );

    if ((result.rowCount ?? 0) !== 1) {
      throw new NotFoundException("payment_not_found");
    }

    return result.rows[0];
  }

  private async loadConsumerPaymentContextForUpdate(client: PoolClient, jobId: string, consumerId: string) {
    const result = await client.query<JobPaymentContextRow>(
      `select p.id as payment_id,
              p.job_id,
              p.provider,
              p.provider_payment_intent_id,
              p.status as payment_status,
              p.amount_authorized_cents,
              p.amount_captured_cents,
              p.amount_refunded_cents,
              p.currency,
              p.customer_total_cents,
              p.platform_fee_cents,
              p.payout_gross_cents,
              p.settlement_snapshot,
              p.client_secret,
              p.last_error,
              p.created_at as payment_created_at,
              p.updated_at as payment_updated_at,
              j.status as job_status,
              j.consumer_id,
              j.assigned_driver_id,
              j.org_id
       from public.payments p
       join public.jobs j on j.id = p.job_id
       where p.job_id = $1
         and j.consumer_id = $2
       for update of p`,
      [jobId, consumerId]
    );

    if ((result.rowCount ?? 0) !== 1) {
      throw new NotFoundException("payment_not_found");
    }

    return result.rows[0];
  }

  private async authorizeLoadedPaymentContext(
    client: PoolClient,
    context: JobPaymentContextRow,
    input: {
      jobId: string;
      paymentMethodId: string;
      idempotencyKey: string;
      requestId: string;
    }
  ) {
    if (["CAPTURED", "PARTIALLY_REFUNDED", "REFUNDED", "CANCELLED"].includes(context.payment_status)) {
      throw new ConflictException("payment_not_authorizable");
    }

    try {
      const snapshot = await this.provider.authorizePaymentIntent({
        providerPaymentIntentId: context.provider_payment_intent_id,
        paymentMethodId: input.paymentMethodId,
        amountCents: context.customer_total_cents,
        currency: context.currency,
        jobId: input.jobId,
        paymentId: context.payment_id,
        consumerId: context.consumer_id,
        description: `Shipwright job ${input.jobId}`,
        idempotencyKey: `authorize:${context.payment_id}:${input.idempotencyKey}`
      });

      const updated = await this.updatePaymentFromSnapshot(client, context.payment_id, snapshot, null);
      await this.insertPaymentEvent(client, {
        paymentId: context.payment_id,
        jobId: input.jobId,
        eventType: snapshot.status === "AUTHORIZED" ? "PAYMENT_AUTHORIZED" : "PAYMENT_AUTHORIZATION_UPDATED",
        previousStatus: context.payment_status,
        nextStatus: snapshot.status,
        providerEventId: null,
        payload: {
          requestId: input.requestId,
          paymentMethodId: input.paymentMethodId,
          providerPaymentIntentId: snapshot.providerPaymentIntentId
        }
      });

      return {
        responseCode: 200,
        body: this.mapPayment(updated)
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "payment_authorization_failed";
      const failed = await client.query<PaymentRow>(
        `update public.payments
         set status = 'FAILED',
             last_error = $1,
             updated_at = now()
         where id = $2
         returning ${PAYMENT_COLUMNS.replaceAll("p.", "")}`,
        [message, context.payment_id]
      );

      await this.insertPaymentEvent(client, {
        paymentId: context.payment_id,
        jobId: input.jobId,
        eventType: "PAYMENT_AUTHORIZATION_FAILED",
        previousStatus: context.payment_status,
        nextStatus: "FAILED",
        providerEventId: null,
        payload: {
          requestId: input.requestId,
          error: message
        }
      });

      return {
        responseCode: 409,
        body: this.mapPayment(failed.rows[0])
      };
    }
  }

  private async updatePaymentFromSnapshot(
    client: PoolClient,
    paymentId: string,
    snapshot: ProviderPaymentIntentSnapshot,
    settlementSnapshot: Record<string, unknown> | null
  ) {
    const result = await client.query<PaymentRow>(
      `update public.payments
       set provider_payment_intent_id = $1,
           status = $2,
           amount_authorized_cents = $3,
           amount_captured_cents = $4,
           amount_refunded_cents = $5,
           currency = $6,
           client_secret = $7,
           settlement_snapshot = coalesce($8::jsonb, settlement_snapshot),
           last_error = null,
           updated_at = now()
       where id = $9
       returning ${PAYMENT_COLUMNS.replaceAll("p.", "")}`,
      [
        snapshot.providerPaymentIntentId,
        snapshot.status,
        snapshot.amountAuthorizedCents,
        snapshot.amountCapturedCents,
        snapshot.amountRefundedCents,
        snapshot.currency,
        snapshot.clientSecret,
        settlementSnapshot ? JSON.stringify(settlementSnapshot) : null,
        paymentId
      ]
    );

    return result.rows[0];
  }

  private async upsertRefundFromProvider(
    client: PoolClient,
    input: {
      payment: PaymentRow;
      providerEventId: string;
      refund: { id: string; amount: number; currency: string; status: string | null };
      eventType: string;
    }
  ) {
    const updatedRefund = await client.query<RefundRow>(
      `insert into public.refunds (
         payment_id,
         job_id,
         provider_refund_id,
         status,
         amount_cents,
         currency,
         reason_code,
         failure_message
       ) values ($1, $2, $3, $4, $5, $6, $7, null)
       on conflict (provider_refund_id) do update
       set status = excluded.status,
           amount_cents = excluded.amount_cents,
           updated_at = now()
       returning id, payment_id, job_id, provider_refund_id, status, amount_cents, currency, reason_code, created_at, updated_at`,
      [
        input.payment.id,
        input.payment.job_id,
        input.refund.id,
        input.refund.status === "succeeded" ? "SUCCEEDED" : input.refund.status === "failed" ? "FAILED" : input.refund.status === "canceled" ? "CANCELLED" : "PENDING",
        input.refund.amount,
        input.refund.currency,
        input.eventType
      ]
    );

    const totalRefunded = input.payment.amount_refunded_cents + updatedRefund.rows[0].amount_cents;
    const nextStatus = totalRefunded >= input.payment.amount_captured_cents ? "REFUNDED" : "PARTIALLY_REFUNDED";
    await client.query(
      `update public.payments
       set amount_refunded_cents = greatest(amount_refunded_cents, $1),
           status = $2,
           updated_at = now()
       where id = $3`,
      [Math.min(totalRefunded, input.payment.amount_captured_cents), nextStatus, input.payment.id]
    );

    await this.insertPaymentEvent(client, {
      paymentId: input.payment.id,
      jobId: input.payment.job_id,
      eventType: `STRIPE_${input.eventType.replaceAll('.', '_').toUpperCase()}`,
      previousStatus: input.payment.status,
      nextStatus,
      providerEventId: input.providerEventId,
      payload: {
        providerRefundId: input.refund.id,
        amountCents: input.refund.amount
      }
    });
  }

  private mapPayment(row: JobPaymentContextRow | PaymentRow): PaymentDto {
    const parsed = PaymentSchema.parse({
      id: "payment_id" in row ? row.payment_id : row.id,
      jobId: row.job_id,
      provider: row.provider,
      providerPaymentIntentId: row.provider_payment_intent_id,
      status: "payment_status" in row ? row.payment_status : row.status,
      amountAuthorizedCents: row.amount_authorized_cents,
      amountCapturedCents: row.amount_captured_cents,
      amountRefundedCents: row.amount_refunded_cents,
      currency: row.currency,
      customerTotalCents: row.customer_total_cents,
      platformFeeCents: row.platform_fee_cents,
      payoutGrossCents: row.payout_gross_cents,
      settlementSnapshot: row.settlement_snapshot,
      clientSecret: row.client_secret,
      lastError: row.last_error,
      createdAt: toIsoDateTime("payment_created_at" in row ? row.payment_created_at : row.created_at),
      updatedAt: toIsoDateTime("payment_updated_at" in row ? row.payment_updated_at : row.updated_at)
    });

    return parsed;
  }

  private mapRefund(row: RefundRow) {
    return RefundSchema.parse({
      id: row.id,
      paymentId: row.payment_id,
      jobId: row.job_id,
      providerRefundId: row.provider_refund_id,
      status: row.status,
      amountCents: row.amount_cents,
      currency: row.currency,
      reasonCode: row.reason_code,
      createdAt: toIsoDateTime(row.created_at),
      updatedAt: toIsoDateTime(row.updated_at)
    });
  }

  private mapPayoutLedger(row: PayoutLedgerRow) {
    return PayoutLedgerSchema.parse({
      id: row.id,
      jobId: row.job_id,
      driverId: row.driver_id,
      status: row.status,
      grossPayoutCents: row.gross_payout_cents,
      holdReason: row.hold_reason,
      releasedAt: toNullableIsoDateTime(row.released_at),
      createdAt: toIsoDateTime(row.created_at),
      updatedAt: toIsoDateTime(row.updated_at)
    });
  }

  private async listFinanceRows(input: { userId?: string; filters?: FinanceFilters; limit: number }) {
    const values: unknown[] = [];
    const clauses: string[] = [];
    const filters = input.filters ?? {};

    if (input.userId) {
      values.push(input.userId);
      clauses.push(`exists (
        select 1
        from public.org_memberships m
        where m.org_id = o.org_id
          and m.user_id = $${values.length}
          and m.is_active = true
          and m.role::text in ('BUSINESS_OPERATOR', 'ADMIN', 'OWNER', 'MANAGER', 'OPERATOR', 'FINANCE_VIEWER', 'SUPPORT_USER')
      )`);
    }
    if (filters.orgId) {
      values.push(filters.orgId);
      clauses.push(`o.org_id = $${values.length}`);
    }
    if (filters.status) {
      values.push(filters.status);
      clauses.push(`p.status::text = $${values.length}`);
    }
    if (filters.from) {
      values.push(filters.from);
      clauses.push(`p.created_at >= $${values.length}::timestamptz`);
    }
    if (filters.to) {
      values.push(filters.to);
      clauses.push(`p.created_at <= $${values.length}::timestamptz`);
    }

    values.push(input.limit);
    const limitParam = `$${values.length}`;
    const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
    const result = await this.pg.query<FinanceTransactionRow>(
      `select
          p.id,
          o.org_id,
          org.name as org_name,
          o.id as order_id,
          j.id as job_id,
          r.id as restaurant_id,
          r.name as restaurant_name,
          r.slug as restaurant_slug,
          o.customer_name,
          o.status::text as order_status,
          j.status::text as job_status,
          p.status::text as payment_status,
          p.customer_total_cents,
          p.amount_authorized_cents,
          p.amount_captured_cents,
          p.amount_refunded_cents,
          p.currency,
          p.platform_fee_cents,
          p.payout_gross_cents,
          pl.status::text as payout_status,
          pl.hold_reason as payout_hold_reason,
          p.created_at,
          p.updated_at,
          coalesce(refund_support.count, 0) as support_refund_review_count
       from public.customer_orders o
       join public.orgs org on org.id = o.org_id
       join public.restaurants r on r.id = o.restaurant_id
       join public.jobs j on j.id = o.job_id
       join public.payments p on p.id = o.payment_id
       left join public.payout_ledger pl on pl.job_id = j.id
       left join lateral (
         select count(*)::int as count
         from public.support_escalations se
         where se.org_id = o.org_id
           and se.category = 'REFUND_REVIEW'
           and se.status in ('OPEN', 'IN_REVIEW', 'WAITING_ON_CUSTOMER', 'WAITING_ON_MERCHANT', 'WAITING_ON_COURIER')
           and (se.order_id = o.id or se.job_id = j.id)
       ) refund_support on true
       ${where}
       order by p.updated_at desc
       limit ${limitParam}`,
      values
    );

    return result.rows;
  }

  private async listFinanceReviewRows(input: { userId?: string; filters?: FinanceFilters; limit: number }) {
    const values: unknown[] = [];
    const clauses: string[] = [];
    const filters = input.filters ?? {};

    if (input.userId) {
      values.push(input.userId);
      clauses.push(`exists (
        select 1
        from public.org_memberships m
        where m.org_id = fr.org_id
          and m.user_id = $${values.length}
          and m.is_active = true
          and m.role::text in ('BUSINESS_OPERATOR', 'ADMIN', 'OWNER', 'MANAGER', 'OPERATOR', 'FINANCE_VIEWER', 'SUPPORT_USER')
      )`);
    }
    if (filters.orgId) {
      values.push(filters.orgId);
      clauses.push(`fr.org_id = $${values.length}`);
    }
    if (filters.status) {
      values.push(filters.status);
      clauses.push(`fr.status = $${values.length}`);
    }
    if (filters.from) {
      values.push(filters.from);
      clauses.push(`fr.created_at >= $${values.length}::timestamptz`);
    }
    if (filters.to) {
      values.push(filters.to);
      clauses.push(`fr.created_at <= $${values.length}::timestamptz`);
    }

    values.push(input.limit);
    const limitParam = `$${values.length}`;
    const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
    const result = await this.pg.query<FinanceReviewRow>(
      `select fr.*, org.name as org_name
       from public.finance_review_records fr
       join public.orgs org on org.id = fr.org_id
       ${where}
       order by fr.updated_at desc
       limit ${limitParam}`,
      values
    );

    return result.rows;
  }

  private async getFinanceReviewCounts(input: { userId?: string; filters?: FinanceFilters }) {
    const values: unknown[] = [];
    const clauses: string[] = [];
    const filters = input.filters ?? {};

    if (input.userId) {
      values.push(input.userId);
      clauses.push(`exists (
        select 1
        from public.org_memberships m
        where m.org_id = fr.org_id
          and m.user_id = $${values.length}
          and m.is_active = true
          and m.role::text in ('BUSINESS_OPERATOR', 'ADMIN', 'OWNER', 'MANAGER', 'OPERATOR', 'FINANCE_VIEWER', 'SUPPORT_USER')
      )`);
    }
    if (filters.orgId) {
      values.push(filters.orgId);
      clauses.push(`fr.org_id = $${values.length}`);
    }
    const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
    const result = await this.pg.query<{
      open_count: string | number;
      waiting_support_count: string | number;
      recently_resolved_count: string | number;
    }>(
      `select
         count(*) filter (where fr.status in ('OPEN', 'IN_REVIEW', 'WAITING_SUPPORT'))::int as open_count,
         count(*) filter (where fr.status = 'WAITING_SUPPORT')::int as waiting_support_count,
         count(*) filter (where fr.status in ('RESOLVED', 'CANCELLED') and fr.resolved_at >= now() - interval '24 hours')::int as recently_resolved_count
       from public.finance_review_records fr
       ${where}`,
      values
    );

    return {
      openFinanceReviewCount: Number(result.rows[0]?.open_count ?? 0),
      waitingSupportFinanceReviewCount: Number(result.rows[0]?.waiting_support_count ?? 0),
      recentlyResolvedFinanceReviewCount: Number(result.rows[0]?.recently_resolved_count ?? 0)
    };
  }

  private buildFinanceSummary(
    scope: "business" | "admin",
    rows: FinanceTransactionRow[],
    reviewCounts: { openFinanceReviewCount: number; waitingSupportFinanceReviewCount: number; recentlyResolvedFinanceReviewCount: number }
  ): FinanceSummaryDto {
    const transactions = rows.map((row) => this.mapFinanceTransaction(row, scope));
    const pendingStatuses = new Set(["REQUIRES_PAYMENT_METHOD", "REQUIRES_CONFIRMATION", "AUTHORIZED"]);
    const failedStatuses = new Set(["FAILED", "CANCELLED"]);
    return FinanceSummarySchema.parse({
      scope,
      currency: transactions[0]?.currency ?? this.currency.toUpperCase(),
      totalCapturedAmountCents: transactions.reduce((sum, row) => sum + row.capturedAmountCents, 0),
      totalPendingAmountCents: transactions.reduce((sum, row) => sum + row.pendingAmountCents, 0),
      totalFailedAmountCents: transactions
        .filter((row) => failedStatuses.has(row.paymentStatus))
        .reduce((sum, row) => sum + row.amountCents, 0),
      capturedPaymentCount: transactions.filter((row) => row.paymentStatus === "CAPTURED" || row.paymentStatus === "PARTIALLY_REFUNDED" || row.paymentStatus === "REFUNDED").length,
      pendingPaymentCount: transactions.filter((row) => pendingStatuses.has(row.paymentStatus)).length,
      failedPaymentCount: transactions.filter((row) => failedStatuses.has(row.paymentStatus)).length,
      fulfilledOrderCount: transactions.filter((row) => row.orderStatus === "FULFILLED").length,
      deliveredJobCount: transactions.filter((row) => row.jobStatus === "DELIVERED").length,
      ordersNeedingFinanceReview: transactions.filter((row) => row.financeReviewStatus !== "CLEAR").length,
      refundReviewCandidates: transactions.filter((row) => row.refundReviewRequired).length,
      ...reviewCounts,
      latestFinanceEvents: transactions.slice(0, 5),
      generatedAt: new Date().toISOString()
    });
  }

  private async loadFinanceReviewCreateContext(client: Pick<PoolClient, "query">, userId: string, input: CreateFinanceReviewDto): Promise<FinanceReviewContextRow> {
    const result = await client.query<FinanceReviewContextRow>(
      `with selected_support as (
         select id, org_id, order_id, job_id
         from public.support_escalations
         where id = $4::uuid
       ),
       selected_payment as (
         select id
         from public.payments
         where id = $2::uuid
       )
       select
         coalesce(o.org_id, j.org_id, se.org_id) as org_id,
         o.id as order_id,
         j.id as job_id,
         p.id as payment_id,
         se.id as support_escalation_id
       from (select 1) seed
       left join selected_support se on true
       left join selected_payment p on true
       left join public.customer_orders o
         on o.id = coalesce($1::uuid, se.order_id, (select co.id from public.customer_orders co where co.payment_id = p.id limit 1))
       left join public.jobs j
         on j.id = coalesce($3::uuid, se.job_id, o.job_id)
       where (o.id is not null or j.id is not null or p.id is not null or se.id is not null)
         and exists (
           select 1
           from public.org_memberships m
           where m.org_id = coalesce(o.org_id, j.org_id, se.org_id)
             and m.user_id = $5
             and m.is_active = true
             and m.role::text in ('BUSINESS_OPERATOR', 'ADMIN', 'OWNER', 'MANAGER', 'OPERATOR', 'FINANCE_VIEWER', 'SUPPORT_USER')
         )
       limit 1`,
      [
        input.orderId ?? null,
        input.paymentId ?? null,
        input.jobId ?? null,
        input.supportEscalationId ?? null,
        userId
      ]
    );

    if (result.rowCount !== 1) {
      throw new NotFoundException("finance_review_context_not_found");
    }

    return result.rows[0];
  }

  private mapFinanceReviewRow(row: FinanceReviewRow): FinanceReviewRecordDto {
    const metadata = typeof row.metadata === "string"
      ? JSON.parse(row.metadata || "{}") as Record<string, unknown>
      : row.metadata ?? {};
    return FinanceReviewRecordSchema.parse({
      id: row.id,
      orgId: row.org_id,
      orgName: row.org_name,
      orderId: row.order_id,
      jobId: row.job_id,
      paymentId: row.payment_id,
      supportEscalationId: row.support_escalation_id,
      reviewType: row.review_type,
      status: row.status,
      severity: row.severity,
      reason: row.reason,
      summary: row.summary,
      ownerUserId: row.owner_user_id,
      ownerLabel: row.owner_label,
      resolution: row.resolution,
      resolutionReason: row.resolution_reason,
      resolvedAt: toNullableIsoDateTime(row.resolved_at),
      resolvedBy: row.resolved_by,
      metadata,
      createdAt: toIsoDateTime(row.created_at),
      updatedAt: toIsoDateTime(row.updated_at)
    });
  }

  private async insertFinanceReviewAudit(
    client: Pick<PoolClient, "query">,
    input: { actorId: string; orgId: string; reviewId: string; action: string; metadata: Record<string, unknown> }
  ) {
    await client.query(
      `insert into public.audit_log (request_id, actor_id, org_id, entity_type, entity_id, action, metadata)
       values ($1, $2, $3, 'finance_review', $4, $5, $6::jsonb)`,
      [
        getRequestContext()?.requestId ?? randomUUID(),
        input.actorId,
        input.orgId,
        input.reviewId,
        input.action,
        JSON.stringify(input.metadata)
      ]
    );
  }

  private mapFinanceTransaction(row: FinanceTransactionRow, scope: "business" | "admin"): FinanceTransactionDto {
    const paymentStatus = row.payment_status as FinanceTransactionDto["paymentStatus"];
    const orderStatus = this.normalizeOrderStatus(row.order_status) as FinanceTransactionDto["orderStatus"];
    const jobStatus = row.job_status as FinanceTransactionDto["jobStatus"];
    const supportRefundReviewCount = Number(row.support_refund_review_count ?? 0);
    const captured = paymentStatus === "CAPTURED" || paymentStatus === "PARTIALLY_REFUNDED" || paymentStatus === "REFUNDED";
    const pending = paymentStatus === "REQUIRES_PAYMENT_METHOD" || paymentStatus === "REQUIRES_CONFIRMATION" || paymentStatus === "AUTHORIZED";
    const failed = paymentStatus === "FAILED" || paymentStatus === "CANCELLED";
    const deliveredNotCaptured = jobStatus === "DELIVERED" && !captured;
    const failedFulfillment = jobStatus === "CANCELLED" || jobStatus === "DISPATCH_FAILED" || orderStatus === "PAYMENT_FAILED";
    const refundReviewRequired = (captured && failedFulfillment) || supportRefundReviewCount > 0;
    const payoutReview = captured && jobStatus === "DELIVERED" && (row.payout_status === null || row.payout_status === "FAILED" || Boolean(row.payout_hold_reason));
    const financeReviewStatus: FinanceTransactionDto["financeReviewStatus"] = refundReviewRequired ? "REFUND_REVIEW" : deliveredNotCaptured || failed || payoutReview ? "NEEDS_REVIEW" : "CLEAR";
    const refundReviewReason = supportRefundReviewCount > 0
      ? "Unresolved support escalation marked for refund review."
      : captured && failedFulfillment
        ? "Payment was captured but fulfilment or order state indicates cancellation/failure."
        : null;

    return {
      orgId: scope === "admin" ? row.org_id : null,
      orgName: scope === "admin" ? row.org_name : null,
      restaurantId: row.restaurant_id,
      restaurantName: row.restaurant_name,
      orderId: row.order_id,
      jobId: row.job_id,
      paymentId: row.id,
      customerReference: row.customer_name,
      amountCents: row.customer_total_cents,
      capturedAmountCents: row.amount_captured_cents,
      pendingAmountCents: pending ? (row.amount_authorized_cents > 0 ? row.amount_authorized_cents : row.customer_total_cents) : 0,
      refundedAmountCents: row.amount_refunded_cents,
      currency: row.currency.toUpperCase(),
      paymentStatus,
      orderStatus,
      jobStatus,
      payoutStatus: row.payout_status,
      capturedAt: captured ? toIsoDateTime(row.updated_at) : null,
      createdAt: toIsoDateTime(row.created_at),
      updatedAt: toIsoDateTime(row.updated_at),
      financeReviewStatus,
      refundReviewRequired,
      refundReviewReason,
      recommendedNextAction: this.getFinanceRecommendedAction({ financeReviewStatus, refundReviewReason, deliveredNotCaptured, payoutReview, failed })
    };
  }

  private getFinanceRecommendedAction(input: {
    financeReviewStatus: FinanceTransactionDto["financeReviewStatus"];
    refundReviewReason: string | null;
    deliveredNotCaptured: boolean;
    payoutReview: boolean;
    failed: boolean;
  }) {
    if (input.refundReviewReason) {
      return "Review support log before refund decision. Confirm with merchant/customer before any refund.";
    }
    if (input.deliveredNotCaptured) {
      return "Confirm delivery proof and payment capture state before closeout.";
    }
    if (input.payoutReview) {
      return "Review payout ledger and payment closeout before settlement reporting.";
    }
    if (input.failed) {
      return "Review failed payment state before further fulfilment action.";
    }
    if (input.financeReviewStatus === "NEEDS_REVIEW") {
      return "Review order, job, and payment state before finance closeout.";
    }
    return "No finance action required.";
  }

  async applyCancellationSettlementForWorker(
    client: PoolClient,
    input: {
      payment: PaymentRow;
      jobStatus: string;
      driverPayoutGrossCents: number;
      requestId: string;
      jobId: string;
      idempotencyKey: string;
    }
  ) {
    const settlement = determineCancellationSettlement({
      jobStatus: input.jobStatus,
      customerTotalCents: input.payment.customer_total_cents,
      platformFeeCents: input.payment.platform_fee_cents,
      driverPayoutGrossCents: input.driverPayoutGrossCents,
      paymentStatus: input.payment.status,
      amountCapturedCents: input.payment.amount_captured_cents,
      amountAuthorizedCents: input.payment.amount_authorized_cents
    });

    return settlement;
  }

  private async insertPaymentEvent(
    client: PoolClient,
    input: {
      paymentId: string | null;
      jobId: string | null;
      eventType: string;
      previousStatus: InternalPaymentStatus | null;
      nextStatus: InternalPaymentStatus | null;
      providerEventId: string | null;
      payload: Record<string, unknown>;
    }
  ) {
    await client.query(
      `insert into public.payment_events (
         payment_id,
         job_id,
         event_type,
         previous_status,
         next_status,
         provider_event_id,
         payload,
         request_id
       ) values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
      [
        input.paymentId,
        input.jobId,
        input.eventType,
        input.previousStatus,
        input.nextStatus,
        input.providerEventId,
        JSON.stringify(input.payload),
        getRequestContext()?.requestId ?? randomUUID()
      ]
    );
  }

  private async insertOutboxMessage(
    client: PoolClient,
    input: {
      aggregateType: string;
      aggregateId: string;
      eventType: string;
      payload: Record<string, unknown>;
      idempotencyKey: string;
      nextAttemptAt?: string;
    }
  ) {
    await client.query(
      `insert into public.outbox_messages (
         aggregate_type,
         aggregate_id,
         event_type,
         payload,
         idempotency_key,
         next_attempt_at
       ) values ($1, $2, $3, $4::jsonb, $5, coalesce($6::timestamptz, now()))
       on conflict (event_type, idempotency_key) do nothing`,
      [
        input.aggregateType,
        input.aggregateId,
        input.eventType,
        JSON.stringify(input.payload),
        input.idempotencyKey,
        input.nextAttemptAt ?? null
      ]
    );
  }

  private normalizeOrderStatus(status: string) {
    return status === "COMPLETED" ? "FULFILLED" : status;
  }

  private mapBusinessPaymentSummary(row: BusinessPaymentSummaryRow): BusinessPaymentSummaryDto {
    return {
      id: row.id,
      orderId: row.order_id,
      jobId: row.job_id,
      restaurant: {
        id: row.restaurant_id,
        name: row.restaurant_name,
        slug: row.restaurant_slug
      },
      customerName: row.customer_name,
      orderStatus: this.normalizeOrderStatus(row.order_status) as BusinessPaymentSummaryDto["orderStatus"],
      jobStatus: row.job_status as BusinessPaymentSummaryDto["jobStatus"],
      paymentStatus: row.payment_status as BusinessPaymentSummaryDto["paymentStatus"],
      customerTotalCents: row.customer_total_cents,
      amountAuthorizedCents: row.amount_authorized_cents,
      amountCapturedCents: row.amount_captured_cents,
      amountRefundedCents: row.amount_refunded_cents,
      currency: row.currency.toUpperCase(),
      platformFeeCents: row.platform_fee_cents,
      payoutGrossCents: row.payout_gross_cents,
      payoutStatus: row.payout_status,
      payoutHoldReason: row.payout_hold_reason,
      createdAt: toIsoDateTime(row.created_at),
      updatedAt: toIsoDateTime(row.updated_at)
    };
  }

  private mapAdminPaymentSummary(row: AdminPaymentSummaryRow): AdminPaymentSummaryDto {
    return {
      id: row.id,
      orgId: row.org_id,
      orgName: row.org_name,
      restaurantId: row.restaurant_id,
      restaurantName: row.restaurant_name,
      restaurantSlug: row.restaurant_slug,
      orderId: row.order_id,
      jobId: row.job_id,
      customerName: row.customer_name,
      orderStatus: this.normalizeOrderStatus(row.order_status) as AdminPaymentSummaryDto["orderStatus"],
      jobStatus: row.job_status as AdminPaymentSummaryDto["jobStatus"],
      paymentStatus: row.payment_status as AdminPaymentSummaryDto["paymentStatus"],
      customerTotalCents: row.customer_total_cents,
      amountAuthorizedCents: row.amount_authorized_cents,
      amountCapturedCents: row.amount_captured_cents,
      amountRefundedCents: row.amount_refunded_cents,
      currency: row.currency.toUpperCase(),
      platformFeeCents: row.platform_fee_cents,
      payoutGrossCents: row.payout_gross_cents,
      payoutStatus: row.payout_status,
      payoutHoldReason: row.payout_hold_reason,
      createdAt: toIsoDateTime(row.created_at),
      updatedAt: toIsoDateTime(row.updated_at)
    };
  }
}
