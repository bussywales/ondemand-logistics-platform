create type public.driver_availability_status as enum ('ONLINE', 'OFFLINE');

create type public.job_offer_status as enum (
  'OFFERED',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED'
);

alter type public.job_status add value if not exists 'REQUESTED';

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.orgs (id) on delete restrict,
  created_by_user_id uuid not null references public.users (id) on delete restrict,
  distance_miles numeric(5,2) not null check (distance_miles > 0 and distance_miles <= 12),
  eta_minutes integer not null check (eta_minutes > 0 and eta_minutes <= 240),
  vehicle_type public.vehicle_type not null,
  time_of_day text not null check (time_of_day in ('BREAKFAST', 'LUNCH', 'AFTERNOON', 'DINNER', 'OVERNIGHT')),
  demand_flag boolean not null default false,
  weather_flag boolean not null default false,
  customer_total_cents integer not null check (customer_total_cents >= 0),
  driver_payout_gross_cents integer not null check (driver_payout_gross_cents >= 0),
  platform_fee_cents integer not null check (platform_fee_cents >= 0),
  premium_distance_flag boolean not null,
  pricing_version text not null check (char_length(pricing_version) >= 3),
  breakdown_lines jsonb not null default '[]'::jsonb,
  quote_input jsonb not null,
  quote_output jsonb not null,
  created_at timestamptz not null default now(),
  check (platform_fee_cents + driver_payout_gross_cents = customer_total_cents),
  check (premium_distance_flag = (distance_miles > 8 and distance_miles <= 12))
);

create index quotes_creator_created_idx
  on public.quotes (created_by_user_id, created_at desc);

create index quotes_org_created_idx
  on public.quotes (org_id, created_at desc)
  where org_id is not null;

alter table public.jobs rename column quoted_payout_cents to driver_payout_gross_cents;
alter table public.jobs rename column supply_type to vehicle_required;
alter table public.jobs rename column created_by to created_by_user_id;
alter table public.jobs alter column org_id drop not null;
alter table public.jobs alter column status set default 'REQUESTED';

alter table public.jobs
  add column quote_id uuid references public.quotes (id) on delete restrict,
  add column eta_minutes integer check (eta_minutes > 0 and eta_minutes <= 240),
  add column customer_total_cents integer check (customer_total_cents >= 0),
  add column platform_fee_cents integer check (platform_fee_cents >= 0),
  add column pricing_version text check (char_length(pricing_version) >= 3),
  add column premium_distance_flag boolean,
  add column pickup_latitude numeric(9,6) check (pickup_latitude between -90 and 90),
  add column pickup_longitude numeric(9,6) check (pickup_longitude between -180 and 180),
  add column dropoff_latitude numeric(9,6) check (dropoff_latitude between -90 and 90),
  add column dropoff_longitude numeric(9,6) check (dropoff_longitude between -180 and 180),
  add column dispatch_requested_at timestamptz,
  add column dispatch_failed_at timestamptz;

update public.jobs
set eta_minutes = coalesce(eta_minutes, greatest(1, ceil(distance_miles * 7)::int)),
    customer_total_cents = coalesce(customer_total_cents, driver_payout_gross_cents),
    platform_fee_cents = coalesce(platform_fee_cents, 0),
    pricing_version = coalesce(pricing_version, 'legacy_v0'),
    premium_distance_flag = coalesce(premium_distance_flag, soft_cap_exceeded),
    dispatch_requested_at = coalesce(dispatch_requested_at, created_at);

alter table public.jobs
  alter column eta_minutes set not null,
  alter column customer_total_cents set not null,
  alter column platform_fee_cents set not null,
  alter column pricing_version set not null,
  alter column premium_distance_flag set not null,
  alter column dispatch_requested_at set not null;

alter table public.jobs
  add constraint jobs_pricing_totals_check
  check (platform_fee_cents + driver_payout_gross_cents = customer_total_cents);

alter table public.jobs
  add constraint jobs_premium_flag_check
  check (premium_distance_flag = (distance_miles > 8 and distance_miles <= 12));

alter table public.jobs
  add constraint jobs_quote_required_for_requested_check
  check (
    status <> 'REQUESTED'
    or (
      quote_id is not null
      and pricing_version <> 'legacy_v0'
    )
  );

alter table public.jobs drop constraint jobs_org_idempotency_key_key;

drop index if exists public.jobs_org_status_idx;
create index jobs_org_status_idx on public.jobs (org_id, status);
create unique index jobs_creator_idempotency_idx
  on public.jobs (created_by_user_id, idempotency_key);
create unique index jobs_quote_id_unique_idx
  on public.jobs (quote_id)
  where quote_id is not null;
create index jobs_requested_idx
  on public.jobs (status, dispatch_requested_at)
  where status = 'REQUESTED';

alter table public.drivers
  add column availability_status public.driver_availability_status not null default 'OFFLINE',
  add column available_since timestamptz,
  add column latest_latitude numeric(9,6) check (latest_latitude between -90 and 90),
  add column latest_longitude numeric(9,6) check (latest_longitude between -180 and 180),
  add column last_location_at timestamptz,
  add column reliability_score numeric(4,3) not null default 0.500 check (reliability_score >= 0 and reliability_score <= 1),
  add column active_job_id uuid references public.jobs (id) on delete set null;

create index drivers_dispatch_idx
  on public.drivers (availability_status, is_active, active_job_id, latest_latitude, latest_longitude);

create table public.job_offers (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  driver_id uuid not null references public.drivers (id) on delete cascade,
  offered_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status public.job_offer_status not null default 'OFFERED',
  payout_gross_snapshot integer not null check (payout_gross_snapshot >= 0),
  distance_miles_snapshot numeric(5,2) not null check (distance_miles_snapshot > 0 and distance_miles_snapshot <= 12),
  eta_minutes_snapshot integer not null check (eta_minutes_snapshot > 0 and eta_minutes_snapshot <= 240),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (job_id, driver_id),
  check (expires_at > offered_at),
  check (
    (status in ('ACCEPTED', 'REJECTED', 'EXPIRED') and responded_at is not null)
    or (status = 'OFFERED' and responded_at is null)
  )
);

create index job_offers_job_created_idx
  on public.job_offers (job_id, offered_at desc);

create index job_offers_driver_status_idx
  on public.job_offers (driver_id, status, expires_at desc);

create unique index job_offers_one_active_offer_idx
  on public.job_offers (job_id)
  where status = 'OFFERED';

create unique index job_offers_one_accepted_offer_idx
  on public.job_offers (job_id)
  where status = 'ACCEPTED';

create trigger quotes_append_only_update_blocked
before update or delete on public.quotes
for each row execute function public.block_update_delete_append_only();

alter table public.driver_verifications enable row level security;
alter table public.quotes enable row level security;
alter table public.job_offers enable row level security;

drop policy if exists drivers_self_or_operator_select on public.drivers;
create policy drivers_self_or_operator_select
on public.drivers
for select
using (
  user_id = auth.uid()
  or (home_org_id is not null and public.is_org_operator(home_org_id))
  or public.is_service_role()
);

create policy drivers_self_or_operator_update
on public.drivers
for update
using (
  user_id = auth.uid()
  or (home_org_id is not null and public.is_org_operator(home_org_id))
  or public.is_service_role()
)
with check (
  user_id = auth.uid()
  or (home_org_id is not null and public.is_org_operator(home_org_id))
  or public.is_service_role()
);

create policy driver_verifications_visibility
on public.driver_verifications
for select
using (
  exists (
    select 1
    from public.drivers d
    where d.id = driver_verifications.driver_id
      and (
        d.user_id = auth.uid()
        or (d.home_org_id is not null and public.is_org_operator(d.home_org_id))
      )
  )
  or public.is_service_role()
);

create policy quotes_select_policy
on public.quotes
for select
using (
  created_by_user_id = auth.uid()
  or (org_id is not null and public.is_org_operator(org_id))
  or public.is_service_role()
);

create policy quotes_insert_policy
on public.quotes
for insert
with check (
  public.is_service_role()
  or (
    created_by_user_id = auth.uid()
    and org_id is null
  )
  or (
    created_by_user_id = auth.uid()
    and org_id is not null
    and public.is_org_operator(org_id)
  )
);

drop policy if exists jobs_select_policy on public.jobs;
create policy jobs_select_policy
on public.jobs
for select
using (
  consumer_id = auth.uid()
  or exists (
    select 1
    from public.drivers d
    where d.id = jobs.assigned_driver_id
      and d.user_id = auth.uid()
  )
  or (org_id is not null and public.is_org_operator(org_id))
  or public.is_service_role()
);

drop policy if exists jobs_insert_policy on public.jobs;
create policy jobs_insert_policy
on public.jobs
for insert
with check (
  public.is_service_role()
  or (
    consumer_id = auth.uid()
    and created_by_user_id = auth.uid()
    and org_id is null
  )
  or (
    created_by_user_id = auth.uid()
    and org_id is not null
    and public.is_org_operator(org_id)
  )
);

drop policy if exists jobs_update_policy on public.jobs;
create policy jobs_update_policy
on public.jobs
for update
using (
  public.is_service_role()
  or (org_id is not null and public.is_org_operator(org_id))
  or exists (
    select 1
    from public.drivers d
    where d.id = jobs.assigned_driver_id
      and d.user_id = auth.uid()
  )
)
with check (
  public.is_service_role()
  or (org_id is not null and public.is_org_operator(org_id))
  or exists (
    select 1
    from public.drivers d
    where d.id = jobs.assigned_driver_id
      and d.user_id = auth.uid()
  )
);

create policy job_offers_select_policy
on public.job_offers
for select
using (
  public.is_service_role()
  or exists (
    select 1
    from public.drivers d
    where d.id = job_offers.driver_id
      and d.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.jobs j
    where j.id = job_offers.job_id
      and (
        j.consumer_id = auth.uid()
        or (j.org_id is not null and public.is_org_operator(j.org_id))
      )
  )
);

create policy job_offers_insert_service_only
on public.job_offers
for insert
with check (public.is_service_role());

create policy job_offers_update_service_only
on public.job_offers
for update
using (public.is_service_role())
with check (public.is_service_role());

grant select on public.driver_verifications to authenticated;
grant select, insert on public.quotes to authenticated;
grant select on public.job_offers to authenticated;
grant update on public.drivers to authenticated;
