import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { PlatformAdminGuard } from "../security/platform-admin.guard.js";
import { ValidationEvidenceService } from "./validation-evidence.service.js";

@UseGuards(PlatformAdminGuard)
@Controller("v1/admin/validation-evidence")
export class AdminValidationEvidenceController {
  constructor(private readonly validationEvidence: ValidationEvidenceService) {}

  @Get()
  listEvidence(@Query() query: Record<string, string | undefined>) {
    return this.validationEvidence.listAdminEvidence(query);
  }

  @Get("latest")
  latestEvidence(@Query("environment") environment?: string) {
    return this.validationEvidence.getLatestEvidence(environment?.trim() || "staging");
  }
}
