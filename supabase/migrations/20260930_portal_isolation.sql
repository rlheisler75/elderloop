-- SECURITY FIX (all communities, not just tiered): keep family- and resident-portal
-- logins out of staff data.
--
-- Most tables use an "org_access_*" policy granting ALL to any profile in the
-- community. Family and resident portal logins have an organization_id too, so a
-- family member could read — and write — sales leads, other residents' care notes
-- and medications, work orders, staff schedules, trips, meter readings, supply
-- inventory, every resident's directory entry, diet/allergen profile, and contacts.
--
-- 1. Staff-only tables: one RESTRICTIVE policy (to authenticated) blocks portal
--    users entirely. Applied to every public table with RLS except the allowlist
--    below. Anonymous access (TV signage, public surveys, landing pages) is
--    unaffected — these policies only apply to signed-in users.
-- 2. Tables the portals use: portal users are limited to their own resident (or the
--    resident they're linked to as family) and their own submissions.
-- 3. Shared content the portals read (activities, chapel, announcements, menus,
--    surveys): portal users keep reading but can no longer write.

create or replace function public.is_portal_user()
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select coalesce((select role::text in ('family', 'resident') from profiles where id = auth.uid()), false)
$function$;

create or replace function public.portal_can_see_resident(p_resident uuid)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (select 1 from residents r where r.id = p_resident and r.profile_id = auth.uid())
      or exists (select 1 from family_resident_links l where l.resident_id = p_resident and l.family_user_id = auth.uid())
$function$;
revoke all on function public.is_portal_user(), public.portal_can_see_resident(uuid) from public, anon;
grant execute on function public.is_portal_user(), public.portal_can_see_resident(uuid) to authenticated, service_role;

-- ── 1. Staff-only tables ─────────────────────────────────────────────────────
do $$
declare
  t text;
  portal_tables text[] := array[
    -- identity / app shell (AuthContext, profile modal, notifications)
    'organizations', 'profiles', 'organization_modules', 'role_module_visibility', 'user_module_permissions',
    'staff_department_roles', 'push_notifications', 'push_subscriptions', 'audit_log',
    -- what the family and resident portals use (row-limited in step 2/3)
    'residents', 'family_resident_links', 'resident_updates', 'resident_dietary_profiles',
    'resident_emergency_contacts', 'resident_medical_contacts', 'messages', 'meal_delivery_orders',
    'work_orders', 'il_cleaning_requests', 'activities', 'activity_rsvps', 'chapel_services', 'announcements',
    'surveys', 'survey_questions', 'survey_responses', 'survey_answers',
    'cycle_menus', 'cycle_menu_days', 'cycle_menu_meals', 'menu_items', 'meal_courses', 'course_alternates'];
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
       and c.relname <> all (portal_tables)
  loop
    execute format('drop policy if exists staff_only_no_portal on public.%I', t);
    execute format('create policy staff_only_no_portal on public.%I as restrictive for all to authenticated
                      using (not (select is_portal_user())) with check (not (select is_portal_user()))', t);
  end loop;
end $$;

-- ── 2. Portal tables: own resident / own submissions only ───────────────────
-- residents: own record (resident) or linked residents (family)
drop policy if exists portal_scope on residents;
create policy portal_scope on residents as restrictive for all to authenticated
  using (not (select is_portal_user()) or portal_can_see_resident(id))
  with check (not (select is_portal_user()));

do $$
declare t text;
begin
  foreach t in array array['resident_dietary_profiles', 'resident_emergency_contacts', 'resident_medical_contacts',
                           'meal_delivery_orders'] loop
    execute format('drop policy if exists portal_scope on public.%I', t);
    execute format('create policy portal_scope on public.%I as restrictive for all to authenticated
                      using (not (select is_portal_user()) or portal_can_see_resident(resident_id))
                      with check (not (select is_portal_user()) or portal_can_see_resident(resident_id))', t);
  end loop;
end $$;

-- resident updates: only family-visible ones about their resident; no writing
drop policy if exists portal_scope on resident_updates;
create policy portal_scope on resident_updates as restrictive for all to authenticated
  using (not (select is_portal_user()) or (is_family_visible and portal_can_see_resident(resident_id)))
  with check (not (select is_portal_user()));

-- work orders and IL cleaning requests: only what they submitted
drop policy if exists portal_scope on work_orders;
create policy portal_scope on work_orders as restrictive for all to authenticated
  using (not (select is_portal_user()) or submitted_by = auth.uid())
  with check (not (select is_portal_user()) or submitted_by = auth.uid());
drop policy if exists portal_scope on il_cleaning_requests;
create policy portal_scope on il_cleaning_requests as restrictive for all to authenticated
  using (not (select is_portal_user()) or requested_by = auth.uid())
  with check (not (select is_portal_user()) or requested_by = auth.uid());

-- ── 3. Shared content: portal users read, never write ───────────────────────
do $$
declare t text;
begin
  foreach t in array array['activities', 'chapel_services', 'announcements', 'surveys', 'survey_questions',
                           'cycle_menus', 'cycle_menu_days', 'cycle_menu_meals', 'menu_items', 'meal_courses',
                           'course_alternates', 'organizations', 'organization_modules', 'role_module_visibility',
                           'user_module_permissions', 'staff_department_roles'] loop
    execute format('drop policy if exists portal_no_insert on public.%I', t);
    execute format('drop policy if exists portal_no_update on public.%I', t);
    execute format('drop policy if exists portal_no_delete on public.%I', t);
    execute format('create policy portal_no_insert on public.%I as restrictive for insert to authenticated
                      with check (not (select is_portal_user()))', t);
    execute format('create policy portal_no_update on public.%I as restrictive for update to authenticated
                      using (not (select is_portal_user()))', t);
    execute format('create policy portal_no_delete on public.%I as restrictive for delete to authenticated
                      using (not (select is_portal_user()))', t);
  end loop;
end $$;
