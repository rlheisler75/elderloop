import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  Building2, DollarSign, Megaphone, FileText, Tag, Mail, CreditCard,
  LogOut, Eye, EyeOff, Loader2, AlertCircle, KeyRound, GraduationCap,
  Menu, X, CalendarClock
} from 'lucide-react'
import AccountsTab from './tabs/AccountsTab'
import CommissionsTab from './tabs/CommissionsTab'
import ProspectsTab from './tabs/ProspectsTab'
import FollowUpsTab from './tabs/FollowUpsTab'
import MaterialsTab from './tabs/MaterialsTab'
import PromoCodesTab from './tabs/PromoCodesTab'
import EmailTemplatesTab from './tabs/EmailTemplatesTab'
import SalesSheetTab from './tabs/SalesSheetTab'
import BusinessCardTab from './tabs/BusinessCardTab'
import OrgSupportModal from './OrgSupportModal'
import NotificationBell from '../../components/communication/NotificationBell'

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
  { key: 'followups',   label: 'Follow-Ups Due',         icon: CalendarClock },
  { key: 'materials',   label: 'Promo Materials',        icon: FileText },
  { key: 'templates',   label: 'Email Templates',        icon: Mail },
  { key: 'salessheet',  label: 'Sales Sheet',            icon: FileText },
  { key: 'businesscard',label: 'Business Card',          icon: CreditCard },
  { key: 'promocodes',  label: 'Promo Codes & My Link',  icon: Tag },
]

export default function RepPortal() {
  const { profile, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialTab = TABS.some(t => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'accounts'
  const [tab, setTab]                 = useState(initialTab)
  const [repCode, setRepCode]         = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [myOrgs, setMyOrgs]           = useState([])
  const [supportOrg, setSupportOrg]   = useState(null)

  useEffect(() => {
    if (!profile?.id) return
    supabase.from('rep_codes').select('code').eq('rep_id', profile.id).single()
      .then(({ data }) => setRepCode(data?.code || null))
    supabase.from('organizations')
      .select('id, name, city, state, plan, subscription_status, onboarded_at, created_at, current_period_end')
      .order('name')
      .then(({ data }) => setMyOrgs(data || []))
  }, [profile?.id])

  const handleSignOut = async () => { await signOut(); navigate('/login') }
  const selectTab = (key) => { setTab(key); setSidebarOpen(false) }

  if (profile?.must_change_password) {
    return <MustChangePasswordGate onDone={refreshProfile} />
  }

  const navItemCls = (active) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left ${
      active ? 'bg-brand-700 text-white' : 'text-brand-300 hover:bg-brand-800 hover:text-white'
    }`

  return (
    <div className="flex h-screen bg-slate-50">
      {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-brand-950 flex flex-col transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-brand-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
              <img src="/icon-192.png" alt="ElderLoop" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <div className="text-white font-semibold truncate" style={{ fontFamily: '"Playfair Display", serif' }}>ElderLoop</div>
              <div className="text-brand-400 text-xs truncate">Sales Rep Portal</div>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-brand-400 hover:text-white ml-2"><X size={18} /></button>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button key={t.key} onClick={() => selectTab(t.key)} className={navItemCls(tab === t.key)}>
                <Icon size={17} /> {t.label}
              </button>
            )
          })}
          <button onClick={() => { navigate('/training'); setSidebarOpen(false) }} className={navItemCls(false)}>
            <GraduationCap size={17} /> Training
          </button>

          {myOrgs.length > 0 && (
            <div className="pt-4 mt-2 border-t border-brand-800">
              <div className="text-xs text-brand-500 uppercase tracking-widest px-3 mb-1.5">Jump to Org</div>
              {myOrgs.map(org => (
                <button key={org.id} onClick={() => { setSupportOrg(org); setSidebarOpen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-brand-300 hover:bg-brand-800 hover:text-white transition-all text-left truncate">
                  <Building2 size={13} className="flex-shrink-0" />
                  <span className="truncate">{org.name}</span>
                </button>
              ))}
            </div>
          )}
        </nav>

        <div className="px-3 py-4 border-t border-brand-800 space-y-0.5">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-7 h-7 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {profile?.first_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate">{profile?.first_name} {profile?.last_name}</div>
              {repCode && <div className="text-brand-400 text-xs font-mono truncate">{repCode}</div>}
            </div>
          </div>
          <button onClick={() => navigate('/forgot-password')} className={navItemCls(false)}>
            <KeyRound size={17} /> Change Password
          </button>
          <button onClick={handleSignOut} className={navItemCls(false)}>
            <LogOut size={17} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-500 hover:text-slate-700"><Menu size={22} /></button>
          <span className="font-display font-semibold text-brand-800 flex-1">ElderLoop</span>
          <NotificationBell />
        </div>
        <div className="hidden lg:flex items-center justify-end px-6 py-3 bg-white border-b border-slate-100">
          <NotificationBell />
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-6">
            {tab === 'accounts'    && <AccountsTab repCode={repCode} />}
            {tab === 'commissions' && <CommissionsTab />}
            {tab === 'prospects'   && <ProspectsTab />}
            {tab === 'followups'   && <FollowUpsTab />}
            {tab === 'materials'   && <MaterialsTab />}
            {tab === 'templates'   && <EmailTemplatesTab />}
            {tab === 'salessheet'  && <SalesSheetTab />}
            {tab === 'businesscard' && <BusinessCardTab />}
            {tab === 'promocodes'  && <PromoCodesTab />}
          </div>
        </main>
      </div>

      {supportOrg && <OrgSupportModal org={supportOrg} onClose={() => setSupportOrg(null)} />}
    </div>
  )
}
