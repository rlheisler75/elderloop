import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Layers, Check, X, ChevronDown, ChevronUp, Search, Info
} from 'lucide-react'

const MODULE_LABELS = {
  communication:       'Communication',
  directory:           'Residents',
  nursing:             'Nursing Notes',
  social_services:     'Social Services',
  family:              'Family Messaging',
  incidents:           'Incident Reports',
  surveys:             'Surveys',
  activities:          'Activities',
  chapel:              'Chapel',
  marketing:           'Marketing',
  work_orders:         'Maintenance',
  housekeeping:        'Housekeeping',
  property_management: 'Property Mgmt',
  meters:              'Meter Readings',
  central_supply:      'Central Supply',
  transportation:      'Transportation',
  security:            'Security',
  dietary:             'Dietary',
  staff:               'Staff',
  timeclock:           'Time Clock',
  it:                  'IT & Technology',
}

// Roles editable here — excludes org_admin/ceo/super_admin (already have
// unconditional full access, so a template row would be a silent no-op),
// family/resident (routed to fixed portals before hasModule() is ever
// consulted), and sales_rep (org-less).
const TEMPLATE_ROLES = [
  { key: 'staff',           label: 'Staff' },
  { key: 'supervisor',      label: 'Supervisor' },
  { key: 'manager',         label: 'Manager' },
  { key: 'maintenance',     label: 'Maintenance' },
  { key: 'dietary',         label: 'Dietary' },
  { key: 'housekeeping',    label: 'Housekeeping' },
  { key: 'nursing',         label: 'Nursing' },
  { key: 'social_services', label: 'Social Services' },
]

function RoleRow({ role, orgModules, activeKeys, onToggle, savingKey }) {
  const [expanded, setExpanded] = useState(false)
  const count = orgModules.filter(m => activeKeys.has(`${role.key}|${m}`)).length

  return (
    <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left">
        <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 flex-shrink-0">
          <Layers size={15} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-slate-800 dark:text-slate-100 text-sm">{role.label}</span>
        </div>
        <div className="text-xs text-slate-400 flex-shrink-0">
          {count} module{count !== 1 ? 's' : ''} by default
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {orgModules.map(moduleKey => {
              const cellKey = `${role.key}|${moduleKey}`
              const active = activeKeys.has(cellKey)
              const isSaving = savingKey === cellKey
              return (
                <button key={moduleKey} onClick={() => onToggle(role.key, moduleKey, active)}
                  disabled={!!savingKey}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left ${
                    active ? 'bg-brand-50 border-brand-300 text-brand-700' :
                    'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                  } ${isSaving ? 'opacity-60' : ''}`}>
                  <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                    active ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    {isSaving
                      ? <div className="w-2 h-2 border border-current rounded-full animate-spin opacity-70" />
                      : active ? <Check size={9} className="text-white" /> : <X size={9} className="text-slate-400" />
                    }
                  </div>
                  <span className="truncate">{MODULE_LABELS[moduleKey] || moduleKey}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function RoleTemplates({ orgId, orgModules }) {
  const [rows, setRows] = useState([]) // [{role, module_key}]
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [savingKey, setSavingKey] = useState(null) // "role|module_key" being saved

  useEffect(() => { if (orgId) fetchAll() }, [orgId])

  async function fetchAll() {
    setLoading(true)
    const { data } = await supabase.from('role_module_visibility')
      .select('role, module_key').eq('organization_id', orgId)
    setRows(data || [])
    setLoading(false)
  }

  const activeKeys = new Set(rows.map(r => `${r.role}|${r.module_key}`))

  const handleToggle = async (role, moduleKey, isActive) => {
    const cellKey = `${role}|${moduleKey}`
    if (savingKey) return

    setRows(prev => isActive
      ? prev.filter(r => !(r.role === role && r.module_key === moduleKey))
      : [...prev, { role, module_key: moduleKey }])

    setSavingKey(cellKey)
    try {
      if (isActive) {
        await supabase.from('role_module_visibility').delete()
          .eq('organization_id', orgId).eq('role', role).eq('module_key', moduleKey)
      } else {
        await supabase.from('role_module_visibility').upsert({
          organization_id: orgId, role, module_key: moduleKey,
        }, { onConflict: 'organization_id,role,module_key' })
      }
    } catch (e) {
      fetchAll() // resync from the server on failure
    }
    setSavingKey(null)
  }

  const filtered = TEMPLATE_ROLES.filter(r =>
    !search || r.label.toLowerCase().includes(search.toLowerCase()))

  const enabledModules = orgModules || []

  return (
    <div>
      <div className="mb-5">
        <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100">Role Templates</h3>
        <p className="text-slate-400 text-xs mt-0.5">
          Sets the default modules a brand-new login can see, based on their Role — so staff aren't stuck
          seeing almost nothing until you manually grant access. An explicit grant or revoke for one
          person in Module Access always overrides this default.
        </p>
      </div>

      <div className="flex items-start gap-2 mb-4 p-3 bg-brand-50 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900 rounded-xl text-xs text-brand-700 dark:text-brand-400">
        <Info size={13} className="flex-shrink-0 mt-0.5" />
        Org Admins, CEOs, and Super Admins always have full access and aren't shown here.
        Family and Resident logins use a separate fixed portal, not this module list.
      </div>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search roles..."
          className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400 text-sm">Loading...</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(role => (
            <RoleRow
              key={role.key}
              role={role}
              orgModules={enabledModules}
              activeKeys={activeKeys}
              onToggle={handleToggle}
              savingKey={savingKey} />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">No roles found.</div>
          )}
        </div>
      )}
    </div>
  )
}
