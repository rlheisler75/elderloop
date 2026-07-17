import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Plus, X, BookOpen, Search, Loader2, AlertCircle, Check,
         Phone, Mail, Globe, MapPin, Send, ChevronDown, ExternalLink } from 'lucide-react'

const CATEGORIES = [
  { key: 'hospice',              label: 'Hospice' },
  { key: 'home_health',          label: 'Home Health' },
  { key: 'transportation',       label: 'Transportation' },
  { key: 'legal_aid',            label: 'Legal Aid' },
  { key: 'ombudsman',            label: 'Ombudsman' },
  { key: 'support_group',        label: 'Support Group' },
  { key: 'dme_supplier',         label: 'DME Supplier' },
  { key: 'mental_health',        label: 'Mental Health' },
  { key: 'medicaid_assistance',  label: 'Medicaid / Benefits Assistance' },
  { key: 'meal_delivery',        label: 'Meal Delivery' },
  { key: 'funeral_home',         label: 'Funeral Home' },
  { key: 'other',                label: 'Other' },
]

const REFERRAL_STATUSES = [
  { key: 'pending',    label: 'Pending',    color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' },
  { key: 'contacted',  label: 'Contacted',  color: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400' },
  { key: 'scheduled',  label: 'Scheduled',  color: 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400' },
  { key: 'completed',  label: 'Completed',  color: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400' },
  { key: 'declined',   label: 'Declined',   color: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400' },
]

const getCategory = (key) => CATEGORIES.find(c => c.key === key) || { label: key || 'Other' }
const getReferralStatus = (key) => REFERRAL_STATUSES.find(s => s.key === key) || REFERRAL_STATUSES[0]

const inputCls = 'w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 dark:text-slate-100'

// ── Resource Modal (add/edit a directory entry) ─────────────────────
function ResourceModal({ resource, orgId, canWrite, onClose, onSaved }) {
  const { profile } = useAuth()
  const isNew = !resource
  const [form, setForm] = useState({
    name:          resource?.name          || '',
    category:      resource?.category      || 'other',
    description:   resource?.description   || '',
    contact_name:  resource?.contact_name  || '',
    phone:         resource?.phone         || '',
    email:         resource?.email         || '',
    website:       resource?.website       || '',
    address:       resource?.address       || '',
    service_area:  resource?.service_area  || '',
    notes:         resource?.notes         || '',
    is_active:     resource?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const readOnly = !canWrite

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true); setError('')
    const payload = {
      ...form,
      organization_id: orgId,
      description:  form.description  || null,
      contact_name: form.contact_name || null,
      phone:        form.phone        || null,
      email:        form.email        || null,
      website:      form.website      || null,
      address:      form.address      || null,
      service_area: form.service_area || null,
      notes:        form.notes        || null,
      updated_at:   new Date().toISOString(),
    }
    let err
    if (isNew) {
      ({ error: err } = await supabase.from('ss_resources').insert({ ...payload, created_by: profile?.id }))
    } else {
      ({ error: err } = await supabase.from('ss_resources').update(payload).eq('id', resource.id))
    }
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <h2 className="font-display font-bold text-slate-800 dark:text-slate-100">{isNew ? 'Add Resource' : resource.name}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-400 text-sm">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} readOnly={readOnly}
              placeholder="e.g. Mercy Hospice of the Ozarks" className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map(c => (
                <button key={c.key} onClick={() => !readOnly && set('category', c.key)} disabled={readOnly}
                  className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all text-left
                    ${form.category === c.key ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-300'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} readOnly={readOnly} rows={2}
              placeholder="What this resource offers..." className={inputCls + ' resize-none'} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Contact Name</label>
              <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} readOnly={readOnly} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} readOnly={readOnly} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} readOnly={readOnly} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Website</label>
              <input value={form.website} onChange={e => set('website', e.target.value)} readOnly={readOnly}
                placeholder="https://..." className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Address</label>
            <input value={form.address} onChange={e => set('address', e.target.value)} readOnly={readOnly} className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Service Area</label>
            <input value={form.service_area} onChange={e => set('service_area', e.target.value)} readOnly={readOnly}
              placeholder="e.g. Greene County, 30-mile radius" className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Internal Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} readOnly={readOnly} rows={2}
              placeholder="Staff-only notes (e.g. 'ask for Sarah', 'accepts Medicaid')..." className={inputCls + ' resize-none'} />
          </div>

          {!isNew && (
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Active</span>
              <button onClick={() => !readOnly && set('is_active', !form.is_active)} disabled={readOnly}
                className={`w-11 h-6 rounded-full transition-colors relative ${form.is_active ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 font-medium">{readOnly ? 'Close' : 'Cancel'}</button>
          {!readOnly && (
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Saving...' : isNew ? 'Add Resource' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Referral Modal (log a referral to a resource for a resident) ────
function ReferralModal({ referral, prefillResourceId, residents, resources, orgId, canWrite, onClose, onSaved }) {
  const { profile } = useAuth()
  const isNew = !referral
  const [form, setForm] = useState({
    resident_id:            referral?.resident_id            || '',
    resource_id:            referral?.resource_id            || prefillResourceId || '',
    resource_name_freetext: referral?.resource_name_freetext || '',
    reason:                 referral?.reason                 || '',
    status:                 referral?.status                 || 'pending',
    outcome:                referral?.outcome                || '',
    follow_up_date:         referral?.follow_up_date         || '',
    notes:                  referral?.notes                  || '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [useCustom, setUseCustom] = useState(!referral?.resource_id && !!referral?.resource_name_freetext)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const readOnly = !canWrite

  const handleSave = async () => {
    if (!form.resident_id) { setError('Resident is required.'); return }
    if (!useCustom && !form.resource_id) { setError('Select a resource, or switch to "Not in directory".'); return }
    if (useCustom && !form.resource_name_freetext.trim()) { setError('Enter the resource/agency name.'); return }
    setSaving(true); setError('')
    const payload = {
      ...form,
      organization_id: orgId,
      resource_id:            useCustom ? null : form.resource_id,
      resource_name_freetext: useCustom ? form.resource_name_freetext.trim() : null,
      reason:                 form.reason         || null,
      outcome:                form.outcome        || null,
      follow_up_date:         form.follow_up_date || null,
      notes:                  form.notes          || null,
      updated_at: new Date().toISOString(),
    }
    let err
    if (isNew) {
      ({ error: err } = await supabase.from('ss_referrals').insert({ ...payload, referred_by: profile?.id }))
    } else {
      ({ error: err } = await supabase.from('ss_referrals').update(payload).eq('id', referral.id))
    }
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <h2 className="font-display font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Send size={16} className="text-brand-600" /> {isNew ? 'Log Referral' : 'Edit Referral'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-400 text-sm">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Resident *</label>
            <select value={form.resident_id} onChange={e => set('resident_id', e.target.value)} disabled={readOnly} className={inputCls}>
              <option value="">Select resident...</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name} (Rm {r.room})</option>)}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Resource *</label>
              {!readOnly && (
                <button onClick={() => setUseCustom(c => !c)} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                  {useCustom ? 'Pick from directory' : 'Not in directory'}
                </button>
              )}
            </div>
            {useCustom ? (
              <input value={form.resource_name_freetext} onChange={e => set('resource_name_freetext', e.target.value)} readOnly={readOnly}
                placeholder="Agency / resource name" className={inputCls} />
            ) : (
              <select value={form.resource_id} onChange={e => set('resource_id', e.target.value)} disabled={readOnly} className={inputCls}>
                <option value="">Select resource...</option>
                {resources.map(r => <option key={r.id} value={r.id}>{r.name} — {getCategory(r.category).label}</option>)}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Reason for Referral</label>
            <textarea value={form.reason} onChange={e => set('reason', e.target.value)} readOnly={readOnly} rows={2} className={inputCls + ' resize-none'} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} disabled={readOnly} className={inputCls}>
                {REFERRAL_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Follow-Up Date</label>
              <input type="date" value={form.follow_up_date} onChange={e => set('follow_up_date', e.target.value)} disabled={readOnly} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Outcome</label>
            <textarea value={form.outcome} onChange={e => set('outcome', e.target.value)} readOnly={readOnly} rows={2}
              placeholder="What happened after the referral..." className={inputCls + ' resize-none'} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} readOnly={readOnly} rows={2} className={inputCls + ' resize-none'} />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 font-medium">{readOnly ? 'Close' : 'Cancel'}</button>
          {!readOnly && (
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Saving...' : isNew ? 'Log Referral' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Resources Tab ────────────────────────────────────────────
export default function Resources({ canWrite }) {
  const { organization } = useAuth()
  const [view, setView] = useState('directory') // 'directory' | 'referrals'
  const [resources, setResources] = useState([])
  const [referrals, setReferrals] = useState([])
  const [residents, setResidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [referralStatusFilter, setReferralStatusFilter] = useState('')
  const [showResourceModal, setShowResourceModal] = useState(false)
  const [editingResource, setEditingResource] = useState(null)
  const [showReferralModal, setShowReferralModal] = useState(false)
  const [editingReferral, setEditingReferral] = useState(null)
  const [prefillResourceId, setPrefillResourceId] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: res }, { data: refs }, { data: residentsData }] = await Promise.all([
      supabase.from('ss_resources').select('*').eq('organization_id', organization.id).eq('is_active', true).order('name'),
      supabase.from('ss_referrals')
        .select('*, residents(first_name, last_name, room), resource:ss_resources(name, category)')
        .eq('organization_id', organization.id).order('referred_at', { ascending: false }),
      supabase.from('residents').select('id, first_name, last_name, room')
        .eq('organization_id', organization.id).eq('is_active', true).order('last_name'),
    ])
    setResources(res || [])
    setReferrals(refs || [])
    setResidents(residentsData || [])
    setLoading(false)
  }

  const filteredResources = resources.filter(r => {
    if (categoryFilter && r.category !== categoryFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return `${r.name} ${r.description} ${r.service_area}`.toLowerCase().includes(q)
  })

  const filteredReferrals = referrals.filter(r => {
    if (referralStatusFilter && r.status !== referralStatusFilter) return false
    return true
  })

  const openReferralForResource = (resourceId) => {
    setPrefillResourceId(resourceId)
    setEditingReferral(null)
    setShowReferralModal(true)
  }

  const formatDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''

  const openReferrals = referrals.filter(r => ['pending', 'contacted', 'scheduled'].includes(r.status)).length

  return (
    <div className="space-y-4">
      {/* Sub-view toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button onClick={() => setView('directory')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'directory' ? 'bg-white dark:bg-slate-900 text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            Directory ({resources.length})
          </button>
          <button onClick={() => setView('referrals')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'referrals' ? 'bg-white dark:bg-slate-900 text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            Referral Log {openReferrals > 0 && <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">{openReferrals} open</span>}
          </button>
        </div>
        <div className="ml-auto flex gap-2">
          {canWrite && view === 'referrals' && (
            <button onClick={() => { setPrefillResourceId(null); setEditingReferral(null); setShowReferralModal(true) }}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors">
              <Send size={15} /> Log Referral
            </button>
          )}
          {canWrite && view === 'directory' && (
            <button onClick={() => { setEditingResource(null); setShowResourceModal(true) }}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors">
              <Plus size={15} /> Add Resource
            </button>
          )}
        </div>
      </div>

      {view === 'directory' ? (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resources..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm py-16 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-brand-400" />
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm py-16 text-center text-slate-400">
              <BookOpen size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No resources found</p>
              {canWrite && <p className="text-sm mt-1">Click "Add Resource" to build your referral directory</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredResources.map(r => (
                <div key={r.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 flex flex-col">
                  <button onClick={() => { setEditingResource(r); setShowResourceModal(true) }} className="text-left flex-1">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400">
                      {getCategory(r.category).label}
                    </span>
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm mt-2">{r.name}</p>
                    {r.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.description}</p>}
                    <div className="mt-2 space-y-1 text-xs text-slate-400">
                      {r.phone && <div className="flex items-center gap-1.5"><Phone size={11} /> {r.phone}</div>}
                      {r.email && <div className="flex items-center gap-1.5"><Mail size={11} /> {r.email}</div>}
                      {r.service_area && <div className="flex items-center gap-1.5"><MapPin size={11} /> {r.service_area}</div>}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    {r.website && (
                      <a href={r.website} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <ExternalLink size={13} />
                      </a>
                    )}
                    {canWrite && (
                      <button onClick={() => openReferralForResource(r.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 rounded-lg transition-colors">
                        <Send size={12} /> Log Referral
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Referral filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <select value={referralStatusFilter} onChange={e => setReferralStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">All Statuses</option>
              {REFERRAL_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <span className="text-xs text-slate-400 ml-auto">{filteredReferrals.length} referrals</span>
          </div>

          {loading ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm py-16 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-brand-400" />
            </div>
          ) : filteredReferrals.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm py-16 text-center text-slate-400">
              <Send size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No referrals logged yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredReferrals.map(r => {
                const status = getReferralStatus(r.status)
                const name = r.resource?.name || r.resource_name_freetext || 'Unknown resource'
                return (
                  <button key={r.id} onClick={() => { setEditingReferral(r); setPrefillResourceId(null); setShowReferralModal(true) }}
                    className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all p-4 text-left">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>{status.label}</span>
                          {r.follow_up_date && <span className="text-xs text-slate-400">Follow-up {formatDate(r.follow_up_date)}</span>}
                        </div>
                        <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                          {name}
                          {r.residents && ` · ${r.residents.first_name} ${r.residents.last_name}`}
                        </p>
                        {r.reason && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{r.reason}</p>}
                        <div className="text-xs text-slate-400 mt-1">Referred {formatDate(r.referred_at)}</div>
                      </div>
                      <ChevronDown size={14} className="text-slate-300 flex-shrink-0 -rotate-90 mt-1" />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {showResourceModal && (
        <ResourceModal
          resource={editingResource}
          orgId={organization.id}
          canWrite={canWrite}
          onClose={() => { setShowResourceModal(false); setEditingResource(null) }}
          onSaved={() => { setShowResourceModal(false); setEditingResource(null); fetchAll() }}
        />
      )}

      {showReferralModal && (
        <ReferralModal
          referral={editingReferral}
          prefillResourceId={prefillResourceId}
          residents={residents}
          resources={resources}
          orgId={organization.id}
          canWrite={canWrite}
          onClose={() => { setShowReferralModal(false); setEditingReferral(null); setPrefillResourceId(null) }}
          onSaved={() => { setShowReferralModal(false); setEditingReferral(null); setPrefillResourceId(null); fetchAll() }}
        />
      )}
    </div>
  )
}
