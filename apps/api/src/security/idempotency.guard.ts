import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IdempotencyHeaderSchema } from "@shipwright/contracts";
import { IS_PUBLIC_KEY } from "./constants.js";
import type { AuthenticatedRequest } from "./types.js";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

@Injectable()
export class IdempotencyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!WRITE_METHODS.has(request.method.toUpperCase())) {
      return true;
    }

    const header = request.headers["x-idempotency-key"];
    const key = Array.isArray(header) ? header[0] : header;
    const parsed = IdempotencyHeaderSchema.safeParse(key);

    if (!parsed.success) {
      throw new BadRequestException({
        message: "invalid_or_missing_idempotency_key",
        issues: parsed.error.issues
      });
    }

    return true;
  }
}
