create table public.validation_evidence_runs (
  id uuid primary key default gen_random_uuid(),
  evidence_type text not null,
  status text not null,
  environment text not null default 'staging',
  source text not null,
  command text null,
  summary jsonb not null default '{}'::jsonb,
  artifact_path text null,
  related_order_id uuid null,
  related_job_id uuid null,
  related_payment_id uuid null,
  related_pod_id uuid null,
  created_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint validation_evidence_runs_evidence_type_check check (
    evidence_type in (
      'RELEASE_VERIFY',
      'PAID_DELIVERY_PROOF',
      'PLAYWRIGHT_SMOKE',
      'PLAYWRIGHT_SMOKE_REQUIRED_AUTH'
    )
  ),
  constraint validation_evidence_runs_status_check check (
    status in ('PASSED', 'FAILED', 'SKIPPED', 'UNKNOWN')
  ),
  constraint validation_evidence_runs_environment_check check (char_length(environment) between 2 and 80),
  constraint validation_evidence_runs_source_check check (char_length(source) between 2 and 160)
);

create index validation_evidence_runs_latest_idx
  on public.validation_evidence_runs (environment, evidence_type, created_at desc);

create index validation_evidence_runs_order_idx
  on public.validation_evidence_runs (related_order_id)
  where related_order_id is not null;

create index validation_evidence_runs_job_idx
  on public.validation_evidence_runs (related_job_id)
  where related_job_id is not null;

grant select on public.validation_evidence_runs to authenticated;
grant select, insert on public.validation_evidence_runs to service_role;

alter table public.validation_evidence_runs enable row level security;

create policy validation_evidence_runs_platform_admin_select
on public.validation_evidence_runs
for select
to authenticated
using (
  exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
      and pa.is_active = true
  )
);
