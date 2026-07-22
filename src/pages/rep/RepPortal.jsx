import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  Building2, DollarSign, Megaphone, FileText, Tag, Mail, CreditCard,
  LogOut, Eye, EyeOff, Loader2, AlertCircle, KeyRound
} from 'lucide-react'
import AccountsTab from './tabs/AccountsTab'
import CommissionsTab from './tabs/CommissionsTab'
import ProspectsTab from './tabs/ProspectsTab'
import MaterialsTab from './tabs/MaterialsTab'
import PromoCodesTab from './tabs/PromoCodesTab'
import EmailTemplatesTab from './tabs/EmailTemplatesTab'
import SalesSheetTab from './tabs/SalesSheetTab'
import BusinessCardTab from './tabs/BusinessCardTab'

// ── Mandatory password change (first login on an admin-created rep account) ──
function MustChangePasswordGate({ onDone }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirm) return setError('Passwords do not match.')

    setSaving(true)
    const { error: pwErr } = await supabase.auth.updateUser({ password })
    if (pwErr) { setError(pwErr.message); setSaving(false); return }

    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profiles').update({ must_change_password: false }).eq('id', user.id)

    setSaving(false)
    onDone()
  }

  return (
    <div className="min-h-screen bg-brand-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4 overflow-hidden">
            <img src="/icon-192.png" alt="ElderLoop" className="w-full h-full object-cover" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-white">ElderLoop</h1>
          <p className="text-brand-400 mt-1 text-sm">Sales Rep Portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-2 mb-1">
            <KeyRound size={18} className="text-brand-600" />
            <h2 className="font-display text-xl font-semibold text-slate-800">Set your password</h2>
          </div>
          <p className="text-slate-500 text-sm mb-6">For security, choose your own password before continuing — you're currently signed in with a temporary one.</p>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
              <AlertCircle size={14} className="flex-shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <button type="submit" disabled={saving || !password || !confirm}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              {saving ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : 'Set Password & Continue'}
            </button>
          </form>

          <button onClick={async () => { await signOut(); navigate('/login') }}
            className="w-full mt-4 text-sm text-slate-400 hover:text-slate-600 transition-colors">
            Sign out instead
          </button>
        </div>
      </div>
    </div>
  )
}

const TABS = [
  { key: 'accounts',    label: 'My Accounts',            icon: Building2 },
  { key: 'commissions', label: 'Commissions & Residuals', icon: DollarSign },
  { key: 'prospects',   label: 'Marketing',              icon: Megaphone },
  { key: 'materials',   label: 'Promo Materials',        icon: FileText },
  { key: 'templates',   label: 'Email Templates',        icon: Mail },
  { key: 'salessheet',  label: 'Sales Sheet',            icon: FileText },
  { key: 'businesscard',label: 'Business Card',          icon: CreditCard },
  { key: 'promocodes',  label: 'Promo Codes & My Link',  icon: Tag },
]

export default function RepPortal() {
  const { profile, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab]         = useState('accounts')
  const [repCode, setRepCode] = useState(null)

  useEffect(() => {
    if (!profile?.id) return
    supabase.from('rep_codes').select('code').eq('rep_id', profile.id).single()
      .then(({ data }) => setRepCode(data?.code || null))
  }, [profile?.id])

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  if (profile?.must_change_password) {
    return <MustChangePasswordGate onDone={refreshProfile} />
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-brand-950 border-b border-brand-900">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center overflow-hidden">
              <img src="/icon-192.png" alt="ElderLoop" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-white font-semibold" style={{ fontFamily: '"Playfair Display", serif' }}>ElderLoop</div>
              <div className="text-brand-400 text-xs">Sales Rep Portal</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-white text-sm font-medium">{profile?.first_name} {profile?.last_name}</div>
              {repCode && <div className="text-brand-400 text-xs font-mono">{repCode}</div>}
            </div>
            <button onClick={() => navigate('/forgot-password')}
              className="flex items-center gap-1.5 text-xs text-brand-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-brand-900 transition-colors">
              <KeyRound size={13} /> Change Password
            </button>
            <button onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs text-brand-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-brand-900 transition-colors">
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6">
          <nav className="flex gap-1 overflow-x-auto no-scrollbar">
            {TABS.map(t => {
              const Icon = t.icon
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                    tab === t.key
                      ? 'border-brand-600 text-brand-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}>
                  <Icon size={15} /> {t.label}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {tab === 'accounts'    && <AccountsTab repCode={repCode} />}
        {tab === 'commissions' && <CommissionsTab />}
        {tab === 'prospects'   && <ProspectsTab />}
        {tab === 'materials'   && <MaterialsTab />}
        {tab === 'templates'   && <EmailTemplatesTab />}
        {tab === 'salessheet'  && <SalesSheetTab />}
        {tab === 'businesscard' && <BusinessCardTab />}
        {tab === 'promocodes'  && <PromoCodesTab />}
      </div>
    </div>
  )
}
