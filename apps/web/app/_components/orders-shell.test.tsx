import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OrderDetail } from "./orders-shell";
import type { OrderFinancialView } from "../_lib/orders-state";
import type { BusinessCustomerOrder } from "../_lib/product-state";

const baseOrder: BusinessCustomerOrder = {
  id: "3ed1057d-4416-4eee-b05d-8501ce691d59",
  status: "PAYMENT_AUTHORIZED",
  restaurant: {
    id: "restaurant-1",
    name: "Pilot Kitchen",
    slug: "pilot-kitchen"
  },
  customer: {
    name: "Ayo Customer",
    email: "ayo@example.com",
    phone: "+447700900000"
  },
  delivery: {
    address: "10 Pilot Street, London",
    addressSummary: "10 Pilot Street",
    notes: null
  },
  items: [],
  subtotalCents: 1200,
  deliveryFeeCents: 250,
  totalCents: 1450,
  currency: "GBP",
  payment: {
    id: "payment-1",
    status: "AUTHORIZED",
    amountAuthorizedCents: 1450,
    amountCapturedCents: 0,
    totalCents: 1450,
    currency: "GBP",
    lastError: null
  },
  job: {
    id: "job-1",
    status: "REQUESTED",
    etaMinutes: 22,
    pickupAddress: "12 Exmouth Market, London",
    dropoffAddress: "10 Pilot Street, London"
  },
  timeline: [],
  createdAt: "2026-05-03T08:00:00.000Z",
  updatedAt: "2026-05-03T08:00:00.000Z"
};

const noTracking = {
  assignedDriverName: null,
  recoverySuggestion: null,
  incidentSummary: null
};

function withFinancials(order: BusinessCustomerOrder): OrderFinancialView {
  return {
    ...order,
    financials: {
      platformFeeCents: 320,
      driverPayoutCents: 1130,
      payoutStatus: "PAID",
      payoutHoldReason: null
    }
  };
}

describe("OrderDetail", () => {
  it("renders fulfilled state for delivered captured orders", () => {
    const order = withFinancials({
      ...baseOrder,
      status: "FULFILLED",
      payment: {
        ...baseOrder.payment,
        status: "CAPTURED",
        amountCapturedCents: 1450
      },
      job: {
        ...baseOrder.job,
        status: "DELIVERED"
      }
    });

    const markup = renderToStaticMarkup(<OrderDetail order={order} tracking={noTracking} />);

    expect(markup).toContain("Customer order fulfilled");
    expect(markup).toContain("Delivery is complete");
  });

  it("renders payment risk decision and /app/payments action", () => {
    const order = withFinancials({
      ...baseOrder,
      status: "PAYMENT_FAILED",
      payment: {
        ...baseOrder.payment,
        status: "FAILED",
        lastError: "card_declined"
      }
    });

    const markup = renderToStaticMarkup(<OrderDetail order={order} tracking={noTracking} />);

    expect(markup).toContain("Payment review required");
    expect(markup).toContain("Review payment risk");
    expect(markup).toContain('href="/app/payments"');
  });

  it("renders delivery blocked state for dispatch failure", () => {
    const order = withFinancials({
      ...baseOrder,
      job: {
        ...baseOrder.job,
        status: "DISPATCH_FAILED"
      }
    });

    const markup = renderToStaticMarkup(<OrderDetail order={order} tracking={noTracking} />);

    expect(markup).toContain("Delivery review required");
    expect(markup).toContain("Open linked delivery job");
  });

  it("renders customer tracking and linked job links", () => {
    const order = withFinancials({
      ...baseOrder
    });

    const markup = renderToStaticMarkup(<OrderDetail order={order} tracking={noTracking} />);

    expect(markup).toContain('href="/track/3ed1057d-4416-4eee-b05d-8501ce691d59"');
    expect(markup).toContain('href="/app/jobs/job-1"');
  });

  it("renders readable timeline copy without raw backend labels", () => {
    const order = withFinancials({
      ...baseOrder,
      timeline: [
        {
          id: "event-1",
          eventType: "JOB_DISPATCH_FAILED",
          createdAt: "2026-05-03T08:15:00.000Z",
          summary: "raw backend payload"
        }
      ]
    });

    const markup = renderToStaticMarkup(<OrderDetail order={order} tracking={noTracking} />);

    expect(markup).toContain("Dispatch under review");
    expect(markup).not.toContain("JOB_DISPATCH_FAILED");
  });
});
