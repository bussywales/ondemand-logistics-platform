import { describe, expect, it, vi } from "vitest";
import { UnprocessableEntityException } from "@nestjs/common";
import { OperationalResetsService } from "./operational-resets.service.js";

const USER_ID = "22222222-2222-4222-8222-222222222222";
const RUN_ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  created_by: USER_ID,
  scope: "staging_demo",
  mode: "FULL_DEMO_TIDY",
  reason: "Prepare staging for a controlled demo rehearsal.",
  status: "COMPLETED",
  summary: {
    affectedCount: 2,
    demoRequests: 1,
    supportEscalations: 1,
    pilotRecommendations: 0,
    proofRecordsUntouched: true,
    message: "2 non-destructive reset actions identified. Proof orders, jobs, payments, and audit evidence are not mutated."
  },
  created_at: "2026-05-20T10:00:00.000Z",
  completed_at: "2026-05-20T10:00:00.000Z"
};

const DEMO_ROW = {
  id: "33333333-3333-4333-8333-333333333333",
  name: "Demo Lead",
  email: "lead@example.com",
  organisation: "Pilot Kitchen",
  status: "CLOSED",
  created_at: "2026-05-01T10:00:00.000Z"
};

const SUPPORT_ROW = {
  id: "44444444-4444-4444-8444-444444444444",
  org_id: "55555555-5555-4555-8555-555555555555",
  title: "Smoke test support record",
  note: "Created during staging demo.",
  status: "OPEN",
  severity: "LOW",
  created_at: "2026-05-01T10:00:00.000Z"
};

describe("OperationalResetsService", () => {
  it("previews safe reset actions without mutating data", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [DEMO_ROW] })
      .mockResolvedValueOnce({ rows: [SUPPORT_ROW] })
      .mockResolvedValueOnce({ rows: [] });
    const service = new OperationalResetsService({ query } as never);

    const result = await service.preview({
      mode: "FULL_DEMO_TIDY",
      scope: "staging_demo",
      reason: "Prepare staging for a controlled demo rehearsal.",
      olderThan: "2026-05-10T00:00:00.000Z"
    });

    expect(result.summary.affectedCount).toBe(2);
    expect(result.summary.proofRecordsUntouched).toBe(true);
    expect(result.items.map((item) => item.resourceType)).toEqual(["demo_request", "support_escalation"]);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        selectionId: `demo_request:${DEMO_ROW.id}:close-or-archive-demo-request`,
        proposedAction: "Close or archive demo request",
        eligible: true,
        currentStatus: "CLOSED",
        createdAt: "2026-05-01T10:00:00.000Z"
      })
    );
    expect(query).not.toHaveBeenCalledWith(expect.stringContaining("update public.demo_requests"), expect.anything());
  });

  it("requires explicit typed confirmation for execute", async () => {
    const service = new OperationalResetsService({ query: vi.fn(), withTransaction: vi.fn() } as never);

    await expect(
      service.execute(USER_ID, {
        mode: "FULL_DEMO_TIDY",
        scope: "staging_demo",
        reason: "Prepare staging for a controlled demo rehearsal.",
        confirmation: "RESET"
      })
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it("executes non-destructive mutations and records reset run/items", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [DEMO_ROW] })
      .mockResolvedValueOnce({ rows: [SUPPORT_ROW] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [RUN_ROW] })
      .mockResolvedValue({ rows: [] });
    const withTransaction = vi.fn((callback) => callback({ query }));
    const service = new OperationalResetsService({ query, withTransaction } as never);

    const result = await service.execute(USER_ID, {
      mode: "FULL_DEMO_TIDY",
      scope: "staging_demo",
      reason: "Prepare staging for a controlled demo rehearsal.",
      olderThan: "2026-05-10T00:00:00.000Z",
      confirmation: "RESET DEMO DATA"
    });

    expect(result.id).toBe(RUN_ROW.id);
    expect(withTransaction).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("update public.demo_requests"), expect.arrayContaining([[DEMO_ROW.id]]));
    expect(query).toHaveBeenCalledWith(expect.stringContaining("update public.support_escalations"), expect.arrayContaining([[SUPPORT_ROW.id]]));
    expect(query).toHaveBeenCalledWith(expect.stringContaining("insert into public.operational_reset_runs"), expect.arrayContaining([USER_ID, "staging_demo", "FULL_DEMO_TIDY"]));
    expect(query).toHaveBeenCalledWith(expect.stringContaining("insert into public.operational_reset_items"), expect.arrayContaining([RUN_ROW.id, "demo_request", DEMO_ROW.id]));
    expect(query).toHaveBeenCalledWith(expect.stringContaining("insert into public.operational_reset_items"), expect.arrayContaining([RUN_ROW.id, "support_escalation", SUPPORT_ROW.id]));
  });

  it("executes only selected eligible preview items", async () => {
    const selectedRunRow = {
      ...RUN_ROW,
      summary: {
        affectedCount: 1,
        demoRequests: 1,
        supportEscalations: 0,
        pilotRecommendations: 0,
        proofRecordsUntouched: true,
        message: "1 eligible non-destructive reset action identified. Proof orders, jobs, payments, and audit evidence are not mutated."
      }
    };
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [DEMO_ROW] })
      .mockResolvedValueOnce({ rows: [SUPPORT_ROW] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [selectedRunRow] })
      .mockResolvedValue({ rows: [] });
    const withTransaction = vi.fn((callback) => callback({ query }));
    const service = new OperationalResetsService({ query, withTransaction } as never);

    const result = await service.execute(USER_ID, {
      mode: "FULL_DEMO_TIDY",
      scope: "staging_demo",
      reason: "Prepare staging for a controlled demo rehearsal.",
      olderThan: "2026-05-10T00:00:00.000Z",
      confirmation: "RESET DEMO DATA",
      selectedItems: [`demo_request:${DEMO_ROW.id}:close-or-archive-demo-request`]
    });

    expect(result.summary.affectedCount).toBe(1);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("update public.demo_requests"), expect.arrayContaining([[DEMO_ROW.id]]));
    expect(query).not.toHaveBeenCalledWith(expect.stringContaining("update public.support_escalations"), expect.anything());
    expect(query).toHaveBeenCalledWith(expect.stringContaining("insert into public.operational_reset_items"), expect.arrayContaining([RUN_ROW.id, "demo_request", DEMO_ROW.id]));
    expect(query).not.toHaveBeenCalledWith(expect.stringContaining("insert into public.operational_reset_items"), expect.arrayContaining([RUN_ROW.id, "support_escalation", SUPPORT_ROW.id]));
  });

  it("rejects unknown selected reset items after recomputing preview", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [DEMO_ROW] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const withTransaction = vi.fn((callback) => callback({ query }));
    const service = new OperationalResetsService({ query, withTransaction } as never);

    await expect(
      service.execute(USER_ID, {
        mode: "FULL_DEMO_TIDY",
        scope: "staging_demo",
        reason: "Prepare staging for a controlled demo rehearsal.",
        olderThan: "2026-05-10T00:00:00.000Z",
        confirmation: "RESET DEMO DATA",
        selectedItems: ["demo_request:99999999-9999-4999-8999-999999999999:close-or-archive-demo-request"]
      })
    ).rejects.toThrow(new UnprocessableEntityException("operational_reset_selected_item_unknown"));

    expect(query).not.toHaveBeenCalledWith(expect.stringContaining("update public.demo_requests"), expect.anything());
    expect(query).not.toHaveBeenCalledWith(expect.stringContaining("insert into public.operational_reset_runs"), expect.anything());
  });

  it("rejects ineligible selected reset items", () => {
    const service = new OperationalResetsService({ query: vi.fn() } as never);

    expect(() =>
      (service as unknown as {
        selectExecutionItems: (items: unknown[], selectedItems: string[]) => unknown[];
      }).selectExecutionItems(
        [
          {
            selectionId: "proof_record:66666666-6666-4666-8666-666666666666:do-not-mutate-proof-record",
            resourceType: "proof_record",
            resourceId: "66666666-6666-4666-8666-666666666666",
            label: "Paid proof order",
            proposedAction: "Do not mutate proof record",
            action: "Do not mutate proof record",
            reason: "Proof records remain historical.",
            eligible: false,
            warning: "Proof/order/job/payment records are not changed by reset tools.",
            createdAt: null,
            currentStatus: "DELIVERED",
            metadata: {}
          }
        ],
        ["proof_record:66666666-6666-4666-8666-666666666666:do-not-mutate-proof-record"]
      )
    ).toThrow(new UnprocessableEntityException("operational_reset_selected_item_ineligible"));
  });

  it("lists reset history", async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [RUN_ROW] });
    const service = new OperationalResetsService({ query } as never);

    const result = await service.listRuns();

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.summary.proofRecordsUntouched).toBe(true);
  });
});
