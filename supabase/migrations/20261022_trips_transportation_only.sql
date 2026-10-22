-- Transportation trips: everyone in the community reads them, but only people in the
-- Transportation department (any level, via staff_department_roles), Org Admins, and
-- super admins schedule or change them. A supervisor of another department (e.g.
-- Maintenance) is view only. The NHA is still stopped by nha_write_guard unless
-- Emergency Edit is on. Replaces the "anyone may schedule; the scheduler edits their
-- own" rule from 20260930_access_tiers_remaining_modules.sql. Tiered communities only.

drop policy if exists tier_ins on public.trips;
create policy tier_ins on public.trips as restrictive for insert to authenticated
  with check ((not (select my_org_tiered())) or t_member('transportation'));

drop policy if exists tier_upd on public.trips;
create policy tier_upd on public.trips as restrictive for update to authenticated
  using ((not (select my_org_tiered())) or t_member('transportation'))
  with check ((not (select my_org_tiered())) or t_member('transportation'));
