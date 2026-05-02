import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PaymentRiskEmptyState, PaymentRiskQueueRow } from "./payments-shell";
import type { OrderFinancialView } from "../_lib/orders-state";

const order: OrderFinancialView = {
  id: "3ed1057d-4416-4eee-b05d-8501ce691d59",
  status: "PAYMENT_AUTHORIZED",
  restaurant: {
    id: "restaurant-1",
    name: "Pilot Kitchen",
    slug: "pilot-kitchen"
  },
  customer: {
    name: "Ada Customer",
    email: "ada@example.com",
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
    status: "DELIVERED",
    etaMinutes: 22,
    pickupAddress: "12 Exmouth Market, London",
    dropoffAddress: "10 Pilot Street, London"
  },
  timeline: [],
  createdAt: "2026-04-30T11:55:00.000Z",
  updatedAt: "2026-04-30T12:10:00.000Z",
  financials: {
    platformFeeCents: 320,
    driverPayoutCents: 1130,
    payoutStatus: null,
    payoutHoldReason: "Driver banking check pending"
  }
};

describe("PaymentsShell", () => {
  it("renders the no-risk empty state with orders CTA", () => {
    const markup = renderToStaticMarkup(<PaymentRiskEmptyState />);

    expect(markup).toContain("No payment risks right now");
    expect(markup).toContain("Payment state is still visible on each order.");
    expect(markup).toContain("Open orders");
    expect(markup).toContain("href=\"/app/orders\"");
  });

  it("renders risk rows as order-first operational entries", () => {
    const markup = renderToStaticMarkup(<PaymentRiskQueueRow order={order} />);

    expect(markup).toContain("Order 3ED1057D");
    expect(markup).toContain("Ada Customer");
    expect(markup).toContain("Payment");
    expect(markup).toContain("Delivery");
    expect(markup).toContain("Fulfilment");
    expect(markup).toContain("Review payment risk");
    expect(markup).toContain("Driver banking check pending");
    expect(markup).toContain("href=\"/app/orders/3ed1057d-4416-4eee-b05d-8501ce691d59\"");
    expect(markup).toContain("href=\"/app/jobs/job-1\"");
  });
});
