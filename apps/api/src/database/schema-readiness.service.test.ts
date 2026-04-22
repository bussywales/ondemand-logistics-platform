import { describe, expect, it, vi } from "vitest";
import {
  CRITICAL_SCHEMA_REQUIREMENTS,
  SchemaCompatibilityError,
  SchemaReadinessService
} from "./schema-readiness.service.js";

function buildColumnsRows() {
  return Object.entries(CRITICAL_SCHEMA_REQUIREMENTS).flatMap(([, group]) =>
    Object.entries(group).flatMap(([tableName, columns]) =>
      columns.map((columnName: string) => ({ table_name: tableName, column_name: columnName }))
    )
  );
}

describe("SchemaReadinessService", () => {
  it("passes when all required tables and columns are present", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: Object.entries(CRITICAL_SCHEMA_REQUIREMENTS).flatMap(([, group]) =>
          Object.keys(group).map((table_name) => ({ table_name }))
        )
      })
      .mockResolvedValueOnce({
        rows: buildColumnsRows()
      });

    const service = new SchemaReadinessService({ query } as never);

    await expect(service.assertCriticalSchemaCompatibility()).resolves.toBeUndefined();
  });

  it("fails when a required table is missing", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [{ table_name: "jobs" }, { table_name: "job_events" }, { table_name: "payments" }, { table_name: "refunds" }, { table_name: "payout_ledger" }]
      })
      .mockResolvedValueOnce({
        rows: buildColumnsRows().filter((row) => row.table_name !== "quotes")
      });

    const service = new SchemaReadinessService({ query } as never);

    await expect(service.assertCriticalSchemaCompatibility()).rejects.toMatchObject({
      name: "SchemaCompatibilityError",
      missingElements: expect.arrayContaining(["public.quotes (table missing)"])
    } satisfies Partial<SchemaCompatibilityError>);
  });

  it("fails when a required column is missing", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: Object.entries(CRITICAL_SCHEMA_REQUIREMENTS).flatMap(([, group]) =>
          Object.keys(group).map((table_name) => ({ table_name }))
        )
      })
      .mockResolvedValueOnce({
        rows: buildColumnsRows().filter(
          (row) => !(row.table_name === "payments" && row.column_name === "settlement_snapshot")
        )
      });

    const service = new SchemaReadinessService({ query } as never);

    await expect(service.assertCriticalSchemaCompatibility()).rejects.toMatchObject({
      name: "SchemaCompatibilityError",
      missingElements: expect.arrayContaining(["public.payments.settlement_snapshot"])
    } satisfies Partial<SchemaCompatibilityError>);
  });
});
