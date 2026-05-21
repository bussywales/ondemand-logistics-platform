import { Injectable, UnprocessableEntityException } from "@nestjs/common";
import type { PoolClient, QueryResult, QueryResultRow } from "pg";
import {
  ExecuteOperationalResetSchema,
  OperationalResetPreviewSchema,
  OperationalResetRunListSchema,
  OperationalResetRunSchema,
  OperationalResetRequestSchema,
  type ExecuteOperationalResetInput,
  type OperationalResetMode,
  type OperationalResetPreviewDto,
  type OperationalResetPreviewItemDto,
  type OperationalResetSelectedItemDto,
  type OperationalResetRunDto,
  type OperationalResetSummaryDto
} from "@shipwright/contracts";
import { toIsoDateTime } from "../database/mapper.js";
import { PgService } from "../database/pg.service.js";

type Queryable = {
  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
};

type ResetRunRow = {
  id: string;
  created_by: string | null;
  scope: string;
  mode: OperationalResetMode;
  reason: string;
  status: "COMPLETED" | "FAILED";
  summary: OperationalResetSummaryDto | string | null;
  created_at: string | Date;
  completed_at: string | Date | null;
};

type DemoRequestCandidateRow = {
  id: string;
  name: string;
  email: string;
  organisation: string | null;
  status: string;
  created_at: string | Date;
};

type SupportEscalationCandidateRow = {
  id: string;
  org_id: string;
  title: string;
  note: string;
  status: string;
  severity: string;
  created_at: string | Date;
};

type PilotCandidateRow = {
  id: string;
  org_name: string | null;
  mode: string;
  status: string;
  readiness_stage: string;
  updated_at: string | Date;
};

const DEFAULT_OLDER_THAN_DAYS = 7;
const TEST_SUPPORT_PATTERN = "%test%|%demo%|%smoke%|%staging%";

function defaultOlderThanDate() {
  const date = new Date();
  date.setDate(date.getDate() - DEFAULT_OLDER_THAN_DAYS);
  return date;
}

function parseOlderThan(value: string | null | undefined) {
  if (!value) {
    return defaultOlderThanDate();
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new UnprocessableEntityException("operational_reset_invalid_older_than");
  }
  return date;
}

function parseJsonObject(value: ResetRunRow["summary"]): OperationalResetSummaryDto {
  if (!value) {
    return {
      affectedCount: 0,
      demoRequests: 0,
      supportEscalations: 0,
      pilotRecommendations: 0,
      proofRecordsUntouched: true,
      message: "Reset summary unavailable."
    };
  }

  return typeof value === "string" ? JSON.parse(value) : value;
}

function mapRun(row: ResetRunRow): OperationalResetRunDto {
  return OperationalResetRunSchema.parse({
    id: row.id,
    createdBy: row.created_by,
    scope: row.scope,
    mode: row.mode,
    reason: row.reason,
    status: row.status,
    summary: parseJsonObject(row.summary),
    createdAt: toIsoDateTime(row.created_at),
    completedAt: row.completed_at ? toIsoDateTime(row.completed_at) : null
  });
}

function summarizeItems(items: OperationalResetPreviewItemDto[]): OperationalResetSummaryDto {
  const eligibleItems = items.filter((item) => item.eligible);
  return {
    affectedCount: eligibleItems.length,
    demoRequests: eligibleItems.filter((item) => item.resourceType === "demo_request").length,
    supportEscalations: eligibleItems.filter((item) => item.resourceType === "support_escalation").length,
    pilotRecommendations: eligibleItems.filter((item) => item.resourceType === "pilot_workspace").length,
    proofRecordsUntouched: true,
    message: eligibleItems.length
      ? `${eligibleItems.length} eligible non-destructive reset action${eligibleItems.length === 1 ? "" : "s"} identified. Proof orders, jobs, payments, and audit evidence are not mutated.`
      : "No safe reset actions match this mode. Proof orders, jobs, payments, and audit evidence are not mutated."
  };
}

function normalizeSelectionPart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function buildSelectionId(resourceType: OperationalResetPreviewItemDto["resourceType"], resourceId: string, action: string) {
  return `${resourceType}:${resourceId}:${normalizeSelectionPart(action)}`;
}

function isSelectionMatch(item: OperationalResetPreviewItemDto, selected: OperationalResetSelectedItemDto) {
  if (typeof selected === "string") {
    return item.selectionId === selected;
  }

  return (
    item.resourceType === selected.resourceType &&
    item.resourceId === selected.resourceId &&
    (item.proposedAction === selected.action || item.action === selected.action)
  );
}

@Injectable()
export class OperationalResetsService {
  constructor(private readonly pg: PgService) {}

  async listRuns() {
    const result = await this.pg.query<ResetRunRow>(
      `select id, created_by, scope, mode, reason, status, summary, created_at, completed_at
       from public.operational_reset_runs
       order by created_at desc
       limit 50`
    );

    return OperationalResetRunListSchema.parse({ items: result.rows.map(mapRun) });
  }

  async preview(rawInput: unknown): Promise<OperationalResetPreviewDto> {
    const parsed = OperationalResetRequestSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new UnprocessableEntityException(parsed.error.issues[0]?.message ?? "operational_reset_preview_invalid");
    }

    return this.buildPreview(this.pg, parsed.data);
  }

  async execute(userId: string, rawInput: unknown): Promise<OperationalResetRunDto> {
    const parsed = ExecuteOperationalResetSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new UnprocessableEntityException(parsed.error.issues[0]?.message ?? "operational_reset_execute_invalid");
    }

    const input = parsed.data;
    return this.pg.withTransaction(async (client) => {
      const preview = await this.buildPreview(client, input);
      const executionItems = this.selectExecutionItems(preview.items, input.selectedItems);
      const selectedSummary = summarizeItems(executionItems);
      await this.applyResetActions(client, userId, input, executionItems);

      const inserted = await client.query<ResetRunRow>(
        `insert into public.operational_reset_runs (
           created_by,
           scope,
           mode,
           reason,
           status,
           summary,
           completed_at
         )
         values ($1, $2, $3, $4, 'COMPLETED', $5::jsonb, now())
         returning id, created_by, scope, mode, reason, status, summary, created_at, completed_at`,
        [userId, input.scope, input.mode, input.reason, JSON.stringify(selectedSummary)]
      );

      const run = inserted.rows[0];
      if (!run) {
        throw new UnprocessableEntityException("operational_reset_run_create_failed");
      }

      await this.recordItems(client, run.id, executionItems);
      return mapRun(run);
    });
  }

  private selectExecutionItems(
    previewItems: OperationalResetPreviewItemDto[],
    selectedItems: ExecuteOperationalResetInput["selectedItems"]
  ) {
    const eligibleItems = previewItems.filter((item) => item.eligible);
    if (!selectedItems) {
      return eligibleItems;
    }

    const selected = new Set<OperationalResetPreviewItemDto>();
    for (const candidate of selectedItems) {
      const match = previewItems.find((item) => isSelectionMatch(item, candidate));
      if (!match) {
        throw new UnprocessableEntityException("operational_reset_selected_item_unknown");
      }
      if (!match.eligible) {
        throw new UnprocessableEntityException("operational_reset_selected_item_ineligible");
      }
      selected.add(match);
    }

    return [...selected];
  }

  private async buildPreview(queryable: Queryable, input: ExecuteOperationalResetInput | Omit<ExecuteOperationalResetInput, "confirmation">) {
    const olderThan = parseOlderThan(input.olderThan);
    const items: OperationalResetPreviewItemDto[] = [];

    if (input.mode === "ARCHIVE_DEMO_REQUESTS" || input.mode === "FULL_DEMO_TIDY") {
      items.push(...(await this.previewDemoRequests(queryable, olderThan)));
    }

    if (input.mode === "CLOSE_TEST_ESCALATIONS" || input.mode === "FULL_DEMO_TIDY") {
      items.push(...(await this.previewSupportEscalations(queryable)));
    }

    if (input.mode === "MARK_STALE_PILOT_REHEARSAL" || input.mode === "FULL_DEMO_TIDY") {
      items.push(...(await this.previewPilotRehearsal(queryable, olderThan)));
    }

    return OperationalResetPreviewSchema.parse({
      mode: input.mode,
      scope: input.scope,
      reason: input.reason,
      olderThan: toIsoDateTime(olderThan),
      summary: summarizeItems(items),
      items
    });
  }

  private async previewDemoRequests(queryable: Queryable, olderThan: Date) {
    const result = await queryable.query<DemoRequestCandidateRow>(
      `select id, name, email, organisation, status, created_at
       from public.demo_requests
       where status in ('CLOSED', 'SPAM')
          or (created_at < $1 and status <> 'QUALIFIED')
       order by created_at asc
       limit 100`,
      [olderThan]
    );

    return result.rows.map((row): OperationalResetPreviewItemDto => {
      const proposedAction = row.status === "SPAM" ? "Archive spam/demo request" : "Close or archive demo request";
      return {
        selectionId: buildSelectionId("demo_request", row.id, proposedAction),
        resourceType: "demo_request",
        resourceId: row.id,
        label: `${row.name}${row.organisation ? ` · ${row.organisation}` : ""}`,
        proposedAction,
        action: proposedAction,
        reason: row.status === "CLOSED" || row.status === "SPAM"
          ? "Request is already closed or spam and can be included in reset evidence."
          : "Request is older than the selected threshold and not qualified.",
        eligible: true,
        warning: null,
        createdAt: toIsoDateTime(row.created_at),
        currentStatus: row.status,
        metadata: {
          status: row.status,
          email: row.email,
          createdAt: toIsoDateTime(row.created_at)
        }
      };
    });
  }

  private async previewSupportEscalations(queryable: Queryable) {
    const result = await queryable.query<SupportEscalationCandidateRow>(
      `select id, org_id, title, note, status, severity, created_at
       from public.support_escalations
       where status not in ('RESOLVED', 'CANCELLED')
         and lower(coalesce(title, '') || ' ' || coalesce(note, '')) similar to $1
       order by created_at asc
       limit 100`,
      [TEST_SUPPORT_PATTERN]
    );

    return result.rows.map((row): OperationalResetPreviewItemDto => {
      const proposedAction = "Resolve test/demo support escalation";
      return {
        selectionId: buildSelectionId("support_escalation", row.id, proposedAction),
        resourceType: "support_escalation",
        resourceId: row.id,
        label: row.title,
        proposedAction,
        action: proposedAction,
        reason: "Open support escalation is clearly marked as test, demo, smoke, or staging data.",
        eligible: true,
        warning: row.severity === "HIGH" || row.severity === "CRITICAL" ? "High-severity test records should be reviewed before reset." : null,
        createdAt: toIsoDateTime(row.created_at),
        currentStatus: row.status,
        metadata: {
          orgId: row.org_id,
          status: row.status,
          severity: row.severity,
          createdAt: toIsoDateTime(row.created_at)
        }
      };
    });
  }

  private async previewPilotRehearsal(queryable: Queryable, olderThan: Date) {
    const result = await queryable.query<PilotCandidateRow>(
      `select pw.id, o.name as org_name, pw.mode, pw.status, pw.readiness_stage, pw.updated_at
       from public.pilot_workspaces pw
       left join public.orgs o on o.id = pw.org_id
       where pw.updated_at < $1
         and pw.status in ('READY_FOR_REHEARSAL', 'IN_REHEARSAL')
       order by pw.updated_at asc
       limit 50`,
      [olderThan]
    );

    return result.rows.map((row): OperationalResetPreviewItemDto => {
      const proposedAction = "Review stale pilot rehearsal posture";
      return {
        selectionId: buildSelectionId("pilot_workspace", row.id, proposedAction),
        resourceType: "pilot_workspace",
        resourceId: row.id,
        label: row.org_name ?? row.id,
        proposedAction,
        action: proposedAction,
        reason: "Pilot rehearsal state is older than the selected threshold. v1 records a reset recommendation only.",
        eligible: true,
        warning: "Recommendation only: pilot state will not be mutated.",
        createdAt: toIsoDateTime(row.updated_at),
        currentStatus: row.status,
        metadata: {
          mode: row.mode,
          status: row.status,
          readinessStage: row.readiness_stage,
          updatedAt: toIsoDateTime(row.updated_at)
        }
      };
    });
  }

  private async applyResetActions(
    client: PoolClient,
    userId: string,
    input: ExecuteOperationalResetInput,
    items: OperationalResetPreviewItemDto[]
  ) {
    const demoRequestIds = items.filter((item) => item.resourceType === "demo_request").map((item) => item.resourceId);
    if (demoRequestIds.length > 0) {
      const note = `Closed as part of staging/demo reset. Reason: ${input.reason}`;
      await client.query(
        `update public.demo_requests
         set status = case when status = 'SPAM' then 'SPAM' else 'CLOSED' end,
             admin_note = coalesce(admin_note || E'\n\n', '') || $2,
             close_reason = coalesce(close_reason, 'Closed as part of staging/demo reset.'),
             reviewed_by = $3,
             reviewed_at = now()
         where id = any($1::uuid[])`,
        [demoRequestIds, note, userId]
      );
    }

    const supportIds = items.filter((item) => item.resourceType === "support_escalation").map((item) => item.resourceId);
    if (supportIds.length > 0) {
      await client.query(
        `update public.support_escalations
         set status = 'RESOLVED',
             resolution_note = 'Closed as part of staging/demo reset.',
             resolution_action = 'NO_ACTION_REQUIRED',
             resolution_reason = 'TEST_OR_DEMO_RECORD',
             resolved_by = $2,
             resolved_at = now()
         where id = any($1::uuid[])
           and status not in ('RESOLVED', 'CANCELLED')`,
        [supportIds, userId]
      );

      for (const item of items.filter((candidate) => candidate.resourceType === "support_escalation")) {
        await client.query(
          `insert into public.support_escalation_events (
             support_escalation_id,
             org_id,
             event_type,
             actor_id,
             actor_label,
             previous_status,
             new_status,
             note,
             metadata
           )
           values ($1, $2, 'RESOLVED', $3, null, $4, 'RESOLVED', 'Closed as part of staging/demo reset.', $5::jsonb)`,
          [
            item.resourceId,
            item.metadata.orgId,
            userId,
            typeof item.metadata.status === "string" ? item.metadata.status : null,
            JSON.stringify({ resetReason: input.reason, resolutionReason: "TEST_OR_DEMO_RECORD" })
          ]
        );
      }
    }
  }

  private async recordItems(client: PoolClient, resetRunId: string, items: OperationalResetPreviewItemDto[]) {
    for (const item of items) {
      await client.query(
        `insert into public.operational_reset_items (
           reset_run_id,
           resource_type,
           resource_id,
           action,
           metadata
         )
         values ($1, $2, $3, $4, $5::jsonb)`,
        [
          resetRunId,
          item.resourceType,
          item.resourceId,
          item.proposedAction,
          JSON.stringify({
            selectionId: item.selectionId,
            label: item.label,
            reason: item.reason,
            proposedAction: item.proposedAction,
            eligible: item.eligible,
            warning: item.warning,
            currentStatus: item.currentStatus,
            createdAt: item.createdAt,
            ...item.metadata
          })
        ]
      );
    }
  }
}
