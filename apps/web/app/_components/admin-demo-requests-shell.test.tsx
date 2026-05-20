import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdminDemoRequestsView, getDemoRequestNextAction } from "./admin-demo-requests-shell";
import type { DemoRequest } from "../_lib/product-state";

const request: DemoRequest = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Ada Operator",
  email: "ada@example.com",
  organisation: "Pilot Kitchen",
  role: "Operator",
  interestType: "PILOT_MERCHANT",
  message: "We want a controlled pilot walkthrough.",
  source: "landing_page",
  status: "NEW",
  adminNote: null,
  assignedOwner: null,
  nextFollowUpAt: null,
  followUpPriority: null,
  lastContactedAt: null,
  closeReason: null,
  reviewedBy: null,
  reviewedAt: null,
  notification: {
    status: "skipped",
    channel: "webhook, email",
    provider: "noop",
    lastAttemptAt: "2026-05-19T10:05:00.000Z",
    lastEventType: "NOTIFY_ADMIN_DEMO_REQUEST_CREATED",
    outboxMessageId: "22222222-2222-4222-8222-222222222222",
    retryCount: 1,
    safeErrorSummary: null
  },
  createdAt: "2026-05-19T10:00:00.000Z",
  updatedAt: "2026-05-19T10:00:00.000Z"
};

describe("AdminDemoRequestsView", () => {
  it("renders demo request review rows and controls", () => {
    const html = renderToStaticMarkup(
      <AdminDemoRequestsView
        busyId={null}
        counts={{ ALL: 1, NEW: 1 }}
        eventsBusyId={null}
        eventsByRequestId={{}}
        filter="ALL"
        onFilterChange={vi.fn()}
        onLoadEvents={vi.fn()}
        onUpdate={vi.fn()}
        requests={[request]}
      />
    );

    expect(html).toContain("Review queue");
    expect(html).toContain("Ada Operator");
    expect(html).toContain("ada@example.com");
    expect(html).toContain("Pilot Merchant");
    expect(html).toContain("Next action: Review request");
    expect(html).toContain("Mark Reviewed");
    expect(html).toContain("Save follow-up");
    expect(html).toContain("Assigned owner");
    expect(html).toContain("Next follow-up");
    expect(html).toContain("Notification Skipped / unconfigured");
    expect(html).toContain("Channel: webhook, email");
    expect(html).toContain("Notifications sent");
  });

  it("renders an empty state", () => {
    const html = renderToStaticMarkup(
      <AdminDemoRequestsView
        busyId={null}
        counts={{ ALL: 0 }}
        eventsBusyId={null}
        eventsByRequestId={{}}
        filter="ALL"
        onFilterChange={vi.fn()}
        onLoadEvents={vi.fn()}
        onUpdate={vi.fn()}
        requests={[]}
      />
    );

    expect(html).toContain("No demo requests in this view");
    expect(html).toContain("Public demo requests submitted through");
  });

  it("maps demo request statuses to next actions", () => {
    expect(getDemoRequestNextAction("NEW")).toBe("Review request");
    expect(getDemoRequestNextAction("REVIEWED")).toBe("Contact requester");
    expect(getDemoRequestNextAction("CONTACTED")).toBe("Qualify opportunity");
    expect(getDemoRequestNextAction("QUALIFIED")).toBe("Prepare pilot/investor follow-up");
    expect(getDemoRequestNextAction("CLOSED")).toBe("No action");
    expect(getDemoRequestNextAction("SPAM")).toBe("No action");
  });

  it("renders follow-up queue summary counts", () => {
    const html = renderToStaticMarkup(
      <AdminDemoRequestsView
        busyId={null}
        counts={{ ALL: 1, NEW: 1 }}
        eventsBusyId={null}
        eventsByRequestId={{}}
        filter="ALL"
        onFilterChange={vi.fn()}
        onLoadEvents={vi.fn()}
        onUpdate={vi.fn()}
        requests={[
          {
            ...request,
            followUpPriority: "HIGH",
            nextFollowUpAt: "2026-05-19T09:00:00.000Z"
          }
        ]}
      />
    );

    expect(html).toContain("High priority");
    expect(html).toContain("Due today");
  });
});
