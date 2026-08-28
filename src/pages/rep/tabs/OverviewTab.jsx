import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import {
  CalendarClock, Megaphone, Building2, DollarSign, MousePointerClick,
  Loader2, AlertTriangle, ChevronRight
} from 'lucide-react'

const fmtMoney = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const todayStr = () => new Date().toLocaleDateString('en-CA')
const RENEWAL_WARNING_DAYS = 30

function StatCard({ icon: Icon, label, value, sub, color, alert, onClick }) {
  return (
    <button onClick={onClick}
      className="text-left bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:border-brand-200 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${alert ? 'bg-red-50' : 'bg-slate-50'}`}>
          <Icon size={17} className={alert ? 'text-red-600' : color} />
        </div>
        <ChevronRight size={15} className="text-slate-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
      </div>
      <div className={`text-2xl font-bold font-display ${alert ? 'text-red-600' : 'text-slate-800'}`}>{value}</div>
      <div className="text-sm text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </button>
  )
}

export default function OverviewTab({ onNavigate }) {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    const today = todayStr()

    const [
      { data: prospects },
      { data: commissionEvents },
      { data: orgs },
      { data: repCodeRow },
    ] = await Promise.all([
      supabase.from('rep_prospects').select('status, next_follow_up').not('status', 'in', '(won,lost)'),
      supabase.from('rep_commission_events').select('amount, status'),
      supabase.from('organizations').select('id, subscription_status, current_period_end'),
      supabase.from('rep_codes').select('click_count').eq('rep_id', profile.id).maybeSingle(),
    ])

    const followUpsDue = (prospects || []).filter(p => p.next_follow_up && p.next_follow_up <= today).length
    const activeProspects = (prospects || []).length

    const owed = (commissionEvents || [])
      .filter(e => e.status !== 'paid')
      .reduce((s, e) => s + Number(e.amount), 0)
    const paidAllTime = (commissionEvents || [])
      .filter(e => e.status === 'paid')
      .reduce((s, e) => s + Number(e.amount), 0)

    const activeOrgs = (orgs || []).filter(o => o.subscription_status === 'active').length
    const pastDueOrgs = (orgs || []).filter(o => o.subscription_status === 'past_due').length
    const renewingSoon = (orgs || []).filter(o => {
      if (o.subscription_status !== 'active' || !o.current_period_end) return false
      const days = Math.ceil((new Date(o.current_period_end) - Date.now()) / 86400000)
      return days >= 0 && days <= RENEWAL_WARNING_DAYS
    }).length

    const clicks = repCodeRow?.click_count ?? 0
    const signups = (orgs || []).length
    const conversion = clicks > 0 ? Math.round((signups / clicks) * 100) : null

    setStats({
      followUpsDue, activeProspects,
      owed, paidAllTime,
      totalOrgs: signups, activeOrgs, pastDueOrgs, renewingSoon,
      clicks, signups, conversion,
    })
    setLoading(false)
  }, [profile?.id])

  useEffect(() => { fetchAll() }, [fetchAll])

  if (loading || !stats) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 size={28} className="animate-spin text-brand-400" />
    </div>
  )

  const accountsAlert = stats.pastDueOrgs > 0
  const accountsSub = [
    stats.pastDueOrgs > 0 ? `${stats.pastDueOrgs} past due` : null,
    stats.renewingSoon > 0 ? `${stats.renewingSoon} renewing soon` : null,
  ].filter(Boolean).join(' · ') || `${stats.activeOrgs} active`

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-slate-800 text-lg">
          Welcome back{profile?.first_name ? `, ${profile.first_name}` : ''}
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">Here's where things stand across your accounts</p>
      </div>

      {stats.pastDueOrgs > 0 && (
        <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span><strong>{stats.pastDueOrgs}</strong> referred account{stats.pastDueOrgs === 1 ? ' is' : 's are'} past due — a quick check-in could save {stats.pastDueOrgs === 1 ? 'it' : 'them'}.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={CalendarClock}
          label="Follow-Ups Due"
          value={stats.followUpsDue}
          sub={stats.followUpsDue > 0 ? 'Overdue or due today' : 'All caught up'}
          alert={stats.followUpsDue > 0}
          color="text-amber-600"
          onClick={() => onNavigate('followups')}
        />
        <StatCard
          icon={Megaphone}
          label="Active Prospects"
          value={stats.activeProspects}
          sub="In your pipeline"
          color="text-purple-600"
          onClick={() => onNavigate('prospects')}
        />
        <StatCard
          icon={Building2}
          label="Referred Accounts"
          value={stats.totalOrgs}
          sub={accountsSub}
          alert={accountsAlert}
          color="text-brand-600"
          onClick={() => onNavigate('accounts')}
        />
        <StatCard
          icon={DollarSign}
          label="Commissions Owed"
          value={fmtMoney(stats.owed)}
          sub={`${fmtMoney(stats.paidAllTime)} paid all-time`}
          color="text-green-600"
          onClick={() => onNavigate('commissions')}
        />
        <StatCard
          icon={MousePointerClick}
          label="Referral Link Clicks"
          value={stats.clicks}
          sub={stats.conversion !== null ? `${stats.signups} signups · ${stats.conversion}% conversion` : `${stats.signups} signups`}
          color="text-blue-600"
          onClick={() => onNavigate('promocodes')}
        />
      </div>
    </div>
  )
}
