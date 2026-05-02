import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NotificationFeed, NotificationsAuthExpiredState } from "./notifications";
import type { BusinessNotification } from "../_lib/product-state";

const notifications: BusinessNotification[] = [
  {
    id: "job_event:12",
    type: "JOB_DISPATCH_FAILED",
    title: "Dispatch failed",
    message: "No eligible driver accepted this job.",
    severity: "danger",
    entityType: "job",
    entityId: "04f99ff2-df87-4f8b-aa10-8aef6d675fd4",
    createdAt: "2026-04-29T09:00:00.000Z",
    read: false
  },
  {
    id: "payment_event:22",
    type: "PAYMENT_CAPTURED",
    title: "Payment captured",
    message: "Funds were captured successfully.",
    severity: "success",
    entityType: "order",
    entityId: "14f99ff2-df87-4f8b-aa10-8aef6d675fd4",
    createdAt: "2026-04-29T10:00:00.000Z",
    read: true
  },
  {
    id: "outbox:business-order-1",
    type: "NOTIFY_BUSINESS_NEW_ORDER",
    title: "New paid order",
    message: "Alex Porter · £41.80 · Pilot Kitchen",
    severity: "success",
    entityType: "order",
    entityId: "3ed1057d-4416-4eee-b05d-8501ce691d59",
    createdAt: "2026-04-29T10:05:00.000Z",
    read: false
  }
];

describe("NotificationFeed", () => {
  it("renders notification copy safely", () => {
    const markup = renderToStaticMarkup(
      <NotificationFeed
        emptyCopy="Dispatch events will appear here."
        emptyTitle="No notifications"
        items={notifications}
      />
    );

    expect(markup).toContain("Dispatch failed");
    expect(markup).toContain("No eligible driver accepted the job. It needs review.");
    expect(markup).toContain("/app/jobs/04f99ff2-df87-4f8b-aa10-8aef6d675fd4");
    expect(markup).toContain("New paid order");
    expect(markup).toContain("Alex Porter · £41.80 · Pilot Kitchen");
    expect(markup).toContain("/app/orders/3ed1057d-4416-4eee-b05d-8501ce691d59");
    expect(markup).toContain("notifications-item-unread");
    expect(markup).toContain("notifications-item-read");
  });

  it("renders the empty state safely", () => {
    const markup = renderToStaticMarkup(
      <NotificationFeed
        emptyCopy="Dispatch events will appear here."
        emptyTitle="No notifications"
        items={[]}
      />
    );

    expect(markup).toContain("No notifications");
    expect(markup).toContain("Dispatch events will appear here.");
  });

  it("renders the auth-expired state safely", () => {
    const markup = renderToStaticMarkup(<NotificationsAuthExpiredState />);

    expect(markup).toContain("Session expired");
    expect(markup).toContain("Sign in again to view notifications.");
    expect(markup).toContain("/get-started");
  });
});
