import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
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
            status: "PAYMENT_AUTHORIZED",
            totalCents: 1886,
            currency: "GBP"
          },
          job: {
            id: "job_123"
          },
          payment: {
            status: "PAYMENT_AUTHORIZED"
          }
        }}
      />
    );

    expect(markup).toContain("Back to menu");
    expect(markup).toContain("order_123");
    expect(markup).toContain("job_123");
    expect(markup).toContain("PAYMENT AUTHORIZED");
  });
});
