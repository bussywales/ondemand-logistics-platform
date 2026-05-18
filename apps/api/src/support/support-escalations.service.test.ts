import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { SupportEscalationsService } from "./support-escalations.service.js";

const USER_ID = "9d90d9cb-aaed-494e-aebf-d0f02b9618fe";
const ORG_ID = "07ce83ef-3d05-4f78-9f5f-a21191f2d07e";
const ORDER_ID = "11111111-1111-4111-8111-111111111111";
const JOB_ID = "33333333-3333-4333-8333-333333333333";
const ESCALATION_ID = "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b";

function createEscalationRow(overrides = {}) {
  return {
    id: ESCALATION_ID,
    org_id: ORG_ID,
    org_name: "Pilot Org",
    order_id: ORDER_ID,
    job_id: JOB_ID,
    category: "DELIVERY_DELAY",
    status: "OPEN",
    severity: "HIGH",
    title: "Delay follow-up",
    note: "Customer asked for a status update.",
    follow_up_owner: "Ops lead",
    customer_contact_required: true,
    merchant_contact_required: false,
    courier_contact_required: true,
    created_by: USER_ID,
    created_at: "2026-05-18T10:00:00.000Z",
    updated_at: "2026-05-18T10:00:00.000Z",
    restaurant_name: "Pilot Kitchen",
    customer_name: "Ada Customer",
    ...overrides
  };
}

describe("SupportEscalationsService", () => {
  it("lists business support escalations through org membership scope", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [createEscalationRow()] });
    const service = new SupportEscalationsService({ query } as never);

    const result = await service.listBusinessEscalations(USER_ID, { orderId: ORDER_ID });

    expect(result.items[0]?.title).toBe("Delay follow-up");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("org_memberships"), [
      USER_ID,
      ORDER_ID,
      null,
      null,
      null,
      null
    ]);
  });

  it("lets platform admin list cross-org escalations without business membership scope", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [createEscalationRow()] });
    const service = new SupportEscalationsService({ query } as never);

    const result = await service.listAdminEscalations({ severity: "HIGH" });

    expect(result.items).toHaveLength(1);
    expect(query).toHaveBeenCalledWith(expect.not.stringContaining("m.user_id"), [
      null,
      null,
      null,
      null,
      "HIGH"
    ]);
  });

  it("creates an order-scoped escalation after resolving org membership", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ org_id: ORG_ID, order_id: ORDER_ID, job_id: JOB_ID }] })
      .mockResolvedValueOnce({ rows: [createEscalationRow()] });
    const service = new SupportEscalationsService({ query } as never);

    const created = await service.createBusinessEscalation(USER_ID, {
      orderId: ORDER_ID,
      category: "DELIVERY_DELAY",
      severity: "HIGH",
      title: "Delay follow-up",
      note: "Customer asked for a status update.",
      customerContactRequired: true,
      courierContactRequired: true
    });

    expect(created.orderId).toBe(ORDER_ID);
    expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining("from public.customer_orders"), [ORDER_ID, USER_ID]);
    expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining("insert into public.support_escalations"), expect.arrayContaining([ORG_ID, ORDER_ID, JOB_ID]));
  });

  it("blocks creation when the order is outside the operator org", async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [] });
    const service = new SupportEscalationsService({ query } as never);

    await expect(
      service.createBusinessEscalation(USER_ID, {
        orderId: ORDER_ID,
        category: "CUSTOMER_SUPPORT",
        severity: "MEDIUM",
        title: "Customer support note",
        note: "Customer asked for help."
      })
    ).rejects.toThrow(ForbiddenException);
  });

  it("updates only allowed mutable fields", async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [createEscalationRow({ status: "RESOLVED" })] });
    const service = new SupportEscalationsService({ query } as never);

    const updated = await service.updateBusinessEscalation(USER_ID, ESCALATION_ID, { status: "RESOLVED" });

    expect(updated.status).toBe("RESOLVED");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("update public.support_escalations"), [
      ESCALATION_ID,
      USER_ID,
      "RESOLVED"
    ]);
  });
});
