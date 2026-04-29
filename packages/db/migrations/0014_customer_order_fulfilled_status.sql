alter table public.customer_orders
  drop constraint if exists customer_orders_status_check;

alter table public.customer_orders
  add constraint customer_orders_status_check
  check (status in ('SUBMITTED', 'PAYMENT_AUTHORIZED', 'PAYMENT_FAILED', 'COMPLETED', 'FULFILLED'));

create or replace function public.complete_customer_order_when_paid_and_delivered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.customer_orders o
  set status = 'FULFILLED',
      updated_at = now()
  from public.payments p,
       public.jobs j
  where o.payment_id = p.id
    and o.job_id = j.id
    and o.status in ('PAYMENT_AUTHORIZED', 'COMPLETED')
    and p.status = 'CAPTURED'
    and j.status = 'DELIVERED'
    and (
      (TG_TABLE_NAME = 'payments' and p.id = NEW.id)
      or (TG_TABLE_NAME = 'jobs' and j.id = NEW.id)
    );

  return NEW;
end;
$$;
