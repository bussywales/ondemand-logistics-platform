import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { RestaurantsService } from "./restaurants.service.js";

const USER_ID = "3072f60c-81a5-4658-aa11-13a59b42cc8c";
const ORG_ID = "a56c6fc5-ec1f-4b1c-b4f5-8e79ddf9fb86";
const RESTAURANT_ID = "5b31aa8f-34c3-4471-8cc5-822c40f4ed79";
const CATEGORY_ID = "9c5e98ce-d8a8-4c89-8990-6c143d099f70";
const ITEM_ID = "0d9f782a-3575-4e6b-8d65-463a1829f5f8";
const ORDER_ID = "3ed1057d-4416-4eee-b05d-8501ce691d59";
const PAYMENT_ID = "fbc20bd9-1d7b-494a-a11b-0f1b6029dc2f";
const JOB_ID = "04f99ff2-df87-4f8b-aa10-8aef6d675fd4";

function restaurantRow(overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  return {
    id: RESTAURANT_ID,
    org_id: ORG_ID,
    name: "Pilot Kitchen",
    slug: "pilot-kitchen",
    status: "ACTIVE",
    created_at: now,
    updated_at: now,
    ...overrides
  };
}

function categoryRow(overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  return {
    id: CATEGORY_ID,
    restaurant_id: RESTAURANT_ID,
    name: "Mains",
    sort_order: 0,
    is_active: true,
    created_at: now,
    updated_at: now,
    ...overrides
  };
}

function itemRow(overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  return {
    id: ITEM_ID,
    restaurant_id: RESTAURANT_ID,
    category_id: CATEGORY_ID,
    name: "Chicken Wrap",
    description: "Fresh and hot",
    price_cents: 1299,
    currency: "gbp",
    is_active: true,
    sort_order: 0,
    created_at: now,
    updated_at: now,
    ...overrides
  };
}

function orderRow(overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  return {
    id: ORDER_ID,
    restaurant_id: RESTAURANT_ID,
    org_id: ORG_ID,
    job_id: JOB_ID,
    payment_id: PAYMENT_ID,
    customer_user_id: USER_ID,
    customer_name: "Ada Customer",
    customer_email: "ada@example.com",
    customer_phone: "07500000000",
    delivery_address: "10 Pilot Street, Stoke",
    delivery_notes: "Leave at reception",
    status: "SUBMITTED",
    subtotal_cents: 2598,
    delivery_fee_cents: 1582,
    total_cents: 4180,
    currency: "GBP",
    created_at: now,
    updated_at: now,
    ...overrides
  };
}

function orderItemRow(overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  return {
    id: "d40ac077-4d4e-499d-8cb4-a4892d951208",
    order_id: ORDER_ID,
    menu_item_id: ITEM_ID,
    name: "Chicken Wrap",
    quantity: 2,
    unit_price_cents: 1299,
    line_total_cents: 2598,
    currency: "GBP",
    created_at: now,
    ...overrides
  };
}

describe("RestaurantsService", () => {
  it("lists restaurants for the current operator context", async () => {
    const createdAt = new Date("2026-04-28T10:00:00.000Z");
    const query = vi.fn().mockResolvedValueOnce({
      rowCount: 1,
      rows: [restaurantRow({ created_at: createdAt, updated_at: createdAt })]
    });

    const service = new RestaurantsService({ query } as never, {} as never);
    const result = await service.listRestaurants(USER_ID);

    expect(query).toHaveBeenCalledWith(expect.stringContaining("from public.restaurants r"), [USER_ID]);
    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: RESTAURANT_ID,
          slug: "pilot-kitchen",
          createdAt: createdAt.toISOString()
        })
      ]
    });
  });

  it("returns an empty restaurant list when the operator has no restaurants yet", async () => {
    const query = vi.fn().mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const service = new RestaurantsService({ query } as never, {} as never);
    const result = await service.listRestaurants(USER_ID);

    expect(result).toEqual({ items: [] });
  });

  it("creates a restaurant for an operator org", async () => {
    const query = vi.fn().mockResolvedValueOnce({ rowCount: 1, rows: [{ role: "BUSINESS_OPERATOR" }] });
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [restaurantRow()] });
    const pg = {
      query,
      withIdempotency: vi.fn().mockImplementation(async ({ execute }) => ({
        replay: false,
        ...(await execute({ query: clientQuery }))
      }))
    };

    const service = new RestaurantsService(pg as never, {} as never);
    const result = await service.createRestaurant(
      { orgId: ORG_ID, name: "Pilot Kitchen", slug: "Pilot Kitchen" },
      USER_ID,
      "idem-restaurant-1"
    );

    expect(result.body).toEqual(
      expect.objectContaining({ id: RESTAURANT_ID, orgId: ORG_ID, slug: "pilot-kitchen", status: "ACTIVE" })
    );
    expect(clientQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("from public.restaurants"),
      ["pilot-kitchen"]
    );
  });

  it("rejects duplicate restaurant slugs before insert", async () => {
    const query = vi.fn().mockResolvedValueOnce({ rowCount: 1, rows: [{ role: "BUSINESS_OPERATOR" }] });
    const clientQuery = vi.fn().mockResolvedValueOnce({ rowCount: 1, rows: [{ id: RESTAURANT_ID }] });
    const pg = {
      query,
      withIdempotency: vi.fn().mockImplementation(async ({ execute }) => execute({ query: clientQuery }))
    };

    const service = new RestaurantsService(pg as never, {} as never);

    await expect(
      service.createRestaurant(
        { orgId: ORG_ID, name: "Pilot Kitchen", slug: "pilot-kitchen" },
        USER_ID,
        "idem-restaurant-dup"
      )
    ).rejects.toThrow(ConflictException);
  });

  it("blocks restaurant creation when the actor is not an org operator", async () => {
    const pg = {
      query: vi.fn().mockResolvedValue({ rowCount: 0, rows: [] }),
      withIdempotency: vi.fn()
    };

    const service = new RestaurantsService(pg as never, {} as never);

    await expect(
      service.createRestaurant({ orgId: ORG_ID, name: "Pilot Kitchen", slug: "pilot-kitchen" }, USER_ID, "idem-restaurant-2")
    ).rejects.toThrow(ForbiddenException);
  });

  it("creates a menu category for an accessible restaurant", async () => {
    const pg = {
      query: vi.fn().mockResolvedValueOnce({ rowCount: 1, rows: [restaurantRow()] }),
      withIdempotency: vi.fn().mockImplementation(async ({ execute }) => ({
        replay: false,
        ...(await execute({ query: vi.fn().mockResolvedValueOnce({ rowCount: 1, rows: [categoryRow()] }) }))
      }))
    };

    const service = new RestaurantsService(pg as never, {} as never);
    const result = await service.createMenuCategory(
      RESTAURANT_ID,
      { name: "Mains", sortOrder: 0 },
      USER_ID,
      "idem-category-1"
    );

    expect(result.body).toEqual(expect.objectContaining({ id: CATEGORY_ID, restaurantId: RESTAURANT_ID, name: "Mains" }));
  });

  it("requires the category to belong to the same restaurant when creating a menu item", async () => {
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rowCount: 1, rows: [restaurantRow()] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }),
      withIdempotency: vi.fn()
    };

    const service = new RestaurantsService(pg as never, {} as never);

    await expect(
      service.createMenuItem(
        RESTAURANT_ID,
        {
          categoryId: CATEGORY_ID,
          name: "Chicken Wrap",
          description: "Fresh and hot",
          priceCents: 1299,
          currency: "GBP"
        },
        USER_ID,
        "idem-item-1"
      )
    ).rejects.toThrow(new NotFoundException("menu_category_not_found"));
  });

  it("creates a menu item under an existing category", async () => {
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rowCount: 1, rows: [restaurantRow()] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: CATEGORY_ID }] }),
      withIdempotency: vi.fn().mockImplementation(async ({ execute }) => ({
        replay: false,
        ...(await execute({ query: vi.fn().mockResolvedValueOnce({ rowCount: 1, rows: [itemRow()] }) }))
      }))
    };

    const service = new RestaurantsService(pg as never, {} as never);
    const result = await service.createMenuItem(
      RESTAURANT_ID,
      {
        categoryId: CATEGORY_ID,
        name: "Chicken Wrap",
        description: "Fresh and hot",
        priceCents: 1299,
        currency: "GBP"
      },
      USER_ID,
      "idem-item-2"
    );

    expect(result.body).toEqual(
      expect.objectContaining({
        id: ITEM_ID,
        restaurantId: RESTAURANT_ID,
        categoryId: CATEGORY_ID,
        currency: "GBP"
      })
    );
  });

  it("returns a safe empty menu structure when no categories or items exist", async () => {
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rowCount: 1, rows: [restaurantRow()] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
    };

    const service = new RestaurantsService(pg as never, {} as never);
    const result = await service.getRestaurantMenu(RESTAURANT_ID, USER_ID);

    expect(result).toEqual({
      restaurant: expect.objectContaining({ id: RESTAURANT_ID, slug: "pilot-kitchen" }),
      categories: []
    });
  });

  it("returns a structured menu with normalized date and currency values", async () => {
    const createdAt = new Date("2026-04-28T10:00:00.000Z");
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rowCount: 1, rows: [restaurantRow({ created_at: createdAt, updated_at: createdAt })] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [categoryRow({ created_at: createdAt, updated_at: createdAt })] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [itemRow({ currency: "gbp", created_at: createdAt, updated_at: createdAt })] })
    };

    const service = new RestaurantsService(pg as never, {} as never);
    const result = await service.getRestaurantMenu(RESTAURANT_ID, USER_ID);

    expect(result.categories).toEqual([
      expect.objectContaining({
        id: CATEGORY_ID,
        items: [
          expect.objectContaining({
            id: ITEM_ID,
            currency: "GBP",
            createdAt: createdAt.toISOString()
          })
        ]
      })
    ]);
  });

  it("returns a public active menu by restaurant slug", async () => {
    const createdAt = new Date("2026-04-28T10:00:00.000Z");
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rowCount: 1, rows: [restaurantRow({ created_at: createdAt, updated_at: createdAt })] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [categoryRow({ created_at: createdAt, updated_at: createdAt })] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [itemRow({ currency: "gbp", created_at: createdAt, updated_at: createdAt })] })
    };

    const service = new RestaurantsService(pg as never, {} as never);
    const result = await service.getPublicRestaurantMenu("Pilot Kitchen");

    expect(pg.query).toHaveBeenNthCalledWith(1, expect.stringContaining("status = 'ACTIVE'"), ["pilot-kitchen"]);
    expect(result).toEqual({
      restaurant: {
        id: RESTAURANT_ID,
        name: "Pilot Kitchen",
        slug: "pilot-kitchen",
        status: "ACTIVE"
      },
      categories: [
        {
          id: CATEGORY_ID,
          name: "Mains",
          sortOrder: 0,
          items: [
            {
              id: ITEM_ID,
              name: "Chicken Wrap",
              description: "Fresh and hot",
              priceCents: 1299,
              currency: "GBP",
              sortOrder: 0
            }
          ]
        }
      ]
    });
  });

  it("returns a safe empty public menu when no active categories or items exist", async () => {
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rowCount: 1, rows: [restaurantRow()] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
    };

    const service = new RestaurantsService(pg as never, {} as never);
    const result = await service.getPublicRestaurantMenu("pilot-kitchen");

    expect(result.categories).toEqual([]);
  });

  it("does not expose items from inactive categories on the public menu", async () => {
    const pg = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rowCount: 1, rows: [restaurantRow()] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [itemRow()] })
    };

    const service = new RestaurantsService(pg as never, {} as never);
    const result = await service.getPublicRestaurantMenu("pilot-kitchen");

    expect(result.categories).toEqual([]);
  });

  it("does not return inactive restaurants on the public menu endpoint", async () => {
    const pg = {
      query: vi.fn().mockResolvedValueOnce({ rowCount: 0, rows: [] })
    };

    const service = new RestaurantsService(pg as never, {} as never);

    await expect(service.getPublicRestaurantMenu("inactive-kitchen")).rejects.toThrow(NotFoundException);
  });

  it("submits a public customer order, authorizes payment, and returns downstream job state", async () => {
    const quoteId = "9b7434e4-6397-4fc8-8d10-83d80e21d506";
    const pg = {
      query: vi.fn().mockResolvedValueOnce({ rowCount: 1, rows: [{ id: USER_ID }] }),
      withIdempotency: vi.fn().mockImplementation(async ({ execute }) => ({
        replay: false,
        ...(await execute({
          query: vi
            .fn()
            .mockResolvedValueOnce({ rowCount: 1, rows: [restaurantRow()] })
            .mockResolvedValueOnce({
              rowCount: 1,
              rows: [itemRow({ price_cents: 1299, currency: "gbp", category_active: true })]
            })
            .mockResolvedValueOnce({
              rowCount: 1,
              rows: [
                {
                  id: quoteId,
                  distance_miles: "4.80",
                  eta_minutes: 22,
                  vehicle_type: "BIKE",
                  customer_total_cents: 4180,
                  driver_payout_gross_cents: 1108,
                  platform_fee_cents: 3072,
                  pricing_version: "stage1_customer_order_v1",
                  premium_distance_flag: false
                }
              ]
            })
            .mockResolvedValueOnce({
              rowCount: 1,
              rows: [
                {
                  id: JOB_ID,
                  status: "REQUESTED",
                  eta_minutes: 22,
                  pickup_address: "Pilot Kitchen pickup",
                  dropoff_address: "10 Pilot Street, Stoke",
                  customer_total_cents: 4180,
                  platform_fee_cents: 3072,
                  driver_payout_gross_cents: 1108
                }
              ]
            })
            .mockResolvedValueOnce({ rowCount: 1, rows: [] })
            .mockResolvedValueOnce({ rowCount: 1, rows: [] })
            .mockResolvedValueOnce({ rowCount: 1, rows: [] })
            .mockResolvedValueOnce({ rowCount: 1, rows: [orderRow()] })
            .mockResolvedValueOnce({ rowCount: 1, rows: [orderItemRow()] })
            .mockResolvedValueOnce({ rowCount: 1, rows: [orderRow({ status: "PAYMENT_AUTHORIZED" })] })
        }))
      }))
    };
    const payments = {
      isProviderConfigured: vi.fn().mockReturnValue(true),
      createPaymentForJob: vi.fn().mockResolvedValue({ id: PAYMENT_ID }),
      authorizeCustomerOrderPayment: vi.fn().mockResolvedValue({
        responseCode: 200,
        body: {
          id: PAYMENT_ID,
          jobId: JOB_ID,
          provider: "stripe",
          providerPaymentIntentId: "pi_test",
          status: "AUTHORIZED",
          amountAuthorizedCents: 4180,
          amountCapturedCents: 0,
          amountRefundedCents: 0,
          currency: "gbp",
          customerTotalCents: 4180,
          platformFeeCents: 3072,
          payoutGrossCents: 1108,
          settlementSnapshot: {},
          clientSecret: null,
          lastError: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      })
    };

    const service = new RestaurantsService(pg as never, payments as never);
    const result = await service.submitPublicCustomerOrder(
      "pilot-kitchen",
      {
        customer: {
          name: "Ada Customer",
          email: "ada@example.com",
          phone: "07500000000"
        },
        delivery: {
          address: "10 Pilot Street, Stoke",
          notes: "Leave at reception"
        },
        items: [{ menuItemId: ITEM_ID, quantity: 2 }],
        paymentMethodId: "pm_test_123"
      },
      "idem-customer-order-1"
    );

    expect(result.body.order.status).toBe("PAYMENT_AUTHORIZED");
    expect(result.body.order.items).toEqual([
      expect.objectContaining({
        menuItemId: ITEM_ID,
        quantity: 2,
        lineTotalCents: 2598
      })
    ]);
    expect(result.body.job).toEqual(
      expect.objectContaining({
        id: JOB_ID,
        status: "REQUESTED",
        dropoffAddress: "10 Pilot Street, Stoke"
      })
    );
    expect(result.body.payment).toEqual(expect.objectContaining({ id: PAYMENT_ID, status: "AUTHORIZED" }));
    expect(payments.authorizeCustomerOrderPayment).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        jobId: JOB_ID,
        consumerId: USER_ID,
        paymentMethodId: "pm_test_123"
      })
    );
  });

  it("rejects public customer order submission when Stripe is not configured", async () => {
    const pg = { query: vi.fn(), withIdempotency: vi.fn() };
    const payments = {
      isProviderConfigured: vi.fn().mockReturnValue(false)
    };
    const service = new RestaurantsService(pg as never, payments as never);

    await expect(
      service.submitPublicCustomerOrder(
        "pilot-kitchen",
        {
          customer: {
            name: "Ada Customer",
            email: "ada@example.com",
            phone: "07500000000"
          },
          delivery: {
            address: "10 Pilot Street, Stoke"
          },
          items: [{ menuItemId: ITEM_ID, quantity: 1 }],
          paymentMethodId: "pm_test_123"
        },
        "idem-customer-order-2"
      )
    ).rejects.toThrow("stripe_not_configured");
    expect(pg.withIdempotency).not.toHaveBeenCalled();
  });
});
