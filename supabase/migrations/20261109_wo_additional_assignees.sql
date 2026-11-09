-- More than one Maintenance tech on a work order. assigned_to stays the lead
-- (reports, hand-off, auto-assign and SLA keep using it); additional_assignees
-- are the other techs working the job. They see it under "My jobs" and can
-- work it the same way the lead can.
alter table public.work_orders
  add column if not exists additional_assignees uuid[] not null default '{}';

-- Tiered communities: let additional techs see and update the job (same as the lead)
drop policy if exists tier_wo_select on public.work_orders;
create policy tier_wo_select on public.work_orders as restrictive for select to public
  using ((not (select my_org_tiered()))
    or ((select my_access_tier('work_orders')) = any (array['supervisor', 'manager', 'administrator', 'org_admin', 'super_admin']))
    or submitted_by = auth.uid()
    or assigned_to = auth.uid()
    or auth.uid() = any (additional_assignees)
    or (select has_department_access('maintenance', 'employee')));

drop policy if exists tier_wo_update on public.work_orders;
create policy tier_wo_update on public.work_orders as restrictive for update to public
  using ((not (select my_org_tiered()))
    or ((select my_access_tier('work_orders')) = any (array['supervisor', 'manager', 'administrator', 'org_admin', 'super_admin']))
    or assigned_to = auth.uid()
    or auth.uid() = any (additional_assignees)
    or ((select has_department_access('maintenance', 'employee')) and assigned_to is null))
  with check ((not (select my_org_tiered()))
    or ((select my_access_tier('work_orders')) = any (array['supervisor', 'manager', 'administrator', 'org_admin', 'super_admin']))
    or assigned_to = auth.uid()
    or auth.uid() = any (additional_assignees)
    or ((select has_department_access('maintenance', 'employee')) and assigned_to is null));

-- Who works the job is a Supervisor/Manager decision, like priority and due date
create or replace function public.wo_employee_field_guard()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if coalesce(auth.role(), '') <> 'authenticated' or not my_org_tiered()
     or my_access_tier('work_orders') <> 'employee' then
    return new;
  end if;
  if (new.priority, new.due_date, new.category, new.subcategory, new.vendor_name, new.sla_completion_due)
     is distinct from
     (old.priority, old.due_date, old.category, old.subcategory, old.vendor_name, old.sla_completion_due) then
    raise exception 'Priority, due date, category, and vendor are set by a Maintenance Supervisor or Manager.'
      using errcode = '42501', hint = 'tier_employee_fields';
  end if;
  if new.additional_assignees is distinct from old.additional_assignees then
    raise exception 'Additional techs are added by a Maintenance Supervisor or Manager.'
      using errcode = '42501', hint = 'tier_employee_fields';
  end if;
  return new;
end;
$function$;
