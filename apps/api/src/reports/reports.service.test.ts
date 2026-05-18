import { describe, expect, it, vi } from "vitest";
import { ReportsService, buildEndOfDayReport } from "./reports.service.js";

const baseRow = {
  org_id: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
  org_name: "Pilot Org",
  order_id: "11111111-1111-4111-8111-111111111111",
  customer_name: "Ada Customer",
  order_status: "PAYMENT_AUTHORIZED" as const,
  order_created_at: "2026-05-03T08:00:00.000Z",
  order_updated_at: "2026-05-03T08:10:00.000Z",
  payment_id: "22222222-2222-4222-8222-222222222222",
  payment_status: "AUTHORIZED" as const,
  amount_captured_cents: 0,
  payout_status: null,
  payout_hold_reason: null,
  payment_updated_at: "2026-05-03T08:10:00.000Z",
  job_id: "33333333-3333-4333-8333-333333333333",
  job_status: "REQUESTED" as const,
  assigned_driver_id: "44444444-4444-4444-8444-444444444444",
  job_updated_at: "2026-05-03T08:10:00.000Z",
  dispatch_failed_at: null,
  restaurant_name: "Pilot Kitchen"
};

describe("buildEndOfDayReport", () => {
  const now = new Date("2026-05-03T09:00:00.000Z");

  it("returns a clear report for a clean day", () => {
    const report = buildEndOfDayReport([
      {
        ...baseRow,
        order_status: "FULFILLED",
        payment_status: "CAPTURED",
        job_status: "DELIVERED",
        payout_status: "READY",
        order_updated_at: "2026-05-03T08:40:00.000Z",
        payment_updated_at: "2026-05-03T08:40:00.000Z",
        job_updated_at: "2026-05-03T08:40:00.000Z"
      }
    ], "business", "2026-05-03", now);

    expect(report.headline).toBe("No unresolved items today");
    expect(report.unresolvedCount).toBe(0);
    expect(report.unresolvedActions).toHaveLength(0);
  });

  it("includes dispatch failures in the report", () => {
    const report = buildEndOfDayReport([
      { ...baseRow, job_status: "DISPATCH_FAILED", dispatch_failed_at: "2026-05-03T08:45:00.000Z" }
    ], "business", "2026-05-03", now);

    expect(report.incidentsSummary.dispatchFailed).toBe(1);
    expect(report.unresolvedActions[0]?.type).toBe("RETRY_DISPATCH");
  });

  it("includes payment risks in the report", () => {
    const report = buildEndOfDayReport([
      { ...baseRow, order_status: "PAYMENT_FAILED", payment_status: "FAILED" }
    ], "business", "2026-05-03", now);

    expect(report.paymentsSummary.failed).toBe(1);
    expect(report.unresolvedActions[0]?.type).toBe("REVIEW_PAYMENT_RISK");
  });

  it("includes delayed jobs and communication review actions", () => {
    const report = buildEndOfDayReport([
      {
        ...baseRow,
        assigned_driver_id: null,
        job_status: "REQUESTED",
        job_updated_at: "2026-05-03T08:35:00.000Z"
      }
    ], "business", "2026-05-03", now);

    expect(report.operatingSummary.staleOrDelayedJobs).toBe(1);
    expect(report.unresolvedActions.some((item) => item.type === "ASSIGN_DRIVER")).toBe(true);
  });

  it("includes unresolved support escalations in closeout actions", () => {
    const report = buildEndOfDayReport([
      {
        ...baseRow,
        order_status: "FULFILLED",
        payment_status: "CAPTURED",
        job_status: "DELIVERED",
        payout_status: "READY",
        order_updated_at: "2026-05-03T08:40:00.000Z",
        payment_updated_at: "2026-05-03T08:40:00.000Z",
        job_updated_at: "2026-05-03T08:40:00.000Z"
      }
    ], "business", "2026-05-03", now, [
      {
        id: "55555555-5555-4555-8555-555555555555",
        org_id: baseRow.org_id,
        org_name: baseRow.org_name,
        order_id: baseRow.order_id,
        job_id: baseRow.job_id,
        status: "WAITING_ON_CUSTOMER",
        severity: "CRITICAL",
        title: "Customer follow-up required",
        note: "Customer asked for an operator update.",
        created_at: "2026-05-03T08:20:00.000Z",
        updated_at: "2026-05-03T08:20:00.000Z",
        restaurant_name: baseRow.restaurant_name,
        customer_name: baseRow.customer_name
      }
    ]);

    expect(report.unresolvedCount).toBe(1);
    expect(report.unresolvedActions[0]?.type).toBe("REVIEW_SUPPORT_ESCALATION");
    expect(report.unresolvedActions[0]?.severity).toBe("danger");
    expect(report.incidentsSummary.openSupportEscalations).toBe(1);
    expect(report.incidentsSummary.highCriticalSupportEscalations).toBe(1);
  });
});

describe("ReportsService", () => {
  it("scopes business reports to org memberships", async () => {
    const pg = {
      query: vi.fn().mockResolvedValue({ rows: [] })
    };

    const service = new ReportsService(pg as never);
    await service.getBusinessEndOfDayReport("user-1", "2026-05-03");

    const [sql, params] = pg.query.mock.calls[0] as [string, string[]];
    expect(sql).toContain("from public.org_memberships m");
    expect(params).toEqual(["user-1", "2026-05-03"]);
    expect((pg.query.mock.calls[1] as [string, string[]])[0]).toContain("from public.support_escalations se");
  });

  it("keeps admin reports cross-org", async () => {
    const pg = {
      query: vi.fn().mockResolvedValue({ rows: [] })
    };

    const service = new ReportsService(pg as never);
    await service.getAdminEndOfDayReport("2026-05-03");

    const [sql, params] = pg.query.mock.calls[0] as [string, string[]];
    expect(sql).not.toContain("from public.org_memberships m");
    expect(params).toEqual(["2026-05-03"]);
    expect((pg.query.mock.calls[1] as [string, string[]])[0]).not.toContain("from public.org_memberships m");
  });
});
