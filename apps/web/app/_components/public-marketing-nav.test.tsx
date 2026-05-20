import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PublicMarketingNav } from "./public-marketing-nav";

describe("PublicMarketingNav", () => {
  it("renders the shared public navigation with pricing and pilot CTAs", () => {
    const html = renderToStaticMarkup(<PublicMarketingNav />);

    expect(html).toContain("Platform");
    expect(html).toContain("Solutions");
    expect(html).toContain("Command Intelligence");
    expect(html).toContain("Resources");
    expect(html).toContain("Pricing");
    expect(html).toContain("/pricing");
    expect(html).toContain("Start controlled pilot");
  });

  it("renders controlled accessible mega menu triggers", () => {
    const html = renderToStaticMarkup(<PublicMarketingNav />);

    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("landing-mega-trigger");
    expect(html).toContain("public-marketing-mobile-toggle");
    expect(html).not.toContain("<summary><span>Platform</span>");
  });
});
