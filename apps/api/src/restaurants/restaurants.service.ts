import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  CreateMenuCategorySchema,
  CreateMenuItemSchema,
  CreateRestaurantSchema,
  IdempotencyHeaderSchema,
  MenuCategorySchema,
  MenuItemSchema,
  PublicCustomerOrderSchema,
  PublicRestaurantMenuSchema,
  RestaurantListSchema,
  RestaurantMenuSchema,
  RestaurantSchema,
  SubmitCustomerOrderResponseSchema,
  SubmitCustomerOrderSchema,
  type MenuCategoryDto,
  type MenuItemDto,
  type PaymentDto,
  type PublicCustomerOrderDto,
  type PublicCustomerOrderItemDto,
  type PublicMenuItemDto,
  type PublicRestaurantMenuDto,
  type RestaurantDto,
  type RestaurantMenuDto,
  type SubmitCustomerOrderResponseDto
} from "@shipwright/contracts";
import { createLogger } from "@shipwright/observability";
import type { PoolClient } from "pg";
import { toInteger, toIsoDateTime } from "../database/mapper.js";
import { PgService } from "../database/pg.service.js";
import { PaymentsService } from "../payments/payments.service.js";
import { computeQuote } from "../quotes/quotes.service.js";

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

type CustomerOrderRow = {
  id: string;
  restaurant_id: string;
  org_id: string;
  job_id: string;
  payment_id: string;
  customer_user_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  delivery_notes: string | null;
  status: "SUBMITTED" | "PAYMENT_AUTHORIZED" | "PAYMENT_FAILED";
  subtotal_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  currency: string;
  created_at: string | Date;
  updated_at: string | Date;
};

type CustomerOrderItemRow = {
  id: string;
  order_id: string;
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
  currency: string;
  created_at: string | Date;
};

type PublicOrderJobRow = {
  id: string;
  status: string;
  eta_minutes: number;
  pickup_address: string;
  dropoff_address: string;
};

type OrderableMenuItemRow = MenuItemRow & {
  category_active: boolean;
};

type QuoteInsertRow = {
  id: string;
  distance_miles: string;
  eta_minutes: number;
  vehicle_type: "BIKE" | "CAR";
  customer_total_cents: number;
  driver_payout_gross_cents: number;
  platform_fee_cents: number;
  pricing_version: string;
  premium_distance_flag: boolean;
};

type CreatedJobRow = {
  id: string;
  status: string;
  customer_total_cents: number;
  platform_fee_cents: number;
  driver_payout_gross_cents: number;
};

const CUSTOMER_ORDER_PRICING_VERSION = "stage1_customer_order_v1";
const PILOT_ORDER_VEHICLE_TYPE = (process.env.PILOT_ORDER_VEHICLE_TYPE === "CAR" ? "CAR" : "BIKE") as "BIKE" | "CAR";
const PILOT_ORDER_DISTANCE_MILES = Number(process.env.PILOT_ORDER_DISTANCE_MILES ?? "4.8");
const PILOT_ORDER_ETA_MINUTES = Number(process.env.PILOT_ORDER_ETA_MINUTES ?? "22");
const PILOT_ORDER_PICKUP_LATITUDE = Number(process.env.PILOT_ORDER_PICKUP_LATITUDE ?? "51.5254");
const PILOT_ORDER_PICKUP_LONGITUDE = Number(process.env.PILOT_ORDER_PICKUP_LONGITUDE ?? "-0.1099");
const PILOT_ORDER_DROPOFF_LATITUDE = Number(process.env.PILOT_ORDER_DROPOFF_LATITUDE ?? "51.5396");
const PILOT_ORDER_DROPOFF_LONGITUDE = Number(process.env.PILOT_ORDER_DROPOFF_LONGITUDE ?? "-0.1026");

function normalizeRestaurantSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

@Injectable()
export class RestaurantsService {
  private readonly logger = createLogger({ name: "api-restaurants" });

  constructor(
    private readonly pg: PgService,
    private readonly payments: PaymentsService
  ) {}

  async createRestaurant(input: unknown, userId: string, idempotencyKey: string) {
    const inputRecord =
      typeof input === "object" && input !== null ? (input as Record<string, unknown>) : null;
    const normalizedInput =
      inputRecord
        ? {
            ...inputRecord,
            slug: typeof inputRecord.slug === "string" ? normalizeRestaurantSlug(inputRecord.slug) : inputRecord.slug
          }
        : input;

    const parsed = CreateRestaurantSchema.safeParse(normalizedInput);
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
          const existing = await client.query<{ id: string }>(
            `select id
             from public.restaurants
             where slug = $1
             limit 1`,
            [parsed.data.slug]
          );

          if ((existing.rowCount ?? 0) > 0) {
            throw new ConflictException("restaurant_slug_already_exists");
          }

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

  async getPublicRestaurantMenu(slug: string): Promise<PublicRestaurantMenuDto> {
    const restaurantResult = await this.pg.query<RestaurantRow>(
      `select id, org_id, name, slug, status, created_at, updated_at
       from public.restaurants
       where slug = $1
         and status = 'ACTIVE'`,
      [normalizeRestaurantSlug(slug)]
    );

    if (restaurantResult.rowCount !== 1) {
      throw new NotFoundException("restaurant_not_found");
    }

    const restaurant = restaurantResult.rows[0];
    const [categoriesResult, itemsResult] = await Promise.all([
      this.pg.query<MenuCategoryRow>(
        `select id, restaurant_id, name, sort_order, is_active, created_at, updated_at
         from public.menu_categories
         where restaurant_id = $1
           and is_active = true
         order by sort_order asc, created_at asc`,
        [restaurant.id]
      ),
      this.pg.query<MenuItemRow>(
        `select id, restaurant_id, category_id, name, description, price_cents, currency, is_active, sort_order, created_at, updated_at
         from public.menu_items
         where restaurant_id = $1
           and is_active = true
         order by sort_order asc, created_at asc`,
        [restaurant.id]
      )
    ]);

    const activeCategoryIds = new Set(categoriesResult.rows.map((category) => category.id));
    const itemsByCategory = new Map<string, PublicMenuItemDto[]>();
    for (const row of itemsResult.rows) {
      if (!activeCategoryIds.has(row.category_id)) {
        continue;
      }

      const mapped = this.mapPublicItem(row);
      const existing = itemsByCategory.get(row.category_id) ?? [];
      existing.push(mapped);
      itemsByCategory.set(row.category_id, existing);
    }

    return PublicRestaurantMenuSchema.parse({
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        status: restaurant.status
      },
      categories: categoriesResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        sortOrder: toInteger(row.sort_order, "menu_category.sort_order"),
        items: itemsByCategory.get(row.id) ?? []
      }))
    });
  }

  async submitPublicCustomerOrder(
    slug: string,
    input: unknown,
    idempotencyKey: string | undefined
  ): Promise<{ replay: boolean; responseCode: number; body: SubmitCustomerOrderResponseDto }> {
    const parsedIdempotencyKey = IdempotencyHeaderSchema.safeParse(idempotencyKey);
    if (!parsedIdempotencyKey.success) {
      throw new BadRequestException({
        message: "invalid_or_missing_idempotency_key",
        issues: parsedIdempotencyKey.error.issues
      });
    }

    const parsed = SubmitCustomerOrderSchema.safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        message: "invalid_customer_order_payload",
        issues: parsed.error.issues
      });
    }

    if (!this.payments.isProviderConfigured()) {
      throw new ServiceUnavailableException("stripe_not_configured");
    }

    const payload = parsed.data;
    const normalizedSlug = normalizeRestaurantSlug(slug);
    const consumerId = await this.upsertCustomerUser(payload.customer.email, payload.customer.name);

    const result = await this.pg.withIdempotency({
      actorId: consumerId,
      endpoint: `/v1/restaurants/${normalizedSlug}/orders`,
      idempotencyKey: parsedIdempotencyKey.data,
      execute: async (client) => {
        const requestId = randomUUID();
        const restaurant = await this.loadActiveRestaurantBySlug(client, normalizedSlug);
        const orderLines = await this.loadOrderableMenuLines(client, restaurant.id, payload.items);
        const currency = this.assertSingleCurrency(orderLines);
        const subtotalCents = orderLines.reduce((total, line) => total + line.lineTotalCents, 0);
        const deliveryQuote = computeQuote({
          orgId: restaurant.org_id,
          distanceMiles: PILOT_ORDER_DISTANCE_MILES,
          etaMinutes: PILOT_ORDER_ETA_MINUTES,
          vehicleType: PILOT_ORDER_VEHICLE_TYPE,
          timeOfDay: "AFTERNOON",
          demandFlag: false,
          weatherFlag: false
        });
        const deliveryFeeCents = deliveryQuote.customerTotalCents;
        const totalCents = subtotalCents + deliveryFeeCents;
        const platformFeeCents = totalCents - deliveryQuote.driverPayoutGrossCents;

        if (platformFeeCents < 0) {
          throw new ConflictException("invalid_customer_order_pricing");
        }

        const pickupAddress = process.env.PILOT_ORDER_PICKUP_ADDRESS?.trim() || `${restaurant.name} pickup`;
        const quote = await client.query<QuoteInsertRow>(
          `insert into public.quotes (
             org_id,
             created_by_user_id,
             distance_miles,
             eta_minutes,
             vehicle_type,
             time_of_day,
             demand_flag,
             weather_flag,
             customer_total_cents,
             driver_payout_gross_cents,
             platform_fee_cents,
             premium_distance_flag,
             pricing_version,
             breakdown_lines,
             quote_input,
             quote_output
           ) values (
             $1, $2, $3, $4, $5, 'AFTERNOON', false, false,
             $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::jsonb
           )
           returning id, distance_miles, eta_minutes, vehicle_type, customer_total_cents,
             driver_payout_gross_cents, platform_fee_cents, pricing_version, premium_distance_flag`,
          [
            restaurant.org_id,
            consumerId,
            PILOT_ORDER_DISTANCE_MILES,
            PILOT_ORDER_ETA_MINUTES,
            PILOT_ORDER_VEHICLE_TYPE,
            totalCents,
            deliveryQuote.driverPayoutGrossCents,
            platformFeeCents,
            deliveryQuote.premiumDistanceFlag,
            CUSTOMER_ORDER_PRICING_VERSION,
            JSON.stringify([
              { code: "MENU_SUBTOTAL", label: "menu subtotal", amountCents: subtotalCents },
              { code: "DELIVERY_FEE", label: "pilot delivery fee", amountCents: deliveryFeeCents }
            ]),
            JSON.stringify({
              restaurantId: restaurant.id,
              itemCount: orderLines.reduce((total, line) => total + line.quantity, 0),
              deliveryAddress: payload.delivery.address
            }),
            JSON.stringify({
              subtotalCents,
              deliveryFeeCents,
              totalCents,
              driverPayoutGrossCents: deliveryQuote.driverPayoutGrossCents,
              platformFeeCents,
              currency
            })
          ]
        );

        const job = await client.query<CreatedJobRow & PublicOrderJobRow>(
          `insert into public.jobs (
             org_id,
             consumer_id,
             status,
             pickup_address,
             dropoff_address,
             pickup_latitude,
             pickup_longitude,
             dropoff_latitude,
             dropoff_longitude,
             distance_miles,
             eta_minutes,
             customer_total_cents,
             driver_payout_gross_cents,
             platform_fee_cents,
             vehicle_required,
             quote_id,
             idempotency_key,
             created_by_user_id,
             pricing_version,
             premium_distance_flag,
             dispatch_requested_at
           ) values (
             $1, $2, 'REQUESTED', $3, $4, $5, $6, $7, $8,
             $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, now()
           )
           returning id, status, eta_minutes, pickup_address, dropoff_address, customer_total_cents,
             platform_fee_cents, driver_payout_gross_cents`,
          [
            restaurant.org_id,
            consumerId,
            pickupAddress,
            payload.delivery.address,
            PILOT_ORDER_PICKUP_LATITUDE,
            PILOT_ORDER_PICKUP_LONGITUDE,
            PILOT_ORDER_DROPOFF_LATITUDE,
            PILOT_ORDER_DROPOFF_LONGITUDE,
            Number(quote.rows[0].distance_miles),
            quote.rows[0].eta_minutes,
            quote.rows[0].customer_total_cents,
            quote.rows[0].driver_payout_gross_cents,
            quote.rows[0].platform_fee_cents,
            quote.rows[0].vehicle_type,
            quote.rows[0].id,
            parsedIdempotencyKey.data,
            consumerId,
            quote.rows[0].pricing_version,
            quote.rows[0].premium_distance_flag
          ]
        );

        await this.insertCustomerJobSideEffects(client, {
          requestId,
          consumerId,
          orgId: restaurant.org_id,
          jobId: job.rows[0].id,
          quoteId: quote.rows[0].id,
          restaurantId: restaurant.id,
          itemCount: orderLines.reduce((total, line) => total + line.quantity, 0)
        });

        const payment = await this.payments.createPaymentForJob(client, {
          jobId: job.rows[0].id,
          consumerId,
          customerTotalCents: job.rows[0].customer_total_cents,
          platformFeeCents: job.rows[0].platform_fee_cents,
          payoutGrossCents: job.rows[0].driver_payout_gross_cents,
          requestId
        });

        const order = await client.query<CustomerOrderRow>(
          `insert into public.customer_orders (
             restaurant_id,
             org_id,
             job_id,
             payment_id,
             customer_user_id,
             customer_name,
             customer_email,
             customer_phone,
             delivery_address,
             delivery_notes,
             subtotal_cents,
             delivery_fee_cents,
             total_cents,
             currency
           ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           returning id, restaurant_id, org_id, job_id, payment_id, customer_user_id, customer_name,
             customer_email, customer_phone, delivery_address, delivery_notes, status, subtotal_cents,
             delivery_fee_cents, total_cents, currency, created_at, updated_at`,
          [
            restaurant.id,
            restaurant.org_id,
            job.rows[0].id,
            payment.id,
            consumerId,
            payload.customer.name,
            payload.customer.email.toLowerCase(),
            payload.customer.phone,
            payload.delivery.address,
            payload.delivery.notes ?? null,
            subtotalCents,
            deliveryFeeCents,
            totalCents,
            currency
          ]
        );

        const orderItems = await this.insertCustomerOrderItems(client, order.rows[0].id, orderLines);
        const authorization = await this.payments.authorizeCustomerOrderPayment(client, {
          jobId: job.rows[0].id,
          consumerId,
          paymentMethodId: payload.paymentMethodId,
          idempotencyKey: parsedIdempotencyKey.data,
          requestId
        });
        const orderStatus = authorization.body.status === "AUTHORIZED" ? "PAYMENT_AUTHORIZED" : "PAYMENT_FAILED";
        const updatedOrder = await client.query<CustomerOrderRow>(
          `update public.customer_orders
           set status = $1,
               updated_at = now()
           where id = $2
           returning id, restaurant_id, org_id, job_id, payment_id, customer_user_id, customer_name,
             customer_email, customer_phone, delivery_address, delivery_notes, status, subtotal_cents,
             delivery_fee_cents, total_cents, currency, created_at, updated_at`,
          [orderStatus, order.rows[0].id]
        );

        return {
          responseCode: 201,
          body: this.mapCustomerOrderSubmission(updatedOrder.rows[0], orderItems, job.rows[0], authorization.body)
        };
      }
    });

    this.logger.info({ restaurant_slug: normalizedSlug, replay: result.replay }, "customer_order_submitted");
    return result;
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

  private async upsertCustomerUser(email: string, displayName: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const result = await this.pg.query<{ id: string }>(
      `with inserted as (
         insert into public.users (id, email, display_name)
         values ($1, $2, $3)
         on conflict (email) do nothing
         returning id
       )
       select id from inserted
       union all
       select id from public.users where email = $2
       limit 1`,
      [randomUUID(), normalizedEmail, displayName.trim()]
    );

    if (result.rowCount !== 1) {
      throw new ConflictException("customer_user_not_available");
    }

    return result.rows[0].id;
  }

  private async loadActiveRestaurantBySlug(client: PoolClient, slug: string) {
    const result = await client.query<RestaurantRow>(
      `select id, org_id, name, slug, status, created_at, updated_at
       from public.restaurants
       where slug = $1
         and status = 'ACTIVE'`,
      [slug]
    );

    if (result.rowCount !== 1) {
      throw new NotFoundException("restaurant_not_found");
    }

    return result.rows[0];
  }

  private async loadOrderableMenuLines(
    client: PoolClient,
    restaurantId: string,
    items: Array<{ menuItemId: string; quantity: number }>
  ) {
    const quantities = new Map(items.map((item) => [item.menuItemId, item.quantity]));
    const ids = [...quantities.keys()];
    const result = await client.query<OrderableMenuItemRow>(
      `select mi.id, mi.restaurant_id, mi.category_id, mi.name, mi.description, mi.price_cents,
              mi.currency, mi.is_active, mi.sort_order, mi.created_at, mi.updated_at,
              mc.is_active as category_active
       from public.menu_items mi
       join public.menu_categories mc
         on mc.id = mi.category_id
        and mc.restaurant_id = mi.restaurant_id
       where mi.restaurant_id = $1
         and mi.id = any($2::uuid[])
         and mi.is_active = true
         and mc.is_active = true`,
      [restaurantId, ids]
    );

    if (result.rows.length !== ids.length) {
      throw new UnprocessableEntityException("menu_item_not_orderable");
    }

    return result.rows.map((row) => {
      const quantity = quantities.get(row.id) ?? 0;
      const unitPriceCents = toInteger(row.price_cents, "menu_item.price_cents");
      return {
        menuItemId: row.id,
        name: row.name,
        quantity,
        unitPriceCents,
        lineTotalCents: unitPriceCents * quantity,
        currency: row.currency.toUpperCase()
      };
    });
  }

  private assertSingleCurrency(orderLines: Array<{ currency: string }>) {
    const currency = orderLines[0]?.currency ?? "GBP";
    if (!orderLines.every((line) => line.currency === currency)) {
      throw new UnprocessableEntityException("mixed_currency_orders_not_supported");
    }

    return currency;
  }

  private async insertCustomerJobSideEffects(
    client: PoolClient,
    input: {
      requestId: string;
      consumerId: string;
      orgId: string;
      jobId: string;
      quoteId: string;
      restaurantId: string;
      itemCount: number;
    }
  ) {
    await client.query(
      `insert into public.job_events (job_id, event_type, actor_id, payload)
       values ($1, 'CUSTOMER_ORDER_SUBMITTED', $2, $3::jsonb)`,
      [
        input.jobId,
        input.consumerId,
        JSON.stringify({
          requestId: input.requestId,
          quoteId: input.quoteId,
          restaurantId: input.restaurantId,
          itemCount: input.itemCount
        })
      ]
    );

    await client.query(
      `insert into public.audit_log (request_id, actor_id, org_id, entity_type, entity_id, action, metadata)
       values ($1, $2, $3, 'customer_order', $4, 'customer_order_submitted', $5::jsonb)`,
      [
        input.requestId,
        input.consumerId,
        input.orgId,
        input.jobId,
        JSON.stringify({
          quoteId: input.quoteId,
          restaurantId: input.restaurantId,
          itemCount: input.itemCount
        })
      ]
    );

    await client.query(
      `insert into public.outbox_messages (
         aggregate_type,
         aggregate_id,
         event_type,
         payload,
         idempotency_key
       ) values ($1, $2, $3, $4::jsonb, $5)`,
      [
        "job",
        input.jobId,
        "JOB_DISPATCH_REQUESTED",
        JSON.stringify({
          jobId: input.jobId,
          requestId: input.requestId,
          trigger: "customer_order_submitted"
        }),
        `dispatch:${input.jobId}`
      ]
    );
  }

  private async insertCustomerOrderItems(
    client: PoolClient,
    orderId: string,
    lines: Array<{
      menuItemId: string;
      name: string;
      quantity: number;
      unitPriceCents: number;
      lineTotalCents: number;
      currency: string;
    }>
  ): Promise<PublicCustomerOrderItemDto[]> {
    const inserted: PublicCustomerOrderItemDto[] = [];
    for (const line of lines) {
      const result = await client.query<CustomerOrderItemRow>(
        `insert into public.customer_order_items (
           order_id,
           menu_item_id,
           name,
           quantity,
           unit_price_cents,
           line_total_cents,
           currency
         ) values ($1, $2, $3, $4, $5, $6, $7)
         returning id, order_id, menu_item_id, name, quantity, unit_price_cents, line_total_cents, currency, created_at`,
        [
          orderId,
          line.menuItemId,
          line.name,
          line.quantity,
          line.unitPriceCents,
          line.lineTotalCents,
          line.currency
        ]
      );
      inserted.push(this.mapCustomerOrderItem(result.rows[0]));
    }

    return inserted;
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

  private mapPublicItem(row: MenuItemRow) {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      priceCents: toInteger(row.price_cents, "menu_item.price_cents"),
      currency: row.currency.toUpperCase(),
      sortOrder: toInteger(row.sort_order, "menu_item.sort_order")
    };
  }

  private mapCustomerOrderItem(row: CustomerOrderItemRow): PublicCustomerOrderItemDto {
    return {
      id: row.id,
      menuItemId: row.menu_item_id,
      name: row.name,
      quantity: toInteger(row.quantity, "customer_order_item.quantity"),
      unitPriceCents: toInteger(row.unit_price_cents, "customer_order_item.unit_price_cents"),
      lineTotalCents: toInteger(row.line_total_cents, "customer_order_item.line_total_cents"),
      currency: row.currency.toUpperCase()
    };
  }

  private mapCustomerOrder(row: CustomerOrderRow, items: PublicCustomerOrderItemDto[]): PublicCustomerOrderDto {
    return PublicCustomerOrderSchema.parse({
      id: row.id,
      restaurantId: row.restaurant_id,
      jobId: row.job_id,
      paymentId: row.payment_id,
      status: row.status,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      customerPhone: row.customer_phone,
      deliveryAddress: row.delivery_address,
      deliveryNotes: row.delivery_notes,
      subtotalCents: toInteger(row.subtotal_cents, "customer_order.subtotal_cents"),
      deliveryFeeCents: toInteger(row.delivery_fee_cents, "customer_order.delivery_fee_cents"),
      totalCents: toInteger(row.total_cents, "customer_order.total_cents"),
      currency: row.currency.toUpperCase(),
      createdAt: toIsoDateTime(row.created_at),
      items
    });
  }

  private mapCustomerOrderSubmission(
    order: CustomerOrderRow,
    items: PublicCustomerOrderItemDto[],
    job: PublicOrderJobRow,
    payment: PaymentDto
  ): SubmitCustomerOrderResponseDto {
    return SubmitCustomerOrderResponseSchema.parse({
      order: this.mapCustomerOrder(order, items),
      job: {
        id: job.id,
        status: job.status,
        etaMinutes: toInteger(job.eta_minutes, "customer_order_job.eta_minutes"),
        pickupAddress: job.pickup_address,
        dropoffAddress: job.dropoff_address
      },
      payment: {
        id: payment.id,
        status: payment.status,
        amountAuthorizedCents: payment.amountAuthorizedCents,
        amountCapturedCents: payment.amountCapturedCents,
        totalCents: payment.customerTotalCents,
        currency: payment.currency.toUpperCase(),
        lastError: payment.lastError
      }
    });
  }
}
