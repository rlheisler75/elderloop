// Education Reports and Individual tabs: attendance by session type and by
// department for a period, and one person's full in-service history.
// Rates count only required sessions: Present ÷ (Present + Absent + Not marked).
// Excused doesn't count against anyone. Optional sessions (educational
// activities, makeup sessions) show who came but have no rate.
import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Download, Printer, Search } from 'lucide-react'
import { PERIODS, periodRange, periodText, todayStr, fmtShort, typeLabel, isOptional, isRequired, inDept, deptsOf,
         reportStatus, emptyCounts, addTo, rateOf, fmtRate, downloadCsv, tracksMakeups } from './eduRules'
import { printEduReport, printIndividual } from './eduPrint'

const selCls = 'px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-slate-100'
const btnCls = 'flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
const card = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm'
const TYPE_ORDER = ['mandatory', 'department', 'orientation', 'educational', 'makeup']
const MAKEUP_METHOD = { read_and_sign: 'read and sign', makeup_session: 'makeup session', other: 'other' }

const rateCls = (r) => r == null ? 'text-slate-400' : r >= 90 ? 'text-green-700 dark:text-green-400' : r >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'

function PeriodPicker({ period, setPeriod, custom, setCustom }) {
  return (
    <>
      <select value={period} onChange={e => setPeriod(e.target.value)} className={selCls} aria-label="Period">
        {PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
      </select>
      {period === 'custom' && (
        <span className="flex items-center gap-1.5 text-sm text-slate-500">
          <input type="date" value={custom.from} onChange={e => setCustom(c => ({ ...c, from: e.target.value }))} className={selCls} aria-label="From" />
          to
          <input type="date" value={custom.to} max={todayStr()} onChange={e => setCustom(c => ({ ...c, to: e.target.value }))} className={selCls} aria-label="To" />
        </span>
      )}
    </>
  )
}

const CountCells = ({ c, optional, cls = 'px-3 py-2' }) => (
  <>
    <td className={`${cls} text-right text-green-700 dark:text-green-400`}>{c.present}</td>
    <td className={`${cls} text-right text-red-600 dark:text-red-400`}>{optional ? '—' : c.absent}</td>
    <td className={`${cls} text-right text-amber-600 dark:text-amber-400`}>{optional ? '—' : c.excused}</td>
    <td className={`${cls} text-right text-slate-400`}>{optional ? '—' : c.unmarked}</td>
    <td className={`${cls} text-right text-slate-500`}>{optional ? '—' : c.madeUp}</td>
    <td className={`${cls} text-right font-semibold ${rateCls(optional ? null : rateOf(c))}`}>{optional ? 'Optional' : fmtRate(rateOf(c))}</td>
  </>
)

// ── Reports ───────────────────────────────────────────────────
export function ReportsTab({ sessions, people, markMap, makeupMap, departments, orgName }) {
  const [period, setPeriod] = useState('ytd')
  const [custom, setCustom] = useState({ from: `${new Date().getFullYear()}-01-01`, to: todayStr() })
  const [dept, setDept] = useState('')
  const [open, setOpen] = useState({})
  const [showSessions, setShowSessions] = useState(false)
  const range = periodRange(period, custom)
  const deptName = (k) => k === '__none' ? 'No department' : departments.find(d => d.key === k)?.label || k

  const data = useMemo(() => {
    const inRange = sessions.filter(s => s.session_date >= range.from && s.session_date <= range.to)
    const shown = dept ? people.filter(p => inDept(p, dept)) : people
    const byType = {}
    const byDept = {}
    const total = emptyCounts()
    const sessionRows = []
    for (const s of inRange) {
      const optional = isOptional(s)
      const t = byType[s.session_type] ||= { type: s.session_type, ...emptyCounts() }
      t.sessions++
      if (!optional) total.sessions++
      const sc = { session: s, ...emptyCounts() }
      for (const p of shown) {
        const mark = markMap.get(`${s.id}|${p.profile_id}`)
        const status = reportStatus(s, p, mark)
        if (!status) continue
        const madeUp = (status === 'absent' || status === 'excused') && makeupMap.has(`${s.id}|${p.profile_id}`)
        addTo(t, status, madeUp)
        addTo(sc, status, madeUp)
        if (optional) continue
        addTo(total, status, madeUp)
        // Only required sessions roll up by department
        const keys = deptsOf(p).length ? [...new Set(deptsOf(p))] : ['__none']
        for (const k of keys) {
          if (dept && k !== dept) continue
          const d = byDept[k] ||= { key: k, people: new Set(), ...emptyCounts(), types: {} }
          d.people.add(p.profile_id)
          addTo(d, status, madeUp)
          const dt = d.types[s.session_type] ||= { type: s.session_type, sessionIds: new Set(), ...emptyCounts() }
          dt.sessionIds.add(s.id)
          addTo(dt, status, madeUp)
        }
      }
      sessionRows.push(sc)
    }
    const order = [...departments.map(d => d.key), '__none']
    const deptRows = Object.values(byDept)
      .sort((a, b) => (order.indexOf(a.key) + 1 || 999) - (order.indexOf(b.key) + 1 || 999))
      .map(d => ({ ...d, typeRows: TYPE_ORDER.filter(k => d.types[k]).map(k => d.types[k]) }))
    const typeRows = TYPE_ORDER.filter(k => byType[k]).map(k => byType[k])
    return { typeRows, deptRows, total, sessionRows: sessionRows.sort((a, b) => b.session.session_date.localeCompare(a.session.session_date)) }
  }, [sessions, people, markMap, makeupMap, range.from, range.to, dept, departments])

  const head = ['Present', 'Absent', 'Excused', 'Not marked', 'Made up', 'Attendance rate']
  const nums = (c, optional) => optional
    ? [c.present, '', '', '', '', 'Optional']
    : [c.present, c.absent, c.excused, c.unmarked, c.madeUp, fmtRate(rateOf(c))]
  const subtitle = `${periodText(period, range)} · ${dept ? deptName(dept) : 'All departments'}`

  function exportCsv() {
    const rows = [
      ['In-service attendance report', orgName], ['Period', periodText(period, range)], ['Department', dept ? deptName(dept) : 'All departments'], [],
      ['By session type'], ['Session type', 'Sessions', ...head],
      ...data.typeRows.map(t => [typeLabel(t.type), t.sessions, ...nums(t, ['educational', 'makeup'].includes(t.type))]),
      ['All required sessions', data.total.sessions, ...nums(data.total)], [],
      ['By department (required sessions)'], ['Department', 'Session type', 'People', ...head],
      ...data.deptRows.flatMap(d => [
        [deptName(d.key), 'All', d.people.size, ...nums(d)],
        ...d.typeRows.map(t => ['', typeLabel(t.type), '', ...nums(t)]),
      ]), [],
      ['Sessions'], ['Date', 'Session', 'Session type', ...head],
      ...data.sessionRows.map(r => [r.session.session_date, r.session.title, typeLabel(r.session.session_type), ...nums(r, isOptional(r.session))]),
    ]
    downloadCsv(`in-service-report-${range.to}.csv`, rows)
  }

  const th = 'px-3 py-2 text-right'
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <PeriodPicker period={period} setPeriod={setPeriod} custom={custom} setCustom={setCustom} />
        <select value={dept} onChange={e => setDept(e.target.value)} className={selCls} aria-label="Department">
          <option value="">All departments</option>
          {departments.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
        </select>
        <div className="ml-auto flex gap-2">
          <button onClick={() => printEduReport({ orgName, subtitle, data, deptName })} className={btnCls}><Printer size={14} /> Print</button>
          <button onClick={exportCsv} className={btnCls}><Download size={14} /> Export CSV</button>
        </div>
      </div>

      <div className={`${card} overflow-x-auto`}>
        <div className="px-4 pt-4 pb-1 font-semibold text-slate-800 dark:text-slate-100">Attendance by session type</div>
        <table className="w-full text-sm min-w-[640px]">
          <thead><tr className="text-xs uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
            <th className="px-3 py-2 text-left">Session type</th><th className={th}>Sessions</th><th className={th}>Present</th><th className={th}>Absent</th>
            <th className={th}>Excused</th><th className={th}>Not marked</th><th className={th}>Made up</th><th className={th}>Rate</th></tr></thead>
          <tbody>
            {data.typeRows.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">No in-services in this period.</td></tr>}
            {data.typeRows.map(t => (
              <tr key={t.type} className="border-b border-slate-50 dark:border-slate-800">
                <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{typeLabel(t.type)}</td>
                <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">{t.sessions}</td>
                <CountCells c={t} optional={['educational', 'makeup'].includes(t.type)} />
              </tr>
            ))}
            {data.typeRows.length > 0 && (
              <tr className="bg-slate-50 dark:bg-slate-800/60 font-semibold">
                <td className="px-3 py-2 text-slate-800 dark:text-slate-100">All required sessions</td>
                <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">{data.total.sessions}</td>
                <CountCells c={data.total} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={`${card} overflow-x-auto`}>
        <div className="px-4 pt-4 pb-1 font-semibold text-slate-800 dark:text-slate-100">Attendance by department</div>
        <table className="w-full text-sm min-w-[640px]">
          <thead><tr className="text-xs uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
            <th className="px-3 py-2 text-left">Department</th><th className={th}>People</th><th className={th}>Present</th><th className={th}>Absent</th>
            <th className={th}>Excused</th><th className={th}>Not marked</th><th className={th}>Made up</th><th className={th}>Rate</th></tr></thead>
          <tbody>
            {data.deptRows.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">No required in-services in this period.</td></tr>}
            {data.deptRows.map(d => (
              <DeptRows key={d.key} d={d} name={deptName(d.key)} open={!!open[d.key]} onToggle={() => setOpen(o => ({ ...o, [d.key]: !o[d.key] }))} />
            ))}
          </tbody>
        </table>
      </div>

      <div className={card}>
        <button onClick={() => setShowSessions(v => !v)} className="w-full flex items-center gap-2 px-4 py-3 font-semibold text-slate-800 dark:text-slate-100 text-left">
          {showSessions ? <ChevronDown size={16} /> : <ChevronRight size={16} />} Sessions in this period ({data.sessionRows.length})
        </button>
        {showSessions && (
          <div className="overflow-x-auto border-t border-slate-100 dark:border-slate-800">
            <table className="w-full text-sm min-w-[720px]">
              <thead><tr className="text-xs uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Session</th><th className={th}>Present</th><th className={th}>Absent</th>
                <th className={th}>Excused</th><th className={th}>Not marked</th><th className={th}>Made up</th><th className={th}>Rate</th></tr></thead>
              <tbody>
                {data.sessionRows.map(r => (
                  <tr key={r.session.id} className="border-b border-slate-50 dark:border-slate-800">
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{fmtShort(r.session.session_date)}</td>
                    <td className="px-3 py-2"><div className="text-slate-800 dark:text-slate-100">{r.session.title}</div>
                      <div className="text-xs text-slate-400">{typeLabel(r.session.session_type)}{!isOptional(r.session) && !tracksMakeups(r.session) ? ' · makeups not tracked' : ''}</div></td>
                    <CountCells c={r} optional={isOptional(r.session)} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Rate = Present ÷ (Present + Absent + Not marked). Excused doesn't count against anyone, and an absence that was made up still counts as an absence.
        Only people who had to attend are counted: hired by the session date, not yet gone, and in its departments. Educational activities and makeup sessions are optional, so they show who came but have no rate.
      </p>
    </div>
  )
}

function DeptRows({ d, name, open, onToggle }) {
  return (
    <>
      <tr className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer" onClick={onToggle}>
        <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">
          <span className="inline-flex items-center gap-1">{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}{name}</span>
        </td>
        <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">{d.people.size}</td>
        <CountCells c={d} />
      </tr>
      {open && d.typeRows.map(t => (
        <tr key={t.type} className="border-b border-slate-50 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 text-xs">
          <td className="pl-9 pr-3 py-1.5 text-slate-500">{typeLabel(t.type)}</td>
          <td className="px-3 py-1.5 text-right text-slate-400">{t.sessionIds.size} session{t.sessionIds.size === 1 ? '' : 's'}</td>
          <CountCells c={t} cls="px-3 py-1.5" />
        </tr>
      ))}
    </>
  )
}

// ── Individual ────────────────────────────────────────────────
export function IndividualTab({ sessions, people, markMap, makeupMap, usedForMakeup, owed, deptLabel, orgName, personId, onPerson }) {
  const [q, setQ] = useState('')
  const [period, setPeriod] = useState('all')
  const [custom, setCustom] = useState({ from: `${new Date().getFullYear()}-01-01`, to: todayStr() })
  const range = periodRange(period, custom)
  const person = people.find(p => p.profile_id === personId)
  const personLabel = (p) => `${p.last_name}, ${p.first_name} — ${deptLabel(p)}${p.is_active ? '' : ` (former${p.employment_end_date ? `, ended ${p.employment_end_date}` : ''})`}`
  const options = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    return people.filter(p => p.profile_id === personId || words.every(w => `${p.first_name} ${p.last_name} ${deptLabel(p)}`.toLowerCase().includes(w)))
  }, [people, q, personId])

  const owedKeys = useMemo(() => new Set(owed.filter(o => o.person.profile_id === personId).map(o => o.session.id)), [owed, personId])

  const view = useMemo(() => {
    if (!person) return null
    const counts = emptyCounts()
    let hours = 0
    const rows = []
    for (const s of sessions) {
      if (s.session_date < range.from || s.session_date > range.to) continue
      const key = `${s.id}|${person.profile_id}`
      const mark = markMap.get(key)
      const mu = makeupMap.get(key)
      const status = reportStatus(s, person, mark)
      if (!status && !mark && !mu) continue
      const optional = isOptional(s)
      const madeUp = !!mu && (status === 'absent' || status === 'excused')
      if (status && !optional) { counts.sessions++; addTo(counts, status, madeUp) }
      const earned = (mark?.status === 'present' && !usedForMakeup.has(key)) || mu ? Number(s.hours) : 0
      hours += earned
      const notes = []
      if (mu) notes.push(`Made up ${fmtShort(mu.completed_on)} (${MAKEUP_METHOD[mu.method] || mu.method})`)
      else if (owedKeys.has(s.id)) notes.push('Makeup owed')
      if (mark && !optional && !isRequired(s, person)) notes.push('Not required')
      if (optional) notes.push('Optional')
      if (mark?.method === 'qr') notes.push('QR check-in')
      if (mark?.method === 'import') notes.push('Imported')
      rows.push({ s, status: status || mark?.status || 'none', hours: earned, notes: notes.join(' · ') })
    }
    rows.sort((a, b) => b.s.session_date.localeCompare(a.s.session_date))
    return { counts, hours: Math.round(hours * 100) / 100, rows }
  }, [person, sessions, markMap, makeupMap, usedForMakeup, owedKeys, range.from, range.to])

  const statusBadge = {
    present:  ['Present', 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400'],
    absent:   ['Absent', 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'],
    excused:  ['Excused', 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'],
    unmarked: ['Not marked', 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'],
    none:     ['—', 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'],
  }

  function exportCsv() {
    const c = view.counts
    downloadCsv(`in-service-history-${person.last_name}-${person.first_name}.csv`.replace(/[^\w.-]+/g, '-'), [
      ['In-service history', orgName], ['Name', `${person.first_name} ${person.last_name}`], ['Department', deptLabel(person)],
      ['Hire date', person.hire_date || ''], ['End date', person.employment_end_date || ''], ['Period', periodText(period, range)], [],
      ['Required sessions', c.sessions], ['Present', c.present], ['Absent', c.absent], ['Excused', c.excused], ['Not marked', c.unmarked],
      ['Attendance rate', fmtRate(rateOf(c))], ['CE hours', view.hours], ['Makeups owed', owedKeys.size], [],
      ['Date', 'Session', 'Session type', 'CE hours earned', 'Status', 'Notes'],
      ...view.rows.map(r => [r.s.session_date, r.s.title, typeLabel(r.s.session_type), r.hours || '', statusBadge[r.status][0], r.notes]),
    ])
  }

  const tile = (label, value, cls) => (
    <div className={`rounded-2xl p-4 ${cls}`}>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-2xl font-display font-bold mt-0.5">{value}</div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className={`${card} p-4 flex flex-wrap items-end gap-3`}>
        <div className="flex-1 min-w-[240px]">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Person</label>
          <div className="flex gap-2">
            <div className="relative w-40 shrink-0">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" aria-label="Search people"
                className="w-full pl-8 pr-2 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-slate-100" />
            </div>
            <select value={personId || ''} onChange={e => onPerson(e.target.value)} className={`${selCls} flex-1 min-w-0`} aria-label="Person">
              <option value="">Choose a person… ({options.length})</option>
              {options.map(p => <option key={p.profile_id} value={p.profile_id}>{personLabel(p)}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Period</label>
          <div className="flex flex-wrap gap-2"><PeriodPicker period={period} setPeriod={setPeriod} custom={custom} setCustom={setCustom} /></div>
        </div>
        {person && (
          <div className="flex gap-2">
            <button onClick={() => printIndividual({ orgName, person, dept: deptLabel(person), periodLabel: periodText(period, range), view, owedCount: owedKeys.size, statusBadge })} className={btnCls}><Printer size={14} /> Print</button>
            <button onClick={exportCsv} className={btnCls}><Download size={14} /> Export CSV</button>
          </div>
        )}
      </div>

      {!person ? (
        <p className="text-sm text-slate-400 py-10 text-center">Choose a person to see their in-service history.</p>
      ) : (
        <>
          <div className="bg-brand-50 dark:bg-brand-950/40 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <div className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">{person.first_name} {person.last_name}</div>
              <div className="text-xs text-slate-500">{person.job_title || ''}</div>
            </div>
            <div><div className="text-xs text-slate-500">Department</div><div className="text-sm font-medium text-slate-800 dark:text-slate-100">{deptLabel(person)}</div></div>
            <div><div className="text-xs text-slate-500">Hire date</div><div className="text-sm font-medium text-slate-800 dark:text-slate-100">{person.hire_date ? fmtShort(person.hire_date) : <span className="text-slate-400">Not set</span>}</div></div>
            <div><div className="text-xs text-slate-500">{person.is_active ? 'Status' : 'End date'}</div>
              <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{person.is_active ? 'Active' : person.employment_end_date ? fmtShort(person.employment_end_date) : 'Former'}</div></div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {tile('Required sessions', view.counts.sessions, 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100')}
            {tile('Present', view.counts.present, 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400')}
            {tile('Absent', view.counts.absent, 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400')}
            {tile('Excused', view.counts.excused, 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400')}
            {tile('Attendance rate', fmtRate(rateOf(view.counts)), 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300')}
            {tile('CE hours', view.hours, 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100')}
            {tile('Makeups owed', owedKeys.size, 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100')}
          </div>
          {view.counts.unmarked > 0 && <p className="text-xs text-slate-500">{view.counts.unmarked} required session{view.counts.unmarked === 1 ? ' was' : 's were'} never marked; they count against the rate.{!person.hire_date ? ' No hire date is set, so every session counts as required; add it on the staff record.' : ''}</p>}

          <div className={`${card} overflow-x-auto`}>
            <table className="w-full text-sm min-w-[640px]">
              <thead><tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-2">Date</th><th className="px-4 py-2">Session</th><th className="px-4 py-2">Type</th>
                <th className="px-4 py-2 text-right">CE hours</th><th className="px-4 py-2">Status</th></tr></thead>
              <tbody>
                {view.rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No in-services in this period.</td></tr>}
                {view.rows.map(r => (
                  <tr key={r.s.id} className="border-b border-slate-50 dark:border-slate-800">
                    <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{fmtShort(r.s.session_date)}</td>
                    <td className="px-4 py-2 text-slate-800 dark:text-slate-100">{r.s.title}</td>
                    <td className="px-4 py-2 text-slate-500">{typeLabel(r.s.session_type)}</td>
                    <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-300">{r.hours || ''}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBadge[r.status][1]}`}>{statusBadge[r.status][0]}</span>
                      {r.notes && <div className="text-xs text-slate-400 mt-0.5">{r.notes}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
