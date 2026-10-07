-- HIPAA readiness gap 10: security-definer functions callable without sign-in.
-- Postgres grants EXECUTE on new functions to PUBLIC, and Supabase also grants it to
-- anon / authenticated, so every one of these was reachable through /rest/v1/rpc.
--
-- 1. Trigger functions. Postgres never checks EXECUTE when a trigger fires, so taking
--    it away from API roles changes nothing for the triggers and closes the RPC door.
-- 2. log_audit_event: signed-in callers only (an anonymous call wrote a row with no
--    user and let anyone fill the audit log). Login, logout and auto-logoff all call
--    it while a session exists.
-- 3. po_total: unused by app code, policies, or other functions, and it returned any
--    community's order total to anyone. Server-side only now.
--
-- Deliberately left callable without sign-in:
--   increment_landing_page_view, increment_rep_code_click, opt_out_lead_email
--     (public landing, signup, and email opt-out pages)
--   get_my_org_id, get_my_role, get_my_org_rep_id, is_super_admin, org_has_module,
--   has_department_access, has_any_department_level, is_social_services_writer
--     (RLS helpers: policies call them even for anonymous requests, and they return
--      nothing without a signed-in user)

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'audit_ephi_changes()', 'auto_link_rep_id()', 'cycle_menu_nha_approval_only()',
    'exit_nurture_enrollments_on_lead_change()', 'handle_new_user()',
    'handle_rep_signup_bonus()', 'il_cleaning_billing_guard()', 'incident_close_guard()',
    'nha_write_guard()', 'notify_rep_commission_paid()', 'notify_rep_new_signup()',
    'protect_dietary_profile_clinical_fields()', 'protect_profile_privileges()',
    'set_wo_number()', 'ss_grievance_close_guard()', 'ss_profile_assignment_guard()',
    'supply_item_guard()', 'supply_po_guard()', 'supply_po_line_guard()',
    'sync_user_email()', 'wo_employee_field_guard()',
    'po_total(uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', fn);
    execute format('grant execute on function public.%s to service_role', fn);
  end loop;
end $$;

revoke execute on function public.log_audit_event(text, text, text, jsonb, jsonb, text) from public, anon;
grant execute on function public.log_audit_event(text, text, text, jsonb, jsonb, text) to authenticated, service_role;
