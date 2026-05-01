import { describe, expect, it } from "vitest";
import {
  canOpenOrgConsole,
  filterAdminInterventions,
  filterAdminOutbox,
  limitAdminInterventions,
  formatAdminShortId,
  formatInterventionSeverityLabel,
  formatOutboxEventLabel,
  getAdminCommandState,
  getOutboxBucket,
  getOutboxTone,
  summarizeInterventionDetail,
  summarizeOutboxDetail
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

  it("filters intervention queue by category buckets", () => {
    const items = [
      { id: "1", category: "dispatch_failed" },
      { id: "2", category: "payment_failure" },
      { id: "3", category: "notification_issue" },
      { id: "4", category: "stuck_job" }
    ] as never;

    expect(filterAdminInterventions(items, "all")).toHaveLength(4);
    expect(filterAdminInterventions(items, "dispatch").map((item) => item.id)).toEqual(["1"]);
    expect(filterAdminInterventions(items, "payment").map((item) => item.id)).toEqual(["2"]);
    expect(filterAdminInterventions(items, "notification").map((item) => item.id)).toEqual(["3"]);
    expect(filterAdminInterventions(items, "stuck").map((item) => item.id)).toEqual(["4"]);
  });

  it("filters outbox rows by operational bucket", () => {
    const items = [
      {
        id: "1",
        eventType: "JOB_DISPATCH_REQUESTED",
        lastError: "lookup_failed",
        retryCount: 1,
        processedAt: null
      },
      {
        id: "2",
        eventType: "PAYMENT_CAPTURE_REQUESTED",
        lastError: null,
        retryCount: 2,
        processedAt: null
      },
      {
        id: "3",
        eventType: "NOTIFY_PAYMENT_CAPTURED",
        lastError: null,
        retryCount: 1,
        processedAt: "2026-05-01T11:00:00.000Z"
      },
      {
        id: "4",
        eventType: "JOB_DELIVERED",
        lastError: null,
        retryCount: 0,
        processedAt: "2026-05-01T11:05:00.000Z"
      }
    ] as never;

    expect(getOutboxBucket(items[0])).toBe("failed");
    expect(getOutboxBucket(items[1])).toBe("retrying");
    expect(getOutboxBucket(items[2])).toBe("skipped");
    expect(getOutboxBucket(items[3])).toBe("processed_recent");
    expect(filterAdminOutbox(items, "failed").map((item) => item.id)).toEqual(["1"]);
    expect(filterAdminOutbox(items, "retrying").map((item) => item.id)).toEqual(["2"]);
    expect(filterAdminOutbox(items, "skipped").map((item) => item.id)).toEqual(["3"]);
    expect(filterAdminOutbox(items, "processed_recent").map((item) => item.id)).toEqual(["4"]);
  });

  it("builds actionable detail copy for intervention and outbox rows", () => {
    expect(
      summarizeInterventionDetail({
        category: "payment_capture_pending"
      } as never)
    ).toContain("capture");

    expect(
      summarizeOutboxDetail({
        eventType: "NOTIFY_PAYMENT_CAPTURED",
        lastError: null,
        retryCount: 1,
        processedAt: "2026-05-01T11:00:00.000Z"
      } as never)
    ).toContain("audit");
  });

  it("limits top intervention rows until expanded", () => {
    const items = Array.from({ length: 7 }, (_, index) => ({
      id: String(index + 1),
      category: "dispatch_failed"
    })) as never;

    expect(limitAdminInterventions(items, false).map((item) => item.id)).toEqual(["1", "2", "3", "4", "5"]);
    expect(limitAdminInterventions(items, true)).toHaveLength(7);
  });
});
