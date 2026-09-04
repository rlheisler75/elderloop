import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { BarChart3, Clock, Users, PieChart, Download, Printer, AlertTriangle } from 'lucide-react'

const PRIORITIES = [
  { key: 'urgent', label: 'Urgent', color: '#dc2626' },
  { key: 'high',   label: 'High',   color: '#ea580c' },
  { key: 'normal', label: 'Normal', color: '#2563eb' },
  { key: 'low',    label: 'Low',    color: '#64748b' },
]

// Must match the wo_category Postgres enum exactly (see work_orders.category)
const CATEGORIES = [
  { key: 'plumbing',      label: 'Plumbing' },
  { key: 'electrical',    label: 'Electrical' },
  { key: 'hvac',          label: 'HVAC' },
  { key: 'appliance',     label: 'Appliance' },
  { key: 'carpentry',     label: 'Carpentry' },
  { key: 'painting',      label: 'Painting' },
  { key: 'cleaning',      label: 'Cleaning' },
  { key: 'grounds',       label: 'Grounds' },
  { key: 'safety',        label: 'Safety' },
  { key: 'inspection',    label: 'Inspection' },
  { key: 'filter_change', label: 'Filter Change' },
  { key: 'pest_control',  label: 'Pest Control' },
  { key: 'other',         label: 'Other' },
]

const DATE_PRESETS = [
  { key: '7',      label: 'Last 7 Days' },
  { key: '30',     label: 'Last 30 Days' },
  { key: '90',     label: 'Last 90 Days' },
  { key: '365',    label: 'Last Year' },
  { key: 'custom', label: 'Custom' },
]

function hoursBetween(a, b) {
  if (!a || !b) return null
  return (new Date(b) - new Date(a)) / 3600000
}
function avg(nums) {
  const v = nums.filter(n => n != null && !isNaN(n))
  if (!v.length) return null
  return v.reduce((s, n) => s + n, 0) / v.length
}
function fmtHrs(h) {
  if (h == null) return '—'
  if (h < 1) return `${Math.round(h * 60)}m`
  if (h < 48) return `${h.toFixed(1)}h`
  return `${(h / 24).toFixed(1)}d`
}
function isBreached(w) {
  if (!w.sla_completion_due) return false
  const compareTo = w.completed_at || new Date().toISOString()
  return new Date(compareTo) > new Date(w.sla_completion_due)
}
function toDateStr(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function todayStr() { return toDateStr(new Date()) }

export default function Reports({ orgId, profile }) {
  const [preset, setPreset]         = useState('30')
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return toDateStr(d)
  })
  const [customTo, setCustomTo]     = useState(todayStr())
  const [tab, setTab]               = useState('response')
  const [rows, setRows]             = useState([])
  const [loading, setLoading]       = useState(true)

  const { dateFrom, dateTo } = useMemo(() => {
    if (preset === 'custom') return { dateFrom: customFrom, dateTo: customTo }
    const to = new Date()
    const from = new Date(); from.setDate(from.getDate() - parseInt(preset))
    return { dateFrom: toDateStr(from), dateTo: toDateStr(to) }
  }, [preset, customFrom, customTo])

  useEffect(() => { if (orgId) fetchData() }, [orgId, dateFrom, dateTo])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase.from('work_orders')
      .select('id, wo_number, title, category, priority, status, source, created_at, completed_at, due_date, sla_completion_due, sla_responded_at, estimated_hours, assigned_to, assigned_profiles:profiles!work_orders_assigned_to_fkey(first_name,last_name)')
      .eq('organization_id', orgId)
      .gte('created_at', `${dateFrom}T00:00:00`)
      .lte('created_at', `${dateTo}T23:59:59`)
      .order('created_at', { ascending: false })
      .limit(5000)
    setRows(data || [])
    setLoading(false)
  }

  // ── Response & Completion Time ──────────────────────────────
  const responseReport = useMemo(() => PRIORITIES.map(p => {
    const inP = rows.filter(w => w.priority === p.key)
    const respondedHrs = inP.map(w => hoursBetween(w.created_at, w.sla_responded_at)).filter(h => h != null)
    const completedHrs = inP.filter(w => w.completed_at).map(w => hoursBetween(w.created_at, w.completed_at))
    const breached = inP.filter(isBreached).length
    return {
      ...p, total: inP.length,
      avgResponse: avg(respondedHrs), avgCompletion: avg(completedHrs),
      breached, breachPct: inP.length ? Math.round(breached / inP.length * 100) : 0,
    }
  }), [rows])

  const overall = useMemo(() => {
    const completedHrs = rows.filter(w => w.completed_at).map(w => hoursBetween(w.created_at, w.completed_at))
    const respondedHrs = rows.map(w => hoursBetween(w.created_at, w.sla_responded_at)).filter(h => h != null)
    const totalBreached = rows.filter(isBreached).length
    return {
      total: rows.length,
      closed: rows.filter(w => w.status === 'closed').length,
      avgResponse: avg(respondedHrs),
      avgCompletion: avg(completedHrs),
      breachPct: rows.length ? Math.round(totalBreached / rows.length * 100) : 0,
    }
  }, [rows])

  // ── Work Load by Staff ──────────────────────────────────────
  const workloadReport = useMemo(() => {
    const map = {}
    rows.forEach(w => {
      const key = w.assigned_to || 'unassigned'
      const name = w.assigned_to
        ? (`${w.assigned_profiles?.first_name || ''} ${w.assigned_profiles?.last_name || ''}`.trim() || 'Unknown Staff')
        : 'Unassigned'
      if (!map[key]) map[key] = { name, total: 0, open: 0, closed: 0, overdue: 0, estHours: 0 }
      map[key].total++
      if (w.status === 'closed') map[key].closed++
      else map[key].open++
      if (w.due_date && w.due_date < todayStr() && !['closed', 'cancelled'].includes(w.status)) map[key].overdue++
      if (w.estimated_hours) map[key].estHours += Number(w.estimated_hours)
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [rows])

  // ── Category & Source Breakdown ─────────────────────────────
  const categoryBreakdown = useMemo(() => {
    const map = {}
    rows.forEach(w => { map[w.category] = (map[w.category] || 0) + 1 })
    return CATEGORIES.map(c => ({ ...c, count: map[c.key] || 0 }))
      .filter(c => c.count > 0)
      .sort((a, b) => b.count - a.count)
  }, [rows])

  const sourceBreakdown = useMemo(() => {
    const map = { staff: 0, resident: 0, family: 0 }
    rows.forEach(w => { const s = (w.source === 'resident' || w.source === 'family') ? w.source : 'staff'; map[s]++ })
    return [
      { key: 'staff',    label: 'Staff Submitted',    count: map.staff },
      { key: 'resident', label: 'Resident Submitted', count: map.resident },
      { key: 'family',   label: 'Family Submitted',   count: map.family },
    ].filter(s => s.count > 0)
  }, [rows])

  const maxCat = Math.max(1, ...categoryBreakdown.map(c => c.count))
  const maxSrc = Math.max(1, ...sourceBreakdown.map(c => c.count))

  // ── CSV export ───────────────────────────────────────────────
  const exportCSV = () => {
    const header = ['WO#', 'Title', 'Category', 'Priority', 'Status', 'Source', 'Created', 'Completed', 'Due', 'Assigned To', 'Est. Hours', 'Response (hrs)', 'Completion (hrs)', 'SLA Breached']
    const lines = [header]
    rows.forEach(w => {
      lines.push([
        w.wo_number ?? '', w.title, w.category, w.priority, w.status, w.source || 'staff',
        w.created_at ? new Date(w.created_at).toLocaleString() : '',
        w.completed_at ? new Date(w.completed_at).toLocaleString() : '',
        w.due_date || '',
        w.assigned_profiles ? `${w.assigned_profiles.first_name} ${w.assigned_profiles.last_name}` : '',
        w.estimated_hours ?? '',
        hoursBetween(w.created_at, w.sla_responded_at)?.toFixed(1) ?? '',
        w.completed_at ? hoursBetween(w.created_at, w.completed_at).toFixed(1) : '',
        isBreached(w) ? 'Yes' : 'No',
      ])
    })
    const csv  = lines.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `maintenance-report-${dateFrom}-to-${dateTo}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Print / PDF export ──────────────────────────────────────
  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=900,height=700')
    const rangeLabel = `${new Date(dateFrom + 'T12:00:00').toLocaleDateString()} — ${new Date(dateTo + 'T12:00:00').toLocaleDateString()}`
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Maintenance Report — ${rangeLabel}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11pt; color: #1e293b; background: white; }
          .report { max-width: 800px; margin: 0 auto; padding: 32px; }
          .cover-header { border-bottom: 3px solid #1e3a5f; padding-bottom: 20px; margin-bottom: 24px; }
          .cover-header h1 { font-size: 22pt; font-weight: 700; color: #1e3a5f; margin-bottom: 4px; }
          .cover-header h2 { font-size: 12pt; font-weight: 500; color: #64748b; }
          .summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 28px; }
          .summary-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; text-align: center; }
          .summary-card .val { font-size: 18pt; font-weight: 700; color: #1e3a5f; }
          .summary-card .lbl { font-size: 8pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }
          h3 { font-size: 11pt; font-weight: 700; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.05em; margin: 24px 0 10px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
          table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
          th { text-align: left; background: #f8fafc; padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.03em; color: #64748b; }
          td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; }
          .report-footer { margin-top: 32px; padding-top: 16px; border-top: 2px solid #e2e8f0; font-size: 8.5pt; color: #64748b; display: flex; justify-content: space-between; }
          @media print {
            body { font-size: 10pt; }
            .report { padding: 0; }
            table { page-break-inside: avoid; }
            @page { margin: 0.75in; size: letter; }
          }
        </style>
      </head>
      <body>
        <div class="report">
          <div class="cover-header">
            <h1>Maintenance Report</h1>
            <h2>${rangeLabel}</h2>
          </div>

          <div class="summary-grid">
            <div class="summary-card"><div class="val">${overall.total}</div><div class="lbl">Work Orders</div></div>
            <div class="summary-card"><div class="val">${overall.closed}</div><div class="lbl">Closed</div></div>
            <div class="summary-card"><div class="val">${fmtHrs(overall.avgResponse)}</div><div class="lbl">Avg Response</div></div>
            <div class="summary-card"><div class="val">${fmtHrs(overall.avgCompletion)}</div><div class="lbl">Avg Completion</div></div>
            <div class="summary-card"><div class="val">${overall.breachPct}%</div><div class="lbl">SLA Breach Rate</div></div>
          </div>

          <h3>Response &amp; Completion Time by Priority</h3>
          <table>
            <tr><th>Priority</th><th>Work Orders</th><th>Avg Response</th><th>Avg Completion</th><th>SLA Breach %</th></tr>
            ${responseReport.map(p => `<tr><td>${p.label}</td><td>${p.total}</td><td>${fmtHrs(p.avgResponse)}</td><td>${fmtHrs(p.avgCompletion)}</td><td>${p.breachPct}%</td></tr>`).join('')}
          </table>

          <h3>Work Load by Staff</h3>
          <table>
            <tr><th>Staff</th><th>Total</th><th>Open</th><th>Closed</th><th>Overdue</th><th>Est. Hours</th></tr>
            ${workloadReport.map(s => `<tr><td>${s.name}</td><td>${s.total}</td><td>${s.open}</td><td>${s.closed}</td><td>${s.overdue}</td><td>${s.estHours ? s.estHours.toFixed(1) : '—'}</td></tr>`).join('')}
          </table>

          <h3>By Category</h3>
          <table>
            <tr><th>Category</th><th>Count</th><th>% of Total</th></tr>
            ${categoryBreakdown.map(c => `<tr><td>${c.label}</td><td>${c.count}</td><td>${overall.total ? Math.round(c.count / overall.total * 100) : 0}%</td></tr>`).join('')}
          </table>

          <h3>By Source</h3>
          <table>
            <tr><th>Source</th><th>Count</th><th>% of Total</th></tr>
            ${sourceBreakdown.map(s => `<tr><td>${s.label}</td><td>${s.count}</td><td>${overall.total ? Math.round(s.count / overall.total * 100) : 0}%</td></tr>`).join('')}
          </table>

          <div class="report-footer">
            <span>Generated ${new Date().toLocaleString()}</span>
            <span>ElderLoop Maintenance</span>
          </div>
        </div>
      </body>
      </html>
    `)
    win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 300)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 size={16} className="text-brand-600" /> Maintenance Reports
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">Response times, staff workload, and request breakdowns for the selected date range.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} disabled={loading || rows.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-brand-600 border border-slate-200 dark:border-slate-700 hover:border-brand-300 rounded-lg transition-colors disabled:opacity-40">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={handlePrint} disabled={loading || rows.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-brand-600 border border-slate-200 dark:border-slate-700 hover:border-brand-300 rounded-lg transition-colors disabled:opacity-40">
            <Printer size={14} /> Print Report
          </button>
        </div>
      </div>

      {/* Date range presets */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
          {DATE_PRESETS.map(d => (
            <button key={d.key} onClick={() => setPreset(d.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${preset === d.key ? 'bg-white dark:bg-slate-900 text-brand-700 dark:text-brand-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
              {d.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="flex items-center gap-2 text-sm">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <span className="text-slate-400">to</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading report data...</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-display text-lg">No work orders in this range</p>
          <p className="text-sm mt-1">Try a wider date range.</p>
        </div>
      ) : (<>

      {/* Summary stat strip */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Work Orders',    value: overall.total,               color: 'text-slate-800 dark:text-slate-100', bg: 'bg-slate-50' },
          { label: 'Closed',         value: overall.closed,              color: 'text-green-600',  bg: 'bg-green-50' },
          { label: 'Avg Response',   value: fmtHrs(overall.avgResponse), color: 'text-brand-600',  bg: 'bg-brand-50' },
          { label: 'Avg Completion', value: fmtHrs(overall.avgCompletion), color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'SLA Breach Rate', value: `${overall.breachPct}%`,    color: overall.breachPct > 10 ? 'text-red-600' : 'text-slate-800 dark:text-slate-100', bg: overall.breachPct > 10 ? 'bg-red-50' : 'bg-slate-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} dark:bg-slate-900 rounded-2xl p-4 border border-white dark:border-slate-800`}>
            <div className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</div>
            <div className="text-slate-500 dark:text-slate-400 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-4 w-fit flex-wrap">
        {[
          { key: 'response', label: 'Response & Completion', icon: Clock },
          { key: 'workload',  label: 'Work Load by Staff',    icon: Users },
          { key: 'breakdown', label: 'Category & Source',     icon: PieChart },
        ].map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white dark:bg-slate-900 text-brand-700 dark:text-brand-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
              <Icon size={14} /> {t.label}
            </button>
          )
        })}
      </div>

      {/* Response & Completion Time */}
      {tab === 'response' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="grid grid-cols-5 gap-4 px-5 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            <span>Priority</span><span>Work Orders</span><span>Avg Response</span><span>Avg Completion</span><span>SLA Breach %</span>
          </div>
          {responseReport.map(p => (
            <div key={p.key} className="grid grid-cols-5 gap-4 items-center px-5 py-4 border-b border-slate-50 dark:border-slate-800 last:border-0">
              <div className="font-semibold text-sm" style={{ color: p.color }}>{p.label}</div>
              <div className="text-sm text-slate-700 dark:text-slate-300">{p.total}</div>
              <div className="text-sm text-slate-700 dark:text-slate-300">{fmtHrs(p.avgResponse)}</div>
              <div className="text-sm text-slate-700 dark:text-slate-300">{fmtHrs(p.avgCompletion)}</div>
              <div className={`text-sm font-medium flex items-center gap-1 ${p.breachPct > 10 ? 'text-red-600' : 'text-slate-500'}`}>
                {p.breachPct > 10 && <AlertTriangle size={12} />} {p.breachPct}%
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Work Load by Staff */}
      {tab === 'workload' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="grid grid-cols-5 gap-4 px-5 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            <span>Staff</span><span>Total</span><span>Open</span><span>Closed</span><span>Overdue / Est. Hours</span>
          </div>
          {workloadReport.map(s => (
            <div key={s.name} className="grid grid-cols-5 gap-4 items-center px-5 py-4 border-b border-slate-50 dark:border-slate-800 last:border-0">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{s.name}</div>
              <div className="text-sm text-slate-700 dark:text-slate-300">{s.total}</div>
              <div className="text-sm text-slate-700 dark:text-slate-300">{s.open}</div>
              <div className="text-sm text-slate-700 dark:text-slate-300">{s.closed}</div>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                {s.overdue > 0 && <span className="text-red-600 font-medium">{s.overdue} overdue</span>}
                {s.estHours > 0 && <span>{s.estHours.toFixed(1)}h est.</span>}
                {s.overdue === 0 && !s.estHours && '—'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category & Source Breakdown */}
      {tab === 'breakdown' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">By Category</h3>
            <div className="space-y-2.5">
              {categoryBreakdown.map(c => (
                <div key={c.key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-300">{c.label}</span>
                    <span className="text-slate-400">{c.count} ({overall.total ? Math.round(c.count / overall.total * 100) : 0}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(c.count / maxCat) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">By Source</h3>
            <div className="space-y-2.5">
              {sourceBreakdown.map(s => (
                <div key={s.key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-300">{s.label}</span>
                    <span className="text-slate-400">{s.count} ({overall.total ? Math.round(s.count / overall.total * 100) : 0}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-sage-500 rounded-full" style={{ width: `${(s.count / maxSrc) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      </>)}
    </div>
  )
}
