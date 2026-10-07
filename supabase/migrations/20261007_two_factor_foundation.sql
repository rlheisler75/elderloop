-- Two-factor sign-in (HIPAA readiness gap 2), part 1: settings and helper functions.
-- Part 2 (20261007_two_factor_enforcement.sql) adds the database-wide policy that uses them.
--
-- Supabase Auth's built-in TOTP factors (authenticator apps: Google/Microsoft
-- Authenticator, 1Password, Duo Mobile …). After a code is verified the session's JWT
-- carries aal = 'aal2'.
--
-- Who must use it (mfa_required):
--   - super admins, always
--   - in a community with organizations.require_mfa = true: Org Admins, the
--     Administrator (role ceo), Platform Admins, and anyone in the Nursing or
--     Social Services department
--   - never the demo community (its passwords are published)
-- Anyone else may turn it on for themselves in Settings; once they have, every
-- session must pass the code step too (mfa_ok).

alter table public.organizations add column if not exists require_mfa boolean not null default false;
alter table public.organizations add column if not exists is_demo boolean not null default false;

update public.organizations set is_demo = true
 where id = 'a5555c06-f99d-4ec0-ad2f-e3c818466bb2' and not is_demo;

-- require_mfa and is_demo are ElderLoop settings, like plan and access_model.
create or replace function public.protect_org_billing_fields()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
begin
  if coalesce(auth.role(), '') <> 'authenticated' or get_my_role() = 'super_admin' then
    return new;
  end if;

  if (new.plan, new.plan_price, new.billing_status, new.billing_note, new.is_active,
      new.subscription_status, new.stripe_customer_id, new.stripe_subscription_id, new.stripe_price_id,
      new.current_period_start, new.current_period_end, new.trial_end, new.cancel_at_period_end,
      new.resident_limit, new.staff_limit, new.rep_id, new.rep_code, new.signup_promo_code,
      new.ai_monthly_budget, new.access_model, new.corporation_id,
      new.scheduled_plan, new.scheduled_change_at, new.require_mfa, new.is_demo)
     is distinct from
     (old.plan, old.plan_price, old.billing_status, old.billing_note, old.is_active,
      old.subscription_status, old.stripe_customer_id, old.stripe_subscription_id, old.stripe_price_id,
      old.current_period_start, old.current_period_end, old.trial_end, old.cancel_at_period_end,
      old.resident_limit, old.staff_limit, old.rep_id, old.rep_code, old.signup_promo_code,
      old.ai_monthly_budget, old.access_model, old.corporation_id,
      old.scheduled_plan, old.scheduled_change_at, old.require_mfa, old.is_demo)
  then
    raise exception 'Plan, billing, and subscription settings can only be changed by ElderLoop'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

-- Is this person a member of the demo community?
create or replace function public.mfa_is_demo_user(p_user uuid)
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select coalesce((
    select o.is_demo from profiles p join organizations o on o.id = p.organization_id
     where p.id = p_user), false)
$$;

-- Must this person use two-factor sign-in?
create or replace function public.mfa_required(p_user uuid)
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select coalesce((
    select case
      when coalesce(o.is_demo, false) then false
      when p.role::text = 'super_admin' then true
      when coalesce(o.require_mfa, false) and p.is_active is not false and (
             p.role::text in ('org_admin', 'ceo')
          or coalesce(p.is_platform_admin, false)
          or exists (select 1 from staff_department_roles d
                      where d.profile_id = p.id and d.department in ('nursing', 'social_services'))
        ) then true
      else false
    end
    from profiles p left join organizations o on o.id = p.organization_id
    where p.id = p_user), false)
$$;

-- Does this person have a working (verified) authenticator?
create or replace function public.mfa_enrolled(p_user uuid)
returns boolean
language sql stable security definer
set search_path to 'public', 'auth'
as $$
  select exists (select 1 from auth.mfa_factors f
                  where f.user_id = p_user and f.status = 'verified')
$$;

-- The rule every table applies (part 2): a session may read and write data only if
-- it has passed the code step, or the person has no authenticator and isn't required
-- to have one.
create or replace function public.mfa_ok()
returns boolean
language plpgsql stable security definer
set search_path to 'public', 'auth'
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return true;   -- anonymous requests are governed by the other policies
  end if;
  if coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2' then
    return true;
  end if;
  return not public.mfa_enrolled(v_uid) and not public.mfa_required(v_uid);
end;
$$;

-- What the app needs before it loads anything: required / enrolled / demo.
create or replace function public.my_mfa_status()
returns jsonb
language sql stable security definer
set search_path to 'public'
as $$
  select jsonb_build_object(
    'required', public.mfa_required(auth.uid()),
    'enrolled', public.mfa_enrolled(auth.uid()),
    'demo',     public.mfa_is_demo_user(auth.uid())
  )
$$;

-- May the caller reset another person's two-factor (lost phone)?
-- Org Admins and Platform Admins for people in their own community, super admins for
-- anyone. The caller must themselves have passed the code step if they use one.
create or replace function public.can_reset_mfa(p_target uuid)
returns boolean
language plpgsql stable security definer
set search_path to 'public'
as $$
declare
  v_me     profiles%rowtype;
  v_target profiles%rowtype;
begin
  if auth.uid() is null or not public.mfa_ok() then
    return false;
  end if;
  select * into v_me from profiles where id = auth.uid();
  select * into v_target from profiles where id = p_target;
  if v_me.id is null or v_target.id is null then
    return false;
  end if;
  if v_me.role::text = 'super_admin' then
    return true;
  end if;
  if v_target.role::text = 'super_admin' or v_me.organization_id is distinct from v_target.organization_id
     or v_me.is_active is false then
    return false;
  end if;
  return coalesce(v_me.role::text = 'org_admin'
                  or (v_me.role::text = 'ceo' and coalesce(v_me.is_platform_admin, false)), false);
end;
$$;

-- Two-factor status of a community's users, for the Admin Panel. Same callers as
-- can_reset_mfa (plus the Administrator in legacy communities, who manages users there).
create or replace function public.org_mfa_status(p_org uuid)
returns table (profile_id uuid, enrolled boolean, required boolean)
language plpgsql stable security definer
set search_path to 'public'
as $$
declare
  v_me profiles%rowtype;
begin
  select * into v_me from profiles where id = auth.uid();
  if v_me.id is null or not public.mfa_ok() then
    return;
  end if;
  if not (v_me.role::text = 'super_admin'
          or (v_me.organization_id = p_org and v_me.is_active is not false
              and (v_me.role::text in ('org_admin', 'ceo') or coalesce(v_me.is_platform_admin, false)))) then
    return;
  end if;
  return query
    select p.id, public.mfa_enrolled(p.id), public.mfa_required(p.id)
      from profiles p where p.organization_id = p_org;
end;
$$;

revoke execute on function public.mfa_is_demo_user(uuid), public.mfa_required(uuid),
  public.mfa_enrolled(uuid) from public, anon, authenticated;
grant execute on function public.mfa_is_demo_user(uuid), public.mfa_required(uuid),
  public.mfa_enrolled(uuid) to service_role;

revoke execute on function public.mfa_ok(), public.my_mfa_status(), public.can_reset_mfa(uuid),
  public.org_mfa_status(uuid) from public, anon;
grant execute on function public.mfa_ok(), public.my_mfa_status(), public.can_reset_mfa(uuid),
  public.org_mfa_status(uuid) to authenticated, service_role;

-- Demo logins share a published password: nobody may add an authenticator to them,
-- or the first visitor to do so would lock everyone else out.
create or replace function public.block_demo_mfa_enroll()
returns trigger
language plpgsql security definer
set search_path to 'public'
as $$
begin
  if public.mfa_is_demo_user(new.user_id) then
    raise exception 'Two-factor sign-in is not available on demo accounts' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke execute on function public.block_demo_mfa_enroll() from public, anon, authenticated;

drop trigger if exists block_demo_mfa_enroll on auth.mfa_factors;
create trigger block_demo_mfa_enroll before insert on auth.mfa_factors
  for each row execute function public.block_demo_mfa_enroll();
