import Stripe from "stripe";

export type PaymentProviderName = "stripe";
export type InternalPaymentStatus =
  | "REQUIRES_PAYMENT_METHOD"
  | "REQUIRES_CONFIRMATION"
  | "AUTHORIZED"
  | "CAPTURED"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | "FAILED"
  | "CANCELLED";

export type RefundStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
export type PayoutLedgerStatus = "PENDING" | "READY" | "PAID" | "FAILED" | "CANCELLED";

export type ProviderPaymentIntentSnapshot = {
  provider: PaymentProviderName;
  providerPaymentIntentId: string;
  status: InternalPaymentStatus;
  amountAuthorizedCents: number;
  amountCapturedCents: number;
  amountRefundedCents: number;
  currency: string;
  captureMethod: "manual" | "automatic";
  clientSecret: string | null;
  rawPayload: Record<string, unknown>;
};

export type ProviderRefundSnapshot = {
  provider: PaymentProviderName;
  providerRefundId: string;
  providerPaymentIntentId: string | null;
  status: RefundStatus;
  amountCents: number;
  currency: string;
  rawPayload: Record<string, unknown>;
};

export type CreatePaymentIntentInput = {
  amountCents: number;
  currency: string;
  jobId: string;
  paymentId: string;
  consumerId: string;
  description: string;
  idempotencyKey?: string;
};

export type AuthorizePaymentIntentInput = {
  providerPaymentIntentId?: string | null;
  paymentMethodId: string;
  amountCents: number;
  currency: string;
  jobId: string;
  paymentId: string;
  consumerId: string;
  description: string;
  idempotencyKey?: string;
};

export type CapturePaymentIntentInput = {
  providerPaymentIntentId: string;
  amountToCaptureCents?: number;
  idempotencyKey?: string;
};

export type CancelPaymentIntentInput = {
  providerPaymentIntentId: string;
  idempotencyKey?: string;
};

export type RefundPaymentIntentInput = {
  providerPaymentIntentId: string;
  amountCents?: number;
  reason?: "duplicate" | "fraudulent" | "requested_by_customer";
  idempotencyKey?: string;
};

export type VerifiedWebhookEvent = {
  id: string;
  type: string;
  raw: Stripe.Event;
  paymentIntent: Stripe.PaymentIntent | null;
  refund: Stripe.Refund | null;
};

export interface PaymentProvider {
  readonly provider: PaymentProviderName;
  isConfigured(): boolean;
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<ProviderPaymentIntentSnapshot>;
  authorizePaymentIntent(input: AuthorizePaymentIntentInput): Promise<ProviderPaymentIntentSnapshot>;
  capturePaymentIntent(input: CapturePaymentIntentInput): Promise<ProviderPaymentIntentSnapshot>;
  cancelPaymentIntent(input: CancelPaymentIntentInput): Promise<ProviderPaymentIntentSnapshot>;
  refundPaymentIntent(input: RefundPaymentIntentInput): Promise<ProviderRefundSnapshot>;
  verifyWebhookSignature(rawBody: Buffer | string, signature: string, webhookSecret?: string): VerifiedWebhookEvent;
}

export type StripeProviderConfig = {
  secretKey?: string;
  webhookSecret?: string;
};

function toRecord(value: object) {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

export function mapStripePaymentIntentStatus(intent: Stripe.PaymentIntent): InternalPaymentStatus {
  if (intent.status === "requires_capture") {
    return "AUTHORIZED";
  }

  if (intent.status === "succeeded") {
    if ((intent.amount_received ?? 0) > 0 && (intent.amount_received ?? 0) === (intent.amount ?? 0)) {
      return "CAPTURED";
    }
    return "PARTIALLY_REFUNDED";
  }

  if (intent.status === "canceled") {
    return "CANCELLED";
  }

  if (intent.status === "requires_payment_method") {
    return "REQUIRES_PAYMENT_METHOD";
  }

  if (intent.last_payment_error) {
    return "FAILED";
  }

  return "REQUIRES_CONFIRMATION";
}

export function mapStripeRefundStatus(refund: Stripe.Refund): RefundStatus {
  switch (refund.status) {
    case "succeeded":
      return "SUCCEEDED";
    case "failed":
      return "FAILED";
    case "canceled":
      return "CANCELLED";
    default:
      return "PENDING";
  }
}

export function paymentIntentToSnapshot(
  intent: Stripe.PaymentIntent | Stripe.Response<Stripe.PaymentIntent>
): ProviderPaymentIntentSnapshot {
  const amountRefunded =
    typeof intent.latest_charge === "object" && intent.latest_charge
      ? intent.latest_charge.amount_refunded ?? 0
      : 0;

  return {
    provider: "stripe",
    providerPaymentIntentId: intent.id,
    status: mapStripePaymentIntentStatus(intent),
    amountAuthorizedCents: intent.status === "requires_capture" ? intent.amount_capturable ?? intent.amount : intent.amount,
    amountCapturedCents: intent.amount_received ?? 0,
    amountRefundedCents: amountRefunded,
    currency: intent.currency,
    captureMethod: intent.capture_method === "manual" ? "manual" : "automatic",
    clientSecret: intent.client_secret ?? null,
    rawPayload: toRecord(intent)
  };
}

function toRefundSnapshot(refund: Stripe.Refund | Stripe.Response<Stripe.Refund>): ProviderRefundSnapshot {
  return {
    provider: "stripe",
    providerRefundId: refund.id,
    providerPaymentIntentId:
      typeof refund.payment_intent === "string"
        ? refund.payment_intent
        : refund.payment_intent?.id ?? null,
    status: mapStripeRefundStatus(refund),
    amountCents: refund.amount,
    currency: refund.currency,
    rawPayload: toRecord(refund)
  };
}

export class StripePaymentProvider implements PaymentProvider {
  readonly provider = "stripe" as const;
  private readonly client: Stripe | null;
  private readonly webhookSecret?: string;

  constructor(config: StripeProviderConfig = {}) {
    this.client = config.secretKey
      ? new Stripe(config.secretKey)
      : null;
    this.webhookSecret = config.webhookSecret;
  }

  isConfigured() {
    return this.client !== null;
  }

  private requireClient() {
    if (!this.client) {
      throw new Error("stripe_provider_not_configured");
    }

    return this.client;
  }

  async createPaymentIntent(input: CreatePaymentIntentInput) {
    const client = this.requireClient();
    const intent = await client.paymentIntents.create(
      {
        amount: input.amountCents,
        currency: input.currency,
        capture_method: "manual",
        confirmation_method: "manual",
        confirm: false,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: "never"
        },
        metadata: {
          job_id: input.jobId,
          payment_id: input.paymentId,
          consumer_id: input.consumerId
        },
        description: input.description
      },
      input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined
    );

    return paymentIntentToSnapshot(intent);
  }

  async authorizePaymentIntent(input: AuthorizePaymentIntentInput) {
    const client = this.requireClient();
    const intent = input.providerPaymentIntentId
      ? await client.paymentIntents.confirm(
          input.providerPaymentIntentId,
          {
            payment_method: input.paymentMethodId,
            return_url: undefined,
            use_stripe_sdk: false
          },
          input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined
        )
      : await client.paymentIntents.create(
          {
            amount: input.amountCents,
            currency: input.currency,
            capture_method: "manual",
            confirmation_method: "manual",
            confirm: true,
            automatic_payment_methods: {
              enabled: true,
              allow_redirects: "never"
            },
            payment_method: input.paymentMethodId,
            off_session: true,
            metadata: {
              job_id: input.jobId,
              payment_id: input.paymentId,
              consumer_id: input.consumerId
            },
            description: input.description
          },
          input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined
        );

    return paymentIntentToSnapshot(intent);
  }

  async capturePaymentIntent(input: CapturePaymentIntentInput) {
    const client = this.requireClient();
    const intent = await client.paymentIntents.capture(
      input.providerPaymentIntentId,
      {
        amount_to_capture: input.amountToCaptureCents
      },
      input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined
    );
    return paymentIntentToSnapshot(intent);
  }

  async cancelPaymentIntent(input: CancelPaymentIntentInput) {
    const client = this.requireClient();
    const intent = await client.paymentIntents.cancel(
      input.providerPaymentIntentId,
      input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined
    );
    return paymentIntentToSnapshot(intent);
  }

  async refundPaymentIntent(input: RefundPaymentIntentInput) {
    const client = this.requireClient();
    const refund = await client.refunds.create(
      {
        payment_intent: input.providerPaymentIntentId,
        amount: input.amountCents,
        reason: input.reason
      },
      input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined
    );
    return toRefundSnapshot(refund);
  }

  verifyWebhookSignature(rawBody: Buffer | string, signature: string, webhookSecret = this.webhookSecret) {
    if (!webhookSecret || webhookSecret.trim().length === 0) {
      throw new Error("stripe_webhook_secret_not_configured");
    }

    const client = this.requireClient();
    const event = client.webhooks.constructEvent(rawBody, signature, webhookSecret);
    const object = event.data.object;

    return {
      id: event.id,
      type: event.type,
      raw: event,
      paymentIntent: object.object === "payment_intent" ? (object as Stripe.PaymentIntent) : null,
      refund: object.object === "refund" ? (object as Stripe.Refund) : null
    };
  }
}

export type CancellationSettlementInput = {
  jobStatus: string;
  customerTotalCents: number;
  platformFeeCents: number;
  driverPayoutGrossCents: number;
  paymentStatus: InternalPaymentStatus;
  amountCapturedCents: number;
  amountAuthorizedCents: number;
};

export type CancellationSettlementOutcome = {
  settlementCode:
    | "BEFORE_ASSIGNMENT_FULL_RELEASE"
    | "AFTER_ASSIGNMENT_CANCELLATION_FEE"
    | "IN_PROGRESS_MANUAL_REVIEW";
  phase: "BEFORE_ASSIGNMENT" | "AFTER_ASSIGNMENT_BEFORE_PICKUP" | "IN_PROGRESS";
  customerChargeRetainedCents: number;
  refundAmountCents: number;
  cancellationFeeCents: number;
  driverPayoutImpactCents: number;
  providerAction: "NONE" | "CANCEL_AUTHORIZATION" | "CAPTURE_CANCELLATION_FEE" | "REFUND_CAPTURED_PAYMENT";
  holdReason: string | null;
  snapshot: Record<string, unknown>;
};

function phaseForJobStatus(jobStatus: string): CancellationSettlementOutcome["phase"] {
  if (["REQUESTED", "DISPATCH_FAILED"].includes(jobStatus)) {
    return "BEFORE_ASSIGNMENT";
  }

  if (["ASSIGNED", "EN_ROUTE_PICKUP"].includes(jobStatus)) {
    return "AFTER_ASSIGNMENT_BEFORE_PICKUP";
  }

  return "IN_PROGRESS";
}

export function determineCancellationSettlement(input: CancellationSettlementInput): CancellationSettlementOutcome {
  const phase = phaseForJobStatus(input.jobStatus);
  const afterAssignmentPolicyFee = Math.min(
    input.customerTotalCents,
    Math.max(250, Math.round(input.customerTotalCents * 0.15))
  );
  const policyDriverImpact = Math.min(input.driverPayoutGrossCents, Math.round(afterAssignmentPolicyFee * 0.4));

  if (phase === "BEFORE_ASSIGNMENT") {
    const refundAmount = input.amountCapturedCents;
    const providerAction =
      input.amountCapturedCents > 0
        ? "REFUND_CAPTURED_PAYMENT"
        : input.amountAuthorizedCents > 0 || ["AUTHORIZED", "REQUIRES_CONFIRMATION", "REQUIRES_PAYMENT_METHOD"].includes(input.paymentStatus)
          ? "CANCEL_AUTHORIZATION"
          : "NONE";

    return {
      settlementCode: "BEFORE_ASSIGNMENT_FULL_RELEASE",
      phase,
      customerChargeRetainedCents: 0,
      refundAmountCents: refundAmount,
      cancellationFeeCents: 0,
      driverPayoutImpactCents: 0,
      providerAction,
      holdReason: null,
      snapshot: {
        phase,
        policyFeeCents: 0,
        actualRetainedCents: 0,
        refundAmountCents: refundAmount,
        driverPayoutImpactCents: 0
      }
    };
  }

  if (phase === "AFTER_ASSIGNMENT_BEFORE_PICKUP") {
    let providerAction: CancellationSettlementOutcome["providerAction"] = "NONE";
    let retained = 0;
    let refundAmount = 0;

    if (input.amountCapturedCents > 0) {
      retained = Math.min(afterAssignmentPolicyFee, input.amountCapturedCents);
      refundAmount = Math.max(0, input.amountCapturedCents - retained);
      providerAction = refundAmount > 0 ? "REFUND_CAPTURED_PAYMENT" : "NONE";
    } else if (input.amountAuthorizedCents > 0 || input.paymentStatus === "AUTHORIZED") {
      retained = afterAssignmentPolicyFee;
      providerAction = retained > 0 ? "CAPTURE_CANCELLATION_FEE" : "CANCEL_AUTHORIZATION";
    }

    return {
      settlementCode: "AFTER_ASSIGNMENT_CANCELLATION_FEE",
      phase,
      customerChargeRetainedCents: retained,
      refundAmountCents: refundAmount,
      cancellationFeeCents: retained,
      driverPayoutImpactCents: retained > 0 ? Math.min(policyDriverImpact, retained) : 0,
      providerAction,
      holdReason: retained > 0 ? "cancellation_fee_captured_pending_policy_release" : null,
      snapshot: {
        phase,
        policyFeeCents: afterAssignmentPolicyFee,
        actualRetainedCents: retained,
        refundAmountCents: refundAmount,
        driverPayoutImpactCents: retained > 0 ? Math.min(policyDriverImpact, retained) : 0
      }
    };
  }

  return {
    settlementCode: "IN_PROGRESS_MANUAL_REVIEW",
    phase,
    customerChargeRetainedCents: input.amountCapturedCents,
    refundAmountCents: 0,
    cancellationFeeCents: input.amountCapturedCents,
    driverPayoutImpactCents: input.driverPayoutGrossCents,
    providerAction: "NONE",
    holdReason: "manual_review_required_in_progress_cancellation",
    snapshot: {
      phase,
      policyFeeCents: input.customerTotalCents,
      actualRetainedCents: input.amountCapturedCents,
      refundAmountCents: 0,
      driverPayoutImpactCents: input.driverPayoutGrossCents,
      manualReview: true
    }
  };
}
