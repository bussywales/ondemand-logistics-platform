import { afterEach, describe, expect, it, vi } from 'vitest';
import { authorizePayment, createRestaurant, getPublicRestaurantMenu, getRestaurantMenu } from './api';
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
});
