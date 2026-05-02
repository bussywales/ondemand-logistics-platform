import { Controller, Get, UseGuards } from "@nestjs/common";
import { AdminService } from "./admin.service.js";
import { PlatformAdminGuard } from "../security/platform-admin.guard.js";
import { PaymentsService } from "../payments/payments.service.js";

@UseGuards(PlatformAdminGuard)
@Controller("v1/admin")
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly paymentsService: PaymentsService
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

  @Get("outbox")
  async getOutbox() {
    return {
      items: await this.adminService.listOutbox()
    };
  }
}
