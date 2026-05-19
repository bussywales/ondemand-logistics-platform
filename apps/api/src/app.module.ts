import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { HealthController } from "./health.controller.js";
import { PgService } from "./database/pg.service.js";
import { SchemaReadinessService } from "./database/schema-readiness.service.js";
import { JwtAuthGuard } from "./security/jwt-auth.guard.js";
import { AuthService } from "./security/auth.service.js";
import { RbacGuard } from "./security/rbac.guard.js";
import { IdempotencyGuard } from "./security/idempotency.guard.js";
import { FoundationsController } from "./foundations/foundations.controller.js";
import { FoundationsService } from "./foundations/foundations.service.js";
import { QuotesController } from "./quotes/quotes.controller.js";
import { QuotesService } from "./quotes/quotes.service.js";
import { JobsController } from "./jobs/jobs.controller.js";
import { JobsService } from "./jobs/jobs.service.js";
import { DriverController } from "./driver/driver.controller.js";
import { DriverService } from "./driver/driver.service.js";
import { PaymentsController } from "./payments/payments.controller.js";
import { PaymentsService } from "./payments/payments.service.js";
import { BusinessController } from "./business/business.controller.js";
import { BusinessService } from "./business/business.service.js";
import {
  BusinessOrdersController,
  PublicOrderTrackingController,
  PublicRestaurantsController,
  RestaurantsController
} from "./restaurants/restaurants.controller.js";
import { RestaurantsService } from "./restaurants/restaurants.service.js";
import { NotificationsController } from "./notifications/notifications.controller.js";
import { NotificationsService } from "./notifications/notifications.service.js";
import { PlatformAdminService } from "./security/platform-admin.service.js";
import { PlatformAdminGuard } from "./security/platform-admin.guard.js";
import { AdminController } from "./admin/admin.controller.js";
import { AdminService } from "./admin/admin.service.js";
import { BriefingController } from "./briefing/briefing.controller.js";
import { BriefingService } from "./briefing/briefing.service.js";
import { DispatchRecoveryService } from "./briefing/dispatch-recovery.service.js";
import { IncidentIntelligenceService } from "./briefing/incident-intelligence.service.js";
import { AdminReportsController, ReportsController } from "./reports/reports.controller.js";
import { ReportsService } from "./reports/reports.service.js";
import {
  AdminSupportEscalationsController,
  BusinessSupportEscalationsController
} from "./support/support-escalations.controller.js";
import { SupportEscalationsService } from "./support/support-escalations.service.js";
import { AdminPilotsController, BusinessPilotStatusController } from "./pilots/pilots.controller.js";
import { PilotsService } from "./pilots/pilots.service.js";
import { AdminIdentityController, BusinessTeamController } from "./identity/identity.controller.js";
import { IdentityService } from "./identity/identity.service.js";
import { AdminFleetsController, FleetController } from "./fleets/fleets.controller.js";
import { FleetsService } from "./fleets/fleets.service.js";
import { AdminDemoRequestsController, PublicDemoRequestsController } from "./demo-requests/demo-requests.controller.js";
import { DemoRequestsService } from "./demo-requests/demo-requests.service.js";

@Module({
  imports: [],
  controllers: [
    HealthController,
    FoundationsController,
    QuotesController,
    JobsController,
    DriverController,
    PaymentsController,
    BusinessController,
    NotificationsController,
    BriefingController,
    ReportsController,
    AdminReportsController,
    BusinessSupportEscalationsController,
    AdminSupportEscalationsController,
    AdminPilotsController,
    BusinessPilotStatusController,
    AdminIdentityController,
    BusinessTeamController,
    AdminFleetsController,
    FleetController,
    PublicDemoRequestsController,
    AdminDemoRequestsController,
    AdminController,
    BusinessOrdersController,
    RestaurantsController,
    PublicRestaurantsController,
    PublicOrderTrackingController
  ],
  providers: [
    PgService,
    SchemaReadinessService,
    AuthService,
    FoundationsService,
    QuotesService,
    JobsService,
    DriverService,
    PaymentsService,
    BusinessService,
    NotificationsService,
    BriefingService,
    ReportsService,
    SupportEscalationsService,
    PilotsService,
    IdentityService,
    FleetsService,
    DemoRequestsService,
    DispatchRecoveryService,
    IncidentIntelligenceService,
    RestaurantsService,
    PlatformAdminService,
    PlatformAdminGuard,
    AdminService,
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
