import { describe, expect, it, vi } from "vitest";
import { runReleaseSchemaCheck } from "./release-schema-check.js";

const BASE_TABLES = new Set([
  "payments",
  "jobs",
  "outbox_messages",
  "customer_orders",
  "job_dispatch_attempts",
  "support_escalations",
  "pilot_workspaces",
  "pilot_readiness_checks",
  "notification_reads",
  "platform_admins"
]);

const BASE_COLUMNS = new Set([
  "payout_ledger.payment_id",
  "support_escalations.resolution_note",
  "support_escalations.resolution_action",
  "support_escalations.resolution_reason",
  "support_escalations.resolved_by",
  "support_escalations.resolved_at"
]);

function buildClient(options?: {
  missingTables?: string[];
  missingColumns?: string[];
  fulfilledStatus?: boolean;
}) {
  const tables = new Set(BASE_TABLES);
  const columns = new Set(BASE_COLUMNS);
  for (const table of options?.missingTables ?? []) {
    tables.delete(table);
  }
  for (const column of options?.missingColumns ?? []) {
    columns.delete(column);
  }

  const query = vi.fn(async (sql: string, params?: unknown[]) => {
    if (sql.includes("information_schema.tables")) {
      const table = String(params?.[1] ?? "");
      return { rows: [{ exists: tables.has(table) }] };
    }

    if (sql.includes("information_schema.columns")) {
      const table = String(params?.[1] ?? "");
      const column = String(params?.[2] ?? "");
      return { rows: [{ exists: columns.has(`${table}.${column}`) }] };
    }

    if (sql.includes("pg_get_constraintdef")) {
      return {
        rows: [
          {
            definition: options?.fulfilledStatus === false
              ? "CHECK ((status = ANY (ARRAY['SUBMITTED'::text, 'PAYMENT_AUTHORIZED'::text, 'PAYMENT_FAILED'::text, 'COMPLETED'::text])))"
              : "CHECK ((status = ANY (ARRAY['SUBMITTED'::text, 'PAYMENT_AUTHORIZED'::text, 'PAYMENT_FAILED'::text, 'FULFILLED'::text])))"
          }
        ]
      };
    }

    return { rows: [] };
  });

  return { query };
}

describe("runReleaseSchemaCheck", () => {
  it("passes when release-critical tables and columns are present", async () => {
    const result = await runReleaseSchemaCheck(buildClient() as never);

    expect(result.ok).toBe(true);
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "public.support_escalations.resolved_at", ok: true }),
        expect.objectContaining({ name: "public.customer_orders.status includes FULFILLED", ok: true })
      ])
    );
  });

  it("fails when notification_reads is missing", async () => {
    const result = await runReleaseSchemaCheck(buildClient({ missingTables: ["notification_reads"] }) as never);

    expect(result.ok).toBe(false);
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "public.notification_reads",
          ok: false,
          detail: "table_missing"
        })
      ])
    );
  });

  it("fails when customer_orders does not support FULFILLED", async () => {
    const result = await runReleaseSchemaCheck(buildClient({ fulfilledStatus: false }) as never);

    expect(result.ok).toBe(false);
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "public.customer_orders.status includes FULFILLED",
          ok: false
        })
      ])
    );
  });

  it("fails when job_dispatch_attempts is missing", async () => {
    const result = await runReleaseSchemaCheck(buildClient({ missingTables: ["job_dispatch_attempts"] }) as never);

    expect(result.ok).toBe(false);
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "public.job_dispatch_attempts",
          ok: false,
          detail: "table_missing"
        })
      ])
    );
  });

  it("fails when support_escalations is missing", async () => {
    const result = await runReleaseSchemaCheck(buildClient({ missingTables: ["support_escalations"] }) as never);

    expect(result.ok).toBe(false);
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "public.support_escalations",
          ok: false,
          detail: "table_missing"
        })
      ])
    );
  });

  it("fails when pilot_workspaces is missing", async () => {
    const result = await runReleaseSchemaCheck(buildClient({ missingTables: ["pilot_workspaces"] }) as never);

    expect(result.ok).toBe(false);
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "public.pilot_workspaces",
          ok: false,
          detail: "table_missing"
        })
      ])
    );
  });

  it("fails when payout_ledger.payment_id is missing", async () => {
    const result = await runReleaseSchemaCheck(buildClient({ missingColumns: ["payout_ledger.payment_id"] }) as never);

    expect(result.ok).toBe(false);
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "public.payout_ledger.payment_id",
          ok: false,
          detail: "column_missing"
        })
      ])
    );
  });

  it("fails when support escalation closeout columns are missing", async () => {
    const result = await runReleaseSchemaCheck(buildClient({ missingColumns: ["support_escalations.resolved_at"] }) as never);

    expect(result.ok).toBe(false);
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "public.support_escalations.resolved_at",
          ok: false,
          detail: "column_missing"
        })
      ])
    );
  });
});
