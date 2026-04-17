alter table public.orgs
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists operating_city text;

alter table public.orgs
  add constraint orgs_contact_name_length
    check (contact_name is null or char_length(contact_name) >= 2),
  add constraint orgs_contact_email_length
    check (contact_email is null or char_length(contact_email) >= 5),
  add constraint orgs_contact_phone_length
    check (contact_phone is null or char_length(contact_phone) >= 7),
  add constraint orgs_operating_city_length
    check (operating_city is null or char_length(operating_city) >= 2);

create index if not exists org_memberships_user_active_idx
  on public.org_memberships (user_id, is_active, created_at desc);
