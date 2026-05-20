create table public.operational_reset_runs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid null references public.users(id) on delete set null,
  scope text not null,
  mode text not null,
  reason text not null,
  status text not null,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz null,
  constraint operational_reset_runs_mode_check check (
    mode in (
      'PREVIEW',
      'ARCHIVE_DEMO_REQUESTS',
      'CLOSE_TEST_ESCALATIONS',
      'MARK_STALE_PILOT_REHEARSAL',
      'FULL_DEMO_TIDY'
    )
  ),
  constraint operational_reset_runs_status_check check (
    status in ('COMPLETED', 'FAILED')
  ),
  constraint operational_reset_runs_reason_check check (char_length(reason) between 8 and 1000)
);

create table public.operational_reset_items (
  id uuid primary key default gen_random_uuid(),
  reset_run_id uuid not null references public.operational_reset_runs(id) on delete cascade,
  resource_type text not null,
  resource_id uuid not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index operational_reset_runs_created_idx
  on public.operational_reset_runs (created_at desc);

create index operational_reset_items_run_idx
  on public.operational_reset_items (reset_run_id, created_at desc);

create trigger operational_reset_runs_append_only_blocked
before update or delete on public.operational_reset_runs
for each row execute function public.block_update_delete_append_only();

create trigger operational_reset_items_append_only_blocked
before update or delete on public.operational_reset_items
for each row execute function public.block_update_delete_append_only();

grant select on public.operational_reset_runs to authenticated;
grant select on public.operational_reset_items to authenticated;
grant select, insert on public.operational_reset_runs to service_role;
grant select, insert on public.operational_reset_items to service_role;

alter table public.operational_reset_runs enable row level security;
alter table public.operational_reset_items enable row level security;

create policy operational_reset_runs_platform_admin_select
on public.operational_reset_runs
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

create policy operational_reset_items_platform_admin_select
on public.operational_reset_items
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
