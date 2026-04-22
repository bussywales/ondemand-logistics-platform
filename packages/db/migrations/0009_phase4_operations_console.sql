create table public.job_dispatch_attempts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  attempt_number integer not null check (attempt_number > 0),
  trigger_source text not null check (char_length(trigger_source) >= 2),
  outcome text not null check (char_length(outcome) >= 2),
  driver_id uuid references public.drivers (id) on delete set null,
  offer_id uuid references public.job_offers (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  unique (job_id, attempt_number)
);

create index job_dispatch_attempts_job_created_idx
  on public.job_dispatch_attempts (job_id, created_at desc);

alter table public.job_dispatch_attempts enable row level security;

create policy job_dispatch_attempts_visibility
on public.job_dispatch_attempts
for select
using (
  exists (
    select 1
    from public.jobs j
    where j.id = job_dispatch_attempts.job_id
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

create policy job_dispatch_attempts_insert_service_only
on public.job_dispatch_attempts
for insert
with check (public.is_service_role());

grant select on public.job_dispatch_attempts to authenticated;
grant insert on public.job_dispatch_attempts to service_role;
