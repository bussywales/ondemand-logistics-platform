import { Body, Controller, Get, HttpCode, Param, Post, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { IdempotencyKey } from "../security/idempotency-key.decorator.js";
import { PlatformAdminGuard } from "../security/platform-admin.guard.js";
import { RequestUser } from "../security/request-user.decorator.js";
import type { AuthenticatedUser } from "../security/types.js";
import { JobsService } from "./jobs.service.js";

@Controller("v1")
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post("jobs")
  @HttpCode(201)
  async createJob(
    @Body() body: unknown,
    @IdempotencyKey() idempotencyKey: string,
    @RequestUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.jobsService.createJobRequest(body, user.id, idempotencyKey);
    if (result.replay) {
      response.status(result.responseCode);
      response.setHeader("x-idempotent-replay", "true");
    }

    return result.body;
  }

  @Get("jobs/:jobId")
  async getJob(@Param("jobId") jobId: string, @RequestUser() user: AuthenticatedUser) {
    return this.jobsService.getJob(jobId, user.id);
  }

  @Get("business/jobs")
  async listBusinessJobs(
    @RequestUser() user: AuthenticatedUser,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.jobsService.listBusinessJobs(user.id, Number(page ?? "1"), Number(limit ?? "20"));
  }

  @Get("jobs/:jobId/tracking")
  async getTracking(@Param("jobId") jobId: string, @RequestUser() user: AuthenticatedUser) {
    return this.jobsService.getTracking(jobId, user.id);
  }

  @Get("jobs/:jobId/eligible-drivers")
  async listEligibleDrivers(@Param("jobId") jobId: string, @RequestUser() user: AuthenticatedUser) {
    return this.jobsService.listEligibleDrivers(jobId, user.id);
  }

  @Get("business/jobs/:jobId/dispatch-audit")
  async getBusinessDispatchAudit(@Param("jobId") jobId: string, @RequestUser() user: AuthenticatedUser) {
    return this.jobsService.listBusinessDispatchAudit(jobId, user.id);
  }

  @Post("business/jobs/:jobId/dispatch-override")
  @HttpCode(200)
  async createDispatchOverride(
    @Param("jobId") jobId: string,
    @Body() body: unknown,
    @IdempotencyKey() idempotencyKey: string,
    @RequestUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.jobsService.createDispatchOverride(jobId, body, user.id, idempotencyKey);
    if (result.replay) {
      response.status(result.responseCode);
      response.setHeader("x-idempotent-replay", "true");
    }

    return result.body;
  }

  @UseGuards(PlatformAdminGuard)
  @Get("admin/dispatch-audit")
  async getAdminDispatchAudit(@Query() query: Record<string, string | undefined>) {
    return this.jobsService.listAdminDispatchAudit(query);
  }

  @Post("jobs/:jobId/retry-dispatch")
  @HttpCode(200)
  async retryDispatch(
    @Param("jobId") jobId: string,
    @IdempotencyKey() idempotencyKey: string,
    @RequestUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.jobsService.retryDispatch(jobId, user.id, idempotencyKey);
    if (result.replay) {
      response.status(result.responseCode);
      response.setHeader("x-idempotent-replay", "true");
    }

    return result.body;
  }

  @Post("jobs/:jobId/reassign-driver")
  @HttpCode(200)
  async reassignDriver(
    @Param("jobId") jobId: string,
    @Body() body: unknown,
    @IdempotencyKey() idempotencyKey: string,
    @RequestUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.jobsService.reassignDriver(jobId, body, user.id, idempotencyKey);
    if (result.replay) {
      response.status(result.responseCode);
      response.setHeader("x-idempotent-replay", "true");
    }

    return result.body;
  }

  @Post("jobs/:jobId/cancel")
  @HttpCode(200)
  async cancelJob(
    @Param("jobId") jobId: string,
    @Body() body: unknown,
    @IdempotencyKey() idempotencyKey: string,
    @RequestUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.jobsService.cancelJob(jobId, body, user.id, idempotencyKey);
    if (result.replay) {
      response.status(result.responseCode);
      response.setHeader("x-idempotent-replay", "true");
    }

    return result.body;
  }
}
