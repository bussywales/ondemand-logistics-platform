import { describe, expect, it, vi } from "vitest";
import { UnprocessableEntityException } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service.js";

const NOW = "2026-05-23T10:00:00.000Z";
const EVENT_ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  event_name: "CTA_CLICKED",
  source: "public_site",
  path: "/",
  referrer: null,
  session_id: "session_123456",
  visitor_id: null,
  demo_request_id: null,
  metadata: { label: "Start controlled pilot", source: "hero" },
  created_at: NOW
};

function createService(rows: unknown[] = [EVENT_ROW]) {
  const query = vi.fn().mockResolvedValueOnce({ rows: [{ count: 0 }] }).mockResolvedValueOnce({ rows });
  return {
    query,
    service: new AnalyticsService({ query } as never)
  };
}

describe("AnalyticsService", () => {
  it("creates public analytics events without storing raw request data", async () => {
    const { query, service } = createService();

    const result = await service.createPublicEvent(
      {
        eventName: "CTA_CLICKED",
        path: "/",
        sessionId: "session_123456",
        metadata: { label: "Start controlled pilot", source: "hero" }
      },
      {
        headers: {
          "x-forwarded-for": "203.0.113.10",
          "user-agent": "Example Browser"
        }
      }
    );

    expect(result.eventName).toBe("CTA_CLICKED");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("from public.analytics_events"), [expect.any(String)]);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("insert into public.analytics_events"),
      expect.arrayContaining(["CTA_CLICKED", "public_site", "/", null, "session_123456", null, null])
    );
    const insertArgs = query.mock.calls[1]?.[1] as unknown[];
    expect(insertArgs.at(-1)).toMatch(/^[a-f0-9]{64}$/);
    expect(insertArgs.at(-2)).toMatch(/^[a-f0-9]{64}$/);
    expect(insertArgs).not.toContain("203.0.113.10");
    expect(insertArgs).not.toContain("Example Browser");
  });

  it("rejects unknown event names", async () => {
    const { service } = createService();

    await expect(service.createPublicEvent({ eventName: "RAW_TRACK" }, null)).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it("rejects oversized metadata", async () => {
    const { service } = createService();

    await expect(
      service.createPublicEvent({ eventName: "CTA_CLICKED", metadata: { blob: "x".repeat(5000) } }, null)
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it("rate limits abusive public analytics writes by hashed IP", async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [{ count: 121 }] });
    const service = new AnalyticsService({ query } as never);

    await expect(
      service.createPublicEvent({ eventName: "PUBLIC_PAGE_VIEW", path: "/pricing" }, { headers: { "x-forwarded-for": "203.0.113.10" } })
    ).rejects.toMatchObject({ status: 429 });
  });

  it("returns admin analytics summary counts", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ page_views: 10, cta_clicks: 5, demo_form_starts: 4, demo_request_submits: 2, demo_request_failures: 1 }] })
      .mockResolvedValueOnce({ rows: [{ page_views: 30, cta_clicks: 12, demo_form_starts: 8, demo_request_submits: 4, demo_request_failures: 1 }] })
      .mockResolvedValueOnce({ rows: [{ label: "Start controlled pilot", source: "hero", count: 7 }] })
      .mockResolvedValueOnce({ rows: [{ label: "pilot", source: "pricing", count: 3 }] })
      .mockResolvedValueOnce({ rows: [EVENT_ROW] });
    const service = new AnalyticsService({ query } as never);

    const summary = await service.getAdminSummary({});

    expect(summary.windows.last7Days.pageViews).toBe(10);
    expect(summary.windows.last7Days.formStartToSubmitRate).toBe(0.5);
    expect(summary.ctaPerformance[0]).toMatchObject({ label: "Start controlled pilot", count: 7 });
    expect(summary.pricingInterest[0]).toMatchObject({ label: "pilot", count: 3 });
    expect(summary.recentEvents[0]?.eventName).toBe("CTA_CLICKED");
  });
});
