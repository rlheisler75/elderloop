import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Building, Plus, Loader2, AlertCircle, Check, X, UserPlus, Link2, Unlink, Eye, EyeOff, Percent, KeyRound
} from 'lucide-react'

// Corporations (access tier 5): a corporation groups several communities and has
// Corporate Executive logins that see counts across them (CorporatePortal.jsx).
// Only ElderLoop links communities to a corporation (protect_org_billing_fields).
// Enterprise pricing: 15% off each community's plan once 3+ communities are linked.

export const ENTERPRISE_MIN_COMMUNITIES = 3

const inputCls = 'w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500'
const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5'

async function callFunction(name, body) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.success === false) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

function NewUserModal({ corporation, onClose, onCreated }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setError('')
    if (!form.first_name.trim() || !form.email.trim()) return setError('First name and email are required.')
    if (form.password.length < 8) return setError('Temporary password must be at least 8 characters.')
    setSaving(true)
    try {
      await callFunction('create-corporate-user', {
        ...form, email: form.email.trim().toLowerCase(), corporation_id: corporation.id,
      })
      onCreated()
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-slate-800 dark:text-slate-100">New corporate login · {corporation.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        {error && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>First Name *</label><input value={form.first_name} onChange={e => set('first_name', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Last Name</label><input value={form.last_name} onChange={e => set('last_name', e.target.value)} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Email *</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Phone</label><input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} /></div>
          <div>
            <label className={labelCls}>Temporary Password *</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} className={`${inputCls} pr-9 font-mono`} />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">They must choose their own password on first sign-in.</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl flex items-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />} Create login
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CorporationsTab() {
  const [corps, setCorps] = useState([])
  const [orgs, setOrgs] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [newUserFor, setNewUserFor] = useState(null)
  const [linkPick, setLinkPick] = useState({})

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: c }, { data: o }, { data: u }] = await Promise.all([
      supabase.from('corporations').select('*').order('name'),
      supabase.from('organizations').select('id, name, city, state, plan, subscription_status, stripe_subscription_id, corporation_id, is_active').order('name'),
      supabase.from('profiles').select('id, first_name, last_name, email, is_active, corporation_id').eq('role', 'corporate'),
    ])
    setCorps(c || []); setOrgs(o || []); setUsers(u || [])
    setLoading(false)
  }

  const run = async (key, fn, okMsg) => {
    setBusy(key); setError(''); setNotice('')
    try {
      await fn()
      if (okMsg) setNotice(okMsg)
      await fetchAll()
    } catch (e) {
      setError(e.message)
    }
    setBusy(null)
  }

  const createCorp = () => run('new', async () => {
    if (!newName.trim()) throw new Error('Enter a corporation name.')
    const { error } = await supabase.from('corporations').insert({ name: newName.trim() })
    if (error) throw error
    setNewName('')
  })

  const linkOrg = (corp) => run(`link-${corp.id}`, async () => {
    const orgId = linkPick[corp.id]
    if (!orgId) throw new Error('Pick a community to link.')
    const { error } = await supabase.from('organizations').update({ corporation_id: corp.id }).eq('id', orgId)
    if (error) throw error
    setLinkPick(p => ({ ...p, [corp.id]: '' }))
  }, 'Community linked. Run "Sync Enterprise discount" to update billing.')

  const unlinkOrg = (org) => run(`unlink-${org.id}`, async () => {
    const { error } = await supabase.from('organizations').update({ corporation_id: null }).eq('id', org.id)
    if (error) throw error
  }, 'Community unlinked. Run "Sync Enterprise discount" to update billing.')

  const toggleUser = (u) => run(`user-${u.id}`, async () => {
    const { error } = await supabase.from('profiles').update({ is_active: !u.is_active }).eq('id', u.id)
    if (error) throw error
  })

  const sendReset = (u) => run(`reset-${u.id}`, async () => {
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-password-reset`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: u.email }),
    })
  }, 'Password reset link sent.')

  const syncDiscount = (corp) => run(`disc-${corp.id}`, async () => {
    const r = await callFunction('sync-enterprise-discount', { corporation_id: corp.id })
    setNotice(r.message)
  })

  if (loading) return <div className="flex justify-center py-24"><Loader2 size={28} className="animate-spin text-brand-400" /></div>

  const unlinked = orgs.filter(o => !o.corporation_id && o.is_active !== false)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-slate-800 dark:text-slate-100 text-lg">Corporations</h2>
          <p className="text-xs text-slate-400 mt-0.5">Multi-community groups. Corporate logins see counts across their communities, never names. Enterprise: 15% off each community at {ENTERPRISE_MIN_COMMUNITIES}+ communities.</p>
        </div>
        <div className="flex gap-2">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New corporation name" className={`${inputCls} w-56`} />
          <button onClick={createCorp} disabled={busy === 'new'} className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl">
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}
      {notice && <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm flex items-center gap-2"><Check size={14} /> {notice}</div>}

      {corps.length === 0 && <div className="text-sm text-slate-400 text-center py-10">No corporations yet.</div>}

      {corps.map(corp => {
        const members = orgs.filter(o => o.corporation_id === corp.id)
        const active = members.filter(o => o.is_active !== false)
        const execs = users.filter(u => u.corporation_id === corp.id)
        const qualifies = active.length >= ENTERPRISE_MIN_COMMUNITIES
        return (
          <div key={corp.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Building size={18} className="text-brand-600" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">{corp.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${qualifies ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {active.length} {active.length === 1 ? 'community' : 'communities'}{qualifies ? ' · Enterprise 15%' : ` · needs ${ENTERPRISE_MIN_COMMUNITIES - active.length} more for Enterprise`}
                </span>
              </div>
              <button onClick={() => syncDiscount(corp)} disabled={busy === `disc-${corp.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
                {busy === `disc-${corp.id}` ? <Loader2 size={12} className="animate-spin" /> : <Percent size={12} />} Sync Enterprise discount
              </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-5">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Communities</div>
                <ul className="space-y-1.5 mb-3">
                  {members.length === 0 && <li className="text-sm text-slate-400">None linked</li>}
                  {members.map(o => (
                    <li key={o.id} className="flex items-center justify-between text-sm bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                      <span className="text-slate-700 dark:text-slate-200 truncate">
                        {o.name} <span className="text-xs text-slate-400">· {o.plan}{o.stripe_subscription_id ? '' : ' · no subscription'}{o.is_active === false ? ' · inactive' : ''}</span>
                      </span>
                      <button onClick={() => unlinkOrg(o)} disabled={busy === `unlink-${o.id}`} title="Unlink" className="text-slate-400 hover:text-red-600 ml-2"><Unlink size={14} /></button>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <select value={linkPick[corp.id] || ''} onChange={e => setLinkPick(p => ({ ...p, [corp.id]: e.target.value }))} className={inputCls}>
                    <option value="">Link a community…</option>
                    {unlinked.map(o => <option key={o.id} value={o.id}>{o.name}{o.city ? ` (${o.city})` : ''}</option>)}
                  </select>
                  <button onClick={() => linkOrg(corp)} disabled={busy === `link-${corp.id}`} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm flex items-center gap-1"><Link2 size={14} /> Link</button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Corporate logins</div>
                  <button onClick={() => setNewUserFor(corp)} className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"><UserPlus size={13} /> New login</button>
                </div>
                <ul className="space-y-1.5">
                  {execs.length === 0 && <li className="text-sm text-slate-400">No logins yet</li>}
                  {execs.map(u => (
                    <li key={u.id} className="flex items-center justify-between text-sm bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                      <span className={`truncate ${u.is_active ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 line-through'}`}>
                        {u.first_name} {u.last_name} <span className="text-xs text-slate-400">· {u.email}</span>
                      </span>
                      <span className="flex items-center gap-2 ml-2">
                        <button onClick={() => sendReset(u)} title="Send password reset" className="text-slate-400 hover:text-brand-600"><KeyRound size={14} /></button>
                        <button onClick={() => toggleUser(u)} className="text-xs text-slate-500 hover:text-slate-800">{u.is_active ? 'Deactivate' : 'Activate'}</button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )
      })}

      {newUserFor && (
        <NewUserModal corporation={newUserFor} onClose={() => setNewUserFor(null)}
          onCreated={() => { setNewUserFor(null); setNotice('Corporate login created.'); fetchAll() }} />
      )}
    </div>
  )
}
