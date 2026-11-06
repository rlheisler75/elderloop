-- Digital signage addresses: every community gets a permanent facility number,
-- and names its own screens, so a screen lives at elderloop.xyz/<number>-<name>
-- (e.g. /1002-lobby; /s/1002-lobby works too). Each screen picks a layout:
-- 'signage' (the Signage page) or 'tv' (the TV slideshow). The bare number
-- (/1002) opens the Signage layout.

create sequence if not exists public.facility_number_seq start 1001;

alter table public.organizations add column if not exists facility_number int;

-- Existing communities, oldest first
do $$
declare r record;
begin
  for r in select id from public.organizations where facility_number is null order by created_at, id loop
    update public.organizations set facility_number = nextval('public.facility_number_seq') where id = r.id;
  end loop;
end $$;

alter table public.organizations alter column facility_number set default nextval('public.facility_number_seq');
alter table public.organizations alter column facility_number set not null;
do $$ begin
  alter table public.organizations add constraint organizations_facility_number_key unique (facility_number);
exception when duplicate_table or duplicate_object then null; end $$;

-- The number never changes once given (screens already point at it), except by a super admin
create or replace function public.facility_number_guard()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if new.facility_number is distinct from old.facility_number
     and coalesce(auth.role(), '') = 'authenticated' and get_my_role() <> 'super_admin' then
    raise exception 'The facility number can only be changed by ElderLoop.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists trg_facility_number_guard on public.organizations;
create trigger trg_facility_number_guard before update on public.organizations
  for each row execute function facility_number_guard();
revoke all on function public.facility_number_guard() from public, anon, authenticated;

create table if not exists public.signage_screens (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  name             text not null check (length(btrim(name)) between 1 and 80),
  -- the part after "<number>-": lowercase letters, numbers and single dashes
  url_name         text not null check (url_name ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(url_name) <= 60),
  display          text not null default 'signage' check (display in ('signage', 'tv')),
  is_active        boolean not null default true,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  unique (organization_id, url_name)
);

alter table public.signage_screens enable row level security;

create or replace function public.signage_can_manage(p_org uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select coalesce((p_org = get_my_org_id() and (get_my_role() in ('org_admin', 'ceo') or can('communication', 'edit')))
                  or get_my_role() = 'super_admin', false)
$$;

drop policy if exists signage_screens_read on public.signage_screens;
create policy signage_screens_read on public.signage_screens for select to authenticated
  using (organization_id = get_my_org_id() or get_my_role() = 'super_admin');
drop policy if exists signage_screens_write on public.signage_screens;
create policy signage_screens_write on public.signage_screens for all to authenticated
  using ((select signage_can_manage(organization_id)))
  with check ((select signage_can_manage(organization_id)));
drop policy if exists mfa_gate on public.signage_screens;
create policy mfa_gate on public.signage_screens as restrictive for all to authenticated
  using ((select mfa_ok())) with check ((select mfa_ok()));
drop policy if exists staff_only_no_portal on public.signage_screens;
create policy staff_only_no_portal on public.signage_screens as restrictive for all to authenticated
  using (not (select is_portal_user())) with check (not (select is_portal_user()));
grant select, insert, update, delete on public.signage_screens to authenticated;

create or replace function public.signage_screen_defaults()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if tg_op = 'INSERT' then new.created_by := coalesce(new.created_by, auth.uid()); end if;
  new.url_name := lower(btrim(new.url_name));
  return new;
end $$;
drop trigger if exists trg_signage_screen_defaults on public.signage_screens;
create trigger trg_signage_screen_defaults before insert or update on public.signage_screens
  for each row execute function signage_screen_defaults();
revoke all on function public.signage_screen_defaults() from public, anon, authenticated;

-- Public lookup for the screen itself (no sign-in on a TV). Returns only what
-- the display needs to load: the community slug and the layout.
create or replace function public.signage_resolve(p_number int, p_url_name text)
returns table (org_slug text, display text, screen_name text)
language sql stable security definer set search_path to 'public'
as $$
  select o.slug,
         coalesce(s.display, 'signage'),
         s.name
    from organizations o
    left join signage_screens s
      on s.organization_id = o.id and s.is_active and s.url_name = lower(btrim(coalesce(p_url_name, '')))
   where o.facility_number = p_number and o.is_active
     and (coalesce(p_url_name, '') = '' or s.id is not null)
$$;
revoke all on function public.signage_resolve(int, text) from public;
grant execute on function public.signage_resolve(int, text) to anon, authenticated;

-- Applied separately as signage_realtime: the screens subscribe to changes, but
-- no table was in the supabase_realtime publication, so new events only showed
-- on the timed refresh. Realtime still applies RLS (anon sees only rows its
-- signage policies allow).
do $$
declare t text;
begin
  foreach t in array array['announcements', 'activities', 'chapel_services'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
