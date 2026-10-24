import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { X, Plus, Check, Minus, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { ACTIONS, PERMISSION_MODULES } from '../../lib/permissions'

// Edit User → Job Roles & effective access. Job Roles give permissions; the grid
// shows the result and lets an admin add or remove one permission for this person
// (user_access_overrides). Department roles come from department & level and are
// changed there, not here.

export default function UserAccessPanel({ user, orgId, orgModules, refreshKey }) {
  const [roles, setRoles] = useState([])
  const [mine, setMine] = useState([])        // { job_role_id, auto }
  const [perms, setPerms] = useState([])      // { job_role_id, module_key, action }
  const [overrides, setOverrides] = useState([])
  const [addRole, setAddRole] = useState('')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [r, m, p, o] = await Promise.all([
      supabase.from('job_roles').select('id, name, source').eq('organization_id', orgId).order('name'),
      supabase.from('user_job_roles').select('job_role_id, auto').eq('profile_id', user.id),
      supabase.from('job_role_permissions').select('job_role_id, module_key, action'),
      supabase.from('user_access_overrides').select('module_key, action, allow').eq('profile_id', user.id),
    ])
    setRoles(r.data || []); setMine(m.data || []); setPerms(p.data || []); setOverrides(o.data || [])
  }, [orgId, user.id])
  useEffect(() => { load() }, [load, refreshKey])

  const myRoleIds = new Set(mine.map(m => m.job_role_id))
  const fromRoles = (mod, act) => roles.filter(r => myRoleIds.has(r.id) && perms.some(p => p.job_role_id === r.id && p.module_key === mod && p.action === act))
  const override = (mod, act) => overrides.find(o => o.module_key === mod && o.action === act)
  const modules = PERMISSION_MODULES.filter(m => !orgModules?.length || orgModules.includes(m.key))
  const isAdmin = ['org_admin', 'super_admin'].includes(user.role)

  const assign = async () => {
    if (!addRole) return
    setError('')
    const { error: err } = await supabase.from('user_job_roles').insert({ profile_id: user.id, job_role_id: addRole, organization_id: orgId })
    if (err) return setError(err.message)
    setAddRole(''); load()
  }
  const unassign = async (roleId) => {
    const { error: err } = await supabase.from('user_job_roles').delete().eq('profile_id', user.id).eq('job_role_id', roleId)
    if (err) return setError(err.message)
    load()
  }

  // Cycle a cell: role default -> opposite (override) -> back to role default
  const cycle = async (mod, act) => {
    if (busy) return
    const cell = `${mod}|${act}`
    const o = override(mod, act)
    setBusy(cell); setError('')
    const { error: err } = o
      ? await supabase.from('user_access_overrides').delete().eq('profile_id', user.id).eq('module_key', mod).eq('action', act)
      : await supabase.from('user_access_overrides').insert({ profile_id: user.id, organization_id: orgId, module_key: mod, action: act, allow: fromRoles(mod, act).length === 0 })
    setBusy(null)
    if (err) return setError(err.message)
    load()
  }

  if (isAdmin) {
    return <p className="text-xs text-slate-400">Org Admins can do everything; Job Roles don't apply.</p>
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Job Roles</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {mine.length === 0 && <span className="text-xs text-slate-400">None yet.</span>}
          {mine.map(m => {
            const r = roles.find(x => x.id === m.job_role_id)
            if (!r) return null
            return (
              <span key={m.job_role_id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 text-xs">
                {r.name}
                {m.auto ? <span className="text-brand-400">· auto</span>
                  : <button type="button" onClick={() => unassign(m.job_role_id)} className="hover:text-red-500"><X size={11} /></button>}
              </span>
            )
          })}
        </div>
        <div className="flex gap-2">
          <select value={addRole} onChange={e => setAddRole(e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm">
            <option value="">Add a Job Role...</option>
            {roles.filter(r => !myRoleIds.has(r.id) && ['custom', 'department', 'template', 'administrator'].includes(r.source)).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button type="button" onClick={assign} disabled={!addRole} className="flex items-center gap-1 px-3 py-2 bg-brand-600 disabled:opacity-50 text-white rounded-lg text-sm"><Plus size={13} /> Add</button>
        </div>
        <p className="text-xs text-slate-400 mt-1">"auto" roles come from department & level or account type. Department roles can also be added by hand, for example Transportation Supervisor for someone who oversees Transportation.</p>
      </div>

      {error && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      <div className="border border-slate-200 dark:border-slate-700 rounded-xl">
        <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          Effective access {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {open && (
          <div className="overflow-x-auto border-t border-slate-100 dark:border-slate-800">
            <table className="w-full text-xs min-w-[560px]">
              <thead><tr className="text-slate-400">
                <th className="text-left px-3 py-2">Module</th>
                {ACTIONS.map(a => <th key={a.key} className="px-1 py-2 text-center">{a.label}</th>)}
              </tr></thead>
              <tbody>
                {modules.map(m => (
                  <tr key={m.key} className="border-t border-slate-50 dark:border-slate-800">
                    <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{m.label}</td>
                    {ACTIONS.map(a => {
                      if (!m.actions[a.key]) return <td key={a.key} className="text-center text-slate-200 dark:text-slate-700">·</td>
                      const src = fromRoles(m.key, a.key)
                      const o = override(m.key, a.key)
                      const allowed = o ? o.allow : src.length > 0
                      const title = `${m.actions[a.key]}\n` + (o ? (o.allow ? 'Added for this person' : 'Removed for this person')
                        : src.length ? `From: ${src.map(r => r.name).join(', ')}` : 'Not given by any Job Role')
                      const cls = o ? (o.allow ? 'bg-green-600 border-green-600 text-white' : 'bg-red-50 border-red-300 text-red-500')
                        : allowed ? 'bg-brand-100 dark:bg-brand-950/50 border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300' : 'border-slate-200 dark:border-slate-700 text-transparent'
                      return (
                        <td key={a.key} className="px-1 py-1.5 text-center">
                          <button type="button" title={title} onClick={() => cycle(m.key, a.key)}
                            className={`w-6 h-6 rounded-md border inline-flex items-center justify-center ${cls}`}>
                            {busy === `${m.key}|${a.key}` ? <Loader2 size={11} className="animate-spin text-slate-400" />
                              : o && !o.allow ? <Minus size={12} /> : <Check size={12} />}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[11px] text-slate-400 px-3 py-2">Blue: from a Job Role. Green: added just for this person. Red: removed just for this person. Click a box to add or remove one permission; click again to go back to the role default.</p>
          </div>
        )}
      </div>
    </div>
  )
}
