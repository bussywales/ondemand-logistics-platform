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
  Res
} from "@nestjs/common";
import type { Response } from "express";
import { RequestUser } from "../security/request-user.decorator.js";
import type { AuthenticatedUser } from "../security/types.js";
import { DriverService } from "./driver.service.js";

@Controller("v1/driver/me")
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Patch("availability")
  @HttpCode(200)
  async updateAvailability(
    @Body() body: unknown,
    @Headers("x-idempotency-key") idempotencyKey: string,
    @RequestUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.driverService.updateAvailability(body, user.id, idempotencyKey);
    if (result.replay) {
      response.status(result.responseCode);
      response.setHeader("x-idempotent-replay", "true");
    }

    return result.body;
  }

  @Post("location")
  @HttpCode(200)
  async updateLocation(
    @Body() body: unknown,
    @Headers("x-idempotency-key") idempotencyKey: string,
    @RequestUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.driverService.updateLocation(body, user.id, idempotencyKey);
    if (result.replay) {
      response.status(result.responseCode);
      response.setHeader("x-idempotent-replay", "true");
    }

    return result.body;
  }

  @Get("offers")
  async listOffers(@RequestUser() user: AuthenticatedUser) {
    return this.driverService.listOffers(user.id);
  }

  @Post("offers/:offerId/accept")
  @HttpCode(200)
  async acceptOffer(
    @Param("offerId") offerId: string,
    @Headers("x-idempotency-key") idempotencyKey: string,
    @RequestUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.driverService.acceptOffer(offerId, user.id, idempotencyKey);
    if (result.replay) {
      response.status(result.responseCode);
      response.setHeader("x-idempotent-replay", "true");
    }

    return result.body;
  }

  @Post("offers/:offerId/reject")
  @HttpCode(200)
  async rejectOffer(
    @Param("offerId") offerId: string,
    @Headers("x-idempotency-key") idempotencyKey: string,
    @RequestUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.driverService.rejectOffer(offerId, user.id, idempotencyKey);
    if (result.replay) {
      response.status(result.responseCode);
      response.setHeader("x-idempotent-replay", "true");
    }

    return result.body;
  }

  @Get("jobs/current")
  async getCurrentJob(@RequestUser() user: AuthenticatedUser) {
    return this.driverService.getCurrentJob(user.id);
  }

  @Get("jobs/history")
  async listJobHistory(
    @RequestUser() user: AuthenticatedUser,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.driverService.listJobHistory(user.id, Number(page ?? "1"), Number(limit ?? "20"));
  }

  @Post("jobs/:jobId/en-route-pickup")
  @HttpCode(200)
  async transitionToEnRoutePickup(
    @Param("jobId") jobId: string,
    @Headers("x-idempotency-key") idempotencyKey: string,
    @RequestUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.driverService.transitionToEnRoutePickup(jobId, user.id, idempotencyKey);
    if (result.replay) {
      response.status(result.responseCode);
      response.setHeader("x-idempotent-replay", "true");
    }

    return result.body;
  }

  @Post("jobs/:jobId/picked-up")
  @HttpCode(200)
  async transitionToPickedUp(
    @Param("jobId") jobId: string,
    @Headers("x-idempotency-key") idempotencyKey: string,
    @RequestUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.driverService.transitionToPickedUp(jobId, user.id, idempotencyKey);
    if (result.replay) {
      response.status(result.responseCode);
      response.setHeader("x-idempotent-replay", "true");
    }

    return result.body;
  }

  @Post("jobs/:jobId/en-route-drop")
  @HttpCode(200)
  async transitionToEnRouteDrop(
    @Param("jobId") jobId: string,
    @Headers("x-idempotency-key") idempotencyKey: string,
    @RequestUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.driverService.transitionToEnRouteDrop(jobId, user.id, idempotencyKey);
    if (result.replay) {
      response.status(result.responseCode);
      response.setHeader("x-idempotent-replay", "true");
    }

    return result.body;
  }

  @Post("jobs/:jobId/delivered")
  @HttpCode(200)
  async transitionToDelivered(
    @Param("jobId") jobId: string,
    @Headers("x-idempotency-key") idempotencyKey: string,
    @RequestUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.driverService.transitionToDelivered(jobId, user.id, idempotencyKey);
    if (result.replay) {
      response.status(result.responseCode);
      response.setHeader("x-idempotent-replay", "true");
    }

    return result.body;
  }

  @Post("jobs/:jobId/proof-of-delivery/upload-url")
  @HttpCode(200)
  async createProofOfDeliveryUploadUrl(
    @Param("jobId") jobId: string,
    @Headers("x-idempotency-key") idempotencyKey: string,
    @RequestUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.driverService.createProofOfDeliveryUploadUrl(jobId, user.id, idempotencyKey);
    if (result.replay) {
      response.status(result.responseCode);
      response.setHeader("x-idempotent-replay", "true");
    }

    return result.body;
  }

  @Post("jobs/:jobId/proof-of-delivery")
  @HttpCode(201)
  async createProofOfDelivery(
    @Param("jobId") jobId: string,
    @Body() body: unknown,
    @Headers("x-idempotency-key") idempotencyKey: string,
    @RequestUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.driverService.createProofOfDelivery(jobId, body, user.id, idempotencyKey);
    if (result.replay) {
      response.status(result.responseCode);
      response.setHeader("x-idempotent-replay", "true");
    }

    return result.body;
  }
}
