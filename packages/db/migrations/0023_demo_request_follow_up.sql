alter table public.demo_requests
  add column assigned_owner text null check (assigned_owner is null or char_length(assigned_owner) between 2 and 160),
  add column next_follow_up_at timestamptz null,
  add column follow_up_priority text null,
  add column last_contacted_at timestamptz null,
  add column close_reason text null check (close_reason is null or char_length(close_reason) between 2 and 500),
  add constraint demo_requests_follow_up_priority_check check (
    follow_up_priority is null or follow_up_priority in ('LOW', 'MEDIUM', 'HIGH', 'URGENT')
  );

create index demo_requests_follow_up_idx
  on public.demo_requests (next_follow_up_at asc nulls last, status, follow_up_priority);

create index demo_requests_owner_created_idx
  on public.demo_requests (lower(assigned_owner), created_at desc)
  where assigned_owner is not null;

create table public.demo_request_events (
  id uuid primary key default gen_random_uuid(),
  demo_request_id uuid not null references public.demo_requests(id) on delete cascade,
  event_type text not null,
  actor_id uuid null references public.users(id) on delete set null,
  actor_label text null,
  previous_status text null,
  new_status text null,
  note text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint demo_request_events_type_check check (
    event_type in (
      'CREATED',
      'STATUS_CHANGED',
      'NOTE_UPDATED',
      'OWNER_ASSIGNED',
      'FOLLOW_UP_SCHEDULED',
      'CONTACT_RECORDED',
      'PRIORITY_CHANGED',
      'CLOSED',
      'REOPENED'
    )
  )
);

create index demo_request_events_request_created_idx
  on public.demo_request_events (demo_request_id, created_at desc);

create trigger demo_request_events_append_only_blocked
before update or delete on public.demo_request_events
for each row execute function public.block_update_delete_append_only();

grant select on public.demo_request_events to authenticated;
grant select, insert on public.demo_request_events to service_role;

alter table public.demo_request_events enable row level security;

create policy demo_request_events_platform_admin_select
on public.demo_request_events
for select
to authenticated
using (
  public.is_service_role()
  or exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
      and pa.is_active = true
  )
);
