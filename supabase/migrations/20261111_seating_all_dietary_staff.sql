-- Seating charts belong to the whole Dietary department: any Dietary staff
-- member (employee level and up) may add, change, and delete dining rooms,
-- tables, seat assignments, and residents' standing drink/silverware notes.
-- Before this, inserts and updates were Supervisor+ and deletes Manager+
-- (20260930_access_tiers_dietary.sql). Diet profiles stay Supervisor+.
do $$
declare t text;
begin
  foreach t in array array['resident_meal_preferences', 'dining_rooms', 'dining_tables', 'dining_seat_assignments'] loop
    execute format('drop policy if exists tier_diet_insert on public.%I', t);
    execute format('drop policy if exists tier_diet_update on public.%I', t);
    execute format('drop policy if exists tier_diet_delete on public.%I', t);
    execute format($p$create policy tier_diet_insert on public.%I as restrictive for insert with check (
      not (select my_org_tiered())
      or (select my_access_tier('dietary')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
      or (select has_department_access('dietary', 'employee')))$p$, t);
    execute format($p$create policy tier_diet_update on public.%I as restrictive for update using (
      not (select my_org_tiered())
      or (select my_access_tier('dietary')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
      or (select has_department_access('dietary', 'employee')))$p$, t);
    execute format($p$create policy tier_diet_delete on public.%I as restrictive for delete using (
      not (select my_org_tiered())
      or (select my_access_tier('dietary')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin')
      or (select has_department_access('dietary', 'employee')))$p$, t);
  end loop;
end $$;
