import { describe, expect, it } from "vitest";
import { productUpdates } from "./product-updates";

describe("product updates content", () => {
  it("keeps seeded updates short and audience-scoped", () => {
    expect(productUpdates.length).toBeGreaterThanOrEqual(7);

    for (const update of productUpdates) {
      expect(update.id.length).toBeGreaterThan(3);
      expect(update.title.length).toBeGreaterThan(3);
      expect(update.summary.length).toBeGreaterThan(12);
      expect(update.audience.length).toBeGreaterThan(0);
      expect(update.summary).not.toMatch(/coming soon|maybe later|placeholder/i);
    }
  });

  it("includes the current key product updates", () => {
    expect(productUpdates.map((update) => update.id)).toEqual(
      expect.arrayContaining([
        "finance-settlement-refund-review",
        "fleet-driver-detail-team-invites",
        "product-analytics-v1",
        "commercial-notification-diagnostics",
        "iam-invite-lifecycle-audit",
        "operational-reset-selection",
        "merchant-menu-rollback",
        "merchant-menu-rollback-prep",
        "admin-menu-history",
        "merchant-menu-audit-history",
        "merchant-menu-availability-reordering",
        "operational-reset-tools",
        "demo-request-follow-up-workflow",
        "demo-request-persistence",
        "fleet-manager-workspace",
        "driver-fleet-organisations-v1",
        "merchant-menu-price-editing",
        "identity-access-management-v1",
        "pilot-workspaces-live",
        "pilot-guardrails-operations",
        "support-escalation-logging",
        "support-escalation-audit-history",
        "admin-command-intelligence-expanded",
        "landing-page-demo-request-path",
        "paid-delivery-loop-proven",
        "business-orders-queue",
        "driver-execution-page",
        "admin-control-plane",
        "persistent-notifications",
        "driver-assignment-picker",
        "help-centre"
      ])
    );
  });
});
