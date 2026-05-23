import { describe, expect, it } from "vitest";
import { trackAnalyticsEvent } from "./analytics";

describe("public analytics helper", () => {
  it("does not throw when analytics is unavailable", () => {
    expect(() => trackAnalyticsEvent({ eventName: "CTA_CLICKED", metadata: { label: "Start controlled pilot" } })).not.toThrow();
  });
});
