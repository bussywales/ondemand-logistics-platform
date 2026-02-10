-- Fix RLS helper recursion by ensuring membership checks bypass RLS.

create or replace function public.is_org_operator(target_org_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform set_config('row_security', 'off', true);

  return exists (
    select 1
    from public.org_memberships m
    where m.org_id = target_org_id
      and m.user_id = auth.uid()
      and m.is_active
      and m.role in ('BUSINESS_OPERATOR', 'ADMIN')
  );
end;
$$;

create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform set_config('row_security', 'off', true);

  return exists (
    select 1
    from public.org_memberships m
    where m.org_id = target_org_id
      and m.user_id = auth.uid()
      and m.is_active
  );
end;
$$;

revoke all on function public.is_org_operator(uuid) from public;
grant execute on function public.is_org_operator(uuid) to authenticated;

revoke all on function public.is_org_member(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
