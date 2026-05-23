import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { PlatformAdminGuard } from "../security/platform-admin.guard.js";
import { RequestUser } from "../security/request-user.decorator.js";
import type { AuthenticatedUser } from "../security/types.js";
import { FleetsService } from "./fleets.service.js";

@UseGuards(PlatformAdminGuard)
@Controller("v1/admin/fleets")
export class AdminFleetsController {
  constructor(private readonly fleets: FleetsService) {}

  @Get()
  listFleets() {
    return this.fleets.listAdminFleets();
  }

  @Post()
  createFleet(@Body() body: unknown, @RequestUser() user: AuthenticatedUser) {
    return this.fleets.createAdminFleet(body, user);
  }

  @Get(":fleetOrgId/drivers")
  listFleetDrivers(@Param("fleetOrgId") fleetOrgId: string) {
    return this.fleets.listAdminFleetDrivers(fleetOrgId);
  }

  @Post(":fleetOrgId/drivers")
  addFleetDriver(
    @Param("fleetOrgId") fleetOrgId: string,
    @Body() body: unknown,
    @RequestUser() user: AuthenticatedUser
  ) {
    return this.fleets.addAdminFleetDriver(fleetOrgId, body, user);
  }

  @Patch(":fleetOrgId/drivers/:membershipId")
  updateFleetDriver(
    @Param("fleetOrgId") fleetOrgId: string,
    @Param("membershipId") membershipId: string,
    @Body() body: unknown,
    @RequestUser() user: AuthenticatedUser
  ) {
    return this.fleets.updateAdminFleetDriver(fleetOrgId, membershipId, body, user);
  }
}

@Controller("v1/fleet")
export class FleetController {
  constructor(private readonly fleets: FleetsService) {}

  @Get("drivers")
  listFleetDrivers(@RequestUser() user: AuthenticatedUser) {
    return this.fleets.listScopedFleetDrivers(user);
  }

  @Get("drivers/:driverId")
  getFleetDriver(@Param("driverId") driverId: string, @RequestUser() user: AuthenticatedUser) {
    return this.fleets.getScopedFleetDriverDetail(user, driverId);
  }

  @Get("readiness")
  getFleetReadiness(@RequestUser() user: AuthenticatedUser) {
    return this.fleets.getScopedFleetReadiness(user);
  }

  @Get("team")
  getFleetTeam(@RequestUser() user: AuthenticatedUser) {
    return this.fleets.getScopedFleetTeam(user);
  }

  @Post("team/invites")
  createFleetInvite(@Body() body: unknown, @RequestUser() user: AuthenticatedUser) {
    return this.fleets.createScopedFleetInvite(user, body);
  }

  @Post("team/invites/:inviteId/resend")
  resendFleetInvite(@Param("inviteId") inviteId: string, @RequestUser() user: AuthenticatedUser) {
    return this.fleets.resendScopedFleetInvite(user, inviteId);
  }

  @Post("team/invites/:inviteId/cancel")
  cancelFleetInvite(@Param("inviteId") inviteId: string, @RequestUser() user: AuthenticatedUser) {
    return this.fleets.cancelScopedFleetInvite(user, inviteId);
  }
}
