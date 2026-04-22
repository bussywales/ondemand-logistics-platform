import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { Public } from "./security/public.decorator.js";
import { PgService } from "./database/pg.service.js";
import { getRequestContext } from "@shipwright/observability";
import {
  SchemaCompatibilityError,
  SchemaReadinessService
} from "./database/schema-readiness.service.js";

@Controller()
export class HealthController {
  constructor(
    private readonly pg: PgService,
    private readonly schemaReadiness: SchemaReadinessService
  ) {}

  @Public()
  @Get("healthz")
  healthz() {
    return {
      status: "ok",
      service: "api",
      requestId: getRequestContext()?.requestId
    };
  }

  @Public()
  @Get("readyz")
  async readyz() {
    try {
      await this.pg.query("select 1");
      await this.schemaReadiness.assertCriticalSchemaCompatibility();
      return {
        status: "ok",
        service: "api",
        requestId: getRequestContext()?.requestId
      };
    } catch (error) {
      if (error instanceof SchemaCompatibilityError) {
        throw new ServiceUnavailableException({
          status: "error",
          service: "api",
          requestId: getRequestContext()?.requestId,
          message: "schema_compatibility_not_ready",
          missingElements: error.missingElements
        });
      }

      throw new ServiceUnavailableException({
        status: "error",
        service: "api",
        requestId: getRequestContext()?.requestId,
        message: "database_not_ready",
        error: error instanceof Error ? error.message : "unknown_error"
      });
    }
  }
}
