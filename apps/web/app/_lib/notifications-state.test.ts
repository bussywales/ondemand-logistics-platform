import { describe, expect, it } from "vitest";
import { ApiRequestError } from "./api";
import {
  NOTIFICATIONS_AUTH_EXPIRED_MESSAGE,
  resolveNotificationsLoadFailure,
  resolveNotificationsLoadSuccess
} from "./notifications-state";

describe("notifications-state", () => {
  it("stops polling after a 401 notifications response", () => {
    const result = resolveNotificationsLoadFailure(new ApiRequestError("unauthorized", 401, { message: "unauthorized" }));

    expect(result).toEqual({
      items: [],
      error: NOTIFICATIONS_AUTH_EXPIRED_MESSAGE,
      authExpired: true,
      shouldPoll: false
    });
  });

  it("keeps normal error behavior for non-401 notification failures", () => {
    const result = resolveNotificationsLoadFailure(new Error("Unable to load notifications."));

    expect(result.authExpired).toBe(false);
    expect(result.shouldPoll).toBe(true);
    expect(result.error).toBe("Unable to load notifications.");
  });

  it("keeps polling enabled after a successful notifications fetch", () => {
    const result = resolveNotificationsLoadSuccess([
      {
        id: "job_event:12",
        type: "JOB_DISPATCH_FAILED",
        title: "Dispatch failed",
        message: "No eligible driver accepted this job.",
        severity: "danger",
        entityType: "job",
        entityId: "job-1",
        createdAt: "2026-05-02T12:00:00.000Z",
        read: false
      }
    ]);

    expect(result.authExpired).toBe(false);
    expect(result.shouldPoll).toBe(true);
    expect(result.items).toHaveLength(1);
  });
});
