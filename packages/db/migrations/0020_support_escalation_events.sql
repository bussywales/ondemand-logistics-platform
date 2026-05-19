create table public.support_escalation_events (
  id uuid primary key default gen_random_uuid(),
  support_escalation_id uuid not null references public.support_escalations(id) on delete cascade,
  org_id uuid not null references public.orgs(id) on delete cascade,
  event_type text not null,
  actor_id uuid null references public.users(id) on delete set null,
  actor_label text null,
  previous_status text null,
  new_status text null,
  note text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint support_escalation_events_type_check check (
    event_type in (
      'CREATED',
      'STATUS_CHANGED',
      'NOTE_UPDATED',
      'OWNER_UPDATED',
      'CONTACT_FLAGS_UPDATED',
      'RESOLVED',
      'CANCELLED',
      'REOPENED',
      'RESOLUTION_UPDATED'
    )
  )
);

create index support_escalation_events_escalation_created_idx
  on public.support_escalation_events (support_escalation_id, created_at desc);

create index support_escalation_events_org_created_idx
  on public.support_escalation_events (org_id, created_at desc);

create trigger support_escalation_events_append_only_blocked
before update or delete on public.support_escalation_events
for each row execute function public.block_update_delete_append_only();

grant select on public.support_escalation_events to authenticated;
grant select, insert on public.support_escalation_events to service_role;

alter table public.support_escalation_events enable row level security;

create policy support_escalation_events_org_member_select
on public.support_escalation_events
for select
to authenticated
using (
  exists (
    select 1
    from public.org_memberships m
    where m.org_id = support_escalation_events.org_id
      and m.user_id = auth.uid()
      and m.is_active = true
      and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
  )
);

create policy support_escalation_events_platform_admin_select
on public.support_escalation_events
for select
to authenticated
using (
  exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  )
);
