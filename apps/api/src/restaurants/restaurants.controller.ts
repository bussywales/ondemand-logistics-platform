import { Body, Controller, Get, HttpCode, Param, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { IdempotencyKey } from "../security/idempotency-key.decorator.js";
import { Public } from "../security/public.decorator.js";
import { RequestUser } from "../security/request-user.decorator.js";
import type { AuthenticatedUser } from "../security/types.js";
import { RestaurantsService } from "./restaurants.service.js";

@Controller("v1/business/restaurants")
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Post()
  @HttpCode(201)
  async createRestaurant(
    @Body() body: unknown,
    @IdempotencyKey() idempotencyKey: string,
    @RequestUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.restaurantsService.createRestaurant(body, user.id, idempotencyKey);
    if (result.replay) {
      response.status(result.responseCode);
      response.setHeader("x-idempotent-replay", "true");
    }

    return result.body;
  }

  @Get()
  async listRestaurants(@RequestUser() user: AuthenticatedUser) {
    return this.restaurantsService.listRestaurants(user.id);
  }

  @Post(":restaurantId/menu-categories")
  @HttpCode(201)
  async createMenuCategory(
    @Param("restaurantId") restaurantId: string,
    @Body() body: unknown,
    @IdempotencyKey() idempotencyKey: string,
    @RequestUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.restaurantsService.createMenuCategory(restaurantId, body, user.id, idempotencyKey);
    if (result.replay) {
      response.status(result.responseCode);
      response.setHeader("x-idempotent-replay", "true");
    }

    return result.body;
  }

  @Post(":restaurantId/menu-items")
  @HttpCode(201)
  async createMenuItem(
    @Param("restaurantId") restaurantId: string,
    @Body() body: unknown,
    @IdempotencyKey() idempotencyKey: string,
    @RequestUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.restaurantsService.createMenuItem(restaurantId, body, user.id, idempotencyKey);
    if (result.replay) {
      response.status(result.responseCode);
      response.setHeader("x-idempotent-replay", "true");
    }

    return result.body;
  }

  @Get(":restaurantId/menu")
  async getRestaurantMenu(@Param("restaurantId") restaurantId: string, @RequestUser() user: AuthenticatedUser) {
    return this.restaurantsService.getRestaurantMenu(restaurantId, user.id);
  }
}

@Controller("v1/restaurants")
export class PublicRestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Public()
  @Get(":slug/menu")
  async getPublicRestaurantMenu(@Param("slug") slug: string) {
    return this.restaurantsService.getPublicRestaurantMenu(slug);
  }
}
