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
  AdminMenuHistorySchema,
  ApplyMenuRollbackSchema,
  CreateMenuCategorySchema,
  CreateMenuItemSchema,
  CreateRestaurantSchema,
  IdempotencyHeaderSchema,
  MenuCategorySchema,
  MenuHistorySchema,
  MenuRollbackPreviewSchema,
  MenuRollbackResultSchema,
  MenuItemSchema,
  PublicCustomerOrderSchema,
  PublicRestaurantMenuSchema,
  RestaurantListSchema,
  RestaurantMenuSchema,
  RestaurantSchema,
  SubmitCustomerOrderResponseSchema,
  SubmitCustomerOrderSchema,
  UpdateMenuItemSchema,
  UpdateMenuCategorySchema,
  type AdminMenuHistoryDto,
  type AdminMenuHistoryEventDto,
  type MenuRollbackPreviewDto,
  type MenuRollbackResultDto,
  type MenuCategoryDto,
  type MenuHistoryDto,
  type MenuHistoryEventDto,
  type MenuHistoryEventType,
  type MenuRollbackReadiness,
  type MenuItemDto,
  type PaymentDto,
  BusinessCustomerOrderListSchema,
  BusinessCustomerOrderSchema,
  PublicOrderTrackingSchema,
  type PublicCustomerOrderDto,
  type PublicCustomerOrderItemDto,
  type PublicMenuItemDto,
  type PublicOrderTrackingDto,
  type PublicRestaurantMenuDto,
  type RestaurantDto,
  type RestaurantMenuDto,
  type SubmitCustomerOrderResponseDto,
  type BusinessCustomerOrderDto
} from "@shipwright/contracts";
import { createLogger } from "@shipwright/observability";
import type { PoolClient, QueryResultRow } from "pg";
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

type MenuHistoryRow = {
  id: string | number;
  actor_name: string | null;
  actor_email: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  metadata: Record<string, unknown> | string | null;
  created_at: string | Date;
  category_name: string | null;
  item_name: string | null;
};

type AdminMenuHistoryRow = MenuHistoryRow & {
  org_id: string | null;
  org_name: string | null;
  restaurant_id: string | null;
  restaurant_name: string | null;
};

type MenuRollbackResourceRow = MenuCategoryRow | MenuItemRow;
type QueryRunner = {
  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<{ rowCount: number; rows: T[] }>;
};

type MenuRollbackPreviewInternal = MenuRollbackPreviewDto & {
  restaurant: RestaurantRow;
  history: MenuHistoryEventDto;
  currentValues: Record<string, unknown>;
  rollbackValues: Record<string, unknown>;
  expectedValues: Record<string, unknown>;
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
  status: "SUBMITTED" | "PAYMENT_AUTHORIZED" | "PAYMENT_FAILED" | "COMPLETED" | "FULFILLED";
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

type BusinessCustomerOrderRow = CustomerOrderRow & {
  restaurant_name: string;
  restaurant_slug: string;
  payment_status: string;
  payment_amount_authorized_cents: number;
  payment_amount_captured_cents: number;
  payment_customer_total_cents: number;
  payment_currency: string;
  payment_last_error: string | null;
  job_status: string;
  job_eta_minutes: number;
  job_pickup_address: string;
  job_dropoff_address: string;
};

type PublicOrderTrackingRow = CustomerOrderRow & {
  restaurant_name: string;
  restaurant_slug: string;
  payment_status: string;
  payment_amount_authorized_cents: number;
  payment_amount_captured_cents: number;
  payment_customer_total_cents: number;
  payment_currency: string;
  payment_last_error: string | null;
  job_status: string;
  job_eta_minutes: number;
  job_pickup_address: string;
  job_dropoff_address: string;
  assigned_driver_id: string | null;
  driver_last_location_at: string | Date | null;
};

type CustomerOrderTimelineRow = {
  id: string | number;
  event_type: string;
  created_at: string | Date;
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

function normalizeCustomerOrderStatus(status: CustomerOrderRow["status"]): "SUBMITTED" | "PAYMENT_AUTHORIZED" | "PAYMENT_FAILED" | "FULFILLED" {
  if (status === "COMPLETED") {
    return "FULFILLED";
  }

  return status;
}
const PILOT_ORDER_VEHICLE_TYPE = (process.env.PILOT_ORDER_VEHICLE_TYPE === "CAR" ? "CAR" : "BIKE") as "BIKE" | "CAR";
const PILOT_ORDER_DISTANCE_MILES = Number(process.env.PILOT_ORDER_DISTANCE_MILES ?? "4.8");
const PILOT_ORDER_ETA_MINUTES = Number(process.env.PILOT_ORDER_ETA_MINUTES ?? "22");
const PILOT_ORDER_PICKUP_LATITUDE = Number(process.env.PILOT_ORDER_PICKUP_LATITUDE ?? "51.5254");
const PILOT_ORDER_PICKUP_LONGITUDE = Number(process.env.PILOT_ORDER_PICKUP_LONGITUDE ?? "-0.1099");
const PILOT_ORDER_DROPOFF_LATITUDE = Number(process.env.PILOT_ORDER_DROPOFF_LATITUDE ?? "51.5396");
const PILOT_ORDER_DROPOFF_LONGITUDE = Number(process.env.PILOT_ORDER_DROPOFF_LONGITUDE ?? "-0.1026");
const MENU_AUDIT_ACTIONS = [
  "menu_category_created",
  "menu_category_updated",
  "menu_category_rollback_applied",
  "menu_item_created",
  "menu_item_updated",
  "menu_item_rollback_applied"
];
const MENU_HISTORY_EVENT_TYPES: MenuHistoryEventType[] = [
  "MENU_CATEGORY_CREATED",
  "MENU_CATEGORY_UPDATED",
  "MENU_CATEGORY_REORDERED",
  "MENU_CATEGORY_ROLLBACK_APPLIED",
  "MENU_ITEM_CREATED",
  "MENU_ITEM_UPDATED",
  "MENU_ITEM_PRICE_UPDATED",
  "MENU_ITEM_VISIBILITY_UPDATED",
  "MENU_ITEM_REORDERED",
  "MENU_ITEM_MOVED_CATEGORY",
  "MENU_ITEM_ROLLBACK_APPLIED"
];
const REVERSIBLE_MENU_FIELDS = new Set(["name", "description", "priceCents", "isActive", "sortOrder", "categoryId"]);

function normalizeRestaurantSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function parseAuditMetadata(value: MenuHistoryRow["metadata"]): Record<string, unknown> {
  if (!value) {
    return {};
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }

  return value;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function readRecord(value: unknown) {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }

  return null;
}

function hasOwnValue(record: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function formatAuditPrice(value: unknown) {
  const cents = readNumber(value);
  return cents === null ? null : `£${(cents / 100).toFixed(2)}`;
}

function getMenuHistoryEventType(
  action: string,
  resourceType: "category" | "item",
  changedFields: string[]
): MenuHistoryEventType {
  if (action === "menu_category_created") {
    return "MENU_CATEGORY_CREATED";
  }

  if (action === "menu_item_created") {
    return "MENU_ITEM_CREATED";
  }

  if (action === "menu_category_rollback_applied") {
    return "MENU_CATEGORY_ROLLBACK_APPLIED";
  }

  if (action === "menu_item_rollback_applied") {
    return "MENU_ITEM_ROLLBACK_APPLIED";
  }

  if (resourceType === "category" && changedFields.length === 1 && changedFields[0] === "sortOrder") {
    return "MENU_CATEGORY_REORDERED";
  }

  if (resourceType === "category") {
    return "MENU_CATEGORY_UPDATED";
  }

  if (changedFields.length === 1 && changedFields[0] === "priceCents") {
    return "MENU_ITEM_PRICE_UPDATED";
  }

  if (changedFields.length === 1 && changedFields[0] === "isActive") {
    return "MENU_ITEM_VISIBILITY_UPDATED";
  }

  if (changedFields.length === 1 && changedFields[0] === "sortOrder") {
    return "MENU_ITEM_REORDERED";
  }

  if (changedFields.length === 1 && changedFields[0] === "categoryId") {
    return "MENU_ITEM_MOVED_CATEGORY";
  }

  return "MENU_ITEM_UPDATED";
}

function buildMenuHistorySummary(eventType: MenuHistoryEventType, resourceName: string | null, metadata: Record<string, unknown>) {
  const name = resourceName ?? "Menu record";
  const previous = readRecord(metadata.previous);
  const next = readRecord(metadata.next);

  if (eventType === "MENU_CATEGORY_CREATED") {
    return `${name} section was created.`;
  }

  if (eventType === "MENU_CATEGORY_REORDERED") {
    return `${name} section moved from position ${readNumber(previous.sortOrder) ?? "unknown"} to ${readNumber(next.sortOrder) ?? "unknown"}.`;
  }

  if (eventType === "MENU_CATEGORY_UPDATED") {
    return `${name} section details were updated.`;
  }

  if (eventType === "MENU_CATEGORY_ROLLBACK_APPLIED") {
    return `${name} section was restored from a previous menu change.`;
  }

  if (eventType === "MENU_ITEM_CREATED") {
    return `${name} was added to the menu.`;
  }

  if (eventType === "MENU_ITEM_PRICE_UPDATED") {
    return `${name} price changed from ${formatAuditPrice(previous.priceCents) ?? "unknown"} to ${formatAuditPrice(next.priceCents) ?? "unknown"}.`;
  }

  if (eventType === "MENU_ITEM_VISIBILITY_UPDATED") {
    return `${name} was ${next.isActive === false ? "hidden from" : "made live on"} the public menu.`;
  }

  if (eventType === "MENU_ITEM_REORDERED") {
    return `${name} moved from position ${readNumber(previous.sortOrder) ?? "unknown"} to ${readNumber(next.sortOrder) ?? "unknown"}.`;
  }

  if (eventType === "MENU_ITEM_MOVED_CATEGORY") {
    return `${name} moved to another section.`;
  }

  if (eventType === "MENU_ITEM_ROLLBACK_APPLIED") {
    return `${name} was restored from a previous menu change.`;
  }

  return `${name} details were updated.`;
}

function classifyMenuRollbackReadiness(
  eventType: MenuHistoryEventType,
  changedFields: string[],
  metadata: Record<string, unknown>
): { rollbackReadiness: MenuRollbackReadiness; rollbackReason: string; reversibleFields: string[] } {
  if (
    eventType === "MENU_CATEGORY_CREATED" ||
    eventType === "MENU_ITEM_CREATED" ||
    eventType === "MENU_CATEGORY_ROLLBACK_APPLIED" ||
    eventType === "MENU_ITEM_ROLLBACK_APPLIED"
  ) {
    return {
      rollbackReadiness: "NOT_REVERSIBLE",
      rollbackReason: "Create events are audit-only in this version and cannot be rolled back safely.",
      reversibleFields: []
    };
  }

  const previous = readRecord(metadata.previous);
  const next = readRecord(metadata.next);
  const candidateFields = changedFields.filter((field) => REVERSIBLE_MENU_FIELDS.has(field));

  if (!candidateFields.length) {
    return {
      rollbackReadiness: "INSUFFICIENT_METADATA",
      rollbackReason: "No reversible menu fields were recorded for this change.",
      reversibleFields: []
    };
  }

  const reversibleFields = candidateFields.filter((field) => hasOwnValue(previous, field) && hasOwnValue(next, field));
  if (reversibleFields.length !== candidateFields.length) {
    return {
      rollbackReadiness: "INSUFFICIENT_METADATA",
      rollbackReason: "This audit event is missing previous or new values needed for future rollback.",
      reversibleFields
    };
  }

  return {
    rollbackReadiness: "ROLLBACK_PREPARED",
    rollbackReason: "This event has previous and new values for reversible menu fields and can be previewed before rollback.",
    reversibleFields
  };
}

function valuesEqual(left: unknown, right: unknown) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function pickFields(record: Record<string, unknown>, fields: string[]) {
  return Object.fromEntries(fields.map((field) => [field, record[field] ?? null]));
}

function mapCategoryRollbackValues(row: MenuCategoryRow): Record<string, unknown> {
  return {
    name: row.name,
    sortOrder: toInteger(row.sort_order, "menu_category.sort_order"),
    isActive: row.is_active
  };
}

function mapItemRollbackValues(row: MenuItemRow): Record<string, unknown> {
  return {
    categoryId: row.category_id,
    name: row.name,
    description: row.description,
    priceCents: toInteger(row.price_cents, "menu_item.price_cents"),
    sortOrder: toInteger(row.sort_order, "menu_item.sort_order"),
    isActive: row.is_active
  };
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

  async listBusinessOrders(userId: string) {
    const orders = await this.pg.query<BusinessCustomerOrderRow>(
      `select ${this.businessOrderColumns()}
       from public.customer_orders o
       join public.restaurants r on r.id = o.restaurant_id
       join public.jobs j on j.id = o.job_id
       join public.payments p on p.id = o.payment_id
       where exists (
         select 1
         from public.org_memberships m
         where m.org_id = o.org_id
           and m.user_id = $1
           and m.is_active = true
           and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
       )
       order by o.created_at desc
       limit 50`,
      [userId]
    );

    const itemsByOrderId = await this.loadBusinessOrderItems(orders.rows.map((row) => row.id));
    return BusinessCustomerOrderListSchema.parse({
      items: orders.rows.map((row) => this.mapBusinessCustomerOrder(row, itemsByOrderId.get(row.id) ?? [], []))
    });
  }

  async getBusinessOrder(orderId: string, userId: string) {
    const orders = await this.pg.query<BusinessCustomerOrderRow>(
      `select ${this.businessOrderColumns()}
       from public.customer_orders o
       join public.restaurants r on r.id = o.restaurant_id
       join public.jobs j on j.id = o.job_id
       join public.payments p on p.id = o.payment_id
       where o.id = $1
         and exists (
           select 1
           from public.org_memberships m
           where m.org_id = o.org_id
             and m.user_id = $2
             and m.is_active = true
             and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
         )
       limit 1`,
      [orderId, userId]
    );

    if (orders.rowCount !== 1) {
      throw new NotFoundException("customer_order_not_found");
    }

    const order = orders.rows[0];
    const [itemsByOrderId, timeline] = await Promise.all([
      this.loadBusinessOrderItems([order.id]),
      this.loadBusinessOrderTimeline(order.job_id)
    ]);

    return this.mapBusinessCustomerOrder(order, itemsByOrderId.get(order.id) ?? [], timeline);
  }

  async getPublicOrderTracking(orderId: string): Promise<PublicOrderTrackingDto> {
    const orders = await this.pg.query<PublicOrderTrackingRow>(
      `select o.id, o.restaurant_id, o.org_id, o.job_id, o.payment_id, o.customer_user_id,
              o.customer_name, o.customer_email, o.customer_phone, o.delivery_address, o.delivery_notes,
              o.status, o.subtotal_cents, o.delivery_fee_cents, o.total_cents, o.currency,
              o.created_at, o.updated_at,
              r.name as restaurant_name, r.slug as restaurant_slug,
              p.status as payment_status, p.amount_authorized_cents as payment_amount_authorized_cents,
              p.amount_captured_cents as payment_amount_captured_cents,
              p.customer_total_cents as payment_customer_total_cents, p.currency as payment_currency,
              p.last_error as payment_last_error,
              j.status as job_status, j.eta_minutes as job_eta_minutes,
              j.pickup_address as job_pickup_address, j.dropoff_address as job_dropoff_address,
              j.assigned_driver_id, d.last_location_at as driver_last_location_at
       from public.customer_orders o
       join public.restaurants r on r.id = o.restaurant_id
       join public.jobs j on j.id = o.job_id
       join public.payments p on p.id = o.payment_id
       left join public.drivers d on d.id = j.assigned_driver_id
       where o.id = $1
       limit 1`,
      [orderId]
    );

    if (orders.rowCount !== 1) {
      throw new NotFoundException("customer_order_not_found");
    }

    const order = orders.rows[0];
    const timeline = await this.loadBusinessOrderTimeline(order.job_id);
    return this.mapPublicOrderTracking(order, timeline);
  }

  async createMenuCategory(restaurantId: string, input: unknown, userId: string, idempotencyKey: string) {
    const parsed = CreateMenuCategorySchema.safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        message: "invalid_menu_category_payload",
        issues: parsed.error.issues
      });
    }

    const restaurant = await this.loadOperatorRestaurant(restaurantId, userId);

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
        const category = inserted.rows[0];

        await client.query(
          `insert into public.audit_log (request_id, actor_id, org_id, entity_type, entity_id, action, metadata)
           values ($1, $2, $3, 'menu_category', $4, 'menu_category_created', $5::jsonb)`,
          [
            randomUUID(),
            userId,
            restaurant.org_id,
            category.id,
            JSON.stringify({
              restaurantId,
              restaurantName: restaurant.name,
              resourceType: "category",
              resourceId: category.id,
              resourceName: category.name,
              categoryName: category.name,
              sortOrder: toInteger(category.sort_order, "menu_category.sort_order"),
              isActive: category.is_active,
              changedFields: ["name", "sortOrder", "isActive"],
              next: {
                name: category.name,
                sortOrder: toInteger(category.sort_order, "menu_category.sort_order"),
                isActive: category.is_active
              }
            })
          ]
        );

        return {
          responseCode: 201,
          body: this.mapCategory(category)
        };
      }
    });

    this.logger.info({ actor_id: userId, restaurant_id: restaurantId, replay: result.replay }, "menu_category_created");
    return result;
  }

  async updateMenuCategory(
    restaurantId: string,
    categoryId: string,
    input: unknown,
    userId: string
  ): Promise<MenuCategoryDto> {
    const parsed = UpdateMenuCategorySchema.safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        message: "invalid_menu_category_payload",
        issues: parsed.error.issues
      });
    }

    const restaurant = await this.loadOperatorRestaurant(restaurantId, userId);
    const existingResult = await this.pg.query<MenuCategoryRow>(
      `select id, restaurant_id, name, sort_order, is_active, created_at, updated_at
       from public.menu_categories
       where id = $1 and restaurant_id = $2`,
      [categoryId, restaurantId]
    );
    const existing = existingResult.rows[0];
    if (!existing) {
      throw new NotFoundException("menu_category_not_found");
    }

    const next = {
      name: parsed.data.name ?? existing.name,
      sortOrder: parsed.data.sortOrder ?? toInteger(existing.sort_order, "menu_category.sort_order"),
      isActive: parsed.data.isActive ?? existing.is_active
    };
    const previousSortOrder = toInteger(existing.sort_order, "menu_category.sort_order");

    const result = await this.pg.query<MenuCategoryRow>(
      `update public.menu_categories
       set name = $3,
           sort_order = $4,
           is_active = $5,
           updated_at = now()
       where id = $1
         and restaurant_id = $2
       returning id, restaurant_id, name, sort_order, is_active, created_at, updated_at`,
      [categoryId, restaurantId, next.name, next.sortOrder, next.isActive]
    );
    const updated = result.rows[0];

    await this.pg.query(
      `insert into public.audit_log (request_id, actor_id, org_id, entity_type, entity_id, action, metadata)
       values ($1, $2, $3, 'menu_category', $4, 'menu_category_updated', $5::jsonb)`,
      [
        randomUUID(),
        userId,
        restaurant.org_id,
        categoryId,
        JSON.stringify({
          restaurantId,
          restaurantName: restaurant.name,
          resourceType: "category",
          resourceId: categoryId,
          resourceName: next.name,
          categoryName: next.name,
          changedFields: Object.keys(parsed.data),
          previous: {
            name: existing.name,
            sortOrder: previousSortOrder,
            isActive: existing.is_active
          },
          next
        })
      ]
    );

    this.logger.info({ actor_id: userId, restaurant_id: restaurantId, category_id: categoryId }, "menu_category_updated");
    return this.mapCategory(updated);
  }

  async createMenuItem(restaurantId: string, input: unknown, userId: string, idempotencyKey: string) {
    const parsed = CreateMenuItemSchema.safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        message: "invalid_menu_item_payload",
        issues: parsed.error.issues
      });
    }

    const restaurant = await this.loadOperatorRestaurant(restaurantId, userId);

    const categoryResult = await this.pg.query<{ id: string; name: string }>(
      `select id, name
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
        const item = inserted.rows[0];

        await client.query(
          `insert into public.audit_log (request_id, actor_id, org_id, entity_type, entity_id, action, metadata)
           values ($1, $2, $3, 'menu_item', $4, 'menu_item_created', $5::jsonb)`,
          [
            randomUUID(),
            userId,
            restaurant.org_id,
            item.id,
            JSON.stringify({
              restaurantId,
              restaurantName: restaurant.name,
              resourceType: "item",
              resourceId: item.id,
              resourceName: item.name,
              categoryId: item.category_id,
              categoryName: categoryResult.rows[0]?.name ?? null,
              itemName: item.name,
              priceCents: toInteger(item.price_cents, "menu_item.price_cents"),
              isActive: item.is_active,
              sortOrder: toInteger(item.sort_order, "menu_item.sort_order"),
              changedFields: ["categoryId", "name", "description", "priceCents", "currency", "sortOrder", "isActive"],
              next: {
                categoryId: item.category_id,
                name: item.name,
                description: item.description,
                priceCents: toInteger(item.price_cents, "menu_item.price_cents"),
                sortOrder: toInteger(item.sort_order, "menu_item.sort_order"),
                isActive: item.is_active
              }
            })
          ]
        );

        return {
          responseCode: 201,
          body: this.mapItem(item)
        };
      }
    });

    this.logger.info({ actor_id: userId, restaurant_id: restaurantId, replay: result.replay }, "menu_item_created");
    return result;
  }

  async updateMenuItem(restaurantId: string, itemId: string, input: unknown, userId: string): Promise<MenuItemDto> {
    const parsed = UpdateMenuItemSchema.safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        message: "invalid_menu_item_payload",
        issues: parsed.error.issues
      });
    }

    const restaurant = await this.loadOperatorRestaurant(restaurantId, userId);
    let nextCategoryName: string | null = null;
    if (parsed.data.categoryId) {
      const categoryResult = await this.pg.query<{ id: string; name: string }>(
        `select id, name
         from public.menu_categories
         where id = $1 and restaurant_id = $2`,
        [parsed.data.categoryId, restaurantId]
      );

      if (categoryResult.rowCount !== 1) {
        throw new NotFoundException("menu_category_not_found");
      }
      nextCategoryName = categoryResult.rows[0]?.name ?? null;
    }

    const existingResult = await this.pg.query<MenuItemRow>(
      `select id, restaurant_id, category_id, name, description, price_cents, currency, is_active, sort_order, created_at, updated_at
       from public.menu_items
       where id = $1 and restaurant_id = $2`,
      [itemId, restaurantId]
    );
    const existing = existingResult.rows[0];
    if (!existing) {
      throw new NotFoundException("menu_item_not_found");
    }

    const next = {
      categoryId: parsed.data.categoryId ?? existing.category_id,
      name: parsed.data.name ?? existing.name,
      description: Object.prototype.hasOwnProperty.call(parsed.data, "description")
        ? (parsed.data.description ?? null)
        : existing.description,
      priceCents: parsed.data.priceCents ?? toInteger(existing.price_cents, "menu_item.price_cents"),
      sortOrder: parsed.data.sortOrder ?? toInteger(existing.sort_order, "menu_item.sort_order"),
      isActive: parsed.data.isActive ?? existing.is_active
    };
    const previous = {
      categoryId: existing.category_id,
      name: existing.name,
      description: existing.description,
      priceCents: toInteger(existing.price_cents, "menu_item.price_cents"),
      sortOrder: toInteger(existing.sort_order, "menu_item.sort_order"),
      isActive: existing.is_active
    };

    const result = await this.pg.query<MenuItemRow>(
      `update public.menu_items
       set category_id = $3,
           name = $4,
           description = $5,
           price_cents = $6,
           sort_order = $7,
           is_active = $8,
           updated_at = now()
       where id = $1
         and restaurant_id = $2
       returning id, restaurant_id, category_id, name, description, price_cents, currency, is_active, sort_order, created_at, updated_at`,
      [itemId, restaurantId, next.categoryId, next.name, next.description, next.priceCents, next.sortOrder, next.isActive]
    );
    const updated = result.rows[0];

    await this.pg.query(
      `insert into public.audit_log (request_id, actor_id, org_id, entity_type, entity_id, action, metadata)
       values ($1, $2, $3, 'menu_item', $4, 'menu_item_updated', $5::jsonb)`,
      [
        randomUUID(),
        userId,
        restaurant.org_id,
        itemId,
        JSON.stringify({
          restaurantId,
          restaurantName: restaurant.name,
          resourceType: "item",
          resourceId: itemId,
          resourceName: next.name,
          itemName: next.name,
          categoryId: next.categoryId,
          categoryName: nextCategoryName,
          changedFields: Object.keys(parsed.data),
          previous,
          next
        })
      ]
    );

    this.logger.info({ actor_id: userId, restaurant_id: restaurantId, item_id: itemId }, "menu_item_updated");
    return this.mapItem(updated);
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

  async getRestaurantMenuHistory(restaurantId: string, userId: string): Promise<MenuHistoryDto> {
    const restaurant = await this.loadOperatorRestaurant(restaurantId, userId);
    const result = await this.pg.query<MenuHistoryRow>(
      `select
          a.id,
          u.display_name as actor_name,
          u.email as actor_email,
          a.entity_type,
          a.entity_id,
          a.action,
          a.metadata,
          a.created_at,
          mc.name as category_name,
          mi.name as item_name
       from public.audit_log a
       left join public.users u on u.id = a.actor_id
       left join public.menu_categories mc
         on a.entity_type = 'menu_category'
        and mc.id = a.entity_id
       left join public.menu_items mi
         on a.entity_type = 'menu_item'
        and mi.id = a.entity_id
       where a.org_id = $1
         and a.action = any($3)
         and a.metadata->>'restaurantId' = $2
       order by a.created_at desc
       limit 40`,
      [restaurant.org_id, restaurantId, MENU_AUDIT_ACTIONS]
    );

    return MenuHistorySchema.parse({
      items: result.rows.map((row) => this.mapMenuHistoryRow(row))
    });
  }

  async getMenuRollbackPreview(restaurantId: string, auditId: string, userId: string): Promise<MenuRollbackPreviewDto> {
    const restaurant = await this.loadOperatorRestaurant(restaurantId, userId);
    const preview = await this.buildMenuRollbackPreview(this.pg as QueryRunner, restaurant, auditId);
    return MenuRollbackPreviewSchema.parse({
      auditId: preview.auditId,
      eligible: preview.eligible,
      reason: preview.reason,
      eventType: preview.eventType,
      resourceType: preview.resourceType,
      resourceId: preview.resourceId,
      resourceName: preview.resourceName,
      fields: preview.fields,
      warnings: preview.warnings
    });
  }

  async applyMenuRollback(
    restaurantId: string,
    auditId: string,
    input: unknown,
    userId: string,
    idempotencyKey: string
  ): Promise<{ replay: boolean; responseCode: number; body: MenuRollbackResultDto }> {
    const parsed = ApplyMenuRollbackSchema.safeParse(input);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        message: "invalid_menu_rollback_payload",
        issues: parsed.error.issues
      });
    }

    const restaurant = await this.loadOperatorRestaurant(restaurantId, userId);
    const result = await this.pg.withIdempotency<MenuRollbackResultDto>({
      actorId: userId,
      endpoint: `/v1/business/restaurants/${restaurantId}/menu-history/${auditId}/rollback`,
      idempotencyKey,
      execute: async (client) => {
        const preview = await this.buildMenuRollbackPreview(client as QueryRunner, restaurant, auditId);
        if (!preview.eligible || !preview.resourceType || !preview.resourceId) {
          throw new UnprocessableEntityException({
            message: "menu_rollback_not_available",
            reason: preview.reason
          });
        }

        if (preview.warnings.length > 0) {
          throw new ConflictException({
            message: "menu_rollback_current_state_changed",
            warnings: preview.warnings
          });
        }

        const fields = preview.history.reversibleFields;
        const rollbackValues = preview.rollbackValues;
        let rollbackAuditId: string;
        let appliedAt: string;

        if (preview.resourceType === "category") {
          const current = preview.currentValues;
          const next = {
            name: typeof rollbackValues.name === "string" ? rollbackValues.name : current.name,
            sortOrder: typeof rollbackValues.sortOrder === "number" ? rollbackValues.sortOrder : current.sortOrder,
            isActive: typeof rollbackValues.isActive === "boolean" ? rollbackValues.isActive : current.isActive
          };
          await client.query<MenuCategoryRow>(
            `update public.menu_categories
             set name = $3,
                 sort_order = $4,
                 is_active = $5,
                 updated_at = now()
             where id = $1
               and restaurant_id = $2
             returning id, restaurant_id, name, sort_order, is_active, created_at, updated_at`,
            [preview.resourceId, restaurantId, next.name, next.sortOrder, next.isActive]
          );
          const audit = await client.query<{ id: string | number; created_at: string | Date }>(
            `insert into public.audit_log (request_id, actor_id, org_id, entity_type, entity_id, action, metadata)
             values ($1, $2, $3, 'menu_category', $4, 'menu_category_rollback_applied', $5::jsonb)
             returning id, created_at`,
            [
              randomUUID(),
              userId,
              restaurant.org_id,
              preview.resourceId,
              JSON.stringify({
                restaurantId,
                restaurantName: restaurant.name,
                resourceType: "category",
                resourceId: preview.resourceId,
                resourceName: next.name,
                categoryName: next.name,
                originalAuditId: auditId,
                restoredFields: fields,
                beforeRollback: preview.currentValues,
                afterRollback: pickFields(next, fields),
                confirmation: parsed.data.confirmation
              })
            ]
          );
          rollbackAuditId = String(audit.rows[0].id);
          appliedAt = toIsoDateTime(audit.rows[0].created_at);
        } else {
          const current = preview.currentValues;
          const next = {
            categoryId: typeof rollbackValues.categoryId === "string" ? rollbackValues.categoryId : current.categoryId,
            name: typeof rollbackValues.name === "string" ? rollbackValues.name : current.name,
            description: hasOwnValue(rollbackValues, "description") ? (rollbackValues.description as string | null) : (current.description as string | null),
            priceCents: typeof rollbackValues.priceCents === "number" ? rollbackValues.priceCents : current.priceCents,
            sortOrder: typeof rollbackValues.sortOrder === "number" ? rollbackValues.sortOrder : current.sortOrder,
            isActive: typeof rollbackValues.isActive === "boolean" ? rollbackValues.isActive : current.isActive
          };
          await client.query<MenuItemRow>(
            `update public.menu_items
             set category_id = $3,
                 name = $4,
                 description = $5,
                 price_cents = $6,
                 sort_order = $7,
                 is_active = $8,
                 updated_at = now()
             where id = $1
               and restaurant_id = $2
             returning id, restaurant_id, category_id, name, description, price_cents, currency, is_active, sort_order, created_at, updated_at`,
            [preview.resourceId, restaurantId, next.categoryId, next.name, next.description, next.priceCents, next.sortOrder, next.isActive]
          );
          const audit = await client.query<{ id: string | number; created_at: string | Date }>(
            `insert into public.audit_log (request_id, actor_id, org_id, entity_type, entity_id, action, metadata)
             values ($1, $2, $3, 'menu_item', $4, 'menu_item_rollback_applied', $5::jsonb)
             returning id, created_at`,
            [
              randomUUID(),
              userId,
              restaurant.org_id,
              preview.resourceId,
              JSON.stringify({
                restaurantId,
                restaurantName: restaurant.name,
                resourceType: "item",
                resourceId: preview.resourceId,
                resourceName: next.name,
                itemName: next.name,
                categoryId: next.categoryId,
                originalAuditId: auditId,
                restoredFields: fields,
                beforeRollback: preview.currentValues,
                afterRollback: pickFields(next, fields),
                confirmation: parsed.data.confirmation
              })
            ]
          );
          rollbackAuditId = String(audit.rows[0].id);
          appliedAt = toIsoDateTime(audit.rows[0].created_at);
        }

        return {
          responseCode: 200,
          body: MenuRollbackResultSchema.parse({
            auditId,
            rollbackAuditId,
            resourceType: preview.resourceType,
            resourceId: preview.resourceId,
            restoredFields: fields,
            warnings: preview.warnings,
            appliedAt
          })
        };
      }
    });

    this.logger.info({ actor_id: userId, restaurant_id: restaurantId, audit_id: auditId }, "menu_rollback_applied");
    return result;
  }

  async getAdminMenuHistory(query: Record<string, unknown> = {}): Promise<AdminMenuHistoryDto> {
    const filters: string[] = [
      `a.action = any($1)`,
      `a.entity_type in ('menu_category', 'menu_item')`
    ];
    const values: unknown[] = [MENU_AUDIT_ACTIONS];
    const addValue = (value: unknown) => {
      values.push(value);
      return `$${values.length}`;
    };
    const readFilter = (key: string) => (typeof query[key] === "string" && query[key].trim() ? query[key].trim() : null);
    const orgId = readFilter("orgId");
    const restaurantId = readFilter("restaurantId");
    const resourceType = readFilter("resourceType");
    const eventType = readFilter("eventType");
    const rollbackReadiness = readFilter("rollbackReadiness");
    const from = readFilter("from");
    const to = readFilter("to");
    const requestedLimit = Number(readFilter("limit") ?? 50);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 100) : 50;
    const queryLimit = eventType || rollbackReadiness ? Math.min(limit * 5, 250) : limit;

    if (orgId) {
      filters.push(`a.org_id = ${addValue(orgId)}`);
    }

    if (restaurantId) {
      filters.push(`a.metadata->>'restaurantId' = ${addValue(restaurantId)}`);
    }

    if (resourceType === "category") {
      filters.push(`a.entity_type = 'menu_category'`);
    } else if (resourceType === "item") {
      filters.push(`a.entity_type = 'menu_item'`);
    }

    if (from) {
      filters.push(`a.created_at >= ${addValue(from)}`);
    }

    if (to) {
      filters.push(`a.created_at <= ${addValue(to)}`);
    }

    const result = await this.pg.query<AdminMenuHistoryRow>(
      `select
          a.id,
          a.org_id,
          o.name as org_name,
          r.id as restaurant_id,
          r.name as restaurant_name,
          u.display_name as actor_name,
          u.email as actor_email,
          a.entity_type,
          a.entity_id,
          a.action,
          a.metadata,
          a.created_at,
          mc.name as category_name,
          mi.name as item_name
       from public.audit_log a
       left join public.orgs o on o.id = a.org_id
       left join public.restaurants r on r.id::text = a.metadata->>'restaurantId'
       left join public.users u on u.id = a.actor_id
       left join public.menu_categories mc
         on a.entity_type = 'menu_category'
        and mc.id = a.entity_id
       left join public.menu_items mi
         on a.entity_type = 'menu_item'
        and mi.id = a.entity_id
       where ${filters.join("\n         and ")}
       order by a.created_at desc
       limit ${addValue(queryLimit)}`,
      values
    );

    const normalizedEventType = MENU_HISTORY_EVENT_TYPES.includes(eventType as MenuHistoryEventType)
      ? (eventType as MenuHistoryEventType)
      : null;
    const items = result.rows
      .map((row) => this.mapAdminMenuHistoryRow(row))
      .filter((item) => !normalizedEventType || item.eventType === normalizedEventType)
      .filter((item) => !rollbackReadiness || item.rollbackReadiness === rollbackReadiness)
      .slice(0, limit);

    return AdminMenuHistorySchema.parse({ items });
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

        await this.insertCustomerJobSideEffects(client, {
          requestId,
          consumerId,
          orgId: restaurant.org_id,
          orderId: order.rows[0].id,
          jobId: job.rows[0].id,
          quoteId: quote.rows[0].id,
          restaurantId: restaurant.id,
          itemCount: orderLines.reduce((total, line) => total + line.quantity, 0)
        });

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

  private businessOrderColumns() {
    return `o.id, o.restaurant_id, o.org_id, o.job_id, o.payment_id, o.customer_user_id,
       o.customer_name, o.customer_email, o.customer_phone, o.delivery_address, o.delivery_notes,
       o.status, o.subtotal_cents, o.delivery_fee_cents, o.total_cents, o.currency,
       o.created_at, o.updated_at,
       r.name as restaurant_name, r.slug as restaurant_slug,
       p.status as payment_status, p.amount_authorized_cents as payment_amount_authorized_cents,
       p.amount_captured_cents as payment_amount_captured_cents,
       p.customer_total_cents as payment_customer_total_cents, p.currency as payment_currency,
       p.last_error as payment_last_error,
       j.status as job_status, j.eta_minutes as job_eta_minutes,
       j.pickup_address as job_pickup_address, j.dropoff_address as job_dropoff_address`;
  }

  private async loadBusinessOrderItems(orderIds: string[]) {
    const itemsByOrderId = new Map<string, PublicCustomerOrderItemDto[]>();
    if (orderIds.length === 0) {
      return itemsByOrderId;
    }

    const result = await this.pg.query<CustomerOrderItemRow>(
      `select id, order_id, menu_item_id, name, quantity, unit_price_cents,
              line_total_cents, currency, created_at
       from public.customer_order_items
       where order_id = any($1::uuid[])
       order by created_at asc`,
      [orderIds]
    );

    for (const row of result.rows) {
      const existing = itemsByOrderId.get(row.order_id) ?? [];
      existing.push(this.mapCustomerOrderItem(row));
      itemsByOrderId.set(row.order_id, existing);
    }

    return itemsByOrderId;
  }

  private async loadBusinessOrderTimeline(jobId: string) {
    const result = await this.pg.query<CustomerOrderTimelineRow>(
      `select id, event_type, created_at
       from public.job_events
       where job_id = $1
       order by created_at asc
       limit 100`,
      [jobId]
    );

    return result.rows;
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
      orderId: string;
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

    await client.query(
      `insert into public.outbox_messages (
         aggregate_type,
         aggregate_id,
         event_type,
         payload,
         idempotency_key
       ) values ($1, $2, $3, $4::jsonb, $5), ($6, $7, $8, $9::jsonb, $10)`,
      [
        "customer_order",
        input.orderId,
        "NOTIFY_CUSTOMER_ORDER_CONFIRMATION",
        JSON.stringify({
          orderId: input.orderId,
          jobId: input.jobId,
          requestId: input.requestId
        }),
        `notify-customer-order-confirmation:${input.orderId}`,
        "customer_order",
        input.orderId,
        "NOTIFY_BUSINESS_NEW_ORDER",
        JSON.stringify({
          orderId: input.orderId,
          jobId: input.jobId,
          requestId: input.requestId
        }),
        `notify-business-new-order:${input.orderId}`
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

  private async buildMenuRollbackPreview(
    runner: QueryRunner,
    restaurant: RestaurantRow,
    auditId: string
  ): Promise<MenuRollbackPreviewInternal> {
    const audit = await runner.query<MenuHistoryRow>(
      `select
          a.id,
          u.display_name as actor_name,
          u.email as actor_email,
          a.entity_type,
          a.entity_id,
          a.action,
          a.metadata,
          a.created_at,
          mc.name as category_name,
          mi.name as item_name
       from public.audit_log a
       left join public.users u on u.id = a.actor_id
       left join public.menu_categories mc
         on a.entity_type = 'menu_category'
        and mc.id = a.entity_id
       left join public.menu_items mi
         on a.entity_type = 'menu_item'
        and mi.id = a.entity_id
       where a.id::text = $1
         and a.org_id = $2
         and a.action = any($3)
         and a.metadata->>'restaurantId' = $4
       limit 1`,
      [auditId, restaurant.org_id, MENU_AUDIT_ACTIONS, restaurant.id]
    );

    if (audit.rowCount !== 1) {
      throw new NotFoundException("menu_history_event_not_found");
    }

    const history = this.mapMenuHistoryRow(audit.rows[0]);
    const metadata = parseAuditMetadata(audit.rows[0].metadata);
    const resourceId = readString(metadata.resourceId) ?? audit.rows[0].entity_id;
    const base = {
      auditId,
      eventType: history.eventType,
      resourceType: history.resourceType,
      resourceId,
      resourceName: history.resourceName,
      fields: [],
      warnings: []
    };

    if (history.rollbackReadiness !== "ROLLBACK_PREPARED") {
      return {
        ...base,
        eligible: false,
        reason: history.rollbackReason,
        restaurant,
        history,
        currentValues: {},
        rollbackValues: {},
        expectedValues: {}
      };
    }

    if (!resourceId) {
      return {
        ...base,
        eligible: false,
        reason: "The audit event does not identify the menu resource to restore.",
        restaurant,
        history,
        currentValues: {},
        rollbackValues: {},
        expectedValues: {}
      };
    }

    let currentValues: Record<string, unknown>;
    let resourceRow: MenuRollbackResourceRow | null = null;
    if (history.resourceType === "category") {
      const current = await runner.query<MenuCategoryRow>(
        `select id, restaurant_id, name, sort_order, is_active, created_at, updated_at
         from public.menu_categories
         where id = $1 and restaurant_id = $2
         limit 1`,
        [resourceId, restaurant.id]
      );
      resourceRow = current.rows[0] ?? null;
      currentValues = resourceRow ? mapCategoryRollbackValues(resourceRow as MenuCategoryRow) : {};
    } else {
      const current = await runner.query<MenuItemRow>(
        `select id, restaurant_id, category_id, name, description, price_cents, currency, is_active, sort_order, created_at, updated_at
         from public.menu_items
         where id = $1 and restaurant_id = $2
         limit 1`,
        [resourceId, restaurant.id]
      );
      resourceRow = current.rows[0] ?? null;
      currentValues = resourceRow ? mapItemRollbackValues(resourceRow as MenuItemRow) : {};
    }

    if (!resourceRow) {
      return {
        ...base,
        eligible: false,
        reason: "The menu resource no longer exists in this restaurant.",
        restaurant,
        history,
        currentValues: {},
        rollbackValues: {},
        expectedValues: {}
      };
    }

    const rollbackValues = readRecord(metadata.previous);
    const expectedValues = readRecord(metadata.next);

    if (history.reversibleFields.includes("categoryId")) {
      const rollbackCategoryId = readString(rollbackValues.categoryId);
      if (!rollbackCategoryId) {
        return {
          ...base,
          eligible: false,
          reason: "The audit event does not include the previous section needed for rollback.",
          restaurant,
          history,
          currentValues,
          rollbackValues,
          expectedValues
        };
      }

      const category = await runner.query<{ id: string }>(
        `select id from public.menu_categories where id = $1 and restaurant_id = $2 limit 1`,
        [rollbackCategoryId, restaurant.id]
      );
      if (category.rowCount !== 1) {
        return {
          ...base,
          eligible: false,
          reason: "The previous section for this item no longer exists.",
          restaurant,
          history,
          currentValues,
          rollbackValues,
          expectedValues
        };
      }
    }

    const warnings: string[] = [];
    const fields = history.reversibleFields.map((field) => {
      const currentValue = currentValues[field] ?? null;
      const expectedValue = expectedValues[field] ?? null;
      const rollbackValue = rollbackValues[field] ?? null;
      if (!valuesEqual(currentValue, expectedValue)) {
        warnings.push(`Current ${field} no longer matches the audited new value.`);
      }

      return {
        field,
        currentValue,
        expectedValue,
        rollbackValue,
        willChange: !valuesEqual(currentValue, rollbackValue)
      };
    });

    const parsed = MenuRollbackPreviewSchema.parse({
      ...base,
      eligible: true,
      reason: "Rollback can restore the recorded previous values. Review every field before confirming.",
      fields,
      warnings
    });

    return {
      ...parsed,
      restaurant,
      history,
      currentValues,
      rollbackValues,
      expectedValues
    };
  }

  private mapMenuHistoryRow(row: MenuHistoryRow): MenuHistoryEventDto {
    const metadata = parseAuditMetadata(row.metadata);
    const changedFields = Array.isArray(metadata.changedFields)
      ? metadata.changedFields.filter((field): field is string => typeof field === "string")
      : [];
    const resourceType = row.entity_type === "menu_category" ? "category" : "item";
    const resourceName =
      readString(metadata.resourceName) ??
      readString(metadata.itemName) ??
      readString(metadata.categoryName) ??
      row.item_name ??
      row.category_name ??
      null;
    const eventType = getMenuHistoryEventType(row.action, resourceType, changedFields);
    const rollback = classifyMenuRollbackReadiness(eventType, changedFields, metadata);

    return {
      id: String(row.id),
      eventType,
      actorName: row.actor_name,
      actorEmail: row.actor_email,
      createdAt: toIsoDateTime(row.created_at),
      summary: buildMenuHistorySummary(eventType, resourceName, metadata),
      resourceType,
      resourceName,
      changedFields,
      rollbackReadiness: rollback.rollbackReadiness,
      rollbackReason: rollback.rollbackReason,
      reversibleFields: rollback.reversibleFields,
      metadata
    };
  }

  private mapAdminMenuHistoryRow(row: AdminMenuHistoryRow): AdminMenuHistoryEventDto {
    return {
      ...this.mapMenuHistoryRow(row),
      orgId: row.org_id,
      orgName: row.org_name,
      restaurantId: row.restaurant_id,
      restaurantName: row.restaurant_name
    };
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
      status: normalizeCustomerOrderStatus(row.status),
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

  private mapBusinessCustomerOrder(
    row: BusinessCustomerOrderRow,
    items: PublicCustomerOrderItemDto[],
    timeline: CustomerOrderTimelineRow[]
  ): BusinessCustomerOrderDto {
    const deliveryAddress = row.delivery_address;
    return BusinessCustomerOrderSchema.parse({
      id: row.id,
      status: normalizeCustomerOrderStatus(row.status),
      restaurant: {
        id: row.restaurant_id,
        name: row.restaurant_name,
        slug: row.restaurant_slug
      },
      customer: {
        name: row.customer_name,
        email: row.customer_email,
        phone: row.customer_phone
      },
      delivery: {
        address: deliveryAddress,
        addressSummary: deliveryAddress.split(",")[0]?.trim() || deliveryAddress,
        notes: row.delivery_notes
      },
      items,
      subtotalCents: toInteger(row.subtotal_cents, "customer_order.subtotal_cents"),
      deliveryFeeCents: toInteger(row.delivery_fee_cents, "customer_order.delivery_fee_cents"),
      totalCents: toInteger(row.total_cents, "customer_order.total_cents"),
      currency: row.currency.toUpperCase(),
      payment: {
        id: row.payment_id,
        status: row.payment_status,
        amountAuthorizedCents: toInteger(row.payment_amount_authorized_cents, "payment.amount_authorized_cents"),
        amountCapturedCents: toInteger(row.payment_amount_captured_cents, "payment.amount_captured_cents"),
        totalCents: toInteger(row.payment_customer_total_cents, "payment.customer_total_cents"),
        currency: row.payment_currency.toUpperCase(),
        lastError: row.payment_last_error
      },
      job: {
        id: row.job_id,
        status: row.job_status,
        etaMinutes: toInteger(row.job_eta_minutes, "job.eta_minutes"),
        pickupAddress: row.job_pickup_address,
        dropoffAddress: row.job_dropoff_address
      },
      timeline: timeline.map((event) => ({
        id: String(event.id),
        eventType: event.event_type,
        createdAt: toIsoDateTime(event.created_at),
        summary: event.event_type.replace(/_/g, " ").toLowerCase()
      })),
      createdAt: toIsoDateTime(row.created_at),
      updatedAt: toIsoDateTime(row.updated_at)
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

  private mapPublicOrderTracking(
    row: PublicOrderTrackingRow,
    timeline: CustomerOrderTimelineRow[]
  ): PublicOrderTrackingDto {
    const deliveryAddress = row.delivery_address;
    return PublicOrderTrackingSchema.parse({
      order: {
        id: row.id,
        status: normalizeCustomerOrderStatus(row.status),
        totalCents: toInteger(row.total_cents, "customer_order.total_cents"),
        currency: row.currency.toUpperCase(),
        createdAt: toIsoDateTime(row.created_at)
      },
      restaurant: {
        id: row.restaurant_id,
        name: row.restaurant_name,
        slug: row.restaurant_slug
      },
      delivery: {
        address: deliveryAddress,
        addressSummary: deliveryAddress.split(",")[0]?.trim() || deliveryAddress,
        notes: row.delivery_notes
      },
      job: {
        id: row.job_id,
        status: row.job_status,
        etaMinutes: toInteger(row.job_eta_minutes, "job.eta_minutes"),
        pickupAddress: row.job_pickup_address,
        dropoffAddress: row.job_dropoff_address
      },
      payment: {
        id: row.payment_id,
        status: row.payment_status,
        amountAuthorizedCents: toInteger(row.payment_amount_authorized_cents, "payment.amount_authorized_cents"),
        amountCapturedCents: toInteger(row.payment_amount_captured_cents, "payment.amount_captured_cents"),
        totalCents: toInteger(row.payment_customer_total_cents, "payment.customer_total_cents"),
        currency: row.payment_currency.toUpperCase(),
        lastError: row.payment_last_error
      },
      tracking: {
        driverAssigned: row.assigned_driver_id !== null,
        latestLocationAt: row.driver_last_location_at ? toIsoDateTime(row.driver_last_location_at) : null,
        dispatchAttemptsCount: timeline.filter((event) => event.event_type === "JOB_DISPATCH_REQUESTED").length,
        timeline: timeline.map((event) => ({
          id: String(event.id),
          eventType: event.event_type,
          createdAt: toIsoDateTime(event.created_at),
          summary: event.event_type.replace(/_/g, " ").toLowerCase()
        }))
      }
    });
  }
}
