// Education: in-service sessions, attendance (Present / Absent / Excused),
// makeups, yearly requirements, and QR check-in.
// Staff Development (Education edit) runs everything; a department Manager
// marks attendance and makeups for their own people; everyone sees their own
// record. The database enforces the same (20261107_education.sql).
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { getOrgDepartments } from '../../lib/departments'
import { Plus, X, Loader2, Check, Printer, QrCode, GraduationCap, ClipboardCheck, AlertCircle,
         CalendarDays, Users, ListChecks, Settings, Trash2, Pencil, ChevronLeft } from 'lucide-react'
import { printQrPoster, printSignInSheet, printCompliance, fmtDay, fmtTime } from './eduPrint'

const SESSION_TYPES = [
  { key: 'mandatory',   label: 'Mandatory' },
  { key: 'department',  label: 'Department' },
  { key: 'educational', label: 'Educational activity (optional, no makeups)' },
  { key: 'orientation', label: 'New-hire orientation' },
  { key: 'makeup',      label: 'Makeup session' },
]
// Suggested topics; sessions and requirements can use any text
const TOPIC_SUGGESTIONS = ['Abuse & neglect', 'Dementia care', 'Infection prevention', 'Resident rights',
  'HIPAA', 'Fire safety', 'Emergency preparedness', 'QAPI', 'Pressure injury prevention', 'Trauma-informed care']
const STATUS = {
  present: { label: 'P', name: 'Present', on: 'bg-green-600 text-white border-green-600' },
  absent:  { label: 'A', name: 'Absent',  on: 'bg-red-600 text-white border-red-600' },
  excused: { label: 'E', name: 'Excused', on: 'bg-amber-500 text-white border-amber-500' },
}
const MAKEUP_METHODS = [
  { key: 'read_and_sign',  label: 'Read and sign' },
  { key: 'makeup_session', label: 'Makeup session' },
  { key: 'other',          label: 'Other' },
]

const inputCls = 'w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500'
const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5'
const today = () => new Date().toLocaleDateString('en-CA')
const fullName = (p) => `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()

// Same rule as edu_session_roster() in the database
function isRequired(session, p) {
  if (p.hire_date && p.hire_date > session.session_date) return false
  if (p.employment_end_date && p.employment_end_date < session.session_date) return false
  if (!p.is_active && !p.employment_end_date) return false
  if (session.audience === 'all') return true
  const depts = [p.department, ...(p.departments || [])]
  return depts.some(d => d && session.audience_departments.includes(d))
}

function requirementApplies(req, p) {
  if (!req.departments?.length) return true
  return [p.department, ...(p.departments || [])].some(d => d && req.departments.includes(d))
}

function TopicPicker({ value, onChange, disabled }) {
  const [draft, setDraft] = useState('')
  const add = (t) => { const v = t.trim(); if (v && !value.includes(v)) onChange([...value, v]); setDraft('') }
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map(t => (
          <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 text-xs">
            {t}{!disabled && <button type="button" onClick={() => onChange(value.filter(x => x !== t))}><X size={11} /></button>}
          </span>
        ))}
      </div>
      {!disabled && (
        <>
          <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Add a topic and press Enter"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(draft) } }} className={inputCls} />
          <div className="flex flex-wrap gap-1 mt-1.5">
            {TOPIC_SUGGESTIONS.filter(t => !value.includes(t)).map(t => (
              <button key={t} type="button" onClick={() => add(t)} className="text-[11px] px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">+ {t}</button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function DeptChips({ departments, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {departments.map(d => {
        const on = value.includes(d.key)
        return (
          <button key={d.key} type="button" onClick={() => onChange(on ? value.filter(x => x !== d.key) : [...value, d.key])}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium ${on ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
            {d.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Session form ──────────────────────────────────────────────
function SessionModal({ session, departments, orgId, sessions, onClose, onSaved }) {
  const isNew = !session?.id
  const [form, setForm] = useState({
    title: session?.title || '', session_type: session?.session_type || 'mandatory',
    session_date: session?.session_date || today(), start_time: session?.start_time?.slice(0, 5) || '',
    hours: session?.hours ?? 1, instructor: session?.instructor || '', location: session?.location || '',
    audience: session?.audience || 'all', audience_departments: session?.audience_departments || [],
    topics: session?.topics || [], notes: session?.notes || '', makeup_for: session?.makeup_for || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    if (!form.title.trim()) { setError('Give the session a title.'); return }
    if (form.audience === 'departments' && !form.audience_departments.length) { setError('Pick at least one department, or choose Everyone.'); return }
    setSaving(true); setError('')
    const payload = {
      ...form, organization_id: orgId, title: form.title.trim(),
      start_time: form.start_time || null, hours: Number(form.hours) || 1,
      instructor: form.instructor.trim() || null, location: form.location.trim() || null,
      notes: form.notes.trim() || null, makeup_for: form.makeup_for || null,
      audience_departments: form.audience === 'all' ? [] : form.audience_departments,
    }
    const { error: e } = isNew
      ? await supabase.from('edu_sessions').insert(payload)
      : await supabase.from('edu_sessions').update(payload).eq('id', session.id)
    setSaving(false)
    if (e) { setError(e.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-display font-bold text-slate-800 dark:text-slate-100">{isNew ? 'New In-Service' : 'Edit In-Service'}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <div className="flex items-center gap-2 text-sm text-red-600"><AlertCircle size={14} /> {error}</div>}
          <div><label className={labelCls}>Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Infection Prevention" className={inputCls} /></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-2"><label className={labelCls}>Type</label>
              <select value={form.session_type} onChange={e => set('session_type', e.target.value)} className={inputCls}>
                {SESSION_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select></div>
            <div><label className={labelCls}>Date *</label>
              <input type="date" value={form.session_date} onChange={e => set('session_date', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Start time</label>
              <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><label className={labelCls}>CE hours</label>
              <input type="number" min="0.25" step="0.25" value={form.hours} onChange={e => set('hours', e.target.value)} className={inputCls} /></div>
            <div className="sm:col-span-2"><label className={labelCls}>Instructor</label>
              <input value={form.instructor} onChange={e => set('instructor', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Location</label>
              <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Classroom" className={inputCls} /></div>
          </div>
          {form.session_type === 'makeup' && (
            <div><label className={labelCls}>Makeup for</label>
              <select value={form.makeup_for} onChange={e => set('makeup_for', e.target.value)} className={inputCls}>
                <option value="">— Choose the missed session —</option>
                {sessions.filter(s => s.id !== session?.id && s.session_type !== 'makeup').map(s => <option key={s.id} value={s.id}>{s.title} · {s.session_date}</option>)}
              </select></div>
          )}
          <div>
            <label className={labelCls}>Who must attend</label>
            <div className="flex gap-2 mb-2">
              {[['all', 'Everyone employed that day'], ['departments', 'Only some departments']].map(([k, l]) => (
                <button key={k} type="button" onClick={() => set('audience', k)}
                  className={`px-3 py-1.5 rounded-xl border text-sm font-medium ${form.audience === k ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>{l}</button>
              ))}
            </div>
            {form.audience === 'departments' && <DeptChips departments={departments} value={form.audience_departments} onChange={v => set('audience_departments', v)} />}
          </div>
          <div><label className={labelCls}>Topics (count toward yearly requirements)</label>
            <TopicPicker value={form.topics} onChange={v => set('topics', v)} /></div>
          <div><label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={`${inputCls} resize-none`} /></div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 font-medium">Cancel</button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {isNew ? 'Add In-Service' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── One session: attendance grid ──────────────────────────────
function SessionDetail({ session, people, attendance, isAdmin, managed, deptLabel, orgName, onBack, onEdit, onChanged }) {
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState('')
  const roster = people.filter(p => isRequired(session, p))
  const marks = new Map(attendance.filter(a => a.session_id === session.id).map(a => [a.profile_id, a]))
  // Walk-ins: marked but not on the required list
  const extras = people.filter(p => marks.has(p.profile_id) && !roster.includes(p))
  const canMark = (p) => isAdmin || [p.department, ...(p.departments || [])].some(d => managed.includes(d))
  const counts = roster.reduce((c, p) => { const s = marks.get(p.profile_id)?.status || 'unmarked'; c[s]++; return c },
    { present: 0, absent: 0, excused: 0, unmarked: 0 })

  async function mark(p, status) {
    setSaving(p.profile_id); setError('')
    const cur = marks.get(p.profile_id)
    const { error: e } = cur?.status === status
      ? await supabase.from('edu_attendance').delete().eq('session_id', session.id).eq('profile_id', p.profile_id)
      : await supabase.from('edu_attendance').upsert({ session_id: session.id, profile_id: p.profile_id,
          organization_id: session.organization_id, status, method: 'manual' })
    setSaving(null)
    if (e) setError(e.message); else onChanged()
  }

  async function markAllUnmarked(status) {
    const rows = roster.filter(p => !marks.has(p.profile_id) && canMark(p))
      .map(p => ({ session_id: session.id, profile_id: p.profile_id, organization_id: session.organization_id, status, method: 'manual' }))
    if (!rows.length) return
    setSaving('all'); setError('')
    const { error: e } = await supabase.from('edu_attendance').upsert(rows)
    setSaving(null)
    if (e) setError(e.message); else onChanged()
  }

  async function qrPoster() {
    const { data, error: e } = await supabase.from('edu_checkin_tokens').select('token').eq('session_id', session.id).maybeSingle()
    if (e || !data) { setError('Could not load the check-in code.'); return }
    printQrPoster(session, data.token, orgName)
  }

  const Row = ({ p }) => {
    const cur = marks.get(p.profile_id)
    return (
      <tr className="border-b border-slate-50 dark:border-slate-800">
        <td className="py-2 pr-3">
          <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{p.last_name}, {p.first_name}</div>
          <div className="text-xs text-slate-400">{deptLabel(p)}{!p.is_active ? ' · former' : ''}{cur?.method === 'qr' ? ' · checked in by QR' : ''}</div>
        </td>
        <td className="py-2 text-right whitespace-nowrap">
          {Object.entries(STATUS).map(([k, s]) => (
            <button key={k} disabled={!canMark(p) || saving === p.profile_id} onClick={() => mark(p, k)} title={s.name}
              className={`w-8 h-8 ml-1 rounded-lg border text-xs font-bold disabled:opacity-40 ${cur?.status === k ? s.on : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              {s.label}
            </button>
          ))}
        </td>
      </tr>
    )
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-brand-600 hover:underline"><ChevronLeft size={15} /> All sessions</button>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-slate-800 dark:text-slate-100">{session.title}</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {fmtDay(session.session_date)}{session.start_time ? ` · ${fmtTime(session.start_time)}` : ''} · {Number(session.hours)} CE hour{Number(session.hours) === 1 ? '' : 's'}
              {session.instructor ? ` · ${session.instructor}` : ''}{session.location ? ` · ${session.location}` : ''}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {session.audience === 'all' ? 'Everyone employed that day' : session.audience_departments.map(d => deptLabel({ department: d })).join(', ')}
              {session.topics?.length ? ` · Topics: ${session.topics.join(', ')}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdmin && <button onClick={qrPoster} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><QrCode size={14} /> Print QR poster</button>}
            <button onClick={() => printSignInSheet(session, roster, orgName, deptLabel)} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><Printer size={14} /> Sign-in sheet</button>
            {isAdmin && <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><Pencil size={14} /> Edit</button>}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          <span className="text-green-700 dark:text-green-400 font-medium">{counts.present} present</span>
          <span className="text-red-600 dark:text-red-400 font-medium">{counts.absent} absent</span>
          <span className="text-amber-600 dark:text-amber-400 font-medium">{counts.excused} excused</span>
          <span className="text-slate-400">{counts.unmarked} not marked</span>
          <span className="text-slate-400">of {roster.length} required</span>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 text-sm text-red-600"><AlertCircle size={14} /> {error}</div>}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 mr-auto">Attendance</span>
          <span className="text-xs text-slate-400">Mark everyone not yet marked:</span>
          <button onClick={() => markAllUnmarked('present')} disabled={saving === 'all'} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900">All P</button>
          <button onClick={() => markAllUnmarked('absent')} disabled={saving === 'all'} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900">All A</button>
        </div>
        {roster.length === 0 ? <p className="text-sm text-slate-400 py-6 text-center">No one is required for this session.</p> : (
          <table className="w-full"><tbody>{roster.map(p => <Row key={p.profile_id} p={p} />)}</tbody></table>
        )}
        {extras.length > 0 && (
          <>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-5 mb-1">Also attended (not required)</p>
            <table className="w-full"><tbody>{extras.map(p => <Row key={p.profile_id} p={p} />)}</tbody></table>
          </>
        )}
        <p className="text-xs text-slate-400 mt-3">Tap a letter again to clear it. Absent and Excused go on the makeup list.</p>
      </div>
    </div>
  )
}

// ── Makeups owed ──────────────────────────────────────────────
function MakeupsTab({ owed, done, isAdmin, managed, deptLabel, onChanged }) {
  const [recording, setRecording] = useState(null)
  const [form, setForm] = useState({ completed_on: today(), method: 'read_and_sign', notes: '' })
  const [error, setError] = useState('')
  const canRecord = (p) => isAdmin || [p.department, ...(p.departments || [])].some(d => managed.includes(d))

  async function save() {
    setError('')
    const { error: e } = await supabase.from('edu_makeups').insert({
      organization_id: recording.session.organization_id, session_id: recording.session.id,
      profile_id: recording.person.profile_id, completed_on: form.completed_on, method: form.method,
      notes: form.notes.trim() || null,
    })
    if (e) { setError(e.message); return }
    setRecording(null); onChanged()
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200">Makeups owed ({owed.length})</div>
        {owed.length === 0 ? <p className="text-sm text-slate-400 py-8 text-center">Nobody owes a makeup.</p> : owed.map(({ session, person, status }) => (
          <div key={session.id + person.profile_id} className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 dark:border-slate-800 last:border-0">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{person.last_name}, {person.first_name} <span className="text-xs text-slate-400 font-normal">· {deptLabel(person)}</span></div>
              <div className="text-xs text-slate-500">{session.title} · {session.session_date} · {Number(session.hours)} hr · <span className={status === 'excused' ? 'text-amber-600' : 'text-red-600'}>{STATUS[status].name}</span></div>
            </div>
            {canRecord(person) && (
              <button onClick={() => { setRecording({ session, person }); setForm({ completed_on: today(), method: 'read_and_sign', notes: '' }) }}
                className="px-3 py-1.5 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg">Record makeup</button>
            )}
          </div>
        ))}
      </div>
      {done.length > 0 && (
        <details className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <summary className="px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">Completed makeups ({done.length})</summary>
          {done.map(m => (
            <div key={m.id} className="px-5 py-2 border-t border-slate-50 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300">
              {m.personName} · {m.sessionTitle} · done {m.completed_on} ({MAKEUP_METHODS.find(x => x.key === m.method)?.label})
            </div>
          ))}
        </details>
      )}
      {recording && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-display font-bold text-slate-800 dark:text-slate-100">Record makeup</h3>
            <p className="text-sm text-slate-500">{fullName(recording.person)} · {recording.session.title}</p>
            {error && <div className="flex items-center gap-2 text-sm text-red-600"><AlertCircle size={14} /> {error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Completed</label><input type="date" value={form.completed_on} onChange={e => setForm(f => ({ ...f, completed_on: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>How</label>
                <select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))} className={inputCls}>
                  {MAKEUP_METHODS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select></div>
            </div>
            <div><label className={labelCls}>Notes</label><input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} /></div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setRecording(null)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
              <button onClick={save} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Yearly requirements ───────────────────────────────────────
function RequirementsTab({ requirements, departments, deptLabel, canSettings, orgId, onChanged }) {
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  async function save() {
    if (!editing.name.trim()) { setError('Name the requirement.'); return }
    const payload = { organization_id: orgId, name: editing.name.trim(), departments: editing.departments,
      required_hours: editing.required_hours === '' || editing.required_hours == null ? null : Number(editing.required_hours),
      required_topics: editing.required_topics }
    const { error: e } = editing.id
      ? await supabase.from('edu_requirements').update(payload).eq('id', editing.id)
      : await supabase.from('edu_requirements').insert(payload)
    if (e) { setError(e.message); return }
    setEditing(null); onChanged()
  }
  async function remove(r) {
    if (!window.confirm(`Remove the requirement "${r.name}"?`)) return
    await supabase.from('edu_requirements').update({ is_active: false }).eq('id', r.id)
    onChanged()
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500 dark:text-slate-400">What each person needs each calendar year. Hours count sessions attended plus completed makeups. Federal rules require at least 12 hours a year for nurse aides, including dementia and abuse prevention training (42 CFR 483.95).</p>
      {canSettings && <button onClick={() => { setEditing({ name: '', departments: [], required_hours: '', required_topics: [] }); setError('') }}
        className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl"><Plus size={15} /> Add requirement</button>}
      {requirements.length === 0 && <p className="text-sm text-slate-400 py-6 text-center">No requirements yet.</p>}
      {requirements.map(r => (
        <div key={r.id} className="flex items-start gap-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4">
          <div className="flex-1">
            <div className="font-medium text-slate-800 dark:text-slate-100">{r.name}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {r.departments.length ? r.departments.map(d => deptLabel({ department: d })).join(', ') : 'Everyone'}
              {r.required_hours ? ` · ${Number(r.required_hours)} hours` : ''}
              {r.required_topics.length ? ` · Topics: ${r.required_topics.join(', ')}` : ''}
            </div>
          </div>
          {canSettings && <>
            <button onClick={() => { setEditing({ ...r, required_hours: r.required_hours ?? '' }); setError('') }} className="p-1.5 text-slate-400 hover:text-slate-700"><Pencil size={14} /></button>
            <button onClick={() => remove(r)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
          </>}
        </div>
      ))}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display font-bold text-slate-800 dark:text-slate-100">{editing.id ? 'Edit requirement' : 'New requirement'}</h3>
            {error && <div className="flex items-center gap-2 text-sm text-red-600"><AlertCircle size={14} /> {error}</div>}
            <div><label className={labelCls}>Name</label><input value={editing.name} onChange={e => setEditing(x => ({ ...x, name: e.target.value }))} placeholder="e.g. Nursing yearly in-service" className={inputCls} /></div>
            <div><label className={labelCls}>Applies to (none picked = everyone)</label><DeptChips departments={departments} value={editing.departments} onChange={v => setEditing(x => ({ ...x, departments: v }))} /></div>
            <div><label className={labelCls}>Hours per year</label><input type="number" min="0.5" step="0.5" value={editing.required_hours} onChange={e => setEditing(x => ({ ...x, required_hours: e.target.value }))} className={inputCls} /></div>
            <div><label className={labelCls}>Required topics</label><TopicPicker value={editing.required_topics} onChange={v => setEditing(x => ({ ...x, required_topics: v }))} /></div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
              <button onClick={save} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────
export default function Education() {
  const { profile, organization, can } = useAuth()
  const isAdmin = can('education', 'edit')
  const canViewAll = can('education', 'view')
  const canSettings = can('education', 'settings')
  const departments = getOrgDepartments(organization)
  const deptLabel = (p) => {
    const keys = [...new Set([...(p.departments || []), p.department].filter(Boolean))]
    return keys.map(k => departments.find(d => d.key === k)?.label || k).join(', ') || '—'
  }

  const [tab, setTab] = useState('mine')
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState([])
  const [attendance, setAttendance] = useState([])
  const [makeups, setMakeups] = useState([])
  const [requirements, setRequirements] = useState([])
  const [people, setPeople] = useState([])
  const [managed, setManaged] = useState([])
  const [openSession, setOpenSession] = useState(null)
  const [editSession, setEditSession] = useState(null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [deptFilter, setDeptFilter] = useState('')
  const [behindOnly, setBehindOnly] = useState(false)

  const isManager = managed.length > 0
  const seesOthers = isAdmin || canViewAll || isManager

  useEffect(() => { fetchAll() }, [])
  useEffect(() => { if (seesOthers && tab === 'mine' && !loading) setTab('sessions') }, [seesOthers, loading])

  async function fetchAll() {
    const [s, a, m, r, p, md] = await Promise.all([
      supabase.from('edu_sessions').select('*').eq('organization_id', organization.id).eq('is_active', true).order('session_date', { ascending: false }),
      supabase.from('edu_attendance').select('session_id, profile_id, status, method').eq('organization_id', organization.id),
      supabase.from('edu_makeups').select('*').eq('organization_id', organization.id),
      supabase.from('edu_requirements').select('*').eq('organization_id', organization.id).eq('is_active', true).order('name'),
      supabase.rpc('edu_people'),
      supabase.rpc('edu_my_managed_departments'),
    ])
    setSessions(s.data || [])
    setAttendance(a.data || [])
    setMakeups(m.data || [])
    setRequirements(r.data || [])
    setPeople(p.data || [])
    setManaged(md.data || [])
    setLoading(false)
  }

  const peopleById = useMemo(() => new Map(people.map(p => [p.profile_id, p])), [people])
  const markMap = useMemo(() => new Map(attendance.map(a => [`${a.session_id}|${a.profile_id}`, a])), [attendance])
  const makeupMap = useMemo(() => new Map(makeups.map(m => [`${m.session_id}|${m.profile_id}`, m])), [makeups])

  // Absent or Excused on a session they were required at, with no makeup yet.
  // Educational activities are optional: they earn hours but never owe a makeup.
  const owed = useMemo(() => {
    const out = []
    for (const s of sessions) {
      if (s.session_type === 'makeup' || s.session_type === 'educational') continue
      for (const a of attendance) {
        if (a.session_id !== s.id || a.status === 'present') continue
        const person = peopleById.get(a.profile_id)
        if (!person || !isRequired(s, person) || makeupMap.has(`${s.id}|${a.profile_id}`)) continue
        out.push({ session: s, person, status: a.status })
      }
    }
    return out.sort((x, y) => x.person.last_name.localeCompare(y.person.last_name) || x.session.session_date.localeCompare(y.session.session_date))
  }, [sessions, attendance, peopleById, makeupMap])

  // Hours and topics per person for the chosen year
  // A makeup class that made up a missed session earns that session's hours,
  // so its own hours aren't counted again
  const usedForMakeup = useMemo(() => new Set(makeups.filter(m => m.makeup_session_id).map(m => `${m.makeup_session_id}|${m.profile_id}`)), [makeups])
  const compliance = useMemo(() => {
    const inYear = sessions.filter(s => s.session_date.startsWith(String(year)))
    return people.map(p => {
      let hours = 0
      const topics = new Set()
      for (const s of inYear) {
        const a = markMap.get(`${s.id}|${p.profile_id}`)
        const m = makeupMap.get(`${s.id}|${p.profile_id}`)
        if ((a?.status === 'present' && !usedForMakeup.has(`${s.id}|${p.profile_id}`)) || m) { hours += Number(s.hours); s.topics.forEach(t => topics.add(t.toLowerCase())) }
      }
      const reqs = requirements.filter(r => requirementApplies(r, p)).map(r => {
        const missing = []
        if (r.required_hours && hours < Number(r.required_hours)) missing.push(`${Number(r.required_hours) - hours} hr short`)
        r.required_topics.filter(t => !topics.has(t.toLowerCase())).forEach(t => missing.push(t))
        return { name: r.name, met: missing.length === 0, missing }
      })
      return { p, name: `${p.last_name}, ${p.first_name}`, dept: deptLabel(p), inactive: !p.is_active, hours: Math.round(hours * 100) / 100,
        reqs, owed: owed.filter(o => o.person.profile_id === p.profile_id).length }
    })
  }, [people, sessions, markMap, makeupMap, usedForMakeup, requirements, year, owed])

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-brand-400" /></div>

  const tabs = [
    { key: 'mine', label: 'My In-services', icon: GraduationCap },
    ...(seesOthers ? [
      { key: 'sessions', label: 'Sessions', icon: CalendarDays },
      { key: 'makeups', label: `Makeups${owed.length ? ` (${owed.length})` : ''}`, icon: ClipboardCheck },
      { key: 'compliance', label: 'Compliance', icon: Users },
    ] : []),
    ...(canSettings || canViewAll ? [{ key: 'requirements', label: 'Requirements', icon: Settings }] : []),
  ]

  const mine = compliance.find(c => c.p.profile_id === profile.id)
  const myRows = sessions.filter(s => markMap.has(`${s.id}|${profile.id}`) || makeupMap.has(`${s.id}|${profile.id}`) || (peopleById.get(profile.id) && isRequired(s, peopleById.get(profile.id)) && s.session_date <= today()))
  const shownCompliance = compliance
    .filter(c => !deptFilter || [c.p.department, ...(c.p.departments || [])].includes(deptFilter))
    .filter(c => !behindOnly || c.reqs.some(q => !q.met) || c.owed)

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800 dark:text-slate-100">Education</h1>
          <p className="text-slate-500 text-sm mt-0.5">In-services, attendance, makeups, and yearly training</p>
        </div>
        {isAdmin && !openSession && (
          <button onClick={() => setEditSession({})} className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl shadow-sm">
            <Plus size={16} /> New In-Service
          </button>
        )}
      </div>

      {!openSession && (
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit flex-wrap">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium ${tab === t.key ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>
      )}

      {openSession ? (
        <SessionDetail session={sessions.find(s => s.id === openSession) || {}} people={people} attendance={attendance}
          isAdmin={isAdmin} managed={managed} deptLabel={deptLabel} orgName={organization?.name || ''}
          onBack={() => setOpenSession(null)} onEdit={() => setEditSession(sessions.find(s => s.id === openSession))} onChanged={fetchAll} />
      ) : tab === 'mine' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-brand-50 dark:bg-brand-950/40 rounded-2xl p-4"><div className="text-3xl font-display font-bold text-brand-600">{mine?.hours ?? 0}</div><div className="text-xs text-slate-500">CE hours in {year}</div></div>
            <div className="bg-amber-50 dark:bg-amber-950/40 rounded-2xl p-4"><div className="text-3xl font-display font-bold text-amber-600">{mine?.owed ?? 0}</div><div className="text-xs text-slate-500">Makeups owed</div></div>
            {mine?.reqs.map(q => (
              <div key={q.name} className={`rounded-2xl p-4 ${q.met ? 'bg-green-50 dark:bg-green-950/40' : 'bg-red-50 dark:bg-red-950/40'}`}>
                <div className={`text-sm font-semibold ${q.met ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>{q.met ? 'On track' : 'Behind'}</div>
                <div className="text-xs text-slate-500">{q.name}{q.missing.length ? `: ${q.missing.join('; ')}` : ''}</div>
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            {myRows.length === 0 ? <p className="text-sm text-slate-400 py-10 text-center">No in-services yet.</p> : myRows.map(s => {
              const a = markMap.get(`${s.id}|${profile.id}`)
              const m = makeupMap.get(`${s.id}|${profile.id}`)
              return (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 dark:border-slate-800 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{s.title}</div>
                    <div className="text-xs text-slate-400">{s.session_date} · {Number(s.hours)} hr</div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m ? 'bg-green-50 text-green-700' : a ? (a.status === 'present' ? 'bg-green-50 text-green-700' : a.status === 'excused' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700') : 'bg-slate-100 text-slate-500'}`}>
                    {m ? 'Made up' : a ? STATUS[a.status].name : 'Not marked'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ) : tab === 'sessions' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          {sessions.length === 0 ? <p className="text-sm text-slate-400 py-10 text-center">No in-services yet.{isAdmin ? ' Click "New In-Service" to add one.' : ''}</p> : sessions.map(s => {
            const req = people.filter(p => isRequired(s, p))
            const c = req.reduce((acc, p) => { const st = markMap.get(`${s.id}|${p.profile_id}`)?.status; acc[st || 'none']++; return acc }, { present: 0, absent: 0, excused: 0, none: 0 })
            return (
              <button key={s.id} onClick={() => setOpenSession(s.id)} className="w-full flex items-center gap-3 px-5 py-3 border-b border-slate-50 dark:border-slate-800 last:border-0 text-left hover:bg-slate-50 dark:hover:bg-slate-800">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{s.title}</div>
                  <div className="text-xs text-slate-400">
                    {s.session_date}{s.start_time ? ` · ${fmtTime(s.start_time)}` : ''} · {SESSION_TYPES.find(t => t.key === s.session_type)?.label} · {Number(s.hours)} hr
                    · {s.audience === 'all' ? 'Everyone' : s.audience_departments.map(d => departments.find(x => x.key === d)?.label || d).join(', ')}
                  </div>
                </div>
                <div className="text-xs text-right whitespace-nowrap">
                  <span className="text-green-700 dark:text-green-400 font-semibold">{c.present} P</span>
                  <span className="text-red-600 dark:text-red-400 font-semibold ml-2">{c.absent} A</span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold ml-2">{c.excused} E</span>
                  {c.none > 0 && <span className="text-slate-400 ml-2">{c.none} unmarked</span>}
                </div>
              </button>
            )
          })}
        </div>
      ) : tab === 'makeups' ? (
        <MakeupsTab owed={owed} isAdmin={isAdmin} managed={managed} deptLabel={deptLabel} onChanged={fetchAll}
          done={makeups.map(m => ({ ...m, personName: fullName(peopleById.get(m.profile_id) || {}), sessionTitle: sessions.find(s => s.id === m.session_id)?.title || '' }))} />
      ) : tab === 'compliance' ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-slate-100">
              {[0, 1, 2].map(i => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-slate-100">
              <option value="">All departments</option>
              {departments.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
            <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300"><input type="checkbox" checked={behindOnly} onChange={e => setBehindOnly(e.target.checked)} className="rounded" /> Behind only</label>
            <button onClick={() => printCompliance(shownCompliance, { orgName: organization?.name || '', year, requirements })}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><Printer size={14} /> Print</button>
          </div>
          {!requirements.length && <p className="text-xs text-amber-700 dark:text-amber-400">No yearly requirements are set yet{canSettings ? ' (Requirements tab)' : ''}, so only hours are shown.</p>}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-2">Name</th><th className="px-4 py-2">Department</th><th className="px-4 py-2">Hours</th><th className="px-4 py-2">Requirements</th><th className="px-4 py-2">Makeups owed</th></tr></thead>
              <tbody>
                {shownCompliance.map(c => (
                  <tr key={c.p.profile_id} className="border-b border-slate-50 dark:border-slate-800">
                    <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{c.name}{c.inactive && <span className="text-xs text-slate-400"> (former)</span>}</td>
                    <td className="px-4 py-2 text-slate-500">{c.dept}</td>
                    <td className="px-4 py-2">{c.hours}</td>
                    <td className="px-4 py-2">{c.reqs.length ? c.reqs.map(q => (
                      <div key={q.name} className={q.met ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{q.met ? '✓' : '✗'} {q.name}{q.missing.length ? <span className="text-xs text-slate-400"> ({q.missing.join('; ')})</span> : ''}</div>
                    )) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-2">{c.owed || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'requirements' ? (
        <RequirementsTab requirements={requirements} departments={departments} deptLabel={deptLabel} canSettings={canSettings} orgId={organization.id} onChanged={fetchAll} />
      ) : null}

      {editSession && (
        <SessionModal session={editSession} departments={departments} orgId={organization.id} sessions={sessions}
          onClose={() => setEditSession(null)} onSaved={() => { setEditSession(null); fetchAll() }} />
      )}
    </div>
  )
}
