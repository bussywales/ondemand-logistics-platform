import { describe, expect, it } from "vitest";
import { normalizeBillingPostcode } from "./billing-postcode";

describe("normalizeBillingPostcode", () => {
  it("normalizes UK-style postcodes without forcing ZIP formatting", () => {
    expect(normalizeBillingPostcode(" sw1a   1aa ")).toBe("SW1A 1AA");
    expect(normalizeBillingPostcode("EC1V 9BW")).toBe("EC1V 9BW");
  });

  it("allows the billing postcode to remain optional", () => {
    expect(normalizeBillingPostcode("   ")).toBe("");
  });
});

