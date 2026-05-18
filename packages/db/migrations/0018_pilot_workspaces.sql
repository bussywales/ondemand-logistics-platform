create table public.pilot_workspaces (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references public.orgs(id) on delete cascade,
  mode text not null default 'DEMO',
  status text not null default 'DRAFT',
  readiness_stage text not null default 'NOT_STARTED',
  pilot_owner text null,
  support_owner text null,
  courier_owner text null,
  payment_owner text null,
  go_live_target_date date null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pilot_workspaces_mode_check check (
    mode in ('DEMO', 'CONTROLLED_PILOT', 'INTERNAL_TEST', 'LIVE_READY')
  ),
  constraint pilot_workspaces_status_check check (
    status in ('DRAFT', 'ONBOARDING', 'READY_FOR_REHEARSAL', 'IN_REHEARSAL', 'PAUSED', 'ACTIVE', 'CLOSED')
  ),
  constraint pilot_workspaces_readiness_stage_check check (
    readiness_stage in (
      'NOT_STARTED',
      'MERCHANT_SETUP',
      'COURIER_SETUP',
      'PAYMENT_CHECKS',
      'SUPPORT_OWNERS_ASSIGNED',
      'REHEARSAL_READY',
      'PILOT_READY'
    )
  )
);

create table public.pilot_readiness_checks (
  id uuid primary key default gen_random_uuid(),
  pilot_workspace_id uuid not null references public.pilot_workspaces(id) on delete cascade,
  key text not null,
  label text not null,
  status text not null default 'NOT_STARTED',
  evidence text null,
  updated_by uuid null references public.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint pilot_readiness_checks_unique_key unique (pilot_workspace_id, key),
  constraint pilot_readiness_checks_key_check check (
    key in (
      'merchant_profile_ready',
      'menu_ready',
      'courier_pool_ready',
      'payment_flow_verified',
      'support_owner_assigned',
      'escalation_playbook_reviewed',
      'tracking_route_verified',
      'paid_delivery_proof_current',
      'browser_smoke_current',
      'known_limitations_reviewed'
    )
  ),
  constraint pilot_readiness_checks_status_check check (
    status in ('NOT_STARTED', 'IN_PROGRESS', 'PASSED', 'BLOCKED', 'WAIVED')
  )
);

create index pilot_workspaces_status_idx
  on public.pilot_workspaces (status, readiness_stage, updated_at desc);

create index pilot_readiness_checks_workspace_idx
  on public.pilot_readiness_checks (pilot_workspace_id, status, updated_at desc);

create trigger pilot_workspaces_touch_updated_at
before update on public.pilot_workspaces
for each row execute function public.touch_updated_at();

grant select on public.pilot_workspaces to authenticated;
grant select on public.pilot_readiness_checks to authenticated;
grant select, insert, update, delete on public.pilot_workspaces to service_role;
grant select, insert, update, delete on public.pilot_readiness_checks to service_role;

alter table public.pilot_workspaces enable row level security;
alter table public.pilot_readiness_checks enable row level security;

create policy pilot_workspaces_org_member_select
on public.pilot_workspaces
for select
to authenticated
using (
  exists (
    select 1
    from public.org_memberships m
    where m.org_id = pilot_workspaces.org_id
      and m.user_id = auth.uid()
      and m.is_active = true
      and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
  )
);

create policy pilot_workspaces_platform_admin_select
on public.pilot_workspaces
for select
to authenticated
using (
  exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  )
);

create policy pilot_readiness_checks_org_member_select
on public.pilot_readiness_checks
for select
to authenticated
using (
  exists (
    select 1
    from public.pilot_workspaces pw
    join public.org_memberships m on m.org_id = pw.org_id
    where pw.id = pilot_readiness_checks.pilot_workspace_id
      and m.user_id = auth.uid()
      and m.is_active = true
      and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
  )
);

create policy pilot_readiness_checks_platform_admin_select
on public.pilot_readiness_checks
for select
to authenticated
using (
  exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  )
);
