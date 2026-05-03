import { describe, expect, it } from "vitest";
import { buildOperationalIncidentSummary } from "./incident-intelligence.service.js";

const baseInput = {
  jobId: "33333333-3333-4333-8333-333333333333",
  orderId: "11111111-1111-4111-8111-111111111111",
  paymentId: "22222222-2222-4222-8222-222222222222",
  customerName: "Ada Customer",
  restaurantName: "Pilot Kitchen",
  jobStatus: "REQUESTED" as const,
  orderStatus: "PAYMENT_AUTHORIZED" as const,
  paymentStatus: "AUTHORIZED" as const,
  assignedDriverId: null,
  assignedDriverName: null,
  jobCreatedAt: "2026-05-03T08:00:00.000Z",
  jobUpdatedAt: "2026-05-03T08:00:00.000Z",
  dispatchFailedAt: null,
  dispatchAttemptsCount: 1,
  lastTimelineEventType: "JOB_REQUESTED",
  lastTimelineEventAt: "2026-05-03T08:00:00.000Z",
  stageAnchorAt: "2026-05-03T08:00:00.000Z"
};

describe("buildOperationalIncidentSummary", () => {
  it("creates a delay incident for a requested job over threshold", () => {
    const incident = buildOperationalIncidentSummary(baseInput, new Date("2026-05-03T08:20:00.000Z"));

    expect(incident).not.toBeNull();
    expect(incident?.incidentType).toBe("PAYMENT_AUTHORIZED_DELIVERY_BLOCKED");
    expect(incident?.elapsedMinutes).toBe(20);
  });

  it("creates a delay incident for assigned but not moving", () => {
    const incident = buildOperationalIncidentSummary(
      {
        ...baseInput,
        jobStatus: "ASSIGNED",
        assignedDriverId: "44444444-4444-4444-8444-444444444444",
        assignedDriverName: "Driver One",
        lastTimelineEventType: "JOB_ASSIGNED",
        lastTimelineEventAt: "2026-05-03T08:00:00.000Z"
      },
      new Date("2026-05-03T08:25:00.000Z")
    );

    expect(incident?.incidentType).toBe("ASSIGNED_STALE");
    expect(incident?.communicationDrafts.driverDraft).toContain("Please confirm");
  });

  it("creates a delay incident for picked up but not progressing", () => {
    const incident = buildOperationalIncidentSummary(
      {
        ...baseInput,
        jobStatus: "PICKED_UP",
        assignedDriverId: "44444444-4444-4444-8444-444444444444",
        assignedDriverName: "Driver One",
        stageAnchorAt: "2026-05-03T08:00:00.000Z",
        lastTimelineEventType: "JOB_PICKED_UP",
        lastTimelineEventAt: "2026-05-03T08:00:00.000Z"
      },
      new Date("2026-05-03T08:40:00.000Z")
    );

    expect(incident?.incidentType).toBe("PICKED_UP_STALE");
    expect(incident?.severity).toBe("warning");
  });

  it("treats dispatch failed as a critical incident", () => {
    const incident = buildOperationalIncidentSummary(
      {
        ...baseInput,
        jobStatus: "DISPATCH_FAILED",
        dispatchFailedAt: "2026-05-03T08:10:00.000Z",
        stageAnchorAt: "2026-05-03T08:10:00.000Z"
      },
      new Date("2026-05-03T08:12:00.000Z")
    );

    expect(incident?.incidentType).toBe("DISPATCH_FAILED_UNRESOLVED");
    expect(incident?.severity).toBe("critical");
  });

  it("returns draft suggestions without implying send automation", () => {
    const incident = buildOperationalIncidentSummary(baseInput, new Date("2026-05-03T08:20:00.000Z"));

    expect(incident?.communicationDrafts.customerDraft).toContain("We are reviewing");
    expect(incident?.communicationDrafts.customerDraft).not.toContain("sent automatically");
    expect(incident?.communicationDrafts.restaurantDraft).toContain("Please hold");
  });
});
