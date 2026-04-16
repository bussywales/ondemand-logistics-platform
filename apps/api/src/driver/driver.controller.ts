import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
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
}
