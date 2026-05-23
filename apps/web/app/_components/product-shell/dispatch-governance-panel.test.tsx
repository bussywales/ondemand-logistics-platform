import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DispatchGovernancePanel } from "./dispatch-governance-panel";
import type { AppJob, DispatchAuditEvent } from "../../_lib/product-state";

const job: AppJob = {
  id: "11111111-1111-4111-8111-111111111111",
  quoteId: null,
  status: "DISPATCH_FAILED",
  pickupAddress: "12 Exmouth Market",
  dropoffAddress: "184 Upper Street",
  distanceMiles: 4.8,
  etaMinutes: 22,
  vehicleRequired: "BIKE",
  premiumDistanceFlag: false,
  attentionLevel: "BLOCKER",
  attentionReason: "No driver assigned",
  customerTotalCents: 1886,
  driverPayoutGrossCents: 900,
  platformFeeCents: 986,
  pricingVersion: "v1",
  createdAt: "2026-05-23T10:00:00.000Z",
  tracking: {
    latestLocation: null,
    assignedDriverName: null,
    dispatchAttempts: [],
    timeline: []
  },
  payment: {
    id: "22222222-2222-4222-8222-222222222222",
    status: "AUTHORIZED",
    customerTotalCents: 1886,
    platformFeeCents: 986,
    payoutGrossCents: 900,
    amountAuthorizedCents: 1886,
    amountCapturedCents: 0,
    amountRefundedCents: 0,
    currency: "GBP",
    clientSecret: null,
    lastError: null
  },
  recoverySuggestion: null,
  incidentSummary: null
};

const auditEvent: DispatchAuditEvent = {
  id: "1",
  orgId: "33333333-3333-4333-8333-333333333333",
  orgName: "Pilot Org",
  jobId: job.id,
  orderId: null,
  eventType: "DISPATCH_MANUAL_RECOVERY_NOTE",
  overrideType: "MANUAL_RECOVERY_NOTE",
  reason: "Support escalation",
  note: "Operator contacted the fleet manager before retrying dispatch.",
  actorId: "44444444-4444-4444-8444-444444444444",
  actorLabel: "Operator One",
  previousDriverId: null,
  previousDriverName: null,
  previousDriverAffiliation: null,
  newDriverId: "55555555-5555-4555-8555-555555555555",
  newDriverName: "Courier One",
  newDriverAffiliation: {
    courierType: "FLEET_MANAGED_COURIER",
    fleetOrgId: "66666666-6666-4666-8666-666666666666",
    fleetOrgName: "Northside Couriers",
    fleetRole: "DRIVER"
  },
  metadata: { humanReviewed: true },
  createdAt: "2026-05-23T10:05:00.000Z"
};

describe("DispatchGovernancePanel", () => {
  it("renders dispatch governance without punitive language", () => {
    const html = renderToStaticMarkup(
      <DispatchGovernancePanel
        audit={[auditEvent]}
        job={job}
        onCreateOverride={() => undefined}
        submitting={false}
      />
    );

    expect(html).toContain("Dispatch governance");
    expect(html).toContain("Manual review and assignment audit");
    expect(html).toContain("Fleet-managed courier");
    expect(html).toContain("Record human review");
    expect(html).not.toMatch(/score|punitive|suspend/i);
  });
});
