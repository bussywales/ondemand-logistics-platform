create or replace function public.complete_customer_order_when_paid_and_delivered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.customer_orders o
  set status = 'COMPLETED',
      updated_at = now()
  from public.payments p,
       public.jobs j
  where o.payment_id = p.id
    and o.job_id = j.id
    and o.status = 'PAYMENT_AUTHORIZED'
    and p.status = 'CAPTURED'
    and j.status = 'DELIVERED'
    and (
      (TG_TABLE_NAME = 'payments' and p.id = NEW.id)
      or (TG_TABLE_NAME = 'jobs' and j.id = NEW.id)
    );

  return NEW;
end;
$$;

drop trigger if exists customer_order_complete_on_payment_capture on public.payments;
create trigger customer_order_complete_on_payment_capture
after update of status on public.payments
for each row
when (NEW.status = 'CAPTURED')
execute function public.complete_customer_order_when_paid_and_delivered();

drop trigger if exists customer_order_complete_on_job_delivered on public.jobs;
create trigger customer_order_complete_on_job_delivered
after update of status on public.jobs
for each row
when (NEW.status = 'DELIVERED')
execute function public.complete_customer_order_when_paid_and_delivered();
