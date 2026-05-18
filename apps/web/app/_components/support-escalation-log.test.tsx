import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SupportEscalationLog } from "./support-escalation-log";
import type { SupportEscalation } from "../_lib/product-state";

const escalation: SupportEscalation = {
  id: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
  orgId: "07ce83ef-3d05-4f78-9f5f-a21191f2d07e",
  orgName: "Pilot Org",
  orderId: "11111111-1111-4111-8111-111111111111",
  jobId: "33333333-3333-4333-8333-333333333333",
  category: "DELIVERY_DELAY",
  status: "OPEN",
  severity: "HIGH",
  title: "Customer delay follow-up",
  note: "Customer called after the job stopped progressing.",
  followUpOwner: "Ops lead",
  customerContactRequired: true,
  merchantContactRequired: false,
  courierContactRequired: true,
  createdBy: "9d90d9cb-aaed-494e-aebf-d0f02b9618fe",
  createdAt: "2026-05-18T10:00:00.000Z",
  updatedAt: "2026-05-18T10:00:00.000Z",
  restaurantName: "Pilot Kitchen",
  customerName: "Ada Customer"
};

describe("SupportEscalationLog", () => {
  it("renders existing support records with human approval copy", () => {
    const markup = renderToStaticMarkup(
      <SupportEscalationLog
        context="order"
        items={[escalation]}
        onCreate={() => undefined}
        onUpdateStatus={() => undefined}
        orderId={escalation.orderId ?? undefined}
        submitting={false}
      />
    );

    expect(markup).toContain("Support &amp; escalation log");
    expect(markup).toContain("Human approval required");
    expect(markup).toContain("Customer delay follow-up");
    expect(markup).toContain("Customer contact");
  });

  it("renders an empty state and create form", () => {
    const markup = renderToStaticMarkup(
      <SupportEscalationLog context="job" items={[]} jobId="33333333-3333-4333-8333-333333333333" onCreate={() => undefined} onUpdateStatus={() => undefined} submitting={false} />
    );

    expect(markup).toContain("No support notes logged");
    expect(markup).toContain("Add support note");
  });
});
