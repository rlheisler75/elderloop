import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Shield, Plus, X, Edit2, Trash2, Search, MapPin,
  Navigation, CheckCircle2, XCircle, Clock, Play,
  Square, AlertTriangle, ChevronRight, Users,
  RefreshCw, Map, List, Crosshair, Bell, Check, FileText
} from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────
const toRad = d => d * Math.PI / 180

// Haversine distance in feet between two GPS coords
function distanceFeet(lat1, lon1, lat2, lon2) {
  const R = 20902231 // Earth radius in feet
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat/2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) ** 2
  return Math.round(R * 2 * Math.asin(Math.sqrt(a)))
}

const timeAgo = (ts) => {
  if (!ts) return 'Never'
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const fmt = (ts) => ts ? new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'

// ── GPS Checkpoint Modal ───────────────────────────────────────
function CheckpointModal({ checkpoint, onClose, onSave }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    name:         checkpoint?.name        || '',
    description:  checkpoint?.description || '',
    latitude:     checkpoint?.latitude    || '',
    longitude:    checkpoint?.longitude   || '',
    radius_feet:  checkpoint?.radius_feet || 100,
  })
  const [locating, setLocating] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const useMyLocation = () => {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        set('latitude',  pos.coords.latitude.toFixed(7))
        set('longitude', pos.coords.longitude.toFixed(7))
        setLocating(false)
      },
      err => { setError('Could not get location: ' + err.message); setLocating(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return }
    if (!form.latitude || !form.longitude) { setError('GPS coordinates are required — use "Use My Location" or enter manually'); return }
    setSaving(true)
    const payload = {
      name:        form.name.trim(),
      description: form.description || null,
      latitude:    parseFloat(form.latitude),
      longitude:   parseFloat(form.longitude),
      radius_feet: parseInt(form.radius_feet) || 100,
      organization_id: profile.organization_id,
      created_by:  profile.id,
    }
    let err
    if (checkpoint?.id) {
      ({ error: err } = await supabase.from('security_checkpoints').update(payload).eq('id', checkpoint.id))
    } else {
      ({ error: err } = await supabase.from('security_checkpoints').insert({ ...payload, is_active: true }))
    }
    if (err) { setError(err.message); setSaving(false); return }
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-display font-semibold text-slate-800">{checkpoint ? 'Edit Checkpoint' : 'New Checkpoint'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Checkpoint Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Front Entrance, Parking Lot B, Chapel" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
            <input value={form.description} onChange={e => set('description', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Optional notes about this location" />
          </div>

          {/* GPS */}
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <MapPin size={13} /> GPS Coordinates
            </label>
            <button onClick={useMyLocation} disabled={locating}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-xl transition-colors mb-3">
              <Crosshair size={15} />
              {locating ? 'Getting location...' : 'Use My Current Location'}
            </button>
            <p className="text-xs text-blue-600 text-center mb-3">— or enter manually —</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Latitude</label>
                <input type="number" step="0.0000001" value={form.latitude} onChange={e => set('latitude', e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  placeholder="37.1234567" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Longitude</label>
                <input type="number" step="0.0000001" value={form.longitude} onChange={e => set('longitude', e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  placeholder="-93.1234567" />
              </div>
            </div>
            {form.latitude && form.longitude && (
              <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                <Check size={12} /> Coordinates set
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Check-in Radius (feet)
            </label>
            <div className="flex items-center gap-3">
              <input type="range" min={25} max={500} step={25} value={form.radius_feet}
                onChange={e => set('radius_feet', e.target.value)}
                className="flex-1" />
              <span className="text-sm font-bold text-brand-600 w-16 text-right">{form.radius_feet} ft</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Guard must be within this distance to check in</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving...' : 'Save Checkpoint'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Guard Round View ───────────────────────────────────────────
function GuardRoundView({ checkpoints, onClose, guardId, orgId }) {
  const [round, setRound]         = useState(null)
  const [checkins, setCheckins]   = useState([])
  const [position, setPosition]   = useState(null)
  const [locating, setLocating]   = useState(false)
  const [checking, setChecking]   = useState(null) // checkpoint id being checked
  const [message, setMessage]     = useState(null) // { type, text }
  const [completed, setCompleted] = useState(false)
  const watchRef = useRef(null)

  // Start tracking GPS
  useEffect(() => {
    watchRef.current = navigator.geolocation.watchPosition(
      pos => setPosition({ lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy }),
      err => console.warn('GPS error:', err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
    return () => navigator.geolocation.clearWatch(watchRef.current)
  }, [])

  // Start round on mount
  useEffect(() => { startRound() }, [])

  async function startRound() {
    const { data } = await supabase.from('security_rounds').insert({
      organization_id: orgId,
      guard_id: guardId,
      status: 'in_progress',
      started_at: new Date().toISOString(),
    }).select().single()
    setRound(data)
  }

  async function handleCheckin(checkpoint) {
    if (!position) { setMessage({ type: 'error', text: 'Waiting for GPS signal...' }); return }
    if (checking) return
    setChecking(checkpoint.id)

    const dist = distanceFeet(position.lat, position.lon, parseFloat(checkpoint.latitude), parseFloat(checkpoint.longitude))
    const passed = dist <= parseInt(checkpoint.radius_feet)

    await supabase.from('security_checkins').insert({
      round_id:      round.id,
      checkpoint_id: checkpoint.id,
      guard_id:      guardId,
      latitude:      position.lat,
      longitude:     position.lon,
      distance_feet: dist,
      passed,
      checked_in_at: new Date().toISOString(),
    })

    setCheckins(c => [...c, { checkpoint_id: checkpoint.id, passed, distance_feet: dist }])
    setMessage({
      type: passed ? 'success' : 'error',
      text: passed
        ? `✓ Checked in at ${checkpoint.name} (${dist} ft away)`
        : `✗ Too far from ${checkpoint.name} — you are ${dist} ft away (max ${checkpoint.radius_feet} ft)`
    })
    setTimeout(() => setMessage(null), 4000)
    setChecking(null)
  }

  async function endRound() {
    const allChecked  = checkpoints.every(cp => checkins.some(c => c.checkpoint_id === cp.id && c.passed))
    const status = allChecked ? 'completed' : 'incomplete'
    await supabase.from('security_rounds').update({
      status, completed_at: new Date().toISOString()
    }).eq('id', round.id)
    setCompleted(true)
  }

  const getCheckin = (cpId) => checkins.find(c => c.checkpoint_id === cpId)
  const checkedCount = checkpoints.filter(cp => checkins.some(c => c.checkpoint_id === cp.id && c.passed)).length

  if (completed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm text-center p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h2 className="font-display text-xl font-semibold text-slate-800 mb-2">Round Complete</h2>
          <p className="text-slate-500 text-sm mb-2">{checkedCount} of {checkpoints.length} checkpoints verified</p>
          <p className="text-xs text-slate-400 mb-6">
            {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <button onClick={onClose}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors">
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 bg-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white font-semibold">Security Round</span>
        </div>
        <div className="text-right">
          <div className="text-white/60 text-xs">GPS</div>
          <div className={`text-xs font-medium ${position ? 'text-green-400' : 'text-amber-400'}`}>
            {position ? `±${Math.round(position.acc)}ft` : 'Acquiring...'}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 py-3 bg-slate-800/50 flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-white/60 mb-1.5">
          <span>{checkedCount} of {checkpoints.length} checkpoints</span>
          <span>{Math.round(checkedCount / checkpoints.length * 100)}%</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-green-400 rounded-full transition-all duration-500"
            style={{ width: `${checkedCount / checkpoints.length * 100}%` }} />
        </div>
      </div>

      {/* Message toast */}
      {message && (
        <div className={`mx-4 mt-3 px-4 py-3 rounded-xl text-sm font-medium flex-shrink-0 ${message.type === 'success' ? 'bg-green-900 text-green-300 border border-green-700' : 'bg-red-900 text-red-300 border border-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Checkpoints */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {checkpoints.map((cp, i) => {
          const checkin  = getCheckin(cp.id)
          const dist     = position ? distanceFeet(position.lat, position.lon, parseFloat(cp.latitude), parseFloat(cp.longitude)) : null
          const inRange  = dist != null && dist <= parseInt(cp.radius_feet)
          const isChecking = checking === cp.id

          return (
            <div key={cp.id} className={`rounded-2xl border p-4 transition-all ${
              checkin?.passed ? 'bg-green-900/30 border-green-700' :
              checkin && !checkin.passed ? 'bg-red-900/20 border-red-800' :
              'bg-slate-800 border-slate-700'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    checkin?.passed ? 'bg-green-500 text-white' :
                    checkin && !checkin.passed ? 'bg-red-500 text-white' :
                    'bg-slate-600 text-white'}`}>
                    {checkin?.passed ? '✓' : checkin ? '✗' : i + 1}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{cp.name}</div>
                    {cp.description && <div className="text-white/40 text-xs">{cp.description}</div>}
                  </div>
                </div>
                {checkin && (
                  <div className="text-right">
                    <div className={`text-xs font-medium ${checkin.passed ? 'text-green-400' : 'text-red-400'}`}>
                      {checkin.passed ? 'Verified' : 'Failed'}
                    </div>
                    <div className="text-white/30 text-xs">{checkin.distance_feet}ft away</div>
                  </div>
                )}
              </div>

              {/* Distance indicator */}
              {!checkin && dist != null && (
                <div className={`flex items-center gap-2 mb-3 text-xs ${inRange ? 'text-green-400' : 'text-white/50'}`}>
                  <Navigation size={11} />
                  <span>{dist} ft away {inRange ? '— in range!' : `(need within ${cp.radius_feet}ft)`}</span>
                  {inRange && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
                </div>
              )}

              {!checkin && (
                <button onClick={() => handleCheckin(cp)} disabled={isChecking || !round}
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                    inRange
                      ? 'bg-green-500 hover:bg-green-400 text-white shadow-lg shadow-green-900/50'
                      : 'bg-slate-700 text-white/40 cursor-not-allowed'
                  }`}>
                  {isChecking ? 'Checking in...' : inRange ? '✓ Check In Here' : 'Move Closer to Check In'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-4 bg-slate-800 flex-shrink-0 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => {
            // Store round ID in sessionStorage so report modal can link to it
            sessionStorage.setItem('securityRoundId', round?.id || '')
            // Open report via custom event
            window.dispatchEvent(new CustomEvent('openSecurityReport', { detail: { roundId: round?.id } }))
          }}
            className="py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
            <FileText size={14} /> File Report
          </button>
          <button onClick={endRound}
            className="py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
            <Square size={14} /> End Round
          </button>
        </div>
        <button onClick={onClose} className="w-full py-2 text-white/40 text-sm hover:text-white/60 transition-colors">
          Cancel (round will be saved as incomplete)
        </button>
      </div>
    </div>
  )
}

// ── Round History ──────────────────────────────────────────────
function RoundHistory({ round, checkpoints, onClose }) {
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => { fetchCheckins() }, [])

  async function fetchCheckins() {
    const { data } = await supabase.from('security_checkins')
      .select('*, security_checkpoints(name, radius_feet)')
      .eq('round_id', round.id)
      .order('checked_in_at')
    setCheckins(data || [])
    setLoading(false)
  }

  const duration = round.completed_at
    ? Math.round((new Date(round.completed_at) - new Date(round.started_at)) / 60000)
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-display font-semibold text-slate-800">Round Detail</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {new Date(round.started_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} ·
              Started {fmt(round.started_at)}
              {duration && ` · ${duration} min`}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-sm">Loading...</div>
          ) : (
            <div className="space-y-3">
              {checkpoints.map(cp => {
                const checkin = checkins.find(c => c.checkpoint_id === cp.id)
                return (
                  <div key={cp.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                    checkin?.passed ? 'bg-green-50 border-green-200' :
                    checkin ? 'bg-red-50 border-red-200' :
                    'bg-slate-50 border-slate-200'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      checkin?.passed ? 'bg-green-500' : checkin ? 'bg-red-500' : 'bg-slate-300'}`}>
                      {checkin?.passed
                        ? <CheckCircle2 size={16} className="text-white" />
                        : checkin
                        ? <XCircle size={16} className="text-white" />
                        : <Clock size={16} className="text-white" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-800 text-sm">{cp.name}</div>
                      {checkin ? (
                        <div className="text-xs text-slate-500 mt-0.5">
                          {fmt(checkin.checked_in_at)} · {checkin.distance_feet}ft away
                          {!checkin.passed && <span className="text-red-600 ml-1">— outside {cp.radius_feet}ft radius</span>}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">Not checked in</div>
                      )}
                    </div>
                    {checkin?.passed
                      ? <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                      : checkin
                      ? <XCircle size={16} className="text-red-400 flex-shrink-0" />
                      : <AlertTriangle size={16} className="text-slate-400 flex-shrink-0" />}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <div className="flex items-center justify-between text-sm mb-4">
            <span className="text-slate-500">Completion</span>
            <span className={`font-semibold ${round.status === 'completed' ? 'text-green-600' : round.status === 'incomplete' ? 'text-amber-600' : 'text-blue-600'}`}>
              {round.status === 'completed' ? '✓ All checkpoints verified' :
               round.status === 'incomplete' ? '⚠ Some checkpoints missed' : 'In progress'}
            </span>
          </div>
          <button onClick={onClose}
            className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Security Report Modal ─────────────────────────────────────
const REPORT_TYPES = [
  { key: 'general',             label: 'General Log' },
  { key: 'suspicious_activity', label: 'Suspicious Activity' },
  { key: 'trespassing',         label: 'Trespassing' },
  { key: 'theft',               label: 'Theft' },
  { key: 'vandalism',           label: 'Vandalism' },
  { key: 'disturbance',         label: 'Disturbance' },
  { key: 'medical',             label: 'Medical' },
  { key: 'fire_hazard',         label: 'Fire Hazard' },
  { key: 'safety_hazard',       label: 'Safety Hazard' },
  { key: 'resident_concern',    label: 'Resident Concern' },
  { key: 'visitor_issue',       label: 'Visitor Issue' },
  { key: 'vehicle',             label: 'Vehicle' },
  { key: 'other',               label: 'Other' },
]

const REPORT_PRIORITIES = [
  { key: 'low',    label: 'Low',    color: 'bg-slate-100 text-slate-600' },
  { key: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  { key: 'high',   label: 'High',   color: 'bg-orange-100 text-orange-700' },
  { key: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' },
]

const REPORT_STATUSES = [
  { key: 'open',         label: 'Open',         color: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500' },
  { key: 'under_review', label: 'Under Review', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  { key: 'resolved',     label: 'Resolved',     color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  { key: 'escalated',    label: 'Escalated',    color: 'bg-red-100 text-red-700',     dot: 'bg-red-500' },
]

const getReportStatus = (key) => REPORT_STATUSES.find(s => s.key === key) || REPORT_STATUSES[0]
const getReportPriority = (key) => REPORT_PRIORITIES.find(p => p.key === key) || REPORT_PRIORITIES[0]

function SecurityReportModal({ report, roundId, checkpoints, onClose, onSave }) {
  const { profile } = useAuth()
  const isNew = !report
  const isSupervisor = ['super_admin','org_admin','supervisor','manager'].includes(profile?.role)

  const [form, setForm] = useState({
    report_type:         report?.report_type         || 'general',
    priority:            report?.priority             || 'low',
    status:              report?.status               || 'open',
    title:               report?.title               || '',
    description:         report?.description          || '',
    location:            report?.location             || '',
    checkpoint_id:       report?.checkpoint_id        || '',
    action_taken:        report?.action_taken         || '',
    police_called:       report?.police_called        || false,
    management_notified: report?.management_notified  || false,
    persons_involved:    report?.persons_involved     || '',
    review_notes:        report?.review_notes         || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      setError('Title and description are required'); return
    }
    setSaving(true)
    const payload = {
      report_type:         form.report_type,
      priority:            form.priority,
      status:              form.status,
      title:               form.title.trim(),
      description:         form.description.trim(),
      location:            form.location || null,
      checkpoint_id:       form.checkpoint_id || null,
      action_taken:        form.action_taken || null,
      police_called:       form.police_called,
      management_notified: form.management_notified,
      persons_involved:    form.persons_involved || null,
      review_notes:        form.review_notes || null,
      reviewed_by:         (form.status !== 'open' && !report?.reviewed_by) ? profile.id : (report?.reviewed_by || null),
      reviewed_at:         (form.status !== 'open' && !report?.reviewed_at) ? new Date().toISOString() : (report?.reviewed_at || null),
      updated_at:          new Date().toISOString(),
    }
    let err
    if (report?.id) {
      ({ error: err } = await supabase.from('security_reports').update(payload).eq('id', report.id))
    } else {
      ({ error: err } = await supabase.from('security_reports').insert({
        ...payload,
        organization_id: profile.organization_id,
        round_id:        roundId || null,
        filed_by:        profile.id,
        is_active:       true,
      }))
    }
    if (err) { setError(err.message); setSaving(false); return }
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Shield size={18} className="text-brand-600" />
            <h2 className="font-display font-semibold text-slate-800">
              {isNew ? 'Security Report' : `Report #${report.report_number}`}
            </h2>
            {!isNew && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 ${getReportStatus(form.status).color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${getReportStatus(form.status).dot}`} />
                {getReportStatus(form.status).label}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          {/* Type + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Report Type</label>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {REPORT_TYPES.map(t => (
                  <button key={t.key} onClick={() => set('report_type', t.key)}
                    className={`text-left px-2.5 py-2 rounded-lg border text-xs font-medium transition-all ${form.report_type === t.key ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 text-slate-600 hover:border-brand-300'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Priority</label>
                <div className="space-y-1.5">
                  {REPORT_PRIORITIES.map(p => (
                    <button key={p.key} onClick={() => set('priority', p.key)}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${form.priority === p.key ? p.color + ' ring-2 ring-offset-1 ring-brand-400 border-transparent' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Brief summary of the incident or observation" />
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Location</label>
              <input value={form.location} onChange={e => set('location', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Where did this occur?" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nearby Checkpoint</label>
              <select value={form.checkpoint_id} onChange={e => set('checkpoint_id', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">None</option>
                {checkpoints.map(cp => <option key={cp.id} value={cp.id}>{cp.name}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description *</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Describe what you observed in detail — time, people, vehicles, actions taken..." />
          </div>

          {/* Persons involved */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Persons Involved</label>
            <input value={form.persons_involved} onChange={e => set('persons_involved', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Names, descriptions, or 'Unknown'" />
          </div>

          {/* Action taken */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Action Taken</label>
            <textarea value={form.action_taken} onChange={e => set('action_taken', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="What did you do in response?" />
          </div>

          {/* Notifications */}
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Notifications</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'police_called',       label: 'Police Called' },
                { key: 'management_notified', label: 'Management Notified' },
              ].map(n => (
                <label key={n.key} className={`flex items-center gap-2 cursor-pointer p-3 rounded-xl border transition-all ${form[n.key] ? 'bg-brand-50 border-brand-200' : 'border-slate-200 bg-white'}`}>
                  <input type="checkbox" checked={form[n.key]} onChange={e => set(n.key, e.target.checked)} className="w-4 h-4 rounded text-brand-600" />
                  <span className="text-sm font-medium text-slate-700">{n.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Supervisor review */}
          {isSupervisor && !isNew && (
            <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl space-y-3">
              <label className="block text-xs font-semibold text-purple-700 uppercase tracking-wide flex items-center gap-1.5">
                <Shield size={13} /> Supervisor Review
              </label>
              <div className="flex flex-wrap gap-2">
                {REPORT_STATUSES.map(s => (
                  <button key={s.key} onClick={() => set('status', s.key)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${form.status === s.key ? s.color + ' ring-2 ring-offset-1 ring-purple-400 border-transparent' : 'border-slate-200 text-slate-500'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
              <textarea value={form.review_notes} onChange={e => set('review_notes', e.target.value)} rows={2}
                className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white resize-none"
                placeholder="Supervisor notes, follow-up actions..." />
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving...' : isNew ? 'File Report' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Security Page ─────────────────────────────────────────
export default function Security() {
  const { profile, organization } = useAuth()
  const [tab, setTab]               = useState('overview')
  const [checkpoints, setCheckpoints] = useState([])
  const [rounds, setRounds]           = useState([])
  const [reports, setReports]         = useState([])
  const [staffList, setStaffList]     = useState([])
  const [lastCheckins, setLastCheckins] = useState({}) // checkpoint_id -> latest checkin
  const [loading, setLoading]           = useState(true)

  // Modals
  const [showCpModal, setShowCpModal]   = useState(false)
  const [editCp, setEditCp]             = useState(null)
  const [showRound, setShowRound]       = useState(false)
  const [viewRound, setViewRound]       = useState(null)
  const [showReport, setShowReport]     = useState(false)
  const [editReport, setEditReport]     = useState(null)

  const isSupervisor = ['super_admin','org_admin','supervisor','manager'].includes(profile?.role)

  useEffect(() => {
    const handler = (e) => {
      setEditReport(null)
      setShowReport(true)
    }
    window.addEventListener('openSecurityReport', handler)
    return () => window.removeEventListener('openSecurityReport', handler)
  }, [])

  useEffect(() => { if (organization) fetchAll() }, [organization])

  async function fetchAll() {
    setLoading(true)
    const [cpRes, roundRes, staffRes, reportRes] = await Promise.all([
      supabase.from('security_checkpoints').select('*').eq('organization_id', organization.id).eq('is_active', true).order('sort_order'),
      supabase.from('security_rounds')
        .select('*, guard:profiles!security_rounds_guard_id_fkey(first_name,last_name)')
        .eq('organization_id', organization.id)
        .order('started_at', { ascending: false }).limit(50),
      supabase.from('profiles').select('id,first_name,last_name,role')
        .eq('organization_id', organization.id)
        .in('role', ['staff','maintenance','supervisor','manager','org_admin','super_admin']),
      supabase.from('security_reports')
        .select('*, filer:profiles!security_reports_filed_by_fkey(first_name,last_name), reviewer:profiles!security_reports_reviewed_by_fkey(first_name,last_name), security_checkpoints(name)')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
    ])
    const cps = cpRes.data || []
    setCheckpoints(cps)
    setRounds(roundRes.data || [])
    setStaffList(staffRes.data || [])
    setReports(reportRes.data || [])

    // Get last checkin per checkpoint
    if (cps.length) {
      const { data: checkins } = await supabase.from('security_checkins')
        .select('checkpoint_id, checked_in_at, passed, distance_feet, guard_id, profiles(first_name,last_name)')
        .in('checkpoint_id', cps.map(c => c.id))
        .order('checked_in_at', { ascending: false })
      if (checkins) {
        const latest = {}
        checkins.forEach(c => { if (!latest[c.checkpoint_id]) latest[c.checkpoint_id] = c })
        setLastCheckins(latest)
      }
    }
    setLoading(false)
  }

  const handleDeleteCp = async (id) => {
    if (!confirm('Remove this checkpoint?')) return
    await supabase.from('security_checkpoints').update({ is_active: false }).eq('id', id)
    fetchAll()
  }

  // Stats
  const todayRounds   = rounds.filter(r => r.started_at?.startsWith(new Date().toISOString().split('T')[0]))
  const activeRound   = rounds.find(r => r.status === 'in_progress')
  const overdueCount  = checkpoints.filter(cp => {
    const last = lastCheckins[cp.id]
    if (!last) return true
    const mins = (Date.now() - new Date(last.checked_in_at).getTime()) / 60000
    return mins > 120 // overdue if not checked in 2+ hours
  }).length

  const tabs = [
    { key: 'overview',     label: 'Overview' },
    { key: 'checkpoints',  label: 'Checkpoints' },
    { key: 'reports',      label: `Reports${reports.filter(r => r.status === 'open').length > 0 ? ` (${reports.filter(r => r.status === 'open').length})` : ''}` },
    { key: 'history',      label: 'Round History' },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800">Security</h1>
          <p className="text-slate-500 text-sm mt-0.5">Guard rounds, GPS checkpoints, and security logs</p>
        </div>
        <div className="flex items-center gap-2">
          {isSupervisor && (
            <button onClick={() => { setEditCp(null); setShowCpModal(true) }}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600 rounded-xl text-sm font-medium transition-colors">
              <MapPin size={15} /> Add Checkpoint
            </button>
          )}
          <button onClick={() => { setEditReport(null); setShowReport(true) }}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600 rounded-xl text-sm font-medium transition-colors">
            <FileText size={15} /> File Report
          </button>
          <button onClick={() => setShowRound(true)}
            disabled={!!activeRound}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-medium transition-colors">
            <Play size={15} /> {activeRound ? 'Round In Progress' : 'Start Round'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Checkpoints',    value: checkpoints.length, color: 'text-brand-600',  bg: 'bg-brand-50' },
          { label: 'Today\'s Rounds',value: todayRounds.length, color: 'text-green-600',  bg: 'bg-green-50' },
          { label: 'Active Round',   value: activeRound ? 'Yes' : 'No', color: activeRound ? 'text-green-600' : 'text-slate-400', bg: activeRound ? 'bg-green-50' : 'bg-slate-100' },
          { label: 'Overdue (2h+)',  value: overdueCount, color: overdueCount > 0 ? 'text-red-600' : 'text-slate-400', bg: overdueCount > 0 ? 'bg-red-50' : 'bg-slate-100' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
            <div className={`text-3xl font-display font-bold ${s.color}`}>{s.value}</div>
            <div className="text-slate-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Checkpoint status */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-display font-semibold text-slate-800 mb-4">Checkpoint Status</h2>
            {checkpoints.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                <MapPin size={28} className="mx-auto mb-2 opacity-30" />
                No checkpoints set up yet.
              </div>
            ) : (
              <div className="space-y-2">
                {checkpoints.map(cp => {
                  const last = lastCheckins[cp.id]
                  const mins = last ? (Date.now() - new Date(last.checked_in_at).getTime()) / 60000 : null
                  const isOverdue = !last || mins > 120
                  return (
                    <div key={cp.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isOverdue ? 'border-red-100 bg-red-50/50' : 'border-slate-100'}`}>
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isOverdue ? 'bg-red-400' : last?.passed ? 'bg-green-400' : 'bg-amber-400'}`} />
                      <div className="flex-1">
                        <div className="font-medium text-slate-800 text-sm">{cp.name}</div>
                        <div className="text-xs text-slate-400">
                          {last
                            ? `Last check: ${timeAgo(last.checked_in_at)}${last.profiles ? ` · ${last.profiles.first_name} ${last.profiles.last_name}` : ''}`
                            : 'No check-ins yet'}
                        </div>
                      </div>
                      {isOverdue && <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent rounds */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-display font-semibold text-slate-800 mb-4">Recent Rounds</h2>
            {rounds.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">No rounds completed yet.</div>
            ) : (
              <div className="space-y-2">
                {rounds.slice(0, 8).map(r => {
                  const duration = r.completed_at
                    ? Math.round((new Date(r.completed_at) - new Date(r.started_at)) / 60000)
                    : null
                  return (
                    <button key={r.id} onClick={() => setViewRound(r)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50 transition-all text-left group">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        r.status === 'completed'   ? 'bg-green-100' :
                        r.status === 'incomplete'  ? 'bg-amber-100' :
                        'bg-blue-100'}`}>
                        {r.status === 'completed'   ? <CheckCircle2 size={15} className="text-green-600" /> :
                         r.status === 'incomplete'  ? <AlertTriangle size={15} className="text-amber-600" /> :
                         <Play size={15} className="text-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800">
                          {r.guard ? `${r.guard.first_name} ${r.guard.last_name}` : 'Unknown Guard'}
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(r.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {fmt(r.started_at)}
                          {duration && ` · ${duration}min`}
                        </div>
                      </div>
                      <span className={`text-xs font-medium flex-shrink-0 capitalize px-2 py-0.5 rounded-full ${
                        r.status === 'completed'  ? 'bg-green-100 text-green-700' :
                        r.status === 'incomplete' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'}`}>
                        {r.status.replace('_',' ')}
                      </span>
                      <ChevronRight size={13} className="text-slate-300 group-hover:text-brand-400 flex-shrink-0 transition-colors" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHECKPOINTS TAB */}
      {tab === 'checkpoints' && (
        <div>
          {!isSupervisor && (
            <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
              Only supervisors and admins can add or edit checkpoints.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {checkpoints.map((cp, i) => {
              const last = lastCheckins[cp.id]
              const isOverdue = !last || (Date.now() - new Date(last.checked_in_at).getTime()) / 60000 > 120
              return (
                <div key={cp.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white ${isOverdue ? 'bg-red-400' : 'bg-brand-500'}`}>
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">{cp.name}</div>
                        <div className="text-xs text-slate-400">{cp.radius_feet}ft radius</div>
                      </div>
                    </div>
                    {isSupervisor && (
                      <div className="flex gap-1">
                        <button onClick={() => { setEditCp(cp); setShowCpModal(true) }}
                          className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg transition-colors"><Edit2 size={13} /></button>
                        <button onClick={() => handleDeleteCp(cp.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>
                  {cp.description && <p className="text-xs text-slate-400 mb-3">{cp.description}</p>}
                  <div className="text-xs text-slate-400 font-mono mb-3">
                    {parseFloat(cp.latitude).toFixed(5)}, {parseFloat(cp.longitude).toFixed(5)}
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs ${isOverdue ? 'text-red-500' : 'text-green-600'}`}>
                    <div className={`w-2 h-2 rounded-full ${isOverdue ? 'bg-red-400' : 'bg-green-400'}`} />
                    {last ? `Last check ${timeAgo(last.checked_in_at)}` : 'No check-ins yet'}
                  </div>
                </div>
              )
            })}
            {checkpoints.length === 0 && (
              <div className="col-span-3 text-center py-16 text-slate-400">
                <MapPin size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-display text-lg">No checkpoints yet</p>
                {isSupervisor && <p className="text-sm mt-1">Click "Add Checkpoint" to set up your first one.</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Guard</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Started</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rounds.map(r => {
                const duration = r.completed_at
                  ? Math.round((new Date(r.completed_at) - new Date(r.started_at)) / 60000)
                  : null
                return (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setViewRound(r)}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">
                      {r.guard ? `${r.guard.first_name} ${r.guard.last_name}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {new Date(r.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{fmt(r.started_at)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{duration ? `${duration} min` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${
                        r.status === 'completed'  ? 'bg-green-100 text-green-700' :
                        r.status === 'incomplete' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'}`}>
                        {r.status.replace('_',' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight size={14} className="text-slate-300" />
                    </td>
                  </tr>
                )
              })}
              {rounds.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">No rounds completed yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* REPORTS TAB */}
      {tab === 'reports' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500">{reports.length} report{reports.length !== 1 ? 's' : ''}</p>
            <button onClick={() => { setEditReport(null); setShowReport(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
              <Plus size={15} /> File Report
            </button>
          </div>
          {reports.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-display text-lg">No reports filed yet</p>
              <p className="text-sm mt-1">Guards can file reports during or after rounds.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Filed By</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => {
                    const status   = getReportStatus(r.status)
                    const priority = getReportPriority(r.priority)
                    return (
                      <tr key={r.id} onClick={() => { setEditReport(r); setShowReport(true) }}
                        className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors">
                        <td className="px-4 py-3 text-xs font-mono text-slate-400">#{r.report_number}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 capitalize">{r.report_type?.replace('_',' ')}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-slate-800">{r.title}</div>
                          {r.location && <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><MapPin size={10} />{r.location}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priority.color}`}>{priority.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {r.filer ? `${r.filer.first_name} ${r.filer.last_name}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showReport && (
        <SecurityReportModal
          report={editReport}
          roundId={null}
          checkpoints={checkpoints}
          onClose={() => { setShowReport(false); setEditReport(null) }}
          onSave={() => { setShowReport(false); setEditReport(null); fetchAll() }} />
      )}
      {showCpModal && (
        <CheckpointModal
          checkpoint={editCp}
          onClose={() => { setShowCpModal(false); setEditCp(null) }}
          onSave={() => { setShowCpModal(false); setEditCp(null); fetchAll() }} />
      )}
      {showRound && checkpoints.length > 0 && (
        <GuardRoundView
          checkpoints={checkpoints}
          guardId={profile.id}
          orgId={organization.id}
          onClose={() => { setShowRound(false); fetchAll() }} />
      )}
      {showRound && checkpoints.length === 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <AlertTriangle size={32} className="mx-auto mb-3 text-amber-500" />
            <h3 className="font-display font-semibold text-slate-800 mb-2">No Checkpoints Set Up</h3>
            <p className="text-slate-400 text-sm mb-4">A supervisor needs to add checkpoints before rounds can be started.</p>
            <button onClick={() => setShowRound(false)}
              className="w-full py-2 bg-brand-600 text-white rounded-xl font-medium">OK</button>
          </div>
        </div>
      )}
      {viewRound && (
        <RoundHistory
          round={viewRound}
          checkpoints={checkpoints}
          onClose={() => { setViewRound(null); fetchAll() }} />
      )}
    </div>
  )
}

// ── NOTE: The following exports replace the default export above ──
// ── Security Report Modal ──────────────────────────────────────
export function SecurityReportModal({ roundId, checkpoints, onClose, onSave }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    report_type:        'general',
    priority:           'low',
    title:              '',
    description:        '',
    location:           '',
    checkpoint_id:      '',
    action_taken:       '',
    police_called:      false,
    management_notified:false,
    persons_involved:   '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      setError('Title and description are required'); return
