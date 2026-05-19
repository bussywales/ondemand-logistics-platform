import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { EditableMenuItemRow } from "./restaurant-setup-shell";
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
    expect(html).toContain("Edit");
  });

  it("renders the menu item edit form with price controls", () => {
    const html = renderToStaticMarkup(
      <EditableMenuItemRow
        categories={categories}
        editForm={{
          categoryId: item.categoryId,
          name: "Chicken wrap",
          description: "Fresh and hot",
          priceCents: 1499,
          sortOrder: 0,
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

    expect(html).toContain("Price in pence");
    expect(html).toContain("1499");
    expect(html).toContain("Save item");
    expect(html).toContain("Orderable on the public menu");
  });
});
