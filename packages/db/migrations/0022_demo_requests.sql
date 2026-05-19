create table public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  email text not null check (char_length(email) between 5 and 254 and position('@' in email) > 1),
  organisation text null check (organisation is null or char_length(organisation) between 2 and 160),
  role text null check (role is null or char_length(role) between 2 and 120),
  interest_type text not null,
  message text null check (message is null or char_length(message) between 3 and 2000),
  source text null default 'landing_page' check (source is null or char_length(source) between 2 and 80),
  status text not null default 'NEW',
  admin_note text null check (admin_note is null or char_length(admin_note) between 2 and 2000),
  reviewed_by uuid null references public.users(id) on delete set null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint demo_requests_interest_type_check check (
    interest_type in ('PILOT_MERCHANT', 'OPERATOR_PLATFORM', 'INVESTOR_PARTNER', 'OTHER')
  ),
  constraint demo_requests_status_check check (
    status in ('NEW', 'REVIEWED', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'SPAM')
  )
);

create index demo_requests_status_created_idx
  on public.demo_requests (status, created_at desc);

create index demo_requests_email_created_idx
  on public.demo_requests (lower(email), created_at desc);

create trigger demo_requests_touch_updated_at
before update on public.demo_requests
for each row execute function public.touch_updated_at();

grant insert on public.demo_requests to anon, authenticated;
grant select, update on public.demo_requests to authenticated;
grant select, insert, update, delete on public.demo_requests to service_role;

alter table public.demo_requests enable row level security;

create policy demo_requests_public_insert
on public.demo_requests
for insert
to anon, authenticated
with check (true);

create policy demo_requests_platform_admin_select
on public.demo_requests
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

create policy demo_requests_platform_admin_update
on public.demo_requests
for update
to authenticated
using (
  public.is_service_role()
  or exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
      and pa.is_active = true
  )
)
with check (
  public.is_service_role()
  or exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
      and pa.is_active = true
  )
);
