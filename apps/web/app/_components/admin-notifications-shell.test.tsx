import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdminNotificationsView } from "./admin-notifications-shell";
import type { NotificationDiagnostics } from "../_lib/product-state";

const diagnostics: NotificationDiagnostics = {
  configuration: {
    emailConfigured: false,
    webhookConfigured: true,
    adminEmailConfigured: false,
    fromEmailConfigured: false
  },
  counts: {
    pending: 1,
    sent: 2,
    skipped: 3,
    failed: 0,
    retrying: 1
  },
  recentEvents: [
    {
      id: "audit:1",
      outboxMessageId: null,
      eventType: "TEST_ADMIN_NOTIFICATION",
      notificationType: "DEMO_REQUEST_CREATED",
      channel: "webhook:not_configured",
      status: "skipped",
      provider: "noop",
      lastAttemptAt: "2026-05-21T10:00:00.000Z",
      retryCount: 0,
      safeErrorSummary: "admin_notification_not_configured",
      createdAt: "2026-05-21T10:00:00.000Z"
    }
  ],
  recentTestEvents: []
};

describe("AdminNotificationsView", () => {
  it("renders diagnostics and notification test controls", () => {
    const html = renderToStaticMarkup(<AdminNotificationsView diagnostics={diagnostics} onTest={vi.fn()} />);

    expect(html).toContain("Notification diagnostics");
    expect(html).toContain("Webhook URL");
    expect(html).toContain("Send test webhook notification");
    expect(html).toContain("Test Admin Notification");
    expect(html).not.toContain("hooks.example");
  });
});
