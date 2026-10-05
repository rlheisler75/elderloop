import { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSessionTimeout } from '../hooks/useSessionTimeout'
import SessionTimeoutModal from '../components/SessionTimeoutModal'
import { tierFor as tierForProfile, NHA_WRITABLE_MODULES } from '../lib/accessTiers'
import { BUDGET_DEPARTMENT_KEYS } from '../lib/budgets'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null)
  const [profile, setProfile]         = useState(null)
  const [organization, setOrg]        = useState(null)
  const [orgModules, setOrgModules]   = useState([])
  const [userPerms, setUserPerms]     = useState([])
  const [roleVisibility, setRoleVisibility] = useState([])
  const [departmentRoles, setDepartmentRoles] = useState([]) // [{ department, level }] for the current user
  const [superAdmin, setSuperAdmin]   = useState(false)
   const [loading, setLoading]         = useState(true)
  const [suspended, setSuspended]     = useState(false)
  const [impersonating, setImpersonating] = useState(false)
  const [emergencyUntil, setEmergencyUntil] = useState(null) // NHA Emergency Edit expiry (ISO)
  const navigate                      = useNavigate()

  // Load an Administrator's active Emergency Edit, and clear it the moment it expires
  useEffect(() => {
    if (profile?.role !== 'ceo') { setEmergencyUntil(null); return }
    supabase.from('access_overrides').select('expires_at')
      .eq('profile_id', profile.id).is('ended_at', null).gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false }).limit(1)
      .then(({ data }) => setEmergencyUntil(data?.[0]?.expires_at ?? null))
  }, [profile?.id, profile?.role])
  useEffect(() => {
    if (!emergencyUntil) return
    const ms = new Date(emergencyUntil) - Date.now()
    if (ms <= 0) { setEmergencyUntil(null); return }
    const t = setTimeout(() => setEmergencyUntil(null), Math.min(ms, 2 ** 31 - 1))
    return () => clearTimeout(t)
  }, [emergencyUntil])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else {
        setProfile(null); setOrg(null); setOrgModules([])
        setUserPerms([]); setRoleVisibility([]); setSuperAdmin(false); setLoading(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Apply the user's chosen accent color app-wide (see src/index.css —
  // Tailwind's brand.* palette reads from these CSS vars). Defaults to the
  // original blue via :root when no profile/preference is set yet.
  useEffect(() => {
    document.documentElement.dataset.accent = profile?.accent_color || 'blue'
  }, [profile?.accent_color])

  // Light/dark mode — a per-user Settings preference (not OS-level), so it's
  // driven by profile.theme_mode via Tailwind's `darkMode: 'class'`.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', profile?.theme_mode === 'dark')
  }, [profile?.theme_mode])

  async function fetchProfile(userId) {
    setLoading(true)
    try {
      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', userId).single()
      setProfile(prof)

      // Source of truth is profiles.role — the legacy super_admins table is unused/empty
      const isSA = prof?.role === 'super_admin'
      setSuperAdmin(isSA)

      // Super admin org impersonation: if a target org was stashed via impersonateOrg(),
      // load that org instead of the super admin's own (usually org-less) profile.
      const storedOrgId = isSA ? localStorage.getItem('elderloop_super_admin_org') : null
      const orgIdToLoad = storedOrgId || prof?.organization_id

      if (orgIdToLoad) {
        const [orgRes, modsRes, permsRes, roleVisRes, deptRolesRes] = await Promise.all([
          supabase.from('organizations').select('*').eq('id', orgIdToLoad).single(),
          supabase.from('organization_modules').select('module_key, is_enabled')
            .eq('organization_id', orgIdToLoad),
          supabase.from('user_module_permissions').select('module_key, access_level')
            .eq('user_id', userId),
          supabase.from('role_module_visibility').select('module_key')
            .eq('organization_id', orgIdToLoad).eq('role', prof?.role),
          supabase.from('staff_department_roles').select('department, level')
            .eq('profile_id', userId),
        ])
        const org = orgRes.data

        // Check if org is suspended — cancelled billing or deactivated org
        // Super admins bypass this so you can always get in to fix things
        const orgSuspended = !isSA && (
          org?.is_active === false ||
          ['cancelled'].includes(org?.billing_status)
        )
        setSuspended(orgSuspended)

        setOrg(org)
        setOrgModules(modsRes.data?.filter(m => m.is_enabled !== false).map(m => m.module_key) || [])
        setUserPerms(permsRes.data || [])
        setRoleVisibility(roleVisRes.data?.map(r => r.module_key) || [])
        setDepartmentRoles(deptRolesRes.data || [])
        if (storedOrgId) setImpersonating(true)
      }
    } catch (e) {
      console.error('Profile fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  // ── Session timeout (HIPAA auto-logoff) ───────────────────────
  const { showWarning, timeLeft, extendSession, doLogout } = useSessionTimeout({
    enabled: !!user,
    onTimeout: () => navigate('/login?reason=timeout'),
  })

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

  // Same defaults as ROLE_MODULE_DEFAULTS, but expressed as a minimum
  // department+level rank instead of a literal legacy role string — so
  // someone reassigned off the flat role (role='staff' + a department/level
  // row) doesn't silently lose a module's sidebar visibility. Purely additive
  // alongside ROLE_MODULE_DEFAULTS; org-wide (any department) by design,
  // matching the "any department's supervisor+" access this module already grants.
  const LEVEL_MODULE_DEFAULTS = {
    surveys: 'supervisor',
  }

  // ── Access tiers (see src/lib/accessTiers.js) ─────────────────────────────
  // In a 'tiered' community the Administrator (NHA, role ceo) is view + approve
  // outside their own modules, unless Emergency Edit (24h, reason required) is on.
  const accessModel       = organization?.access_model || 'legacy'
  const emergencyEditOn   = !!emergencyUntil && new Date(emergencyUntil) > new Date()
  const nhaViewOnly       = accessModel === 'tiered' && profile?.role === 'ceo' && !emergencyEditOn
  // Settings / users / modules: Org Admin always; in tiered communities an NHA
  // only with the Platform Admin switch; in legacy ones the NHA as before.
  const canManagePlatform = ['org_admin', 'super_admin'].includes(profile?.role) || superAdmin
    || (profile?.role === 'ceo' && (accessModel === 'legacy' || !!profile?.is_platform_admin))

  // Is this module enabled for the org AND does the user have access?
  const hasModule = (key) => {
    if (!orgModules.includes(key)) return false
    // org_admin, ceo, super_admin always have full access
    if (['org_admin','ceo','super_admin'].includes(profile?.role) || superAdmin) return true
    // Role-based defaults: some modules auto-grant to specific roles
    if (ROLE_MODULE_DEFAULTS[key]?.includes(profile?.role)) return true
    // Department+level equivalent of the above, for reassigned accounts
    if (LEVEL_MODULE_DEFAULTS[key] && hasAnyDepartmentLevel(LEVEL_MODULE_DEFAULTS[key])) return true
    // Budgets: Managers of the budget departments (mirrors can_see_budget() in the database)
    if (key === 'budgets' && departmentRoles.some(d => d.level === 'manager' && BUDGET_DEPARTMENT_KEYS.includes(d.department))) return true
    // Org-configurable role defaults (Admin Panel → Role Templates) — a sensible
    // starting baseline per role, editable per org. Explicit grants below still win.
    if (roleVisibility.includes(key)) return true
    // Otherwise fall back to explicit user_module_permissions
    return userPerms.some(p => p.module_key === key)
  }

  // canEdit(key, defaultRoles?) — explicit user_module_permissions always wins.
  // If no explicit permission row exists for this module, defaultRoles (if provided)
  // grants edit access to those roles by default — e.g. nursing staff can edit
  // Nursing Notes out of the box without an admin having to configure anything,
  // but an admin can still override (grant edit to other roles, or downgrade
  // nursing staff to view-only) via the Admin Panel.
  const canEdit = (key, defaultRoles = []) => {
    // Tiered communities: the Administrator (NHA) edits only the modules they own
    // per the access matrix — elsewhere it's view + approve unless Emergency Edit
    // is on. The database (nha_write_guard) enforces the same rule.
    if (nhaViewOnly && !NHA_WRITABLE_MODULES.includes(key)) return false
    if (['org_admin','ceo','super_admin'].includes(profile?.role) || superAdmin) return true
    const perm = userPerms.find(p => p.module_key === key)
    if (perm) return perm.access_level === 'edit'
    return defaultRoles.includes(profile?.role)
  }

  // hasDepartmentAccess(dept, minLevel) — for the "everyone can submit, only the
  // owning department's supervisors/managers see and work the full queue" pattern
  // (IT Tickets, Work Orders, etc.). org_admin/ceo/super_admin always pass.
  // Level rank: employee < supervisor < manager.
  const LEVEL_RANK = { employee: 0, supervisor: 1, manager: 2 }
  const hasDepartmentAccess = (dept, minLevel = 'employee') => {
    if (['org_admin','ceo','super_admin'].includes(profile?.role) || superAdmin) return true
    const assignment = departmentRoles.find(d => d.department === dept)
    if (!assignment) return false
    return (LEVEL_RANK[assignment.level] ?? -1) >= (LEVEL_RANK[minLevel] ?? 0)
  }

  // hasAnyDepartmentLevel(minLevel) — for org-wide "supervisor perks" that aren't
  // tied to one specific department (Broadcast tab, deleting others' messages,
  // managing the schedule, etc.). There's no free-floating Supervisor/Manager
  // account anymore — every one is attached to a department — so this is true
  // when the person supervises/manages AT LEAST ONE department. org_admin/ceo/
  // super_admin always pass.
  const hasAnyDepartmentLevel = (minLevel = 'supervisor') => {
    if (['org_admin','ceo','super_admin'].includes(profile?.role) || superAdmin) return true
    return departmentRoles.some(d => (LEVEL_RANK[d.level] ?? -1) >= (LEVEL_RANK[minLevel] ?? 0))
  }

  const accessibleModules = orgModules.filter(key => hasModule(key))

  // Pre-computed booleans — NOT functions — so JSX conditions like {isOrgAdmin && ...} work correctly
  const isOrgAdmin   = ['org_admin','ceo','super_admin'].includes(profile?.role) || superAdmin
  const isSuperAdmin = superAdmin
  const isCEO        = profile?.role === 'ceo'

  const isPlatformAdmin = ['org_admin', 'super_admin'].includes(profile?.role) || superAdmin
    || (profile?.role === 'ceo' && !!profile?.is_platform_admin)
  const tierFor = (moduleKey) =>
    tierForProfile({ role: profile?.role, isSuperAdmin: superAdmin, departmentRoles }, moduleKey)

  // Emergency Edit — start_emergency_edit() logs it and alerts the Org Admins
  const startEmergencyEdit = async (reason) => {
    const { data, error } = await supabase.rpc('start_emergency_edit', { p_reason: reason })
    if (error) throw error
    setEmergencyUntil(data)
    return data
  }
  const endEmergencyEdit = async () => {
    await supabase.rpc('end_emergency_edit')
    setEmergencyUntil(null)
  }

  const signOut = async () => {
    try {
      await supabase.rpc('log_audit_event', {
        p_action: 'LOGOUT',
        p_notes:  'User initiated sign-out'
      })
    } catch (_) { /* non-blocking */ }
    // Otherwise a super admin who signs out mid-impersonation (instead of using
    // "Exit to Super Admin") would silently land back in that org on next login.
    localStorage.removeItem('elderloop_super_admin_org')
    await supabase.auth.signOut()
  }

  const refreshModules = async () => {
    const orgId = organization?.id || profile?.organization_id
    if (!orgId) return
    const { data } = await supabase.from('organization_modules')
      .select('module_key, is_enabled')
      .eq('organization_id', orgId)
    setOrgModules(data?.filter(m => m.is_enabled !== false).map(m => m.module_key) || [])
  }

  const refreshProfile = async () => {
    if (!user?.id) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) setProfile(data)
  }

  const refreshDepartmentRoles = async () => {
    if (!user?.id) return
    const { data } = await supabase.from('staff_department_roles').select('department, level')
      .eq('profile_id', user.id)
    setDepartmentRoles(data || [])
  }

  const refreshOrganization = async () => {
    const orgId = organization?.id || profile?.organization_id
    if (!orgId) return
    const { data } = await supabase.from('organizations').select('*').eq('id', orgId).single()
    if (data) setOrg(data)
  }

  // ── Super Admin Org Impersonation ─────────────────────────────
  // Lets a super_admin "jump into" another org's Admin Panel / Dashboard
  // without actually belonging to it. Stashed in localStorage so it
  // survives a refresh; exitImpersonation() clears it and returns
  // to the super admin's own (org-less) view.
  const impersonateOrg = async (orgId) => {
    localStorage.setItem('elderloop_super_admin_org', orgId)
    const [orgRes, modsRes] = await Promise.all([
      supabase.from('organizations').select('*').eq('id', orgId).single(),
      supabase.from('organization_modules').select('module_key, is_enabled')
        .eq('organization_id', orgId),
    ])
    setOrg(orgRes.data)
    setOrgModules(modsRes.data?.filter(m => m.is_enabled !== false).map(m => m.module_key) || [])
    setImpersonating(true)
  }

  const exitImpersonation = () => {
    localStorage.removeItem('elderloop_super_admin_org')
    setImpersonating(false)
    setOrg(null)
    setOrgModules([])
    navigate('/superadmin')
  }

  return (
      <AuthContext.Provider value={{
      user, profile, organization, orgModules, userPerms,
      loading, suspended, hasModule, canEdit, accessibleModules,
      isOrgAdmin, isSuperAdmin, isCEO, signOut, refreshModules, refreshProfile, refreshOrganization,
      impersonating, impersonateOrg, exitImpersonation,
      departmentRoles, hasDepartmentAccess, hasAnyDepartmentLevel, refreshDepartmentRoles,
      accessModel, isPlatformAdmin, tierFor,
      nhaViewOnly, canManagePlatform, emergencyEditOn, emergencyUntil, startEmergencyEdit, endEmergencyEdit,
    }}>
      {children}

      {/* HIPAA session timeout warning modal */}
      {showWarning && (
        <SessionTimeoutModal
          timeLeft={timeLeft}
          onExtend={extendSession}
          onLogout={doLogout}
        />
      )}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
