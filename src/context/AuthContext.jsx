import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null)
  const [profile, setProfile]         = useState(null)
  const [organization, setOrg]        = useState(null)
  const [modules, setModules]         = useState([])   // org-enabled modules
  const [roleModules, setRoleModules] = useState(null) // role-visible modules (null = not loaded yet)
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
        setProfile(null); setOrg(null); setModules([]); setRoleModules(null)
        setSuperAdmin(false); setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    try {
      setLoading(true)

      // Check super admin
      const { data: sa } = await supabase.from('super_admins').select('id').eq('id', userId).maybeSingle()
      setSuperAdmin(!!sa)

      // Fetch profile
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', userId).single()
      setProfile(prof)

      if (prof?.organization_id) {
        // Fetch org
        const { data: org } = await supabase.from('organizations').select('*').eq('id', prof.organization_id).single()
        setOrg(org)

        // Fetch org-enabled modules
        const { data: mods } = await supabase
          .from('organization_modules').select('module_key')
          .eq('organization_id', prof.organization_id)
          .eq('is_enabled', true)
        setModules(mods?.map(m => m.module_key) || [])

        // Fetch role-specific visible modules (if table exists for this role)
        if (prof.role && !['super_admin', 'org_admin', 'ceo'].includes(prof.role)) {
          const { data: rmv } = await supabase
            .from('role_module_visibility')
            .select('module_key')
            .eq('organization_id', prof.organization_id)
            .eq('role', prof.role)
          setRoleModules(rmv?.map(m => m.module_key) || null)
        } else {
          setRoleModules(null) // ceo/admin/super_admin see all enabled modules
        }
      }
    } catch (e) {
      console.error('Profile fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  // Returns true if the module is enabled for the org AND visible for this role
  const hasModule = (key) => {
    if (!modules.includes(key)) return false          // org doesn't have it at all
    if (superAdmin) return true                        // super admin sees everything
    if (roleModules === null) return true              // ceo/org_admin/no restrictions
    return roleModules.includes(key)                  // role-restricted
  }

  const isOrgAdmin  = () => ['org_admin', 'super_admin'].includes(profile?.role) || superAdmin
  const isSuperAdmin = () => superAdmin
  const isCEO       = () => profile?.role === 'ceo'
  const signOut     = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{
      user, profile, organization, modules, loading,
      hasModule, isOrgAdmin, isSuperAdmin, isCEO, signOut
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
