-- Two-factor sign-in, part 2: enforce it in the database, not just on screen.
-- Apply only after the app with the code / setup screens is live (part 1 is
-- 20261007_two_factor_foundation.sql).
--
-- A RESTRICTIVE policy `mfa_gate` on every public table (and storage.objects), for
-- signed-in sessions only: rows are visible / writable only when mfa_ok() is true —
-- the session passed the code step (JWT aal2), or the person has no authenticator and
-- isn't required to have one. A stolen password alone therefore reads nothing for
-- anyone who uses two-factor. Anonymous requests are untouched (they never had access
-- to these tables beyond what other policies allow), and server code using the
-- service role bypasses RLS as before.
--
-- When adding a new table, add this policy too (same as staff_only_no_portal):
--   create policy mfa_gate on public.<table> as restrictive for all to authenticated
--     using ((select public.mfa_ok())) with check ((select public.mfa_ok()));
-- Security-definer RPCs bypass RLS; ones that return health data should also check
-- mfa_ok() (can_reset_mfa and org_mfa_status already do).

do $$
declare
  t record;
begin
  for t in
    select c.relname
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity
  loop
    execute format('drop policy if exists mfa_gate on public.%I', t.relname);
    execute format(
      'create policy mfa_gate on public.%I as restrictive for all to authenticated '
      'using ((select public.mfa_ok())) with check ((select public.mfa_ok()))', t.relname);
  end loop;
end $$;

drop policy if exists mfa_gate on storage.objects;
create policy mfa_gate on storage.objects as restrictive for all to authenticated
  using ((select public.mfa_ok())) with check ((select public.mfa_ok()));
