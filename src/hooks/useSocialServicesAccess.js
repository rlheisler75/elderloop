import { useAuth } from '../context/AuthContext'

// Social Services permissions by tier, mirroring
// supabase/migrations/20260930_access_tiers_social_services.sql.
//
//   isSupervisor  — Social Services Supervisor+ (or Org Admin): edits any case note,
//                   assigns caseloads
//   canClose      — Social Services Director, the Administrator (grievance official),
//                   or an Org Admin: resolves grievances, state-reporting fields
export function useSocialServicesAccess() {
  const { tierFor, isViewOnly } = useAuth()
  // No write permission in Social Services: read only
  if (isViewOnly('social_services')) return { isSupervisor: false, canClose: false }
  const t = tierFor('social_services')
  return {
    isSupervisor: ['supervisor', 'manager', 'org_admin', 'super_admin'].includes(t),
    canClose: ['manager', 'administrator', 'org_admin', 'super_admin'].includes(t),
  }
}
