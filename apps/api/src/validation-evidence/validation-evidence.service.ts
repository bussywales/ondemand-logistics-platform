import { Injectable } from "@nestjs/common";
import { z } from "zod";
import {
  CreateValidationEvidenceRunSchema,
  ReleaseReadinessSummarySchema,
  ValidationEvidenceLatestSchema,
  ValidationEvidenceRunListSchema,
  ValidationEvidenceRunSchema,
  ValidationEvidenceStatusSchema,
  ValidationEvidenceTypeSchema,
  type CreateValidationEvidenceRunInput,
  type ReleaseReadinessEvidenceItemDto,
  type ValidationEvidenceRunDto,
  type ValidationEvidenceType
} from "@shipwright/contracts";
import { toIsoDateTime } from "../database/mapper.js";
import { PgService } from "../database/pg.service.js";

const ListValidationEvidenceQuerySchema = z.object({
  evidenceType: ValidationEvidenceTypeSchema.optional(),
  environment: z.string().trim().min(2).max(80).optional(),
  status: ValidationEvidenceStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const VALIDATION_EVIDENCE_TYPES: ValidationEvidenceType[] = [
  "RELEASE_VERIFY",
  "PAID_DELIVERY_PROOF",
  "PLAYWRIGHT_SMOKE",
  "PLAYWRIGHT_SMOKE_REQUIRED_AUTH"
];

const RELEASE_READINESS_REQUIRED: Array<{ evidenceType: ValidationEvidenceType; label: string; key: "releaseVerify" | "paidDeliveryProof" | "playwrightSmokeRequiredAuth" }> = [
  { evidenceType: "RELEASE_VERIFY", label: "Release verification", key: "releaseVerify" },
  { evidenceType: "PAID_DELIVERY_PROOF", label: "Paid-delivery proof", key: "paidDeliveryProof" },
  { evidenceType: "PLAYWRIGHT_SMOKE_REQUIRED_AUTH", label: "Required-auth smoke", key: "playwrightSmokeRequiredAuth" }
];

const RELEASE_READINESS_OPTIONAL: Array<{ evidenceType: ValidationEvidenceType; label: string; key: "playwrightSmoke" }> = [
  { evidenceType: "PLAYWRIGHT_SMOKE", label: "Browser smoke", key: "playwrightSmoke" }
];

type ValidationEvidenceRow = {
  id: string;
  evidence_type: string;
  status: string;
  environment: string;
  source: string;
  command: string | null;
  summary: Record<string, unknown> | string | null;
  artifact_path: string | null;
  related_order_id: string | null;
  related_job_id: string | null;
  related_payment_id: string | null;
  related_pod_id: string | null;
  created_by: string | null;
  created_at: string | Date;
};

function parseSummary(value: ValidationEvidenceRow["summary"]) {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return value;
}

export function mapValidationEvidenceRun(row: ValidationEvidenceRow): ValidationEvidenceRunDto {
  return ValidationEvidenceRunSchema.parse({
    id: row.id,
    evidenceType: row.evidence_type,
    status: row.status,
    environment: row.environment,
    source: row.source,
    command: row.command,
    summary: parseSummary(row.summary),
    artifactPath: row.artifact_path,
    relatedOrderId: row.related_order_id,
    relatedJobId: row.related_job_id,
    relatedPaymentId: row.related_payment_id,
    relatedPodId: row.related_pod_id,
    createdBy: row.created_by,
    createdAt: toIsoDateTime(row.created_at)
  });
}

function ageMinutes(createdAt: string, now: Date) {
  return Math.max(0, Math.floor((now.getTime() - new Date(createdAt).getTime()) / 60_000));
}

function mapReleaseReadinessItem(input: {
  evidenceType: ValidationEvidenceType;
  label: string;
  required: boolean;
  run: ValidationEvidenceRunDto | null;
  now: Date;
  freshnessWindowMinutes: number;
}): ReleaseReadinessEvidenceItemDto {
  const age = input.run ? ageMinutes(input.run.createdAt, input.now) : null;
  return {
    evidenceType: input.evidenceType,
    label: input.label,
    required: input.required,
    status: input.run?.status ?? "UNKNOWN",
    createdAt: input.run?.createdAt ?? null,
    ageMinutes: age,
    isFresh: Boolean(input.run && age !== null && age <= input.freshnessWindowMinutes),
    evidenceId: input.run?.id ?? null,
    source: input.run?.source ?? null,
    command: input.run?.command ?? null,
    artifactPath: input.run?.artifactPath ?? null,
    relatedOrderId: input.run?.relatedOrderId ?? null,
    relatedJobId: input.run?.relatedJobId ?? null,
    relatedPaymentId: input.run?.relatedPaymentId ?? null,
    relatedPodId: input.run?.relatedPodId ?? null
  };
}

@Injectable()
export class ValidationEvidenceService {
  constructor(private readonly pg: PgService) {}

  async listAdminEvidence(rawQuery: unknown) {
    const query = ListValidationEvidenceQuerySchema.parse(rawQuery);
    const where: string[] = ["environment = $1"];
    const values: unknown[] = [query.environment ?? "staging"];

    if (query.evidenceType) {
      values.push(query.evidenceType);
      where.push(`evidence_type = $${values.length}`);
    }

    if (query.status) {
      values.push(query.status);
      where.push(`status = $${values.length}`);
    }

    values.push(query.limit);
    const result = await this.pg.query<ValidationEvidenceRow>(
      `select id,
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
              created_by,
              created_at
       from public.validation_evidence_runs
       where ${where.join(" and ")}
       order by created_at desc
       limit $${values.length}`,
      values
    );

    return ValidationEvidenceRunListSchema.parse({ items: result.rows.map(mapValidationEvidenceRun) });
  }

  async getLatestEvidence(environment = "staging") {
    const result = await this.pg.query<ValidationEvidenceRow>(
      `select distinct on (evidence_type)
              id,
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
              created_by,
              created_at
       from public.validation_evidence_runs
       where environment = $1
         and evidence_type = any($2)
       order by evidence_type, created_at desc`,
      [environment, VALIDATION_EVIDENCE_TYPES]
    );

    const byType = new Map(result.rows.map((row) => [row.evidence_type, mapValidationEvidenceRun(row)]));
    return ValidationEvidenceLatestSchema.parse({
      environment,
      items: {
        releaseVerify: byType.get("RELEASE_VERIFY") ?? null,
        paidDeliveryProof: byType.get("PAID_DELIVERY_PROOF") ?? null,
        playwrightSmoke: byType.get("PLAYWRIGHT_SMOKE") ?? null,
        playwrightSmokeRequiredAuth: byType.get("PLAYWRIGHT_SMOKE_REQUIRED_AUTH") ?? null
      }
    });
  }

  async getReleaseReadiness(rawQuery: { environment?: string; freshnessWindowHours?: string | number } = {}) {
    const environment = rawQuery.environment?.trim() || "staging";
    const freshnessWindowHours = z.coerce.number().int().positive().max(168).default(24).parse(rawQuery.freshnessWindowHours ?? 24);
    const checkedAt = new Date();
    const latest = await this.getLatestEvidence(environment);
    const freshnessWindowMinutes = freshnessWindowHours * 60;
    const requiredEvidence = RELEASE_READINESS_REQUIRED.map((item) =>
      mapReleaseReadinessItem({
        ...item,
        required: true,
        run: latest.items[item.key],
        now: checkedAt,
        freshnessWindowMinutes
      })
    );
    const optionalEvidence = RELEASE_READINESS_OPTIONAL.map((item) =>
      mapReleaseReadinessItem({
        ...item,
        required: false,
        run: latest.items[item.key],
        now: checkedAt,
        freshnessWindowMinutes
      })
    );

    const failedRequired = requiredEvidence.filter((item) => item.status === "FAILED");
    const missingRequired = requiredEvidence.filter((item) => !item.evidenceId);
    const staleRequired = requiredEvidence.filter((item) => item.evidenceId && !item.isFresh);
    const nonPassedRequired = requiredEvidence.filter((item) => item.evidenceId && item.status !== "PASSED");
    const optionalWarnings = optionalEvidence.filter((item) => !item.evidenceId || !item.isFresh || item.status !== "PASSED");

    const recommendedActions: string[] = [];
    if (failedRequired.some((item) => item.evidenceType === "RELEASE_VERIFY")) {
      recommendedActions.push("Fix release verification failures, then run pnpm rehearsal:verify-staging.");
    }
    if (failedRequired.some((item) => item.evidenceType === "PAID_DELIVERY_PROOF")) {
      recommendedActions.push("Fix paid-delivery proof failures, then rerun pnpm rehearsal:verify-staging.");
    }
    if (failedRequired.some((item) => item.evidenceType === "PLAYWRIGHT_SMOKE_REQUIRED_AUTH")) {
      recommendedActions.push("Fix required-auth browser smoke failures, then rerun pnpm rehearsal:verify-staging.");
    }
    if (missingRequired.length || staleRequired.length || nonPassedRequired.length) {
      recommendedActions.push("Run pnpm rehearsal:verify-staging to refresh required stored evidence.");
    }
    if (optionalWarnings.length) {
      recommendedActions.push("Optionally record standard browser smoke evidence for additional release confidence.");
    }
    if (!recommendedActions.length) {
      recommendedActions.push("Proceed with controlled demo or release review using the latest proof IDs.");
    }

    const verdict = failedRequired.length
      ? "BLOCKED"
      : missingRequired.length || staleRequired.length || nonPassedRequired.length || optionalWarnings.length
        ? "NEEDS_REVIEW"
        : "READY";
    const title = verdict === "READY" ? "Release ready" : verdict === "BLOCKED" ? "Release blocked" : "Release needs review";
    const summary =
      verdict === "READY"
        ? "Required stored evidence is passed and fresh."
        : verdict === "BLOCKED"
          ? "A latest required evidence run failed. Resolve the failed gate before demo or release."
          : "Stored evidence is missing, stale, or has non-critical warnings.";

    return ReleaseReadinessSummarySchema.parse({
      verdict,
      title,
      summary,
      environment,
      freshnessWindowHours,
      checkedAt: checkedAt.toISOString(),
      requiredEvidence,
      optionalEvidence,
      recommendedActions: Array.from(new Set(recommendedActions)),
      links: {
        validationEvidence: "/admin/validation-evidence",
        pilots: "/admin/pilots",
        command: "/admin/command"
      }
    });
  }

  async createEvidenceRun(rawInput: CreateValidationEvidenceRunInput | unknown) {
    const input = CreateValidationEvidenceRunSchema.parse(rawInput);
    const result = await this.pg.query<ValidationEvidenceRow>(
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
       returning id,
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
                 created_by,
                 created_at`,
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

    return mapValidationEvidenceRun(result.rows[0]);
  }
}
