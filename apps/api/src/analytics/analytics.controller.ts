import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service.js";
import { PlatformAdminGuard } from "../security/platform-admin.guard.js";
import { Public } from "../security/public.decorator.js";

@Controller("v1/analytics")
export class PublicAnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Public()
  @Post("events")
  createEvent(@Body() body: unknown, @Req() request: unknown) {
    return this.analytics.createPublicEvent(body, request as never);
  }
}

@UseGuards(PlatformAdminGuard)
@Controller("v1/admin/analytics")
export class AdminAnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("summary")
  getSummary(@Query() query: Record<string, string | undefined>) {
    return this.analytics.getAdminSummary(query);
  }
}
