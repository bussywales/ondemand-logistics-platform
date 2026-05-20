import { describe, expect, it } from "vitest";
import {
  getRehearsalSteps,
  parseEvidenceId,
  parseProofIds,
  runRehearsalVerification
} from "./rehearsal-verify-staging.ts";

describe("rehearsal verify staging wrapper", () => {
  it("defines the required sequence order", () => {
    expect(getRehearsalSteps().map((step) => step.key)).toEqual(["release", "proof", "smoke"]);
    expect(getRehearsalSteps()[0]).toMatchObject({
      command: "pnpm",
      args: ["release:verify-staging"],
      env: { RECORD_VALIDATION_EVIDENCE: "true" }
    });
    expect(getRehearsalSteps()[2]).toMatchObject({
      command: "pnpm",
      args: ["--filter", "@shipwright/web", "test:smoke"],
      env: { SMOKE_REQUIRE_AUTH: "true" }
    });
  });

  it("stops after a failed release step", () => {
    const calls: string[] = [];
    const result = runRehearsalVerification((step) => {
      calls.push(step.key);
      return { status: 1, stdout: "release failed", stderr: "" };
    });

    expect(result.exitCode).toBe(1);
    expect(result.summary.failedStep).toBe("Release verification");
    expect(calls).toEqual(["release"]);
  });

  it("records smoke evidence after smoke passes", () => {
    const calls: string[] = [];
    const result = runRehearsalVerification((step) => {
      calls.push(step.key);
      if (step.key === "release") {
        return { status: 0, stdout: "PASS validation evidence recorded | id=11111111-1111-1111-1111-111111111111", stderr: "" };
      }
      if (step.key === "proof") {
        return {
          status: 0,
          stdout: `"orderId": "22222222-2222-2222-2222-222222222222", "jobId": "33333333-3333-3333-3333-333333333333", "paymentId": "44444444-4444-4444-4444-444444444444", "podId": "55555555-5555-5555-5555-555555555555"\nPASS validation evidence recorded | id=66666666-6666-6666-6666-666666666666`,
          stderr: ""
        };
      }
      if (step.key === "smoke") {
        return { status: 0, stdout: "7 passed", stderr: "" };
      }
      return { status: 0, stdout: "PASS validation evidence recorded | id=77777777-7777-7777-7777-777777777777", stderr: "" };
    });

    expect(result.exitCode).toBe(0);
    expect(calls).toEqual(["release", "proof", "smoke", "smokeEvidence"]);
    expect(result.summary.release.evidenceId).toBe("11111111-1111-1111-1111-111111111111");
    expect(result.summary.proof.evidenceId).toBe("66666666-6666-6666-6666-666666666666");
    expect(result.summary.smokeEvidence.evidenceId).toBe("77777777-7777-7777-7777-777777777777");
    expect(result.summary.proofIds.orderId).toBe("22222222-2222-2222-2222-222222222222");
  });

  it("parses evidence ids and proof ids from command output", () => {
    expect(parseEvidenceId("PASS validation evidence recorded | id=12345678-1234-1234-1234-123456789abc")).toBe(
      "12345678-1234-1234-1234-123456789abc"
    );
    expect(parseProofIds('"orderId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "jobId": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"')).toEqual({
      orderId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      jobId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      paymentId: undefined,
      podId: undefined
    });
  });
});
