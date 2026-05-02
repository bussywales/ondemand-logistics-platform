import { isUnauthorizedApiError } from "./api";
import type { BusinessNotification } from "./product-state";

export const NOTIFICATIONS_AUTH_EXPIRED_MESSAGE = "Session expired. Sign in again to view notifications.";

export type NotificationsLoadResult = {
  items: BusinessNotification[];
  error: string | null;
  authExpired: boolean;
  shouldPoll: boolean;
};

export function resolveNotificationsLoadSuccess(items: BusinessNotification[]): NotificationsLoadResult {
  return {
    items,
    error: null,
    authExpired: false,
    shouldPoll: true
  };
}

export function resolveNotificationsLoadFailure(
  error: unknown,
  fallbackMessage = "Unable to load notifications."
): NotificationsLoadResult {
  if (isUnauthorizedApiError(error)) {
    return {
      items: [],
      error: NOTIFICATIONS_AUTH_EXPIRED_MESSAGE,
      authExpired: true,
      shouldPoll: false
    };
  }

  return {
    items: [],
    error: error instanceof Error ? error.message : fallbackMessage,
    authExpired: false,
    shouldPoll: true
  };
}
