-- Personal contact fields on profiles are no longer readable with a plain select.
-- profiles_select lets every staff member read the rows of coworkers marked
-- directory_public (needed for names all over the app), and RLS can't hide
-- columns, so anyone could read those people's cell phones through the API.
--
-- Private: phone, cell_phone, emergency_contact_name, emergency_contact_phone, notes.
-- SELECT is granted on every other column; the private ones come only from
-- profile_private_fields(), for yourself, or to Supervisor+ (role or any
-- department level), HR (Staff view), the Administrator, and Org Admins in your
-- community, plus an Org Admin's own sales rep. Writes are unchanged. App side:
-- src/lib/profilePrivate.js (PROFILE_COLS, withPrivateFields). A new profiles
-- column needs adding to the grant below and to PROFILE_COLS.

create or replace function public.profile_private_fields(p_ids uuid[])
returns table (id uuid, phone text, cell_phone text, emergency_contact_name text,
               emergency_contact_phone text, notes text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.phone::text, p.cell_phone::text, p.emergency_contact_name::text,
         p.emergency_contact_phone::text, p.notes::text
  from profiles p
  where p.id = any(p_ids)
    and (select mfa_ok())
    and (
      p.id = auth.uid()
      or get_my_role() = 'super_admin'
      or (p.organization_id = get_my_org_id() and (
            get_my_role() in ('org_admin', 'ceo', 'supervisor', 'manager')
            or has_any_department_level('supervisor')
            or can('staff', 'view')))
      or (p.role = 'sales_rep' and p.id = get_my_org_rep_id()
          and get_my_role() in ('org_admin', 'ceo'))
    )
$$;

revoke all on function public.profile_private_fields(uuid[]) from public, anon;
grant execute on function public.profile_private_fields(uuid[]) to authenticated;

revoke select on public.profiles from anon, authenticated;
grant select (
  id, organization_id, role, first_name, last_name, avatar_url, is_active,
  created_at, updated_at, department, hire_date, job_title, status, email,
  work_phone, office_location, bio, directory_public, accent_color, notify_email,
  notify_push, theme_mode, must_change_password, is_platform_admin, corporation_id,
  sms_opt_in, sms_opt_in_at, employment_end_date
) on public.profiles to authenticated;
