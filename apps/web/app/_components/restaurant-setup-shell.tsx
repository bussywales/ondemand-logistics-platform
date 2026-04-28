"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { useBusinessAuth } from "./business-auth-provider";
import {
  createMenuCategory,
  createMenuItem,
  createRestaurant,
  getRestaurantMenu,
  listRestaurants
} from "../_lib/api";
import {
  formatCurrency,
  formatDateTime,
  type BusinessSession,
  type RestaurantMenu,
  type RestaurantSummary
} from "../_lib/product-state";
import { normalizeRestaurantSlug } from "../_lib/restaurant-slug";

function mapRestaurantSetupError(error: unknown) {
  if (!(error instanceof Error)) {
    return "Unable to create the pilot restaurant.";
  }

  if (error.message === "restaurant_slug_already_exists") {
    return "That restaurant slug is already in use. Choose a different slug before continuing.";
  }

  if (error.message === "invalid_restaurant_payload") {
    return "Enter a valid restaurant name and slug before creating the pilot merchant.";
  }

  return error.message;
}

function mapRestaurantReadError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  if (/^Request failed with status \d+$/.test(error.message)) {
    return fallback;
  }

  return error.message;
}

export function RestaurantSetupShell() {
  const { status, session, signOut, refreshBusinessSession } = useBusinessAuth();
  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [menu, setMenu] = useState<RestaurantMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restaurantSubmitting, setRestaurantSubmitting] = useState(false);
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [itemSubmitting, setItemSubmitting] = useState(false);
  const [restaurantForm, setRestaurantForm] = useState({ name: "", slug: "", slugManuallyEdited: false });
  const [categoryForm, setCategoryForm] = useState({ name: "", sortOrder: 0 });
  const [itemForm, setItemForm] = useState({
    categoryId: "",
    name: "",
    description: "",
    priceCents: 1200,
    currency: "GBP",
    sortOrder: 0
  });

  const currentOrg = session?.context.currentOrg ?? null;
  const selectedRestaurant = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === selectedRestaurantId) ?? null,
    [restaurants, selectedRestaurantId]
  );
  const restaurantSlugError = useMemo(() => {
    if (!restaurantForm.slug) {
      return "Slug is required.";
    }

    if (restaurants.some((restaurant) => restaurant.slug === restaurantForm.slug)) {
      return "Slug already exists in this workspace.";
    }

    return null;
  }, [restaurantForm.slug, restaurants]);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadRestaurants(session);
  }, [session?.accessToken]);

  useEffect(() => {
    if (!session || !selectedRestaurantId) {
      setMenu(null);
      return;
    }

    void loadMenu(session, selectedRestaurantId);
  }, [selectedRestaurantId, session?.accessToken]);

  useEffect(() => {
    if (!menu) {
      return;
    }

    const firstCategoryId = menu.categories[0]?.id ?? "";
    setItemForm((current) => ({
      ...current,
      categoryId: current.categoryId || firstCategoryId
    }));
  }, [menu?.restaurant.id, menu?.categories.length]);

  async function loadRestaurants(currentSession: BusinessSession) {
    setLoading(true);
    setError(null);

    try {
      const items = await listRestaurants(currentSession);
      setRestaurants(items);
      setSelectedRestaurantId((current) =>
        current && items.some((restaurant) => restaurant.id === current) ? current : items[0]?.id ?? null
      );
    } catch (issue) {
      setError(mapRestaurantReadError(issue, "Unable to load restaurants right now. Refresh and try again."));
    } finally {
      setLoading(false);
    }
  }

  async function loadMenu(currentSession: BusinessSession, restaurantId: string) {
    setRefreshing(true);
    setError(null);

    try {
      const nextMenu = await getRestaurantMenu(currentSession, restaurantId);
      setMenu(nextMenu);
    } catch (issue) {
      setError(mapRestaurantReadError(issue, "Unable to load the restaurant menu right now. Refresh and try again."));
    } finally {
      setRefreshing(false);
    }
  }

  async function handleCreateRestaurant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !currentOrg) {
      return;
    }

    setRestaurantSubmitting(true);
    setError(null);

    try {
      const created = await createRestaurant(session, {
        orgId: currentOrg.id,
        name: restaurantForm.name.trim(),
        slug: restaurantForm.slug.trim()
      });

      setRestaurants((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setSelectedRestaurantId(created.id);
      setRestaurantForm({ name: "", slug: "", slugManuallyEdited: false });
      await loadMenu(session, created.id);
    } catch (issue) {
      setError(mapRestaurantSetupError(issue));
    } finally {
      setRestaurantSubmitting(false);
    }
  }

  async function handleCreateCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selectedRestaurantId) {
      return;
    }

    setCategorySubmitting(true);
    setError(null);

    try {
      const created = await createMenuCategory(session, selectedRestaurantId, {
        name: categoryForm.name.trim(),
        sortOrder: categoryForm.sortOrder,
        isActive: true
      });

      setCategoryForm({ name: "", sortOrder: 0 });
      setItemForm((current) => ({ ...current, categoryId: current.categoryId || created.id }));
      await loadMenu(session, selectedRestaurantId);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to create the menu category.");
    } finally {
      setCategorySubmitting(false);
    }
  }

  async function handleCreateItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selectedRestaurantId) {
      return;
    }

    setItemSubmitting(true);
    setError(null);

    try {
      await createMenuItem(session, selectedRestaurantId, {
        categoryId: itemForm.categoryId,
        name: itemForm.name.trim(),
        description: itemForm.description.trim() || null,
        priceCents: itemForm.priceCents,
        currency: itemForm.currency.trim().toUpperCase(),
        sortOrder: itemForm.sortOrder,
        isActive: true
      });

      setItemForm((current) => ({
        ...current,
        name: "",
        description: "",
        priceCents: 1200,
        sortOrder: 0
      }));
      await loadMenu(session, selectedRestaurantId);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to create the menu item.");
    } finally {
      setItemSubmitting(false);
    }
  }

  async function handleRefresh() {
    if (!session) {
      return;
    }

    const nextSession = await refreshBusinessSession();
    if (nextSession) {
      await loadRestaurants(nextSession);
      if (selectedRestaurantId) {
        await loadMenu(nextSession, selectedRestaurantId);
      }
    }
  }

  async function handleSignOut() {
    await signOut();
  }

  if (status === "loading" || !session) {
    return (
      <main className="app-shell loading-shell">
        <section className="ops-empty-state">
          <p className="eyebrow">Pilot restaurant setup</p>
          <h1>Loading the merchant workspace.</h1>
          <p>Checking the authenticated business session and restaurant setup state.</p>
        </section>
      </main>
    );
  }

  if (!currentOrg) {
    return (
      <main className="app-shell loading-shell">
        <section className="ops-empty-state">
          <p className="eyebrow">Business org missing</p>
          <h1>Finish org setup before creating a restaurant.</h1>
          <p>The pilot restaurant setup path requires a real business operator context first.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/get-started">
              Complete Onboarding
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell ops-shell">
      <header className="ops-topbar">
        <div className="ops-branding">
          <BrandLogo href="/" mode="responsive" />
          <p className="eyebrow">Pilot merchant setup</p>
          <h1>{currentOrg.name}</h1>
        </div>
        <div className="ops-topbar-actions">
          <button className="button button-secondary" onClick={() => void handleRefresh()} type="button">
            Refresh
          </button>
          <button className="button button-secondary" onClick={() => void handleSignOut()} type="button">
            Sign Out
          </button>
        </div>
      </header>

      <section className="ops-layout">
        <aside className="ops-sidebar">
          <nav className="ops-nav" aria-label="Workspace navigation">
            <Link className="ops-nav-link" href="/app">
              Operations
            </Link>
            <Link className="ops-nav-link" href="/app/jobs">
              Jobs
            </Link>
            <Link className="ops-nav-link active" href="/app/restaurant">
              Restaurant
            </Link>
          </nav>

          <section className="ops-sidebar-section">
            <span className="ops-section-label">Operator</span>
            <strong>{session.context.displayName}</strong>
            <p>{session.context.email}</p>
          </section>

          <section className="ops-sidebar-section">
            <span className="ops-section-label">Pilot scope</span>
            <div className="ops-summary-list">
              <div>
                <strong>{restaurants.length}</strong>
                <span>Restaurants</span>
              </div>
              <div>
                <strong>{menu?.categories.length ?? 0}</strong>
                <span>Categories</span>
              </div>
              <div>
                <strong>{menu?.categories.reduce((total, category) => total + category.items.length, 0) ?? 0}</strong>
                <span>Items</span>
              </div>
            </div>
          </section>
        </aside>

        <div className="ops-main">
          {error ? <div className="form-error-banner">{error}</div> : null}

          <section className="ops-stack">
            <section className="ops-section">
              <div className="ops-section-header">
                <div>
                  <p className="eyebrow">Restaurant</p>
                  <h2>Activate pilot merchant</h2>
                </div>
              </div>

              <form className="ops-form" onSubmit={handleCreateRestaurant}>
                <div className="form-grid-two">
                  <label>
                    <span>Restaurant name</span>
                    <input
                      onChange={(event) =>
                        setRestaurantForm((current) => {
                          const nextName = event.target.value;
                          return {
                            name: nextName,
                            slug: current.slugManuallyEdited ? current.slug : normalizeRestaurantSlug(nextName),
                            slugManuallyEdited: current.slugManuallyEdited
                          };
                        })
                      }
                      value={restaurantForm.name}
                    />
                  </label>
                  <label>
                    <span>Slug</span>
                    <input
                      onChange={(event) =>
                        setRestaurantForm((current) => ({
                          ...current,
                          slug: normalizeRestaurantSlug(event.target.value),
                          slugManuallyEdited: true
                        }))
                      }
                      value={restaurantForm.slug}
                    />
                    <small>{restaurantForm.slugManuallyEdited ? "Manual slug override enabled." : "Slug derives from the restaurant name until you edit it."}</small>
                  </label>
                </div>

                {restaurantSlugError ? <p className="form-error-text">{restaurantSlugError}</p> : null}

                <div className="ops-actions">
                  <button
                    className="button button-primary"
                    disabled={restaurantSubmitting || !restaurantForm.name.trim() || Boolean(restaurantSlugError)}
                    type="submit"
                  >
                    {restaurantSubmitting ? "Creating restaurant..." : "Create Restaurant"}
                  </button>
                </div>
              </form>
            </section>

            <section className="ops-section">
              <div className="ops-section-header">
                <div>
                  <p className="eyebrow">Restaurants</p>
                  <h2>Current pilot merchants</h2>
                </div>
              </div>

              {loading ? (
                <div className="ops-empty-state">
                  <strong>Loading restaurants</strong>
                  <p>Reading the current merchant setup for this business workspace.</p>
                </div>
              ) : restaurants.length === 0 ? (
                <div className="ops-empty-state">
                  <strong>No pilot restaurant yet</strong>
                  <p>Create the first restaurant before loading menu categories and items.</p>
                </div>
              ) : (
                <div className="restaurant-list">
                  {restaurants.map((restaurant) => (
                    <button
                      className={`restaurant-list-item ${selectedRestaurantId === restaurant.id ? "active" : ""}`}
                      key={restaurant.id}
                      onClick={() => setSelectedRestaurantId(restaurant.id)}
                      type="button"
                    >
                      <div>
                        <strong>{restaurant.name}</strong>
                        <p>/{restaurant.slug}</p>
                      </div>
                      <div className="restaurant-list-meta">
                        <span className="status-badge status-neutral">{restaurant.status}</span>
                        <span>{formatDateTime(restaurant.createdAt)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {selectedRestaurant ? (
              <div className="ops-detail-grid">
                <section className="ops-section">
                  <div className="ops-section-header">
                    <div>
                      <p className="eyebrow">Menu category</p>
                      <h2>Add category</h2>
                    </div>
                  </div>

                  <form className="ops-form" onSubmit={handleCreateCategory}>
                    <div className="form-grid-two">
                      <label>
                        <span>Name</span>
                        <input
                          onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
                          value={categoryForm.name}
                        />
                      </label>
                      <label>
                        <span>Sort order</span>
                        <input
                          min="0"
                          onChange={(event) =>
                            setCategoryForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))
                          }
                          step="1"
                          type="number"
                          value={categoryForm.sortOrder}
                        />
                      </label>
                    </div>

                    <div className="ops-actions">
                      <button className="button button-primary" disabled={categorySubmitting} type="submit">
                        {categorySubmitting ? "Adding category..." : "Add Category"}
                      </button>
                    </div>
                  </form>
                </section>

                <section className="ops-section">
                  <div className="ops-section-header">
                    <div>
                      <p className="eyebrow">Menu item</p>
                      <h2>Add item</h2>
                    </div>
                  </div>

                  <form className="ops-form" onSubmit={handleCreateItem}>
                    <div className="form-grid-two">
                      <label>
                        <span>Category</span>
                        <select
                          disabled={(menu?.categories.length ?? 0) === 0}
                          onChange={(event) => setItemForm((current) => ({ ...current, categoryId: event.target.value }))}
                          value={itemForm.categoryId}
                        >
                          <option value="">Select category</option>
                          {(menu?.categories ?? []).map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Name</span>
                        <input
                          onChange={(event) => setItemForm((current) => ({ ...current, name: event.target.value }))}
                          value={itemForm.name}
                        />
                      </label>
                    </div>

                    <label>
                      <span>Description</span>
                      <textarea
                        onChange={(event) => setItemForm((current) => ({ ...current, description: event.target.value }))}
                        rows={3}
                        value={itemForm.description}
                      />
                    </label>

                    <div className="form-grid-three">
                      <label>
                        <span>Price (cents)</span>
                        <input
                          min="1"
                          onChange={(event) => setItemForm((current) => ({ ...current, priceCents: Number(event.target.value) }))}
                          step="1"
                          type="number"
                          value={itemForm.priceCents}
                        />
                      </label>
                      <label>
                        <span>Currency</span>
                        <input
                          maxLength={3}
                          onChange={(event) => setItemForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))}
                          value={itemForm.currency}
                        />
                      </label>
                      <label>
                        <span>Sort order</span>
                        <input
                          min="0"
                          onChange={(event) => setItemForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))}
                          step="1"
                          type="number"
                          value={itemForm.sortOrder}
                        />
                      </label>
                    </div>

                    <div className="ops-actions">
                      <button
                        className="button button-primary"
                        disabled={itemSubmitting || !itemForm.categoryId}
                        type="submit"
                      >
                        {itemSubmitting ? "Adding item..." : "Add Item"}
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            ) : null}

            <section className="ops-section">
              <div className="ops-section-header">
                <div>
                  <p className="eyebrow">Menu structure</p>
                  <h2>{selectedRestaurant?.name ?? "Pilot restaurant menu"}</h2>
                </div>
                {refreshing ? <span className="support-note">Refreshing…</span> : null}
              </div>

              {!selectedRestaurant ? (
                <div className="ops-empty-state">
                  <strong>Select a restaurant</strong>
                  <p>Create or select the pilot restaurant before loading categories and items.</p>
                </div>
              ) : !menu || menu.categories.length === 0 ? (
                <div className="ops-empty-state">
                  <strong>No menu categories yet</strong>
                  <p>Add the first category, then add the first orderable item under it.</p>
                </div>
              ) : (
                <div className="menu-structure-list">
                  {menu.categories.map((category) => (
                    <section className="menu-structure-category" key={category.id}>
                      <div className="menu-structure-header">
                        <div>
                          <strong>{category.name}</strong>
                          <p>Sort {category.sortOrder}</p>
                        </div>
                        <span className="status-badge status-neutral">{category.isActive ? "ACTIVE" : "INACTIVE"}</span>
                      </div>

                      {category.items.length === 0 ? (
                        <p className="support-note">No items in this category yet.</p>
                      ) : (
                        <div className="menu-item-list">
                          {category.items.map((item) => (
                            <div className="menu-item-row" key={item.id}>
                              <div>
                                <strong>{item.name}</strong>
                                <p>{item.description ?? "No description"}</p>
                              </div>
                              <div className="menu-item-meta">
                                <strong>{formatCurrency(item.priceCents, item.currency)}</strong>
                                <span>{item.isActive ? "ACTIVE" : "INACTIVE"}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  ))}
                </div>
              )}
            </section>
          </section>
        </div>
      </section>
    </main>
  );
}
