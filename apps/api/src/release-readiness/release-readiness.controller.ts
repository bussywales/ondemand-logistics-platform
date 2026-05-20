import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { PlatformAdminGuard } from "../security/platform-admin.guard.js";
import { ValidationEvidenceService } from "../validation-evidence/validation-evidence.service.js";

@UseGuards(PlatformAdminGuard)
@Controller("v1/admin/release-readiness")
export class AdminReleaseReadinessController {
  constructor(private readonly validationEvidence: ValidationEvidenceService) {}

  @Get()
  getReleaseReadiness(@Query() query: { environment?: string; freshnessWindowHours?: string }) {
    return this.validationEvidence.getReleaseReadiness(query);
  }
}
