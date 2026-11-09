-- Per-community switch for resident/family meal-delivery ordering. Some
-- communities offer room delivery and some don't. On by default so nothing
-- changes until an Org Admin turns it off (Admin Panel → Org Settings).
alter table public.organizations
  add column if not exists meal_ordering_enabled boolean not null default true;

-- Portal users can read their own organization, but a security definer keeps the
-- policy check independent of organizations' RLS.
create or replace function public.org_meal_ordering_enabled(p_org uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce((select meal_ordering_enabled from organizations where id = p_org), true) $$;

grant execute on function public.org_meal_ordering_enabled(uuid) to authenticated;

-- Residents and family can't place an order while it's off; staff still can
-- (the kitchen may take an order by phone).
drop policy if exists meal_ordering_enabled_guard on public.meal_delivery_orders;
create policy meal_ordering_enabled_guard on public.meal_delivery_orders
  as restrictive for insert to authenticated
  with check ((not (select is_portal_user())) or public.org_meal_ordering_enabled(organization_id));
