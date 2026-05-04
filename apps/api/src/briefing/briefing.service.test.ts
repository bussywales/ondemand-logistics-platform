import { describe, expect, it, vi } from "vitest";
import { BriefingService, buildDailyBriefing } from "./briefing.service.js";

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
  eta_minutes: 22,
  job_updated_at: "2026-05-03T08:10:00.000Z",
  dispatch_failed_at: null,
  restaurant_name: "Pilot Kitchen",
  restaurant_slug: "pilot-kitchen"
};

describe("buildDailyBriefing", () => {
  const now = new Date("2026-05-03T09:00:00.000Z");

  it("generates a dispatch-failed attention item", () => {
    const briefing = buildDailyBriefing([
      { ...baseRow, job_status: "DISPATCH_FAILED", dispatch_failed_at: "2026-05-03T08:45:00.000Z" }
    ], "business", now);

    expect(briefing.attentionCount).toBe(1);
    expect(briefing.criticalItems[0]?.category).toBe("dispatch_failed");
    expect(briefing.criticalItems[0]?.href).toBe(`/app/jobs/${baseRow.job_id}`);
    expect(briefing.criticalItems[0]?.orgName).toBe("Pilot Org");
    expect(briefing.criticalItems[0]?.restaurantName).toBe("Pilot Kitchen");
    expect(briefing.recommendations[0]?.label).toContain("Retry");
  });

  it("generates a delay attention item for requested jobs over threshold", () => {
    const briefing = buildDailyBriefing([
      {
        ...baseRow,
        assigned_driver_id: null,
        job_status: "REQUESTED",
        job_updated_at: "2026-05-03T08:40:00.000Z"
      }
    ], "business", now);

    expect(briefing.attentionCount).toBe(1);
    expect(briefing.criticalItems[0]?.category).toBe("active_without_driver");
  });

  it("generates a payment-failed attention item", () => {
    const briefing = buildDailyBriefing([
      { ...baseRow, order_status: "PAYMENT_FAILED", payment_status: "FAILED" }
    ], "business", now);

    expect(briefing.criticalItems[0]?.category).toBe("payment_failed");
    expect(briefing.criticalItems[0]?.entityType).toBe("order");
    expect(briefing.recommendations[0]?.href).toBe(`/app/orders/${baseRow.order_id}`);
  });

  it("generates a delivered-but-uncaptured payment attention item", () => {
    const briefing = buildDailyBriefing([
      { ...baseRow, job_status: "DELIVERED", payment_status: "AUTHORIZED", job_updated_at: "2026-05-03T08:30:00.000Z" }
    ], "business", now);

    expect(briefing.criticalItems[0]?.category).toBe("delivered_uncaptured");
    expect(briefing.criticalItems[0]?.href).toBe("/app/payments");
    expect(briefing.operatingState.paymentRisks).toBe(1);
  });

  it("returns a clear-state briefing when no issues exist", () => {
    const briefing = buildDailyBriefing([
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
    ], "business", now);

    expect(briefing.headline).toBe("Operations look clear");
    expect(briefing.attentionCount).toBe(0);
    expect(briefing.criticalItems).toHaveLength(0);
  });
});

describe("BriefingService", () => {
  it("scopes business briefings to org memberships", async () => {
    const pg = {
      query: vi.fn().mockResolvedValue({ rows: [] })
    };

    const service = new BriefingService(pg as never);
    await service.getBusinessDailyBriefing("user-1");

    const [sql, params] = pg.query.mock.calls[0] as [string, string[]];
    expect(sql).toContain("from public.org_memberships m");
    expect(params).toEqual(["user-1"]);
  });

  it("keeps admin briefings cross-org", async () => {
    const pg = {
      query: vi.fn().mockResolvedValue({ rows: [] })
    };

    const service = new BriefingService(pg as never);
    await service.getAdminDailyBriefing();

    const [sql] = pg.query.mock.calls[0] as [string];
    expect(sql).not.toContain("from public.org_memberships m");
  });

  it("attaches recovery suggestions to job-backed attention items", async () => {
    const pg = {
      query: vi.fn().mockResolvedValue({
        rows: [{ ...baseRow, job_status: "DISPATCH_FAILED", dispatch_failed_at: "2026-05-03T08:45:00.000Z" }]
      })
    };
    const recoveryService = {
      getBusinessRecoverySuggestion: vi.fn().mockResolvedValue({
        jobId: baseRow.job_id,
        orderId: baseRow.order_id,
        issueType: "DISPATCH_FAILED",
        recommendedAction: "RETRY_DISPATCH",
        explanation: "Retry dispatch first: no open driver offer is active.",
        evidence: {
          currentJobStatus: "DISPATCH_FAILED",
          paymentStatus: "AUTHORIZED",
          offerCount: 0,
          latestOfferStatus: null,
          eligibleDriverCount: 0,
          ageMinutes: 15
        },
        links: {
          jobHref: `/app/jobs/${baseRow.job_id}`,
          orderHref: `/app/orders/${baseRow.order_id}`,
          paymentsHref: null
        },
        advisory: "Human approval is required."
      })
    };

    const service = new BriefingService(pg as never, recoveryService as never);
    const briefing = await service.getBusinessDailyBriefing("user-1");

    expect(briefing.criticalItems[0]?.recoverySuggestion?.recommendedAction).toBe("RETRY_DISPATCH");
    expect(recoveryService.getBusinessRecoverySuggestion).toHaveBeenCalledWith(baseRow.job_id, "user-1");
  });
});
