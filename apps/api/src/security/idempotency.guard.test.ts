import { describe, expect, it } from "vitest";
import { BadRequestException, type ExecutionContext } from "@nestjs/common";
import { IdempotencyGuard } from "./idempotency.guard.js";

function makeContext(method: string, key?: string): ExecutionContext {
  return {
    getClass: () => ({}) as never,
    getHandler: () => (() => undefined) as never,
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        headers: {
          "x-idempotency-key": key
        }
      })
    })
  } as unknown as ExecutionContext;
}

describe("IdempotencyGuard", () => {
  it("rejects write methods when key is missing", () => {
    const guard = new IdempotencyGuard({
      getAllAndOverride: () => false
    } as never);

    expect(() => guard.canActivate(makeContext("POST"))).toThrow(BadRequestException);
  });

  it("allows read methods without idempotency key", () => {
    const guard = new IdempotencyGuard({
      getAllAndOverride: () => false
    } as never);

    expect(guard.canActivate(makeContext("GET"))).toBe(true);
  });
});
