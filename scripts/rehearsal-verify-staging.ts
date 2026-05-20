import { spawnSync } from "node:child_process";

type StepKey = "release" | "proof" | "smoke" | "smokeEvidence";

type CommandStep = {
  key: StepKey;
  label: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
};

type CommandResult = {
  status: number;
  stdout: string;
  stderr: string;
};

type Runner = (step: CommandStep) => CommandResult;

type StepSummary = {
  status: "PASSED" | "FAILED" | "NOT_RUN";
  evidenceId?: string | null;
};

type ProofIds = {
  orderId?: string;
  jobId?: string;
  paymentId?: string;
  podId?: string;
};

type RehearsalSummary = {
  release: StepSummary;
  proof: StepSummary;
  smoke: StepSummary;
  smokeEvidence: StepSummary;
  proofIds: ProofIds;
  failedStep?: string;
};

export const SMOKE_COMMAND = "SMOKE_REQUIRE_AUTH=true pnpm --filter @shipwright/web test:smoke";

export function getRehearsalSteps(): CommandStep[] {
  return [
    {
      key: "release",
      label: "Release verification",
      command: "pnpm",
      args: ["release:verify-staging"],
      env: { RECORD_VALIDATION_EVIDENCE: "true" }
    },
    {
      key: "proof",
      label: "Paid-delivery proof",
      command: "pnpm",
      args: ["proof:staging-paid-delivery"],
      env: { RECORD_VALIDATION_EVIDENCE: "true" }
    },
    {
      key: "smoke",
      label: "Required-auth Playwright smoke",
      command: "pnpm",
      args: ["--filter", "@shipwright/web", "test:smoke"],
      env: { SMOKE_REQUIRE_AUTH: "true" }
    }
  ];
}

function createSmokeEvidenceStep(status: "PASSED" | "FAILED", summary: Record<string, unknown>): CommandStep {
  return {
    key: "smokeEvidence",
    label: "Required-auth smoke evidence recording",
    command: "pnpm",
    args: [
      "evidence:record",
      "--",
      "--type",
      "PLAYWRIGHT_SMOKE_REQUIRED_AUTH",
      "--status",
      status,
      "--source",
      "rehearsal_wrapper",
      "--command",
      SMOKE_COMMAND,
      "--summary-json",
      JSON.stringify(summary)
    ]
  };
}

export function parseEvidenceId(output: string) {
  return output.match(/validation evidence recorded \| id=([0-9a-f-]+)/i)?.[1] ?? null;
}

export function parseProofIds(output: string): ProofIds {
  const jsonStart = output.lastIndexOf("{");
  const direct = {
    orderId: output.match(/"orderId":\s*"([^"]+)"/)?.[1],
    jobId: output.match(/"jobId":\s*"([^"]+)"/)?.[1],
    paymentId: output.match(/"paymentId":\s*"([^"]+)"/)?.[1],
    podId: output.match(/"podId":\s*"([^"]+)"/)?.[1]
  };

  if (jsonStart === -1) {
    return direct;
  }

  try {
    const parsed = JSON.parse(output.slice(jsonStart)) as ProofIds;
    return {
      orderId: parsed.orderId ?? direct.orderId,
      jobId: parsed.jobId ?? direct.jobId,
      paymentId: parsed.paymentId ?? direct.paymentId,
      podId: parsed.podId ?? direct.podId
    };
  } catch {
    return direct;
  }
}

export function parseSmokeCounts(output: string) {
  const passed = output.match(/(\d+)\s+passed/i)?.[1];
  const failed = output.match(/(\d+)\s+failed/i)?.[1];
  return {
    passed: passed ? Number(passed) : undefined,
    failed: failed ? Number(failed) : passed ? 0 : undefined,
    requiredAuth: true
  };
}

function printOutput(result: CommandResult) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
}

function runCommand(step: CommandStep): CommandResult {
  const result = spawnSync(step.command, step.args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...(step.env ?? {})
    },
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 30
  });

  return {
    status: typeof result.status === "number" ? result.status : 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? (result.error ? String(result.error) : "")
  };
}

function initialSummary(): RehearsalSummary {
  return {
    release: { status: "NOT_RUN" },
    proof: { status: "NOT_RUN" },
    smoke: { status: "NOT_RUN" },
    smokeEvidence: { status: "NOT_RUN" },
    proofIds: {}
  };
}

function printFinalSummary(summary: RehearsalSummary) {
  console.log("");
  console.log("REHEARSAL VERIFY SUMMARY");
  console.log(`release verify status: ${summary.release.status}${summary.release.evidenceId ? ` | evidence=${summary.release.evidenceId}` : ""}`);
  console.log(`paid proof status: ${summary.proof.status}${summary.proof.evidenceId ? ` | evidence=${summary.proof.evidenceId}` : ""}`);
  console.log(`smoke status: ${summary.smoke.status}${summary.smokeEvidence.evidenceId ? ` | evidence=${summary.smokeEvidence.evidenceId}` : ""}`);
  console.log(`latest order id: ${summary.proofIds.orderId ?? "not available"}`);
  console.log(`latest job id: ${summary.proofIds.jobId ?? "not available"}`);
  console.log(`latest payment id: ${summary.proofIds.paymentId ?? "not available"}`);
  console.log(`latest POD id: ${summary.proofIds.podId ?? "not available"}`);
  console.log("stored evidence: /admin/validation-evidence");
  console.log("proof artifacts: docs/proofs/ remain local/uncommitted unless intentionally exported");
  if (summary.failedStep) {
    console.error(`FAILED STEP: ${summary.failedStep}`);
  }
}

export function runRehearsalVerification(runner: Runner = runCommand) {
  const summary = initialSummary();

  for (const step of getRehearsalSteps()) {
    console.log("");
    console.log(`STEP | ${step.label}`);
    const result = runner(step);
    printOutput(result);
    const combinedOutput = `${result.stdout}\n${result.stderr}`;
    const passed = result.status === 0;

    if (step.key === "release") {
      summary.release = { status: passed ? "PASSED" : "FAILED", evidenceId: parseEvidenceId(combinedOutput) };
    }
    if (step.key === "proof") {
      summary.proof = { status: passed ? "PASSED" : "FAILED", evidenceId: parseEvidenceId(combinedOutput) };
      summary.proofIds = parseProofIds(combinedOutput);
    }
    if (step.key === "smoke") {
      const smokeStatus = passed ? "PASSED" : "FAILED";
      summary.smoke = { status: smokeStatus };
      const evidenceStep = createSmokeEvidenceStep(smokeStatus, parseSmokeCounts(combinedOutput));
      console.log("");
      console.log(`STEP | ${evidenceStep.label}`);
      const evidenceResult = runner(evidenceStep);
      printOutput(evidenceResult);
      summary.smokeEvidence = {
        status: evidenceResult.status === 0 ? "PASSED" : "FAILED",
        evidenceId: parseEvidenceId(`${evidenceResult.stdout}\n${evidenceResult.stderr}`)
      };
      if (evidenceResult.status !== 0) {
        summary.failedStep = evidenceStep.label;
        printFinalSummary(summary);
        return { exitCode: evidenceResult.status || 1, summary };
      }
    }

    if (!passed) {
      summary.failedStep = step.label;
      printFinalSummary(summary);
      return { exitCode: result.status || 1, summary };
    }
  }

  printFinalSummary(summary);
  return { exitCode: 0, summary };
}

if (process.argv[1]?.endsWith("rehearsal-verify-staging.ts")) {
  const result = runRehearsalVerification();
  process.exitCode = result.exitCode;
}
