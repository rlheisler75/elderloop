-- Link each resident to their place in the Locations tree, so a new work order
-- fills in the location when a resident is picked (and offers the residents
-- who live there when a location is picked).
alter table public.residents add column if not exists location_id uuid references public.locations(id) on delete set null;
create index if not exists residents_location_idx on public.residents (location_id);

-- Backfill from building / unit / room: a location named like the room (Lodge
-- beds "311-2" -> room "311") under the resident's building, preferring one
-- whose path also contains the unit ("Heritage Ave", "300 Hall").
with recursive t as (
  select id, organization_id, name::text as path, name::text as root, name as leaf
    from locations where parent_id is null
  union all
  select l.id, l.organization_id, t.path || ' > ' || l.name, t.root, l.name
    from locations l join t on l.parent_id = t.id
),
c as (
  select r.id as rid, t.id as lid,
         lower(t.path) like '%' || lower(regexp_replace(coalesce(r.unit, ''), '^.*· ', '')) || '%' as unit_hit
    from residents r
    join t on t.organization_id = r.organization_id
          and lower(t.leaf) in (lower(r.room), lower(regexp_replace(r.room, '-[12]$', '')))
          and lower(t.path) like '%' || lower(r.building) || '%'
   where r.location_id is null and coalesce(r.room, '') <> '' and coalesce(r.building, '') <> ''
),
pick as (
  select rid, (array_agg(lid))[1] as lid from c where unit_hit group by rid having count(distinct lid) = 1
  union all
  select rid, (array_agg(lid))[1] from c
   where rid not in (select rid from c where unit_hit)
   group by rid having count(distinct lid) = 1
)
update residents r set location_id = pick.lid from pick where r.id = pick.rid;
