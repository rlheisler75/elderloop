import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, X, Edit2, Trash2, ChevronLeft, ChevronRight,
  Calendar, Clock, MapPin, Printer, List, Grid3x3,
  Dumbbell, Palette, Gamepad2, Users, Music, BookOpen,
  Church, Bus, UtensilsCrossed, Heart, Tv, Star,
  RefreshCw, Eye, EyeOff
} from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'fitness',      label: 'Fitness',      icon: Dumbbell,       color: '#ef4444', bg: 'bg-red-100 text-red-700' },
  { key: 'arts_crafts',  label: 'Arts & Crafts', icon: Palette,       color: '#f97316', bg: 'bg-orange-100 text-orange-700' },
  { key: 'games',        label: 'Games',         icon: Gamepad2,      color: '#eab308', bg: 'bg-yellow-100 text-yellow-700' },
  { key: 'social',       label: 'Social',        icon: Users,         color: '#22c55e', bg: 'bg-green-100 text-green-700' },
  { key: 'music',        label: 'Music',         icon: Music,         color: '#06b6d4', bg: 'bg-cyan-100 text-cyan-700' },
  { key: 'educational',  label: 'Educational',   icon: BookOpen,      color: '#3b82f6', bg: 'bg-blue-100 text-blue-700' },
  { key: 'spiritual',    label: 'Spiritual',     icon: Church,        color: '#8b5cf6', bg: 'bg-purple-100 text-purple-700' },
  { key: 'outing',       label: 'Outing',        icon: Bus,           color: '#ec4899', bg: 'bg-pink-100 text-pink-700' },
  { key: 'dining',       label: 'Dining',        icon: UtensilsCrossed, color: '#84cc16', bg: 'bg-lime-100 text-lime-700' },
  { key: 'health',       label: 'Health',        icon: Heart,         color: '#f43f5e', bg: 'bg-rose-100 text-rose-700' },
  { key: 'entertainment',label: 'Entertainment', icon: Tv,            color: '#a855f7', bg: 'bg-violet-100 text-violet-700' },
  { key: 'other',        label: 'Other',         icon: Star,          color: '#64748b', bg: 'bg-slate-100 text-slate-600' },
]

const RECUR_TYPES = [
  { key: 'none',      label: 'Does not repeat' },
  { key: 'daily',     label: 'Daily' },
  { key: 'weekly',    label: 'Weekly' },
  { key: 'biweekly',  label: 'Every 2 weeks' },
  { key: 'monthly',   label: 'Monthly' },
]

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const getCat = (key) => CATEGORIES.find(c => c.key === key) || CATEGORIES[CATEGORIES.length - 1]

const fmt12 = (t) => {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

const toDateStr = (d) => d.toISOString().split('T')[0]
const today = () => toDateStr(new Date())

// Expand recurring activities into individual occurrences for a date range
function expandActivities(activities, startDate, endDate) {
  const result = []
  const start = new Date(startDate + 'T00:00:00')
  const end   = new Date(endDate   + 'T23:59:59')

  for (const act of activities) {
    const actStart = new Date(act.start_date + 'T00:00:00')
    const actEnd   = act.recur_end_date ? new Date(act.recur_end_date + 'T23:59:59') : end

    if (act.recur_type === 'none') {
      if (actStart >= start && actStart <= end) result.push({ ...act, _date: act.start_date })
      continue
    }

    let cursor = new Date(actStart)
    const step = { daily: 1, weekly: 7, biweekly: 14, monthly: null }[act.recur_type]

    while (cursor <= end && cursor <= actEnd) {
      if (cursor >= start) result.push({ ...act, _date: toDateStr(cursor) })
      if (act.recur_type === 'monthly') {
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate())
      } else {
        cursor.setDate(cursor.getDate() + step)
      }
    }
  }

  return result.sort((a, b) => {
    if (a._date !== b._date) return a._date.localeCompare(b._date)
    return (a.start_time || '').localeCompare(b.start_time || '')
  })
}

// ── Activity Form Modal ────────────────────────────────────────
function ActivityModal({ activity, onClose, onSave }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    title:          activity?.title          || '',
    description:    activity?.description    || '',
    category:       activity?.category       || 'other',
    location:       activity?.location       || '',
    start_date:     activity?.start_date     || today(),
    start_time:     activity?.start_time     || '',
    end_time:       activity?.end_time       || '',
    all_day:        activity?.all_day        || false,
    recur_type:     activity?.recur_type     || 'none',
    recur_end_date: activity?.recur_end_date || '',
    color:          activity?.color          || getCat(activity?.category || 'other').color,
    show_on_signage: activity?.show_on_signage ?? true,
    show_on_portal:  activity?.show_on_portal  ?? true,
    department:     activity?.department     || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Auto-set color when category changes
  const setCategory = (key) => {
    set('category', key)
    set('color', getCat(key).color)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.start_date) { setError('Title and date are required'); return }
    setSaving(true)
    const payload = {
      ...form,
      organization_id: profile.organization_id,
      created_by: profile.id,
      start_time:     form.all_day ? null : (form.start_time || null),
      end_time:       form.all_day ? null : (form.end_time   || null),
      recur_end_date: form.recur_type !== 'none' ? (form.recur_end_date || null) : null,
      updated_at: new Date().toISOString(),
    }
    let err
    if (activity?.id) {
      ({ error: err } = await supabase.from('activities').update(payload).eq('id', activity.id))
    } else {
      ({ error: err } = await supabase.from('activities').insert({ ...payload, is_active: true }))
    }
    if (err) { setError(err.message); setSaving(false); return }
    onSave()
  }

  const cat = getCat(form.category)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800">{activity ? 'Edit Activity' : 'New Activity'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Morning Exercise Class" />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Category</label>
            <div className="grid grid-cols-4 gap-1.5">
              {CATEGORIES.map(c => {
                const Icon = c.icon
                return (
                  <button key={c.key} onClick={() => setCategory(c.key)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition-all ${form.category === c.key ? c.bg + ' ring-2 ring-offset-1 ring-brand-400 border-transparent' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    <Icon size={15} />
                    <span className="leading-tight text-center text-xs">{c.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Schedule</label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Date *</label>
                <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              {!form.all_day && (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Start Time</label>
                    <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">End Time</label>
                    <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                </>
              )}
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.all_day} onChange={e => set('all_day', e.target.checked)} className="w-4 h-4 rounded text-brand-600" />
              <span className="text-sm text-slate-600">All day event</span>
            </label>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Location</label>
            <input value={form.location} onChange={e => set('location', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Activity Room, Dining Hall, Chapel" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Optional details..." />
          </div>

          {/* Recurring */}
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <RefreshCw size={12} /> Repeat
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {RECUR_TYPES.map(r => (
                <button key={r.key} onClick={() => set('recur_type', r.key)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left ${form.recur_type === r.key ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {r.label}
                </button>
              ))}
            </div>
            {form.recur_type !== 'none' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Repeat until (leave blank for no end)</label>
                <input type="date" value={form.recur_end_date} onChange={e => set('recur_end_date', e.target.value)}
                  min={form.start_date}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
              </div>
            )}
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Department</label>
            <input value={form.department} onChange={e => set('department', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Activities, Dietary, Chaplain" />
          </div>

          {/* Display options */}
          <div className="grid grid-cols-2 gap-3">
            <label className={`flex items-center gap-2 cursor-pointer p-3 rounded-xl border transition-all ${form.show_on_portal ? 'bg-brand-50 border-brand-200' : 'border-slate-200'}`}>
              <input type="checkbox" checked={form.show_on_portal} onChange={e => set('show_on_portal', e.target.checked)} className="w-4 h-4 rounded text-brand-600" />
              <div>
                <div className="text-xs font-medium text-slate-700">Show in Resident Portal</div>
                <div className="text-xs text-slate-400">Visible to residents when they log in</div>
              </div>
            </label>
            <label className={`flex items-center gap-2 cursor-pointer p-3 rounded-xl border transition-all ${form.show_on_signage ? 'bg-brand-50 border-brand-200' : 'border-slate-200'}`}>
              <input type="checkbox" checked={form.show_on_signage} onChange={e => set('show_on_signage', e.target.checked)} className="w-4 h-4 rounded text-brand-600" />
              <div>
                <div className="text-xs font-medium text-slate-700">Show on Digital Signage</div>
                <div className="text-xs text-slate-400">Appears on the TV display board</div>
              </div>
            </label>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving...' : activity ? 'Save Changes' : 'Add Activity'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Activity Pill (calendar cell) ──────────────────────────────
function ActivityPill({ activity, onClick }) {
  const cat = getCat(activity.category)
  return (
    <button onClick={() => onClick(activity)}
      className="w-full text-left px-1.5 py-0.5 rounded text-xs font-medium truncate mb-0.5 transition-opacity hover:opacity-80"
      style={{ backgroundColor: activity.color + '33', color: activity.color, borderLeft: `3px solid ${activity.color}` }}>
      {activity.start_time && <span className="opacity-70 mr-1">{fmt12(activity.start_time).replace(':00','')}</span>}
      {activity.title}
      {activity.recur_type !== 'none' && <RefreshCw size={9} className="inline ml-1 opacity-50" />}
    </button>
  )
}

// ── Month Calendar ─────────────────────────────────────────────
function MonthCalendar({ year, month, expanded, onEditActivity, onNewActivity }) {
  const firstDay  = new Date(year, month, 1).getDay()
  const daysCount = new Date(year, month + 1, 0).getDate()
  const todayStr  = today()

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysCount; d++) cells.push(d)

  const getDateStr = (d) => `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`

  const activitiesForDay = (d) => {
    const ds = getDateStr(d)
    return expanded.filter(a => a._date === ds)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {DAYS.map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">{d}</div>
        ))}
      </div>
      {/* Cells */}
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          if (!d) return <div key={`empty-${i}`} className="min-h-[90px] border-b border-r border-slate-50 bg-slate-50/50" />
          const ds = getDateStr(d)
          const isToday = ds === todayStr
          const dayActivities = activitiesForDay(d)
          return (
            <div key={d}
              className={`min-h-[90px] border-b border-r border-slate-100 p-1.5 cursor-pointer hover:bg-slate-50 transition-colors ${isToday ? 'bg-brand-50' : ''}`}
              onClick={() => onNewActivity(ds)}>
              <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-brand-600 text-white' : 'text-slate-600'}`}>
                {d}
              </div>
              <div>
                {dayActivities.slice(0, 3).map((a, idx) => (
                  <ActivityPill key={`${a.id}-${idx}`} activity={a} onClick={e => { e.stopPropagation(); onEditActivity(a) }} />
                ))}
                {dayActivities.length > 3 && (
                  <div className="text-xs text-slate-400 pl-1">+{dayActivities.length - 3} more</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Print Schedule ─────────────────────────────────────────────
function PrintSchedule({ activities, month, year, orgName, onClose }) {
  const printRef = useRef()
  const monthName = MONTHS[month]

  const handlePrint = () => {
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>${monthName} ${year} Activity Schedule</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;font-size:13px}
        h2{margin:0;font-size:20px}
        .sub{color:#666;margin-bottom:16px}
        .day-group{margin-bottom:16px}
        .day-header{font-weight:bold;font-size:14px;color:#0c90e1;border-bottom:2px solid #0c90e1;padding-bottom:4px;margin-bottom:8px}
        .activity{display:flex;gap:12px;padding:6px 0;border-bottom:1px solid #f1f5f9}
        .time{color:#888;font-size:12px;min-width:80px}
        .title{font-weight:600}
        .loc{color:#888;font-size:12px}
        .cat{display:inline-block;padding:1px 6px;border-radius:10px;font-size:10px;font-weight:bold;margin-left:6px}
        @media print{button{display:none}}
      </style></head>
      <body>
        <h2>${orgName}</h2>
        <div class="sub">${monthName} ${year} — Activity Schedule</div>
        ${printRef.current.innerHTML}
        <div style="margin-top:20px;font-size:10px;color:#bbb">Printed ${new Date().toLocaleDateString()} · ElderLoop Activities</div>
      </body></html>`)
    win.document.close()
    win.print()
  }

  // Group by date
  const grouped = {}
  activities.forEach(a => {
    if (!grouped[a._date]) grouped[a._date] = []
    grouped[a._date].push(a)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800">{monthName} Schedule</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div ref={printRef}>
            {Object.keys(grouped).sort().map(date => {
              const d = new Date(date + 'T12:00:00')
              return (
                <div key={date} className="mb-5">
                  <div className="text-sm font-bold text-brand-700 border-b-2 border-brand-200 pb-1 mb-2">
                    {d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </div>
                  {grouped[date].map((a, i) => {
                    const cat = getCat(a.category)
                    return (
                      <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-50">
                        <div className="text-xs text-slate-400 w-20 flex-shrink-0 mt-0.5">
                          {a.all_day ? 'All Day' : fmt12(a.start_time) || '—'}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-slate-800">{a.title}
                            <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: a.color + '22', color: a.color }}>{cat.label}</span>
                          </div>
                          {a.location && <div className="text-xs text-slate-400 mt-0.5">📍 {a.location}</div>}
                          {a.description && <div className="text-xs text-slate-500 mt-0.5">{a.description}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
            {Object.keys(grouped).length === 0 && (
              <p className="text-slate-400 text-sm text-center py-8">No activities this month.</p>
            )}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Close</button>
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors">
            <Printer size={15} /> Print Schedule
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Upcoming List (resident-style) ─────────────────────────────
function UpcomingList({ activities, onEdit }) {
  const upcoming = activities
    .filter(a => a._date >= today())
    .slice(0, 30)

  // Group by date
  const grouped = {}
  upcoming.forEach(a => {
    if (!grouped[a._date]) grouped[a._date] = []
    grouped[a._date].push(a)
  })

  return (
    <div className="space-y-4">
      {Object.keys(grouped).sort().map(date => {
        const d = new Date(date + 'T12:00:00')
        const isToday = date === today()
        return (
          <div key={date}>
            <div className={`flex items-center gap-2 mb-2 ${isToday ? 'text-brand-600' : 'text-slate-500'}`}>
              <div className={`text-xs font-bold uppercase tracking-wide ${isToday ? 'text-brand-600' : 'text-slate-400'}`}>
                {isToday ? 'Today — ' : ''}{d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
            </div>
            <div className="space-y-2">
              {grouped[date].map((a, i) => {
                const cat = getCat(a.category)
                const Icon = cat.icon
                return (
                  <div key={i}
                    onClick={() => onEdit(a)}
                    className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-4 cursor-pointer hover:shadow-sm hover:border-brand-200 transition-all group">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: a.color + '22', border: `2px solid ${a.color}44` }}>
                      <Icon size={18} style={{ color: a.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 text-sm">{a.title}</span>
                        {a.recur_type !== 'none' && <RefreshCw size={11} className="text-slate-400 flex-shrink-0" />}
                        {!a.show_on_portal && <EyeOff size={11} className="text-slate-300 flex-shrink-0" title="Hidden from residents" />}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                        {!a.all_day && a.start_time && (
                          <span className="flex items-center gap-1"><Clock size={11} />{fmt12(a.start_time)}{a.end_time && ` – ${fmt12(a.end_time)}`}</span>
                        )}
                        {a.all_day && <span>All Day</span>}
                        {a.location && <span className="flex items-center gap-1"><MapPin size={11} />{a.location}</span>}
                        {a.department && <span className="text-slate-300">· {a.department}</span>}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: a.color + '22', color: a.color }}>
                      Edit
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
      {upcoming.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Calendar size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-display text-lg">No upcoming activities</p>
          <p className="text-sm mt-1">Switch to Calendar view to add activities.</p>
        </div>
      )}
    </div>
  )
}

// ── Main Activities Page ───────────────────────────────────────
export default function Activities() {
  const { profile, organization } = useAuth()
  const [activities, setActivities] = useState([])
  const [loading, setLoading]       = useState(true)
  const [view, setView]             = useState('calendar') // 'calendar' | 'list'
  const [calYear, setCalYear]       = useState(new Date().getFullYear())
  const [calMonth, setCalMonth]     = useState(new Date().getMonth())
  const [showModal, setShowModal]   = useState(false)
  const [editActivity, setEditActivity] = useState(null)
  const [defaultDate, setDefaultDate]   = useState(null)
  const [showPrint, setShowPrint]   = useState(false)
  const [filterCat, setFilterCat]   = useState('all')

  useEffect(() => { if (organization) fetchActivities() }, [organization])

  async function fetchActivities() {
    setLoading(true)
    const { data } = await supabase.from('activities').select('*')
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .order('start_date').order('start_time')
    setActivities(data || [])
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this activity? This will remove all recurring instances.')) return
    await supabase.from('activities').update({ is_active: false }).eq('id', id)
    fetchActivities()
  }

  const handleEdit = (a) => {
    // Find original activity (not the expanded occurrence)
    const original = activities.find(act => act.id === a.id)
    setEditActivity(original || a)
    setDefaultDate(null)
    setShowModal(true)
  }

  const handleNewOnDate = (date) => {
    setEditActivity(null)
    setDefaultDate(date)
    setShowModal(true)
  }

  // Expand recurring for the current month + adjacent months for calendar
  const monthStart = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-01`
  const monthEnd   = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${new Date(calYear, calMonth + 1, 0).getDate()}`

  const filteredBase = filterCat === 'all' ? activities : activities.filter(a => a.category === filterCat)
  const expanded = expandActivities(filteredBase, monthStart, monthEnd)

  // For list view — expand 3 months ahead
  const listEnd = toDateStr(new Date(new Date().setMonth(new Date().getMonth() + 3)))
  const expandedList = expandActivities(filteredBase, today(), listEnd)

  // Stats
  const todayExpanded = expandActivities(activities, today(), today())
  const thisWeekEnd   = toDateStr(new Date(new Date().setDate(new Date().getDate() + 7)))
  const weekExpanded  = expandActivities(activities, today(), thisWeekEnd)
  const recurringCount = activities.filter(a => a.recur_type !== 'none').length

  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800">Activities</h1>
          <p className="text-slate-500 text-sm mt-0.5">Activity calendar and resident programming</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPrint(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600 rounded-xl text-sm font-medium transition-colors">
            <Printer size={15} /> Print Schedule
          </button>
          <button onClick={() => { setEditActivity(null); setDefaultDate(today()); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus size={15} /> Add Activity
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Today",         value: todayExpanded.length, color: 'text-brand-600',  bg: 'bg-brand-50' },
          { label: 'This Week',     value: weekExpanded.length,  color: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: 'Total Events',  value: activities.length,    color: 'text-green-600',  bg: 'bg-green-50' },
          { label: 'Recurring',     value: recurringCount,       color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
            <div className={`text-3xl font-display font-bold ${s.color}`}>{s.value}</div>
            <div className="text-slate-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* View + filter controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setView('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${view === 'calendar' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}>
            <Grid3x3 size={14} /> Calendar
          </button>
          <button onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${view === 'list' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}>
            <List size={14} /> Upcoming
          </button>
        </div>

        {/* Category filter */}
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setFilterCat('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterCat === 'all' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-slate-200 text-slate-600'}`}>
            All
          </button>
          {CATEGORIES.map(c => {
            const Icon = c.icon
            return (
              <button key={c.key} onClick={() => setFilterCat(c.key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterCat === c.key ? 'text-white border-transparent' : 'bg-white border-slate-200 text-slate-600'}`}
                style={filterCat === c.key ? { background: c.color, borderColor: c.color } : {}}>
                <Icon size={11} />{c.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* CALENDAR VIEW */}
      {view === 'calendar' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <h2 className="font-display font-semibold text-slate-800 text-lg">{MONTHS[calMonth]} {calYear}</h2>
            </div>
            <button onClick={nextMonth} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
          {loading ? (
            <div className="text-center py-16 text-slate-400">Loading...</div>
          ) : (
            <MonthCalendar
              year={calYear} month={calMonth}
              expanded={expanded}
              onEditActivity={handleEdit}
              onNewActivity={handleNewOnDate} />
          )}
          <p className="text-xs text-slate-400 text-center mt-3">Click any day to add an activity · Click an event to edit it</p>
        </>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        loading ? (
          <div className="text-center py-16 text-slate-400">Loading...</div>
        ) : (
          <UpcomingList activities={expandedList} onEdit={handleEdit} />
        )
      )}

      {/* Modals */}
      {showModal && (
        <ActivityModal
          activity={editActivity ? editActivity : (defaultDate ? { start_date: defaultDate } : null)}
          onClose={() => { setShowModal(false); setEditActivity(null); setDefaultDate(null) }}
          onSave={() => { setShowModal(false); setEditActivity(null); setDefaultDate(null); fetchActivities() }} />
      )}
      {showPrint && (
        <PrintSchedule
          activities={expanded} month={calMonth} year={calYear}
          orgName={organization?.name}
          onClose={() => setShowPrint(false)} />
      )}
    </div>
  )
}
