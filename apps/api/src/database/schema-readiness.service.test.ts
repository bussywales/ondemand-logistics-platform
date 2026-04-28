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

  it("fails when a required dispatch column is missing", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: Object.entries(CRITICAL_SCHEMA_REQUIREMENTS).flatMap(([, group]) =>
          Object.keys(group).map((table_name) => ({ table_name }))
        )
      })
      .mockResolvedValueOnce({
        rows: buildColumnsRows().filter(
          (row) => !(row.table_name === "job_offers" && row.column_name === "expires_at")
        )
      });

    const service = new SchemaReadinessService({ query } as never);

    await expect(service.assertCriticalSchemaCompatibility()).rejects.toMatchObject({
      name: "SchemaCompatibilityError",
      missingElements: expect.arrayContaining(["public.job_offers.expires_at"])
    } satisfies Partial<SchemaCompatibilityError>);
  });

  it("fails when the restaurant foundation schema is missing", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: Object.entries(CRITICAL_SCHEMA_REQUIREMENTS).flatMap(([, group]) =>
          Object.keys(group)
            .filter((table_name) => table_name !== "restaurants")
            .map((table_name) => ({ table_name }))
        )
      })
      .mockResolvedValueOnce({
        rows: buildColumnsRows().filter((row) => row.table_name !== "restaurants")
      });

    const service = new SchemaReadinessService({ query } as never);

    await expect(service.assertCriticalSchemaCompatibility()).rejects.toMatchObject({
      name: "SchemaCompatibilityError",
      missingElements: expect.arrayContaining(["public.restaurants (table missing)"])
    } satisfies Partial<SchemaCompatibilityError>);
  });

  it("fails when the customer order foundation schema is missing", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: Object.entries(CRITICAL_SCHEMA_REQUIREMENTS).flatMap(([, group]) =>
          Object.keys(group)
            .filter((table_name) => table_name !== "customer_orders")
            .map((table_name) => ({ table_name }))
        )
      })
      .mockResolvedValueOnce({
        rows: buildColumnsRows().filter((row) => row.table_name !== "customer_orders")
      });

    const service = new SchemaReadinessService({ query } as never);

    await expect(service.assertCriticalSchemaCompatibility()).rejects.toMatchObject({
      name: "SchemaCompatibilityError",
      missingElements: expect.arrayContaining(["public.customer_orders (table missing)"])
    } satisfies Partial<SchemaCompatibilityError>);
  });

  it("fails when a customer order item column is missing", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: Object.entries(CRITICAL_SCHEMA_REQUIREMENTS).flatMap(([, group]) =>
          Object.keys(group).map((table_name) => ({ table_name }))
        )
      })
      .mockResolvedValueOnce({
        rows: buildColumnsRows().filter(
          (row) => !(row.table_name === "customer_order_items" && row.column_name === "line_total_cents")
        )
      });

    const service = new SchemaReadinessService({ query } as never);

    await expect(service.assertCriticalSchemaCompatibility()).rejects.toMatchObject({
      name: "SchemaCompatibilityError",
      missingElements: expect.arrayContaining(["public.customer_order_items.line_total_cents"])
    } satisfies Partial<SchemaCompatibilityError>);
  });
});
