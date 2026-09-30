-- Access tiers, Phase 1: Foundation. No one's access changes in this migration.
-- Design: https://claude.ai/artifact/L8E4t6v4EB6BksyrEfkjD2 (5 tiers: employee,
-- supervisor, manager, administrator = Nursing Home Administrator (ceo role key),
-- corporate; org_admin / Platform Admin sits outside the tiers).

-- ── 1. Security fix: lock privileged profile fields ──────────────────────────
-- The profiles_insert_update policy lets a user write their own row with no
-- column limits, so anyone could set their own role to super_admin, move into
-- another community, or reactivate themselves. This trigger allows those fields
-- to change only for an Org Admin (or ceo, as today) editing someone in their
-- own community, a super admin, or server-side code (service role).
alter table profiles add column if not exists is_platform_admin boolean not null default false;
comment on column profiles.is_platform_admin is
  'Platform Admin switch: lets a Nursing Home Administrator (ceo role) also manage settings, users, and modules once the community uses tiered access. org_admin is always a platform admin.';

create or replace function public.protect_profile_privileges()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare
  v_role text;
  v_org  uuid;
begin
  if coalesce(auth.role(), '') <> 'authenticated' then
    return coalesce(new, old);   -- service role / auth hooks (e.g. handle_new_user)
  end if;
  select role::text, organization_id into v_role, v_org from profiles where id = auth.uid();
  if v_role = 'super_admin' then return coalesce(new, old); end if;

  if tg_op = 'DELETE' then
    if v_role in ('org_admin', 'ceo') and old.organization_id = v_org
       and old.role::text not in ('super_admin', 'sales_rep') then
      return old;
    end if;
    raise exception 'Only an Org Admin can remove a user' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if v_role in ('org_admin', 'ceo') and new.organization_id = v_org
       and new.role::text not in ('super_admin', 'sales_rep') then
      return new;
    end if;
    raise exception 'Profiles can only be created through ElderLoop account setup' using errcode = '42501';
  end if;

  -- UPDATE: ordinary self-edits (name, phone, bio, preferences) pass untouched
  if (new.role, new.organization_id, new.is_active, new.is_platform_admin, new.email)
     is not distinct from
     (old.role, old.organization_id, old.is_active, old.is_platform_admin, old.email) then
    return new;
  end if;

  if v_role in ('org_admin', 'ceo')
     and old.organization_id = v_org and new.organization_id = v_org
     and new.role::text not in ('super_admin', 'sales_rep')
     and old.role::text not in ('super_admin', 'sales_rep') then
    return new;
  end if;

  raise exception 'Only an Org Admin can change a user''s role, access, email, or community'
    using errcode = '42501';
end;
$function$;

drop trigger if exists trg_protect_profile_privileges on profiles;
create trigger trg_protect_profile_privileges
  before insert or update or delete on profiles
  for each row execute function protect_profile_privileges();

-- ── 2. Rollout switch per community ──────────────────────────────────────────
-- legacy = today's behavior; tiered = the 5-tier rules (phases 2+). Only
-- ElderLoop (super admin / server) can flip it: added to the billing-field guard.
alter table organizations add column if not exists access_model text not null default 'legacy';
do $$ begin
  alter table organizations add constraint organizations_access_model_check
    check (access_model in ('legacy', 'tiered'));
exception when duplicate_object then null; end $$;

create or replace function public.protect_org_billing_fields()
returns trigger language plpgsql set search_path to 'public' as $function$
begin
  if coalesce(auth.role(), '') <> 'authenticated' or get_my_role() = 'super_admin' then
    return new;
  end if;

  if (new.plan, new.plan_price, new.billing_status, new.billing_note, new.is_active,
      new.subscription_status, new.stripe_customer_id, new.stripe_subscription_id, new.stripe_price_id,
      new.current_period_start, new.current_period_end, new.trial_end, new.cancel_at_period_end,
      new.resident_limit, new.staff_limit, new.rep_id, new.rep_code, new.signup_promo_code,
      new.ai_monthly_budget, new.access_model)
     is distinct from
     (old.plan, old.plan_price, old.billing_status, old.billing_note, old.is_active,
      old.subscription_status, old.stripe_customer_id, old.stripe_subscription_id, old.stripe_price_id,
      old.current_period_start, old.current_period_end, old.trial_end, old.cancel_at_period_end,
      old.resident_limit, old.staff_limit, old.rep_id, old.rep_code, old.signup_promo_code,
      old.ai_monthly_budget, old.access_model)
  then
    raise exception 'Plan, billing, and subscription settings can only be changed by ElderLoop'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

-- ── 3. Module → department map and tier lookup ───────────────────────────────
-- Keep in sync with MODULE_DEPARTMENTS in src/lib/accessTiers.js.
-- null = cross-department module (incidents, communication, time clock, ...):
-- the tier comes from the highest level the person holds in any department.
create or replace function public.module_department(p_module text)
returns text language sql immutable as $function$
  select case p_module
    when 'work_orders'         then 'maintenance'
    when 'meters'              then 'maintenance'
    when 'dietary'             then 'dietary'
    when 'housekeeping'        then 'housekeeping'
    when 'central_supply'      then 'central_supply'
    when 'social_services'     then 'social_services'
    when 'nursing'             then 'nursing'
    when 'activities'          then 'activities'
    when 'chapel'              then 'activities'
    when 'transportation'      then 'transportation'
    when 'security'            then 'security'
    when 'it'                  then 'it'
    when 'property_management' then 'property'
    when 'marketing'           then 'marketing'
    else null
  end
$function$;

-- The caller's tier for a module: super_admin | org_admin | administrator |
-- manager | supervisor | employee | none. Mirrors tierFor() in accessTiers.js.
create or replace function public.my_access_tier(p_module text)
returns text language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_role text;
  v_dept text := module_department(p_module);
  v_lvl  int;
  v_any  boolean;
begin
  select role::text into v_role from profiles where id = auth.uid();
  if v_role is null or v_role in ('family', 'resident', 'sales_rep') then return 'none'; end if;
  if v_role = 'super_admin' then return 'super_admin'; end if;
  if v_role = 'org_admin'   then return 'org_admin'; end if;
  if v_role = 'ceo'         then return 'administrator'; end if;

  select max(case level when 'manager' then 2 when 'supervisor' then 1 else 0 end),
         bool_or(true)
    into v_lvl, v_any
    from staff_department_roles
   where profile_id = auth.uid()
     and (v_dept is null or department = v_dept);

  if v_lvl = 2 then return 'manager'; end if;
  if v_lvl = 1 then return 'supervisor'; end if;
  if v_lvl = 0 then return 'employee'; end if;

  -- No level in this module's department. Legacy role-only supervisors/managers
  -- (no department rows at all) keep their role; everyone else is an employee here.
  if not exists (select 1 from staff_department_roles where profile_id = auth.uid()) then
    if v_role = 'manager'    then return 'manager'; end if;
    if v_role = 'supervisor' then return 'supervisor'; end if;
  end if;
  return 'employee';
end;
$function$;
revoke all on function public.my_access_tier(text) from public, anon;
grant execute on function public.my_access_tier(text) to authenticated, service_role;

-- Settings / users / modules access: Org Admin always; an NHA only with the switch.
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select coalesce((
    select role::text in ('org_admin', 'super_admin') or (role::text = 'ceo' and is_platform_admin)
      from profiles where id = auth.uid()), false)
$function$;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated, service_role;

-- ── 4. Departments that were missing from custom lists ───────────────────────
-- Communities with their own department list get the new ones appended once.
update organizations o
   set departments = o.departments || (
     select coalesce(jsonb_agg(d), '[]'::jsonb) from jsonb_array_elements(
       '[{"key":"social_services","label":"Social Services"},
         {"key":"central_supply","label":"Central Supply"},
         {"key":"marketing","label":"Marketing"},
         {"key":"property","label":"Property"}]'::jsonb) d
     where not exists (select 1 from jsonb_array_elements(o.departments) e where e->>'key' = d->>'key'))
 where o.departments is not null and jsonb_typeof(o.departments) = 'array';
