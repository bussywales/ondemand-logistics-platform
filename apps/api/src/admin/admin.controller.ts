import { Controller, Get, UseGuards } from "@nestjs/common";
import { AdminService } from "./admin.service.js";
import { PlatformAdminGuard } from "../security/platform-admin.guard.js";

@UseGuards(PlatformAdminGuard)
@Controller("v1/admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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

  @Get("outbox")
  async getOutbox() {
    return {
      items: await this.adminService.listOutbox()
    };
  }
}
