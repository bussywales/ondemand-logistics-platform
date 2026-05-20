import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminReleaseReadinessView } from "./admin-release-readiness-shell";
import type { ReleaseReadinessSummary } from "../_lib/product-state";

const readiness: ReleaseReadinessSummary = {
  verdict: "READY",
  title: "Release ready",
  summary: "Required stored evidence is passed and fresh.",
  environment: "staging",
  freshnessWindowHours: 24,
  checkedAt: "2026-05-20T15:00:00.000Z",
  requiredEvidence: [
    {
      evidenceType: "RELEASE_VERIFY",
      label: "Release verification",
      required: true,
      status: "PASSED",
      createdAt: "2026-05-20T14:55:00.000Z",
      ageMinutes: 5,
      isFresh: true,
      evidenceId: "6cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
      source: "release_verify_script",
      command: "pnpm release:verify-staging",
      artifactPath: "docs/proofs/release.json",
      relatedOrderId: null,
      relatedJobId: null,
      relatedPaymentId: null,
      relatedPodId: null
    },
    {
      evidenceType: "PAID_DELIVERY_PROOF",
      label: "Paid-delivery proof",
      required: true,
      status: "PASSED",
      createdAt: "2026-05-20T14:56:00.000Z",
      ageMinutes: 4,
      isFresh: true,
      evidenceId: "7cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
      source: "paid_delivery_proof_script",
      command: "pnpm proof:staging-paid-delivery",
      artifactPath: "docs/proofs/paid-delivery.json",
      relatedOrderId: "2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
      relatedJobId: "bf835fca-017a-465d-adc1-bc5a42e311bd",
      relatedPaymentId: "3cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
      relatedPodId: "4cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b"
    },
    {
      evidenceType: "PLAYWRIGHT_SMOKE_REQUIRED_AUTH",
      label: "Required-auth smoke",
      required: true,
      status: "PASSED",
      createdAt: "2026-05-20T14:58:00.000Z",
      ageMinutes: 2,
      isFresh: true,
      evidenceId: "8cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b",
      source: "rehearsal_wrapper",
      command: "SMOKE_REQUIRE_AUTH=true pnpm --filter @shipwright/web test:smoke",
      artifactPath: null,
      relatedOrderId: null,
      relatedJobId: null,
      relatedPaymentId: null,
      relatedPodId: null
    }
  ],
  optionalEvidence: [],
  recommendedActions: ["Proceed with controlled demo or release review using the latest proof IDs."],
  links: {
    validationEvidence: "/admin/validation-evidence",
    pilots: "/admin/pilots",
    command: "/admin/command"
  }
};

describe("AdminReleaseReadinessView", () => {
  it("renders verdict, command, proof IDs, and evidence links", () => {
    const markup = renderToStaticMarkup(<AdminReleaseReadinessView readiness={readiness} />);

    expect(markup).toContain("Release ready");
    expect(markup).toContain("pnpm rehearsal:verify-staging");
    expect(markup).toContain("Paid-delivery proof");
    expect(markup).toContain("2cb2f7e9-6b75-4f34-bec6-b90dbfb0fe1b");
    expect(markup).toContain("/admin/validation-evidence");
    expect(markup).toContain("does not execute validation commands");
  });
});
