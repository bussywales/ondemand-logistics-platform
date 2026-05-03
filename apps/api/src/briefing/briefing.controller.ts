import { Controller, Get } from "@nestjs/common";
import { RequestUser } from "../security/request-user.decorator.js";
import type { AuthenticatedUser } from "../security/types.js";
import { BriefingService } from "./briefing.service.js";

@Controller("v1/business/briefing")
export class BriefingController {
  constructor(private readonly briefingService: BriefingService) {}

  @Get("daily")
  async getDailyBriefing(@RequestUser() user: AuthenticatedUser) {
    return this.briefingService.getBusinessDailyBriefing(user.id);
  }
}
