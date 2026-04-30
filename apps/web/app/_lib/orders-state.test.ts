import { describe, expect, it } from "vitest";
import {
  formatOrderTimeAgo,
  getOrderDecisionState,
  matchesOrderFilter,
  type OrderFilterKey
} from "./orders-state";
import type { BusinessCustomerOrder } from "./product-state";

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
  createdAt: "2026-04-30T11:55:00.000Z",
  updatedAt: "2026-04-30T11:55:00.000Z"
};

function filtered(order: BusinessCustomerOrder, filter: OrderFilterKey) {
  return matchesOrderFilter(order, filter);
}

describe("orders-state", () => {
  it("groups an authorized requested order into the new/authorized filter", () => {
    expect(filtered(baseOrder, "new-authorized")).toBe(true);
    expect(filtered(baseOrder, "fulfilled")).toBe(false);
  });

  it("groups an active delivery into the in-delivery filter", () => {
    const order: BusinessCustomerOrder = {
      ...baseOrder,
      job: {
        ...baseOrder.job,
        status: "EN_ROUTE_DROP"
      }
    };

    expect(filtered(order, "in-delivery")).toBe(true);
    expect(getOrderDecisionState(order).headline).toBe("Order in delivery");
  });

  it("groups a delivered captured order into fulfilled", () => {
    const order: BusinessCustomerOrder = {
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
    };

    expect(filtered(order, "fulfilled")).toBe(true);
    expect(getOrderDecisionState(order).severity).toBe("success");
  });

  it("treats failed payment as a payment-failed queue item", () => {
    const order: BusinessCustomerOrder = {
      ...baseOrder,
      status: "PAYMENT_FAILED",
      payment: {
        ...baseOrder.payment,
        status: "FAILED",
        lastError: "card_declined"
      }
    };

    expect(filtered(order, "payment-failed")).toBe(true);
    expect(getOrderDecisionState(order).headline).toBe("Payment failed");
  });

  it("formats compact received times for recent orders", () => {
    expect(formatOrderTimeAgo("2026-04-30T11:55:00.000Z", new Date("2026-04-30T12:00:00.000Z"))).toBe("5 min ago");
  });
});
