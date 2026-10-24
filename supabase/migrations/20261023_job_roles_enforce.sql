-- Job Roles, phase 4 (enforcement). The access helpers every RLS policy and guard
-- uses are rebuilt on can(), so Job Roles decide what people can do. Department &
-- level stay as data (scheduling scope, alert recipients, "supervisor anywhere"
-- checks via has_any_department_level) and hand out the matching Department role.
-- The *_legacy copies keep the old definitions for the parity test. ASCII only.

-- Which action makes someone a member / Supervisor / Manager of a department module
create table if not exists public.module_access_thresholds (
  module_key        text primary key,
  member_action     text not null,
  supervisor_action text not null,
  manager_action    text not null
);
alter table public.module_access_thresholds enable row level security;
create policy module_access_thresholds_read on public.module_access_thresholds for select to authenticated using (true);
insert into public.module_access_thresholds values
  ('work_orders',         'edit',   'approve',  'settings'),
  ('meters',              'create', 'settings', 'settings'),
  ('dietary',             'create', 'edit',     'settings'),
  ('housekeeping',        'create', 'edit',     'settings'),
  ('central_supply',      'create', 'edit',     'edit'),
  ('social_services',     'create', 'edit',     'approve'),
  ('nursing',             'create', 'edit',     'settings'),
  ('activities',          'create', 'edit',     'settings'),
  ('chapel',              'create', 'edit',     'settings'),
  ('transportation',      'edit',   'settings', 'settings'),
  ('security',            'create', 'approve',  'settings'),
  ('it',                  'edit',   'settings', 'settings'),
  ('property_management', 'create', 'settings', 'settings'),
  ('marketing',           'create', 'approve',  'settings')
on conflict (module_key) do update set member_action = excluded.member_action,
  supervisor_action = excluded.supervisor_action, manager_action = excluded.manager_action;

-- Old definitions, kept for the parity test
create or replace function public.my_access_tier_legacy(p_module text)
returns text language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_role text;
  v_dept text := module_department(p_module);
  v_lvl  int;
begin
  select role::text into v_role from profiles where id = auth.uid();
  if v_role is null or v_role in ('family', 'resident', 'sales_rep') then return 'none'; end if;
  if v_role = 'super_admin' then return 'super_admin'; end if;
  if v_role = 'org_admin'   then return 'org_admin'; end if;
  if v_role = 'ceo'         then return 'administrator'; end if;
  if v_role = 'corporate'   then return 'corporate'; end if;
  select max(case level when 'manager' then 2 when 'supervisor' then 1 else 0 end)
    into v_lvl from staff_department_roles
   where profile_id = auth.uid() and (v_dept is null or department = v_dept);
  if v_lvl = 2 then return 'manager'; end if;
  if v_lvl = 1 then return 'supervisor'; end if;
  if v_lvl = 0 then return 'employee'; end if;
  if not exists (select 1 from staff_department_roles where profile_id = auth.uid()) then
    if v_role = 'manager'    then return 'manager'; end if;
    if v_role = 'supervisor' then return 'supervisor'; end if;
  end if;
  return 'employee';
end;
$function$;

create or replace function public.has_department_access_legacy(dept text, min_level text default 'employee')
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (
    select 1 from staff_department_roles
     where profile_id = auth.uid() and department = dept
       and case level when 'manager' then 2 when 'supervisor' then 1 else 0 end
         >= case min_level when 'manager' then 2 when 'supervisor' then 1 else 0 end)
$function$;

-- Tier in a department module, from Job Roles
create or replace function public.my_access_tier(p_module text)
returns text language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_role text;
  t module_access_thresholds;
begin
  select role::text into v_role from profiles where id = auth.uid();
  if v_role is null or v_role in ('family', 'resident', 'sales_rep') then return 'none'; end if;
  if v_role = 'super_admin' then return 'super_admin'; end if;
  if v_role = 'org_admin'   then return 'org_admin'; end if;
  if v_role = 'ceo'         then return 'administrator'; end if;
  if v_role = 'corporate'   then return 'corporate'; end if;
  select * into t from module_access_thresholds where module_key = p_module;
  if not found then return my_access_tier_legacy(p_module); end if;   -- modules without a department
  if can(p_module, t.manager_action) then return 'manager'; end if;
  if can(p_module, t.supervisor_action) then return 'supervisor'; end if;
  return 'employee';
end;
$function$;

-- Department access, from Job Roles (departments without a module of their own, such
-- as HR and Payroll, and the Administrator / Org Admins keep the department check)
create or replace function public.has_department_access(dept text, min_level text default 'employee')
returns boolean language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_role text;
  t module_access_thresholds;
  v_any boolean := false;
begin
  select role::text into v_role from profiles where id = auth.uid();
  if v_role is null or v_role in ('ceo', 'org_admin', 'super_admin', 'family', 'resident', 'sales_rep', 'corporate')
     or not exists (select 1 from module_access_thresholds where module_department(module_key) = dept) then
    return has_department_access_legacy(dept, min_level);
  end if;
  for t in select * from module_access_thresholds where module_department(module_key) = dept loop
    v_any := v_any or case coalesce(min_level, 'employee')
      when 'manager'    then can(t.module_key, t.manager_action)
      when 'supervisor' then can(t.module_key, t.supervisor_action) or can(t.module_key, t.manager_action)
      else can(t.module_key, t.member_action) or can(t.module_key, t.supervisor_action) or can(t.module_key, t.manager_action)
    end;
  end loop;
  return v_any;
end;
$function$;

create or replace function public.can_see_budget_legacy(p_org uuid, p_department text)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select coalesce(
    get_my_role() = 'super_admin'
    or (my_corporation_id() is not null and my_corporation_id() = (select corporation_id from organizations where id = p_org))
    or (get_my_org_id() is not null and p_org = get_my_org_id() and (
          get_my_role() in ('org_admin', 'ceo')
          or exists (select 1 from staff_department_roles d
                      where d.profile_id = auth.uid() and d.department = p_department and d.level = 'manager'))),
    false)
$function$;

create or replace function public.can_see_budget(p_org uuid, p_department text)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select coalesce(
    get_my_role() = 'super_admin'
    or (my_corporation_id() is not null and my_corporation_id() = (select corporation_id from organizations where id = p_org))
    or (get_my_org_id() is not null and p_org = get_my_org_id() and (
          get_my_role() in ('org_admin', 'ceo')
          or can(case p_department when 'maintenance' then 'work_orders' else p_department end, 'costs'))),
    false)
$function$;

create or replace function public.supply_can_bill()
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select coalesce(
    get_my_role() in ('org_admin', 'super_admin')
    or (get_my_role() = 'ceo' and not my_org_tiered())
    or (get_my_role() <> 'ceo' and can('central_supply', 'costs')),
    false)
$function$;

create or replace function public.sched_sees_all()
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select coalesce(get_my_role() in ('ceo', 'org_admin', 'super_admin'), false)
      or is_platform_admin()
      or can('scheduling', 'approve')
$function$;

-- The Administrator kept these through the old "any supervisor / manager" checks
insert into public.job_role_permissions (job_role_id, module_key, action)
select r.id, x.m, x.a from public.job_roles r
 cross join (values ('scheduling', 'edit'), ('scheduling', 'settings'), ('timeclock', 'edit'),
                    ('staff', 'create'), ('staff', 'edit'), ('staff', 'delete')) x(m, a)
 where r.source = 'administrator'
on conflict do nothing;

-- Old Role Templates with Edit on Residents could change resident records
insert into public.job_role_permissions (job_role_id, module_key, action)
select r.id, 'directory', a.a
  from public.role_module_visibility v
  join public.job_roles r on r.organization_id = v.organization_id and r.source = 'template'
                          and r.name = 'Template: ' || initcap(replace(v.role::text, '_', ' '))
  cross join (values ('create'), ('edit')) a(a)
 where v.module_key = 'directory' and coalesce(v.access_level, 'edit') = 'edit'
on conflict do nothing;

-- Shared-module rules that used "any supervisor / manager": now named permissions
do $do$
declare
  spec text[][] := array[
    ['time_punches',         $$user_id = auth.uid() or can('timeclock','edit')$$, $$user_id = auth.uid() or can('timeclock','edit')$$, $$user_id = auth.uid() or can('timeclock','edit')$$, $$get_my_role() = 'super_admin'$$],
    ['scheduled_shifts',     null, $$can('scheduling','edit')$$, $$can('scheduling','edit')$$, $$can('scheduling','edit')$$],
    ['shift_templates',      null, $$can('scheduling','settings')$$, $$can('scheduling','settings')$$, $$can('scheduling','settings')$$],
    ['shift_swaps',          $$requester_id = auth.uid() or target_id = auth.uid() or is_open_request or can('scheduling','edit')$$,
                             $$requester_id = auth.uid()$$,
                             $$requester_id = auth.uid() or target_id = auth.uid() or is_open_request or can('scheduling','edit')$$,
                             $$requester_id = auth.uid() or can('scheduling','edit')$$],
    ['staff_certifications', $$staff_id = auth.uid() or can('staff','view')$$, $$staff_id = auth.uid() or can('staff','create')$$,
                             $$staff_id = auth.uid() or can('staff','edit')$$, $$can('staff','delete')$$],
    ['announcements',        null, $$can('communication','create')$$, $$can('communication','edit')$$, $$can('communication','edit')$$]
  ];
  i int; t text;
begin
  for i in 1 .. array_length(spec, 1) loop
    t := spec[i][1];
    execute format('drop policy if exists tier_sel on public.%I', t);
    execute format('drop policy if exists tier_ins on public.%I', t);
    execute format('drop policy if exists tier_upd on public.%I', t);
    execute format('drop policy if exists tier_del on public.%I', t);
    if spec[i][2] is not null then
      execute format('create policy tier_sel on public.%I as restrictive for select to authenticated using (not (select my_org_tiered()) or (%s))', t, spec[i][2]);
    end if;
    execute format('create policy tier_ins on public.%I as restrictive for insert to authenticated with check (not (select my_org_tiered()) or (%s))', t, spec[i][3]);
    execute format('create policy tier_upd on public.%I as restrictive for update to authenticated using (not (select my_org_tiered()) or (%s))', t, spec[i][4]);
    execute format('create policy tier_del on public.%I as restrictive for delete to authenticated using (not (select my_org_tiered()) or (%s))', t, spec[i][5]);
  end loop;
end $do$;

-- View only = no write permission in the module (Job Roles), instead of the old Role
-- Template setting. Portal logins are governed by portal_scope, not this guard.
create or replace function public.role_view_only_guard()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare m text := tg_argv[0];
begin
  if coalesce(auth.role(), '') <> 'authenticated' then return coalesce(new, old); end if;
  if is_portal_user() then return coalesce(new, old); end if;
  if tg_nargs > 1 and tg_argv[1] = 'requests' and tg_op = 'INSERT' then return new; end if;
  if not (can(m, 'create') or can(m, 'edit') or can(m, 'approve') or can(m, 'delete') or can(m, 'settings') or can(m, 'costs')) then
    raise exception 'You have view-only access to this module. Ask your Org Admin if you need to make changes.'
      using errcode = '42501', hint = 'role_view_only';
  end if;
  return coalesce(new, old);
end;
$function$;

-- The Dietary Manager buys food through Central Supply but never saw its budget or
-- billed resident charges (parity test 2026-10-23)
delete from public.job_role_permissions p using public.job_roles r
 where r.id = p.job_role_id and r.source = 'department' and r.department = 'dietary' and r.level = 'manager'
   and p.module_key = 'central_supply' and p.action = 'costs';
