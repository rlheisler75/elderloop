-- "Celebrate Our Staff" accent calendar, per community (Admin Panel → Celebrations).
-- A community with no rows uses ElderLoop's defaults (DEFAULT_CELEBRATIONS in
-- src/lib/appreciationWeeks.js); the first edit copies those in. Rule shapes match
-- rangeFor() there:
--   dates    month/day → end_month/end_day, every year
--   week     the nth full work week of the month (n = -1 last)
--   sunweek  the nth full Sunday–Saturday week of the month
--   weekday  starts on the nth `weekday` (0 = Sunday) of the month, runs `days`
-- Not health or staff data, so portal logins may read it (no staff_only_no_portal).

create table if not exists public.org_celebrations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null check (length(btrim(name)) between 1 and 80),
  emoji           text check (emoji is null or length(emoji) <= 16),
  accent          text not null check (accent ~ '^[a-z]{2,16}$'),
  kind            text not null check (kind in ('dates', 'week', 'sunweek', 'weekday')),
  month           smallint not null check (month between 1 and 12),
  day             smallint check (day between 1 and 31),
  end_month       smallint check (end_month between 1 and 12),
  end_day         smallint check (end_day between 1 and 31),
  n               smallint check (n in (-1, 1, 2, 3, 4, 5)),
  weekday         smallint check (weekday between 0 and 6),
  days            smallint check (days between 1 and 31),
  enabled         boolean not null default true,
  sort            integer not null default 0,
  updated_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (case kind
    when 'dates'   then day is not null and end_month is not null and end_day is not null
    when 'week'    then n is not null
    when 'sunweek' then n is not null
    when 'weekday' then n is not null and weekday is not null and days is not null
  end)
);
create index if not exists org_celebrations_org_idx on public.org_celebrations (organization_id, sort);

alter table public.org_celebrations enable row level security;

-- Everyone in the community reads it (their accent follows it)
drop policy if exists org_celebrations_read on public.org_celebrations;
create policy org_celebrations_read on public.org_celebrations for select to authenticated
  using (organization_id = (select get_my_org_id()) or (select get_my_role()) = 'super_admin');

-- Whoever manages the community's settings (same people as canManagePlatform)
drop policy if exists org_celebrations_write on public.org_celebrations;
create policy org_celebrations_write on public.org_celebrations for all to authenticated
  using (
    (organization_id = (select get_my_org_id())
      and ((select is_platform_admin()) or ((select get_my_role()) = 'ceo' and not (select my_org_tiered()))))
    or (select get_my_role()) = 'super_admin')
  with check (
    (organization_id = (select get_my_org_id())
      and ((select is_platform_admin()) or ((select get_my_role()) = 'ceo' and not (select my_org_tiered()))))
    or (select get_my_role()) = 'super_admin');

drop policy if exists mfa_gate on public.org_celebrations;
create policy mfa_gate on public.org_celebrations as restrictive for all to authenticated
  using ((select public.mfa_ok())) with check ((select public.mfa_ok()));

create or replace function public.org_celebrations_stamp()
returns trigger language plpgsql set search_path to 'public' as $function$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end
$function$;
drop trigger if exists trg_org_celebrations_stamp on public.org_celebrations;
create trigger trg_org_celebrations_stamp before insert or update on public.org_celebrations
  for each row execute function public.org_celebrations_stamp();
