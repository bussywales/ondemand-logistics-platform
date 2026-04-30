import { Controller, Get, Param, Post } from "@nestjs/common";
import { RequestUser } from "../security/request-user.decorator.js";
import type { AuthenticatedUser } from "../security/types.js";
import { NotificationsService } from "./notifications.service.js";

@Controller("v1/business/notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async listBusinessNotifications(@RequestUser() user: AuthenticatedUser) {
    return this.notificationsService.listBusinessNotifications(user.id);
  }

  @Post("read-all")
  async markAllBusinessNotificationsRead(@RequestUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllBusinessNotificationsRead(user.id);
  }

  @Post(":notificationId/read")
  async markBusinessNotificationRead(
    @RequestUser() user: AuthenticatedUser,
    @Param("notificationId") notificationId: string
  ) {
    return this.notificationsService.markBusinessNotificationRead(user.id, decodeURIComponent(notificationId));
  }
}
