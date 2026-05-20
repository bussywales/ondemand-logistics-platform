import { describe, expect, it, vi } from "vitest";
import { PlatformAdminGuard } from "../security/platform-admin.guard.js";
import { AdminReleaseReadinessController } from "./release-readiness.controller.js";

const GUARDS_METADATA = "__guards__";

describe("AdminReleaseReadinessController", () => {
  it("requires the platform admin guard", () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AdminReleaseReadinessController);
    expect(guards).toContain(PlatformAdminGuard);
  });

  it("delegates to release readiness service", async () => {
    const service = {
      getReleaseReadiness: vi.fn().mockResolvedValue({ verdict: "READY" })
    };
    const controller = new AdminReleaseReadinessController(service as never);

    await expect(controller.getReleaseReadiness({ environment: "staging" })).resolves.toEqual({ verdict: "READY" });
    expect(service.getReleaseReadiness).toHaveBeenCalledWith({ environment: "staging" });
  });
});
