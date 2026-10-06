-- Scheduled plan changes. A downgrade made in the Stripe billing portal takes effect
-- at the end of the billing period (Stripe records it as a subscription schedule with
-- a later phase); a cancellation sets cancel_at_period_end. The webhook
-- (api/webhook.js, customer.subscription.updated) now stores the next change so the
-- Billing tab can say "Changes to Essential on Oct 19" instead of looking unchanged.
--   scheduled_plan: the plan key the next phase moves to, or 'canceled'
--   scheduled_change_at: when that happens
-- Both are billing fields: only ElderLoop (server code, super admins) writes them.
alter table organizations add column if not exists scheduled_plan text;
alter table organizations add column if not exists scheduled_change_at timestamptz;

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
      new.scheduled_plan, new.scheduled_change_at)
     is distinct from
     (old.plan, old.plan_price, old.billing_status, old.billing_note, old.is_active,
      old.subscription_status, old.stripe_customer_id, old.stripe_subscription_id, old.stripe_price_id,
      old.current_period_start, old.current_period_end, old.trial_end, old.cancel_at_period_end,
      old.resident_limit, old.staff_limit, old.rep_id, old.rep_code, old.signup_promo_code,
      old.ai_monthly_budget, old.access_model, old.corporation_id,
      old.scheduled_plan, old.scheduled_change_at)
  then
    raise exception 'Plan, billing, and subscription settings can only be changed by ElderLoop'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

-- Wild Winds (live test community) already has a portal downgrade scheduled:
-- Professional until the trial ends, then Essential (Stripe schedule
-- sub_sched_1UNMEZIWdNp2pEQKLny6M8hc, phase start 1792449719).
update organizations
   set scheduled_plan = 'essential', scheduled_change_at = to_timestamp(1792449719)
 where id = '8a80f7ad-d2ee-4c7e-ab6c-35119815287a' and scheduled_plan is null;
