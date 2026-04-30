import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dismissProductUpdate,
  getLatestRelevantProductUpdate,
  getRelevantProductUpdates,
  matchesProductUpdateRoute,
  readDismissedProductUpdateIds
} from "./product-updates";

function makeStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    }
  };
}

describe("product updates helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("filters updates by audience context", () => {
    const business = getRelevantProductUpdates({ viewer: "business" });
    const driver = getRelevantProductUpdates({ viewer: "driver" });
    const admin = getRelevantProductUpdates({ viewer: "platform_admin" });

    expect(business.some((update) => update.id === "business-orders-queue")).toBe(true);
    expect(business.some((update) => update.id === "driver-execution-page")).toBe(false);
    expect(driver.some((update) => update.id === "driver-execution-page")).toBe(true);
    expect(admin.some((update) => update.id === "driver-execution-page")).toBe(true);
    expect(admin.some((update) => update.id === "business-orders-queue")).toBe(true);
  });

  it("matches updates to route context prefixes", () => {
    const update = getRelevantProductUpdates({ viewer: "business" }).find((item) => item.id === "driver-assignment-picker");
    expect(update).toBeDefined();
    expect(matchesProductUpdateRoute(update!, "/app/jobs/123")).toBe(true);
    expect(matchesProductUpdateRoute(update!, "/app/orders")).toBe(false);
  });

  it("persists dismissed update ids per viewer key", () => {
    const localStorage = makeStorage();
    vi.stubGlobal("window", { localStorage });

    expect(readDismissedProductUpdateIds("operator-1")).toEqual([]);
    dismissProductUpdate("operator-1", "business-orders-queue");
    expect(readDismissedProductUpdateIds("operator-1")).toEqual(["business-orders-queue"]);
    expect(readDismissedProductUpdateIds("operator-2")).toEqual([]);
  });

  it("hides dismissed updates from the latest announcement lookup", () => {
    const localStorage = makeStorage();
    vi.stubGlobal("window", { localStorage });

    const first = getLatestRelevantProductUpdate({
      viewer: "business",
      routePath: "/app/orders",
      viewerKey: "operator-1"
    });
    expect(first).not.toBeNull();

    dismissProductUpdate("operator-1", first!.id);

    const second = getLatestRelevantProductUpdate({
      viewer: "business",
      routePath: "/app/orders",
      viewerKey: "operator-1"
    });

    expect(second?.id).not.toBe(first?.id);
  });
});
