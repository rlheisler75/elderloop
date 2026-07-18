import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Plus, X, LogOut, Search, Loader2, AlertCircle, Check,
         Home, Building2, ChevronDown, ShieldCheck, CalendarClock } from 'lucide-react'

const STATUSES = [
  { key: 'planning',  label: 'Planning',  light: 'bg-slate-100 text-slate-600',       dark: 'dark:bg-slate-800 dark:text-slate-300' },
  { key: 'ready',     label: 'Ready',     light: 'bg-amber-100 text-amber-700',       dark: 'dark:bg-amber-950/50 dark:text-amber-400' },
  { key: 'discharged',label: 'Discharged',light: 'bg-emerald-100 text-emerald-700',   dark: 'dark:bg-emerald-950/50 dark:text-emerald-400' },
  { key: 'cancelled', label: 'Cancelled', light: 'bg-slate-100 text-slate-400',       dark: 'dark:bg-slate-800 dark:text-slate-500' },
]

const DESTINATIONS = [
  { key: 'home_no_services',   label: 'Home (no services)' },
  { key: 'home_with_hha',      label: 'Home Health' },
  { key: 'assisted_living',    label: 'Assisted Living' },
  { key: 'another_snf',        label: 'Another SNF' },
  { key: 'hospital',           label: 'Hospital' },
  { key: 'hospice',            label: 'Hospice' },
  { key: 'deceased',           label: 'Deceased' },
  { key: 'other',              label: 'Other' },
]

const POST_ACUTE_NEEDS = [
  'Home health nursing', 'Physical therapy', 'Occupational therapy', 'DME / equipment',
  'Transportation', 'Meal delivery', 'Medication management', 'Follow-up MD appointment',
  'Family caregiver training', 'Hospice services',
]

const getStatus = (key) => STATUSES.find(s => s.key === key) || STATUSES[0]
const getDestination = (key) => DESTINATIONS.find(d => d.key === key)
const inputCls = 'w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 dark:text-slate-100'

function DischargeModal({ plan, residents, orgId, canWrite, onClose, onSaved }) {
  const { profile } = useAuth()
  const isNew = !plan
  const [form, setForm] = useState({
    resident_id:                   plan?.resident_id                   || '',
    status:                          plan?.status                          || 'planning',
    anticipated_discharge_date:     plan?.anticipated_discharge_date     || '',
    actual_discharge_date:          plan?.actual_discharge_date          || '',
    discharge_destination:          plan?.discharge_destination          || '',
    discharge_destination_details:  plan?.discharge_destination_details  || '',
    post_acute_needs:               plan?.post_acute_needs               || [],
    barriers:                        plan?.barriers                        || '',
    family_involvement:             plan?.family_involvement             || '',
    resources_arranged:             plan?.resources_arranged             || '',
    discharge_summary:              plan?.discharge_summary              || '',
    documented_in_emr:              plan?.documented_in_emr              || false,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const readOnly = !canWrite

  const toggleNeed = (need) => {
    if (readOnly) return
    setForm(f => ({
      ...f,
      post_acute_needs: f.post_acute_needs.includes(need)
        ? f.post_acute_needs.filter(n => n !== need)
        : [...f.post_acute_needs, need],
    }))
  }

  const handleSave = async () => {
    if (!form.resident_id) { setError('Resident is required.'); return }
    setSaving(true); setError('')
    const payload = {
      ...form,
      organization_id: orgId,
      anticipated_discharge_date:    form.anticipated_discharge_date    || null,
      actual_discharge_date:         form.status === 'discharged' ? (form.actual_discharge_date || null) : null,
      discharge_destination:         form.discharge_destination         || null,
      discharge_destination_details: form.discharge_destination_details || null,
      barriers:                      form.barriers                      || null,
      family_involvement:            form.family_involvement            || null,
      resources_arranged:            form.resources_arranged            || null,
      discharge_summary:             form.discharge_summary             || null,
      planned_by: profile?.id,
      updated_at: new Date().toISOString(),
    }
    let err
    if (isNew) {
      ({ error: err } = await supabase.from('ss_discharge_plans').insert({ ...payload, created_by: profile?.id }))
    } else {
      ({ error: err } = await supabase.from('ss_discharge_plans').update(payload).eq('id', plan.id))
    }
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <h2 className="font-display font-bold text-slate-800 dark:text-slate-100">{isNew ? 'New Discharge Plan' : 'Discharge Plan'}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-400 text-sm">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Resident *</label>
              <select value={form.resident_id} onChange={e => set('resident_id', e.target.value)} disabled={readOnly} className={inputCls}>
                <option value="">Select resident...</option>
                {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name} (Rm {r.room})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} disabled={readOnly} className={inputCls}>
                {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Anticipated Discharge Date</label>
              <input type="date" value={form.anticipated_discharge_date} onChange={e => set('anticipated_discharge_date', e.target.value)} disabled={readOnly} className={inputCls} />
            </div>
            {form.status === 'discharged' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Actual Discharge Date</label>
                <input type="date" value={form.actual_discharge_date} onChange={e => set('actual_discharge_date', e.target.value)} disabled={readOnly} className={inputCls} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Discharge Destination</label>
              <select value={form.discharge_destination} onChange={e => set('discharge_destination', e.target.value)} disabled={readOnly} className={inputCls}>
                <option value="">Select destination...</option>
                {DESTINATIONS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Details</label>
              <input type="text" value={form.discharge_destination_details} onChange={e => set('discharge_destination_details', e.target.value)} readOnly={readOnly}
                placeholder="Facility name, address, etc." className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Post-Acute Needs</label>
            <div className="flex flex-wrap gap-2">
              {POST_ACUTE_NEEDS.map(need => (
                <button key={need} onClick={() => toggleNeed(need)} disabled={readOnly}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all
                    ${form.post_acute_needs.includes(need) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
                  {need}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Resources Arranged</label>
            <textarea value={form.resources_arranged} onChange={e => set('resources_arranged', e.target.value)} readOnly={readOnly} rows={2}
              placeholder="Equipment ordered, agencies contacted, appointments scheduled..." className={inputCls + ' resize-none'} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Family Involvement</label>
            <textarea value={form.family_involvement} onChange={e => set('family_involvement', e.target.value)} readOnly={readOnly} rows={2}
              placeholder="Who is involved, their role in the plan..." className={inputCls + ' resize-none'} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Barriers</label>
            <textarea value={form.barriers} onChange={e => set('barriers', e.target.value)} readOnly={readOnly} rows={2}
              placeholder="Financial, housing, caregiver availability, etc." className={inputCls + ' resize-none'} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Discharge Summary</label>
            <textarea value={form.discharge_summary} onChange={e => set('discharge_summary', e.target.value)} readOnly={readOnly} rows={3}
              placeholder="Final summary of the discharge plan and outcome..." className={inputCls + ' resize-none'} />
          </div>

          <div className="flex items-start gap-2.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <button onClick={() => !readOnly && set('documented_in_emr', !form.documented_in_emr)} disabled={readOnly}
              className={`mt-0.5 w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${form.documented_in_emr ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.documented_in_emr ? 'translate-x-5' : ''}`} />
            </button>
            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><ShieldCheck size={13} className="text-slate-400" /> Also documented in EMR</div>
              <div className="text-xs text-slate-400 mt-0.5">Flag if the formal discharge summary is also charted in PointClickCare / MatrixCare.</div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 font-medium">{readOnly ? 'Close' : 'Cancel'}</button>
          {!readOnly && (
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Saving...' : isNew ? 'Create Plan' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DischargePlanning({ canWrite }) {
  const { organization } = useAuth()
  const [plans, setPlans] = useState([])
  const [residents, setResidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: p }, { data: res }] = await Promise.all([
      supabase.from('ss_discharge_plans')
        .select('*, residents(first_name, last_name, room)')
        .eq('organization_id', organization.id)
        .order('anticipated_discharge_date', { ascending: true, nullsFirst: false }),
      supabase.from('residents').select('id, first_name, last_name, room')
        .eq('organization_id', organization.id).eq('is_active', true).order('last_name'),
    ])
    setPlans(p || [])
    setResidents(res || [])
    setLoading(false)
  }

  const filtered = plans.filter(p => {
    if (statusFilter && p.status !== statusFilter) return false
    if (!search) return true
    const name = p.residents ? `${p.residents.first_name} ${p.residents.last_name}` : ''
    return name.toLowerCase().includes(search.toLowerCase())
  })

  const formatDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
  const active = plans.filter(p => ['planning', 'ready'].includes(p.status)).length
  const upcoming = plans.filter(p => {
    if (!['planning', 'ready'].includes(p.status) || !p.anticipated_discharge_date) return false
    const days = (new Date(p.anticipated_discharge_date) - new Date()) / (1000 * 60 * 60 * 24)
    return days >= 0 && days <= 14
  }).length
  const discharged = plans.filter(p => p.status === 'discharged').length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active Plans',       value: active,     color: 'text-brand-600 bg-brand-50 dark:bg-brand-950/40' },
          { label: 'Due Within 14 Days', value: upcoming,   color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50' },
          { label: 'Discharged',         value: discharged, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-2xl p-4`}>
            <div className={`text-3xl font-bold font-display ${s.color.split(' ')[0]}`}>{s.value}</div>
            <div className="text-xs font-medium text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {canWrite && (
          <button onClick={() => { setEditing(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors">
            <Plus size={16} /> New Discharge Plan
          </button>
        )}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resident..."
            className="pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 w-48" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} plans</span>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm py-16 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-brand-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm py-16 text-center text-slate-400">
          <LogOut size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No discharge plans found</p>
          {canWrite && <p className="text-sm mt-1">Click "New Discharge Plan" to start planning a resident's discharge</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const status = getStatus(p.status)
            const dest = getDestination(p.discharge_destination)
            return (
              <button key={p.id} onClick={() => { setEditing(p); setShowModal(true) }}
                className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all p-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <Home size={14} className="text-slate-500 dark:text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                        {p.residents ? `${p.residents.first_name} ${p.residents.last_name}` : 'Unknown resident'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.light} ${status.dark}`}>{status.label}</span>
                      {dest && <span className="text-xs text-slate-400 flex items-center gap-1"><Building2 size={10} /> {dest.label}</span>}
                      {p.documented_in_emr && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1"><ShieldCheck size={10} /> In EMR</span>
                      )}
                    </div>
                    {p.discharge_summary && <p className="text-xs text-slate-500 line-clamp-1">{p.discharge_summary}</p>}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><CalendarClock size={11} />
                        {p.status === 'discharged' ? `Discharged ${formatDate(p.actual_discharge_date)}` : `Anticipated ${formatDate(p.anticipated_discharge_date)}`}
                      </span>
                      {p.post_acute_needs?.length > 0 && <span>{p.post_acute_needs.length} post-acute need{p.post_acute_needs.length !== 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  <ChevronDown size={14} className="text-slate-300 flex-shrink-0 -rotate-90 mt-1" />
                </div>
              </button>
            )
          })}
        </div>
      )}

      {showModal && (
        <DischargeModal
          plan={editing}
          residents={residents}
          orgId={organization.id}
          canWrite={canWrite}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => { setShowModal(false); setEditing(null); fetchAll() }}
        />
      )}
    </div>
  )
}
