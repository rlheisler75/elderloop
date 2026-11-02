-- Organization Settings would not save: "infinite recursion detected in policy for
-- relation organizations". The update policy's WITH CHECK read profiles under RLS, and
-- the profiles policy reps_view_referred_org_staff reads organizations, so Postgres
-- refused every update by a signed-in user. get_my_role() is security definer and
-- reads the caller's own profile without RLS, so the rule stays the same.
alter policy org_admins_update_own_org on public.organizations
  with check (
    ((id = get_my_org_id()) and (get_my_role() = any (array['super_admin', 'org_admin', 'ceo', 'manager'])))
    or (get_my_role() = 'super_admin')
  );
