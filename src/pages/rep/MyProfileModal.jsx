import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { X, Save, Loader2, AlertCircle, UserCircle } from 'lucide-react'

export default function MyProfileModal({ onClose }) {
  const { profile, refreshProfile } = useAuth()
  const [firstName, setFirstName] = useState(profile?.first_name || '')
  const [lastName, setLastName]   = useState(profile?.last_name || '')
  const [phone, setPhone]         = useState(profile?.phone || '')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  const handleSave = async () => {
    setError('')
    if (!firstName.trim()) return setError('First name is required.')

    setSaving(true)
    const { error: err } = await supabase.from('profiles').update({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', profile.id)

    if (err) { setError(err.message); setSaving(false); return }
    await refreshProfile()
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-display font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <UserCircle size={18} className="text-brand-600" /> My Profile
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-3 py-2 rounded-lg">
              <AlertCircle size={14} className="flex-shrink-0" /> {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">First Name *</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Last Name</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="(555) 555-5555"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <p className="text-xs text-slate-400 mt-1">Shows up on your Sales Sheet, Comparison Sheet, Trade Show Flyer, and Email Signature.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
            <input value={profile?.email || ''} disabled
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-400 bg-slate-50 dark:bg-slate-800/50" />
            <p className="text-xs text-slate-400 mt-1">Can't be changed here — it's tied to your login.</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
