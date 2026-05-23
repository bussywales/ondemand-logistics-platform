create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  source text not null default 'public_site' check (char_length(source) between 2 and 80),
  path text null check (path is null or char_length(path) <= 500),
  referrer text null check (referrer is null or char_length(referrer) <= 500),
  session_id text null check (session_id is null or char_length(session_id) <= 120),
  visitor_id text null check (visitor_id is null or char_length(visitor_id) <= 120),
  demo_request_id uuid null references public.demo_requests(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  user_agent_hash text null check (user_agent_hash is null or char_length(user_agent_hash) = 64),
  ip_hash text null check (ip_hash is null or char_length(ip_hash) = 64),
  created_at timestamptz not null default now(),
  constraint analytics_events_name_check check (
    event_name in (
      'PUBLIC_PAGE_VIEW',
      'CTA_CLICKED',
      'PRICING_CTA_CLICKED',
      'DEMO_REQUEST_FORM_STARTED',
      'DEMO_REQUEST_SUBMITTED',
      'DEMO_REQUEST_FAILED',
      'MEGA_MENU_OPENED'
    )
  )
);

create index analytics_events_created_idx
  on public.analytics_events (created_at desc);

create index analytics_events_name_created_idx
  on public.analytics_events (event_name, created_at desc);

create index analytics_events_demo_request_idx
  on public.analytics_events (demo_request_id)
  where demo_request_id is not null;

create index analytics_events_metadata_gin_idx
  on public.analytics_events using gin (metadata);

grant insert on public.analytics_events to anon, authenticated;
grant select on public.analytics_events to authenticated;
grant select, insert, delete on public.analytics_events to service_role;

alter table public.analytics_events enable row level security;

create policy analytics_events_public_insert
on public.analytics_events
for insert
to anon, authenticated
with check (true);

create policy analytics_events_platform_admin_select
on public.analytics_events
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
