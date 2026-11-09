-- Property Management uses the Independent Living residents instead of a
-- separate tenant list, and builds its units from where they live.
--
-- il_units.location_id ties a unit to its maintenance location (the resident's
-- location_id). Unit numbers repeat across streets ("205" on two drives), so
-- uniqueness is street/building + number, not number alone.
-- il_tenants.resident_id (existing column, unused until now) links a tenant to
-- the resident; one tenant per resident.
alter table public.il_units
  add column if not exists location_id uuid references public.locations(id) on delete set null;

alter table public.il_units drop constraint if exists il_units_organization_id_unit_number_key;
create unique index if not exists il_units_org_building_number
  on public.il_units (organization_id, lower(coalesce(building, '')), lower(unit_number));
create unique index if not exists il_units_org_location
  on public.il_units (organization_id, location_id) where location_id is not null;
alter table public.il_units alter column unit_type set default 'other'; -- was 'apartment', which the check refuses

create unique index if not exists il_tenants_org_resident
  on public.il_tenants (organization_id, resident_id) where resident_id is not null;

-- Units from IL residents' homes (occupied) plus the empty room-type locations
-- beside them in the same building/duplex (available). Street or building =
-- the residents' "unit" text, else the location's parent. Skips anything
-- already in Property (same location, or same building + number). Runs as the
-- caller, so the Property Manager rule on il_units applies.
create or replace function public.il_import_units()
returns jsonb
language plpgsql
security invoker
set search_path to 'public'
as $function$
declare
  v_org uuid := get_my_org_id();
  v_added int;
  v_occupied int;
begin
  if v_org is null then raise exception 'No community'; end if;

  with il as (
    select r.location_id, max(r.room) as room, max(r.unit) as street
      from residents r
     where r.organization_id = v_org and r.is_active and r.care_level = 'independent'
       and r.location_id is not null
     group by r.location_id
  ),
  parents as (
    select l.parent_id, max(il.street) as street
      from il join locations l on l.id = il.location_id
     where l.parent_id is not null
     group by l.parent_id
  ),
  candidates as (
    select l.id as location_id,
           coalesce(il.room, l.name) as unit_number,
           coalesce(il.street, pa.street, p.name) as building,
           case when p.name ilike 'duplex%' then 'duplex' else 'other' end as unit_type,
           case when il.location_id is not null then 'occupied' else 'available' end as status
      from locations l
      join parents pa on pa.parent_id = l.parent_id
      left join locations p on p.id = l.parent_id
      left join il on il.location_id = l.id
     where l.organization_id = v_org and l.is_active
       and (il.location_id is not null or l.location_type = 'room')
  ),
  fresh as (
    select distinct on (lower(coalesce(c.building, '')), lower(c.unit_number)) c.*
      from candidates c
     where not exists (
       select 1 from il_units u
        where u.organization_id = v_org
          and (u.location_id = c.location_id
            or (lower(u.unit_number) = lower(c.unit_number)
                and lower(coalesce(u.building, '')) in ('', lower(coalesce(c.building, ''))))))
     order by lower(coalesce(c.building, '')), lower(c.unit_number), (c.status = 'occupied') desc
  ),
  ins as (
    insert into il_units (organization_id, unit_number, building, unit_type, status, location_id, is_active)
    select v_org, unit_number, building, unit_type, status, location_id, true from fresh
    on conflict do nothing
    returning status
  )
  select count(*), count(*) filter (where status = 'occupied') into v_added, v_occupied from ins;

  return jsonb_build_object('added', v_added, 'occupied', v_occupied, 'available', v_added - v_occupied);
end;
$function$;

-- A tenant for every active IL resident who doesn't have one yet (name, birth
-- date and phone copied; Property adds lease details). Runs as the caller.
create or replace function public.il_import_tenants()
returns jsonb
language plpgsql
security invoker
set search_path to 'public'
as $function$
declare
  v_org uuid := get_my_org_id();
  v_added int;
begin
  if v_org is null then raise exception 'No community'; end if;
  with ins as (
    insert into il_tenants (organization_id, resident_id, first_name, last_name, date_of_birth, phone, is_active)
    select v_org, r.id, r.first_name, r.last_name, r.date_of_birth, r.phone, true
      from residents r
     where r.organization_id = v_org and r.is_active and r.care_level = 'independent'
       and not exists (select 1 from il_tenants t where t.organization_id = v_org and t.resident_id = r.id)
    on conflict do nothing
    returning 1
  )
  select count(*) into v_added from ins;
  return jsonb_build_object('added', v_added);
end;
$function$;

grant execute on function public.il_import_units() to authenticated;
grant execute on function public.il_import_tenants() to authenticated;
