import { useAuth } from '../context/AuthContext'
import { MODULE_DEPARTMENTS } from '../lib/accessTiers'

// Tier checks for the phase-4 "remaining modules" (Activities, Chapel, Transportation,
// Security, IT, Meters, Property, Time Clock, Scheduling, certifications,
// Announcements, Marketing). Mirrors the SQL helpers in
// supabase/migrations/20260930_access_tiers_remaining_modules.sql so screens only
// offer what the database will accept. Every check returns true in legacy
// communities; each screen keeps its own legacy rule alongside.
//
//   atLeast(min)   — t_at_least(module, min): employee | supervisor | manager
//   member         — t_member(module): works in the module's department, or Supervisor+ there
//   anySupervisor  — t_any_supervisor(): Supervisor+ in any department
//   anyManager     — t_any_manager(): Manager+ in any department

const TIER_RANK = { employee: 0, supervisor: 1, manager: 2, administrator: 9, org_admin: 9, super_admin: 9 }
const LEGACY_SUPERVISOR_ROLES = ['supervisor', 'manager', 'ceo', 'org_admin', 'super_admin']
const LEGACY_MANAGER_ROLES = ['manager', 'ceo', 'org_admin', 'super_admin']

export function useTierAccess(moduleKey) {
  const { accessModel, tierFor, profile, isSuperAdmin, hasDepartmentAccess, hasAnyDepartmentLevel } = useAuth()
  const tiered = accessModel === 'tiered'

  if (!tiered) {
    return { tiered, tier: null, atLeast: () => true, member: true, anySupervisor: true, anyManager: true }
  }

  const tier = tierFor(moduleKey)
  const department = MODULE_DEPARTMENTS[moduleKey]
  const rank = TIER_RANK[tier] ?? -1
  const atLeast = (min) => rank >= (TIER_RANK[min] ?? 0)
  const member = atLeast('supervisor') || (!!department && hasDepartmentAccess(department, 'employee'))
  const role = isSuperAdmin ? 'super_admin' : profile?.role
  const anySupervisor = hasAnyDepartmentLevel('supervisor') || LEGACY_SUPERVISOR_ROLES.includes(role)
  const anyManager = hasAnyDepartmentLevel('manager') || LEGACY_MANAGER_ROLES.includes(role)

  return { tiered, tier, atLeast, member, anySupervisor, anyManager }
}
