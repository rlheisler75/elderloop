-- Trips: who asked for the ride, who put it on the schedule, who last changed it.
--
-- Before this, the app wrote scheduled_by = whoever saved the trip last, so the
-- original scheduler was lost whenever someone edited a trip. Now:
--   requested_by / requested_by_name  who asked for the trip. Typed on the trip
--                                     form (a family member, a nurse, the resident),
--                                     or copied from an in-app trip request.
--   scheduled_by / scheduled_by_name  the staff member who first put it on the
--                                     schedule (approved it). Set on insert, never
--                                     changed afterwards.
--   updated_by / updated_by_name      who saved it most recently.
-- The *_by_name columns are snapshots set by the trigger, so every viewer sees
-- the names even when profiles RLS hides that coworker.
--
-- Existing trips: scheduled_by was "last saved by", so it is copied to updated_by
-- too. For trips that were edited after creation, the original scheduler is not
-- recorded anywhere and stays unknown.

alter table public.trips
  add column if not exists requested_by      uuid references public.profiles(id) on delete set null,
  add column if not exists requested_by_name text,
  add column if not exists scheduled_by_name text,
  add column if not exists updated_by        uuid references public.profiles(id) on delete set null,
  add column if not exists updated_by_name   text;

create or replace function public.trip_people_stamp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_name text;
begin
  if v_uid is not null then
    select nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '')
      into v_name from public.profiles where id = v_uid;
  end if;

  new.requested_by_name := nullif(left(trim(coalesce(new.requested_by_name, '')), 120), '');

  if tg_op = 'INSERT' then
    if v_uid is not null then
      new.scheduled_by      := v_uid;
      new.scheduled_by_name := v_name;
    elsif new.scheduled_by is not null and new.scheduled_by_name is null then
      select nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '')
        into new.scheduled_by_name from public.profiles where id = new.scheduled_by;
    end if;
    new.updated_by      := new.scheduled_by;
    new.updated_by_name := new.scheduled_by_name;
  else
    -- The scheduler is permanent; only server-side code (no auth.uid) may correct it.
    if v_uid is not null then
      new.scheduled_by      := old.scheduled_by;
      new.scheduled_by_name := old.scheduled_by_name;
      new.updated_by        := v_uid;
      new.updated_by_name   := v_name;
    end if;
    -- A linked requester stays as recorded unless the typed name was changed.
    if new.requested_by is not distinct from old.requested_by
       and new.requested_by_name is distinct from old.requested_by_name then
      new.requested_by := null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_trip_people_stamp on public.trips;
create trigger trg_trip_people_stamp
  before insert or update on public.trips
  for each row execute function public.trip_people_stamp();

-- Backfill names for existing trips (scheduled_by there means "last saved by").
update public.trips t
   set scheduled_by_name = nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''),
       updated_by        = t.scheduled_by,
       updated_by_name   = nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '')
  from public.profiles p
 where p.id = t.scheduled_by;

-- Trips scheduled from an in-app request: the requester comes from the request.
update public.trips t
   set requested_by      = r.requested_by,
       requested_by_name = r.requested_by_name
  from public.trip_requests r
 where r.trip_id = t.id and t.requested_by_name is null;

revoke all on function public.trip_people_stamp() from public, anon, authenticated;
