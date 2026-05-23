import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminAnalyticsView } from "./admin-analytics-shell";
import type { AdminAnalyticsSummary } from "../_lib/product-state";

const summary: AdminAnalyticsSummary = {
  generatedAt: "2026-05-23T10:00:00.000Z",
  windows: {
    last7Days: {
      pageViews: 8,
      ctaClicks: 4,
      demoFormStarts: 2,
      demoRequestSubmits: 1,
      demoRequestFailures: 0,
      formStartToSubmitRate: 0.5,
      ctaToDemoRequestRate: 0.25
    },
    last30Days: {
      pageViews: 30,
      ctaClicks: 12,
      demoFormStarts: 5,
      demoRequestSubmits: 3,
      demoRequestFailures: 1,
      formStartToSubmitRate: 0.6,
      ctaToDemoRequestRate: 0.25
    }
  },
  ctaPerformance: [{ label: "Start controlled pilot", source: "hero", count: 5 }],
  pricingInterest: [{ label: "pilot", source: "pricing", count: 3 }],
  recentEvents: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      eventName: "CTA_CLICKED",
      source: "public_site",
      path: "/pricing",
      referrer: null,
      sessionId: "session_123456",
      visitorId: null,
      demoRequestId: null,
      metadata: { label: "Start controlled pilot", source: "hero" },
      createdAt: "2026-05-23T10:00:00.000Z"
    }
  ]
};

describe("AdminAnalyticsView", () => {
  it("renders public funnel summary and privacy copy", () => {
    const html = renderToStaticMarkup(<AdminAnalyticsView summary={summary} />);

    expect(html).toContain("Public funnel analytics");
    expect(html).toContain("Raw IP addresses and raw user agents are not stored");
    expect(html).toContain("CTA performance");
    expect(html).toContain("Start controlled pilot");
  });
});
