import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { SupportEscalationsService } from "./support-escalations.service.js";

const USER_ID = "9d90d9cb-aaed-494e-aebf-d0f02b9618fe";
const ORG_ID = "07ce83ef-3d05-4f78-9f5f-a21191f2d07e";
const ORDER_ID = "11111111-1111-4111-8111-111111111111";
const JOB_ID = "33333333-3333-4333-8333-333333333333";
const ESCALATION_ID = "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b";
const EVENT_ID = "44444444-4444-4444-8444-444444444444";

function createPgMock(query: ReturnType<typeof vi.fn>) {
  return {
    query,
    withTransaction: vi.fn((callback) => callback({ query }))
  };
}

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
    resolution_note: null,
    resolution_action: null,
    resolution_reason: null,
    resolved_by: null,
    resolved_at: null,
    created_by: USER_ID,
    created_at: "2026-05-18T10:00:00.000Z",
    updated_at: "2026-05-18T10:00:00.000Z",
    restaurant_name: "Pilot Kitchen",
    customer_name: "Ada Customer",
    ...overrides
  };
}

function createEventRow(overrides = {}) {
  return {
    id: EVENT_ID,
    support_escalation_id: ESCALATION_ID,
    org_id: ORG_ID,
    event_type: "CREATED",
    actor_id: USER_ID,
    actor_label: null,
    previous_status: null,
    new_status: "OPEN",
    note: "Support escalation created.",
    metadata: {},
    created_at: "2026-05-18T10:00:00.000Z",
    ...overrides
  };
}

describe("SupportEscalationsService", () => {
  it("lists business support escalations through org membership scope", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [createEscalationRow()] });
    const service = new SupportEscalationsService(createPgMock(query) as never);

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
    const service = new SupportEscalationsService(createPgMock(query) as never);

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
      .mockResolvedValueOnce({ rows: [{ id: ESCALATION_ID }] })
      .mockResolvedValueOnce({ rows: [createEscalationRow()] })
      .mockResolvedValueOnce({ rows: [] });
    const service = new SupportEscalationsService(createPgMock(query) as never);

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
    expect(query).toHaveBeenNthCalledWith(4, expect.stringContaining("insert into public.support_escalation_events"), expect.arrayContaining([ESCALATION_ID, ORG_ID, "CREATED"]));
  });

  it("blocks creation when the order is outside the operator org", async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [] });
    const service = new SupportEscalationsService(createPgMock(query) as never);

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

  it("updates unresolved status without requiring closeout fields", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [createEscalationRow()] })
      .mockResolvedValueOnce({ rows: [{ id: ESCALATION_ID }] })
      .mockResolvedValueOnce({ rows: [createEscalationRow({ status: "IN_REVIEW" })] })
      .mockResolvedValueOnce({ rows: [] });
    const service = new SupportEscalationsService(createPgMock(query) as never);

    const updated = await service.updateBusinessEscalation(USER_ID, ESCALATION_ID, { status: "IN_REVIEW" });

    expect(updated.status).toBe("IN_REVIEW");
    expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining("update public.support_escalations"), [
      ESCALATION_ID,
      "IN_REVIEW"
    ]);
    expect(query).toHaveBeenNthCalledWith(4, expect.stringContaining("insert into public.support_escalation_events"), expect.arrayContaining([ESCALATION_ID, ORG_ID, "STATUS_CHANGED"]));
  });

  it("requires a resolution note when closing an escalation", async () => {
    const service = new SupportEscalationsService(createPgMock(vi.fn()) as never);

    await expect(service.updateBusinessEscalation(USER_ID, ESCALATION_ID, { status: "RESOLVED" })).rejects.toThrow();
  });

  it("sets closeout metadata when resolving an escalation", async () => {
    const query = vi.fn().mockResolvedValueOnce({
      rows: [createEscalationRow()]
    })
      .mockResolvedValueOnce({ rows: [{ id: ESCALATION_ID }] })
      .mockResolvedValueOnce({
        rows: [
          createEscalationRow({
            status: "RESOLVED",
            resolution_note: "Customer confirmed the delayed delivery was completed.",
            resolution_action: "CUSTOMER_UPDATED",
            resolution_reason: "CUSTOMER_CONFIRMED",
            resolved_by: USER_ID,
            resolved_at: "2026-05-18T11:00:00.000Z"
          })
        ]
      })
      .mockResolvedValueOnce({ rows: [] });
    const service = new SupportEscalationsService(createPgMock(query) as never);

    const updated = await service.updateBusinessEscalation(USER_ID, ESCALATION_ID, {
      status: "RESOLVED",
      resolutionNote: "Customer confirmed the delayed delivery was completed.",
      resolutionAction: "CUSTOMER_UPDATED",
      resolutionReason: "CUSTOMER_CONFIRMED"
    });

    expect(updated.status).toBe("RESOLVED");
    expect(updated.resolutionNote).toBe("Customer confirmed the delayed delivery was completed.");
    expect(updated.resolvedBy).toBe(USER_ID);
    expect(updated.resolvedAt).toBe("2026-05-18T11:00:00.000Z");
    expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining("resolved_at = now()"), [
      ESCALATION_ID,
      "RESOLVED",
      "Customer confirmed the delayed delivery was completed.",
      "CUSTOMER_UPDATED",
      "CUSTOMER_CONFIRMED",
      USER_ID
    ]);
    expect(query).toHaveBeenNthCalledWith(4, expect.stringContaining("insert into public.support_escalation_events"), expect.arrayContaining([ESCALATION_ID, ORG_ID, "RESOLVED"]));
  });

  it("lists business support escalation events through org membership scope", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [createEventRow({ event_type: "STATUS_CHANGED", previous_status: "OPEN", new_status: "IN_REVIEW" })] });
    const service = new SupportEscalationsService(createPgMock(query) as never);

    const result = await service.listBusinessEscalationEvents(USER_ID, ESCALATION_ID);

    expect(result.items[0]?.eventType).toBe("STATUS_CHANGED");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("from public.org_memberships"), [ESCALATION_ID, USER_ID]);
  });

  it("lists admin support escalation events without org membership scope", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [createEventRow()] });
    const service = new SupportEscalationsService(createPgMock(query) as never);

    const result = await service.listAdminEscalationEvents(ESCALATION_ID);

    expect(result.items).toHaveLength(1);
    expect(query).toHaveBeenCalledWith(expect.not.stringContaining("m.user_id"), [ESCALATION_ID]);
  });
});
