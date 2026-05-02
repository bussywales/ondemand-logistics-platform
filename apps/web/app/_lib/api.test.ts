import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiRequestError,
  acceptDriverOffer,
  authorizePayment,
  createProofOfDelivery,
  createRestaurant,
  getDriverAssignmentIneligibility,
  getBusinessOrder,
  getCurrentDriverJob,
  getDriverState,
  getPublicRestaurantMenu,
  getRestaurantMenu,
  isUnauthorizedApiError,
  listEligibleDrivers,
  listBusinessNotifications,
  listBusinessOrders,
  listDriverOffers,
  markAllBusinessNotificationsRead,
  markBusinessNotificationRead,
  rejectDriverOffer,
  transitionDriverJob,
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
});
