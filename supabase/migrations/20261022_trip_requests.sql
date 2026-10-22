-- Trip requests: Nursing staff and IL residents (resident portal) ask for a ride;
-- only the Transportation department schedules it (20261022_trips_transportation_only.sql).
-- A resident portal login sees only their own trips and their own requests.

-- Trips know which resident they are for
alter table public.trips add column if not exists resident_id uuid references public.residents(id) on delete set null;
create index if not exists trips_resident_id_idx on public.trips(resident_id);

-- Backfill from the typed name where it matches exactly one active resident
update public.trips t set resident_id = r.id
  from public.residents r
 where t.resident_id is null
   and r.organization_id = t.organization_id
   and lower(trim(r.first_name || ' ' || r.last_name)) = lower(trim(t.resident_name))
   and (select count(*) from public.residents r2
         where r2.organization_id = t.organization_id
           and lower(trim(r2.first_name || ' ' || r2.last_name)) = lower(trim(t.resident_name))) = 1;

-- Resident portal: read your own trips only (family logins stay blocked).
-- Replaces staff_only_no_portal on trips.
drop policy if exists staff_only_no_portal on public.trips;
drop policy if exists portal_scope on public.trips;
create policy portal_scope on public.trips as restrictive for all to authenticated
  using ((not (select is_portal_user()))
         or ((select get_my_role()) = 'resident'
             and resident_id in (select id from residents where profile_id = auth.uid())))
  with check (not (select is_portal_user()));

-- Requests
create table if not exists public.trip_requests (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  resident_id       uuid references public.residents(id) on delete set null,
  resident_name     text not null,
  unit              text,
  appointment_date  date not null,
  appointment_time  time,
  appointment_type  text not null default 'medical',
  provider_name     text,
  provider_address  text,
  provider_phone    text,
  needs             text,           -- wheelchair, escort, oxygen
  notes             text,
  source            text not null default 'staff' check (source in ('staff', 'resident')),
  requested_by      uuid not null default auth.uid() references public.profiles(id),
  requested_by_name text,
  requested_at      timestamptz not null default now(),
  status            text not null default 'pending' check (status in ('pending', 'scheduled', 'declined', 'cancelled')),
  trip_id           uuid references public.trips(id) on delete set null,
  scheduled_date    date,
  scheduled_pickup  time,
  decided_by        uuid references public.profiles(id),
  decided_at        timestamptz,
  decline_reason    text
);
create index if not exists trip_requests_org_status_idx on public.trip_requests(organization_id, status);
alter table public.trip_requests enable row level security;

-- Who works the queue: the Transportation department (any level), Org Admins,
-- super admins (t_member also passes the NHA, whom the guard below limits)
create or replace function public.trip_can_schedule()
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select coalesce(t_member('transportation'), false)
$function$;
-- Who may file a request as staff: Nursing (any level), Transportation, admins
create or replace function public.trip_can_request()
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select coalesce(t_member('nursing') or t_member('transportation'), false)
$function$;
revoke all on function public.trip_can_schedule(), public.trip_can_request() from public, anon;
grant execute on function public.trip_can_schedule(), public.trip_can_request() to authenticated, service_role;

create policy trip_requests_org on public.trip_requests for all to authenticated
  using (organization_id = (select get_my_org_id()) or (select get_my_role()) = 'super_admin')
  with check (organization_id = (select get_my_org_id()) or (select get_my_role()) = 'super_admin');
create policy mfa_gate on public.trip_requests as restrictive for all to authenticated
  using ((select mfa_ok())) with check ((select mfa_ok()));
-- Portal: residents file and see only their own; family logins get nothing
create policy portal_scope on public.trip_requests as restrictive for all to authenticated
  using ((not (select is_portal_user()))
         or ((select get_my_role()) = 'resident' and requested_by = auth.uid()))
  with check ((not (select is_portal_user()))
         or ((select get_my_role()) = 'resident' and requested_by = auth.uid() and source = 'resident'
             and resident_id in (select id from residents where profile_id = auth.uid())));
-- Read: the scheduler queue sees all; Nursing sees staff requests; everyone their own
create policy trip_requests_read on public.trip_requests as restrictive for select to authenticated
  using ((select is_portal_user()) or (select trip_can_schedule()) or requested_by = auth.uid()
         or (source = 'staff' and (select t_member('nursing'))));
-- File: Nursing / Transportation / admins as staff, or a resident for themselves
create policy trip_requests_insert on public.trip_requests as restrictive for insert to authenticated
  with check (requested_by = auth.uid() and status = 'pending' and trip_id is null
              and ((select is_portal_user()) or (source = 'staff' and (select trip_can_request()))));
-- Change: the scheduler queue, or the requester (the guard limits them to cancelling)
create policy trip_requests_update on public.trip_requests as restrictive for update to authenticated
  using ((select trip_can_schedule()) or requested_by = auth.uid());
-- Never deleted (cancel or decline instead); super admins only
create policy trip_requests_delete on public.trip_requests as restrictive for delete to authenticated
  using ((select get_my_role()) = 'super_admin');

-- Requesters may only cancel their own pending request; schedulers stamp decisions.
-- The NHA works the queue only under Emergency Edit, like trips.
create or replace function public.trip_request_guard()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare v_scheduler boolean := trip_can_schedule()
  and (get_my_role() <> 'ceo' or has_emergency_edit());
begin
  if auth.uid() is null then return new; end if;   -- server-side
  if not v_scheduler then
    if new.status = 'cancelled' and old.status = 'pending'
       and (to_jsonb(new) - 'status') = (to_jsonb(old) - 'status') then
      return new;
    end if;
    raise exception 'Only Transportation can schedule or change a trip request. You can cancel your own pending request.'
      using errcode = '42501';
  end if;
  if new.status is distinct from old.status and new.status in ('scheduled', 'declined') then
    new.decided_by := auth.uid();
    new.decided_at := now();
  end if;
  return new;
end;
$function$;
drop trigger if exists trg_trip_request_guard on public.trip_requests;
create trigger trg_trip_request_guard before update on public.trip_requests
  for each row execute function public.trip_request_guard();

-- Bells: a new request to the Transportation department (or Org Admins if it has
-- nobody); scheduled / declined to the staff member who asked
create or replace function public.trip_request_notify()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare v_body text;
begin
  if tg_op = 'INSERT' then
    v_body := new.resident_name || U&' \00B7 ' || to_char(new.appointment_date, 'Mon DD')
      || coalesce(' at ' || to_char(new.appointment_time, 'HH12:MI AM'), '')
      || coalesce(U&' \00B7 ' || new.provider_name, '');
    insert into push_notifications (org_id, recipient_id, title, body, category, link)
    select new.organization_id, r.profile_id, 'New trip request', v_body, 'general', '/app/transportation'
      from (select distinct s.profile_id from staff_department_roles s join profiles p on p.id = s.profile_id
             where s.department = 'transportation' and p.organization_id = new.organization_id and p.is_active) r;
    if not found then
      insert into push_notifications (org_id, recipient_id, title, body, category, link)
      select new.organization_id, p.id, 'New trip request', v_body, 'general', '/app/transportation'
        from profiles p where p.organization_id = new.organization_id and p.role = 'org_admin' and p.is_active;
    end if;
  elsif new.status is distinct from old.status and new.status in ('scheduled', 'declined') and new.source = 'staff' then
    insert into push_notifications (org_id, recipient_id, title, body, category, link)
    values (new.organization_id, new.requested_by,
      case new.status when 'scheduled' then 'Trip scheduled' else 'Trip request declined' end,
      new.resident_name || U&' \00B7 ' || case new.status
        when 'scheduled' then to_char(new.scheduled_date, 'Mon DD') || coalesce(', pickup ' || to_char(new.scheduled_pickup, 'HH12:MI AM'), '')
        else coalesce(new.decline_reason, 'No reason given') end,
      'general', '/app/transportation');
  end if;
  return new;
end;
$function$;
drop trigger if exists trg_trip_request_notify on public.trip_requests;
create trigger trg_trip_request_notify after insert or update on public.trip_requests
  for each row execute function public.trip_request_notify();

grant select, insert, update on public.trip_requests to authenticated;
