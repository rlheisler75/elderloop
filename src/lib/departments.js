// Fallback only — orgs manage their real department list in Admin Panel > Settings
// (organizations.departments). See getOrgDepartments().
export const FALLBACK_DEPARTMENTS = [
  { key: 'nursing',        label: 'Nursing' },
  { key: 'maintenance',    label: 'Maintenance' },
  { key: 'dietary',        label: 'Dietary' },
  { key: 'housekeeping',   label: 'Housekeeping' },
  { key: 'transportation', label: 'Transportation' },
  { key: 'administration', label: 'Administration' },
  { key: 'activities',     label: 'Activities' },
  { key: 'security',       label: 'Security' },
  { key: 'it',             label: 'IT' },
  { key: 'hr',             label: 'HR' },
  { key: 'payroll',        label: 'Payroll' },
  { key: 'other',          label: 'Other' },
]

export const STAFF_LEVELS = [
  { key: 'employee',   label: 'Employee' },
  { key: 'supervisor', label: 'Supervisor' },
  { key: 'manager',    label: 'Manager' },
]

export const LEVEL_RANK = { employee: 0, supervisor: 1, manager: 2 }

export const getOrgDepartments = (organization) =>
  organization?.departments?.length ? organization.departments : FALLBACK_DEPARTMENTS
