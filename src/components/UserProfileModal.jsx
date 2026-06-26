// src/components/UserProfileModal.jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  X, User, Lock, Bell, Save, Eye, EyeOff,
  CheckCircle2, AlertCircle
} from 'lucide-react'

const TABS = [
  { key: 'profile',       label: 'Profile',       icon: User },
  { key: 'password',      label: 'Password',      icon: Lock },
  { key: 'notifications', label: 'Notifications', icon: Bell },
]

function TabBtn({ tab, active, onClick }) {
  const Icon = tab.icon
  return (
    <button
      onClick={() => onClick(tab.key)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
        active
          ? 'bg-white text-brand-700 shadow-sm'
          : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      <Icon size={15} />
      {tab.label}
    </button>
  )
}

function Toast({ type, message }) {
  if (!message) return null
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm mb-4 ${
      type === 'success'
        ? 'bg-green-50 border border-green-200 text-green-700'
        : 'bg-red-50 border border-red-200 text-red-700'
    }`}>
      {type === 'success'
        ? <CheckCircle2 size={15} className="flex-shrink-0" />
        : <AlertCircle size={15} className="flex-shrink-0" />}
      {message}
    </div>
  )
}

// ── Profile Tab ────────────────────────────────────────────────
function ProfileTab({ profile }) {
  const [form, setForm] = useState({
    first_name: profile?.first_name || '',
    last_name:  profile?.last_name  || '',
    phone:      profile?.phone      || '',
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.first_name.trim()) {
      setToast({ type: 'error', message: 'First name is required' }); return
    }
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      first_name:  form.first_name.trim(),
      last_name:   form.last_name.trim(),
      phone:       form.phone.trim() || null,
      updated_at:  new Date().toISOString(),
    }).eq('id', profile.id)

    setSaving(false)
    if (error) {
      setToast({ type: 'error', message: error.message })
    } else {
      setToast({ type: 'success', message: 'Profile updated successfully' })
      setTimeout(() => setToast(null), 3000)
    }
  }

  const inputCls = 'w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
  const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5'

  return (
    <div className="space-y-4">
      <Toast {...(toast || {})} message={toast?.message} />

      {/* Avatar */}
      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
        <div className="w-14 h-14 rounded-full bg-brand-600 flex items-center justify-center text-white font-display font-bold text-xl flex-shrink-0">
          {form.first_name?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <div className="font-semibold text-slate-800">{form.first_name} {form.last_name}</div>
          <div className="text-xs text-slate-400 capitalize mt-0.5">
            {profile?.role?.replace(/_/g, ' ')} · {profile?.email}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>First Name *</label>
          <input value={form.first_name} onChange={e => set('first_name', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Last Name</label>
          <input value={form.last_name} onChange={e => set('last_name', e.target.value)} className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Phone</label>
        <input value={form.phone} onChange={e => set('phone', e.target.value)}
          placeholder="Your mobile number" className={inputCls} />
        <p className="text-xs text-slate-400 mt-1">Used for SMS notifications if enabled</p>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-colors">
        <Save size={15} />
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  )
}

// ── Password Tab ───────────────────────────────────────────────
function PasswordTab() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [show, setShow]   = useState({ current: false, next: false, confirm: false })
  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleShow = (k) => setShow(s => ({ ...s, [k]: !s[k] }))

  const strength = (() => {
    const p = form.next
    if (!p) return 0
    let score = 0
    if (p.length >= 8)  score++
    if (p.length >= 12) score++
    if (/[A-Z]/.test(p)) score++
    if (/[0-9]/.test(p)) score++
    if (/[^A-Za-z0-9]/.test(p)) score++
    return score
  })()

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'][strength]
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-yellow-400', 'bg-green-400', 'bg-green-500'][strength]

  const handleSave = async () => {
    if (!form.current) { setToast({ type: 'error', message: 'Current password is required' }); return }
    if (form.next.length < 8) { setToast({ type: 'error', message: 'New password must be at least 8 characters' }); return }
    if (form.next !== form.confirm) { setToast({ type: 'error', message: 'Passwords do not match' }); return }

    setSaving(true)
    // Re-authenticate then update
    const { data: { user } } = await supabase.auth.getUser()
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: form.current,
    })
    if (signInErr) {
      setToast({ type: 'error', message: 'Current password is incorrect' })
      setSaving(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: form.next })
    setSaving(false)
    if (error) {
      setToast({ type: 'error', message: error.message })
    } else {
      setToast({ type: 'success', message: 'Password updated successfully' })
      setForm({ current: '', next: '', confirm: '' })
      setTimeout(() => setToast(null), 3000)
    }
  }

  const inputCls = 'w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
  const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5'

  const PasswordField = ({ label, field, placeholder }) => (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <input
          type={show[field] ? 'text' : 'password'}
          value={form[field]}
          onChange={e => set(field, e.target.value)}
          placeholder={placeholder}
          className={inputCls}
        />
        <button
          onClick={() => toggleShow(field)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {show[field] ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <Toast {...(toast || {})} message={toast?.message} />

      <PasswordField label="Current Password" field="current" placeholder="Your current password" />
      <PasswordField label="New Password" field="next" placeholder="Min 8 characters" />

      {/* Strength meter */}
      {form.next && (
        <div>
          <div className="flex gap-1 mb-1">
            {[1,2,3,4,5].map(i => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? strengthColor : 'bg-slate-200'}`} />
            ))}
          </div>
          <p className="text-xs text-slate-400">{strengthLabel}</p>
        </div>
      )}

      <PasswordField label="Confirm New Password" field="confirm" placeholder="Repeat new password" />

      <button onClick={handleSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-colors">
        <Lock size={15} />
        {saving ? 'Updating...' : 'Update Password'}
      </button>
    </div>
  )
}

// ── Notifications Tab ──────────────────────────────────────────
function NotificationsTab({ profile }) {
  const prefs = profile?.notification_prefs || {}
  const [form, setForm] = useState({
    push_enabled:  prefs.push_enabled  ?? true,
    email_enabled: prefs.email_enabled ?? true,
    sms_enabled:   prefs.sms_enabled   ?? false,
    // Category toggles
    push_urgent:   prefs.push_urgent   ?? true,
    push_general:  prefs.push_general  ?? true,
    email_urgent:  prefs.email_urgent  ?? true,
    email_general: prefs.email_general ?? false,
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      notification_prefs: form,
      updated_at: new Date().toISOString(),
    }).eq('id', profile.id)
    setSaving(false)
    if (error) {
      setToast({ type: 'error', message: error.message })
    } else {
      setToast({ type: 'success', message: 'Notification preferences saved' })
      setTimeout(() => setToast(null), 3000)
    }
  }

  const Toggle = ({ label, desc, field, disabled, disabledMsg }) => (
    <div className={`flex items-start justify-between gap-4 py-3 ${disabled ? 'opacity-50' : ''}`}>
      <div>
        <div className="text-sm font-medium text-slate-700">{label}</div>
        <div className="text-xs text-slate-400 mt-0.5">{disabled ? disabledMsg : desc}</div>
      </div>
      <button
        disabled={disabled}
        onClick={() => !disabled && set(field, !form[field])}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${form[field] && !disabled ? 'bg-brand-600' : 'bg-slate-200'}`}
      >
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form[field] && !disabled ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  )

  return (
    <div className="space-y-4">
      <Toast {...(toast || {})} message={toast?.message} />

      {/* Push */}
      <div className="bg-slate-50 rounded-xl p-4">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">In-App Notifications</div>
        <div className="divide-y divide-slate-200">
          <Toggle label="Push notifications" desc="Receive alerts in the app" field="push_enabled" />
          <Toggle label="Urgent alerts" desc="Emergency and urgent broadcasts" field="push_urgent" disabled={!form.push_enabled} disabledMsg="Enable push notifications first" />
          <Toggle label="General messages" desc="Announcements and reminders" field="push_general" disabled={!form.push_enabled} disabledMsg="Enable push notifications first" />
        </div>
      </div>

      {/* Email */}
      <div className="bg-slate-50 rounded-xl p-4">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Email Notifications</div>
        <div className="divide-y divide-slate-200">
          <Toggle label="Email notifications" desc="Receive messages at your email address" field="email_enabled" />
          <Toggle label="Urgent alerts only" desc="Only urgent/emergency broadcasts" field="email_urgent" disabled={!form.email_enabled} disabledMsg="Enable email notifications first" />
          <Toggle label="General messages" desc="All broadcast categories" field="email_general" disabled={!form.email_enabled} disabledMsg="Enable email notifications first" />
        </div>
      </div>

      {/* SMS */}
      <div className="bg-slate-50 rounded-xl p-4">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">SMS Notifications</div>
        <Toggle
          label="SMS text messages"
          desc={profile?.phone ? `Sent to ${profile.phone}` : 'Add a phone number in the Profile tab first'}
          field="sms_enabled"
          disabled={!profile?.phone}
          disabledMsg="Add a phone number in the Profile tab first"
        />
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-colors">
        <Save size={15} />
        {saving ? 'Saving...' : 'Save Preferences'}
      </button>
    </div>
  )
}

// ── Main Modal ─────────────────────────────────────────────────
export default function UserProfileModal({ onClose }) {
  const { profile } = useAuth()
  const [tab, setTab] = useState('profile')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800">My Account</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mx-6 mt-4 mb-2 bg-slate-100 p-1 rounded-xl flex-shrink-0">
          {TABS.map(t => (
            <TabBtn key={t.key} tab={t} active={tab === t.key} onClick={setTab} />
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === 'profile'       && <ProfileTab       profile={profile} />}
          {tab === 'password'      && <PasswordTab />}
          {tab === 'notifications' && <NotificationsTab profile={profile} />}
        </div>
      </div>
    </div>
  )
}
