import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Plus, X, AlertTriangle, Search, Loader2, AlertCircle,
         ChevronDown, Check, Flag } from 'lucide-react'

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
  { key: 'routine',   label: 'Routine',   color: 'bg-slate-100 text-slate-600 border-slate-200'    },
  { key: 'urgent',    label: 'Urgent',    color: 'bg-amber-100 text-amber-700 border-amber-200'    },
  { key: 'immediate', label: 'Immediate', color: 'bg-red-100 text-red-700 border-red-200'          },
]

const STATUSES = [
  { key: 'open',             label: 'Open',             color: 'bg-blue-100 text-blue-700'     },
  { key: 'investigating',    label: 'Investigating',    color: 'bg-purple-100 text-purple-700' },
  { key: 'pending_response', label: 'Pending Response', color: 'bg-amber-100 text-amber-700'   },
  { key: 'resolved',         label: 'Resolved',         color: 'bg-green-100 text-green-700'   },
  { key: 'escalated',        label: 'Escalated',        color: 'bg-red-100 text-red-700'       },
  { key: 'withdrawn',        label: 'Withdrawn',        color: 'bg-slate-100 text-slate-500'   },
]

function getPriority(key) { return PRIORITIES.find(p => p.key === key) || PRIORITIES[0] }
function getStatus(key)   { return STATUSES.find(s => s.key === key)   || STATUSES[0]  }

function GrievanceModal({ residents, staff, orgId, grievance, canWrite, onClose, onSaved }) {
  const { profile } = useAuth()
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
  })
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
      updated_at:               _now.toISOString(),
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-display font-bold text-slate-800">
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
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Resident */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Resident (if applicable)</label>
              <select value={form.resident_id} onChange={e => set('resident_id', e.target.value)} disabled={readOnly}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white disabled:bg-slate-50">
                <option value="">— Not resident-specific —</option>
                {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name} (Rm {r.room})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Priority *</label>
              <div className="flex gap-2">
                {PRIORITIES.map(p => (
                  <button key={p.key} onClick={() => !readOnly && set('priority', p.key)} disabled={readOnly}
                    className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-all
                      ${form.priority === p.key ? p.color + ' border-current' : 'bg-white text-slate-400 border-slate-200'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Complainant */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Filed By</label>
            <div className="flex gap-2 mb-3 flex-wrap">
              {COMPLAINANT_TYPES.map(t => (
                <button key={t.key} onClick={() => !readOnly && set('complainant_type', t.key)} disabled={readOnly}
                  className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-all
                    ${form.complainant_type === t.key ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-500 border-slate-200'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            {form.complainant_type !== 'resident' && (
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <input value={form.complainant_name} onChange={e => set('complainant_name', e.target.value)} readOnly={readOnly}
                    placeholder="Complainant name"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <input value={form.complainant_phone} onChange={e => set('complainant_phone', e.target.value)} readOnly={readOnly}
                    placeholder="Phone"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <input value={form.complainant_relationship} onChange={e => set('complainant_relationship', e.target.value)} readOnly={readOnly}
                    placeholder="Relationship"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
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
                    ${form.category === cat.key ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-500 border-slate-200 hover:border-brand-300'}`}>
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
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none disabled:bg-slate-50" />
          </div>

          {/* Status & Assignment (edit mode) */}
          {!isNew && (
            <>
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                  <select value={form.status} onChange={e => set('status', e.target.value)} disabled={readOnly}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white disabled:bg-slate-50">
                    {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Assigned To</label>
                  <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} disabled={readOnly}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white disabled:bg-slate-50">
                    <option value="">— Unassigned —</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Investigation Notes</label>
                <textarea value={form.investigation_notes} onChange={e => set('investigation_notes', e.target.value)} readOnly={readOnly} rows={3}
                  placeholder="Running notes during investigation..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none disabled:bg-slate-50" />
              </div>

              {(form.status === 'resolved' || form.resolution) && (
                <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <label className="block text-xs font-semibold text-green-700 uppercase tracking-wider">Resolution</label>
                  <textarea value={form.resolution} onChange={e => set('resolution', e.target.value)} readOnly={readOnly} rows={3}
                    placeholder="Describe how the grievance was resolved..."
                    className="w-full px-3 py-2.5 border border-green-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-green-700">Resident/family satisfied with resolution?</span>
                    <div className="flex gap-2 ml-auto">
                      {[true, false].map(v => (
                        <button key={String(v)} onClick={() => !readOnly && set('resident_satisfied', v)} disabled={readOnly}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                            ${form.resident_satisfied === v
                              ? v ? 'bg-green-600 text-white border-green-600' : 'bg-red-500 text-white border-red-500'
                              : 'bg-white text-slate-500 border-slate-200'}`}>
                          {v ? 'Yes' : 'No'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Regulatory */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-2"><Flag size={14} className="text-red-500" /> Regulatory Report Required</span>
                  <button onClick={() => !readOnly && set('regulatory_report_required', !form.regulatory_report_required)} disabled={readOnly}
                    className={`w-11 h-6 rounded-full transition-colors relative ${form.regulatory_report_required ? 'bg-red-500' : 'bg-slate-300'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.regulatory_report_required ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
                {form.regulatory_report_required && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Report Date</label>
                      <input type="date" value={form.regulatory_report_date} onChange={e => set('regulatory_report_date', e.target.value)} disabled={readOnly}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Agency</label>
                      <input value={form.regulatory_agency} onChange={e => set('regulatory_agency', e.target.value)} readOnly={readOnly}
                        placeholder="e.g. MO DHSS"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">{readOnly ? 'Close' : 'Cancel'}</button>
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

export default function Grievances({ canWrite }) {
  const { organization } = useAuth()
  const [grievances, setGrievances] = useState([])
  const [residents,  setResidents]  = useState([])
  const [staff,      setStaff]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [filter,     setFilter]     = useState({ status: '', priority: '', category: '' })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: g }, { data: res }, { data: st }] = await Promise.all([
      supabase.from('ss_grievances')
        .select('*, residents(first_name, last_name, room), filed:filed_by(first_name, last_name), assigned:assigned_to(first_name, last_name)')
        .eq('organization_id', organization.id).eq('is_active', true)
        .order('filed_at', { ascending: false }),
      supabase.from('residents').select('id, first_name, last_name, room')
        .eq('organization_id', organization.id).eq('is_active', true).order('last_name'),
      supabase.from('profiles').select('id, first_name, last_name')
        .eq('organization_id', organization.id).eq('is_active', true)
        .in('role', ['social_services','supervisor','manager','org_admin','ceo'])
        .order('last_name')
    ])
    setGrievances(g || [])
    setResidents(res || [])
    setStaff(st || [])
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

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Open',     value: open,    color: 'text-blue-600 bg-blue-50'   },
          { label: 'Urgent',   value: urgent,  color: 'text-red-600 bg-red-50'     },
          { label: 'Resolved', value: resolved, color: 'text-green-600 bg-green-50' },
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
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={filter.priority} onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <select value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} grievances</span>
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-brand-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center text-slate-400">
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
                className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-4 text-left">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    g.priority === 'immediate' ? 'bg-red-500' :
                    g.priority === 'urgent'    ? 'bg-amber-500' : 'bg-slate-300'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs text-slate-400">{g.grievance_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priority.color}`}>{priority.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>{status.label}</span>
                      {g.regulatory_report_required && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium border border-red-200">Reg. Report</span>
                      )}
                    </div>
                    <p className="font-semibold text-slate-800 text-sm">
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
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => { setShowModal(false); setEditing(null); fetchAll() }}
        />
      )}
    </div>
  )
}
