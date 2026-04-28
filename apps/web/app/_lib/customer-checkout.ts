import type { CartState } from "./customer-cart";
import { getCartLines } from "./customer-cart";
import type { CustomerCheckoutDetails } from "./product-state";

export type CustomerOrderPayload = {
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  delivery: {
    address: string;
    notes: string | null;
  };
  items: Array<{
    menuItemId: string;
    quantity: number;
  }>;
  paymentMethodId: string;
};

export function buildCustomerOrderPayload(
  details: CustomerCheckoutDetails,
  cart: CartState,
  paymentMethodId: string
): CustomerOrderPayload {
  return {
    customer: {
      name: details.name.trim(),
      email: details.email.trim().toLowerCase(),
      phone: details.phone.trim()
    },
    delivery: {
      address: details.deliveryAddress.trim(),
      notes: details.deliveryNotes.trim() || null
    },
    items: getCartLines(cart).map((line) => ({
      menuItemId: line.item.id,
      quantity: line.quantity
    })),
    paymentMethodId
  };
}

export function canSubmitCustomerCheckout(
  details: CustomerCheckoutDetails,
  cart: CartState,
  paymentMethodId: string | null
) {
  return Boolean(
    details.name.trim().length >= 2 &&
      details.email.includes("@") &&
      details.phone.trim().length >= 7 &&
      details.deliveryAddress.trim().length >= 5 &&
      getCartLines(cart).length > 0 &&
      paymentMethodId
  );
}

export function mapCustomerOrderError(error: unknown) {
  if (!(error instanceof Error)) {
    return "The order could not be placed. Check the details and try again.";
  }

  if (error.message === "stripe_not_configured") {
    return "Checkout is not available on this deployment yet. Contact the restaurant before ordering.";
  }

  if (error.message === "menu_item_not_orderable") {
    return "One or more items in the cart is no longer available. Refresh the menu and rebuild the order.";
  }

  if (error.message === "restaurant_not_found") {
    return "This restaurant is not available for ordering.";
  }

  if (error.message === "invalid_customer_order_payload") {
    return "Check the checkout details and try again.";
  }

  if (/^Request failed with status \d+$/.test(error.message)) {
    return "The order could not be placed. Try again or contact support.";
  }

  return "The order could not be placed. Try again or contact support.";
}
