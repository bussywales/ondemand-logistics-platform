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
    ["public", "customer_orders"]
  ] as const) {
    const exists = await tableExists(client, schema, table);
    items.push({
      name: `${schema}.${table}`,
      ok: exists,
      detail: exists ? "table_present" : "table_missing"
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
