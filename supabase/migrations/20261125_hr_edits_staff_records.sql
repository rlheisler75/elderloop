-- HR edits staff records (Robert, 2026-11-25).
-- Staff → Profile let department managers and HR change a staff record (including Status), but
-- profiles UPDATE was only allowed for Org Admins / the Administrator / the person themselves,
-- so everyone else's save silently changed nothing (Jessica Owens tried to terminate 4 people).
-- Now HR and Payroll at Supervisor or Manager level may edit staff accounts in their community,
-- including marking them Terminated (which turns the account off, 20261125_terminated_blocks_sign_in).
-- trg_protect_profile_privileges still keeps role, community, account on/off, email and
-- platform-admin changes to Org Admins. Other department managers stay read-only on staff records
-- (the Staff screen now matches); they still manage certifications through staff_certifications.

-- Security definer so the profiles policy never queries staff_department_roles directly (that
-- table's own policies read profiles, and a direct subquery here would loop).
create or replace function public.is_hr_staff_editor()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(exists (
    select 1 from staff_department_roles d join profiles p on p.id = d.profile_id
     where d.profile_id = auth.uid() and d.organization_id = p.organization_id
       and d.department in ('hr', 'payroll') and d.level in ('supervisor', 'manager')), false)
$$;

create policy hr_edit_staff_records on public.profiles for update to authenticated
  using (organization_id = (select get_my_org_id()) and role::text = 'staff' and (select is_hr_staff_editor()))
  with check (organization_id = (select get_my_org_id()) and role::text = 'staff' and (select is_hr_staff_editor()));
