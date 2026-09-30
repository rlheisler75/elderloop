-- Plus tier ($599, 200 residents / 75 staff), Essential staff cap raised to 40,
-- and a monthly AI cost allowance per organization.

-- 1. Limit triggers: Plus is capped too.
create or replace function public.enforce_resident_limit()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
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
  if v_plan not in ('starter', 'essential', 'plus') or v_limit is null then return new; end if;

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
returns trigger language plpgsql security definer set search_path to 'public' as $function$
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
  if v_plan not in ('starter', 'essential', 'plus') or v_limit is null then return new; end if;

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

-- 2. Essential staff cap 20 -> 40.
update organizations set staff_limit = 40 where plan = 'essential';

-- 3. Monthly AI allowance (USD of estimated Anthropic cost). Only ElderLoop can change it.
alter table organizations add column if not exists ai_monthly_budget numeric(8,2) not null default 30;

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
      new.ai_monthly_budget)
     is distinct from
     (old.plan, old.plan_price, old.billing_status, old.billing_note, old.is_active,
      old.subscription_status, old.stripe_customer_id, old.stripe_subscription_id, old.stripe_price_id,
      old.current_period_start, old.current_period_end, old.trial_end, old.cancel_at_period_end,
      old.resident_limit, old.staff_limit, old.rep_id, old.rep_code, old.signup_promo_code,
      old.ai_monthly_budget)
  then
    raise exception 'Plan, billing, and subscription settings can only be changed by ElderLoop'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

-- Estimated cost (USD) of this calendar month's AI calls. Prices per million tokens —
-- keep in sync with AI_MODELS prices in src/pages/admin/AiSettingsTab.jsx. Unknown
-- models are priced as Opus so they can't slip past the budget.
create or replace function public.ai_month_cost(p_org uuid)
returns numeric language sql stable security definer set search_path to 'public' as $function$
  select coalesce(sum(
    (input_tokens  * case when model like 'claude-haiku%' then 1 when model like 'claude-sonnet%' then 2 else 5 end
   + output_tokens * case when model like 'claude-haiku%' then 5 when model like 'claude-sonnet%' then 10 else 25 end
    ) / 1000000.0), 0)
  from ai_usage
  where organization_id = p_org
    and created_at >= date_trunc('month', now() at time zone 'utc') at time zone 'utc'
$function$;
revoke all on function public.ai_month_cost(uuid) from public, anon, authenticated;
grant execute on function public.ai_month_cost(uuid) to service_role;

-- What an org admin sees: percent of their allowance used this month (never dollars).
create or replace function public.ai_month_usage_pct()
returns integer language sql stable security definer set search_path to 'public' as $function$
  select least(100, round(100 * ai_month_cost(o.id) / nullif(o.ai_monthly_budget, 0)))::integer
  from organizations o where o.id = get_my_org_id()
$function$;
revoke all on function public.ai_month_usage_pct() from public, anon;
grant execute on function public.ai_month_usage_pct() to authenticated;
