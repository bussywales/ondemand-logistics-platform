import { describe, expect, it } from "vitest";
import { investorDemoControlLinks, investorDemoSteps, investorDemoWarnings } from "./investor-demo";

describe("investor demo content", () => {
  it("covers the Stage 1 spine from merchant setup through fulfilment", () => {
    expect(investorDemoSteps[0]?.title).toBe("Merchant setup");
    expect(investorDemoSteps.some((step) => step.title === "Public restaurant order")).toBe(true);
    expect(investorDemoSteps.some((step) => step.title === "Payment captured and order fulfilled")).toBe(true);
  });

  it("includes the required demo control links", () => {
    expect(investorDemoControlLinks.map((item) => item.href)).toEqual(
      expect.arrayContaining([
        "/restaurants/pilot-kitchen-1777370757",
        "/app/orders",
        "/app/jobs",
        "/driver",
        "/admin",
        "/app/notifications"
      ])
    );
  });

  it("warns that the proof summary is documented rather than a live feed", () => {
    expect(investorDemoWarnings.some((item) => item.includes("documented staging result"))).toBe(true);
  });
});
