import { describe, expect, it } from "vitest";
import { generateRequestId } from "./index.js";

describe("generateRequestId", () => {
  it("returns UUIDs", () => {
    const value = generateRequestId();
    expect(value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });
});
