import { describe, expect, it, vi } from "vitest";
import { PlatformAdminGuard } from "../security/platform-admin.guard.js";
import { AdminMenuHistoryController } from "./restaurants.controller.js";

const GUARDS_METADATA = "__guards__";

describe("AdminMenuHistoryController", () => {
  it("requires the platform admin guard", () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AdminMenuHistoryController);
    expect(guards).toContain(PlatformAdminGuard);
  });

  it("delegates filtered queries to restaurants service", async () => {
    const service = {
      getAdminMenuHistory: vi.fn().mockResolvedValue({ items: [] })
    };
    const controller = new AdminMenuHistoryController(service as never);

    await expect(controller.getAdminMenuHistory({ orgId: "org-1", limit: "25" })).resolves.toEqual({ items: [] });
    expect(service.getAdminMenuHistory).toHaveBeenCalledWith({ orgId: "org-1", limit: "25" });
  });
});
