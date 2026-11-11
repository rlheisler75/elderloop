-- Menus by area. A cycle menu says which care levels it serves, so residents
-- (portals, meal tickets, kitchen counts) get their area's menu without being
-- assigned one by one, and each signage screen can show a particular menu
-- (the LTC menu on the LTC screen). Resolution lives in src/lib/menuChoice.js:
-- assigned on the diet profile → menu for the care level → the Active menu.
-- Empty care_levels / no screen menu = today's behavior.

alter table public.cycle_menus
  add column if not exists care_levels text[] not null default '{}'
  check (care_levels <@ array['independent', 'assisted', 'memory_care', 'skilled_nursing', 'rehab']);

alter table public.signage_screens
  add column if not exists cycle_menu_id uuid references public.cycle_menus(id) on delete set null;

-- The screen lookup also returns the screen's menu (return type changes, so
-- drop and recreate with the same grants)
drop function if exists public.signage_resolve(integer, text);
create function public.signage_resolve(p_number integer, p_url_name text)
returns table(org_slug text, display text, screen_name text, screen_id uuid, cycle_menu_id uuid)
language sql stable security definer set search_path to 'public'
as $$
  select o.slug,
         coalesce(s.display, 'signage'),
         s.name,
         s.id,
         s.cycle_menu_id
    from organizations o
    left join signage_screens s
      on s.organization_id = o.id and s.is_active and s.url_name = lower(btrim(coalesce(p_url_name, '')))
   where o.facility_number = p_number and o.is_active
     and (coalesce(p_url_name, '') = '' or s.id is not null)
$$;
grant execute on function public.signage_resolve(integer, text) to anon, authenticated;
