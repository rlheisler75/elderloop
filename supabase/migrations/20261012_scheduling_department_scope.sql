-- Scheduling: people see only the schedules of the departments they're in.
-- Every community (legacy and tiered), so no my_org_tiered() prefix.
--   • your own shifts, always
--   • shifts of any department you belong to (staff_department_roles, or the
--     older profiles.department), at any level
--   • shifts with no department ("All departments")
--   • everything: Administrator (ceo), Org Admin, Platform Admin, super admin,
--     and HR (staffing and payroll)
-- Swap requests follow the shifts: you see your own, and others only when the
-- requesting shift is one you can see.

create or replace function public.sched_sees_all()
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select coalesce(get_my_role() in ('ceo', 'org_admin', 'super_admin'), false)
      or is_platform_admin()
      or has_department_access('hr', 'employee')
$function$;

create or replace function public.sched_in_department(p_dept text)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select coalesce(p_dept, '') = ''
      or has_department_access(p_dept, 'employee')
      or exists (select 1 from profiles where id = auth.uid() and department = p_dept)
$function$;

revoke all on function public.sched_sees_all(), public.sched_in_department(text) from public, anon;
grant execute on function public.sched_sees_all(), public.sched_in_department(text) to authenticated, service_role;

drop policy if exists sched_dept_scope on public.scheduled_shifts;
create policy sched_dept_scope on public.scheduled_shifts as restrictive for select to authenticated
  using (staff_id = (select auth.uid()) or (select sched_sees_all()) or sched_in_department(department));

drop policy if exists sched_dept_scope on public.shift_swaps;
create policy sched_dept_scope on public.shift_swaps as restrictive for select to authenticated
  using (requester_id = (select auth.uid()) or target_id = (select auth.uid()) or (select sched_sees_all())
         or exists (select 1 from scheduled_shifts s where s.id = shift_swaps.requester_shift_id));
