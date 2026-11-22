// Import past in-service attendance from a CSV (a spreadsheet or another
// system such as Nebula's attendance tracker): one row per person per session.
// Sessions are matched to existing ones by date + title, so running the same
// file again only adds what's missing; marks already in ElderLoop are never
// changed. People are matched by name (department breaks ties). Absent and
// Excused are kept only for people who had to attend (hired by then, not yet
// gone, in the session's departments); optional sessions keep only Present.
import { useState, useRef, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { X, Upload, Loader2, Check, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { isRequired, deptsOf } from './eduRules'

const FIELDS = {
  date:   ['date', 'session date', 'event date', 'class date', 'in-service date', 'inservice date'],
  title:  ['session', 'session name', 'event', 'event name', 'class', 'class name', 'title', 'in-service', 'inservice', 'course'],
  type:   ['type', 'event type', 'session type', 'category'],
  name:   ['name', 'employee', 'employee name', 'person', 'staff', 'staff name', 'full name'],
  first:  ['first name', 'first', 'firstname'],
  last:   ['last name', 'last', 'lastname', 'surname'],
  dept:   ['department', 'dept'],
  status: ['status', 'attendance', 'result', 'attended'],
  hire:   ['hire date', 'hired', 'date of hire'],
  end:    ['end date', 'termination date', 'term date', 'separation date'],
  hours:  ['hours', 'ce hours', 'ceu', 'ceus', 'credit hours', 'contact hours'],
}
const fieldFor = (h) => {
  const k = h.toLowerCase().replace(/^﻿/, '').trim()
  return Object.keys(FIELDS).find(f => FIELDS[f].includes(k)) || null
}

// Quote-aware CSV parser (same as the staff and work order importers)
function parseCSV(text) {
  const rows = []
  let row = [], cur = '', inQ = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') inQ = false
      else cur += ch
    } else if (ch === '"') inQ = true
    else if (ch === ',') { row.push(cur.trim()); cur = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cur.trim()); rows.push(row); row = []; cur = ''
    } else cur += ch
  }
  if (cur || row.length) { row.push(cur.trim()); rows.push(row) }
  return rows.filter(r => r.some(v => v))
}

function parseDate(v) {
  const s = (v || '').trim()
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)
  if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  return null
}

function parseStatus(v) {
  const s = (v || '').trim().toLowerCase()
  if (['present', 'p', 'attended', 'yes', 'y', 'x', 'complete', 'completed'].includes(s)) return 'present'
  if (['absent', 'a', 'no', 'n', 'missed', 'no show', 'no-show'].includes(s)) return 'absent'
  if (['excused', 'e', 'exc', 'pto', 'leave', 'vacation'].includes(s)) return 'excused'
  return null
}

const tokens = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, ' ').trim().split(' ').filter(Boolean)

// Department text from another system → one of this community's departments
function guessDept(text, departments) {
  const t = (text || '').toLowerCase().trim()
  if (!t) return ''
  const has = (k) => departments.some(d => d.key === k) ? k : ''
  const direct = departments.find(d => d.key === t || d.label.toLowerCase() === t)
  if (direct) return direct.key
  const rules = [
    [/nurs|\bcna\b|\brn\b|\blpn\b|\blvn\b|\bcmt\b|\bcma\b|med(ication)? aide|l1ma|medical records|\bmds\b/, 'nursing'],
    [/housekeep|laundry|environmental/, 'housekeeping'],
    [/dietary|kitchen|food|culinary|dining/, 'dietary'],
    [/maint|facilit/, 'maintenance'],
    [/activit|life enrich/, 'activities'],
    [/chap|pastor|spiritual/, 'chapel'],
    [/social/, 'social_services'],
    [/secur/, 'security'],
    [/supply/, 'central_supply'],
    [/transport|driver/, 'transportation'],
    [/\bhr\b|human res/, 'hr'],
    [/admin|office|business|reception/, 'administration'],
  ]
  for (const [re, key] of rules) if (re.test(t)) return has(key)
  return ''
}

// Type text ("Mandatory All Staff", "All Nursing", "Non-Nursing Staff") → session settings
function guessType(text, departments) {
  const t = (text || '').toLowerCase()
  const all = { audience: 'all', audience_departments: [] }
  if (/educational|optional/.test(t)) return { session_type: 'educational', ...all }
  if (/orientation/.test(t)) return { session_type: 'orientation', ...all }
  if (/non[- ]?nurs/.test(t)) return { session_type: 'mandatory', audience: 'departments', audience_departments: departments.map(d => d.key).filter(k => k !== 'nursing') }
  const dept = guessDept(t.replace(/\b(all|staff|mandatory|meeting)\b/g, ' '), departments)
  if (dept) return { session_type: 'department', audience: 'departments', audience_departments: [dept] }
  return { session_type: 'mandatory', ...all }
}

function matchPerson(nameToks, deptKey, people) {
  const found = []
  for (const p of people) {
    const L = tokens(p.last_name), F = tokens(p.first_name)
    if (!L.length || !F.length || !L.every(t => nameToks.includes(t))) continue
    if (nameToks.includes(F[0])) found.push({ p, close: false })
    else if (F[0].length >= 3 && nameToks.some(t => t.length >= 3 && t.slice(0, 3) === F[0].slice(0, 3))) found.push({ p, close: true })
  }
  let pool = found.some(f => !f.close) ? found.filter(f => !f.close) : found
  if (pool.length > 1 && deptKey) {
    const same = pool.filter(f => deptsOf(f.p).includes(deptKey))
    if (same.length) pool = same
  }
  return pool.length === 1 ? { id: pool[0].p.profile_id, close: pool[0].close } : { id: '', close: false, ambiguous: pool.length > 1 }
}

const inputCls = 'px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-100'
const RANK = { present: 3, excused: 2, absent: 1 }

function SectionBox({ title, open, onToggle, children }) {
  return (
    <div className="border border-slate-100 dark:border-slate-800 rounded-xl">
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 text-left">
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />} {title}
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  )
}

function PersonPick({ value, label, people, onChange }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={`${inputCls} w-56`} aria-label={`ElderLoop match for ${label}`}>
      <option value="">Skip</option>
      {people.map(p => <option key={p.profile_id} value={p.profile_id}>{p.last_name}, {p.first_name}{p.is_active ? '' : ' (former)'}</option>)}
    </select>
  )
}

export default function EducationImport({ orgId, departments, people, sessions, markMap, canFillHireDates, onClose, onImported }) {
  const fileRef = useRef()
  const [step, setStep] = useState('upload')
  const [error, setError] = useState('')
  const [parsed, setParsed] = useState(null)        // { fileName, rows, sessionList, personList, typeList, badRows }
  const [typeMap, setTypeMap] = useState({})        // type text → { session_type, audience, audience_departments, hours }
  const [personMap, setPersonMap] = useState({})    // person key → profile_id ('' = skip)
  const [include, setInclude] = useState({})        // session key → bool
  const [owesMakeups, setOwesMakeups] = useState(false)
  const [fillHire, setFillHire] = useState(true)
  const [openList, setOpenList] = useState({})
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState(null)

  const peopleById = useMemo(() => new Map(people.map(p => [p.profile_id, p])), [people])
  const existingByKey = useMemo(() => new Map(sessions.map(s => [`${s.session_date}|${s.title.trim().toLowerCase()}`, s])), [sessions])
  const sortedPeople = useMemo(() => [...people].sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)), [people])

  async function handleFile(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setError('')
    if (!/\.csv$/i.test(f.name)) { setError('Choose a .csv file. In Excel: File → Save As → "CSV (Comma delimited)".'); return }
    const grid = parseCSV(await f.text())
    if (grid.length < 2) { setError('That file has no rows.'); return }
    const fields = grid[0].map(fieldFor)
    const col = (f) => fields.indexOf(f)
    if (col('date') < 0 || col('title') < 0 || col('status') < 0 || (col('name') < 0 && (col('first') < 0 || col('last') < 0))) {
      setError('The file needs Date, Session, Status and Name (or First Name and Last Name) columns.'); return
    }
    const get = (r, f) => col(f) >= 0 ? (r[col(f)] || '').trim() : ''
    const rows = [], sessionMap = new Map(), personMapLocal = new Map(), typeSet = new Map()
    let badRows = 0
    for (const r of grid.slice(1)) {
      const nameText = get(r, 'name') || `${get(r, 'last')} ${get(r, 'first')}`.trim()
      if (!nameText) { badRows++; continue }
      const deptText = get(r, 'dept')
      const pKey = `${tokens(nameText).join(' ')}|${deptText.toLowerCase()}`
      const person = personMapLocal.get(pKey) || { key: pKey, nameText, deptText, deptKey: guessDept(deptText, departments), toks: tokens(nameText), hires: [], rows: 0 }
      person.hires.push({ hire: parseDate(get(r, 'hire')), end: parseDate(get(r, 'end')) })
      personMapLocal.set(pKey, person)
      const date = parseDate(get(r, 'date')), title = get(r, 'title'), status = parseStatus(get(r, 'status'))
      if (!date || !title) { if (get(r, 'date') || title) badRows++; continue }   // person-only rows just carry hire dates
      if (!status) { badRows++; continue }
      const typeText = get(r, 'type')
      const sKey = `${date}|${title.toLowerCase()}`
      const s = sessionMap.get(sKey) || { key: sKey, date, title, typeText, rows: 0, hours: null, existing: existingByKey.get(sKey) || null }
      s.rows++
      const h = parseFloat(get(r, 'hours'))
      if (h > 0 && h <= 24 && !s.hours) s.hours = h
      sessionMap.set(sKey, s)
      typeSet.set(typeText, (typeSet.get(typeText) || 0) + 1)
      person.rows++
      rows.push({ sKey, pKey, status })
    }
    if (!rows.length) { setError('No rows had a date, session, and a Present / Absent / Excused status.'); return }
    const personList = [...personMapLocal.values()].map(p => {
      const current = p.hires.find(h => !h.end)
      const hireDates = p.hires.map(h => h.hire).filter(Boolean).sort()
      return { ...p, former: !current, fileHire: current?.hire || hireDates[hireDates.length - 1] || null, match: matchPerson(p.toks, p.deptKey, people) }
    }).sort((a, b) => a.nameText.localeCompare(b.nameText))
    const sessionList = [...sessionMap.values()].sort((a, b) => a.date.localeCompare(b.date))
    const typeList = [...typeSet.keys()]
    setParsed({ fileName: f.name, rows, sessionList, personList, typeList, badRows })
    setTypeMap(Object.fromEntries(typeList.map(t => [t, { ...guessType(t, departments), hours: 1 }])))
    setPersonMap(Object.fromEntries(personList.map(p => [p.key, p.match.id])))
    setInclude(Object.fromEntries(sessionList.map(s => [s.key, true])))
    setStep('review')
  }

  // What the import will do with the current choices
  const plan = useMemo(() => {
    if (!parsed) return null
    const hireFor = new Map()   // profile_id → hire date from the file (only where ElderLoop has none)
    for (const pr of parsed.personList) {
      const id = personMap[pr.key]
      const p = id && peopleById.get(id)
      if (p && !p.hire_date && pr.fileHire && (!hireFor.has(id) || !pr.former)) hireFor.set(id, pr.fileHire)
    }
    const useHire = canFillHireDates && fillHire
    const effPerson = (p) => (useHire && !p.hire_date && hireFor.has(p.profile_id)) ? { ...p, hire_date: hireFor.get(p.profile_id) } : p
    const sessionCfg = new Map(parsed.sessionList.filter(s => include[s.key]).map(s => {
      const cfg = typeMap[s.typeText] || {}
      return [s.key, s.existing || { session_date: s.date, session_type: cfg.session_type, audience: cfg.audience, audience_departments: cfg.audience_departments || [] }]
    }))
    const marks = new Map()
    const skip = { already: 0, notRequired: 0, optional: 0, unmatched: 0, excluded: 0 }
    for (const r of parsed.rows) {
      const s = sessionCfg.get(r.sKey)
      if (!s) { skip.excluded++; continue }
      const id = personMap[r.pKey]
      const p = id && peopleById.get(id)
      if (!p) { skip.unmatched++; continue }
      if (r.status !== 'present') {
        if (['educational', 'makeup'].includes(s.session_type)) { skip.optional++; continue }
        if (!isRequired(s, effPerson(p))) { skip.notRequired++; continue }
      }
      if (s.id && markMap.has(`${s.id}|${id}`)) { skip.already++; continue }
      const k = `${r.sKey}|${id}`
      const prev = marks.get(k)
      if (!prev || RANK[r.status] > RANK[prev.status]) marks.set(k, { sKey: r.sKey, profile_id: id, status: r.status })
    }
    const list = [...marks.values()]
    const by = list.reduce((m, x) => { m[x.status]++; return m }, { present: 0, absent: 0, excused: 0 })
    const included = parsed.sessionList.filter(s => include[s.key])
    const mappedIds = new Set(parsed.personList.map(pr => personMap[pr.key]).filter(Boolean))
    return {
      marks: list, by, skip, hireFor: useHire ? hireFor : new Map(), hireAvailable: hireFor.size,
      newSessions: included.filter(s => !s.existing), existingSessions: included.filter(s => s.existing),
      notInFile: people.filter(p => p.is_active && !mappedIds.has(p.profile_id)),
    }
  }, [parsed, typeMap, personMap, include, fillHire, canFillHireDates, peopleById, markMap, people])

  async function runImport() {
    setStep('importing'); setError('')
    try {
      // 1. Blank hire dates, so who-had-to-attend is right for old sessions
      let hiresSet = 0
      const hires = [...plan.hireFor.entries()]
      for (let i = 0; i < hires.length; i += 10) {
        setProgress(`Filling in hire dates… ${i}/${hires.length}`)
        const res = await Promise.all(hires.slice(i, i + 10).map(([id, hire_date]) =>
          supabase.from('profiles').update({ hire_date }).eq('id', id).is('hire_date', null).select('id')))
        const bad = res.find(r => r.error)
        if (bad) throw new Error(`Hire dates: ${bad.error.message}`)
        hiresSet += res.reduce((n, r) => n + (r.data?.length || 0), 0)
      }
      // 2. New sessions
      setProgress('Creating sessions…')
      const idByKey = new Map(plan.existingSessions.map(s => [s.key, s.existing.id]))
      if (plan.newSessions.length) {
        const payload = plan.newSessions.map(s => {
          const cfg = typeMap[s.typeText]
          return {
            organization_id: orgId, title: s.title.slice(0, 200), session_type: cfg.session_type, session_date: s.date,
            hours: s.hours || Number(cfg.hours) || 1, audience: cfg.audience,
            audience_departments: cfg.audience === 'all' ? [] : cfg.audience_departments,
            track_makeups: owesMakeups, notes: `Imported from ${parsed.fileName}`,
          }
        })
        const { data, error: e } = await supabase.from('edu_sessions').insert(payload).select('id, title, session_date')
        if (e) throw new Error(`Sessions: ${e.message}`)
        data.forEach(s => idByKey.set(`${s.session_date}|${s.title.trim().toLowerCase()}`, s.id))
      }
      // 3. Old sessions in the file stop owing makeups too, unless asked
      if (!owesMakeups) {
        const ids = plan.existingSessions.filter(s => s.existing.track_makeups !== false).map(s => s.existing.id)
        if (ids.length) {
          const { error: e } = await supabase.from('edu_sessions').update({ track_makeups: false }).in('id', ids)
          if (e) throw new Error(`Sessions: ${e.message}`)
        }
      }
      // 4. Attendance; never overwrites a mark already in ElderLoop
      const rows = plan.marks.map(m => ({ session_id: idByKey.get(m.sKey), profile_id: m.profile_id, organization_id: orgId, status: m.status, method: 'import' }))
        .filter(r => r.session_id)
      for (let i = 0; i < rows.length; i += 500) {
        setProgress(`Adding attendance… ${i}/${rows.length}`)
        const { error: e } = await supabase.from('edu_attendance').upsert(rows.slice(i, i + 500), { onConflict: 'session_id,profile_id', ignoreDuplicates: true })
        if (e) throw new Error(`Attendance: ${e.message}`)
      }
      setResult({ sessions: plan.newSessions.length, updated: plan.existingSessions.length, marks: rows.length, hires: hiresSet, hiresTried: hires.length })
      setStep('done')
      onImported()
    } catch (err) {
      setError(err.message || String(err))
      setStep('review')
    }
  }

  const toggle = (id) => setOpenList(o => ({ ...o, [id]: !(o[id] ?? true) }))
  // A plain function (not a component) so open lists survive re-renders
  const personSelect = (pr) => <PersonPick value={personMap[pr.key] || ''} label={pr.nameText} people={sortedPeople} onChange={v => setPersonMap(m => ({ ...m, [pr.key]: v }))} />

  const pl = parsed?.personList || []
  const closeMatches = pl.filter(pr => pr.match.close)
  const notFoundCurrent = pl.filter(pr => !pr.match.id && !pr.former)
  const notFoundFormer = pl.filter(pr => !pr.match.id && pr.former)
  const formerMatched = pl.filter(pr => pr.match.id && !pr.match.close && pr.former && peopleById.get(pr.match.id)?.is_active)
  const matchedCount = pl.filter(pr => personMap[pr.key]).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-display font-bold text-slate-800 dark:text-slate-100">Import attendance</h2>
          <button onClick={onClose} disabled={step === 'importing'} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-sm">
          {error && <div className="flex items-start gap-2 text-red-600"><AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}</div>}

          {step === 'upload' && (
            <>
              <p className="text-slate-600 dark:text-slate-300">Bring in past in-service attendance from a spreadsheet or another system, one row per person per session. Sessions already in ElderLoop (same date and title) get only the marks they're missing, and nothing already marked here is changed, so it's safe to import the same file twice.</p>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 text-slate-600 dark:text-slate-300">
                <div className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Columns</div>
                <ul className="list-disc pl-5 space-y-0.5">
                  <li><b>Date</b>, <b>Session</b> (or Event / Class), <b>Status</b> (Present, Absent or Excused)</li>
                  <li><b>Name</b> (either order), or <b>First Name</b> and <b>Last Name</b></li>
                  <li>Optional: <b>Type</b> (e.g. "Mandatory All Staff", "All Nursing"), <b>Department</b>, <b>Hire Date</b>, <b>End Date</b>, <b>Hours</b></li>
                </ul>
              </div>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
              <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl"><Upload size={15} /> Choose CSV file</button>
            </>
          )}

          {step === 'review' && parsed && plan && (
            <>
              <p className="text-slate-600 dark:text-slate-300"><b>{parsed.fileName}</b>: {parsed.rows.length} marks across {parsed.sessionList.length} sessions and {pl.length} people{parsed.badRows ? ` (${parsed.badRows} rows without a date, session or status were left out)` : ''}.</p>

              <SectionBox open={openList.types ?? true} onToggle={() => toggle('types')} title={`Session types (${parsed.typeList.length})`}>
                <div className="space-y-3">
                  {parsed.typeList.map(t => {
                    const cfg = typeMap[t] || {}
                    const set = (k, v) => setTypeMap(m => ({ ...m, [t]: { ...m[t], [k]: v } }))
                    return (
                      <div key={t} className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-800 dark:text-slate-100 min-w-[160px]">{t || '(no type)'}</span>
                          <select value={cfg.session_type} onChange={e => set('session_type', e.target.value)} className={inputCls} aria-label={`Type for ${t}`}>
                            <option value="mandatory">Mandatory</option><option value="department">Department</option>
                            <option value="orientation">Orientation</option><option value="educational">Educational activity (optional)</option>
                          </select>
                          <select value={cfg.audience} onChange={e => set('audience', e.target.value)} className={inputCls} aria-label={`Who must attend ${t}`}>
                            <option value="all">Everyone</option><option value="departments">Only some departments</option>
                          </select>
                          <label className="flex items-center gap-1 text-xs text-slate-500">CE hours
                            <input type="number" min="0.25" step="0.25" value={cfg.hours} onChange={e => set('hours', e.target.value)} className={`${inputCls} w-16`} /></label>
                        </div>
                        {cfg.audience === 'departments' && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {departments.map(d => {
                              const on = cfg.audience_departments.includes(d.key)
                              return <button key={d.key} type="button" onClick={() => set('audience_departments', on ? cfg.audience_departments.filter(x => x !== d.key) : [...cfg.audience_departments, d.key])}
                                className={`px-2 py-0.5 rounded-md border text-xs ${on ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>{d.label}</button>
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <p className="text-xs text-slate-400">These apply to new sessions. Sessions already in ElderLoop keep their own settings.</p>
                </div>
              </SectionBox>

              <SectionBox open={openList.sessions ?? true} onToggle={() => toggle('sessions')} title={`Sessions (${plan.newSessions.length} new, ${plan.existingSessions.length} already in ElderLoop)`}>
                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                  {parsed.sessionList.map(s => (
                    <label key={s.key} className="flex items-center gap-3 py-1.5">
                      <input type="checkbox" checked={!!include[s.key]} onChange={e => setInclude(m => ({ ...m, [s.key]: e.target.checked }))} className="rounded" />
                      <span className="w-24 text-slate-500 shrink-0">{s.date}</span>
                      <span className="flex-1 text-slate-800 dark:text-slate-100">{s.title}<span className="text-xs text-slate-400"> · {s.typeText || 'no type'} · {s.rows} row{s.rows === 1 ? '' : 's'}</span></span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.existing ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' : 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'}`}>{s.existing ? 'Adds missing marks' : 'New'}</span>
                    </label>
                  ))}
                </div>
              </SectionBox>

              <SectionBox open={openList.people ?? true} onToggle={() => toggle('people')} title={`People (${matchedCount} of ${pl.length} matched)`}>
                <div className="space-y-3">
                  {closeMatches.length > 0 && (
                    <div><div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Close matches: check these ({closeMatches.length})</div>
                      {closeMatches.map(pr => <div key={pr.key} className="flex items-center gap-2 py-1"><span className="flex-1">{pr.nameText} <span className="text-xs text-slate-400">{pr.deptText}</span></span>{personSelect(pr)}</div>)}</div>
                  )}
                  {formerMatched.length > 0 && (
                    <div><div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Former in the file but active in ElderLoop: same person? ({formerMatched.length})</div>
                      {formerMatched.map(pr => <div key={pr.key} className="flex items-center gap-2 py-1"><span className="flex-1">{pr.nameText} <span className="text-xs text-slate-400">{pr.deptText} · ended {pr.hires.find(h => h.end)?.end}</span></span>{personSelect(pr)}</div>)}</div>
                  )}
                  {notFoundCurrent.length > 0 && (
                    <div><div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">Not found in ElderLoop ({notFoundCurrent.length}): pick the right person or skip</div>
                      {notFoundCurrent.map(pr => <div key={pr.key} className="flex items-center gap-2 py-1"><span className="flex-1">{pr.nameText} <span className="text-xs text-slate-400">{pr.deptText} · {pr.rows} row{pr.rows === 1 ? '' : 's'}{pr.match.ambiguous ? ' · more than one match' : ''}</span></span>{personSelect(pr)}</div>)}</div>
                  )}
                  {notFoundFormer.length > 0 && (
                    <details><summary className="text-xs font-semibold text-slate-500 cursor-pointer">Former staff not in ElderLoop: skipped ({notFoundFormer.length})</summary>
                      {notFoundFormer.map(pr => <div key={pr.key} className="flex items-center gap-2 py-1"><span className="flex-1">{pr.nameText} <span className="text-xs text-slate-400">{pr.deptText} · ended {pr.hires.find(h => h.end)?.end}</span></span>{personSelect(pr)}</div>)}</details>
                  )}
                  {plan.notInFile.length > 0 && (
                    <details><summary className="text-xs font-semibold text-slate-500 cursor-pointer">Active staff not in the file ({plan.notInFile.length})</summary>
                      <p className="text-xs text-slate-400 my-1">They'll show as "Not marked" on these sessions unless their hire date is after them. Add hire dates on their staff records where missing.</p>
                      <div className="text-xs text-slate-600 dark:text-slate-300">{plan.notInFile.map(p => `${p.last_name}, ${p.first_name}${p.hire_date ? '' : ' (no hire date)'}`).join(' · ')}</div></details>
                  )}
                  {!closeMatches.length && !notFoundCurrent.length && !formerMatched.length && <p className="text-xs text-slate-400">Everyone current in the file matched by name.</p>}
                </div>
              </SectionBox>

              <div className="space-y-2">
                <label className="flex items-start gap-2">
                  <input type="checkbox" checked={owesMakeups} onChange={e => setOwesMakeups(e.target.checked)} className="mt-0.5 rounded" />
                  <span>Absences in this file owe makeups
                    <span className="block text-xs text-slate-400">Leave off for history from a system without makeups. Absences still show in reports; you can turn makeups on for any session later.</span></span>
                </label>
                {canFillHireDates ? (
                  <label className="flex items-start gap-2">
                    <input type="checkbox" checked={fillHire} onChange={e => setFillHire(e.target.checked)} className="mt-0.5 rounded" />
                    <span>Fill in blank hire dates from the file ({plan.hireAvailable} {plan.hireAvailable === 1 ? 'person' : 'people'})
                      <span className="block text-xs text-slate-400">Only where ElderLoop has no hire date. It decides which sessions each person had to attend.</span></span>
                  </label>
                ) : plan.hireAvailable > 0 && (
                  <p className="text-xs text-slate-400">{plan.hireAvailable} matched people have no hire date in ElderLoop. An Org Admin can fill those in from this file when importing.</p>
                )}
              </div>

              <div className="rounded-xl bg-brand-50 dark:bg-brand-950/40 p-4 text-slate-700 dark:text-slate-200">
                Will add <b>{plan.newSessions.length}</b> new session{plan.newSessions.length === 1 ? '' : 's'} and <b>{plan.marks.length}</b> attendance marks
                ({plan.by.present} present, {plan.by.absent} absent, {plan.by.excused} excused){plan.hireFor.size ? <> and fill in <b>{plan.hireFor.size}</b> hire dates</> : ''}.
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Left out: {plan.skip.already} already marked in ElderLoop · {plan.skip.notRequired} Absent/Excused for people who didn't have to attend (not hired yet, already gone, or not in the session's departments) · {plan.skip.optional} absences at optional sessions · {plan.skip.unmatched} rows for people not matched · {plan.skip.excluded} rows in unchecked sessions
                </div>
              </div>
            </>
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center gap-3 py-10 text-slate-500"><Loader2 size={28} className="animate-spin text-brand-500" />{progress || 'Importing…'}</div>
          )}

          {step === 'done' && result && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-950/40 flex items-center justify-center"><Check size={24} className="text-green-600" /></div>
              <div className="font-semibold text-slate-800 dark:text-slate-100">Import finished</div>
              <p className="text-slate-500">{result.sessions} new sessions, {result.updated} existing sessions updated, {result.marks} attendance marks added
                {result.hiresTried ? `, ${result.hires} hire dates filled in` : ''}.</p>
              {result.hiresTried > result.hires && <p className="text-xs text-amber-700 dark:text-amber-400">{result.hiresTried - result.hires} hire dates weren't saved (someone filled them in already, or you can't edit staff records).</p>}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          {step === 'done' ? (
            <button onClick={onClose} className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl">Close</button>
          ) : (
            <>
              <button onClick={step === 'review' ? () => { setStep('upload'); setParsed(null) } : onClose} disabled={step === 'importing'} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 font-medium">{step === 'review' ? 'Back' : 'Cancel'}</button>
              {step === 'review' && (
                <button onClick={runImport} disabled={!plan?.marks.length && !plan?.newSessions.length}
                  className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl">
                  <Upload size={14} /> Import
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
