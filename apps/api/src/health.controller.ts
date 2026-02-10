import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { Public } from "./security/public.decorator.js";
import { PgService } from "./database/pg.service.js";
import { getRequestContext } from "@shipwright/observability";

@Controller()
export class HealthController {
  constructor(private readonly pg: PgService) {}

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
      return {
        status: "ok",
        service: "api",
        requestId: getRequestContext()?.requestId
      };
    } catch (error) {
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
