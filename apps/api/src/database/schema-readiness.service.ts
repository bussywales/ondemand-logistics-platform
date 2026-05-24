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
    job_dispatch_attempts: [
      "id",
      "job_id",
      "attempt_number",
      "trigger_source",
      "outcome",
      "driver_id",
      "offer_id",
      "notes",
      "created_at"
    ],
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
  customerOrders: {
    customer_orders: [
      "id",
      "restaurant_id",
      "org_id",
      "job_id",
      "payment_id",
      "customer_user_id",
      "customer_name",
      "customer_email",
      "customer_phone",
      "delivery_address",
      "delivery_notes",
      "status",
      "subtotal_cents",
      "delivery_fee_cents",
      "total_cents",
      "currency",
      "created_at",
      "updated_at"
    ],
    customer_order_items: [
      "id",
      "order_id",
      "menu_item_id",
      "name",
      "quantity",
      "unit_price_cents",
      "line_total_cents",
      "currency",
      "created_at"
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
      "payment_id",
      "status",
      "gross_payout_cents",
      "hold_reason",
      "released_at",
      "created_at",
      "updated_at"
    ]
  },
  support: {
    support_escalations: [
      "id",
      "org_id",
      "order_id",
      "job_id",
      "category",
      "status",
      "severity",
      "title",
      "note",
      "follow_up_owner",
      "customer_contact_required",
      "merchant_contact_required",
      "courier_contact_required",
      "resolution_note",
      "resolution_action",
      "resolution_reason",
      "resolved_by",
      "resolved_at",
      "created_by",
      "created_at",
      "updated_at"
    ],
    support_escalation_events: [
      "id",
      "support_escalation_id",
      "org_id",
      "event_type",
      "actor_id",
      "actor_label",
      "previous_status",
      "new_status",
      "note",
      "metadata",
      "created_at"
    ]
  },
  pilots: {
    pilot_workspaces: [
      "id",
      "org_id",
      "mode",
      "status",
      "readiness_stage",
      "pilot_owner",
      "support_owner",
      "courier_owner",
      "payment_owner",
      "go_live_target_date",
      "notes",
      "created_at",
      "updated_at"
    ],
    pilot_readiness_checks: [
      "id",
      "pilot_workspace_id",
      "key",
      "label",
      "status",
      "evidence",
      "updated_by",
      "updated_at"
    ]
  },
  identity: {
    orgs: ["id", "name", "org_type", "status", "created_by", "created_at", "updated_at"],
    org_memberships: ["id", "org_id", "user_id", "role", "is_active", "created_at", "updated_at"],
    org_invitations: ["id", "org_id", "email", "role", "status", "invited_by", "created_at", "updated_at"]
  },
  commercial: {
    demo_requests: [
      "id",
      "name",
      "email",
      "organisation",
      "role",
      "interest_type",
      "message",
      "source",
      "status",
      "admin_note",
      "assigned_owner",
      "next_follow_up_at",
      "follow_up_priority",
      "last_contacted_at",
      "close_reason",
      "reviewed_by",
      "reviewed_at",
      "created_at",
      "updated_at"
    ],
    demo_request_events: [
      "id",
      "demo_request_id",
      "event_type",
      "actor_id",
      "metadata",
      "created_at"
    ]
  },
  operationalResets: {
    operational_reset_runs: [
      "id",
      "created_by",
      "scope",
      "mode",
      "reason",
      "status",
      "summary",
      "created_at",
      "completed_at"
    ],
    operational_reset_items: [
      "id",
      "reset_run_id",
      "resource_type",
      "resource_id",
      "action",
      "metadata",
      "created_at"
    ]
  },
  validationEvidence: {
    validation_evidence_runs: [
      "id",
      "evidence_type",
      "status",
      "environment",
      "source",
      "command",
      "summary",
      "artifact_path",
      "related_order_id",
      "related_job_id",
      "related_payment_id",
      "related_pod_id",
      "created_by",
      "created_at"
    ]
  },
  analytics: {
    analytics_events: [
      "id",
      "event_name",
      "source",
      "path",
      "referrer",
      "session_id",
      "visitor_id",
      "demo_request_id",
      "metadata",
      "user_agent_hash",
      "ip_hash",
      "created_at"
    ]
  },
  financeReviews: {
    finance_review_records: [
      "id",
      "org_id",
      "order_id",
      "job_id",
      "payment_id",
      "support_escalation_id",
      "review_type",
      "status",
      "severity",
      "reason",
      "summary",
      "owner_user_id",
      "owner_label",
      "resolution",
      "resolution_reason",
      "resolved_at",
      "resolved_by",
      "metadata",
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

type ConstraintDefinitionRow = {
  definition: string;
};

const POST_0011_RELEASE_CRITICAL_TABLES = ["notification_reads", "platform_admins"] as const;

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

function allCriticalTableNames() {
  return [...new Set([...uniqueTableNames(), ...POST_0011_RELEASE_CRITICAL_TABLES])];
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

async function customerOrdersSupportsFulfilled(pg: Pick<PgService, "query">) {
  const result = await pg.query<ConstraintDefinitionRow>(
    `select pg_get_constraintdef(c.oid) as definition
     from pg_constraint c
     join pg_class t on t.oid = c.conrelid
     join pg_namespace n on n.oid = t.relnamespace
     where n.nspname = 'public'
       and t.relname = 'customer_orders'
       and c.conname = 'customer_orders_status_check'
     limit 1`
  );

  const definition = result.rows[0]?.definition ?? "";
  return definition.includes("'FULFILLED'");
}

@Injectable()
export class SchemaReadinessService {
  constructor(private readonly pg: PgService) {}

  async assertCriticalSchemaCompatibility() {
    const tableNames = allCriticalTableNames();

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

    for (const tableName of POST_0011_RELEASE_CRITICAL_TABLES) {
      if (!tables.has(tableName)) {
        missingElements.push(`public.${tableName} (table missing)`);
      }
    }

    if (tables.has("customer_orders")) {
      const supportsFulfilled = await customerOrdersSupportsFulfilled(this.pg);
      if (!supportsFulfilled) {
        missingElements.push("public.customer_orders.status missing FULFILLED");
      }
    }

    if (missingElements.length > 0) {
      throw new SchemaCompatibilityError(missingElements);
    }
  }
}

export { CRITICAL_SCHEMA_REQUIREMENTS, POST_0011_RELEASE_CRITICAL_TABLES };
