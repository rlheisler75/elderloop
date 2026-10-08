-- "Health data allowed" switch per community (organizations.phi_allowed).
-- ElderLoop may hold Protected Health Information for a community only once business
-- associate agreements are signed with that community and with Supabase (HIPAA add-on).
-- Until a super admin turns this on (Super Admin → Organizations → Health data):
--   - the health modules (Nursing Notes, Social Services, Incident Reports, clinical AI)
--     can't be turned on: organization_modules rows for them are forced off, so the
--     Stripe webhook / plan changes can't switch them on either;
--   - the clinical tables refuse new or changed rows for that community (phi_write_guard),
--     whoever writes — the app, imports, or server code.
-- Resident directory, work orders, dietary menus etc. stay available; residents' names
-- and rooms are still sensitive, so don't import them before the BAAs either.
-- phi_allowed is an ElderLoop setting (protect_org_billing_fields), like require_mfa.

alter table public.organizations add column if not exists phi_allowed boolean not null default false;

-- The demo community holds only made-up records.
update public.organizations set phi_allowed = true where is_demo and not phi_allowed;

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
      new.scheduled_plan, new.scheduled_change_at, new.require_mfa, new.is_demo, new.phi_allowed)
     is distinct from
     (old.plan, old.plan_price, old.billing_status, old.billing_note, old.is_active,
      old.subscription_status, old.stripe_customer_id, old.stripe_subscription_id, old.stripe_price_id,
      old.current_period_start, old.current_period_end, old.trial_end, old.cancel_at_period_end,
      old.resident_limit, old.staff_limit, old.rep_id, old.rep_code, old.signup_promo_code,
      old.ai_monthly_budget, old.access_model, old.corporation_id,
      old.scheduled_plan, old.scheduled_change_at, old.require_mfa, old.is_demo, old.phi_allowed)
  then
    raise exception 'Plan, billing, and subscription settings can only be changed by ElderLoop'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

create or replace function public.phi_allowed_for(p_org uuid)
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select coalesce((select phi_allowed from organizations where id = p_org), false)
$$;

create or replace function public.phi_module_keys()
returns text[]
language sql immutable
as $$ select array['nursing', 'social_services', 'incidents', 'ai_assist_clinical'] $$;

-- Health modules stay off while the community isn't cleared for health data.
create or replace function public.phi_module_guard()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if coalesce(new.is_enabled, true) and new.module_key = any(public.phi_module_keys())
     and not public.phi_allowed_for(new.organization_id) then
    new.is_enabled := false;
  end if;
  return new;
end;
$$;

drop trigger if exists phi_module_guard on public.organization_modules;
create trigger phi_module_guard before insert or update on public.organization_modules
  for each row execute function public.phi_module_guard();

-- Turning the switch off also turns the health modules off.
create or replace function public.phi_switch_off()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if old.phi_allowed and not new.phi_allowed then
    update organization_modules set is_enabled = false
     where organization_id = new.id and module_key = any(public.phi_module_keys());
  end if;
  return new;
end;
$$;

drop trigger if exists phi_switch_off on public.organizations;
create trigger phi_switch_off after update of phi_allowed on public.organizations
  for each row execute function public.phi_switch_off();

-- Clinical tables refuse writes for a community that isn't cleared for health data.
create or replace function public.phi_write_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row jsonb := to_jsonb(new);
  v_org uuid;
begin
  v_org := nullif(v_row ->> 'organization_id', '')::uuid;
  if v_org is null and v_row ? 'resident_id' then
    select organization_id into v_org from residents where id = nullif(v_row ->> 'resident_id', '')::uuid;
  end if;
  if not public.phi_allowed_for(v_org) then
    raise exception 'Health information isn''t turned on for this community yet. ElderLoop turns it on once the business associate agreements are signed.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'care_notes', 'resident_vitals', 'resident_medications', 'resident_dietary_profiles',
    'resident_medical_contacts', 'incident_reports',
    'ss_care_conferences', 'ss_case_notes', 'ss_discharge_plans', 'ss_goals',
    'ss_grievances', 'ss_mood_logs', 'ss_referrals', 'ss_social_profiles'
  ] loop
    execute format('drop trigger if exists phi_write_guard on public.%I', t);
    execute format('create trigger phi_write_guard before insert or update on public.%I '
                   'for each row execute function public.phi_write_guard()', t);
  end loop;
end $$;

-- Communities not cleared: health modules off now.
update public.organization_modules m set is_enabled = false
  from public.organizations o
 where o.id = m.organization_id and not o.phi_allowed
   and m.module_key = any(public.phi_module_keys()) and m.is_enabled;

revoke execute on function public.phi_module_guard(), public.phi_switch_off(), public.phi_write_guard()
  from public, anon, authenticated;
revoke execute on function public.phi_allowed_for(uuid) from public, anon;
grant execute on function public.phi_allowed_for(uuid) to authenticated, service_role;
