import { supabase } from './supabase'

// Every job_role_permissions row for one community's Job Roles.
// Filtered to the community because a super admin can read every community's
// rows, and paged because Supabase returns at most 1,000 rows per request: an
// unfiltered, unpaged read silently dropped rows (2026-11-19), so the Job Roles
// grid showed granted permissions as unchecked and re-adding one failed with
// "duplicate key value violates unique constraint job_role_permissions_pkey".
const PAGE = 1000

export async function loadJobRolePermissions(orgId) {
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('job_role_permissions')
      .select('job_role_id, module_key, action, job_roles!inner(organization_id)')
      .eq('job_roles.organization_id', orgId)
      .order('job_role_id').order('module_key').order('action')
      .range(from, from + PAGE - 1)
    if (error) return { data: rows, error }
    rows.push(...data.map(({ job_role_id, module_key, action }) => ({ job_role_id, module_key, action })))
    if (data.length < PAGE) return { data: rows, error: null }
  }
}
