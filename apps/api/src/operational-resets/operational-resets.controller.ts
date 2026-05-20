import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { PlatformAdminGuard } from "../security/platform-admin.guard.js";
import { RequestUser } from "../security/request-user.decorator.js";
import type { AuthenticatedUser } from "../security/types.js";
import { OperationalResetsService } from "./operational-resets.service.js";

@UseGuards(PlatformAdminGuard)
@Controller("v1/admin/operational-resets")
export class AdminOperationalResetsController {
  constructor(private readonly operationalResets: OperationalResetsService) {}

  @Get()
  listRuns() {
    return this.operationalResets.listRuns();
  }

  @Post("preview")
  preview(@Body() body: unknown) {
    return this.operationalResets.preview(body);
  }

  @Post()
  execute(@RequestUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.operationalResets.execute(user.id, body);
  }
}
