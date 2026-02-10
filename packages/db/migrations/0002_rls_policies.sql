alter table public.users enable row level security;
alter table public.orgs enable row level security;
alter table public.org_memberships enable row level security;
alter table public.drivers enable row level security;
alter table public.driver_vehicle enable row level security;
alter table public.jobs enable row level security;
alter table public.job_events enable row level security;
alter table public.audit_log enable row level security;
alter table public.outbox_messages enable row level security;
alter table public.idempotency_keys enable row level security;

create or replace function public.is_service_role()
returns boolean
language sql
stable
as $$
  select auth.role() = 'service_role';
$$;

create or replace function public.is_org_operator(target_org_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.org_memberships m
    where m.org_id = target_org_id
      and m.user_id = auth.uid()
      and m.is_active
      and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
  );
$$;

create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.org_memberships m
    where m.org_id = target_org_id
      and m.user_id = auth.uid()
      and m.is_active
  );
$$;

create policy users_self_select
on public.users
for select
using (id = auth.uid() or public.is_service_role());

create policy users_self_update
on public.users
for update
using (id = auth.uid() or public.is_service_role())
with check (id = auth.uid() or public.is_service_role());

create policy orgs_member_select
on public.orgs
for select
using (public.is_org_member(id) or public.is_service_role());

create policy memberships_self_or_operator_select
on public.org_memberships
for select
using (
  user_id = auth.uid()
  or public.is_org_operator(org_id)
  or public.is_service_role()
);

create policy drivers_self_or_operator_select
on public.drivers
for select
using (
  user_id = auth.uid()
  or (home_org_id is not null and public.is_org_operator(home_org_id))
  or public.is_service_role()
);

create policy driver_vehicle_visibility
on public.driver_vehicle
for select
using (
  exists (
    select 1
    from public.drivers d
    where d.id = driver_vehicle.driver_id
      and (
        d.user_id = auth.uid()
        or (d.home_org_id is not null and public.is_org_operator(d.home_org_id))
      )
  )
  or public.is_service_role()
);

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
  or public.is_org_operator(org_id)
  or public.is_service_role()
);

create policy jobs_insert_policy
on public.jobs
for insert
with check (
  public.is_service_role()
  or (
    consumer_id = auth.uid()
    and created_by = auth.uid()
    and public.is_org_member(org_id)
  )
  or (
    created_by = auth.uid()
    and public.is_org_operator(org_id)
  )
);

create policy jobs_update_policy
on public.jobs
for update
using (
  public.is_service_role()
  or public.is_org_operator(org_id)
  or exists (
    select 1
    from public.drivers d
    where d.id = jobs.assigned_driver_id
      and d.user_id = auth.uid()
  )
)
with check (
  public.is_service_role()
  or public.is_org_operator(org_id)
  or exists (
    select 1
    from public.drivers d
    where d.id = jobs.assigned_driver_id
      and d.user_id = auth.uid()
  )
);

create policy job_events_visibility
on public.job_events
for select
using (
  exists (
    select 1
    from public.jobs j
    where j.id = job_events.job_id
      and (
        j.consumer_id = auth.uid()
        or public.is_org_operator(j.org_id)
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

create policy job_events_insert_service_only
on public.job_events
for insert
with check (public.is_service_role());

create policy audit_log_insert_service_only
on public.audit_log
for insert
with check (public.is_service_role());

create policy audit_log_select_operator_only
on public.audit_log
for select
using (
  public.is_service_role()
  or (org_id is not null and public.is_org_operator(org_id))
);

create policy outbox_service_only_select
on public.outbox_messages
for select
using (public.is_service_role());

create policy outbox_service_only_insert
on public.outbox_messages
for insert
with check (public.is_service_role());

create policy outbox_service_only_update
on public.outbox_messages
for update
using (public.is_service_role())
with check (public.is_service_role());

create policy idempotency_self_or_service
on public.idempotency_keys
for all
using (actor_id = auth.uid() or public.is_service_role())
with check (actor_id = auth.uid() or public.is_service_role());
