-- Job Roles, phase 1 (foundation). Nothing reads these yet; phase 4 switches RLS
-- and the screens to can(). ASCII only (the hosted SQL tool rejects some characters).
--
-- A Job Role is a per-community bundle of (module, action) permissions. A person can
-- hold several. Actions: view, create, edit, approve, delete, settings, costs. View is its own
-- permission (Create alone never opens everyone's records). Per-person overrides add or remove one
-- permission. Org Admins and super admins can do everything; the Administrator (NHA)
-- also gets create / edit / delete everywhere while Emergency Edit is on.
--
-- Defaults per community (source):
--   everyone      - every staff login (file work orders, IT tickets, incidents; read
--                   the shared modules)
--   administrator - the NHA (role ceo)
--   department    - <Department> Employee / Supervisor / Manager, auto-assigned from
--                   staff_department_roles and kept in sync by trigger
--   template      - the old Role Templates, carried over as view permissions
--   custom        - made by the community

create table if not exists public.job_roles (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  description     text,
  source          text not null default 'custom' check (source in ('custom', 'everyone', 'administrator', 'department', 'template')),
  department      text,
  level           text check (level in ('employee', 'supervisor', 'manager')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, name)
);
create unique index if not exists job_roles_dept_level_uq on public.job_roles (organization_id, department, level) where source = 'department';

create table if not exists public.job_role_permissions (
  job_role_id uuid not null references public.job_roles(id) on delete cascade,
  module_key  text not null,
  action      text not null check (action in ('view', 'create', 'edit', 'approve', 'delete', 'settings', 'costs')),
  primary key (job_role_id, module_key, action)
);

create table if not exists public.user_job_roles (
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  job_role_id     uuid not null references public.job_roles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  auto            boolean not null default false,   -- given by department & level (or Everyone / Administrator)
  assigned_by     uuid references public.profiles(id),
  assigned_at     timestamptz not null default now(),
  primary key (profile_id, job_role_id)
);
create index if not exists user_job_roles_role_idx on public.user_job_roles(job_role_id);

create table if not exists public.user_access_overrides (
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module_key      text not null,
  action          text not null check (action in ('view', 'create', 'edit', 'approve', 'delete', 'settings', 'costs')),
  allow           boolean not null,
  set_by          uuid references public.profiles(id),
  set_at          timestamptz not null default now(),
  primary key (profile_id, module_key, action)
);

-- Who manages Job Roles: the same people who manage users (Org Admin, Platform Admin)
create or replace function public.can_manage_access(p_org uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select coalesce(get_my_role() = 'super_admin'
    or (p_org = get_my_org_id() and is_platform_admin()), false)
$function$;

alter table public.job_roles enable row level security;
alter table public.job_role_permissions enable row level security;
alter table public.user_job_roles enable row level security;
alter table public.user_access_overrides enable row level security;

create policy job_roles_read on public.job_roles for select to authenticated
  using (organization_id = (select get_my_org_id()) or (select get_my_role()) = 'super_admin');
create policy job_roles_write on public.job_roles for all to authenticated
  using ((select can_manage_access(organization_id))) with check ((select can_manage_access(organization_id)));
create policy job_role_permissions_read on public.job_role_permissions for select to authenticated
  using (exists (select 1 from job_roles r where r.id = job_role_id));
create policy job_role_permissions_write on public.job_role_permissions for all to authenticated
  using (exists (select 1 from job_roles r where r.id = job_role_id and can_manage_access(r.organization_id)))
  with check (exists (select 1 from job_roles r where r.id = job_role_id and can_manage_access(r.organization_id)));
create policy user_job_roles_read on public.user_job_roles for select to authenticated
  using (profile_id = auth.uid() or (select can_manage_access(organization_id)));
create policy user_job_roles_write on public.user_job_roles for all to authenticated
  using ((select can_manage_access(organization_id))) with check ((select can_manage_access(organization_id)));
create policy user_access_overrides_read on public.user_access_overrides for select to authenticated
  using (profile_id = auth.uid() or (select can_manage_access(organization_id)));
create policy user_access_overrides_write on public.user_access_overrides for all to authenticated
  using ((select can_manage_access(organization_id))) with check ((select can_manage_access(organization_id)));

do $$
declare t text;
begin
  foreach t in array array['job_roles', 'job_role_permissions', 'user_job_roles', 'user_access_overrides'] loop
    execute format('create policy mfa_gate on public.%I as restrictive for all to authenticated using ((select mfa_ok())) with check ((select mfa_ok()))', t);
    execute format('create policy staff_only_no_portal on public.%I as restrictive for all to authenticated using (not (select is_portal_user())) with check (not (select is_portal_user()))', t);
  end loop;
end $$;

grant select, insert, update, delete on public.job_roles, public.job_role_permissions, public.user_job_roles, public.user_access_overrides to authenticated;

-- can_user(profile, module, action): the one access check. can() = for the caller.
create or replace function public.can_user(p_profile uuid, p_module text, p_action text)
returns boolean language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_role  text;
  v_allow boolean;
begin
  select role::text into v_role from profiles where id = p_profile and is_active;
  if v_role is null or v_role in ('family', 'resident', 'sales_rep', 'corporate') then return false; end if;
  if v_role in ('org_admin', 'super_admin') then return true; end if;
  select allow into v_allow from user_access_overrides
   where profile_id = p_profile and module_key = p_module and action = p_action;
  if found then return v_allow; end if;
  if v_role = 'ceo' and p_action in ('create', 'edit', 'delete')
     and exists (select 1 from access_overrides where profile_id = p_profile and ended_at is null and expires_at > now()) then
    return true;
  end if;
  return exists (
    select 1 from user_job_roles u join job_role_permissions p on p.job_role_id = u.job_role_id
     where u.profile_id = p_profile and p.module_key = p_module and p.action = p_action);
end;
$function$;

create or replace function public.can(p_module text, p_action text)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select can_user(auth.uid(), p_module, p_action)
$function$;
revoke all on function public.can_user(uuid, text, text) from public, anon, authenticated;
grant execute on function public.can(text, text) to authenticated;

-- The caller's effective permissions, for the app (AuthContext)
create or replace function public.my_permissions()
returns table (module_key text, action text) language sql stable security definer set search_path to 'public' as $function$
  with base as (
    select p.module_key, p.action from user_job_roles u join job_role_permissions p on p.job_role_id = u.job_role_id
     where u.profile_id = auth.uid()
    union
    select module_key, action from user_access_overrides where profile_id = auth.uid() and allow
  )
  select distinct b.module_key, b.action from base b
   where not exists (select 1 from user_access_overrides o
                      where o.profile_id = auth.uid() and o.module_key = b.module_key and o.action = b.action and not o.allow)
$function$;
grant execute on function public.my_permissions() to authenticated;

-- Effective access for one person with where each permission comes from (admin view)
create or replace function public.user_effective_access(p_profile uuid)
returns table (module_key text, action text, allowed boolean, sources text[]) language plpgsql stable security definer set search_path to 'public' as $function$
declare v_org uuid;
begin
  select organization_id into v_org from profiles where id = p_profile;
  if not can_manage_access(v_org) and p_profile <> auth.uid() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query
  with grants as (
    select p.module_key, p.action, r.name as src
      from user_job_roles u join job_roles r on r.id = u.job_role_id join job_role_permissions p on p.job_role_id = r.id
     where u.profile_id = p_profile
    union all
    select o.module_key, o.action, case when o.allow then 'Added for this person' else 'Removed for this person' end
      from user_access_overrides o where o.profile_id = p_profile
  )
  select g.module_key, g.action, can_user(p_profile, g.module_key, g.action), array_agg(distinct g.src)
    from grants g group by g.module_key, g.action;
end;
$function$;
grant execute on function public.user_effective_access(uuid) to authenticated;
