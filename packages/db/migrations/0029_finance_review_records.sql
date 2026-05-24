create table public.finance_review_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  order_id uuid null references public.customer_orders(id) on delete set null,
  job_id uuid null references public.jobs(id) on delete set null,
  payment_id uuid null references public.payments(id) on delete set null,
  support_escalation_id uuid null references public.support_escalations(id) on delete set null,
  review_type text not null,
  status text not null default 'OPEN',
  severity text not null default 'MEDIUM',
  reason text not null,
  summary text null,
  owner_user_id uuid null references public.users(id) on delete set null,
  owner_label text null,
  resolution text null,
  resolution_reason text null,
  resolved_at timestamptz null,
  resolved_by uuid null references public.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_review_records_reference_check check (
    order_id is not null
    or job_id is not null
    or payment_id is not null
    or support_escalation_id is not null
  ),
  constraint finance_review_records_review_type_check check (
    review_type in (
      'REFUND_REVIEW',
      'PAYMENT_RECONCILIATION',
      'FAILED_CAPTURE_REVIEW',
      'DELIVERY_PAYMENT_MISMATCH'
    )
  ),
  constraint finance_review_records_status_check check (
    status in ('OPEN', 'IN_REVIEW', 'WAITING_SUPPORT', 'RESOLVED', 'CANCELLED')
  ),
  constraint finance_review_records_severity_check check (
    severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
  ),
  constraint finance_review_records_reason_check check (char_length(reason) between 4 and 1000),
  constraint finance_review_records_resolution_check check (
    status not in ('RESOLVED', 'CANCELLED')
    or (resolution is not null and char_length(resolution) >= 4)
  )
);

create index finance_review_records_org_status_idx
  on public.finance_review_records (org_id, status, updated_at desc);

create index finance_review_records_payment_active_idx
  on public.finance_review_records (org_id, payment_id, review_type)
  where payment_id is not null and status in ('OPEN', 'IN_REVIEW', 'WAITING_SUPPORT');

create index finance_review_records_order_idx
  on public.finance_review_records (order_id, created_at desc)
  where order_id is not null;

create index finance_review_records_job_idx
  on public.finance_review_records (job_id, created_at desc)
  where job_id is not null;

create trigger finance_review_records_touch_updated_at
before update on public.finance_review_records
for each row execute function public.touch_updated_at();

grant select, insert, update on public.finance_review_records to authenticated;
grant select, insert, update, delete on public.finance_review_records to service_role;

alter table public.finance_review_records enable row level security;

create policy finance_review_records_org_member_select
on public.finance_review_records
for select
to authenticated
using (
  exists (
    select 1
    from public.org_memberships m
    where m.org_id = finance_review_records.org_id
      and m.user_id = auth.uid()
      and m.is_active = true
      and m.role::text in ('BUSINESS_OPERATOR', 'ADMIN', 'OWNER', 'MANAGER', 'OPERATOR', 'FINANCE_VIEWER', 'SUPPORT_USER')
  )
);

create policy finance_review_records_org_member_insert
on public.finance_review_records
for insert
to authenticated
with check (
  exists (
    select 1
    from public.org_memberships m
    where m.org_id = finance_review_records.org_id
      and m.user_id = auth.uid()
      and m.is_active = true
      and m.role::text in ('BUSINESS_OPERATOR', 'ADMIN', 'OWNER', 'MANAGER', 'OPERATOR', 'FINANCE_VIEWER', 'SUPPORT_USER')
  )
);

create policy finance_review_records_org_member_update
on public.finance_review_records
for update
to authenticated
using (
  exists (
    select 1
    from public.org_memberships m
    where m.org_id = finance_review_records.org_id
      and m.user_id = auth.uid()
      and m.is_active = true
      and m.role::text in ('BUSINESS_OPERATOR', 'ADMIN', 'OWNER', 'MANAGER', 'OPERATOR', 'FINANCE_VIEWER', 'SUPPORT_USER')
  )
)
with check (
  exists (
    select 1
    from public.org_memberships m
    where m.org_id = finance_review_records.org_id
      and m.user_id = auth.uid()
      and m.is_active = true
      and m.role::text in ('BUSINESS_OPERATOR', 'ADMIN', 'OWNER', 'MANAGER', 'OPERATOR', 'FINANCE_VIEWER', 'SUPPORT_USER')
  )
);

create policy finance_review_records_platform_admin_select
on public.finance_review_records
for select
to authenticated
using (
  exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
      and pa.is_active = true
  )
);
