import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AdminService } from "./admin.service.js";
import { PlatformAdminGuard } from "../security/platform-admin.guard.js";
import { PaymentsService } from "../payments/payments.service.js";
import { BriefingService } from "../briefing/briefing.service.js";
import { RequestUser } from "../security/request-user.decorator.js";
import type { AuthenticatedUser } from "../security/types.js";

@UseGuards(PlatformAdminGuard)
@Controller("v1/admin")
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly paymentsService: PaymentsService,
    private readonly briefingService: BriefingService
  ) {}

  @Get("overview")
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get("jobs")
  async getJobs() {
    return {
      items: await this.adminService.listJobs()
    };
  }

  @Get("orders")
  async getOrders() {
    return {
      items: await this.adminService.listOrders()
    };
  }

  @Get("payments")
  async getPayments() {
    return {
      items: await this.paymentsService.listAdminPayments()
    };
  }

  @Get("drivers/readiness")
  getDriverReadiness() {
    return this.adminService.listDriverReadiness();
  }

  @Get("briefing/daily")
  getDailyBriefing() {
    return this.briefingService.getAdminDailyBriefing();
  }

  @Get("outbox")
  async getOutbox() {
    return {
      items: await this.adminService.listOutbox()
    };
  }

  @Get("notifications/diagnostics")
  getNotificationDiagnostics() {
    return this.adminService.getNotificationDiagnostics();
  }

  @Post("notifications/test")
  createNotificationTest(@Body() body: unknown, @RequestUser() user: AuthenticatedUser) {
    return this.adminService.createNotificationTest(body, user.id);
  }
}
