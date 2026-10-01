-- Access tiers, Phase 4 · the remaining modules: Activities, Chapel, Transportation,
-- Security, IT, Meters, Property, Time Clock & Scheduling, Staff certifications,
-- Announcements, Marketing. RESTRICTIVE policies that only bite when the caller's
-- community is on access_model = 'tiered'. (Portal users are already kept out of
-- all of these by 20260930_portal_isolation.sql.)

-- ── Shared helpers ───────────────────────────────────────────────────────────
-- 'administrator' (NHA), org_admin, and super_admin pass every check here so the
-- NHA's writes reach nha_write_guard and get its clear message.
create or replace function public.tier_rank(p_tier text)
returns int language sql immutable as $function$
  select case p_tier when 'employee' then 0 when 'supervisor' then 1 when 'manager' then 2
                     when 'administrator' then 9 when 'org_admin' then 9 when 'super_admin' then 9 else -1 end
$function$;
create or replace function public.t_at_least(p_module text, p_min text)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select tier_rank(my_access_tier(p_module)) >= tier_rank(p_min)
$function$;
-- Someone who works in this module's department (any level), or Supervisor+ there
create or replace function public.t_member(p_module text)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select t_at_least(p_module, 'supervisor')
      or (module_department(p_module) is not null
          and has_department_access(module_department(p_module), 'employee'))
$function$;
-- Supervisor+ in any department (scheduling, time clock, announcements)
create or replace function public.t_any_supervisor()
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select has_any_department_level('supervisor')
      or get_my_role() in ('supervisor', 'manager', 'ceo', 'org_admin', 'super_admin')
$function$;
create or replace function public.t_any_manager()
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select has_any_department_level('manager')
      or get_my_role() in ('manager', 'ceo', 'org_admin', 'super_admin')
$function$;
revoke all on function public.t_at_least(text, text), public.t_member(text), public.t_any_supervisor(), public.t_any_manager() from public, anon;
grant execute on function public.t_at_least(text, text), public.t_member(text), public.t_any_supervisor(), public.t_any_manager() to authenticated, service_role;

-- ── Policies from one spec: table | select | insert | update | delete ────────
-- null = no extra limit for that command. Each expression is prefixed with
-- "not tiered or …".
do $do$
declare
  r record;
  spec text[][] := array[
    -- Activities & Chapel: everyone reads the calendar; Activities staff record
    -- attendance; Supervisor+ runs the calendar; Manager deletes
    ['activities',          null, $$t_at_least('activities','supervisor')$$, $$t_at_least('activities','supervisor')$$, $$t_at_least('activities','manager')$$],
    ['activity_attendance', null, $$t_member('activities')$$,                $$t_member('activities')$$,                $$t_at_least('activities','supervisor')$$],
    ['chapel_services',     null, $$t_at_least('chapel','supervisor')$$,     $$t_at_least('chapel','supervisor')$$,     $$t_at_least('chapel','manager')$$],
    -- Transportation: anyone may schedule a trip; drivers/dispatch work them;
    -- the scheduler can still edit their own request; vehicles are the Manager's
    ['trips',    null, null, $$t_member('transportation') or scheduled_by = auth.uid()$$, $$t_at_least('transportation','manager')$$],
    ['vehicles', null, $$t_at_least('transportation','manager')$$, $$t_at_least('transportation','manager')$$, $$t_at_least('transportation','manager')$$],
    -- Security: Security staff only; checkpoints are the Manager's, schedules Supervisor+
    ['security_rounds',      $$t_member('security')$$, $$t_member('security')$$, $$t_member('security')$$, $$t_at_least('security','manager')$$],
    ['security_checkins',    $$t_member('security')$$, $$t_member('security') and guard_id = auth.uid()$$, $$t_at_least('security','supervisor')$$, $$t_at_least('security','manager')$$],
    ['security_checkpoints', $$t_member('security')$$, $$t_at_least('security','manager')$$, $$t_at_least('security','manager')$$, $$t_at_least('security','manager')$$],
    ['security_schedules',   $$t_member('security')$$, $$t_at_least('security','supervisor')$$, $$t_at_least('security','supervisor')$$, $$t_at_least('security','manager')$$],
    ['security_reports',     $$t_member('security') or filed_by = auth.uid()$$, $$t_member('security')$$, $$t_at_least('security','supervisor') or filed_by = auth.uid()$$, $$t_at_least('security','manager')$$],
    -- IT: anyone files a ticket and follows their own; IT works the queue;
    -- assets by IT staff, licenses (costs) by the IT Manager
    ['it_tickets',  $$submitted_by = auth.uid() or t_member('it')$$, null, $$submitted_by = auth.uid() or t_member('it')$$, $$t_at_least('it','manager')$$],
    ['it_assets',   $$t_member('it')$$, $$t_at_least('it','manager')$$, $$t_member('it')$$, $$t_at_least('it','manager')$$],
    ['it_licenses', $$t_at_least('it','manager')$$, $$t_at_least('it','manager')$$, $$t_at_least('it','manager')$$, $$t_at_least('it','manager')$$],
    -- Meters (Maintenance department): staff read and record; Manager sets meters/rates
    ['meters',         $$t_member('meters')$$, $$t_at_least('meters','manager')$$, $$t_at_least('meters','manager')$$, $$t_at_least('meters','manager')$$],
    ['utility_types',  $$t_member('meters')$$, $$t_at_least('meters','manager')$$, $$t_at_least('meters','manager')$$, $$t_at_least('meters','manager')$$],
    ['meter_readings', $$t_member('meters')$$, $$t_member('meters')$$, $$t_member('meters')$$, $$t_at_least('meters','manager')$$],
    -- Property: staff handle units, keys, walkthroughs; leases, tenants, rent,
    -- deposits, and notices are the Property Manager's (the NHA approves refunds)
    ['il_units',             $$t_member('property_management')$$, $$t_at_least('property_management','manager')$$, $$t_member('property_management')$$, $$t_at_least('property_management','manager')$$],
    ['il_keys',              $$t_member('property_management')$$, $$t_member('property_management')$$, $$t_member('property_management')$$, $$t_at_least('property_management','manager')$$],
    ['il_walkthroughs',      $$t_member('property_management')$$, $$t_member('property_management')$$, $$t_member('property_management')$$, $$t_at_least('property_management','manager')$$],
    ['il_walkthrough_items', $$t_member('property_management')$$, $$t_member('property_management')$$, $$t_member('property_management')$$, $$t_at_least('property_management','manager')$$],
    ['il_leases',            $$t_at_least('property_management','manager')$$, $$t_at_least('property_management','manager')$$, $$t_at_least('property_management','manager')$$, $$t_at_least('property_management','manager')$$],
    ['il_lease_tenants',     $$t_at_least('property_management','manager')$$, $$t_at_least('property_management','manager')$$, $$t_at_least('property_management','manager')$$, $$t_at_least('property_management','manager')$$],
    ['il_tenants',           $$t_at_least('property_management','manager')$$, $$t_at_least('property_management','manager')$$, $$t_at_least('property_management','manager')$$, $$t_at_least('property_management','manager')$$],
    ['il_rent_ledger',       $$t_at_least('property_management','manager')$$, $$t_at_least('property_management','manager')$$, $$t_at_least('property_management','manager')$$, $$t_at_least('property_management','manager')$$],
    ['il_deposits',          $$t_at_least('property_management','manager')$$, $$t_at_least('property_management','manager')$$, $$t_at_least('property_management','manager')$$, $$t_at_least('property_management','manager')$$],
    ['il_notices',           $$t_at_least('property_management','manager')$$, $$t_at_least('property_management','manager')$$, $$t_at_least('property_management','manager')$$, $$t_at_least('property_management','manager')$$],
    -- Time clock: your own punches; any Supervisor+ sees and fixes the team's; never deleted
    ['time_punches',    $$user_id = auth.uid() or t_any_supervisor()$$, $$user_id = auth.uid() or t_any_supervisor()$$, $$user_id = auth.uid() or t_any_supervisor()$$, $$get_my_role() = 'super_admin'$$],
    -- Scheduling: everyone reads the schedule; Supervisor+ builds it; Managers own templates
    ['scheduled_shifts', null, $$t_any_supervisor()$$, $$t_any_supervisor()$$, $$t_any_supervisor()$$],
    ['shift_templates',  null, $$t_any_manager()$$, $$t_any_manager()$$, $$t_any_manager()$$],
    ['shift_swaps', $$requester_id = auth.uid() or target_id = auth.uid() or is_open_request or t_any_supervisor()$$,
                    $$requester_id = auth.uid()$$,
                    $$requester_id = auth.uid() or target_id = auth.uid() or is_open_request or t_any_supervisor()$$,
                    $$requester_id = auth.uid() or t_any_supervisor()$$],
    -- Staff certifications: your own, HR, and Supervisor+ (expiring certs for the team)
    ['staff_certifications', $$staff_id = auth.uid() or t_any_supervisor() or has_department_access('hr','employee')$$,
                             $$staff_id = auth.uid() or t_any_manager() or has_department_access('hr','employee')$$,
                             $$staff_id = auth.uid() or t_any_manager() or has_department_access('hr','employee')$$,
                             $$t_any_manager() or has_department_access('hr','manager')$$],
    -- Community announcements: Supervisor+ (and the NHA) post them
    ['announcements', null, $$t_any_supervisor()$$, $$t_any_supervisor()$$, $$t_any_supervisor()$$],
    -- Marketing: leads are prospects' personal information — Marketing staff only
    ['leads',                     $$t_member('marketing')$$, $$t_member('marketing')$$, $$t_member('marketing')$$, $$t_at_least('marketing','manager')$$],
    ['lead_activities',           $$t_member('marketing')$$, $$t_member('marketing')$$, $$t_member('marketing')$$, $$t_at_least('marketing','manager')$$],
    ['lead_sequence_enrollments', $$t_member('marketing')$$, $$t_member('marketing')$$, $$t_member('marketing')$$, $$t_at_least('marketing','manager')$$],
    ['campaign_leads',            $$t_member('marketing')$$, $$t_member('marketing')$$, $$t_member('marketing')$$, $$t_at_least('marketing','manager')$$],
    ['email_sends',               $$t_member('marketing')$$, $$t_member('marketing')$$, $$t_member('marketing')$$, $$t_at_least('marketing','manager')$$],
    ['marketing_campaigns',       $$t_member('marketing')$$, $$t_at_least('marketing','supervisor')$$, $$t_at_least('marketing','supervisor')$$, $$t_at_least('marketing','manager')$$],
    ['campaign_metrics',          $$t_member('marketing')$$, $$t_at_least('marketing','supervisor')$$, $$t_at_least('marketing','supervisor')$$, $$t_at_least('marketing','manager')$$],
    ['email_templates',           $$t_member('marketing')$$, $$t_at_least('marketing','supervisor')$$, $$t_at_least('marketing','supervisor')$$, $$t_at_least('marketing','manager')$$],
    ['nurture_sequences',         $$t_member('marketing')$$, $$t_at_least('marketing','supervisor')$$, $$t_at_least('marketing','supervisor')$$, $$t_at_least('marketing','manager')$$],
    ['nurture_sequence_steps',    $$t_member('marketing')$$, $$t_at_least('marketing','supervisor')$$, $$t_at_least('marketing','supervisor')$$, $$t_at_least('marketing','manager')$$],
    ['landing_pages',             $$t_member('marketing')$$, $$t_at_least('marketing','supervisor')$$, $$t_at_least('marketing','supervisor')$$, $$t_at_least('marketing','manager')$$],
    ['referral_sources',          $$t_member('marketing')$$, $$t_at_least('marketing','supervisor')$$, $$t_at_least('marketing','supervisor')$$, $$t_at_least('marketing','manager')$$]
  ];
  i int; t text;
begin
  for i in 1 .. array_length(spec, 1) loop
    t := spec[i][1];
    if to_regclass('public.' || t) is null then raise notice 'tier spec: % not found', t; continue; end if;
    execute format('drop policy if exists tier_sel on public.%I', t);
    execute format('drop policy if exists tier_ins on public.%I', t);
    execute format('drop policy if exists tier_upd on public.%I', t);
    execute format('drop policy if exists tier_del on public.%I', t);
    if spec[i][2] is not null then
      execute format('create policy tier_sel on public.%I as restrictive for select to authenticated using (not (select my_org_tiered()) or (%s))', t, spec[i][2]);
    end if;
    if spec[i][3] is not null then
      execute format('create policy tier_ins on public.%I as restrictive for insert to authenticated with check (not (select my_org_tiered()) or (%s))', t, spec[i][3]);
    end if;
    if spec[i][4] is not null then
      execute format('create policy tier_upd on public.%I as restrictive for update to authenticated using (not (select my_org_tiered()) or (%s))', t, spec[i][4]);
    end if;
    if spec[i][5] is not null then
      execute format('create policy tier_del on public.%I as restrictive for delete to authenticated using (not (select my_org_tiered()) or (%s))', t, spec[i][5]);
    end if;
  end loop;
end $do$;

-- ── AI assistant: goal suggestions read a resident's Social Services records with
--    the service role; it now asks (as the caller) whether they may see them ───
create or replace function public.ai_can_read_ss_resident(p_resident uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select (not my_org_tiered() and is_social_services_writer()) or (my_org_tiered() and ss_can_see_resident(p_resident))
$function$;
revoke all on function public.ai_can_read_ss_resident(uuid) from public, anon;
grant execute on function public.ai_can_read_ss_resident(uuid) to authenticated;
