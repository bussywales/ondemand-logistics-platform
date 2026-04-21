import { describe, expect, it } from "vitest";
import {
  isAllowedCorsOrigin,
  resolveAllowedOrigins,
  resolveAllowedVercelProjects
} from "./cors.js";

describe("cors origin allowlist", () => {
  it("allows localhost by default", () => {
    expect(isAllowedCorsOrigin({ origin: "http://localhost:3000" })).toBe(true);
  });

  it("allows configured exact origins", () => {
    const allowedOrigins = resolveAllowedOrigins("https://app.example.com");
    expect(isAllowedCorsOrigin({ origin: "https://app.example.com", allowedOrigins })).toBe(true);
  });

  it("allows matching vercel preview domains for configured projects", () => {
    const allowedVercelProjects = resolveAllowedVercelProjects();
    expect(
      isAllowedCorsOrigin({
        origin: "https://ondemand-logistics-platform-6h9txylgn-xthetic-studios-projects.vercel.app",
        allowedVercelProjects
      })
    ).toBe(true);
    expect(
      isAllowedCorsOrigin({
        origin: "https://ondemand-logistics-platform-git-ce080d-xthetic-studios-projects.vercel.app",
        allowedVercelProjects
      })
    ).toBe(true);
  });

  it("rejects unrelated origins", () => {
    expect(isAllowedCorsOrigin({ origin: "https://evil.example.com" })).toBe(false);
    expect(isAllowedCorsOrigin({ origin: "https://other-project.vercel.app" })).toBe(false);
  });
});
