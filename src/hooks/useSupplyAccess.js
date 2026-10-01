import { useAuth } from '../context/AuthContext'

// Central Supply permissions, shared by every supply screen. Mirrors
// supabase/migrations/20260930_access_tiers_central_supply.sql for communities on
// tiered access; legacy communities keep the original rule (any supply staff,
// any org-wide supervisor, or an explicit module grant can work the module).
//
//   canWork   — receive, issue, cash sales, record counts
//   canManage — items, prices, par levels, vendors, purchase orders
//   showCosts — unit costs, totals, inventory value. Screen-level for now:
//               database column masking comes with the budget layer.
export function useSupplyAccess() {
  const { accessModel, tierFor, canEdit, hasDepartmentAccess, hasAnyDepartmentLevel } = useAuth()

  if (accessModel !== 'tiered') {
    const canWork = canEdit('central_supply', ['supervisor', 'manager'])
      || hasDepartmentAccess('central_supply', 'employee') || hasAnyDepartmentLevel('supervisor')
    return { canWork, canManage: canWork, showCosts: true }
  }

  const csTier = tierFor('central_supply')
  const dietaryManager = tierFor('dietary') === 'manager'
  const canManage = ['manager', 'org_admin', 'super_admin'].includes(csTier) || dietaryManager
  const canWork = canManage || csTier === 'supervisor'
    || (csTier !== 'administrator' && hasDepartmentAccess('central_supply', 'employee'))
  const showCosts = canManage || csTier === 'administrator'
  return { canWork, canManage, showCosts }
}
