import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { AuthenticatedRequest } from "./types.js";
import { PlatformAdminService } from "./platform-admin.service.js";

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly platformAdmins: PlatformAdminService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user?.id) {
      throw new ForbiddenException("missing_authenticated_user");
    }

    const isAdmin = await this.platformAdmins.isPlatformAdmin(request.user.id);
    if (!isAdmin) {
      throw new ForbiddenException("platform_admin_required");
    }

    return true;
  }
}
