import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, X, Edit2, Trash2, ChevronLeft, ChevronRight,
  Clock, User, Users, AlertTriangle, Check, RefreshCw,
  Phone, Calendar, Building2, ArrowRight, Settings,
  CheckCircle2, XCircle, Repeat, AlertCircle, Filter
} from 'lucide-react'

// ── Constants ──────────────────────────────────────────────────
const DEPARTMENTS = [
  { key: 'nursing',        label: 'Nursing' },
  { key: 'dietary',        label: 'Dietary' },
  { key: 'maintenance',    label: 'Maintenance' },
  { key: 'housekeeping',   label: 'Housekeeping' },
  { key: 'transportation', label: 'Transportation' },
  { key: 'administration', label: 'Administration' },
  { key: 'activities',     label: 'Activities' },
  { key: 'security',       label: 'Security' },
]

const SHIFT_STATUSES = {
  scheduled:  { label: 'Scheduled',  color: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500' },
  completed:  { label: 'Completed',  color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  called_off: { label: 'Called Off', color: 'bg-red-100 text-red-700',     dot: 'bg-red-500' },
  no_show:    { label: 'No Show',    color: 'bg-slate-100 text-slate-500',  dot: 'bg-slate-400' },
  swapped:    { label: 'Swapped',    color: 'bg-purple-100 text-purple-700',dot: 'bg-purple-500' },
}

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const fmt12 = (t) => {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

const toDateStr = (d) => d.toISOString().split('T')[0]
const today     = () => toDateStr(new Date())

// Hours between two times (handles overnight)
const calcHours = (start, end) => {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins < 0) mins += 24 * 60
  return parseFloat((mins / 60).toFixed(2))
}

// Check if two shifts overlap
const shiftsOverlap = (s1, s2) => {
  if (s1.shift_date !== s2.shift_date) return false
  const toMins = t => { const [h,m] = t.split(':').map(Number); return h*60+m }
  const [as, ae] = [toMins(s1.start_time), toMins(s1.end_time)]
  const [bs, be] = [toMins(s2.start_time), toMins(s2.end_time)]
  // Handle overnight
  const aeAdj = ae < as ? ae + 1440 : ae
  const beAdj = be < bs ? be + 1440 : be
  return as < beAdj && aeAdj > bs
}

// ── Shift Template Manager ─────────────────────────────────────
function TemplateManager({ orgId, templates, onRefresh, onClose }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm]     = useState({ name:'', department:'', start_time:'', end_time:'', color:'#0c90e1' })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f => ({ ...f, [k]: v }))

  const handleAdd = async () => {
    if (!form.name || !form.start_time || !form.end_time) return
    setSaving(true)
    const hours = calcHours(form.start_time, form.end_time)
    await supabase.from('shift_templates').insert({ ...form, organization_id: orgId, hours, is_active: true })
    setForm({ name:'', department:'', start_time:'', end_time:'', color:'#0c90e1' })
    setAdding(false); setSaving(false); onRefresh()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800">Shift Templates</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {templates.map(t => (
            <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
              <div className="w-3 h-8 rounded-full flex-shrink-0" style={{ background: t.color }} />
              <div className="flex-1">
                <div className="font-medium text-sm text-slate-800">{t.name}</div>
                <div className="text-xs text-slate-400">{t.department && `${t.department} · `}{fmt12(t.start_time)} – {fmt12(t.end_time)} · {t.hours}h</div>
              </div>
              <button onClick={async () => { await supabase.from('shift_templates').update({ is_active: false }).eq('id', t.id); onRefresh() }}
                className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={13} /></button>
            </div>
          ))}

          {adding ? (
            <div className="p-4 bg-brand-50 border-2 border-brand-200 rounded-xl space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input value={form.name} onChange={e => set('name', e.target.value)}
                  className="col-span-2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Shift name *" />
                <select value={form.department} onChange={e => set('department', e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">All departments</option>
                  {DEPARTMENTS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                </select>
                <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 cursor-pointer p-0.5" />
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Start *</label>
                  <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">End *</label>
                  <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              {form.start_time && form.end_time && (
                <div className="text-xs text-brand-600 font-medium">{calcHours(form.start_time, form.end_time)}h shift</div>
              )}
              <div className="flex justify-end gap-2">
                <button onClick={() => setAdding(false)} className="px-3 py-1.5 text-sm text-slate-600">Cancel</button>
                <button onClick={handleAdd} disabled={saving}
                  className="px-4 py-1.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:bg-brand-300 transition-colors">
                  Add
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)}
              className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors flex items-center justify-center gap-2">
              <Plus size={14} /> Add Template
            </button>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg">Done</button>
        </div>
      </div>
    </div>
  )
}

// ── Schedule Shift Modal ───────────────────────────────────────
function ShiftModal({ shift, date, orgId, staff, templates, existingShifts, onClose, onSave }) {
  const { profile } = useAuth()
  const isNew = !shift
  const [form, setForm] = useState({
    staff_id:      shift?.staff_id    || '',
    department:    shift?.department  || '',
    shift_date:    shift?.shift_date  || date || today(),
    start_time:    shift?.start_time  || '',
    end_time:      shift?.end_time    || '',
    recur_type:    shift?.recur_type  || 'none',
    recur_end_date:shift?.recur_end_date || '',
    notes:         shift?.notes       || '',
  })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [overlapWarn, setOverlapWarn] = useState(false)
  const set = (k,v) => setForm(f => ({ ...f, [k]: v }))

  const applyTemplate = (id) => {
    const t = templates.find(t => t.id === id)
    if (!t) return
    set('start_time', t.start_time); set('end_time', t.end_time)
    if (t.department) set('department', t.department)
  }

  // Check overlap whenever staff or times change
  useEffect(() => {
    if (!form.staff_id || !form.start_time || !form.end_time || !form.shift_date) { setOverlapWarn(false); return }
    const candidate = { shift_date: form.shift_date, start_time: form.start_time, end_time: form.end_time }
    const conflicts = existingShifts.filter(s =>
      s.staff_id === form.staff_id && s.id !== shift?.id &&
      s.status !== 'called_off' && s.status !== 'swapped' &&
      shiftsOverlap(candidate, s)
    )
    setOverlapWarn(conflicts.length > 0)
  }, [form.staff_id, form.start_time, form.end_time, form.shift_date])

  // Check if this creates overtime (>40h in the week)
  const checkOvertime = () => {
    if (!form.staff_id || !form.shift_date) return false
    const shiftDate  = new Date(form.shift_date + 'T12:00:00')
    const dayOfWeek  = shiftDate.getDay()
    const weekStart  = new Date(shiftDate); weekStart.setDate(shiftDate.getDate() - dayOfWeek)
    const weekEnd    = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6)
    const weekStartStr = toDateStr(weekStart); const weekEndStr = toDateStr(weekEnd)
    const weekShifts = existingShifts.filter(s =>
      s.staff_id === form.staff_id && s.id !== shift?.id &&
      s.shift_date >= weekStartStr && s.shift_date <= weekEndStr &&
      !['called_off','swapped'].includes(s.status)
    )
    const weekHours = weekShifts.reduce((a, s) => a + (parseFloat(s.hours) || 0), 0)
    const newHours  = calcHours(form.start_time, form.end_time)
    return (weekHours + newHours) > 40
  }

  const handleSave = async () => {
    if (!form.staff_id || !form.shift_date || !form.start_time || !form.end_time) {
      setError('Staff member, date, start and end time are required'); return
    }
    if (overlapWarn && !window.confirm('This shift overlaps with an existing shift. Continue anyway?')) return
    setSaving(true)
    const hours     = calcHours(form.start_time, form.end_time)
    const isOvertime = checkOvertime()

    const buildPayload = (date) => ({
      organization_id: orgId,
      staff_id:        form.staff_id,
      department:      form.department || '',
      shift_date:      date,
      start_time:      form.start_time,
      end_time:        form.end_time,
      hours,
      recur_type:      form.recur_type,
      recur_end_date:  form.recur_end_date || null,
      notes:           form.notes || null,
      status:          'scheduled',
      is_overtime:     isOvertime,
      created_by:      profile.id,
      updated_at:      new Date().toISOString(),
    })

    if (shift?.id) {
      await supabase.from('scheduled_shifts').update(buildPayload(form.shift_date)).eq('id', shift.id)
    } else if (form.recur_type !== 'none') {
      // Create parent
      const { data: parent } = await supabase.from('scheduled_shifts')
        .insert(buildPayload(form.shift_date)).select().single()
      // Create recurring instances
      if (parent) {
        const endDate   = form.recur_end_date ? new Date(form.recur_end_date + 'T12:00:00') : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        const instances = []
        let cursor      = new Date(form.shift_date + 'T12:00:00')
        const step      = { daily: 1, weekly: 7, biweekly: 14 }[form.recur_type] || 7
        cursor.setDate(cursor.getDate() + step)
        while (cursor <= endDate) {
          instances.push({ ...buildPayload(toDateStr(cursor)), recur_parent_id: parent.id })
          cursor.setDate(cursor.getDate() + step)
        }
        if (instances.length) await supabase.from('scheduled_shifts').insert(instances)
      }
    } else {
      await supabase.from('scheduled_shifts').insert(buildPayload(form.shift_date))
    }

    setSaving(false); onSave()
  }

  const hours = form.start_time && form.end_time ? calcHours(form.start_time, form.end_time) : 0
  const isOT  = form.start_time && form.end_time ? checkOvertime() : false

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800">{isNew ? 'Schedule Shift' : 'Edit Shift'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          {overlapWarn && (
            <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm flex items-center gap-2">
              <AlertTriangle size={14} /> This shift overlaps with an existing shift for this employee
            </div>
          )}
          {isOT && (
            <div className="px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg text-orange-700 text-sm flex items-center gap-2">
              <AlertCircle size={14} /> Adding this shift will put this employee into overtime this week
            </div>
          )}

          {/* Template picker */}
          {templates.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Quick Fill from Template</label>
              <div className="flex flex-wrap gap-2">
                {templates.map(t => (
                  <button key={t.id} onClick={() => applyTemplate(t.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 hover:border-slate-300 transition-colors">
                    <div className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Staff Member *</label>
            <select value={form.staff_id} onChange={e => set('staff_id', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">Select staff member</option>
              {staff.filter(s => !form.department || s.department === form.department || !s.department)
                .map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}{s.job_title ? ` — ${s.job_title}` : ''}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Department</label>
              <select value={form.department} onChange={e => set('department', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">All</option>
                {DEPARTMENTS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Date *</label>
              <input type="date" value={form.shift_date} onChange={e => set('shift_date', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Start Time *</label>
              <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">End Time *</label>
              <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>

          {hours > 0 && (
            <div className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg ${isOT ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'}`}>
              <Clock size={14} /> {hours}h shift {isOT && '— OVERTIME'}
            </div>
          )}

          {/* Recurrence */}
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Repeat size={12} /> Repeat
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[{ key:'none',label:'No repeat'},{key:'daily',label:'Daily'},{key:'weekly',label:'Weekly'},{key:'biweekly',label:'Every 2 weeks'}].map(r => (
                <button key={r.key} onClick={() => set('recur_type', r.key)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left ${form.recur_type === r.key ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {r.label}
                </button>
              ))}
            </div>
            {form.recur_type !== 'none' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Repeat until</label>
                <input type="date" value={form.recur_end_date} onChange={e => set('recur_end_date', e.target.value)}
                  min={form.shift_date}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
            <input value={form.notes} onChange={e => set('notes', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Optional notes..." />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving...' : isNew ? 'Schedule Shift' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Day Drill-Down Modal ───────────────────────────────────────
function DayDetail({ date, shifts, staff, orgId, isMgr, onClose, onRefresh }) {
  const { profile } = useAuth()
  const [showCallOff, setShowCallOff] = useState(null)
  const [callOffReason, setCallOffReason] = useState('')
  const [showSwapRequest, setShowSwapRequest] = useState(null)

  const dateShifts = shifts.filter(s => s.shift_date === date).sort((a,b) => a.start_time.localeCompare(b.start_time))
  const staffMap   = Object.fromEntries(staff.map(s => [s.id, s]))
  const dateLabel  = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })

  const handleCallOff = async (shiftId) => {
    await supabase.from('scheduled_shifts').update({
      status: 'called_off',
      calloff_reason: callOffReason || null,
      calloff_at: new Date().toISOString(),
    }).eq('id', shiftId)
    setShowCallOff(null); setCallOffReason(''); onRefresh()
  }

  const handleStatusChange = async (shiftId, status) => {
    await supabase.from('scheduled_shifts').update({ status }).eq('id', shiftId)
    onRefresh()
  }

  // Group by department
  const grouped = {}
  dateShifts.forEach(s => {
    const dept = s.department || 'other'
    if (!grouped[dept]) grouped[dept] = []
    grouped[dept].push(s)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-display font-semibold text-slate-800">{dateLabel}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{dateShifts.length} shift{dateShifts.length !== 1 ? 's' : ''} scheduled</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {dateShifts.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">No shifts scheduled for this day.</div>
          ) : (
            Object.keys(grouped).sort().map(deptKey => {
              const dept = DEPARTMENTS.find(d => d.key === deptKey) || { label: deptKey }
              return (
                <div key={deptKey}>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Building2 size={12} /> {dept.label}
                  </div>
                  <div className="space-y-2">
                    {grouped[deptKey].map(s => {
                      const member  = staffMap[s.staff_id]
                      const status  = SHIFT_STATUSES[s.status] || SHIFT_STATUSES.scheduled
                      const isOwn   = s.staff_id === profile.id
                      return (
                        <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold flex-shrink-0">
                            {member?.first_name?.[0] || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-800 text-sm">
                              {member ? `${member.first_name} ${member.last_name}` : 'Unknown'}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-2">
                              <Clock size={10} /> {fmt12(s.start_time)} – {fmt12(s.end_time)} · {s.hours}h
                              {s.is_overtime && <span className="text-orange-600 font-medium">OT</span>}
                              {s.recur_type !== 'none' && <Repeat size={10} className="text-slate-300" />}
                            </div>
                            {s.notes && <div className="text-xs text-slate-400 italic mt-0.5">{s.notes}</div>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${status.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                              {status.label}
                            </span>
                            {/* Manager actions */}
                            {isMgr && s.status === 'scheduled' && (
                              <select onChange={e => handleStatusChange(s.id, e.target.value)} defaultValue=""
                                className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none text-slate-500">
                                <option value="" disabled>Update</option>
                                <option value="completed">Mark Completed</option>
                                <option value="no_show">No Show</option>
                                <option value="called_off">Called Off</option>
                              </select>
                            )}
                            {/* Staff self-calloff */}
                            {isOwn && s.status === 'scheduled' && !isMgr && (
                              <button onClick={() => setShowCallOff(s.id)}
                                className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                                Call Off
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg">Close</button>
        </div>
      </div>

      {/* Call-off dialog */}
      {showCallOff && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-display font-semibold text-slate-800 mb-4">Call Off Shift</h3>
            <textarea value={callOffReason} onChange={e => setCallOffReason(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none mb-4"
              placeholder="Reason for calling off (optional)..." />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCallOff(null)} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
              <button onClick={() => handleCallOff(showCallOff)}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg">Confirm Call Off</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Swap Requests Panel ────────────────────────────────────────
function SwapPanel({ orgId, profile, staff, shifts, isMgr, onRefresh }) {
  const [swaps, setSwaps]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showRequest, setShowRequest] = useState(false)
  const [reqForm, setReqForm] = useState({ shift_id: '', target_id: '', target_shift_id: '', reason: '', is_open: false })

  useEffect(() => { fetchSwaps() }, [])

  async function fetchSwaps() {
    setLoading(true)
    const { data } = await supabase.from('shift_swaps').select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false }).limit(20)
    setSwaps(data || [])
    setLoading(false)
  }

  const staffMap = Object.fromEntries(staff.map(s => [s.id, s]))
  const shiftMap = Object.fromEntries(shifts.map(s => [s.id, s]))

  const myShifts = shifts.filter(s =>
    s.staff_id === profile.id && s.status === 'scheduled' &&
    s.shift_date >= today()
  ).sort((a,b) => a.shift_date.localeCompare(b.shift_date))

  const handleSubmitRequest = async () => {
    if (!reqForm.shift_id) return
    await supabase.from('shift_swaps').insert({
      organization_id:    orgId,
      requester_id:       profile.id,
      requester_shift_id: reqForm.shift_id,
      target_id:          reqForm.is_open ? null : (reqForm.target_id || null),
      target_shift_id:    reqForm.is_open ? null : (reqForm.target_shift_id || null),
      is_open_request:    reqForm.is_open,
      reason:             reqForm.reason || null,
      status:             'pending',
    })
    setShowRequest(false)
    setReqForm({ shift_id:'', target_id:'', target_shift_id:'', reason:'', is_open: false })
    fetchSwaps(); onRefresh()
  }

  const handleTargetRespond = async (swapId, accepted) => {
    await supabase.from('shift_swaps').update({
      target_accepted: accepted,
      target_responded_at: new Date().toISOString(),
      status: accepted ? 'accepted' : 'rejected',
    }).eq('id', swapId)
    fetchSwaps()
  }

  const handleManagerRespond = async (swapId, approved, swap) => {
    await supabase.from('shift_swaps').update({
      manager_id:           profile.id,
      manager_approved:     approved,
      manager_responded_at: new Date().toISOString(),
      status: approved ? 'approved' : 'rejected',
    }).eq('id', swapId)

    // If approved — actually swap the shifts
    if (approved && swap.requester_shift_id && swap.target_shift_id) {
      const reqShift = shiftMap[swap.requester_shift_id]
      const tgtShift = shiftMap[swap.target_shift_id]
      if (reqShift && tgtShift) {
        await supabase.from('scheduled_shifts').update({ staff_id: tgtShift.staff_id, status: 'swapped' }).eq('id', reqShift.id)
        await supabase.from('scheduled_shifts').update({ staff_id: reqShift.staff_id, status: 'swapped' }).eq('id', tgtShift.id)
        // Insert new assignments
        await supabase.from('scheduled_shifts').insert([
          { ...reqShift, id: undefined, staff_id: tgtShift.staff_id, status: 'scheduled', recur_parent_id: null },
          { ...tgtShift, id: undefined, staff_id: reqShift.staff_id, status: 'scheduled', recur_parent_id: null },
        ])
      }
    }
    fetchSwaps(); onRefresh()
  }

  const pendingCount = swaps.filter(s =>
    (s.target_id === profile.id && s.target_accepted === null) ||
    (isMgr && s.status === 'accepted')
  ).length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-semibold text-slate-800 flex items-center gap-2">
          <RefreshCw size={16} className="text-brand-600" />
          Shift Swaps
          {pendingCount > 0 && <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingCount}</span>}
        </h2>
        <button onClick={() => setShowRequest(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={14} /> Request Swap
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-400 text-sm">Loading...</div>
      ) : swaps.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">No swap requests.</div>
      ) : (
        <div className="space-y-3">
          {swaps.map(swap => {
            const requester   = staffMap[swap.requester_id]
            const target      = staffMap[swap.target_id]
            const reqShift    = shiftMap[swap.requester_shift_id]
            const tgtShift    = shiftMap[swap.target_shift_id]
            const isTarget    = swap.target_id === profile.id && swap.target_accepted === null
            const isMgrPending = isMgr && swap.status === 'accepted'
            const statusColor = {
              pending:  'bg-blue-50 border-blue-200',
              accepted: 'bg-amber-50 border-amber-200',
              approved: 'bg-green-50 border-green-200',
              rejected: 'bg-slate-50 border-slate-200',
              cancelled:'bg-slate-50 border-slate-200',
            }[swap.status] || 'bg-white border-slate-100'

            return (
              <div key={swap.id} className={`p-4 rounded-2xl border ${statusColor}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="text-sm">
                    <span className="font-semibold text-slate-800">{requester?.first_name} {requester?.last_name}</span>
                    <span className="text-slate-500"> wants to swap </span>
                    {reqShift && <span className="font-medium text-slate-700">{new Date(reqShift.shift_date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})} {fmt12(reqShift.start_time)}</span>}
                    {!swap.is_open_request && target && (<><span className="text-slate-500"> with </span><span className="font-semibold text-slate-800">{target?.first_name} {target?.last_name}</span></>)}
                    {swap.is_open_request && <span className="text-slate-500"> (open request)</span>}
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 capitalize ${
                    swap.status === 'approved' ? 'bg-green-100 text-green-700' :
                    swap.status === 'rejected' ? 'bg-red-100 text-red-600' :
                    swap.status === 'accepted' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'}`}>
                    {swap.status}
                  </span>
                </div>
                {swap.reason && <p className="text-xs text-slate-400 italic mb-2">"{swap.reason}"</p>}

                {/* Step indicators */}
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                  <span className={`flex items-center gap-1 ${swap.status !== 'pending' ? 'text-green-600' : ''}`}>
                    {swap.status !== 'pending' ? <Check size={11} /> : <Clock size={11} />} Requested
                  </span>
                  <ArrowRight size={10} />
                  <span className={`flex items-center gap-1 ${['accepted','approved'].includes(swap.status) ? 'text-green-600' : swap.status === 'rejected' && swap.target_accepted === false ? 'text-red-500' : ''}`}>
                    {['accepted','approved'].includes(swap.status) ? <Check size={11} /> : <Clock size={11} />} Accepted
                  </span>
                  <ArrowRight size={10} />
                  <span className={`flex items-center gap-1 ${swap.status === 'approved' ? 'text-green-600' : ''}`}>
                    {swap.status === 'approved' ? <Check size={11} /> : <Clock size={11} />} Manager Approved
                  </span>
                </div>

                {/* Action buttons */}
                {isTarget && (
                  <div className="flex gap-2">
                    <button onClick={() => handleTargetRespond(swap.id, true)}
                      className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1">
                      <Check size={12} /> Accept Swap
                    </button>
                    <button onClick={() => handleTargetRespond(swap.id, false)}
                      className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1">
                      <X size={12} /> Decline
                    </button>
                  </div>
                )}
                {isMgrPending && (
                  <div className="flex gap-2">
                    <button onClick={() => handleManagerRespond(swap.id, true, swap)}
                      className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1">
                      <CheckCircle2 size={12} /> Approve
                    </button>
                    <button onClick={() => handleManagerRespond(swap.id, false, swap)}
                      className="flex-1 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1">
                      <XCircle size={12} /> Reject
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Swap request modal */}
      {showRequest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-display font-semibold text-slate-800 mb-4">Request Shift Swap</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">My Shift to Swap</label>
                <select value={reqForm.shift_id} onChange={e => setReqForm(f => ({ ...f, shift_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">Select a shift</option>
                  {myShifts.map(s => (
                    <option key={s.id} value={s.id}>
                      {new Date(s.shift_date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})} {fmt12(s.start_time)}–{fmt12(s.end_time)}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={reqForm.is_open} onChange={e => setReqForm(f => ({ ...f, is_open: e.target.checked }))} className="w-4 h-4 rounded text-brand-600" />
                <span className="text-sm text-slate-600">Open request (any staff member can pick it up)</span>
              </label>
              {!reqForm.is_open && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Swap With</label>
                    <select value={reqForm.target_id} onChange={e => setReqForm(f => ({ ...f, target_id: e.target.value, target_shift_id: '' }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                      <option value="">Select staff member</option>
                      {staff.filter(s => s.id !== profile.id).map(s => (
                        <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                      ))}
                    </select>
                  </div>
                  {reqForm.target_id && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Their Shift (optional)</label>
                      <select value={reqForm.target_shift_id} onChange={e => setReqForm(f => ({ ...f, target_shift_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                        <option value="">No specific shift</option>
                        {shifts.filter(s => s.staff_id === reqForm.target_id && s.status === 'scheduled' && s.shift_date >= today())
                          .sort((a,b) => a.shift_date.localeCompare(b.shift_date))
                          .map(s => (
                            <option key={s.id} value={s.id}>
                              {new Date(s.shift_date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})} {fmt12(s.start_time)}–{fmt12(s.end_time)}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Reason</label>
                <input value={reqForm.reason} onChange={e => setReqForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Why do you need to swap?" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowRequest(false)} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
              <button onClick={handleSubmitRequest}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg">Submit Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Scheduling Page ───────────────────────────────────────
export default function Scheduling() {
  const { profile, organization } = useAuth()
  const [shifts, setShifts]       = useState([])
  const [staff, setStaff]         = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading]     = useState(true)
  const [calYear, setCalYear]     = useState(new Date().getFullYear())
  const [calMonth, setCalMonth]   = useState(new Date().getMonth())
  const [filterDept, setFilterDept] = useState('all')
  const [view, setView]           = useState('calendar') // 'calendar' | 'swaps'
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [editShift, setEditShift]   = useState(null)
  const [newShiftDate, setNewShiftDate] = useState(null)
  const [dayDetail, setDayDetail]   = useState(null)
  const [showTemplates, setShowTemplates] = useState(false)

  const isMgr = ['org_admin','ceo','super_admin','supervisor','manager'].includes(profile?.role)

  useEffect(() => { if (organization) fetchAll() }, [organization])

  async function fetchAll() {
    setLoading(true)
    const monthStart = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-01`
    const monthEnd   = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${new Date(calYear, calMonth+1, 0).getDate()}`

    const [shiftsRes, staffRes, templatesRes] = await Promise.all([
      supabase.from('scheduled_shifts').select('*')
        .eq('organization_id', organization.id)
        .gte('shift_date', monthStart).lte('shift_date', monthEnd)
        .order('shift_date').order('start_time'),
      supabase.from('profiles').select('id,first_name,last_name,role,department,job_title,status,phone')
        .eq('organization_id', organization.id)
        .not('role', 'in', '(resident,family)')
        .eq('status', 'active').order('last_name'),
      supabase.from('shift_templates').select('*')
        .eq('organization_id', organization.id).eq('is_active', true).order('name'),
    ])
    setShifts(shiftsRes.data || [])
    setStaff(staffRes.data || [])
    setTemplates(templatesRes.data || [])
    setLoading(false)
  }

  useEffect(() => { if (organization) fetchAll() }, [calYear, calMonth])

  const handleDeleteShift = async (id) => {
    if (!confirm('Delete this shift?')) return
    await supabase.from('scheduled_shifts').delete().eq('id', id)
    fetchAll()
  }

  // Build calendar
  const firstDay  = new Date(calYear, calMonth, 1).getDay()
  const daysCount = new Date(calYear, calMonth+1, 0).getDate()
  const todayStr  = today()

  const filteredShifts = shifts.filter(s => filterDept === 'all' || s.department === filterDept)

  const shiftsForDay = (d) => {
    const ds = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    return filteredShifts.filter(s => s.shift_date === ds)
  }

  // Weekly overtime tracking
  const overtimeStaff = new Set(shifts.filter(s => s.is_overtime).map(s => s.staff_id))

  // Stats
  const totalShifts    = filteredShifts.length
  const calledOff      = filteredShifts.filter(s => s.status === 'called_off').length
  const overtimeCount  = filteredShifts.filter(s => s.is_overtime).length

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800">Scheduling</h1>
          <p className="text-slate-500 text-sm mt-0.5">Shift management, scheduling, and swap requests</p>
        </div>
        <div className="flex items-center gap-2">
          {isMgr && (
            <button onClick={() => setShowTemplates(true)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600 rounded-xl text-sm font-medium transition-colors">
              <Settings size={15} /> Templates
            </button>
          )}
          {isMgr && (
            <button onClick={() => { setEditShift(null); setNewShiftDate(todayStr); setShowShiftModal(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
              <Plus size={15} /> Schedule Shift
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Shifts This Month', value: totalShifts,   color: 'text-brand-600',  bg: 'bg-brand-50' },
          { label: 'Called Off',        value: calledOff,     color: calledOff > 0 ? 'text-red-600' : 'text-slate-400', bg: calledOff > 0 ? 'bg-red-50' : 'bg-slate-100' },
          { label: 'Overtime Shifts',   value: overtimeCount, color: overtimeCount > 0 ? 'text-orange-600' : 'text-slate-400', bg: overtimeCount > 0 ? 'bg-orange-50' : 'bg-slate-100' },
          { label: 'Active Staff',      value: staff.length,  color: 'text-green-600',  bg: 'bg-green-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
            <div className={`text-3xl font-display font-bold ${s.color}`}>{s.value}</div>
            <div className="text-slate-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* View tabs + dept filter */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {[{ key:'calendar',label:'Calendar'},{ key:'swaps',label:'Swap Requests'}].map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${view === v.key ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}>
              {v.label}
            </button>
          ))}
        </div>
        {view === 'calendar' && (
          <div className="flex items-center gap-2">
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
              <option value="all">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* CALENDAR VIEW */}
      {view === 'calendar' && (
        <>
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1) } else setCalMonth(m => m-1) }}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-display font-semibold text-slate-800 text-lg">{MONTHS[calMonth]} {calYear}</h2>
            <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1) } else setCalMonth(m => m+1) }}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-16 text-slate-400">Loading...</div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-slate-100">
                {DAYS.map(d => (
                  <div key={d} className="py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">{d}</div>
                ))}
              </div>
              {/* Cells */}
              <div className="grid grid-cols-7">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`e${i}`} className="min-h-[110px] border-b border-r border-slate-50 bg-slate-50/50" />
                ))}
                {Array.from({ length: daysCount }).map((_, i) => {
                  const d       = i + 1
                  const ds      = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                  const dayShifts = shiftsForDay(d)
                  const isToday = ds === todayStr
                  const calledOffToday = dayShifts.filter(s => s.status === 'called_off').length
                  const staffMap = Object.fromEntries(staff.map(s => [s.id, s]))

                  return (
                    <div key={d}
                      className={`min-h-[110px] border-b border-r border-slate-100 p-1.5 cursor-pointer hover:bg-slate-50 transition-colors ${isToday ? 'bg-brand-50' : ''}`}
                      onClick={() => setDayDetail(ds)}>
                      <div className="flex items-center justify-between mb-1">
                        <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-brand-600 text-white' : 'text-slate-600'}`}>
                          {d}
                        </div>
                        {calledOffToday > 0 && (
                          <span className="text-xs text-red-500 font-bold">{calledOffToday} off</span>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {dayShifts.slice(0, 3).map(s => {
                          const member = staffMap[s.staff_id]
                          const color  = templates.find(t => t.start_time === s.start_time && t.end_time === s.end_time)?.color || '#64748b'
                          return (
                            <div key={s.id}
                              className={`text-xs px-1.5 py-0.5 rounded truncate font-medium ${s.status === 'called_off' ? 'line-through opacity-50 bg-red-100 text-red-600' : ''}`}
                              style={s.status !== 'called_off' ? { backgroundColor: color + '22', color } : {}}>
                              {member ? `${member.first_name[0]}. ${member.last_name}` : '—'}
                            </div>
                          )
                        })}
                        {dayShifts.length > 3 && (
                          <div className="text-xs text-slate-400 pl-1">+{dayShifts.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          <p className="text-xs text-slate-400 text-center mt-3">Click any day to see shift details and take actions</p>
        </>
      )}

      {/* SWAP REQUESTS VIEW */}
      {view === 'swaps' && (
        <SwapPanel
          orgId={organization.id}
          profile={profile}
          staff={staff}
          shifts={shifts}
          isMgr={isMgr}
          onRefresh={fetchAll} />
      )}

      {/* Modals */}
      {showShiftModal && (
        <ShiftModal
          shift={editShift}
          date={newShiftDate}
          orgId={organization.id}
          staff={staff}
          templates={templates}
          existingShifts={shifts}
          onClose={() => { setShowShiftModal(false); setEditShift(null) }}
          onSave={() => { setShowShiftModal(false); setEditShift(null); fetchAll() }} />
      )}
      {dayDetail && (
        <DayDetail
          date={dayDetail}
          shifts={shifts}
          staff={staff}
          orgId={organization.id}
          isMgr={isMgr}
          onClose={() => setDayDetail(null)}
          onRefresh={fetchAll} />
      )}
      {showTemplates && (
        <TemplateManager
          orgId={organization.id}
          templates={templates}
          onRefresh={fetchAll}
          onClose={() => setShowTemplates(false)} />
      )}
    </div>
  )
}
