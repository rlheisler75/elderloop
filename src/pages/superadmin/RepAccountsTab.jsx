import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
  UserPlus, Copy, Check, Loader2, AlertCircle, Edit2, Save, X,
  Power, PowerOff, RefreshCw, Eye, EyeOff
} from 'lucide-react'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const generateCode = (len = 6) => Array.from({ length: len }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('')
const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
  return Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const fmtDate = (ts) => ts ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

function CopyButton({ text, label = 'Copy link' }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handle}
      className="flex items-center gap-1.5 text-xs px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:border-brand-300 hover:text-brand-600 transition-colors flex-shrink-0">
      {copied ? <><Check size={11} className="text-green-500" /> Copied!</> : <><Copy size={11} /> {label}</>}
    </button>
  )
}

// ── New Rep Account Modal ───────────────────────────────────────
function NewRepModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: generatePassword(), phone: '', rep_code: '' })
  const [showPw, setShowPw] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleCreate = async () => {
    setError('')
    if (!form.first_name.trim()) return setError('First name is required.')
    if (!form.email.trim()) return setError('Email is required.')
    if (form.password.length < 8) return setError('Password must be at least 8 characters.')
    if (form.rep_code && form.rep_code.trim().length < 3) return setError('Rep code must be at least 3 characters.')

    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const res = await fetch(`${supabaseUrl}/functions/v1/create-rep-account`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          phone: form.phone.trim() || null,
          rep_code: form.rep_code.trim() || null,
        }),
      })
      const result = await res.json()
      if (!result.success) { setError(result.error || 'Failed to create rep account.'); setSaving(false); return }
      onCreated(result.rep_code)
      onClose()
    } catch (err) {
      setError('Request failed: ' + err.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <h3 className="font-display font-bold text-slate-800 dark:text-slate-100">New Rep Account</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-3 py-2 rounded-lg">
              <AlertCircle size={14} className="flex-shrink-0" /> {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">First Name *</label>
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Last Name</label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email *</label>
            <input value={form.email} onChange={e => set('email', e.target.value)} type="email" placeholder="rep@example.com"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Temporary Password *</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input value={form.password} onChange={e => set('password', e.target.value)} type={showPw ? 'text' : 'password'}
                  className="w-full px-3 py-2 pr-9 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button onClick={() => set('password', generatePassword())}
                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300 hover:border-brand-300 hover:text-brand-600 transition-colors whitespace-nowrap">
                Regenerate
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">Share this with the rep — they can change it after logging in.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Phone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Rep Code</label>
            <div className="flex gap-2">
              <input value={form.rep_code} onChange={e => set('rep_code', e.target.value.toUpperCase())}
                placeholder="Leave blank to auto-generate" maxLength={10}
                className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <button onClick={() => set('rep_code', generateCode())}
                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300 hover:border-brand-300 hover:text-brand-600 transition-colors">
                Suggest
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">Referral link: elderloop.xyz/signup?rep={form.rep_code || 'CODE'}</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
          <button onClick={handleCreate} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            {saving ? 'Creating...' : 'Create Rep Account'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Rep Modal ───────────────────────────────────────────────
function EditRepModal({ rep, onClose, onSaved }) {
  const [form, setForm] = useState({
    first_name: rep.first_name || '', last_name: rep.last_name || '',
    phone: rep.phone || '', code: rep.rep_code?.code || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setError('')
    if (!form.first_name.trim()) return setError('First name is required.')
    const newCode = form.code.trim().toUpperCase()
    if (newCode && newCode.length < 3) return setError('Rep code must be at least 3 characters.')

    setSaving(true)

    // If the code changed, make sure the new one isn't already taken by someone else
    if (rep.rep_code && newCode !== rep.rep_code.code) {
      const { data: existing } = await supabase.from('rep_codes').select('id').eq('code', newCode).maybeSingle()
      if (existing) { setError(`Rep code "${newCode}" is already in use.`); setSaving(false); return }
    }

    const { error: profileErr } = await supabase.from('profiles').update({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      phone: form.phone.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', rep.id)

    if (profileErr) { setError(profileErr.message); setSaving(false); return }

    if (rep.rep_code) {
      const { error: codeErr } = await supabase.from('rep_codes').update({
        code: newCode,
        name: `${form.first_name.trim()} ${form.last_name.trim()}`.trim(),
        updated_at: new Date().toISOString(),
      }).eq('id', rep.rep_code.id)
      if (codeErr) { setError(codeErr.message); setSaving(false); return }
    } else if (newCode) {
      const { error: codeErr } = await supabase.from('rep_codes').insert({
        code: newCode, name: `${form.first_name.trim()} ${form.last_name.trim()}`.trim(),
        email: rep.email, rep_id: rep.id, is_active: true,
      })
      if (codeErr) { setError(codeErr.message); setSaving(false); return }
    }

    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-display font-bold text-slate-800 dark:text-slate-100">Edit Rep — {rep.email}</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-3 py-2 rounded-lg">
              <AlertCircle size={14} className="flex-shrink-0" /> {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">First Name *</label>
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Last Name</label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Phone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Rep Code</label>
            <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} maxLength={10}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Changing the code doesn't move past referrals — only new signups use the new code.</p>
          </div>
          <p className="text-xs text-slate-400">Email can't be changed here — it's tied to their login.</p>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────
export default function RepAccountsTab() {
  const [reps, setReps] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState(null)
  const [toggling, setToggling] = useState(null)
  const [justCreatedCode, setJustCreatedCode] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: profs }, { data: codes }] = await Promise.all([
      supabase.from('profiles').select('id, first_name, last_name, email, phone, is_active, created_at').eq('role', 'sales_rep').order('created_at', { ascending: false }),
      supabase.from('rep_codes').select('id, code, is_active, rep_id'),
    ])
    const codeByRep = {}
    ;(codes || []).forEach(c => { if (c.rep_id) codeByRep[c.rep_id] = c })
    setReps((profs || []).map(p => ({ ...p, rep_code: codeByRep[p.id] || null })))
    setLoading(false)
  }

  const toggleActive = async (rep) => {
    setToggling(rep.id)
    const nextActive = !rep.is_active
    await supabase.from('profiles').update({ is_active: nextActive }).eq('id', rep.id)
    if (rep.rep_code) {
      await supabase.from('rep_codes').update({ is_active: nextActive }).eq('id', rep.rep_code.id)
    }
    await fetchAll()
    setToggling(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 size={28} className="animate-spin text-brand-400" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-slate-800 dark:text-slate-100 text-lg">Rep Accounts</h2>
          <p className="text-xs text-slate-400 mt-0.5">Create and manage sales rep logins — each one gets its own tracked referral link</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors">
          <UserPlus size={15} /> New Rep
        </button>
      </div>

      {justCreatedCode && (
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-xl text-sm">
          <Check size={16} className="text-green-600 flex-shrink-0" />
          <span className="text-green-800 dark:text-green-400 flex-1">
            Rep account created with code <strong className="font-mono">{justCreatedCode}</strong>.
          </span>
          <CopyButton text={`https://elderloop.xyz/signup?rep=${justCreatedCode}`} />
          <button onClick={() => setJustCreatedCode(null)} className="text-green-400 hover:text-green-600"><X size={14} /></button>
        </div>
      )}

      {reps.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm py-16 text-center text-slate-400">
          <UserPlus size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No rep accounts yet</p>
          <p className="text-sm mt-1">Click "New Rep" to create the first one</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
              <tr>
                {['Rep', 'Email', 'Rep Code', 'Status', 'Created', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {reps.map(rep => (
                <tr key={rep.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${!rep.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100 text-sm">
                    {rep.first_name} {rep.last_name}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-500">{rep.email}</td>
                  <td className="px-5 py-3">
                    {rep.rep_code ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-sm">{rep.rep_code.code}</span>
                        <CopyButton text={`https://elderloop.xyz/signup?rep=${rep.rep_code.code}`} />
                      </div>
                    ) : (
                      <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1"><AlertCircle size={11} /> No code linked</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rep.is_active ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      {rep.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-400">{fmtDate(rep.created_at)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setEditing(rep)} title="Edit"
                        className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30 rounded-lg transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => toggleActive(rep)} disabled={toggling === rep.id}
                        title={rep.is_active ? 'Deactivate' : 'Reactivate'}
                        className={`p-1.5 rounded-lg transition-colors ${rep.is_active ? 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30' : 'text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30'}`}>
                        {toggling === rep.id ? <Loader2 size={14} className="animate-spin" /> : rep.is_active ? <PowerOff size={14} /> : <Power size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showNew && (
        <NewRepModal
          onClose={() => setShowNew(false)}
          onCreated={(code) => { setJustCreatedCode(code); fetchAll() }}
        />
      )}
      {editing && (
        <EditRepModal
          rep={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); fetchAll() }}
        />
      )}
    </div>
  )
}
