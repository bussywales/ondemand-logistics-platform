import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "./constants.js";
import { AuthService } from "./auth.service.js";
import type { AuthenticatedRequest } from "./types.js";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("missing_bearer_token");
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      throw new UnauthorizedException("missing_bearer_token");
    }

    const verified = await this.authService.verifyJwt(token);
    request.user = {
      id: verified.sub,
      token: verified.payload
    };
    request.actorId = verified.sub;

    return true;
  }
}
