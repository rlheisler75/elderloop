-- Residents' emergency and medical contacts are no longer readable by every staff
-- member. Staff see residents' name, room/address, care level and phone; the
-- contacts are for Nursing Supervisor+, every level of Social Services, the
-- Administration department, the Administrator and Org Admins (super admins too).
-- Portal logins keep seeing their own resident's contacts (portal_scope).
-- App mirror: canSeeContacts in src/pages/directory/ResidentDirectory.jsx.

create or replace function public.can_see_resident_contacts()
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce(
    get_my_role() in ('org_admin', 'ceo', 'super_admin')
    or has_department_access('nursing', 'supervisor')
    or has_department_access('social_services', 'employee')
    or has_department_access('administration', 'employee'),
    false)
$$;

revoke all on function public.can_see_resident_contacts() from public, anon;
grant execute on function public.can_see_resident_contacts() to authenticated;

drop policy if exists resident_contacts_scope on public.resident_emergency_contacts;
create policy resident_contacts_scope on public.resident_emergency_contacts
  as restrictive for all to authenticated
  using ((select is_portal_user()) or (select can_see_resident_contacts()))
  with check ((select is_portal_user()) or (select can_see_resident_contacts()));

drop policy if exists resident_contacts_scope on public.resident_medical_contacts;
create policy resident_contacts_scope on public.resident_medical_contacts
  as restrictive for all to authenticated
  using ((select is_portal_user()) or (select can_see_resident_contacts()))
  with check ((select is_portal_user()) or (select can_see_resident_contacts()));
