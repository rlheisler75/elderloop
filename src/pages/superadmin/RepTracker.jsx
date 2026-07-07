import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Users, DollarSign, TrendingUp, Plus, Copy, Check,
  ChevronDown, ChevronRight, Building2, Calendar,
  Loader2, AlertCircle, Edit2, Save, X
} from 'lucide-react'

const PLAN_MRR = { starter: 0, essential: 299, professional: 999, pilot: 0 }
const PLAN_COLORS = {
  starter:      'bg-slate-100 text-slate-600',
  essential:    'bg-blue-100 text-blue-700',
  professional: 'bg-purple-100 text-purple-700',
  pilot:        'bg-amber-100 text-amber-700',
}

const fmtDate = (ts) => ts
  ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : '—'

const fmtMRR = (n) => n === 0 ? '—' : `$${n.toLocaleString()}/mo`

// ── Copy-to-clipboard helper ──────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handle} className="p-1 text-slate-400 hover:text-brand-600 transition-colors" title="Copy">
      {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
    </button>
  )
}

// ── Rep Row (expandable) ──────────────────────────────────────
function RepRow({ repCode, orgs, onOrgRepChange, repMeta = {} }) {
  const [open, setOpen] = useState(false)
  const mrr = orgs.reduce((s, o) => s + (PLAN_MRR[o.plan] || 0), 0)
  const latest = orgs.reduce((a, b) => new Date(a.created_at) > new Date(b.created_at) ? a : b, orgs[0])
  const active = orgs.filter(o => o.is_active).length

  return (
    <>
      <tr
        onClick={() => setOpen(v => !v)}
        className="hover:bg-slate-50 cursor-pointer border-b border-slate-100 transition-colors">
        <td className="px-5 py-3">
          <div className="flex items-center gap-2">
            {open ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
            <div>
              <span className="font-mono font-bold text-slate-800 text-sm">{repCode}</span>
              {repMeta[repCode]?.name && (
                <div className="text-xs text-slate-500">{repMeta[repCode].name}</div>
              )}
            </div>
            <CopyButton text={`https://elderloop.xyz/signup?rep=${repCode}`} />
          </div>
        </td>
        <td className="px-5 py-3 text-sm text-slate-700 font-medium">{orgs.length}</td>
        <td className="px-5 py-3 text-sm text-slate-500">{active}</td>
        <td className="px-5 py-3">
          {mrr > 0
            ? <span className="text-sm font-bold text-green-600">{fmtMRR(mrr)}</span>
            : <span className="text-sm text-slate-400">$0</span>}
        </td>
        <td className="px-5 py-3 text-xs text-slate-400">{fmtDate(latest?.created_at)}</td>
        <td className="px-5 py-3">
          <div className="flex gap-1 flex-wrap">
            {['starter','essential','professional','pilot']
              .filter(p => orgs.some(o => o.plan === p))
              .map(p => (
                <span key={p} className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${PLAN_COLORS[p]}`}>
                  {orgs.filter(o => o.plan === p).length} {p}
                </span>
              ))}
          </div>
        </td>
      </tr>

      {open && orgs.map(org => (
        <tr key={org.id} className="bg-brand-50/40 border-b border-slate-50">
          <td className="px-5 py-2.5 pl-12">
            <div className="font-medium text-slate-800 text-sm">{org.name}</div>
            {org.contact_email && <div className="text-xs text-slate-400">{org.contact_email}</div>}
          </td>
          <td className="px-5 py-2.5" colSpan={2}>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PLAN_COLORS[org.plan] || 'bg-slate-100 text-slate-500'}`}>
              {org.plan}
            </span>
          </td>
          <td className="px-5 py-2.5 text-xs text-green-600 font-medium">
            {fmtMRR(PLAN_MRR[org.plan] || 0)}
          </td>
          <td className="px-5 py-2.5 text-xs text-slate-400">{fmtDate(org.created_at)}</td>
          <td className="px-5 py-2.5">
            <button
              onClick={(e) => { e.stopPropagation(); onOrgRepChange(org) }}
              className="text-xs text-slate-400 hover:text-brand-600 transition-colors flex items-center gap-1">
              <Edit2 size={11} /> Move
            </button>
          </td>
        </tr>
      ))}
    </>
  )
}

// ── New Rep Code Form ─────────────────────────────────────────
function NewRepCodeModal({ existingCodes, onClose, onCreated }) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const generate = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    setCode(Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''))
  }

  const handleCreate = () => {
    const upper = code.toUpperCase().trim()
    if (!upper) { setError('Rep code is required.'); return }
    if (upper.length < 3) { setError('Code must be at least 3 characters.'); return }
    if (existingCodes.includes(upper)) { setError('This code already exists.'); return }
    onCreated({ code: upper, name, email })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-display font-bold text-slate-800">Create Rep Code</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Rep Code *</label>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. SMITH25"
                maxLength={10}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <button onClick={generate}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:border-brand-300 hover:text-brand-600 transition-colors">
                Generate
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">Share this as: elderloop.xyz/signup?rep={code || 'CODE'}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Rep Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Full name of rep"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Rep Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)}
              placeholder="rep@example.com" type="email"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
          <button onClick={handleCreate}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors">
            Create Code
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Assign Rep Modal ──────────────────────────────────────────
function AssignRepModal({ org, repCodes, onClose, onSaved }) {
  const [code, setCode] = useState(org.rep_code || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('organizations')
      .update({ rep_code: code.toUpperCase().trim() || null })
      .eq('id', org.id)
    setSaving(false)
    if (!error) onSaved()
    else alert(error.message)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-display font-bold text-slate-800">Assign Rep Code</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-600">Assigning rep code for <strong>{org.name}</strong></p>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Rep Code</label>
            <select value={code} onChange={e => setCode(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">— No rep (direct) —</option>
              {repCodes.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────
export default function RepTracker() {
  const [orgs,       setOrgs]       = useState([])
  const [repMeta,    setRepMeta]    = useState({}) // { CODE: { name, email } }
  const [repCodes,   setRepCodes]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showNew,    setShowNew]    = useState(false)
  const [assigning,  setAssigning]  = useState(null) // org being assigned
  const [copied,     setCopied]     = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data }, { data: repsData }] = await Promise.all([
      supabase.from('organizations')
        .select('id, name, plan, billing_status, rep_code, is_active, created_at, contact_name, contact_email, city, state')
        .order('created_at', { ascending: false }),
      supabase.from('rep_codes').select('code, name, email').eq('is_active', true)
    ])
    setOrgs(data || [])

    // Build meta lookup { CODE: { name, email } }
    const meta = {}
    ;(repsData || []).forEach(r => { meta[r.code] = { name: r.name, email: r.email } })
    setRepMeta(meta)

    // Derive unique codes — from rep_codes table + any orgs with codes not in table
    const tableCodes = (repsData || []).map(r => r.code)
    const orgCodes   = (data || []).map(o => o.rep_code).filter(Boolean)
    const codes = [...new Set([...tableCodes, ...orgCodes])].sort()
    setRepCodes(codes)
    setLoading(false)
  }

  // Group orgs by rep code
  const grouped = {}
  const unassigned = []
  orgs.forEach(org => {
    if (org.rep_code) {
      if (!grouped[org.rep_code]) grouped[org.rep_code] = []
      grouped[org.rep_code].push(org)
    } else {
      unassigned.push(org)
    }
  })

  const totalMRR = orgs.reduce((s, o) => s + (PLAN_MRR[o.plan] || 0), 0)
  const repMRR   = orgs.filter(o => o.rep_code).reduce((s, o) => s + (PLAN_MRR[o.plan] || 0), 0)
  const repCount = Object.keys(grouped).length

  const handleNewRepCreated = async ({ code, name, email }) => {
    // Save to rep_codes table for persistence
    await supabase.from('rep_codes').upsert(
      { code, name: name || null, email: email || null },
      { onConflict: 'code' }
    )
    setRepMeta(prev => ({ ...prev, [code]: { name, email } }))
    setRepCodes(prev => [...new Set([...prev, code])].sort())
  }

  const copySignupLink = (code) => {
    navigator.clipboard.writeText(`https://elderloop.xyz/signup?rep=${code}`)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
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
          <h2 className="font-display font-bold text-slate-800 text-lg">Rep Tracking</h2>
          <p className="text-xs text-slate-400 mt-0.5">Signups and MRR attributed to sales reps by code</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors">
          <Plus size={15} /> New Rep Code
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Orgs',       value: orgs.length,    icon: Building2,   color: 'text-brand-600',  bg: 'bg-brand-50'  },
          { label: 'Active Reps',      value: repCount,       icon: Users,       color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Rep-Sourced',      value: orgs.filter(o => o.rep_code).length, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Rep MRR',          value: fmtMRR(repMRR), icon: DollarSign,  color: 'text-amber-600',  bg: 'bg-amber-50'  },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
            <div className="flex items-start justify-between mb-2">
              <s.icon size={16} className={s.color} />
            </div>
            <div className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Rep codes quick reference */}
      {repCodes.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-semibold text-slate-700 text-sm mb-3">Signup Links</h3>
          <div className="space-y-2">
            {repCodes.map(code => (
              <div key={code} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
                <div className="w-32 flex-shrink-0">
                  <div className="font-mono font-bold text-slate-700 text-sm">{code}</div>
                  {repMeta[code]?.name && (
                    <div className="text-xs text-slate-400 truncate">{repMeta[code].name}</div>
                  )}
                </div>
                <span className="text-xs text-slate-400 flex-1 truncate">
                  elderloop.xyz/signup?rep={code}
                </span>
                <button onClick={() => copySignupLink(code)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 border border-slate-200 rounded-lg text-slate-600 hover:border-brand-300 hover:text-brand-600 transition-colors flex-shrink-0">
                  {copied === code ? <><Check size={11} className="text-green-500" /> Copied!</> : <><Copy size={11} /> Copy link</>}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rep breakdown table */}
      {Object.keys(grouped).length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-700 text-sm">Breakdown by Rep</h3>
            <p className="text-xs text-slate-400 mt-0.5">Click a rep row to expand their orgs</p>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Rep Code', 'Orgs', 'Active', 'MRR', 'Latest Signup', 'Plans'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped)
                .sort(([, a], [, b]) => b.length - a.length)
                .map(([code, repOrgs]) => (
                  <RepRow
                    key={code}
                    repCode={code}
                    orgs={repOrgs}
                    onOrgRepChange={setAssigning}
                    repMeta={repMeta}
                  />
                ))}
            </tbody>
            {/* Totals row */}
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr>
                <td className="px-5 py-3 font-semibold text-slate-700 text-sm">Totals</td>
                <td className="px-5 py-3 font-bold text-slate-800">{orgs.filter(o => o.rep_code).length}</td>
                <td className="px-5 py-3 font-bold text-slate-800">{orgs.filter(o => o.rep_code && o.is_active).length}</td>
                <td className="px-5 py-3 font-bold text-green-600">{fmtMRR(repMRR)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-12 text-center text-slate-400">
          <TrendingUp size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No rep-sourced signups yet</p>
          <p className="text-sm mt-1">Create a rep code above and share the signup link</p>
        </div>
      )}

      {/* Unassigned orgs */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-700 text-sm">Direct / Unassigned Orgs</h3>
            <p className="text-xs text-slate-400 mt-0.5">Signed up without a rep code</p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">{unassigned.length}</span>
        </div>
        {unassigned.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">All orgs are rep-attributed</div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Organization', 'Plan', 'MRR', 'Signed Up', 'Assign Rep'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {unassigned.map(org => (
                <tr key={org.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-800 text-sm">{org.name}</div>
                    {org.contact_email && <div className="text-xs text-slate-400">{org.contact_email}</div>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PLAN_COLORS[org.plan] || 'bg-slate-100 text-slate-500'}`}>
                      {org.plan}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600">{fmtMRR(PLAN_MRR[org.plan] || 0)}</td>
                  <td className="px-5 py-3 text-xs text-slate-400">{fmtDate(org.created_at)}</td>
                  <td className="px-5 py-3">
                    {repCodes.length > 0 ? (
                      <button onClick={() => setAssigning(org)}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                        <Edit2 size={11} /> Assign
                      </button>
                    ) : (
                      <span className="text-xs text-slate-300">No codes yet</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showNew && (
        <NewRepCodeModal
          existingCodes={repCodes}
          onClose={() => setShowNew(false)}
          onCreated={handleNewRepCreated}
        />
      )}
      {assigning && (
        <AssignRepModal
          org={assigning}
          repCodes={repCodes}
          onClose={() => setAssigning(null)}
          onSaved={() => { setAssigning(null); fetchAll() }}
        />
      )}
    </div>
  )
}
