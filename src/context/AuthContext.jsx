import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null)
  const [profile, setProfile]         = useState(null)
  const [organization, setOrg]        = useState(null)
  const [orgModules, setOrgModules]   = useState([])   // modules enabled for org
  const [userPerms, setUserPerms]     = useState([])   // {module_key, access_level}
  const [superAdmin, setSuperAdmin]   = useState(false)
  const [loading, setLoading]         = useState(true)

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

  // Is this module enabled for the org AND does the user have access?
  const hasModule = (key) => {
    if (!orgModules.includes(key)) return false
    // org_admin, ceo, super_admin always have full access
    if (['org_admin','ceo','super_admin'].includes(profile?.role) || superAdmin) return true
    return userPerms.some(p => p.module_key === key)
  }

  // Does the user have edit access to this module?
  const canEdit = (key) => {
    if (['org_admin','ceo','super_admin'].includes(profile?.role) || superAdmin) return true
    return userPerms.some(p => p.module_key === key && p.access_level === 'edit')
  }

  // All modules the user has access to (for sidebar)
  const accessibleModules = orgModules.filter(key => hasModule(key))

  const isOrgAdmin  = () => ['org_admin','ceo','super_admin'].includes(profile?.role) || superAdmin
  const isSuperAdmin = () => superAdmin
  const isCEO       = () => profile?.role === 'ceo'

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{
      user, profile, organization, orgModules, userPerms,
      loading, hasModule, canEdit, accessibleModules,
      isOrgAdmin, isSuperAdmin, isCEO, signOut
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
