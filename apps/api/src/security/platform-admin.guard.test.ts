import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { PlatformAdminGuard } from "./platform-admin.guard.js";

function createContext(user?: { id: string }) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user })
    })
  } as never;
}

describe("PlatformAdminGuard", () => {
  it("allows authenticated platform admins", async () => {
    const service = { isPlatformAdmin: vi.fn().mockResolvedValue(true) };
    const guard = new PlatformAdminGuard(service as never);

    await expect(guard.canActivate(createContext({ id: "user-1" }))).resolves.toBe(true);
    expect(service.isPlatformAdmin).toHaveBeenCalledWith("user-1");
  });

  it("blocks authenticated non-admin users", async () => {
    const guard = new PlatformAdminGuard({ isPlatformAdmin: vi.fn().mockResolvedValue(false) } as never);

    await expect(guard.canActivate(createContext({ id: "user-2" }))).rejects.toThrow(ForbiddenException);
  });

  it("blocks unauthenticated requests", async () => {
    const guard = new PlatformAdminGuard({ isPlatformAdmin: vi.fn() } as never);

    await expect(guard.canActivate(createContext())).rejects.toThrow(ForbiddenException);
  });
});
