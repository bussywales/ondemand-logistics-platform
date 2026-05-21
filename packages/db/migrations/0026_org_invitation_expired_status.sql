alter table public.org_invitations
  drop constraint if exists org_invitations_status_check;

alter table public.org_invitations
  add constraint org_invitations_status_check
    check (status in ('PENDING', 'ACCEPTED', 'CANCELLED', 'EXPIRED'));
