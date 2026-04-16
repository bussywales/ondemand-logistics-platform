alter table public.jobs
  add column cancelled_at timestamptz,
  add column cancelled_by_user_id uuid references public.users (id) on delete restrict,
  add column cancellation_reason text,
  add column cancellation_actor_role text,
  add column cancellation_settlement_code text,
  add column cancellation_settlement_note text,
  add column cancellation_fee_cents integer not null default 0 check (cancellation_fee_cents >= 0),
  add column cancellation_refund_cents integer not null default 0 check (cancellation_refund_cents >= 0);

alter table public.jobs
  add constraint jobs_cancellation_actor_role_check
  check (
    cancellation_actor_role is null
    or cancellation_actor_role in ('CONSUMER', 'BUSINESS_OPERATOR', 'ADMIN')
  );

alter table public.jobs
  add constraint jobs_cancelled_state_metadata_check
  check (
    (status = 'CANCELLED' and cancelled_at is not null and cancelled_by_user_id is not null and cancellation_reason is not null and cancellation_settlement_code is not null)
    or (status <> 'CANCELLED')
  );

create table public.proof_of_delivery (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.jobs (id) on delete cascade,
  delivered_by_driver_id uuid not null references public.drivers (id) on delete restrict,
  photo_url text check (photo_url is null or char_length(photo_url) >= 8),
  recipient_name text check (recipient_name is null or char_length(recipient_name) >= 2),
  delivery_note text check (delivery_note is null or char_length(delivery_note) between 3 and 1000),
  delivered_at timestamptz not null default now(),
  latitude numeric(9,6) check (latitude is null or latitude between -90 and 90),
  longitude numeric(9,6) check (longitude is null or longitude between -180 and 180),
  otp_verified boolean not null default false,
  created_at timestamptz not null default now(),
  check (
    (latitude is null and longitude is null)
    or (latitude is not null and longitude is not null)
  )
);

create index proof_of_delivery_driver_created_idx
  on public.proof_of_delivery (delivered_by_driver_id, created_at desc);

create trigger proof_of_delivery_append_only_blocked
before update or delete on public.proof_of_delivery
for each row execute function public.block_update_delete_append_only();

alter table public.proof_of_delivery enable row level security;

create policy proof_of_delivery_select_policy
on public.proof_of_delivery
for select
using (
  exists (
    select 1
    from public.jobs j
    where j.id = proof_of_delivery.job_id
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

create policy proof_of_delivery_insert_service_only
on public.proof_of_delivery
for insert
with check (public.is_service_role());

grant select on public.proof_of_delivery to authenticated;
grant insert on public.proof_of_delivery to service_role;
