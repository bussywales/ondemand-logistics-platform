import { describe, expect, it, vi } from "vitest";
import { runReleaseSchemaCheck } from "./release-schema-check.js";

const BASE_TABLES = new Set([
  "payments",
  "jobs",
  "outbox_messages",
  "customer_orders",
  "job_dispatch_attempts",
  "support_escalations",
  "support_escalation_events",
  "pilot_workspaces",
  "pilot_readiness_checks",
  "org_invitations",
  "demo_requests",
  "demo_request_events",
  "operational_reset_runs",
  "operational_reset_items",
  "notification_reads",
  "platform_admins"
]);

const BASE_COLUMNS = new Set([
  "payout_ledger.payment_id",
  "support_escalations.resolution_note",
  "support_escalations.resolution_action",
  "support_escalations.resolution_reason",
  "support_escalations.resolved_by",
  "support_escalations.resolved_at",
  "support_escalation_events.support_escalation_id",
  "support_escalation_events.event_type",
  "support_escalation_events.metadata",
  "support_escalation_events.created_at",
  "orgs.org_type",
  "orgs.status",
  "org_invitations.email",
  "org_invitations.role",
  "org_invitations.status",
  "org_invitations.invited_by",
  "demo_requests.email",
  "demo_requests.interest_type",
  "demo_requests.status",
  "demo_requests.admin_note",
  "demo_requests.assigned_owner",
  "demo_requests.next_follow_up_at",
  "demo_requests.follow_up_priority",
  "demo_requests.last_contacted_at",
  "demo_requests.close_reason",
  "demo_requests.reviewed_by",
  "demo_requests.reviewed_at",
  "demo_request_events.demo_request_id",
  "demo_request_events.event_type",
  "demo_request_events.metadata",
  "demo_request_events.created_at",
  "operational_reset_runs.created_by",
  "operational_reset_runs.scope",
  "operational_reset_runs.mode",
  "operational_reset_runs.reason",
  "operational_reset_runs.status",
  "operational_reset_runs.summary",
  "operational_reset_runs.completed_at",
  "operational_reset_items.reset_run_id",
  "operational_reset_items.resource_type",
  "operational_reset_items.resource_id",
  "operational_reset_items.action",
  "operational_reset_items.metadata",
  "operational_reset_items.created_at"
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

  it("fails when support_escalation_events is missing", async () => {
    const result = await runReleaseSchemaCheck(buildClient({ missingTables: ["support_escalation_events"] }) as never);

    expect(result.ok).toBe(false);
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "public.support_escalation_events",
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

  it("fails when identity access tables or columns are missing", async () => {
    const missingTable = await runReleaseSchemaCheck(buildClient({ missingTables: ["org_invitations"] }) as never);
    expect(missingTable.ok).toBe(false);
    expect(missingTable.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "public.org_invitations",
          ok: false,
          detail: "table_missing"
        })
      ])
    );

    const missingColumn = await runReleaseSchemaCheck(buildClient({ missingColumns: ["orgs.org_type"] }) as never);
    expect(missingColumn.ok).toBe(false);
    expect(missingColumn.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "public.orgs.org_type",
          ok: false,
          detail: "column_missing"
        })
      ])
    );
  });

  it("fails when demo request persistence is missing", async () => {
    const missingTable = await runReleaseSchemaCheck(buildClient({ missingTables: ["demo_requests"] }) as never);
    expect(missingTable.ok).toBe(false);
    expect(missingTable.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "public.demo_requests",
          ok: false,
          detail: "table_missing"
        })
      ])
    );

    const missingColumn = await runReleaseSchemaCheck(buildClient({ missingColumns: ["demo_requests.reviewed_by"] }) as never);
    expect(missingColumn.ok).toBe(false);
    expect(missingColumn.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "public.demo_requests.reviewed_by",
          ok: false,
          detail: "column_missing"
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

  it("fails when support escalation event columns are missing", async () => {
    const result = await runReleaseSchemaCheck(buildClient({ missingColumns: ["support_escalation_events.metadata"] }) as never);

    expect(result.ok).toBe(false);
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "public.support_escalation_events.metadata",
          ok: false,
          detail: "column_missing"
        })
      ])
    );
  });

  it("fails when operational reset tables are missing", async () => {
    const missingTable = await runReleaseSchemaCheck(buildClient({ missingTables: ["operational_reset_runs"] }) as never);
    expect(missingTable.ok).toBe(false);
    expect(missingTable.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "public.operational_reset_runs",
          ok: false,
          detail: "table_missing"
        })
      ])
    );

    const missingColumn = await runReleaseSchemaCheck(buildClient({ missingColumns: ["operational_reset_items.action"] }) as never);
    expect(missingColumn.ok).toBe(false);
    expect(missingColumn.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "public.operational_reset_items.action",
          ok: false,
          detail: "column_missing"
        })
      ])
    );
  });
});
