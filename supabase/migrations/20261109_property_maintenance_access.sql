-- Maintenance staff work in Independent Living homes, so in Property
-- Management they do walkthroughs: read/record/update il_walkthroughs and
-- their items. They don't read il_units (rent, unit details); il_unit_list()
-- gives them just number, building and location to pick from. Units, leases,
-- tenants, rent and notices stay with Property. "Maintenance" = Work Orders
-- edit (the permission that lets someone work jobs), not Work Orders create,
-- which everyone has.
-- A walkthrough can open a work order; il_walkthroughs.work_order_id links it.
create or replace function public.il_maintenance_access()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$ select coalesce(can('work_orders', 'edit'), false) $function$;

grant execute on function public.il_maintenance_access() to authenticated;

alter table public.il_walkthroughs
  add column if not exists work_order_id uuid references public.work_orders(id) on delete set null;

-- Unit picker for walkthroughs without rent or unit details
create or replace function public.il_unit_list()
returns table(id uuid, unit_number text, building text, location_id uuid)
language sql
stable security definer
set search_path to 'public'
as $function$
  select u.id, u.unit_number, u.building, u.location_id
    from il_units u
   where u.organization_id = get_my_org_id() and u.is_active
     and ((not my_org_tiered()) or t_member('property_management') or il_maintenance_access())
   order by u.building, u.unit_number
$function$;

grant execute on function public.il_unit_list() to authenticated;

drop policy if exists tier_sel on public.il_walkthroughs;
create policy tier_sel on public.il_walkthroughs as restrictive for select to public
  using ((not (select my_org_tiered())) or t_member('property_management') or (select il_maintenance_access()));
drop policy if exists tier_ins on public.il_walkthroughs;
create policy tier_ins on public.il_walkthroughs as restrictive for insert to public
  with check ((not (select my_org_tiered())) or t_member('property_management') or (select il_maintenance_access()));
drop policy if exists tier_upd on public.il_walkthroughs;
create policy tier_upd on public.il_walkthroughs as restrictive for update to public
  using ((not (select my_org_tiered())) or t_member('property_management') or (select il_maintenance_access()));

drop policy if exists tier_sel on public.il_walkthrough_items;
create policy tier_sel on public.il_walkthrough_items as restrictive for select to public
  using ((not (select my_org_tiered())) or t_member('property_management') or (select il_maintenance_access()));
drop policy if exists tier_ins on public.il_walkthrough_items;
create policy tier_ins on public.il_walkthrough_items as restrictive for insert to public
  with check ((not (select my_org_tiered())) or t_member('property_management') or (select il_maintenance_access()));
drop policy if exists tier_upd on public.il_walkthrough_items;
create policy tier_upd on public.il_walkthrough_items as restrictive for update to public
  using ((not (select my_org_tiered())) or t_member('property_management') or (select il_maintenance_access()));

-- The view-only guard asks for a Property write permission, which Maintenance
-- doesn't hold; on the walkthrough tables (second trigger argument
-- 'maintenance') Work Orders edit counts too.
create or replace function public.role_view_only_guard()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare m text := tg_argv[0];
begin
  if coalesce(auth.role(), '') <> 'authenticated' then return coalesce(new, old); end if;
  if is_portal_user() then return coalesce(new, old); end if;
  if tg_nargs > 1 and tg_argv[1] = 'requests' and tg_op = 'INSERT' then return new; end if;
  if tg_nargs > 1 and tg_argv[1] = 'maintenance' and il_maintenance_access() then return coalesce(new, old); end if;
  if not (can(m, 'create') or can(m, 'edit') or can(m, 'approve') or can(m, 'delete') or can(m, 'settings') or can(m, 'costs')) then
    raise exception 'You have view-only access to this module. Ask your Org Admin if you need to make changes.'
      using errcode = '42501', hint = 'role_view_only';
  end if;
  return coalesce(new, old);
end; $function$;

drop trigger if exists trg_role_view_only on public.il_walkthroughs;
create trigger trg_role_view_only before insert or update or delete on public.il_walkthroughs
  for each row execute function public.role_view_only_guard('property_management', 'maintenance');
drop trigger if exists trg_role_view_only on public.il_walkthrough_items;
create trigger trg_role_view_only before insert or update or delete on public.il_walkthrough_items
  for each row execute function public.role_view_only_guard('property_management', 'maintenance');
