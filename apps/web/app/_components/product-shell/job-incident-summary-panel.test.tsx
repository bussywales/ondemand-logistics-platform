import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JobIncidentSummaryPanel } from "./job-incident-summary-panel";
import type { OperationalIncidentSummary } from "../../_lib/product-state";

const incident: OperationalIncidentSummary = {
  incidentType: "DISPATCH_FAILED_UNRESOLVED",
  severity: "critical",
  jobId: "job-1",
  orderId: "order-1",
  title: "Dispatch failed and remains unresolved",
  summary: "Pilot Kitchen order is still blocked 18 min after dispatch failed.",
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
};

describe("JobIncidentSummaryPanel", () => {
  it("renders incident summary and draft sections with review warning", () => {
    const markup = renderToStaticMarkup(<JobIncidentSummaryPanel incidentSummary={incident} />);

    expect(markup).toContain("Command Intelligence");
    expect(markup).toContain("Dispatch failed and remains unresolved");
    expect(markup).toContain("Draft only — review before sending");
    expect(markup).toContain("Recommended next step");
    expect(markup).toContain("Based on current operational signals. Review before acting. Human approval required.");
    expect(markup).toContain("Customer draft");
    expect(markup).toContain("Restaurant draft");
  });

  it("renders nothing for clear jobs", () => {
    const markup = renderToStaticMarkup(<JobIncidentSummaryPanel incidentSummary={null} />);
    expect(markup).toBe("");
  });
});
