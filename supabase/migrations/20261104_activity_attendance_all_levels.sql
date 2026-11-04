-- Activities: every level of the Activities department records attendance,
-- including unchecking a resident (AttendanceModal deletes the row). Before,
-- delete needed Supervisor, so an employee's uncheck silently did nothing.
-- (Replaces the activity_attendance delete row from 20260930_access_tiers_remaining_modules.sql.)
drop policy if exists tier_del on public.activity_attendance;
create policy tier_del on public.activity_attendance as restrictive for delete to authenticated
  using ((not (select my_org_tiered())) or t_member('activities'));
