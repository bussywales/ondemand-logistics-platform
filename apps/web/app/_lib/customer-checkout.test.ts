import { describe, expect, it } from "vitest";
import { addCartItem } from "./customer-cart";
import {
  buildCustomerOrderPayload,
  canSubmitCustomerCheckout,
  mapCustomerOrderError
} from "./customer-checkout";
import type { CustomerCheckoutDetails, PublicMenuItemSummary } from "./product-state";

const item: PublicMenuItemSummary = {
  id: "7acacbd8-621d-4b16-bcf1-b4d8653b08b7",
  name: "Chicken Wrap",
  description: "Fresh and hot",
  priceCents: 1299,
  currency: "GBP",
  sortOrder: 0
};

const details: CustomerCheckoutDetails = {
  name: "Ada Customer",
  email: "ADA@EXAMPLE.COM",
  phone: "07500000000",
  deliveryAddress: "10 Pilot Street, Stoke",
  deliveryNotes: "Leave at reception"
};

describe("customer checkout helpers", () => {
  it("builds the public order payload from checkout details and cart", () => {
    const cart = addCartItem(addCartItem({}, item), item);
    const payload = buildCustomerOrderPayload(details, cart, "pm_test_123");

    expect(payload).toEqual({
      customer: {
        name: "Ada Customer",
        email: "ada@example.com",
        phone: "07500000000"
      },
      delivery: {
        address: "10 Pilot Street, Stoke",
        notes: "Leave at reception"
      },
      items: [{ menuItemId: item.id, quantity: 2 }],
      paymentMethodId: "pm_test_123"
    });
  });

  it("requires customer details, cart items, and a payment method before submit", () => {
    expect(canSubmitCustomerCheckout(details, addCartItem({}, item), "pm_test_123")).toBe(true);
    expect(canSubmitCustomerCheckout(details, {}, "pm_test_123")).toBe(false);
    expect(canSubmitCustomerCheckout({ ...details, email: "invalid" }, addCartItem({}, item), "pm_test_123")).toBe(false);
    expect(canSubmitCustomerCheckout(details, addCartItem({}, item), null)).toBe(false);
  });

  it("maps backend and transport errors to customer-safe copy", () => {
    expect(mapCustomerOrderError(new Error("menu_item_not_orderable"))).toContain("no longer available");
    expect(mapCustomerOrderError(new Error("Request failed with status 500"))).toBe(
      "The order could not be placed. Try again or contact support."
    );
  });
});
