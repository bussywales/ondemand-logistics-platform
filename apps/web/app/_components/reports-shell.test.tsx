import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EndOfDayReportEmptyState, EndOfDayReportView } from "./reports-shell";
import type { EndOfDayReport } from "../_lib/product-state";

const reportWithFollowUp: EndOfDayReport = {
  scope: "business",
  date: "2026-05-03",
  generatedAt: "2026-05-03T21:00:00.000Z",
  headline: "12 orders completed, 2 items need follow-up",
  summary: "Dispatch, payment, delay, and payout signals are summarised here for closeout review.",
  unresolvedCount: 2,
  operatingSummary: {
    ordersReceived: 14,
    fulfilledOrders: 12,
    activeOrUnresolvedOrders: 2,
    cancelledOrPaymentFailedOrders: 1,
    activeJobs: 1,
    deliveredJobs: 12,
    dispatchFailures: 1,
    staleOrDelayedJobs: 1
  },
  paymentsSummary: {
    authorized: 1,
    captured: 12,
    failed: 1,
    deliveredNotCaptured: 1,
    payoutReviewCount: 1
  },
  incidentsSummary: {
    dispatchFailed: 1,
    delayIncidents: 1,
    paymentRisks: 2,
    driverFollowUpIncidents: 0,
    unresolvedRecommendations: 2
  },
  unresolvedActions: [
    {
      id: "action-1",
      type: "RETRY_DISPATCH",
      severity: "danger",
      label: "Retry dispatch",
      summary: "Pilot Kitchen delivery remains unresolved after dispatch failed.",
      href: "/app/jobs/job-1",
      entityType: "job",
      entityId: "job-1",
      orderId: "order-1",
      jobId: "job-1",
      paymentId: "payment-1"
    },
    {
      id: "action-2",
      type: "REVIEW_PAYMENT_RISK",
      severity: "warning",
      label: "Review payment risk",
      summary: "Delivered order needs capture review.",
      href: "/app/payments",
      entityType: "payment",
      entityId: "payment-2",
      orderId: "order-2",
      jobId: "job-2",
      paymentId: "payment-2"
    }
  ],
  evidenceLinks: [
    {
      id: "evidence-1",
      label: "Order ORDER001",
      summary: "Pilot Kitchen · payment failed",
      href: "/app/orders/order-1",
      entityType: "order",
      entityId: "order-1",
      orderId: "order-1",
      jobId: "job-1",
      paymentId: "payment-1"
    }
  ],
  guidance:
    "This report summarises operational signals. Operators remain responsible for recovery, refunds, cancellations, and customer communications."
};

const clearReport: EndOfDayReport = {
  ...reportWithFollowUp,
  headline: "No unresolved items today",
  summary: "The day closed without unresolved dispatch, payment, or delay follow-up items.",
  unresolvedCount: 0,
  unresolvedActions: []
};

describe("ReportsShell", () => {
  it("renders an unresolved report with action links and human approval note", () => {
    const markup = renderToStaticMarkup(<EndOfDayReportView report={reportWithFollowUp} />);

    expect(markup).toContain("12 orders completed, 2 items need follow-up");
    expect(markup).toContain("Command Intelligence");
    expect(markup).toContain("Retry dispatch");
    expect(markup).toContain("Review payment risk");
    expect(markup).toContain("href=\"/app/jobs/job-1\"");
    expect(markup).toContain("href=\"/app/payments\"");
    expect(markup).toContain("Based on current operational signals. Review before acting. Human approval required.");
    expect(markup).toContain("Operators remain responsible for recovery, refunds, cancellations, and customer communications.");
  });

  it("renders a clear report with the no-risk empty state", () => {
    const markup = renderToStaticMarkup(<EndOfDayReportView report={clearReport} />);

    expect(markup).toContain("No unresolved items today");
    expect(markup).toContain("Open orders");
    expect(markup).toContain("href=\"/app/orders\"");
  });

  it("renders the standalone empty state copy", () => {
    const markup = renderToStaticMarkup(<EndOfDayReportEmptyState />);

    expect(markup).toContain("No unresolved items today");
    expect(markup).toContain("The day closed without unresolved dispatch, payment, or delay follow-up items.");
  });
});
