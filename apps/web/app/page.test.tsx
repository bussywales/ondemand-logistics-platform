import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("renders product proof storytelling and pilot story sections", () => {
    const html = renderToStaticMarkup(<HomePage />);

    expect(html).toContain("Built for controlled operations, not guesswork.");
    expect(html).toContain("Paid-delivery proof flow");
    expect(html).toContain("Release readiness dashboard");
    expect(html).toContain("Dispatch override audit");
    expect(html).toContain("Menu rollback audit");
    expect(html).toContain("Fleet readiness");
    expect(html).toContain("Pilot story: from order to proof.");
  });

  it("renders safe product visual cards and public CTAs", () => {
    const html = renderToStaticMarkup(<HomePage />);

    expect(html).toContain("Command centre");
    expect(html).toContain("Merchant menu operations");
    expect(html).toContain("Fleet workspace");
    expect(html).toContain("Finance visibility");
    expect(html).toContain("Validation evidence");
    expect(html).toContain('href="/pricing"');
    expect(html).toContain('href="/demo/request?interest=pilot"');
  });
});
