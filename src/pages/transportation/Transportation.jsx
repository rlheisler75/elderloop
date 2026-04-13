import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, X, Edit2, Trash2, Search, Printer,
  Car, Calendar, Clock, MapPin, Phone, User,
  ChevronLeft, ChevronRight, CheckCircle2,
  AlertCircle, XCircle, Navigation, FileText
} from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────
const TRIP_STATUSES = [
  { key: 'scheduled',   label: 'Scheduled',   color: 'bg-blue-50 text-blue-700 border-blue-200',    dot: 'bg-blue-500' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-brand-50 text-brand-700 border-brand-200', dot: 'bg-brand-500' },
  { key: 'completed',   label: 'Completed',   color: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
  { key: 'cancelled',   label: 'Cancelled',   color: 'bg-slate-100 text-slate-500 border-slate-200',dot: 'bg-slate-400' },
  { key: 'no_show',     label: 'No Show',     color: 'bg-red-50 text-red-700 border-red-200',       dot: 'bg-red-400' },
]

const APPT_TYPES = [
  { key: 'medical',   label: 'Medical' },
  { key: 'dental',    label: 'Dental' },
  { key: 'therapy',   label: 'Therapy' },
  { key: 'vision',    label: 'Vision' },
  { key: 'lab',       label: 'Lab / Tests' },
  { key: 'other',     label: 'Other' },
]

const getStatus  = (key) => TRIP_STATUSES.find(s => s.key === key) || TRIP_STATUSES[0]
const getApptType = (key) => APPT_TYPES.find(t => t.key === key)?.label || key

const fmt12 = (t) => {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

const toDateStr = (d) => d.toISOString().split('T')[0]
const today = () => toDateStr(new Date())

// ── Status Badge ───────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = getStatus(status)
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

// ── Daily Trip Sheet Print ─────────────────────────────────────
function TripSheetPrint({ trips, date, orgName, onClose }) {
  const printRef = useRef()

  const handlePrint = () => {
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>Daily Trip Sheet - ${date}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; font-size: 13px; }
        h2 { margin: 0; font-size: 18px; }
        .sub { color: #666; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
        td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        .status { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; }
        .scheduled { background: #dbeafe; color: #1d4ed8; }
        .completed { background: #dcfce7; color: #16a34a; }
        .cancelled { background: #f1f5f9; color: #64748b; }
        .no_show { background: #fee2e2; color: #dc2626; }
        .in_progress { background: #dbeafe; color: #0072bf; }
        .sig-line { margin-top: 40px; border-top: 1px solid #000; width: 200px; display: inline-block; padding-top: 4px; font-size: 11px; color: #666; }
        @media print { button { display: none; } }
      </style></head>
      <body>
        <h2>${orgName}</h2>
        <div class="sub">Daily Transportation Sheet &mdash; ${new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Resident</th>
              <th>Unit</th>
              <th>Pickup</th>
              <th>Appointment</th>
              <th>Provider</th>
              <th>Appt Time</th>
              <th>Est. Return</th>
              <th>Driver</th>
              <th>Status</th>
              <th>Mileage</th>
            </tr>
          </thead>
          <tbody>
            ${trips.map((t, i) => `
              <tr>
                <td>${i + 1}</td>
                <td><strong>${t.resident_name}</strong>${t.phone ? `<br><small>${t.phone}</small>` : ''}</td>
                <td>${t.unit || '—'}</td>
                <td>${fmt12(t.pickup_time)}</td>
                <td>${getApptType(t.appointment_type)}</td>
                <td>${t.provider_name || '—'}${t.provider_address ? `<br><small>${t.provider_address}</small>` : ''}</td>
                <td>${t.appointment_time ? fmt12(t.appointment_time) : '—'}</td>
                <td>${t.return_time ? fmt12(t.return_time) : '—'}</td>
                <td>${t.driver_name || '—'}</td>
                <td><span class="status ${t.status}">${getStatus(t.status).label}</span></td>
                <td>${t.mileage_start || ''}${t.mileage_start && t.mileage_end ? ' → ' + t.mileage_end : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top:32px">
          <div class="sig-line">Driver Signature</div>
          &nbsp;&nbsp;&nbsp;
          <div class="sig-line">Supervisor Signature</div>
        </div>
        <div style="margin-top:16px; font-size:11px; color:#999;">Printed ${new Date().toLocaleString()} &middot; ElderLoop Transportation</div>
      </body></html>`)
    win.document.close()
    win.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-display font-semibold text-slate-800">Daily Trip Sheet</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="px-6 py-5">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 mb-4">
            <div className="text-sm font-medium text-slate-700 mb-1">
              {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="text-xs text-slate-500">{trips.length} trip{trips.length !== 1 ? 's' : ''} scheduled</div>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {trips.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3 text-sm p-2 rounded-lg border border-slate-100">
                <span className="text-xs font-bold text-slate-400 w-5">{i + 1}</span>
                <div className="flex-1">
                  <span className="font-medium text-slate-800">{t.resident_name}</span>
                  <span className="text-slate-400 ml-2 text-xs">{fmt12(t.pickup_time)} · {getApptType(t.appointment_type)}</span>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
            {trips.length === 0 && <p className="text-slate-400 text-sm text-center py-4">No trips for this date.</p>}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Close</button>
          <button onClick={handlePrint} disabled={trips.length === 0}
            className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            <Printer size={15} /> Print Sheet
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Trip Modal ─────────────────────────────────────────────────
function TripModal({ trip, vehicles, onClose, onSave }) {
  const { profile } = useAuth()
  const isNew = !trip
  const [form, setForm] = useState({
    resident_name:    trip?.resident_name    || '',
    unit:             trip?.unit             || '',
    phone:            trip?.phone            || '',
    trip_date:        trip?.trip_date        || today(),
    pickup_time:      trip?.pickup_time      || '',
    return_time:      trip?.return_time      || '',
    appointment_type: trip?.appointment_type || 'medical',
    provider_name:    trip?.provider_name    || '',
    provider_address: trip?.provider_address || '',
    provider_phone:   trip?.provider_phone   || '',
    appointment_time: trip?.appointment_time || '',
    driver_name:      trip?.driver_name      || '',
    vehicle_id:       trip?.vehicle_id       || '',
    status:           trip?.status           || 'scheduled',
    actual_pickup:    trip?.actual_pickup    || '',
    actual_return:    trip?.actual_return    || '',
    mileage_start:    trip?.mileage_start    || '',
    mileage_end:      trip?.mileage_end      || '',
    notes:            trip?.notes            || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.resident_name.trim() || !form.trip_date || !form.pickup_time) {
      setError('Resident name, date and pickup time are required'); return
    }
    setSaving(true)
    const payload = {
      ...form,
      organization_id: profile.organization_id,
      scheduled_by: profile.id,
      vehicle_id: form.vehicle_id || null,
      mileage_start: form.mileage_start ? parseInt(form.mileage_start) : null,
      mileage_end:   form.mileage_end   ? parseInt(form.mileage_end)   : null,
      return_time:      form.return_time      || null,
      actual_pickup:    form.actual_pickup    || null,
      actual_return:    form.actual_return    || null,
      appointment_time: form.appointment_time || null,
      updated_at: new Date().toISOString(),
    }
    let err
    if (trip?.id) {
      ({ error: err } = await supabase.from('trips').update(payload).eq('id', trip.id))
    } else {
      ({ error: err } = await supabase.from('trips').insert(payload))
    }
    if (err) { setError(err.message); setSaving(false); return }
    onSave()
  }

  const showActuals = ['in_progress','completed'].includes(form.status)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Car size={18} className="text-brand-600" />
            <h2 className="font-display font-semibold text-slate-800">
              {isNew ? 'Schedule Trip' : `Edit Trip — ${trip.resident_name}`}
            </h2>
            {!isNew && <StatusBadge status={form.status} />}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          {/* Resident */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Resident</label>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <input value={form.resident_name} onChange={e => set('resident_name', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Full name *" />
              </div>
              <input value={form.unit} onChange={e => set('unit', e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Unit" />
            </div>
            <input value={form.phone} onChange={e => set('phone', e.target.value)}
              className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Phone number" />
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Schedule</label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Date *</label>
                <input type="date" value={form.trip_date} onChange={e => set('trip_date', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Pickup *</label>
                <input type="time" value={form.pickup_time} onChange={e => set('pickup_time', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Est. Return</label>
                <input type="time" value={form.return_time} onChange={e => set('return_time', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>
          </div>

          {/* Appointment */}
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
            <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
              <MapPin size={13} /> Appointment Details
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Type</label>
                <select value={form.appointment_type} onChange={e => set('appointment_type', e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                  {APPT_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Appt Time</label>
                <input type="time" value={form.appointment_time} onChange={e => set('appointment_time', e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
              </div>
            </div>
            <input value={form.provider_name} onChange={e => set('provider_name', e.target.value)}
              className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              placeholder="Provider / Clinic name" />
            <input value={form.provider_address} onChange={e => set('provider_address', e.target.value)}
              className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              placeholder="Address" />
            <input value={form.provider_phone} onChange={e => set('provider_phone', e.target.value)}
              className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              placeholder="Provider phone" />
          </div>

          {/* Driver & Vehicle */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Driver</label>
              <input value={form.driver_name} onChange={e => set('driver_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Driver name" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Vehicle</label>
              <select value={form.vehicle_id} onChange={e => set('vehicle_id', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Select vehicle</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          </div>

          {/* Status */}
          {!isNew && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Status</label>
              <div className="flex flex-wrap gap-2">
                {TRIP_STATUSES.map(s => (
                  <button key={s.key} onClick={() => set('status', s.key)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${form.status === s.key ? s.color + ' ring-2 ring-offset-1 ring-brand-400' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actuals / Trip Log */}
          {(showActuals || !isNew) && (
            <div className="p-4 bg-green-50 border border-green-100 rounded-xl space-y-3">
              <label className="block text-xs font-semibold text-green-700 uppercase tracking-wide flex items-center gap-1.5">
                <FileText size={13} /> Trip Log
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Actual Pickup</label>
                  <input type="time" value={form.actual_pickup} onChange={e => set('actual_pickup', e.target.value)}
                    className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Actual Return</label>
                  <input type="time" value={form.actual_return} onChange={e => set('actual_return', e.target.value)}
                    className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Mileage Start</label>
                  <input type="number" value={form.mileage_start} onChange={e => set('mileage_start', e.target.value)}
                    className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                    placeholder="Odometer out" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Mileage End</label>
                  <input type="number" value={form.mileage_end} onChange={e => set('mileage_end', e.target.value)}
                    className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                    placeholder="Odometer in" />
                </div>
              </div>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white resize-none"
                placeholder="Trip notes..." />
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving...' : isNew ? 'Schedule Trip' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Transportation Page ───────────────────────────────────
export default function Transportation() {
  const { profile, organization } = useAuth()
  const [trips, setTrips]         = useState([])
  const [vehicles, setVehicles]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [selectedDate, setSelectedDate] = useState(today())
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [view, setView]           = useState('day') // 'day' | 'list'
  const [showModal, setShowModal] = useState(false)
  const [editTrip, setEditTrip]   = useState(null)
  const [showPrint, setShowPrint] = useState(false)

  useEffect(() => { if (organization) fetchAll() }, [organization])

  async function fetchAll() {
    setLoading(true)
    const [tripsRes, vehiclesRes] = await Promise.all([
      supabase.from('trips').select('*')
        .eq('organization_id', organization.id)
        .order('trip_date', { ascending: true })
        .order('pickup_time', { ascending: true }),
      supabase.from('vehicles').select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true),
    ])
    setTrips(tripsRes.data || [])
    setVehicles(vehiclesRes.data || [])
    setLoading(false)
  }

  const handleEdit  = (t) => { setEditTrip(t); setShowModal(true) }
  const handleNew   = () => { setEditTrip(null); setShowModal(true) }
  const handleSave  = () => { setShowModal(false); fetchAll() }

  const handleDelete = async (id) => {
    if (!confirm('Delete this trip?')) return
    await supabase.from('trips').delete().eq('id', id)
    fetchAll()
  }

  const shiftDate = (days) => {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + days)
    setSelectedDate(toDateStr(d))
  }

  // Day view trips
  const dayTrips = trips
    .filter(t => t.trip_date === selectedDate)
    .sort((a, b) => a.pickup_time.localeCompare(b.pickup_time))

  // List view trips (all, filtered)
  const listTrips = trips.filter(t => {
    const matchSearch = !search || `${t.resident_name} ${t.unit} ${t.provider_name}`.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || t.status === filterStatus
    return matchSearch && matchStatus
  })

  // Stats
  const todayTrips    = trips.filter(t => t.trip_date === today())
  const upcomingCount = trips.filter(t => t.trip_date > today() && t.status === 'scheduled').length
  const thisMonth     = trips.filter(t => {
    const d = new Date(t.trip_date)
    const n = new Date()
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
  }).length

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800">Transportation</h1>
          <p className="text-slate-500 text-sm mt-0.5">Medical transport scheduling and trip logs</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPrint(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600 rounded-xl text-sm font-medium transition-colors">
            <Printer size={15} /> Trip Sheet
          </button>
          <button onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus size={15} /> Schedule Trip
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Today's Trips",  value: todayTrips.length,  color: 'text-brand-600',  bg: 'bg-brand-50' },
          { label: 'Upcoming',       value: upcomingCount,      color: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: 'This Month',     value: thisMonth,          color: 'text-green-600',  bg: 'bg-green-50' },
          { label: 'Vehicles',       value: vehicles.length,    color: 'text-slate-600',  bg: 'bg-slate-100' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
            <div className={`text-3xl font-display font-bold ${s.color}`}>{s.value}</div>
            <div className="text-slate-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setView('day')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${view === 'day' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}>
            Day View
          </button>
          <button onClick={() => setView('list')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${view === 'list' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}>
            All Trips
          </button>
        </div>
      </div>

      {/* DAY VIEW */}
      {view === 'day' && (
        <>
          {/* Date nav */}
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => shiftDate(-1)}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div className="flex-1 text-center">
              <div className="font-display font-semibold text-slate-800">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              {selectedDate === today() && <div className="text-xs text-brand-500 font-medium mt-0.5">Today</div>}
            </div>
            <button onClick={() => shiftDate(1)}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Also show date picker */}
          <div className="flex justify-center mb-5">
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>

          {loading ? (
            <div className="text-center py-16 text-slate-400">Loading...</div>
          ) : dayTrips.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Car size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-display text-lg">No trips scheduled</p>
              <p className="text-sm mt-1">Click "Schedule Trip" to add one.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dayTrips.map((t, i) => (
                <div key={t.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="text-center flex-shrink-0 w-14">
                        <div className="font-display text-lg font-bold text-brand-600">{fmt12(t.pickup_time).split(' ')[0]}</div>
                        <div className="text-xs text-slate-400">{fmt12(t.pickup_time).split(' ')[1]}</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-display font-semibold text-slate-800">{t.resident_name}</span>
                          {t.unit && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Unit {t.unit}</span>}
                          <StatusBadge status={t.status} />
                        </div>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <MapPin size={11} className="text-slate-400" />
                            {getApptType(t.appointment_type)}{t.provider_name ? ` — ${t.provider_name}` : ''}
                          </span>
                          {t.appointment_time && (
                            <span className="flex items-center gap-1">
                              <Clock size={11} className="text-slate-400" />
                              Appt {fmt12(t.appointment_time)}
                            </span>
                          )}
                          {t.return_time && (
                            <span className="flex items-center gap-1">
                              <Navigation size={11} className="text-slate-400" />
                              Return {fmt12(t.return_time)}
                            </span>
                          )}
                          {t.driver_name && (
                            <span className="flex items-center gap-1">
                              <User size={11} className="text-slate-400" />
                              {t.driver_name}
                            </span>
                          )}
                          {t.phone && (
                            <span className="flex items-center gap-1">
                              <Phone size={11} className="text-slate-400" />
                              {t.phone}
                            </span>
                          )}
                        </div>
                        {t.provider_address && (
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <MapPin size={11} /> {t.provider_address}
                          </div>
                        )}
                        {t.mileage_start && t.mileage_end && (
                          <div className="text-xs text-green-600 mt-1 font-medium">
                            {t.mileage_end - t.mileage_start} miles
                          </div>
                        )}
                        {t.notes && <div className="text-xs text-slate-400 italic mt-1">{t.notes}</div>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => handleEdit(t)}
                        className="p-2 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(t.id)}
                        className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by resident, unit, or provider..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
              <option value="all">All Statuses</option>
              {TRIP_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Resident</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Pickup</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Appointment</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Driver</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {listTrips.map(t => (
                  <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => handleEdit(t)}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 text-sm">{t.resident_name}</div>
                      {t.unit && <div className="text-xs text-slate-400">Unit {t.unit}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {new Date(t.trip_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{fmt12(t.pickup_time)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {getApptType(t.appointment_type)}
                      {t.provider_name && <div className="text-slate-400">{t.provider_name}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{t.driver_name || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleDelete(t.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
                {listTrips.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">No trips found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-xs text-slate-400 text-right">{listTrips.length} trip{listTrips.length !== 1 ? 's' : ''}</div>
        </>
      )}

      {/* Modals */}
      {showModal && (
        <TripModal trip={editTrip} vehicles={vehicles}
          onClose={() => setShowModal(false)} onSave={handleSave} />
      )}
      {showPrint && (
        <TripSheetPrint trips={dayTrips} date={selectedDate}
          orgName={organization?.name} onClose={() => setShowPrint(false)} />
      )}
    </div>
  )
}
