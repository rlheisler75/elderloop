-- Enforce Starter-plan resident and staff limits in the database.
-- Applied via the Supabase MCP (2026-09-30).
--
-- Before: the resident limit was only checked in ResidentDirectory.jsx (bypassable
-- via the API, CSV import, or PointClickCare sync) and the staff limit wasn't
-- checked anywhere. Limits apply only to orgs on the 'starter' plan — the only
-- plan with limits (the Stripe webhook nulls them for essential/professional);
-- pilot orgs can carry the column defaults (50/10) but are unlimited.
--
-- These triggers apply to every caller, including the service role, because staff
-- accounts are created server-side by the create-user Edge Function.

-- ── Residents: adding or reactivating an active resident ──────────────────────
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
  -- Already an active resident of this org: not a new seat
  if tg_op = 'UPDATE' and old.is_active is not false and old.organization_id = new.organization_id then
    return new;
  end if;

  -- Lock the org row so concurrent inserts can't both squeeze under the limit
  select plan, resident_limit into v_plan, v_limit
    from organizations where id = new.organization_id for update;
  if v_plan is distinct from 'starter' or v_limit is null then return new; end if;

  select count(*) into v_count from residents
   where organization_id = new.organization_id and is_active is not false and id <> new.id;
  if v_count >= v_limit then
    raise exception 'Resident limit reached: the Starter plan includes up to % active residents. Upgrade under Admin Panel → Billing to add more.', v_limit
      using errcode = 'P0001', hint = 'plan_limit_residents';
  end if;
  return new;
end;
$function$;

create trigger trg_enforce_resident_limit
  before insert or update of is_active, organization_id on residents
  for each row execute function public.enforce_resident_limit();

-- ── Staff: a profile becoming an active staff member of an org ────────────────
-- "Staff" = any active profile in the org except resident / family portal logins
-- (matches the Staff page's list).
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
  -- Already an active staff member of this org: not a new seat
  if tg_op = 'UPDATE' and old.organization_id = new.organization_id and old.is_active is not false
     and old.role::text not in ('resident', 'family') then
    return new;
  end if;

  select plan, staff_limit into v_plan, v_limit
    from organizations where id = new.organization_id for update;
  if v_plan is distinct from 'starter' or v_limit is null then return new; end if;

  select count(*) into v_count from profiles
   where organization_id = new.organization_id and is_active is not false
     and role::text not in ('resident', 'family') and id <> new.id;
  if v_count >= v_limit then
    raise exception 'Staff limit reached: the Starter plan includes up to % staff accounts. Upgrade under Admin Panel → Billing to add more.', v_limit
      using errcode = 'P0001', hint = 'plan_limit_staff';
  end if;
  return new;
end;
$function$;

create trigger trg_enforce_staff_limit
  before insert or update of organization_id, role, is_active on profiles
  for each row execute function public.enforce_staff_limit();

-- Trigger functions only; nothing should call them over the API
revoke execute on function public.enforce_resident_limit() from public, anon, authenticated;
revoke execute on function public.enforce_staff_limit() from public, anon, authenticated;
