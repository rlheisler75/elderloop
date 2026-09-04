import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { Search, Edit2, Trash2, Clock, Zap } from 'lucide-react'
import { Badge, Modal, Field, inputCls, selectCls } from '../ui'
import {
  LEAD_STATUSES, INQUIRY_TYPES, CARE_LEVELS, UNIT_TYPES, ACTIVITY_TYPES,
  fmt, fmtDate, getLeadStatus,
} from '../constants'

// ── Lead Form ─────────────────────────────────────────────────

export function LeadForm({ lead, sources, staff, units = [], onSave, onClose }) {
  const { profile } = useAuth()
  // lead (when editing) comes from a select with joined relations aliased as
  // referral_source/assigned/interested_unit — those aren't real leads columns,
  // so they must be stripped before the row round-trips into an update payload
  // (PostgREST 400s on unknown columns otherwise, and this form ate the error silently).
  const { referral_source: _referralSource, assigned: _assigned, interested_unit: _interestedUnit, ...leadColumns } = lead || {}
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    city: '', state: '', zip: '',
    inquiry_type: 'parent',
    prospect_first_name: '', prospect_last_name: '',
    care_level_interest: [],
    interested_unit_type: '',
    interested_unit_id: '',
    status: 'new',
    referral_source_id: '',
    source_detail: '',
    inquiry_date: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })(),
    budget_min: '', budget_max: '',
    assigned_to: '',
    notes: '',
    ...leadColumns,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleCareLevel = (lvl) => set('care_level_interest',
    form.care_level_interest.includes(lvl)
      ? form.care_level_interest.filter(x => x !== lvl)
      : [...form.care_level_interest, lvl]
  )

  const handleSave = async () => {
    if (!form.first_name || !form.last_name) return
    setSaving(true)
    setError('')
    const payload = {
      ...form,
      budget_min: form.budget_min || null,
      budget_max: form.budget_max || null,
      referral_source_id: form.referral_source_id || null,
      assigned_to: form.assigned_to || null,
      interested_unit_id: form.interested_unit_id || null,
      created_by: profile?.id,
    }
    const { error: err } = lead?.id
      ? await supabase.from('leads').update(payload).eq('id', lead.id)
      : await supabase.from('leads').insert(payload)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSave()
  }

  return (
    <>
      {error && <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-400 text-sm">{error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <Field label="First Name" required>
          <input className={inputCls} value={form.first_name} onChange={e=>set('first_name',e.target.value)} placeholder="Jane" />
        </Field>
        <Field label="Last Name" required>
          <input className={inputCls} value={form.last_name} onChange={e=>set('last_name',e.target.value)} placeholder="Smith" />
        </Field>
        <Field label="Email">
          <input className={inputCls} type="email" value={form.email} onChange={e=>set('email',e.target.value)} />
        </Field>
        <Field label="Phone">
          <input className={inputCls} value={form.phone} onChange={e=>set('phone',e.target.value)} />
        </Field>
        <Field label="Inquiry Type">
          <select className={selectCls} value={form.inquiry_type} onChange={e=>set('inquiry_type',e.target.value)}>
            {INQUIRY_TYPES.map(t => <option key={t} value={t}>{fmt(t)}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className={selectCls} value={form.status} onChange={e=>set('status',e.target.value)}>
            {LEAD_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </Field>
        {form.inquiry_type !== 'self' && <>
          <Field label="Prospect First Name">
            <input className={inputCls} value={form.prospect_first_name} onChange={e=>set('prospect_first_name',e.target.value)} />
          </Field>
          <Field label="Prospect Last Name">
            <input className={inputCls} value={form.prospect_last_name} onChange={e=>set('prospect_last_name',e.target.value)} />
          </Field>
        </>}
        <Field label="City">
          <input className={inputCls} value={form.city} onChange={e=>set('city',e.target.value)} />
        </Field>
        <Field label="State">
          <input className={inputCls} value={form.state} onChange={e=>set('state',e.target.value)} placeholder="MO" />
        </Field>
        <Field label="Budget Min">
          <input className={inputCls} type="number" value={form.budget_min} onChange={e=>set('budget_min',e.target.value)} placeholder="$0" />
        </Field>
        <Field label="Budget Max">
          <input className={inputCls} type="number" value={form.budget_max} onChange={e=>set('budget_max',e.target.value)} />
        </Field>
        <Field label="Referral Source">
          <select className={selectCls} value={form.referral_source_id} onChange={e=>set('referral_source_id',e.target.value)}>
            <option value="">— Select source —</option>
            {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Source Detail">
          <input className={inputCls} value={form.source_detail} onChange={e=>set('source_detail',e.target.value)} placeholder="e.g. Dr. Johnson's referral" />
        </Field>
        <Field label="Assigned To">
          <select className={selectCls} value={form.assigned_to} onChange={e=>set('assigned_to',e.target.value)}>
            <option value="">— Unassigned —</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
          </select>
        </Field>
        <Field label="Inquiry Date">
          <input className={inputCls} type="date" value={form.inquiry_date} onChange={e=>set('inquiry_date',e.target.value)} />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Care Level Interest">
          <div className="flex flex-wrap gap-2 mt-1">
            {CARE_LEVELS.map(lvl => (
              <button key={lvl} type="button"
                onClick={() => toggleCareLevel(lvl)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  form.care_level_interest.includes(lvl)
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-300'
                }`}>
                {fmt(lvl)}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Field label="Unit Type Interest">
          <select className={selectCls} value={form.interested_unit_type} onChange={e=>set('interested_unit_type',e.target.value)}>
            <option value="">— Any —</option>
            {UNIT_TYPES.map(t => <option key={t} value={t}>{fmt(t)}</option>)}
          </select>
        </Field>
        {units.length > 0 && (
          <Field label="Interested In Specific Unit">
            <select className={selectCls} value={form.interested_unit_id || ''} onChange={e=>set('interested_unit_id',e.target.value)}>
              <option value="">— None —</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>
                  {u.unit_number}{u.building ? ` — ${u.building}` : ''} ({fmt(u.status)})
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>

      <div className="mt-4">
        <Field label="Notes">
          <textarea className={inputCls} rows={3} value={form.notes} onChange={e=>set('notes',e.target.value)} />
        </Field>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
        <button onClick={handleSave} disabled={saving || !form.first_name}
          className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : lead?.id ? 'Save Changes' : 'Add Lead'}
        </button>
      </div>
    </>
  )
}

// ── Activity Log Modal ────────────────────────────────────────

export function ActivityModal({ lead, onClose }) {
  const { profile } = useAuth()
  const [activities, setActivities] = useState([])
  const [form, setForm] = useState({
    activity_type: 'call', subject: '', body: '', outcome: '',
    mode: 'completed', when: new Date().toISOString().slice(0,16),
  })
  const [saving, setSaving] = useState(false)

  const refetch = () =>
    supabase.from('lead_activities').select('*, performed_by:profiles(first_name,last_name)')
      .eq('lead_id', lead.id).order('created_at', { ascending: false })
      .then(({ data }) => setActivities(data || []))

  useEffect(() => { refetch() }, [lead.id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const addActivity = async () => {
    setSaving(true)
    const { activity_type, subject, body, outcome, mode, when } = form
    await supabase.from('lead_activities').insert({
      activity_type, subject, body, outcome,
      lead_id: lead.id,
      organization_id: lead.organization_id,
      performed_by: profile?.id,
      completed_at: mode === 'completed' ? (when || null) : null,
      scheduled_at: mode === 'scheduled' ? (when || null) : null,
    })
    await refetch()
    setForm({ activity_type: 'call', subject: '', body: '', outcome: '', mode: 'completed', when: new Date().toISOString().slice(0,16) })
    setSaving(false)
  }

  const markDone = async (id) => {
    await supabase.from('lead_activities').update({ completed_at: new Date().toISOString() }).eq('id', id)
    refetch()
  }

  return (
    <Modal title={`Activity — ${lead.first_name} ${lead.last_name}`} onClose={onClose} wide>
      <div className="flex gap-1 mb-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
        {[{ key: 'completed', label: 'Log Completed Activity' }, { key: 'scheduled', label: 'Schedule Follow-Up' }].map(m => (
          <button key={m.key} type="button" onClick={() => set('mode', m.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${form.mode === m.key ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Field label="Type">
          <select className={selectCls} value={form.activity_type} onChange={e=>set('activity_type',e.target.value)}>
            {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{fmt(t)}</option>)}
          </select>
        </Field>
        <Field label={form.mode === 'scheduled' ? 'Follow-Up Date/Time' : 'Date/Time'}>
          <input className={inputCls} type="datetime-local" value={form.when} onChange={e=>set('when',e.target.value)} />
        </Field>
        <div className="col-span-2">
          <Field label="Subject">
            <input className={inputCls} value={form.subject} onChange={e=>set('subject',e.target.value)} placeholder="Brief summary…" />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Notes">
            <textarea className={inputCls} rows={2} value={form.body} onChange={e=>set('body',e.target.value)} />
          </Field>
        </div>
        {form.mode === 'completed' && (
          <Field label="Outcome">
            <input className={inputCls} value={form.outcome} onChange={e=>set('outcome',e.target.value)} placeholder="Left voicemail, call back Friday" />
          </Field>
        )}
      </div>
      <button onClick={addActivity} disabled={saving}
        className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors mb-6 disabled:opacity-50">
        {saving ? 'Saving…' : form.mode === 'scheduled' ? '+ Schedule Follow-Up' : '+ Log Activity'}
      </button>

      <div className="space-y-3">
        {activities.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No activity logged yet.</p>}
        {activities.map(a => {
          const isPendingFollowUp = !a.completed_at && a.scheduled_at
          return (
            <div key={a.id} className={`p-3 rounded-xl border ${isPendingFollowUp ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${isPendingFollowUp ? 'text-amber-700 dark:text-amber-400' : 'text-brand-600'}`}>{fmt(a.activity_type)}</span>
                <span className="text-xs text-slate-400">
                  {isPendingFollowUp
                    ? `Scheduled ${new Date(a.scheduled_at).toLocaleString()}`
                    : a.completed_at ? new Date(a.completed_at).toLocaleString() : '—'}
                </span>
              </div>
              {a.subject && <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{a.subject}</p>}
              {a.body    && <p className="text-sm text-slate-500 mt-0.5">{a.body}</p>}
              {a.outcome && <p className="text-xs text-slate-400 mt-1 italic">{a.outcome}</p>}
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-slate-400">
                  By {a.performed_by?.first_name} {a.performed_by?.last_name}
                </p>
                {isPendingFollowUp && (
                  <button onClick={() => markDone(a.id)}
                    className="text-xs px-2 py-0.5 rounded-full border font-medium text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900 bg-amber-100/50 dark:bg-amber-950/50 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors">
                    Mark Done
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

// ── Pipeline Tab ──────────────────────────────────────────────

export default function PipelineTab({ leads, loading, onEditLead, onLogActivity, onEnroll, onDeleted }) {
  const [leadSearch, setLeadSearch] = useState('')
  const [leadStatusFilter, setLeadStatusFilter] = useState('all')

  const filteredLeads = leads.filter(l => {
    const q = leadSearch.toLowerCase()
    const match = !q || `${l.first_name} ${l.last_name} ${l.email} ${l.phone} ${l.prospect_first_name} ${l.prospect_last_name}`.toLowerCase().includes(q)
    const status = leadStatusFilter === 'all' || l.status === leadStatusFilter
    return match && status
  })

  const deleteLead = async (id) => {
    if (!confirm('Delete this lead?')) return
    await supabase.from('leads').delete().eq('id', id)
    onDeleted()
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Search leads…" value={leadSearch} onChange={e=>setLeadSearch(e.target.value)} />
        </div>
        <select className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          value={leadStatusFilter} onChange={e=>setLeadStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          {LEAD_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="text-center py-20">
          <Search size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-400 font-medium">No leads found</p>
          <p className="text-slate-300 text-sm mt-1">Add your first lead to start the pipeline</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                <th className="text-left px-4 py-3 font-medium text-slate-500">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 hidden md:table-cell">For</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 hidden lg:table-cell">Care Interest</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 hidden lg:table-cell">Source</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 hidden xl:table-cell">Assigned</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 hidden lg:table-cell">Inquiry Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map(lead => {
                const st = getLeadStatus(lead.status)
                return (
                  <tr key={lead.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 dark:text-slate-100">{lead.first_name} {lead.last_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {lead.email && <span className="text-xs text-slate-400">{lead.email}</span>}
                        {lead.phone && <span className="text-xs text-slate-400">{lead.phone}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {lead.inquiry_type !== 'self' && (lead.prospect_first_name || lead.prospect_last_name)
                        ? <span className="text-sm text-slate-600 dark:text-slate-300">{lead.prospect_first_name} {lead.prospect_last_name}</span>
                        : <span className="text-xs text-slate-400">Self</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(lead.care_level_interest || []).map(c => (
                          <span key={c} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">{fmt(c)}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={st.color}>{st.label}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-slate-500 text-xs">
                      {lead.referral_source?.name || '—'}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-slate-500 text-xs">
                      {lead.assigned ? `${lead.assigned.first_name} ${lead.assigned.last_name}` : '—'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-slate-400 text-xs">{fmtDate(lead.inquiry_date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => onLogActivity(lead)}
                          className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors text-slate-400" title="Log Activity">
                          <Clock size={14} />
                        </button>
                        <button onClick={() => onEnroll(lead)}
                          className="p-1.5 hover:bg-brand-50 hover:text-brand-600 rounded-lg transition-colors text-slate-400" title="Nurture Sequences">
                          <Zap size={14} />
                        </button>
                        <button onClick={() => onEditLead(lead)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => deleteLead(lead.id)}
                          className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-slate-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
