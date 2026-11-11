-- Standing meal-note types (seating chart) become each community's own list,
-- edited by Dietary Supervisor+: e.g. Hot drinks, Cold drinks, Hot cereal,
-- Cold cereal, Silverware. Every community starts with the old fixed three
-- (Drink, Silverware, Other) and existing notes move onto them.
--
-- single_choice: only the most specific note of that type applies (a day or
-- meal note replaces the everyday one), the way Drink always worked;
-- otherwise every note that applies is shown.
-- Types are never deleted, only hidden (is_active), so notes keep their type.

create table if not exists public.meal_pref_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 40),
  single_choice boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists meal_pref_categories_org_name
  on public.meal_pref_categories (organization_id, lower(btrim(name))) where is_active;

alter table public.meal_pref_categories enable row level security;

create policy org_access_meal_pref_categories on public.meal_pref_categories for all
  using (organization_id in (select organization_id from profiles where id = auth.uid()) or get_my_role() = 'super_admin')
  with check (organization_id in (select organization_id from profiles where id = auth.uid()) or get_my_role() = 'super_admin');
create policy staff_only_no_portal on public.meal_pref_categories as restrictive for all
  using (not (select is_portal_user())) with check (not (select is_portal_user()));
create policy mfa_gate on public.meal_pref_categories as restrictive for all
  using ((select mfa_ok())) with check ((select mfa_ok()));
create policy tier_diet_insert on public.meal_pref_categories as restrictive for insert with check (
  not (select my_org_tiered())
  or (select my_access_tier('dietary')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin'));
create policy tier_diet_update on public.meal_pref_categories as restrictive for update using (
  not (select my_org_tiered())
  or (select my_access_tier('dietary')) in ('supervisor', 'manager', 'administrator', 'org_admin', 'super_admin'));
create policy tier_diet_delete on public.meal_pref_categories as restrictive for delete using (
  (select get_my_role()) = 'super_admin');

create trigger trg_nha_write_guard before insert or update or delete on public.meal_pref_categories
  for each row execute function nha_write_guard('records');
create trigger trg_role_view_only before insert or update or delete on public.meal_pref_categories
  for each row execute function role_view_only_guard('dietary');

-- Starting list for every community, now and when one signs up
create or replace function public.seed_meal_pref_categories(p_org uuid)
returns void language sql security definer set search_path to 'public' as $$
  insert into meal_pref_categories (organization_id, name, single_choice, sort_order)
  select p_org, v.name, v.single, v.sort
    from (values ('Drink', true, 0), ('Silverware', false, 1), ('Other', false, 2)) v(name, single, sort)
   where not exists (select 1 from meal_pref_categories c where c.organization_id = p_org);
$$;
revoke execute on function public.seed_meal_pref_categories(uuid) from public, anon, authenticated;

create or replace function public.trg_seed_meal_pref_categories()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  perform seed_meal_pref_categories(new.id);
  return new;
end $$;
create trigger trg_seed_meal_pref_categories after insert on public.organizations
  for each row execute function trg_seed_meal_pref_categories();

select seed_meal_pref_categories(id) from public.organizations;

-- Notes point at their type; the old text column stays for history only
alter table public.resident_meal_preferences
  add column if not exists category_id uuid references public.meal_pref_categories(id);
update public.resident_meal_preferences p
   set category_id = c.id
  from public.meal_pref_categories c
 where c.organization_id = p.organization_id and lower(c.name) = p.category and p.category_id is null;
alter table public.resident_meal_preferences drop constraint if exists resident_meal_preferences_category_check;
alter table public.resident_meal_preferences alter column category drop not null;
