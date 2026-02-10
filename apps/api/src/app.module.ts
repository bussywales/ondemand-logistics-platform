import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { HealthController } from "./health.controller.js";
import { PgService } from "./database/pg.service.js";
import { JwtAuthGuard } from "./security/jwt-auth.guard.js";
import { AuthService } from "./security/auth.service.js";
import { RbacGuard } from "./security/rbac.guard.js";
import { IdempotencyGuard } from "./security/idempotency.guard.js";
import { FoundationsController } from "./foundations/foundations.controller.js";
import { FoundationsService } from "./foundations/foundations.service.js";

@Module({
  imports: [],
  controllers: [HealthController, FoundationsController],
  providers: [
    PgService,
    AuthService,
    FoundationsService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: RbacGuard
    },
    {
      provide: APP_GUARD,
      useClass: IdempotencyGuard
    }
  ]
})
export class AppModule {}
