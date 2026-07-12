import { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSessionTimeout } from '../hooks/useSessionTimeout'
import SessionTimeoutModal from '../components/SessionTimeoutModal'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null)
  const [profile, setProfile]         = useState(null)
  const [organization, setOrg]        = useState(null)
  const [orgModules, setOrgModules]   = useState([])
  const [userPerms, setUserPerms]     = useState([])
  const [superAdmin, setSuperAdmin]   = useState(false)
   const [loading, setLoading]         = useState(true)
  const [suspended, setSuspended]     = useState(false)
  const navigate                      = useNavigate()

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
        setUserPerms([]); setSuperAdmin(false); setLoading(false)
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

      if (prof?.organization_id) {
        const [orgRes, modsRes, permsRes] = await Promise.all([
          supabase.from('organizations').select('*').eq('id', prof.organization_id).single(),
          supabase.from('organization_modules').select('module_key, is_enabled')
            .eq('organization_id', prof.organization_id),
          supabase.from('user_module_permissions').select('module_key, access_level')
            .eq('user_id', userId),
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

  // canEdit(key, defaultRoles?) — explicit user_module_permissions always wins.
  // If no explicit permission row exists for this module, defaultRoles (if provided)
  // grants edit access to those roles by default — e.g. nursing staff can edit
  // Nursing Notes out of the box without an admin having to configure anything,
  // but an admin can still override (grant edit to other roles, or downgrade
  // nursing staff to view-only) via the Admin Panel.
  const canEdit = (key, defaultRoles = []) => {
    if (['org_admin','ceo','super_admin'].includes(profile?.role) || superAdmin) return true
    const perm = userPerms.find(p => p.module_key === key)
    if (perm) return perm.access_level === 'edit'
    return defaultRoles.includes(profile?.role)
  }

  const accessibleModules = orgModules.filter(key => hasModule(key))

  // Pre-computed booleans — NOT functions — so JSX conditions like {isOrgAdmin && ...} work correctly
  const isOrgAdmin   = ['org_admin','ceo','super_admin'].includes(profile?.role) || superAdmin
  const isSuperAdmin = superAdmin
  const isCEO        = profile?.role === 'ceo'

  const signOut = async () => {
    try {
      await supabase.rpc('log_audit_event', {
        p_action: 'LOGOUT',
        p_notes:  'User initiated sign-out'
      })
    } catch (_) { /* non-blocking */ }
    await supabase.auth.signOut()
  }

  const refreshModules = async () => {
    if (!profile?.organization_id) return
    const { data } = await supabase.from('organization_modules')
      .select('module_key, is_enabled')
      .eq('organization_id', profile.organization_id)
    setOrgModules(data?.filter(m => m.is_enabled !== false).map(m => m.module_key) || [])
  }

  const refreshProfile = async () => {
    if (!user?.id) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) setProfile(data)
  }

  return (
      <AuthContext.Provider value={{
      user, profile, organization, orgModules, userPerms,
      loading, suspended, hasModule, canEdit, accessibleModules,
      isOrgAdmin, isSuperAdmin, isCEO, signOut, refreshModules, refreshProfile
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
