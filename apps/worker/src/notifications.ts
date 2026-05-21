export type ExternalNotificationEventType =
  | "NOTIFY_CUSTOMER_ORDER_CONFIRMATION"
  | "NOTIFY_BUSINESS_NEW_ORDER"
  | "NOTIFY_DRIVER_OFFER"
  | "NOTIFY_JOB_DELIVERED"
  | "NOTIFY_PAYMENT_CAPTURED"
  | "NOTIFY_ADMIN_DEMO_REQUEST_CREATED"
  | "DEMO_REQUEST_STATUS_UPDATED"
  | "DEMO_REQUEST_FOLLOW_UP_SCHEDULED"
  | "DEMO_REQUEST_CONTACT_RECORDED"
  | "ORG_INVITE_CREATED"
  | "ORG_INVITE_RESENT"
  | "ORG_INVITE_CANCELLED"
  | "TEST_ADMIN_NOTIFICATION";

export type ExternalNotificationEmail = {
  metadata: Record<string, unknown>;
  subject: string;
  text: string;
  to: string;
};

export type ExternalNotificationProvider = {
  readonly provider: "noop" | "resend";
  isConfigured(): boolean;
  sendEmail(message: ExternalNotificationEmail): Promise<{ providerMessageId: string | null }>;
};

export type CustomerOrderNotificationContext = {
  customerEmail: string;
  customerName: string;
  deliveryAddress: string;
  jobId: string;
  orderId: string;
  orgName: string;
  restaurantName: string;
  restaurantSlug: string;
  totalCents: number;
  currency: string;
};

export type BusinessOrderAlertContext = {
  businessEmail: string;
  customerName: string;
  deliveryAddress: string;
  jobId: string;
  orderId: string;
  orgName: string;
  restaurantName: string;
  totalCents: number;
  currency: string;
};

export type DriverOfferNotificationContext = {
  distanceMiles: number;
  driverEmail: string;
  driverName: string;
  etaMinutes: number;
  jobId: string;
  offerId: string;
  payoutGrossCents: number;
  pickupAddress: string;
  dropoffAddress: string;
  restaurantName: string | null;
  vehicleRequired: "BIKE" | "CAR";
  currency: string;
};

export type DeliveryCompletedNotificationContext = {
  customerEmail: string;
  customerName: string;
  jobId: string;
  orderId: string;
  restaurantName: string;
};

export type PaymentCapturedNotificationContext = {
  businessEmail: string;
  jobId: string;
  orderId: string;
  paymentId: string;
  orgName: string;
  restaurantName: string;
  totalCents: number;
  currency: string;
};

export type AdminDemoRequestNotificationContext = {
  adminEmail: string;
  demoRequestId: string;
  eventType: Extract<
    ExternalNotificationEventType,
    | "NOTIFY_ADMIN_DEMO_REQUEST_CREATED"
    | "DEMO_REQUEST_STATUS_UPDATED"
    | "DEMO_REQUEST_FOLLOW_UP_SCHEDULED"
    | "DEMO_REQUEST_CONTACT_RECORDED"
  >;
  requesterEmail: string | null;
  requesterName: string | null;
  organisation: string | null;
  interestType: string | null;
  status: string | null;
  previousStatus?: string | null;
  newStatus?: string | null;
  nextFollowUpAt?: string | null;
  lastContactedAt?: string | null;
  occurredAt: string | null;
};

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase()
  }).format(cents / 100);
}

export function buildCustomerOrderConfirmationEmail(context: CustomerOrderNotificationContext): ExternalNotificationEmail {
  return {
    to: context.customerEmail,
    subject: `ShipWright order confirmed · ${context.restaurantName}`,
    text: [
      `Hi ${context.customerName},`,
      ``,
      `Your order ${context.orderId} from ${context.restaurantName} has been received.`,
      `Total: ${formatCurrency(context.totalCents, context.currency)}`,
      `Delivery address: ${context.deliveryAddress}`,
      ``,
      `The order is now moving into delivery fulfilment. We'll update you again when delivery completes.`,
      ``,
      `ShipWright`
    ].join("\n"),
    metadata: {
      category: "customer_order_confirmation",
      orderId: context.orderId,
      jobId: context.jobId,
      restaurantSlug: context.restaurantSlug
    }
  };
}

export function buildBusinessNewOrderEmail(context: BusinessOrderAlertContext): ExternalNotificationEmail {
  return {
    to: context.businessEmail,
    subject: `New paid order · ${context.restaurantName}`,
    text: [
      `A new paid order is ready for fulfilment.`,
      ``,
      `Order: ${context.orderId}`,
      `Restaurant: ${context.restaurantName}`,
      `Customer: ${context.customerName}`,
      `Delivery address: ${context.deliveryAddress}`,
      `Total: ${formatCurrency(context.totalCents, context.currency)}`,
      `Linked job: ${context.jobId}`,
      ``,
      `Open ShipWright to review the order and linked delivery job.`
    ].join("\n"),
    metadata: {
      category: "business_new_order",
      orderId: context.orderId,
      jobId: context.jobId,
      orgName: context.orgName
    }
  };
}

export function buildDriverOfferEmail(context: DriverOfferNotificationContext): ExternalNotificationEmail {
  const restaurantPrefix = context.restaurantName ? `${context.restaurantName} · ` : "";

  return {
    to: context.driverEmail,
    subject: `Driver offer · ${restaurantPrefix}${context.pickupAddress}`,
    text: [
      `Hi ${context.driverName},`,
      ``,
      `A delivery offer is ready in ShipWright.`,
      `Offer: ${context.offerId}`,
      `Job: ${context.jobId}`,
      `Pickup: ${context.pickupAddress}`,
      `Drop-off: ${context.dropoffAddress}`,
      `Vehicle: ${context.vehicleRequired}`,
      `ETA: ${context.etaMinutes} min`,
      `Distance: ${context.distanceMiles.toFixed(1)} mi`,
      `Payout: ${formatCurrency(context.payoutGrossCents, context.currency)}`,
      ``,
      `Open the driver app to accept or reject the offer before it expires.`
    ].join("\n"),
    metadata: {
      category: "driver_offer",
      jobId: context.jobId,
      offerId: context.offerId
    }
  };
}

export function buildDeliveryCompletedEmail(context: DeliveryCompletedNotificationContext): ExternalNotificationEmail {
  return {
    to: context.customerEmail,
    subject: `Delivered · ${context.restaurantName}`,
    text: [
      `Hi ${context.customerName},`,
      ``,
      `Your order ${context.orderId} from ${context.restaurantName} has been delivered.`,
      `Linked delivery job: ${context.jobId}`,
      ``,
      `Thank you for ordering with ShipWright.`
    ].join("\n"),
    metadata: {
      category: "delivery_completed",
      orderId: context.orderId,
      jobId: context.jobId
    }
  };
}

export function buildPaymentCapturedEmail(context: PaymentCapturedNotificationContext): ExternalNotificationEmail {
  return {
    to: context.businessEmail,
    subject: `Payment captured · ${context.restaurantName}`,
    text: [
      `Payment has been captured for a completed order.`,
      ``,
      `Order: ${context.orderId}`,
      `Job: ${context.jobId}`,
      `Payment: ${context.paymentId}`,
      `Restaurant: ${context.restaurantName}`,
      `Total: ${formatCurrency(context.totalCents, context.currency)}`,
      ``,
      `The linked delivery is complete and funds are now captured.`
    ].join("\n"),
    metadata: {
      category: "payment_captured",
      orderId: context.orderId,
      paymentId: context.paymentId,
      orgName: context.orgName
    }
  };
}

export function buildAdminDemoRequestEmail(context: AdminDemoRequestNotificationContext): ExternalNotificationEmail {
  const eventLabel =
    context.eventType === "NOTIFY_ADMIN_DEMO_REQUEST_CREATED"
      ? "New demo request"
      : context.eventType === "DEMO_REQUEST_STATUS_UPDATED"
        ? "Demo request status updated"
        : context.eventType === "DEMO_REQUEST_FOLLOW_UP_SCHEDULED"
          ? "Demo follow-up scheduled"
          : "Demo requester contact recorded";
  const requester = context.requesterName || context.requesterEmail || "Unknown requester";
  const details = [
    `Demo request: ${context.demoRequestId}`,
    `Requester: ${requester}`,
    context.requesterEmail ? `Email: ${context.requesterEmail}` : null,
    context.organisation ? `Organisation: ${context.organisation}` : null,
    context.interestType ? `Interest: ${context.interestType}` : null,
    context.status ? `Status: ${context.status}` : null,
    context.previousStatus && context.newStatus ? `Status change: ${context.previousStatus} -> ${context.newStatus}` : null,
    context.nextFollowUpAt ? `Next follow-up: ${context.nextFollowUpAt}` : null,
    context.lastContactedAt ? `Last contacted: ${context.lastContactedAt}` : null,
    context.occurredAt ? `Occurred at: ${context.occurredAt}` : null
  ].filter(Boolean);

  return {
    to: context.adminEmail,
    subject: `ShipWright admin · ${eventLabel}`,
    text: [
      eventLabel,
      ``,
      ...details,
      ``,
      `Open ShipWright Admin > Demo requests to review and update the follow-up pipeline.`
    ].join("\n"),
    metadata: {
      category: "admin_demo_request",
      demoRequestId: context.demoRequestId,
      eventType: context.eventType,
      interestType: context.interestType,
      status: context.status
    }
  };
}

export class NoopExternalNotificationProvider implements ExternalNotificationProvider {
  readonly provider = "noop" as const;

  isConfigured() {
    return false;
  }

  async sendEmail(_message: ExternalNotificationEmail) {
    return { providerMessageId: null };
  }
}

export class ResendExternalNotificationProvider implements ExternalNotificationProvider {
  readonly provider = "resend" as const;
  private readonly apiKey: string | null;
  private readonly fromEmail: string | null;
  private readonly replyToEmail: string | null;

  constructor(config: { apiKey?: string | null; fromEmail?: string | null; replyToEmail?: string | null } = {}) {
    this.apiKey = config.apiKey?.trim() || null;
    this.fromEmail = config.fromEmail?.trim() || null;
    this.replyToEmail = config.replyToEmail?.trim() || null;
  }

  isConfigured() {
    return Boolean(this.apiKey && this.fromEmail);
  }

  async sendEmail(message: ExternalNotificationEmail) {
    if (!this.isConfigured()) {
      throw new Error("notification_provider_not_configured");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: [message.to],
        reply_to: this.replyToEmail ?? undefined,
        subject: message.subject,
        text: message.text
      })
    });

    const payload = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
    if (!response.ok) {
      throw new Error(payload?.message ?? `resend_request_failed:${response.status}`);
    }

    return {
      providerMessageId: payload?.id ?? null
    };
  }
}
