import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage, { metadata } from "./page";
import { chipparStages, nextChipparStage } from "./_components/chippar-demo";

describe("Chippar public homepage", () => {
  it("renders the selected brand and keeps real conversion routes", () => {
    const html = renderToStaticMarkup(<HomePage />);
    expect(html).toContain("Chippar");
    expect(html).toContain("Keep local");
    expect(html).toContain("commerce moving.");
    for (const path of [
      "/demo/request",
      "/demo/request?interest=pilot",
      "/get-started",
      "/pricing",
    ])
      expect(html).toContain(`href="${path}"`);
    expect(metadata.title).toBe("Chippar | Keep local commerce moving");
  });
  it("makes every stage interactive and labels the example without live completion claims", () => {
    const html = renderToStaticMarkup(<HomePage />);
    expect(html).toContain("Illustrative demo, not live data");
    expect(html).toContain("No live order or action");
    expect(html).toContain("aria-pressed");
    for (const stage of chipparStages) {
      expect(html).toContain(`data-asset="${stage.image}"`);
      expect(html).toContain(stage.label);
    }
    expect(chipparStages[2].time).toBe("Pending");
    expect(chipparStages[3].time).toBe("Pending");
    expect(html).not.toContain("10:22");
    expect(html).not.toContain("10:41");
  });
  it("provides semantic navigation, a labelled native dialog and live detail announcement", () => {
    const html = renderToStaticMarkup(<HomePage />);
    for (const expected of [
      "Skip to product",
      'aria-label="Primary navigation"',
      'aria-expanded="false"',
      "<dialog",
      'aria-labelledby="chippar-tour-title"',
      'aria-live="polite"',
      'aria-label="Close product tour"',
    ])
      expect(html).toContain(expected);
  });
  it("keeps tour progression local and returns to dispatch instead of claiming fulfilment", () => {
    expect(nextChipparStage(0)).toBe(1);
    expect(nextChipparStage(1)).toBe(2);
    expect(nextChipparStage(2)).toBe(3);
    expect(nextChipparStage(3)).toBe(1);
  });
});
