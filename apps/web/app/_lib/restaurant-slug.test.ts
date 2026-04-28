import { describe, expect, it } from "vitest";
import { normalizeRestaurantSlug } from "./restaurant-slug";

describe("normalizeRestaurantSlug", () => {
  it("derives a normalized slug from a restaurant name", () => {
    expect(normalizeRestaurantSlug("  Pilot Kitchen London  ")).toBe("pilot-kitchen-london");
  });

  it("drops unsupported characters and enforces the length cap", () => {
    expect(normalizeRestaurantSlug("Fish & Chips / Soho!!!")).toBe("fish-chips-soho");
    expect(normalizeRestaurantSlug("a".repeat(80))).toHaveLength(64);
  });
});
