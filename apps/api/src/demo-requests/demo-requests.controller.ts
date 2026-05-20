import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PlatformAdminGuard } from "../security/platform-admin.guard.js";
import { Public } from "../security/public.decorator.js";
import { RequestUser } from "../security/request-user.decorator.js";
import type { AuthenticatedUser } from "../security/types.js";
import { DemoRequestsService } from "./demo-requests.service.js";

@Controller("v1/demo-requests")
export class PublicDemoRequestsController {
  constructor(private readonly demoRequests: DemoRequestsService) {}

  @Public()
  @Post()
  createDemoRequest(@Body() body: unknown) {
    return this.demoRequests.createDemoRequest(body);
  }
}

@UseGuards(PlatformAdminGuard)
@Controller("v1/admin/demo-requests")
export class AdminDemoRequestsController {
  constructor(private readonly demoRequests: DemoRequestsService) {}

  @Get()
  listDemoRequests(@Query() query: Record<string, string | undefined>) {
    return this.demoRequests.listAdminDemoRequests(query);
  }

  @Patch(":id")
  updateDemoRequest(@RequestUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: unknown) {
    return this.demoRequests.updateAdminDemoRequest(user.id, id, body);
  }

  @Get(":id/events")
  listDemoRequestEvents(@Param("id") id: string) {
    return this.demoRequests.listAdminDemoRequestEvents(id);
  }
}
