import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { usePushNotifications } from '../../hooks/usePushNotifications'
import { Palette, Check, Mail, Bell, Smartphone, Loader2, AlertCircle, Sun, Moon } from 'lucide-react'

const ACCENT_COLORS = [
  { key: 'blue',   label: 'Ocean Blue',    swatch: '#0072bf' },
  { key: 'green',  label: 'Forest Green',  swatch: '#3a653f' },
  { key: 'purple', label: 'Plum Purple',   swatch: '#642e97' },
  { key: 'rose',   label: 'Burgundy Rose', swatch: '#a82442' },
  { key: 'slate',  label: 'Slate',         swatch: '#475569' },
]

function Toggle({ checked, onChange, disabled }) {
  return (
    <button onClick={() => !disabled && onChange(!checked)} disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-700'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  )
}

export default function UserSettings() {
  const { profile, refreshProfile } = useAuth()
  const { permission, subscribed, loading: pushLoading, supported, subscribe, unsubscribe } = usePushNotifications(profile?.id)

  const [accent, setAccent]           = useState(profile?.accent_color || 'blue')
  const [themeMode, setThemeMode]     = useState(profile?.theme_mode || 'light')
  const [notifyEmail, setNotifyEmail] = useState(profile?.notify_email ?? true)
  const [notifyPush, setNotifyPush]   = useState(profile?.notify_push ?? true)
  const [saving, setSaving]           = useState('')
  const [error, setError]             = useState('')

  const saveField = async (field, value) => {
    setSaving(field)
    setError('')
    const { error: err } = await supabase.from('profiles').update({ [field]: value }).eq('id', profile.id)
    if (err) { setError(err.message); setSaving(''); return }
    await refreshProfile()
    setSaving('')
  }

  const handleAccent = (key) => { setAccent(key); saveField('accent_color', key) }

  const handleThemeMode = (mode) => { setThemeMode(mode); saveField('theme_mode', mode) }

  const handleNotifyEmail = (val) => { setNotifyEmail(val); saveField('notify_email', val) }

  const handleNotifyPush = async (val) => {
    setNotifyPush(val)
    await saveField('notify_push', val)
    // Turning push on: also try to get a device subscription if we don't have one yet
    if (val && supported && !subscribed) await subscribe()
    // Turning push off: also drop the device subscription so nothing can slip through
    if (!val && subscribed) await unsubscribe()
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-slate-800 dark:text-slate-100">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Personal preferences for your account</p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-400 text-sm">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Appearance */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 mb-5">
        <div className="flex items-center gap-2 mb-1">
          {themeMode === 'dark' ? <Moon size={16} className="text-brand-600" /> : <Sun size={16} className="text-brand-600" />}
          <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100">Appearance</h2>
        </div>
        <p className="text-slate-400 text-sm mb-4">Choose a light or dark look for the app.</p>
        <div className="grid grid-cols-2 gap-3">
          {[{ key: 'light', label: 'Light', icon: Sun }, { key: 'dark', label: 'Dark', icon: Moon }].map(m => {
            const Icon = m.icon
            return (
              <button key={m.key} onClick={() => handleThemeMode(m.key)}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${themeMode === m.key ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'}`}>
                <Icon size={15} /> {m.label}
              </button>
            )
          })}
        </div>
        {saving === 'theme_mode' && <p className="text-xs text-slate-400 mt-3">Saving...</p>}
      </div>

      {/* Accent color */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Palette size={16} className="text-brand-600" />
          <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100">Accent Color</h2>
        </div>
        <p className="text-slate-400 text-sm mb-4">Choose the color used for buttons, links, and highlights throughout the app.</p>
        <div className="grid grid-cols-5 gap-3">
          {ACCENT_COLORS.map(c => (
            <button key={c.key} onClick={() => handleAccent(c.key)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${accent === c.key ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
              <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: c.swatch }}>
                {accent === c.key && <Check size={16} className="text-white" />}
              </span>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300 text-center leading-tight">{c.label}</span>
            </button>
          ))}
        </div>
        {saving === 'accent_color' && <p className="text-xs text-slate-400 mt-3">Saving...</p>}
      </div>

      {/* Notifications */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <Bell size={16} className="text-brand-600" />
          <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100">Notifications</h2>
        </div>
        <p className="text-slate-400 text-sm mb-4">Control which channels you receive broadcast messages and alerts on.</p>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Mail size={18} className="text-slate-400 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Email Notifications</div>
                <div className="text-xs text-slate-400">Receive broadcast messages and alerts by email</div>
              </div>
            </div>
            <Toggle checked={notifyEmail} onChange={handleNotifyEmail} disabled={saving === 'notify_email'} />
          </div>

          <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-start gap-3">
              <Smartphone size={18} className="text-slate-400 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Push Notifications</div>
                <div className="text-xs text-slate-400">
                  Receive push notifications in the app and on this device
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
            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg px-3 py-2">
              This browser/device doesn't support push notifications — you'll still see alerts in-app and can enable email above.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
