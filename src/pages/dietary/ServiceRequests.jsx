import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Plus, X, Users, MapPin, CalendarClock, Check, Loader2, AlertCircle,
         Utensils, Heart, PartyPopper, MoreHorizontal, Ban, ChevronDown } from 'lucide-react'

// Roles allowed to submit a meeting/hospitality food request — separate from
// who can manage the Dietary module itself (canEditDietary handles that).
export const REQUESTER_ROLES = ['nursing', 'supervisor', 'manager', 'ceo', 'org_admin', 'super_admin']

const REQUEST_TYPES = [
  { key: 'meeting',     label: 'Staff Meeting',        icon: Users },
  { key: 'move_in',     label: 'Move-In Welcome',      icon: PartyPopper },
  { key: 'end_of_life', label: 'End-of-Life / Family',  icon: Heart },
  { key: 'other',       label: 'Other',                 icon: MoreHorizontal },
]

const STATUSES = [
  { key: 'requested', label: 'Requested', color: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400' },
  { key: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400' },
  { key: 'completed', label: 'Completed', color: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400' },
  { key: 'cancelled', label: 'Cancelled', color: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' },
]

const getType   = (key) => REQUEST_TYPES.find(t => t.key === key) || REQUEST_TYPES[3]
const getStatus = (key) => STATUSES.find(s => s.key === key) || STATUSES[0]
const inputCls = 'w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 dark:text-slate-100'
const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''
const fmtTime = (t) => {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h), ampm = hr >= 12 ? 'PM' : 'AM', h12 = hr % 12 || 12
  return `${h12}:${m} ${ampm}`
}

// ── Create/Edit Request Modal ───────────────────────────────────
// Exported so it can be launched directly from the Dashboard quick-link, not
// just from inside the Dietary module (nursing/supervisors often won't have
// the Dietary module in their nav at all).
export function ServiceRequestModal({ orgId, residents = [], onClose, onSaved }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    request_type: 'meeting',
    occasion:     '',
    resident_id:  '',
    headcount:    '',
    needed_date:  '',
    needed_time:  '',
    location:     '',
    notes:        '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.occasion.trim()) { setError('Occasion / who this is for is required.'); return }
    if (!form.needed_date) { setError('Date needed is required.'); return }
    setSaving(true); setError('')
    const payload = {
      organization_id: orgId,
      request_type: form.request_type,
      occasion:     form.occasion.trim(),
      resident_id:  form.resident_id || null,
      headcount:    form.headcount ? parseInt(form.headcount) : null,
      needed_date:  form.needed_date,
      needed_time:  form.needed_time || null,
      location:     form.location || null,
      notes:        form.notes || null,
      requested_by: profile?.id,
    }
    const { error: err } = await supabase.from('dietary_service_requests').insert(payload)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div>
            <h2 className="font-display font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Utensils size={16} className="text-brand-600" /> Request Food from Dietary
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Meeting catering, a move-in welcome tray, or a hospitality tray for family.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-400 text-sm">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Type</label>
            <div className="flex gap-2 flex-wrap">
              {REQUEST_TYPES.map(t => {
                const Icon = t.icon
                return (
                  <button key={t.key} onClick={() => set('request_type', t.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all
                      ${form.request_type === t.key ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
                    <Icon size={12} /> {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Occasion / Who this is for *</label>
            <input value={form.occasion} onChange={e => set('occasion', e.target.value)} className={inputCls}
              placeholder="e.g. Board Meeting, Smith Family — Move-In, Johnson Family — Vigil" />
          </div>

          {residents.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Resident (optional)</label>
              <select value={form.resident_id} onChange={e => set('resident_id', e.target.value)} className={inputCls}>
                <option value="">Not tied to a specific resident</option>
                {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name} — Room {r.room}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Date Needed *</label>
              <input type="date" value={form.needed_date} onChange={e => set('needed_date', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Time</label>
              <input type="time" value={form.needed_time} onChange={e => set('needed_time', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Headcount</label>
              <input type="number" min="1" value={form.headcount} onChange={e => set('headcount', e.target.value)} className={inputCls} placeholder="e.g. 12" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Location</label>
              <input value={form.location} onChange={e => set('location', e.target.value)} className={inputCls} placeholder="e.g. Conference Room B, Room 214" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} className={inputCls + ' resize-none'}
              placeholder="Dietary considerations, quantity/format preferences, anything the kitchen should know..." />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {saving ? 'Sending...' : 'Send Request'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Management view — lives inside the Dietary module ──────────
export default function ServiceRequests({ orgId, canManage }) {
  const { profile } = useAuth()
  const [requests, setRequests]   = useState([])
  const [residents, setResidents] = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('active')

  const canSubmit = canManage || REQUESTER_ROLES.includes(profile?.role)

  useEffect(() => { fetchAll() }, [orgId])

  async function fetchAll() {
    setLoading(true)
    const [{ data: reqs }, { data: res }] = await Promise.all([
      supabase.from('dietary_service_requests')
        .select('*, requester:requested_by(first_name,last_name), resident:resident_id(first_name,last_name,room)')
        .eq('organization_id', orgId)
        .order('needed_date', { ascending: true }),
      supabase.from('residents').select('id, first_name, last_name, room')
        .eq('organization_id', orgId).eq('is_active', true).order('last_name'),
    ])
    setRequests(reqs || [])
    setResidents(res || [])
    setLoading(false)
  }

  async function updateStatus(id, status) {
    const payload = { status, updated_at: new Date().toISOString() }
    if (status === 'completed') { payload.fulfilled_by = profile?.id; payload.fulfilled_at = new Date().toISOString() }
    await supabase.from('dietary_service_requests').update(payload).eq('id', id)
    fetchAll()
  }

  const filtered = requests.filter(r => {
    if (statusFilter === 'active') return !['completed', 'cancelled'].includes(r.status)
    if (statusFilter === 'all') return true
    return r.status === statusFilter
  })

  const pending   = requests.filter(r => r.status === 'requested').length
  const confirmed = requests.filter(r => r.status === 'confirmed').length
  const today     = new Date().toISOString().split('T')[0]
  const upcoming  = requests.filter(r => !['completed', 'cancelled'].includes(r.status) && r.needed_date >= today).length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Awaiting Confirmation', value: pending,   color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' },
          { label: 'Confirmed',             value: confirmed, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40' },
          { label: 'Upcoming',              value: upcoming,  color: 'text-brand-600 bg-brand-50 dark:bg-brand-950/40' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-2xl p-4`}>
            <div className={`text-3xl font-bold font-display ${s.color.split(' ')[0]}`}>{s.value}</div>
            <div className="text-xs font-medium text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {canSubmit && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors">
            <Plus size={16} /> New Request
          </button>
        )}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="active">Active (not completed / cancelled)</option>
          <option value="all">All statuses</option>
          {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label} only</option>)}
        </select>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} requests</span>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm py-16 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-brand-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm py-16 text-center text-slate-400">
          <Utensils size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No requests found</p>
          {canSubmit && <p className="text-sm mt-1">Click "New Request" to ask the kitchen for a meeting or hospitality meal.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const type = getType(r.request_type)
            const status = getStatus(r.status)
            const TypeIcon = type.icon
            return (
              <div key={r.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <TypeIcon size={16} className="text-slate-500 dark:text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{r.occasion}</span>
                      <span className="text-xs text-slate-400">{type.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>{status.label}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><CalendarClock size={11} /> {fmtDate(r.needed_date)}{r.needed_time ? ` · ${fmtTime(r.needed_time)}` : ''}</span>
                      {r.headcount && <span className="flex items-center gap-1"><Users size={11} /> {r.headcount}</span>}
                      {r.location && <span className="flex items-center gap-1"><MapPin size={11} /> {r.location}</span>}
                      {r.resident && <span>Resident: {r.resident.first_name} {r.resident.last_name} (Rm {r.resident.room})</span>}
                    </div>
                    {r.notes && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 italic">{r.notes}</p>}
                    <div className="text-xs text-slate-400 mt-1.5">
                      Requested by {r.requester ? `${r.requester.first_name} ${r.requester.last_name}` : 'Unknown'}
                    </div>
                  </div>
                  {canManage && !['completed', 'cancelled'].includes(r.status) && (
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      {r.status === 'requested' && (
                        <button onClick={() => updateStatus(r.id, 'confirmed')}
                          className="px-3 py-1 bg-blue-100 dark:bg-blue-950/50 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-semibold transition-colors">
                          Confirm
                        </button>
                      )}
                      {r.status === 'confirmed' && (
                        <button onClick={() => updateStatus(r.id, 'completed')}
                          className="px-3 py-1 bg-green-100 dark:bg-green-950/50 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 rounded-lg text-xs font-semibold transition-colors">
                          Mark Complete
                        </button>
                      )}
                      <button onClick={() => updateStatus(r.id, 'cancelled')}
                        className="flex items-center gap-1 px-3 py-1 text-slate-400 hover:text-red-500 rounded-lg text-xs font-medium transition-colors">
                        <Ban size={11} /> Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <ServiceRequestModal orgId={orgId} residents={residents} onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchAll() }} />
      )}
    </div>
  )
}
