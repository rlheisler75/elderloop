import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  Building2, DollarSign, Megaphone, FileText, Tag,
  LogOut, Heart
} from 'lucide-react'
import AccountsTab from './tabs/AccountsTab'
import CommissionsTab from './tabs/CommissionsTab'
import ProspectsTab from './tabs/ProspectsTab'
import MaterialsTab from './tabs/MaterialsTab'
import PromoCodesTab from './tabs/PromoCodesTab'

const TABS = [
  { key: 'accounts',    label: 'My Accounts',            icon: Building2 },
  { key: 'commissions', label: 'Commissions & Residuals', icon: DollarSign },
  { key: 'prospects',   label: 'Marketing',              icon: Megaphone },
  { key: 'materials',   label: 'Promo Materials',        icon: FileText },
  { key: 'promocodes',  label: 'Promo Codes & My Link',  icon: Tag },
]

export default function RepPortal() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab]         = useState('accounts')
  const [repCode, setRepCode] = useState(null)

  useEffect(() => {
    if (!profile?.id) return
    supabase.from('rep_codes').select('code').eq('rep_id', profile.id).single()
      .then(({ data }) => setRepCode(data?.code || null))
  }, [profile?.id])

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-brand-950 border-b border-brand-900">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center">
              <Heart size={16} className="text-white fill-white" />
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
        {tab === 'promocodes'  && <PromoCodesTab />}
      </div>
    </div>
  )
}
