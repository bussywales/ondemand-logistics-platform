import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Res
} from "@nestjs/common";
import type { Response } from "express";
import { Roles } from "../security/roles.decorator.js";
import { RequestUser } from "../security/request-user.decorator.js";
import type { AuthenticatedUser } from "../security/types.js";
import { FoundationsService } from "./foundations.service.js";

@Controller("v1/foundations")
export class FoundationsController {
  constructor(private readonly foundationsService: FoundationsService) {}

  @Post("write-probe")
  @HttpCode(201)
  @Roles("BUSINESS_OPERATOR", "ADMIN")
  async writeProbe(
    @Body() body: unknown,
    @Headers("x-idempotency-key") idempotencyKey: string,
    @RequestUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.foundationsService.recordWrite(body, user.id, idempotencyKey);
    if (result.replay) {
      response.status(result.responseCode);
      response.setHeader("x-idempotent-replay", "true");
    }

    return result.body;
  }
}
