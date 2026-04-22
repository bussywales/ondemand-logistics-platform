import { ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { HealthController } from "./health.controller.js";
import { SchemaCompatibilityError } from "./database/schema-readiness.service.js";

describe("HealthController", () => {
  it("returns readiness success when database and schema checks pass", async () => {
    const controller = new HealthController(
      { query: vi.fn().mockResolvedValue({ rows: [{ "?column?": 1 }] }) } as never,
      { assertCriticalSchemaCompatibility: vi.fn().mockResolvedValue(undefined) } as never
    );

    await expect(controller.readyz()).resolves.toMatchObject({
      status: "ok",
      service: "api"
    });
  });

  it("returns explicit schema readiness failures", async () => {
    const controller = new HealthController(
      { query: vi.fn().mockResolvedValue({ rows: [{ "?column?": 1 }] }) } as never,
      {
        assertCriticalSchemaCompatibility: vi
          .fn()
          .mockRejectedValue(
            new SchemaCompatibilityError(["public.jobs.quote_id", "public.payments.created_at"])
          )
      } as never
    );

    await expect(controller.readyz()).rejects.toThrow(ServiceUnavailableException);

    await controller.readyz().catch((error) => {
      expect(error.getResponse()).toMatchObject({
        message: "schema_compatibility_not_ready",
        missingElements: ["public.jobs.quote_id", "public.payments.created_at"]
      });
    });
  });

  it("preserves database connectivity failures as database_not_ready", async () => {
    const controller = new HealthController(
      { query: vi.fn().mockRejectedValue(new Error("password authentication failed")) } as never,
      { assertCriticalSchemaCompatibility: vi.fn() } as never
    );

    await controller.readyz().catch((error) => {
      expect(error.getResponse()).toMatchObject({
        message: "database_not_ready",
        error: "password authentication failed"
      });
    });
  });
});
