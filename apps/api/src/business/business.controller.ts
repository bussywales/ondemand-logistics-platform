import { Body, Controller, Get, HttpCode, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { IdempotencyKey } from "../security/idempotency-key.decorator.js";
import { RequestUser } from "../security/request-user.decorator.js";
import type { AuthenticatedUser } from "../security/types.js";
import { BusinessService } from "./business.service.js";

@Controller("v1/business")
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Post("orgs")
  @HttpCode(201)
  async createBusinessOrg(
    @Body() body: unknown,
    @IdempotencyKey() idempotencyKey: string,
    @RequestUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.businessService.createBusinessOrg(body, user, idempotencyKey);
    if (result.replay) {
      response.status(result.responseCode);
      response.setHeader("x-idempotent-replay", "true");
    }

    return result.body;
  }

  @Get("context")
  async getBusinessContext(@RequestUser() user: AuthenticatedUser) {
    return this.businessService.getBusinessContext(user);
  }
}
