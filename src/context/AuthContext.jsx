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

  async function fetchProfile(userId) {
    setLoading(true)
    try {
      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', userId).single()
      setProfile(prof)

      const { data: sa } = await supabase
        .from('super_admins').select('id').eq('id', userId).single()
      setSuperAdmin(!!sa)

      if (prof?.organization_id) {
        const [orgRes, modsRes, permsRes] = await Promise.all([
          supabase.from('organizations').select('*').eq('id', prof.organization_id).single(),
          supabase.from('organization_modules').select('module_key, is_enabled')
            .eq('organization_id', prof.organization_id),
          supabase.from('user_module_permissions').select('module_key, access_level')
            .eq('user_id', userId),
        ])
        setOrg(orgRes.data)
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

  const canEdit = (key) => {
    if (['org_admin','ceo','super_admin'].includes(profile?.role) || superAdmin) return true
    return userPerms.some(p => p.module_key === key && p.access_level === 'edit')
  }

  const accessibleModules = orgModules.filter(key => hasModule(key))

  const isOrgAdmin  = () => ['org_admin','ceo','super_admin'].includes(profile?.role) || superAdmin
  const isSuperAdmin = () => superAdmin
  const isCEO       = () => profile?.role === 'ceo'

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

  return (
    <AuthContext.Provider value={{
      user, profile, organization, orgModules, userPerms,
      loading, hasModule, canEdit, accessibleModules,
      isOrgAdmin, isSuperAdmin, isCEO, signOut, refreshModules
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
