import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductUpdatesContent } from "./product-updates";

describe("ProductUpdatesContent", () => {
  it("renders recent workspace updates on the business updates feed", () => {
    const html = renderToStaticMarkup(
      <ProductUpdatesContent
        description="Recent operator-facing release notes."
        title="What’s new for the workspace"
        viewer="business"
      />
    );

    expect(html).toContain("Pilot workspaces are live");
    expect(html).toContain("Pilot guardrails now appear across operations");
    expect(html).toContain("Support escalation logging is available");
    expect(html).toContain("Support escalation history is now auditable");
  });
});
