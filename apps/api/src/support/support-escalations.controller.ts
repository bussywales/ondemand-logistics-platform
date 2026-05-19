import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PlatformAdminGuard } from "../security/platform-admin.guard.js";
import { RequestUser } from "../security/request-user.decorator.js";
import type { AuthenticatedUser } from "../security/types.js";
import { SupportEscalationsService } from "./support-escalations.service.js";

@Controller("v1/business/support/escalations")
export class BusinessSupportEscalationsController {
  constructor(private readonly supportEscalations: SupportEscalationsService) {}

  @Get()
  listEscalations(@RequestUser() user: AuthenticatedUser, @Query() query: Record<string, string | undefined>) {
    return this.supportEscalations.listBusinessEscalations(user.id, query);
  }

  @Post()
  createEscalation(@RequestUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.supportEscalations.createBusinessEscalation(user.id, body);
  }

  @Get(":id/events")
  listEscalationEvents(@RequestUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.supportEscalations.listBusinessEscalationEvents(user.id, id);
  }

  @Patch(":id")
  updateEscalation(@RequestUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: unknown) {
    return this.supportEscalations.updateBusinessEscalation(user.id, id, body);
  }
}

@UseGuards(PlatformAdminGuard)
@Controller("v1/admin/support/escalations")
export class AdminSupportEscalationsController {
  constructor(private readonly supportEscalations: SupportEscalationsService) {}

  @Get()
  listEscalations(@Query() query: Record<string, string | undefined>) {
    return this.supportEscalations.listAdminEscalations(query);
  }

  @Get(":id/events")
  listEscalationEvents(@Param("id") id: string) {
    return this.supportEscalations.listAdminEscalationEvents(id);
  }
}
