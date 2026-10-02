-- Time Clock: HR / Payroll supervisors see and correct their community's punches.
-- TimeClock.jsx has always shown them the Team and Payroll Export tabs, but the only
-- permissive policy (time_punches_own) allowed own punches or org_admin/ceo/super_admin,
-- so those tabs were empty for them in every community. Found during the phase-6
-- tiered smoke test. Deletes stay super-admin-only in tiered communities (tier_del).
drop policy if exists time_punches_hr_supervisors on time_punches;
create policy time_punches_hr_supervisors on time_punches for all to authenticated
  using (
    organization_id = (select get_my_org_id())
    and ((select has_department_access('hr', 'supervisor')) or (select has_department_access('payroll', 'supervisor')))
  )
  with check (
    organization_id = (select get_my_org_id())
    and ((select has_department_access('hr', 'supervisor')) or (select has_department_access('payroll', 'supervisor')))
  );
