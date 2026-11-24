-- Remove the Legacy / Tiered access switch (organizations.access_model). Every community
-- has run the tiered rules since 2026-10-21; they are now simply the rules.
--
-- my_org_tiered() is kept (352 policies and 18 functions call it) but now means "the
-- caller belongs to a community", which is exactly what it returned for every user while
-- all communities were tiered. Super admins / corporate users without a community still
-- get false, as before.

create or replace function public.my_org_tiered() returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from profiles p where p.id = auth.uid() and p.organization_id is not null)
$$;
comment on function public.my_org_tiered() is
  'True when the caller belongs to a community. Restrictive policies start with "not my_org_tiered() or ..." so users without a community (super admins, corporate) are judged by their own policies. Historical name: it used to read organizations.access_model (removed 2026-11-23).';

-- The Administrator (NHA) is view + approve outside their modules, unless Emergency Edit.
create or replace function public.nha_write_guard() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_role text; v_plat boolean;
begin
  if coalesce(auth.role(), '') <> 'authenticated' then return coalesce(new, old); end if;

  select p.role::text, p.is_platform_admin into v_role, v_plat from profiles p where p.id = auth.uid();

  if v_role is distinct from 'ceo' then return coalesce(new, old); end if;

  if tg_argv[0] = 'platform' then
    if tg_table_name = 'profiles' and tg_op = 'UPDATE' and old.id = auth.uid() then return new; end if;
    if v_plat then return coalesce(new, old); end if;
    raise exception 'Only a Platform Admin can change settings, users, or modules. Ask your Org Admin, or have them turn on Platform Admin for your account.'
      using errcode = '42501', hint = 'nha_platform_only';
  end if;

  if tg_argv[0] = 'records_ud' and tg_op = 'INSERT' then return new; end if;
  if has_emergency_edit() then return coalesce(new, old); end if;

  raise exception 'Administrators have view and approval access here. To change this record, start Emergency Edit (24 hours, reason required).'
    using errcode = '42501', hint = 'nha_view_only';
end;
$function$;

-- Org Admins manage users; the Administrator only with Platform Admin.
create or replace function public.protect_profile_privileges() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_role  text;
  v_org   uuid;
  v_admin boolean;
begin
  if coalesce(auth.role(), '') <> 'authenticated' then
    return coalesce(new, old);
  end if;
  select p.role::text, p.organization_id,
         p.role::text = 'org_admin' or (p.role::text = 'ceo' and p.is_platform_admin)
    into v_role, v_org, v_admin
    from profiles p
   where p.id = auth.uid();
  if v_role = 'super_admin' then return coalesce(new, old); end if;

  if tg_op = 'DELETE' then
    if v_admin and old.organization_id = v_org and old.role::text not in ('super_admin', 'sales_rep', 'corporate') then
      return old;
    end if;
    raise exception 'Only an Org Admin can remove a user' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if v_admin and new.organization_id = v_org and new.role::text not in ('super_admin', 'sales_rep', 'corporate')
       and new.corporation_id is null then
      return new;
    end if;
    raise exception 'Profiles can only be created through ElderLoop account setup' using errcode = '42501';
  end if;

  if (new.role, new.organization_id, new.is_active, new.is_platform_admin, new.email, new.corporation_id)
     is not distinct from
     (old.role, old.organization_id, old.is_active, old.is_platform_admin, old.email, old.corporation_id) then
    return new;
  end if;

  if v_admin
     and old.organization_id = v_org and new.organization_id = v_org
     and new.corporation_id is not distinct from old.corporation_id
     and new.role::text not in ('super_admin', 'sales_rep', 'corporate')
     and old.role::text not in ('super_admin', 'sales_rep', 'corporate') then
    return new;
  end if;

  raise exception 'Only an Org Admin can change a user''s role, access, email, or community'
    using errcode = '42501';
end;
$function$;

create or replace function public.protect_org_billing_fields() returns trigger
language plpgsql set search_path to 'public' as $function$
begin
  if coalesce(auth.role(), '') <> 'authenticated' or get_my_role() = 'super_admin' then
    return new;
  end if;

  if (new.plan, new.plan_price, new.billing_status, new.billing_note, new.is_active,
      new.subscription_status, new.stripe_customer_id, new.stripe_subscription_id, new.stripe_price_id,
      new.current_period_start, new.current_period_end, new.trial_end, new.cancel_at_period_end,
      new.resident_limit, new.staff_limit, new.rep_id, new.rep_code, new.signup_promo_code,
      new.ai_monthly_budget, new.corporation_id,
      new.scheduled_plan, new.scheduled_change_at, new.require_mfa, new.is_demo, new.phi_allowed)
     is distinct from
     (old.plan, old.plan_price, old.billing_status, old.billing_note, old.is_active,
      old.subscription_status, old.stripe_customer_id, old.stripe_subscription_id, old.stripe_price_id,
      old.current_period_start, old.current_period_end, old.trial_end, old.cancel_at_period_end,
      old.resident_limit, old.staff_limit, old.rep_id, old.rep_code, old.signup_promo_code,
      old.ai_monthly_budget, old.corporation_id,
      old.scheduled_plan, old.scheduled_change_at, old.require_mfa, old.is_demo, old.phi_allowed)
  then
    raise exception 'Plan, billing, and subscription settings can only be changed by ElderLoop'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

-- Budget alerts: the "orders now need approval" sentence always applies.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.check_budget_alerts(date)'::regprocedure);
  d := replace(d, 'select org.id, org.access_model from organizations org', 'select org.id from organizations org');
  d := regexp_replace(d, 'case when o\.access_model = ''tiered''\s+then (format\(.*?v_mname\))\s+else '''' end', '\1');
  if d ilike '%access_model%' then raise exception 'check_budget_alerts still reads access_model'; end if;
  execute d;
end $$;

-- No function, view or policy reads the switch any more.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.prosrc ilike '%access_model%') then
    raise exception 'A function still reads access_model';
  end if;
  if exists (select 1 from pg_policies where (coalesce(qual, '') || coalesce(with_check, '')) ilike '%access_model%') then
    raise exception 'A policy still reads access_model';
  end if;
end $$;

-- The column itself is dropped in 20261123_drop_access_model_column.sql, after the app that
-- no longer reads it is deployed (the old app treats a missing value as Legacy).
