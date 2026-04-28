create table public.customer_orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete restrict,
  org_id uuid not null references public.orgs (id) on delete restrict,
  job_id uuid not null unique references public.jobs (id) on delete restrict,
  payment_id uuid not null unique references public.payments (id) on delete restrict,
  customer_user_id uuid not null references public.users (id) on delete restrict,
  customer_name text not null check (char_length(customer_name) >= 2),
  customer_email text not null check (position('@' in customer_email) > 1),
  customer_phone text not null check (char_length(customer_phone) >= 7),
  delivery_address text not null check (char_length(delivery_address) >= 5),
  delivery_notes text check (delivery_notes is null or char_length(delivery_notes) >= 2),
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED', 'PAYMENT_AUTHORIZED', 'PAYMENT_FAILED')),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  delivery_fee_cents integer not null check (delivery_fee_cents >= 0),
  total_cents integer not null check (total_cents = subtotal_cents + delivery_fee_cents),
  currency text not null check (char_length(currency) = 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customer_orders_restaurant_created_idx
  on public.customer_orders (restaurant_id, created_at desc);

create index customer_orders_org_created_idx
  on public.customer_orders (org_id, created_at desc);

create table public.customer_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.customer_orders (id) on delete cascade,
  menu_item_id uuid not null references public.menu_items (id) on delete restrict,
  name text not null check (char_length(name) >= 2),
  quantity integer not null check (quantity > 0 and quantity <= 20),
  unit_price_cents integer not null check (unit_price_cents > 0),
  line_total_cents integer not null check (line_total_cents = quantity * unit_price_cents),
  currency text not null check (char_length(currency) = 3),
  created_at timestamptz not null default now()
);

create index customer_order_items_order_idx
  on public.customer_order_items (order_id, created_at);

create trigger customer_orders_touch_updated_at
before update on public.customer_orders
for each row execute function public.touch_updated_at();

grant select on public.customer_orders, public.customer_order_items to authenticated;
grant insert, update on public.customer_orders to service_role;
grant insert on public.customer_order_items to service_role;

alter table public.customer_orders enable row level security;
alter table public.customer_order_items enable row level security;

create policy customer_orders_operator_select
on public.customer_orders
for select
using (public.is_org_operator(org_id) or customer_user_id = auth.uid() or public.is_service_role());

create policy customer_orders_service_write
on public.customer_orders
for all
using (public.is_service_role())
with check (public.is_service_role());

create policy customer_order_items_operator_select
on public.customer_order_items
for select
using (
  exists (
    select 1
    from public.customer_orders o
    where o.id = customer_order_items.order_id
      and (public.is_org_operator(o.org_id) or o.customer_user_id = auth.uid())
  )
  or public.is_service_role()
);

create policy customer_order_items_service_insert
on public.customer_order_items
for insert
with check (public.is_service_role());
