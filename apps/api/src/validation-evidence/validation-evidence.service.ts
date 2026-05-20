import { Injectable } from "@nestjs/common";
import { z } from "zod";
import {
  CreateValidationEvidenceRunSchema,
  ValidationEvidenceLatestSchema,
  ValidationEvidenceRunListSchema,
  ValidationEvidenceRunSchema,
  ValidationEvidenceStatusSchema,
  ValidationEvidenceTypeSchema,
  type CreateValidationEvidenceRunInput,
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
