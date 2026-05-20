import { Client, type ClientConfig } from "pg";
import { pathToFileURL } from "node:url";
import { CreateValidationEvidenceRunSchema } from "@shipwright/contracts";
import { loadEnvFileIfPresent } from "./env-loader.ts";

function createPgConfig(connectionString: string): ClientConfig {
  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");

  return {
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false }
  };
}

function optionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith("--")) continue;
    const key = current.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      args.set(key, "true");
    } else {
      args.set(key, value);
      index += 1;
    }
  }
  return args;
}

function parseSummary(value: string | undefined) {
  if (!value) return {};
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    throw new Error("summary-json must be valid JSON");
  }
}

export async function recordValidationEvidence(rawInput: unknown) {
  const input = CreateValidationEvidenceRunSchema.parse(rawInput);
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to record validation evidence");
  }

  const client = new Client(createPgConfig(databaseUrl));
  await client.connect();
  try {
    const result = await client.query<{ id: string }>(
      `insert into public.validation_evidence_runs (
         evidence_type,
         status,
         environment,
         source,
         command,
         summary,
         artifact_path,
         related_order_id,
         related_job_id,
         related_payment_id,
         related_pod_id,
         created_by
       )
       values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12)
       returning id`,
      [
        input.evidenceType,
        input.status,
        input.environment,
        input.source,
        input.command ?? null,
        JSON.stringify(input.summary ?? {}),
        input.artifactPath ?? null,
        input.relatedOrderId ?? null,
        input.relatedJobId ?? null,
        input.relatedPaymentId ?? null,
        input.relatedPodId ?? null,
        input.createdBy ?? null
      ]
    );
    return result.rows[0]?.id ?? null;
  } finally {
    await client.end();
  }
}

export async function recordValidationEvidenceIfEnabled(rawInput: unknown) {
  if (process.env.RECORD_VALIDATION_EVIDENCE !== "true") {
    return null;
  }

  return recordValidationEvidence(rawInput);
}

async function main() {
  loadEnvFileIfPresent("../../.env.smoke");
  loadEnvFileIfPresent("../../.env.proof");
  const args = parseArgs(process.argv.slice(2));
  const id = await recordValidationEvidence({
    evidenceType: args.get("type"),
    status: args.get("status"),
    environment: args.get("environment") ?? "staging",
    source: args.get("source") ?? "manual",
    command: optionalText(args.get("command")),
    summary: parseSummary(args.get("summary-json")),
    artifactPath: optionalText(args.get("artifact-path")),
    relatedOrderId: optionalText(args.get("order-id")),
    relatedJobId: optionalText(args.get("job-id")),
    relatedPaymentId: optionalText(args.get("payment-id")),
    relatedPodId: optionalText(args.get("pod-id")),
    createdBy: optionalText(args.get("created-by"))
  });

  console.log(`PASS validation evidence recorded | id=${id}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
