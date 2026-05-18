import { Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import {
  BusinessPilotStatusSchema,
  CreatePilotWorkspaceSchema,
  PilotReadinessCheckListSchema,
  PilotReadinessCheckSchema,
  PilotWorkspaceListSchema,
  PilotWorkspaceSchema,
  UpdatePilotReadinessCheckSchema,
  UpdatePilotWorkspaceSchema,
  type BusinessPilotStatusDto,
  type PilotReadinessCheckDto,
  type PilotReadinessCheckKey,
  type PilotWorkspaceDto,
} from "@shipwright/contracts";
import { toIsoDateTime } from "../database/mapper.js";
import { PgService } from "../database/pg.service.js";

const DEFAULT_CHECKS: Array<{ key: PilotReadinessCheckKey; label: string }> = [
  { key: "merchant_profile_ready", label: "Merchant profile ready" },
  { key: "menu_ready", label: "Menu ready" },
  { key: "courier_pool_ready", label: "Courier pool ready" },
  { key: "payment_flow_verified", label: "Payment flow verified" },
  { key: "support_owner_assigned", label: "Support owner assigned" },
  { key: "escalation_playbook_reviewed", label: "Escalation playbook reviewed" },
  { key: "tracking_route_verified", label: "Tracking route verified" },
  { key: "paid_delivery_proof_current", label: "Paid delivery proof current" },
  { key: "browser_smoke_current", label: "Browser smoke current" },
  { key: "known_limitations_reviewed", label: "Known limitations reviewed" }
];

type PilotWorkspaceRow = {
  id: string;
  org_id: string;
  org_name: string | null;
  mode: string;
  status: string;
  readiness_stage: string;
  pilot_owner: string | null;
  support_owner: string | null;
  courier_owner: string | null;
  payment_owner: string | null;
  go_live_target_date: string | Date | null;
  notes: string | null;
  checklist_total: number | string;
  checklist_passed: number | string;
  active_jobs: number | string;
  unresolved_support_escalations: number | string;
  payment_risks: number | string;
  ready_couriers: number | string;
  created_at: string | Date;
  updated_at: string | Date;
};

type PilotReadinessCheckRow = {
  id: string;
  pilot_workspace_id: string;
  key: PilotReadinessCheckKey;
  label: string;
  status: string;
  evidence: string | null;
  updated_by: string | null;
  updated_at: string | Date;
};

function numberValue(value: number | string) {
  return typeof value === "number" ? value : Number.parseInt(value, 10);
}

function dateOnly(value: string | Date | null) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
}

function mapPilotWorkspace(row: PilotWorkspaceRow): PilotWorkspaceDto {
  return PilotWorkspaceSchema.parse({
    id: row.id,
    orgId: row.org_id,
    orgName: row.org_name,
    mode: row.mode,
    status: row.status,
    readinessStage: row.readiness_stage,
    pilotOwner: row.pilot_owner,
    supportOwner: row.support_owner,
    courierOwner: row.courier_owner,
    paymentOwner: row.payment_owner,
    goLiveTargetDate: dateOnly(row.go_live_target_date),
    notes: row.notes,
    checklistTotal: numberValue(row.checklist_total),
    checklistPassed: numberValue(row.checklist_passed),
    posture: {
      activeJobs: numberValue(row.active_jobs),
      unresolvedSupportEscalations: numberValue(row.unresolved_support_escalations),
      paymentRisks: numberValue(row.payment_risks),
      readyCouriers: numberValue(row.ready_couriers)
    },
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at)
  });
}

function mapPilotReadinessCheck(row: PilotReadinessCheckRow): PilotReadinessCheckDto {
  return PilotReadinessCheckSchema.parse({
    id: row.id,
    pilotWorkspaceId: row.pilot_workspace_id,
    key: row.key,
    label: row.label,
    status: row.status,
    evidence: row.evidence,
    updatedBy: row.updated_by,
    updatedAt: toIsoDateTime(row.updated_at)
  });
}

@Injectable()
export class PilotsService {
  constructor(private readonly pg: PgService) {}

  async listAdminPilots() {
    const result = await this.pg.query<PilotWorkspaceRow>(this.workspaceSelectSql());
    return PilotWorkspaceListSchema.parse({ items: result.rows.map(mapPilotWorkspace) });
  }

  async createAdminPilot(rawInput: unknown) {
    const input = CreatePilotWorkspaceSchema.parse(rawInput);
    const result = await this.pg.query<{ id: string }>(
      `insert into public.pilot_workspaces (
         org_id,
         mode,
         status,
         readiness_stage,
         pilot_owner,
         support_owner,
         courier_owner,
         payment_owner,
         go_live_target_date,
         notes
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       on conflict (org_id) do update
       set mode = excluded.mode,
           status = excluded.status,
           readiness_stage = excluded.readiness_stage,
           pilot_owner = excluded.pilot_owner,
           support_owner = excluded.support_owner,
           courier_owner = excluded.courier_owner,
           payment_owner = excluded.payment_owner,
           go_live_target_date = excluded.go_live_target_date,
           notes = excluded.notes
       returning id`,
      [
        input.orgId,
        input.mode,
        input.status,
        input.readinessStage,
        input.pilotOwner ?? null,
        input.supportOwner ?? null,
        input.courierOwner ?? null,
        input.paymentOwner ?? null,
        input.goLiveTargetDate ?? null,
        input.notes ?? null
      ]
    );

    const id = result.rows[0]?.id;
    if (!id) {
      throw new UnprocessableEntityException("pilot_workspace_create_failed");
    }

    await this.ensureDefaultChecks(id);
    return this.getAdminPilotById(id);
  }

  async updateAdminPilot(id: string, rawInput: unknown) {
    const input = UpdatePilotWorkspaceSchema.parse(rawInput);
    const assignments: string[] = [];
    const values: unknown[] = [id];

    const add = (column: string, value: unknown) => {
      assignments.push(`${column} = $${values.length + 1}`);
      values.push(value);
    };

    if (input.mode !== undefined) add("mode", input.mode);
    if (input.status !== undefined) add("status", input.status);
    if (input.readinessStage !== undefined) add("readiness_stage", input.readinessStage);
    if (input.pilotOwner !== undefined) add("pilot_owner", input.pilotOwner);
    if (input.supportOwner !== undefined) add("support_owner", input.supportOwner);
    if (input.courierOwner !== undefined) add("courier_owner", input.courierOwner);
    if (input.paymentOwner !== undefined) add("payment_owner", input.paymentOwner);
    if (input.goLiveTargetDate !== undefined) add("go_live_target_date", input.goLiveTargetDate);
    if (input.notes !== undefined) add("notes", input.notes);

    const result = await this.pg.query<{ id: string }>(
      `update public.pilot_workspaces
       set ${assignments.join(", ")}
       where id = $1
       returning id`,
      values
    );

    if (!result.rows[0]) {
      throw new NotFoundException("pilot_workspace_not_found");
    }

    return this.getAdminPilotById(id);
  }

  async listAdminPilotChecks(pilotId: string) {
    await this.assertPilotExists(pilotId);
    await this.ensureDefaultChecks(pilotId);
    const result = await this.pg.query<PilotReadinessCheckRow>(
      `${this.checksSelectSql()} where c.pilot_workspace_id = $1 order by c.updated_at desc`,
      [pilotId]
    );
    return PilotReadinessCheckListSchema.parse({ items: result.rows.map(mapPilotReadinessCheck) });
  }

  async updateAdminPilotCheck(userId: string, pilotId: string, checkId: string, rawInput: unknown) {
    const input = UpdatePilotReadinessCheckSchema.parse(rawInput);
    const assignments: string[] = ["updated_by = $3", "updated_at = now()"];
    const values: unknown[] = [pilotId, checkId, userId];

    const add = (column: string, value: unknown) => {
      assignments.push(`${column} = $${values.length + 1}`);
      values.push(value);
    };

    if (input.status !== undefined) add("status", input.status);
    if (input.evidence !== undefined) add("evidence", input.evidence);

    const result = await this.pg.query<PilotReadinessCheckRow>(
      `with updated as (
         update public.pilot_readiness_checks c
         set ${assignments.join(", ")}
         where c.pilot_workspace_id = $1
           and c.id = $2
         returning c.id
       )
       ${this.checksSelectSql()}
       join updated on updated.id = c.id`,
      values
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("pilot_readiness_check_not_found");
    }

    return mapPilotReadinessCheck(row);
  }

  async getBusinessPilotStatus(userId: string): Promise<BusinessPilotStatusDto> {
    const workspace = await this.pg.query<PilotWorkspaceRow>(
      `${this.workspaceSelectSql()}
       where exists (
         select 1
         from public.org_memberships m
         where m.org_id = pw.org_id
           and m.user_id = $1
           and m.is_active = true
           and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
       )
       order by pw.updated_at desc
       limit 1`,
      [userId]
    );

    const mappedWorkspace = workspace.rows[0] ? mapPilotWorkspace(workspace.rows[0]) : null;
    const checks = mappedWorkspace
      ? await this.pg.query<PilotReadinessCheckRow>(
          `${this.checksSelectSql()} where c.pilot_workspace_id = $1 order by c.updated_at desc`,
          [mappedWorkspace.id]
        )
      : { rows: [] };

    return BusinessPilotStatusSchema.parse({
      workspace: mappedWorkspace,
      checks: checks.rows.map(mapPilotReadinessCheck),
      guidance: mappedWorkspace
        ? "Pilot mode is informational in v1. Operators remain responsible for readiness review before live use."
        : "No pilot profile is configured for this workspace yet."
    });
  }

  private async getAdminPilotById(id: string) {
    const result = await this.pg.query<PilotWorkspaceRow>(
      `${this.workspaceSelectSql()} where pw.id = $1`,
      [id]
    );
    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("pilot_workspace_not_found");
    }
    return mapPilotWorkspace(row);
  }

  private async assertPilotExists(id: string) {
    const result = await this.pg.query<{ id: string }>(
      `select id from public.pilot_workspaces where id = $1`,
      [id]
    );
    if (!result.rows[0]) {
      throw new NotFoundException("pilot_workspace_not_found");
    }
  }

  private async ensureDefaultChecks(pilotWorkspaceId: string) {
    await this.pg.query(
      `insert into public.pilot_readiness_checks (pilot_workspace_id, key, label)
       select $1, item.key, item.label
       from jsonb_to_recordset($2::jsonb) as item(key text, label text)
       on conflict (pilot_workspace_id, key) do nothing`,
      [pilotWorkspaceId, JSON.stringify(DEFAULT_CHECKS)]
    );
  }

  private workspaceSelectSql() {
    return `select
        pw.id,
        pw.org_id,
        org.name as org_name,
        pw.mode,
        pw.status,
        pw.readiness_stage,
        pw.pilot_owner,
        pw.support_owner,
        pw.courier_owner,
        pw.payment_owner,
        pw.go_live_target_date,
        pw.notes,
        pw.created_at,
        pw.updated_at,
        coalesce(check_counts.total, 0) as checklist_total,
        coalesce(check_counts.passed, 0) as checklist_passed,
        coalesce(job_counts.active_jobs, 0) as active_jobs,
        coalesce(support_counts.unresolved_support_escalations, 0) as unresolved_support_escalations,
        coalesce(payment_counts.payment_risks, 0) as payment_risks,
        coalesce(courier_counts.ready_couriers, 0) as ready_couriers
      from public.pilot_workspaces pw
      join public.orgs org on org.id = pw.org_id
      left join lateral (
        select count(*) as total,
               count(*) filter (where c.status in ('PASSED', 'WAIVED')) as passed
        from public.pilot_readiness_checks c
        where c.pilot_workspace_id = pw.id
      ) check_counts on true
      left join lateral (
        select count(*) as active_jobs
        from public.jobs j
        where j.org_id = pw.org_id
          and j.status in ('REQUESTED', 'ASSIGNED', 'EN_ROUTE_PICKUP', 'PICKED_UP', 'EN_ROUTE_DROP', 'IN_PROGRESS')
      ) job_counts on true
      left join lateral (
        select count(*) as unresolved_support_escalations
        from public.support_escalations se
        where se.org_id = pw.org_id
          and se.status in ('OPEN', 'IN_REVIEW', 'WAITING_ON_CUSTOMER', 'WAITING_ON_MERCHANT', 'WAITING_ON_COURIER')
      ) support_counts on true
      left join lateral (
        select count(*) as payment_risks
        from public.customer_orders o
        join public.payments p on p.id = o.payment_id
        left join public.payout_ledger pl on pl.payment_id = p.id
        where o.org_id = pw.org_id
          and (
            p.status = 'FAILED'
            or o.status = 'PAYMENT_FAILED'
            or (exists (select 1 from public.jobs j where j.id = o.job_id and j.status = 'DELIVERED') and p.status <> 'CAPTURED')
            or pl.status = 'FAILED'
            or pl.hold_reason is not null
          )
      ) payment_counts on true
      left join lateral (
        select count(*) as ready_couriers
        from public.drivers d
        join public.driver_verifications dv on dv.driver_id = d.id
        join public.driver_vehicle vehicle on vehicle.driver_id = d.id
        where d.home_org_id = pw.org_id
          and d.availability_status = 'ONLINE'
          and dv.status = 'APPROVED'
      ) courier_counts on true`;
  }

  private checksSelectSql() {
    return `select
        c.id,
        c.pilot_workspace_id,
        c.key,
        c.label,
        c.status,
        c.evidence,
        c.updated_by,
        c.updated_at
      from public.pilot_readiness_checks c`;
  }
}
