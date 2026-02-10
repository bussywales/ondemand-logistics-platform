import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { OrgRole } from "@shipwright/contracts";
import { IS_PUBLIC_KEY, REQUIRED_ROLES_KEY } from "./constants.js";
import { PgService } from "../database/pg.service.js";
import type { AuthenticatedRequest } from "./types.js";

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly pg: PgService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<OrgRole[]>(REQUIRED_ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user?.id) {
      throw new ForbiddenException("missing_authenticated_user");
    }

    const orgId = this.extractOrgId(request);
    if (!orgId) {
      throw new ForbiddenException("org_context_required_for_role_check");
    }

    const { rows } = await this.pg.query<{ role: OrgRole }>(
      `select role
       from public.org_memberships
       where org_id = $1
         and user_id = $2
         and is_active = true`,
      [orgId, request.user.id]
    );

    if (!rows.some((row) => requiredRoles.includes(row.role))) {
      throw new ForbiddenException("insufficient_role");
    }

    return true;
  }

  private extractOrgId(request: AuthenticatedRequest): string | undefined {
    const orgHeader = request.headers["x-org-id"];
    if (typeof orgHeader === "string" && orgHeader.length > 0) {
      return orgHeader;
    }

    const body = request.body as Record<string, unknown> | undefined;
    if (body && typeof body.orgId === "string" && body.orgId.length > 0) {
      return body.orgId;
    }

    const params = request.params as Record<string, unknown> | undefined;
    if (params && typeof params.orgId === "string" && params.orgId.length > 0) {
      return params.orgId;
    }

    return undefined;
  }
}
