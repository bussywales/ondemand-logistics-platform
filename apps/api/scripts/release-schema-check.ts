import { type Client } from "pg";
import { POST_0011_RELEASE_CRITICAL_TABLES } from "../src/database/schema-readiness.service.js";

export type SchemaCheckItem = {
  name: string;
  ok: boolean;
  detail: string;
};

export type SchemaCheckResult = {
  ok: boolean;
  items: SchemaCheckItem[];
};

async function tableExists(client: Client, schema: string, table: string) {
  const result = await client.query<{ exists: boolean }>(
    `select exists (
       select 1
       from information_schema.tables
       where table_schema = $1
         and table_name = $2
     ) as exists`,
    [schema, table]
  );
  return result.rows[0]?.exists === true;
}

async function columnExists(client: Client, schema: string, table: string, column: string) {
  const result = await client.query<{ exists: boolean }>(
    `select exists (
       select 1
       from information_schema.columns
       where table_schema = $1
         and table_name = $2
         and column_name = $3
     ) as exists`,
    [schema, table, column]
  );
  return result.rows[0]?.exists === true;
}

async function customerOrdersSupportsFulfilled(client: Client) {
  const result = await client.query<{ definition: string }>(
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
  return {
    ok: definition.includes("'FULFILLED'"),
    detail: definition || "constraint_missing"
  };
}

export async function runReleaseSchemaCheck(client: Client): Promise<SchemaCheckResult> {
  const items: SchemaCheckItem[] = [];

  for (const [schema, table] of [
    ["public", "payments"],
    ["public", "jobs"],
    ["public", "outbox_messages"],
    ["public", "customer_orders"],
    ["public", "job_dispatch_attempts"],
    ["public", "support_escalations"],
    ["public", "support_escalation_events"],
    ["public", "pilot_workspaces"],
    ["public", "pilot_readiness_checks"],
    ["public", "org_invitations"],
    ["public", "demo_requests"],
    ["public", "operational_reset_runs"],
    ["public", "operational_reset_items"],
    ["public", "validation_evidence_runs"]
  ] as const) {
    const exists = await tableExists(client, schema, table);
    items.push({
      name: `${schema}.${table}`,
      ok: exists,
      detail: exists ? "table_present" : "table_missing"
    });
  }

  const payoutLedgerPaymentId = await columnExists(client, "public", "payout_ledger", "payment_id");
  items.push({
    name: "public.payout_ledger.payment_id",
    ok: payoutLedgerPaymentId,
    detail: payoutLedgerPaymentId ? "column_present" : "column_missing"
  });

  for (const column of ["resolution_note", "resolution_action", "resolution_reason", "resolved_by", "resolved_at"]) {
    const exists = await columnExists(client, "public", "support_escalations", column);
    items.push({
      name: `public.support_escalations.${column}`,
      ok: exists,
      detail: exists ? "column_present" : "column_missing"
    });
  }

  for (const column of ["support_escalation_id", "event_type", "metadata", "created_at"]) {
    const exists = await columnExists(client, "public", "support_escalation_events", column);
    items.push({
      name: `public.support_escalation_events.${column}`,
      ok: exists,
      detail: exists ? "column_present" : "column_missing"
    });
  }

  for (const table of POST_0011_RELEASE_CRITICAL_TABLES) {
    const exists = await tableExists(client, "public", table);
    items.push({
      name: `public.${table}`,
      ok: exists,
      detail: exists ? "table_present" : "table_missing"
    });
  }

  for (const column of ["org_type", "status"]) {
    const exists = await columnExists(client, "public", "orgs", column);
    items.push({
      name: `public.orgs.${column}`,
      ok: exists,
      detail: exists ? "column_present" : "column_missing"
    });
  }

  for (const column of ["email", "role", "status", "invited_by"]) {
    const exists = await columnExists(client, "public", "org_invitations", column);
    items.push({
      name: `public.org_invitations.${column}`,
      ok: exists,
      detail: exists ? "column_present" : "column_missing"
    });
  }

  for (const column of [
    "email",
    "interest_type",
    "status",
    "admin_note",
    "assigned_owner",
    "next_follow_up_at",
    "follow_up_priority",
    "last_contacted_at",
    "close_reason",
    "reviewed_by",
    "reviewed_at"
  ]) {
    const exists = await columnExists(client, "public", "demo_requests", column);
    items.push({
      name: `public.demo_requests.${column}`,
      ok: exists,
      detail: exists ? "column_present" : "column_missing"
    });
  }

  for (const column of ["demo_request_id", "event_type", "metadata", "created_at"]) {
    const exists = await columnExists(client, "public", "demo_request_events", column);
    items.push({
      name: `public.demo_request_events.${column}`,
      ok: exists,
      detail: exists ? "column_present" : "column_missing"
    });
  }

  for (const column of ["created_by", "scope", "mode", "reason", "status", "summary", "completed_at"]) {
    const exists = await columnExists(client, "public", "operational_reset_runs", column);
    items.push({
      name: `public.operational_reset_runs.${column}`,
      ok: exists,
      detail: exists ? "column_present" : "column_missing"
    });
  }

  for (const column of ["reset_run_id", "resource_type", "resource_id", "action", "metadata", "created_at"]) {
    const exists = await columnExists(client, "public", "operational_reset_items", column);
    items.push({
      name: `public.operational_reset_items.${column}`,
      ok: exists,
      detail: exists ? "column_present" : "column_missing"
    });
  }

  for (const column of [
    "evidence_type",
    "status",
    "environment",
    "source",
    "summary",
    "artifact_path",
    "related_order_id",
    "related_job_id",
    "created_at"
  ]) {
    const exists = await columnExists(client, "public", "validation_evidence_runs", column);
    items.push({
      name: `public.validation_evidence_runs.${column}`,
      ok: exists,
      detail: exists ? "column_present" : "column_missing"
    });
  }

  const fulfilled = await customerOrdersSupportsFulfilled(client);
  items.push({
    name: "public.customer_orders.status includes FULFILLED",
    ok: fulfilled.ok,
    detail: fulfilled.detail
  });

  return {
    ok: items.every((item) => item.ok),
    items
  };
}
