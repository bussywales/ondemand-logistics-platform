import { describe, expect, it, vi } from "vitest";
import {
  CRITICAL_SCHEMA_REQUIREMENTS,
  POST_0011_RELEASE_CRITICAL_TABLES,
  SchemaCompatibilityError,
  SchemaReadinessService
} from "./schema-readiness.service.js";

function buildTableRows() {
  return [
    ...Object.entries(CRITICAL_SCHEMA_REQUIREMENTS).flatMap(([, group]) =>
      Object.keys(group).map((table_name) => ({ table_name }))
    ),
    ...POST_0011_RELEASE_CRITICAL_TABLES.map((table_name) => ({ table_name }))
  ];
}

function buildColumnsRows() {
  return Object.entries(CRITICAL_SCHEMA_REQUIREMENTS).flatMap(([, group]) =>
    Object.entries(group).flatMap(([tableName, columns]) =>
      columns.map((columnName: string) => ({ table_name: tableName, column_name: columnName }))
    )
  );
}

function fulfilledConstraintRow(definition?: string) {
  return {
    rows: [
      {
        definition:
          definition ??
          "CHECK ((status = ANY (ARRAY['SUBMITTED'::text, 'PAYMENT_AUTHORIZED'::text, 'PAYMENT_FAILED'::text, 'COMPLETED'::text, 'FULFILLED'::text])))"
      }
    ]
  };
}

describe("SchemaReadinessService", () => {
  it("passes when all required tables and columns are present", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: buildTableRows()
      })
      .mockResolvedValueOnce({
        rows: buildColumnsRows()
      })
      .mockResolvedValueOnce(fulfilledConstraintRow());

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
        rows: buildTableRows()
      })
      .mockResolvedValueOnce({
        rows: buildColumnsRows().filter(
          (row) => !(row.table_name === "payments" && row.column_name === "settlement_snapshot")
        )
      })
      .mockResolvedValueOnce(fulfilledConstraintRow());

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
        rows: buildTableRows()
      })
      .mockResolvedValueOnce({
        rows: buildColumnsRows().filter(
          (row) => !(row.table_name === "job_offers" && row.column_name === "expires_at")
        )
      })
      .mockResolvedValueOnce(fulfilledConstraintRow());

    const service = new SchemaReadinessService({ query } as never);

    await expect(service.assertCriticalSchemaCompatibility()).rejects.toMatchObject({
      name: "SchemaCompatibilityError",
      missingElements: expect.arrayContaining(["public.job_offers.expires_at"])
    } satisfies Partial<SchemaCompatibilityError>);
  });

  it("fails when a required dispatch attempts table is missing", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: buildTableRows().filter((row) => row.table_name !== "job_dispatch_attempts")
      })
      .mockResolvedValueOnce({
        rows: buildColumnsRows().filter((row) => row.table_name !== "job_dispatch_attempts")
      })
      .mockResolvedValueOnce(fulfilledConstraintRow());

    const service = new SchemaReadinessService({ query } as never);

    await expect(service.assertCriticalSchemaCompatibility()).rejects.toMatchObject({
      name: "SchemaCompatibilityError",
      missingElements: expect.arrayContaining(["public.job_dispatch_attempts (table missing)"])
    } satisfies Partial<SchemaCompatibilityError>);
  });

  it("fails when payout_ledger.payment_id is missing", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: buildTableRows()
      })
      .mockResolvedValueOnce({
        rows: buildColumnsRows().filter(
          (row) => !(row.table_name === "payout_ledger" && row.column_name === "payment_id")
        )
      })
      .mockResolvedValueOnce(fulfilledConstraintRow());

    const service = new SchemaReadinessService({ query } as never);

    await expect(service.assertCriticalSchemaCompatibility()).rejects.toMatchObject({
      name: "SchemaCompatibilityError",
      missingElements: expect.arrayContaining(["public.payout_ledger.payment_id"])
    } satisfies Partial<SchemaCompatibilityError>);
  });

  it("fails when the restaurant foundation schema is missing", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          ...Object.entries(CRITICAL_SCHEMA_REQUIREMENTS).flatMap(([, group]) =>
          Object.keys(group)
            .filter((table_name) => table_name !== "restaurants")
            .map((table_name) => ({ table_name }))
          ),
          ...POST_0011_RELEASE_CRITICAL_TABLES.map((table_name) => ({ table_name }))
        ]
      })
      .mockResolvedValueOnce({
        rows: buildColumnsRows().filter((row) => row.table_name !== "restaurants")
      })
      .mockResolvedValueOnce(fulfilledConstraintRow());

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
        rows: [
          ...Object.entries(CRITICAL_SCHEMA_REQUIREMENTS).flatMap(([, group]) =>
          Object.keys(group)
            .filter((table_name) => table_name !== "customer_orders")
            .map((table_name) => ({ table_name }))
          ),
          ...POST_0011_RELEASE_CRITICAL_TABLES.map((table_name) => ({ table_name }))
        ]
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
        rows: buildTableRows()
      })
      .mockResolvedValueOnce({
        rows: buildColumnsRows().filter(
          (row) => !(row.table_name === "customer_order_items" && row.column_name === "line_total_cents")
        )
      })
      .mockResolvedValueOnce(fulfilledConstraintRow());

    const service = new SchemaReadinessService({ query } as never);

    await expect(service.assertCriticalSchemaCompatibility()).rejects.toMatchObject({
      name: "SchemaCompatibilityError",
      missingElements: expect.arrayContaining(["public.customer_order_items.line_total_cents"])
    } satisfies Partial<SchemaCompatibilityError>);
  });

  it("fails when notification_reads is missing", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: buildTableRows().filter((row) => row.table_name !== "notification_reads")
      })
      .mockResolvedValueOnce({
        rows: buildColumnsRows()
      })
      .mockResolvedValueOnce(
        fulfilledConstraintRow("CHECK ((status = ANY (ARRAY['SUBMITTED'::text, 'PAYMENT_AUTHORIZED'::text, 'PAYMENT_FAILED'::text, 'FULFILLED'::text])))")
      );

    const service = new SchemaReadinessService({ query } as never);

    await expect(service.assertCriticalSchemaCompatibility()).rejects.toMatchObject({
      name: "SchemaCompatibilityError",
      missingElements: expect.arrayContaining(["public.notification_reads (table missing)"])
    } satisfies Partial<SchemaCompatibilityError>);
  });

  it("fails when pilot workspace readiness tables are missing", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: buildTableRows().filter((row) => row.table_name !== "pilot_workspaces")
      })
      .mockResolvedValueOnce({
        rows: buildColumnsRows().filter((row) => row.table_name !== "pilot_workspaces")
      })
      .mockResolvedValueOnce(fulfilledConstraintRow());

    const service = new SchemaReadinessService({ query } as never);

    await expect(service.assertCriticalSchemaCompatibility()).rejects.toMatchObject({
      name: "SchemaCompatibilityError",
      missingElements: expect.arrayContaining(["public.pilot_workspaces (table missing)"])
    } satisfies Partial<SchemaCompatibilityError>);
  });

  it("fails when demo request persistence is missing", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: buildTableRows().filter((row) => row.table_name !== "demo_requests")
      })
      .mockResolvedValueOnce({
        rows: buildColumnsRows().filter((row) => row.table_name !== "demo_requests")
      })
      .mockResolvedValueOnce(fulfilledConstraintRow());

    const service = new SchemaReadinessService({ query } as never);

    await expect(service.assertCriticalSchemaCompatibility()).rejects.toMatchObject({
      name: "SchemaCompatibilityError",
      missingElements: expect.arrayContaining(["public.demo_requests (table missing)"])
    } satisfies Partial<SchemaCompatibilityError>);
  });

  it("queries post-0011 release-critical tables during readiness checks", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: buildTableRows()
      })
      .mockResolvedValueOnce({
        rows: buildColumnsRows()
      })
      .mockResolvedValueOnce(fulfilledConstraintRow());

    const service = new SchemaReadinessService({ query } as never);

    await expect(service.assertCriticalSchemaCompatibility()).resolves.toBeUndefined();

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("from information_schema.tables"),
      [
        expect.arrayContaining([
          "notification_reads",
          "platform_admins"
        ])
      ]
    );
  });

  it("fails when platform_admins is missing", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: buildTableRows().filter((row) => row.table_name !== "platform_admins")
      })
      .mockResolvedValueOnce({
        rows: buildColumnsRows()
      })
      .mockResolvedValueOnce(
        fulfilledConstraintRow("CHECK ((status = ANY (ARRAY['SUBMITTED'::text, 'PAYMENT_AUTHORIZED'::text, 'PAYMENT_FAILED'::text, 'FULFILLED'::text])))")
      );

    const service = new SchemaReadinessService({ query } as never);

    await expect(service.assertCriticalSchemaCompatibility()).rejects.toMatchObject({
      name: "SchemaCompatibilityError",
      missingElements: expect.arrayContaining(["public.platform_admins (table missing)"])
    } satisfies Partial<SchemaCompatibilityError>);
  });

  it("fails when customer_orders status does not support FULFILLED", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: buildTableRows()
      })
      .mockResolvedValueOnce({
        rows: buildColumnsRows()
      })
      .mockResolvedValueOnce(
        fulfilledConstraintRow("CHECK ((status = ANY (ARRAY['SUBMITTED'::text, 'PAYMENT_AUTHORIZED'::text, 'PAYMENT_FAILED'::text, 'COMPLETED'::text])))")
      );

    const service = new SchemaReadinessService({ query } as never);

    await expect(service.assertCriticalSchemaCompatibility()).rejects.toMatchObject({
      name: "SchemaCompatibilityError",
      missingElements: expect.arrayContaining(["public.customer_orders.status missing FULFILLED"])
    } satisfies Partial<SchemaCompatibilityError>);
  });
});
