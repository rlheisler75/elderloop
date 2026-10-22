-- Role Templates get an access level: 'edit' (the module's normal rules, today's
-- behavior) or 'view' (read only). View only never applies inside the person's own
-- department (staff_department_roles or profiles.department matching
-- module_department()), and a per-user 'edit' row in user_module_permissions
-- overrides it. Every community, legacy and tiered.
--
-- Enforced by role_view_only_guard(module[, 'requests']) on each module's tables.
-- 'requests' tables let anyone file a new one (work orders, IT tickets, meal and
-- dietary requests, IL cleaning requests) — only changing/deleting is blocked.
-- Left out on purpose: personal and everyone-writes tables (time punches, shift
-- swaps, messages, incident filings, grievances, surveys, mood logs nurses keep,
-- physician diet orders Nursing logs), and the cross-department modules
-- (communication, family, incidents, surveys, staff/scheduling, timeclock).
-- When adding a table to one of the modules below, attach the guard too, and keep
-- VIEW_ONLY_MODULES in src/pages/admin/RoleTemplates.jsx in step.

alter table public.role_module_visibility
  add column if not exists access_level text not null default 'edit'
  check (access_level in ('edit', 'view'));

create or replace function public.role_template_view_only(p_module text)
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select coalesce((
    select r.access_level = 'view'
      from profiles p
      join role_module_visibility r
        on r.organization_id = p.organization_id
       and r.role = p.role::text
       and r.module_key = p_module
     where p.id = auth.uid()
       and not exists (select 1 from user_module_permissions u
                        where u.user_id = p.id and u.module_key = p_module and u.access_level = 'edit')
       and coalesce(p.department::text, '') is distinct from module_department(p_module)
       and not exists (select 1 from staff_department_roles d
                        where d.profile_id = p.id and d.department = module_department(p_module))
  ), false)
$$;

create or replace function public.role_view_only_guard()
returns trigger
language plpgsql security definer
set search_path to 'public'
as $$
begin
  if coalesce(auth.role(), '') <> 'authenticated' then return coalesce(new, old); end if;
  if tg_nargs > 1 and tg_argv[1] = 'requests' and tg_op = 'INSERT' then return new; end if;
  if role_template_view_only(tg_argv[0]) then
    raise exception 'You have view-only access to this module (set by your role template). Ask your Org Admin if you need to make changes.'
      using errcode = '42501', hint = 'role_view_only';
  end if;
  return coalesce(new, old);
end;
$$;

do $$
declare
  spec text[][] := array[
    -- Maintenance
    ['work_orders','work_orders','requests'], ['wo_activity','work_orders','requests'],
    ['wo_photos','work_orders','requests'], ['work_order_attachments','work_orders','requests'],
    ['wo_categories','work_orders',''], ['wo_auto_assign_rules','work_orders',''],
    ['wo_sla_rules','work_orders',''], ['pm_schedules','work_orders',''],
    ['maintenance_assets','work_orders',''], ['compliance_categories','work_orders',''],
    ['compliance_checklist_items','work_orders',''], ['compliance_inspections','work_orders',''],
    ['compliance_inspection_results','work_orders',''],
    -- Meters
    ['meters','meters',''], ['meter_readings','meters',''], ['utility_types','meters',''],
    -- Dietary
    ['cycle_menus','dietary',''], ['cycle_menu_days','dietary',''], ['cycle_menu_meals','dietary',''],
    ['menu_items','dietary',''], ['meal_courses','dietary',''], ['course_alternates','dietary',''],
    ['recipe_ingredients','dietary',''], ['dietary_settings','dietary',''], ['dining_rooms','dietary',''],
    ['dining_tables','dietary',''], ['dining_seat_assignments','dietary',''],
    ['resident_dietary_profiles','dietary',''], ['resident_meal_preferences','dietary',''],
    ['food_waste_logs','dietary',''], ['dietary_service_requests','dietary','requests'],
    ['meal_delivery_orders','dietary','requests'],
    -- Housekeeping
    ['inspection_areas','housekeeping',''], ['inspection_checklist_items','housekeeping',''],
    ['ltc_inspections','housekeeping',''], ['ltc_inspection_results','housekeeping',''],
    ['linen_discards','housekeeping',''], ['housekeeping_settings','housekeeping',''],
    ['il_cleaning_requests','housekeeping','requests'],
    -- Central Supply
    ['supply_items','central_supply',''], ['supply_vendors','central_supply',''],
    ['supply_transactions','central_supply',''], ['supply_purchase_orders','central_supply',''],
    ['supply_po_line_items','central_supply',''], ['supply_vendor_items','central_supply',''],
    ['resident_supply_profiles','central_supply',''], ['po_messages','central_supply',''],
    -- Social Services
    ['ss_care_conferences','social_services',''], ['ss_case_notes','social_services',''],
    ['ss_discharge_plans','social_services',''], ['ss_goals','social_services',''],
    ['ss_referrals','social_services',''], ['ss_resources','social_services',''],
    ['ss_social_profiles','social_services',''],
    -- Nursing
    ['care_notes','nursing',''], ['resident_vitals','nursing',''], ['resident_medications','nursing',''],
    -- Activities / Chapel
    ['activities','activities',''], ['activity_attendance','activities',''],
    ['chapel_services','chapel',''],
    -- Transportation
    ['trips','transportation',''], ['vehicles','transportation',''],
    -- Security
    ['security_checkins','security',''], ['security_checkpoints','security',''],
    ['security_reports','security',''], ['security_rounds','security',''],
    ['security_schedules','security',''],
    -- IT
    ['it_assets','it',''], ['it_licenses','it',''], ['it_tickets','it','requests'],
    -- Property (IL)
    ['il_units','property_management',''], ['il_tenants','property_management',''],
    ['il_leases','property_management',''], ['il_lease_tenants','property_management',''],
    ['il_rent_ledger','property_management',''], ['il_deposits','property_management',''],
    ['il_keys','property_management',''], ['il_notices','property_management',''],
    ['il_walkthroughs','property_management',''], ['il_walkthrough_items','property_management',''],
    -- Marketing
    ['leads','marketing',''], ['lead_activities','marketing',''],
    ['lead_sequence_enrollments','marketing',''], ['campaign_leads','marketing',''],
    ['marketing_campaigns','marketing',''], ['campaign_metrics','marketing',''],
    ['email_templates','marketing',''], ['landing_pages','marketing',''],
    ['nurture_sequences','marketing',''], ['nurture_sequence_steps','marketing',''],
    ['referral_sources','marketing',''],
    -- Residents (no department: View applies to everyone with that role template)
    ['residents','directory',''], ['resident_emergency_contacts','directory',''],
    ['resident_medical_contacts','directory','']
  ];
  i int;
begin
  for i in 1 .. array_length(spec, 1) loop
    execute format('drop trigger if exists trg_role_view_only on public.%I', spec[i][1]);
    if spec[i][3] = 'requests' then
      execute format('create trigger trg_role_view_only before insert or update or delete on public.%I
                      for each row execute function public.role_view_only_guard(%L, %L)',
                     spec[i][1], spec[i][2], 'requests');
    else
      execute format('create trigger trg_role_view_only before insert or update or delete on public.%I
                      for each row execute function public.role_view_only_guard(%L)',
                     spec[i][1], spec[i][2]);
    end if;
  end loop;
end $$;
