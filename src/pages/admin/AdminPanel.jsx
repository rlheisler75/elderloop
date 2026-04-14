import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Users, Building2, Settings, Plus, X, Edit2, Trash2,
  Search, Shield, Check, Mail, Key, ToggleLeft, ToggleRight,
  ChevronRight, AlertCircle, CheckCircle2, Clock, Ban,
  Save, Eye, EyeOff, Globe, Phone, MapPin, User, List
} from 'lucide-react'
import AdminLists from './AdminLists'
import UserPermissions from './UserPermissions'

const ALL_ROLES = [
  { key: 'ceo',         label: 'CEO',         desc: 'Executive dashboard + full access' },
  { key: 'org_admin',   label: 'Org Admin',   desc: 'Full access to organization' },
  { key: 'manager',     label: 'Manager',     desc: 'Department management' },
  { key: 'supervisor',  label: 'Supervisor',  desc: 'Manage staff and approve work' },
  { key: 'maintenance', label: 'Maintenance', desc: 'Work orders access' },
  { key: 'dietary',     label: 'Dietary',     desc: 'Dietary module access' },
  { key: 'housekeeping',label: 'Housekeeping',desc: 'Housekeeping module access' },
  { key: 'nursing',     label: 'Nursing',     desc: 'Clinical access' },
  { key: 'staff',       label: 'Staff',       desc: 'General staff — module access assigned separately' },
  { key: 'resident',    label: 'Resident',    desc: 'Resident portal access' },
  { key: 'family',      label: 'Family',      desc: 'Family portal access' },
]

const ALL_MODULES = [
  { key: 'communication', label: 'Communication' },
  { key: 'work_orders',   label: 'Work Orders' },
  { key: 'dietary',       label: 'Dietary' },
  { key: 'housekeeping',  label: 'Housekeeping' },
  { key: 'chapel',        label: 'Chapel' },
]

const BILLING_STATUSES = [
  { key: 'pilot',     label: 'Pilot',     color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { key: 'active',    label: 'Active',    color: 'bg-green-100 text-green-700 border-green-200' },
  { key: 'past_due',  label: 'Past Due',  color: 'bg-red-100 text-red-700 border-red-200' },
  { key: 'cancelled', label: 'Cancelled', color: 'bg-slate-100 text-slate-500 border-slate-200' },
]

const getBilling = (key) => BILLING_STATUSES.find(b => b.key === key) || BILLING_STATUSES[0]

// ── Create User Modal ──────────────────────────────────────────
function CreateUserModal({ orgId, orgName, onClose, onSave }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    email: '', password: '', first_name: '', last_name: '',
    role: 'staff', phone: '', unit: ''
  })
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.email.trim() || !form.password.trim() || !form.first_name.trim()) {
      setError('Email, password and first name are required'); return
    }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setSaving(true)

    // Step 1 — create the auth account
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          first_name: form.first_name.trim(),
          last_name:  form.last_name.trim(),
        }
      }
    })

    if (signUpErr) { setError(signUpErr.message); setSaving(false); return }
    if (!signUpData.user) { setError('User creation failed — try again'); setSaving(false); return }

    // Step 2 — update their profile with org + role
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id:              signUpData.user.id,
      organization_id: orgId,
      role:            form.role,
      first_name:      form.first_name.trim(),
      last_name:       form.last_name.trim(),
      phone:           form.phone || null,
      is_active:       true,
      updated_at:      new Date().toISOString(),
    })

    if (profileErr) { setError('Account created but profile setup failed: ' + profileErr.message); setSaving(false); return }

    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-display font-semibold text-slate-800">Create New User</h2>
            <p className="text-xs text-slate-400 mt-0.5">{orgName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">First Name *</label>
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Last Name</label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email *</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="staff@example.com" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Password *</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Min 8 characters" />
              <button onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_ROLES.map(r => (
                <button key={r.key} onClick={() => set('role', r.key)}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${form.role === r.key ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 text-slate-600 hover:border-brand-300'}`}>
                  <div className="font-medium">{r.label}</div>
                  <div className={`mt-0.5 ${form.role === r.key ? 'text-brand-200' : 'text-slate-400'}`}>{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Phone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Optional" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit User Modal ────────────────────────────────────────────
function EditUserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    first_name: user.first_name || '',
    last_name:  user.last_name  || '',
    role:       user.role       || 'staff',
    phone:      user.phone      || '',
    is_active:  user.is_active  ?? true,
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('profiles').update({
      first_name: form.first_name, last_name: form.last_name,
      role: form.role, phone: form.phone || null, is_active: form.is_active,
      updated_at: new Date().toISOString()
    }).eq('id', user.id)
    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800">Edit User</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">First Name</label>
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Last Name</label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_ROLES.map(r => (
                <button key={r.key} onClick={() => set('role', r.key)}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${form.role === r.key ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 text-slate-600 hover:border-brand-300'}`}>
                  <div className="font-medium">{r.label}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Phone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer p-3 border border-slate-200 rounded-xl">
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)}
              className="w-4 h-4 rounded text-brand-600" />
            <div>
              <div className="text-sm font-medium text-slate-700">Active Account</div>
              <div className="text-xs text-slate-400">Uncheck to disable login without deleting</div>
            </div>
          </label>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Org Settings Modal ─────────────────────────────────────────
function OrgSettingsModal({ org, modules, onClose, onSave }) {
  const [form, setForm] = useState({
    name:           org.name           || '',
    address:        org.address        || '',
    city:           org.city           || '',
    state:          org.state          || '',
    zip:            org.zip            || '',
    phone:          org.phone          || '',
    contact_name:   org.contact_name   || '',
    contact_email:  org.contact_email  || '',
    billing_status: org.billing_status || 'pilot',
    billing_note:   org.billing_note   || '',
  })
  const [enabledModules, setEnabledModules] = useState(modules.map(m => m.module_key))
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleModule = (key) => setEnabledModules(m =>
    m.includes(key) ? m.filter(k => k !== key) : [...m, key])

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('organizations').update({ ...form, updated_at: new Date().toISOString() }).eq('id', org.id)

    // Sync modules
    for (const mod of ALL_MODULES) {
      const enabled = enabledModules.includes(mod.key)
      const exists  = modules.find(m => m.module_key === mod.key)
      if (exists) {
        await supabase.from('organization_modules').update({ is_enabled: enabled })
          .eq('organization_id', org.id).eq('module_key', mod.key)
      } else if (enabled) {
        await supabase.from('organization_modules').insert({ organization_id: org.id, module_key: mod.key, is_enabled: true })
      }
    }
    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800">Organization Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Organization Name</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Contact Name</label>
              <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="CEO / Administrator" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Contact Email</label>
              <input value={form.contact_email} onChange={e => set('contact_email', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Address</label>
            <input value={form.address} onChange={e => set('address', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 mb-2" placeholder="Street address" />
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <input value={form.city} onChange={e => set('city', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="City" />
              </div>
              <input value={form.state} onChange={e => set('state', e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="State" />
              <input value={form.zip} onChange={e => set('zip', e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="ZIP" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Phone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Enabled Modules</label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_MODULES.map(m => (
                <button key={m.key} onClick={() => toggleModule(m.key)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${enabledModules.includes(m.key) ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 text-slate-500 hover:border-brand-300'}`}>
                  {enabledModules.includes(m.key) ? <Check size={14} /> : <div className="w-3.5 h-3.5" />}
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Billing Status</label>
            <div className="flex gap-2 flex-wrap">
              {BILLING_STATUSES.map(b => (
                <button key={b.key} onClick={() => set('billing_status', b.key)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${form.billing_status === b.key ? b.color + ' ring-2 ring-offset-1 ring-brand-400' : 'border-slate-200 text-slate-500'}`}>
                  {b.label}
                </button>
              ))}
            </div>
            <input value={form.billing_note} onChange={e => set('billing_note', e.target.value)}
              className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Billing notes (e.g. founding customer discount)" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── New Org Modal ──────────────────────────────────────────────
function NewOrgModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', city: '', state: '', contact_name: '', contact_email: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Organization name is required'); return }
    setSaving(true)
    const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const { data: org, error: err } = await supabase.from('organizations').insert({
      name: form.name.trim(), slug, city: form.city, state: form.state,
      contact_name: form.contact_name, contact_email: form.contact_email,
      billing_status: 'pilot', is_active: true
    }).select().single()
    if (err) { setError(err.message); setSaving(false); return }
    // Enable all modules by default
    await supabase.from('organization_modules').insert(
      ALL_MODULES.map(m => ({ organization_id: org.id, module_key: m.key, is_enabled: true }))
    )
    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-display font-semibold text-slate-800">Add New Organization</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Organization Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Sunrise Senior Living" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">City</label>
              <input value={form.city} onChange={e => set('city', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">State</label>
              <input value={form.state} onChange={e => set('state', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="MO" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Contact Name</label>
            <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="CEO / Administrator" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Contact Email</label>
            <input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Creating...' : 'Create Organization'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Admin Panel ───────────────────────────────────────────
export default function AdminPanel() {
  const { profile, organization, isSuperAdmin } = useAuth()
  const [tab, setTab]             = useState('users')
  const [orgs, setOrgs]           = useState([])
  const [users, setUsers]         = useState([])
  const [orgModules, setOrgModules] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [selectedOrg, setSelectedOrg] = useState(null)

  // Modals
  const [showCreateUser, setShowCreateUser]   = useState(false)
  const [showEditUser, setShowEditUser]       = useState(false)
  const [editingUser, setEditingUser]         = useState(null)
  const [showOrgSettings, setShowOrgSettings] = useState(false)
  const [editingOrg, setEditingOrg]           = useState(null)
  const [showNewOrg, setShowNewOrg]           = useState(false)

  const superAdmin = isSuperAdmin()
  const currentOrgId = selectedOrg?.id || organization?.id

  useEffect(() => { fetchAll() }, [organization])
  useEffect(() => { if (currentOrgId) fetchUsers() }, [currentOrgId])

  async function fetchAll() {
    setLoading(true)
    if (superAdmin) {
      const { data } = await supabase.from('organizations').select('*').eq('is_active', true).order('name')
      setOrgs(data || [])
      if (!selectedOrg && data?.length) setSelectedOrg(data.find(o => o.id === organization?.id) || data[0])
    } else {
      setOrgs([organization])
      setSelectedOrg(organization)
    }
    setLoading(false)
  }

  async function fetchUsers() {
    const [usersRes, modulesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('organization_id', currentOrgId).order('last_name'),
      supabase.from('organization_modules').select('*').eq('organization_id', currentOrgId),
    ])
    setUsers(usersRes.data || [])
    setOrgModules(modulesRes.data || [])
  }

  const handleDeactivate = async (userId) => {
    if (!confirm('Deactivate this user? They will no longer be able to log in.')) return
    await supabase.from('profiles').update({ is_active: false }).eq('id', userId)
    fetchUsers()
  }

  const filteredUsers = users.filter(u =>
    !search || `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase())
  )

  const tabs = [
    { key: 'users',        label: 'Users',              icon: Users },
    { key: 'permissions',  label: 'Module Access',      icon: Shield },
    { key: 'settings',     label: 'Org Settings',       icon: Settings },
    { key: 'lists',        label: 'Lists & Pick Lists', icon: List },
    ...(superAdmin ? [{ key: 'organizations', label: 'All Organizations', icon: Building2 }] : []),
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800">Admin Panel</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {superAdmin ? 'Super Admin — Platform Management' : `${organization?.name} — Organization Admin`}
          </p>
        </div>
        {superAdmin && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 border border-purple-200 rounded-xl">
            <Shield size={14} className="text-purple-600" />
            <span className="text-xs font-semibold text-purple-700">Super Admin</span>
          </div>
        )}
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

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <div>
          {/* Org selector for super admin */}
          {superAdmin && orgs.length > 1 && (
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Viewing Organization</label>
              <div className="flex gap-2 flex-wrap">
                {orgs.map(o => (
                  <button key={o.id} onClick={() => setSelectedOrg(o)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${selectedOrg?.id === o.id ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 text-slate-600 hover:border-brand-300'}`}>
                    {o.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <button onClick={() => setShowCreateUser(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors flex-shrink-0">
              <Plus size={15} /> Add User
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Joined</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-semibold flex-shrink-0">
                          {u.first_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800 text-sm">{u.first_name} {u.last_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-100 font-medium capitalize">
                        {u.role?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{u.phone || '—'}</td>
                    <td className="px-4 py-3">
                      {u.is_active !== false
                        ? <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle2 size={13} /> Active</span>
                        : <span className="flex items-center gap-1 text-xs text-slate-400 font-medium"><Ban size={13} /> Inactive</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => { setEditingUser(u); setShowEditUser(true) }}
                          className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors"><Edit2 size={14} /></button>
                        {u.id !== profile?.id && u.is_active !== false && (
                          <button onClick={() => handleDeactivate(u.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"><Ban size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-xs text-slate-400 text-right">{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</div>
        </div>
      )}

      {/* ── SETTINGS TAB ── */}
      {tab === 'settings' && selectedOrg && (
        <div className="space-y-6">
          {/* Org card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-display font-semibold text-slate-800 text-lg">{selectedOrg.name}</h2>
                <p className="text-slate-400 text-sm mt-0.5">{[selectedOrg.city, selectedOrg.state].filter(Boolean).join(', ')}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${getBilling(selectedOrg.billing_status).color}`}>
                  {getBilling(selectedOrg.billing_status).label}
                </span>
                <button onClick={() => { setEditingOrg(selectedOrg); setShowOrgSettings(true) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600 rounded-lg text-sm font-medium transition-colors">
                  <Edit2 size={13} /> Edit
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              {selectedOrg.contact_name && (
                <div className="flex items-center gap-2 text-slate-600">
                  <User size={14} className="text-slate-400 flex-shrink-0" />
                  {selectedOrg.contact_name}
                </div>
              )}
              {selectedOrg.contact_email && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail size={14} className="text-slate-400 flex-shrink-0" />
                  {selectedOrg.contact_email}
                </div>
              )}
              {selectedOrg.phone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone size={14} className="text-slate-400 flex-shrink-0" />
                  {selectedOrg.phone}
                </div>
              )}
              {selectedOrg.address && (
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                  {selectedOrg.address}
                </div>
              )}
            </div>

            {selectedOrg.billing_note && (
              <div className="mt-4 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                {selectedOrg.billing_note}
              </div>
            )}
          </div>

          {/* Modules */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-display font-semibold text-slate-800 mb-4">Active Modules</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ALL_MODULES.map(m => {
                const enabled = orgModules.find(om => om.module_key === m.key)?.is_enabled
                return (
                  <div key={m.key} className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium ${enabled ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                    {enabled ? <Check size={15} className="text-green-500" /> : <X size={15} className="text-slate-300" />}
                    {m.label}
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-slate-400 mt-3">Click Edit above to toggle modules on or off.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Users',    value: users.length },
              { label: 'Active Users',   value: users.filter(u => u.is_active !== false).length },
              { label: 'Modules Active', value: orgModules.filter(m => m.is_enabled).length },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
                <div className="font-display text-3xl font-bold text-brand-600">{s.value}</div>
                <div className="text-slate-500 text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PERMISSIONS TAB ── */}
      {tab === 'permissions' && (
        <UserPermissions
          orgId={currentOrgId}
          orgModules={orgModules.map(m => m.module_key || m).filter(Boolean)} />
      )}

      {/* ── LISTS TAB ── */}
      {tab === 'lists' && (
        <AdminLists orgId={currentOrgId} />
      )}

      {/* ── ALL ORGS TAB (super admin only) ── */}
      {tab === 'organizations' && superAdmin && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500">{orgs.length} organization{orgs.length !== 1 ? 's' : ''} on platform</p>
            <button onClick={() => setShowNewOrg(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
              <Plus size={15} /> Add Organization
            </button>
          </div>
          <div className="space-y-3">
            {orgs.map(o => {
              const billing = getBilling(o.billing_status)
              return (
                <div key={o.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                    <Building2 size={18} className="text-brand-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-semibold text-slate-800">{o.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${billing.color}`}>{billing.label}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {[o.city, o.state].filter(Boolean).join(', ')}
                      {o.contact_name && ` · ${o.contact_name}`}
                    </div>
                    {o.billing_note && <div className="text-xs text-blue-600 mt-0.5 italic">{o.billing_note}</div>}
                  </div>
                  <button onClick={() => { setEditingOrg(o); setShowOrgSettings(true) }}
                    className="p-2 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors flex-shrink-0">
                    <Settings size={16} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateUser && (
        <CreateUserModal
          orgId={currentOrgId}
          orgName={selectedOrg?.name || organization?.name}
          onClose={() => setShowCreateUser(false)}
          onSave={() => { setShowCreateUser(false); fetchUsers() }} />
      )}
      {showEditUser && editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => { setShowEditUser(false); setEditingUser(null) }}
          onSave={() => { setShowEditUser(false); setEditingUser(null); fetchUsers() }} />
      )}
      {showOrgSettings && editingOrg && (
        <OrgSettingsModal
          org={editingOrg}
          modules={orgModules}
          onClose={() => { setShowOrgSettings(false); setEditingOrg(null) }}
          onSave={() => { setShowOrgSettings(false); setEditingOrg(null); fetchAll(); fetchUsers() }} />
      )}
      {showNewOrg && (
        <NewOrgModal
          onClose={() => setShowNewOrg(false)}
          onSave={() => { setShowNewOrg(false); fetchAll() }} />
      )}
    </div>
  )
}
