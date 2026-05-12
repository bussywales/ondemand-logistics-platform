import type { BusinessCustomerOrder, BusinessPaymentSummary } from "./product-state";

export const ORDER_FILTERS = [
  { key: "all", label: "All" },
  { key: "needs-action", label: "Needs action" },
  { key: "in-delivery", label: "In delivery" },
  { key: "payment-risk", label: "Payment risk" },
  { key: "fulfilled", label: "Fulfilled" },
] as const;

export type OrderFilterKey = (typeof ORDER_FILTERS)[number]["key"];
export type PaymentRiskFilterKey = "needs-action" | "authorized" | "captured" | "failed-refunded" | "payout-review";
export const PAYMENT_RISK_FILTERS: Array<{ key: PaymentRiskFilterKey; label: string }> = [
  { key: "needs-action", label: "Needs action" },
  { key: "authorized", label: "Authorised" },
  { key: "captured", label: "Captured" },
  { key: "failed-refunded", label: "Failed / refunded" },
  { key: "payout-review", label: "Payout review" }
];

export type OrderFinancialView = BusinessCustomerOrder & {
  financials: {
    platformFeeCents: number | null;
    driverPayoutCents: number | null;
    payoutStatus: BusinessPaymentSummary["payoutStatus"];
    payoutHoldReason: string | null;
  } | null;
};

export type OrderDecisionState = {
  headline: string;
  impact: string;
  nextAction: string;
  nextHref: string;
  severity: "danger" | "warning" | "info" | "success";
  summary: string;
};

export function formatOrderStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export function getOrderShortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

export function withOrderFinancials(
  order: BusinessCustomerOrder,
  paymentSummary?: BusinessPaymentSummary | null
): OrderFinancialView {
  return {
    ...order,
    financials: paymentSummary
      ? {
          platformFeeCents: paymentSummary.platformFeeCents,
          driverPayoutCents: paymentSummary.payoutGrossCents,
          payoutStatus: paymentSummary.payoutStatus,
          payoutHoldReason: paymentSummary.payoutHoldReason
        }
      : null
  };
}

export function isOrderFulfilled(order: Pick<BusinessCustomerOrder, "status" | "job" | "payment">) {
  return order.status === "FULFILLED" || (order.job.status === "DELIVERED" && order.payment.status === "CAPTURED");
}

export function isOrderPaymentFailed(order: Pick<BusinessCustomerOrder, "status" | "payment">) {
  return order.status === "PAYMENT_FAILED" || order.payment.status === "FAILED";
}

export function isOrderBlocked(order: Pick<BusinessCustomerOrder, "job" | "payment">) {
  return order.job.status === "DISPATCH_FAILED" || order.payment.status === "FAILED";
}

export function isOrderInDelivery(order: Pick<BusinessCustomerOrder, "job">) {
  return ["ASSIGNED", "EN_ROUTE_PICKUP", "PICKED_UP", "EN_ROUTE_DROP"].includes(order.job.status);
}

export function getOrderFinancialRiskReasons(order: OrderFinancialView) {
  const reasons: string[] = [];

  if (order.payment.status === "FAILED") {
    reasons.push("Payment failed");
  }

  if (order.status === "PAYMENT_FAILED") {
    reasons.push("Order marked as payment failed");
  }

  if (order.job.status === "DELIVERED" && order.payment.status !== "CAPTURED") {
    reasons.push("Delivered but payment not captured");
  }

  if (order.financials?.payoutStatus === "FAILED") {
    reasons.push("Driver payout failed");
  }

  if (order.financials?.payoutHoldReason) {
    reasons.push(order.financials.payoutHoldReason);
  }

  if (
    order.payment.status === "CAPTURED" &&
    order.job.status === "DELIVERED" &&
    order.financials &&
    !order.financials.payoutStatus
  ) {
    reasons.push("Captured but payout ledger missing");
  }

  return reasons;
}

export function hasOrderPaymentRisk(order: OrderFinancialView) {
  return getOrderFinancialRiskReasons(order).length > 0;
}

export function getOrderRiskState(order: OrderFinancialView) {
  const reasons = getOrderFinancialRiskReasons(order);

  if (reasons.length > 0) {
    return {
      tone: "danger" as const,
      title: "Payment action required",
      summary: reasons.join(" · ")
    };
  }

  if (isOrderFulfilled(order)) {
    return {
      tone: "success" as const,
      title: "Clear",
      summary: "Customer charged successfully and fulfilment is complete."
    };
  }

  if (isOrderInDelivery(order)) {
    return {
      tone: "info" as const,
      title: "Monitor",
      summary: "Delivery is active and payment is not currently blocking fulfilment."
    };
  }

  return {
    tone: "warning" as const,
    title: "Needs fulfilment",
    summary: "Payment is authorised and the order still needs delivery progress."
  };
}

export function getOrderNextAction(order: OrderFinancialView) {
  if (hasOrderPaymentRisk(order)) {
    return {
      label: "Review payment risk",
      href: `/app/orders/${order.id}`
    };
  }

  if (order.job.status === "DISPATCH_FAILED") {
    return {
      label: "Resolve dispatch",
      href: `/app/jobs/${order.job.id}`
    };
  }

  if (isOrderInDelivery(order)) {
    return {
      label: "Monitor delivery",
      href: `/app/jobs/${order.job.id}`
    };
  }

  if (isOrderFulfilled(order)) {
    return {
      label: "View order",
      href: `/app/orders/${order.id}`
    };
  }

  return {
    label: "Open delivery job",
    href: `/app/jobs/${order.job.id}`
  };
}

export function matchesOrderFilter(order: OrderFinancialView, filter: OrderFilterKey) {
  switch (filter) {
    case "all":
      return true;
    case "needs-action":
      return hasOrderPaymentRisk(order) || order.job.status === "DISPATCH_FAILED" || (order.payment.status === "AUTHORIZED" && !isOrderInDelivery(order) && !isOrderFulfilled(order));
    case "in-delivery":
      return isOrderInDelivery(order);
    case "payment-risk":
      return hasOrderPaymentRisk(order);
    case "fulfilled":
      return isOrderFulfilled(order);
    default:
      return true;
  }
}

export function matchesPaymentRiskFilter(order: OrderFinancialView, filter: PaymentRiskFilterKey) {
  switch (filter) {
    case "needs-action":
      return hasOrderPaymentRisk(order);
    case "authorized":
      return order.payment.status === "AUTHORIZED";
    case "captured":
      return order.payment.status === "CAPTURED";
    case "failed-refunded":
      return ["FAILED", "REFUNDED", "PARTIALLY_REFUNDED", "CANCELLED"].includes(order.payment.status);
    case "payout-review":
      return Boolean(order.financials?.payoutHoldReason) || order.financials?.payoutStatus === "FAILED" || (order.payment.status === "CAPTURED" && order.job.status === "DELIVERED" && order.financials?.payoutStatus !== "PAID" && order.financials?.payoutStatus !== "READY");
    default:
      return false;
  }
}

export function formatOrderTimeAgo(value: string, now = new Date()) {
  const seconds = Math.max(0, Math.round((now.getTime() - new Date(value).getTime()) / 1000));
  if (seconds < 60) {
    return "Just now";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function getPaymentCopy(order: BusinessCustomerOrder) {
  if (order.payment.status === "AUTHORIZED") {
    return "Payment is authorised and ready for fulfilment.";
  }

  if (order.payment.status === "CAPTURED") {
    return "Payment capture completed after delivery.";
  }

  if (order.payment.status === "FAILED") {
    return order.payment.lastError ?? "Payment failed and the order cannot continue.";
  }

  if (order.payment.status === "REQUIRES_PAYMENT_METHOD") {
    return "Payment method is required before the order can move forward.";
  }

  return `Payment is ${formatOrderStatusLabel(order.payment.status).toLowerCase()}.`;
}

export function getDeliveryCopy(order: BusinessCustomerOrder) {
  if (order.job.status === "DISPATCH_FAILED") {
    return "Delivery is blocked because no eligible driver accepted the job.";
  }

  if (order.job.status === "DELIVERED") {
    return "Delivery job completed successfully.";
  }

  if (isOrderInDelivery(order)) {
    return "Delivery is active and progressing through the driver lifecycle.";
  }

  return `Linked delivery job is ${formatOrderStatusLabel(order.job.status).toLowerCase()}.`;
}

export function getOrderDecisionState(order: OrderFinancialView): OrderDecisionState {
  if (hasOrderPaymentRisk(order)) {
    return {
      headline: "Payment review required",
      summary: "Operator review is needed before this order can be marked complete.",
      impact: "The order is otherwise in a recoverable state, but payment or payout risk blocks safe closure.",
      nextAction: "Review the payment risk row and clear the payment or payout reason before manual handoff.",
      nextHref: `/app/payments`,
      severity: "warning"
    };
  }

  if (isOrderFulfilled(order)) {
    return {
      headline: "Order fulfilled",
      summary: "Delivery completed and payment captured.",
      impact: "No operator action is required unless the customer raises a support issue.",
      nextAction: "Review the delivery timeline or move to the next active order.",
      nextHref: `/app/jobs/${order.job.id}`,
      severity: "success"
    };
  }

  if (isOrderPaymentFailed(order)) {
    return {
      headline: "Payment review required",
      summary: "The customer order cannot continue until payment is resolved.",
      impact: "Dispatch should not proceed because the order has no valid payment outcome.",
      nextAction: "Confirm the failure details and ask the customer to retry checkout.",
      nextHref: `/app/payments`,
      severity: "danger"
    };
  }

  if (order.job.status === "DISPATCH_FAILED") {
    return {
      headline: "Delivery review required",
      summary: "Payment is authorised but dispatch did not secure a driver.",
      impact: "The customer is waiting and the order is not moving toward fulfilment.",
      nextAction: "Open the linked delivery job and retry dispatch or assign a driver manually.",
      nextHref: `/app/jobs/${order.job.id}`,
      severity: "danger"
    };
  }

  if (isOrderInDelivery(order)) {
    return {
      headline: "Order in progress",
      summary: "Payment is secure and the driver is actively progressing the job.",
      impact: "Monitor route progress, ETA, and timeline until delivery completes.",
      nextAction: "Open the delivery job if the driver stalls or the customer requests an update.",
      nextHref: `/app/jobs/${order.job.id}`,
      severity: "info"
    };
  }

  return {
    headline: "Order in progress",
    summary: "Checkout completed and fulfilment is in the control path.",
    impact: "Delivery needs operational progress before completion.",
    nextAction: "Open the linked delivery job and monitor dispatch readiness.",
    nextHref: `/app/jobs/${order.job.id}`,
    severity: "warning"
  };
}
