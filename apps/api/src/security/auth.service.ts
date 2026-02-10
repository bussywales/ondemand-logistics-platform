import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { readConfig } from "../config.js";

@Injectable()
export class AuthService {
  private readonly config = readConfig();
  private readonly jwks = createRemoteJWKSet(
    new URL(`${this.config.supabaseUrl}/auth/v1/.well-known/jwks.json`)
  );

  async verifyJwt(token: string): Promise<{ sub: string; payload: Record<string, unknown> }> {
    try {
      const result = await jwtVerify(token, this.jwks, {
        issuer: this.config.supabaseJwtIssuer,
        audience: this.config.supabaseJwtAudience
      });

      const subject = result.payload.sub;
      if (!subject) {
        throw new UnauthorizedException("missing_sub_claim");
      }

      return {
        sub: subject,
        payload: result.payload as Record<string, unknown>
      };
    } catch (error) {
      throw new UnauthorizedException({
        message: "invalid_jwt",
        detail: error instanceof Error ? error.message : "unknown_error"
      });
    }
  }
}
