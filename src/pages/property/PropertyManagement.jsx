import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, X, Edit2, Trash2, Search, Home, FileText, Key,
  DollarSign, AlertTriangle, ClipboardCheck, ChevronDown,
  CheckCircle, XCircle, Clock, User, Building2, Filter,
  ArrowUpRight, ArrowDownRight, MoreHorizontal, Banknote,
  Bell, Calendar, ShieldAlert, RotateCcw, Eye
} from 'lucide-react'

// ── Constants ────────────────────────────────────────────────

const UNIT_STATUSES = [
  { key: 'available',     label: 'Available',     color: 'bg-green-100 text-green-700 border-green-200' },
  { key: 'occupied',      label: 'Occupied',      color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { key: 'notice_given',  label: 'Notice Given',  color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { key: 'on_hold',       label: 'On Hold',       color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { key: 'maintenance',   label: 'Maintenance',   color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { key: 'offline',       label: 'Offline',       color: 'bg-slate-100 text-slate-500 border-slate-200' },
]

const LEASE_STATUSES = [
  { key: 'draft',            label: 'Draft',            color: 'bg-slate-100 text-slate-600 border-slate-200' },
  { key: 'active',           label: 'Active',           color: 'bg-green-100 text-green-700 border-green-200' },
  { key: 'pending_renewal',  label: 'Pending Renewal',  color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { key: 'expired',          label: 'Expired',          color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { key: 'terminated',       label: 'Terminated',       color: 'bg-red-100 text-red-700 border-red-200' },
]

const NOTICE_TYPES = [
  { key: 'late_rent',        label: 'Late Rent' },
  { key: 'pay_or_quit',      label: 'Pay or Quit' },
  { key: 'cure_or_quit',     label: 'Cure or Quit' },
  { key: 'unconditional_quit', label: 'Unconditional Quit' },
  { key: 'lease_violation',  label: 'Lease Violation' },
  { key: 'eviction_filing',  label: 'Eviction Filing' },
  { key: 'non_renewal',      label: 'Non-Renewal' },
  { key: 'rent_increase',    label: 'Rent Increase' },
  { key: 'entry_notice',     label: 'Entry Notice' },
  { key: 'move_out_reminder', label: 'Move-Out Reminder' },
  { key: 'general',          label: 'General Notice' },
]

const NOTICE_STATUSES = [
  { key: 'draft',       label: 'Draft',       color: 'bg-slate-100 text-slate-500' },
  { key: 'issued',      label: 'Issued',      color: 'bg-blue-100 text-blue-700' },
  { key: 'delivered',   label: 'Delivered',   color: 'bg-purple-100 text-purple-700' },
  { key: 'acknowledged',label: 'Acknowledged',color: 'bg-indigo-100 text-indigo-700' },
  { key: 'resolved',    label: 'Resolved',    color: 'bg-green-100 text-green-700' },
  { key: 'escalated',   label: 'Escalated',   color: 'bg-red-100 text-red-700' },
]

const ENTRY_TYPES = [
  { key: 'charge',       label: 'Charge',        dir: 1,  color: 'text-red-600' },
  { key: 'payment',      label: 'Payment',        dir: -1, color: 'text-green-600' },
  { key: 'credit',       label: 'Credit',         dir: -1, color: 'text-green-600' },
  { key: 'adjustment',   label: 'Adjustment',     dir: 1,  color: 'text-slate-600' },
  { key: 'late_fee',     label: 'Late Fee',        dir: 1,  color: 'text-orange-600' },
  { key: 'pet_fee',      label: 'Pet Fee',         dir: 1,  color: 'text-amber-600' },
  { key: 'nsf_fee',      label: 'NSF Fee',         dir: 1,  color: 'text-red-600' },
  { key: 'damage_charge',label: 'Damage Charge',   dir: 1,  color: 'text-red-600' },
  { key: 'other_fee',    label: 'Other Fee',       dir: 1,  color: 'text-slate-600' },
  { key: 'refund',       label: 'Refund',          dir: -1, color: 'text-green-600' },
]

const KEY_TYPES   = ['unit','mailbox','storage','garage','common_area','building','fob','keypad_code','other']
const UNIT_TYPES  = ['studio','one_bedroom','two_bedroom','cottage','duplex','house','other']
const LEASE_TYPES = ['month_to_month','fixed_term','short_term']
const PAY_METHODS = ['check','cash','ach','credit_card','money_order','online','other']
const DELIVERY_METHODS = ['hand_delivered','posted_on_door','certified_mail','email','other']
const WALKTHROUGH_TYPES = ['move_in','move_out','periodic','pre_lease','vacancy']
const CONDITIONS  = ['excellent','good','fair','poor']
const DEPOSIT_TYPES = ['security','pet','key','damage','cleaning','other']

const fmt = (s) => s?.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) || '—'
const fmtDate = (d) => d ? new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'
const fmtMoney = (n) => n != null && n !== '' ? `$${Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}` : '—'

const getUnitStatus   = (key) => UNIT_STATUSES.find(s=>s.key===key)  || UNIT_STATUSES[0]
const getLeaseStatus  = (key) => LEASE_STATUSES.find(s=>s.key===key) || LEASE_STATUSES[0]
const getNoticeStatus = (key) => NOTICE_STATUSES.find(s=>s.key===key)|| NOTICE_STATUSES[0]

// ── Shared UI ─────────────────────────────────────────────────

function Badge({ color, children }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>{children}</span>
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

function Modal({ title, onClose, children, wide, extraWide }) {
  const maxW = extraWide ? 'max-w-5xl' : wide ? 'max-w-3xl' : 'max-w-lg'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxW} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
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

function Field({ label, required, children, span }) {
  return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function SaveCancel({ onSave, onClose, saving, label = 'Save' }) {
  return (
    <div className="flex justify-end gap-3 mt-6">
      <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
      <button onClick={onSave} disabled={saving}
        className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
        {saving ? 'Saving…' : label}
      </button>
    </div>
  )
}

const inputCls  = 'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'
const selectCls = inputCls

// ── Unit Form ─────────────────────────────────────────────────

function UnitForm({ unit, orgId, onSave, onClose }) {
  const [form, setForm] = useState({
    unit_number:'', building:'', floor:'', unit_type:'one_bedroom',
    square_feet:'', bedrooms:1, bathrooms:1,
    has_garage:false, has_patio:false, has_washer_dryer:false, has_dishwasher:false, pet_allowed:false,
    market_rent:'', status:'available', notes:'',
    ...unit,
  })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const save = async () => {
    if (!form.unit_number) return
    setSaving(true)
    const p = { ...form, organization_id: orgId,
      floor: form.floor || null, square_feet: form.square_feet || null,
      market_rent: form.market_rent || null,
    }
    const { error } = unit?.id
      ? await supabase.from('il_units').update(p).eq('id', unit.id)
      : await supabase.from('il_units').insert(p)
    setSaving(false)
    if (!error) onSave()
  }

  const checks = [
    { k:'has_garage',     l:'Garage' },
    { k:'has_patio',      l:'Patio/Balcony' },
    { k:'has_washer_dryer',l:'Washer/Dryer' },
    { k:'has_dishwasher', l:'Dishwasher' },
    { k:'pet_allowed',    l:'Pets Allowed' },
  ]

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Unit Number" required>
          <input className={inputCls} value={form.unit_number} onChange={e=>set('unit_number',e.target.value)} placeholder="101" />
        </Field>
        <Field label="Building">
          <input className={inputCls} value={form.building} onChange={e=>set('building',e.target.value)} placeholder="A" />
        </Field>
        <Field label="Unit Type">
          <select className={selectCls} value={form.unit_type} onChange={e=>set('unit_type',e.target.value)}>
            {UNIT_TYPES.map(t=><option key={t} value={t}>{fmt(t)}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className={selectCls} value={form.status} onChange={e=>set('status',e.target.value)}>
            {UNIT_STATUSES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Bedrooms">
          <input className={inputCls} type="number" min={0} value={form.bedrooms} onChange={e=>set('bedrooms',e.target.value)} />
        </Field>
        <Field label="Bathrooms">
          <input className={inputCls} type="number" min={0} step={0.5} value={form.bathrooms} onChange={e=>set('bathrooms',e.target.value)} />
        </Field>
        <Field label="Sq Ft">
          <input className={inputCls} type="number" value={form.square_feet} onChange={e=>set('square_feet',e.target.value)} />
        </Field>
        <Field label="Market Rent">
          <input className={inputCls} type="number" value={form.market_rent} onChange={e=>set('market_rent',e.target.value)} placeholder="$0.00" />
        </Field>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-2">Amenities</label>
          <div className="flex flex-wrap gap-2">
            {checks.map(c=>(
              <button key={c.k} type="button" onClick={()=>set(c.k,!form[c.k])}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${form[c.k]?'bg-brand-600 text-white border-brand-600':'bg-white text-slate-600 border-slate-200 hover:border-brand-300'}`}>
                {c.l}
              </button>
            ))}
          </div>
        </div>
        <div className="col-span-2">
          <Field label="Notes">
            <textarea className={inputCls} rows={2} value={form.notes} onChange={e=>set('notes',e.target.value)} />
          </Field>
        </div>
      </div>
      <SaveCancel onSave={save} onClose={onClose} saving={saving} label={unit?.id?'Save Changes':'Add Unit'} />
    </>
  )
}

// ── Tenant Form ───────────────────────────────────────────────

function TenantForm({ tenant, orgId, onSave, onClose }) {
  const [form, setForm] = useState({
    first_name:'', last_name:'', email:'', phone:'', date_of_birth:'',
    emergency_contact_name:'', emergency_contact_phone:'', emergency_contact_relationship:'',
    background_check_status:'', notes:'',
    ...tenant,
  })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const save = async () => {
    if (!form.first_name || !form.last_name) return
    setSaving(true)
    const p = { ...form, organization_id: orgId,
      date_of_birth: form.date_of_birth || null,
      background_check_status: form.background_check_status || null,
    }
    const { error } = tenant?.id
      ? await supabase.from('il_tenants').update(p).eq('id', tenant.id)
      : await supabase.from('il_tenants').insert(p)
    setSaving(false)
    if (!error) onSave()
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Field label="First Name" required><input className={inputCls} value={form.first_name} onChange={e=>set('first_name',e.target.value)} /></Field>
        <Field label="Last Name" required><input className={inputCls} value={form.last_name} onChange={e=>set('last_name',e.target.value)} /></Field>
        <Field label="Email"><input className={inputCls} type="email" value={form.email} onChange={e=>set('email',e.target.value)} /></Field>
        <Field label="Phone"><input className={inputCls} value={form.phone} onChange={e=>set('phone',e.target.value)} /></Field>
        <Field label="Date of Birth"><input className={inputCls} type="date" value={form.date_of_birth} onChange={e=>set('date_of_birth',e.target.value)} /></Field>
        <Field label="Background Check">
          <select className={selectCls} value={form.background_check_status} onChange={e=>set('background_check_status',e.target.value)}>
            <option value="">— Not Started —</option>
            {['pending','passed','failed','waived'].map(v=><option key={v} value={v}>{fmt(v)}</option>)}
          </select>
        </Field>
        <Field label="Emergency Contact Name">
          <input className={inputCls} value={form.emergency_contact_name} onChange={e=>set('emergency_contact_name',e.target.value)} />
        </Field>
        <Field label="Emergency Contact Phone">
          <input className={inputCls} value={form.emergency_contact_phone} onChange={e=>set('emergency_contact_phone',e.target.value)} />
        </Field>
        <div className="col-span-2">
          <Field label="Emergency Contact Relationship">
            <input className={inputCls} value={form.emergency_contact_relationship} onChange={e=>set('emergency_contact_relationship',e.target.value)} placeholder="Son, daughter, friend…" />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Notes"><textarea className={inputCls} rows={2} value={form.notes} onChange={e=>set('notes',e.target.value)} /></Field>
        </div>
      </div>
      <SaveCancel onSave={save} onClose={onClose} saving={saving} label={tenant?.id?'Save Changes':'Add Tenant'} />
    </>
  )
}

// ── Lease Form ────────────────────────────────────────────────

function LeaseForm({ lease, units, tenants, orgId, onSave, onClose }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    unit_id:'', primary_tenant_id:'', lease_type:'month_to_month',
    status:'draft', start_date:'', end_date:'',
    monthly_rent:'', rent_due_day:1, late_fee_amount:0, late_fee_grace_days:5,
    pet_deposit:0, pet_monthly_fee:0,
    tenant_pays_electric:true, tenant_pays_gas:true, tenant_pays_water:false, tenant_pays_cable:false,
    notes:'',
    ...lease,
  })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const save = async () => {
    if (!form.unit_id || !form.primary_tenant_id || !form.start_date || !form.monthly_rent) return
    setSaving(true)
    const p = { ...form, organization_id: orgId,
      end_date: form.end_date || null,
      mgmt_signed_by: profile?.id,
    }
    const { error } = lease?.id
      ? await supabase.from('il_leases').update(p).eq('id', lease.id)
      : await supabase.from('il_leases').insert(p)
    setSaving(false)
    if (!error) onSave()
  }

  const utilChecks = [
    { k:'tenant_pays_electric',l:'Electric'},
    { k:'tenant_pays_gas',     l:'Gas'},
    { k:'tenant_pays_water',   l:'Water'},
    { k:'tenant_pays_cable',   l:'Cable/Internet'},
  ]

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Unit" required>
          <select className={selectCls} value={form.unit_id} onChange={e=>set('unit_id',e.target.value)}>
            <option value="">— Select unit —</option>
            {units.map(u=><option key={u.id} value={u.id}>{u.unit_number}{u.building?` (Bldg ${u.building})`:''}</option>)}
          </select>
        </Field>
        <Field label="Primary Tenant" required>
          <select className={selectCls} value={form.primary_tenant_id} onChange={e=>set('primary_tenant_id',e.target.value)}>
            <option value="">— Select tenant —</option>
            {tenants.map(t=><option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
          </select>
        </Field>
        <Field label="Lease Type">
          <select className={selectCls} value={form.lease_type} onChange={e=>set('lease_type',e.target.value)}>
            {LEASE_TYPES.map(t=><option key={t} value={t}>{fmt(t)}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className={selectCls} value={form.status} onChange={e=>set('status',e.target.value)}>
            {LEASE_STATUSES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Start Date" required>
          <input className={inputCls} type="date" value={form.start_date} onChange={e=>set('start_date',e.target.value)} />
        </Field>
        <Field label="End Date">
          <input className={inputCls} type="date" value={form.end_date} onChange={e=>set('end_date',e.target.value)} />
        </Field>
        <Field label="Monthly Rent" required>
          <input className={inputCls} type="number" value={form.monthly_rent} onChange={e=>set('monthly_rent',e.target.value)} placeholder="$0.00" />
        </Field>
        <Field label="Rent Due Day">
          <input className={inputCls} type="number" min={1} max={28} value={form.rent_due_day} onChange={e=>set('rent_due_day',e.target.value)} />
        </Field>
        <Field label="Late Fee Amount">
          <input className={inputCls} type="number" value={form.late_fee_amount} onChange={e=>set('late_fee_amount',e.target.value)} />
        </Field>
        <Field label="Grace Period (days)">
          <input className={inputCls} type="number" value={form.late_fee_grace_days} onChange={e=>set('late_fee_grace_days',e.target.value)} />
        </Field>
        <Field label="Pet Deposit">
          <input className={inputCls} type="number" value={form.pet_deposit} onChange={e=>set('pet_deposit',e.target.value)} />
        </Field>
        <Field label="Pet Monthly Fee">
          <input className={inputCls} type="number" value={form.pet_monthly_fee} onChange={e=>set('pet_monthly_fee',e.target.value)} />
        </Field>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-2">Tenant Pays Utilities</label>
          <div className="flex flex-wrap gap-2">
            {utilChecks.map(c=>(
              <button key={c.k} type="button" onClick={()=>set(c.k,!form[c.k])}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${form[c.k]?'bg-brand-600 text-white border-brand-600':'bg-white text-slate-600 border-slate-200'}`}>
                {c.l}
              </button>
            ))}
          </div>
        </div>
        <div className="col-span-2">
          <Field label="Notes"><textarea className={inputCls} rows={2} value={form.notes} onChange={e=>set('notes',e.target.value)} /></Field>
        </div>
      </div>
      <SaveCancel onSave={save} onClose={onClose} saving={saving} label={lease?.id?'Save Changes':'Create Lease'} />
    </>
  )
}

// ── Ledger Modal ──────────────────────────────────────────────

function LedgerModal({ lease, onClose }) {
  const { profile } = useAuth()
  const [entries, setEntries]   = useState([])
  const [form, setForm]         = useState({ entry_type:'payment', amount:'', description:'', payment_date: new Date().toISOString().slice(0,10), payment_method:'check', check_number:'', due_date:'' })
  const [saving, setSaving]     = useState(false)

  const fetchEntries = async () => {
    const { data } = await supabase.from('il_rent_ledger').select('*')
      .eq('lease_id', lease.id).eq('voided', false).order('created_at', { ascending: false })
    setEntries(data || [])
  }

  useEffect(() => { fetchEntries() }, [lease.id])

  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const addEntry = async () => {
    if (!form.amount) return
    setSaving(true)
    await supabase.from('il_rent_ledger').insert({
      ...form,
      lease_id: lease.id,
      unit_id: lease.unit_id,
      tenant_id: lease.primary_tenant_id,
      organization_id: lease.organization_id,
      amount: parseFloat(form.amount),
      posted_by: profile?.id,
      payment_date: form.payment_date || null,
      due_date: form.due_date || null,
      check_number: form.check_number || null,
    })
    await fetchEntries()
    setForm({ entry_type:'payment', amount:'', description:'', payment_date: new Date().toISOString().slice(0,10), payment_method:'check', check_number:'', due_date:'' })
    setSaving(false)
  }

  const voidEntry = async (id) => {
    if (!confirm('Void this entry?')) return
    await supabase.from('il_rent_ledger').update({ voided:true, voided_by:profile?.id, voided_at:new Date().toISOString() }).eq('id',id)
    fetchEntries()
  }

  // Running balance (charges are debits, payments/credits are credits)
  let balance = 0
  const withBalance = [...entries].reverse().map(e => {
    const et = ENTRY_TYPES.find(t=>t.key===e.entry_type)
    balance += (et?.dir || 1) * parseFloat(e.amount)
    return { ...e, runningBalance: balance }
  }).reverse()

  const currentBalance = withBalance[0]?.runningBalance || 0

  return (
    <Modal title={`Rent Ledger — ${lease.lease_number || 'Lease'}`} onClose={onClose} extraWide>
      <div className={`mb-5 p-4 rounded-xl border ${currentBalance > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">Current Balance</span>
          <span className={`text-2xl font-bold ${currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`} style={{ fontFamily: '"Playfair Display", serif' }}>
            {currentBalance >= 0 ? fmtMoney(currentBalance) + ' owed' : fmtMoney(Math.abs(currentBalance)) + ' credit'}
          </span>
        </div>
      </div>

      {/* Quick entry form */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Post Entry</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select className={selectCls} value={form.entry_type} onChange={e=>set('entry_type',e.target.value)}>
              {ENTRY_TYPES.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Amount">
            <input className={inputCls} type="number" step="0.01" value={form.amount} onChange={e=>set('amount',e.target.value)} placeholder="$0.00" />
          </Field>
          {['payment','credit','refund'].includes(form.entry_type) && (
            <>
              <Field label="Payment Method">
                <select className={selectCls} value={form.payment_method} onChange={e=>set('payment_method',e.target.value)}>
                  {PAY_METHODS.map(m=><option key={m} value={m}>{fmt(m)}</option>)}
                </select>
              </Field>
              <Field label="Check #">
                <input className={inputCls} value={form.check_number} onChange={e=>set('check_number',e.target.value)} />
              </Field>
            </>
          )}
          <Field label="Date">
            <input className={inputCls} type="date" value={form.payment_date} onChange={e=>set('payment_date',e.target.value)} />
          </Field>
          <Field label="Description">
            <input className={inputCls} value={form.description} onChange={e=>set('description',e.target.value)} placeholder="e.g. May 2026 rent" />
          </Field>
        </div>
        <button onClick={addEntry} disabled={saving || !form.amount}
          className="mt-3 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
          {saving ? 'Posting…' : 'Post Entry'}
        </button>
      </div>

      {/* Ledger table */}
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs">Date</th>
              <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs">Type</th>
              <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs">Description</th>
              <th className="text-right px-4 py-2.5 font-medium text-slate-500 text-xs">Amount</th>
              <th className="text-right px-4 py-2.5 font-medium text-slate-500 text-xs">Balance</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {withBalance.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-slate-400 text-sm">No entries posted yet.</td></tr>
            )}
            {withBalance.map(e => {
              const et = ENTRY_TYPES.find(t=>t.key===e.entry_type)
              const isDebit = et?.dir === 1
              return (
                <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-2.5 text-slate-500 text-xs whitespace-nowrap">{fmtDate(e.payment_date || e.created_at?.slice(0,10))}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-medium ${et?.color || 'text-slate-600'}`}>{et?.label || fmt(e.entry_type)}</span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 text-xs max-w-xs truncate">{e.description || '—'}</td>
                  <td className={`px-4 py-2.5 text-right font-medium text-sm ${et?.color || 'text-slate-600'}`}>
                    {isDebit ? '+' : '-'}{fmtMoney(Math.abs(e.amount))}
                  </td>
                  <td className={`px-4 py-2.5 text-right text-sm font-semibold ${e.runningBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {fmtMoney(Math.abs(e.runningBalance))}
                  </td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => voidEntry(e.id)}
                      className="p-1 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-slate-300" title="Void">
                      <X size={12} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}

// ── Notice Form ───────────────────────────────────────────────

function NoticeForm({ leases, tenants, units, orgId, notice, onSave, onClose }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    lease_id:'', unit_id:'', tenant_id:'', notice_type:'late_rent',
    status:'draft', amount_owed:'', cure_deadline:'',
    issued_date: new Date().toISOString().slice(0,10),
    delivery_method:'hand_delivered', notes:'',
    ...notice,
  })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  // Auto-fill unit/tenant when lease selected
  const handleLeaseChange = (leaseId) => {
    const lease = leases.find(l=>l.id===leaseId)
    set('lease_id', leaseId)
    if (lease) { set('unit_id', lease.unit_id); set('tenant_id', lease.primary_tenant_id) }
  }

  const save = async () => {
    if (!form.lease_id) return
    setSaving(true)
    const p = { ...form, organization_id: orgId, created_by: profile?.id,
      amount_owed: form.amount_owed || null, cure_deadline: form.cure_deadline || null,
    }
    const { error } = notice?.id
      ? await supabase.from('il_notices').update(p).eq('id', notice.id)
      : await supabase.from('il_notices').insert(p)
    setSaving(false)
    if (!error) onSave()
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="Lease" required>
            <select className={selectCls} value={form.lease_id} onChange={e=>handleLeaseChange(e.target.value)}>
              <option value="">— Select lease —</option>
              {leases.map(l=>{
                const t = tenants.find(t=>t.id===l.primary_tenant_id)
                const u = units.find(u=>u.id===l.unit_id)
                return <option key={l.id} value={l.id}>{l.lease_number} — {t?`${t.first_name} ${t.last_name}`:'?'} — Unit {u?.unit_number}</option>
              })}
            </select>
          </Field>
        </div>
        <Field label="Notice Type">
          <select className={selectCls} value={form.notice_type} onChange={e=>set('notice_type',e.target.value)}>
            {NOTICE_TYPES.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className={selectCls} value={form.status} onChange={e=>set('status',e.target.value)}>
            {NOTICE_STATUSES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Amount Owed">
          <input className={inputCls} type="number" value={form.amount_owed} onChange={e=>set('amount_owed',e.target.value)} />
        </Field>
        <Field label="Cure Deadline">
          <input className={inputCls} type="date" value={form.cure_deadline} onChange={e=>set('cure_deadline',e.target.value)} />
        </Field>
        <Field label="Issued Date">
          <input className={inputCls} type="date" value={form.issued_date} onChange={e=>set('issued_date',e.target.value)} />
        </Field>
        <Field label="Delivery Method">
          <select className={selectCls} value={form.delivery_method} onChange={e=>set('delivery_method',e.target.value)}>
            <option value="">— Not yet delivered —</option>
            {DELIVERY_METHODS.map(m=><option key={m} value={m}>{fmt(m)}</option>)}
          </select>
        </Field>
        <div className="col-span-2">
          <Field label="Notes"><textarea className={inputCls} rows={3} value={form.notes} onChange={e=>set('notes',e.target.value)} /></Field>
        </div>
      </div>
      <SaveCancel onSave={save} onClose={onClose} saving={saving} label={notice?.id?'Save Changes':'Issue Notice'} />
    </>
  )
}

// ── Walkthrough Form ──────────────────────────────────────────

function WalkthroughForm({ units, leases, tenants, orgId, onSave, onClose }) {
  const { profile } = useAuth()
  const DEFAULT_ROOMS = ['Living Room','Kitchen','Bedroom','Bathroom','Hallway','Patio/Balcony']
  const DEFAULT_ITEMS = ['Walls','Flooring','Windows','Doors','Lights','Appliances','Fixtures']

  const [form, setForm] = useState({
    unit_id:'', lease_id:'', walkthrough_type:'move_in',
    completed_date: new Date().toISOString().slice(0,16),
    tenant_present:true, overall_condition:'good', notes:'', damage_charges:0, damage_notes:'',
  })
  const [items, setItems] = useState(
    DEFAULT_ROOMS.flatMap((room, ri) =>
      DEFAULT_ITEMS.map((item, ii) => ({ room, item, condition:'good', notes:'', charge_amount:0, sort_order: ri*10+ii }))
    )
  )
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const setItem = (idx,k,v) => setItems(its => its.map((it,i)=>i===idx?{...it,[k]:v}:it))

  const handleLeaseChange = (leaseId) => {
    const lease = leases.find(l=>l.id===leaseId)
    set('lease_id', leaseId)
    if (lease) set('unit_id', lease.unit_id)
  }

  const save = async () => {
    if (!form.unit_id) return
    setSaving(true)
    const wPayload = { ...form, organization_id: orgId, conducted_by: profile?.id,
      lease_id: form.lease_id || null, completed_date: form.completed_date || null,
      damage_charges: form.damage_charges || 0,
    }
    const { data: wt, error } = await supabase.from('il_walkthroughs').insert(wPayload).select().single()
    if (!error && wt) {
      await supabase.from('il_walkthrough_items').insert(items.map(it=>({ ...it, walkthrough_id: wt.id, charge_amount: it.charge_amount || 0 })))
    }
    setSaving(false)
    if (!error) onSave()
  }

  const rooms = [...new Set(items.map(i=>i.room))]

  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Field label="Unit" required>
          <select className={selectCls} value={form.unit_id} onChange={e=>set('unit_id',e.target.value)}>
            <option value="">— Select unit —</option>
            {units.map(u=><option key={u.id} value={u.id}>{u.unit_number}{u.building?` (Bldg ${u.building})`:''}</option>)}
          </select>
        </Field>
        <Field label="Type">
          <select className={selectCls} value={form.walkthrough_type} onChange={e=>set('walkthrough_type',e.target.value)}>
            {WALKTHROUGH_TYPES.map(t=><option key={t} value={t}>{fmt(t)}</option>)}
          </select>
        </Field>
        <Field label="Lease (optional)">
          <select className={selectCls} value={form.lease_id} onChange={e=>handleLeaseChange(e.target.value)}>
            <option value="">— Select lease —</option>
            {leases.map(l=>{
              const t=tenants.find(t=>t.id===l.primary_tenant_id)
              return <option key={l.id} value={l.id}>{l.lease_number} — {t?`${t.first_name} ${t.last_name}`:'?'}</option>
            })}
          </select>
        </Field>
        <Field label="Date/Time">
          <input className={inputCls} type="datetime-local" value={form.completed_date} onChange={e=>set('completed_date',e.target.value)} />
        </Field>
        <Field label="Overall Condition">
          <select className={selectCls} value={form.overall_condition} onChange={e=>set('overall_condition',e.target.value)}>
            {CONDITIONS.map(c=><option key={c} value={c}>{fmt(c)}</option>)}
          </select>
        </Field>
        <div className="flex items-center gap-2 pt-6">
          <input type="checkbox" id="tp" checked={form.tenant_present} onChange={e=>set('tenant_present',e.target.checked)} className="rounded" />
          <label htmlFor="tp" className="text-sm text-slate-700">Tenant present</label>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm font-medium text-slate-700 mb-2">Room-by-Room Checklist</p>
        <div className="space-y-4">
          {rooms.map(room => (
            <div key={room}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{room}</p>
              <div className="space-y-2">
                {items.filter(i=>i.room===room).map((it,idx) => {
                  const realIdx = items.indexOf(it)
                  return (
                    <div key={realIdx} className="grid grid-cols-4 gap-2 items-center bg-slate-50 rounded-xl p-2.5">
                      <span className="text-sm text-slate-700 col-span-1">{it.item}</span>
                      <select className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-400"
                        value={it.condition} onChange={e=>setItem(realIdx,'condition',e.target.value)}>
                        {CONDITIONS.map(c=><option key={c} value={c}>{fmt(c)}</option>)}
                        <option value="damaged">Damaged</option>
                        <option value="missing">Missing</option>
                      </select>
                      <input className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-400"
                        value={it.notes} onChange={e=>setItem(realIdx,'notes',e.target.value)} placeholder="Notes…" />
                      <input type="number" className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-400"
                        value={it.charge_amount} onChange={e=>setItem(realIdx,'charge_amount',e.target.value)} placeholder="$charge" />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Total Damage Charges">
          <input className={inputCls} type="number" value={form.damage_charges} onChange={e=>set('damage_charges',e.target.value)} />
        </Field>
        <Field label="Damage Notes">
          <input className={inputCls} value={form.damage_notes} onChange={e=>set('damage_notes',e.target.value)} />
        </Field>
        <div className="col-span-2">
          <Field label="Notes"><textarea className={inputCls} rows={2} value={form.notes} onChange={e=>set('notes',e.target.value)} /></Field>
        </div>
      </div>

      <SaveCancel onSave={save} onClose={onClose} saving={saving} label="Save Walkthrough" />
    </>
  )
}

// ── Keys Tab ──────────────────────────────────────────────────

function KeysTab({ orgId, units, leases, tenants, staff }) {
  const { profile } = useAuth()
  const [keys, setKeys] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    unit_id:'', lease_id:'', tenant_id:'', key_type:'unit',
    key_identifier:'', copies_issued:1,
    issued_date: new Date().toISOString().slice(0,10), lost:false,
    replacement_fee:'', notes:'',
  })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const fetchKeys = useCallback(async () => {
    const { data } = await supabase.from('il_keys')
      .select('*, unit:il_units(unit_number), tenant:il_tenants(first_name,last_name)')
      .eq('organization_id', orgId).order('created_at', { ascending: false })
    setKeys(data || [])
  }, [orgId])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  const save = async () => {
    if (!form.unit_id) return
    setSaving(true)
    await supabase.from('il_keys').insert({
      ...form, organization_id: orgId, issued_by: profile?.id,
      lease_id: form.lease_id || null, tenant_id: form.tenant_id || null,
      replacement_fee: form.replacement_fee || null,
    })
    setShowForm(false)
    setSaving(false)
    fetchKeys()
  }

  const markReturned = async (id) => {
    await supabase.from('il_keys').update({ returned_date: new Date().toISOString().slice(0,10), returned_to: profile?.id }).eq('id', id)
    fetchKeys()
  }

  const markLost = async (id) => {
    await supabase.from('il_keys').update({ lost: true, lost_date: new Date().toISOString().slice(0,10) }).eq('id', id)
    fetchKeys()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{keys.length} key records · {keys.filter(k=>!k.returned_date && !k.lost).length} currently out</p>
        <button onClick={() => setShowForm(s=>!s)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={15} /> Issue Key
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Unit" required>
              <select className={selectCls} value={form.unit_id} onChange={e=>set('unit_id',e.target.value)}>
                <option value="">—</option>
                {units.map(u=><option key={u.id} value={u.id}>{u.unit_number}</option>)}
              </select>
            </Field>
            <Field label="Tenant">
              <select className={selectCls} value={form.tenant_id} onChange={e=>set('tenant_id',e.target.value)}>
                <option value="">—</option>
                {tenants.map(t=><option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
              </select>
            </Field>
            <Field label="Key Type">
              <select className={selectCls} value={form.key_type} onChange={e=>set('key_type',e.target.value)}>
                {KEY_TYPES.map(t=><option key={t} value={t}>{fmt(t)}</option>)}
              </select>
            </Field>
            <Field label="Key ID / Tag">
              <input className={inputCls} value={form.key_identifier} onChange={e=>set('key_identifier',e.target.value)} placeholder="K-042" />
            </Field>
            <Field label="Copies">
              <input className={inputCls} type="number" min={1} value={form.copies_issued} onChange={e=>set('copies_issued',e.target.value)} />
            </Field>
            <Field label="Issued Date">
              <input className={inputCls} type="date" value={form.issued_date} onChange={e=>set('issued_date',e.target.value)} />
            </Field>
          </div>
          <div className="flex gap-3 mt-3">
            <button onClick={save} disabled={saving||!form.unit_id}
              className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
              {saving?'Saving…':'Issue Key'}
            </button>
            <button onClick={()=>setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Unit</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Tenant</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Type</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">ID / Tag</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Issued</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">No keys issued yet.</td></tr>}
            {keys.map(k=>{
              const isOut = !k.returned_date && !k.lost
              return (
                <tr key={k.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-800">{k.unit?.unit_number}</td>
                  <td className="px-4 py-3 text-slate-600 text-sm">{k.tenant?`${k.tenant.first_name} ${k.tenant.last_name}`:'—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{fmt(k.key_type)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs font-mono">{k.key_identifier||'—'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{fmtDate(k.issued_date)}</td>
                  <td className="px-4 py-3">
                    {k.lost ? <span className="text-xs text-red-500 font-medium">Lost {fmtDate(k.lost_date)}</span>
                    : k.returned_date ? <span className="text-xs text-slate-400">Returned {fmtDate(k.returned_date)}</span>
                    : <span className="text-xs text-green-600 font-medium">Out ({k.copies_issued})</span>}
                  </td>
                  <td className="px-4 py-3">
                    {isOut && (
                      <div className="flex gap-1">
                        <button onClick={()=>markReturned(k.id)} title="Mark Returned"
                          className="p-1.5 hover:bg-green-50 hover:text-green-600 rounded-lg transition-colors text-slate-300">
                          <CheckCircle size={13} />
                        </button>
                        <button onClick={()=>markLost(k.id)} title="Mark Lost"
                          className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-slate-300">
                          <AlertTriangle size={13} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────

export default function PropertyManagement() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id
  const [tab, setTab] = useState('units')

  // Data
  const [units, setUnits]     = useState([])
  const [tenants, setTenants] = useState([])
  const [leases, setLeases]   = useState([])
  const [notices, setNotices] = useState([])
  const [staff, setStaff]     = useState([])
  const [loading, setLoading] = useState(true)

  // Unit tab state
  const [unitSearch, setUnitSearch]         = useState('')
  const [unitStatusFilter, setUnitStatusFilter] = useState('all')
  const [showUnitForm, setShowUnitForm]     = useState(false)
  const [editUnit, setEditUnit]             = useState(null)

  // Tenant tab state
  const [tenantSearch, setTenantSearch]     = useState('')
  const [showTenantForm, setShowTenantForm] = useState(false)
  const [editTenant, setEditTenant]         = useState(null)

  // Lease tab state
  const [leaseSearch, setLeaseSearch]       = useState('')
  const [leaseStatusFilter, setLeaseStatusFilter] = useState('all')
  const [showLeaseForm, setShowLeaseForm]   = useState(false)
  const [editLease, setEditLease]           = useState(null)
  const [ledgerLease, setLedgerLease]       = useState(null)

  // Notice tab state
  const [showNoticeForm, setShowNoticeForm] = useState(false)
  const [editNotice, setEditNotice]         = useState(null)

  // Walkthrough tab state
  const [walkthroughs, setWalkthroughs]     = useState([])
  const [showWTForm, setShowWTForm]         = useState(false)

  const fetchAll = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    const [uR, tR, lR, nR, wR, sR] = await Promise.all([
      supabase.from('il_units').select('*').eq('organization_id', orgId).eq('is_active', true).order('unit_number'),
      supabase.from('il_tenants').select('*').eq('organization_id', orgId).eq('is_active', true).order('last_name'),
      supabase.from('il_leases').select('*, unit:il_units(unit_number,building), tenant:il_tenants!il_leases_primary_tenant_id_fkey(first_name,last_name)').eq('organization_id', orgId).order('created_at', { ascending: false }),
      supabase.from('il_notices').select('*, unit:il_units(unit_number), tenant:il_tenants(first_name,last_name)').eq('organization_id', orgId).order('issued_date', { ascending: false }),
      supabase.from('il_walkthroughs').select('*, unit:il_units(unit_number)').eq('organization_id', orgId).order('created_at', { ascending: false }),
      supabase.from('profiles').select('id,first_name,last_name').eq('organization_id', orgId).order('first_name'),
    ])
    setUnits(uR.data || [])
    setTenants(tR.data || [])
    setLeases(lR.data || [])
    setNotices(nR.data || [])
    setWalkthroughs(wR.data || [])
    setStaff(sR.data || [])
    setLoading(false)
  }, [orgId])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Derived stats
  const stats = {
    total: units.length,
    occupied: units.filter(u=>u.status==='occupied').length,
    available: units.filter(u=>u.status==='available').length,
    openNotices: notices.filter(n=>!['resolved','withdrawn'].includes(n.status)).length,
  }
  const occupancyPct = stats.total ? Math.round((stats.occupied / stats.total) * 100) : 0

  const filteredUnits  = units.filter(u => {
    const q = unitSearch.toLowerCase()
    const match = !q || `${u.unit_number} ${u.building || ''} ${u.unit_type}`.toLowerCase().includes(q)
    const st = unitStatusFilter === 'all' || u.status === unitStatusFilter
    return match && st
  })

  const filteredTenants = tenants.filter(t => {
    const q = tenantSearch.toLowerCase()
    return !q || `${t.first_name} ${t.last_name} ${t.email || ''} ${t.phone || ''}`.toLowerCase().includes(q)
  })

  const filteredLeases = leases.filter(l => {
    const q = leaseSearch.toLowerCase()
    const name = l.tenant ? `${l.tenant.first_name} ${l.tenant.last_name}` : ''
    const match = !q || `${l.lease_number} ${name} ${l.unit?.unit_number || ''}`.toLowerCase().includes(q)
    const st = leaseStatusFilter === 'all' || l.status === leaseStatusFilter
    return match && st
  })

  const deleteUnit   = async (id) => { if (!confirm('Delete unit?')) return; await supabase.from('il_units').update({is_active:false}).eq('id',id); fetchAll() }
  const deleteTenant = async (id) => { if (!confirm('Delete tenant?')) return; await supabase.from('il_tenants').update({is_active:false}).eq('id',id); fetchAll() }
  const deleteNotice = async (id) => { if (!confirm('Delete notice?')) return; await supabase.from('il_notices').delete().eq('id',id); fetchAll() }

  const TABS = [
    { key:'units',       label:'Units',        icon: Home },
    { key:'tenants',     label:'Tenants',      icon: User },
    { key:'leases',      label:'Leases',       icon: FileText },
    { key:'keys',        label:'Keys',         icon: Key },
    { key:'walkthroughs',label:'Walkthroughs', icon: ClipboardCheck },
    { key:'notices',     label:'Notices',      icon: Bell },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800">Property Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">Independent living units, leases, rent, and notices</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Building2}   label="Total Units"   value={stats.total}    sub={`${occupancyPct}% occupied`} />
        <StatCard icon={CheckCircle} label="Occupied"      value={stats.occupied} sub="Active leases" color="text-green-600" />
        <StatCard icon={Home}        label="Available"     value={stats.available} sub="Ready to lease" color="text-blue-600" />
        <StatCard icon={ShieldAlert} label="Open Notices"  value={stats.openNotices} sub="Pending resolution" color={stats.openNotices > 0 ? 'text-red-600' : 'text-slate-400'} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab===t.key?'bg-white text-brand-700 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
              <Icon size={15} />{t.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : (

        <>
        {/* ── UNITS TAB ── */}
        {tab === 'units' && (
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <div className="relative flex-1 min-w-48">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Search units…" value={unitSearch} onChange={e=>setUnitSearch(e.target.value)} />
              </div>
              <select className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={unitStatusFilter} onChange={e=>setUnitStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                {UNIT_STATUSES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <button onClick={()=>{setEditUnit(null);setShowUnitForm(true)}}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors ml-auto">
                <Plus size={15} /> Add Unit
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUnits.map(unit => {
                const st = getUnitStatus(unit.status)
                const activeLease = leases.find(l=>l.unit_id===unit.id && l.status==='active')
                return (
                  <div key={unit.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-800 text-lg" style={{ fontFamily: '"Playfair Display", serif' }}>
                            Unit {unit.unit_number}
                          </h3>
                          {unit.building && <span className="text-xs text-slate-400">Bldg {unit.building}</span>}
                        </div>
                        <Badge color={st.color}>{st.label}</Badge>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={()=>{setEditUnit(unit);setShowUnitForm(true)}}
                          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={()=>deleteUnit(unit.id)}
                          className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-slate-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center mb-3">
                      <div className="bg-slate-50 rounded-xl p-2">
                        <p className="text-xs text-slate-400">Type</p>
                        <p className="text-xs font-medium text-slate-700 mt-0.5">{fmt(unit.unit_type)}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2">
                        <p className="text-xs text-slate-400">Rent</p>
                        <p className="text-xs font-medium text-slate-700 mt-0.5">{unit.market_rent ? `$${Number(unit.market_rent).toLocaleString()}` : '—'}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2">
                        <p className="text-xs text-slate-400">Size</p>
                        <p className="text-xs font-medium text-slate-700 mt-0.5">{unit.square_feet ? `${unit.square_feet} sf` : '—'}</p>
                      </div>
                    </div>

                    {activeLease && (
                      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-xl">
                        <User size={12} className="text-blue-500 flex-shrink-0" />
                        <span className="text-xs text-blue-700 font-medium">
                          {activeLease.tenant?.first_name} {activeLease.tenant?.last_name} · {activeLease.lease_number}
                        </span>
                        <button onClick={()=>setLedgerLease(activeLease)} className="ml-auto p-1 hover:bg-blue-100 rounded-lg transition-colors" title="View Ledger">
                          <DollarSign size={11} className="text-blue-600" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
              {filteredUnits.length === 0 && (
                <div className="col-span-3 text-center py-16 text-slate-400">
                  <Home size={36} className="mx-auto mb-3 text-slate-200" />
                  <p className="font-medium">No units found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TENANTS TAB ── */}
        {tab === 'tenants' && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="relative flex-1 max-w-sm">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Search tenants…" value={tenantSearch} onChange={e=>setTenantSearch(e.target.value)} />
              </div>
              <button onClick={()=>{setEditTenant(null);setShowTenantForm(true)}}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors ml-auto">
                <Plus size={15} /> Add Tenant
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs hidden md:table-cell">Contact</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs hidden lg:table-cell">Emergency Contact</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Background</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTenants.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-slate-400 text-sm">No tenants found.</td></tr>}
                  {filteredTenants.map(t => {
                    const activeLease = leases.find(l=>l.primary_tenant_id===t.id && l.status==='active')
                    const bgColor = {passed:'bg-green-100 text-green-700',failed:'bg-red-100 text-red-700',pending:'bg-amber-100 text-amber-700',waived:'bg-slate-100 text-slate-500'}
                    return (
                      <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{t.first_name} {t.last_name}</p>
                          {activeLease && <p className="text-xs text-brand-600 mt-0.5">{activeLease.lease_number} · Unit {activeLease.unit?.unit_number}</p>}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-slate-500 text-xs">
                          {t.email && <p>{t.email}</p>}
                          {t.phone && <p>{t.phone}</p>}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-slate-500 text-xs">
                          {t.emergency_contact_name ? <><p className="font-medium text-slate-700">{t.emergency_contact_name}</p><p>{t.emergency_contact_phone}</p></> : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {t.background_check_status
                            ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bgColor[t.background_check_status] || 'bg-slate-100 text-slate-500'}`}>{fmt(t.background_check_status)}</span>
                            : <span className="text-xs text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={()=>{setEditTenant(t);setShowTenantForm(true)}}
                              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"><Edit2 size={14}/></button>
                            <button onClick={()=>deleteTenant(t.id)}
                              className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-slate-400"><Trash2 size={14}/></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── LEASES TAB ── */}
        {tab === 'leases' && (
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <div className="relative flex-1 min-w-48">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Search leases…" value={leaseSearch} onChange={e=>setLeaseSearch(e.target.value)} />
              </div>
              <select className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={leaseStatusFilter} onChange={e=>setLeaseStatusFilter(e.target.value)}>
                <option value="all">All</option>
                {LEASE_STATUSES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <button onClick={()=>{setEditLease(null);setShowLeaseForm(true)}}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
                <Plus size={15}/> New Lease
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Lease #</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Tenant</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Unit</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs hidden lg:table-cell">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Rent</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs hidden lg:table-cell">Term</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeases.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-slate-400 text-sm">No leases found.</td></tr>}
                  {filteredLeases.map(l=>{
                    const st = getLeaseStatus(l.status)
                    return (
                      <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{l.lease_number}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{l.tenant?.first_name} {l.tenant?.last_name}</td>
                        <td className="px-4 py-3 text-slate-600">{l.unit?.unit_number}{l.unit?.building?` (${l.unit.building})`:''}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">{fmt(l.lease_type)}</td>
                        <td className="px-4 py-3 font-semibold text-slate-700">{fmtMoney(l.monthly_rent)}<span className="font-normal text-slate-400 text-xs">/mo</span></td>
                        <td className="px-4 py-3"><Badge color={st.color}>{st.label}</Badge></td>
                        <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">
                          {fmtDate(l.start_date)} — {l.end_date ? fmtDate(l.end_date) : 'M-to-M'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={()=>setLedgerLease(l)} title="Rent Ledger"
                              className="p-1.5 hover:bg-green-50 hover:text-green-600 rounded-lg transition-colors text-slate-300">
                              <DollarSign size={14}/>
                            </button>
                            <button onClick={()=>{setEditLease(l);setShowLeaseForm(true)}}
                              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"><Edit2 size={14}/></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── KEYS TAB ── */}
        {tab === 'keys' && (
          <KeysTab orgId={orgId} units={units} leases={leases} tenants={tenants} staff={staff} />
        )}

        {/* ── WALKTHROUGHS TAB ── */}
        {tab === 'walkthroughs' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-slate-500">{walkthroughs.length} walkthroughs on record</p>
              <button onClick={()=>setShowWTForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
                <Plus size={15}/> New Walkthrough
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {walkthroughs.length === 0 && (
                <div className="col-span-3 text-center py-16 text-slate-400">
                  <ClipboardCheck size={36} className="mx-auto mb-3 text-slate-200" />
                  <p className="font-medium">No walkthroughs recorded yet</p>
                </div>
              )}
              {walkthroughs.map(wt=>(
                <div key={wt.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-brand-600 uppercase tracking-wide">{fmt(wt.walkthrough_type)}</span>
                    <span className="text-xs text-slate-400">{fmtDate(wt.completed_date?.slice(0,10))}</span>
                  </div>
                  <h3 className="font-semibold text-slate-800">Unit {wt.unit?.unit_number}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    {wt.overall_condition && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        wt.overall_condition==='excellent'?'bg-green-100 text-green-700':
                        wt.overall_condition==='good'?'bg-blue-100 text-blue-700':
                        wt.overall_condition==='fair'?'bg-amber-100 text-amber-700':
                        'bg-red-100 text-red-700'}`}>
                        {fmt(wt.overall_condition)}
                      </span>
                    )}
                    {wt.tenant_present && <span className="text-xs text-slate-400">Tenant present</span>}
                  </div>
                  {wt.damage_charges > 0 && (
                    <p className="text-xs text-red-600 font-medium mt-2">Damage charges: {fmtMoney(wt.damage_charges)}</p>
                  )}
                  {wt.notes && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{wt.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── NOTICES TAB ── */}
        {tab === 'notices' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-slate-500">{notices.length} notices · {notices.filter(n=>!['resolved','withdrawn'].includes(n.status)).length} open</p>
              <button onClick={()=>{setEditNotice(null);setShowNoticeForm(true)}}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
                <Plus size={15}/> Issue Notice
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Tenant</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs hidden md:table-cell">Unit</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs hidden lg:table-cell">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs hidden lg:table-cell">Issued</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs hidden xl:table-cell">Deadline</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {notices.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-slate-400 text-sm">No notices issued.</td></tr>}
                  {notices.map(n=>{
                    const nt = NOTICE_TYPES.find(t=>t.key===n.notice_type)
                    const ns = getNoticeStatus(n.status)
                    const isOpen = !['resolved','withdrawn'].includes(n.status)
                    return (
                      <tr key={n.id} className={`border-b border-slate-50 hover:bg-slate-50/50 ${isOpen && n.status==='escalated'?'bg-red-50/30':''}`}>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold ${isOpen?'text-slate-800':'text-slate-400'}`}>{nt?.label || fmt(n.notice_type)}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">{n.tenant?.first_name} {n.tenant?.last_name}</td>
                        <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{n.unit?.unit_number}</td>
                        <td className="px-4 py-3 text-slate-700 font-medium hidden lg:table-cell">{n.amount_owed ? fmtMoney(n.amount_owed) : '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ns.color}`}>{ns.label}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">{fmtDate(n.issued_date)}</td>
                        <td className="px-4 py-3 text-xs hidden xl:table-cell">
                          {n.cure_deadline ? (
                            <span className={new Date(n.cure_deadline) < new Date() ? 'text-red-500 font-medium' : 'text-slate-500'}>
                              {fmtDate(n.cure_deadline)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={()=>{setEditNotice(n);setShowNoticeForm(true)}}
                              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"><Edit2 size={14}/></button>
                            <button onClick={()=>deleteNotice(n.id)}
                              className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-slate-400"><Trash2 size={14}/></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </>
      )}

      {/* ── Modals ── */}
      {showUnitForm && (
        <Modal title={editUnit?'Edit Unit':'Add Unit'} onClose={()=>setShowUnitForm(false)} wide>
          <UnitForm unit={editUnit} orgId={orgId} onSave={()=>{setShowUnitForm(false);fetchAll()}} onClose={()=>setShowUnitForm(false)} />
        </Modal>
      )}
      {showTenantForm && (
        <Modal title={editTenant?'Edit Tenant':'Add Tenant'} onClose={()=>setShowTenantForm(false)} wide>
          <TenantForm tenant={editTenant} orgId={orgId} onSave={()=>{setShowTenantForm(false);fetchAll()}} onClose={()=>setShowTenantForm(false)} />
        </Modal>
      )}
      {showLeaseForm && (
        <Modal title={editLease?'Edit Lease':'New Lease'} onClose={()=>setShowLeaseForm(false)} wide>
          <LeaseForm lease={editLease} units={units} tenants={tenants} orgId={orgId} onSave={()=>{setShowLeaseForm(false);fetchAll()}} onClose={()=>setShowLeaseForm(false)} />
        </Modal>
      )}
      {ledgerLease && <LedgerModal lease={ledgerLease} onClose={()=>setLedgerLease(null)} />}
      {showNoticeForm && (
        <Modal title={editNotice?'Edit Notice':'Issue Notice'} onClose={()=>setShowNoticeForm(false)} wide>
          <NoticeForm leases={leases} tenants={tenants} units={units} orgId={orgId} notice={editNotice}
            onSave={()=>{setShowNoticeForm(false);fetchAll()}} onClose={()=>setShowNoticeForm(false)} />
        </Modal>
      )}
      {showWTForm && (
        <Modal title="New Walkthrough" onClose={()=>setShowWTForm(false)} extraWide>
          <WalkthroughForm units={units} leases={leases} tenants={tenants} orgId={orgId}
            onSave={()=>{setShowWTForm(false);fetchAll()}} onClose={()=>setShowWTForm(false)} />
        </Modal>
      )}
    </div>
  )
}
