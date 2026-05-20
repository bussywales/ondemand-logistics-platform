import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  EditableMenuItemRow,
  buildMenuItemUpdatePayload,
  centsToPriceInput,
  parsePriceInputToCents,
  parseSortOrderInput
} from "./restaurant-setup-shell";
import type { MenuItemSummary, RestaurantMenuCategory } from "../_lib/product-state";

const item: MenuItemSummary = {
  id: "11111111-1111-4111-8111-111111111111",
  restaurantId: "22222222-2222-4222-8222-222222222222",
  categoryId: "33333333-3333-4333-8333-333333333333",
  name: "Chicken wrap",
  description: "Fresh and hot",
  priceCents: 1299,
  currency: "GBP",
  isActive: true,
  sortOrder: 0,
  createdAt: "2026-05-19T10:00:00.000Z",
  updatedAt: "2026-05-19T10:00:00.000Z"
};

const categories: RestaurantMenuCategory[] = [
  {
    id: item.categoryId,
    restaurantId: item.restaurantId,
    name: "Mains",
    sortOrder: 0,
    isActive: true,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    items: [item]
  }
];

describe("EditableMenuItemRow", () => {
  it("renders the current menu item price with an edit action", () => {
    const html = renderToStaticMarkup(
      <EditableMenuItemRow
        categories={categories}
        editForm={null}
        isEditing={false}
        item={item}
        onCancel={vi.fn()}
        onChange={vi.fn()}
        onSave={vi.fn()}
        onStartEdit={vi.fn()}
        saving={false}
      />
    );

    expect(html).toContain("Chicken wrap");
    expect(html).toContain("£12.99");
    expect(html).toContain("Live");
    expect(html).toContain("Move up");
    expect(html).toContain("Move down");
    expect(html).toContain("Edit");
  });

  it("renders hidden item availability clearly", () => {
    const html = renderToStaticMarkup(
      <EditableMenuItemRow
        categories={categories}
        editForm={null}
        isEditing={false}
        item={{ ...item, isActive: false }}
        onCancel={vi.fn()}
        onChange={vi.fn()}
        onSave={vi.fn()}
        onStartEdit={vi.fn()}
        saving={false}
      />
    );

    expect(html).toContain("Hidden");
    expect(html).toContain("Hidden from public menu");
  });

  it("renders the structured menu item edit form with price controls", () => {
    const html = renderToStaticMarkup(
      <EditableMenuItemRow
        categories={categories}
        editForm={{
          categoryId: item.categoryId,
          name: "Chicken wrap",
          description: "Fresh and hot",
          price: "14.99",
          sortOrder: "0",
          isActive: true
        }}
        isEditing
        item={item}
        onCancel={vi.fn()}
        onChange={vi.fn()}
        onSave={vi.fn()}
        onStartEdit={vi.fn()}
        saving={false}
      />
    );

    expect(html).toContain("Edit menu item");
    expect(html).toContain("Update customer-facing menu details.");
    expect(html).toContain("Item details");
    expect(html).toContain("Pricing and visibility");
    expect(html).toContain("Organisation");
    expect(html).toContain("Price");
    expect(html).toContain("14.99");
    expect(html).toContain("Save item");
    expect(html).toContain("Show this item as orderable on the public menu");
  });

  it("renders a visible save error while keeping the edit form open", () => {
    const html = renderToStaticMarkup(
      <EditableMenuItemRow
        categories={categories}
        editForm={{
          categoryId: item.categoryId,
          name: "Chicken wrap",
          description: "Fresh and hot",
          price: "12.99",
          sortOrder: "0",
          isActive: true
        }}
        isEditing
        item={item}
        onCancel={vi.fn()}
        onChange={vi.fn()}
        onSave={vi.fn()}
        onStartEdit={vi.fn()}
        saveError="Could not update menu item. Enter a valid positive price, for example 12.99."
        saving={false}
      />
    );

    expect(html).toContain("Could not update menu item.");
    expect(html).toContain("Save item");
  });

  it("converts visible prices to integer pence and rejects invalid values", () => {
    expect(centsToPriceInput(1299)).toBe("12.99");
    expect(parsePriceInputToCents("12.99")).toBe(1299);
    expect(parsePriceInputToCents("12.9")).toBe(1290);
    expect(parsePriceInputToCents("12.999")).toBeNull();
    expect(parsePriceInputToCents("")).toBeNull();
  });

  it("parses display order as a whole number", () => {
    expect(parseSortOrderInput("0")).toBe(0);
    expect(parseSortOrderInput("12")).toBe(12);
    expect(parseSortOrderInput("1.5")).toBeNull();
    expect(parseSortOrderInput("")).toBeNull();
  });

  it("builds the API payload without empty optional UUID fields", () => {
    expect(
      buildMenuItemUpdatePayload({
        categoryId: "",
        name: " Chicken wrap ",
        description: "",
        price: "12.99",
        sortOrder: "0",
        isActive: false
      })
    ).toEqual({
      name: "Chicken wrap",
      description: null,
      priceCents: 1299,
      sortOrder: 0,
      isActive: false
    });
  });
});
