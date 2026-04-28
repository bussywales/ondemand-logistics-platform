import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { RestaurantsService } from "./restaurants.service.js";

const USER_ID = "3072f60c-81a5-4658-aa11-13a59b42cc8c";
const ORG_ID = "a56c6fc5-ec1f-4b1c-b4f5-8e79ddf9fb86";
const RESTAURANT_ID = "5b31aa8f-34c3-4471-8cc5-822c40f4ed79";
const CATEGORY_ID = "9c5e98ce-d8a8-4c89-8990-6c143d099f70";
const ITEM_ID = "0d9f782a-3575-4e6b-8d65-463a1829f5f8";

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

describe("RestaurantsService", () => {
  it("lists restaurants for the current operator context", async () => {
    const createdAt = new Date("2026-04-28T10:00:00.000Z");
    const query = vi.fn().mockResolvedValueOnce({
      rowCount: 1,
      rows: [restaurantRow({ created_at: createdAt, updated_at: createdAt })]
    });

    const service = new RestaurantsService({ query } as never);
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

    const service = new RestaurantsService({ query } as never);
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

    const service = new RestaurantsService(pg as never);
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

    const service = new RestaurantsService(pg as never);

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

    const service = new RestaurantsService(pg as never);

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

    const service = new RestaurantsService(pg as never);
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

    const service = new RestaurantsService(pg as never);

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

    const service = new RestaurantsService(pg as never);
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

    const service = new RestaurantsService(pg as never);
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

    const service = new RestaurantsService(pg as never);
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

    const service = new RestaurantsService(pg as never);
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

    const service = new RestaurantsService(pg as never);
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

    const service = new RestaurantsService(pg as never);
    const result = await service.getPublicRestaurantMenu("pilot-kitchen");

    expect(result.categories).toEqual([]);
  });

  it("does not return inactive restaurants on the public menu endpoint", async () => {
    const pg = {
      query: vi.fn().mockResolvedValueOnce({ rowCount: 0, rows: [] })
    };

    const service = new RestaurantsService(pg as never);

    await expect(service.getPublicRestaurantMenu("inactive-kitchen")).rejects.toThrow(NotFoundException);
  });
});
