import type { BusinessNotification } from "./product-state";

export type NotificationIconName =
  | "alert"
  | "check"
  | "document"
  | "driver"
  | "payment"
  | "queue"
  | "retry"
  | "route"
  | "timeline"
  | "warning";

export type NotificationPresentation = BusinessNotification & {
  href: string | null;
  icon: NotificationIconName;
  timeAgo: string;
};

function severityIcon(severity: BusinessNotification["severity"]): NotificationIconName {
  if (severity === "danger") {
    return "alert";
  }

  if (severity === "warning") {
    return "warning";
  }

  if (severity === "success") {
    return "check";
  }

  return "document";
}

function mapTypeCopy(type: string) {
  switch (type) {
    case "JOB_DISPATCH_REQUESTED":
      return {
        title: "Dispatch started",
        message: "The delivery is being offered to eligible drivers.",
        icon: "retry" as const
      };
    case "JOB_DISPATCH_FAILED":
      return {
        title: "Dispatch failed",
        message: "No eligible driver accepted the job. It needs review.",
        icon: "alert" as const
      };
    case "JOB_DISPATCH_RETRIED":
      return {
        title: "Dispatch retried",
        message: "Another dispatch attempt has been requested.",
        icon: "retry" as const
      };
    case "JOB_ASSIGNED":
      return {
        title: "Driver assigned",
        message: "A driver is now assigned to this delivery.",
        icon: "driver" as const
      };
    case "JOB_EN_ROUTE_PICKUP":
      return {
        title: "Driver heading to pickup",
        message: "The assigned driver is travelling to the pickup point.",
        icon: "route" as const
      };
    case "JOB_PICKED_UP":
      return {
        title: "Order picked up",
        message: "The order has been collected and is moving through delivery.",
        icon: "queue" as const
      };
    case "JOB_EN_ROUTE_DROP":
      return {
        title: "Out for delivery",
        message: "The driver is travelling to the customer drop-off.",
        icon: "route" as const
      };
    case "JOB_PROOF_OF_DELIVERY_RECORDED":
      return {
        title: "Proof of delivery recorded",
        message: "Delivery evidence has been submitted for this job.",
        icon: "check" as const
      };
    case "JOB_DELIVERED":
      return {
        title: "Delivery completed",
        message: "The driver marked this delivery as completed.",
        icon: "check" as const
      };
    case "PAYMENT_CAPTURE_REQUESTED":
      return {
        title: "Capturing payment",
        message: "The system queued capture for a delivered job.",
        icon: "payment" as const
      };
    case "PAYMENT_CAPTURED":
      return {
        title: "Payment captured",
        message: "Funds were captured successfully after delivery.",
        icon: "payment" as const
      };
    case "PAYMENT_AUTHORIZED":
      return {
        title: "Payment authorized",
        message: "Customer funds are authorized and the delivery can proceed.",
        icon: "payment" as const
      };
    case "PAYMENT_AUTHORIZATION_FAILED":
      return {
        title: "Payment failed",
        message: "Payment authorization failed and needs review.",
        icon: "alert" as const
      };
    case "CUSTOMER_ORDER_SUBMITTED":
      return {
        title: "Customer order received",
        message: "A paid customer order entered operations.",
        icon: "document" as const
      };
    default:
      return {
        title: null,
        message: null,
        icon: null
      };
  }
}

export function getNotificationHref(notification: BusinessNotification) {
  if (notification.entityType === "job") {
    return `/app/jobs/${notification.entityId}`;
  }

  if (notification.entityType === "order") {
    return `/app/orders/${notification.entityId}`;
  }

  return null;
}

export function formatNotificationTimeAgo(createdAt: string, now = new Date()) {
  const deltaMs = new Date(createdAt).getTime() - now.getTime();
  const deltaSeconds = Math.round(deltaMs / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const absoluteSeconds = Math.abs(deltaSeconds);
  if (absoluteSeconds < 60) {
    return formatter.format(deltaSeconds, "second");
  }

  const deltaMinutes = Math.round(deltaSeconds / 60);
  if (Math.abs(deltaMinutes) < 60) {
    return formatter.format(deltaMinutes, "minute");
  }

  const deltaHours = Math.round(deltaMinutes / 60);
  if (Math.abs(deltaHours) < 24) {
    return formatter.format(deltaHours, "hour");
  }

  const deltaDays = Math.round(deltaHours / 24);
  return formatter.format(deltaDays, "day");
}

export function groupNotificationsByDate(
  notifications: BusinessNotification[],
  now = new Date()
): Array<{ items: BusinessNotification[]; label: "Today" | "Earlier" }> {
  const todayKey = now.toDateString();
  const today = notifications.filter((notification) => new Date(notification.createdAt).toDateString() === todayKey);
  const earlier = notifications.filter((notification) => new Date(notification.createdAt).toDateString() !== todayKey);
  const groups: Array<{ items: BusinessNotification[]; label: "Today" | "Earlier" }> = [];

  if (today.length > 0) {
    groups.push({ label: "Today", items: today });
  }

  if (earlier.length > 0) {
    groups.push({ label: "Earlier", items: earlier });
  }

  return groups;
}

export function mapNotification(notification: BusinessNotification, now = new Date()): NotificationPresentation {
  const copy = mapTypeCopy(notification.type);

  return {
    ...notification,
    title: copy.title ?? notification.title,
    message: copy.message ?? notification.message,
    icon: copy.icon ?? severityIcon(notification.severity),
    href: getNotificationHref(notification),
    timeAgo: formatNotificationTimeAgo(notification.createdAt, now)
  };
}
