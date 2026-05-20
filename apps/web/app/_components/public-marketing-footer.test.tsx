import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PublicMarketingFooter } from "./public-marketing-footer";

describe("PublicMarketingFooter", () => {
  it("renders shared public footer links", () => {
    const html = renderToStaticMarkup(<PublicMarketingFooter />);

    expect(html).toContain("Route intelligence for local commerce");
    expect(html).toContain('href="/get-started"');
    expect(html).toContain('href="/demo"');
    expect(html).toContain('href="/demo/investor"');
    expect(html).toContain('href="/pricing"');
    expect(html).toContain('href="/demo/request"');
    expect(html).toContain('href="/contact"');
  });
});
