import { describe, expect, it } from "vitest";
import {
  canOpenOrgConsole,
  formatAdminShortId,
  formatInterventionSeverityLabel,
  formatOutboxEventLabel,
  getAdminCommandState,
  getOutboxTone
} from "./admin-state";

describe("admin-state", () => {
  it("formats intervention and outbox labels", () => {
    expect(formatInterventionSeverityLabel("danger")).toBe("Blocker");
    expect(formatOutboxEventLabel("PAYMENT_CAPTURE_REQUESTED")).toBe("Payment capture requested");
    expect(formatAdminShortId("1234567890abcdef")).toBe("12345678");
  });

  it("derives command state from intervention and readiness", () => {
    expect(
      getAdminCommandState({
        interventionQueue: [{ id: "1" }],
        activeJobs: [],
        recentOrders: [],
        health: {
          liveness: { status: "ok", service: "api" },
          readiness: { status: "ok", service: "api", message: null },
          outboxBacklogCount: 0,
          outboxRetryingCount: 0,
          outboxFailedCount: 0,
          paymentCapturePendingCount: 0,
          notificationIssueCount: 0
        }
      } as never).title
    ).toBe("Review required");

    expect(
      getAdminCommandState({
        interventionQueue: [],
        activeJobs: [],
        recentOrders: [],
        health: {
          liveness: { status: "ok", service: "api" },
          readiness: { status: "error", service: "api", message: "schema_compatibility_not_ready" },
          outboxBacklogCount: 0,
          outboxRetryingCount: 0,
          outboxFailedCount: 0,
          paymentCapturePendingCount: 0,
          notificationIssueCount: 0
        }
      } as never).tone
    ).toBe("danger");
  });

  it("checks whether the signed-in user can open the org console safely", () => {
    const session = {
      context: {
        currentOrg: { id: "org-1" },
        memberships: [{ org: { id: "org-2" } }]
      }
    } as never;

    expect(canOpenOrgConsole(session, "org-1")).toBe(true);
    expect(canOpenOrgConsole(session, "org-2")).toBe(true);
    expect(canOpenOrgConsole(session, "org-3")).toBe(false);
  });

  it("marks failed outbox rows as danger", () => {
    expect(
      getOutboxTone({
        id: "1",
        aggregateType: "job",
        aggregateId: "2",
        eventType: "JOB_DISPATCH_REQUESTED",
        retryCount: 2,
        lastError: "lookup_failed",
        processedAt: null,
        nextAttemptAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      })
    ).toBe("danger");
  });
});
