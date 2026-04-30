import type { BusinessCustomerOrder } from "./product-state";

export const ORDER_FILTERS = [
  { key: "all", label: "All" },
  { key: "new-authorized", label: "New / Authorised" },
  { key: "in-delivery", label: "In delivery" },
  { key: "fulfilled", label: "Fulfilled" },
  { key: "payment-failed", label: "Payment failed" }
] as const;

export type OrderFilterKey = (typeof ORDER_FILTERS)[number]["key"];

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

export function matchesOrderFilter(order: BusinessCustomerOrder, filter: OrderFilterKey) {
  switch (filter) {
    case "all":
      return true;
    case "new-authorized":
      return (
        !isOrderFulfilled(order) &&
        !isOrderPaymentFailed(order) &&
        (order.payment.status === "AUTHORIZED" || ["REQUESTED", "DISPATCH_FAILED"].includes(order.job.status))
      );
    case "in-delivery":
      return isOrderInDelivery(order);
    case "fulfilled":
      return isOrderFulfilled(order);
    case "payment-failed":
      return isOrderPaymentFailed(order);
    default:
      return true;
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

export function getOrderDecisionState(order: BusinessCustomerOrder): OrderDecisionState {
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
      headline: "Payment failed",
      summary: "The customer order cannot continue until payment is resolved.",
      impact: "Dispatch should not proceed because the order has no valid payment outcome.",
      nextAction: "Confirm the failure details and ask the customer to retry checkout.",
      nextHref: `/app/orders/${order.id}`,
      severity: "danger"
    };
  }

  if (order.job.status === "DISPATCH_FAILED") {
    return {
      headline: "Delivery blocked",
      summary: "Payment is authorised but dispatch did not secure a driver.",
      impact: "The customer is waiting and the order is not moving toward fulfilment.",
      nextAction: "Open the linked delivery job and retry dispatch or assign a driver manually.",
      nextHref: `/app/jobs/${order.job.id}`,
      severity: "danger"
    };
  }

  if (isOrderInDelivery(order)) {
    return {
      headline: "Order in delivery",
      summary: "Payment is secure and the driver is actively progressing the job.",
      impact: "Monitor route progress, ETA, and timeline until delivery completes.",
      nextAction: "Open the delivery job if the driver stalls or the customer requests an update.",
      nextHref: `/app/jobs/${order.job.id}`,
      severity: "info"
    };
  }

  return {
    headline: "Paid order waiting for fulfilment",
    summary: "Checkout completed and the order is ready for operational handling.",
    impact: "The order needs a delivery job to move from payment into fulfilment.",
    nextAction: "Review the linked job and watch dispatch until a driver is secured.",
    nextHref: `/app/jobs/${order.job.id}`,
    severity: "warning"
  };
}
