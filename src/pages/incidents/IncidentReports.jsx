import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, X, Edit2, Search, Printer, AlertTriangle,
  CheckCircle2, Clock, Eye, ChevronRight, Filter,
  User, MapPin, Calendar, FileText, Shield,
  Phone, Activity, ArrowUpRight, Lock
} from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────
const INCIDENT_TYPES = [
  { key: 'fall',             label: 'Fall',             color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { key: 'injury',           label: 'Injury',           color: 'bg-red-100 text-red-700 border-red-200' },
  { key: 'medication_error', label: 'Medication Error', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { key: 'behavioral',       label: 'Behavioral',       color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { key: 'property_damage',  label: 'Property Damage',  color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { key: 'elopement',        label: 'Elopement',        color: 'bg-red-100 text-red-800 border-red-300' },
  { key: 'choking',          label: 'Choking',          color: 'bg-red-100 text-red-700 border-red-200' },
  { key: 'skin_wound',       label: 'Skin / Wound',     color: 'bg-rose-100 text-rose-700 border-rose-200' },
  { key: 'altercation',      label: 'Altercation',      color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { key: 'visitor_incident', label: 'Visitor Incident', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { key: 'other',            label: 'Other',            color: 'bg-slate-100 text-slate-600 border-slate-200' },
]

const SEVERITIES = [
  { key: 'minor',    label: 'Minor',    color: 'bg-green-100 text-green-700 border-green-200' },
  { key: 'moderate', label: 'Moderate', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { key: 'serious',  label: 'Serious',  color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { key: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700 border-red-200' },
]

const STATUSES = [
  { key: 'draft',        label: 'Draft',        color: 'bg-slate-100 text-slate-600 border-slate-200',  dot: 'bg-slate-400' },
  { key: 'submitted',    label: 'Submitted',    color: 'bg-blue-50 text-blue-700 border-blue-200',      dot: 'bg-blue-500' },
  { key: 'under_review', label: 'Under Review', color: 'bg-amber-50 text-amber-700 border-amber-200',   dot: 'bg-amber-500' },
  { key: 'closed',       label: 'Closed',       color: 'bg-green-50 text-green-700 border-green-200',   dot: 'bg-green-500' },
]

const getType     = (key) => INCIDENT_TYPES.find(t => t.key === key) || INCIDENT_TYPES[INCIDENT_TYPES.length - 1]
const getSeverity = (key) => SEVERITIES.find(s => s.key === key) || SEVERITIES[0]
const getStatus   = (key) => STATUSES.find(s => s.key === key) || STATUSES[0]

const fmt12 = (t) => {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

// ── Print Report ───────────────────────────────────────────────
function PrintReport({ report, orgName, filerName, reviewerName, onClose }) {
  const printRef = useRef()

  const handlePrint = () => {
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>Incident Report #${report.report_number}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:28px;font-size:13px;max-width:760px;margin:0 auto}
        h2{margin:0;font-size:20px;color:#1e293b}
        .header{border-bottom:3px solid #0c90e1;padding-bottom:12px;margin-bottom:20px}
        .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:bold;margin:0 4px}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
        .section{margin-bottom:16px}
        .section-title{font-weight:bold;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;margin-bottom:8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
        .field{margin-bottom:8px}
        .field label{font-size:11px;color:#64748b;display:block;margin-bottom:2px}
        .field p{margin:0;font-size:13px;color:#1e293b}
        .check{color:#16a34a;font-weight:bold} .uncheck{color:#94a3b8}
        .sig-block{margin-top:32px;display:grid;grid-template-columns:1fr 1fr;gap:32px}
        .sig-line{border-top:1px solid #000;padding-top:4px;font-size:11px;color:#666;margin-top:40px}
        .footer{margin-top:24px;font-size:10px;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0;padding-top:8px}
        @media print{button{display:none}}
      </style></head>
      <body>${printRef.current.innerHTML}</body></html>`)
    win.document.close()
    win.print()
  }

  const incDate = report.incident_date
    ? new Date(report.incident_date + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
    : '—'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800">Print Preview — Report #{report.report_number}</h2>
          <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div ref={printRef}>
            <div className="header">
              <h2>{orgName} — Incident Report</h2>
              <div style={{marginTop:4,color:'#64748b',fontSize:12}}>
                Report #{report.report_number} &nbsp;·&nbsp;
                Filed by: {filerName} &nbsp;·&nbsp;
                <span className="badge" style={{background:'#f1f5f9',color:'#475569'}}>{getStatus(report.status).label}</span>
                <span className="badge" style={{background:'#fef3c7',color:'#92400e'}}>{getSeverity(report.severity).label}</span>
                <span className="badge" style={{background:'#fee2e2',color:'#991b1b'}}>{getType(report.incident_type).label}</span>
              </div>
            </div>
            <div className="grid">
              <div className="field"><label>Date of Incident</label><p>{incDate}</p></div>
              <div className="field"><label>Time</label><p>{report.incident_time ? fmt12(report.incident_time) : '—'}</p></div>
              <div className="field"><label>Location</label><p>{report.location || '—'}</p></div>
              <div className="field"><label>Resident Name</label><p>{report.resident_name || '—'}</p></div>
              {report.resident_unit && <div className="field"><label>Unit / Room</label><p>{report.resident_unit}</p></div>}
            </div>
            <div className="section"><div className="section-title">Description</div><p style={{margin:0,whiteSpace:'pre-wrap'}}>{report.description}</p></div>
            {report.injuries_observed && <div className="section"><div className="section-title">Injuries Observed</div><p style={{margin:0}}>{report.injuries_observed}</p></div>}
            {report.immediate_action && <div className="section"><div className="section-title">Immediate Action Taken</div><p style={{margin:0}}>{report.immediate_action}</p></div>}
            <div className="section">
              <div className="section-title">Notifications</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div><span className={report.was_911_called ? 'check' : 'uncheck'}>{report.was_911_called ? '✓' : '✗'}</span> 911 Called</div>
                <div><span className={report.was_doctor_called ? 'check' : 'uncheck'}>{report.was_doctor_called ? '✓' : '✗'}</span> Doctor Notified</div>
                <div><span className={report.was_family_notified ? 'check' : 'uncheck'}>{report.was_family_notified ? '✓' : '✗'}</span> Family Notified</div>
                <div><span className={report.was_supervisor_notified ? 'check' : 'uncheck'}>{report.was_supervisor_notified ? '✓' : '✗'}</span> Supervisor Notified</div>
              </div>
            </div>
            {report.witnesses && <div className="section"><div className="section-title">Witnesses</div><p style={{margin:0}}>{report.witnesses}</p></div>}
            {report.follow_up_required && (
              <div className="section">
                <div className="section-title">Follow-Up Required</div>
                {report.follow_up_date && <p style={{margin:'0 0 4px',fontSize:12,color:'#64748b'}}>Due: {new Date(report.follow_up_date + 'T12:00:00').toLocaleDateString()}</p>}
                <p style={{margin:0}}>{report.follow_up_notes || '—'}</p>
              </div>
            )}
            {report.review_notes && (
              <div className="section">
                <div className="section-title">Manager Review Notes</div>
                <p style={{margin:0}}>{report.review_notes}</p>
                {reviewerName && <p style={{margin:'4px 0 0',fontSize:12,color:'#64748b'}}>Reviewed by: {reviewerName}</p>}
              </div>
            )}
            <div className="sig-block">
              <div><div className="sig-line">Staff Signature / Date</div></div>
              <div><div className="sig-line">Manager Signature / Date</div></div>
            </div>
            <div className="footer">This report is confidential. ElderLoop Incident Report System · {orgName}</div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Close</button>
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors">
            <Printer size={15} /> Print Report
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Incident Form / View Modal ─────────────────────────────────
// ── Resident Lookup ────────────────────────────────────────────
function ResidentLookup({ residents, value, onChange, disabled, inputCls }) {
  const [search, setSearch] = useState(value || '')
  const [open, setOpen]     = useState(false)

  // Sync when editing an existing incident
  useEffect(() => { setSearch(value || '') }, [value])

  const filtered = residents.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    return `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) ||
           r.room?.toLowerCase().includes(q)
  })

  const handleSelect = (r) => {
    const name = `${r.first_name} ${r.last_name}`
    setSearch(name)
    setOpen(false)
    onChange(name, r.room || '')
  }

  const handleChange = (e) => {
    setSearch(e.target.value)
    setOpen(true)
    onChange(e.target.value, '')
  }

  return (
    <div className="relative">
      <input
        value={search}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        disabled={disabled}
        placeholder="Search resident or type N/A"
        className={inputCls}
      />
      {open && !disabled && search && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filtered.slice(0, 8).map(r => (
            <button key={r.id} onMouseDown={() => handleSelect(r)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 border-b border-slate-50 last:border-0 text-left">
              <span className="text-sm font-medium text-slate-800">{r.first_name} {r.last_name}</span>
              {r.room && <span className="text-xs text-slate-400">Room {r.room}</span>}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-400">No residents found</div>
          )}
        </div>
      )}
    </div>
  )
}

// canEdit:   can save changes to this specific report
// canReview: can change status and write review notes (manager+)
// viewOnly:  supervisor viewing someone else's report — read only
function IncidentModal({ incident, canEdit, canReview, viewOnly, residents, onClose, onSave }) {
  const { profile, organization } = useAuth()
  const isNew = !incident
  const orgId = organization?.id || profile?.organization_id

  const [form, setForm] = useState({
    incident_type:           incident?.incident_type           || 'fall',
    incident_date:           incident?.incident_date           || new Date().toISOString().split('T')[0],
    incident_time:           incident?.incident_time           || '',
    location:                incident?.location                || '',
    severity:                incident?.severity                || 'minor',
    resident_name:           incident?.resident_name           || '',
    resident_unit:           incident?.resident_unit           || '',
    description:             incident?.description             || '',
    injuries_observed:       incident?.injuries_observed       || '',
    immediate_action:        incident?.immediate_action        || '',
    was_911_called:          incident?.was_911_called          || false,
    was_doctor_called:       incident?.was_doctor_called       || false,
    was_family_notified:     incident?.was_family_notified     || false,
    was_supervisor_notified: incident?.was_supervisor_notified || false,
    witnesses:               incident?.witnesses               || '',
    follow_up_required:      incident?.follow_up_required      || false,
    follow_up_notes:         incident?.follow_up_notes         || '',
    follow_up_date:          incident?.follow_up_date          || '',
    status:                  incident?.status                  || 'draft',
    review_notes:            incident?.review_notes            || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (submitStatus) => {
    if (!form.description.trim()) { setError('Description is required'); return }
    if (!form.incident_date) { setError('Date is required'); return }
    setSaving(true)
    const finalStatus = submitStatus || form.status
    const payload = {
      ...form,
      organization_id: orgId,
      filed_by:        incident?.filed_by || profile.id,
      status:          finalStatus,
      follow_up_date:  form.follow_up_date || null,
      reviewed_by:     ['closed','under_review'].includes(finalStatus) ? profile.id : (incident?.reviewed_by || null),
      reviewed_at:     ['closed','under_review'].includes(finalStatus) && !incident?.reviewed_at
        ? new Date().toISOString() : (incident?.reviewed_at || null),
      updated_at:      new Date().toISOString(),
    }
    if (isNew) {
      await supabase.from('incident_reports').insert({ ...payload, is_active: true })
    } else {
      await supabase.from('incident_reports').update(payload).eq('id', incident.id)
    }
    setSaving(false)
    onSave()
  }

  const inputCls = `w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${viewOnly && !canReview ? 'bg-slate-50 text-slate-500 cursor-default' : ''}`
  const readOnly = viewOnly && !canReview

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-display font-semibold text-slate-800">
              {isNew ? 'File Incident Report' : viewOnly ? `Report #${incident.report_number}` : `Edit Report #${incident.report_number}`}
            </h2>
            {viewOnly && !canEdit && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full w-fit">
                <Lock size={10} /> View only
              </div>
            )}
          </div>
          <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

          {/* Incident basics */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Incident Type</label>
              <select value={form.incident_type} onChange={e => set('incident_type', e.target.value)}
                disabled={readOnly} className={inputCls}>
                {INCIDENT_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Severity</label>
              <select value={form.severity} onChange={e => set('severity', e.target.value)}
                disabled={readOnly} className={inputCls}>
                {SEVERITIES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Date <span className="text-red-500">*</span></label>
              <input type="date" value={form.incident_date} onChange={e => set('incident_date', e.target.value)}
                disabled={readOnly} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Time</label>
              <input type="time" value={form.incident_time} onChange={e => set('incident_time', e.target.value)}
                disabled={readOnly} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Location</label>
            <input value={form.location} onChange={e => set('location', e.target.value)}
              disabled={readOnly} placeholder="Room number, common area, dining room..."
              className={inputCls} />
          </div>

          {/* Resident info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Resident Name</label>
              <ResidentLookup
                residents={residents || []}
                value={form.resident_name}
                onChange={(name, room) => {
                  set('resident_name', name)
                  if (room) set('resident_unit', room)
                }}
                disabled={readOnly}
                inputCls={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Room / Unit</label>
              <input value={form.resident_unit} onChange={e => set('resident_unit', e.target.value)}
                disabled={readOnly} placeholder="Auto-filled or enter manually"
                className={inputCls} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description <span className="text-red-500">*</span></label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              disabled={readOnly} rows={4} placeholder="Describe what happened in detail..."
              className={`${inputCls} resize-none`} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Injuries Observed</label>
            <textarea value={form.injuries_observed} onChange={e => set('injuries_observed', e.target.value)}
              disabled={readOnly} rows={2} placeholder="Describe any visible injuries..."
              className={`${inputCls} resize-none`} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Immediate Action Taken</label>
            <textarea value={form.immediate_action} onChange={e => set('immediate_action', e.target.value)}
              disabled={readOnly} rows={2} placeholder="First aid applied, who was called, etc..."
              className={`${inputCls} resize-none`} />
          </div>

          {/* Notification checkboxes */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Notifications</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'was_911_called',          label: '911 Called' },
                { key: 'was_doctor_called',        label: 'Doctor Notified' },
                { key: 'was_family_notified',      label: 'Family Notified' },
                { key: 'was_supervisor_notified',  label: 'Supervisor Notified' },
              ].map(item => (
                <label key={item.key} className={`flex items-center gap-2 p-2.5 border rounded-lg text-sm cursor-pointer transition-colors ${
                  form[item.key] ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'
                } ${readOnly ? 'cursor-default opacity-70' : 'hover:border-brand-200'}`}>
                  <input type="checkbox" checked={form[item.key]}
                    disabled={readOnly}
                    onChange={e => set(item.key, e.target.checked)}
                    className="accent-brand-600" />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Witnesses</label>
            <input value={form.witnesses} onChange={e => set('witnesses', e.target.value)}
              disabled={readOnly} placeholder="Names of staff or residents who witnessed the incident"
              className={inputCls} />
          </div>

          {/* Follow-up */}
          <div>
            <label className={`flex items-center gap-2 text-sm font-medium cursor-pointer ${readOnly ? 'cursor-default opacity-70' : ''}`}>
              <input type="checkbox" checked={form.follow_up_required}
                disabled={readOnly}
                onChange={e => set('follow_up_required', e.target.checked)}
                className="accent-brand-600" />
              Follow-up Required
            </label>
            {form.follow_up_required && (
              <div className="mt-3 space-y-2 pl-6">
                <input type="date" value={form.follow_up_date} onChange={e => set('follow_up_date', e.target.value)}
                  disabled={readOnly} className={inputCls} />
                <textarea value={form.follow_up_notes} onChange={e => set('follow_up_notes', e.target.value)}
                  disabled={readOnly} rows={2} placeholder="Describe follow-up actions needed..."
                  className={`${inputCls} resize-none`} />
              </div>
            )}
          </div>

          {/* ── Manager Review Section (manager+ only) ── */}
          {canReview && (
            <div className="border-t-2 border-dashed border-amber-200 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={14} className="text-amber-600" />
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Manager Review</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Status</label>
                  <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
                    {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Review Notes</label>
                  <textarea value={form.review_notes} onChange={e => set('review_notes', e.target.value)}
                    rows={3} placeholder="Manager notes, corrective actions, root cause..."
                    className={`${inputCls} resize-none`} />
                </div>
              </div>
            </div>
          )}

          {/* Supervisor sees review notes read-only if they exist */}
          {!canReview && !isNew && incident?.review_notes && (
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={13} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Manager Review</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl text-sm text-slate-600">{incident.review_notes}</div>
              {incident.reviewer && (
                <div className="text-xs text-slate-400 mt-1.5">
                  Reviewed by {incident.reviewer.first_name} {incident.reviewer.last_name}
                  {incident.reviewed_at && ` · ${new Date(incident.reviewed_at).toLocaleDateString()}`}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">
            {viewOnly && !canEdit ? 'Close' : 'Cancel'}
          </button>

          {/* View-only: just close */}
          {viewOnly && !canEdit && !canReview && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Lock size={12} /> You can view this report but not edit it
            </div>
          )}

          {/* Can edit own (staff filing) — hidden when canReview to avoid duplicate save buttons */}
          {(canEdit || isNew) && !viewOnly && !canReview && (
            <div className="flex gap-2">
              {(isNew || form.status === 'draft') && (
                <button onClick={() => handleSave('draft')} disabled={saving}
                  className="px-4 py-2 border border-slate-200 text-sm text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors">
                  {saving ? '...' : 'Save Draft'}
                </button>
              )}
              <button onClick={() => handleSave(form.status === 'draft' ? 'submitted' : form.status)} disabled={saving}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-medium rounded-lg transition-colors">
                {saving ? 'Saving...' : form.status === 'draft' ? 'Submit Report' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* Manager: can edit + review */}
          {canReview && (
            <div className="flex gap-2">
              <button onClick={() => handleSave(form.status)} disabled={saving}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────
export default function IncidentReports() {
  const { profile, organization } = useAuth()
  const [reports, setReports]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType]     = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected]   = useState(null)
  const [printReport, setPrintReport] = useState(null)

  // ── Progressive access levels ─────────────────────────────
  const role = profile?.role
  const canViewAll = ['supervisor','manager','ceo','org_admin','super_admin'].includes(role)
  const canEditAny = ['manager','ceo','org_admin','super_admin'].includes(role)
  const canFile    = !['family','resident'].includes(role)

  // Per-report edit logic
  const canEditReport = (r) => {
    if (canEditAny) return true                                          // manager+: edit any
    if (r.filed_by === profile?.id && r.status === 'draft') return true  // staff + supervisor: own draft
    return false
  }

  useEffect(() => { if (organization) fetchAll() }, [organization])

  async function fetchAll() {
    setLoading(true)
    // RLS handles visibility: staff see own, supervisor+ see all
    const [repsRes, resRes] = await Promise.all([
      supabase.from('incident_reports')
        .select('*, filer:profiles!incident_reports_filed_by_fkey(first_name,last_name), reviewer:profiles!incident_reports_reviewed_by_fkey(first_name,last_name)')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase.from('residents').select('id,first_name,last_name,room')
        .eq('organization_id', organization.id).eq('is_active', true).order('last_name'),
    ])
    setReports(repsRes.data || [])
    setResidents(resRes.data || [])
    setLoading(false)
  }

  const handleOpen = (r) => { setSelected(r); setShowModal(true) }
  const handleNew  = () => { setSelected(null); setShowModal(true) }
  const handleSave = () => { setShowModal(false); setSelected(null); fetchAll() }

  const filtered = reports.filter(r => {
    const matchSearch = !search || [r.resident_name, r.location, r.description].filter(Boolean)
      .some(f => f.toLowerCase().includes(search.toLowerCase()))
    const matchStatus = filterStatus === 'all' || r.status === filterStatus
    const matchType   = filterType   === 'all' || r.incident_type === filterType
    return matchSearch && matchStatus && matchType
  })

  const stats = {
    open:      reports.filter(r => ['submitted','under_review'].includes(r.status)).length,
    thisMonth: reports.filter(r => {
      const d = new Date(r.created_at); const n = new Date()
      return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
    }).length,
    followUp:  reports.filter(r => r.follow_up_required && r.status !== 'closed').length,
    critical:  reports.filter(r => r.severity === 'critical' && r.status !== 'closed').length,
  }

  // Determine if modal should be view-only
  // Supervisor viewing someone else's report = view only (can't edit)
  const getModalViewOnly = (r) => {
    if (!r) return false            // new report
    if (canEditAny) return false    // manager+: never view-only
    if (r.filed_by === profile?.id) return false  // own report: always editable (if draft) or viewable
    return true                     // supervisor viewing someone else's report
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800">Incident Reports</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {canViewAll ? 'All facility incidents' : 'My filed reports'}
          </p>
        </div>
        {canFile && (
          <button onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus size={15} /> File Incident Report
          </button>
        )}
      </div>

      {/* Stats — only show full stats to supervisor+ */}
      {canViewAll && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Open / In Review', value: stats.open,      color: 'text-blue-600',  bg: 'bg-blue-50' },
            { label: 'This Month',       value: stats.thisMonth,  color: 'text-brand-600', bg: 'bg-brand-50' },
            { label: 'Follow-Up Needed', value: stats.followUp,  color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Critical Open',    value: stats.critical,  color: 'text-red-600',   bg: 'bg-red-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
              <div className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Access level banner for staff */}
      {!canViewAll && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
          <Shield size={14} />
          You can see your own reports. Supervisors and managers can see all facility reports.
        </div>
      )}

      {/* Supervisor read-only banner */}
      {canViewAll && !canEditAny && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
          <Eye size={14} />
          You can view all reports and file new ones. Editing and reviewing requires Manager access.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search resident, location, description..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none">
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none">
          <option value="all">All Types</option>
          {INCIDENT_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading reports...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FileText size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-display text-lg text-slate-500">No reports found</p>
          <p className="text-sm mt-1">
            {!canViewAll && reports.length === 0 ? "You haven't filed any reports yet." : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const type     = getType(r.incident_type)
            const severity = getSeverity(r.severity)
            const status   = getStatus(r.status)
            const isOwn    = r.filed_by === profile?.id
            const editable = canEditReport(r)
            const viewOnly = getModalViewOnly(r)

            return (
              <button key={r.id} onClick={() => handleOpen(r)}
                className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 text-left hover:border-brand-200 hover:shadow-md transition-all group">
                {/* Severity color strip */}
                <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${
                  r.severity === 'critical' ? 'bg-red-500' :
                  r.severity === 'serious'  ? 'bg-orange-400' :
                  r.severity === 'moderate' ? 'bg-yellow-400' : 'bg-green-400'
                }`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${type.color}`}>{type.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${severity.color}`}>{severity.label}</span>
                    {isOwn && <span className="text-xs text-brand-600 font-medium">My Report</span>}
                    {viewOnly && <span className="flex items-center gap-1 text-xs text-slate-400"><Lock size={9}/> View Only</span>}
                  </div>
                  <div className="font-medium text-slate-800 text-sm truncate">
                    {r.resident_name || 'No resident specified'} · {r.location || 'No location'}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>#{r.report_number}</span>
                    {r.incident_date && <span>{new Date(r.incident_date + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}</span>}
                    {canViewAll && r.filer && <span>· Filed by {r.filer.first_name} {r.filer.last_name}</span>}
                    {r.follow_up_required && r.status !== 'closed' && (
                      <span className="text-amber-600 font-medium">· Follow-up needed</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium flex items-center gap-1 ${status.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                  <div className="flex items-center gap-1 text-slate-300 group-hover:text-brand-400 transition-colors">
                    {editable ? <Edit2 size={14} /> : <Eye size={14} />}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <IncidentModal
          incident={selected}
          canEdit={selected ? canEditReport(selected) : canFile}
          canReview={canEditAny}
          viewOnly={selected ? getModalViewOnly(selected) : false}
          residents={residents}
          onClose={() => { setShowModal(false); setSelected(null) }}
          onSave={handleSave}
        />
      )}

      {printReport && (
        <PrintReport
          report={printReport}
          orgName={organization?.name || 'ElderLoop'}
          filerName={printReport.filer ? `${printReport.filer.first_name} ${printReport.filer.last_name}` : '—'}
          reviewerName={printReport.reviewer ? `${printReport.reviewer.first_name} ${printReport.reviewer.last_name}` : null}
          onClose={() => setPrintReport(null)}
        />
      )}
    </div>
  )
}
