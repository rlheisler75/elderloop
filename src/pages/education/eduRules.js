// Shared Education rules: session types, who had to attend, report periods,
// and per-session statuses used by the Sessions, Reports and Individual
// screens and the attendance importer.

export const SESSION_TYPES = [
  { key: 'mandatory',   label: 'Mandatory' },
  { key: 'department',  label: 'Department' },
  { key: 'educational', label: 'Educational activity (optional, no makeups)' },
  { key: 'orientation', label: 'New-hire orientation' },
  { key: 'makeup',      label: 'Makeup session' },
]
export const typeLabel = (key) => ({ educational: 'Educational activity', orientation: 'Orientation', makeup: 'Makeup session' }[key]
  || SESSION_TYPES.find(t => t.key === key)?.label || key)

// Nobody is required at these, so they never count toward attendance rates
export const OPTIONAL_TYPES = ['educational', 'makeup']
export const isOptional = (s) => OPTIONAL_TYPES.includes(s.session_type)

// Absent or Excused here owes a makeup
export const tracksMakeups = (s) => !isOptional(s) && s.track_makeups !== false

export const deptsOf = (p) => [p.department, ...(p.departments || [])].filter(Boolean)
export const inDept = (p, key) => deptsOf(p).includes(key)

// Same rule as edu_session_roster() in the database
export function isRequired(session, p) {
  if (p.hire_date && p.hire_date > session.session_date) return false
  if (p.employment_end_date && p.employment_end_date < session.session_date) return false
  if (!p.is_active && !p.employment_end_date) return false
  if (session.audience === 'all') return true
  return deptsOf(p).some(d => session.audience_departments.includes(d))
}

// ── Dates ──────────────────────────────────────────────────────
export const localDate = (d = new Date()) => d.toLocaleDateString('en-CA')
export const todayStr = () => localDate()
export const fmtShort = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''

export const PERIODS = [
  { key: 'this_month', label: 'Current month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'last_3',     label: 'Last 3 months' },
  { key: 'last_6',     label: 'Last 6 months' },
  { key: 'ytd',        label: 'Year to date' },
  { key: 'last_year',  label: 'Last year' },
  { key: 'last_2',     label: 'Last 2 years' },
  { key: 'all',        label: 'All time' },
  { key: 'custom',     label: 'Custom range' },
]

// { from, to } as YYYY-MM-DD; reports never look past today
export function periodRange(key, custom = {}) {
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth()
  const today = localDate(now)
  const monthsBack = (n) => { const d = new Date(now); d.setMonth(d.getMonth() - n); return localDate(d) }
  switch (key) {
    case 'this_month': return { from: localDate(new Date(y, m, 1)), to: today }
    case 'last_month': return { from: localDate(new Date(y, m - 1, 1)), to: localDate(new Date(y, m, 0)) }
    case 'last_3':     return { from: monthsBack(3), to: today }
    case 'last_6':     return { from: monthsBack(6), to: today }
    case 'ytd':        return { from: `${y}-01-01`, to: today }
    case 'last_year':  return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` }
    case 'last_2':     return { from: monthsBack(24), to: today }
    case 'custom': {
      const to = custom.to && custom.to < today ? custom.to : today
      return { from: custom.from || '0000-01-01', to }
    }
    default:           return { from: '0000-01-01', to: today }
  }
}

export function periodText(key, range) {
  if (key === 'all') return 'All time'
  if (key === 'custom') return `${range.from === '0000-01-01' ? 'Start' : fmtShort(range.from)} – ${fmtShort(range.to)}`
  return `${PERIODS.find(p => p.key === key)?.label} (${fmtShort(range.from)} – ${fmtShort(range.to)})`
}

// How one person counts for one session in reports (null = not counted):
// required sessions count everyone who had to be there (unmarked included)
// plus walk-ins who came; optional ones only count who came.
export function reportStatus(session, p, mark) {
  if (isOptional(session)) return mark?.status === 'present' ? 'present' : null
  if (isRequired(session, p)) return mark?.status || 'unmarked'
  return mark?.status === 'present' ? 'present' : null
}

// ── Attendance rate ───────────────────────────────────────────
// Like the paper/Nebula reports: Excused doesn't count against anyone;
// Absent and Not marked do. Made-up absences still count as absences here.
export const emptyCounts = () => ({ sessions: 0, present: 0, absent: 0, excused: 0, unmarked: 0, madeUp: 0 })
export function addTo(c, status, madeUp) {
  c[status]++
  if (madeUp) c.madeUp++
}
export const rateOf = (c) => {
  const base = c.present + c.absent + c.unmarked
  return base ? Math.round((c.present / base) * 1000) / 10 : null
}
export const fmtRate = (r) => r == null ? '—' : `${r.toFixed(1)}%`

// ── CSV download ──────────────────────────────────────────────
export function downloadCsv(filename, rows) {
  const q = (v) => {
    let s = v == null ? '' : String(v)
    if (/^[=+\-@]/.test(s)) s = `'${s}` // keep spreadsheets from running it as a formula
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = rows.map(r => r.map(q).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
