"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getPublicRestaurantMenu, submitCustomerOrder } from "../_lib/api";
import {
  buildCustomerOrderPayload,
  canSubmitCustomerCheckout,
  mapCustomerOrderError
} from "../_lib/customer-checkout";
import {
  addCartItem,
  decrementCartItem,
  getCartItemCount,
  getCartLines,
  getCartSubtotalCents,
  incrementCartItem,
  removeCartItem,
  type CartState
} from "../_lib/customer-cart";
import {
  formatCurrency,
  type CustomerCheckoutDetails,
  type CustomerOrderSubmission,
  type PublicMenuItemSummary,
  type PublicRestaurantMenu
} from "../_lib/product-state";
import { BrandLogo } from "./brand-logo";
import { PaymentMethodForm, isStripeFrontendConfigured, type CollectedPaymentMethod } from "./payment-method-form";

function mapOrderingError(error: unknown) {
  if (!(error instanceof Error)) {
    return "This restaurant is not available right now.";
  }

  if (error.message === "restaurant_not_found" || error.message.includes("404")) {
    return "This restaurant is not available for ordering.";
  }

  return "The menu could not be loaded. Refresh and try again.";
}

function hasOrderableItems(menu: PublicRestaurantMenu) {
  return menu.categories.some((category) => category.items.length > 0);
}

export function CustomerOrderingShell({ slug }: { slug: string }) {
  const [menu, setMenu] = useState<PublicRestaurantMenu | null>(null);
  const [cart, setCart] = useState<CartState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<CollectedPaymentMethod | null>(null);
  const [orderResult, setOrderResult] = useState<CustomerOrderSubmission | null>(null);
  const [checkoutDetails, setCheckoutDetails] = useState<CustomerCheckoutDetails>({
    name: "",
    email: "",
    phone: "",
    deliveryAddress: "",
    deliveryNotes: ""
  });

  const cartLines = useMemo(() => getCartLines(cart), [cart]);
  const itemCount = useMemo(() => getCartItemCount(cart), [cart]);
  const subtotalCents = useMemo(() => getCartSubtotalCents(cart), [cart]);
  const currency = cartLines[0]?.item.currency ?? "GBP";
  const canSubmit = canSubmitCustomerCheckout(checkoutDetails, cart, paymentMethod?.id ?? null);

  useEffect(() => {
    let active = true;

    async function loadMenu() {
      setLoading(true);
      setError(null);

      try {
        const nextMenu = await getPublicRestaurantMenu(slug);
        if (active) {
          setMenu(nextMenu);
        }
      } catch (issue) {
        if (active) {
          setError(mapOrderingError(issue));
          setMenu(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadMenu();

    return () => {
      active = false;
    };
  }, [slug]);

  function addItem(item: PublicMenuItemSummary) {
    setCart((current) => addCartItem(current, item));
    setCheckoutError(null);
  }

  async function handleSubmitOrder() {
    if (!paymentMethod || !canSubmit) {
      setCheckoutError("Enter checkout details, add at least one item, and save a payment method first.");
      return;
    }

    setSubmittingOrder(true);
    setCheckoutError(null);

    try {
      const result = await submitCustomerOrder(
        slug,
        buildCustomerOrderPayload(checkoutDetails, cart, paymentMethod.id)
      );
      setOrderResult(result);
      if (result.order.status === "PAYMENT_AUTHORIZED") {
        setCart({});
      }
    } catch (issue) {
      setCheckoutError(mapCustomerOrderError(issue));
    } finally {
      setSubmittingOrder(false);
    }
  }

  return (
    <main className="customer-order-page">
      <header className="customer-order-header">
        <BrandLogo href="/" mode="responsive" />
        <Link className="customer-order-link" href="/contact">
          Help
        </Link>
      </header>

      {orderResult ? (
        <section className="customer-order-state customer-order-confirmation">
          <p className="eyebrow">{orderResult.order.status === "PAYMENT_AUTHORIZED" ? "Order confirmed" : "Payment issue"}</p>
          <h1>
            {orderResult.order.status === "PAYMENT_AUTHORIZED"
              ? "Your order is in the delivery queue."
              : "The order was created, but payment needs attention."}
          </h1>
          <p>
            {orderResult.order.status === "PAYMENT_AUTHORIZED"
              ? "Payment is authorized and the restaurant can begin preparing the pilot order."
              : "No payment was completed. Try again or contact support before the restaurant prepares the order."}
          </p>
          <div className="customer-confirmation-grid">
            <div>
              <span>Order</span>
              <strong>{orderResult.order.id}</strong>
            </div>
            <div>
              <span>Job</span>
              <strong>{orderResult.job.id}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>{formatCurrency(orderResult.order.totalCents, orderResult.order.currency)}</strong>
            </div>
            <div>
              <span>Payment</span>
              <strong>{orderResult.payment.status.replace(/_/g, " ")}</strong>
            </div>
          </div>
          <Link className="button button-secondary" href={`/restaurants/${slug}`}>
            Back to menu
          </Link>
        </section>
      ) : loading ? (
        <section className="customer-order-state">
          <h1>Loading menu</h1>
          <p>Reading the current pilot restaurant menu.</p>
        </section>
      ) : error ? (
        <section className="customer-order-state">
          <h1>Ordering unavailable</h1>
          <p>{error}</p>
          <Link className="button button-secondary" href="/">
            Return Home
          </Link>
        </section>
      ) : menu ? (
        <div className="customer-order-layout">
          <section className="customer-menu-panel">
            <div className="customer-restaurant-heading">
              <p className="eyebrow">Pilot ordering</p>
              <h1>{menu.restaurant.name}</h1>
              <p>/{menu.restaurant.slug}</p>
            </div>

            {!hasOrderableItems(menu) ? (
              <div className="customer-order-empty">
                <strong>Menu not available yet</strong>
                <p>This restaurant does not have active menu items ready for ordering.</p>
              </div>
            ) : (
              <div className="customer-menu-list">
                {menu.categories
                  .filter((category) => category.items.length > 0)
                  .map((category) => (
                    <section className="customer-menu-category" key={category.id}>
                      <h2>{category.name}</h2>
                      <div className="customer-menu-items">
                        {category.items.map((item) => (
                          <article className="customer-menu-item" key={item.id}>
                            <div>
                              <h3>{item.name}</h3>
                              {item.description ? <p>{item.description}</p> : null}
                              <strong>{formatCurrency(item.priceCents, item.currency)}</strong>
                            </div>
                            <button
                              aria-label={`Add ${item.name}`}
                              className="customer-icon-button"
                              onClick={() => addItem(item)}
                              type="button"
                            >
                              +
                            </button>
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
              </div>
            )}
          </section>

          <aside className="customer-cart-panel" aria-label="Order summary">
            <div className="customer-cart-heading">
              <p className="eyebrow">Order</p>
              <h2>Summary</h2>
              <span>{itemCount} item{itemCount === 1 ? "" : "s"}</span>
            </div>

            {cartLines.length === 0 ? (
              <div className="customer-order-empty">
                <strong>Your cart is empty</strong>
                <p>Add menu items to build the pilot order.</p>
              </div>
            ) : (
              <div className="customer-cart-lines">
                {cartLines.map((line) => (
                  <div className="customer-cart-line" key={line.item.id}>
                    <div>
                      <strong>{line.item.name}</strong>
                      <span>{formatCurrency(line.item.priceCents * line.quantity, line.item.currency)}</span>
                    </div>
                    <div className="customer-quantity-controls">
                      <button
                        aria-label={`Decrease ${line.item.name}`}
                        className="customer-icon-button"
                        onClick={() => setCart((current) => decrementCartItem(current, line.item.id))}
                        type="button"
                      >
                        -
                      </button>
                      <span>{line.quantity}</span>
                      <button
                        aria-label={`Increase ${line.item.name}`}
                        className="customer-icon-button"
                        onClick={() => setCart((current) => incrementCartItem(current, line.item.id))}
                        type="button"
                      >
                        +
                      </button>
                      <button
                        aria-label={`Remove ${line.item.name}`}
                        className="customer-remove-button"
                        onClick={() => setCart((current) => removeCartItem(current, line.item.id))}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="customer-cart-total">
              <span>Subtotal</span>
              <strong>{formatCurrency(subtotalCents, currency)}</strong>
            </div>

            <button
              className="button button-primary customer-checkout-button"
              disabled={cartLines.length === 0}
              onClick={() => setCheckoutOpen(true)}
              type="button"
            >
              Continue to checkout
            </button>

            {checkoutOpen ? (
              <section className="customer-checkout-form">
                <div className="customer-checkout-heading">
                  <p className="eyebrow">Checkout</p>
                  <h3>Delivery details</h3>
                </div>

                <label>
                  <span>Name</span>
                  <input
                    disabled={submittingOrder}
                    onChange={(event) => setCheckoutDetails((current) => ({ ...current, name: event.target.value }))}
                    value={checkoutDetails.name}
                  />
                </label>
                <label>
                  <span>Email</span>
                  <input
                    disabled={submittingOrder}
                    onChange={(event) => setCheckoutDetails((current) => ({ ...current, email: event.target.value }))}
                    type="email"
                    value={checkoutDetails.email}
                  />
                </label>
                <label>
                  <span>Phone</span>
                  <input
                    disabled={submittingOrder}
                    onChange={(event) => setCheckoutDetails((current) => ({ ...current, phone: event.target.value }))}
                    value={checkoutDetails.phone}
                  />
                </label>
                <label>
                  <span>Delivery address</span>
                  <textarea
                    disabled={submittingOrder}
                    onChange={(event) =>
                      setCheckoutDetails((current) => ({ ...current, deliveryAddress: event.target.value }))
                    }
                    rows={3}
                    value={checkoutDetails.deliveryAddress}
                  />
                </label>
                <label>
                  <span>Delivery notes</span>
                  <textarea
                    disabled={submittingOrder}
                    onChange={(event) =>
                      setCheckoutDetails((current) => ({ ...current, deliveryNotes: event.target.value }))
                    }
                    rows={2}
                    value={checkoutDetails.deliveryNotes}
                  />
                </label>

                <div className="customer-checkout-heading">
                  <p className="eyebrow">Payment</p>
                  <h3>Authorize payment</h3>
                  <p>Payment is authorized now and captured after delivery completion.</p>
                </div>

                {isStripeFrontendConfigured() ? (
                  <>
                    <PaymentMethodForm
                      disabled={submittingOrder}
                      email={checkoutDetails.email}
                      onCollected={(method) => {
                        setPaymentMethod(method);
                        setCheckoutError(null);
                      }}
                    />
                    {paymentMethod ? (
                      <p className="customer-payment-saved">
                        Card saved for this order: {paymentMethod.brand ?? "card"} ending {paymentMethod.last4 ?? "----"}.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <div className="customer-order-empty">
                    <strong>Checkout is not configured</strong>
                    <p>This deployment needs `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` before customers can pay.</p>
                  </div>
                )}

                <div className="customer-cart-total">
                  <span>Pilot total</span>
                  <strong>{formatCurrency(subtotalCents, currency)}</strong>
                </div>
                <p className="customer-next-note">Delivery fee is calculated by the pilot backend when the order is placed.</p>

                {checkoutError ? <p className="form-error">{checkoutError}</p> : null}

                <button
                  className="button button-primary customer-checkout-button"
                  disabled={submittingOrder || !canSubmit}
                  onClick={() => void handleSubmitOrder()}
                  type="button"
                >
                  {submittingOrder ? "Placing paid order..." : "Place paid order"}
                </button>
              </section>
            ) : (
              <p className="customer-next-note">Checkout collects delivery details and authorizes payment next.</p>
            )}
          </aside>
        </div>
      ) : null}
    </main>
  );
}
