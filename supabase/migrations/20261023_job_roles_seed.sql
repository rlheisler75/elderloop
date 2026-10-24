-- Job Roles, phase 1 (defaults + sync). Mirrors the tier rules in force on 2026-10-23
-- so switching to can() changes nobody's access. ASCII only.

-- Default permissions: (department, level, module, actions). department '*' = every
-- department at that level; level null on 'everyone' / 'administrator'.
create or replace function public.job_role_default_permissions()
returns table (kind text, department text, level text, module_key text, actions text[])
language sql immutable as $function$
  values
  -- Everyone (every staff login)
  ('everyone', null, null, 'work_orders',    array['create']),
  ('everyone', null, null, 'it',             array['create']),
  ('everyone', null, null, 'incidents',      array['create']),
  ('everyone', null, null, 'communication',  array['view']),
  ('everyone', null, null, 'directory',      array['view']),
  ('everyone', null, null, 'activities',     array['view']),
  ('everyone', null, null, 'chapel',         array['view']),
  ('everyone', null, null, 'transportation', array['view']),
  ('everyone', null, null, 'scheduling',     array['view']),
  ('everyone', null, null, 'timeclock',      array['view']),
  -- Administrator (NHA): see everything, approve, costs; writes only where the matrix gives them
  ('administrator', null, null, '*',             array['view', 'approve', 'costs']),
  ('administrator', null, null, 'communication', array['create', 'edit']),
  ('administrator', null, null, 'incidents',     array['create', 'edit']),
  ('administrator', null, null, 'family',        array['create', 'edit']),
  ('administrator', null, null, 'directory',     array['create', 'edit']),
  ('administrator', null, null, 'surveys',       array['create', 'edit', 'delete']),
  ('administrator', null, null, 'budgets',       array['settings']),
  ('administrator', null, null, 'work_orders',   array['create']),
  ('administrator', null, null, 'it',            array['create']),
  ('administrator', null, null, 'transportation', array['create']),
  ('administrator', null, null, 'scheduling',    array['edit', 'settings']),
  ('administrator', null, null, 'timeclock',     array['edit']),
  ('administrator', null, null, 'staff',         array['create', 'edit', 'delete']),
  -- Any department, by level
  ('department', '*', 'supervisor', 'scheduling',    array['view', 'edit']),
  ('department', '*', 'supervisor', 'timeclock',     array['view', 'edit']),
  ('department', '*', 'supervisor', 'communication', array['view', 'create', 'edit']),
  ('department', '*', 'supervisor', 'staff',         array['view']),
  ('department', '*', 'supervisor', 'incidents',     array['view', 'edit']),
  ('department', '*', 'manager',    'scheduling',    array['view', 'edit', 'settings']),
  ('department', '*', 'manager',    'timeclock',     array['view', 'edit']),
  ('department', '*', 'manager',    'communication', array['view', 'create', 'edit']),
  ('department', '*', 'manager',    'staff',         array['view', 'create', 'edit', 'delete']),
  ('department', '*', 'manager',    'incidents',     array['view', 'edit']),
  -- Maintenance (Work Orders, Meters)
  ('department', 'maintenance', 'employee',   'work_orders', array['view', 'create', 'edit']),
  ('department', 'maintenance', 'employee',   'meters',      array['view', 'create', 'edit']),
  ('department', 'maintenance', 'supervisor', 'work_orders', array['view', 'create', 'edit', 'approve']),
  ('department', 'maintenance', 'supervisor', 'meters',      array['view', 'create', 'edit']),
  ('department', 'maintenance', 'manager',    'work_orders', array['view', 'create', 'edit', 'approve', 'delete', 'settings', 'costs']),
  ('department', 'maintenance', 'manager',    'meters',      array['view', 'create', 'edit', 'delete', 'settings', 'costs']),
  -- Dietary (the Dietary Manager buys food through Central Supply)
  ('department', 'dietary', 'employee',   'dietary',        array['view', 'create']),
  ('department', 'dietary', 'employee',   'central_supply', array['view', 'create']),
  ('department', 'dietary', 'supervisor', 'dietary',        array['view', 'create', 'edit']),
  ('department', 'dietary', 'supervisor', 'central_supply', array['view', 'create']),
  ('department', 'dietary', 'manager',    'dietary',        array['view', 'create', 'edit', 'delete', 'settings', 'costs']),
  ('department', 'dietary', 'manager',    'central_supply', array['view', 'create', 'edit', 'delete', 'settings']),
  -- Housekeeping
  ('department', 'housekeeping', 'employee',   'housekeeping', array['view', 'create']),
  ('department', 'housekeeping', 'supervisor', 'housekeeping', array['view', 'create', 'edit', 'approve']),
  ('department', 'housekeeping', 'manager',    'housekeeping', array['view', 'create', 'edit', 'approve', 'delete', 'settings', 'costs']),
  -- Central Supply
  ('department', 'central_supply', 'employee',   'central_supply', array['view', 'create']),
  ('department', 'central_supply', 'supervisor', 'central_supply', array['view', 'create']),
  ('department', 'central_supply', 'manager',    'central_supply', array['view', 'create', 'edit', 'delete', 'settings', 'costs']),
  -- Social Services
  ('department', 'social_services', 'employee',   'social_services', array['view', 'create']),
  ('department', 'social_services', 'supervisor', 'social_services', array['view', 'create', 'edit']),
  ('department', 'social_services', 'manager',    'social_services', array['view', 'create', 'edit', 'approve', 'delete', 'settings']),
  -- Nursing (nurses can ask Transportation for a ride)
  ('department', 'nursing', 'employee',   'nursing',        array['view', 'create']),
  ('department', 'nursing', 'employee',   'transportation', array['create']),
  ('department', 'nursing', 'supervisor', 'nursing',        array['view', 'create', 'edit']),
  ('department', 'nursing', 'supervisor', 'transportation', array['create']),
  ('department', 'nursing', 'manager',    'nursing',        array['view', 'create', 'edit', 'settings']),
  ('department', 'nursing', 'manager',    'transportation', array['create']),
  -- Activities (Activities, Chapel)
  ('department', 'activities', 'employee',   'activities', array['view', 'create']),
  ('department', 'activities', 'employee',   'chapel',     array['view', 'create']),
  ('department', 'activities', 'supervisor', 'activities', array['view', 'create', 'edit']),
  ('department', 'activities', 'supervisor', 'chapel',     array['view', 'create', 'edit']),
  ('department', 'activities', 'manager',    'activities', array['view', 'create', 'edit', 'delete', 'settings']),
  ('department', 'activities', 'manager',    'chapel',     array['view', 'create', 'edit', 'delete', 'settings']),
  -- Transportation
  ('department', 'transportation', 'employee',   'transportation', array['view', 'create', 'edit']),
  ('department', 'transportation', 'supervisor', 'transportation', array['view', 'create', 'edit']),
  ('department', 'transportation', 'manager',    'transportation', array['view', 'create', 'edit', 'delete', 'settings']),
  -- Security
  ('department', 'security', 'employee',   'security', array['view', 'create', 'edit']),
  ('department', 'security', 'supervisor', 'security', array['view', 'create', 'edit', 'approve']),
  ('department', 'security', 'manager',    'security', array['view', 'create', 'edit', 'approve', 'delete', 'settings']),
  -- IT
  ('department', 'it', 'employee',   'it', array['view', 'create', 'edit']),
  ('department', 'it', 'supervisor', 'it', array['view', 'create', 'edit']),
  ('department', 'it', 'manager',    'it', array['view', 'create', 'edit', 'delete', 'settings', 'costs']),
  -- Property (Independent Living): costs = leases, tenants, rent, deposits, notices
  ('department', 'property', 'employee',   'property_management', array['view', 'create', 'edit']),
  ('department', 'property', 'supervisor', 'property_management', array['view', 'create', 'edit']),
  ('department', 'property', 'manager',    'property_management', array['view', 'create', 'edit', 'approve', 'delete', 'settings', 'costs']),
  -- Marketing
  ('department', 'marketing', 'employee',   'marketing', array['view', 'create', 'edit']),
  ('department', 'marketing', 'supervisor', 'marketing', array['view', 'create', 'edit', 'approve']),
  ('department', 'marketing', 'manager',    'marketing', array['view', 'create', 'edit', 'approve', 'delete', 'settings']),
  -- HR and Payroll (no module of their own)
  ('department', 'hr', 'employee',   'staff',      array['view', 'create', 'edit']),
  ('department', 'hr', 'employee',   'timeclock',  array['view', 'edit']),
  ('department', 'hr', 'employee',   'scheduling', array['view', 'approve']),
  ('department', 'hr', 'supervisor', 'staff',      array['view', 'create', 'edit']),
  ('department', 'hr', 'supervisor', 'scheduling', array['view', 'approve']),
  ('department', 'hr', 'manager',    'staff',      array['view', 'create', 'edit', 'delete']),
  ('department', 'hr', 'manager',    'scheduling', array['view', 'approve']),
  ('department', 'payroll', 'employee', 'timeclock', array['view', 'edit'])
$function$;

-- Modules the old Role Templates carry over as view: only ones every staff member
-- could already read in the database (department-restricted modules stay restricted)
create or replace function public.job_role_open_read_modules()
returns text[] language sql immutable as $function$
  select array['activities', 'chapel', 'communication', 'directory', 'dietary', 'transportation',
               'scheduling', 'timeclock', 'surveys', 'family']
$function$;

create or replace function public.job_role_department_label(p_dept text)
returns text language sql immutable as $function$
  select case p_dept
    when 'it' then 'IT' when 'hr' then 'HR' when 'social_services' then 'Social Services'
    when 'central_supply' then 'Central Supply' when 'property' then 'Property'
    else initcap(replace(p_dept, '_', ' ')) end
$function$;

-- Create (or top up) one community's default Job Roles. Safe to re-run.
create or replace function public.seed_job_roles(p_org uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  v_dept text;
  v_level text;
  v_id uuid;
  v_all_modules text[] := array(select key from modules where key not in ('ai_assist', 'ai_assist_clinical'));
begin
  -- Everyone and Administrator
  insert into job_roles (organization_id, name, description, source)
  values (p_org, 'Everyone', 'Every staff login: file work orders, IT tickets, and incidents; read the shared modules.', 'everyone'),
         (p_org, 'Administrator', 'The Nursing Home Administrator: sees every department, approves, and sees costs.', 'administrator')
  on conflict (organization_id, name) do nothing;

  insert into job_role_permissions (job_role_id, module_key, action)
  select r.id, m, a
    from job_roles r
    join job_role_default_permissions() d on d.kind = r.source
    cross join lateral unnest(case when d.module_key = '*' then v_all_modules else array[d.module_key] end) m
    cross join lateral unnest(d.actions) a
   where r.organization_id = p_org and r.source in ('everyone', 'administrator')
  on conflict do nothing;

  -- Department roles: every department x level that has permissions
  for v_dept, v_level in
    select distinct dd.department, lv.level
      from (select distinct department from job_role_default_permissions() where kind = 'department' and department <> '*'
            union select unnest(array['administration', 'other'])) dd
      cross join (values ('employee'), ('supervisor'), ('manager')) lv(level)
  loop
    if not exists (select 1 from job_role_default_permissions() d
                    where d.kind = 'department' and d.level = v_level and d.department in (v_dept, '*')) then
      continue;
    end if;
    insert into job_roles (organization_id, name, description, source, department, level)
    values (p_org, job_role_department_label(v_dept) || ' ' || initcap(v_level),
            'Given automatically to ' || job_role_department_label(v_dept) || ' ' || initcap(v_level) || 's.',
            'department', v_dept, v_level)
    on conflict (organization_id, name) do nothing;
    select id into v_id from job_roles where organization_id = p_org and source = 'department' and department = v_dept and level = v_level;
    insert into job_role_permissions (job_role_id, module_key, action)
    select v_id, d.module_key, a
      from job_role_default_permissions() d cross join lateral unnest(d.actions) a
     where d.kind = 'department' and d.level = v_level and d.department in (v_dept, '*')
    on conflict do nothing;
  end loop;

  -- Old Role Templates -> view on the modules everyone could already read
  insert into job_roles (organization_id, name, description, source)
  select distinct p_org, 'Template: ' || initcap(replace(v.role::text, '_', ' ')),
         'Carried over from the ' || initcap(replace(v.role::text, '_', ' ')) || ' Role Template.', 'template'
    from role_module_visibility v
   where v.organization_id = p_org and v.role::text not in ('ceo', 'org_admin', 'super_admin', 'family', 'resident', 'sales_rep')
     and v.module_key = any (job_role_open_read_modules())
  on conflict (organization_id, name) do nothing;
  insert into job_role_permissions (job_role_id, module_key, action)
  select r.id, v.module_key, 'view'
    from role_module_visibility v
    join job_roles r on r.organization_id = p_org and r.source = 'template'
                    and r.name = 'Template: ' || initcap(replace(v.role::text, '_', ' '))
   where v.organization_id = p_org and v.module_key = any (job_role_open_read_modules())
  on conflict do nothing;
  -- Role Templates with Edit on Residents could change resident records
  insert into job_role_permissions (job_role_id, module_key, action)
  select r.id, 'directory', a.a
    from role_module_visibility v
    join job_roles r on r.organization_id = p_org and r.source = 'template'
                    and r.name = 'Template: ' || initcap(replace(v.role::text, '_', ' '))
    cross join (values ('create'), ('edit')) a(a)
   where v.organization_id = p_org and v.module_key = 'directory' and coalesce(v.access_level, 'edit') = 'edit'
  on conflict do nothing;
end;
$function$;

-- Keep one person's automatic Job Roles in step with their account type and departments
create or replace function public.sync_user_job_roles(p_profile uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  v_org uuid;
  v_role text;
  v_active boolean;
  v_staff boolean;
begin
  select organization_id, role::text, is_active into v_org, v_role, v_active from profiles where id = p_profile;
  if v_org is null then
    delete from user_job_roles where profile_id = p_profile;
    return;
  end if;
  v_staff := v_active and v_role not in ('family', 'resident', 'sales_rep', 'corporate', 'super_admin');

  -- drop automatic roles that no longer apply
  delete from user_job_roles u using job_roles r
   where u.profile_id = p_profile and u.auto and r.id = u.job_role_id and (
         not v_staff
      or (r.source = 'administrator' and v_role <> 'ceo')
      or (r.source = 'template' and r.name <> 'Template: ' || initcap(replace(v_role, '_', ' ')))
      or (r.source = 'department' and not exists (
            select 1 from staff_department_roles s
             where s.profile_id = p_profile and s.department = r.department and s.level = r.level)));
  if not v_staff then return; end if;

  insert into user_job_roles (profile_id, job_role_id, organization_id, auto)
  select p_profile, r.id, v_org, true from job_roles r
   where r.organization_id = v_org and (
         r.source = 'everyone'
      or (r.source = 'administrator' and v_role = 'ceo')
      or (r.source = 'template' and r.name = 'Template: ' || initcap(replace(v_role, '_', ' ')))
      or (r.source = 'department' and exists (
            select 1 from staff_department_roles s
             where s.profile_id = p_profile and s.department = r.department and s.level = r.level)))
  on conflict (profile_id, job_role_id) do nothing;
end;
$function$;
revoke all on function public.seed_job_roles(uuid), public.sync_user_job_roles(uuid) from public, anon, authenticated;

create or replace function public.trg_sync_job_roles_profile()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  perform sync_user_job_roles(new.id);
  return new;
end;
$function$;
drop trigger if exists trg_sync_job_roles_profile on public.profiles;
create trigger trg_sync_job_roles_profile after insert or update of role, is_active, organization_id on public.profiles
  for each row execute function public.trg_sync_job_roles_profile();

create or replace function public.trg_sync_job_roles_department()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if tg_op in ('UPDATE', 'DELETE') then perform sync_user_job_roles(old.profile_id); end if;
  if tg_op in ('INSERT', 'UPDATE') then perform sync_user_job_roles(new.profile_id); end if;
  return null;
end;
$function$;
drop trigger if exists trg_sync_job_roles_department on public.staff_department_roles;
create trigger trg_sync_job_roles_department after insert or update or delete on public.staff_department_roles
  for each row execute function public.trg_sync_job_roles_department();

create or replace function public.trg_seed_job_roles_org()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  perform seed_job_roles(new.id);
  return new;
end;
$function$;
drop trigger if exists trg_seed_job_roles_org on public.organizations;
create trigger trg_seed_job_roles_org after insert on public.organizations
  for each row execute function public.trg_seed_job_roles_org();

-- Seed every community, assign everyone, and carry over per-person Module Access
do $$
declare o record; p record;
begin
  for o in select id from organizations loop perform seed_job_roles(o.id); end loop;
  for p in select id from profiles where organization_id is not null loop perform sync_user_job_roles(p.id); end loop;
end $$;

-- Module Access by User carried over as what it actually did (the database never honored
-- its Edit): No Access -> remove view; View or Edit -> add view, only on modules everyone
-- could already read, and only when no Job Role gives it already. Administrators and
-- Org Admins are skipped (their access is fixed).
insert into public.user_access_overrides (profile_id, organization_id, module_key, action, allow, set_by)
select u.user_id, u.organization_id, u.module_key, 'view', u.access_level <> 'none', u.granted_by
  from public.user_module_permissions u
  join public.profiles pr on pr.id = u.user_id and pr.organization_id = u.organization_id
 where pr.role::text not in ('ceo', 'org_admin', 'super_admin')
   and (u.access_level = 'none' or u.module_key = any (job_role_open_read_modules()))
   and not (u.access_level <> 'none' and can_user(u.user_id, u.module_key, 'view'))
on conflict (profile_id, module_key, action) do nothing;

-- Parity check used on 2026-10-23 (957 checks, 0 differences for staff): for each
-- staff login x module x action, the old tier helper predicate vs can_user().
