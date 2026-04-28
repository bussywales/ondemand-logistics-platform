import { describe, expect, it } from "vitest";
import {
  addCartItem,
  decrementCartItem,
  getCartItemCount,
  getCartLines,
  getCartSubtotalCents,
  incrementCartItem,
  removeCartItem,
  setCartItemQuantity,
  type CartState
} from "./customer-cart";
import type { PublicMenuItemSummary } from "./product-state";

const item: PublicMenuItemSummary = {
  id: "item-1",
  name: "Chicken Wrap",
  description: "Fresh and hot",
  priceCents: 1299,
  currency: "GBP",
  sortOrder: 0
};

const secondItem: PublicMenuItemSummary = {
  id: "item-2",
  name: "Chips",
  description: null,
  priceCents: 399,
  currency: "GBP",
  sortOrder: 1
};

describe("customer cart", () => {
  it("adds items and increments existing lines", () => {
    const cart = addCartItem(addCartItem({}, item), item);

    expect(getCartLines(cart)).toEqual([{ item, quantity: 2 }]);
    expect(getCartItemCount(cart)).toBe(2);
    expect(getCartSubtotalCents(cart)).toBe(2598);
  });

  it("updates, decrements, and removes item quantities", () => {
    const initial = addCartItem(addCartItem({} satisfies CartState, item), secondItem);
    const updated = setCartItemQuantity(initial, item.id, 3);
    const incremented = incrementCartItem(updated, secondItem.id);
    const decremented = decrementCartItem(incremented, item.id);
    const removed = removeCartItem(decremented, secondItem.id);

    expect(removed).toEqual({
      [item.id]: {
        item,
        quantity: 2
      }
    });
    expect(getCartSubtotalCents(removed)).toBe(2598);
  });

  it("removes a line when quantity reaches zero", () => {
    const cart = decrementCartItem(addCartItem({}, item), item.id);

    expect(cart).toEqual({});
  });
});
