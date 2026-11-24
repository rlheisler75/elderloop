-- Retire the old account types (maintenance, dietary, housekeeping, nursing, supervisor,
-- manager, social_services). A person's job is their department & level; what they can do
-- is their Job Roles. Account type is now only: Staff, Administrator (ceo), Org Admin,
-- and the portal / platform types.
--
-- Checked first in a rolled-back parity test (every rule below, every affected person,
-- plus each person's Job Roles permissions): nobody at Maranatha gains or loses anything.
-- The demo community lines up with real ones: staff there lose resident editing and a few
-- view permissions they had only through the "Template:" job roles, and managers of
-- unrelated departments lose Social Services writes.

-- 1. Access rules: drop the old types from their account-type lists. Where an old type was
--    the only way in, the matching Job Roles permission takes its place.
do $$
declare
  old_re constant text := '(maintenance|dietary|housekeeping|nursing|supervisor|manager|social_services)';
  r record; extra text; v_q text; v_c text; v_sql text;
begin
  for r in select tablename, policyname, cmd, qual, with_check from pg_policies
            where schemaname = 'public'
              and (coalesce(qual, '') || coalesce(with_check, '')) ~ ('''' || old_re || '''::user_role') loop
    extra := case
      when r.tablename in ('it_assets', 'it_licenses', 'it_tickets') then ' OR can(''it''::text, ''edit''::text)'
      when r.tablename = 'ss_mood_logs' then ' OR can(''social_services''::text, ''create''::text) OR can(''nursing''::text, ''create''::text)'
      else '' end;
    v_q := r.qual; v_c := r.with_check;
    if v_q is not null then
      v_q := regexp_replace(v_q, ', ''' || old_re || '''::user_role', '', 'g');
      v_q := regexp_replace(v_q, '''' || old_re || '''::user_role, ', '', 'g');
      if extra <> '' then v_q := regexp_replace(v_q, '(\(\w+\.role = ANY \(ARRAY\[[^\]]*\]\)\))', '(\1' || extra || ')', 'g'); end if;
    end if;
    if v_c is not null then
      v_c := regexp_replace(v_c, ', ''' || old_re || '''::user_role', '', 'g');
      v_c := regexp_replace(v_c, '''' || old_re || '''::user_role, ', '', 'g');
      if extra <> '' then v_c := regexp_replace(v_c, '(\(\w+\.role = ANY \(ARRAY\[[^\]]*\]\)\))', '(\1' || extra || ')', 'g'); end if;
    end if;
    v_sql := format('alter policy %I on public.%I', r.policyname, r.tablename)
          || case when v_q is not null then format(' using (%s)', v_q) else '' end
          || case when v_c is not null then format(' with check (%s)', v_c) else '' end;
    execute v_sql;
  end loop;
  if exists (select 1 from pg_policies where schemaname = 'public'
              and (coalesce(qual, '') || coalesce(with_check, '')) ~ ('''' || old_re || '''::user_role')) then
    raise exception 'An access rule still names an old account type';
  end if;
end $$;

-- 2. Functions that checked the old types (each already had a department or Job Roles path).
create or replace function public.is_social_services_writer() returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('org_admin', 'ceo', 'super_admin'))
      or coalesce(can('social_services', 'create'), false);
$$;

create or replace function public.t_any_manager() returns boolean
language sql stable security definer set search_path to 'public' as $$
  select has_any_department_level('manager') or get_my_role() in ('ceo', 'org_admin', 'super_admin')
$$;

create or replace function public.t_any_supervisor() returns boolean
language sql stable security definer set search_path to 'public' as $$
  select has_any_department_level('supervisor') or get_my_role() in ('ceo', 'org_admin', 'super_admin')
$$;

create or replace function public.profile_private_fields(p_ids uuid[])
returns table(id uuid, phone text, cell_phone text, emergency_contact_name text, emergency_contact_phone text, notes text)
language sql stable security definer set search_path to 'public' as $$
  select p.id, p.phone::text, p.cell_phone::text, p.emergency_contact_name::text,
         p.emergency_contact_phone::text, p.notes::text
  from profiles p
  where p.id = any(p_ids)
    and (select mfa_ok())
    and (
      p.id = auth.uid()
      or get_my_role() = 'super_admin'
      or (p.organization_id = get_my_org_id() and (
            get_my_role() in ('org_admin', 'ceo')
            or has_any_department_level('supervisor')
            or can('staff', 'view')))
      or (p.role = 'sales_rep' and p.id = get_my_org_rep_id()
          and get_my_role() in ('org_admin', 'ceo'))
    )
$$;

create or replace function public.get_ss_caseload(p_org_id uuid)
returns table(worker_id uuid, first_name text, last_name text, role text, assigned bigint, open_grievances bigint, open_conferences bigint)
language plpgsql security definer set search_path to 'public' as $function$
begin
  -- get_my_role(), not is_super_admin(): the latter reads the legacy, empty super_admins table
  if p_org_id is distinct from get_my_org_id() and get_my_role() is distinct from 'super_admin' then
    raise exception 'Not authorized for this organization' using errcode = '42501';
  end if;

  return query
  select p.id, p.first_name, p.last_name, p.role::text,
         count(distinct sp.id) as assigned, count(distinct g.id) as open_grievances, count(distinct cc.id) as open_conferences
  from profiles p
  left join ss_social_profiles sp on sp.assigned_to = p.id and sp.organization_id = p_org_id
  left join ss_grievances g       on g.assigned_to  = p.id and g.organization_id  = p_org_id and g.status in ('open','investigating') and g.is_active = true
  left join ss_care_conferences cc on cc.facilitated_by = p.id and cc.organization_id = p_org_id and cc.status = 'scheduled'
  where p.organization_id = p_org_id
    and p.is_active = true
    and (exists (select 1 from staff_department_roles d
                  where d.profile_id = p.id and d.organization_id = p_org_id and d.department = 'social_services')
         or exists (select 1 from ss_social_profiles x where x.assigned_to = p.id and x.organization_id = p_org_id))
  group by p.id, p.first_name, p.last_name, p.role
  order by assigned desc, p.last_name;
end;
$function$;

-- 3. Everyone on an old account type becomes Staff (their department & level stay).
--    sync_user_job_roles runs from the profiles trigger.
update public.profiles set role = 'staff'
 where role::text in ('maintenance', 'dietary', 'housekeeping', 'nursing', 'supervisor', 'manager', 'social_services');

-- 4. The "Template: <account type>" job roles carried over from Role Templates (demo only).
delete from public.user_job_roles u using public.job_roles r where r.id = u.job_role_id and r.source = 'template';
delete from public.job_role_permissions p using public.job_roles r where r.id = p.job_role_id and r.source = 'template';
delete from public.job_roles where source = 'template';

-- 5. The old types can't come back. (Postgres can't drop enum values in place.)
alter table public.profiles add constraint profiles_account_type_current
  check (role::text not in ('maintenance', 'dietary', 'housekeeping', 'nursing', 'supervisor', 'manager', 'social_services'));
comment on constraint profiles_account_type_current on public.profiles is
  'Old account types retired 2026-11-23: job = department & level, access = Job Roles.';
