import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, X, Edit2, Trash2, Search, Check, X as XIcon,
  ClipboardCheck, Calendar, Printer, ChevronDown,
  Building2, Home, AlertTriangle, Clock, DollarSign,
  Phone, User, CheckCircle2, Circle
} from 'lucide-react'

// ── Status helpers ─────────────────────────────────────────────
const IL_STATUSES = [
  { key: 'pending',     label: 'Pending',     color: 'bg-yellow-50 text-yellow-700 border-yellow-200', dot: 'bg-yellow-400' },
  { key: 'booked',      label: 'Booked',      color: 'bg-blue-50 text-blue-700 border-blue-200',       dot: 'bg-blue-500' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-brand-50 text-brand-700 border-brand-200',    dot: 'bg-brand-500' },
  { key: 'completed',   label: 'Completed',   color: 'bg-green-50 text-green-700 border-green-200',    dot: 'bg-green-500' },
  { key: 'cancelled',   label: 'Cancelled',   color: 'bg-slate-100 text-slate-500 border-slate-200',   dot: 'bg-slate-400' },
]
const getILStatus = (key) => IL_STATUSES.find(s => s.key === key) || IL_STATUSES[0]

function StatusBadge({ status }) {
  const s = getILStatus(status)
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

// ── Receipt Printer ────────────────────────────────────────────
function PrintReceipt({ request, orgName, onClose }) {
  const printRef = useRef()
  const handlePrint = () => {
    const win = window.open('', '_blank')
    win.document.write(`<html><head><title>Cleaning Receipt</title>
    <style>
      body{font-family:Arial,sans-serif;padding:30px;max-width:400px}
      h2{margin:0 0 4px;font-size:20px}
      .sub{color:#666;font-size:13px;margin-bottom:16px}
      .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;font-size:14px}
      .total{font-weight:bold;font-size:16px;margin-top:8px}
      .footer{margin-top:20px;font-size:12px;color:#999;text-align:center}
      @media print{button{display:none}}
    </style></head>
    <body>${printRef.current.innerHTML}</body></html>`)
    win.document.close(); win.print()
  }

  const hours = request.actual_hours || request.duration_hours || 0
  const date  = request.booked_date
    ? new Date(request.booked_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'N/A'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-display font-semibold text-slate-800">Cleaning Receipt</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="px-6 py-4">
          <div ref={printRef}>
            <h2>{orgName}</h2>
            <div className="sub">Housekeeping Services Receipt</div>
            <div className="row"><span>Resident</span><span><strong>{request.resident_name}</strong></span></div>
            {request.unit && <div className="row"><span>Unit</span><span>{request.unit}</span></div>}
            <div className="row"><span>Date of Service</span><span>{date}</span></div>
            {request.booked_time && (
              <div className="row"><span>Time</span><span>{request.booked_time}</span></div>
            )}
            <div className="row total"><span>Hours of Service</span><span>{hours} {hours === 1 ? 'hour' : 'hours'}</span></div>
            {request.services_performed && (
              <div style={{marginTop:12,fontSize:13}}>
                <strong>Services Performed:</strong>
                <div style={{marginTop:4,color:'#444'}}>{request.services_performed}</div>
              </div>
            )}
            <div className="footer">
              Thank you! Please contact the office with any questions.<br />
              {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Close</button>
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg">
            <Printer size={15} /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  )
}

// ── IL Request Modal ───────────────────────────────────────────
function ILRequestModal({ request, onClose, onSave }) {
  const { profile } = useAuth()
  const isNew = !request
  const [form, setForm] = useState({
    resident_name:   request?.resident_name   || '',
    unit:            request?.unit            || '',
    phone:           request?.phone           || '',
    request_notes:   request?.request_notes   || '',
    preferred_dates: request?.preferred_dates || '',
    status:          request?.status          || 'pending',
    booked_date:     request?.booked_date     || '',
    booked_time:     request?.booked_time     || '',
    duration_hours:  request?.duration_hours  || '',
    actual_hours:    request?.actual_hours    || '',
    services_performed: request?.services_performed || '',
    completion_notes:   request?.completion_notes   || '',
    billed:          request?.billed          || false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.resident_name.trim()) { setError('Resident name is required'); return }
    setSaving(true)
    const payload = {
      ...form,
      organization_id: profile.organization_id,
      requested_by: profile.id,
      duration_hours: form.duration_hours || null,
      actual_hours:   form.actual_hours   || null,
      completed_at: form.status === 'completed' && !request?.completed_at ? new Date().toISOString() : (request?.completed_at || null),
      billed_at: form.billed && !request?.billed_at ? new Date().toISOString() : (request?.billed_at || null),
      updated_at: new Date().toISOString(),
    }
    let err
    if (request?.id) {
      ({ error: err } = await supabase.from('il_cleaning_requests').update(payload).eq('id', request.id))
    } else {
      ({ error: err } = await supabase.from('il_cleaning_requests').insert(payload))
    }
    if (err) { setError(err.message); setSaving(false); return }
    onSave()
  }

  const showBooking    = ['booked','in_progress','completed'].includes(form.status)
  const showCompletion = form.status === 'completed'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800">
            {isNew ? 'New Cleaning Request' : `${request.resident_name} — Edit Request`}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          {/* Resident info */}
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

          {/* Request details */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Preferred Dates/Times</label>
            <input value={form.preferred_dates} onChange={e => set('preferred_dates', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Monday or Wednesday mornings" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Request Notes</label>
            <textarea value={form.request_notes} onChange={e => set('request_notes', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Special instructions or areas to focus on..." />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {IL_STATUSES.map(s => (
                <button key={s.key} onClick={() => set('status', s.key)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${form.status === s.key ? s.color + ' ring-2 ring-offset-1 ring-brand-400' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Booking details */}
          {showBooking && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Calendar size={13} /> Booking Details
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block text-xs text-slate-500 mb-1">Date</label>
                  <input type="date" value={form.booked_date} onChange={e => set('booked_date', e.target.value)}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Time</label>
                  <input type="time" value={form.booked_time} onChange={e => set('booked_time', e.target.value)}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Est. Hours</label>
                  <input type="number" step="0.5" min="0.5" value={form.duration_hours} onChange={e => set('duration_hours', e.target.value)}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    placeholder="2.0" />
                </div>
              </div>
            </div>
          )}

          {/* Completion / billing */}
          {showCompletion && (
            <div className="p-4 bg-green-50 border border-green-100 rounded-xl space-y-3">
              <label className="block text-xs font-semibold text-green-700 uppercase tracking-wide flex items-center gap-1.5">
                <CheckCircle2 size={13} /> Completion Report
              </label>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Actual Hours</label>
                <input type="number" step="0.5" min="0.5" value={form.actual_hours} onChange={e => set('actual_hours', e.target.value)}
                  className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                  placeholder="Actual hours worked" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Services Performed</label>
                <textarea value={form.services_performed} onChange={e => set('services_performed', e.target.value)} rows={3}
                  className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white resize-none"
                  placeholder="e.g. Full clean, bathroom deep clean, kitchen, vacuumed all rooms..." />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Completion Notes</label>
                <textarea value={form.completion_notes} onChange={e => set('completion_notes', e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white resize-none"
                  placeholder="Any issues or notes for the office..." />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.billed} onChange={e => set('billed', e.target.checked)} className="w-4 h-4 rounded text-green-600" />
                <span className="text-sm font-medium text-green-800">Marked as billed</span>
              </label>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving...' : isNew ? 'Submit Request' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── LTC Inspection Modal ───────────────────────────────────────
function InspectionModal({ area, checklistItems, onClose, onSave }) {
  const { profile } = useAuth()
  const [results, setResults] = useState(
    checklistItems.reduce((acc, item) => ({ ...acc, [item.id]: { passed: true, note: '' } }), {})
  )
  const [notes, setNotes]   = useState('')
  const [saving, setSaving] = useState(false)

  const toggle = (id) => setResults(r => ({ ...r, [id]: { ...r[id], passed: !r[id].passed } }))
  const setNote = (id, val) => setResults(r => ({ ...r, [id]: { ...r[id], note: val } }))

  const allPassed = Object.values(results).every(r => r.passed)

  const handleSave = async () => {
    setSaving(true)
    const { data: inspection, error } = await supabase.from('ltc_inspections').insert({
      organization_id: profile.organization_id,
      area_id: area.id,
      inspected_by: profile.id,
      inspected_at: new Date().toISOString(),
      overall_pass: allPassed,
      notes: notes || null,
    }).select().single()

    if (error) { setSaving(false); return }

    await supabase.from('ltc_inspection_results').insert(
      checklistItems.map(item => ({
        inspection_id: inspection.id,
        checklist_item_id: item.id,
        passed: results[item.id]?.passed ?? true,
        note: results[item.id]?.note || null,
      }))
    )
    onSave()
  }

  const failCount = Object.values(results).filter(r => !r.passed).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-display font-semibold text-slate-800">Inspection — {area.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {checklistItems.map(item => (
            <div key={item.id} className={`p-3 rounded-xl border transition-all ${results[item.id]?.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
                <button onClick={() => toggle(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${results[item.id]?.passed ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                  {results[item.id]?.passed ? <><Check size={12} /> Pass</> : <><XIcon size={12} /> Fail</>}
                </button>
              </div>
              {!results[item.id]?.passed && (
                <input value={results[item.id]?.note || ''} onChange={e => setNote(item.id, e.target.value)}
                  className="w-full mt-2 px-3 py-1.5 border border-red-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                  placeholder="Note about this issue..." />
              )}
            </div>
          ))}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">General Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Overall observations..." />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 text-sm font-medium ${allPassed ? 'text-green-600' : 'text-red-600'}`}>
              {allPassed ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              {allPassed ? 'All items pass' : `${failCount} item${failCount > 1 ? 's' : ''} failed`}
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
                {saving ? 'Saving...' : 'Save Inspection'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Housekeeping Page ─────────────────────────────────────
export default function Housekeeping() {
  const { profile, organization } = useAuth()
  const [tab, setTab]             = useState('ltc')
  const [areas, setAreas]         = useState([])
  const [checklistItems, setChecklistItems] = useState([])
  const [inspections, setInspections]       = useState([])
  const [ilRequests, setILRequests]         = useState([])
  const [loading, setLoading]               = useState(true)
  const [search, setSearch]                 = useState('')
  const [filterStatus, setFilterStatus]     = useState('all')

  // Modals
  const [inspectArea, setInspectArea]       = useState(null)
  const [showILModal, setShowILModal]       = useState(false)
  const [editILRequest, setEditILRequest]   = useState(null)
  const [printRequest, setPrintRequest]     = useState(null)
  const [showAddArea, setShowAddArea]       = useState(false)
  const [newAreaName, setNewAreaName]       = useState('')
  const [newAreaType, setNewAreaType]       = useState('room')

  useEffect(() => { if (organization) fetchAll() }, [organization])

  async function fetchAll() {
    setLoading(true)
    const [areasRes, checklistRes, inspRes, ilRes] = await Promise.all([
      supabase.from('inspection_areas').select('*').eq('organization_id', organization.id).eq('is_active', true).order('sort_order'),
      supabase.from('inspection_checklist_items').select('*').eq('organization_id', organization.id).eq('is_active', true).order('sort_order'),
      supabase.from('ltc_inspections')
        .select('*, inspection_areas(name), profiles(first_name,last_name), ltc_inspection_results(passed, checklist_item_id)')
        .eq('organization_id', organization.id)
        .order('inspected_at', { ascending: false }).limit(100),
      supabase.from('il_cleaning_requests')
        .select('*').eq('organization_id', organization.id)
        .order('created_at', { ascending: false }),
    ])
    setAreas(areasRes.data || [])
    setChecklistItems(checklistRes.data || [])
    setInspections(inspRes.data || [])
    setILRequests(ilRes.data || [])
    setLoading(false)
  }

  const handleAddArea = async () => {
    if (!newAreaName.trim()) return
    await supabase.from('inspection_areas').insert({
      organization_id: organization.id, name: newAreaName.trim(),
      area_type: newAreaType, sort_order: areas.length
    })
    setNewAreaName(''); setShowAddArea(false); fetchAll()
  }

  const handleDeleteArea = async (id) => {
    if (!confirm('Remove this area?')) return
    await supabase.from('inspection_areas').update({ is_active: false }).eq('id', id)
    fetchAll()
  }

  // IL filtered
  const filteredIL = ilRequests.filter(r => {
    const matchSearch = !search || `${r.resident_name} ${r.unit}`.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || r.status === filterStatus
    return matchSearch && matchStatus
  })

  // Stats
  const ilStats = {
    pending:   ilRequests.filter(r => r.status === 'pending').length,
    booked:    ilRequests.filter(r => r.status === 'booked').length,
    unbilled:  ilRequests.filter(r => r.status === 'completed' && !r.billed).length,
  }

  // Last inspection per area
  const lastInspection = (areaId) => inspections.find(i => i.area_id === areaId)

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800">Housekeeping</h1>
          <p className="text-slate-500 text-sm mt-0.5">LTC inspections and independent living cleaning services</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { key: 'ltc', label: 'LTC Inspections',   icon: ClipboardCheck },
          { key: 'il',  label: 'Independent Living', icon: Calendar },
        ].map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Icon size={15} />{t.label}
            </button>
          )
        })}
      </div>

      {/* ── LTC TAB ── */}
      {tab === 'ltc' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500">{areas.length} areas · {inspections.length} inspections logged</p>
            <button onClick={() => setShowAddArea(s => !s)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
              <Plus size={15} /> Add Area
            </button>
          </div>

          {showAddArea && (
            <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
              <input value={newAreaName} onChange={e => setNewAreaName(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Area name (e.g. Room 101, Main Hallway)" onKeyDown={e => e.key === 'Enter' && handleAddArea()} />
              <select value={newAreaType} onChange={e => setNewAreaType(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="room">Room</option>
                <option value="common">Common Area</option>
              </select>
              <button onClick={handleAddArea} className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700">Add</button>
              <button onClick={() => setShowAddArea(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-16 text-slate-400">Loading...</div>
          ) : areas.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <ClipboardCheck size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-display text-lg">No areas set up yet</p>
              <p className="text-sm mt-1">Add rooms and common areas to start logging inspections.</p>
            </div>
          ) : (
            <>
              {/* Area grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
                {areas.map(area => {
                  const last = lastInspection(area.id)
                  const passed = last ? last.overall_pass : null
                  return (
                    <div key={area.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {area.area_type === 'room' ? <Home size={16} className="text-slate-400" /> : <Building2 size={16} className="text-slate-400" />}
                          <span className="font-medium text-slate-800 text-sm">{area.name}</span>
                        </div>
                        <button onClick={() => handleDeleteArea(area.id)} className="text-slate-300 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                      </div>
                      {last ? (
                        <div className="mb-3">
                          <div className={`flex items-center gap-1.5 text-xs font-medium ${passed ? 'text-green-600' : 'text-red-600'}`}>
                            {passed ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                            {passed ? 'Last inspection passed' : 'Issues found'}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {new Date(last.inspected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {last.profiles && ` · ${last.profiles.first_name} ${last.profiles.last_name}`}
                          </div>
                        </div>
                      ) : (
                        <div className="mb-3 text-xs text-slate-400 italic">No inspections yet</div>
                      )}
                      <button onClick={() => setInspectArea(area)}
                        className="w-full py-2 border-2 border-dashed border-brand-200 text-brand-600 hover:bg-brand-50 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5">
                        <ClipboardCheck size={13} /> Start Inspection
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Inspection log */}
              <div>
                <h2 className="font-display font-semibold text-slate-800 mb-3">Inspection Log</h2>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Area</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Result</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Inspected By</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspections.slice(0, 30).map(ins => (
                        <tr key={ins.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-sm text-slate-700 font-medium">{ins.inspection_areas?.name}</td>
                          <td className="px-4 py-3">
                            {ins.overall_pass
                              ? <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle2 size={13} /> Pass</span>
                              : <span className="flex items-center gap-1 text-xs text-red-600 font-medium"><AlertTriangle size={13} /> Issues</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {ins.profiles ? `${ins.profiles.first_name} ${ins.profiles.last_name}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {new Date(ins.inspected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">{ins.notes || '—'}</td>
                        </tr>
                      ))}
                      {inspections.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">No inspections logged yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── IL TAB ── */}
      {tab === 'il' && (
        <div>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Pending',   value: ilStats.pending,  color: 'text-yellow-600', bg: 'bg-yellow-50' },
              { label: 'Booked',    value: ilStats.booked,   color: 'text-blue-600',   bg: 'bg-blue-50' },
              { label: 'Unbilled',  value: ilStats.unbilled, color: 'text-green-600',  bg: 'bg-green-50' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
                <div className={`text-3xl font-display font-bold ${s.color}`}>{s.value}</div>
                <div className="text-slate-500 text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by resident or unit..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
              <option value="all">All Statuses</option>
              {IL_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <button onClick={() => { setEditILRequest(null); setShowILModal(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
              <Plus size={15} /> New Request
            </button>
          </div>

          {/* Requests list */}
          {loading ? (
            <div className="text-center py-16 text-slate-400">Loading...</div>
          ) : filteredIL.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Calendar size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-display text-lg">No cleaning requests yet</p>
              <p className="text-sm mt-1">Click "New Request" to add one.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIL.map(req => (
                <div key={req.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-display font-semibold text-slate-800">{req.resident_name}</h3>
                        {req.unit && <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Unit {req.unit}</span>}
                        <StatusBadge status={req.status} />
                        {req.status === 'completed' && !req.billed && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 font-medium">Unbilled</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                        {req.phone && <span className="flex items-center gap-1"><Phone size={11} />{req.phone}</span>}
                        {req.booked_date && (
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            {new Date(req.booked_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {req.booked_time && ` at ${req.booked_time}`}
                            {req.duration_hours && ` · ${req.duration_hours}h est.`}
                          </span>
                        )}
                        {req.actual_hours && (
                          <span className="flex items-center gap-1 text-green-600 font-medium">
                            <Clock size={11} />{req.actual_hours}h actual
                          </span>
                        )}
                      </div>
                      {req.preferred_dates && <p className="text-xs text-slate-400 mt-1">Preferred: {req.preferred_dates}</p>}
                      {req.request_notes && <p className="text-xs text-slate-500 mt-1 italic">{req.request_notes}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {req.status === 'completed' && (
                        <button onClick={() => setPrintRequest(req)}
                          className="p-2 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors" title="Print receipt">
                          <Printer size={15} />
                        </button>
                      )}
                      <button onClick={() => { setEditILRequest(req); setShowILModal(true) }}
                        className="p-2 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors">
                        <Edit2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {inspectArea && (
        <InspectionModal area={inspectArea} checklistItems={checklistItems}
          onClose={() => setInspectArea(null)} onSave={() => { setInspectArea(null); fetchAll() }} />
      )}
      {showILModal && (
        <ILRequestModal request={editILRequest}
          onClose={() => { setShowILModal(false); setEditILRequest(null) }}
          onSave={() => { setShowILModal(false); setEditILRequest(null); fetchAll() }} />
      )}
      {printRequest && (
        <PrintReceipt request={printRequest} orgName={organization?.name}
          onClose={() => setPrintRequest(null)} />
      )}
    </div>
  )
}
