-- "Request a ride" means what Job Roles says (Robert, 2026-11-25).
-- Job Roles labels Transportation Create as "Request a ride", but trip_can_request() only
-- checked Nursing or Transportation department membership, so a role with just Transportation
-- Create (e.g. Maranatha's Receptionist) couldn't file a ride request. It now also accepts
-- can('transportation','create'). Nursing staff keep their access; scheduling is unchanged
-- (trip_can_schedule() = in the Transportation department, i.e. Transportation Edit or higher).
create or replace function public.trip_can_request()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(can('transportation', 'create') or t_member('nursing') or t_member('transportation'), false)
$$;
