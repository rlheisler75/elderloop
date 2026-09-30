// Access tiers (approved 2026-09-30). The full design, with the reasoning behind
// every cell, is at https://claude.ai/artifact/L8E4t6v4EB6BksyrEfkjD2 and
// accessMatrix.json is generated from it.
//
// Tiers, narrowest to widest: employee → supervisor → manager (the per-department
// levels in staff_department_roles) → administrator (the Nursing Home
// Administrator — role key `ceo`, NOT a system admin) → corporate (planned).
// org_admin is the platform/system admin and sits outside the tiers.
//
// Phase 2+: communities on access_model 'tiered' get the NHA rules (nhaViewOnly,
// canManagePlatform in AuthContext; nha_write_guard in the database). Later phases
// convert the remaining tiers module by module.
import ACCESS_MATRIX from './accessMatrix.json'
import { LEVEL_RANK } from './departments'

export { ACCESS_MATRIX }

// Keep in sync with module_department() in the database.
// null = cross-department module: tier comes from the highest level held anywhere.
export const MODULE_DEPARTMENTS = {
  work_orders:         'maintenance',
  meters:              'maintenance',
  dietary:             'dietary',
  housekeeping:        'housekeeping',
  central_supply:      'central_supply',
  social_services:     'social_services',
  nursing:             'nursing',
  activities:          'activities',
  chapel:              'activities',
  transportation:      'transportation',
  security:            'security',
  it:                  'it',
  property_management: 'property',
  marketing:           'marketing',
}

// Mirrors my_access_tier() in the database. Returns super_admin | org_admin |
// administrator | manager | supervisor | employee | none.
export function tierFor({ role, isSuperAdmin, departmentRoles = [] }, moduleKey) {
  if (isSuperAdmin || role === 'super_admin') return 'super_admin'
  if (!role || ['family', 'resident', 'sales_rep'].includes(role)) return 'none'
  if (role === 'org_admin') return 'org_admin'
  if (role === 'ceo') return 'administrator'

  const dept = MODULE_DEPARTMENTS[moduleKey] ?? null
  const levels = departmentRoles
    .filter(d => dept === null || d.department === dept)
    .map(d => LEVEL_RANK[d.level] ?? 0)
  if (levels.length) return ['employee', 'supervisor', 'manager'][Math.max(...levels)]

  // Legacy role-only supervisors/managers with no department assignments at all
  if (!departmentRoles.length && (role === 'manager' || role === 'supervisor')) return role
  return 'employee'
}

// Modules where the Administrator (NHA) writes in a tiered community, per the matrix
// (incident close-out, community announcements, family communication, facility
// surveys, admissions/discharges). Everywhere else the NHA is view + approve.
// The database mirror is the set of tables left OUT of nha_write_guard.
export const NHA_WRITABLE_MODULES = ['incidents', 'communication', 'family', 'surveys', 'directory']

// The matrix cell for a tier in a module: { read, write, delete, approves } scopes.
// org_admin / super_admin aren't tiers and have full access.
export function permissionsFor(tier, moduleKey) {
  return ACCESS_MATRIX.modules[moduleKey]?.permissions?.[tier] ?? null
}
