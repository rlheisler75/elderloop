import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { ShieldCheck, Download, Loader2, X, Eye, Pencil, Plus, Trash2 } from 'lucide-react'

// Admin Panel → Health Data Access: who viewed and changed residents' health
// information (HIPAA audit controls). Data comes from phi_access_report()
// (20261116_phi_access_report.sql), which reads audit_log VIEW rows from
// log_phi_view() and the audit_ephi_changes rows on resident health tables.

const VIEW_AREAS = {
  nursing:           'Nursing page',
  nursing_chart:     'Nursing chart',
  resident_contacts: 'Emergency & medical contacts',
  social_profile:    'Social Services profile',
  dietary_profile:   'Diet profile',
  dietary_profiles:  'Dietary resident list',
  physician_orders:  'Physician diet orders',
  incidents:         'Incident list',
  incident_report:   'Incident report',
}
const SOCIAL_TABS = {
  profiles: 'Social profiles', mood: 'Mood & behavior', casenotes: 'Case notes', goals: 'Goals',
  grievances: 'Grievances', conferences: 'Care conferences', discharge: 'Discharge planning',
  resources: 'Resources & referrals', dashboard: 'Director dashboard',
}
const TABLES = {
  residents: 'Resident record', resident_emergency_contacts: 'Emergency contacts',
  resident_medical_contacts: 'Medical contacts', resident_medications: 'Medications',
  resident_vitals: 'Vitals', resident_dietary_profiles: 'Diet profile', care_notes: 'Care notes',
  incident_reports: 'Incident report', resident_updates: 'Family update',
  ss_care_conferences: 'Care conference', ss_case_notes: 'Case note', ss_discharge_plans: 'Discharge plan',
  ss_goals: 'Social Services goal', ss_grievances: 'Grievance', ss_mood_logs: 'Mood log',
  ss_referrals: 'Referral', ss_social_profiles: 'Social Services profile',
}
function areaLabel(area) {
  if (VIEW_AREAS[area]) return VIEW_AREAS[area]
  if (TABLES[area]) return TABLES[area]
  if (area?.startsWith('social_')) return `Social Services: ${SOCIAL_TABS[area.slice(7)] || area.slice(7)}`
  return area || '—'
}

const ACTIONS = {
  VIEW:   { label: 'Viewed',  icon: Eye,    cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900' },
  INSERT: { label: 'Added',   icon: Plus,   cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900' },
  UPDATE: { label: 'Changed', icon: Pencil, cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900' },
  DELETE: { label: 'Deleted', icon: Trash2, cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900' },
}

const RANGES = [
  { key: 'today', label: 'Today',        days: 0 },
  { key: '7',     label: 'Last 7 days',  days: 7 },
  { key: '30',    label: 'Last 30 days', days: 30 },
  { key: '90',    label: 'Last 90 days', days: 90 },
  { key: 'custom', label: 'Custom' },
]
const LIMIT = 1000

const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const fmtWhen = ts => new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
const ROLE_LABELS = { org_admin: 'Org Admin', ceo: 'Administrator', super_admin: 'ElderLoop support' }
const who = r => r.user_name || r.user_email || (r.user_id ? 'Unknown user' : 'System (automatic)')

function bounds(range, from, to) {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  if (range === 'custom') {
    const f = from ? new Date(`${from}T00:00:00`) : start
    const t = to ? new Date(`${to}T00:00:00`) : new Date(start)
    t.setDate(t.getDate() + 1)
    return [f, t]
  }
  const days = RANGES.find(r => r.key === range)?.days ?? 7
  const f = new Date(start); f.setDate(f.getDate() - days)
  const t = new Date(start); t.setDate(t.getDate() + 1)
  return [f, t]
}

function csvCell(v) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export default function HealthDataAccessTab({ orgId, orgName }) {
  const [range, setRange]       = useState('7')
  const [from, setFrom]         = useState(ymd(new Date()))
  const [to, setTo]             = useState(ymd(new Date()))
  const [kind, setKind]         = useState('all')
  const [userId, setUserId]     = useState('')
  const [residentId, setResidentId] = useState('')
  const [staff, setStaff]       = useState([])
  const [residents, setResidents] = useState([])
  const [rows, setRows]         = useState([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  // Pick lists: everyone in the community (including former staff) and every resident
  useEffect(() => {
    if (!orgId) return
    ;(async () => {
      const [s, r] = await Promise.all([
        supabase.from('profiles').select('id,first_name,last_name,role,is_active')
          .eq('organization_id', orgId).not('role', 'in', '(resident,family)')
          .order('last_name').order('first_name'),
        supabase.from('residents').select('id,first_name,last_name,is_active')
          .eq('organization_id', orgId).order('last_name').order('first_name'),
      ])
      setStaff(s.data || [])
      setResidents(r.data || [])
    })()
  }, [orgId])

  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    ;(async () => {
      setLoading(true); setError('')
      const [f, t] = bounds(range, from, to)
      const { data, error: err } = await supabase.rpc('phi_access_report', {
        p_from: f.toISOString(), p_to: t.toISOString(), p_org: orgId,
        p_user: userId || null, p_resident: residentId || null, p_kind: kind, p_limit: LIMIT,
      })
      if (cancelled) return
      if (err) { setError(err.message); setRows([]); setTotal(0) }
      else { setRows(data || []); setTotal(data?.[0]?.total_count || 0) }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [orgId, range, from, to, kind, userId, residentId])

  const stats = useMemo(() => ({
    views:     rows.filter(r => r.action === 'VIEW').length,
    changes:   rows.filter(r => r.action !== 'VIEW').length,
    people:    new Set(rows.map(r => r.user_id || 'system')).size,
    residents: new Set(rows.map(r => r.resident_id).filter(Boolean)).size,
  }), [rows])
  const truncated = total > rows.length

  const exportCsv = () => {
    const [f, t] = bounds(range, from, to)
    t.setDate(t.getDate() - 1)
    const header = ['When', 'Staff member', 'Email', 'Role', 'Action', 'What', 'Resident', 'Detail']
    const lines = rows.map(r => [fmtWhen(r.created_at), who(r), r.user_email, ROLE_LABELS[r.user_role] || r.user_role,
      ACTIONS[r.action]?.label || r.action, areaLabel(r.area), r.resident_name, r.detail].map(csvCell).join(','))
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `health-data-access_${(orgName || 'community').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}_${ymd(f)}_to_${ymd(t)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const selCls = 'px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 text-sm'
  const staffName = id => { const s = staff.find(x => x.id === id); return s ? `${s.first_name} ${s.last_name}` : '' }
  const residentName = id => { const r = residents.find(x => x.id === id); return r ? `${r.first_name} ${r.last_name}` : '' }

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck size={18} className="text-brand-600" /> Health Data Access
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Who opened or changed residents' health information: nursing charts, Social Services records, incident reports,
              emergency and medical contacts, and diet profiles. Opening the same record again within 10 minutes counts once.
              The report shows names and records only, never the health information itself.
            </p>
          </div>
          <button onClick={exportCsv} disabled={!rows.length}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40">
            <Download size={15} /> Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 mt-5">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Dates</label>
            <select value={range} onChange={e => setRange(e.target.value)} className={selCls}>
              {RANGES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>
          {range === 'custom' && (
            <>
              <div>
                <label className="block text-xs text-slate-400 mb-1">From</label>
                <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} className={selCls} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">To</label>
                <input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} className={selCls} />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Type</label>
            <select value={kind} onChange={e => setKind(e.target.value)} className={selCls}>
              <option value="all">Viewed and changed</option>
              <option value="viewed">Viewed only</option>
              <option value="changed">Changed only</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Staff member</label>
            <select value={userId} onChange={e => setUserId(e.target.value)} className={`${selCls} max-w-[14rem]`}>
              <option value="">Everyone</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.last_name}, {s.first_name}{s.is_active === false ? ' (inactive)' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Resident</label>
            <select value={residentId} onChange={e => setResidentId(e.target.value)} className={`${selCls} max-w-[14rem]`}>
              <option value="">All residents</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.last_name}, {r.first_name}{r.is_active === false ? ' (inactive)' : ''}</option>)}
            </select>
          </div>
          {(userId || residentId) && (
            <button onClick={() => { setUserId(''); setResidentId('') }}
              className="flex items-center gap-1 px-3 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
              <X size={13} /> Clear {userId && residentId ? 'filters' : userId ? staffName(userId) : residentName(residentId)}
            </button>
          )}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            ['Views', stats.views], ['Changes', stats.changes],
            ['Staff members', stats.people], ['Residents', stats.residents],
          ].map(([label, n]) => (
            <div key={label} className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
              <div className="font-display text-2xl font-semibold text-slate-800 dark:text-slate-100">{loading ? '…' : n}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
            </div>
          ))}
        </div>
        {truncated && !loading && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
            Showing the newest {rows.length.toLocaleString()} of {Number(total).toLocaleString()} entries. Narrow the dates, staff member or resident to see the rest.
          </p>
        )}
      </div>

      {/* Log */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {error ? (
          <div className="p-6 text-sm text-red-600 dark:text-red-400">Couldn't load the report: {error}</div>
        ) : loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">No health data access in this period.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">When</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Staff member</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Action</th>
                  <th className="text-left px-4 py-2.5 font-semibold">What</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Resident</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((r, i) => {
                  const a = ACTIONS[r.action] || { label: r.action, icon: Eye, cls: '' }
                  const Icon = a.icon
                  return (
                    <tr key={i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtWhen(r.created_at)}</td>
                      <td className="px-4 py-2.5">
                        {r.user_id ? (
                          <button onClick={() => setUserId(r.user_id)} title="Show only this person"
                            className="text-left font-medium text-slate-700 dark:text-slate-200 hover:text-brand-600">{who(r)}</button>
                        ) : <span className="text-slate-500">{who(r)}</span>}
                        {r.user_role && <div className="text-xs text-slate-400">{ROLE_LABELS[r.user_role] || r.user_role.replace(/_/g, ' ')}</div>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${a.cls}`}>
                          <Icon size={11} /> {a.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                        {areaLabel(r.area)}
                        {r.detail && <div className="text-xs text-slate-400">{r.detail}</div>}
                      </td>
                      <td className="px-4 py-2.5">
                        {r.resident_id ? (
                          <button onClick={() => setResidentId(r.resident_id)} title="Show only this resident"
                            className="text-left text-slate-700 dark:text-slate-200 hover:text-brand-600">{r.resident_name || 'Removed resident'}</button>
                        ) : <span className="text-slate-400">{r.resident_name || (r.record_id ? '—' : 'List view')}</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
