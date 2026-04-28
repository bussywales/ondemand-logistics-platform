import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException
} from "@nestjs/common";
import {
  CreateMenuCategorySchema,
  CreateMenuItemSchema,
  CreateRestaurantSchema,
  MenuCategorySchema,
  MenuItemSchema,
  RestaurantListSchema,
  RestaurantMenuSchema,
  RestaurantSchema,
  type MenuCategoryDto,
  type MenuItemDto,
  type RestaurantDto,
  type RestaurantMenuDto
} from "@shipwright/contracts";
import { createLogger } from "@shipwright/observability";
import { toInteger, toIsoDateTime } from "../database/mapper.js";
import { PgService } from "../database/pg.service.js";

type RestaurantRow = {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  status: "DRAFT" | "ACTIVE";
  created_at: string | Date;
  updated_at: string | Date;
};

type MenuCategoryRow = {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string | Date;
  updated_at: string | Date;
};

type MenuItemRow = {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  is_active: boolean;
  sort_order: number;
  created_at: string | Date;
  updated_at: string | Date;
};

@Injectable()
export class RestaurantsService {
  private readonly logger = createLogger({ name: "api-restaurants" });

  constructor(private readonly pg: PgService) {}

  async createRestaurant(input: unknown, userId: string, idempotencyKey: string) {
    const parsed = CreateRestaurantSchema.safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        message: "invalid_restaurant_payload",
        issues: parsed.error.issues
      });
    }

    await this.assertOrgOperator(parsed.data.orgId, userId);

    const result = await this.pg.withIdempotency({
      actorId: userId,
      endpoint: "/v1/business/restaurants",
      idempotencyKey,
      execute: async (client) => {
        try {
          const inserted = await client.query<RestaurantRow>(
            `insert into public.restaurants (
               org_id,
               name,
               slug,
               status
             ) values ($1, $2, $3, $4)
             returning id, org_id, name, slug, status, created_at, updated_at`,
            [parsed.data.orgId, parsed.data.name, parsed.data.slug, parsed.data.status]
          );

          return {
            responseCode: 201,
            body: this.mapRestaurant(inserted.rows[0])
          };
        } catch (error) {
          if ((error as { code?: string }).code === "23505") {
            throw new ConflictException("restaurant_slug_already_exists");
          }

          throw error;
        }
      }
    });

    this.logger.info({ actor_id: userId, replay: result.replay }, "restaurant_created");
    return result;
  }

  async listRestaurants(userId: string) {
    const result = await this.pg.query<RestaurantRow>(
      `select r.id, r.org_id, r.name, r.slug, r.status, r.created_at, r.updated_at
       from public.restaurants r
       where exists (
         select 1
         from public.org_memberships m
         where m.org_id = r.org_id
           and m.user_id = $1
           and m.is_active = true
           and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
       )
       order by r.created_at desc`,
      [userId]
    );

    return RestaurantListSchema.parse({
      items: result.rows.map((row) => this.mapRestaurant(row))
    });
  }

  async createMenuCategory(restaurantId: string, input: unknown, userId: string, idempotencyKey: string) {
    const parsed = CreateMenuCategorySchema.safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        message: "invalid_menu_category_payload",
        issues: parsed.error.issues
      });
    }

    await this.loadOperatorRestaurant(restaurantId, userId);

    const result = await this.pg.withIdempotency({
      actorId: userId,
      endpoint: `/v1/business/restaurants/${restaurantId}/menu-categories`,
      idempotencyKey,
      execute: async (client) => {
        const inserted = await client.query<MenuCategoryRow>(
          `insert into public.menu_categories (
             restaurant_id,
             name,
             sort_order,
             is_active
           ) values ($1, $2, $3, $4)
           returning id, restaurant_id, name, sort_order, is_active, created_at, updated_at`,
          [restaurantId, parsed.data.name, parsed.data.sortOrder, parsed.data.isActive]
        );

        return {
          responseCode: 201,
          body: this.mapCategory(inserted.rows[0])
        };
      }
    });

    this.logger.info({ actor_id: userId, restaurant_id: restaurantId, replay: result.replay }, "menu_category_created");
    return result;
  }

  async createMenuItem(restaurantId: string, input: unknown, userId: string, idempotencyKey: string) {
    const parsed = CreateMenuItemSchema.safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        message: "invalid_menu_item_payload",
        issues: parsed.error.issues
      });
    }

    await this.loadOperatorRestaurant(restaurantId, userId);

    const categoryResult = await this.pg.query<{ id: string }>(
      `select id
       from public.menu_categories
       where id = $1 and restaurant_id = $2`,
      [parsed.data.categoryId, restaurantId]
    );

    if (categoryResult.rowCount !== 1) {
      throw new NotFoundException("menu_category_not_found");
    }

    const result = await this.pg.withIdempotency({
      actorId: userId,
      endpoint: `/v1/business/restaurants/${restaurantId}/menu-items`,
      idempotencyKey,
      execute: async (client) => {
        const inserted = await client.query<MenuItemRow>(
          `insert into public.menu_items (
             restaurant_id,
             category_id,
             name,
             description,
             price_cents,
             currency,
             sort_order,
             is_active
           ) values ($1, $2, $3, $4, $5, $6, $7, $8)
           returning id, restaurant_id, category_id, name, description, price_cents, currency, is_active, sort_order, created_at, updated_at`,
          [
            restaurantId,
            parsed.data.categoryId,
            parsed.data.name,
            parsed.data.description ?? null,
            parsed.data.priceCents,
            parsed.data.currency.toUpperCase(),
            parsed.data.sortOrder,
            parsed.data.isActive
          ]
        );

        return {
          responseCode: 201,
          body: this.mapItem(inserted.rows[0])
        };
      }
    });

    this.logger.info({ actor_id: userId, restaurant_id: restaurantId, replay: result.replay }, "menu_item_created");
    return result;
  }

  async getRestaurantMenu(restaurantId: string, userId: string): Promise<RestaurantMenuDto> {
    const restaurant = await this.loadOperatorRestaurant(restaurantId, userId);
    const [categoriesResult, itemsResult] = await Promise.all([
      this.pg.query<MenuCategoryRow>(
        `select id, restaurant_id, name, sort_order, is_active, created_at, updated_at
         from public.menu_categories
         where restaurant_id = $1
         order by sort_order asc, created_at asc`,
        [restaurantId]
      ),
      this.pg.query<MenuItemRow>(
        `select id, restaurant_id, category_id, name, description, price_cents, currency, is_active, sort_order, created_at, updated_at
         from public.menu_items
         where restaurant_id = $1
         order by sort_order asc, created_at asc`,
        [restaurantId]
      )
    ]);

    const itemsByCategory = new Map<string, MenuItemDto[]>();
    for (const row of itemsResult.rows) {
      const mapped = this.mapItem(row);
      const existing = itemsByCategory.get(mapped.categoryId) ?? [];
      existing.push(mapped);
      itemsByCategory.set(mapped.categoryId, existing);
    }

    return RestaurantMenuSchema.parse({
      restaurant: this.mapRestaurant(restaurant),
      categories: categoriesResult.rows.map((row) => ({
        ...this.mapCategory(row),
        items: itemsByCategory.get(row.id) ?? []
      }))
    });
  }

  private async assertOrgOperator(orgId: string, userId: string) {
    const result = await this.pg.query<{ role: "BUSINESS_OPERATOR" | "ADMIN" }>(
      `select role
       from public.org_memberships
       where org_id = $1
         and user_id = $2
         and is_active = true
         and role in ('BUSINESS_OPERATOR', 'ADMIN')`,
      [orgId, userId]
    );

    if (result.rowCount !== 1) {
      throw new ForbiddenException("org_operator_required");
    }
  }

  private async loadOperatorRestaurant(restaurantId: string, userId: string) {
    const result = await this.pg.query<RestaurantRow>(
      `select r.id, r.org_id, r.name, r.slug, r.status, r.created_at, r.updated_at
       from public.restaurants r
       where r.id = $1
         and exists (
           select 1
           from public.org_memberships m
           where m.org_id = r.org_id
             and m.user_id = $2
             and m.is_active = true
             and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
         )`,
      [restaurantId, userId]
    );

    if (result.rowCount !== 1) {
      throw new NotFoundException("restaurant_not_found");
    }

    return result.rows[0];
  }

  private mapRestaurant(row: RestaurantRow): RestaurantDto {
    return RestaurantSchema.parse({
      id: row.id,
      orgId: row.org_id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      createdAt: toIsoDateTime(row.created_at),
      updatedAt: toIsoDateTime(row.updated_at)
    });
  }

  private mapCategory(row: MenuCategoryRow): MenuCategoryDto {
    return MenuCategorySchema.parse({
      id: row.id,
      restaurantId: row.restaurant_id,
      name: row.name,
      sortOrder: toInteger(row.sort_order, "menu_category.sort_order"),
      isActive: row.is_active,
      createdAt: toIsoDateTime(row.created_at),
      updatedAt: toIsoDateTime(row.updated_at)
    });
  }

  private mapItem(row: MenuItemRow): MenuItemDto {
    return MenuItemSchema.parse({
      id: row.id,
      restaurantId: row.restaurant_id,
      categoryId: row.category_id,
      name: row.name,
      description: row.description,
      priceCents: toInteger(row.price_cents, "menu_item.price_cents"),
      currency: row.currency.toUpperCase(),
      isActive: row.is_active,
      sortOrder: toInteger(row.sort_order, "menu_item.sort_order"),
      createdAt: toIsoDateTime(row.created_at),
      updatedAt: toIsoDateTime(row.updated_at)
    });
  }
}
