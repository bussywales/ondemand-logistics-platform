import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { JobDecisionSurface } from "./job-decision-surface";
import type { AppJob } from "../../_lib/product-state";

const job: AppJob = {
  id: "job-1",
  quoteId: "quote-1",
  status: "DISPATCH_FAILED",
  pickupAddress: "1 Pickup Street",
  dropoffAddress: "2 Dropoff Street",
  distanceMiles: 2.2,
  etaMinutes: 18,
  vehicleRequired: "BIKE",
  premiumDistanceFlag: false,
  attentionLevel: "BLOCKER",
  attentionReason: "No courier accepted",
  customerTotalCents: 1899,
  driverPayoutGrossCents: 1200,
  platformFeeCents: 699,
  pricingVersion: "v1",
  createdAt: "2026-05-03T08:00:00.000Z",
  tracking: {
    latestLocation: null,
    assignedDriverName: null,
    dispatchAttempts: [],
    timeline: []
  },
  payment: {
    id: "payment-1",
    status: "AUTHORIZED",
    customerTotalCents: 1899,
    platformFeeCents: 699,
    payoutGrossCents: 1200,
    amountAuthorizedCents: 1899,
    amountCapturedCents: 0,
    amountRefundedCents: 0,
    currency: "GBP",
    clientSecret: null,
    lastError: null
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
    advisory: "Human approval is required before recovery action."
  }
};

describe("JobDecisionSurface", () => {
  it("renders deterministic recovery guidance without implying automation", () => {
    const markup = renderToStaticMarkup(
      <JobDecisionSurface
        actionSubmitting={false}
        job={job}
        jobDecision={null}
        onAssignDriver={vi.fn()}
        onRetryDispatch={vi.fn()}
      />
    );

    expect(markup).toContain("Recovery suggestion");
    expect(markup).toContain("Retry dispatch first: no open driver offer is active.");
    expect(markup).toContain("Command Intelligence");
    expect(markup).toContain("Recommended next step: Retry Dispatch");
    expect(markup).toContain("Based on current operational signals. Review before acting. Human approval required.");
    expect(markup).toContain("/track/order-1");
    expect(markup).toContain("Open customer tracking");
    expect(markup).not.toContain("automatically");
    expect(markup).not.toContain("AI-generated");
  });
});
