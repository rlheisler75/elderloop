import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

// Plan limits — mirrors the plan_limits table, kept in sync here
// for fast client-side checks without extra DB round trips
const PLAN_LIMITS = {
  pilot: {
    residentCap: null,
    modules: [
      'communication','activities','chapel','directory','work_orders',
      'dietary','housekeeping','family','surveys','nursing','incidents',
      'staff','scheduling','timeclock','transportation','meters',
      'security','it','marketing','property_management'
    ],
  },
  starter: {
    residentCap: 75,
    modules: [
      'communication','activities','chapel','directory',
      'work_orders','dietary','housekeeping','family','surveys'
    ],
  },
  community: {
    residentCap: null,
    modules: [
      'communication','activities','chapel','directory','work_orders',
      'dietary','housekeeping','family','surveys','nursing','incidents',
      'staff','scheduling','timeclock','transportation','meters',
      'security','it','marketing','property_management'
    ],
  },
  enterprise: {
    residentCap: null,
    modules: [
      'communication','activities','chapel','directory','work_orders',
      'dietary','housekeeping','family','surveys','nursing','incidents',
      'staff','scheduling','timeclock','transportation','meters',
      'security','it','marketing','property_management'
    ],
  },
}

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null)
  const [profile, setProfile]         = useState(null)
  const [organization, setOrg]        = useState(null)
  const [modules, setModules]         = useState([])
  const [roleModules, setRoleModules] = useState(null)
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
        setProfile(null); setOrg(null); setModules([])
        setRoleModules(null); setSuperAdmin(false); setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    try {
      setLoading(true)

      const { data: sa } = await supabase
        .from('super_admins').select('id').eq('id', userId).maybeSingle()
      setSuperAdmin(!!sa)

      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', userId).single()
      setProfile(prof)

      if (prof?.organization_id) {
        const { data: org } = await supabase
          .from('organizations').select('*').eq('id', prof.organization_id).single()
        setOrg(org)

        // Get org-enabled modules intersected with plan limits
        const { data: mods } = await supabase
          .from('organization_modules').select('module_key')
          .eq('organization_id', prof.organization_id)
          .eq('is_enabled', true)
        const orgMods = mods?.map(m => m.module_key) || []

        // Apply plan limits — filter org modules to only what the plan allows
        const plan = org?.plan || 'starter'
        const planAllowed = PLAN_LIMITS[plan]?.modules || PLAN_LIMITS.starter.modules
        const effectiveMods = sa
          ? orgMods  // super admin bypasses plan limits
          : orgMods.filter(m => planAllowed.includes(m))

        setModules(effectiveMods)

        // Role-specific visibility
        if (prof.role && !['super_admin', 'org_admin', 'ceo'].includes(prof.role)) {
          const { data: rmv } = await supabase
            .from('role_module_visibility').select('module_key')
            .eq('organization_id', prof.organization_id)
            .eq('role', prof.role)
          setRoleModules(rmv?.map(m => m.module_key) || null)
        } else {
          setRoleModules(null)
        }
      }
    } catch (e) {
      console.error('Profile fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  // Returns true if module is enabled, plan allows it, and role can see it
  const hasModule = (key) => {
    if (!modules.includes(key)) return false
    if (superAdmin) return true
    if (roleModules === null) return true
    return roleModules.includes(key)
  }

  // Returns whether the org's plan allows a module (ignores role)
  const planAllowsModule = (key) => {
    if (superAdmin) return true
    const plan = organization?.plan || 'starter'
    return (PLAN_LIMITS[plan]?.modules || []).includes(key)
  }

  // Returns the resident cap for the current plan (null = unlimited)
  const residentCap = () => {
    if (superAdmin) return null
    const plan = organization?.plan || 'starter'
    return PLAN_LIMITS[plan]?.residentCap ?? null
  }

  // Returns the current plan's limit config
  const planLimits = () => {
    const plan = organization?.plan || 'starter'
    return PLAN_LIMITS[plan] || PLAN_LIMITS.starter
  }

  const isOrgAdmin   = () => ['org_admin', 'super_admin'].includes(profile?.role) || superAdmin
  const isSuperAdmin = () => superAdmin
  const isCEO        = () => profile?.role === 'ceo'
  const signOut      = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{
      user, profile, organization, modules, loading,
      hasModule, planAllowsModule, residentCap, planLimits,
      isOrgAdmin, isSuperAdmin, isCEO, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
