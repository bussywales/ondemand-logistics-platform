import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res
} from "@nestjs/common";
import type { Request, Response } from "express";
import { IdempotencyKey } from "../security/idempotency-key.decorator.js";
import { RequestUser } from "../security/request-user.decorator.js";
import type { AuthenticatedUser } from "../security/types.js";
import { Public } from "../security/public.decorator.js";
import { PaymentsService } from "./payments.service.js";

type RawBodyRequest = Request & { rawBody?: Buffer };

@Controller("v1")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get("jobs/:jobId/payment")
  async getJobPayment(@Param("jobId") jobId: string, @RequestUser() user: AuthenticatedUser) {
    return this.paymentsService.getJobPayment(jobId, user.id);
  }

  @Get("business/payments")
  async listBusinessPayments(@RequestUser() user: AuthenticatedUser) {
    return {
      items: await this.paymentsService.listBusinessPayments(user.id)
    };
  }

  @Get("business/finance/summary")
  async getBusinessFinanceSummary(@Query() query: Record<string, string | undefined>, @RequestUser() user: AuthenticatedUser) {
    return this.paymentsService.getBusinessFinanceSummary(user.id, query);
  }

  @Get("business/finance/transactions")
  async listBusinessFinanceTransactions(@Query() query: Record<string, string | undefined>, @RequestUser() user: AuthenticatedUser) {
    return {
      items: await this.paymentsService.listBusinessFinanceTransactions(user.id, query)
    };
  }

  @Get("business/finance/reviews")
  async listBusinessFinanceReviews(@Query() query: Record<string, string | undefined>, @RequestUser() user: AuthenticatedUser) {
    return {
      items: await this.paymentsService.listBusinessFinanceReviews(user.id, query)
    };
  }

  @Post("business/finance/reviews")
  async createBusinessFinanceReview(@Body() body: unknown, @RequestUser() user: AuthenticatedUser) {
    return this.paymentsService.createBusinessFinanceReview(user.id, body);
  }

  @Patch("business/finance/reviews/:reviewId")
  async updateBusinessFinanceReview(
    @Param("reviewId") reviewId: string,
    @Body() body: unknown,
    @RequestUser() user: AuthenticatedUser
  ) {
    return this.paymentsService.updateBusinessFinanceReview(user.id, reviewId, body);
  }

  @Post("jobs/:jobId/payment/authorize")
  @HttpCode(200)
  async authorizeJobPayment(
    @Param("jobId") jobId: string,
    @Body() body: unknown,
    @IdempotencyKey() idempotencyKey: string,
    @RequestUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.paymentsService.authorizeJobPayment(jobId, body, user.id, idempotencyKey);
    if (result.replay) {
      response.status(result.responseCode);
      response.setHeader("x-idempotent-replay", "true");
    } else if (result.responseCode !== 200) {
      response.status(result.responseCode);
    }

    return result.body;
  }

  @Public()
  @Post("webhooks/stripe")
  @HttpCode(200)
  async handleStripeWebhook(
    @Req() request: RawBodyRequest,
    @Headers("stripe-signature") signature: string
  ) {
    const rawBody = request.rawBody ?? JSON.stringify(request.body ?? {});
    return this.paymentsService.handleStripeWebhook(rawBody, signature);
  }
}
