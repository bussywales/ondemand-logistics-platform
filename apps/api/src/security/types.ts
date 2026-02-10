import type { Request } from "express";

export type AuthenticatedUser = {
  id: string;
  token: Record<string, unknown>;
};

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
  actorId?: string;
};
