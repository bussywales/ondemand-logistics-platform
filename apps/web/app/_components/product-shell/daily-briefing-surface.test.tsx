import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DailyBriefingSurface } from "./daily-briefing-surface";
import type { DailyBriefing } from "../../_lib/product-state";

const attentionBriefing: DailyBriefing = {
  scope: "business",
  generatedAt: "2026-05-03T09:00:00.000Z",
  headline: "2 items need attention before service",
  summary: "Review dispatch, payment, and delivery exceptions before expanding service volume.",
  attentionCount: 2,
  criticalItems: [
    {
      id: "dispatch_failed:order-1",
      category: "dispatch_failed",
      severity: "danger",
      title: "Dispatch failed",
      summary: "Pilot Kitchen order for Ada Customer is still waiting for a courier 18 min after dispatch failed.",
      reason: "No eligible driver accepted the latest dispatch attempt.",
      entityType: "job",
      entityId: "job-1",
      orderId: "order-1",
      jobId: "job-1",
      paymentId: "payment-1",
      orgId: "org-1",
      orgName: "Pilot Org",
      restaurantName: "Pilot Kitchen",
      customerName: "Ada Customer",
      orderStatus: "PAYMENT_AUTHORIZED",
      jobStatus: "DISPATCH_FAILED",
      paymentStatus: "AUTHORIZED",
      detectedAt: "2026-05-03T08:42:00.000Z",
      ageMinutes: 18,
      href: "/app/jobs/job-1",
      incidentSummary: {
        incidentType: "DISPATCH_FAILED_UNRESOLVED",
        severity: "critical",
        jobId: "job-1",
        orderId: "order-1",
        title: "Dispatch failed and remains unresolved",
        summary: "Pilot Kitchen order for Ada Customer is still blocked 18 min after dispatch failed.",
        likelyCause: "No courier accepted or completed the latest dispatch path.",
        currentState: "The job is in DISPATCH_FAILED and no active courier movement is recorded.",
        elapsedMinutes: 18,
        evidence: {
          currentJobStatus: "DISPATCH_FAILED",
          currentOrderStatus: "PAYMENT_AUTHORIZED",
          currentPaymentStatus: "AUTHORIZED",
          assignedDriverName: null,
          lastTimelineEventType: "JOB_DISPATCH_FAILED",
          lastTimelineEventAt: "2026-05-03T08:42:00.000Z",
          dispatchAttemptsCount: 1
        },
        recommendedNextAction: "Open the job and review dispatch recovery guidance.",
        links: {
          jobHref: "/app/jobs/job-1",
          orderHref: "/app/orders/order-1",
          paymentsHref: "/app/payments"
        },
        communicationDrafts: {
          customerDraft: "We are reviewing a delay with your delivery.",
          restaurantDraft: "We are reviewing the delivery delay.",
          driverDraft: null
        }
      },
      recoverySuggestion: {
        jobId: "job-1",
        orderId: "order-1",
        issueType: "DISPATCH_FAILED",
        recommendedAction: "RETRY_DISPATCH",
        explanation: "Retry dispatch first: no open driver offer is active.",
        evidence: {
          currentJobStatus: "DISPATCH_FAILED",
          paymentStatus: "AUTHORIZED",
          offerCount: 0,
          latestOfferStatus: null,
          eligibleDriverCount: 0,
          ageMinutes: 18
        },
        links: {
          jobHref: "/app/jobs/job-1",
          orderHref: "/app/orders/order-1",
          paymentsHref: null
        },
        advisory: "Human approval is required for all recovery actions."
      }
    }
  ],
  operatingState: {
    ordersToday: 4,
    activeJobs: 2,
    fulfilledOrders: 1,
    paymentRisks: 1,
    availableDrivers: null
  },
  recommendations: [
    {
      id: "rec:dispatch_failed:order-1",
      label: "Retry or reassign dispatch",
      summary: "Open the job, retry dispatch, or manually assign a courier after reviewing eligibility.",
      href: "/app/jobs/job-1",
      entityType: "job",
      entityId: "job-1",
      orderId: "order-1",
      jobId: "job-1",
      paymentId: "payment-1"
    }
  ],
  guidance:
    "This briefing is based on current ShipWright operational signals. Human approval is required for all recovery actions."
};

const clearBriefing: DailyBriefing = {
  ...attentionBriefing,
  headline: "Operations look clear",
  summary: "No current dispatch, payment, or delivery signals require immediate operator intervention.",
  attentionCount: 0,
  criticalItems: [],
  recommendations: []
};

describe("DailyBriefingSurface", () => {
  it("renders an attention briefing with recommendation links", () => {
    const markup = renderToStaticMarkup(<DailyBriefingSurface briefing={attentionBriefing} />);

    expect(markup).toContain("2 items need attention before service");
    expect(markup).toContain("Command Intelligence");
    expect(markup).toContain("Dispatch failed");
    expect(markup).toContain("Retry or reassign dispatch");
    expect(markup).toContain('href="/app/jobs/job-1"');
    expect(markup).toContain('href="/app/reports/end-of-day"');
    expect(markup).toContain('href="/app/payments"');
    expect(markup).toContain('href="/app/jobs"');
    expect(markup).toContain("Human approval is required for all recovery actions.");
    expect(markup).toContain("Recommended next step");
    expect(markup).toContain("Next action: Retry Dispatch");
    expect(markup).toContain("It does not take recovery actions automatically.");
    expect(markup).not.toContain("Dispatch failed and remains unresolved");
  });

  it("renders a clear briefing without implying autonomous action", () => {
    const markup = renderToStaticMarkup(<DailyBriefingSurface briefing={clearBriefing} />);

    expect(markup).toContain("Operations look clear");
    expect(markup).toContain("No immediate recovery actions are queued.");
    expect(markup).toContain("Human approval is required for all recovery actions.");
    expect(markup).toContain("It does not take recovery actions automatically.");
    expect(markup).not.toContain("AI-generated");
  });
});
