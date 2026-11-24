import { useAuth } from '../context/AuthContext'
import { MODULE_DEPARTMENTS } from '../lib/accessTiers'

// Tier checks for the phase-4 "remaining modules" (Activities, Chapel, Transportation,
// Security, IT, Meters, Property, Time Clock, Scheduling, certifications,
// Announcements, Marketing). Mirrors the SQL helpers in
// supabase/migrations/20260930_access_tiers_remaining_modules.sql so screens only
// offer what the database will accept.
//
//   atLeast(min)   — t_at_least(module, min): employee | supervisor | manager
//   member         — t_member(module): works in the module's department, or Supervisor+ there
//   anySupervisor  — t_any_supervisor(): Supervisor+ in any department
//   anyManager     — t_any_manager(): Manager+ in any department

const TIER_RANK = { employee: 0, supervisor: 1, manager: 2, administrator: 9, org_admin: 9, super_admin: 9 }
const ADMIN_ROLES = ['ceo', 'org_admin', 'super_admin']

export function useTierAccess(moduleKey) {
  const { tierFor, profile, isSuperAdmin, hasDepartmentAccess, hasAnyDepartmentLevel } = useAuth()

  const tier = tierFor(moduleKey)
  const department = MODULE_DEPARTMENTS[moduleKey]
  const rank = TIER_RANK[tier] ?? -1
  const atLeast = (min) => rank >= (TIER_RANK[min] ?? 0)
  const member = atLeast('supervisor') || (!!department && hasDepartmentAccess(department, 'employee'))
  const role = isSuperAdmin ? 'super_admin' : profile?.role
  const anySupervisor = hasAnyDepartmentLevel('supervisor') || ADMIN_ROLES.includes(role)
  const anyManager = hasAnyDepartmentLevel('manager') || ADMIN_ROLES.includes(role)

  return { tier, atLeast, member, anySupervisor, anyManager }
}
