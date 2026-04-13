import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, X, Edit2, Search, Printer, AlertTriangle,
  CheckCircle2, Clock, Eye, ChevronRight, Filter,
  User, MapPin, Calendar, FileText, Shield,
  Phone, Activity, ArrowUpRight
} from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────
const INCIDENT_TYPES = [
  { key: 'fall',             label: 'Fall',               color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { key: 'injury',           label: 'Injury',             color: 'bg-red-100 text-red-700 border-red-200' },
  { key: 'medication_error', label: 'Medication Error',   color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { key: 'behavioral',       label: 'Behavioral',         color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { key: 'property_damage',  label: 'Property Damage',    color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { key: 'elopement',        label: 'Elopement',          color: 'bg-red-100 text-red-800 border-red-300' },
  { key: 'choking',          label: 'Choking',            color: 'bg-red-100 text-red-700 border-red-200' },
  { key: 'skin_wound',       label: 'Skin / Wound',       color: 'bg-rose-100 text-rose-700 border-rose-200' },
  { key: 'altercation',      label: 'Altercation',        color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { key: 'visitor_incident', label: 'Visitor Incident',   color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { key: 'other',            label: 'Other',              color: 'bg-slate-100 text-slate-600 border-slate-200' },
]

const SEVERITIES = [
  { key: 'minor',    label: 'Minor',    color: 'bg-green-100 text-green-700 border-green-200' },
  { key: 'moderate', label: 'Moderate', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { key: 'serious',  label: 'Serious',  color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { key: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700 border-red-200' },
]

const STATUSES = [
  { key: 'draft',        label: 'Draft',        color: 'bg-slate-100 text-slate-600 border-slate-200',     dot: 'bg-slate-400' },
  { key: 'submitted',    label: 'Submitted',    color: 'bg-blue-50 text-blue-700 border-blue-200',         dot: 'bg-blue-500' },
  { key: 'under_review', label: 'Under Review', color: 'bg-amber-50 text-amber-700 border-amber-200',      dot: 'bg-amber-500' },
  { key: 'closed',       label: 'Closed',       color: 'bg-green-50 text-green-700 border-green-200',      dot: 'bg-green-500' },
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
        .check{color:#16a34a;font-weight:bold}
        .uncheck{color:#94a3b8}
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
    ? new Date(report.incident_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : '—'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800">Incident Report #{report.report_number}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div ref={printRef}>
            <div className="header">
              <h2>{orgName} — Incident Report</h2>
              <div style={{marginTop:6,color:'#64748b',fontSize:12}}>
                Report #{report.report_number} &nbsp;·&nbsp;
                Filed {new Date(report.created_at).toLocaleDateString()} &nbsp;·&nbsp;
                {getStatus(report.status).label}
              </div>
            </div>

            <div className="grid">
              <div className="section">
                <div className="section-title">Incident Information</div>
                <div className="field"><label>Type</label><p>{getType(report.incident_type).label}</p></div>
                <div className="field"><label>Severity</label><p>{getSeverity(report.severity).label}</p></div>
                <div className="field"><label>Date &amp; Time</label><p>{incDate}{report.incident_time ? ` at ${fmt12(report.incident_time)}` : ''}</p></div>
                <div className="field"><label>Location</label><p>{report.location || '—'}</p></div>
              </div>
              <div className="section">
                <div className="section-title">Resident Involved</div>
                <div className="field"><label>Name</label><p>{report.resident_name || '—'}</p></div>
                <div className="field"><label>Unit</label><p>{report.resident_unit || '—'}</p></div>
                <div className="field"><label>Filed By</label><p>{filerName || '—'}</p></div>
              </div>
            </div>

            <div className="section">
              <div className="section-title">Description of Incident</div>
              <p style={{margin:0,lineHeight:1.6}}>{report.description}</p>
            </div>

            {report.injuries_observed && (
              <div className="section">
                <div className="section-title">Injuries Observed</div>
                <p style={{margin:0,lineHeight:1.6}}>{report.injuries_observed}</p>
              </div>
            )}

            {report.immediate_action && (
              <div className="section">
                <div className="section-title">Immediate Action Taken</div>
                <p style={{margin:0,lineHeight:1.6}}>{report.immediate_action}</p>
              </div>
            )}

            <div className="section">
              <div className="section-title">Notifications</div>
              <div class="grid" style={{gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8}}>
                <div><span class="${report.was_911_called ? 'check' : 'uncheck'}">${report.was_911_called ? '✓' : '✗'}</span> 911 Called</div>
                <div><span class="${report.was_doctor_called ? 'check' : 'uncheck'}">${report.was_doctor_called ? '✓' : '✗'}</span> Doctor Notified</div>
                <div><span class="${report.was_family_notified ? 'check' : 'uncheck'}">${report.was_family_notified ? '✓' : '✗'}</span> Family Notified</div>
                <div><span class="${report.was_supervisor_notified ? 'check' : 'uncheck'}">${report.was_supervisor_notified ? '✓' : '✗'}</span> Supervisor Notified</div>
              </div>
            </div>

            {report.witnesses && (
              <div className="section">
                <div className="section-title">Witnesses</div>
                <p style={{margin:0}}>{report.witnesses}</p>
              </div>
            )}

            {report.follow_up_required && (
              <div className="section">
                <div className="section-title">Follow-Up Required</div>
                {report.follow_up_date && <p style={{margin:'0 0 4px',fontSize:12,color:'#64748b'}}>Due: {new Date(report.follow_up_date + 'T12:00:00').toLocaleDateString()}</p>}
                <p style={{margin:0}}>{report.follow_up_notes || '—'}</p>
              </div>
            )}

            {report.review_notes && (
              <div className="section">
                <div className="section-title">Supervisor Review Notes</div>
                <p style={{margin:0}}>{report.review_notes}</p>
                {reviewerName && <p style={{margin:'4px 0 0',fontSize:12,color:'#64748b'}}>Reviewed by: {reviewerName}</p>}
              </div>
            )}

            <div className="sig-block">
              <div>
                <div className="sig-line">Staff Signature / Date</div>
              </div>
              <div>
                <div className="sig-line">Supervisor Signature / Date</div>
              </div>
            </div>

            <div className="footer">
              This report is confidential. ElderLoop Incident Report System · {orgName}
            </div>
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

// ── Incident Form ──────────────────────────────────────────────
function IncidentModal({ incident, onClose, onSave }) {
  const { profile } = useAuth()
  const isNew        = !incident
  const isSupervisor = ['super_admin','org_admin','supervisor','manager'].includes(profile?.role)

  const [form, setForm] = useState({
    incident_type:    incident?.incident_type    || 'fall',
    incident_date:    incident?.incident_date    || new Date().toISOString().split('T')[0],
    incident_time:    incident?.incident_time    || '',
    location:         incident?.location         || '',
    severity:         incident?.severity         || 'minor',
    resident_name:    incident?.resident_name    || '',
    resident_unit:    incident?.resident_unit    || '',
    description:      incident?.description      || '',
    injuries_observed: incident?.injuries_observed || '',
    immediate_action: incident?.immediate_action || '',
    was_911_called:   incident?.was_911_called   || false,
    was_doctor_called: incident?.was_doctor_called || false,
    was_family_notified: incident?.was_family_notified || false,
    was_supervisor_notified: incident?.was_supervisor_notified || false,
    witnesses:        incident?.witnesses        || '',
    follow_up_required: incident?.follow_up_required || false,
    follow_up_notes:  incident?.follow_up_notes  || '',
    follow_up_date:   incident?.follow_up_date   || '',
    status:           incident?.status           || 'draft',
    review_notes:     incident?.review_notes     || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (submitStatus) => {
    if (!form.description.trim()) { setError('Description is required'); return }
    if (!form.incident_date) { setError('Date is required'); return }
    setSaving(true)
    const payload = {
      ...form,
      organization_id: profile.organization_id,
      filed_by: incident?.filed_by || profile.id,
      status: submitStatus || form.status,
      follow_up_date: form.follow_up_date || null,
      reviewed_by: submitStatus === 'closed' || submitStatus === 'under_review' ? profile.id : (incident?.reviewed_by || null),
      reviewed_at: (submitStatus === 'closed' || submitStatus === 'under_review') && !incident?.reviewed_at ? new Date().toISOString() : (incident?.reviewed_at || null),
      updated_at: new Date().toISOString(),
    }
    let err
    if (incident?.id) {
      ({ error: err } = await supabase.from('incident_reports').update(payload).eq('id', incident.id))
    } else {
      ({ error: err } = await supabase.from('incident_reports').insert({ ...payload, is_active: true }))
    }
    if (err) { setError(err.message); setSaving(false); return }
    onSave()
  }

  const canReview = isSupervisor && !isNew

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-orange-500" />
            <h2 className="font-display font-semibold text-slate-800">
              {isNew ? 'File Incident Report' : `Incident Report #${incident.report_number}`}
            </h2>
            {!isNew && (
              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${getStatus(form.status).color}`}>
                {getStatus(form.status).label}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          {/* Type + Severity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Incident Type</label>
              <div className="grid grid-cols-2 gap-1.5">
                {INCIDENT_TYPES.map(t => (
                  <button key={t.key} onClick={() => set('incident_type', t.key)}
                    className={`text-left px-2.5 py-2 rounded-lg border text-xs font-medium transition-all ${form.incident_type === t.key ? t.color + ' ring-2 ring-offset-1 ring-brand-400' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Severity</label>
                <div className="space-y-1.5">
                  {SEVERITIES.map(s => (
                    <button key={s.key} onClick={() => set('severity', s.key)}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${form.severity === s.key ? s.color + ' ring-2 ring-offset-1 ring-brand-400' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Date / Time / Location */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Date *</label>
              <input type="date" value={form.incident_date} onChange={e => set('incident_date', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Time</label>
              <input type="time" value={form.incident_time} onChange={e => set('incident_time', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Location</label>
              <input value={form.location} onChange={e => set('location', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. Room 204, Hallway" />
            </div>
          </div>

          {/* Resident */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Resident Name</label>
              <input value={form.resident_name} onChange={e => set('resident_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Full name" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Unit</label>
              <input value={form.resident_unit} onChange={e => set('resident_unit', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Unit number" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description of Incident *</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Describe what happened in detail — what you saw, heard, or were told..." />
          </div>

          {/* Injuries */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Injuries Observed</label>
            <textarea value={form.injuries_observed} onChange={e => set('injuries_observed', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Describe any visible injuries, complaints of pain, etc. (or 'None observed')" />
          </div>

          {/* Immediate action */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Immediate Action Taken</label>
            <textarea value={form.immediate_action} onChange={e => set('immediate_action', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="What was done immediately after the incident..." />
          </div>

          {/* Notifications */}
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Notifications Made</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'was_911_called',          label: '911 Called' },
                { key: 'was_doctor_called',        label: 'Doctor / Nurse Notified' },
                { key: 'was_family_notified',      label: 'Family Notified' },
                { key: 'was_supervisor_notified',  label: 'Supervisor Notified' },
              ].map(n => (
                <label key={n.key} className={`flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border transition-all ${form[n.key] ? 'bg-brand-50 border-brand-200' : 'border-slate-200 bg-white'}`}>
                  <input type="checkbox" checked={form[n.key]} onChange={e => set(n.key, e.target.checked)} className="w-4 h-4 rounded text-brand-600" />
                  <span className="text-sm font-medium text-slate-700">{n.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Witnesses */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Witnesses</label>
            <input value={form.witnesses} onChange={e => set('witnesses', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Names of anyone who witnessed the incident" />
          </div>

          {/* Follow up */}
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input type="checkbox" checked={form.follow_up_required} onChange={e => set('follow_up_required', e.target.checked)} className="w-4 h-4 rounded text-amber-600" />
              <span className="text-sm font-medium text-amber-800">Follow-up required</span>
            </label>
            {form.follow_up_required && (
              <div className="space-y-2">
                <input type="date" value={form.follow_up_date} onChange={e => set('follow_up_date', e.target.value)}
                  className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" />
                <textarea value={form.follow_up_notes} onChange={e => set('follow_up_notes', e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white resize-none"
                  placeholder="What follow-up is needed..." />
              </div>
            )}
          </div>

          {/* Supervisor review section */}
          {canReview && (
            <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl">
              <label className="block text-xs font-semibold text-purple-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Shield size={13} /> Supervisor Review
              </label>
              <div className="mb-3">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Status</label>
                <div className="flex gap-2 flex-wrap">
                  {STATUSES.filter(s => s.key !== 'draft').map(s => (
                    <button key={s.key} onClick={() => set('status', s.key)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${form.status === s.key ? s.color + ' ring-2 ring-offset-1 ring-purple-400' : 'border-slate-200 text-slate-500'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <textarea value={form.review_notes} onChange={e => set('review_notes', e.target.value)} rows={3}
                className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white resize-none"
                placeholder="Supervisor review notes, corrective action taken, outcome..." />
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
          <div className="flex gap-2">
            {(isNew || form.status === 'draft') && (
              <button onClick={() => handleSave('draft')} disabled={saving}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:border-slate-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                Save as Draft
              </button>
            )}
            <button onClick={() => handleSave(form.status === 'draft' ? 'submitted' : form.status)} disabled={saving}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
              {saving ? 'Saving...' : form.status === 'draft' ? 'Submit Report' : 'Save Changes'}
            </button>
          </div>
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
  const [staffMap, setStaffMap]   = useState({})

  const isSupervisor = ['super_admin','org_admin','supervisor','manager'].includes(profile?.role)

  useEffect(() => { if (organization) fetchAll() }, [organization])

  async function fetchAll() {
    setLoading(true)
    const { data } = await supabase.from('incident_reports')
      .select('*, filer:profiles!incident_reports_filed_by_fkey(first_name,last_name), reviewer:profiles!incident_reports_reviewed_by_fkey(first_name,last_name)')
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    setReports(data || [])
    setLoading(false)
  }

  const handleOpen  = (r) => { setSelected(r); setShowModal(true) }
  const handleNew   = () => { setSelected(null); setShowModal(true) }
  const handleSave  = () => { setShowModal(false); setSelected(null); fetchAll() }

  const filtered = reports.filter(r => {
    const matchSearch = !search || [r.resident_name, r.location, r.description].filter(Boolean)
      .some(f => f.toLowerCase().includes(search.toLowerCase()))
    const matchStatus = filterStatus === 'all' || r.status === filterStatus
    const matchType   = filterType   === 'all' || r.incident_type === filterType
    return matchSearch && matchStatus && matchType
  })

  // Stats
  const stats = {
    open:      reports.filter(r => ['submitted','under_review'].includes(r.status)).length,
    thisMonth: reports.filter(r => {
      const d = new Date(r.created_at); const n = new Date()
      return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
    }).length,
    followUp:  reports.filter(r => r.follow_up_required && r.status !== 'closed').length,
    critical:  reports.filter(r => r.severity === 'critical' && r.status !== 'closed').length,
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800">Incident Reports</h1>
          <p className="text-slate-500 text-sm mt-0.5">Document, track, and review facility incidents</p>
        </div>
        <button onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={15} /> File Incident Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Open / In Review', value: stats.open,      color: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: 'This Month',       value: stats.thisMonth,  color: 'text-brand-600',  bg: 'bg-brand-50' },
          { label: 'Follow-Up Needed', value: stats.followUp,  color: 'text-amber-600',  bg: 'bg-amber-50' },
          { label: 'Critical Open',    value: stats.critical,  color: 'text-red-600',    bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
            <div className={`text-3xl font-display font-bold ${s.color}`}>{s.value}</div>
            <div className="text-slate-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by resident, location, description..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
          <option value="all">All Types</option>
          {INCIDENT_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <AlertTriangle size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-display text-lg">No incident reports found</p>
            <p className="text-sm mt-1">Click "File Incident Report" to create one.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Resident</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Filed By</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const type = getType(r.incident_type)
                const sev  = getSeverity(r.severity)
                const stat = getStatus(r.status)
                return (
                  <tr key={r.id} onClick={() => handleOpen(r)}
                    className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-slate-500">#{r.report_number}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${type.color}`}>{type.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-800">{r.resident_name || '—'}</div>
                      {r.location && <div className="text-xs text-slate-400 flex items-center gap-1"><MapPin size={10} />{r.location}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {new Date(r.incident_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {r.incident_time && <div className="text-slate-400">{fmt12(r.incident_time)}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${sev.color}`}>{sev.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${stat.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${stat.dot}`} />
                        {stat.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {r.filer ? `${r.filer.first_name} ${r.filer.last_name}` : '—'}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setPrintReport(r)}
                        className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors">
                        <Printer size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      <div className="mt-2 text-xs text-slate-400 text-right">{filtered.length} report{filtered.length !== 1 ? 's' : ''}</div>

      {showModal && (
        <IncidentModal
          incident={selected}
          onClose={() => { setShowModal(false); setSelected(null) }}
          onSave={handleSave} />
      )}
      {printReport && (
        <PrintReport
          report={printReport}
          orgName={organization?.name}
          filerName={printReport.filer ? `${printReport.filer.first_name} ${printReport.filer.last_name}` : ''}
          reviewerName={printReport.reviewer ? `${printReport.reviewer.first_name} ${printReport.reviewer.last_name}` : ''}
          onClose={() => setPrintReport(null)} />
      )}
    </div>
  )
}
