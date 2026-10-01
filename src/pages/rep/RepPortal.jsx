import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  Building2, DollarSign, Megaphone, FileText, Tag, Mail, CreditCard,
  LogOut, KeyRound, GraduationCap,
  Menu, X, CalendarClock, LayoutDashboard, Wrench, Scale, QrCode, Calculator, PenLine
} from 'lucide-react'
import OverviewTab from './tabs/OverviewTab'
import AccountsTab from './tabs/AccountsTab'
import CommissionsTab from './tabs/CommissionsTab'
import ProspectsTab from './tabs/ProspectsTab'
import FollowUpsTab from './tabs/FollowUpsTab'
import MaterialsTab from './tabs/MaterialsTab'
import PromoCodesTab from './tabs/PromoCodesTab'
import EmailTemplatesTab from './tabs/EmailTemplatesTab'
import SalesSheetTab from './tabs/SalesSheetTab'
import ComparisonSheetTab from './tabs/ComparisonSheetTab'
import TradeShowFlyerTab from './tabs/TradeShowFlyerTab'
import ROIWorksheetTab from './tabs/ROIWorksheetTab'
import EmailSignatureTab from './tabs/EmailSignatureTab'
import BusinessCardTab from './tabs/BusinessCardTab'
import ToolkitTab from './tabs/ToolkitTab'
import OrgSupportModal from './OrgSupportModal'
import MyProfileModal from './MyProfileModal'
import NotificationBell from '../../components/communication/NotificationBell'
import MustChangePasswordGate from '../../components/auth/MustChangePasswordGate'

const TABS = [
  // Start here
  { key: 'overview',    label: 'Overview',               icon: LayoutDashboard },
  // Working the pipeline (daily use)
  { key: 'prospects',   label: 'Marketing',              icon: Megaphone },
  { key: 'followups',   label: 'Follow-Ups Due',         icon: CalendarClock },
  // Selling tools & collateral
  { key: 'materials',   label: 'Promo Materials',        icon: FileText },
  { key: 'salessheet',  label: 'Sales Sheet',            icon: FileText },
  { key: 'comparison',  label: 'Comparison Sheet',       icon: Scale },
  { key: 'tradeshow',   label: 'Trade Show Flyer',       icon: QrCode },
  { key: 'roi',         label: 'ROI Worksheet',          icon: Calculator },
  { key: 'signature',   label: 'Email Signature',        icon: PenLine },
  { key: 'businesscard',label: 'Business Card',          icon: CreditCard },
  { key: 'templates',   label: 'Email Templates',        icon: Mail },
  { key: 'promocodes',  label: 'Promo Codes & My Link',  icon: Tag },
  // Results
  { key: 'accounts',    label: 'My Accounts',            icon: Building2 },
  { key: 'commissions', label: 'Commissions & Residuals', icon: DollarSign },
  // Support
  { key: 'toolkit',     label: 'Rep Toolkit',            icon: Wrench },
]

export default function RepPortal() {
  const { profile, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialTab = TABS.some(t => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'overview'
  const [tab, setTab]                 = useState(initialTab)
  const [repCode, setRepCode]         = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [myOrgs, setMyOrgs]           = useState([])
  const [supportOrg, setSupportOrg]   = useState(null)
  const [showProfile, setShowProfile] = useState(false)

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
    return <MustChangePasswordGate onDone={refreshProfile} subtitle="Sales Rep Portal" />
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
          <button onClick={() => setShowProfile(true)}
            className="flex items-center gap-3 px-3 py-2.5 w-full text-left rounded-lg hover:bg-brand-800 transition-colors">
            <div className="w-7 h-7 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {profile?.first_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate">{profile?.first_name} {profile?.last_name}</div>
              {repCode && <div className="text-brand-400 text-xs font-mono truncate">{repCode}</div>}
            </div>
          </button>
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
        <div className="flex items-center gap-3 px-4 lg:px-6 py-3 bg-white border-b border-slate-100">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-700"><Menu size={22} /></button>
          <span className="font-display font-semibold text-brand-800 flex-1 lg:hidden">ElderLoop</span>
          <div className="flex-1 hidden lg:block" />
          <NotificationBell />
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-6">
            {tab === 'overview'    && <OverviewTab onNavigate={selectTab} />}
            {tab === 'prospects'   && <ProspectsTab />}
            {tab === 'followups'   && <FollowUpsTab />}
            {tab === 'materials'   && <MaterialsTab />}
            {tab === 'salessheet'  && <SalesSheetTab />}
            {tab === 'comparison'  && <ComparisonSheetTab />}
            {tab === 'tradeshow'   && <TradeShowFlyerTab />}
            {tab === 'roi'         && <ROIWorksheetTab />}
            {tab === 'signature'   && <EmailSignatureTab />}
            {tab === 'businesscard' && <BusinessCardTab />}
            {tab === 'templates'   && <EmailTemplatesTab />}
            {tab === 'promocodes'  && <PromoCodesTab />}
            {tab === 'accounts'    && <AccountsTab repCode={repCode} />}
            {tab === 'commissions' && <CommissionsTab />}
            {tab === 'toolkit'     && <ToolkitTab />}
          </div>
        </main>
      </div>

      {supportOrg && <OrgSupportModal org={supportOrg} onClose={() => setSupportOrg(null)} />}
      {showProfile && <MyProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  )
}
