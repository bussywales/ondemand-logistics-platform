alter type public.org_role add value if not exists 'PLATFORM_OWNER';
alter type public.org_role add value if not exists 'PLATFORM_ADMIN';
alter type public.org_role add value if not exists 'PLATFORM_SUPPORT';
alter type public.org_role add value if not exists 'PLATFORM_FINANCE';
alter type public.org_role add value if not exists 'PLATFORM_VIEWER';
alter type public.org_role add value if not exists 'OWNER';
alter type public.org_role add value if not exists 'MANAGER';
alter type public.org_role add value if not exists 'OPERATOR';
alter type public.org_role add value if not exists 'FINANCE_VIEWER';
alter type public.org_role add value if not exists 'SUPPORT_USER';
alter type public.org_role add value if not exists 'MENU_MANAGER';
alter type public.org_role add value if not exists 'FLEET_OWNER';
alter type public.org_role add value if not exists 'FLEET_MANAGER';
alter type public.org_role add value if not exists 'DISPATCHER';
alter type public.org_role add value if not exists 'COMPLIANCE_MANAGER';

create or replace function public.is_org_operator(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.org_memberships m
    where m.org_id = target_org_id
      and m.user_id = auth.uid()
      and m.is_active = true
      and m.role::text in ('BUSINESS_OPERATOR', 'ADMIN', 'OWNER', 'MANAGER', 'OPERATOR', 'SUPPORT_USER', 'MENU_MANAGER')
  );
$$;

alter table public.orgs
  add column if not exists org_type text not null default 'RESTAURANT',
  add column if not exists status text not null default 'ACTIVE';

alter table public.orgs
  add constraint orgs_org_type_allowed
    check (org_type in ('PLATFORM', 'RESTAURANT', 'RETAILER', 'DRIVER_COMPANY', 'INDEPENDENT_COURIER', 'SUPPORT_PARTNER')),
  add constraint orgs_status_allowed
    check (status in ('ACTIVE', 'INACTIVE', 'ONBOARDING', 'SUSPENDED'));

create table public.org_invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  email text not null check (char_length(email) >= 5),
  role public.org_role not null,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'ACCEPTED', 'CANCELLED')),
  invited_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, email)
);

create index org_invitations_org_status_idx
  on public.org_invitations(org_id, status, created_at desc);

create trigger org_invitations_touch_updated_at
before update on public.org_invitations
for each row execute function public.touch_updated_at();

grant select on public.org_invitations to authenticated;
grant select, insert, update, delete on public.org_invitations to service_role;

alter table public.org_invitations enable row level security;

create policy org_invitations_member_select
on public.org_invitations
for select
using (
  public.is_service_role()
  or exists (
    select 1
    from public.org_memberships m
    where m.org_id = org_invitations.org_id
      and m.user_id = auth.uid()
      and m.is_active = true
      and m.role::text in ('BUSINESS_OPERATOR', 'ADMIN', 'OWNER', 'MANAGER', 'OPERATOR', 'SUPPORT_USER')
  )
  or exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
      and pa.is_active = true
  )
);
