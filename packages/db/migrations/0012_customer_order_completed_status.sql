alter table public.customer_orders
  drop constraint if exists customer_orders_status_check;

alter table public.customer_orders
  add constraint customer_orders_status_check
  check (status in ('SUBMITTED', 'PAYMENT_AUTHORIZED', 'PAYMENT_FAILED', 'COMPLETED'));
