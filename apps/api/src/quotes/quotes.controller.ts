import { Body, Controller, HttpCode, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { IdempotencyKey } from "../security/idempotency-key.decorator.js";
import { RequestUser } from "../security/request-user.decorator.js";
import type { AuthenticatedUser } from "../security/types.js";
import { QuotesService } from "./quotes.service.js";

@Controller("v1/quotes")
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  @HttpCode(201)
  async createQuote(
    @Body() body: unknown,
    @IdempotencyKey() idempotencyKey: string,
    @RequestUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.quotesService.createQuote(body, user.id, idempotencyKey);
    if (result.replay) {
      response.status(result.responseCode);
      response.setHeader("x-idempotent-replay", "true");
    }

    return result.body;
  }
}
