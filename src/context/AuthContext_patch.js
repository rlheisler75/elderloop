// ─────────────────────────────────────────────────────────────────
// PATCH — AuthContext.jsx
// Replace the hasModule function with a role-aware version that
// automatically grants certain modules to certain roles without
// requiring a user_module_permissions row.
// ─────────────────────────────────────────────────────────────────
//
// FIND:
  // Is this module enabled for the org AND does the user have access?
  const hasModule = (key) => {
    if (!orgModules.includes(key)) return false
    // org_admin, ceo, super_admin always have full access
    if (['org_admin','ceo','super_admin'].includes(profile?.role) || superAdmin) return true
    return userPerms.some(p => p.module_key === key)
  }
//
// REPLACE WITH:

  // Modules that are automatically visible to certain roles
  // without needing a user_module_permissions row.
  // Format: module_key -> minimum roles that get it by default
  const ROLE_MODULE_DEFAULTS = {
    // Surveys: supervisor+ see the module; staff take via public link only
    surveys:    ['supervisor', 'manager', 'ceo', 'org_admin', 'super_admin'],
    // Incidents: all filing-eligible roles see their own reports
    incidents:  ['staff', 'dietary', 'housekeeping', 'maintenance', 'nursing',
                 'supervisor', 'manager', 'ceo', 'org_admin', 'super_admin'],
  }

  // Is this module enabled for the org AND does the user have access?
  const hasModule = (key) => {
    if (!orgModules.includes(key)) return false
    // org_admin, ceo, super_admin always have full access
    if (['org_admin','ceo','super_admin'].includes(profile?.role) || superAdmin) return true
    // Role-based defaults: some modules auto-grant to specific roles
    if (ROLE_MODULE_DEFAULTS[key]?.includes(profile?.role)) return true
    // Otherwise fall back to explicit user_module_permissions
    return userPerms.some(p => p.module_key === key)
  }

// ─────────────────────────────────────────────────────────────────
// NOTES:
// - ROLE_MODULE_DEFAULTS lives inside AuthProvider so it has access
//   to profile at the time hasModule is called (no stale closure).
// - 'incidents' is also added here so staff see the module in their
//   sidebar automatically — no manual permission grant needed.
// - To add more role defaults as you refactor modules, just add an
//   entry to ROLE_MODULE_DEFAULTS. No DB changes required.
// - staff roles NOT in a module's defaults still need an explicit
//   user_module_permissions row (existing behavior preserved).
// ─────────────────────────────────────────────────────────────────
