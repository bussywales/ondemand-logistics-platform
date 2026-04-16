import { Body, Controller, Headers, HttpCode, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { RequestUser } from "../security/request-user.decorator.js";
import type { AuthenticatedUser } from "../security/types.js";
import { JobsService } from "./jobs.service.js";

@Controller("v1/jobs")
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @HttpCode(201)
  async createJob(
    @Body() body: unknown,
    @Headers("x-idempotency-key") idempotencyKey: string,
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
}
