// src/components/UserProfileModal.jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePushNotifications } from '../hooks/usePushNotifications'
import {
  X, User, Lock, Bell, Save, Eye, EyeOff,
  CheckCircle2, AlertCircle, Mail, Smartphone, Loader2
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
          ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-400 shadow-sm'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
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
        ? 'bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-900 text-green-700 dark:text-green-400'
        : 'bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400'
    }`}>
      {type === 'success'
        ? <CheckCircle2 size={15} className="flex-shrink-0" />
        : <AlertCircle size={15} className="flex-shrink-0" />}
      {message}
    </div>
  )
}

// ── Profile Tab ────────────────────────────────────────────────
function ProfileTab({ profile, refreshProfile }) {
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
      await refreshProfile?.()
      setToast({ type: 'success', message: 'Profile updated successfully' })
      setTimeout(() => setToast(null), 3000)
    }
  }

  const inputCls = 'w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-800 dark:text-slate-100'
  const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5'

  return (
    <div className="space-y-4">
      <Toast {...(toast || {})} message={toast?.message} />

      {/* Avatar */}
      <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
        <div className="w-14 h-14 rounded-full bg-brand-600 flex items-center justify-center text-white font-display font-bold text-xl flex-shrink-0">
          {form.first_name?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-100">{form.first_name} {form.last_name}</div>
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

  const inputCls = 'w-full px-3 py-2.5 pr-10 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-800 dark:text-slate-100'
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
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
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
              <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? strengthColor : 'bg-slate-200 dark:bg-slate-700'}`} />
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
function NotificationsTab({ profile, refreshProfile }) {
  const { permission, subscribed, loading: pushLoading, supported, subscribe, unsubscribe } = usePushNotifications(profile?.id)
  const [notifyEmail, setNotifyEmail] = useState(profile?.notify_email ?? true)
  const [notifyPush,  setNotifyPush]  = useState(profile?.notify_push  ?? true)
  const [saving, setSaving] = useState('')
  const [toast, setToast]   = useState(null)

  const saveField = async (field, value) => {
    setSaving(field)
    const { error } = await supabase.from('profiles').update({
      [field]: value, updated_at: new Date().toISOString(),
    }).eq('id', profile.id)
    setSaving('')
    if (error) { setToast({ type: 'error', message: error.message }); return }
    await refreshProfile?.()
  }

  const handleNotifyEmail = (val) => { setNotifyEmail(val); saveField('notify_email', val) }

  const handleNotifyPush = async (val) => {
    setNotifyPush(val)
    await saveField('notify_push', val)
    if (val && supported && !subscribed) await subscribe()
    if (!val && subscribed) await unsubscribe()
  }

  const Toggle = ({ checked, onChange, disabled }) => (
    <button onClick={() => !disabled && onChange(!checked)} disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-700'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  )

  return (
    <div className="space-y-4">
      <Toast {...(toast || {})} message={toast?.message} />

      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Mail size={18} className="text-slate-400 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Notifications</div>
              <div className="text-xs text-slate-400">Receive messages and alerts by email</div>
            </div>
          </div>
          <Toggle checked={notifyEmail} onChange={handleNotifyEmail} disabled={saving === 'notify_email'} />
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Smartphone size={18} className="text-slate-400 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Push Notifications</div>
              <div className="text-xs text-slate-400">
                Receive alerts in the app and on this device
                {notifyPush && supported && !subscribed && permission !== 'denied' && ' — finishing device setup...'}
                {notifyPush && permission === 'denied' && ' — blocked in browser settings'}
              </div>
            </div>
          </div>
          {pushLoading
            ? <Loader2 size={18} className="animate-spin text-slate-400" />
            : <Toggle checked={notifyPush} onChange={handleNotifyPush} disabled={saving === 'notify_push'} />
          }
        </div>
        {!supported && (
          <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg px-3 py-2 mt-3">
            This browser/device doesn't support push notifications — email is still available above.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Main Modal ─────────────────────────────────────────────────
export default function UserProfileModal({ onClose }) {
  const { profile, refreshProfile } = useAuth()
  const [tab, setTab] = useState('profile')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100">My Account</h2>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mx-6 mt-4 mb-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex-shrink-0">
          {TABS.map(t => (
            <TabBtn key={t.key} tab={t} active={tab === t.key} onClick={setTab} />
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === 'profile'       && <ProfileTab       profile={profile} refreshProfile={refreshProfile} />}
          {tab === 'password'      && <PasswordTab />}
          {tab === 'notifications' && <NotificationsTab profile={profile} refreshProfile={refreshProfile} />}
        </div>
      </div>
    </div>
  )
}
