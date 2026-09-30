-- Plan realignment (2026-09-30), applied via the Supabase MCP:
--   Starter      — directory, staff, communication, family; 50 residents / 10 staff (unchanged)
--   Essential    — EVERY module; capped at 100 residents / 20 staff (was 8 modules, unlimited)
--   Professional — every module, unlimited (unchanged)
-- Keep in sync with api/webhook.js, the create-org Edge Function, and src/lib/planModules.js.

create or replace function public.plan_allows_module(p_org_id uuid, p_module text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select case coalesce(o.plan, 'pilot')
    when 'starter' then p_module = any (array['directory', 'staff', 'communication', 'family'])
    else true
  end
  from organizations o where o.id = p_org_id
$function$;

-- Limits now apply to both capped plans (the stored resident_limit / staff_limit
-- decide the number; pilot/professional stay unlimited even with column defaults).
create or replace function public.enforce_resident_limit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_plan  text;
  v_limit integer;
  v_count integer;
begin
  if new.is_active is false or new.organization_id is null then return new; end if;
  if tg_op = 'UPDATE' and old.is_active is not false and old.organization_id = new.organization_id then
    return new;
  end if;

  select plan, resident_limit into v_plan, v_limit
    from organizations where id = new.organization_id for update;
  if v_plan not in ('starter', 'essential') or v_limit is null then return new; end if;

  select count(*) into v_count from residents
   where organization_id = new.organization_id and is_active is not false and id <> new.id;
  if v_count >= v_limit then
    raise exception 'Resident limit reached: your % plan includes up to % active residents. Upgrade under Admin Panel → Billing to add more.', initcap(v_plan), v_limit
      using errcode = 'P0001', hint = 'plan_limit_residents';
  end if;
  return new;
end;
$function$;

create or replace function public.enforce_staff_limit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_plan  text;
  v_limit integer;
  v_count integer;
begin
  if new.organization_id is null or new.is_active is false
     or new.role::text in ('resident', 'family') then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.organization_id = new.organization_id and old.is_active is not false
     and old.role::text not in ('resident', 'family') then
    return new;
  end if;

  select plan, staff_limit into v_plan, v_limit
    from organizations where id = new.organization_id for update;
  if v_plan not in ('starter', 'essential') or v_limit is null then return new; end if;

  select count(*) into v_count from profiles
   where organization_id = new.organization_id and is_active is not false
     and role::text not in ('resident', 'family') and id <> new.id;
  if v_count >= v_limit then
    raise exception 'Staff limit reached: your % plan includes up to % staff accounts. Upgrade under Admin Panel → Billing to add more.', initcap(v_plan), v_limit
      using errcode = 'P0001', hint = 'plan_limit_staff';
  end if;
  return new;
end;
$function$;

-- Existing Essential orgs pick up the new caps (none exist at time of writing)
update organizations set resident_limit = 100, staff_limit = 20 where plan = 'essential';
