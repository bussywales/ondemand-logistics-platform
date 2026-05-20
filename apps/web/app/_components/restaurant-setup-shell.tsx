"use client";

import React from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { ContextualHelpLink } from "./help";
import { NotificationsBell } from "./notifications";
import { ShipWrightIcon } from "./shipwright-icon";
import { WorkspaceNav } from "./workspace-nav";
import { useBusinessAuth } from "./business-auth-provider";
import {
  createMenuCategory,
  createMenuItem,
  createRestaurant,
  ApiRequestError,
  getRestaurantMenu,
  listRestaurants,
  updateMenuItem
} from "../_lib/api";
import {
  formatCurrency,
  formatDateTime,
  type BusinessSession,
  type MenuItemSummary,
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

  if (error.message === "invalid_menu_item_payload") {
    const issue = error instanceof ApiRequestError ? getMenuItemValidationIssue(error.payload) : null;
    return issue ? `${fallback} ${issue}` : `${fallback} Enter a valid item name and a positive price before saving.`;
  }

  if (/^Request failed with status \d+$/.test(error.message)) {
    return fallback;
  }

  return fallback;
}

function getMenuItemValidationIssue(payload: unknown) {
  if (typeof payload !== "object" || payload === null || !Array.isArray((payload as { issues?: unknown }).issues)) {
    return null;
  }

  const issue = (payload as { issues: Array<{ path?: unknown; message?: unknown }> }).issues[0];
  const path = Array.isArray(issue?.path) ? issue.path.join(".") : "";
  const message = typeof issue?.message === "string" ? issue.message : "";

  if (path === "priceCents") {
    return "Enter a valid positive price, for example 12.99.";
  }

  if (path === "categoryId") {
    return "Select a valid menu section before saving.";
  }

  if (path === "sortOrder") {
    return "Display order must be a whole number.";
  }

  if (path === "name") {
    return "Item name must be at least 2 characters.";
  }

  if (path === "description") {
    return "Description must be blank or at least 2 characters.";
  }

  return message ? message.replaceAll("_", " ") : null;
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

export type MenuItemEditForm = {
  categoryId: string;
  name: string;
  description: string;
  price: string;
  sortOrder: string;
  isActive: boolean;
};

export function centsToPriceInput(value: number) {
  return (value / 100).toFixed(2);
}

export function parsePriceInputToCents(value: string) {
  const trimmed = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }

  const [major, minor = ""] = trimmed.split(".");
  const cents = Number.parseInt(major, 10) * 100 + Number.parseInt(minor.padEnd(2, "0"), 10);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

export function parseSortOrderInput(value: string) {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const sortOrder = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(sortOrder) ? sortOrder : null;
}

export function buildMenuItemUpdatePayload(editForm: MenuItemEditForm) {
  const priceCents = parsePriceInputToCents(editForm.price);
  const sortOrder = parseSortOrderInput(editForm.sortOrder);
  const name = editForm.name.trim();

  if (priceCents === null || sortOrder === null || name.length < 2) {
    return null;
  }

  const categoryId = editForm.categoryId.trim();
  return {
    ...(categoryId ? { categoryId } : {}),
    name,
    description: editForm.description.trim() || null,
    priceCents,
    sortOrder,
    isActive: editForm.isActive
  };
}

function menuItemToEditForm(item: MenuItemSummary): MenuItemEditForm {
  return {
    categoryId: item.categoryId,
    name: item.name,
    description: item.description ?? "",
    price: centsToPriceInput(item.priceCents),
    sortOrder: String(item.sortOrder),
    isActive: item.isActive
  };
}

export function EditableMenuItemRow({
  categories,
  editForm,
  item,
  isEditing,
  saving,
  saveError,
  onCancel,
  onChange,
  onSave,
  onStartEdit
}: {
  categories: RestaurantMenu["categories"];
  editForm: MenuItemEditForm | null;
  item: MenuItemSummary;
  isEditing: boolean;
  saving: boolean;
  saveError?: string | null;
  onCancel: () => void;
  onChange: (form: MenuItemEditForm) => void;
  onSave: (event: React.FormEvent<HTMLFormElement>) => void;
  onStartEdit: (item: MenuItemSummary) => void;
}) {
  return (
    <article className="merchant-menu-item">
      {isEditing && editForm ? (
        <form className="merchant-menu-edit-form" onSubmit={onSave}>
          <div className="merchant-menu-edit-header">
            <div>
              <p className="eyebrow">Menu item</p>
              <h3>Edit menu item</h3>
              <p>Update customer-facing menu details.</p>
            </div>
            <span className="sw-badge sw-badge--neutral">{item.currency}</span>
          </div>

          <div className="merchant-menu-edit-grid">
            <fieldset className="merchant-menu-edit-section merchant-menu-edit-section-wide">
              <legend>Item details</legend>
              <label>
                <span>Item name</span>
                <input
                  disabled={saving}
                  onChange={(event) => onChange({ ...editForm, name: event.target.value })}
                  value={editForm.name}
                />
              </label>
              <label>
                <span>Description</span>
                <textarea
                  disabled={saving}
                  onChange={(event) => onChange({ ...editForm, description: event.target.value })}
                  rows={3}
                  value={editForm.description}
                />
              </label>
            </fieldset>

            <fieldset className="merchant-menu-edit-section">
              <legend>Pricing and visibility</legend>
              <label>
                <span>Price</span>
                <input
                  disabled={saving}
                  inputMode="decimal"
                  onChange={(event) => onChange({ ...editForm, price: event.target.value })}
                  placeholder="12.99"
                  value={editForm.price}
                />
              </label>
              <label className="merchant-checkbox">
                <input
                  checked={editForm.isActive}
                  disabled={saving}
                  onChange={(event) => onChange({ ...editForm, isActive: event.target.checked })}
                  type="checkbox"
                />
                <span>Orderable on the public menu</span>
              </label>
            </fieldset>

            <fieldset className="merchant-menu-edit-section">
              <legend>Organisation</legend>
              <label>
                <span>Section</span>
                <select
                  disabled={saving}
                  onChange={(event) => onChange({ ...editForm, categoryId: event.target.value })}
                  value={editForm.categoryId}
                >
                  {categories.map((menuCategory) => (
                    <option key={menuCategory.id} value={menuCategory.id}>
                      {menuCategory.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Display order</span>
                <input
                  disabled={saving}
                  min="0"
                  onChange={(event) => onChange({ ...editForm, sortOrder: event.target.value })}
                  step="1"
                  type="number"
                  value={editForm.sortOrder}
                />
              </label>
            </fieldset>
          </div>

          {saveError ? <p className="form-error-text" role="alert">{saveError}</p> : null}
          <div className="merchant-actions">
            <button
              className="button button-primary"
              disabled={saving || !editForm.name.trim() || parsePriceInputToCents(editForm.price) === null || parseSortOrderInput(editForm.sortOrder) === null}
              type="submit"
            >
              {saving ? "Saving..." : "Save item"}
            </button>
            <button className="button button-secondary" disabled={saving} onClick={onCancel} type="button">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div>
            <strong>{item.name}</strong>
            <p>{item.description ?? "No description yet"}</p>
          </div>
          <div className="merchant-menu-item-actions">
            <strong>{formatCurrency(item.priceCents, item.currency)}</strong>
            <span>{item.isActive ? "Orderable" : "Hidden"}</span>
            <button className="button button-secondary" onClick={() => onStartEdit(item)} type="button">
              Edit
            </button>
          </div>
        </>
      )}
    </article>
  );
}

export function RestaurantSetupShell() {
  const { status, session, signOut, refreshBusinessSession } = useBusinessAuth();
  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [menu, setMenu] = useState<RestaurantMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [restaurantSubmitting, setRestaurantSubmitting] = useState(false);
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [itemSubmitting, setItemSubmitting] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingSubmitting, setEditingSubmitting] = useState(false);
  const [editForm, setEditForm] = useState<MenuItemEditForm | null>(null);
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
    setSuccess(null);

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
    setSuccess(null);

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
    setSuccess(null);

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
    setSuccess(null);

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

  function handleStartEditItem(item: MenuItemSummary) {
    setEditingItemId(item.id);
    setEditForm(menuItemToEditForm(item));
    setError(null);
    setEditError(null);
    setSuccess(null);
  }

  function handleCancelEditItem() {
    setEditingItemId(null);
    setEditForm(null);
    setEditError(null);
  }

  async function handleUpdateItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selectedRestaurantId || !editingItemId || !editForm) {
      return;
    }

    setError(null);
    setEditError(null);
    setSuccess(null);

    const payload = buildMenuItemUpdatePayload(editForm);
    if (parsePriceInputToCents(editForm.price) === null) {
      setEditError("Could not update menu item. Enter a valid positive price, for example 12.99.");
      return;
    }

    if (parseSortOrderInput(editForm.sortOrder) === null) {
      setEditError("Could not update menu item. Display order must be a whole number.");
      return;
    }

    if (!payload) {
      setEditError("Could not update menu item. Item name must be at least 2 characters.");
      return;
    }

    setEditingSubmitting(true);

    try {
      await updateMenuItem(session, selectedRestaurantId, editingItemId, payload);
      handleCancelEditItem();
      await loadMenu(session, selectedRestaurantId);
      setSuccess("Menu item updated.");
    } catch (issue) {
      setEditError(mapMenuWriteError(issue, "Could not update menu item."));
    } finally {
      setEditingSubmitting(false);
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
            {session ? <NotificationsBell session={session} /> : null}
            <ContextualHelpLink href="/help/getting-started" />
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
          <aside className="sw-command-surface merchant-readiness-card" aria-label="Setup readiness">
            <span className="readiness-icon" aria-hidden="true">
              <ShipWrightIcon name={hasItem ? "check" : "menu"} />
            </span>
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
          <WorkspaceNav active="restaurant" className="merchant-nav" platformAdmin={session.context.platformAdmin} />

          <section className="merchant-side-section">
            <span className="ops-section-label">Operator</span>
            <strong>{session.context.displayName}</strong>
            <p>{session.context.email}</p>
          </section>

          <section className="merchant-side-section">
            <span className="ops-section-label">Live setup</span>
            <div className="merchant-side-metrics">
              <div>
                <span className="merchant-side-metric-icon" aria-hidden="true">
                  <ShipWrightIcon name="restaurant" />
                </span>
                <strong>{restaurants.length}</strong>
                <span>Merchants</span>
              </div>
              <div>
                <span className="merchant-side-metric-icon" aria-hidden="true">
                  <ShipWrightIcon name="menu" />
                </span>
                <strong>{categoryCount}</strong>
                <span>Categories</span>
              </div>
              <div>
                <span className="merchant-side-metric-icon" aria-hidden="true">
                  <ShipWrightIcon name="queue" />
                </span>
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
          {success ? <div className="merchant-success" role="status">{success}</div> : null}

          <section className="merchant-step-strip" aria-label="Merchant setup progress">
            <div className={stepClass(hasRestaurant, !hasRestaurant)}>
              <span className="merchant-step-icon" aria-hidden="true">
                <ShipWrightIcon name={hasRestaurant ? "check" : "restaurant"} />
              </span>
              <div>
                <strong>Restaurant profile</strong>
                <p>{hasRestaurant ? selectedRestaurant?.name : "Create the pilot merchant."}</p>
              </div>
            </div>
            <div className={stepClass(hasCategory, hasRestaurant && !hasCategory)}>
              <span className="merchant-step-icon" aria-hidden="true">
                <ShipWrightIcon name={hasCategory ? "check" : "menu"} />
              </span>
              <div>
                <strong>Menu sections</strong>
                <p>{hasCategory ? `${categoryCount} categor${categoryCount === 1 ? "y" : "ies"}` : "Add the first section."}</p>
              </div>
            </div>
            <div className={stepClass(hasItem, hasRestaurant && hasCategory && !hasItem)}>
              <span className="merchant-step-icon" aria-hidden="true">
                <ShipWrightIcon name={hasItem ? "check" : "queue"} />
              </span>
              <div>
                <strong>Orderable items</strong>
                <p>{hasItem ? `${itemCount} item${itemCount === 1 ? "" : "s"} ready` : "Add the first item."}</p>
              </div>
            </div>
          </section>

          <section className="merchant-command-grid">
            <section className="sw-operational-surface merchant-panel merchant-panel-primary">
              <div className="merchant-panel-heading">
                <div>
                  <p className="eyebrow">Step 1</p>
                  <h2>Restaurant identity</h2>
                  <p>Create the merchant profile and customer-facing link.</p>
                </div>
                {hasRestaurant ? <span className="sw-badge sw-badge--success">Profile ready</span> : null}
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

            <section className="sw-supporting-surface merchant-panel merchant-restaurant-list-panel">
              <div className="merchant-panel-heading">
                <div>
                  <p className="eyebrow">Select profile</p>
                  <h2>Pilot merchants</h2>
                  <p>Choose the restaurant whose menu you are composing.</p>
                </div>
              </div>

              {loading ? (
                <div className="merchant-empty-state">
                  <span className="empty-state-icon" aria-hidden="true">
                    <ShipWrightIcon name="restaurant" />
                  </span>
                  <strong>Loading merchant profiles</strong>
                  <p>Reading the current pilot setup for this workspace.</p>
                </div>
              ) : restaurants.length === 0 ? (
                <div className="merchant-empty-state merchant-empty-state-accent">
                  <span className="empty-state-icon" aria-hidden="true">
                    <ShipWrightIcon name="restaurant" />
                  </span>
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
            <section className="sw-operational-surface merchant-panel">
              <div className="merchant-panel-heading">
                <div>
                  <p className="eyebrow">Step 2</p>
                  <h2>Add a menu section</h2>
                  <p>Start with the customer’s first decision: mains, drinks, sides, or specials.</p>
                </div>
                {!selectedRestaurant ? <span className="sw-badge sw-badge--neutral">Locked</span> : null}
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

            <section className="sw-operational-surface merchant-panel">
              <div className="merchant-panel-heading">
                <div>
                  <p className="eyebrow">Step 3</p>
                  <h2>Add an orderable item</h2>
                  <p>Tie every item to a section so the public menu stays structured.</p>
                </div>
                {hasCategory ? null : <span className="sw-badge sw-badge--neutral">Needs section</span>}
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

          <section className="sw-supporting-surface merchant-menu-preview">
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
                <span className="empty-state-icon" aria-hidden="true">
                  <ShipWrightIcon name="restaurant" />
                </span>
                <strong>Select or create a restaurant first</strong>
                <p>The menu preview unlocks after the merchant profile exists.</p>
              </div>
            ) : !menu || menu.categories.length === 0 ? (
              <div className="merchant-empty-state merchant-empty-state-accent">
                <span className="empty-state-icon" aria-hidden="true">
                  <ShipWrightIcon name="menu" />
                </span>
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
                      <span className={category.isActive ? "sw-badge sw-badge--success" : "sw-badge sw-badge--neutral"}>
                        {category.isActive ? "Live" : "Inactive"}
                      </span>
                    </div>

                    {category.items.length === 0 ? (
                      <div className="merchant-empty-inline">
                        <span className="empty-state-icon empty-state-icon-small" aria-hidden="true">
                          <ShipWrightIcon name="queue" />
                        </span>
                        <strong>No items yet</strong>
                        <p>Add the first item so this section can appear in the customer menu.</p>
                      </div>
                    ) : (
                      <div className="merchant-menu-items">
                        {category.items.map((item) => (
                          <EditableMenuItemRow
                            categories={menu.categories}
                            editForm={editForm}
                            isEditing={editingItemId === item.id}
                            item={item}
                            key={item.id}
                            onCancel={handleCancelEditItem}
                            onChange={setEditForm}
                            onSave={handleUpdateItem}
                            onStartEdit={handleStartEditItem}
                            saveError={editingItemId === item.id ? editError : null}
                            saving={editingSubmitting}
                          />
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
