-- Close the "enable modules you haven't paid for" loophole.
-- Applied via the Supabase MCP (2026-09-30).
--
-- Before: org admins/CEOs could write any organization_modules row for their org
-- (and the Admin Panel's Org Settings modal let them toggle every module), and
-- org admins/CEOs/managers could update ANY organizations column — including
-- plan, billing/subscription status, limits, Stripe ids, and rep attribution.

-- 1. Which modules a plan includes. Must stay in sync with PLAN_MODULE_KEYS in
--    api/webhook.js, the create-org Edge Function, and src/lib/planModules.js.
--    professional, pilot (the column default), and anything else = every module.
--    The AI add-on modules are gated separately (super-admin-only policies).
create or replace function public.plan_allows_module(p_org_id uuid, p_module text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select case coalesce(o.plan, 'pilot')
    when 'starter'   then p_module = any (array['directory', 'staff', 'communication', 'family'])
    when 'essential' then p_module = any (array['directory', 'staff', 'communication', 'family',
                                                'chapel', 'activities', 'incidents', 'nursing'])
    else true
  end
  from organizations o where o.id = p_org_id
$function$;

revoke execute on function public.plan_allows_module(uuid, text) from public, anon;
grant  execute on function public.plan_allows_module(uuid, text) to authenticated, service_role;

-- 2. Org admins may turn any module OFF, but only turn ON modules their plan
--    includes. Restrictive = ANDed with the existing permissive policies.
create policy plan_modules_insert on organization_modules
  as restrictive for insert
  with check (is_enabled = false or get_my_role() = 'super_admin' or plan_allows_module(organization_id, module_key));

create policy plan_modules_update on organization_modules
  as restrictive for update
  using (true)
  with check (is_enabled = false or get_my_role() = 'super_admin' or plan_allows_module(organization_id, module_key));

-- 3. Billing / plan / Stripe / rep fields: super admins and server-side code
--    (service role: Stripe webhook, Edge Functions) only. Org admins can still
--    edit name, address, logo, departments, compliance state, etc.
create or replace function public.protect_org_billing_fields()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  -- Service role / direct SQL have no 'authenticated' JWT role
  if coalesce(auth.role(), '') <> 'authenticated' or get_my_role() = 'super_admin' then
    return new;
  end if;

  if (new.plan, new.plan_price, new.billing_status, new.billing_note, new.is_active,
      new.subscription_status, new.stripe_customer_id, new.stripe_subscription_id, new.stripe_price_id,
      new.current_period_start, new.current_period_end, new.trial_end, new.cancel_at_period_end,
      new.resident_limit, new.staff_limit, new.rep_id, new.rep_code, new.signup_promo_code)
     is distinct from
     (old.plan, old.plan_price, old.billing_status, old.billing_note, old.is_active,
      old.subscription_status, old.stripe_customer_id, old.stripe_subscription_id, old.stripe_price_id,
      old.current_period_start, old.current_period_end, old.trial_end, old.cancel_at_period_end,
      old.resident_limit, old.staff_limit, old.rep_id, old.rep_code, old.signup_promo_code)
  then
    raise exception 'Plan, billing, and subscription settings can only be changed by ElderLoop'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

create trigger trg_protect_org_billing_fields
  before update on organizations
  for each row execute function public.protect_org_billing_fields();
