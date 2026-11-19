-- Signed-in users read only their own community's announcements.
--
-- org_members_view_announcements (role public) had a second branch,
--   (is_active AND started AND not expired),
-- meant for the public TV / signage screens. For a signed-in user it let anyone
-- in any community read every community's live announcements (confirmed
-- 2026-11-19: a Maranatha staff login could read the demo community's). Public
-- screens don't need it: anon already has public_view_live_announcements and
-- tv_public_read_announcements with that same rule.
--
-- The policy is also limited to authenticated: as a role-public policy, its
-- profiles subquery made anon reads fail with "permission denied for table
-- profiles" once the live-announcement branch was gone (applied as a second
-- migration, announcements_own_org_policy_authenticated_only, about a minute later).

alter policy org_members_view_announcements on public.announcements
  to authenticated
  using (
    organization_id in (select profiles.organization_id from public.profiles where profiles.id = auth.uid())
    or public.get_my_role() = 'super_admin'
  );
