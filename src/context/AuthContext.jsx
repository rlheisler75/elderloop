import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]             = useState(null)
  const [profile, setProfile]       = useState(null)
  const [organization, setOrg]      = useState(null)
  const [modules, setModules]       = useState([])
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
      if (session?.user) fetchProfile(session.user.id)
      else {
        setProfile(null); setOrg(null); setModules([]); setSuperAdmin(false); setLoading(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    setLoading(true)
    try {
      // Fetch profile
      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', userId).single()

      setProfile(prof)

      // Check super_admins table
      const { data: sa } = await supabase
        .from('super_admins').select('id').eq('id', userId).single()
      setSuperAdmin(!!sa)

      if (prof?.organization_id) {
        // Fetch org
        const { data: org } = await supabase
          .from('organizations').select('*').eq('id', prof.organization_id).single()
        setOrg(org)

        // Fetch enabled modules
        const { data: mods } = await supabase
          .from('organization_modules').select('module_key, is_enabled')
          .eq('organization_id', prof.organization_id)
        setModules(mods?.filter(m => m.is_enabled !== false).map(m => m.module_key) || [])
      }
    } catch (e) {
      console.error('Profile fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  const hasModule  = (key) => modules.includes(key)
  const isOrgAdmin = () => ['org_admin','super_admin'].includes(profile?.role) || superAdmin
  const isSuperAdmin = () => superAdmin

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{
      user, profile, organization, modules,
      loading, hasModule, isOrgAdmin, isSuperAdmin, signOut
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
