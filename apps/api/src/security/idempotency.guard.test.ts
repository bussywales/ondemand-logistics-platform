import { describe, expect, it } from "vitest";
import { BadRequestException, type ExecutionContext } from "@nestjs/common";
import { IdempotencyGuard } from "./idempotency.guard.js";

function makeContext(
  method: string,
  key?: string,
  headerName: "idempotency-key" | "x-idempotency-key" = "x-idempotency-key"
): ExecutionContext {
  return {
    getClass: () => ({}) as never,
    getHandler: () => (() => undefined) as never,
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        headers: {
          [headerName]: key
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

  it("accepts the standard Idempotency-Key header", () => {
    const guard = new IdempotencyGuard({
      getAllAndOverride: () => false
    } as never);

    expect(guard.canActivate(makeContext("POST", "idem_12345678", "idempotency-key"))).toBe(true);
  });
});
