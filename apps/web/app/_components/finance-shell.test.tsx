import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FinanceView } from "./finance-shell";
import type { FinanceReviewRecord, FinanceSummary, FinanceTransaction } from "../_lib/product-state";

const transaction: FinanceTransaction = {
  orgId: "33333333-3333-4333-8333-333333333333",
  orgName: "Pilot Org",
  restaurantId: "55555555-5555-4555-8555-555555555555",
  restaurantName: "Pilot Kitchen",
  orderId: "44444444-4444-4444-8444-444444444444",
  jobId: "57bf7cf0-7ac2-47a7-8fd5-83a96be6c848",
  paymentId: "97077fd3-d5dc-4c4d-9d40-db262f6eab54",
  customerReference: "Ada Customer",
  amountCents: 1886,
  capturedAmountCents: 1886,
  pendingAmountCents: 0,
  refundedAmountCents: 0,
  currency: "GBP",
  paymentStatus: "CAPTURED",
  orderStatus: "PAYMENT_AUTHORIZED",
  jobStatus: "DISPATCH_FAILED",
  payoutStatus: null,
  capturedAt: "2026-05-02T09:30:00.000Z",
  createdAt: "2026-05-02T09:00:00.000Z",
  updatedAt: "2026-05-02T09:30:00.000Z",
  financeReviewStatus: "REFUND_REVIEW",
  refundReviewRequired: true,
  refundReviewReason: "Payment was captured but fulfilment failed.",
  recommendedNextAction: "Review support log before refund decision. Confirm with merchant/customer before any refund."
};

const summary: FinanceSummary = {
  scope: "admin",
  currency: "GBP",
  totalCapturedAmountCents: 1886,
  totalPendingAmountCents: 0,
  totalFailedAmountCents: 0,
  capturedPaymentCount: 1,
  pendingPaymentCount: 0,
  failedPaymentCount: 0,
  fulfilledOrderCount: 0,
  deliveredJobCount: 0,
  ordersNeedingFinanceReview: 1,
  refundReviewCandidates: 1,
  openFinanceReviewCount: 1,
  waitingSupportFinanceReviewCount: 0,
  recentlyResolvedFinanceReviewCount: 0,
  latestFinanceEvents: [transaction],
  generatedAt: "2026-05-02T09:30:00.000Z"
};

const review: FinanceReviewRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  orgId: "33333333-3333-4333-8333-333333333333",
  orgName: "Pilot Org",
  orderId: transaction.orderId,
  jobId: transaction.jobId,
  paymentId: transaction.paymentId,
  supportEscalationId: null,
  reviewType: "REFUND_REVIEW",
  status: "OPEN",
  severity: "MEDIUM",
  reason: "Captured payment needs manual refund review.",
  summary: "Payment captured but fulfilment failed.",
  ownerUserId: null,
  ownerLabel: "Finance operator",
  resolution: null,
  resolutionReason: null,
  resolvedAt: null,
  resolvedBy: null,
  metadata: {},
  createdAt: "2026-05-02T09:31:00.000Z",
  updatedAt: "2026-05-02T09:31:00.000Z"
};

describe("FinanceView", () => {
  it("renders admin finance posture and refund-review copy", () => {
    const markup = renderToStaticMarkup(<FinanceView admin reviews={[review]} summary={summary} transactions={[transaction]} />);

    expect(markup).toContain("Platform finance review");
    expect(markup).toContain("Review only");
    expect(markup).toContain("Persistent review workflow");
    expect(markup).toContain("Admin view is read-only in v1.1");
    expect(markup).toContain("No refund button is available in v1");
    expect(markup).toContain("Refund Review");
    expect(markup).not.toMatch(/card number|client secret|provider payment intent/i);
  });

  it("renders business finance posture", () => {
    const markup = renderToStaticMarkup(
      <FinanceView
        onUpdateReview={() => undefined}
        reviews={[{ ...review, orgName: null }]}
        summary={{ ...summary, scope: "business" }}
        transactions={[{ ...transaction, orgId: null, orgName: null }]}
      />
    );

    expect(markup).toContain("Finance and settlement visibility");
    expect(markup).toContain("Payment, closeout, and refund-review posture for this workspace");
    expect(markup).toContain("Review exists");
    expect(markup).toContain("Update review");
    expect(markup).toContain("No automated refunds are performed");
    expect(markup).toContain("class=\"ops-layout\"");
    expect(markup).toContain("class=\"ops-sidebar\"");
    expect(markup).toContain("Workspace finance navigation");
    expect(markup).toContain("href=\"/app/finance\"");
    expect(markup).toContain("ops-nav-link active");
    expect(markup).toContain("Finance posture");
  });

  it("renders create review action for untracked refund candidates", () => {
    const markup = renderToStaticMarkup(<FinanceView summary={{ ...summary, scope: "business", openFinanceReviewCount: 0 }} transactions={[{ ...transaction, orgId: null, orgName: null }]} />);

    expect(markup).toContain("Create review");
    expect(markup).toContain("No automated refunds are performed");
  });
});
