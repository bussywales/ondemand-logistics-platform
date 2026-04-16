create type public.payment_provider as enum ('stripe');

create type public.payment_status as enum (
  'REQUIRES_PAYMENT_METHOD',
  'REQUIRES_CONFIRMATION',
  'AUTHORIZED',
  'CAPTURED',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
  'FAILED',
  'CANCELLED'
);

create type public.refund_status as enum (
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED'
);

create type public.payout_ledger_status as enum (
  'PENDING',
  'READY',
  'PAID',
  'FAILED',
  'CANCELLED'
);

alter table public.jobs
  add column cancellation_settlement_snapshot jsonb not null default '{}'::jsonb;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.jobs (id) on delete cascade,
  provider public.payment_provider not null default 'stripe',
  provider_payment_intent_id text unique,
  status public.payment_status not null default 'REQUIRES_PAYMENT_METHOD',
  amount_authorized_cents integer not null default 0 check (amount_authorized_cents >= 0),
  amount_captured_cents integer not null default 0 check (amount_captured_cents >= 0),
  amount_refunded_cents integer not null default 0 check (amount_refunded_cents >= 0),
  currency text not null default 'gbp' check (char_length(currency) = 3),
  customer_total_cents integer not null check (customer_total_cents >= 0),
  platform_fee_cents integer not null check (platform_fee_cents >= 0),
  payout_gross_cents integer not null check (payout_gross_cents >= 0),
  settlement_snapshot jsonb not null default '{}'::jsonb,
  client_secret text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (amount_captured_cents <= amount_authorized_cents or amount_authorized_cents = 0),
  check (amount_refunded_cents <= amount_captured_cents)
);

create index payments_status_created_idx
  on public.payments (status, created_at desc);

create table public.payment_events (
  id bigserial primary key,
  payment_id uuid references public.payments (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete cascade,
  event_type text not null check (char_length(event_type) >= 3),
  previous_status public.payment_status,
  next_status public.payment_status,
  provider_event_id text,
  payload jsonb not null default '{}'::jsonb,
  request_id uuid,
  created_at timestamptz not null default now()
);

create unique index payment_events_provider_event_unique_idx
  on public.payment_events (provider_event_id)
  where provider_event_id is not null;

create index payment_events_payment_created_idx
  on public.payment_events (payment_id, created_at desc);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  provider_refund_id text unique,
  status public.refund_status not null default 'PENDING',
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'gbp' check (char_length(currency) = 3),
  reason_code text not null check (char_length(reason_code) >= 3),
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index refunds_payment_created_idx
  on public.refunds (payment_id, created_at desc);

create table public.payout_ledger (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.jobs (id) on delete cascade,
  driver_id uuid not null references public.drivers (id) on delete restrict,
  payment_id uuid references public.payments (id) on delete set null,
  status public.payout_ledger_status not null default 'PENDING',
  gross_payout_cents integer not null check (gross_payout_cents >= 0),
  hold_reason text,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payout_ledger_driver_status_idx
  on public.payout_ledger (driver_id, status, created_at desc);

create trigger payments_touch_updated_at
before update on public.payments
for each row execute function public.touch_updated_at();

create trigger refunds_touch_updated_at
before update on public.refunds
for each row execute function public.touch_updated_at();

create trigger payout_ledger_touch_updated_at
before update on public.payout_ledger
for each row execute function public.touch_updated_at();

create trigger payment_events_append_only_blocked
before update or delete on public.payment_events
for each row execute function public.block_update_delete_append_only();

alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.refunds enable row level security;
alter table public.payout_ledger enable row level security;

create policy payments_select_policy
on public.payments
for select
using (
  exists (
    select 1
    from public.jobs j
    where j.id = payments.job_id
      and (
        j.consumer_id = auth.uid()
        or (j.org_id is not null and public.is_org_operator(j.org_id))
        or exists (
          select 1
          from public.drivers d
          where d.id = j.assigned_driver_id
            and d.user_id = auth.uid()
        )
      )
  )
  or public.is_service_role()
);

create policy payments_write_service_only
on public.payments
for all
using (public.is_service_role())
with check (public.is_service_role());

create policy payment_events_select_policy
on public.payment_events
for select
using (
  exists (
    select 1
    from public.jobs j
    where j.id = payment_events.job_id
      and (
        j.consumer_id = auth.uid()
        or (j.org_id is not null and public.is_org_operator(j.org_id))
        or exists (
          select 1
          from public.drivers d
          where d.id = j.assigned_driver_id
            and d.user_id = auth.uid()
        )
      )
  )
  or public.is_service_role()
);

create policy payment_events_insert_service_only
on public.payment_events
for insert
with check (public.is_service_role());

create policy refunds_select_policy
on public.refunds
for select
using (
  exists (
    select 1
    from public.jobs j
    where j.id = refunds.job_id
      and (
        j.consumer_id = auth.uid()
        or (j.org_id is not null and public.is_org_operator(j.org_id))
        or exists (
          select 1
          from public.drivers d
          where d.id = j.assigned_driver_id
            and d.user_id = auth.uid()
        )
      )
  )
  or public.is_service_role()
);

create policy refunds_write_service_only
on public.refunds
for all
using (public.is_service_role())
with check (public.is_service_role());

create policy payout_ledger_select_policy
on public.payout_ledger
for select
using (
  exists (
    select 1
    from public.drivers d
    where d.id = payout_ledger.driver_id
      and d.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.jobs j
    where j.id = payout_ledger.job_id
      and j.org_id is not null
      and public.is_org_operator(j.org_id)
  )
  or public.is_service_role()
);

create policy payout_ledger_write_service_only
on public.payout_ledger
for all
using (public.is_service_role())
with check (public.is_service_role());

grant select on public.payments, public.payment_events, public.refunds, public.payout_ledger to authenticated;
grant insert, update on public.payments, public.refunds, public.payout_ledger to service_role;
grant insert on public.payment_events to service_role;
