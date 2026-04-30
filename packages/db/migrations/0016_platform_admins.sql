create table public.platform_admins (
  user_id uuid primary key references public.users (id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger platform_admins_touch_updated_at
before update on public.platform_admins
for each row execute function public.touch_updated_at();

grant select on public.platform_admins to authenticated;
grant select, insert, update, delete on public.platform_admins to service_role;

alter table public.platform_admins enable row level security;

create policy platform_admins_self_or_service_select
on public.platform_admins
for select
using (user_id = auth.uid() or public.is_service_role());
