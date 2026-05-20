import { describe, expect, it, vi } from "vitest";
import { ValidationEvidenceService } from "./validation-evidence.service.js";

const RUN_ID = "11111111-1111-4111-8111-111111111111";
const ORDER_ID = "22222222-2222-4222-8222-222222222222";
const JOB_ID = "33333333-3333-4333-8333-333333333333";

const evidenceRow = {
  id: RUN_ID,
  evidence_type: "PAID_DELIVERY_PROOF",
  status: "PASSED",
  environment: "staging",
  source: "paid_delivery_proof_script",
  command: "pnpm proof:staging-paid-delivery",
  summary: { finalJobStatus: "DELIVERED" },
  artifact_path: "docs/proofs/paid-delivery.json",
  related_order_id: ORDER_ID,
  related_job_id: JOB_ID,
  related_payment_id: null,
  related_pod_id: null,
  created_by: null,
  created_at: "2026-05-20T10:00:00.000Z"
};

function createPg(...responses: Array<{ rows: unknown[] }>) {
  return {
    query: vi.fn().mockImplementation(() => Promise.resolve(responses.shift() ?? { rows: [] }))
  };
}

describe("ValidationEvidenceService", () => {
  it("lists admin evidence with filters", async () => {
    const pg = createPg({ rows: [evidenceRow] });
    const service = new ValidationEvidenceService(pg as never);

    const result = await service.listAdminEvidence({ evidenceType: "PAID_DELIVERY_PROOF", status: "PASSED", limit: "20" });

    expect(result.items[0]?.id).toBe(RUN_ID);
    const [sql, params] = pg.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("from public.validation_evidence_runs");
    expect(sql).toContain("evidence_type = $2");
    expect(params).toEqual(["staging", "PAID_DELIVERY_PROOF", "PASSED", 20]);
  });

  it("returns latest evidence by evidence type", async () => {
    const pg = createPg({
      rows: [
        { ...evidenceRow, evidence_type: "RELEASE_VERIFY" },
        { ...evidenceRow, evidence_type: "PAID_DELIVERY_PROOF" },
        { ...evidenceRow, evidence_type: "PLAYWRIGHT_SMOKE_REQUIRED_AUTH" }
      ]
    });
    const service = new ValidationEvidenceService(pg as never);

    const result = await service.getLatestEvidence("staging");

    expect(result.items.releaseVerify?.status).toBe("PASSED");
    expect(result.items.paidDeliveryProof?.relatedOrderId).toBe(ORDER_ID);
    expect(result.items.playwrightSmokeRequiredAuth?.command).toContain("proof:staging");
  });

  it("creates evidence runs without exposing mutation endpoints", async () => {
    const pg = createPg({ rows: [evidenceRow] });
    const service = new ValidationEvidenceService(pg as never);

    const result = await service.createEvidenceRun({
      evidenceType: "PAID_DELIVERY_PROOF",
      status: "PASSED",
      source: "manual",
      summary: { finalJobStatus: "DELIVERED" },
      relatedOrderId: ORDER_ID,
      relatedJobId: JOB_ID
    });

    expect(result.status).toBe("PASSED");
    expect("deleteEvidenceRun" in service).toBe(false);
    expect((pg.query.mock.calls[0] as [string])[0]).toContain("insert into public.validation_evidence_runs");
  });
});
