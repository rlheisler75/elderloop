-- Driver Out notices for Transportation: the Transportation Manager marks a driver out
-- for a day (or a run of days), ahead of time. Staff see the notice at the top of
-- Transportation, on its calendars, and in Request a Ride. Portal logins never see them.
-- Writes mirror trips' tier_del: Transportation Manager, Org Admin, super admin in
-- tiered communities (the NHA only under Emergency Edit, via nha_write_guard).

create table if not exists public.driver_absences (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  driver_name     text not null,
  start_date      date not null,
  end_date        date not null,
  note            text,
  created_by      uuid default auth.uid() references public.profiles(id) on delete set null,
  created_by_name text,
  created_at      timestamptz not null default now(),
  constraint driver_absences_dates check (end_date >= start_date)
);
create index if not exists driver_absences_org_dates_idx on public.driver_absences(organization_id, end_date);
alter table public.driver_absences enable row level security;

create policy driver_absences_org on public.driver_absences for all to authenticated
  using (organization_id = (select get_my_org_id()) or (select get_my_role()) = 'super_admin')
  with check (organization_id = (select get_my_org_id()) or (select get_my_role()) = 'super_admin');
create policy mfa_gate on public.driver_absences as restrictive for all to authenticated
  using ((select mfa_ok())) with check ((select mfa_ok()));
create policy staff_only_no_portal on public.driver_absences as restrictive for all to authenticated
  using (not (select is_portal_user())) with check (not (select is_portal_user()));
create policy tier_ins on public.driver_absences as restrictive for insert to authenticated
  with check ((not (select my_org_tiered())) or t_at_least('transportation', 'manager'));
create policy tier_upd on public.driver_absences as restrictive for update to authenticated
  using ((not (select my_org_tiered())) or t_at_least('transportation', 'manager'))
  with check ((not (select my_org_tiered())) or t_at_least('transportation', 'manager'));
create policy tier_del on public.driver_absences as restrictive for delete to authenticated
  using ((not (select my_org_tiered())) or t_at_least('transportation', 'manager'));

create trigger trg_nha_write_guard before insert or update or delete on public.driver_absences
  for each row execute function nha_write_guard('records');
create trigger trg_role_view_only before insert or update or delete on public.driver_absences
  for each row execute function role_view_only_guard('transportation');

grant select, insert, update, delete on public.driver_absences to authenticated;
