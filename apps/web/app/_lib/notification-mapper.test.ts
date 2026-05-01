import { describe, expect, it } from "vitest";
import {
  formatNotificationTimeAgo,
  getNotificationHref,
  groupNotificationsByDate,
  mapNotification
} from "./notification-mapper";
import type { BusinessNotification } from "./product-state";

const baseNotification: BusinessNotification = {
  id: "job_event:12",
  type: "JOB_DISPATCH_FAILED",
  title: "Dispatch failed",
  message: "Fallback message",
  severity: "danger",
  entityType: "job",
  entityId: "04f99ff2-df87-4f8b-aa10-8aef6d675fd4",
  createdAt: "2026-04-29T09:00:00.000Z",
  read: false
};

describe("notification mapper", () => {
  it("maps system event types to operator-friendly copy", () => {
    const mapped = mapNotification(baseNotification, new Date("2026-04-29T09:05:00.000Z"));

    expect(mapped.title).toBe("Dispatch failed");
    expect(mapped.message).toContain("No eligible driver");
    expect(mapped.icon).toBe("alert");
    expect(mapped.href).toBe(`/app/jobs/${baseNotification.entityId}`);
  });

  it("builds order links when notifications target orders", () => {
    expect(
      getNotificationHref({
        ...baseNotification,
        entityType: "order",
        entityId: "3ed1057d-4416-4eee-b05d-8501ce691d59"
      })
    ).toBe("/app/orders/3ed1057d-4416-4eee-b05d-8501ce691d59");
  });

  it("maps business new order notifications to order-focused copy", () => {
    const mapped = mapNotification(
      {
        ...baseNotification,
        id: "outbox:123",
        type: "NOTIFY_BUSINESS_NEW_ORDER",
        title: "New paid order",
        message: "Alex Porter · £41.80 · Pilot Kitchen",
        severity: "success",
        entityType: "order",
        entityId: "3ed1057d-4416-4eee-b05d-8501ce691d59"
      },
      new Date("2026-04-29T09:05:00.000Z")
    );

    expect(mapped.title).toBe("New paid order");
    expect(mapped.message).toBe("Alex Porter · £41.80 · Pilot Kitchen");
    expect(mapped.href).toBe("/app/orders/3ed1057d-4416-4eee-b05d-8501ce691d59");
  });

  it("groups notifications into today and earlier buckets", () => {
    const groups = groupNotificationsByDate(
      [
        baseNotification,
        {
          ...baseNotification,
          id: "payment_event:7",
          type: "PAYMENT_CAPTURED",
          severity: "success",
          createdAt: "2026-04-28T10:00:00.000Z"
        }
      ],
      new Date("2026-04-29T12:00:00.000Z")
    );

    expect(groups).toEqual([
      { label: "Today", items: [baseNotification] },
      {
        label: "Earlier",
        items: [
          {
            ...baseNotification,
            id: "payment_event:7",
            type: "PAYMENT_CAPTURED",
            severity: "success",
            createdAt: "2026-04-28T10:00:00.000Z"
          }
        ]
      }
    ]);
  });

  it("formats relative time for notification timestamps", () => {
    expect(formatNotificationTimeAgo("2026-04-29T11:59:00.000Z", new Date("2026-04-29T12:00:00.000Z"))).toBe(
      "1 minute ago"
    );
  });
});
