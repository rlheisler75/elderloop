import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { X, Car, Clock, MapPin, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

// Trip requests (20261022_trip_requests.sql): Nursing staff and IL residents ask for
// a ride; only the Transportation department schedules it. Shared by the
// Transportation page and the resident portal.

export const APPT_TYPES = [
  { key: 'medical', label: 'Medical' },
  { key: 'dental',  label: 'Dental' },
  { key: 'therapy', label: 'Therapy' },
  { key: 'vision',  label: 'Vision' },
  { key: 'lab',     label: 'Lab / Tests' },
  { key: 'other',   label: 'Other' },
]

export const REQUEST_STATUS = {
  pending:   { label: 'Requested', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900' },
  scheduled: { label: 'Scheduled', cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900' },
  declined:  { label: 'Declined',  cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900' },
  cancelled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
}

const fmt12 = (t) => {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}
const fmtDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

const inputCls = 'w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
const labelCls = 'block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1'

// residents: list to pick from (staff). resident: the one resident (portal).
export function TripRequestModal({ residents = [], resident = null, onClose, onSaved }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    resident_id: resident?.id || '', appointment_date: '', appointment_time: '', appointment_type: 'medical',
    provider_name: '', provider_address: '', provider_phone: '', needs: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    const r = resident || residents.find(x => x.id === form.resident_id)
    if (!r) return setError('Choose the resident.')
    if (!form.appointment_date) return setError('Enter the appointment date.')
    setSaving(true); setError('')
    const { error: err } = await supabase.from('trip_requests').insert({
      organization_id:  profile.organization_id,
      resident_id:      r.id,
      resident_name:    `${r.first_name} ${r.last_name}`,
      unit:             r.unit || r.room || null,
      appointment_date: form.appointment_date,
      appointment_time: form.appointment_time || null,
      appointment_type: form.appointment_type,
      provider_name:    form.provider_name.trim() || null,
      provider_address: form.provider_address.trim() || null,
      provider_phone:   form.provider_phone.trim() || null,
      needs:            form.needs.trim() || null,
      notes:            form.notes.trim() || null,
      source:           resident ? 'resident' : 'staff',
      requested_by:     profile.id,
      requested_by_name: `${profile.first_name} ${profile.last_name}${resident ? ' (Resident)' : ''}`,
    })
    setSaving(false)
    if (err) return setError(err.message)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2"><Car size={18} className="text-brand-600" /><h2 className="font-display font-semibold text-slate-800 dark:text-slate-100">Request a Ride</h2></div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <p className="text-sm text-slate-500">Transportation will schedule the ride and set the pickup time.</p>
          {!resident && (
            <div><label className={labelCls}>Resident *</label>
              <select value={form.resident_id} onChange={e => set('resident_id', e.target.value)} className={inputCls}>
                <option value="">Choose a resident…</option>
                {residents.map(r => <option key={r.id} value={r.id}>{r.last_name}, {r.first_name}{r.room ? ` · ${r.room}` : ''}</option>)}
              </select></div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Appointment date *</label><input type="date" min={localToday()} value={form.appointment_date} onChange={e => set('appointment_date', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Appointment time</label><input type="time" value={form.appointment_time} onChange={e => set('appointment_time', e.target.value)} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Type</label>
            <div className="flex flex-wrap gap-1.5">
              {APPT_TYPES.map(t => (
                <button key={t.key} type="button" onClick={() => set('appointment_type', t.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${form.appointment_type === t.key ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>{t.label}</button>
              ))}
            </div></div>
          <div><label className={labelCls}>Where (doctor or place)</label><input value={form.provider_name} onChange={e => set('provider_name', e.target.value)} className={inputCls} placeholder="e.g. Dr. Lee, Valley Eye Clinic" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Address</label><input value={form.provider_address} onChange={e => set('provider_address', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Phone</label><input value={form.provider_phone} onChange={e => set('provider_phone', e.target.value)} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Needs</label><input value={form.needs} onChange={e => set('needs', e.target.value)} className={inputCls} placeholder="e.g. wheelchair, walker, escort" /></div>
          <div><label className={labelCls}>Notes</label><textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} className={inputCls} /></div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500">Cancel</button>
          <button onClick={submit} disabled={saving} className="flex items-center gap-1.5 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl">
            {saving && <Loader2 size={14} className="animate-spin" />} Send request
          </button>
        </div>
      </div>
    </div>
  )
}

// canSchedule: Transportation works the queue (Schedule / Decline). Everyone may
// cancel their own pending request.
export function TripRequestList({ requests, canSchedule = false, onSchedule, onChanged, emptyText = 'No ride requests.' }) {
  const { profile } = useAuth()
  const [declining, setDeclining] = useState(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')

  const update = async (id, patch) => {
    setBusy(id); setError('')
    const { error: err } = await supabase.from('trip_requests').update(patch).eq('id', id)
    setBusy(null)
    if (err) return setError(err.message)
    setDeclining(null); setReason('')
    onChanged?.()
  }

  if (!requests.length) return <div className="py-10 text-center text-slate-400 text-sm">{emptyText}</div>

  return (
    <div className="space-y-3">
      {error && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
      {requests.map(r => {
        const s = REQUEST_STATUS[r.status] || REQUEST_STATUS.pending
        const mine = r.requested_by === profile?.id
        return (
          <div key={r.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-slate-800 dark:text-slate-100">{r.resident_name}{r.unit && <span className="text-xs font-normal text-slate-400"> · {r.unit}</span>}</div>
                <div className="text-sm text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  <span className="flex items-center gap-1"><Clock size={13} className="text-slate-400" /> {fmtDate(r.appointment_date)}{r.appointment_time && ` at ${fmt12(r.appointment_time)}`}</span>
                  <span>{APPT_TYPES.find(t => t.key === r.appointment_type)?.label || r.appointment_type}</span>
                  {r.provider_name && <span className="flex items-center gap-1"><MapPin size={13} className="text-slate-400" /> {r.provider_name}</span>}
                </div>
                {r.needs && <div className="text-xs text-slate-500 mt-1">Needs: {r.needs}</div>}
                {r.notes && <div className="text-xs text-slate-500 mt-1">{r.notes}</div>}
                <div className="text-xs text-slate-400 mt-1">Requested by {r.requested_by_name || 'staff'} · {new Date(r.requested_at).toLocaleDateString()}</div>
                {r.status === 'scheduled' && r.scheduled_date && (
                  <div className="text-sm text-blue-700 dark:text-blue-400 font-medium mt-1">Ride on {fmtDate(r.scheduled_date)}{r.scheduled_pickup && `, pickup ${fmt12(r.scheduled_pickup)}`}</div>
                )}
                {r.status === 'declined' && <div className="text-sm text-red-700 dark:text-red-400 mt-1">{r.decline_reason || 'Declined'}</div>}
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${s.cls}`}>{s.label}</span>
            </div>
            {r.status === 'pending' && (canSchedule || mine) && (
              declining === r.id ? (
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (the requester sees it)" className={`${inputCls} flex-1 min-w-[200px]`} />
                  <button onClick={() => update(r.id, { status: 'declined', decline_reason: reason.trim() || null })} disabled={busy === r.id}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg">Decline</button>
                  <button onClick={() => setDeclining(null)} className="px-3 py-2 text-xs text-slate-500">Back</button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 mt-3">
                  {canSchedule && (
                    <>
                      <button onClick={() => onSchedule(r)} className="flex items-center gap-1 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg"><CheckCircle2 size={13} /> Schedule</button>
                      <button onClick={() => setDeclining(r.id)} className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-lg"><XCircle size={13} /> Decline</button>
                    </>
                  )}
                  {mine && (
                    <button onClick={() => update(r.id, { status: 'cancelled' })} disabled={busy === r.id}
                      className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-red-600">Cancel request</button>
                  )}
                </div>
              )
            )}
          </div>
        )
      })}
    </div>
  )
}
