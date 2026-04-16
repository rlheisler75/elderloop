import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, Search, Filter, Wrench, X, Edit2, ChevronDown,
  Clock, AlertTriangle, CheckCircle2, User, MapPin,
  Truck, PauseCircle, XCircle, RefreshCw, Calendar,
  ChevronRight, MessageSquare, ArrowUpDown, ShieldCheck
} from 'lucide-react'
import CompliancePanel from './Compliance'

const STATUSES = [
  { key: 'open',             label: 'Open',             color: 'bg-blue-50 text-blue-700 border-blue-200',     dot: 'bg-blue-500' },
  { key: 'pending_approval', label: 'Pending Approval', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500' },
  { key: 'assigned',         label: 'Assigned',         color: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  { key: 'in_progress',      label: 'In Progress',      color: 'bg-brand-50 text-brand-700 border-brand-200',  dot: 'bg-brand-500' },
  { key: 'awaiting_vendor',  label: 'Awaiting Vendor',  color: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  { key: 'on_hold',          label: 'On Hold',          color: 'bg-slate-100 text-slate-600 border-slate-300', dot: 'bg-slate-400' },
  { key: 'cancelled',        label: 'Cancelled',        color: 'bg-red-50 text-red-700 border-red-200',        dot: 'bg-red-400' },
  { key: 'closed',           label: 'Closed',           color: 'bg-green-50 text-green-700 border-green-200',  dot: 'bg-green-500' },
]

const PRIORITIES = [
  { key: 'low',    label: 'Low',    color: 'text-slate-500' },
  { key: 'normal', label: 'Normal', color: 'text-blue-500' },
  { key: 'high',   label: 'High',   color: 'text-orange-500' },
  { key: 'urgent', label: 'Urgent', color: 'text-red-600' },
]

const CATEGORIES = [
  { key: 'plumbing',     label: 'Plumbing' },
  { key: 'electrical',   label: 'Electrical' },
  { key: 'hvac',         label: 'HVAC' },
  { key: 'appliance',    label: 'Appliance' },
  { key: 'carpentry',    label: 'Carpentry' },
  { key: 'painting',     label: 'Painting' },
  { key: 'cleaning',     label: 'Cleaning' },
  { key: 'grounds',      label: 'Grounds' },
  { key: 'safety',       label: 'Safety' },
  { key: 'inspection',   label: 'Inspection' },
  { key: 'filter_change',label: 'Filter Change' },
  { key: 'pest_control', label: 'Pest Control' },
  { key: 'other',        label: 'Other' },
]

const getStatus   = (key) => STATUSES.find(s => s.key === key)   || STATUSES[0]
const getPriority = (key) => PRIORITIES.find(p => p.key === key) || PRIORITIES[1]

const EMPTY_FORM = {
  title: '', description: '', category: 'other', priority: 'normal',
  unit: '', building: '', location_detail: '', resident_id: '',
  assigned_to: '', due_date: '', notes: '',
  vendor_name: '', vendor_phone: '', vendor_eta: '',
  is_recurring: false, recur_type: 'interval',
  recur_interval_days: 90, recur_day: 1, recur_month: '',
}

// ── Status Badge ──────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = getStatus(status)
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

// ── Work Order Row ────────────────────────────────────────────
function WORow({ wo, onClick }) {
  const pri = getPriority(wo.priority)
  const cat = CATEGORIES.find(c => c.key === wo.category)
  const isOverdue = wo.due_date && new Date(wo.due_date) < new Date() && wo.status !== 'closed' && wo.status !== 'cancelled'

  return (
    <tr onClick={onClick} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {wo.priority === 'urgent' && <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />}
          {wo.is_recurring && <RefreshCw size={12} className="text-brand-400 flex-shrink-0" />}
          <div>
            <div className="font-medium text-slate-800 text-sm">{wo.title}</div>
            <div className="text-xs text-slate-400 mt-0.5">{cat?.label} {wo.location_detail ? `· ${wo.location_detail}` : ''}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {wo.unit ? (
          <div className="flex items-center gap-1 text-xs">
            <MapPin size={12} className="text-slate-400" />
            {wo.building ? `${wo.building} · ` : ''}{wo.unit}
          </div>
        ) : <span className="text-slate-300">—</span>}
        {wo.residents && (
          <div className="text-xs text-slate-400 mt-0.5">
            {wo.residents.first_name} {wo.residents.last_name}
          </div>
        )}
      </td>
      <td className="px-4 py-3"><StatusBadge status={wo.status} /></td>
      <td className="px-4 py-3">
        <span className={`text-xs font-medium ${pri.color}`}>{pri.label}</span>
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">
        {wo.assigned_profiles
          ? `${wo.assigned_profiles.first_name} ${wo.assigned_profiles.last_name}`
          : <span className="text-slate-300">Unassigned</span>}
      </td>
      <td className={`px-4 py-3 text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
        {wo.due_date
          ? new Date(wo.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : <span className="text-slate-300">—</span>}
        {isOverdue && <span className="ml-1">⚠</span>}
      </td>
      <td className="px-4 py-3 text-xs text-slate-400">
        {new Date(wo.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </td>
    </tr>
  )
}

// ── Work Order Detail Modal ───────────────────────────────────
function WOModal({ wo, onClose, onSave, staffList, residentList, canEdit, canClose, canAssign }) {
  const { profile } = useAuth()
  const [editing, setEditing]   = useState(!wo)
  const [form, setForm]         = useState(wo ? {
    title: wo.title, description: wo.description || '', category: wo.category,
    priority: wo.priority, status: wo.status,
    unit: wo.unit || '', building: wo.building || '',
    location_detail: wo.location_detail || '',
    resident_id: wo.resident_id || '',
    assigned_to: wo.assigned_to || '',
    due_date: wo.due_date || '',
    notes: wo.notes || '',
    vendor_name: wo.vendor_name || '', vendor_phone: wo.vendor_phone || '', vendor_eta: wo.vendor_eta || '',
    is_recurring: wo.is_recurring || false, recur_type: wo.recur_type || 'interval',
    recur_interval_days: wo.recur_interval_days || 90,
    recur_day: wo.recur_day || 1, recur_month: wo.recur_month || '',
  } : { ...EMPTY_FORM })
  const [note, setNote]         = useState('')
  const [activity, setActivity] = useState([])
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { if (wo?.id) fetchActivity() }, [wo?.id])

  async function fetchActivity() {
    const { data } = await supabase.from('wo_activity')
      .select('*, profiles(first_name, last_name)')
      .eq('work_order_id', wo.id)
      .order('created_at', { ascending: false })
    setActivity(data || [])
  }

  async function addNote() {
    if (!note.trim() || !wo?.id) return
    await supabase.from('wo_activity').insert({
      work_order_id: wo.id, user_id: profile.id,
      action: 'Note added', note: note.trim()
    })
    setNote('')
    fetchActivity()
  }

  async function handleSave() {
    if (!form.title.trim()) { setError('Title is required'); return }
    setSaving(true)
    const payload = {
      title: form.title.trim(), description: form.description || null,
      category: form.category, priority: form.priority,
      unit: form.unit || null, building: form.building || null,
      location_detail: form.location_detail || null,
      resident_id: form.resident_id || null,
      assigned_to: form.assigned_to || null,
      due_date: form.due_date || null,
      notes: form.notes || null,
      vendor_name: form.vendor_name || null,
      vendor_phone: form.vendor_phone || null,
      vendor_eta: form.vendor_eta || null,
      is_recurring: form.is_recurring,
      recur_type: form.is_recurring ? form.recur_type : null,
      recur_interval_days: form.is_recurring && form.recur_type === 'interval' ? form.recur_interval_days : null,
      recur_day: form.is_recurring && form.recur_type === 'scheduled' ? form.recur_day : null,
      recur_month: form.is_recurring && form.recur_type === 'scheduled' ? (form.recur_month || null) : null,
      updated_at: new Date().toISOString(),
    }
    let err
    if (wo?.id) {
      // Log status change
      if (form.status !== wo.status) {
        await supabase.from('wo_activity').insert({
          work_order_id: wo.id, user_id: profile.id,
          action: `Status changed from ${getStatus(wo.status).label} to ${getStatus(form.status).label}`
        })
      }
      payload.status = form.status
      if (form.status === 'closed' && wo.status !== 'closed') payload.completed_at = new Date().toISOString();
      ({ error: err } = await supabase.from('work_orders').update(payload).eq('id', wo.id))
    } else {
      payload.status = 'open'
      payload.submitted_by = profile.id
      const { data: newWo, error: insErr } = await supabase.from('work_orders').insert(payload).select().single()
      err = insErr
      if (newWo) {
        await supabase.from('wo_activity').insert({
          work_order_id: newWo.id, user_id: profile.id, action: 'Work order created'
        })
      }
    }
    if (err) { setError(err.message); setSaving(false); return }
    onSave()
  }

  const isNew = !wo

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Wrench size={18} className="text-brand-600" />
            <h2 className="font-display font-semibold text-slate-800">
              {isNew ? 'New Work Order' : editing ? 'Edit Work Order' : wo.title}
            </h2>
            {!isNew && <StatusBadge status={form.status} />}
          </div>
          <div className="flex items-center gap-2">
            {!isNew && canEdit && !editing && (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-brand-600 border border-slate-200 hover:border-brand-300 rounded-lg transition-colors">
                <Edit2 size={14} /> Edit
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Form / View */}
          <div className="px-6 py-5 space-y-4">
            {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Title *</label>
              {editing
                ? <input value={form.title} onChange={e => set('title', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Describe the issue..." />
                : <p className="text-slate-800 font-medium">{wo.title}</p>}
            </div>

            {/* Category / Priority / Status row */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Category</label>
                {editing
                  ? <select value={form.category} onChange={e => set('category', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                      {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  : <p className="text-sm text-slate-700">{CATEGORIES.find(c => c.key === wo.category)?.label}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Priority</label>
                {editing
                  ? <select value={form.priority} onChange={e => set('priority', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                      {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                    </select>
                  : <span className={`text-sm font-medium ${getPriority(wo.priority).color}`}>{getPriority(wo.priority).label}</span>}
              </div>
              {!isNew && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Status</label>
                  {editing
                    ? <select value={form.status} onChange={e => set('status', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                        {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    : <StatusBadge status={wo.status} />}
                </div>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Location</label>
              {editing ? (
                <div className="grid grid-cols-3 gap-2">
                  <input value={form.building} onChange={e => set('building', e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Building" />
                  <input value={form.unit} onChange={e => set('unit', e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Unit / Room" />
                  <input value={form.location_detail} onChange={e => set('location_detail', e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="e.g. Bathroom" />
                </div>
              ) : (
                <p className="text-sm text-slate-700 flex items-center gap-1.5">
                  <MapPin size={14} className="text-slate-400" />
                  {[wo.building, wo.unit, wo.location_detail].filter(Boolean).join(' · ') || '—'}
                </p>
              )}
            </div>

            {/* Resident */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Resident</label>
              {editing
                ? <select value={form.resident_id} onChange={e => set('resident_id', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">No specific resident</option>
                    {residentList.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name} — Unit {r.unit}</option>)}
                  </select>
                : <p className="text-sm text-slate-700">
                    {wo.residents ? `${wo.residents.first_name} ${wo.residents.last_name} — Unit ${wo.residents.unit}` : '—'}
                  </p>}
            </div>

            {/* Assigned To / Due Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Assigned To</label>
                {editing && canAssign
                  ? <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                      <option value="">Unassigned</option>
                      {staffList.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                    </select>
                  : <p className="text-sm text-slate-700">
                      {wo?.assigned_profiles ? `${wo.assigned_profiles.first_name} ${wo.assigned_profiles.last_name}` : '—'}
                    </p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Due Date</label>
                {editing
                  ? <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  : <p className="text-sm text-slate-700">{wo.due_date ? new Date(wo.due_date).toLocaleDateString() : '—'}</p>}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
              {editing
                ? <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                    placeholder="Details about the issue..." />
                : <p className="text-sm text-slate-700 whitespace-pre-wrap">{wo.description || '—'}</p>}
            </div>

            {/* Vendor Info — show when status is awaiting_vendor or editing */}
            {(editing || form.status === 'awaiting_vendor' || wo?.vendor_name) && (
              <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
                <label className="block text-xs font-semibold text-orange-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Truck size={13} /> Vendor Information
                </label>
                {editing ? (
                  <div className="grid grid-cols-2 gap-2">
                    <input value={form.vendor_name} onChange={e => set('vendor_name', e.target.value)}
                      className="px-3 py-2 border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                      placeholder="Vendor / Company name" />
                    <input value={form.vendor_phone} onChange={e => set('vendor_phone', e.target.value)}
                      className="px-3 py-2 border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                      placeholder="Phone" />
                    <input type="datetime-local" value={form.vendor_eta} onChange={e => set('vendor_eta', e.target.value)}
                      className="col-span-2 px-3 py-2 border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
                  </div>
                ) : (
                  <div className="text-sm text-slate-700 space-y-0.5">
                    {wo.vendor_name && <div><span className="font-medium">Vendor:</span> {wo.vendor_name}</div>}
                    {wo.vendor_phone && <div><span className="font-medium">Phone:</span> {wo.vendor_phone}</div>}
                    {wo.vendor_eta && <div><span className="font-medium">ETA:</span> {new Date(wo.vendor_eta).toLocaleString()}</div>}
                  </div>
                )}
              </div>
            )}

            {/* Recurring */}
            {editing && (
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input type="checkbox" checked={form.is_recurring} onChange={e => set('is_recurring', e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600" />
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <RefreshCw size={14} /> Recurring Task
                  </span>
                </label>
                {form.is_recurring && (
                  <div className="space-y-3 pl-6">
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={form.recur_type === 'interval'} onChange={() => set('recur_type', 'interval')} />
                        <span className="text-sm text-slate-700">Every X days</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={form.recur_type === 'scheduled'} onChange={() => set('recur_type', 'scheduled')} />
                        <span className="text-sm text-slate-700">Specific date</span>
                      </label>
                    </div>
                    {form.recur_type === 'interval' ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">Every</span>
                        <input type="number" min={1} value={form.recur_interval_days} onChange={e => set('recur_interval_days', parseInt(e.target.value))}
                          className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                        <span className="text-sm text-slate-600">days</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">Day</span>
                        <input type="number" min={1} max={31} value={form.recur_day} onChange={e => set('recur_day', parseInt(e.target.value))}
                          className="w-16 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                        <span className="text-sm text-slate-600">of</span>
                        <select value={form.recur_month} onChange={e => set('recur_month', e.target.value)}
                          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                          <option value="">Every month</option>
                          {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i) =>
                            <option key={i+1} value={i+1}>{m}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Internal Notes</label>
              {editing
                ? <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                    placeholder="Internal notes (not visible to residents)..." />
                : wo.notes && <p className="text-sm text-slate-600 italic">{wo.notes}</p>}
            </div>

            {/* Activity Log */}
            {!isNew && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <MessageSquare size={13} /> Activity Log
                </label>
                <div className="space-y-2 mb-3 max-h-36 overflow-y-auto">
                  {activity.length === 0
                    ? <p className="text-xs text-slate-400 italic">No activity yet</p>
                    : activity.map(a => (
                      <div key={a.id} className="flex gap-2 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 flex-shrink-0" />
                        <div className="flex-1">
                          <span className="text-slate-600 font-medium">{a.action}</span>
                          {a.note && <span className="text-slate-500"> — {a.note}</span>}
                          <div className="text-slate-400 mt-0.5">
                            {a.profiles ? `${a.profiles.first_name} ${a.profiles.last_name} · ` : ''}
                            {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {new Date(a.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="flex gap-2">
                  <input value={note} onChange={e => setNote(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addNote()}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Add a note..." />
                  <button onClick={addNote} className="px-3 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 transition-colors">Add</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {editing && (
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
            <button onClick={isNew ? onClose : () => setEditing(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
              {saving ? 'Saving...' : isNew ? 'Create Work Order' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function WorkOrders() {
  const { profile, organization } = useAuth()
  const [workOrders, setWorkOrders]   = useState([])
  const [staffList, setStaffList]     = useState([])
  const [residentList, setResidentList] = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCat, setFilterCat]     = useState('all')
  const [showModal, setShowModal]     = useState(false)
  const [selected, setSelected]       = useState(null)
  const [sortBy, setSortBy]           = useState('created_at')
  const [mainView, setMainView]       = useState('work_orders') // 'work_orders' | 'compliance'

  const canCreate  = profile && ['super_admin','org_admin','supervisor','manager','maintenance','staff','dietary','housekeeping'].includes(profile.role)
  const canEdit    = profile && ['super_admin','org_admin','supervisor','manager','maintenance'].includes(profile.role)
  const canAssign  = profile && ['super_admin','org_admin','supervisor','manager'].includes(profile.role)
  const canClose   = profile && ['super_admin','org_admin','supervisor','manager','maintenance'].includes(profile.role)

  useEffect(() => { if (organization) { fetchAll() } }, [organization])

  async function fetchAll() {
    setLoading(true)
    const [woRes, staffRes, resRes] = await Promise.all([
      supabase.from('work_orders')
        .select('*, residents(first_name,last_name,unit), assigned_profiles:profiles!work_orders_assigned_to_fkey(first_name,last_name)')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('id,first_name,last_name,role')
        .eq('organization_id', organization.id)
        .in('role', ['maintenance','supervisor','manager','org_admin','super_admin']),
      supabase.from('residents').select('id,first_name,last_name,unit,building')
        .eq('organization_id', organization.id).eq('is_active', true)
    ])
    setWorkOrders(woRes.data || [])
    setStaffList(staffRes.data || [])
    setResidentList(resRes.data || [])
    setLoading(false)
  }

  const handleOpen = (wo) => { setSelected(wo); setShowModal(true) }
  const handleNew  = () => { setSelected(null); setShowModal(true) }
  const handleSave = () => { setShowModal(false); fetchAll() }

  // Filter + search
  const filtered = workOrders.filter(wo => {
    const matchSearch = !search || [wo.title, wo.unit, wo.building, wo.location_detail,
      wo.residents?.first_name, wo.residents?.last_name, wo.description]
      .filter(Boolean).some(f => f.toLowerCase().includes(search.toLowerCase()))
    const matchStatus = filterStatus === 'all' || wo.status === filterStatus
    const matchCat    = filterCat === 'all' || wo.category === filterCat
    return matchSearch && matchStatus && matchCat
  })

  // Stats
  const stats = {
    open:     workOrders.filter(w => w.status === 'open').length,
    progress: workOrders.filter(w => w.status === 'in_progress').length,
    vendor:   workOrders.filter(w => w.status === 'awaiting_vendor').length,
    urgent:   workOrders.filter(w => w.priority === 'urgent' && !['closed','cancelled'].includes(w.status)).length,
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800">Maintenance</h1>
          <p className="text-slate-500 text-sm mt-0.5">Work orders, inspections, and Life Safety compliance</p>
        </div>
        {mainView === 'work_orders' && canCreate && (
          <button onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus size={16} /> New Work Order
          </button>
        )}
      </div>

      {/* Main view tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
        <button onClick={() => setMainView('work_orders')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${mainView === 'work_orders' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <Wrench size={15} /> Work Orders
        </button>
        <button onClick={() => setMainView('compliance')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${mainView === 'compliance' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <ShieldCheck size={15} /> Life Safety Compliance
        </button>
      </div>

      {/* Compliance view */}
      {mainView === 'compliance' && (
        <CompliancePanel orgId={organization?.id} profile={profile} />
      )}

      {/* Work Orders view */}
      {mainView === 'work_orders' && (<>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Open',        value: stats.open,     color: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: 'In Progress', value: stats.progress, color: 'text-brand-600',  bg: 'bg-brand-50' },
          { label: 'Awaiting Vendor', value: stats.vendor, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Urgent',      value: stats.urgent,   color: 'text-red-600',    bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-white`}>
            <div className={`text-3xl font-display font-bold ${s.color}`}>{s.value}</div>
            <div className="text-slate-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, unit, building, resident..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading work orders...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Wrench size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-display text-lg">No work orders found</p>
            {canCreate && <p className="text-sm mt-1">Click "New Work Order" to create one.</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Issue</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Assigned</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Due</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(wo => <WORow key={wo.id} wo={wo} onClick={() => handleOpen(wo)} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-3 text-xs text-slate-400 text-right">{filtered.length} work order{filtered.length !== 1 ? 's' : ''}</div>

      {showModal && (
        <WOModal
          wo={selected}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          staffList={staffList}
          residentList={residentList}
          canEdit={canEdit}
          canClose={canClose}
          canAssign={canAssign}
        />
      )}
      </>)}
    </div>
  )
}
