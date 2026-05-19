import { describe, expect, it, vi } from "vitest";
import { PilotsService } from "./pilots.service.js";

const PILOT_ID = "22222222-2222-4222-8222-222222222222";
const ORG_ID = "11111111-1111-4111-8111-111111111111";
const CHECK_ID = "33333333-3333-4333-8333-333333333333";
const USER_ID = "44444444-4444-4444-8444-444444444444";

const workspaceRow = {
  id: PILOT_ID,
  org_id: ORG_ID,
  org_name: "Pilot Org",
  mode: "CONTROLLED_PILOT",
  status: "ACTIVE",
  readiness_stage: "REHEARSAL_READY",
  pilot_owner: "Ops lead",
  support_owner: "Support lead",
  courier_owner: "Courier lead",
  payment_owner: "Finance lead",
  go_live_target_date: "2026-05-30",
  notes: "Controlled pilot rehearsal.",
  checklist_total: "10",
  checklist_passed: "8",
  active_jobs: "2",
  unresolved_support_escalations: "1",
  payment_risks: "1",
  ready_couriers: "3",
  created_at: "2026-05-04T08:00:00.000Z",
  updated_at: "2026-05-04T08:10:00.000Z"
};

const checkRow = {
  id: CHECK_ID,
  pilot_workspace_id: PILOT_ID,
  key: "payment_flow_verified",
  label: "Payment flow verified",
  status: "PASSED",
  evidence: "Paid delivery proof current.",
  updated_by: USER_ID,
  updated_at: "2026-05-04T08:10:00.000Z"
};

function checkWith(key: string, status: string, idSuffix: string) {
  return {
    ...checkRow,
    id: `33333333-3333-4333-8333-3333333333${idSuffix}`,
    key,
    label: key.replaceAll("_", " "),
    status
  };
}

function createPg(...responses: Array<{ rows: unknown[] }>) {
  return {
    query: vi.fn().mockImplementation(() => {
      const next = responses.shift();
      return Promise.resolve(next ?? { rows: [] });
    })
  };
}

describe("PilotsService", () => {
  it("lists admin pilot workspaces with posture counts", async () => {
    const pg = createPg({ rows: [workspaceRow] });
    const service = new PilotsService(pg as never);

    const result = await service.listAdminPilots();

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.orgName).toBe("Pilot Org");
    expect(result.items[0]?.posture).toMatchObject({ activeJobs: 2, unresolvedSupportEscalations: 1, paymentRisks: 1, readyCouriers: 3 });
    expect((pg.query.mock.calls[0] as [string])[0]).toContain("from public.pilot_workspaces pw");
  });

  it("creates a pilot workspace and seeds default readiness checks", async () => {
    const pg = createPg({ rows: [{ id: PILOT_ID }] }, { rows: [] }, { rows: [workspaceRow] });
    const service = new PilotsService(pg as never);

    const result = await service.createAdminPilot({ orgId: ORG_ID, mode: "CONTROLLED_PILOT", status: "ACTIVE", readinessStage: "REHEARSAL_READY" });

    expect(result.id).toBe(PILOT_ID);
    expect((pg.query.mock.calls[0] as [string])[0]).toContain("insert into public.pilot_workspaces");
    expect((pg.query.mock.calls[1] as [string])[0]).toContain("insert into public.pilot_readiness_checks");
  });

  it("updates a pilot workspace without exposing a delete path", async () => {
    const pg = createPg({ rows: [{ id: PILOT_ID }] }, { rows: [workspaceRow] });
    const service = new PilotsService(pg as never);

    const result = await service.updateAdminPilot(PILOT_ID, { status: "PAUSED", notes: "Paused before live traffic." });

    expect(result.id).toBe(PILOT_ID);
    expect((pg.query.mock.calls[0] as [string])[0]).toContain("update public.pilot_workspaces");
    expect("deleteAdminPilot" in service).toBe(false);
  });

  it("lists and updates pilot readiness checks", async () => {
    const pg = createPg({ rows: [{ id: PILOT_ID }] }, { rows: [] }, { rows: [checkRow] }, { rows: [{ ...checkRow, status: "BLOCKED" }] });
    const service = new PilotsService(pg as never);

    const list = await service.listAdminPilotChecks(PILOT_ID);
    const updated = await service.updateAdminPilotCheck(USER_ID, PILOT_ID, CHECK_ID, { status: "BLOCKED", evidence: "Browser smoke needs rerun." });

    expect(list.items[0]?.key).toBe("payment_flow_verified");
    expect(updated.status).toBe("BLOCKED");
    expect((pg.query.mock.calls[3] as [string, unknown[]])[1]).toEqual([PILOT_ID, CHECK_ID, USER_ID, "BLOCKED", "Browser smoke needs rerun."]);
  });

  it("scopes business pilot status to active org memberships", async () => {
    const pg = createPg({ rows: [workspaceRow] }, { rows: [checkRow] });
    const service = new PilotsService(pg as never);

    const result = await service.getBusinessPilotStatus(USER_ID);

    expect(result.workspace?.id).toBe(PILOT_ID);
    expect(result.checks).toHaveLength(1);
    const [sql, params] = pg.query.mock.calls[0] as [string, string[]];
    expect(sql).toContain("from public.org_memberships m");
    expect(sql).toContain("m.user_id = $1");
    expect(params).toEqual([USER_ID]);
  });

  it("returns an empty business pilot status when no scoped profile exists", async () => {
    const pg = createPg({ rows: [] });
    const service = new PilotsService(pg as never);

    const result = await service.getBusinessPilotStatus(USER_ID);

    expect(result.workspace).toBeNull();
    expect(result.checks).toEqual([]);
    expect(result.guidance).toContain("No pilot profile");
  });

  it("returns a blocked rehearsal summary when high severity support is open", async () => {
    const pg = createPg(
      { rows: [workspaceRow] },
      { rows: [] },
      { rows: [checkWith("paid_delivery_proof_current", "PASSED", "01"), checkWith("browser_smoke_current", "PASSED", "02")] },
      { rows: [{ unresolved_support_escalations: "2", high_critical_support_escalations: "1" }] }
    );
    const service = new PilotsService(pg as never);

    const result = await service.getAdminPilotRehearsal(PILOT_ID);

    expect(result.recommendation).toBe("BLOCKED");
    expect(result.operationalPosture.highCriticalSupportEscalations).toBe(1);
    expect(result.recommendedNextActions).toContain("Resolve high or critical support escalations before rehearsal.");
  });

  it("returns needs review when proof and smoke readiness checks are not current", async () => {
    const pg = createPg(
      { rows: [{ ...workspaceRow, checklist_total: "2", checklist_passed: "1" }] },
      { rows: [] },
      { rows: [checkWith("paid_delivery_proof_current", "PASSED", "01"), checkWith("browser_smoke_current", "NOT_STARTED", "02")] },
      { rows: [{ unresolved_support_escalations: "0", high_critical_support_escalations: "0" }] }
    );
    const service = new PilotsService(pg as never);

    const result = await service.getAdminPilotRehearsal(PILOT_ID);

    expect(result.recommendation).toBe("NEEDS_REVIEW");
    expect(result.validationPosture.browserSmoke.status).toBe("UNKNOWN");
    expect(result.recommendedNextActions).toContain("Run release verification, paid-delivery proof, and browser smoke before rehearsal.");
  });

  it("returns ready for rehearsal when checks pass and no blockers remain", async () => {
    const pg = createPg(
      { rows: [{ ...workspaceRow, checklist_total: "2", checklist_passed: "2", unresolved_support_escalations: "0", payment_risks: "0" }] },
      { rows: [] },
      { rows: [checkWith("paid_delivery_proof_current", "PASSED", "01"), checkWith("browser_smoke_current", "PASSED", "02")] },
      { rows: [{ unresolved_support_escalations: "0", high_critical_support_escalations: "0" }] }
    );
    const service = new PilotsService(pg as never);

    const result = await service.getAdminPilotRehearsal(PILOT_ID);

    expect(result.recommendation).toBe("READY_FOR_REHEARSAL");
    expect(result.checklistSummary.passed).toBe(2);
    expect(result.operationalPosture.unresolvedSupportEscalations).toBe(0);
  });
});
