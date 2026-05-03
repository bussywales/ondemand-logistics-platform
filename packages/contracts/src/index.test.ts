import { describe, expect, it } from "vitest";
import {
  AdminPaymentListSchema,
  AdminOverviewSchema,
  BusinessPaymentListSchema,
  BusinessContextSchema,
  DailyBriefingSchema,
  BusinessNotificationReadAllSchema,
  BusinessNotificationReadSchema,
  BusinessNotificationListSchema,
  CancelJobSchema,
  CreateBusinessOrgSchema,
  CreateJobRequestSchema,
  CreateProofOfDeliverySchema,
  CreateQuoteSchema,
  CustomerOrderStatusSchema,
  EligibleDriverListSchema,
  JobPaymentSummarySchema,
  JobTrackingSchema,
  JobStatusSchema,
  PaginatedJobsSchema,
  PaymentStatusSchema,
  ProofOfDeliveryUploadUrlResponseSchema,
  SubmitCustomerOrderResponseSchema,
  SubmitCustomerOrderSchema
} from "./index.js";

describe("CreateQuoteSchema", () => {
  it("allows quotes at or below the hard cap", () => {
    const parsed = CreateQuoteSchema.safeParse({
      distanceMiles: 12,
      etaMinutes: 42,
      vehicleType: "BIKE",
      timeOfDay: "DINNER",
      demandFlag: false,
      weatherFlag: false
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects quotes above the hard cap", () => {
    const parsed = CreateQuoteSchema.safeParse({
      distanceMiles: 12.1,
      etaMinutes: 42,
      vehicleType: "BIKE",
      timeOfDay: "DINNER",
      demandFlag: false,
      weatherFlag: false
    });

    expect(parsed.success).toBe(false);
  });
});

describe("CreateJobRequestSchema", () => {
  it("requires single pickup and single drop coordinates", () => {
    const parsed = CreateJobRequestSchema.safeParse({
      consumerId: "d1ec1f2e-a2db-4f35-af56-ac5fec00945f",
      quoteId: "38db8fef-ef0b-45ff-a88c-c5c8f4ca4766",
      pickupAddress: "101 Main St",
      dropoffAddress: "202 Oak Ave",
      pickupCoordinates: { latitude: 51.5, longitude: -0.1 },
      dropoffCoordinates: { latitude: 51.51, longitude: -0.09 }
    });

    expect(parsed.success).toBe(true);
  });

  it("allows business-created jobs without an explicit consumer id", () => {
    const parsed = CreateJobRequestSchema.safeParse({
      orgId: "6e1f457f-383f-4458-99ca-e3429f2d4b4b",
      quoteId: "38db8fef-ef0b-45ff-a88c-c5c8f4ca4766",
      pickupAddress: "101 Main St",
      dropoffAddress: "202 Oak Ave",
      pickupCoordinates: { latitude: 51.5, longitude: -0.1 },
      dropoffCoordinates: { latitude: 51.51, longitude: -0.09 }
    });

    expect(parsed.success).toBe(true);
  });
});

describe("Business onboarding schemas", () => {
  it("parses business org creation payloads", () => {
    const parsed = CreateBusinessOrgSchema.safeParse({
      businessName: "ShipWright Retail Ops",
      contactName: "Busayo Adewale",
      email: "ops@example.com",
      phone: "+44 20 7946 0958",
      city: "London"
    });

    expect(parsed.success).toBe(true);
  });

  it("parses business context payloads", () => {
    const parsed = BusinessContextSchema.safeParse({
      userId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
      email: "ops@example.com",
      displayName: "Busayo Adewale",
      platformAdmin: true,
      onboarded: true,
      currentOrg: {
        id: "bd535fca-017a-465d-adc1-bc5a42e311bd",
        name: "ShipWright Retail Ops",
        contactName: "Busayo Adewale",
        contactEmail: "ops@example.com",
        contactPhone: "+44 20 7946 0958",
        city: "London",
        createdByUserId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
        createdAt: new Date().toISOString()
      },
      memberships: [
        {
          membership: {
            id: "bf835fca-017a-465d-adc1-bc5a42e311bd",
            orgId: "bd535fca-017a-465d-adc1-bc5a42e311bd",
            userId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
            role: "BUSINESS_OPERATOR",
            isActive: true,
            createdAt: new Date().toISOString()
          },
          org: {
            id: "bd535fca-017a-465d-adc1-bc5a42e311bd",
            name: "ShipWright Retail Ops",
            contactName: "Busayo Adewale",
            contactEmail: "ops@example.com",
            contactPhone: "+44 20 7946 0958",
            city: "London",
            createdByUserId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
            createdAt: new Date().toISOString()
          }
        }
      ]
    });

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.platformAdmin).toBe(true);
  });
});

describe("admin schemas", () => {
  it("defaults missing platform admin flag in business context payloads", () => {
    const parsed = BusinessContextSchema.parse({
      userId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
      email: "ops@example.com",
      displayName: "Busayo Adewale",
      onboarded: false,
      currentOrg: null,
      memberships: []
    });

    expect(parsed.platformAdmin).toBe(false);
  });

  it("parses admin overview payloads", () => {
    const parsed = AdminOverviewSchema.safeParse({
      interventionQueue: [
        {
          id: "job:1",
          category: "dispatch_failed",
          severity: "danger",
          title: "Dispatch failed",
          summary: "No driver accepted the job.",
          orgId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
          orgName: "Pilot Org",
          restaurantName: "Pilot Kitchen",
          entityType: "job",
          entityId: "bd535fca-017a-465d-adc1-bc5a42e311bd",
          jobId: "bd535fca-017a-465d-adc1-bc5a42e311bd",
          orderId: null,
          paymentId: null,
          createdAt: new Date().toISOString()
        }
      ],
      activeJobs: [],
      recentOrders: [],
      health: {
        liveness: { status: "ok", service: "api" },
        readiness: { status: "ok", service: "api", message: null },
        outboxBacklogCount: 0,
        outboxRetryingCount: 0,
        outboxFailedCount: 0,
        paymentCapturePendingCount: 0,
        notificationIssueCount: 0
      }
    });

    expect(parsed.success).toBe(true);
  });

  it("parses business and admin payment visibility payloads", () => {
    const businessItem = {
      id: "1cc3382c-f799-4856-b537-dbd61c851075",
      orderId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
      jobId: "bf835fca-017a-465d-adc1-bc5a42e311bd",
      restaurant: {
        id: "bd535fca-017a-465d-adc1-bc5a42e311bd",
        name: "Pilot Kitchen",
        slug: "pilot-kitchen"
      },
      customerName: "Ada Customer",
      orderStatus: "FULFILLED",
      jobStatus: "DELIVERED",
      paymentStatus: "CAPTURED",
      customerTotalCents: 4180,
      amountAuthorizedCents: 4180,
      amountCapturedCents: 4180,
      amountRefundedCents: 0,
      currency: "GBP",
      platformFeeCents: 700,
      payoutGrossCents: 3480,
      payoutStatus: "READY",
      payoutHoldReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    expect(BusinessPaymentListSchema.safeParse({ items: [businessItem] }).success).toBe(true);
    expect(
      AdminPaymentListSchema.safeParse({
        items: [
          {
            id: businessItem.id,
            orgId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
            orgName: "Pilot Org",
            restaurantId: businessItem.restaurant.id,
            restaurantName: businessItem.restaurant.name,
            restaurantSlug: businessItem.restaurant.slug,
            orderId: businessItem.orderId,
            jobId: businessItem.jobId,
            customerName: businessItem.customerName,
            orderStatus: businessItem.orderStatus,
            jobStatus: businessItem.jobStatus,
            paymentStatus: businessItem.paymentStatus,
            customerTotalCents: businessItem.customerTotalCents,
            amountAuthorizedCents: businessItem.amountAuthorizedCents,
            amountCapturedCents: businessItem.amountCapturedCents,
            amountRefundedCents: businessItem.amountRefundedCents,
            currency: businessItem.currency,
            platformFeeCents: businessItem.platformFeeCents,
            payoutGrossCents: businessItem.payoutGrossCents,
            payoutStatus: businessItem.payoutStatus,
            payoutHoldReason: businessItem.payoutHoldReason,
            createdAt: businessItem.createdAt,
            updatedAt: businessItem.updatedAt
          }
        ]
      }).success
    ).toBe(true);
  });

  it("parses deterministic daily briefing payloads", () => {
    const parsed = DailyBriefingSchema.safeParse({
      scope: "business",
      generatedAt: new Date().toISOString(),
      headline: "2 items need attention before service",
      summary: "Dispatch and payment signals need review before service expands.",
      attentionCount: 2,
      criticalItems: [
        {
          id: "dispatch_failed:job-1",
          category: "dispatch_failed",
          severity: "danger",
          title: "Dispatch failed",
          summary: "Pilot Kitchen order for Ada Customer has no accepted courier.",
          reason: "No eligible driver accepted the latest dispatch attempt.",
          entityType: "job",
          entityId: "bf835fca-017a-465d-adc1-bc5a42e311bd",
          orderId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
          jobId: "bf835fca-017a-465d-adc1-bc5a42e311bd",
          paymentId: "1cc3382c-f799-4856-b537-dbd61c851075",
          orgId: "bd535fca-017a-465d-adc1-bc5a42e311bd",
          orgName: "Pilot Org",
          restaurantName: "Pilot Kitchen",
          customerName: "Ada Customer",
          orderStatus: "PAYMENT_AUTHORIZED",
          jobStatus: "DISPATCH_FAILED",
          paymentStatus: "AUTHORIZED",
          detectedAt: new Date().toISOString(),
          ageMinutes: 18,
          href: "/app/jobs/bf835fca-017a-465d-adc1-bc5a42e311bd"
        }
      ],
      operatingState: {
        ordersToday: 5,
        activeJobs: 2,
        fulfilledOrders: 1,
        paymentRisks: 2,
        availableDrivers: null
      },
      recommendations: [
        {
          id: "rec:dispatch_failed:job-1",
          label: "Assign driver",
          summary: "Open the delivery job and retry or manually reassign the courier.",
          href: "/app/jobs/bf835fca-017a-465d-adc1-bc5a42e311bd",
          entityType: "job",
          entityId: "bf835fca-017a-465d-adc1-bc5a42e311bd",
          orderId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
          jobId: "bf835fca-017a-465d-adc1-bc5a42e311bd",
          paymentId: "1cc3382c-f799-4856-b537-dbd61c851075"
        }
      ],
      guidance: "This briefing is based on current ShipWright operational signals. Human approval is required for all recovery actions."
    });

    expect(parsed.success).toBe(true);
  });
});

describe("customer order schemas", () => {
  it("parses minimum public customer order submissions", () => {
    const parsed = SubmitCustomerOrderSchema.safeParse({
      customer: {
        name: "Ada Customer",
        email: "ada@example.com",
        phone: "07500000000"
      },
      delivery: {
        address: "10 Pilot Street, Stoke",
        notes: null
      },
      items: [
        {
          menuItemId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
          quantity: 2
        }
      ],
      paymentMethodId: "pm_test_123"
    });

    expect(parsed.success).toBe(true);
  });

  it("parses public customer order submission responses", () => {
    const parsed = SubmitCustomerOrderResponseSchema.safeParse({
      order: {
        id: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
        restaurantId: "bd535fca-017a-465d-adc1-bc5a42e311bd",
        jobId: "bf835fca-017a-465d-adc1-bc5a42e311bd",
        paymentId: "1cc3382c-f799-4856-b537-dbd61c851075",
        status: "PAYMENT_AUTHORIZED",
        customerName: "Ada Customer",
        customerEmail: "ada@example.com",
        customerPhone: "07500000000",
        deliveryAddress: "10 Pilot Street, Stoke",
        deliveryNotes: null,
        subtotalCents: 2598,
        deliveryFeeCents: 1582,
        totalCents: 4180,
        currency: "GBP",
        createdAt: new Date().toISOString(),
        items: [
          {
            id: "d1ec1f2e-a2db-4f35-af56-ac5fec00945f",
            menuItemId: "cc8f103a-05de-4043-9145-7d385e738c9e",
            name: "Chicken Wrap",
            quantity: 2,
            unitPriceCents: 1299,
            lineTotalCents: 2598,
            currency: "GBP"
          }
        ]
      },
      job: {
        id: "bf835fca-017a-465d-adc1-bc5a42e311bd",
        status: "REQUESTED",
        etaMinutes: 22,
        pickupAddress: "Pilot Kitchen pickup",
        dropoffAddress: "10 Pilot Street, Stoke"
      },
      payment: {
        id: "1cc3382c-f799-4856-b537-dbd61c851075",
        status: "AUTHORIZED",
        amountAuthorizedCents: 4180,
        amountCapturedCents: 0,
        totalCents: 4180,
        currency: "GBP",
        lastError: null
      }
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts fulfilled customer orders after delivery and capture", () => {
    expect(CustomerOrderStatusSchema.parse("FULFILLED")).toBe("FULFILLED");
  });
});

describe("JobStatusSchema", () => {
  it("includes the phase 2 progression statuses", () => {
    expect(JobStatusSchema.parse("EN_ROUTE_PICKUP")).toBe("EN_ROUTE_PICKUP");
    expect(JobStatusSchema.parse("PICKED_UP")).toBe("PICKED_UP");
    expect(JobStatusSchema.parse("EN_ROUTE_DROP")).toBe("EN_ROUTE_DROP");
    expect(JobStatusSchema.parse("DELIVERED")).toBe("DELIVERED");
    expect(JobStatusSchema.parse("DISPATCH_FAILED")).toBe("DISPATCH_FAILED");
  });
});

describe("read models", () => {
  it("parses business notification payloads", () => {
    const parsed = BusinessNotificationListSchema.safeParse({
      items: [
        {
          id: "job-event:12",
          type: "JOB_DISPATCH_FAILED",
          title: "Dispatch failed",
          message: "No eligible driver accepted this job.",
          severity: "danger",
          entityType: "job",
          entityId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
          createdAt: new Date().toISOString(),
          read: false
        }
      ]
    });

    expect(parsed.success).toBe(true);
  });

  it("parses notification read acknowledgements", () => {
    const parsed = BusinessNotificationReadSchema.safeParse({
      ok: true,
      notificationId: "job_event:12",
      readAt: new Date().toISOString()
    });

    expect(parsed.success).toBe(true);
  });

  it("parses notification read-all acknowledgements", () => {
    const parsed = BusinessNotificationReadAllSchema.safeParse({
      ok: true,
      readAt: new Date().toISOString(),
      updatedCount: 4
    });

    expect(parsed.success).toBe(true);
  });

  it("parses eligible driver payloads for manual assignment", () => {
    const parsed = EligibleDriverListSchema.safeParse({
      items: [
        {
          id: "bd535fca-017a-465d-adc1-bc5a42e311bd",
          displayName: "Alex Rider",
          vehicleType: "BIKE",
          availabilityStatus: "ONLINE",
          distanceMiles: 1.4,
          lastLocationAt: new Date().toISOString(),
          verificationStatus: "APPROVED",
          activeJobId: null,
          activeJobStatus: null,
          eligible: true,
          suitabilityFlags: ["READY"],
          suitabilityReason: "Online, approved, and ready for manual assignment."
        }
      ]
    });

    expect(parsed.success).toBe(true);
  });

  it("parses paginated job responses", () => {
    const parsed = PaginatedJobsSchema.safeParse({
      items: [],
      page: 1,
      limit: 20,
      hasMore: false
    });

    expect(parsed.success).toBe(true);
  });

  it("parses tracking payloads", () => {
    const parsed = JobTrackingSchema.safeParse({
      jobId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
      status: "ASSIGNED",
      attentionLevel: "NORMAL",
      attentionReason: null,
      pickup: {
        address: "101 Main St",
        coordinates: { latitude: 51.5, longitude: -0.1 }
      },
      dropoff: {
        address: "202 Oak Ave",
        coordinates: { latitude: 51.51, longitude: -0.09 }
      },
      etaMinutes: 20,
      premiumDistanceFlag: false,
      assignedDriver: {
        driverId: "bd535fca-017a-465d-adc1-bc5a42e311bd",
        userId: "1cc3382c-f799-4856-b537-dbd61c851075",
        displayName: "Driver One",
        latestLocation: null,
        lastLocationAt: null
      },
      timeline: [
        {
          id: 1,
          eventType: "JOB_ASSIGNED",
          actorId: "1cc3382c-f799-4856-b537-dbd61c851075",
          createdAt: new Date().toISOString(),
          payload: { offerId: "abc" }
        }
      ],
      dispatchAttempts: []
    });

    expect(parsed.success).toBe(true);
  });

  it("parses proof of delivery payloads", () => {
    const parsed = CreateProofOfDeliverySchema.safeParse({
      photoUrl: "https://example.com/pod.jpg",
      recipientName: "Alex",
      deliveryNote: "Left with front desk",
      coordinates: { latitude: 51.5, longitude: -0.1 },
      otpVerified: false
    });

    expect(parsed.success).toBe(true);
  });

  it("parses proof of delivery upload responses", () => {
    const parsed = ProofOfDeliveryUploadUrlResponseSchema.safeParse({
      jobId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
      storageBucket: "proof-of-delivery",
      storagePath: "jobs/2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b/pod.jpg",
      uploadMethod: "PUT",
      uploadUrl: "https://example.supabase.co/storage/v1/object/proof-of-delivery/jobs/pod.jpg",
      photoUrl: "https://example.supabase.co/storage/v1/object/public/proof-of-delivery/jobs/pod.jpg",
      expiresAt: new Date().toISOString()
    });

    expect(parsed.success).toBe(true);
  });

  it("parses cancel job payloads", () => {
    const parsed = CancelJobSchema.safeParse({
      reason: "Store closed early",
      settlementPolicyCode: "PENDING_PAYMENT_RULES",
      settlementNote: "No payment capture yet"
    });

    expect(parsed.success).toBe(true);
  });

  it("parses payment status values", () => {
    expect(PaymentStatusSchema.parse("AUTHORIZED")).toBe("AUTHORIZED");
    expect(PaymentStatusSchema.parse("CAPTURED")).toBe("CAPTURED");
  });

  it("parses job payment summaries", () => {
    const parsed = JobPaymentSummarySchema.safeParse({
      payment: {
        id: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
        jobId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
        provider: "stripe",
        providerPaymentIntentId: "pi_123",
        status: "AUTHORIZED",
        amountAuthorizedCents: 1600,
        amountCapturedCents: 0,
        amountRefundedCents: 0,
        currency: "gbp",
        customerTotalCents: 1600,
        platformFeeCents: 500,
        payoutGrossCents: 1100,
        settlementSnapshot: {},
        clientSecret: null,
        lastError: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      refunds: [],
      payoutLedger: null
    });

    expect(parsed.success).toBe(true);
  });
});
