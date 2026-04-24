// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// ── Provide stub functions as defaults so destructured values are ALWAYS
//    callable even before the Provider mounts or during initial render.
//    This is what prevents "i is not a function" in minified builds.
const defaultContext = {
  user:             null,
  profile:          null,
  organization:     null,
  orgModules:       [],
  userPerms:        [],
  loading:          true,
  accessibleModules:[],
  hasModule:        () => false,
  canEdit:          () => false,
  isOrgAdmin:       () => false,
  isSuperAdmin:     () => false,
  isCEO:            () => false,
  signOut:          () => {},
  refreshModules:   () => Promise.resolve(),
}

const AuthContext = createContext(defaultContext)

export function AuthProvider({ children }) {
  const [user, setUser]             = useState(null)
  const [profile, setProfile]       = useState(null)
  const [organization, setOrg]      = useState(null)
  const [orgModules, setOrgModules] = useState([])
  const [userPerms, setUserPerms]   = useState([])
  const [superAdmin, setSuperAdmin] = useState(false)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setOrg(null)
        setOrgModules([])
        setUserPerms([])
        setSuperAdmin(false)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    setLoading(true)
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      setProfile(prof)

      // Check super_admin — use maybeSingle to avoid throwing on no-row
      const { data: sa } = await supabase
        .from('super_admins')
        .select('id')
        .eq('id', userId)
        .maybeSingle()

      setSuperAdmin(!!sa)

      if (prof?.organization_id) {
        const [orgRes, modsRes, permsRes] = await Promise.all([
          supabase.from('organizations')
            .select('*')
            .eq('id', prof.organization_id)
            .single(),
          supabase.from('organization_modules')
            .select('module_key, is_enabled')
            .eq('organization_id', prof.organization_id),
          supabase.from('user_module_permissions')
            .select('module_key, access_level')
            .eq('user_id', userId),
        ])

        setOrg(orgRes.data)
        setOrgModules(
          modsRes.data?.filter(m => m.is_enabled !== false).map(m => m.module_key) || []
        )
        setUserPerms(permsRes.data || [])
      }
    } catch (e) {
      console.error('Profile fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  // ── Always returns a boolean, never throws ──────────────────
  const hasModule = (key) => {
    if (!orgModules.includes(key)) return false
    if (['org_admin', 'ceo', 'super_admin'].includes(profile?.role) || superAdmin) return true
    return userPerms.some(p => p.module_key === key)
  }

  const canEdit = (key) => {
    if (['org_admin', 'ceo', 'super_admin'].includes(profile?.role) || superAdmin) return true
    return userPerms.some(p => p.module_key === key && p.access_level === 'edit')
  }

  const accessibleModules = orgModules.filter(key => hasModule(key))

  // ── These are always functions — never reassigned to a boolean ──
  const isOrgAdmin   = () => ['org_admin', 'ceo', 'super_admin'].includes(profile?.role) || superAdmin
  const isSuperAdmin = () => superAdmin
  const isCEO        = () => profile?.role === 'ceo'

  const signOut = () => supabase.auth.signOut()

  const refreshModules = async () => {
    if (!profile?.organization_id) return
    const { data } = await supabase
      .from('organization_modules')
      .select('module_key, is_enabled')
      .eq('organization_id', profile.organization_id)
    setOrgModules(
      data?.filter(m => m.is_enabled !== false).map(m => m.module_key) || []
    )
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      organization,
      orgModules,
      userPerms,
      loading,
      hasModule,
      canEdit,
      accessibleModules,
      isOrgAdmin,
      isSuperAdmin,
      isCEO,
      signOut,
      refreshModules,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
