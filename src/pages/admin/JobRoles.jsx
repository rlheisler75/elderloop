import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Search, Check, X, Users, Trash2, Info, Loader2, Copy } from 'lucide-react'
import { ACTIONS, PERMISSION_MODULES } from '../../lib/permissions'

// Job Roles (20261023_job_roles_foundation.sql): per-community bundles of module x
// action permissions. A person can hold several; department & level hand out the
// matching Department role automatically. Writes need can_manage_access() (RLS).

const SOURCE_GROUPS = [
  { key: 'everyone',      label: 'Everyone' },
  { key: 'administrator', label: 'Administrator' },
  { key: 'custom',        label: 'Custom roles' },
  { key: 'department',    label: 'Department roles' },
  { key: 'template',      label: 'Carried over from Role Templates' },
]
const SOURCE_NOTE = {
  everyone: 'Every staff login has this role.',
  administrator: 'Given to the Administrator (NHA). Org Admins can always do everything.',
  department: 'Given automatically to everyone at this department & level (Admin Panel → Users → edit).',
  template: 'Carried over from the old Role Templates. Given automatically by account role.',
  custom: 'Assign it to people below or from their Edit User screen.',
}

const inputCls = 'w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

function NewRoleModal({ roles, initialCopy = '', onClose, onCreate }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [copyFrom, setCopyFrom] = useState(initialCopy)
  const [saving, setSaving] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100">New Job Role</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Transportation Coordinator" className={inputCls} /></div>
          <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} className={inputCls} /></div>
          <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Start from (optional)</label>
            <select value={copyFrom} onChange={e => setCopyFrom(e.target.value)} className={inputCls}>
              <option value="">Nothing: an empty role</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select></div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500">Cancel</button>
          <button disabled={!name.trim() || saving} onClick={async () => { setSaving(true); await onCreate(name.trim(), description.trim(), copyFrom); setSaving(false) }}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl">Create</button>
        </div>
      </div>
    </div>
  )
}

export default function JobRoles({ orgId, orgModules }) {
  const [roles, setRoles] = useState([])
  const [perms, setPerms] = useState([])      // { job_role_id, module_key, action }
  const [members, setMembers] = useState([])  // { job_role_id, profile_id, auto }
  const [people, setPeople] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [addPerson, setAddPerson] = useState('')

  const load = useCallback(async () => {
    const [r, p, m, pe] = await Promise.all([
      supabase.from('job_roles').select('*').eq('organization_id', orgId).order('name'),
      supabase.from('job_role_permissions').select('job_role_id, module_key, action'),
      supabase.from('user_job_roles').select('job_role_id, profile_id, auto').eq('organization_id', orgId),
      supabase.from('profiles').select('id, first_name, last_name, role, is_active').eq('organization_id', orgId)
        .eq('is_active', true).not('role', 'in', '(family,resident)').order('last_name'),
    ])
    if (r.error) setError(r.error.message)
    setRoles(r.data || []); setPerms(p.data || []); setMembers(m.data || []); setPeople(pe.data || [])
    setSelectedId(id => id || r.data?.find(x => x.source === 'everyone')?.id || r.data?.[0]?.id || null)
  }, [orgId])
  useEffect(() => { if (orgId) load() }, [orgId, load])

  const selected = roles.find(r => r.id === selectedId)
  const has = (moduleKey, action) => perms.some(p => p.job_role_id === selectedId && p.module_key === moduleKey && p.action === action)
  const modules = PERMISSION_MODULES.filter(m => !orgModules?.length || orgModules.includes(m.key))
  const personName = (id) => { const p = people.find(x => x.id === id); return p ? `${p.first_name} ${p.last_name}` : 'Unknown' }

  const toggle = async (moduleKey, action) => {
    if (busy) return
    const on = has(moduleKey, action)
    const cell = `${moduleKey}|${action}`
    setBusy(cell); setError('')
    const { error: err } = on
      ? await supabase.from('job_role_permissions').delete().eq('job_role_id', selectedId).eq('module_key', moduleKey).eq('action', action)
      : await supabase.from('job_role_permissions').insert({ job_role_id: selectedId, module_key: moduleKey, action })
    setBusy(null)
    if (err) return setError(err.message)
    setPerms(ps => on ? ps.filter(p => !(p.job_role_id === selectedId && p.module_key === moduleKey && p.action === action))
                      : [...ps, { job_role_id: selectedId, module_key: moduleKey, action }])
  }

  const createRole = async (name, description, copyFrom) => {
    setError('')
    const { data, error: err } = await supabase.from('job_roles')
      .insert({ organization_id: orgId, name, description: description || null, source: 'custom' }).select().single()
    if (err) return setError(err.message.includes('duplicate') ? 'A Job Role with that name already exists.' : err.message)
    if (copyFrom) {
      const rows = perms.filter(p => p.job_role_id === copyFrom).map(p => ({ job_role_id: data.id, module_key: p.module_key, action: p.action }))
      if (rows.length) await supabase.from('job_role_permissions').insert(rows)
    }
    setShowNew(false); setSelectedId(data.id); load()
  }

  const saveDetails = async (patch) => {
    const { error: err } = await supabase.from('job_roles').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', selectedId)
    if (err) setError(err.message); else setRoles(rs => rs.map(r => r.id === selectedId ? { ...r, ...patch } : r))
  }

  const deleteRole = async () => {
    if (!window.confirm(`Delete the Job Role "${selected.name}"? People who have it lose its permissions.`)) return
    const { error: err } = await supabase.from('job_roles').delete().eq('id', selectedId)
    if (err) return setError(err.message)
    setSelectedId(null); load()
  }

  const assign = async () => {
    if (!addPerson) return
    const { error: err } = await supabase.from('user_job_roles').insert({ profile_id: addPerson, job_role_id: selectedId, organization_id: orgId })
    if (err) return setError(err.message)
    setAddPerson(''); load()
  }
  const unassign = async (profileId) => {
    const { error: err } = await supabase.from('user_job_roles').delete().eq('profile_id', profileId).eq('job_role_id', selectedId)
    if (err) return setError(err.message)
    load()
  }

  const roleMembers = members.filter(m => m.job_role_id === selectedId)
  const filteredRoles = roles.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100">Job Roles</h3>
          <p className="text-slate-400 text-xs mt-0.5 max-w-2xl">
            A Job Role is a set of things someone can do, module by module. A person can have several. Department & level
            give the matching Department role automatically; add any other role to a person here or on their Edit User screen.
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium">
          <Plus size={14} /> New Job Role
        </button>
      </div>

      {error && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] gap-5">
        <div>
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search roles..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {SOURCE_GROUPS.map(g => {
              const list = filteredRoles.filter(r => r.source === g.key)
              if (!list.length) return null
              return (
                <div key={g.key}>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">{g.label}</div>
                  <div className="space-y-1">
                    {list.map(r => {
                      const n = members.filter(m => m.job_role_id === r.id).length
                      return (
                        <button key={r.id} onClick={() => setSelectedId(r.id)}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-sm ${r.id === selectedId ? 'bg-brand-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                          <span className="truncate">{r.name}</span>
                          <span className={`text-xs flex items-center gap-1 ${r.id === selectedId ? 'text-brand-100' : 'text-slate-400'}`}><Users size={11} />{n}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {selected ? (
          <div className="min-w-0">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 mb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-[220px]">
                  {['custom', 'template'].includes(selected.source) ? (
                    <input defaultValue={selected.name} key={`n-${selected.id}`} onBlur={e => e.target.value.trim() && e.target.value !== selected.name && saveDetails({ name: e.target.value.trim() })}
                      className="font-display font-semibold text-lg text-slate-800 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-brand-500 focus:outline-none w-full" />
                  ) : <div className="font-display font-semibold text-lg text-slate-800 dark:text-slate-100">{selected.name}</div>}
                  <input defaultValue={selected.description || ''} key={`d-${selected.id}`} placeholder="Add a description"
                    onBlur={e => e.target.value !== (selected.description || '') && saveDetails({ description: e.target.value || null })}
                    className="text-sm text-slate-500 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-brand-500 focus:outline-none w-full mt-1" />
                  <p className="text-xs text-slate-400 mt-2 flex items-center gap-1"><Info size={12} /> {SOURCE_NOTE[selected.source]}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowNew(selectedId)} title="Make a copy" className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-300"><Copy size={12} /> Copy</button>
                  {['custom', 'template'].includes(selected.source) && (
                    <button onClick={deleteRole} className="flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs"><Trash2 size={12} /> Delete</button>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-x-auto mb-4">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="text-left px-4 py-3 font-semibold">Module</th>
                    {ACTIONS.map(a => <th key={a.key} className="px-2 py-3 font-semibold text-center">{a.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {modules.map(m => (
                    <tr key={m.key} className="border-b border-slate-50 dark:border-slate-800">
                      <td className="px-4 py-2 text-slate-700 dark:text-slate-200 whitespace-nowrap">{m.label}</td>
                      {ACTIONS.map(a => {
                        const applies = !!m.actions[a.key]
                        const on = has(m.key, a.key)
                        const cell = `${m.key}|${a.key}`
                        return (
                          <td key={a.key} className="px-2 py-2 text-center">
                            {applies ? (
                              <button onClick={() => toggle(m.key, a.key)} title={m.actions[a.key]}
                                className={`w-7 h-7 rounded-lg border inline-flex items-center justify-center transition-colors ${on ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-200 dark:border-slate-700 hover:border-brand-400 text-transparent'}`}>
                                {busy === cell ? <Loader2 size={12} className="animate-spin text-slate-400" /> : <Check size={13} />}
                              </button>
                            ) : <span className="text-slate-200 dark:text-slate-700">·</span>}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-slate-400 px-4 py-3">Hover a box to see what it allows in that module. View is separate: someone with Create only (for example, filing a work order) sees just their own submissions.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">People with this role ({roleMembers.length})</h4>
                {!['everyone', 'department'].includes(selected.source) && (
                  <div className="flex gap-2">
                    <select value={addPerson} onChange={e => setAddPerson(e.target.value)} className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-sm">
                      <option value="">Add a person...</option>
                      {people.filter(p => !roleMembers.some(m => m.profile_id === p.id)).map(p => <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}</option>)}
                    </select>
                    <button onClick={assign} disabled={!addPerson} className="px-3 py-1.5 bg-brand-600 disabled:opacity-50 text-white rounded-lg text-sm">Add</button>
                  </div>
                )}
              </div>
              {roleMembers.length === 0 ? <p className="text-sm text-slate-400">Nobody yet.</p> : (
                <div className="flex flex-wrap gap-2">
                  {roleMembers.map(m => (
                    <span key={m.profile_id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300">
                      {personName(m.profile_id)}
                      {m.auto ? <span className="text-slate-400">· automatic</span>
                        : <button onClick={() => unassign(m.profile_id)} className="text-slate-400 hover:text-red-500"><X size={11} /></button>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : <div className="text-sm text-slate-400">Choose a Job Role.</div>}
      </div>

      {showNew && <NewRoleModal roles={roles} initialCopy={typeof showNew === 'string' ? showNew : ''} onClose={() => setShowNew(false)} onCreate={createRole} />}
    </div>
  )
}
