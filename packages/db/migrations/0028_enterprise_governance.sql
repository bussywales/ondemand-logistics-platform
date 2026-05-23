alter table public.orgs
  drop constraint if exists orgs_status_allowed;

alter table public.orgs
  add constraint orgs_status_allowed
    check (status in ('ACTIVE', 'INACTIVE', 'ONBOARDING', 'SUSPENDED', 'CLOSED'));

alter table public.users
  add column if not exists status text not null default 'ACTIVE';

alter table public.users
  drop constraint if exists users_status_allowed;

alter table public.users
  add constraint users_status_allowed
    check (status in ('ACTIVE', 'SUSPENDED', 'DISABLED'));

create index if not exists users_status_updated_idx
  on public.users (status, updated_at desc);

create index if not exists orgs_status_updated_idx
  on public.orgs (status, updated_at desc);
