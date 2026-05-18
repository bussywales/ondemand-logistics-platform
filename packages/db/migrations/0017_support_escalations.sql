create table public.support_escalations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  order_id uuid null references public.customer_orders(id) on delete cascade,
  job_id uuid null references public.jobs(id) on delete cascade,
  category text not null,
  status text not null default 'OPEN',
  severity text not null default 'MEDIUM',
  title text not null,
  note text not null,
  follow_up_owner text null,
  customer_contact_required boolean not null default false,
  merchant_contact_required boolean not null default false,
  courier_contact_required boolean not null default false,
  created_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_escalations_reference_check check (order_id is not null or job_id is not null),
  constraint support_escalations_category_check check (
    category in (
      'DISPATCH_FAILURE',
      'PAYMENT_RISK',
      'CUSTOMER_SUPPORT',
      'MERCHANT_SUPPORT',
      'COURIER_SUPPORT',
      'REFUND_REVIEW',
      'DELIVERY_DELAY',
      'GENERAL'
    )
  ),
  constraint support_escalations_status_check check (
    status in (
      'OPEN',
      'IN_REVIEW',
      'WAITING_ON_CUSTOMER',
      'WAITING_ON_MERCHANT',
      'WAITING_ON_COURIER',
      'RESOLVED',
      'CANCELLED'
    )
  ),
  constraint support_escalations_severity_check check (
    severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
  )
);

create index support_escalations_org_status_idx
  on public.support_escalations (org_id, status, updated_at desc);

create index support_escalations_order_idx
  on public.support_escalations (order_id, created_at desc)
  where order_id is not null;

create index support_escalations_job_idx
  on public.support_escalations (job_id, created_at desc)
  where job_id is not null;

create trigger support_escalations_touch_updated_at
before update on public.support_escalations
for each row execute function public.touch_updated_at();

grant select, insert, update on public.support_escalations to authenticated;
grant select, insert, update, delete on public.support_escalations to service_role;

alter table public.support_escalations enable row level security;

create policy support_escalations_org_member_select
on public.support_escalations
for select
to authenticated
using (
  exists (
    select 1
    from public.org_memberships m
    where m.org_id = support_escalations.org_id
      and m.user_id = auth.uid()
      and m.is_active = true
      and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
  )
);

create policy support_escalations_org_member_insert
on public.support_escalations
for insert
to authenticated
with check (
  exists (
    select 1
    from public.org_memberships m
    where m.org_id = support_escalations.org_id
      and m.user_id = auth.uid()
      and m.is_active = true
      and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
  )
);

create policy support_escalations_org_member_update
on public.support_escalations
for update
to authenticated
using (
  exists (
    select 1
    from public.org_memberships m
    where m.org_id = support_escalations.org_id
      and m.user_id = auth.uid()
      and m.is_active = true
      and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
  )
)
with check (
  exists (
    select 1
    from public.org_memberships m
    where m.org_id = support_escalations.org_id
      and m.user_id = auth.uid()
      and m.is_active = true
      and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
  )
);

create policy support_escalations_platform_admin_select
on public.support_escalations
for select
to authenticated
using (
  exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  )
);
