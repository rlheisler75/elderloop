import { useAuth } from '../context/AuthContext'

// Social Services permissions by tier, mirroring
// supabase/migrations/20260930_access_tiers_social_services.sql for communities on
// tiered access. Legacy communities keep today's behavior (everything true).
//
//   isSupervisor  — Social Services Supervisor+ (or Org Admin): edits any case note,
//                   assigns caseloads
//   canClose      — Social Services Director, the Administrator (grievance official),
//                   or an Org Admin: resolves grievances, state-reporting fields
export function useSocialServicesAccess() {
  const { accessModel, tierFor } = useAuth()
  if (accessModel !== 'tiered') return { tiered: false, isSupervisor: true, canClose: true }
  const t = tierFor('social_services')
  return {
    tiered: true,
    isSupervisor: ['supervisor', 'manager', 'org_admin', 'super_admin'].includes(t),
    canClose: ['manager', 'administrator', 'org_admin', 'super_admin'].includes(t),
  }
}
