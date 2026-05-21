import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdminOperationalResetsView, getOperationalResetModeCopy } from "./admin-operational-resets-shell";
import type { OperationalResetPreview, OperationalResetRun } from "../_lib/product-state";

const preview: OperationalResetPreview = {
  mode: "FULL_DEMO_TIDY",
  scope: "staging_demo",
  reason: "Prepare staging for a controlled demo rehearsal.",
  olderThan: "2026-05-10T00:00:00.000Z",
  summary: {
    affectedCount: 2,
    demoRequests: 1,
    supportEscalations: 1,
    pilotRecommendations: 0,
    proofRecordsUntouched: true,
    message: "2 non-destructive reset actions identified. Proof orders, jobs, payments, and audit evidence are not mutated."
  },
  items: [
    {
      selectionId: "demo_request:11111111-1111-4111-8111-111111111111:close-or-archive-demo-request",
      resourceType: "demo_request",
      resourceId: "11111111-1111-4111-8111-111111111111",
      label: "Demo Lead",
      proposedAction: "Close or archive demo request",
      action: "Close or archive demo request",
      reason: "Request is older than the selected threshold and not qualified.",
      eligible: true,
      warning: null,
      createdAt: "2026-05-01T10:00:00.000Z",
      currentStatus: "CLOSED",
      metadata: {}
    },
    {
      selectionId: "support_escalation:22222222-2222-4222-8222-222222222222:resolve-test-demo-support-escalation",
      resourceType: "support_escalation",
      resourceId: "22222222-2222-4222-8222-222222222222",
      label: "Smoke test support record",
      proposedAction: "Resolve test/demo support escalation",
      action: "Resolve test/demo support escalation",
      reason: "Open support escalation is clearly marked as test, demo, smoke, or staging data.",
      eligible: true,
      warning: null,
      createdAt: "2026-05-01T10:00:00.000Z",
      currentStatus: "OPEN",
      metadata: {}
    }
  ]
};

const run: OperationalResetRun = {
  id: "33333333-3333-4333-8333-333333333333",
  createdBy: "44444444-4444-4444-8444-444444444444",
  scope: "staging_demo",
  mode: "FULL_DEMO_TIDY",
  reason: "Prepare staging for a controlled demo rehearsal.",
  status: "COMPLETED",
  summary: preview.summary,
  createdAt: "2026-05-20T10:00:00.000Z",
  completedAt: "2026-05-20T10:00:00.000Z"
};

describe("AdminOperationalResetsView", () => {
  it("renders preview, safety copy, typed confirmation, and reset history", () => {
    const html = renderToStaticMarkup(
      <AdminOperationalResetsView
        busy={false}
        confirmation="RESET DEMO DATA"
        error={null}
        mode="FULL_DEMO_TIDY"
        olderThan="2026-05-10"
        onClearSelection={vi.fn()}
        onConfirmationChange={vi.fn()}
        onExecute={vi.fn()}
        onModeChange={vi.fn()}
        onOlderThanChange={vi.fn()}
        onPreview={vi.fn()}
        onReasonChange={vi.fn()}
        onSelectAllEligible={vi.fn()}
        onToggleSelection={vi.fn()}
        preview={preview}
        reason="Prepare staging for a controlled demo rehearsal."
        runs={[run]}
        selectedItemIds={preview.items.map((item) => item.selectionId)}
      />
    );

    expect(html).toContain("Prepare staging demos without deleting evidence");
    expect(html).toContain("Hard deletes");
    expect(html).toContain("Proof untouched");
    expect(html).toContain("Demo Lead");
    expect(html).toContain("Smoke test support record");
    expect(html).toContain("2 selected");
    expect(html).toContain("Select all eligible");
    expect(html).toContain("RESET DEMO DATA");
    expect(html).toContain("Latest run");
  });

  it("keeps execute disabled until confirmation and preview exist", () => {
    const html = renderToStaticMarkup(
      <AdminOperationalResetsView
        busy={false}
        confirmation=""
        error={null}
        mode="ARCHIVE_DEMO_REQUESTS"
        olderThan="2026-05-10"
        onClearSelection={vi.fn()}
        onConfirmationChange={vi.fn()}
        onExecute={vi.fn()}
        onModeChange={vi.fn()}
        onOlderThanChange={vi.fn()}
        onPreview={vi.fn()}
        onReasonChange={vi.fn()}
        onSelectAllEligible={vi.fn()}
        onToggleSelection={vi.fn()}
        preview={null}
        reason="Prepare staging for a controlled demo rehearsal."
        runs={[]}
        selectedItemIds={[]}
      />
    );

    expect(html).toContain("No preview yet");
    expect(html).toContain("disabled=\"\"");
  });

  it("describes reset modes without destructive language", () => {
    expect(getOperationalResetModeCopy("FULL_DEMO_TIDY")).toContain("Proof orders, jobs, and payments remain untouched");
    expect(getOperationalResetModeCopy("MARK_STALE_PILOT_REHEARSAL")).toContain("without mutating pilot state");
  });
});
