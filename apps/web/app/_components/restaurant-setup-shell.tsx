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
    return "Unable to create the pilot restaurant. Check the details and try again.";
  }

  if (error.message === "restaurant_slug_already_exists") {
    return "That restaurant link is already taken. Adjust the slug before continuing.";
  }

  if (error.message === "invalid_restaurant_payload") {
    return "Enter a valid restaurant name and link before creating the pilot merchant.";
  }

  if (/^Request failed with status \d+$/.test(error.message)) {
    return "The merchant setup service is unavailable. Refresh and try again.";
  }

  return "Unable to create the pilot restaurant. Check the details and try again.";
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

function mapMenuWriteError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  if (error.message === "menu_category_not_found") {
    return "Select an active category before adding this item.";
  }

  if (/^Request failed with status \d+$/.test(error.message)) {
    return fallback;
  }

  return fallback;
}

function stepClass(done: boolean, current: boolean) {
  if (done) {
    return "merchant-step merchant-step-complete";
  }

  if (current) {
    return "merchant-step merchant-step-current";
  }

  return "merchant-step";
}

function readinessLabel(hasRestaurant: boolean, hasCategory: boolean, hasItem: boolean) {
  if (!hasRestaurant) {
    return "Create the pilot restaurant profile.";
  }

  if (!hasCategory) {
    return "Add the first menu category.";
  }

  if (!hasItem) {
    return "Add the first orderable item.";
  }

  return "Review the menu and open the customer route.";
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
  const categoryCount = menu?.categories.length ?? 0;
  const itemCount = menu?.categories.reduce((total, category) => total + category.items.length, 0) ?? 0;
  const hasRestaurant = Boolean(selectedRestaurant);
  const hasCategory = categoryCount > 0;
  const hasItem = itemCount > 0;
  const completedStepCount = [hasRestaurant, hasCategory, hasItem].filter(Boolean).length;
  const publicMenuHref = selectedRestaurant ? `/restaurants/${selectedRestaurant.slug}` : null;

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
      setError(mapMenuWriteError(issue, "Unable to add the menu category. Check the name and try again."));
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
      setError(mapMenuWriteError(issue, "Unable to add the menu item. Check the item details and try again."));
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
    <main className="app-shell merchant-shell">
      <header className="merchant-hero">
        <div className="merchant-hero-topline">
          <BrandLogo href="/" mode="responsive" />
          <div className="merchant-hero-actions">
            <button className="button button-secondary" onClick={() => void handleRefresh()} type="button">
              Refresh
            </button>
            <button className="button button-secondary" onClick={() => void handleSignOut()} type="button">
              Sign Out
            </button>
          </div>
        </div>
        <div className="merchant-hero-grid">
          <div>
            <p className="eyebrow">Pilot merchant activation</p>
            <h1>Build the menu customers can order from.</h1>
            <p>
              Turn {currentOrg.name} into a live pilot restaurant by creating the merchant profile, composing the
              first menu, and opening the customer route.
            </p>
          </div>
          <aside className="merchant-readiness-card" aria-label="Setup readiness">
            <span>{completedStepCount}/3 complete</span>
            <strong>{readinessLabel(hasRestaurant, hasCategory, hasItem)}</strong>
            <div className="merchant-readiness-meter" aria-hidden="true">
              <span style={{ width: `${(completedStepCount / 3) * 100}%` }} />
            </div>
            {publicMenuHref && hasItem ? (
              <Link className="button button-primary button-block" href={publicMenuHref}>
                Open customer menu
              </Link>
            ) : null}
          </aside>
        </div>
      </header>

      <section className="merchant-layout">
        <aside className="merchant-sidebar">
          <nav className="merchant-nav" aria-label="Workspace navigation">
            <Link href="/app">Operations</Link>
            <Link href="/app/jobs">Jobs</Link>
            <Link className="active" href="/app/restaurant">
              Merchant setup
            </Link>
          </nav>

          <section className="merchant-side-section">
            <span className="ops-section-label">Operator</span>
            <strong>{session.context.displayName}</strong>
            <p>{session.context.email}</p>
          </section>

          <section className="merchant-side-section">
            <span className="ops-section-label">Live setup</span>
            <div className="merchant-side-metrics">
              <div>
                <strong>{restaurants.length}</strong>
                <span>Merchants</span>
              </div>
              <div>
                <strong>{categoryCount}</strong>
                <span>Categories</span>
              </div>
              <div>
                <strong>{itemCount}</strong>
                <span>Items</span>
              </div>
            </div>
          </section>

          <section className="merchant-side-section merchant-next-action">
            <span className="ops-section-label">Next action</span>
            <strong>{readinessLabel(hasRestaurant, hasCategory, hasItem)}</strong>
            <p>Keep this sequence tight: identity, category, item, review.</p>
          </section>
        </aside>

        <div className="merchant-main">
          {error ? <div className="merchant-error" role="alert">{error}</div> : null}

          <section className="merchant-step-strip" aria-label="Merchant setup progress">
            <div className={stepClass(hasRestaurant, !hasRestaurant)}>
              <span>1</span>
              <div>
                <strong>Restaurant profile</strong>
                <p>{hasRestaurant ? selectedRestaurant?.name : "Create the pilot merchant."}</p>
              </div>
            </div>
            <div className={stepClass(hasCategory, hasRestaurant && !hasCategory)}>
              <span>2</span>
              <div>
                <strong>Menu sections</strong>
                <p>{hasCategory ? `${categoryCount} categor${categoryCount === 1 ? "y" : "ies"}` : "Add the first section."}</p>
              </div>
            </div>
            <div className={stepClass(hasItem, hasRestaurant && hasCategory && !hasItem)}>
              <span>3</span>
              <div>
                <strong>Orderable items</strong>
                <p>{hasItem ? `${itemCount} item${itemCount === 1 ? "" : "s"} ready` : "Add the first item."}</p>
              </div>
            </div>
          </section>

          <section className="merchant-command-grid">
            <section className="merchant-panel merchant-panel-primary">
              <div className="merchant-panel-heading">
                <div>
                  <p className="eyebrow">Step 1</p>
                  <h2>Restaurant identity</h2>
                  <p>Create the merchant profile and customer-facing link.</p>
                </div>
                {hasRestaurant ? <span className="status-badge status-positive">Profile ready</span> : null}
              </div>

              <form className="merchant-form" onSubmit={handleCreateRestaurant}>
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
                    placeholder="Pilot Kitchen"
                    value={restaurantForm.name}
                  />
                </label>
                <label>
                  <span>Customer link</span>
                  <div className="merchant-slug-field">
                    <span>/restaurants/</span>
                    <input
                      onChange={(event) =>
                        setRestaurantForm((current) => ({
                          ...current,
                          slug: normalizeRestaurantSlug(event.target.value),
                          slugManuallyEdited: true
                        }))
                      }
                      placeholder="pilot-kitchen"
                      value={restaurantForm.slug}
                    />
                  </div>
                  <small>
                    {restaurantForm.slugManuallyEdited
                      ? "Manual link override enabled. Further name changes will not overwrite it."
                      : "The link derives from the restaurant name until you edit it."}
                  </small>
                </label>

                {restaurantSlugError ? <p className="form-error-text">{restaurantSlugError}</p> : null}

                <div className="merchant-actions">
                  <button
                    className="button button-primary"
                    disabled={restaurantSubmitting || !restaurantForm.name.trim() || Boolean(restaurantSlugError)}
                    type="submit"
                  >
                    {restaurantSubmitting ? "Creating merchant..." : "Create merchant"}
                  </button>
                </div>
              </form>
            </section>

            <section className="merchant-panel merchant-restaurant-list-panel">
              <div className="merchant-panel-heading">
                <div>
                  <p className="eyebrow">Select profile</p>
                  <h2>Pilot merchants</h2>
                  <p>Choose the restaurant whose menu you are composing.</p>
                </div>
              </div>

              {loading ? (
                <div className="merchant-empty-state">
                  <strong>Loading merchant profiles</strong>
                  <p>Reading the current pilot setup for this workspace.</p>
                </div>
              ) : restaurants.length === 0 ? (
                <div className="merchant-empty-state merchant-empty-state-accent">
                  <strong>No restaurant profile yet</strong>
                  <p>Create the first profile to unlock menu composition.</p>
                </div>
              ) : (
                <div className="merchant-restaurant-list">
                  {restaurants.map((restaurant) => (
                    <button
                      className={selectedRestaurantId === restaurant.id ? "active" : ""}
                      key={restaurant.id}
                      onClick={() => setSelectedRestaurantId(restaurant.id)}
                      type="button"
                    >
                      <div>
                        <strong>{restaurant.name}</strong>
                        <p>/restaurants/{restaurant.slug}</p>
                      </div>
                      <div>
                        <span className={restaurant.status === "ACTIVE" ? "merchant-live-dot" : "merchant-draft-dot"} />
                        <span>{restaurant.status}</span>
                        <small>{formatDateTime(restaurant.createdAt)}</small>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </section>

          <section className="merchant-builder-grid">
            <section className="merchant-panel">
              <div className="merchant-panel-heading">
                <div>
                  <p className="eyebrow">Step 2</p>
                  <h2>Add a menu section</h2>
                  <p>Start with the customer’s first decision: mains, drinks, sides, or specials.</p>
                </div>
                {!selectedRestaurant ? <span className="status-badge status-neutral">Locked</span> : null}
              </div>

              <form className="merchant-form" onSubmit={handleCreateCategory}>
                <label>
                  <span>Section name</span>
                  <input
                    disabled={!selectedRestaurant || categorySubmitting}
                    onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Mains"
                    value={categoryForm.name}
                  />
                </label>
                <label>
                  <span>Display order</span>
                  <input
                    disabled={!selectedRestaurant || categorySubmitting}
                    min="0"
                    onChange={(event) =>
                      setCategoryForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))
                    }
                    step="1"
                    type="number"
                    value={categoryForm.sortOrder}
                  />
                </label>
                <div className="merchant-actions">
                  <button
                    className="button button-primary"
                    disabled={!selectedRestaurant || categorySubmitting || !categoryForm.name.trim()}
                    type="submit"
                  >
                    {categorySubmitting ? "Adding section..." : "Add section"}
                  </button>
                </div>
              </form>
            </section>

            <section className="merchant-panel">
              <div className="merchant-panel-heading">
                <div>
                  <p className="eyebrow">Step 3</p>
                  <h2>Add an orderable item</h2>
                  <p>Tie every item to a section so the public menu stays structured.</p>
                </div>
                {hasCategory ? null : <span className="status-badge status-neutral">Needs section</span>}
              </div>

              <form className="merchant-form" onSubmit={handleCreateItem}>
                <label>
                  <span>Section</span>
                  <select
                    disabled={!hasCategory || itemSubmitting}
                    onChange={(event) => setItemForm((current) => ({ ...current, categoryId: event.target.value }))}
                    value={itemForm.categoryId}
                  >
                    <option value="">Select section</option>
                    {(menu?.categories ?? []).map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="merchant-form-split">
                  <label>
                    <span>Item name</span>
                    <input
                      disabled={!hasCategory || itemSubmitting}
                      onChange={(event) => setItemForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Chicken wrap"
                      value={itemForm.name}
                    />
                  </label>
                  <label>
                    <span>Price in pence</span>
                    <input
                      disabled={!hasCategory || itemSubmitting}
                      min="1"
                      onChange={(event) => setItemForm((current) => ({ ...current, priceCents: Number(event.target.value) }))}
                      step="1"
                      type="number"
                      value={itemForm.priceCents}
                    />
                  </label>
                </div>
                <label>
                  <span>Description</span>
                  <textarea
                    disabled={!hasCategory || itemSubmitting}
                    onChange={(event) => setItemForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Short customer-facing description"
                    rows={3}
                    value={itemForm.description}
                  />
                </label>
                <div className="merchant-form-split">
                  <label>
                    <span>Currency</span>
                    <input
                      disabled={!hasCategory || itemSubmitting}
                      maxLength={3}
                      onChange={(event) => setItemForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))}
                      value={itemForm.currency}
                    />
                  </label>
                  <label>
                    <span>Display order</span>
                    <input
                      disabled={!hasCategory || itemSubmitting}
                      min="0"
                      onChange={(event) => setItemForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))}
                      step="1"
                      type="number"
                      value={itemForm.sortOrder}
                    />
                  </label>
                </div>
                <div className="merchant-actions">
                  <button
                    className="button button-primary"
                    disabled={itemSubmitting || !itemForm.categoryId || !itemForm.name.trim()}
                    type="submit"
                  >
                    {itemSubmitting ? "Adding item..." : "Add item"}
                  </button>
                </div>
              </form>
            </section>
          </section>

          <section className="merchant-menu-preview">
            <div className="merchant-preview-heading">
              <div>
                <p className="eyebrow">Step 4</p>
                <h2>{selectedRestaurant?.name ?? "Menu review"}</h2>
                <p>Review the structure customers will browse before checkout.</p>
              </div>
              <div className="merchant-preview-actions">
                {refreshing ? <span className="support-note">Refreshing...</span> : null}
                {publicMenuHref ? (
                  <Link className={hasItem ? "button button-secondary" : "button button-secondary disabled-link"} href={publicMenuHref}>
                    Preview route
                  </Link>
                ) : null}
              </div>
            </div>

            {!selectedRestaurant ? (
              <div className="merchant-empty-state merchant-empty-state-accent">
                <strong>Select or create a restaurant first</strong>
                <p>The menu preview unlocks after the merchant profile exists.</p>
              </div>
            ) : !menu || menu.categories.length === 0 ? (
              <div className="merchant-empty-state merchant-empty-state-accent">
                <strong>The menu is waiting for its first section</strong>
                <p>Add a section such as Mains or Drinks, then add the first item underneath it.</p>
              </div>
            ) : (
              <div className="merchant-menu-composition">
                {menu.categories.map((category) => (
                  <section className="merchant-menu-category" key={category.id}>
                    <div className="merchant-menu-category-header">
                      <div>
                        <strong>{category.name}</strong>
                        <p>Display order {category.sortOrder}</p>
                      </div>
                      <span className={category.isActive ? "status-badge status-positive" : "status-badge status-neutral"}>
                        {category.isActive ? "Live" : "Inactive"}
                      </span>
                    </div>

                    {category.items.length === 0 ? (
                      <div className="merchant-empty-inline">
                        <strong>No items yet</strong>
                        <p>Add the first item so this section can appear in the customer menu.</p>
                      </div>
                    ) : (
                      <div className="merchant-menu-items">
                        {category.items.map((item) => (
                          <article className="merchant-menu-item" key={item.id}>
                            <div>
                              <strong>{item.name}</strong>
                              <p>{item.description ?? "No description yet"}</p>
                            </div>
                            <div>
                              <strong>{formatCurrency(item.priceCents, item.currency)}</strong>
                              <span>{item.isActive ? "Orderable" : "Hidden"}</span>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
