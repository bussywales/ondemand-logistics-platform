import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  buildPublicTrackingHref,
  buildRestaurantMenuHref,
  CustomerOrderSuccessState,
  getAddItemButtonLabel,
  getQuantityControlButtonText,
  getQuantityControlLabels
} from "./customer-ordering-shell";

describe("CustomerOrderingShell", () => {
  it("builds the public restaurant menu href from the current slug", () => {
    expect(buildRestaurantMenuHref("pilot-kitchen-1777370757")).toBe(
      "/restaurants/pilot-kitchen-1777370757"
    );
  });

  it("builds the public order tracking href from the order id", () => {
    expect(buildPublicTrackingHref("order_123")).toBe("/track/order_123");
  });

  it("builds a clear add button label for menu items", () => {
    expect(getAddItemButtonLabel("Chicken wrap")).toBe("Add Chicken wrap");
  });

  it("returns clear quantity control labels and button copy", () => {
    expect(getQuantityControlLabels("Chicken wrap")).toEqual({
      decrease: "Decrease quantity for Chicken wrap",
      increase: "Increase quantity for Chicken wrap",
      remove: "Remove Chicken wrap from cart"
    });
    expect(getQuantityControlButtonText()).toEqual({
      decrease: "Less",
      increase: "More"
    });
  });

  it("renders the paid order confirmation surface with order, job, and payment details", () => {
    const markup = renderToStaticMarkup(
      <CustomerOrderSuccessState
        onBackToMenu={() => {}}
        orderResult={{
          order: {
            id: "order_123",
            restaurantId: "restaurant_123",
            jobId: "job_123",
            paymentId: "payment_123",
            status: "PAYMENT_AUTHORIZED",
            customerName: "Ada Customer",
            customerEmail: "ada@example.com",
            customerPhone: "07123456789",
            deliveryAddress: "10 Pilot Street",
            deliveryNotes: null,
            subtotalCents: 1486,
            deliveryFeeCents: 400,
            totalCents: 1886,
            currency: "GBP",
            createdAt: "2026-05-02T10:00:00.000Z",
            items: []
          },
          job: {
            id: "job_123",
            status: "REQUESTED",
            etaMinutes: 22,
            pickupAddress: "Pilot Kitchen pickup",
            dropoffAddress: "10 Pilot Street"
          },
          payment: {
            id: "payment_123",
            status: "AUTHORIZED",
            amountAuthorizedCents: 1886,
            amountCapturedCents: 0,
            totalCents: 1886,
            currency: "GBP",
            lastError: null
          }
        }}
      />
    );

    expect(markup).toContain("Back to menu");
    expect(markup).toContain("Track order");
    expect(markup).toContain("/track/order_123");
    expect(markup).toContain("order_123");
    expect(markup).toContain("job_123");
    expect(markup).toContain("AUTHORIZED");
  });
});
