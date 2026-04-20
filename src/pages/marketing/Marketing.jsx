import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, X, Edit2, Trash2, Search, ChevronDown, ChevronRight,
  Users, Megaphone, TrendingUp, Phone, Mail, Calendar, MapPin,
  Star, Target, DollarSign, Eye, CheckCircle, XCircle, Clock,
  BarChart2, Filter, MoreHorizontal, Tag, ArrowRight, UserPlus,
  Pause, Play, Archive, AlertCircle, RefreshCw
} from 'lucide-react'

// ── Constants ────────────────────────────────────────────────

const LEAD_STATUSES = [
  { key: 'new',             label: 'New',             color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { key: 'contacted',       label: 'Contacted',       color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { key: 'tour_scheduled',  label: 'Tour Scheduled',  color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { key: 'tour_completed',  label: 'Tour Completed',  color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { key: 'application',     label: 'Application',     color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { key: 'deposit_paid',    label: 'Deposit Paid',    color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { key: 'waitlisted',      label: 'Waitlisted',      color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { key: 'move_in',         label: 'Moved In',        color: 'bg-green-100 text-green-700 border-green-200' },
  { key: 'lost',            label: 'Lost',            color: 'bg-red-100 text-red-700 border-red-200' },
  { key: 'disqualified',    label: 'Disqualified',    color: 'bg-slate-100 text-slate-500 border-slate-200' },
]

const CAMPAIGN_STATUSES = [
  { key: 'draft',     label: 'Draft',     color: 'bg-slate-100 text-slate-600 border-slate-200',   icon: Edit2 },
  { key: 'active',    label: 'Active',    color: 'bg-green-100 text-green-700 border-green-200',   icon: Play },
  { key: 'paused',    label: 'Paused',    color: 'bg-amber-100 text-amber-700 border-amber-200',   icon: Pause },
  { key: 'completed', label: 'Completed', color: 'bg-blue-100 text-blue-700 border-blue-200',      icon: CheckCircle },
  { key: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-500 border-red-200',         icon: XCircle },
]

const CAMPAIGN_TYPES = [
  'email','direct_mail','event','digital','social_media','print','radio','tv','referral_program','open_house','other','general'
]

const INQUIRY_TYPES = ['self','spouse','parent','sibling','other_family','friend','professional_referral']
const LOST_REASONS  = ['chose_competitor','cost','health_change','deceased','not_ready','no_availability','other']
const CARE_LEVELS   = ['independent','assisted','memory_care','skilled_nursing','rehab']
const UNIT_TYPES    = ['studio','one_bedroom','two_bedroom','cottage','house','other']
const ACTIVITY_TYPES = ['call','email','text','tour','application','note','status_change','campaign_touch','follow_up','voicemail','visit','other']
const SOURCE_CATEGORIES = ['hospital','physician','home_health','hospice','family','resident','web','social_media','print_ad','event','direct_mail','senior_advisor','broker','other']

const fmt = (s) => s?.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) || '—'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'
const fmtMoney = (n) => n != null ? `$${Number(n).toLocaleString()}` : '—'

const getLeadStatus  = (key) => LEAD_STATUSES.find(s => s.key === key)     || LEAD_STATUSES[0]
const getCampStatus  = (key) => CAMPAIGN_STATUSES.find(s => s.key === key) || CAMPAIGN_STATUSES[0]

// ── Sub-components ────────────────────────────────────────────

function Badge({ color, children }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {children}
    </span>
  )
}

function StatCard({ icon: Icon, label, value, sub, color = 'text-brand-600' }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
        <Icon size={16} className={color} />
      </div>
      <div className="text-2xl font-bold text-slate-800" style={{ fontFamily: '"Playfair Display", serif' }}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  )
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800" style={{ fontFamily: '"Playfair Display", serif' }}>{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'
const selectCls = inputCls

// ── Lead Form ─────────────────────────────────────────────────

function LeadForm({ lead, sources, staff, onSave, onClose }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    city: '', state: '', zip: '',
    inquiry_type: 'parent',
    prospect_first_name: '', prospect_last_name: '',
    care_level_interest: [],
    interested_unit_type: '',
    status: 'new',
    referral_source_id: '',
    source_detail: '',
    inquiry_date: new Date().toISOString().slice(0,10),
    budget_min: '', budget_max: '',
    assigned_to: '',
    notes: '',
    ...lead,
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleCareLevel = (lvl) => set('care_level_interest',
    form.care_level_interest.includes(lvl)
      ? form.care_level_interest.filter(x => x !== lvl)
      : [...form.care_level_interest, lvl]
  )

  const handleSave = async () => {
    if (!form.first_name || !form.last_name) return
    setSaving(true)
    const payload = {
      ...form,
      budget_min: form.budget_min || null,
      budget_max: form.budget_max || null,
      referral_source_id: form.referral_source_id || null,
      assigned_to: form.assigned_to || null,
      created_by: profile?.id,
    }
    const { error } = lead?.id
      ? await supabase.from('leads').update(payload).eq('id', lead.id)
      : await supabase.from('leads').insert(payload)
    setSaving(false)
    if (!error) onSave()
  }

  return (
    <>
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
                    : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
                }`}>
                {fmt(lvl)}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Unit Type Interest">
          <select className={selectCls} value={form.interested_unit_type} onChange={e=>set('interested_unit_type',e.target.value)}>
            <option value="">— Any —</option>
            {UNIT_TYPES.map(t => <option key={t} value={t}>{fmt(t)}</option>)}
          </select>
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Notes">
          <textarea className={inputCls} rows={3} value={form.notes} onChange={e=>set('notes',e.target.value)} />
        </Field>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
        <button onClick={handleSave} disabled={saving || !form.first_name}
          className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : lead?.id ? 'Save Changes' : 'Add Lead'}
        </button>
      </div>
    </>
  )
}

// ── Campaign Form ─────────────────────────────────────────────

function CampaignForm({ campaign, onSave, onClose }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    name: '', description: '', campaign_type: 'general',
    status: 'draft', start_date: '', end_date: '',
    budget: '', actual_spend: '',
    goal_leads: '', goal_tours: '', goal_move_ins: '',
    target_care_levels: [], target_geography: '', target_audience: '',
    headline: '', body_copy: '', call_to_action: '', landing_url: '',
    promo_code: '',
    ...campaign,
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleCareLevel = (lvl) => set('target_care_levels',
    form.target_care_levels.includes(lvl)
      ? form.target_care_levels.filter(x => x !== lvl)
      : [...form.target_care_levels, lvl]
  )

  const handleSave = async () => {
    if (!form.name) return
    setSaving(true)
    const payload = {
      ...form,
      budget: form.budget || null,
      actual_spend: form.actual_spend || null,
      goal_leads: form.goal_leads || null,
      goal_tours: form.goal_tours || null,
      goal_move_ins: form.goal_move_ins || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      promo_code: form.promo_code || null,
      created_by: profile?.id,
    }
    const { error } = campaign?.id
      ? await supabase.from('marketing_campaigns').update(payload).eq('id', campaign.id)
      : await supabase.from('marketing_campaigns').insert(payload)
    setSaving(false)
    if (!error) onSave()
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="Campaign Name" required>
            <input className={inputCls} value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Spring Open House 2026" />
          </Field>
        </div>
        <Field label="Type">
          <select className={selectCls} value={form.campaign_type} onChange={e=>set('campaign_type',e.target.value)}>
            {CAMPAIGN_TYPES.map(t => <option key={t} value={t}>{fmt(t)}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className={selectCls} value={form.status} onChange={e=>set('status',e.target.value)}>
            {CAMPAIGN_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Start Date">
          <input className={inputCls} type="date" value={form.start_date} onChange={e=>set('start_date',e.target.value)} />
        </Field>
        <Field label="End Date">
          <input className={inputCls} type="date" value={form.end_date} onChange={e=>set('end_date',e.target.value)} />
        </Field>
        <Field label="Budget">
          <input className={inputCls} type="number" value={form.budget} onChange={e=>set('budget',e.target.value)} placeholder="$0" />
        </Field>
        <Field label="Actual Spend">
          <input className={inputCls} type="number" value={form.actual_spend} onChange={e=>set('actual_spend',e.target.value)} />
        </Field>
        <Field label="Goal: Leads">
          <input className={inputCls} type="number" value={form.goal_leads} onChange={e=>set('goal_leads',e.target.value)} />
        </Field>
        <Field label="Goal: Tours">
          <input className={inputCls} type="number" value={form.goal_tours} onChange={e=>set('goal_tours',e.target.value)} />
        </Field>
        <Field label="Target Geography">
          <input className={inputCls} value={form.target_geography} onChange={e=>set('target_geography',e.target.value)} placeholder="Springfield metro area" />
        </Field>
        <Field label="Promo Code">
          <input className={inputCls} value={form.promo_code} onChange={e=>set('promo_code',e.target.value)} placeholder="SPRING26" />
        </Field>
        <Field label="Headline">
          <input className={inputCls} value={form.headline} onChange={e=>set('headline',e.target.value)} />
        </Field>
        <Field label="Call to Action">
          <input className={inputCls} value={form.call_to_action} onChange={e=>set('call_to_action',e.target.value)} placeholder="Schedule a Tour Today" />
        </Field>
        <div className="col-span-2">
          <Field label="Landing URL">
            <input className={inputCls} value={form.landing_url} onChange={e=>set('landing_url',e.target.value)} placeholder="https://…" />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Body Copy">
            <textarea className={inputCls} rows={3} value={form.body_copy} onChange={e=>set('body_copy',e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="mt-4">
        <Field label="Target Care Levels">
          <div className="flex flex-wrap gap-2 mt-1">
            {CARE_LEVELS.map(lvl => (
              <button key={lvl} type="button" onClick={() => toggleCareLevel(lvl)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  form.target_care_levels.includes(lvl)
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
                }`}>
                {fmt(lvl)}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
        <button onClick={handleSave} disabled={saving || !form.name}
          className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : campaign?.id ? 'Save Changes' : 'Create Campaign'}
        </button>
      </div>
    </>
  )
}

// ── Activity Log Modal ────────────────────────────────────────

function ActivityModal({ lead, onClose }) {
  const { profile } = useAuth()
  const [activities, setActivities] = useState([])
  const [form, setForm] = useState({ activity_type: 'call', subject: '', body: '', outcome: '', completed_at: new Date().toISOString().slice(0,16) })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('lead_activities').select('*, performed_by:profiles(first_name,last_name)')
      .eq('lead_id', lead.id).order('created_at', { ascending: false })
      .then(({ data }) => setActivities(data || []))
  }, [lead.id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const addActivity = async () => {
    setSaving(true)
    await supabase.from('lead_activities').insert({
      ...form,
      lead_id: lead.id,
      organization_id: lead.organization_id,
      performed_by: profile?.id,
      completed_at: form.completed_at || null,
    })
    const { data } = await supabase.from('lead_activities').select('*, performed_by:profiles(first_name,last_name)')
      .eq('lead_id', lead.id).order('created_at', { ascending: false })
    setActivities(data || [])
    setForm({ activity_type: 'call', subject: '', body: '', outcome: '', completed_at: new Date().toISOString().slice(0,16) })
    setSaving(false)
  }

  return (
    <Modal title={`Activity — ${lead.first_name} ${lead.last_name}`} onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Field label="Type">
          <select className={selectCls} value={form.activity_type} onChange={e=>set('activity_type',e.target.value)}>
            {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{fmt(t)}</option>)}
          </select>
        </Field>
        <Field label="Date/Time">
          <input className={inputCls} type="datetime-local" value={form.completed_at} onChange={e=>set('completed_at',e.target.value)} />
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
        <Field label="Outcome">
          <input className={inputCls} value={form.outcome} onChange={e=>set('outcome',e.target.value)} placeholder="Left voicemail, call back Friday" />
        </Field>
      </div>
      <button onClick={addActivity} disabled={saving}
        className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors mb-6 disabled:opacity-50">
        {saving ? 'Logging…' : '+ Log Activity'}
      </button>

      <div className="space-y-3">
        {activities.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No activity logged yet.</p>}
        {activities.map(a => (
          <div key={a.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-brand-600">{fmt(a.activity_type)}</span>
              <span className="text-xs text-slate-400">{a.completed_at ? new Date(a.completed_at).toLocaleString() : '—'}</span>
            </div>
            {a.subject && <p className="text-sm font-medium text-slate-700">{a.subject}</p>}
            {a.body    && <p className="text-sm text-slate-500 mt-0.5">{a.body}</p>}
            {a.outcome && <p className="text-xs text-slate-400 mt-1 italic">{a.outcome}</p>}
            <p className="text-xs text-slate-400 mt-1">
              By {a.performed_by?.first_name} {a.performed_by?.last_name}
            </p>
          </div>
        ))}
      </div>
    </Modal>
  )
}

// ── Referral Sources Tab ──────────────────────────────────────

function SourcesTab({ orgId }) {
  const [sources, setSources] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'other' })
  const [saving, setSaving] = useState(false)

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('referral_sources').select('*').eq('organization_id', orgId).order('name')
    setSources(data || [])
  }, [orgId])

  useEffect(() => { fetch() }, [fetch])

  const save = async () => {
    if (!form.name) return
    setSaving(true)
    await supabase.from('referral_sources').insert({ ...form, organization_id: orgId })
    setForm({ name: '', category: 'other' })
    setShowForm(false)
    setSaving(false)
    fetch()
  }

  const toggle = async (id, is_active) => {
    await supabase.from('referral_sources').update({ is_active: !is_active }).eq('id', id)
    fetch()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{sources.length} referral sources configured</p>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={15} /> Add Source
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-end gap-3">
          <Field label="Source Name">
            <input className={inputCls} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Dr. Johnson's Practice" />
          </Field>
          <Field label="Category">
            <select className={selectCls} value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
              {SOURCE_CATEGORIES.map(c => <option key={c} value={c}>{fmt(c)}</option>)}
            </select>
          </Field>
          <button onClick={save} disabled={saving || !form.name}
            className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 whitespace-nowrap">
            {saving ? 'Saving…' : 'Add'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sources.map(s => (
          <div key={s.id} className={`p-4 bg-white rounded-xl border transition-all ${s.is_active ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-slate-800 text-sm">{s.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{fmt(s.category)}</p>
              </div>
              <button onClick={() => toggle(s.id, s.is_active)}
                className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${s.is_active ? 'text-green-600 border-green-200 bg-green-50 hover:bg-red-50 hover:text-red-500 hover:border-red-200' : 'text-slate-400 border-slate-200 bg-slate-50 hover:bg-green-50 hover:text-green-600 hover:border-green-200'}`}>
                {s.is_active ? 'Active' : 'Inactive'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────

export default function Marketing() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id
  const [tab, setTab] = useState('pipeline')

  // Leads state
  const [leads, setLeads] = useState([])
  const [sources, setSources] = useState([])
  const [staff, setStaff] = useState([])
  const [leadSearch, setLeadSearch] = useState('')
  const [leadStatusFilter, setLeadStatusFilter] = useState('all')
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [editLead, setEditLead] = useState(null)
  const [activityLead, setActivityLead] = useState(null)

  // Campaigns state
  const [campaigns, setCampaigns] = useState([])
  const [campSearch, setCampSearch] = useState('')
  const [campStatusFilter, setCampStatusFilter] = useState('all')
  const [showCampForm, setShowCampForm] = useState(false)
  const [editCamp, setEditCamp] = useState(null)

  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    const [leadsR, sourcesR, staffR, campsR] = await Promise.all([
      supabase.from('leads').select('*, referral_source:referral_sources(name), assigned:profiles!leads_assigned_to_fkey(first_name,last_name)')
        .eq('organization_id', orgId).order('inquiry_date', { ascending: false }),
      supabase.from('referral_sources').select('*').eq('organization_id', orgId).eq('is_active', true).order('name'),
      supabase.from('profiles').select('id,first_name,last_name').eq('organization_id', orgId).order('first_name'),
      supabase.from('marketing_campaigns').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }),
    ])
    setLeads(leadsR.data || [])
    setSources(sourcesR.data || [])
    setStaff(staffR.data || [])
    setCampaigns(campsR.data || [])
    setLoading(false)
  }, [orgId])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Filtered leads
  const filteredLeads = leads.filter(l => {
    const q = leadSearch.toLowerCase()
    const match = !q || `${l.first_name} ${l.last_name} ${l.email} ${l.phone} ${l.prospect_first_name} ${l.prospect_last_name}`.toLowerCase().includes(q)
    const status = leadStatusFilter === 'all' || l.status === leadStatusFilter
    return match && status
  })

  // Filtered campaigns
  const filteredCamps = campaigns.filter(c => {
    const q = campSearch.toLowerCase()
    const match = !q || c.name.toLowerCase().includes(q)
    const status = campStatusFilter === 'all' || c.status === campStatusFilter
    return match && status
  })

  // Stats
  const stats = {
    total: leads.length,
    active: leads.filter(l => !['lost','disqualified','move_in'].includes(l.status)).length,
    tours: leads.filter(l => ['tour_scheduled','tour_completed'].includes(l.status)).length,
    moveIns: leads.filter(l => l.status === 'move_in').length,
  }

  const deleteLead = async (id) => {
    if (!confirm('Delete this lead?')) return
    await supabase.from('leads').delete().eq('id', id)
    fetchAll()
  }

  const deleteCampaign = async (id) => {
    if (!confirm('Delete this campaign?')) return
    await supabase.from('marketing_campaigns').delete().eq('id', id)
    fetchAll()
  }

  const cycleCampStatus = async (camp) => {
    const order = ['draft','active','paused','completed']
    const idx = order.indexOf(camp.status)
    const next = order[(idx + 1) % order.length]
    await supabase.from('marketing_campaigns').update({ status: next }).eq('id', camp.id)
    fetchAll()
  }

  const tabs = [
    { key: 'pipeline',  label: 'Lead Pipeline', icon: Users },
    { key: 'campaigns', label: 'Campaigns',      icon: Megaphone },
    { key: 'sources',   label: 'Referral Sources', icon: Tag },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800">Marketing</h1>
          <p className="text-slate-500 text-sm mt-0.5">Lead pipeline, campaigns, and referral tracking</p>
        </div>
        <button onClick={() => { setEditLead(null); setShowLeadForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
          <UserPlus size={15} /> Add Lead
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users}     label="Total Leads"   value={stats.total}   sub="All time" />
        <StatCard icon={TrendingUp} label="Active"       value={stats.active}  sub="In pipeline" color="text-green-600" />
        <StatCard icon={Calendar}  label="Tours"         value={stats.tours}   sub="Scheduled + completed" color="text-purple-600" />
        <StatCard icon={CheckCircle} label="Move-ins"    value={stats.moveIns} sub="Converted" color="text-amber-600" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Icon size={15} />{t.label}
            </button>
          )
        })}
      </div>

      {/* ── Pipeline Tab ── */}
      {tab === 'pipeline' && (
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Search leads…" value={leadSearch} onChange={e=>setLeadSearch(e.target.value)} />
            </div>
            <select className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
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
              <Users size={40} className="mx-auto text-slate-200 mb-3" />
              <p className="text-slate-400 font-medium">No leads found</p>
              <p className="text-slate-300 text-sm mt-1">Add your first lead to start the pipeline</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
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
                      <tr key={lead.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{lead.first_name} {lead.last_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {lead.email && <span className="text-xs text-slate-400">{lead.email}</span>}
                            {lead.phone && <span className="text-xs text-slate-400">{lead.phone}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {lead.inquiry_type !== 'self' && (lead.prospect_first_name || lead.prospect_last_name)
                            ? <span className="text-sm text-slate-600">{lead.prospect_first_name} {lead.prospect_last_name}</span>
                            : <span className="text-xs text-slate-400">Self</span>}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {(lead.care_level_interest || []).map(c => (
                              <span key={c} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{fmt(c)}</span>
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
                            <button onClick={() => setActivityLead(lead)}
                              className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors text-slate-400" title="Log Activity">
                              <Clock size={14} />
                            </button>
                            <button onClick={() => { setEditLead(lead); setShowLeadForm(true) }}
                              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
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
      )}

      {/* ── Campaigns Tab ── */}
      {tab === 'campaigns' && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-48">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Search campaigns…" value={campSearch} onChange={e=>setCampSearch(e.target.value)} />
              </div>
              <select className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={campStatusFilter} onChange={e=>setCampStatusFilter(e.target.value)}>
                <option value="all">All</option>
                {CAMPAIGN_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <button onClick={() => { setEditCamp(null); setShowCampForm(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
              <Plus size={15} /> New Campaign
            </button>
          </div>

          {filteredCamps.length === 0 ? (
            <div className="text-center py-20">
              <Megaphone size={40} className="mx-auto text-slate-200 mb-3" />
              <p className="text-slate-400 font-medium">No campaigns yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredCamps.map(camp => {
                const st = getCampStatus(camp.status)
                const StatusIcon = st.icon
                const pctBudget = camp.budget && camp.actual_spend ? Math.min(100, Math.round((camp.actual_spend / camp.budget) * 100)) : null
                return (
                  <div key={camp.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge color={st.color}><StatusIcon size={11} className="mr-1 inline" />{st.label}</Badge>
                          <span className="text-xs text-slate-400">{fmt(camp.campaign_type)}</span>
                        </div>
                        <h3 className="font-semibold text-slate-800 truncate">{camp.name}</h3>
                        {camp.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{camp.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 ml-3">
                        <button onClick={() => cycleCampStatus(camp)} title="Advance status"
                          className="p-1.5 hover:bg-brand-50 hover:text-brand-600 rounded-lg transition-colors text-slate-300">
                          <ArrowRight size={14} />
                        </button>
                        <button onClick={() => { setEditCamp(camp); setShowCampForm(true) }}
                          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => deleteCampaign(camp.id)}
                          className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-slate-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {[
                        { label: 'Budget', value: fmtMoney(camp.budget) },
                        { label: 'Spent',  value: fmtMoney(camp.actual_spend) },
                        { label: 'Goal Leads', value: camp.goal_leads || '—' },
                      ].map(m => (
                        <div key={m.label} className="bg-slate-50 rounded-xl p-2.5 text-center">
                          <p className="text-xs text-slate-400">{m.label}</p>
                          <p className="font-semibold text-slate-700 text-sm mt-0.5">{m.value}</p>
                        </div>
                      ))}
                    </div>

                    {pctBudget !== null && (
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                          <span>Budget used</span><span>{pctBudget}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${pctBudget > 90 ? 'bg-red-400' : pctBudget > 70 ? 'bg-amber-400' : 'bg-brand-500'}`}
                            style={{ width: `${pctBudget}%` }} />
                        </div>
                      </div>
                    )}

                    {(camp.start_date || camp.end_date) && (
                      <p className="text-xs text-slate-400 mt-3">
                        {fmtDate(camp.start_date)} — {fmtDate(camp.end_date)}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Sources Tab ── */}
      {tab === 'sources' && <SourcesTab orgId={orgId} />}

      {/* ── Modals ── */}
      {showLeadForm && (
        <Modal title={editLead ? 'Edit Lead' : 'Add Lead'} onClose={() => setShowLeadForm(false)} wide>
          <LeadForm lead={editLead} sources={sources} staff={staff}
            onSave={() => { setShowLeadForm(false); fetchAll() }} onClose={() => setShowLeadForm(false)} />
        </Modal>
      )}
      {showCampForm && (
        <Modal title={editCamp ? 'Edit Campaign' : 'New Campaign'} onClose={() => setShowCampForm(false)} wide>
          <CampaignForm campaign={editCamp}
            onSave={() => { setShowCampForm(false); fetchAll() }} onClose={() => setShowCampForm(false)} />
        </Modal>
      )}
      {activityLead && <ActivityModal lead={activityLead} onClose={() => setActivityLead(null)} />}
    </div>
  )
}
