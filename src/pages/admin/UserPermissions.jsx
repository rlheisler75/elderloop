import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Shield, Check, X, Eye, Edit2, ChevronDown,
  ChevronUp, Users, Search, Info
} from 'lucide-react'

const MODULE_LABELS = {
  communication:  'Communication',
  chapel:         'Chapel',
  activities:     'Activities',
  directory:      'Resident Directory',
  work_orders:    'Maintenance',
  dietary:        'Dietary',
  housekeeping:   'Housekeeping',
  transportation: 'Transportation',
  meters:         'Meter Readings',
  security:       'Security',
  incidents:      'Incident Reports',
}

const ROLE_LABELS = {
  staff:       { label: 'Staff',       color: 'bg-slate-100 text-slate-600' },
  supervisor:  { label: 'Supervisor',  color: 'bg-blue-100 text-blue-700' },
  manager:     { label: 'Manager',     color: 'bg-indigo-100 text-indigo-700' },
  org_admin:   { label: 'Org Admin',   color: 'bg-brand-100 text-brand-700' },
  ceo:         { label: 'CEO',         color: 'bg-purple-100 text-purple-700' },
  maintenance: { label: 'Maintenance', color: 'bg-amber-100 text-amber-700' },
  dietary:     { label: 'Dietary',     color: 'bg-green-100 text-green-700' },
  housekeeping:{ label: 'Housekeeping',color: 'bg-teal-100 text-teal-700' },
  nursing:     { label: 'Nursing',     color: 'bg-rose-100 text-rose-700' },
  resident:    { label: 'Resident',    color: 'bg-slate-100 text-slate-500' },
  family:      { label: 'Family',      color: 'bg-slate-100 text-slate-500' },
  super_admin: { label: 'Super Admin', color: 'bg-purple-100 text-purple-800' },
}

function RoleBadge({ role }) {
  const r = ROLE_LABELS[role] || { label: role, color: 'bg-slate-100 text-slate-600' }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.color}`}>{r.label}</span>
}

// Single user permission row
function UserPermRow({ user, orgModules, permissions, onPermChange }) {
  const [expanded, setExpanded] = useState(false)
  const [localPerms, setLocalPerms] = useState(permissions)
  const [saving, setSaving] = useState(null) // moduleKey being saved
  const isAdmin = ['org_admin','ceo','super_admin'].includes(user.role)

  // Sync if parent permissions change (initial load)
  useEffect(() => { setLocalPerms(permissions) }, [permissions])

  const getPerm = (key) => localPerms.find(p => p.module_key === key)

  const handleToggle = async (moduleKey, currentPerm) => {
    if (isAdmin || saving === moduleKey) return

    // Optimistic update — change UI immediately
    const nextLevel = !currentPerm ? 'edit' : currentPerm.access_level === 'edit' ? 'view' : null

    if (nextLevel) {
      setLocalPerms(prev => {
        const without = prev.filter(p => p.module_key !== moduleKey)
        return [...without, { module_key: moduleKey, access_level: nextLevel }]
      })
    } else {
      setLocalPerms(prev => prev.filter(p => p.module_key !== moduleKey))
    }

    setSaving(moduleKey)
    try {
      if (!currentPerm) {
        await supabase.from('user_module_permissions').upsert({
          organization_id: user.organization_id,
          user_id:         user.id,
          module_key:      moduleKey,
          access_level:    'edit',
        }, { onConflict: 'user_id,module_key' })
      } else if (currentPerm.access_level === 'edit') {
        await supabase.from('user_module_permissions').update({ access_level: 'view' })
          .eq('user_id', user.id).eq('module_key', moduleKey)
      } else {
        await supabase.from('user_module_permissions')
          .delete().eq('user_id', user.id).eq('module_key', moduleKey)
      }
      // Notify parent to silently refresh counts (no setLoading)
      onPermChange()
    } catch (e) {
      // Revert optimistic update on error
      setLocalPerms(permissions)
    }
    setSaving(null)
  }

  const permCount = isAdmin ? orgModules.length : localPerms.length

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      {/* Header row */}
      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors text-left">
        <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-sm font-bold flex-shrink-0">
          {user.first_name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-800 text-sm">{user.first_name} {user.last_name}</span>
            <RoleBadge role={user.role} />
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{user.email}</div>
        </div>
        <div className="text-xs text-slate-400 flex-shrink-0">
          {isAdmin ? 'Full access (all modules)' : `${permCount} module${permCount !== 1 ? 's' : ''}`}
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
      </button>

      {/* Module grid */}
      {expanded && (
        <div className="border-t border-slate-100 p-4 bg-slate-50">
          {isAdmin ? (
            <div className="flex items-center gap-2 text-xs text-brand-600 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
              <Shield size={13} />
              {user.role === 'ceo' ? 'CEO' : 'Org Admin'} — automatically has full access to all modules
            </div>
          ) : (
            <>
              <div className="text-xs text-slate-500 mb-3 flex items-center gap-1.5">
                <Info size={12} />
                Click to cycle: No Access → <span className="font-medium text-brand-600">Edit</span> → <span className="font-medium text-amber-600">View Only</span> → No Access
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {orgModules.map(moduleKey => {
                  const perm = getPerm(moduleKey)
                  const level = perm?.access_level || null
                  const isSavingThis = saving === moduleKey
                  return (
                    <button key={moduleKey} onClick={() => handleToggle(moduleKey, perm)}
                      disabled={!!saving}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left ${
                        level === 'edit' ? 'bg-brand-50 border-brand-300 text-brand-700' :
                        level === 'view' ? 'bg-amber-50 border-amber-300 text-amber-700' :
                        'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                      } ${isSavingThis ? 'opacity-60' : ''}`}>
                      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                        level === 'edit' ? 'bg-brand-500' :
                        level === 'view' ? 'bg-amber-400' :
                        'bg-slate-200'}`}>
                        {isSavingThis
                          ? <div className="w-2 h-2 border border-current rounded-full animate-spin opacity-70" />
                          : level === 'edit' ? <Edit2 size={9} className="text-white" />
                          : level === 'view' ? <Eye size={9} className="text-white" />
                          : <X size={9} className="text-slate-400" />
                        }
                      </div>
                      <span className="truncate">{MODULE_LABELS[moduleKey] || moduleKey}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function UserPermissions({ orgId, orgModules }) {
  const [users, setUsers]   = useState([])
  const [perms, setPerms]   = useState({}) // userId -> [{module_key, access_level}]
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { if (orgId) fetchAll() }, [orgId])

  async function fetchAll() {
    setLoading(true)
    const [usersRes, permsRes] = await Promise.all([
      supabase.from('profiles').select('id,first_name,last_name,role,organization_id')
        .eq('organization_id', orgId)
        .not('role', 'in', '(resident,family,super_admin)')
        .order('last_name'),
      supabase.from('user_module_permissions').select('user_id,module_key,access_level')
        .eq('organization_id', orgId),
    ])

    const profileList = usersRes.data || []
    const permList = permsRes.data || []

    const permsMap = {}
    permList.forEach(p => {
      if (!permsMap[p.user_id]) permsMap[p.user_id] = []
      permsMap[p.user_id].push({ module_key: p.module_key, access_level: p.access_level })
    })

    setUsers(profileList)
    setPerms(permsMap)
    setLoading(false)
  }

  // Silent refresh — doesn't reset loading, so panels stay open
  async function silentRefresh() {
    const { data } = await supabase.from('user_module_permissions')
      .select('user_id,module_key,access_level').eq('organization_id', orgId)
    const permsMap = {}
    data?.forEach(p => {
      if (!permsMap[p.user_id]) permsMap[p.user_id] = []
      permsMap[p.user_id].push({ module_key: p.module_key, access_level: p.access_level })
    })
    setPerms(permsMap)
  }

  const filtered = users.filter(u =>
    !search || `${u.first_name} ${u.last_name} ${u.role}`.toLowerCase().includes(search.toLowerCase())
  )

  const enabledModules = orgModules || []

  return (
    <div>
      <div className="mb-5">
        <h3 className="font-display font-semibold text-slate-800">Module Access by User</h3>
        <p className="text-slate-400 text-xs mt-0.5">
          Control which modules each staff member can access. Click any user to expand and adjust their permissions.
          Org Admins and CEOs always have full access.
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
        <span className="text-slate-500 font-medium">Access levels:</span>
        <div className="flex items-center gap-1.5 text-brand-600">
          <div className="w-5 h-5 rounded bg-brand-500 flex items-center justify-center"><Edit2 size={9} className="text-white" /></div>
          Edit — can create, edit, delete
        </div>
        <div className="flex items-center gap-1.5 text-amber-600">
          <div className="w-5 h-5 rounded bg-amber-400 flex items-center justify-center"><Eye size={9} className="text-white" /></div>
          View — read only
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <div className="w-5 h-5 rounded bg-slate-200 flex items-center justify-center"><X size={9} className="text-slate-400" /></div>
          No access
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search staff members..."
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400 text-sm">Loading...</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(user => (
            <UserPermRow
              key={user.id}
              user={user}
              orgModules={enabledModules}
              permissions={perms[user.id] || []}
              onPermChange={silentRefresh} />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">No staff members found.</div>
          )}
        </div>
      )}
    </div>
  )
}
