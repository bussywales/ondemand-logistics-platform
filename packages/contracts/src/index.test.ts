import { describe, expect, it } from "vitest";
import {
  BusinessContextSchema,
  CancelJobSchema,
  CreateBusinessOrgSchema,
  CreateJobRequestSchema,
  CreateProofOfDeliverySchema,
  CreateQuoteSchema,
  JobPaymentSummarySchema,
  JobTrackingSchema,
  JobStatusSchema,
  PaginatedJobsSchema,
  PaymentStatusSchema,
  ProofOfDeliveryUploadUrlResponseSchema
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
