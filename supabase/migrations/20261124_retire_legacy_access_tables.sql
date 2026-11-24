-- Retire the last pieces of the old access model (step 3 of the 2026-11-23 cleanup).
-- Apply only AFTER the app without Role Templates / Module Access (e33408d) is live:
-- the previous app version still reads role_module_visibility and user_module_permissions.
-- Back up both tables to CSV first.
--
--   * seed_job_roles(): no more "Template: <role>" Job Roles from role_module_visibility
--     (it runs for every new community, so it must change before the table goes).
--   * my_access_tier() / has_department_access(): the *_legacy fallbacks are folded in
--     (both only read department & level from staff_department_roles; behavior unchanged).
--   * Communication policies on broadcast_messages / push_notifications: the
--     user_module_permissions check becomes can('communication', ...) (all 10 old grants
--     are already covered by Job Roles).
--   * is_super_admin() reads profiles.role instead of the super_admins table; the
--     profiles policies that read super_admins directly use is_super_admin(), and the
--     retired Supervisor / Manager account types come out of profiles_select.
--   * Dropped: role_template_view_only(), my_access_tier_legacy(), has_department_access_legacy(),
--     can_see_budget_legacy(), role_module_visibility, user_module_permissions, super_admins.

-- ── seed_job_roles: without the Role Template carry-over ─────────────────────
create or replace function public.seed_job_roles(p_org uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_dept text;
  v_level text;
  v_id uuid;
  v_all_modules text[] := array(select key from modules where key not in ('ai_assist', 'ai_assist_clinical'));
begin
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

  for v_dept, v_level in
    select distinct dd.department, lv.level
      from (select distinct d.department from job_role_default_permissions() d where d.kind = 'department' and d.department <> '*'
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
end;
$function$;

-- ── my_access_tier: department & level fallback folded in ─────────────────────
create or replace function public.my_access_tier(p_module text)
 returns text
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare v_role text; t module_access_thresholds; v_dept text; v_lvl int;
begin
  select role::text into v_role from profiles where id = auth.uid();
  if v_role is null or v_role in ('family', 'resident', 'sales_rep') then return 'none'; end if;
  if v_role = 'super_admin' then return 'super_admin'; end if;
  if v_role = 'org_admin' then return 'org_admin'; end if;
  if v_role = 'ceo' then return 'administrator'; end if;
  if v_role = 'corporate' then return 'corporate'; end if;
  select * into t from module_access_thresholds where module_key = p_module;
  if found then
    if can(p_module, t.manager_action) then return 'manager'; end if;
    if can(p_module, t.supervisor_action) then return 'supervisor'; end if;
    return 'employee';
  end if;
  -- Modules without Job Role thresholds: the highest level held in the module's
  -- department (any department for cross-department modules)
  v_dept := module_department(p_module);
  select max(case level when 'manager' then 2 when 'supervisor' then 1 else 0 end) into v_lvl
    from staff_department_roles
   where profile_id = auth.uid() and (v_dept is null or department = v_dept);
  return case v_lvl when 2 then 'manager' when 1 then 'supervisor' else 'employee' end;
end; $function$;

-- ── has_department_access: department & level fallback folded in ──────────────
create or replace function public.has_department_access(dept text, min_level text default 'employee'::text)
 returns boolean
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare v_role text; t module_access_thresholds; v_any boolean := false;
begin
  select role::text into v_role from profiles where id = auth.uid();
  -- Special account types, and departments with no module of their own (HR, Payroll, ...):
  -- department & level as assigned
  if v_role is null or v_role in ('ceo', 'org_admin', 'super_admin', 'family', 'resident', 'sales_rep', 'corporate')
     or not exists (select 1 from module_access_thresholds where module_department(module_key) = dept) then
    return exists (
      select 1 from staff_department_roles
       where profile_id = auth.uid() and department = dept
         and case level when 'manager' then 2 when 'supervisor' then 1 else 0 end
             >= case min_level when 'manager' then 2 when 'supervisor' then 1 else 0 end);
  end if;
  for t in select * from module_access_thresholds where module_department(module_key) = dept loop
    v_any := v_any or case coalesce(min_level, 'employee')
      when 'manager' then can(t.module_key, t.manager_action)
      when 'supervisor' then can(t.module_key, t.supervisor_action) or can(t.module_key, t.manager_action)
      else can(t.module_key, t.member_action) or can(t.module_key, t.supervisor_action) or can(t.module_key, t.manager_action) end;
  end loop;
  return v_any;
end; $function$;

-- ── Communication: Job Roles instead of user_module_permissions ───────────────
alter policy "communication access insert" on public.broadcast_messages with check (
  ((org_id in (select profiles.organization_id from profiles where profiles.id = auth.uid()))
    and ((exists (select 1 from profiles where profiles.id = auth.uid()
                   and profiles.role = any (array['super_admin'::user_role, 'org_admin'::user_role, 'ceo'::user_role])))
         or (select can('communication', 'edit'))))
  or (get_my_role() = 'super_admin'));

alter policy "communication access read" on public.broadcast_messages using (
  ((org_id in (select profiles.organization_id from profiles where profiles.id = auth.uid()))
    and ((exists (select 1 from profiles where profiles.id = auth.uid()
                   and profiles.role = any (array['super_admin'::user_role, 'org_admin'::user_role, 'ceo'::user_role])))
         or (select can('communication', 'view')) or (select can('communication', 'edit'))))
  or (get_my_role() = 'super_admin'));

alter policy "communication access update" on public.broadcast_messages using (
  ((org_id in (select profiles.organization_id from profiles where profiles.id = auth.uid()))
    and ((exists (select 1 from profiles where profiles.id = auth.uid()
                   and profiles.role = any (array['super_admin'::user_role, 'org_admin'::user_role, 'ceo'::user_role])))
         or (select can('communication', 'edit'))))
  or (get_my_role() = 'super_admin'));

alter policy "communication privileged can insert notifications" on public.push_notifications with check (
  ((org_id in (select profiles.organization_id from profiles where profiles.id = auth.uid()))
    and ((exists (select 1 from profiles where profiles.id = auth.uid()
                   and profiles.role = any (array['super_admin'::user_role, 'org_admin'::user_role, 'ceo'::user_role])))
         or (select can('communication', 'edit'))))
  or (get_my_role() = 'super_admin'));

-- ── Super admins: profiles.role is the one source ─────────────────────────────
create or replace function public.is_super_admin()
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select exists (select 1 from profiles where id = auth.uid() and role = 'super_admin');
$function$;

alter policy profiles_insert_update on public.profiles using (
  (id = auth.uid()) or is_super_admin());

alter policy profiles_select on public.profiles using (
  (id = auth.uid()) or is_super_admin()
  or ((organization_id = get_my_org_id())
      and ((get_my_role() = any (array['org_admin'::text, 'ceo'::text, 'super_admin'::text]))
           or (directory_public = true)
           or has_any_department_level('supervisor'::text))));

-- ── Drop the retired functions and tables ─────────────────────────────────────
drop function public.role_template_view_only(text);
drop function public.my_access_tier_legacy(text);
drop function public.has_department_access_legacy(text, text);
drop function public.can_see_budget_legacy(uuid, text);
drop table public.role_module_visibility;
drop table public.user_module_permissions;
drop table public.super_admins;

-- ── Checks ───────────────────────────────────────────────────────────────────
do $$
declare v_bad text;
begin
  select string_agg(p.proname, ', ') into v_bad
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prokind = 'f'
     and pg_get_functiondef(p.oid) ~ '((from|join|into|update)\s+(public\.)?(role_module_visibility|user_module_permissions|super_admins)\M|\m(my_access_tier_legacy|has_department_access_legacy|can_see_budget_legacy|role_template_view_only)\s*\()';
  if v_bad is not null then raise exception 'functions still use retired access pieces: %', v_bad; end if;

  select string_agg(tablename || '.' || policyname, ', ') into v_bad
    from pg_policies
   where schemaname = 'public'
     and (coalesce(qual, '') || coalesce(with_check, '')) ~ '(role_module_visibility|user_module_permissions|super_admins|_legacy\()';
  if v_bad is not null then raise exception 'policies still use retired access pieces: %', v_bad; end if;
end $$;
