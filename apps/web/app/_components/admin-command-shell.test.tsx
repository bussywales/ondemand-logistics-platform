import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminCommandView } from "./admin-command-shell";
import type { BusinessSession, DailyBriefing, DemoRequest, EndOfDayReport, PilotWorkspace, SupportEscalation } from "../_lib/product-state";

const session: BusinessSession = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  expiresAt: 123,
  userId: "user-1",
  email: "admin@example.com",
  context: {
    userId: "user-1",
    email: "admin@example.com",
    displayName: "Platform Admin",
    platformAdmin: true,
    onboarded: true,
    currentOrg: {
      id: "org-1",
      name: "Pilot Org",
      contactName: null,
      contactEmail: null,
      contactPhone: null,
      city: null,
      createdByUserId: "user-1",
      createdAt: new Date().toISOString()
    },
    memberships: [
      {
        membership: {
          id: "membership-1",
          orgId: "org-1",
          userId: "user-1",
          role: "ADMIN",
          isActive: true,
          createdAt: new Date().toISOString()
        },
        org: {
          id: "org-1",
          name: "Pilot Org",
          contactName: null,
          contactEmail: null,
          contactPhone: null,
          city: null,
          createdByUserId: "user-1",
          createdAt: new Date().toISOString()
        }
      }
    ]
  }
};

const briefing: DailyBriefing = {
  scope: "admin",
  generatedAt: "2026-05-04T08:00:00.000Z",
  headline: "2 items need attention before service",
  summary: "Review dispatch, payment, and delivery exceptions before expanding service volume.",
  attentionCount: 2,
  criticalItems: [
    {
      id: "dispatch_failed:order-1",
      category: "dispatch_failed",
      severity: "danger",
      title: "Dispatch failed",
      summary: "Pilot Kitchen order for Ada Customer is still waiting for a courier.",
      reason: "No eligible driver accepted the latest dispatch attempt.",
      entityType: "job",
      entityId: "job-1",
      orderId: "order-1",
      jobId: "job-1",
      paymentId: "payment-1",
      orgId: "org-1",
      orgName: "Pilot Org",
      restaurantName: "Pilot Kitchen",
      customerName: "Ada Customer",
      orderStatus: "PAYMENT_AUTHORIZED",
      jobStatus: "DISPATCH_FAILED",
      paymentStatus: "AUTHORIZED",
      detectedAt: "2026-05-04T07:42:00.000Z",
      ageMinutes: 18,
      href: "/app/jobs/job-1",
      recoverySuggestion: {
        jobId: "job-1",
        orderId: "order-1",
        issueType: "DISPATCH_FAILED",
        recommendedAction: "RETRY_DISPATCH",
        explanation: "Retry dispatch first: no open driver offer is active.",
        evidence: {
          currentJobStatus: "DISPATCH_FAILED",
          paymentStatus: "AUTHORIZED",
          offerCount: 0,
          latestOfferStatus: null,
          eligibleDriverCount: 0,
          ageMinutes: 18
        },
        links: {
          jobHref: "/app/jobs/job-1",
          orderHref: "/app/orders/order-1",
          paymentsHref: null
        },
        advisory: "Human approval is required for all recovery actions."
      },
      incidentSummary: {
        incidentType: "DISPATCH_FAILED_UNRESOLVED",
        severity: "critical",
        jobId: "job-1",
        orderId: "order-1",
        title: "Dispatch failed and remains unresolved",
        summary: "Pilot Kitchen order for Ada Customer is still blocked after dispatch failed.",
        likelyCause: "No courier accepted or completed the latest dispatch path.",
        currentState: "The job is in DISPATCH_FAILED and no active courier movement is recorded.",
        elapsedMinutes: 18,
        evidence: {
          currentJobStatus: "DISPATCH_FAILED",
          currentOrderStatus: "PAYMENT_AUTHORIZED",
          currentPaymentStatus: "AUTHORIZED",
          assignedDriverName: null,
          lastTimelineEventType: "JOB_DISPATCH_FAILED",
          lastTimelineEventAt: "2026-05-04T07:42:00.000Z",
          dispatchAttemptsCount: 1
        },
        recommendedNextAction: "Open the job and review dispatch recovery guidance.",
        links: {
          jobHref: "/app/jobs/job-1",
          orderHref: "/app/orders/order-1",
          paymentsHref: "/app/payments"
        },
        communicationDrafts: {
          customerDraft: "We are checking your delivery and will update you shortly.",
          restaurantDraft: "We are reviewing the delivery block.",
          driverDraft: null
        }
      }
    },
    {
      id: "payment_failed:order-2",
      category: "payment_failed",
      severity: "warning",
      title: "Payment failed",
      summary: "Second Org order needs payment review.",
      reason: "Payment authorization failed before dispatch could continue.",
      entityType: "order",
      entityId: "order-2",
      orderId: "order-2",
      jobId: "job-2",
      paymentId: "payment-2",
      orgId: "org-2",
      orgName: "Second Org",
      restaurantName: "Night Kitchen",
      customerName: "Ben Customer",
      orderStatus: "PAYMENT_FAILED",
      jobStatus: "REQUESTED",
      paymentStatus: "FAILED",
      detectedAt: "2026-05-04T07:55:00.000Z",
      ageMinutes: 5,
      href: "/app/orders/order-2"
    }
  ],
  operatingState: {
    ordersToday: 6,
    activeJobs: 2,
    fulfilledOrders: 2,
    paymentRisks: 2,
    openSupportEscalations: 1,
    highCriticalSupportEscalations: 1,
    oldestOpenSupportEscalationAgeMinutes: 10,
    availableDrivers: null
  },
  recommendations: [],
  guidance: "This briefing is based on current ShipWright operational signals. Human approval is required for all recovery actions."
};

const report: EndOfDayReport = {
  scope: "admin",
  date: "2026-05-04",
  generatedAt: "2026-05-04T08:10:00.000Z",
  headline: "12 orders completed, 2 items need follow-up",
  summary: "Dispatch, payment, delay, and payout signals are summarised here for closeout review.",
  unresolvedCount: 2,
  operatingSummary: {
    ordersReceived: 12,
    fulfilledOrders: 10,
    activeOrUnresolvedOrders: 2,
    cancelledOrPaymentFailedOrders: 1,
    activeJobs: 1,
    deliveredJobs: 10,
    dispatchFailures: 1,
    staleOrDelayedJobs: 1
  },
  paymentsSummary: {
    authorized: 1,
    captured: 10,
    failed: 1,
    deliveredNotCaptured: 1,
    payoutReviewCount: 1
  },
  incidentsSummary: {
    dispatchFailed: 1,
    delayIncidents: 1,
    paymentRisks: 2,
    driverFollowUpIncidents: 0,
    openSupportEscalations: 1,
    highCriticalSupportEscalations: 1,
    supportClosedToday: 0,
    unresolvedRecommendations: 2
  },
  unresolvedActions: [
    {
      id: "action-1",
      type: "RETRY_DISPATCH",
      severity: "danger",
      label: "Retry dispatch",
      summary: "A delivery remains unresolved after dispatch failed.",
      href: "/app/jobs/job-1",
      entityType: "job",
      entityId: "job-1",
      orderId: "order-1",
      jobId: "job-1",
      paymentId: "payment-1"
    }
  ],
  evidenceLinks: [],
  guidance:
    "This report summarises operational signals. Operators remain responsible for recovery, refunds, cancellations, and customer communications."
};

const supportEscalations: SupportEscalation[] = [
  {
    id: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
    orgId: "org-1",
    orgName: "Pilot Org",
    orderId: "11111111-1111-4111-8111-111111111111",
    jobId: "33333333-3333-4333-8333-333333333333",
    category: "DELIVERY_DELAY",
    status: "OPEN",
    severity: "HIGH",
    title: "Customer delay follow-up",
    note: "Customer needs a human status update.",
    followUpOwner: "Ops lead",
    customerContactRequired: true,
    merchantContactRequired: false,
    courierContactRequired: true,
    resolutionNote: null,
    resolutionAction: null,
    resolutionReason: null,
    resolvedBy: null,
    resolvedAt: null,
    createdBy: "user-1",
    createdAt: "2026-05-04T08:00:00.000Z",
    updatedAt: "2026-05-04T08:00:00.000Z",
    restaurantName: "Pilot Kitchen",
    customerName: "Ada Customer"
  }
];

const pilotWorkspaces: PilotWorkspace[] = [
  {
    id: "4cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
    orgId: "org-1",
    orgName: "Pilot Org",
    mode: "CONTROLLED_PILOT",
    status: "ACTIVE",
    readinessStage: "REHEARSAL_READY",
    pilotOwner: "Ops lead",
    supportOwner: "Support lead",
    courierOwner: "Courier lead",
    paymentOwner: "Finance lead",
    goLiveTargetDate: "2026-05-30",
    notes: "Controlled rehearsal workspace.",
    checklistTotal: 10,
    checklistPassed: 8,
    posture: {
      activeJobs: 1,
      unresolvedSupportEscalations: 1,
      paymentRisks: 1,
      readyCouriers: 1
    },
    createdAt: "2026-05-04T08:00:00.000Z",
    updatedAt: "2026-05-04T08:00:00.000Z"
  }
];

const demoRequests: DemoRequest[] = [
  {
    id: "5cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
    name: "Ada Investor",
    email: "investor@example.com",
    organisation: "Signal Partners",
    role: "Partner",
    interestType: "INVESTOR_PARTNER",
    message: "Requesting an investor walkthrough.",
    source: "landing_page",
    status: "NEW",
    adminNote: null,
    assignedOwner: "Commercial lead",
    nextFollowUpAt: new Date(Date.now() - 60_000).toISOString(),
    followUpPriority: "URGENT",
    lastContactedAt: null,
    closeReason: null,
    reviewedBy: null,
    reviewedAt: null,
    notification: {
      status: "skipped",
      channel: "webhook, email",
      provider: "noop",
      lastAttemptAt: "2026-05-04T07:51:00.000Z",
      lastEventType: "NOTIFY_ADMIN_DEMO_REQUEST_CREATED",
      outboxMessageId: "7cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
      retryCount: 1,
      safeErrorSummary: null
    },
    createdAt: "2026-05-04T07:50:00.000Z",
    updatedAt: "2026-05-04T07:50:00.000Z"
  },
  {
    id: "6cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
    name: "Ops Lead",
    email: "ops@example.com",
    organisation: "Local Ops",
    role: "Operator",
    interestType: "OPERATOR_PLATFORM",
    message: null,
    source: "landing_page",
    status: "QUALIFIED",
    adminNote: "Pilot follow-up needed.",
    assignedOwner: "Pilot owner",
    nextFollowUpAt: new Date().toISOString(),
    followUpPriority: "HIGH",
    lastContactedAt: "2026-05-04T08:00:00.000Z",
    closeReason: null,
    reviewedBy: "user-1",
    reviewedAt: "2026-05-04T08:00:00.000Z",
    notification: {
      status: "sent",
      channel: "webhook",
      provider: null,
      lastAttemptAt: "2026-05-04T08:01:00.000Z",
      lastEventType: "DEMO_REQUEST_CONTACT_RECORDED",
      outboxMessageId: "8cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
      retryCount: 1,
      safeErrorSummary: null
    },
    createdAt: "2026-05-04T07:40:00.000Z",
    updatedAt: "2026-05-04T08:00:00.000Z"
  }
];

describe("AdminCommandView", () => {
  it("renders cross-org command intelligence with human approval note", () => {
    const markup = renderToStaticMarkup(
      <AdminCommandView
        briefing={briefing}
        demoRequests={demoRequests}
        operationalResets={[]}
        pilots={pilotWorkspaces}
        report={report}
        selectedDate="2026-05-04"
        session={session}
        supportEscalations={supportEscalations}
      />
    );

    expect(markup).toContain("2 organisations need attention");
    expect(markup).toContain("Command Intelligence");
    expect(markup).toContain("Pilot Org");
    expect(markup).toContain("Second Org");
    expect(markup).toContain("Platform admins remain responsible for recovery oversight");
    expect(markup).toContain("Draft only — review before sending");
    expect(markup).toContain("Support escalation overview");
    expect(markup).toContain("Support follow-up");
    expect(markup).toContain("1 high severity");
    expect(markup).toContain("Pilot workspaces");
    expect(markup).toContain("Pilot guardrail gaps");
    expect(markup).toContain("Demo request follow-up");
    expect(markup).toContain("New demo requests");
    expect(markup).toContain("Review new commercial interest");
    expect(markup).toContain("Overdue follow-ups");
    expect(markup).toContain("High-priority leads");
    expect(markup).toContain("Notification skipped");
    expect(markup).toContain("Skipped notification delivery is acceptable");
    expect(markup).toContain("Operational reset tools");
    expect(markup).toContain("Customer delay follow-up");
    expect(markup).toContain("href=\"/app/jobs/job-1\"");
  });

  it("does not render unsafe business deep links when org context is unavailable", () => {
    const markup = renderToStaticMarkup(
      <AdminCommandView
        briefing={briefing}
        demoRequests={demoRequests}
        operationalResets={[]}
        pilots={pilotWorkspaces}
        report={report}
        selectedDate="2026-05-04"
        session={session}
        supportEscalations={supportEscalations}
      />
    );

    expect(markup).toContain("Business workspace link unavailable without org context.");
    expect(markup).not.toContain("href=\"/app/orders/order-2\"");
  });

  it("renders a clear state when there are no attention items", () => {
    const clearMarkup = renderToStaticMarkup(
      <AdminCommandView
        briefing={{
          ...briefing,
          attentionCount: 0,
          criticalItems: [],
          summary: "No current dispatch, payment, delivery, or support signals require immediate operator intervention.",
          operatingState: {
            ...briefing.operatingState,
            openSupportEscalations: 0,
            highCriticalSupportEscalations: 0,
            oldestOpenSupportEscalationAgeMinutes: null
          }
        }}
        report={{ ...report, unresolvedCount: 0, incidentsSummary: { ...report.incidentsSummary, dispatchFailed: 0, delayIncidents: 0, paymentRisks: 0, openSupportEscalations: 0, highCriticalSupportEscalations: 0, unresolvedRecommendations: 0 }, unresolvedActions: [] }}
        selectedDate="2026-05-04"
        session={session}
        demoRequests={[]}
        operationalResets={[]}
        pilots={[]}
        supportEscalations={[]}
      />
    );

    expect(clearMarkup).toContain("All monitored operations clear");
    expect(clearMarkup).toContain("No cross-org dispatch, delay, or payment intelligence items need admin review right now.");
  });
});
