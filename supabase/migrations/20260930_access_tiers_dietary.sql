-- Access tiers, Phase 3 · Dietary. RESTRICTIVE policies that only bite when the
-- caller's community is on access_model = 'tiered' (legacy unchanged). Tier =
-- my_access_tier('dietary'): the caller's level in the Dietary department.
--
-- Reads stay open on purpose: diets, textures, and allergens are safety
-- information every caregiver must be able to see. Only the food budget
-- (dietary_settings) is limited to the Dietary Manager and administrators.

-- ── Menus and recipes: the Dietary Manager builds them ──────────────────────
do $$
declare t text;
begin
  foreach t in array array['cycle_menus', 'cycle_menu_days', 'cycle_menu_meals', 'menu_items', 'meal_courses',
                           'course_alternates', 'recipe_ingredients'] loop
    execute format('drop policy if exists tier_diet_insert on public.%I', t);
    execute format('drop policy if exists tier_diet_update on public.%I', t);
    execute format('drop policy if exists tier_diet_delete on public.%I', t);
    execute format($p$create policy tier_diet_insert on public.%I as restrictive for insert with check (
      not (select my_org_tiered())
      or (select my_access_tier('dietary')) in ('manager', 'administrator', 'org_admin', 'super_admin'))$p$, t);
    execute format($p$create policy tier_diet_update on public.%I as restrictive for update using (
      not (select my_org_tiered())
      or (select my_access_tier('dietary')) in ('manager', 'administrator', 'org_admin', 'super_admin'))$p$, t);
    execute format($p$create policy tier_diet_delete on public.%I as restrictive for delete using (
      not (select my_org_tiered())
      or (select my_access_tier('dietary')) in ('manager', 'administrator', 'org_admin', 'super_admin'))$p$, t);
  end loop;
end $$;

-- The NHA approves menu cycles: on cycle_menus they may change ONLY the approval
-- stamp (unless Emergency Edit is on). Replaces the blanket nha_write_guard here.
drop trigger if exists trg_nha_write_guard on cycle_menus;
create or replace function public.cycle_menu_nha_approval_only()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if coalesce(auth.role(), '') <> 'authenticated' or not my_org_tiered()
     or get_my_role() is distinct from 'ceo' or has_emergency_edit() then
    return coalesce(new, old);
  end if;
  if tg_op = 'UPDATE'
     and (to_jsonb(new) - 'approved_by' - 'approved_at' - 'updated_at')
         = (to_jsonb(old) - 'approved_by' - 'approved_at' - 'updated_at') then
    return new;
  end if;
  raise exception 'Administrators can approve a menu cycle but not change it. To change this record, start Emergency Edit (24 hours, reason required).'
    using errcode = '42501', hint = 'nha_view_only';
end;
$function$;
create trigger trg_cycle_menu_nha_approval_only before insert or update or delete on cycle_menus
  for each row execute function cycle_menu_nha_approval_only();

-- ── Resident diet profiles, preferences, seating: Dietary Supervisor+ ───────
-- (Residents keep their own existing policy for their preferences.)
do $$
declare t text;
begin
  foreach t in array array['resident_dietary_profiles', 'resident_meal_preferences', 'dining_rooms',
                           'dining_tables', 'dining_seat_assignments'] loop
    execute format('drop policy if exists tier_diet_insert on public.%I', t);
    execute format('drop policy if exists tier_diet_update on public.%I', t);
    execute format('drop policy if exists tier_diet_delete on public.%I', t);
    execute format($p$create policy tier_diet_insert on public.%I as restrictive for insert with check (
      not (select my_org_tiered())
      or (select my_access_tier('dietary')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin'))$p$, t);
    execute format($p$create policy tier_diet_update on public.%I as restrictive for update using (
      not (select my_org_tiered())
      or (select my_access_tier('dietary')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
      or %s)$p$, t,
      case when t = 'resident_dietary_profiles'
        then 'resident_id in (select r.id from residents r where r.profile_id = auth.uid())'
        else 'false' end);
    execute format($p$create policy tier_diet_delete on public.%I as restrictive for delete using (
      not (select my_org_tiered())
      or (select my_access_tier('dietary')) in ('manager', 'administrator', 'org_admin', 'super_admin'))$p$, t);
  end loop;
end $$;

-- ── Physician diet orders: logged by Nursing or Dietary supervisors, applied by
--    Dietary Supervisor+; a clinical record, so never deleted ────────────────
drop policy if exists tier_pdo_insert on physician_diet_orders;
create policy tier_pdo_insert on physician_diet_orders as restrictive for insert with check (
  not (select my_org_tiered())
  or (select my_access_tier('dietary')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
  or (select has_department_access('nursing', 'employee')));
drop policy if exists tier_pdo_update on physician_diet_orders;
create policy tier_pdo_update on physician_diet_orders as restrictive for update using (
  not (select my_org_tiered())
  or (select my_access_tier('dietary')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
  or (select has_department_access('nursing', 'supervisor')));
drop policy if exists tier_pdo_delete on physician_diet_orders;
create policy tier_pdo_delete on physician_diet_orders as restrictive for delete using (
  not (select my_org_tiered()) or (select get_my_role()) = 'super_admin');

-- ── Food waste: anyone in Dietary logs it; employees see and fix their own;
--    supervisors see the department; only the Manager deletes ────────────────
drop policy if exists tier_waste_select on food_waste_logs;
create policy tier_waste_select on food_waste_logs as restrictive for select using (
  not (select my_org_tiered())
  or (select my_access_tier('dietary')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
  or logged_by = auth.uid());
drop policy if exists tier_waste_insert on food_waste_logs;
create policy tier_waste_insert on food_waste_logs as restrictive for insert with check (
  not (select my_org_tiered())
  or (select my_access_tier('dietary')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
  or (select has_department_access('dietary', 'employee')));
drop policy if exists tier_waste_update on food_waste_logs;
create policy tier_waste_update on food_waste_logs as restrictive for update using (
  not (select my_org_tiered())
  or (select my_access_tier('dietary')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
  or logged_by = auth.uid());
drop policy if exists tier_waste_delete on food_waste_logs;
create policy tier_waste_delete on food_waste_logs as restrictive for delete using (
  not (select my_org_tiered())
  or (select my_access_tier('dietary')) in ('manager', 'administrator', 'org_admin', 'super_admin'));

-- ── Special requests: anyone asks; Dietary fulfills; the requester may withdraw
drop policy if exists tier_dsr_update on dietary_service_requests;
create policy tier_dsr_update on dietary_service_requests as restrictive for update using (
  not (select my_org_tiered())
  or (select my_access_tier('dietary')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
  or (select has_department_access('dietary', 'employee'))
  or requested_by = auth.uid());
drop policy if exists tier_dsr_delete on dietary_service_requests;
create policy tier_dsr_delete on dietary_service_requests as restrictive for delete using (
  not (select my_org_tiered())
  or (select my_access_tier('dietary')) in ('manager', 'administrator', 'org_admin', 'super_admin')
  or requested_by = auth.uid());

-- ── Food budget: Dietary Manager and administrators only (read and write) ───
drop policy if exists tier_diet_budget on dietary_settings;
create policy tier_diet_budget on dietary_settings as restrictive for all
  using (not (select my_org_tiered())
         or (select my_access_tier('dietary')) in ('manager', 'administrator', 'org_admin', 'super_admin'))
  with check (not (select my_org_tiered())
         or (select my_access_tier('dietary')) in ('manager', 'administrator', 'org_admin', 'super_admin'));
