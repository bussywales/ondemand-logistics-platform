import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { RequestUser } from "../security/request-user.decorator.js";
import type { AuthenticatedUser } from "../security/types.js";
import { PlatformAdminGuard } from "../security/platform-admin.guard.js";
import { ReportsService } from "./reports.service.js";

@Controller("v1/business/reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("end-of-day")
  getEndOfDayReport(
    @RequestUser() user: AuthenticatedUser,
    @Query("date") date?: string
  ) {
    return this.reportsService.getBusinessEndOfDayReport(user.id, date);
  }
}

@UseGuards(PlatformAdminGuard)
@Controller("v1/admin/reports")
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("end-of-day")
  getEndOfDayReport(@Query("date") date?: string) {
    return this.reportsService.getAdminEndOfDayReport(date);
  }
}
