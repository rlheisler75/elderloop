-- Director Dashboard → Caseload Summary lists social workers only, matching the Assigned
-- Social Worker dropdown in Case Management & Review (SocialProfile.jsx): people in the
-- Social Services department at any level, plus the social_services account type. It used
-- to list every Supervisor / Manager / Org Admin / Administrator account and missed Social
-- Services staff whose account type is "staff". Anyone who still has residents assigned
-- stays listed so stray assignments don't drop off the dashboard.

create or replace function public.get_ss_caseload(p_org_id uuid)
returns table(worker_id uuid, first_name text, last_name text, role text, assigned bigint, open_grievances bigint, open_conferences bigint)
language plpgsql security definer set search_path to 'public' as $function$
begin
  -- get_my_role(), not is_super_admin(): the latter reads the legacy, empty super_admins table
  if p_org_id is distinct from get_my_org_id() and get_my_role() is distinct from 'super_admin' then
    raise exception 'Not authorized for this organization' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.first_name,
    p.last_name,
    p.role::text,
    count(distinct sp.id)  as assigned,
    count(distinct g.id)   as open_grievances,
    count(distinct cc.id)  as open_conferences
  from profiles p
  left join ss_social_profiles sp on sp.assigned_to = p.id and sp.organization_id = p_org_id
  left join ss_grievances g       on g.assigned_to  = p.id and g.organization_id  = p_org_id and g.status in ('open','investigating') and g.is_active = true
  left join ss_care_conferences cc on cc.facilitated_by = p.id and cc.organization_id = p_org_id and cc.status = 'scheduled'
  where p.organization_id = p_org_id
    and p.is_active = true
    and (p.role = 'social_services'
         or exists (select 1 from staff_department_roles d
                     where d.profile_id = p.id and d.organization_id = p_org_id and d.department = 'social_services')
         or exists (select 1 from ss_social_profiles x where x.assigned_to = p.id and x.organization_id = p_org_id))
  group by p.id, p.first_name, p.last_name, p.role
  order by assigned desc, p.last_name;
end;
$function$;
