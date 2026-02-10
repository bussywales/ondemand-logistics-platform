import { describe, expect, it } from "vitest";
import { computeRetrySeconds } from "./index.js";

describe("computeRetrySeconds", () => {
  it("uses exponential backoff and caps growth", () => {
    expect(computeRetrySeconds(0)).toBe(1);
    expect(computeRetrySeconds(1)).toBe(2);
    expect(computeRetrySeconds(4)).toBe(16);
    expect(computeRetrySeconds(8)).toBe(64);
  });
});
