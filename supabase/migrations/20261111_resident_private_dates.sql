-- Residents' birth date and admission date are no longer readable with a plain
-- select (RLS can't hide columns, and every staff member reads residents).
-- SELECT is granted on every other residents column; the two dates come from
-- resident_private_fields(), for: everyone in Nursing (any level, they identify
-- residents by name + birth date), the people who see emergency contacts
-- (can_see_resident_contacts(): Nursing Supervisor+, Social Services,
-- Administration, the Administrator, Org Admins), the Property department (it
-- copies birth dates onto IL tenants), super admins, and portal logins for their
-- own resident. Writes are unchanged. App side: src/lib/residentPrivate.js
-- (RESIDENT_COLS, withResidentDates). A new residents column needs adding to the
-- grant below and to RESIDENT_COLS.

create or replace function public.can_see_resident_dates()
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce(
    can_see_resident_contacts()
    or has_department_access('nursing', 'employee')
    or has_department_access('property', 'employee'),
    false)
$$;

create or replace function public.resident_private_fields(p_ids uuid[])
returns table (id uuid, date_of_birth date, admission_date date)
language sql stable security definer set search_path = public
as $$
  select r.id, r.date_of_birth, r.admission_date
    from residents r
   where r.id = any(p_ids)
     and (select mfa_ok())
     and (
       get_my_role() = 'super_admin'
       or (not is_portal_user() and r.organization_id = get_my_org_id() and can_see_resident_dates())
       or (is_portal_user() and portal_can_see_resident(r.id))
     )
$$;

revoke all on function public.can_see_resident_dates() from public, anon;
grant execute on function public.can_see_resident_dates() to authenticated;
revoke all on function public.resident_private_fields(uuid[]) from public, anon;
grant execute on function public.resident_private_fields(uuid[]) to authenticated;

-- Caller-run: read birth dates through resident_private_fields()
create or replace function public.il_import_tenants()
returns jsonb language plpgsql set search_path = public
as $$
declare
  v_org uuid := get_my_org_id();
  v_added int;
begin
  if v_org is null then raise exception 'No community'; end if;
  with ins as (
    insert into il_tenants (organization_id, resident_id, first_name, last_name, date_of_birth, phone, is_active)
    select v_org, r.id, r.first_name, r.last_name,
           (select pf.date_of_birth from resident_private_fields(array[r.id]) pf), r.phone, true
      from residents r
     where r.organization_id = v_org and r.is_active and r.care_level = 'independent'
       and not exists (select 1 from il_tenants t where t.organization_id = v_org and t.resident_id = r.id)
    on conflict do nothing
    returning 1
  )
  select count(*) into v_added from ins;
  return jsonb_build_object('added', v_added);
end;
$$;

revoke select on public.residents from anon, authenticated;
grant select (
  id, organization_id, first_name, last_name, unit, building, phone, is_active, created_at,
  middle_name, room, photo_url, care_level, show_in_directory, profile_id, barcode,
  pcc_patient_id, sms_opt_in, sms_opt_in_at, sms_opt_in_by, location_id
) on public.residents to authenticated;
