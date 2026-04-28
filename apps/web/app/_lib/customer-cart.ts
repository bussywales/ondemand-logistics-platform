import type { PublicMenuItemSummary } from "./product-state";

export type CartLine = {
  item: PublicMenuItemSummary;
  quantity: number;
};

export type CartState = Record<string, CartLine>;

export function addCartItem(cart: CartState, item: PublicMenuItemSummary): CartState {
  const current = cart[item.id];
  return {
    ...cart,
    [item.id]: {
      item,
      quantity: current ? current.quantity + 1 : 1
    }
  };
}

export function setCartItemQuantity(cart: CartState, itemId: string, quantity: number): CartState {
  const current = cart[itemId];
  if (!current) {
    return cart;
  }

  const nextQuantity = Math.floor(quantity);
  if (nextQuantity <= 0) {
    return removeCartItem(cart, itemId);
  }

  return {
    ...cart,
    [itemId]: {
      ...current,
      quantity: nextQuantity
    }
  };
}

export function incrementCartItem(cart: CartState, itemId: string): CartState {
  const current = cart[itemId];
  return current ? setCartItemQuantity(cart, itemId, current.quantity + 1) : cart;
}

export function decrementCartItem(cart: CartState, itemId: string): CartState {
  const current = cart[itemId];
  return current ? setCartItemQuantity(cart, itemId, current.quantity - 1) : cart;
}

export function removeCartItem(cart: CartState, itemId: string): CartState {
  const { [itemId]: _removed, ...rest } = cart;
  return rest;
}

export function getCartLines(cart: CartState) {
  return Object.values(cart);
}

export function getCartItemCount(cart: CartState) {
  return getCartLines(cart).reduce((total, line) => total + line.quantity, 0);
}

export function getCartSubtotalCents(cart: CartState) {
  return getCartLines(cart).reduce((total, line) => total + line.item.priceCents * line.quantity, 0);
}
