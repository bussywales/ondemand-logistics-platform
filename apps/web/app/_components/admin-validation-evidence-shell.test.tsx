import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminValidationEvidenceView } from "./admin-validation-evidence-shell";
import type { ValidationEvidenceRun } from "../_lib/product-state";

const run: ValidationEvidenceRun = {
  id: "6cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
  evidenceType: "PAID_DELIVERY_PROOF",
  status: "PASSED",
  environment: "staging",
  source: "paid_delivery_proof_script",
  command: "pnpm proof:staging-paid-delivery",
  summary: { finalJobStatus: "DELIVERED" },
  artifactPath: "docs/proofs/paid-delivery.json",
  relatedOrderId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
  relatedJobId: "bf835fca-017a-465d-adc1-bc5a42e311bd",
  relatedPaymentId: null,
  relatedPodId: null,
  createdBy: null,
  createdAt: "2026-05-20T10:00:00.000Z"
};

describe("AdminValidationEvidenceView", () => {
  it("renders latest evidence and history without running commands", () => {
    const markup = renderToStaticMarkup(
      <AdminValidationEvidenceView
        latest={{
          environment: "staging",
          items: {
            releaseVerify: null,
            paidDeliveryProof: run,
            playwrightSmoke: null,
            playwrightSmokeRequiredAuth: null
          }
        }}
        runs={[run]}
      />
    );

    expect(markup).toContain("Stored validation evidence");
    expect(markup).toContain("Paid-delivery proof");
    expect(markup).toContain("docs/proofs/paid-delivery.json");
    expect(markup).toContain("read-only and does not run release verification");
  });
});
