import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { PlatformAdminGuard } from "../security/platform-admin.guard.js";
import { RequestUser } from "../security/request-user.decorator.js";
import type { AuthenticatedUser } from "../security/types.js";
import { PilotsService } from "./pilots.service.js";

@UseGuards(PlatformAdminGuard)
@Controller("v1/admin/pilots")
export class AdminPilotsController {
  constructor(private readonly pilots: PilotsService) {}

  @Get()
  listPilots() {
    return this.pilots.listAdminPilots();
  }

  @Post()
  createPilot(@Body() body: unknown) {
    return this.pilots.createAdminPilot(body);
  }

  @Patch(":id")
  updatePilot(@Param("id") id: string, @Body() body: unknown) {
    return this.pilots.updateAdminPilot(id, body);
  }

  @Get(":id/checks")
  listPilotChecks(@Param("id") id: string) {
    return this.pilots.listAdminPilotChecks(id);
  }

  @Patch(":id/checks/:checkId")
  updatePilotCheck(
    @RequestUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("checkId") checkId: string,
    @Body() body: unknown
  ) {
    return this.pilots.updateAdminPilotCheck(user.id, id, checkId, body);
  }
}

@Controller("v1/business/pilot-status")
export class BusinessPilotStatusController {
  constructor(private readonly pilots: PilotsService) {}

  @Get()
  getPilotStatus(@RequestUser() user: AuthenticatedUser) {
    return this.pilots.getBusinessPilotStatus(user.id);
  }
}
