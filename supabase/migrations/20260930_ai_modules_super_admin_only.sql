-- The existing org_admin_manage_own_modules policy lets org admins/CEOs write any
-- organization_modules row for their own org. For the AI modules that would let a
-- customer grant themselves the paid add-on, or clinical AI without a HIPAA BAA.
-- Restrictive policies (ANDed with the permissive ones) limit writes of ai_assist*
-- rows to super admins; reads are untouched. Applied via the Supabase MCP (2026-09-30).

create policy ai_modules_super_admin_insert on organization_modules
  as restrictive for insert
  with check (module_key not in ('ai_assist', 'ai_assist_clinical') or get_my_role() = 'super_admin');

create policy ai_modules_super_admin_update on organization_modules
  as restrictive for update
  using      (module_key not in ('ai_assist', 'ai_assist_clinical') or get_my_role() = 'super_admin')
  with check (module_key not in ('ai_assist', 'ai_assist_clinical') or get_my_role() = 'super_admin');

create policy ai_modules_super_admin_delete on organization_modules
  as restrictive for delete
  using (module_key not in ('ai_assist', 'ai_assist_clinical') or get_my_role() = 'super_admin');
