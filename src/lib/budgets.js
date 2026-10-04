// Budget layer (design: https://claude.ai/artifact/N3er5vW3dj2RerraUypNvG).
// Keep BUDGET_DEPARTMENTS and SPEND_CATEGORIES in sync with the check constraints
// in supabase/migrations/20261002_budget_foundation.sql.

export const BUDGET_DEPARTMENTS = [
  { key: 'dietary',        label: 'Dietary' },
  { key: 'housekeeping',   label: 'Housekeeping' },
  { key: 'central_supply', label: 'Central Supply' },
  { key: 'maintenance',    label: 'Maintenance' },
]
export const BUDGET_DEPARTMENT_KEYS = BUDGET_DEPARTMENTS.map(d => d.key)
export const departmentLabel = (key) => BUDGET_DEPARTMENTS.find(d => d.key === key)?.label ?? key

export const SPEND_CATEGORIES = [
  { key: 'food',              label: 'Food' },
  { key: 'linen',             label: 'Linen' },
  { key: 'chemicals',         label: 'Chemicals' },
  { key: 'paper',             label: 'Paper' },
  { key: 'medical',           label: 'Medical' },
  { key: 'incontinence',      label: 'Incontinence' },
  { key: 'personal_care',     label: 'Personal care' },
  { key: 'office',            label: 'Office' },
  { key: 'maintenance_parts', label: 'Maintenance parts' },
  { key: 'other',             label: 'Other' },
]
const EXTRA_CATEGORY_LABELS = { shipping: 'Shipping', vendor_services: 'Vendor services' }
export const categoryLabel = (key) =>
  SPEND_CATEGORIES.find(c => c.key === key)?.label ?? EXTRA_CATEGORY_LABELS[key] ?? key

export const SOURCE_LABELS = {
  purchase: 'Purchase orders',
  shipping: 'Shipping',
  issue: 'Issued from Central Supply',
  manual: 'Off-system purchases',
  work_order: 'Closed work orders',
}

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const money = (n, digits = 0) =>
  n == null ? '—' : `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`

export const firstOfMonth = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`

export const monthLabel = (iso) =>
  new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

export const shiftMonth = (iso, delta) => {
  const d = new Date(iso + 'T12:00:00')
  return firstOfMonth(new Date(d.getFullYear(), d.getMonth() + delta, 1))
}

// Status colour for a department: projected month-end pace and amount spent
// (the same lines the alerts will use: pace over 100%, then 80 / 90 / 100% spent)
export function budgetTone(row) {
  if (row.budget == null) return 'none'
  if (row.pct_used >= 100) return 'over'
  if (row.pct_used >= 80 || row.projected_pct > 100) return 'warn'
  return 'ok'
}

// Budget alerts (budget_alerts.kind), sent once per department per month by
// check_budget_alerts() (20261004_budget_alerts.sql)
export const ALERT_LABELS = {
  pace: 'On pace to go over',
  pct80: '80% spent',
  pct90: '90% spent',
  pct100: 'Over budget',
}
export const alertDate = (ts) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
