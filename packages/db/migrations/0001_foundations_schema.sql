create extension if not exists pgcrypto;

create type public.org_role as enum (
  'CONSUMER',
  'DRIVER',
  'BUSINESS_OPERATOR',
  'ADMIN'
);

create type public.vehicle_type as enum ('BIKE', 'CAR');

create type public.driver_verification_status as enum (
  'PENDING',
  'APPROVED',
  'REJECTED'
);

create type public.job_status as enum (
  'CREATED',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
);

create table public.users (
  id uuid primary key,
  email text not null unique,
  display_name text not null check (char_length(display_name) >= 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) >= 2),
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.org_memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role public.org_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  home_org_id uuid references public.orgs (id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.driver_verifications (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers (id) on delete cascade,
  status public.driver_verification_status not null default 'PENDING',
  document_type text not null check (char_length(document_type) >= 2),
  document_url text not null check (char_length(document_url) >= 8),
  reviewed_by uuid references public.users (id),
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.driver_vehicle (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers (id) on delete cascade,
  vehicle_type public.vehicle_type not null,
  plate_number text,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (vehicle_type = 'BIKE' and plate_number is null)
    or (vehicle_type = 'CAR' and plate_number is not null)
  )
);

create unique index driver_vehicle_primary_idx
  on public.driver_vehicle (driver_id)
  where is_primary;

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete restrict,
  consumer_id uuid not null references public.users (id) on delete restrict,
  assigned_driver_id uuid references public.drivers (id) on delete restrict,
  status public.job_status not null default 'CREATED',
  pickup_address text not null check (char_length(pickup_address) >= 3),
  dropoff_address text not null check (char_length(dropoff_address) >= 3),
  distance_miles numeric(5,2) not null check (distance_miles > 0 and distance_miles <= 12),
  soft_cap_exceeded boolean generated always as (distance_miles > 8) stored,
  quoted_payout_cents integer not null check (quoted_payout_cents >= 0),
  supply_type public.vehicle_type not null,
  idempotency_key text not null check (char_length(idempotency_key) >= 8),
  created_by uuid not null references public.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, idempotency_key)
);

create index jobs_org_status_idx on public.jobs (org_id, status);
create index jobs_consumer_idx on public.jobs (consumer_id);
create index jobs_driver_idx on public.jobs (assigned_driver_id);

create table public.job_events (
  id bigserial primary key,
  job_id uuid not null references public.jobs (id) on delete cascade,
  event_type text not null check (char_length(event_type) >= 3),
  payload jsonb not null default '{}'::jsonb,
  actor_id uuid references public.users (id),
  created_at timestamptz not null default now()
);

create index job_events_job_created_idx on public.job_events (job_id, created_at desc);

create table public.audit_log (
  id bigserial primary key,
  request_id uuid not null,
  actor_id uuid references public.users (id),
  org_id uuid references public.orgs (id),
  entity_type text not null check (char_length(entity_type) >= 2),
  entity_id uuid,
  action text not null check (char_length(action) >= 2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id, created_at desc);

create table public.outbox_messages (
  id uuid primary key default gen_random_uuid(),
  aggregate_type text not null check (char_length(aggregate_type) >= 2),
  aggregate_id uuid not null,
  event_type text not null check (char_length(event_type) >= 2),
  payload jsonb not null,
  idempotency_key text not null check (char_length(idempotency_key) >= 8),
  retry_count integer not null default 0 check (retry_count >= 0),
  next_attempt_at timestamptz not null default now(),
  last_error text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_type, idempotency_key)
);

create index outbox_poll_idx on public.outbox_messages (processed_at, next_attempt_at, created_at);

create table public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.users (id) on delete cascade,
  key text not null check (char_length(key) >= 8),
  endpoint text not null check (char_length(endpoint) >= 3),
  response_code integer,
  response_body jsonb,
  created_at timestamptz not null default now(),
  unique (actor_id, endpoint, key)
);

create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_touch_updated_at
before update on public.users
for each row execute function public.touch_updated_at();

create trigger orgs_touch_updated_at
before update on public.orgs
for each row execute function public.touch_updated_at();

create trigger org_memberships_touch_updated_at
before update on public.org_memberships
for each row execute function public.touch_updated_at();

create trigger drivers_touch_updated_at
before update on public.drivers
for each row execute function public.touch_updated_at();

create trigger driver_verifications_touch_updated_at
before update on public.driver_verifications
for each row execute function public.touch_updated_at();

create trigger driver_vehicle_touch_updated_at
before update on public.driver_vehicle
for each row execute function public.touch_updated_at();

create trigger jobs_touch_updated_at
before update on public.jobs
for each row execute function public.touch_updated_at();

create function public.block_update_delete_append_only()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception '% is append-only and cannot be updated', tg_table_name;
  end if;
  raise exception '% is append-only and cannot be deleted', tg_table_name;
end;
$$;

create function public.restrict_outbox_update()
returns trigger
language plpgsql
as $$
begin
  if old.id <> new.id
    or old.aggregate_type <> new.aggregate_type
    or old.aggregate_id <> new.aggregate_id
    or old.event_type <> new.event_type
    or old.payload <> new.payload
    or old.idempotency_key <> new.idempotency_key
    or old.created_at <> new.created_at then
    raise exception 'outbox_messages is append-only for immutable fields';
  end if;

  if old.processed_at is not null and new.processed_at is distinct from old.processed_at then
    raise exception 'processed_at cannot be modified after success';
  end if;

  return new;
end;
$$;

create trigger job_events_append_only
before update or delete on public.job_events
for each row execute function public.block_update_delete_append_only();

create trigger audit_log_append_only
before update or delete on public.audit_log
for each row execute function public.block_update_delete_append_only();

create trigger outbox_delete_blocked
before delete on public.outbox_messages
for each row execute function public.block_update_delete_append_only();

create trigger outbox_update_restricted
before update on public.outbox_messages
for each row execute function public.restrict_outbox_update();

grant usage on schema public to authenticated;
grant select, insert, update on public.users to authenticated;
grant select on public.orgs to authenticated;
grant select on public.org_memberships to authenticated;
grant select on public.jobs to authenticated;
grant select on public.job_events to authenticated;
grant select on public.driver_vehicle to authenticated;
grant select on public.drivers to authenticated;

grant insert on public.idempotency_keys to authenticated;

grant select, insert, update on public.outbox_messages to service_role;
grant insert on public.audit_log to service_role;
grant insert on public.job_events to service_role;
grant update on public.jobs to service_role;
