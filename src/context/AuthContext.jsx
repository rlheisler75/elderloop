import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [organization, setOrganization] = useState(null)
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setOrganization(null); setModules([]); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*, organizations(*)')
      .eq('id', userId)
      .single()

    if (profileData) {
      setProfile(profileData)
      setOrganization(profileData.organizations)

      if (profileData.organization_id) {
        const { data: modData } = await supabase
          .from('organization_modules')
          .select('module_key')
          .eq('organization_id', profileData.organization_id)
          .eq('is_enabled', true)
        setModules(modData?.map(m => m.module_key) ?? [])
      }
    }
    setLoading(false)
  }

  const hasModule = (key) => modules.includes(key)
  const isSuperAdmin = () => profile?.role === 'super_admin'
  const isOrgAdmin = () => ['super_admin', 'org_admin'].includes(profile?.role)

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ user, profile, organization, modules, loading, hasModule, isSuperAdmin, isOrgAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
