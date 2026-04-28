"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getPublicRestaurantMenu } from "../_lib/api";
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
import { formatCurrency, type PublicMenuItemSummary, type PublicRestaurantMenu } from "../_lib/product-state";
import { BrandLogo } from "./brand-logo";

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

  const cartLines = useMemo(() => getCartLines(cart), [cart]);
  const itemCount = useMemo(() => getCartItemCount(cart), [cart]);
  const subtotalCents = useMemo(() => getCartSubtotalCents(cart), [cart]);
  const currency = cartLines[0]?.item.currency ?? "GBP";

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
  }

  return (
    <main className="customer-order-page">
      <header className="customer-order-header">
        <BrandLogo href="/" mode="responsive" />
        <Link className="customer-order-link" href="/contact">
          Help
        </Link>
      </header>

      {loading ? (
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

            <button className="button button-primary customer-checkout-button" disabled type="button">
              Checkout
            </button>
            <p className="customer-next-note">Checkout will connect to the controlled pilot payment step next.</p>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
