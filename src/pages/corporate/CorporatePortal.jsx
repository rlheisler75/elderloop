import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import MustChangePasswordGate from '../../components/auth/MustChangePasswordGate'
import {
  Building2, LogOut, KeyRound, Loader2, AlertCircle, Megaphone, LayoutDashboard,
  Users, Wrench, ShieldAlert, Award, MessageSquareWarning, ChevronRight, X, CheckCircle, RefreshCw, Wallet
} from 'lucide-react'
import CorporateBudgets from './CorporateBudgets'

// Corporate Executive portal (access tier 5). Everything here comes from the
// corporate_* database functions, which return counts per community: no resident,
// staff, or prospect names. Corporate users have no direct access to any
// community's tables.

const KPI_COLS = [
  { key: 'census',                label: 'Census' },
  { key: 'staff',                 label: 'Staff' },
  { key: 'occupancy',             label: 'IL occupancy' },
  { key: 'open_work_orders',      label: 'Open WOs',          warn: r => r.urgent_work_orders > 0, sub: r => r.urgent_work_orders ? `${r.urgent_work_orders} urgent` : null },
  { key: 'overdue_pm',            label: 'Overdue PM',        warn: r => r.overdue_pm > 0 },
  { key: 'overdue_life_safety',   label: 'Overdue life safety', warn: r => r.overdue_life_safety > 0 },
  { key: 'incidents_30d',         label: 'Incidents 30d',     warn: r => r.serious_incidents_30d > 0, sub: r => r.serious_incidents_30d ? `${r.serious_incidents_30d} serious` : null },
  { key: 'state_reports_pending', label: 'State reports open', warn: r => r.state_reports_overdue > 0, sub: r => r.state_reports_overdue ? `${r.state_reports_overdue} overdue` : null },
  { key: 'open_grievances',       label: 'Open grievances',   warn: r => r.open_grievances > 0 },
  { key: 'certs_expired',         label: 'Expired certs',     warn: r => r.certs_expired > 0, sub: r => r.certs_expiring_30d ? `${r.certs_expiring_30d} due in 30d` : null },
  { key: 'new_leads_30d',         label: 'New leads 30d' },
  { key: 'supply_ordered_30d',    label: 'Supply ordered 30d', money: true },
]

const LABELS = {
  census_by_care_level: 'Census by care level',
  staff_by_department: 'Staff by department',
  open_work_orders_by_priority: 'Open work orders by priority',
  open_work_orders_by_category: 'Open work orders by category',
  incidents_90d_by_type: 'Incidents (90 days) by type',
  incidents_90d_by_severity: 'Incidents (90 days) by severity',
  open_grievances_by_category: 'Open grievances by category',
  leads_by_status: 'Leads by status',
  il_units_by_status: 'IL units by status',
}

const pretty = (k) => String(k).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
const fmtDT = (d) => d ? new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'

function cellValue(row, col) {
  if (col.key === 'occupancy') {
    return row.il_units ? `${Math.round((row.il_occupied / row.il_units) * 100)}%` : '—'
  }
  return col.money ? money(row[col.key]) : (row[col.key] ?? 0)
}

function CountList({ title, data }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1])
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="text-sm font-semibold text-slate-700 mb-2">{title}</div>
      {entries.length === 0 ? <div className="text-xs text-slate-400">None</div> : (
        <ul className="space-y-1">
          {entries.map(([k, n]) => (
            <li key={k} className="flex justify-between text-sm">
              <span className="text-slate-600">{pretty(k)}</span>
              <span className="font-semibold text-slate-800">{n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CommunityDetail({ community, onClose }) {
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.rpc('corporate_community_detail', { p_org: community.organization_id })
      .then(({ data, error }) => error ? setError(error.message) : setDetail(data))
  }, [community.organization_id])

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-2xl h-full bg-slate-50 overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold text-slate-800 truncate">{community.name}</h2>
            <p className="text-xs text-slate-500">{[community.city, community.state].filter(Boolean).join(', ')} · counts only, no names</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-3"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}
          {!detail && !error && <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-400" /></div>}
          {detail && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ['Overdue PM', detail.maintenance?.overdue_pm],
                  ['Overdue life safety', detail.maintenance?.overdue_life_safety],
                  ['Expired certs', detail.certs?.expired],
                  ['Certs due in 30d', detail.certs?.expiring_30d],
                ].map(([label, n]) => (
                  <div key={label} className={`rounded-xl p-3 border ${n > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
                    <div className="text-xs text-slate-500">{label}</div>
                    <div className="text-2xl font-semibold text-slate-800">{n ?? 0}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-sm font-semibold text-slate-700 mb-2">Open state-reportable incidents (42 CFR 483.12)</div>
                {(detail.state_reportable_open || []).length === 0 ? <div className="text-xs text-slate-400">None open</div> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="text-left text-slate-500">
                        <th className="py-1 pr-3">#</th><th className="pr-3">Type</th><th className="pr-3">Severity</th>
                        <th className="pr-3">Initial report due</th><th className="pr-3">Initial filed</th><th>5-day filed</th>
                      </tr></thead>
                      <tbody>
                        {detail.state_reportable_open.map(r => {
                          const late = !r.state_reported_at && r.initial_due && new Date(r.initial_due) < new Date()
                          return (
                            <tr key={r.report_number} className="border-t border-slate-100">
                              <td className="py-1.5 pr-3 font-mono">{r.report_number}</td>
                              <td className="pr-3">{pretty(r.incident_type)}</td>
                              <td className="pr-3">{pretty(r.severity)}</td>
                              <td className={`pr-3 ${late ? 'text-red-600 font-semibold' : ''}`}>{fmtDT(r.initial_due)}{late && ' · overdue'}</td>
                              <td className="pr-3">{fmtDT(r.state_reported_at)}</td>
                              <td>{fmtDT(r.investigation_reported_at)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {Object.entries(LABELS).map(([k, title]) => <CountList key={k} title={title} data={detail[k]} />)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Portfolio() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null)

  const load = useCallback(() => {
    setError('')
    supabase.rpc('corporate_portfolio').then(({ data, error }) => {
      if (error) setError(error.message)
      setRows(data || [])
    })
  }, [])
  useEffect(() => { load() }, [load])

  if (!rows) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>

  const sum = (k) => rows.reduce((t, r) => t + Number(r[k] || 0), 0)
  const ilUnits = sum('il_units')
  const tiles = [
    { label: 'Communities', value: rows.length, icon: Building2 },
    { label: 'Total census', value: sum('census'), icon: Users },
    { label: 'IL occupancy', value: ilUnits ? `${Math.round(sum('il_occupied') / ilUnits * 100)}%` : '—', icon: Building2 },
    { label: 'Urgent work orders', value: sum('urgent_work_orders'), icon: Wrench, warn: sum('urgent_work_orders') > 0 },
    { label: 'State reports overdue', value: sum('state_reports_overdue'), icon: ShieldAlert, warn: sum('state_reports_overdue') > 0 },
    { label: 'Open grievances', value: sum('open_grievances'), icon: MessageSquareWarning, warn: sum('open_grievances') > 0 },
    { label: 'Expired certifications', value: sum('certs_expired'), icon: Award, warn: sum('certs_expired') > 0 },
  ]

  return (
    <div className="space-y-5">
      {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {tiles.map(t => {
          const Icon = t.icon
          return (
            <div key={t.label} className={`rounded-xl p-3 border ${t.warn ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-1.5 text-xs text-slate-500"><Icon size={13} /> {t.label}</div>
              <div className={`text-2xl font-semibold mt-1 ${t.warn ? 'text-red-700' : 'text-slate-800'}`}>{t.value}</div>
            </div>
          )
        })}
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-sm">
          No communities are linked to your corporation yet. ElderLoop support links them for you.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                <th className="px-4 py-3 font-medium">Community</th>
                {KPI_COLS.map(c => <th key={c.key} className="px-3 py-3 font-medium whitespace-nowrap">{c.label}</th>)}
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.organization_id} onClick={() => setOpen(r)} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{r.name}</div>
                    <div className="text-xs text-slate-400">{[r.city, r.state].filter(Boolean).join(', ')}</div>
                  </td>
                  {KPI_COLS.map(c => {
                    const warn = c.warn?.(r)
                    const sub = c.sub?.(r)
                    return (
                      <td key={c.key} className="px-3 py-3 whitespace-nowrap">
                        <span className={warn ? 'text-red-600 font-semibold' : 'text-slate-700'}>{cellValue(r, c)}</span>
                        {sub && <div className={`text-xs ${warn ? 'text-red-500' : 'text-slate-400'}`}>{sub}</div>}
                      </td>
                    )
                  })}
                  <td className="pr-3 text-slate-300"><ChevronRight size={16} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Counts only. Resident, staff, and prospect names stay inside each community.</span>
        <button onClick={load} className="flex items-center gap-1 hover:text-slate-600"><RefreshCw size={12} /> Refresh</button>
      </div>

      {open && <CommunityDetail community={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

const CATEGORIES = ['general', 'alert', 'event', 'weather']

function ChainAnnouncement() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('general')
  const [expires, setExpires] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setSent(null)
    if (!title.trim()) return setError('A title is required.')
    setSaving(true)
    const { data, error } = await supabase.rpc('corporate_post_announcement', {
      p_title: title, p_body: body, p_category: category,
      p_expires_at: expires ? new Date(expires).toISOString() : null,
    })
    setSaving(false)
    if (error) return setError(error.message)
    setSent(data)
    setTitle(''); setBody(''); setExpires('')
  }

  const inputCls = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
  return (
    <div className="max-w-2xl">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-display text-lg font-semibold text-slate-800">Chain-wide announcement</h2>
        <p className="text-sm text-slate-500 mb-4">Posts the same announcement to every community in your corporation. It's signed with your corporation's name, and each community's staff can see it on their announcement board and TV signage.</p>
        {error && <div className="mb-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}
        {sent !== null && (
          <div className="mb-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
            <CheckCircle size={14} /> Posted to {sent} {sent === 1 ? 'community' : 'communities'}.
          </div>
        )}
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={5} className={inputCls} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
                {CATEGORIES.map(c => <option key={c} value={c}>{pretty(c)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expires (optional)</label>
              <input type="datetime-local" value={expires} onChange={e => setExpires(e.target.value)} className={inputCls} />
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm flex items-center gap-2">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Megaphone size={15} />} Post to all communities
          </button>
        </form>
      </div>
    </div>
  )
}

const TABS = [
  { key: 'portfolio', label: 'Portfolio', icon: LayoutDashboard },
  { key: 'budgets',   label: 'Budgets', icon: Wallet },
  { key: 'announce',  label: 'Announcements', icon: Megaphone },
]

export default function CorporatePortal() {
  const { profile, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('portfolio')
  const [corpName, setCorpName] = useState('')

  useEffect(() => {
    if (!profile?.corporation_id) return
    supabase.from('corporations').select('name').eq('id', profile.corporation_id).maybeSingle()
      .then(({ data }) => setCorpName(data?.name || ''))
  }, [profile?.corporation_id])

  if (profile?.must_change_password) {
    return <MustChangePasswordGate onDone={refreshProfile} subtitle="Corporate Portal" />
  }

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-brand-950 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-600 rounded-xl overflow-hidden flex-shrink-0">
            <img src="/icon-192.png" alt="ElderLoop" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display font-semibold truncate">{corpName || 'ElderLoop'}</div>
            <div className="text-brand-400 text-xs">Corporate Portal · {profile?.first_name} {profile?.last_name}</div>
          </div>
          <button onClick={() => navigate('/forgot-password')} title="Change password"
            className="p-2 text-brand-300 hover:text-white"><KeyRound size={17} /></button>
          <button onClick={handleSignOut} className="flex items-center gap-1.5 px-3 py-2 text-sm text-brand-300 hover:text-white">
            <LogOut size={16} /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap ${tab === t.key ? 'bg-slate-50 text-brand-800' : 'text-brand-300 hover:text-white'}`}>
                <Icon size={15} /> {t.label}
              </button>
            )
          })}
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab === 'portfolio' ? <Portfolio /> : tab === 'budgets' ? <CorporateBudgets /> : <ChainAnnouncement />}
      </main>
    </div>
  )
}
