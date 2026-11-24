import { useAuth } from '../context/AuthContext'

// Central Supply permissions, shared by every supply screen. Mirrors
// supabase/migrations/20260930_access_tiers_central_supply.sql.
//
//   canWork   — receive, issue, cash sales, record counts
//   canManage — items, prices, par levels, vendors, purchase orders
//   showCosts — unit costs, totals, inventory value. Screen-level for now:
//               database column masking comes with the budget layer.
//   canBill   — mark resident charges billed. Mirrors supply_can_bill()
//               (20261003_budget_dietary_supply.sql): Central Supply Manager or
//               Org Admin.
//   canSeeCharges — the Resident Charges tab: anyone who can bill, plus the
//               Administrator (view only).
//   checkoutOnly — no Central Supply permission at all (staff of other departments):
//               only Issue / Checkout, to their own departments or a resident, through
//               supply_issue() (20261111_supply_checkout_everyone.sql). Central Supply
//               Employees and Supervisors have the Manager's permissions since then.
//   canOrder  — send submitted orders to vendors (download / print / email). Mirrors
//               supply_can_order() (20261004_vendor_ordering.sql): whoever manages
//               purchase orders, and Org Admins.
export function useSupplyAccess() {
  const { tierFor, isViewOnly, hasDepartmentAccess, profile, isSuperAdmin, can, hasModule, orgModules } = useAuth()

  if (orgModules.includes('central_supply') && !hasModule('central_supply')) {
    return { canWork: false, canManage: false, showCosts: false, canBill: false, canSeeCharges: false, canOrder: false, checkoutOnly: true }
  }

  const role = isSuperAdmin ? 'super_admin' : profile?.role
  // Billing resident charges = Central Supply Costs (supply_can_bill())
  const csManager = role !== 'ceo' && can('central_supply', 'costs')
  const canBill = ['org_admin', 'super_admin'].includes(role) || csManager
  const canSeeCharges = canBill || role === 'ceo'

  // View-only in Central Supply: read only, costs still shown to whoever would
  // normally see them. role_view_only_guard enforces it.
  if (isViewOnly('central_supply')) {
    const showCosts = ['manager', 'administrator', 'org_admin', 'super_admin'].includes(tierFor('central_supply'))
    return { canWork: false, canManage: false, showCosts, canBill: false, canSeeCharges, canOrder: false }
  }

  const csTier = tierFor('central_supply')
  const dietaryManager = tierFor('dietary') === 'manager'
  const canManage = ['manager', 'org_admin', 'super_admin'].includes(csTier) || dietaryManager
  const canWork = canManage || csTier === 'supervisor'
    || (csTier !== 'administrator' && hasDepartmentAccess('central_supply', 'employee'))
  const showCosts = canManage || csTier === 'administrator'
  return { canWork, canManage, showCosts, canBill, canSeeCharges, canOrder: role !== 'ceo' && canManage }
}
