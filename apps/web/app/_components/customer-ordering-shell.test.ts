import { describe, expect, it } from "vitest";
import { buildRestaurantMenuHref } from "./customer-ordering-shell";

describe("CustomerOrderingShell", () => {
  it("builds the public restaurant menu href from the current slug", () => {
    expect(buildRestaurantMenuHref("pilot-kitchen-1777370757")).toBe(
      "/restaurants/pilot-kitchen-1777370757"
    );
  });
});
