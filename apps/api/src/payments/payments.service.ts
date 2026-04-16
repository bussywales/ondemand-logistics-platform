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
  JobPaymentSummarySchema,
  PaymentSchema,
  RefundSchema,
  PayoutLedgerSchema,
  StripeWebhookAckSchema,
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
  payment_created_at: string;
  payment_updated_at: string;
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
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
};

type PayoutLedgerRow = {
  id: string;
  job_id: string;
  driver_id: string;
  status: "PENDING" | "READY" | "PAID" | "FAILED" | "CANCELLED";
  gross_payout_cents: number;
  hold_reason: string | null;
  released_at: string | null;
  created_at: string;
  updated_at: string;
};

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

        if (["CAPTURED", "PARTIALLY_REFUNDED", "REFUNDED", "CANCELLED"].includes(context.payment_status)) {
          throw new ConflictException("payment_not_authorizable");
        }

        try {
          const snapshot = await this.provider.authorizePaymentIntent({
            providerPaymentIntentId: context.provider_payment_intent_id,
            paymentMethodId: parsed.data.paymentMethodId,
            amountCents: context.customer_total_cents,
            currency: context.currency,
            jobId,
            paymentId: context.payment_id,
            consumerId: context.consumer_id,
            description: `Shipwright job ${jobId}`,
            idempotencyKey: `authorize:${context.payment_id}:${idempotencyKey}`
          });

          const updated = await this.updatePaymentFromSnapshot(client, context.payment_id, snapshot, null);
          await this.insertPaymentEvent(client, {
            paymentId: context.payment_id,
            jobId,
            eventType: snapshot.status === "AUTHORIZED" ? "PAYMENT_AUTHORIZED" : "PAYMENT_AUTHORIZATION_UPDATED",
            previousStatus: context.payment_status,
            nextStatus: snapshot.status,
            providerEventId: null,
            payload: {
              requestId,
              paymentMethodId: parsed.data.paymentMethodId,
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
            jobId,
            eventType: "PAYMENT_AUTHORIZATION_FAILED",
            previousStatus: context.payment_status,
            nextStatus: "FAILED",
            providerEventId: null,
            payload: {
              requestId,
              error: message
            }
          });

          return {
            responseCode: 409,
            body: this.mapPayment(failed.rows[0])
          };
        }
      }
    });
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
      createdAt: "payment_created_at" in row ? row.payment_created_at : row.created_at,
      updatedAt: "payment_updated_at" in row ? row.payment_updated_at : row.updated_at
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
      createdAt: row.created_at,
      updatedAt: row.updated_at
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
      releasedAt: row.released_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
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
}
