create table public.notification_reads (
  user_id uuid not null references public.users (id) on delete cascade,
  notification_id text not null check (char_length(notification_id) >= 3),
  notification_source text not null check (char_length(notification_source) >= 2),
  read_at timestamptz not null default now(),
  primary key (user_id, notification_id)
);

create index notification_reads_user_read_idx
  on public.notification_reads (user_id, read_at desc);

grant select, insert, update on public.notification_reads to authenticated;
grant select, insert, update on public.notification_reads to service_role;

alter table public.notification_reads enable row level security;

create policy notification_reads_self_or_service_select
on public.notification_reads
for select
using (user_id = auth.uid() or public.is_service_role());

create policy notification_reads_self_or_service_insert
on public.notification_reads
for insert
with check (user_id = auth.uid() or public.is_service_role());

create policy notification_reads_self_or_service_update
on public.notification_reads
for update
using (user_id = auth.uid() or public.is_service_role())
with check (user_id = auth.uid() or public.is_service_role());
