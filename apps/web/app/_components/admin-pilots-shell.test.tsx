import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PilotRow } from "./admin-pilots-shell";
import type { PilotWorkspace } from "../_lib/product-state";

const pilot: PilotWorkspace = {
  id: "4cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
  orgId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
  orgName: "Pilot Kitchen Org",
  mode: "CONTROLLED_PILOT",
  status: "ACTIVE",
  readinessStage: "REHEARSAL_READY",
  pilotOwner: "Ops lead",
  supportOwner: "Support lead",
  courierOwner: "Courier lead",
  paymentOwner: "Finance lead",
  goLiveTargetDate: "2026-05-30",
  notes: "Controlled rehearsal only.",
  checklistTotal: 10,
  checklistPassed: 8,
  posture: {
    activeJobs: 2,
    unresolvedSupportEscalations: 1,
    paymentRisks: 1,
    readyCouriers: 3
  },
  createdAt: "2026-05-04T08:00:00.000Z",
  updatedAt: "2026-05-04T08:00:00.000Z"
};

describe("PilotRow", () => {
  it("renders pilot readiness and posture without punitive language", () => {
    const markup = renderToStaticMarkup(<PilotRow active={false} onSelect={vi.fn()} pilot={pilot} />);

    expect(markup).toContain("Controlled Pilot");
    expect(markup).toContain("Active");
    expect(markup).toContain("8/10 checks clear");
    expect(markup).toContain("2 active jobs");
    expect(markup).toContain("1 support");
    expect(markup).not.toContain("score");
  });
});
