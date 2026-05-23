import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PlatformAdminGuard } from "../security/platform-admin.guard.js";
import { RequestUser } from "../security/request-user.decorator.js";
import type { AuthenticatedUser } from "../security/types.js";
import { IdentityService } from "./identity.service.js";

@UseGuards(PlatformAdminGuard)
@Controller("v1/admin")
export class AdminIdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Get("users")
  listUsers(@Query("search") search?: string) {
    return this.identity.listAdminUsers(search);
  }

  @Patch("users/:userId/status")
  updateUserStatus(@Param("userId") userId: string, @Body() body: unknown, @RequestUser() user: AuthenticatedUser) {
    return this.identity.updateAdminUserStatus(userId, body, user);
  }

  @Post("users/:userId/impersonation-preview")
  previewImpersonation(@Param("userId") userId: string, @RequestUser() user: AuthenticatedUser) {
    return this.identity.previewImpersonation(userId, user);
  }

  @Get("orgs")
  listOrgs(@Query("search") search?: string) {
    return this.identity.listAdminOrgs(search);
  }

  @Get("governance")
  getGovernanceSummary() {
    return this.identity.getAdminGovernanceSummary();
  }

  @Patch("orgs/:orgId/status")
  updateOrgStatus(@Param("orgId") orgId: string, @Body() body: unknown, @RequestUser() user: AuthenticatedUser) {
    return this.identity.updateAdminOrgStatus(orgId, body, user);
  }

  @Get("orgs/:orgId/members")
  getOrgMembers(@Param("orgId") orgId: string) {
    return this.identity.getAdminOrgMembers(orgId);
  }

  @Patch("orgs/:orgId/members/:membershipId")
  updateOrgMember(
    @Param("orgId") orgId: string,
    @Param("membershipId") membershipId: string,
    @Body() body: unknown,
    @RequestUser() user: AuthenticatedUser
  ) {
    return this.identity.updateAdminMembership(orgId, membershipId, body, user);
  }

  @Post("orgs/:orgId/invites/:inviteId/resend")
  resendOrgInvite(
    @Param("orgId") orgId: string,
    @Param("inviteId") inviteId: string,
    @RequestUser() user: AuthenticatedUser
  ) {
    return this.identity.resendAdminInvite(orgId, inviteId, user);
  }

  @Post("orgs/:orgId/invites/:inviteId/cancel")
  cancelOrgInvite(
    @Param("orgId") orgId: string,
    @Param("inviteId") inviteId: string,
    @RequestUser() user: AuthenticatedUser
  ) {
    return this.identity.cancelAdminInvite(orgId, inviteId, user);
  }
}

@Controller("v1/business/team")
export class BusinessTeamController {
  constructor(private readonly identity: IdentityService) {}

  @Get()
  getTeam(@RequestUser() user: AuthenticatedUser) {
    return this.identity.getBusinessTeam(user);
  }

  @Post("invites")
  createInvite(@Body() body: unknown, @RequestUser() user: AuthenticatedUser) {
    return this.identity.createBusinessInvite(body, user);
  }

  @Post("invites/:inviteId/resend")
  resendInvite(@Param("inviteId") inviteId: string, @RequestUser() user: AuthenticatedUser) {
    return this.identity.resendBusinessInvite(inviteId, user);
  }

  @Post("invites/:inviteId/cancel")
  cancelInvite(@Param("inviteId") inviteId: string, @RequestUser() user: AuthenticatedUser) {
    return this.identity.cancelBusinessInvite(inviteId, user);
  }

  @Patch(":membershipId")
  updateMember(
    @Param("membershipId") membershipId: string,
    @Body() body: unknown,
    @RequestUser() user: AuthenticatedUser
  ) {
    return this.identity.updateBusinessMembership(membershipId, body, user);
  }
}
