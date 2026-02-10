import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = join(process.cwd(), "migrations");
const files = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

const requiredTables = [
  "users",
  "orgs",
  "org_memberships",
  "drivers",
  "driver_verifications",
  "driver_vehicle",
  "jobs",
  "job_events",
  "audit_log",
  "outbox_messages"
];

if (files.length < 2) {
  throw new Error("Expected at least two migration files (schema + rls).");
}

const mergedSql = files
  .map((name) => readFileSync(join(migrationsDir, name), "utf8"))
  .join("\n");

for (const tableName of requiredTables) {
  if (!new RegExp(`create table\\s+public\\.${tableName}`, "i").test(mergedSql)) {
    throw new Error(`Missing required table: ${tableName}`);
  }
}

const rlsChecks = [
  "alter table public.jobs enable row level security",
  "create policy jobs_select_policy",
  "create policy outbox_service_only_select",
  "create policy audit_log_insert_service_only"
];

for (const clause of rlsChecks) {
  if (!mergedSql.toLowerCase().includes(clause.toLowerCase())) {
    throw new Error(`Missing required RLS clause: ${clause}`);
  }
}

const appendOnlyChecks = [
  "create trigger job_events_append_only",
  "create trigger audit_log_append_only",
  "create trigger outbox_delete_blocked"
];

for (const clause of appendOnlyChecks) {
  if (!mergedSql.toLowerCase().includes(clause.toLowerCase())) {
    throw new Error(`Missing append-only enforcement: ${clause}`);
  }
}

console.log(`Validated ${files.length} migration files.`);
