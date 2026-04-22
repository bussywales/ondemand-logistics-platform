import { describe, expect, it } from "vitest";
import { toFiniteNumber, toInteger, toIsoDateTime, toNullableIsoDateTime } from "./mapper.js";

describe("database mapper helpers", () => {
  it("normalizes Date values into ISO strings", () => {
    const value = new Date("2026-04-22T22:45:00.000Z");

    expect(toIsoDateTime(value)).toBe("2026-04-22T22:45:00.000Z");
    expect(toNullableIsoDateTime(value)).toBe("2026-04-22T22:45:00.000Z");
    expect(toNullableIsoDateTime(null)).toBeNull();
  });

  it("coerces numeric strings into finite numbers", () => {
    expect(toFiniteNumber("51.5254", "pickup_latitude")).toBe(51.5254);
    expect(toFiniteNumber(22, "eta_minutes")).toBe(22);
  });

  it("coerces numeric strings into integers when required", () => {
    expect(toInteger("5", "timeline_id")).toBe(5);
    expect(() => toInteger("5.5", "timeline_id")).toThrow("timeline_id must be an integer");
  });
});
