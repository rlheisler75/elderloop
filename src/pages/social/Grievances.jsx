import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useSocialServicesAccess } from '../../hooks/useSocialServicesAccess'
import { Plus, X, AlertTriangle, Search, Loader2, AlertCircle,
         ChevronDown, Check, Flag, Printer, Settings, Clock } from 'lucide-react'
import { SOCIAL_STATE_REFS } from '../../lib/socialStateRefs'
import RegRefBanner from '../../components/ui/RegRefBanner'
import ResidentPicker from '../../components/ui/ResidentPicker'
import { printResponseLetter, printGrievanceLog, responseState } from './grievancePrint'

// datetime-local <-> ISO
const toLocalInput = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
const fromLocalInput = (v) => v ? new Date(v).toISOString() : null
const shortDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const staffName = (list, id) => { const s = list.find(x => x.id === id); return s ? `${s.first_name} ${s.last_name}` : '' }

// Written-response countdown (RSMo 198.088.3: within 3 days in Missouri)
function DeadlineBadge({ g }) {
  const st = responseState(g)
  if (st === 'no_deadline') return null
  const due = new Date(g.written_response_due)
  const hours = (due - new Date()) / 36e5
  const [cls, text] =
      st === 'on_time'      ? ['bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-900', 'Response given']
    : st === 'late'         ? ['bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900', 'Response given late']
    : st === 'open_overdue' ? ['bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900', `Response overdue (due ${shortDate(due)})`]
    : ['bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900',
       hours < 24 ? `Response due in ${Math.max(1, Math.round(hours))}h` : `Response due ${shortDate(due)}`]
  return <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border ${cls}`}><Clock size={11} />{text}</span>
}

const CATEGORIES = [
  { key: 'care_quality',  label: 'Care Quality'   },
  { key: 'staff_conduct', label: 'Staff Conduct'   },
  { key: 'environment',   label: 'Environment'     },
  { key: 'billing',       label: 'Billing'         },
  { key: 'food',          label: 'Food / Dietary'  },
  { key: 'safety',        label: 'Safety'          },
  { key: 'privacy',       label: 'Privacy'         },
  { key: 'rights',        label: 'Resident Rights' },
  { key: 'discharge',     label: 'Discharge'       },
  { key: 'other',         label: 'Other'           },
]

const COMPLAINANT_TYPES = [
  { key: 'resident', label: 'Resident'       },
  { key: 'family',   label: 'Family Member'  },
  { key: 'staff',    label: 'Staff Member'   },
  { key: 'other',    label: 'Other'          },
]

const PRIORITIES = [
  { key: 'routine',   label: 'Routine',   color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'    },
  { key: 'urgent',    label: 'Urgent',    color: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900'    },
  { key: 'immediate', label: 'Immediate', color: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900'          },
]

const STATUSES = [
  { key: 'open',             label: 'Open',             color: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400'     },
  { key: 'investigating',    label: 'Investigating',    color: 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400' },
  { key: 'pending_response', label: 'Pending Response', color: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'   },
  { key: 'resolved',         label: 'Resolved',         color: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400'   },
  { key: 'escalated',        label: 'Escalated',        color: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400'       },
  { key: 'withdrawn',        label: 'Withdrawn',        color: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'   },
]

function getPriority(key) { return PRIORITIES.find(p => p.key === key) || PRIORITIES[0] }
function getStatus(key)   { return STATUSES.find(s => s.key === key)   || STATUSES[0]  }

function GrievanceModal({ residents, staff, orgId, grievance, canWrite, rules, letterInfo, onClose, onSaved }) {
  const { profile } = useAuth()
  // Tiered communities: resolving and state reporting belong to the Social Services
  // Director, the Administrator (grievance official), or an Org Admin.
  const { canClose } = useSocialServicesAccess()
  const isNew = !grievance
  const [form, setForm] = useState({
    resident_id:               grievance?.resident_id || '',
    complainant_type:          grievance?.complainant_type || 'resident',
    complainant_name:          grievance?.complainant_name || '',
    complainant_phone:         grievance?.complainant_phone || '',
    complainant_relationship:  grievance?.complainant_relationship || '',
    category:                  grievance?.category || '',
    description:               grievance?.description || '',
    priority:                  grievance?.priority || 'routine',
    status:                    grievance?.status || 'open',
    assigned_to:               grievance?.assigned_to || '',
    investigation_notes:       grievance?.investigation_notes || '',
    resolution:                grievance?.resolution || '',
    resident_satisfied:        grievance?.resident_satisfied ?? null,
    regulatory_report_required: grievance?.regulatory_report_required || false,
    regulatory_report_date:    grievance?.regulatory_report_date || '',
    regulatory_agency:         grievance?.regulatory_agency || '',
    // RSMo 198.088.3: occurrence date (14-day window), when the designee received
    // it, and the written explanation of findings and proposed remedies
    incident_date:             grievance?.incident_date || '',
    received_at:               toLocalInput(grievance?.received_at || grievance?.filed_at || new Date().toISOString()),
    findings:                  grievance?.findings || '',
    proposed_remedies:         grievance?.proposed_remedies || '',
    written_response_at:       toLocalInput(grievance?.written_response_at),
    oral_explanation_needed:   grievance?.oral_explanation_needed || false,
    oral_explanation_at:       toLocalInput(grievance?.oral_explanation_at),
    outside_rights_given:      grievance?.outside_rights_given || false,
  })
  const dueAt = rules?.response_days && form.received_at
    ? new Date(new Date(form.received_at).getTime() + rules.response_days * 864e5) : null
  const filedLate = rules?.filing_window_days && form.incident_date && form.received_at
    && (new Date(form.received_at) - new Date(form.incident_date + 'T00:00:00')) / 864e5 > rules.filing_window_days + 1
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const readOnly = !canWrite

  const handleSave = async () => {
    if (!form.category || !form.description.trim()) { setError('Category and description are required.'); return }
    setSaving(true); setError('')
    const _now = new Date()
    const payload = {
      ...form,
      organization_id:          orgId,
      resident_id:              form.resident_id           || null,
      assigned_to:              form.assigned_to           || null,
      resolved_by:              form.resolved_by           || null,
      resolved_at:              form.resolved_at           || null,
      regulatory_report_date:   form.regulatory_report_date || null,
      regulatory_agency:        form.regulatory_agency     || null,
      complainant_name:         form.complainant_name      || null,
      complainant_phone:        form.complainant_phone     || null,
      complainant_relationship: form.complainant_relationship || null,
      resolution:               form.resolution            || null,
      investigation_notes:      form.investigation_notes   || null,
      incident_date:            form.incident_date         || null,
      received_at:              fromLocalInput(form.received_at) || _now.toISOString(),
      findings:                 form.findings              || null,
      proposed_remedies:        form.proposed_remedies     || null,
      written_response_at:      fromLocalInput(form.written_response_at),
      oral_explanation_at:      form.oral_explanation_needed ? fromLocalInput(form.oral_explanation_at) : null,
      updated_at:               _now.toISOString(),
    }
    if (payload.written_response_at && (!form.findings.trim() || !form.proposed_remedies.trim())) {
      setSaving(false); setError('Fill in the findings and proposed remedies before recording the written response as given.'); return
    }
    let err
    if (isNew) {
      const { error: e } = await supabase.from('ss_grievances').insert({ ...payload, filed_by: profile?.id, grievance_number: '' })
      err = e
    } else {
      const { error: e } = await supabase.from('ss_grievances').update(payload).eq('id', grievance.id)
      err = e
    }
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div>
            <h2 className="font-display font-bold text-slate-800 dark:text-slate-100">
              {isNew ? 'File Grievance' : `Grievance ${grievance.grievance_number}`}
            </h2>
            {!isNew && (
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriority(grievance.priority).color}`}>
                  {getPriority(grievance.priority).label}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatus(grievance.status).color}`}>
                  {getStatus(grievance.status).label}
                </span>
                <DeadlineBadge g={grievance} />
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-400 text-sm">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Resident */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Resident (if applicable)</label>
              <ResidentPicker residents={residents} value={form.resident_id} onChange={id => set('resident_id', id)} disabled={readOnly} noneLabel="— Not resident-specific —" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Priority *</label>
              <div className="flex gap-2">
                {PRIORITIES.map(p => (
                  <button key={p.key} onClick={() => !readOnly && set('priority', p.key)} disabled={readOnly}
                    className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-all
                      ${form.priority === p.key ? p.color + ' border-current' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dates: occurrence (filing window) and received (response clock) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Date it happened</label>
              <input type="date" value={form.incident_date} onChange={e => set('incident_date', e.target.value)} disabled={readOnly}
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 dark:text-slate-100 disabled:bg-slate-50 dark:disabled:bg-slate-800" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Received by the designee</label>
              <input type="datetime-local" value={form.received_at} onChange={e => set('received_at', e.target.value)} disabled={readOnly}
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 dark:text-slate-100 disabled:bg-slate-50 dark:disabled:bg-slate-800" />
            </div>
          </div>
          {(dueAt || filedLate) && (
            <div className="text-xs space-y-1 -mt-2">
              {dueAt && !form.written_response_at && (
                <p className="text-slate-500 dark:text-slate-400">
                  Written response due <b className="text-slate-700 dark:text-slate-200">{dueAt.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</b> ({rules.response_days} days after it was received{letterInfo?.designee ? `; designee ${letterInfo.designee}` : ''}).
                </p>
              )}
              {filedLate && (
                <p className="text-amber-700 dark:text-amber-400">Raised more than {rules.filing_window_days} days after it happened. Still take it and respond; this is only noted on the record.</p>
              )}
            </div>
          )}

          {/* Complainant */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Filed By</label>
            <div className="flex gap-2 mb-3 flex-wrap">
              {COMPLAINANT_TYPES.map(t => (
                <button key={t.key} onClick={() => !readOnly && set('complainant_type', t.key)} disabled={readOnly}
                  className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-all
                    ${form.complainant_type === t.key ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            {form.complainant_type !== 'resident' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="col-span-1">
                  <input value={form.complainant_name} onChange={e => set('complainant_name', e.target.value)} readOnly={readOnly}
                    placeholder="Complainant name"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-800 dark:text-slate-100" />
                </div>
                <div>
                  <input value={form.complainant_phone} onChange={e => set('complainant_phone', e.target.value)} readOnly={readOnly}
                    placeholder="Phone"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-800 dark:text-slate-100" />
                </div>
                <div>
                  <input value={form.complainant_relationship} onChange={e => set('complainant_relationship', e.target.value)} readOnly={readOnly}
                    placeholder="Relationship"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-800 dark:text-slate-100" />
                </div>
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Category *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat.key} onClick={() => !readOnly && set('category', cat.key)} disabled={readOnly}
                  className={`px-3 py-2 rounded-xl border text-sm font-medium transition-all text-left
                    ${form.category === cat.key ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-300'}`}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Description of Complaint *</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} readOnly={readOnly} rows={4}
              placeholder="Provide a detailed description of the grievance..."
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none disabled:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-800" />
          </div>

          {/* Status & Assignment (edit mode) */}
          {!isNew && (
            <>
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                  <select value={form.status} onChange={e => set('status', e.target.value)} disabled={readOnly}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 dark:text-slate-100 disabled:bg-slate-50 dark:disabled:bg-slate-800">
                    {STATUSES.map(s => <option key={s.key} value={s.key} disabled={s.key === 'resolved' && !canClose && grievance?.status !== 'resolved'}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Assigned To</label>
                  <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} disabled={readOnly}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 dark:text-slate-100 disabled:bg-slate-50 dark:disabled:bg-slate-800">
                    <option value="">— Unassigned —</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Investigation Notes</label>
                <textarea value={form.investigation_notes} onChange={e => set('investigation_notes', e.target.value)} readOnly={readOnly} rows={3}
                  placeholder="Running notes during investigation..."
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none disabled:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-800" />
              </div>

              {/* Written response (RSMo 198.088.3) */}
              <div className="space-y-3 p-4 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                    Written response{rules?.response_days ? ` (within ${rules.response_days} days)` : ''}
                  </span>
                  <button type="button" onClick={() => printResponseLetter({ ...grievance, ...form, received_at: fromLocalInput(form.received_at), written_response_at: fromLocalInput(form.written_response_at) }, letterInfo)}
                    className="flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:underline">
                    <Printer size={13} /> Print response letter
                  </button>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Findings</label>
                  <textarea value={form.findings} onChange={e => set('findings', e.target.value)} readOnly={readOnly} rows={3}
                    placeholder="What the investigation found..."
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Proposed remedies</label>
                  <textarea value={form.proposed_remedies} onChange={e => set('proposed_remedies', e.target.value)} readOnly={readOnly} rows={3}
                    placeholder="What the facility will do about it..."
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Written response given</label>
                    <div className="flex gap-2">
                      <input type="datetime-local" value={form.written_response_at} onChange={e => set('written_response_at', e.target.value)} disabled={readOnly}
                        className="flex-1 min-w-0 px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50" />
                      {!readOnly && !form.written_response_at && (
                        <button type="button" onClick={() => set('written_response_at', toLocalInput(new Date().toISOString()))}
                          className="px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800">Now</button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 mb-1">
                      <input type="checkbox" checked={form.oral_explanation_needed} onChange={e => set('oral_explanation_needed', e.target.checked)} disabled={readOnly} className="rounded text-brand-600" />
                      Also needs an oral explanation (resident's condition)
                    </label>
                    {form.oral_explanation_needed && (
                      <input type="datetime-local" value={form.oral_explanation_at} onChange={e => set('oral_explanation_at', e.target.value)} disabled={readOnly}
                        title="When the oral explanation was given"
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50" />
                    )}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <input type="checkbox" checked={form.outside_rights_given} onChange={e => set('outside_rights_given', e.target.checked)} disabled={readOnly} className="rounded text-brand-600" />
                  Told they may also contact DHSS, the Ombudsman, or anyone outside the facility (printed on the letter)
                </label>
              </div>

              {(form.status === 'resolved' || form.resolution) && (
                <div className="space-y-3 p-4 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-900 rounded-xl">
                  <label className="block text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">Resolution</label>
                  <textarea value={form.resolution} onChange={e => set('resolution', e.target.value)} readOnly={readOnly} rows={3}
                    placeholder="Describe how the grievance was resolved..."
                    className="w-full px-3 py-2.5 border border-green-200 dark:border-green-800 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-green-700 dark:text-green-400">Resident/family satisfied with resolution?</span>
                    <div className="flex gap-2 ml-auto">
                      {[true, false].map(v => (
                        <button key={String(v)} onClick={() => !readOnly && set('resident_satisfied', v)} disabled={readOnly}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                            ${form.resident_satisfied === v
                              ? v ? 'bg-green-600 text-white border-green-600' : 'bg-red-500 text-white border-red-500'
                              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
                          {v ? 'Yes' : 'No'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Regulatory */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2"><Flag size={14} className="text-red-500" /> Regulatory Report Required</span>
                  <button onClick={() => !readOnly && canClose && set('regulatory_report_required', !form.regulatory_report_required)} disabled={readOnly || !canClose}
                    className={`w-11 h-6 rounded-full transition-colors relative ${form.regulatory_report_required ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.regulatory_report_required ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
                {form.regulatory_report_required && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Report Date</label>
                      <input type="date" value={form.regulatory_report_date} onChange={e => set('regulatory_report_date', e.target.value)} disabled={readOnly || !canClose}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-800" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Agency</label>
                      <input value={form.regulatory_agency} onChange={e => set('regulatory_agency', e.target.value)} readOnly={readOnly || !canClose}
                        placeholder="e.g. MO DHSS"
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-800 dark:text-slate-100" />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 font-medium">{readOnly ? 'Close' : 'Cancel'}</button>
          {!readOnly && (
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Saving...' : isNew ? 'File Grievance' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Grievance designee and contact numbers (grievance_settings). Day counts left
// blank fall back to the state rule (Missouri: 3-day response, 14-day window).
function GrievanceSettingsModal({ orgId, staff, settings, stateRef, onClose, onSaved }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    designee_id:        settings?.designee_id || '',
    response_days:      settings?.response_days ?? '',
    filing_window_days: settings?.filing_window_days ?? '',
    dhss_phone:         settings?.dhss_phone || '',
    ombudsman_phone:    settings?.ombudsman_phone || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const inputCls = 'w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500'

  async function save() {
    setSaving(true); setError('')
    const { error: e } = await supabase.from('grievance_settings').upsert({
      organization_id:    orgId,
      designee_id:        form.designee_id || null,
      response_days:      form.response_days === '' ? null : Number(form.response_days),
      filing_window_days: form.filing_window_days === '' ? null : Number(form.filing_window_days),
      dhss_phone:         form.dhss_phone.trim() || null,
      ombudsman_phone:    form.ombudsman_phone.trim() || null,
      updated_by:         profile?.id,
      updated_at:         new Date().toISOString(),
    })
    setSaving(false)
    if (e) { setError(e.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-display font-bold text-slate-800 dark:text-slate-100">Grievance Settings</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="flex items-center gap-2 text-sm text-red-600"><AlertCircle size={14} /> {error}</div>}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Grievance designee</label>
            <select value={form.designee_id} onChange={e => set('designee_id', e.target.value)} className={inputCls}>
              <option value="">— Not set —</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select>
            <p className="text-xs text-slate-400 mt-1">A full-time staff member who receives every grievance. New grievances are assigned to them and ring their bell.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Written response within (days)</label>
              <input type="number" min="1" max="60" value={form.response_days} onChange={e => set('response_days', e.target.value)} placeholder="State rule" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Filing window (days)</label>
              <input type="number" min="1" max="365" value={form.filing_window_days} onChange={e => set('filing_window_days', e.target.value)} placeholder="State rule" className={inputCls} />
            </div>
          </div>
          <p className="text-xs text-slate-400 -mt-2">Leave blank to follow the state rule{stateRef?.label === 'Missouri' ? ' (Missouri: 3 days to respond, 14 days to file)' : ''}.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">State agency phone</label>
              <input value={form.dhss_phone} onChange={e => set('dhss_phone', e.target.value)} placeholder={stateRef?.abuseReporting?.phone || ''} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Ombudsman phone</label>
              <input value={form.ombudsman_phone} onChange={e => set('ombudsman_phone', e.target.value)} placeholder={stateRef?.ombudsman?.phone || ''} className={inputCls} />
            </div>
          </div>
          <p className="text-xs text-slate-400 -mt-2">Printed on response letters. Blank uses the number shown.</p>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 font-medium">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
          </button>
        </div>
      </div>
    </div>
  )
}

// Grievance log for state surveyors: every grievance received in a date range
function PrintLogModal({ grievances, onPrint, onClose }) {
  const today = new Date().toISOString().slice(0, 10)
  const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10)
  const [from, setFrom] = useState(yearAgo)
  const [to, setTo]     = useState(today)
  const inRange = grievances.filter(g => { const d = (g.received_at || g.filed_at || '').slice(0, 10); return d >= from && d <= to })
  const inputCls = 'w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-display font-bold text-slate-800 dark:text-slate-100">Print Grievance Log</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">Every grievance received in the period, with response dates, findings, remedies, and outcome. For state surveyors.</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-slate-500 mb-1">From</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputCls} /></div>
            <div><label className="block text-xs text-slate-500 mb-1">To</label><input type="date" value={to} onChange={e => setTo(e.target.value)} className={inputCls} /></div>
          </div>
          <p className="text-xs text-slate-400">{inRange.length} grievance{inRange.length !== 1 ? 's' : ''} in this period.</p>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 font-medium">Cancel</button>
          <button onClick={() => onPrint(inRange.slice().sort((a, b) => (a.received_at || a.filed_at).localeCompare(b.received_at || b.filed_at)), from, to)}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl">
            <Printer size={14} /> Print
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Grievances({ canWrite }) {
  const { organization } = useAuth()
  const { canClose } = useSocialServicesAccess()
  const [grievances, setGrievances] = useState([])
  const [residents,  setResidents]  = useState([])
  const [staff,      setStaff]      = useState([])
  const [settings,   setSettings]   = useState(null)
  const [rules,      setRules]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showLog,    setShowLog]    = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [filter,     setFilter]     = useState({ status: '', priority: '', category: '' })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: g }, { data: res }, { data: st }, { data: gs }, { data: gr }] = await Promise.all([
      supabase.from('ss_grievances')
        .select('*, residents(first_name, last_name, room, care_level, unit), filed:filed_by(first_name, last_name), assigned:assigned_to(first_name, last_name)')
        .eq('organization_id', organization.id).eq('is_active', true)
        .order('filed_at', { ascending: false }),
      supabase.from('residents').select('id, first_name, last_name, room, care_level, unit')
        .eq('organization_id', organization.id).eq('is_active', true).order('last_name'),
      // Any active staff member can be assigned or be the designee
      supabase.from('profiles').select('id, first_name, last_name')
        .eq('organization_id', organization.id).eq('is_active', true)
        .not('role', 'in', '(family,resident,sales_rep)')
        .order('last_name'),
      supabase.from('grievance_settings').select('*').eq('organization_id', organization.id).maybeSingle(),
      supabase.rpc('grievance_rules', { p_org: organization.id }),
    ])
    setGrievances(g || [])
    setResidents(res || [])
    setStaff(st || [])
    setSettings(gs || null)
    setRules(gr?.[0] || null)
    setLoading(false)
  }

  const filtered = grievances.filter(g => {
    if (filter.status   && g.status   !== filter.status)   return false
    if (filter.priority && g.priority !== filter.priority) return false
    if (filter.category && g.category !== filter.category) return false
    return true
  })

  const formatDate = (ts) => {
    if (!ts) return ''
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Summary stats
  const open   = grievances.filter(g => g.status === 'open').length
  const urgent  = grievances.filter(g => g.priority === 'urgent' || g.priority === 'immediate').length
  const resolved = grievances.filter(g => g.status === 'resolved').length

  const stateRef = SOCIAL_STATE_REFS[organization?.compliance_state] || SOCIAL_STATE_REFS.OTHER
  const designeeName = staffName(staff, rules?.designee_id)
  const letterInfo = {
    orgName:        organization?.name || '',
    designee:       designeeName,
    dhssPhone:      settings?.dhss_phone || stateRef?.abuseReporting?.phone || '',
    ombudsmanPhone: settings?.ombudsman_phone || stateRef?.ombudsman?.phone || '',
  }
  const overdue = grievances.filter(g => responseState(g) === 'open_overdue').length

  return (
    <div className="space-y-4">
      <RegRefBanner
        label={`${stateRef.label} Grievance Requirement`}
        statute={stateRef.grievance.statute}
        summary={stateRef.grievance.summary}
        confidence={stateRef.grievance.confidence}
        note={stateRef.grievance.note}
      />

      {/* Designee */}
      <div className="flex items-center gap-3 flex-wrap text-sm">
        <span className="text-slate-500 dark:text-slate-400">
          Grievance designee: {designeeName
            ? <b className="text-slate-800 dark:text-slate-100">{designeeName}</b>
            : <span className="text-amber-700 dark:text-amber-400 font-medium">not set{canClose ? '' : ' (ask the Social Services Director)'}</span>}
          {rules?.response_days ? ` · written response within ${rules.response_days} days` : ''}
        </span>
        {canClose && (
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline">
            <Settings size={13} /> Grievance settings
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Open',     value: open,    color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/50'   },
          { label: 'Urgent',   value: urgent,  color: 'text-red-600 bg-red-50 dark:bg-red-950/50'     },
          { label: 'Response overdue', value: overdue, color: 'text-red-600 bg-red-50 dark:bg-red-950/50' },
          { label: 'Resolved', value: resolved, color: 'text-green-600 bg-green-50 dark:bg-green-950/50' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-2xl p-4`}>
            <div className={`text-3xl font-bold font-display ${s.color.split(' ')[0]}`}>{s.value}</div>
            <div className="text-xs font-medium text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {canWrite && (
          <button onClick={() => { setEditing(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors">
            <Plus size={16} /> File Grievance
          </button>
        )}
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={filter.priority} onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))}
          className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <select value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
          className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <button onClick={() => setShowLog(true)}
          className="flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
          <Printer size={14} /> Print grievance log
        </button>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} grievances</span>
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm py-16 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-brand-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm py-16 text-center text-slate-400">
          <AlertTriangle size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No grievances found</p>
          {canWrite && <p className="text-sm mt-1">Click "File Grievance" to log a new complaint</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(g => {
            const priority = getPriority(g.priority)
            const status   = getStatus(g.status)
            return (
              <button key={g.id} onClick={() => { setEditing(g); setShowModal(true) }}
                className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all p-4 text-left">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    g.priority === 'immediate' ? 'bg-red-500' :
                    g.priority === 'urgent'    ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs text-slate-400">{g.grievance_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priority.color}`}>{priority.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>{status.label}</span>
                      <DeadlineBadge g={g} />
                      {g.filed_late && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 font-medium">Filed late</span>}
                      {g.regulatory_report_required && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-medium border border-red-200 dark:border-red-900">Reg. Report</span>
                      )}
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                      {CATEGORIES.find(c => c.key === g.category)?.label || g.category}
                      {g.residents && ` · ${g.residents.first_name} ${g.residents.last_name}`}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{g.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      <span>Filed {formatDate(g.filed_at)}</span>
                      {g.filed && <span>by {g.filed.first_name} {g.filed.last_name}</span>}
                      {g.assigned && <span>· Assigned: {g.assigned.first_name} {g.assigned.last_name}</span>}
                    </div>
                  </div>
                  <ChevronDown size={14} className="text-slate-300 flex-shrink-0 -rotate-90" />
                </div>
              </button>
            )
          })}
        </div>
      )}

      {showModal && (
        <GrievanceModal
          residents={residents}
          staff={staff}
          orgId={organization.id}
          grievance={editing}
          canWrite={canWrite}
          rules={rules}
          letterInfo={letterInfo}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => { setShowModal(false); setEditing(null); fetchAll() }}
        />
      )}
      {showSettings && (
        <GrievanceSettingsModal orgId={organization.id} staff={staff} settings={settings} stateRef={stateRef}
          onClose={() => setShowSettings(false)}
          onSaved={() => { setShowSettings(false); fetchAll() }} />
      )}
      {showLog && (
        <PrintLogModal grievances={grievances} onClose={() => setShowLog(false)}
          onPrint={(rows, from, to) => {
            printGrievanceLog(rows, { orgName: organization?.name || '', from, to, categories: CATEGORIES, statuses: STATUSES,
              designee: designeeName, responseDays: rules?.response_days })
            setShowLog(false)
          }} />
      )}
    </div>
  )
}
