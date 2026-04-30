import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  NoopExternalNotificationProvider,
  ResendExternalNotificationProvider,
  buildBusinessNewOrderEmail,
  buildCustomerOrderConfirmationEmail,
  buildDeliveryCompletedEmail,
  buildDriverOfferEmail,
  buildPaymentCapturedEmail
} from "./notifications.js";

describe("notification mapping", () => {
  it("builds customer order confirmation copy", () => {
    const message = buildCustomerOrderConfirmationEmail({
      customerEmail: "ada@example.com",
      customerName: "Ada",
      deliveryAddress: "10 Pilot Street, London",
      jobId: "job-1",
      orderId: "order-1",
      orgName: "Pilot Org",
      restaurantName: "Pilot Kitchen",
      restaurantSlug: "pilot-kitchen",
      totalCents: 1886,
      currency: "gbp"
    });

    expect(message.subject).toContain("ShipWright order confirmed");
    expect(message.text).toContain("Pilot Kitchen");
    expect(message.text).toContain("£18.86");
  });

  it("builds driver offer copy", () => {
    const message = buildDriverOfferEmail({
      distanceMiles: 4.8,
      driverEmail: "driver@example.com",
      driverName: "Driver One",
      etaMinutes: 22,
      jobId: "job-2",
      offerId: "offer-1",
      payoutGrossCents: 1106,
      pickupAddress: "12 Exmouth Market, London",
      dropoffAddress: "184 Upper Street, London",
      restaurantName: "Pilot Kitchen",
      vehicleRequired: "BIKE",
      currency: "gbp"
    });

    expect(message.subject).toContain("Driver offer");
    expect(message.text).toContain("Open the driver app");
    expect(message.text).toContain("£11.06");
  });

  it("builds payment captured copy", () => {
    const message = buildPaymentCapturedEmail({
      businessEmail: "ops@example.com",
      jobId: "job-3",
      orderId: "order-3",
      paymentId: "payment-3",
      orgName: "Pilot Org",
      restaurantName: "Pilot Kitchen",
      totalCents: 1886,
      currency: "gbp"
    });

    expect(message.subject).toContain("Payment captured");
    expect(message.text).toContain("completed order");
  });

  it("builds delivery completed and business order alert copy", () => {
    const completed = buildDeliveryCompletedEmail({
      customerEmail: "ada@example.com",
      customerName: "Ada",
      jobId: "job-4",
      orderId: "order-4",
      restaurantName: "Pilot Kitchen"
    });
    const business = buildBusinessNewOrderEmail({
      businessEmail: "ops@example.com",
      customerName: "Ada",
      deliveryAddress: "10 Pilot Street, London",
      jobId: "job-4",
      orderId: "order-4",
      orgName: "Pilot Org",
      restaurantName: "Pilot Kitchen",
      totalCents: 1886,
      currency: "gbp"
    });

    expect(completed.text).toContain("has been delivered");
    expect(business.text).toContain("new paid order");
  });
});

describe("notification providers", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("noop provider is safely unconfigured", async () => {
    const provider = new NoopExternalNotificationProvider();
    expect(provider.isConfigured()).toBe(false);
    await expect(
      provider.sendEmail({
        to: "ops@example.com",
        subject: "Test",
        text: "Body",
        metadata: {}
      })
    ).resolves.toEqual({ providerMessageId: null });
  });

  it("resend provider performs a successful mocked request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "email_123" })
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new ResendExternalNotificationProvider({
      apiKey: "re_test_123",
      fromEmail: "ShipWright <ops@shipwright.example.com>"
    });

    const result = await provider.sendEmail({
      to: "ops@example.com",
      subject: "Subject",
      text: "Body",
      metadata: {}
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result).toEqual({ providerMessageId: "email_123" });
  });
});
