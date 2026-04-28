create type public.restaurant_status as enum ('DRAFT', 'ACTIVE');

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  name text not null check (char_length(name) >= 2),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status public.restaurant_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index restaurants_org_created_idx
  on public.restaurants (org_id, created_at desc);

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null check (char_length(name) >= 2),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, restaurant_id)
);

create index menu_categories_restaurant_sort_idx
  on public.menu_categories (restaurant_id, sort_order, created_at);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category_id uuid not null,
  name text not null check (char_length(name) >= 2),
  description text check (description is null or char_length(description) >= 2),
  price_cents integer not null check (price_cents > 0),
  currency text not null check (char_length(currency) = 3),
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (category_id, restaurant_id)
    references public.menu_categories (id, restaurant_id)
    on delete cascade
);

create index menu_items_restaurant_category_sort_idx
  on public.menu_items (restaurant_id, category_id, sort_order, created_at);

create trigger restaurants_touch_updated_at
before update on public.restaurants
for each row execute function public.touch_updated_at();

create trigger menu_categories_touch_updated_at
before update on public.menu_categories
for each row execute function public.touch_updated_at();

create trigger menu_items_touch_updated_at
before update on public.menu_items
for each row execute function public.touch_updated_at();

grant select, insert, update on public.restaurants to authenticated;
grant select, insert, update on public.menu_categories to authenticated;
grant select, insert, update on public.menu_items to authenticated;

alter table public.restaurants enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;

create policy restaurants_operator_select
on public.restaurants
for select
using (public.is_org_operator(org_id) or public.is_service_role());

create policy restaurants_operator_insert
on public.restaurants
for insert
with check (public.is_org_operator(org_id) or public.is_service_role());

create policy restaurants_operator_update
on public.restaurants
for update
using (public.is_org_operator(org_id) or public.is_service_role())
with check (public.is_org_operator(org_id) or public.is_service_role());

create policy menu_categories_operator_select
on public.menu_categories
for select
using (
  exists (
    select 1
    from public.restaurants r
    where r.id = menu_categories.restaurant_id
      and public.is_org_operator(r.org_id)
  )
  or public.is_service_role()
);

create policy menu_categories_operator_insert
on public.menu_categories
for insert
with check (
  exists (
    select 1
    from public.restaurants r
    where r.id = menu_categories.restaurant_id
      and public.is_org_operator(r.org_id)
  )
  or public.is_service_role()
);

create policy menu_categories_operator_update
on public.menu_categories
for update
using (
  exists (
    select 1
    from public.restaurants r
    where r.id = menu_categories.restaurant_id
      and public.is_org_operator(r.org_id)
  )
  or public.is_service_role()
)
with check (
  exists (
    select 1
    from public.restaurants r
    where r.id = menu_categories.restaurant_id
      and public.is_org_operator(r.org_id)
  )
  or public.is_service_role()
);

create policy menu_items_operator_select
on public.menu_items
for select
using (
  exists (
    select 1
    from public.restaurants r
    where r.id = menu_items.restaurant_id
      and public.is_org_operator(r.org_id)
  )
  or public.is_service_role()
);

create policy menu_items_operator_insert
on public.menu_items
for insert
with check (
  exists (
    select 1
    from public.restaurants r
    where r.id = menu_items.restaurant_id
      and public.is_org_operator(r.org_id)
  )
  or public.is_service_role()
);

create policy menu_items_operator_update
on public.menu_items
for update
using (
  exists (
    select 1
    from public.restaurants r
    where r.id = menu_items.restaurant_id
      and public.is_org_operator(r.org_id)
  )
  or public.is_service_role()
)
with check (
  exists (
    select 1
    from public.restaurants r
    where r.id = menu_items.restaurant_id
      and public.is_org_operator(r.org_id)
  )
  or public.is_service_role()
);
