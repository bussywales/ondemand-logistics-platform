import { describe, expect, it, vi } from "vitest";
import { runReleaseSchemaCheck } from "./release-schema-check.js";

describe("runReleaseSchemaCheck", () => {
  it("fails when notification_reads is missing", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ exists: true }] }) // payments
      .mockResolvedValueOnce({ rows: [{ exists: true }] }) // jobs
      .mockResolvedValueOnce({ rows: [{ exists: true }] }) // outbox_messages
      .mockResolvedValueOnce({ rows: [{ exists: true }] }) // customer_orders
      .mockResolvedValueOnce({ rows: [{ exists: true }] }) // job_dispatch_attempts
      .mockResolvedValueOnce({ rows: [{ exists: true }] }) // payout_ledger.payment_id
      .mockResolvedValueOnce({ rows: [{ exists: false }] }) // notification_reads
      .mockResolvedValueOnce({ rows: [{ exists: true }] }) // platform_admins
      .mockResolvedValueOnce({
        rows: [
          {
            definition:
              "CHECK ((status = ANY (ARRAY['SUBMITTED'::text, 'PAYMENT_AUTHORIZED'::text, 'PAYMENT_FAILED'::text, 'FULFILLED'::text])))"
          }
        ]
      });

    const result = await runReleaseSchemaCheck({ query } as never);

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
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({
        rows: [
          {
            definition:
              "CHECK ((status = ANY (ARRAY['SUBMITTED'::text, 'PAYMENT_AUTHORIZED'::text, 'PAYMENT_FAILED'::text, 'COMPLETED'::text])))"
          }
        ]
      });

    const result = await runReleaseSchemaCheck({ query } as never);

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
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ exists: true }] }) // payments
      .mockResolvedValueOnce({ rows: [{ exists: true }] }) // jobs
      .mockResolvedValueOnce({ rows: [{ exists: true }] }) // outbox_messages
      .mockResolvedValueOnce({ rows: [{ exists: true }] }) // customer_orders
      .mockResolvedValueOnce({ rows: [{ exists: false }] }) // job_dispatch_attempts
      .mockResolvedValueOnce({ rows: [{ exists: true }] }) // payout_ledger.payment_id
      .mockResolvedValueOnce({ rows: [{ exists: true }] }) // notification_reads
      .mockResolvedValueOnce({ rows: [{ exists: true }] }) // platform_admins
      .mockResolvedValueOnce({
        rows: [
          {
            definition:
              "CHECK ((status = ANY (ARRAY['SUBMITTED'::text, 'PAYMENT_AUTHORIZED'::text, 'PAYMENT_FAILED'::text, 'FULFILLED'::text])))"
          }
        ]
      });

    const result = await runReleaseSchemaCheck({ query } as never);

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

  it("fails when payout_ledger.payment_id is missing", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ exists: true }] }) // payments
      .mockResolvedValueOnce({ rows: [{ exists: true }] }) // jobs
      .mockResolvedValueOnce({ rows: [{ exists: true }] }) // outbox_messages
      .mockResolvedValueOnce({ rows: [{ exists: true }] }) // customer_orders
      .mockResolvedValueOnce({ rows: [{ exists: true }] }) // job_dispatch_attempts
      .mockResolvedValueOnce({ rows: [{ exists: false }] }) // payout_ledger.payment_id
      .mockResolvedValueOnce({ rows: [{ exists: true }] }) // notification_reads
      .mockResolvedValueOnce({ rows: [{ exists: true }] }) // platform_admins
      .mockResolvedValueOnce({
        rows: [
          {
            definition:
              "CHECK ((status = ANY (ARRAY['SUBMITTED'::text, 'PAYMENT_AUTHORIZED'::text, 'PAYMENT_FAILED'::text, 'FULFILLED'::text])))"
          }
        ]
      });

    const result = await runReleaseSchemaCheck({ query } as never);

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
});
