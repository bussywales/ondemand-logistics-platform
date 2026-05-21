import { describe, expect, it } from "vitest";
import {
  AdminPaymentListSchema,
  AdminMenuHistorySchema,
  AdminOverviewSchema,
  BusinessPaymentListSchema,
  BusinessContextSchema,
  DailyBriefingSchema,
  EndOfDayReportSchema,
  OperationalIncidentSummarySchema,
  BusinessPilotStatusSchema,
  BusinessNotificationReadAllSchema,
  BusinessNotificationReadSchema,
  BusinessNotificationListSchema,
  CancelJobSchema,
  CreateBusinessOrgSchema,
  CreateFleetOrganisationSchema,
  CreateTeamInviteSchema,
  CreateJobRequestSchema,
  CreateProofOfDeliverySchema,
  CreateQuoteSchema,
  CreateSupportEscalationSchema,
  CreatePilotWorkspaceSchema,
  CustomerOrderStatusSchema,
  EligibleDriverListSchema,
  FleetDriverListSchema,
  FleetOrganisationListSchema,
  FleetReadinessSummarySchema,
  JobPaymentSummarySchema,
  JobTrackingSchema,
  JobStatusSchema,
  IdentityOrgMembersSchema,
  IdentityUserListSchema,
  MenuHistorySchema,
  PaginatedJobsSchema,
  PaymentStatusSchema,
  PilotReadinessCheckListSchema,
  PilotRehearsalSummarySchema,
  PilotWorkspaceListSchema,
  ProofOfDeliveryUploadUrlResponseSchema,
  ReleaseReadinessSummarySchema,
  SupportEscalationEventListSchema,
  SupportEscalationListSchema,
  SubmitCustomerOrderResponseSchema,
  SubmitCustomerOrderSchema,
  UpdateMembershipSchema,
  AddFleetDriverSchema,
  UpdateFleetDriverMembershipSchema,
  UpdateMenuCategorySchema,
  UpdateMenuItemSchema,
  UpdateSupportEscalationSchema,
  ValidationEvidenceRunListSchema
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

describe("Menu item schemas", () => {
  it("parses safe menu category display order updates", () => {
    expect(UpdateMenuCategorySchema.safeParse({ sortOrder: 2 }).success).toBe(true);
    expect(UpdateMenuCategorySchema.safeParse({ isActive: false }).success).toBe(true);
    expect(UpdateMenuCategorySchema.safeParse({}).success).toBe(false);
  });

  it("parses safe menu item price updates", () => {
    const parsed = UpdateMenuItemSchema.safeParse({
      name: "Chicken wrap",
      description: "Fresh and hot",
      priceCents: 1499,
      isActive: true
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid or empty menu item updates", () => {
    expect(UpdateMenuItemSchema.safeParse({ priceCents: 0 }).success).toBe(false);
    expect(UpdateMenuItemSchema.safeParse({}).success).toBe(false);
  });

  it("parses menu history audit events", () => {
    const parsed = MenuHistorySchema.safeParse({
      items: [
        {
          id: "123",
          eventType: "MENU_ITEM_PRICE_UPDATED",
          actorName: "Operator One",
          actorEmail: "operator@example.com",
          createdAt: new Date().toISOString(),
          summary: "Chicken wrap price changed from £12.99 to £14.99.",
          resourceType: "item",
          resourceName: "Chicken wrap",
          changedFields: ["priceCents"],
          rollbackReadiness: "ROLLBACK_PREPARED",
          rollbackReason: "This event has previous and new values for reversible menu fields. Rollback is not active yet.",
          reversibleFields: ["priceCents"],
          metadata: { previous: { priceCents: 1299 }, next: { priceCents: 1499 } }
        }
      ]
    });

    expect(parsed.success).toBe(true);
  });

  it("parses admin menu history audit events with organisation context", () => {
    const parsed = AdminMenuHistorySchema.safeParse({
      items: [
        {
          id: "123",
          orgId: "a56c6fc5-ec1f-4b1c-b4f5-8e79ddf9fb86",
          orgName: "Pilot Org",
          restaurantId: "5b31aa8f-34c3-4471-8cc5-822c40f4ed79",
          restaurantName: "Pilot Kitchen",
          eventType: "MENU_ITEM_VISIBILITY_UPDATED",
          actorName: null,
          actorEmail: "operator@example.com",
          createdAt: new Date().toISOString(),
          summary: "Chicken wrap visibility changed to Hidden.",
          resourceType: "item",
          resourceName: "Chicken wrap",
          changedFields: ["isActive"],
          rollbackReadiness: "ROLLBACK_PREPARED",
          rollbackReason: "This event has previous and new values for reversible menu fields. Rollback is not active yet.",
          reversibleFields: ["isActive"],
          metadata: { previous: { isActive: true }, next: { isActive: false } }
        }
      ]
    });

    expect(parsed.success).toBe(true);
  });
});

describe("fleet organisation schemas", () => {
  it("parses fleet organisations, drivers, and readiness summaries", () => {
    const fleetId = "33333333-3333-4333-8333-333333333333";
    const now = new Date().toISOString();

    expect(CreateFleetOrganisationSchema.safeParse({ name: "Northside Couriers", contactEmail: "fleet@example.com" }).success).toBe(true);
    expect(AddFleetDriverSchema.safeParse({ email: "driver@example.com", role: "DRIVER" }).success).toBe(true);
    expect(AddFleetDriverSchema.safeParse({ role: "DRIVER" }).success).toBe(false);
    expect(UpdateFleetDriverMembershipSchema.safeParse({ role: "DISPATCHER" }).success).toBe(true);
    expect(UpdateFleetDriverMembershipSchema.safeParse({}).success).toBe(false);

    const fleets = FleetOrganisationListSchema.parse({
      items: [
        {
          id: fleetId,
          name: "Northside Couriers",
          status: "ONBOARDING",
          contactName: null,
          contactEmail: "fleet@example.com",
          city: "London",
          memberCount: 2,
          activeDriverCount: 2,
          readyDriverCount: 1,
          needsReviewDriverCount: 1,
          notEligibleDriverCount: 0,
          activeJobCount: 0,
          createdAt: now,
          updatedAt: now
        }
      ]
    });

    const drivers = FleetDriverListSchema.parse({
      items: [
        {
          membershipId: "44444444-4444-4444-8444-444444444444",
          fleetOrgId: fleetId,
          fleetOrgName: "Northside Couriers",
          userId: "22222222-2222-4222-8222-222222222222",
          email: "driver@example.com",
          displayName: "Fleet Driver",
          fleetRole: "DRIVER",
          membershipActive: true,
          driverId: "55555555-5555-4555-8555-555555555555",
          availabilityStatus: "ONLINE",
          verificationStatus: "APPROVED",
          vehicleType: "BIKE",
          activeJobId: null,
          activeJobStatus: null,
          lastLocationAt: now,
          readinessStatus: "READY",
          recommendedNextAction: "Courier is ready after operator review.",
          createdAt: now,
          updatedAt: now
        }
      ]
    });

    const summary = FleetReadinessSummarySchema.parse({
      fleetOrgId: fleetId,
      fleetOrgName: "Northside Couriers",
      totalDrivers: 1,
      readyDrivers: 1,
      needsReviewDrivers: 0,
      notEligibleDrivers: 0,
      onlineDrivers: 1,
      activeJobs: 0,
      humanReviewNote: "Fleet readiness is visibility-only."
    });

    expect(fleets.items[0]?.readyDriverCount).toBe(1);
    expect(drivers.items[0]?.readinessStatus).toBe("READY");
    expect(summary.readyDrivers).toBe(1);
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
          href: "/app/jobs/bf835fca-017a-465d-adc1-bc5a42e311bd",
          incidentSummary: {
            incidentType: "DISPATCH_FAILED_UNRESOLVED",
            severity: "critical",
            jobId: "bf835fca-017a-465d-adc1-bc5a42e311bd",
            orderId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
            title: "Dispatch failed and remains unresolved",
            summary: "Pilot Kitchen order is still blocked 18 min after dispatch failed.",
            likelyCause: "No courier accepted or completed the latest dispatch path.",
            currentState: "The job is in DISPATCH_FAILED and no active courier movement is recorded.",
            elapsedMinutes: 18,
            evidence: {
              currentJobStatus: "DISPATCH_FAILED",
              currentOrderStatus: "PAYMENT_AUTHORIZED",
              currentPaymentStatus: "AUTHORIZED",
              assignedDriverName: null,
              lastTimelineEventType: "JOB_DISPATCH_FAILED",
              lastTimelineEventAt: new Date().toISOString(),
              dispatchAttemptsCount: 1
            },
            recommendedNextAction: "Open the job and review dispatch recovery guidance.",
            links: {
              jobHref: "/app/jobs/bf835fca-017a-465d-adc1-bc5a42e311bd",
              orderHref: "/app/orders/2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
              paymentsHref: "/app/payments"
            },
            communicationDrafts: {
              customerDraft: "We are reviewing a delay with your delivery.",
              restaurantDraft: "We are reviewing the delivery delay.",
              driverDraft: null
            }
          },
          recoverySuggestion: {
            jobId: "bf835fca-017a-465d-adc1-bc5a42e311bd",
            orderId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
            issueType: "DISPATCH_FAILED",
            recommendedAction: "RETRY_DISPATCH",
            explanation: "Retry dispatch first: no open driver offer is active.",
            evidence: {
              currentJobStatus: "DISPATCH_FAILED",
              paymentStatus: "AUTHORIZED",
              offerCount: 0,
              latestOfferStatus: null,
              eligibleDriverCount: 0,
              ageMinutes: 18
            },
            links: {
              jobHref: "/app/jobs/bf835fca-017a-465d-adc1-bc5a42e311bd",
              orderHref: "/app/orders/2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
              paymentsHref: null
            },
            advisory: "Human approval is required for all recovery actions."
          }
        }
      ],
      operatingState: {
        ordersToday: 5,
        activeJobs: 2,
        fulfilledOrders: 1,
        paymentRisks: 2,
        openSupportEscalations: 1,
        highCriticalSupportEscalations: 1,
        oldestOpenSupportEscalationAgeMinutes: 42,
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

  it("parses deterministic end-of-day reports", () => {
    const parsed = EndOfDayReportSchema.safeParse({
      scope: "business",
      date: "2026-05-03",
      generatedAt: new Date().toISOString(),
      headline: "12 orders completed, 2 items need follow-up",
      summary: "Dispatch, payment, and delayed-order signals are summarised for closeout review.",
      unresolvedCount: 2,
      operatingSummary: {
        ordersReceived: 12,
        fulfilledOrders: 10,
        activeOrUnresolvedOrders: 2,
        cancelledOrPaymentFailedOrders: 1,
        activeJobs: 1,
        deliveredJobs: 10,
        dispatchFailures: 1,
        staleOrDelayedJobs: 1
      },
      paymentsSummary: {
        authorized: 2,
        captured: 10,
        failed: 1,
        deliveredNotCaptured: 1,
        payoutReviewCount: 1
      },
      incidentsSummary: {
        dispatchFailed: 1,
        delayIncidents: 1,
        paymentRisks: 2,
        driverFollowUpIncidents: 1,
        openSupportEscalations: 1,
        highCriticalSupportEscalations: 1,
        supportClosedToday: 0,
    unresolvedRecommendations: 2
      },
      unresolvedActions: [
        {
          id: "action:dispatch:job-1",
          type: "RETRY_DISPATCH",
          severity: "danger",
          label: "Retry dispatch",
          summary: "A delivery remains unresolved after dispatch failed.",
          href: "/app/jobs/bf835fca-017a-465d-adc1-bc5a42e311bd",
          entityType: "job",
          entityId: "bf835fca-017a-465d-adc1-bc5a42e311bd",
          orderId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
          jobId: "bf835fca-017a-465d-adc1-bc5a42e311bd",
          paymentId: "1cc3382c-f799-4856-b537-dbd61c851075"
        }
      ],
      evidenceLinks: [
        {
          id: "evidence:order-1",
          label: "Order 2CB2F7E9",
          summary: "Payment authorised, dispatch unresolved.",
          href: "/app/orders/2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
          entityType: "order",
          entityId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
          orderId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
          jobId: "bf835fca-017a-465d-adc1-bc5a42e311bd",
          paymentId: "1cc3382c-f799-4856-b537-dbd61c851075"
        }
      ],
      guidance:
        "This report summarises operational signals. Operators remain responsible for recovery, refunds, cancellations, and customer communications."
    });

    expect(parsed.success).toBe(true);
  });

  it("parses pilot workspace and readiness payloads", () => {
    const workspace = {
      id: "4cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
      orgId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
      orgName: "Pilot Org",
      mode: "CONTROLLED_PILOT",
      status: "ACTIVE",
      readinessStage: "REHEARSAL_READY",
      pilotOwner: "Ops lead",
      supportOwner: "Support lead",
      courierOwner: "Courier lead",
      paymentOwner: "Finance lead",
      goLiveTargetDate: "2026-05-30",
      notes: "Controlled pilot rehearsal.",
      checklistTotal: 10,
      checklistPassed: 8,
      posture: {
        activeJobs: 2,
        unresolvedSupportEscalations: 1,
        paymentRisks: 1,
        readyCouriers: 3
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const check = {
      id: "5cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
      pilotWorkspaceId: workspace.id,
      key: "payment_flow_verified",
      label: "Payment flow verified",
      status: "PASSED",
      evidence: "Paid delivery proof current.",
      updatedBy: null,
      updatedAt: new Date().toISOString()
    };

    expect(CreatePilotWorkspaceSchema.safeParse({ orgId: workspace.orgId }).success).toBe(true);
    expect(PilotWorkspaceListSchema.safeParse({ items: [workspace] }).success).toBe(true);
    expect(PilotReadinessCheckListSchema.safeParse({ items: [check] }).success).toBe(true);
    expect(BusinessPilotStatusSchema.safeParse({
      workspace,
      checks: [check],
      guidance: "Pilot mode is informational in v1."
    }).success).toBe(true);
    expect(PilotRehearsalSummarySchema.safeParse({
      workspace,
      guardrailState: {
        level: "CAUTION",
        title: "Controlled pilot mode",
        message: "Human-reviewed readiness is required before rehearsal.",
        recommendedAction: "Review validation commands before the rehearsal.",
        badgeCopy: "Controlled pilot"
      },
      checks: [check],
      checklistSummary: {
        total: 10,
        passed: 8,
        blocked: 0,
        inProgress: 1,
        waived: 0,
        notStarted: 1
      },
      operationalPosture: {
        activeJobs: 2,
        unresolvedSupportEscalations: 1,
        highCriticalSupportEscalations: 0,
        openPaymentRisks: 1,
        readyCouriers: 3
      },
      validationPosture: {
        releaseVerification: {
          status: "UNKNOWN",
          label: "Release verification",
          summary: "Run pnpm release:verify-staging before rehearsal.",
          evidenceAt: null
        },
        paidDeliveryProof: {
          status: "UNKNOWN",
          label: "Paid delivery proof",
          summary: "Run pnpm proof:staging-paid-delivery before rehearsal.",
          evidenceAt: null
        },
        browserSmoke: {
          status: "UNKNOWN",
          label: "Browser smoke",
          summary: "Run pnpm --filter @shipwright/web test:smoke before rehearsal.",
          evidenceAt: null,
          freshness: "missing"
        },
        requiredAuthSmoke: {
          status: "UNKNOWN",
          label: "Required-auth browser smoke",
          summary: "Run SMOKE_REQUIRE_AUTH=true pnpm --filter @shipwright/web test:smoke before rehearsal.",
          evidenceAt: null,
          freshness: "missing"
        },
        freshnessWindowHours: 24,
        overallStatus: "UNKNOWN",
        recommendedAction: "Run validation commands before rehearsal."
      },
      recommendation: "NEEDS_REVIEW",
      recommendedNextActions: ["Run validation commands before rehearsal."],
      guidance: "Human review is required before any pilot rehearsal."
    }).success).toBe(true);
    expect(ValidationEvidenceRunListSchema.safeParse({
      items: [
        {
          id: "6cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
          evidenceType: "PAID_DELIVERY_PROOF",
          status: "PASSED",
          environment: "staging",
          source: "paid_delivery_proof_script",
          command: "pnpm proof:staging-paid-delivery",
          summary: { finalJobStatus: "DELIVERED" },
          artifactPath: "docs/proofs/paid-delivery.json",
          relatedOrderId: null,
          relatedJobId: null,
          relatedPaymentId: null,
          relatedPodId: null,
          createdBy: null,
          createdAt: new Date().toISOString()
        }
      ]
    }).success).toBe(true);
    expect(ReleaseReadinessSummarySchema.safeParse({
      verdict: "READY",
      title: "Release ready",
      summary: "Stored validation evidence is current.",
      environment: "staging",
      freshnessWindowHours: 24,
      checkedAt: new Date().toISOString(),
      requiredEvidence: [
        {
          evidenceType: "RELEASE_VERIFY",
          label: "Release verification",
          required: true,
          status: "PASSED",
          createdAt: new Date().toISOString(),
          ageMinutes: 10,
          isFresh: true,
          evidenceId: "6cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
          source: "release_verify_script",
          command: "pnpm release:verify-staging",
          artifactPath: "docs/proofs/release-verify.json",
          relatedOrderId: null,
          relatedJobId: null,
          relatedPaymentId: null,
          relatedPodId: null
        }
      ],
      optionalEvidence: [],
      recommendedActions: ["Proceed with controlled demo."],
      links: {
        validationEvidence: "/admin/validation-evidence",
        pilots: "/admin/pilots",
        command: "/admin/command"
      }
    }).success).toBe(true);
  });
});

describe("identity and access schemas", () => {
  const member = {
    id: "bf835fca-017a-465d-adc1-bc5a42e311bd",
    orgId: "bd535fca-017a-465d-adc1-bc5a42e311bd",
    orgName: "Pilot Org",
    orgType: "RESTAURANT",
    orgStatus: "ACTIVE",
    userId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
    email: "ops@example.com",
    displayName: "Busayo Adewale",
    role: "OPERATOR",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  it("parses identity user lists with memberships", () => {
    const parsed = IdentityUserListSchema.safeParse({
      items: [
        {
          id: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
          email: "ops@example.com",
          displayName: "Busayo Adewale",
          status: "ACTIVE",
          platformAdmin: true,
          lastSignInAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          memberships: [member]
        }
      ]
    });

    expect(parsed.success).toBe(true);
  });

  it("parses organisation members, invitations, and membership updates", () => {
    const org = {
      id: "bd535fca-017a-465d-adc1-bc5a42e311bd",
      name: "Pilot Org",
      type: "RESTAURANT",
      status: "ACTIVE",
      contactName: null,
      contactEmail: "ops@example.com",
      city: "London",
      memberCount: 1,
      activeMemberCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    expect(
      IdentityOrgMembersSchema.safeParse({
        org,
        members: [member],
        invitations: [
          {
            id: "cf835fca-017a-465d-adc1-bc5a42e311bd",
            orgId: org.id,
            email: "new@example.com",
            role: "OPERATOR",
            status: "PENDING",
            invitedBy: member.userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      }).success
    ).toBe(true);
    expect(CreateTeamInviteSchema.safeParse({ email: "new@example.com", role: "OPERATOR" }).success).toBe(true);
    expect(UpdateMembershipSchema.safeParse({ role: "MANAGER", isActive: false }).success).toBe(true);
    expect(UpdateMembershipSchema.safeParse({}).success).toBe(false);
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
      dispatchAttempts: [],
      incidentSummary: {
        incidentType: "ASSIGNED_STALE",
        severity: "warning",
        jobId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
        orderId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
        title: "Assigned courier has not moved to pickup",
        summary: "The assigned courier has not progressed to pickup after 25 min.",
        likelyCause: "The courier may be delayed or unavailable.",
        currentState: "The job is ASSIGNED but pickup travel has not been confirmed.",
        elapsedMinutes: 25,
        evidence: {
          currentJobStatus: "ASSIGNED",
          currentOrderStatus: "PAYMENT_AUTHORIZED",
          currentPaymentStatus: "AUTHORIZED",
          assignedDriverName: "Driver One",
          lastTimelineEventType: "JOB_ASSIGNED",
          lastTimelineEventAt: new Date().toISOString(),
          dispatchAttemptsCount: 1
        },
        recommendedNextAction: "Open the job and confirm courier status.",
        links: {
          jobHref: "/app/jobs/2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
          orderHref: "/app/orders/2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
          paymentsHref: null
        },
        communicationDrafts: {
          customerDraft: "We are reviewing a delivery delay.",
          restaurantDraft: "We are reviewing the delivery delay.",
          driverDraft: "We are reviewing the current delivery state."
        }
      }
    });

    expect(parsed.success).toBe(true);
  });

  it("parses operational incident summaries directly", () => {
    const parsed = OperationalIncidentSummarySchema.safeParse({
      incidentType: "EN_ROUTE_DROP_STALE",
      severity: "warning",
      jobId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
      orderId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
      title: "Drop-off travel looks delayed",
      summary: "The courier has been en route to drop-off for 34 min without completion.",
      likelyCause: "Traffic or courier progress may need review.",
      currentState: "The job is EN_ROUTE_DROP and delivery completion is late.",
      elapsedMinutes: 34,
      evidence: {
        currentJobStatus: "EN_ROUTE_DROP",
        currentOrderStatus: "PAYMENT_AUTHORIZED",
        currentPaymentStatus: "AUTHORIZED",
        assignedDriverName: "Driver One",
        lastTimelineEventType: "JOB_EN_ROUTE_DROP",
        lastTimelineEventAt: new Date().toISOString(),
        dispatchAttemptsCount: 1
      },
      recommendedNextAction: "Review the job timeline and confirm courier progress.",
      links: {
        jobHref: "/app/jobs/2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
        orderHref: "/app/orders/2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
        paymentsHref: null
      },
      communicationDrafts: {
        customerDraft: "We are reviewing a delay with your delivery.",
        restaurantDraft: "We are reviewing the delivery delay.",
        driverDraft: "We are reviewing the current delivery state."
      }
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

  it("parses support escalation list payloads", () => {
    const parsed = SupportEscalationListSchema.safeParse({
      items: [
        {
          id: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
          orgId: "07ce83ef-3d05-4f78-9f5f-a21191f2d07e",
          orgName: "Pilot Org",
          orderId: "11111111-1111-4111-8111-111111111111",
          jobId: "33333333-3333-4333-8333-333333333333",
          category: "DELIVERY_DELAY",
          status: "OPEN",
          severity: "HIGH",
          title: "Customer delay follow-up",
          note: "Customer called after the job stopped progressing.",
          followUpOwner: "Ops lead",
          customerContactRequired: true,
          merchantContactRequired: false,
          courierContactRequired: true,
          resolutionNote: null,
          resolutionAction: null,
          resolutionReason: null,
          resolvedBy: null,
          resolvedAt: null,
          createdBy: "9d90d9cb-aaed-494e-aebf-d0f02b9618fe",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          restaurantName: "Pilot Kitchen",
          customerName: "Ada Customer"
        }
      ]
    });

    expect(parsed.success).toBe(true);
  });

  it("requires a resolution note when support escalations are closed", () => {
    const parsed = UpdateSupportEscalationSchema.safeParse({
      status: "RESOLVED",
      resolutionAction: "CUSTOMER_UPDATED",
      resolutionReason: "CUSTOMER_CONFIRMED"
    });

    expect(parsed.success).toBe(false);
  });

  it("parses support escalation closeout updates", () => {
    const parsed = UpdateSupportEscalationSchema.safeParse({
      status: "RESOLVED",
      resolutionNote: "Customer confirmed the delivery issue is resolved.",
      resolutionAction: "CUSTOMER_UPDATED",
      resolutionReason: "CUSTOMER_CONFIRMED"
    });

    expect(parsed.success).toBe(true);
  });

  it("parses support escalation event history payloads", () => {
    const parsed = SupportEscalationEventListSchema.safeParse({
      items: [
        {
          id: "44444444-4444-4444-8444-444444444444",
          supportEscalationId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
          orgId: "07ce83ef-3d05-4f78-9f5f-a21191f2d07e",
          eventType: "STATUS_CHANGED",
          actorId: "9d90d9cb-aaed-494e-aebf-d0f02b9618fe",
          actorLabel: null,
          previousStatus: "OPEN",
          newStatus: "IN_REVIEW",
          note: "Status changed to in review.",
          metadata: { previousStatus: "OPEN", newStatus: "IN_REVIEW" },
          createdAt: new Date().toISOString()
        }
      ]
    });

    expect(parsed.success).toBe(true);
  });

  it("requires support escalations to reference an order or job", () => {
    const parsed = CreateSupportEscalationSchema.safeParse({
      category: "CUSTOMER_SUPPORT",
      severity: "MEDIUM",
      title: "Customer support note",
      note: "Customer asked for a delivery status update."
    });

    expect(parsed.success).toBe(false);
  });
});
