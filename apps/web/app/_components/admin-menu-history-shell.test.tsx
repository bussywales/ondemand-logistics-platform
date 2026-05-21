import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminMenuHistoryView } from "./admin-menu-history-shell";
import type { AdminMenuHistoryEvent } from "../_lib/product-state";

const event: AdminMenuHistoryEvent = {
  id: "audit-1",
  orgId: "org-1",
  orgName: "Pilot Org",
  restaurantId: "restaurant-1",
  restaurantName: "Pilot Kitchen",
  eventType: "MENU_ITEM_PRICE_UPDATED",
  actorName: "Operator One",
  actorEmail: "operator@example.com",
  createdAt: "2026-05-21T10:00:00.000Z",
  summary: "Chicken wrap price changed from £12.99 to £14.99.",
  resourceType: "item",
  resourceName: "Chicken wrap",
  changedFields: ["priceCents"],
  rollbackReadiness: "ROLLBACK_PREPARED",
  rollbackReason: "This event has previous and new values for reversible menu fields. Rollback is not active yet.",
  reversibleFields: ["priceCents"],
  metadata: { previous: { priceCents: 1299 }, next: { priceCents: 1499 } }
};

describe("AdminMenuHistoryView", () => {
  it("renders cross-org menu audit events", () => {
    const html = renderToStaticMarkup(<AdminMenuHistoryView history={[event]} />);

    expect(html).toContain("Admin menu history");
    expect(html).toContain("Cross-org restaurant menu changes");
    expect(html).toContain("Chicken wrap price changed from £12.99 to £14.99.");
    expect(html).toContain("Pilot Org");
    expect(html).toContain("Pilot Kitchen");
    expect(html).toContain("Rollback prepared");
    expect(html).toContain("priceCents");
    expect(html).toContain("append-only audit log");
  });

  it("renders an empty state", () => {
    const html = renderToStaticMarkup(<AdminMenuHistoryView history={[]} />);

    expect(html).toContain("No menu changes found");
    expect(html).toContain("Menu changes will appear here after merchant edits.");
  });
});
