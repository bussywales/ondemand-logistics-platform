import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiRequestError,
  acceptDriverOffer,
  authorizePayment,
  createProofOfDelivery,
  addAdminFleetDriver,
  createAdminFleet,
  createBusinessTeamInvite,
  createBusinessSupportEscalation,
  createRestaurant,
  getAdminDailyBriefing,
  getAdminEndOfDayReport,
  getAdminPilotRehearsal,
  getAdminOrgMembers,
  getFleetReadiness,
  getBusinessTeam,
  getBusinessDailyBriefing,
  getBusinessEndOfDayReport,
  getDriverAssignmentIneligibility,
  getBusinessOrder,
  getCurrentDriverJob,
  getDriverState,
  getUserFacingApiError,
  getPublicRestaurantMenu,
  getRestaurantMenu,
  isUnauthorizedApiError,
  listAdminDriverReadiness,
  listAdminFleetDrivers,
  listAdminFleets,
  listAdminOrgs,
  listAdminUsers,
  listAdminPayments,
  listEligibleDrivers,
  listBusinessNotifications,
  listBusinessOrders,
  listBusinessPayments,
  listBusinessSupportEscalations,
  listBusinessSupportEscalationEvents,
  listAdminSupportEscalations,
  listAdminSupportEscalationEvents,
  listDriverOffers,
  listFleetDrivers,
  markAllBusinessNotificationsRead,
  markBusinessNotificationRead,
  rejectDriverOffer,
  transitionDriverJob,
  updateAdminOrgMembership,
  updateAdminFleetDriver,
  updateMenuItem,
  updateBusinessTeamMembership,
  updateBusinessSupportEscalation,
  updateDriverAvailability
} from './api';
import type { BusinessSession } from './product-state';

const session: BusinessSession = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresAt: 123,
  userId: 'user-1',
  email: 'ops@example.com',
  context: {
    userId: 'user-1',
    email: 'ops@example.com',
    displayName: 'Ops',
    onboarded: true,
    currentOrg: {
      id: 'org-1',
      name: 'Org',
      contactName: null,
      contactEmail: null,
      contactPhone: null,
      city: null,
      createdByUserId: 'user-1',
      createdAt: new Date().toISOString()
    },
    memberships: []
  }
};

describe('authorizePayment', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps internal server errors to a user-facing fallback message', () => {
    const message = getUserFacingApiError(
      new ApiRequestError('internal_server_error', 500, { error: { message: 'internal_server_error' } }),
      'Report data unavailable. Refresh or contact support.'
    );

    expect(message).toBe('Report data unavailable. Refresh or contact support.');
  });

  it('preserves specific non-server API error messages', () => {
    const message = getUserFacingApiError(
      new ApiRequestError('invalid_report_date', 422, { error: { message: 'invalid_report_date' } }),
      'fallback'
    );

    expect(message).toBe('invalid_report_date');
  });

  it('posts the Stripe payment method id to the authorization endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        payment: {
          id: 'payment-1',
          status: 'AUTHORIZED',
          amountAuthorizedCents: 2400,
          amountCapturedCents: 0,
          amountRefundedCents: 0,
          customerTotalCents: 2400,
          platformFeeCents: 400,
          payoutGrossCents: 1600,
          currency: 'gbp',
          clientSecret: null,
          lastError: null
        }
      })
    });
    vi.stubGlobal('fetch', fetchMock);

    await authorizePayment(session, 'job-1', 'pm_test_123');

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/v1/jobs/job-1/payment/authorize');
    expect(init.method).toBe('POST');
    expect(String(init.headers && (init.headers as Record<string, string>)['Idempotency-Key'])).toContain('idem-');
    expect(init.body).toBe(JSON.stringify({ paymentMethodId: 'pm_test_123' }));
  });

  it('posts the pilot restaurant payload to the restaurant endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          id: 'restaurant-1',
          orgId: 'org-1',
          name: 'Pilot Kitchen',
          slug: 'pilot-kitchen',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
    });
    vi.stubGlobal('fetch', fetchMock);

    await createRestaurant(session, {
      orgId: 'org-1',
      name: 'Pilot Kitchen',
      slug: 'pilot-kitchen'
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/v1/business/restaurants');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(
      JSON.stringify({
        orgId: 'org-1',
        name: 'Pilot Kitchen',
        slug: 'pilot-kitchen'
      })
    );
  });

  it('reads back a structured restaurant menu', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          restaurant: {
            id: 'restaurant-1',
            orgId: 'org-1',
            name: 'Pilot Kitchen',
            slug: 'pilot-kitchen',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          categories: []
        })
    });
    vi.stubGlobal('fetch', fetchMock);

    const menu = await getRestaurantMenu(session, 'restaurant-1');

    expect(menu.restaurant.slug).toBe('pilot-kitchen');
    expect(menu.categories).toEqual([]);
  });

  it('patches menu item details through the business restaurant endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          id: 'item-1',
          restaurantId: 'restaurant-1',
          categoryId: 'category-1',
          name: 'Chicken Wrap Meal',
          description: 'Fresh and hot',
          priceCents: 1499,
          currency: 'GBP',
          isActive: true,
          sortOrder: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
    });
    vi.stubGlobal('fetch', fetchMock);

    const item = await updateMenuItem(session, 'restaurant-1', 'item-1', {
      name: 'Chicken Wrap Meal',
      priceCents: 1499
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/v1/business/restaurants/restaurant-1/menu-items/item-1');
    expect(init.method).toBe('PATCH');
    expect(init.headers).toEqual(expect.objectContaining({ "Idempotency-Key": expect.stringContaining("menu-item-update") }));
    expect(init.body).toBe(JSON.stringify({ name: 'Chicken Wrap Meal', priceCents: 1499 }));
    expect(item.priceCents).toBe(1499);
  });

  it('reads a public restaurant menu by slug without bearer auth', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          restaurant: {
            id: 'restaurant-1',
            name: 'Pilot Kitchen',
            slug: 'pilot-kitchen',
            status: 'ACTIVE'
          },
          categories: []
        })
    });
    vi.stubGlobal('fetch', fetchMock);

    const menu = await getPublicRestaurantMenu('pilot-kitchen');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/v1/restaurants/pilot-kitchen/menu');
    expect(init.headers).not.toHaveProperty('authorization');
    expect(menu.restaurant.name).toBe('Pilot Kitchen');
  });

  it('reads business customer orders with bearer auth', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          items: [
            {
              id: 'order-1',
              status: 'PAYMENT_AUTHORIZED',
              restaurant: { id: 'restaurant-1', name: 'Pilot Kitchen', slug: 'pilot-kitchen' },
              customer: { name: 'Ada', email: 'ada@example.com', phone: '07500000000' },
              delivery: { address: '10 Pilot Street', addressSummary: '10 Pilot Street', notes: null },
              items: [],
              subtotalCents: 1200,
              deliveryFeeCents: 400,
              totalCents: 1600,
              currency: 'GBP',
              payment: {
                id: 'payment-1',
                status: 'AUTHORIZED',
                amountAuthorizedCents: 1600,
                amountCapturedCents: 0,
                totalCents: 1600,
                currency: 'GBP',
                lastError: null
              },
              job: {
                id: 'job-1',
                status: 'REQUESTED',
                etaMinutes: 22,
                pickupAddress: 'Pilot Kitchen pickup',
                dropoffAddress: '10 Pilot Street'
              },
              timeline: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ]
        })
    });
    vi.stubGlobal('fetch', fetchMock);

    const orders = await listBusinessOrders(session);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/v1/business/orders');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer access-token');
    expect(orders[0]?.payment.status).toBe('AUTHORIZED');
  });

  it('reads business payment visibility rows with bearer auth', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          items: [
            {
              id: 'payment-1',
              orderId: 'order-1',
              jobId: 'job-1',
              restaurant: { id: 'restaurant-1', name: 'Pilot Kitchen', slug: 'pilot-kitchen' },
              customerName: 'Ada',
              orderStatus: 'PAYMENT_AUTHORIZED',
              jobStatus: 'REQUESTED',
              paymentStatus: 'AUTHORIZED',
              customerTotalCents: 1600,
              amountAuthorizedCents: 1600,
              amountCapturedCents: 0,
              amountRefundedCents: 0,
              currency: 'GBP',
              platformFeeCents: 400,
              payoutGrossCents: 1200,
              payoutStatus: null,
              payoutHoldReason: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ]
        })
    });
    vi.stubGlobal('fetch', fetchMock);

    const payments = await listBusinessPayments(session);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/v1/business/payments');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer access-token');
    expect(payments[0]?.paymentStatus).toBe('AUTHORIZED');
  });

  it('reads the daily briefing with bearer auth', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          scope: 'business',
          generatedAt: new Date().toISOString(),
          headline: '1 item needs attention before service',
          summary: 'Dispatch and payment signals need review before service expands.',
          attentionCount: 1,
          criticalItems: [
            {
              id: 'dispatch_failed:order-1',
              category: 'dispatch_failed',
              severity: 'danger',
              title: 'Dispatch failed',
              summary: 'Pilot Kitchen order for Ada Customer is still waiting for a courier.',
              reason: 'No eligible driver accepted the latest dispatch attempt.',
              entityType: 'job',
              entityId: 'job-1',
              orderId: 'order-1',
              jobId: 'job-1',
              paymentId: 'payment-1',
              orgId: 'org-1',
              orgName: 'Pilot Org',
              restaurantName: 'Pilot Kitchen',
              customerName: 'Ada Customer',
              orderStatus: 'PAYMENT_AUTHORIZED',
              jobStatus: 'DISPATCH_FAILED',
              paymentStatus: 'AUTHORIZED',
              detectedAt: new Date().toISOString(),
              ageMinutes: 18,
              href: '/app/jobs/job-1'
            }
          ],
          operatingState: {
            ordersToday: 4,
            activeJobs: 2,
            fulfilledOrders: 1,
            paymentRisks: 1,
            openSupportEscalations: 0,
            highCriticalSupportEscalations: 0,
            oldestOpenSupportEscalationAgeMinutes: null,
            availableDrivers: null
          },
          recommendations: [
            {
              id: 'rec:dispatch_failed:order-1',
              label: 'Retry or reassign dispatch',
              summary: 'Open the job and retry dispatch after checking courier eligibility.',
              href: '/app/jobs/job-1',
              entityType: 'job',
              entityId: 'job-1',
              orderId: 'order-1',
              jobId: 'job-1',
              paymentId: 'payment-1'
            }
          ],
          guidance:
            'This briefing is based on current ShipWright operational signals. Human approval is required for all recovery actions.'
        })
    });
    vi.stubGlobal('fetch', fetchMock);

    const briefing = await getBusinessDailyBriefing(session);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/v1/business/briefing/daily');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer access-token');
    expect(briefing.criticalItems[0]?.category).toBe('dispatch_failed');
  });

  it("reads the end-of-day report with bearer auth", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
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
            openSupportEscalations: 0,
            highCriticalSupportEscalations: 0,
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
              href: "/app/jobs/job-1",
              entityType: "job",
              entityId: "job-1",
              orderId: "order-1",
              jobId: "job-1",
              paymentId: "payment-1"
            }
          ],
          evidenceLinks: [
            {
              id: "evidence:order-1",
              label: "Order ORDER-1",
              summary: "Payment authorised, dispatch unresolved.",
              href: "/app/orders/order-1",
              entityType: "order",
              entityId: "order-1",
              orderId: "order-1",
              jobId: "job-1",
              paymentId: "payment-1"
            }
          ],
          guidance:
            "This report summarises operational signals. Operators remain responsible for recovery, refunds, cancellations, and customer communications."
        })
    });
    vi.stubGlobal("fetch", fetchMock);

    const report = await getBusinessEndOfDayReport(session, "2026-05-03");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/business/reports/end-of-day?date=2026-05-03");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer access-token");
    expect(report.unresolvedActions[0]?.type).toBe("RETRY_DISPATCH");
  });

  it('parses structured driver assignment ineligibility errors', () => {
    const error = new ApiRequestError('driver_not_eligible_for_reassign', 422, {
      message: 'driver_not_eligible_for_reassign',
      reason: 'OFFLINE',
      suitabilityFlags: ['OFFLINE', 'NO_LIVE_LOCATION'],
      suitabilityReason: 'Driver is offline and will not receive manual assignment.'
    });

    expect(getDriverAssignmentIneligibility(error)).toEqual({
      message: 'driver_not_eligible_for_reassign',
      reason: 'OFFLINE',
      suitabilityFlags: ['OFFLINE', 'NO_LIVE_LOCATION'],
      suitabilityReason: 'Driver is offline and will not receive manual assignment.'
    });
  });

  it('returns null for non-driver-assignment errors', () => {
    expect(
      getDriverAssignmentIneligibility(
        new ApiRequestError('job_not_retryable', 409, { message: 'job_not_retryable' })
      )
    ).toBeNull();
  });

  it('reads a business customer order detail', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          id: 'order-1',
          status: 'PAYMENT_AUTHORIZED',
          restaurant: { id: 'restaurant-1', name: 'Pilot Kitchen', slug: 'pilot-kitchen' },
          customer: { name: 'Ada', email: 'ada@example.com', phone: '07500000000' },
          delivery: { address: '10 Pilot Street', addressSummary: '10 Pilot Street', notes: null },
          items: [],
          subtotalCents: 1200,
          deliveryFeeCents: 400,
          totalCents: 1600,
          currency: 'GBP',
          payment: {
            id: 'payment-1',
            status: 'AUTHORIZED',
            amountAuthorizedCents: 1600,
            amountCapturedCents: 0,
            totalCents: 1600,
            currency: 'GBP',
            lastError: null
          },
          job: {
            id: 'job-1',
            status: 'REQUESTED',
            etaMinutes: 22,
            pickupAddress: 'Pilot Kitchen pickup',
            dropoffAddress: '10 Pilot Street'
          },
          timeline: [{ id: '1', eventType: 'CUSTOMER_ORDER_SUBMITTED', createdAt: new Date().toISOString(), summary: 'customer order submitted' }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
    });
    vi.stubGlobal('fetch', fetchMock);

    const order = await getBusinessOrder(session, 'order-1');

    expect(order.id).toBe('order-1');
    expect(order.timeline[0]?.eventType).toBe('CUSTOMER_ORDER_SUBMITTED');
  });

  it('reads admin payment visibility rows with bearer auth', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          items: [
            {
              id: 'payment-1',
              orgId: 'org-1',
              orgName: 'Pilot Org',
              orderId: 'order-1',
              jobId: 'job-1',
              restaurant: { id: 'restaurant-1', name: 'Pilot Kitchen', slug: 'pilot-kitchen' },
              customerName: 'Ada',
              orderStatus: 'FULFILLED',
              jobStatus: 'DELIVERED',
              paymentStatus: 'CAPTURED',
              customerTotalCents: 1600,
              amountAuthorizedCents: 1600,
              amountCapturedCents: 1600,
              amountRefundedCents: 0,
              currency: 'GBP',
              platformFeeCents: 400,
              payoutGrossCents: 1200,
              payoutStatus: 'READY',
              payoutHoldReason: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ]
        })
    });
    vi.stubGlobal('fetch', fetchMock);

    const payments = await listAdminPayments(session);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/v1/admin/payments');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer access-token');
    expect(payments[0]?.orgName).toBe('Pilot Org');
  });

  it('reads admin driver readiness with bearer auth', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          items: [
            {
              driverId: '11111111-1111-4111-8111-111111111111',
              driverName: 'Ready Courier',
              availabilityStatus: 'ONLINE',
              verificationStatus: 'APPROVED',
              vehicleType: 'BIKE',
              activeJobId: null,
              activeJobStatus: null,
              orgId: '2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b',
              orgName: 'Pilot Org',
              restaurantName: null,
              restaurantSlug: null,
              lastLocationAt: new Date().toISOString(),
              locationRecentlySeen: true,
              readinessStatus: 'READY',
              checklist: [
                {
                  key: 'verification_approved',
                  label: 'Verification approved',
                  result: 'pass',
                  reason: 'Verification is approved for pilot operations.'
                }
              ],
              recommendedNextAction: 'Courier is ready for pilot assignment after operator review.',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ]
        })
    });
    vi.stubGlobal('fetch', fetchMock);

    const readiness = await listAdminDriverReadiness(session);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/v1/admin/drivers/readiness');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer access-token');
    expect(readiness[0]?.readinessStatus).toBe('READY');
  });

  it('reads an admin pilot rehearsal cockpit summary', async () => {
    const pilotId = '4cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          workspace: {
            id: pilotId,
            orgId: '2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b',
            orgName: 'Pilot Org',
            mode: 'CONTROLLED_PILOT',
            status: 'ACTIVE',
            readinessStage: 'REHEARSAL_READY',
            pilotOwner: 'Ops lead',
            supportOwner: 'Support lead',
            courierOwner: 'Courier lead',
            paymentOwner: 'Finance lead',
            goLiveTargetDate: '2026-05-30',
            notes: 'Controlled rehearsal.',
            checklistTotal: 10,
            checklistPassed: 8,
            posture: { activeJobs: 1, unresolvedSupportEscalations: 0, paymentRisks: 0, readyCouriers: 2 },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          guardrailState: {
            level: 'CAUTION',
            title: 'Controlled pilot mode',
            message: 'Human-reviewed readiness is required before rehearsal.',
            recommendedAction: 'Confirm validation gates before rehearsal.',
            badgeCopy: 'Controlled pilot'
          },
          checks: [],
          checklistSummary: { total: 10, passed: 8, blocked: 0, inProgress: 1, waived: 0, notStarted: 1 },
          operationalPosture: {
            activeJobs: 1,
            unresolvedSupportEscalations: 0,
            highCriticalSupportEscalations: 0,
            openPaymentRisks: 0,
            readyCouriers: 2
          },
          validationPosture: {
            releaseVerification: { status: 'UNKNOWN', label: 'Release verification', summary: 'Run release verification.', evidenceAt: null },
            paidDeliveryProof: { status: 'UNKNOWN', label: 'Paid delivery proof', summary: 'Run paid-delivery proof.', evidenceAt: null },
            browserSmoke: { status: 'UNKNOWN', label: 'Browser smoke', summary: 'Run browser smoke.', evidenceAt: null }
          },
          recommendation: 'NEEDS_REVIEW',
          recommendedNextActions: ['Run validation commands before rehearsal.'],
          guidance: 'Human review is required before rehearsal.'
        })
    });
    vi.stubGlobal('fetch', fetchMock);

    const rehearsal = await getAdminPilotRehearsal(session, pilotId);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(`/v1/admin/pilots/${pilotId}/rehearsal`);
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer access-token');
    expect(rehearsal.recommendation).toBe('NEEDS_REVIEW');
  });

  it('reads business notifications with bearer auth', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          items: [
            {
              id: 'job_event:12',
              type: 'JOB_DISPATCH_FAILED',
              title: 'Dispatch failed',
              message: 'No eligible driver accepted this job. Review and retry dispatch.',
              severity: 'danger',
              entityType: 'job',
              entityId: 'job-1',
              createdAt: new Date().toISOString(),
              read: false
            }
          ]
        })
    });
    vi.stubGlobal('fetch', fetchMock);

    const notifications = await listBusinessNotifications(session);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/v1/business/notifications');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer access-token');
    expect(notifications[0]?.type).toBe('JOB_DISPATCH_FAILED');
  });

  it("reads the admin daily briefing with bearer auth", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          scope: "admin",
          generatedAt: new Date().toISOString(),
          headline: "2 items need attention before service",
          summary: "Review dispatch, payment, and delivery exceptions before expanding service volume.",
          attentionCount: 1,
          criticalItems: [
            {
              id: "dispatch_failed:order-1",
              category: "dispatch_failed",
              severity: "danger",
              title: "Dispatch failed",
              summary: "Pilot Kitchen order for Ada Customer is still waiting for a courier.",
              reason: "No eligible driver accepted the latest dispatch attempt.",
              entityType: "job",
              entityId: "job-1",
              orderId: "order-1",
              jobId: "job-1",
              paymentId: "payment-1",
              orgId: "org-1",
              orgName: "Pilot Org",
              restaurantName: "Pilot Kitchen",
              customerName: "Ada Customer",
              orderStatus: "PAYMENT_AUTHORIZED",
              jobStatus: "DISPATCH_FAILED",
              paymentStatus: "AUTHORIZED",
              detectedAt: new Date().toISOString(),
              ageMinutes: 18,
              href: "/app/jobs/job-1"
            }
          ],
          operatingState: {
            ordersToday: 4,
            activeJobs: 2,
            fulfilledOrders: 1,
            paymentRisks: 1,
            openSupportEscalations: 0,
            highCriticalSupportEscalations: 0,
            oldestOpenSupportEscalationAgeMinutes: null,
            availableDrivers: null
          },
          recommendations: [],
          guidance:
            "This briefing is based on current ShipWright operational signals. Human approval is required for all recovery actions."
        })
    });
    vi.stubGlobal("fetch", fetchMock);

    const briefing = await getAdminDailyBriefing(session);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/admin/briefing/daily");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer access-token");
    expect(briefing.scope).toBe("admin");
    expect(briefing.criticalItems[0]?.orgName).toBe("Pilot Org");
  });

  it("reads the admin end-of-day report with bearer auth", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          scope: "admin",
          date: "2026-05-04",
          generatedAt: new Date().toISOString(),
          headline: "No unresolved items today",
          summary: "The day closed without unresolved dispatch, payment, or delay follow-up items.",
          unresolvedCount: 0,
          operatingSummary: {
            ordersReceived: 12,
            fulfilledOrders: 12,
            activeOrUnresolvedOrders: 0,
            cancelledOrPaymentFailedOrders: 0,
            activeJobs: 0,
            deliveredJobs: 12,
            dispatchFailures: 0,
            staleOrDelayedJobs: 0
          },
          paymentsSummary: {
            authorized: 0,
            captured: 12,
            failed: 0,
            deliveredNotCaptured: 0,
            payoutReviewCount: 0
          },
          incidentsSummary: {
            dispatchFailed: 0,
            delayIncidents: 0,
            paymentRisks: 0,
            driverFollowUpIncidents: 0,
            openSupportEscalations: 0,
            highCriticalSupportEscalations: 0,
            supportClosedToday: 0,
    unresolvedRecommendations: 0
          },
          unresolvedActions: [],
          evidenceLinks: [],
          guidance:
            "This report summarises operational signals. Operators remain responsible for recovery, refunds, cancellations, and customer communications."
        })
    });
    vi.stubGlobal("fetch", fetchMock);

    const report = await getAdminEndOfDayReport(session, "2026-05-04");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/admin/reports/end-of-day?date=2026-05-04");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer access-token");
    expect(report.scope).toBe("admin");
  });

  it('marks a business notification as read with bearer auth', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          ok: true,
          notificationId: 'job_event:12',
          readAt: new Date().toISOString()
        })
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await markBusinessNotificationRead(session, 'job_event:12');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/v1/business/notifications/job_event%3A12/read');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer access-token');
    expect(init.method).toBe('POST');
    expect(result.ok).toBe(true);
  });

  it('marks all business notifications as read with bearer auth', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          ok: true,
          readAt: new Date().toISOString(),
          updatedCount: 3
        })
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await markAllBusinessNotificationsRead(session);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/v1/business/notifications/read-all');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer access-token');
    expect(init.method).toBe('POST');
    expect(result.updatedCount).toBe(3);
  });

  it('detects unauthorized API errors cleanly', () => {
    expect(isUnauthorizedApiError(new ApiRequestError('unauthorized', 401, { message: 'unauthorized' }))).toBe(true);
    expect(isUnauthorizedApiError(new ApiRequestError('forbidden', 403, { message: 'forbidden' }))).toBe(false);
    expect(isUnauthorizedApiError(new Error('boom'))).toBe(false);
  });

  it('reads and updates driver execution state with bearer auth', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            driverId: 'driver-1',
            availability: 'OFFLINE',
            latestLocation: null,
            availableSince: null,
            lastLocationAt: null
          })
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            driverId: 'driver-1',
            availability: 'ONLINE',
            latestLocation: null,
            availableSince: '2026-04-28T12:00:00.000Z',
            lastLocationAt: null
          })
      });
    vi.stubGlobal('fetch', fetchMock);

    await expect(getDriverState(session)).resolves.toMatchObject({ availability: 'OFFLINE' });
    await expect(updateDriverAvailability(session, 'ONLINE')).resolves.toMatchObject({ availability: 'ONLINE' });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api-staging-qvmv.onrender.com/v1/driver/me',
      expect.objectContaining({ method: 'GET' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api-staging-qvmv.onrender.com/v1/driver/me/availability',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ availability: 'ONLINE' })
      })
    );
  });

  it('calls driver offer decision endpoints', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify([
            {
              offerId: 'offer-1',
              jobId: 'job-1',
              status: 'OFFERED',
              expiresAt: '2026-04-28T12:00:00.000Z',
              distanceMiles: 4.2,
              etaMinutes: 16,
              payoutGrossCents: 1100,
              pickupAddress: '12 Exmouth Market, London',
              dropoffAddress: '184 Upper Street, London'
            }
          ])
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            offerId: 'offer-1',
            jobId: 'job-1',
            status: 'ASSIGNED',
            distanceMiles: 4.2,
            etaMinutes: 16,
            payoutGrossCents: 1100
          })
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            offerId: 'offer-2',
            jobId: 'job-2',
            status: 'REJECTED'
          })
      });
    vi.stubGlobal('fetch', fetchMock);

    await expect(listDriverOffers(session)).resolves.toHaveLength(1);
    await expect(acceptDriverOffer(session, 'offer-1')).resolves.toMatchObject({ status: 'ASSIGNED' });
    await expect(rejectDriverOffer(session, 'offer-2')).resolves.toMatchObject({ status: 'REJECTED' });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api-staging-qvmv.onrender.com/v1/driver/me/offers/offer-1/accept',
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'https://api-staging-qvmv.onrender.com/v1/driver/me/offers/offer-2/reject',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('loads eligible drivers for operator assignment', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          items: [
            {
              id: 'driver-1',
              displayName: 'Alex Rider',
              vehicleType: 'BIKE',
              availabilityStatus: 'ONLINE',
              distanceMiles: 0.4,
              lastLocationAt: '2026-04-29T09:00:00.000Z',
              verificationStatus: 'APPROVED',
              activeJobId: null,
              activeJobStatus: null,
              eligible: true,
              suitabilityFlags: ['READY'],
              suitabilityReason: 'Online, approved, and ready for manual assignment.'
            }
          ]
        })
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(listEligibleDrivers(session, 'job-1')).resolves.toEqual([
      expect.objectContaining({ id: 'driver-1', eligible: true })
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api-staging-qvmv.onrender.com/v1/jobs/job-1/eligible-drivers',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('calls active driver job transition and proof endpoints', async () => {
    const job = {
      id: 'job-1',
      orgId: null,
      consumerId: 'consumer-1',
      assignedDriverId: 'driver-1',
      quoteId: null,
      status: 'ASSIGNED',
      pickupAddress: '12 Exmouth Market, London',
      dropoffAddress: '184 Upper Street, London',
      pickupCoordinates: { latitude: 51.5, longitude: -0.1 },
      dropoffCoordinates: { latitude: 51.51, longitude: -0.09 },
      distanceMiles: 4.2,
      etaMinutes: 16,
      vehicleRequired: 'BIKE',
      customerTotalCents: 1600,
      driverPayoutGrossCents: 1100,
      platformFeeCents: 500,
      pricingVersion: 'phase1_test_v1',
      premiumDistanceFlag: false,
      attentionLevel: 'NORMAL',
      attentionReason: null,
      createdByUserId: 'creator-1',
      createdAt: '2026-04-28T12:00:00.000Z'
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(job) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ ...job, status: 'EN_ROUTE_PICKUP' }) })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            id: 'pod-1',
            jobId: 'job-1',
            deliveredByDriverId: 'driver-1',
            photoUrl: null,
            recipientName: 'Taylor',
            deliveryNote: 'Left with reception',
            deliveredAt: '2026-04-28T12:30:00.000Z',
            coordinates: null,
            otpVerified: false
          })
      });
    vi.stubGlobal('fetch', fetchMock);

    await expect(getCurrentDriverJob(session)).resolves.toMatchObject({ id: 'job-1' });
    await expect(transitionDriverJob(session, 'job-1', 'en-route-pickup')).resolves.toMatchObject({
      status: 'EN_ROUTE_PICKUP'
    });
    await expect(
      createProofOfDelivery(session, 'job-1', {
        recipientName: 'Taylor',
        deliveryNote: 'Left with reception',
        coordinates: null
      })
    ).resolves.toMatchObject({ recipientName: 'Taylor' });
  });

  it('lists and mutates business support escalations with idempotency headers', async () => {
    const escalation = {
      id: '2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b',
      orgId: '07ce83ef-3d05-4f78-9f5f-a21191f2d07e',
      orgName: 'Pilot Org',
      orderId: '11111111-1111-4111-8111-111111111111',
      jobId: '33333333-3333-4333-8333-333333333333',
      category: 'DELIVERY_DELAY',
      status: 'OPEN',
      severity: 'HIGH',
      title: 'Delay follow-up',
      note: 'Customer asked for a status update.',
      followUpOwner: null,
      customerContactRequired: true,
      merchantContactRequired: false,
      courierContactRequired: true,
      resolutionNote: null,
      resolutionAction: null,
      resolutionReason: null,
      resolvedBy: null,
      resolvedAt: null,
      createdBy: session.userId,
      createdAt: '2026-05-18T10:00:00.000Z',
      updatedAt: '2026-05-18T10:00:00.000Z',
      restaurantName: 'Pilot Kitchen',
      customerName: 'Ada Customer'
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ items: [escalation] }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(escalation) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ ...escalation, status: 'RESOLVED' }) });
    vi.stubGlobal('fetch', fetchMock);

    await expect(listBusinessSupportEscalations(session, { orderId: escalation.orderId })).resolves.toHaveLength(1);
    await createBusinessSupportEscalation(session, {
      orderId: escalation.orderId,
      category: 'DELIVERY_DELAY',
      severity: 'HIGH',
      title: 'Delay follow-up',
      note: 'Customer asked for a status update.',
      customerContactRequired: true
    });
    await updateBusinessSupportEscalation(session, escalation.id, {
      status: 'RESOLVED',
      resolutionNote: 'Customer confirmed this support record can be closed.',
      resolutionAction: 'CUSTOMER_UPDATED',
      resolutionReason: 'CUSTOMER_CONFIRMED'
    });

    const [listUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(listUrl).toContain('/v1/business/support/escalations?orderId=11111111-1111-4111-8111-111111111111');
    const [, createInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(createInit.method).toBe('POST');
    expect(String(createInit.headers && (createInit.headers as Record<string, string>)['Idempotency-Key'])).toContain('support-escalation');
    const [, updateInit] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(updateInit.method).toBe('PATCH');
    expect(String(updateInit.headers && (updateInit.headers as Record<string, string>)['Idempotency-Key'])).toContain('support-escalation-update');
  });

  it('lists business support escalation audit events', async () => {
    const event = {
      id: '44444444-4444-4444-8444-444444444444',
      supportEscalationId: '2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b',
      orgId: '07ce83ef-3d05-4f78-9f5f-a21191f2d07e',
      eventType: 'STATUS_CHANGED',
      actorId: session.userId,
      actorLabel: null,
      previousStatus: 'OPEN',
      newStatus: 'IN_REVIEW',
      note: 'Status changed to in review.',
      metadata: { previousStatus: 'OPEN', newStatus: 'IN_REVIEW' },
      createdAt: '2026-05-18T10:10:00.000Z'
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ items: [event] })
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(listBusinessSupportEscalationEvents(session, event.supportEscalationId)).resolves.toEqual([event]);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/v1/business/support/escalations/2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b/events');
    expect(init.method).toBe('GET');
  });

  it('lists admin support escalations from the admin endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ items: [] })
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(listAdminSupportEscalations(session, { severity: 'HIGH' })).resolves.toEqual([]);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/v1/admin/support/escalations?severity=HIGH');
    expect(init.method).toBe('GET');
  });

  it('lists admin support escalation audit events from the admin endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          items: [
            {
              id: '44444444-4444-4444-8444-444444444444',
              supportEscalationId: '2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b',
              orgId: '07ce83ef-3d05-4f78-9f5f-a21191f2d07e',
              eventType: 'RESOLVED',
              actorId: null,
              actorLabel: 'Platform admin',
              previousStatus: 'IN_REVIEW',
              newStatus: 'RESOLVED',
              note: 'Resolved with closeout metadata.',
              metadata: { resolutionAction: 'CUSTOMER_UPDATED' },
              createdAt: '2026-05-18T10:15:00.000Z'
            }
          ]
        })
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(listAdminSupportEscalationEvents(session, '2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b')).resolves.toHaveLength(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/v1/admin/support/escalations/2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b/events');
    expect(init.method).toBe('GET');
  });

  it('calls identity and team management endpoints', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ items: [] }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ items: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            org: {
              id: '22222222-2222-4222-8222-222222222222',
              name: 'Pilot Org',
              type: 'RESTAURANT',
              status: 'ACTIVE',
              contactName: null,
              contactEmail: null,
              city: null,
              memberCount: 0,
              activeMemberCount: 0,
              createdAt: '2026-05-19T10:00:00.000Z',
              updatedAt: '2026-05-19T10:00:00.000Z'
            },
            members: [],
            invitations: []
          })
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            id: '33333333-3333-4333-8333-333333333333',
            orgId: '22222222-2222-4222-8222-222222222222',
            orgName: 'Pilot Org',
            orgType: 'RESTAURANT',
            orgStatus: 'ACTIVE',
            userId: '11111111-1111-4111-8111-111111111111',
            email: 'operator@example.com',
            displayName: 'Operator One',
            role: 'MANAGER',
            isActive: true,
            createdAt: '2026-05-19T10:00:00.000Z',
            updatedAt: '2026-05-19T10:00:00.000Z'
          })
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            org: {
              id: '22222222-2222-4222-8222-222222222222',
              name: 'Pilot Org',
              type: 'RESTAURANT',
              status: 'ACTIVE',
              contactName: null,
              contactEmail: null,
              city: null,
              memberCount: 0,
              activeMemberCount: 0,
              createdAt: '2026-05-19T10:00:00.000Z',
              updatedAt: '2026-05-19T10:00:00.000Z'
            },
            members: [],
            invitations: []
          })
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            id: '44444444-4444-4444-8444-444444444444',
            orgId: '22222222-2222-4222-8222-222222222222',
            email: 'new@example.com',
            role: 'OPERATOR',
            status: 'PENDING',
            invitedBy: session.userId,
            createdAt: '2026-05-19T10:00:00.000Z',
            updatedAt: '2026-05-19T10:00:00.000Z'
          })
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            id: '33333333-3333-4333-8333-333333333333',
            orgId: '22222222-2222-4222-8222-222222222222',
            orgName: 'Pilot Org',
            orgType: 'RESTAURANT',
            orgStatus: 'ACTIVE',
            userId: '11111111-1111-4111-8111-111111111111',
            email: 'operator@example.com',
            displayName: 'Operator One',
            role: 'OPERATOR',
            isActive: false,
            createdAt: '2026-05-19T10:00:00.000Z',
            updatedAt: '2026-05-19T10:00:00.000Z'
          })
      });
    vi.stubGlobal('fetch', fetchMock);

    await listAdminUsers(session, 'ops');
    await listAdminOrgs(session);
    await getAdminOrgMembers(session, '22222222-2222-4222-8222-222222222222');
    await updateAdminOrgMembership(session, '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', { role: 'MANAGER' });
    await getBusinessTeam(session);
    await createBusinessTeamInvite(session, { email: 'new@example.com', role: 'OPERATOR' });
    await updateBusinessTeamMembership(session, '33333333-3333-4333-8333-333333333333', { isActive: false });

    expect((fetchMock.mock.calls[0] as [string, RequestInit])[0]).toContain('/v1/admin/users?search=ops');
    expect((fetchMock.mock.calls[1] as [string, RequestInit])[0]).toContain('/v1/admin/orgs');
    expect((fetchMock.mock.calls[2] as [string, RequestInit])[0]).toContain('/v1/admin/orgs/22222222-2222-4222-8222-222222222222/members');
    expect((fetchMock.mock.calls[3] as [string, RequestInit])[1].method).toBe('PATCH');
    expect((fetchMock.mock.calls[4] as [string, RequestInit])[0]).toContain('/v1/business/team');
    expect((fetchMock.mock.calls[5] as [string, RequestInit])[0]).toContain('/v1/business/team/invites');
    expect((fetchMock.mock.calls[6] as [string, RequestInit])[1].method).toBe('PATCH');
  });

  it('calls fleet organisation and fleet manager endpoints', async () => {
    const fleet = {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Northside Couriers',
      status: 'ONBOARDING',
      contactName: 'Fleet Owner',
      contactEmail: 'fleet@example.com',
      city: 'London',
      memberCount: 1,
      activeDriverCount: 1,
      readyDriverCount: 1,
      needsReviewDriverCount: 0,
      notEligibleDriverCount: 0,
      activeJobCount: 0,
      createdAt: '2026-05-19T10:00:00.000Z',
      updatedAt: '2026-05-19T10:00:00.000Z'
    };
    const driver = {
      membershipId: '44444444-4444-4444-8444-444444444444',
      fleetOrgId: fleet.id,
      fleetOrgName: fleet.name,
      userId: '22222222-2222-4222-8222-222222222222',
      email: 'driver@example.com',
      displayName: 'Fleet Driver',
      fleetRole: 'DRIVER',
      membershipActive: true,
      driverId: '55555555-5555-4555-8555-555555555555',
      availabilityStatus: 'ONLINE',
      verificationStatus: 'APPROVED',
      vehicleType: 'BIKE',
      activeJobId: null,
      activeJobStatus: null,
      lastLocationAt: '2026-05-19T10:00:00.000Z',
      readinessStatus: 'READY',
      recommendedNextAction: 'Courier is ready for fleet-managed pilot assignment after operator review.',
      createdAt: '2026-05-19T10:00:00.000Z',
      updatedAt: '2026-05-19T10:00:00.000Z'
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ items: [fleet] }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(fleet) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ items: [driver] }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(driver) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(driver) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ items: [driver] }) })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            fleetOrgId: fleet.id,
            fleetOrgName: fleet.name,
            totalDrivers: 1,
            readyDrivers: 1,
            needsReviewDrivers: 0,
            notEligibleDrivers: 0,
            onlineDrivers: 1,
            activeJobs: 0,
            humanReviewNote: 'Fleet readiness is visibility-only in v1.'
          })
      });
    vi.stubGlobal('fetch', fetchMock);

    await listAdminFleets(session);
    await createAdminFleet(session, { name: fleet.name, contactEmail: fleet.contactEmail });
    await listAdminFleetDrivers(session, fleet.id);
    await addAdminFleetDriver(session, fleet.id, { email: driver.email, role: 'DRIVER' });
    await updateAdminFleetDriver(session, fleet.id, driver.membershipId, { role: 'DISPATCHER' });
    await listFleetDrivers(session);
    await getFleetReadiness(session);

    expect((fetchMock.mock.calls[0] as [string, RequestInit])[0]).toContain('/v1/admin/fleets');
    expect((fetchMock.mock.calls[1] as [string, RequestInit])[1].method).toBe('POST');
    expect((fetchMock.mock.calls[2] as [string, RequestInit])[0]).toContain(`/v1/admin/fleets/${fleet.id}/drivers`);
    expect((fetchMock.mock.calls[3] as [string, RequestInit])[1].method).toBe('POST');
    expect((fetchMock.mock.calls[4] as [string, RequestInit])[1].method).toBe('PATCH');
    expect((fetchMock.mock.calls[5] as [string, RequestInit])[0]).toContain('/v1/fleet/drivers');
    expect((fetchMock.mock.calls[6] as [string, RequestInit])[0]).toContain('/v1/fleet/readiness');
  });
});
