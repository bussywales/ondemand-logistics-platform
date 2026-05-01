"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
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
import {
  PaymentMethodForm,
  isStripeFrontendConfigured,
  type CollectedPaymentMethod
} from "./payment-method-form";
import { ProductUpdateAnnouncement } from "./product-updates";
import { ShipWrightIcon } from "./shipwright-icon";

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

export function buildRestaurantMenuHref(slug: string) {
  return `/restaurants/${slug}`;
}

export function getAddItemButtonLabel(itemName: string) {
  return `Add ${itemName}`;
}

export function getQuantityControlLabels(itemName: string) {
  return {
    decrease: `Decrease quantity for ${itemName}`,
    increase: `Increase quantity for ${itemName}`,
    remove: `Remove ${itemName} from cart`
  };
}

export function getQuantityControlButtonText() {
  return {
    decrease: "Less",
    increase: "More"
  };
}

function getMenuSignals(menu: PublicRestaurantMenu) {
  const categoryCount = menu.categories.filter((category) => category.items.length > 0).length;
  const itemCount = menu.categories.reduce((count, category) => count + category.items.length, 0);

  return {
    categoryCount,
    itemCount
  };
}

function OrderingUnavailableState(props: { body: string }) {
  return (
    <section className="sw-empty-state sw-operational-surface customer-order-state">
      <p className="eyebrow">Ordering unavailable</p>
      <h1>Ordering unavailable</h1>
      <p className="sw-empty-copy">{props.body}</p>
      <Link className="sw-button sw-button--secondary button button-secondary" href="/">
        Return Home
      </Link>
    </section>
  );
}

function LoadingState() {
  return (
    <section className="sw-empty-state sw-operational-surface customer-order-state">
      <p className="eyebrow">Loading menu</p>
      <h1>Loading menu</h1>
      <p className="sw-empty-copy">Reading the current pilot restaurant menu.</p>
    </section>
  );
}

export function CustomerOrderSuccessState(props: {
  onBackToMenu: () => void;
  orderResult: CustomerOrderSubmission;
}) {
  const authorized = props.orderResult.order.status === "PAYMENT_AUTHORIZED";

  return (
    <section className={`sw-command-surface customer-order-state customer-order-confirmation ${authorized ? "" : "sw-command-surface--warning"}`}>
      <div className="customer-success-hero">
        <span className={`sw-icon-badge customer-success-icon ${authorized ? "sw-icon-badge--success" : "sw-icon-badge--warning"}`} aria-hidden="true">
          <ShipWrightIcon name={authorized ? "check" : "warning"} />
        </span>
        <div>
          <p className="eyebrow">{authorized ? "Order confirmed" : "Payment issue"}</p>
          <h1>
            {authorized
              ? "Your order is now in the delivery queue."
              : "The order was created, but payment needs attention."}
          </h1>
          <p className="customer-success-copy">
            {authorized
              ? "Payment is authorized and the restaurant can begin preparing the pilot order."
              : "No payment was completed. Try again or contact support before the restaurant prepares the order."}
          </p>
        </div>
      </div>

      <div className="customer-confirmation-grid">
        <div className="sw-supporting-surface customer-confirmation-tile">
          <span>Order</span>
          <strong>{props.orderResult.order.id}</strong>
        </div>
        <div className="sw-supporting-surface customer-confirmation-tile">
          <span>Job</span>
          <strong>{props.orderResult.job.id}</strong>
        </div>
        <div className="sw-supporting-surface customer-confirmation-tile">
          <span>Total</span>
          <strong>{formatCurrency(props.orderResult.order.totalCents, props.orderResult.order.currency)}</strong>
        </div>
        <div className="sw-supporting-surface customer-confirmation-tile">
          <span>Payment</span>
          <strong>{props.orderResult.payment.status.replace(/_/g, " ")}</strong>
        </div>
      </div>

      <div className="customer-success-actions">
        <button className="sw-button sw-button--secondary button button-secondary" onClick={props.onBackToMenu} type="button">
          Back to menu
        </button>
      </div>
    </section>
  );
}

export function CustomerOrderingShell({ slug }: { slug: string }) {
  const router = useRouter();
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
  const orderingReady = menu ? hasOrderableItems(menu) : false;
  const menuSignals = useMemo(() => (menu ? getMenuSignals(menu) : null), [menu]);

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

  function handleBackToMenu() {
    setOrderResult(null);
    setCheckoutOpen(false);
    setCheckoutError(null);
    setSubmittingOrder(false);
    router.replace(buildRestaurantMenuHref(slug));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="customer-order-page">
      <header className="customer-order-header">
        <BrandLogo href="/" mode="responsive" />
        <Link className="customer-order-link" href="/contact">
          Help
        </Link>
      </header>

      <ProductUpdateAnnouncement routePath="/restaurants" viewer="customer" viewerKey={`customer:${slug}`} />

      {orderResult ? (
        <CustomerOrderSuccessState onBackToMenu={handleBackToMenu} orderResult={orderResult} />
      ) : loading ? (
        <LoadingState />
      ) : error ? (
        <OrderingUnavailableState body={error} />
      ) : menu ? (
        <div className="customer-order-layout">
          <section className="sw-operational-surface customer-menu-panel">
            <div className="sw-card-header customer-restaurant-heading">
              <div className="customer-restaurant-copy">
                <p className="eyebrow">Pilot ordering</p>
                <h1>{menu.restaurant.name}</h1>
                <p className="customer-restaurant-slug">/{menu.restaurant.slug}</p>
                <p className="customer-restaurant-subtitle">
                  Browse the live menu, build a basket, and authorize payment in one customer flow.
                </p>
              </div>
              <div className="customer-trust-grid">
                <div className="sw-supporting-surface customer-trust-tile">
                  <span>Menu</span>
                  <strong>{orderingReady ? "Live" : "Not ready"}</strong>
                </div>
                <div className="sw-supporting-surface customer-trust-tile">
                  <span>Sections</span>
                  <strong>{menuSignals?.categoryCount ?? 0}</strong>
                </div>
                <div className="sw-supporting-surface customer-trust-tile">
                  <span>Items</span>
                  <strong>{menuSignals?.itemCount ?? 0}</strong>
                </div>
              </div>
            </div>

            {!orderingReady ? (
              <div className="sw-empty-state customer-order-empty">
                <strong className="sw-empty-title">Menu not available yet</strong>
                <p className="sw-empty-copy">This restaurant does not have active menu items ready for ordering.</p>
              </div>
            ) : (
              <div className="customer-menu-list">
                {menu.categories
                  .filter((category) => category.items.length > 0)
                  .map((category) => (
                    <section className="customer-menu-category" key={category.id}>
                      <div className="sw-card-header customer-menu-category-header">
                        <div>
                          <p className="eyebrow">Menu section</p>
                          <h2>{category.name}</h2>
                        </div>
                        <span className="status-badge status-neutral">
                          {category.items.length} item{category.items.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="customer-menu-items">
                        {category.items.map((item) => (
                          <article className="sw-list-row sw-supporting-surface customer-menu-item" key={item.id}>
                            <div className="customer-menu-item-copy">
                              <div className="customer-menu-item-header">
                                <h3>{item.name}</h3>
                                <strong>{formatCurrency(item.priceCents, item.currency)}</strong>
                              </div>
                              {item.description ? <p>{item.description}</p> : null}
                            </div>
                            <button
                              aria-label={getAddItemButtonLabel(item.name)}
                              className="sw-button sw-button--primary button button-primary customer-add-button"
                              onClick={() => addItem(item)}
                              type="button"
                            >
                              <ShipWrightIcon name="queue" />
                              <span>Add</span>
                            </button>
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
              </div>
            )}
          </section>

          <aside className="sw-operational-surface customer-cart-panel" aria-label="Order summary">
            <div className="sw-card-header customer-cart-heading">
              <div>
                <p className="eyebrow">Order summary</p>
                <h2>Your cart</h2>
              </div>
              <span>{itemCount} item{itemCount === 1 ? "" : "s"}</span>
            </div>

            {cartLines.length === 0 ? (
              <div className="sw-empty-state customer-order-empty">
                <strong className="sw-empty-title">Your cart is empty</strong>
                <p className="sw-empty-copy">Add menu items to start building the pilot order.</p>
              </div>
            ) : (
              <div className="customer-cart-lines">
                {cartLines.map((line) => {
                  const labels = getQuantityControlLabels(line.item.name);
                  const quantityButtons = getQuantityControlButtonText();

                  return (
                    <div className="sw-list-row sw-supporting-surface customer-cart-line" key={line.item.id}>
                      <div className="customer-cart-line-copy">
                        <strong>{line.item.name}</strong>
                        <span>{formatCurrency(line.item.priceCents * line.quantity, line.item.currency)}</span>
                      </div>
                      <div className="customer-quantity-controls">
                        <button
                          aria-label={labels.decrease}
                          className="sw-button sw-button--secondary button button-secondary customer-quantity-button"
                          onClick={() => setCart((current) => decrementCartItem(current, line.item.id))}
                          type="button"
                        >
                          <span aria-hidden="true">−</span>
                          <span>{quantityButtons.decrease}</span>
                        </button>
                        <span className="customer-quantity-value">{line.quantity}</span>
                        <button
                          aria-label={labels.increase}
                          className="sw-button sw-button--secondary button button-secondary customer-quantity-button"
                          onClick={() => setCart((current) => incrementCartItem(current, line.item.id))}
                          type="button"
                        >
                          <span aria-hidden="true">+</span>
                          <span>{quantityButtons.increase}</span>
                        </button>
                        <button
                          aria-label={labels.remove}
                          className="sw-button sw-button--ghost button button-secondary customer-remove-button"
                          onClick={() => setCart((current) => removeCartItem(current, line.item.id))}
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="sw-supporting-surface customer-cart-total">
              <div>
                <span>Items subtotal</span>
                <strong>{formatCurrency(subtotalCents, currency)}</strong>
              </div>
              <p className="customer-next-note">Delivery fee is calculated by the pilot backend when the order is placed.</p>
            </div>

            <button
              className="sw-button sw-button--primary button button-primary customer-checkout-button"
              disabled={cartLines.length === 0}
              onClick={() => setCheckoutOpen(true)}
              type="button"
            >
              Continue to checkout
            </button>

            {checkoutOpen ? (
              <section className="customer-checkout-form">
                <div className="customer-checkout-section">
                  <div className="customer-checkout-heading">
                    <p className="eyebrow">Delivery details</p>
                    <h3>Where should this order go?</h3>
                  </div>

                  <label className="sw-label">
                    <span>Name</span>
                    <input
                      className="sw-input"
                      disabled={submittingOrder}
                      onChange={(event) => setCheckoutDetails((current) => ({ ...current, name: event.target.value }))}
                      value={checkoutDetails.name}
                    />
                  </label>
                  <label className="sw-label">
                    <span>Email</span>
                    <input
                      className="sw-input"
                      disabled={submittingOrder}
                      onChange={(event) => setCheckoutDetails((current) => ({ ...current, email: event.target.value }))}
                      type="email"
                      value={checkoutDetails.email}
                    />
                  </label>
                  <label className="sw-label">
                    <span>Phone</span>
                    <input
                      className="sw-input"
                      disabled={submittingOrder}
                      onChange={(event) => setCheckoutDetails((current) => ({ ...current, phone: event.target.value }))}
                      value={checkoutDetails.phone}
                    />
                  </label>
                  <label className="sw-label">
                    <span>Delivery address</span>
                    <textarea
                      className="sw-input customer-textarea"
                      disabled={submittingOrder}
                      onChange={(event) =>
                        setCheckoutDetails((current) => ({ ...current, deliveryAddress: event.target.value }))
                      }
                      rows={3}
                      value={checkoutDetails.deliveryAddress}
                    />
                  </label>
                  <label className="sw-label">
                    <span>Delivery notes</span>
                    <textarea
                      className="sw-input customer-textarea"
                      disabled={submittingOrder}
                      onChange={(event) =>
                        setCheckoutDetails((current) => ({ ...current, deliveryNotes: event.target.value }))
                      }
                      rows={2}
                      value={checkoutDetails.deliveryNotes}
                    />
                  </label>
                </div>

                <div className="customer-checkout-section">
                  <div className="customer-checkout-heading">
                    <p className="eyebrow">Payment</p>
                    <h3>Authorize payment</h3>
                    <p className="customer-next-note">Payment is authorized now and captured after delivery completion.</p>
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
                    <div className="sw-empty-state customer-order-empty">
                      <strong className="sw-empty-title">Checkout is not configured</strong>
                      <p className="sw-empty-copy">
                        This deployment needs `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` before customers can pay.
                      </p>
                    </div>
                  )}
                </div>

                {checkoutError ? <p className="form-error">{checkoutError}</p> : null}

                <button
                  className="sw-button sw-button--primary button button-primary customer-checkout-button"
                  disabled={submittingOrder || !canSubmit}
                  onClick={() => void handleSubmitOrder()}
                  type="button"
                >
                  {submittingOrder ? "Placing paid order..." : "Place paid order"}
                </button>
              </section>
            ) : (
              <p className="customer-next-note">Checkout collects delivery details, billing postcode, and payment authorization next.</p>
            )}
          </aside>
        </div>
      ) : null}
    </main>
  );
}
