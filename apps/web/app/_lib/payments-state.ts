import type {
  AdminPaymentSummary,
  BusinessPaymentSummary,
  JobStatus,
  PaymentStatus,
  PayoutLedgerStatus
} from "./product-state";

export type PaymentFilterKey = "all" | "risks" | "authorized" | "captured" | "refunded" | "payout_ready";
export type PaymentRiskTone = "danger" | "warning" | "success";

type PaymentLike = Pick<
  BusinessPaymentSummary,
  | "id"
  | "orderId"
  | "jobId"
  | "customerName"
  | "orderStatus"
  | "jobStatus"
  | "paymentStatus"
  | "customerTotalCents"
  | "amountAuthorizedCents"
  | "amountCapturedCents"
  | "amountRefundedCents"
  | "currency"
  | "platformFeeCents"
  | "payoutGrossCents"
  | "payoutStatus"
  | "payoutHoldReason"
  | "createdAt"
  | "updatedAt"
> & {
  restaurant: BusinessPaymentSummary["restaurant"];
};

export const PAYMENT_FILTERS: Array<{ key: PaymentFilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "risks", label: "Risks" },
  { key: "authorized", label: "Authorised" },
  { key: "captured", label: "Captured" },
  { key: "refunded", label: "Refunded / cancelled" },
  { key: "payout_ready", label: "Payout ready" }
];

function isRefundLike(status: PaymentStatus) {
  return status === "REFUNDED" || status === "PARTIALLY_REFUNDED" || status === "CANCELLED";
}

function isDeliveredLike(status: JobStatus) {
  return status === "DELIVERED" || status === "COMPLETED";
}

export function getPaymentShortId(value: string) {
  return value.slice(0, 8);
}

export function getPayoutStatusLabel(status: PayoutLedgerStatus | null) {
  if (status === "READY") {
    return "Ready to release";
  }

  if (status === "PAID") {
    return "Paid out";
  }

  if (status === "FAILED") {
    return "Payout failed";
  }

  if (status === "CANCELLED") {
    return "Payout cancelled";
  }

  if (status === "PENDING") {
    return "Pending ledger";
  }

  return "Awaiting ledger";
}

export function isPayoutReady(payment: PaymentLike) {
  return payment.payoutStatus === "READY" || payment.payoutStatus === "PAID";
}

export function getPaymentRiskReasons(payment: PaymentLike) {
  const reasons: string[] = [];

  if (payment.paymentStatus === "FAILED") {
    reasons.push("Payment failed");
  }

  if (payment.orderStatus === "PAYMENT_FAILED") {
    reasons.push("Order payment failed");
  }

  if (isDeliveredLike(payment.jobStatus) && payment.paymentStatus === "AUTHORIZED") {
    reasons.push("Delivered but capture still pending");
  }

  if (payment.payoutStatus === "FAILED") {
    reasons.push("Driver payout failed");
  }

  if (payment.payoutHoldReason) {
    reasons.push(payment.payoutHoldReason);
  }

  if (payment.paymentStatus === "CANCELLED" && payment.amountRefundedCents === 0 && payment.amountCapturedCents > 0) {
    reasons.push("Captured funds need refund review");
  }

  return reasons;
}

export function getPaymentRiskState(payment: PaymentLike): {
  tone: PaymentRiskTone;
  title: string;
  summary: string;
} {
  const reasons = getPaymentRiskReasons(payment);
  if (reasons.length > 0) {
    return {
      tone: reasons.some((reason) => /failed|pending/i.test(reason)) ? "danger" : "warning",
      title: "Needs review",
      summary: reasons.join(" · ")
    };
  }

  if (isPayoutReady(payment)) {
    return {
      tone: "success",
      title: payment.payoutStatus === "PAID" ? "Settled" : "Ready for payout",
      summary: `${getPayoutStatusLabel(payment.payoutStatus)} · ${payment.paymentStatus.toLowerCase().replace(/_/g, " ")}`
    };
  }

  if (payment.paymentStatus === "CAPTURED") {
    return {
      tone: "warning",
      title: "Captured, payout pending",
      summary: getPayoutStatusLabel(payment.payoutStatus)
    };
  }

  if (payment.paymentStatus === "AUTHORIZED") {
    return {
      tone: "warning",
      title: "Authorized",
      summary: "Funds are held but not yet settled."
    };
  }

  return {
    tone: "success",
    title: "Stable",
    summary: "No unresolved settlement signals."
  };
}

export function matchesPaymentFilter(payment: PaymentLike, filter: PaymentFilterKey) {
  if (filter === "all") {
    return true;
  }

  if (filter === "risks") {
    return getPaymentRiskReasons(payment).length > 0;
  }

  if (filter === "authorized") {
    return payment.paymentStatus === "AUTHORIZED";
  }

  if (filter === "captured") {
    return payment.paymentStatus === "CAPTURED";
  }

  if (filter === "refunded") {
    return isRefundLike(payment.paymentStatus);
  }

  return isPayoutReady(payment);
}

export function summarizePaymentPortfolio(payments: Array<BusinessPaymentSummary | AdminPaymentSummary>) {
  return payments.reduce(
    (summary, payment) => {
      if (payment.paymentStatus === "AUTHORIZED") {
        summary.authorized += 1;
      }

      if (payment.paymentStatus === "CAPTURED") {
        summary.captured += 1;
      }

      if (payment.paymentStatus === "FAILED") {
        summary.failed += 1;
      }

      if (isRefundLike(payment.paymentStatus)) {
        summary.refundedOrCancelled += 1;
      }

      if (isPayoutReady(payment)) {
        summary.payoutReady += 1;
      }

      if (getPaymentRiskReasons(payment).length > 0) {
        summary.risks += 1;
      }

      return summary;
    },
    {
      authorized: 0,
      captured: 0,
      failed: 0,
      refundedOrCancelled: 0,
      payoutReady: 0,
      risks: 0
    }
  );
}
