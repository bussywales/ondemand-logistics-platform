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
  reviewedBy: null,
  reviewedAt: null,
  createdAt: "2026-05-19T10:00:00.000Z",
  updatedAt: "2026-05-19T10:00:00.000Z"
};

describe("AdminDemoRequestsView", () => {
  it("renders demo request review rows and controls", () => {
    const html = renderToStaticMarkup(
      <AdminDemoRequestsView
        busyId={null}
        counts={{ ALL: 1, NEW: 1 }}
        filter="ALL"
        onFilterChange={vi.fn()}
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
    expect(html).toContain("Save review");
  });

  it("renders an empty state", () => {
    const html = renderToStaticMarkup(
      <AdminDemoRequestsView
        busyId={null}
        counts={{ ALL: 0 }}
        filter="ALL"
        onFilterChange={vi.fn()}
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
});
