import { Injectable } from "@nestjs/common";
import { PgService } from "./pg.service.js";

const CRITICAL_SCHEMA_REQUIREMENTS = {
  quotes: {
    quotes: [
      "id",
      "org_id",
      "created_by_user_id",
      "distance_miles",
      "eta_minutes",
      "vehicle_type",
      "time_of_day",
      "demand_flag",
      "weather_flag",
      "customer_total_cents",
      "driver_payout_gross_cents",
      "platform_fee_cents",
      "pricing_version",
      "premium_distance_flag",
      "breakdown_lines",
      "quote_input",
      "quote_output",
      "created_at"
    ]
  },
  jobs: {
    jobs: [
      "id",
      "org_id",
      "consumer_id",
      "assigned_driver_id",
      "quote_id",
      "status",
      "pickup_address",
      "dropoff_address",
      "pickup_latitude",
      "pickup_longitude",
      "dropoff_latitude",
      "dropoff_longitude",
      "distance_miles",
      "eta_minutes",
      "vehicle_required",
      "customer_total_cents",
      "driver_payout_gross_cents",
      "platform_fee_cents",
      "pricing_version",
      "premium_distance_flag",
      "created_by_user_id",
      "created_at",
      "dispatch_requested_at",
      "dispatch_failed_at",
      "updated_at"
    ],
    job_events: ["id", "job_id", "event_type", "actor_id", "payload", "created_at"]
  },
  dispatch: {
    drivers: ["id", "user_id"],
    job_offers: [
      "id",
      "job_id",
      "driver_id",
      "status",
      "offered_at",
      "expires_at",
      "responded_at",
      "payout_gross_snapshot",
      "distance_miles_snapshot",
      "eta_minutes_snapshot"
    ]
  },
  restaurants: {
    restaurants: ["id", "org_id", "name", "slug", "status", "created_at", "updated_at"],
    menu_categories: ["id", "restaurant_id", "name", "sort_order", "is_active", "created_at", "updated_at"],
    menu_items: [
      "id",
      "restaurant_id",
      "category_id",
      "name",
      "description",
      "price_cents",
      "currency",
      "is_active",
      "sort_order",
      "created_at",
      "updated_at"
    ]
  },
  payments: {
    payments: [
      "id",
      "job_id",
      "provider",
      "provider_payment_intent_id",
      "status",
      "amount_authorized_cents",
      "amount_captured_cents",
      "amount_refunded_cents",
      "currency",
      "customer_total_cents",
      "platform_fee_cents",
      "payout_gross_cents",
      "settlement_snapshot",
      "client_secret",
      "last_error",
      "created_at",
      "updated_at"
    ],
    refunds: [
      "id",
      "payment_id",
      "job_id",
      "provider_refund_id",
      "status",
      "amount_cents",
      "currency",
      "reason_code",
      "created_at",
      "updated_at"
    ],
    payout_ledger: [
      "id",
      "job_id",
      "driver_id",
      "status",
      "gross_payout_cents",
      "hold_reason",
      "released_at",
      "created_at",
      "updated_at"
    ]
  }
} as const;

type SchemaTableRow = {
  table_name: string;
};

type SchemaColumnRow = {
  table_name: string;
  column_name: string;
};

export class SchemaCompatibilityError extends Error {
  readonly missingElements: string[];

  constructor(missingElements: string[]) {
    super(`Missing required schema elements: ${missingElements.join(", ")}`);
    this.name = "SchemaCompatibilityError";
    this.missingElements = missingElements;
  }
}

function uniqueTableNames() {
  return [...new Set(Object.values(CRITICAL_SCHEMA_REQUIREMENTS).flatMap((group) => Object.keys(group)))];
}

function collectMissingSchemaElements(
  tables: Set<string>,
  columnsByTable: Map<string, Set<string>>
) {
  const missing: string[] = [];

  for (const group of Object.values(CRITICAL_SCHEMA_REQUIREMENTS)) {
    for (const [tableName, requiredColumns] of Object.entries(group)) {
      if (!tables.has(tableName)) {
        missing.push(`public.${tableName} (table missing)`);
        continue;
      }

      const presentColumns = columnsByTable.get(tableName) ?? new Set<string>();
      for (const columnName of requiredColumns) {
        if (!presentColumns.has(columnName)) {
          missing.push(`public.${tableName}.${columnName}`);
        }
      }
    }
  }

  return missing;
}

@Injectable()
export class SchemaReadinessService {
  constructor(private readonly pg: PgService) {}

  async assertCriticalSchemaCompatibility() {
    const tableNames = uniqueTableNames();

    const [tablesResult, columnsResult] = await Promise.all([
      this.pg.query<SchemaTableRow>(
        `select table_name
         from information_schema.tables
         where table_schema = 'public'
           and table_name = any($1)`,
        [tableNames]
      ),
      this.pg.query<SchemaColumnRow>(
        `select table_name, column_name
         from information_schema.columns
         where table_schema = 'public'
           and table_name = any($1)`,
        [tableNames]
      )
    ]);

    const tables = new Set(tablesResult.rows.map((row) => row.table_name));
    const columnsByTable = new Map<string, Set<string>>();

    for (const row of columnsResult.rows) {
      const existing = columnsByTable.get(row.table_name) ?? new Set<string>();
      existing.add(row.column_name);
      columnsByTable.set(row.table_name, existing);
    }

    const missingElements = collectMissingSchemaElements(tables, columnsByTable);
    if (missingElements.length > 0) {
      throw new SchemaCompatibilityError(missingElements);
    }
  }
}

export { CRITICAL_SCHEMA_REQUIREMENTS };
