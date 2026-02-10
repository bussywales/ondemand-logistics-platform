import { SetMetadata } from "@nestjs/common";
import type { OrgRole } from "@shipwright/contracts";
import { REQUIRED_ROLES_KEY } from "./constants.js";

export const Roles = (...roles: OrgRole[]) => SetMetadata(REQUIRED_ROLES_KEY, roles);
