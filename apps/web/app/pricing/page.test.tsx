import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PricingPage from "./page";

describe("PricingPage", () => {
  it("renders controlled pilot package positioning", () => {
    const html = renderToStaticMarkup(<PricingPage />);

    expect(html).toContain("Controlled pilot packages");
    expect(html).toContain("Commercial entry without public-price theatre.");
    expect(html).toContain("Pilot pricing discussed after fit review");
  });

  it("renders the three commercial paths with demo request CTAs", () => {
    const html = renderToStaticMarkup(<PricingPage />);

    expect(html).toContain("Controlled Pilot");
    expect(html).toContain("Operator / Platform Pilot");
    expect(html).toContain("Investor / Partner Demo");
    expect(html).toContain("/demo/request?interest=pilot");
    expect(html).toContain("/demo/request?interest=operator");
    expect(html).toContain("/demo/request?interest=investor");
  });

  it("states current boundaries without claiming autonomous workflows", () => {
    const html = renderToStaticMarkup(<PricingPage />);

    expect(html).toContain("Autonomous refunds");
    expect(html).toContain("Autonomous dispatch override");
    expect(html).toContain("Full settlement or payout automation");
    expect(html).toContain("Command Intelligence is deterministic and human-in-the-loop");
  });
});
