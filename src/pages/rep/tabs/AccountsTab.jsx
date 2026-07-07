import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { Building2, Copy, Check, Loader2, Calendar, TrendingUp } from 'lucide-react'

const PLAN_LABELS = {
  starter:      'Starter',
  essential:    'Essential',
  professional: 'Professional',
  pilot:        'Pilot',
}

const STATUS_STYLES = {
  active:    'bg-green-100 text-green-700',
  trialing:  'bg-blue-100 text-blue-700',
  past_due:  'bg-amber-100 text-amber-700',
  canceled:  'bg-slate-100 text-slate-500',
  inactive:  'bg-slate-100 text-slate-500',
}

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : '—'

export default function AccountsTab({ repCode }) {
  const [orgs, setOrgs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied]   = useState(false)

  useEffect(() => { fetchOrgs() }, [])

  async function fetchOrgs() {
    setLoading(true)
    const { data } = await supabase
      .from('organizations')
      .select('id, name, plan, subscription_status, onboarded_at, current_period_end, created_at')
      .order('created_at', { ascending: false })
    setOrgs(data || [])
    setLoading(false)
  }

  const referralUrl = repCode ? `https://elderloop.xyz/signup?rep=${repCode}` : null

  const copyLink = () => {
    if (!referralUrl) return
    navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 size={28} className="animate-spin text-brand-400" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Referral link */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="font-semibold text-slate-700 text-sm mb-1">Your Referral Link</h3>
        <p className="text-xs text-slate-400 mb-3">Share this link — signups through it are automatically credited to you.</p>
        {referralUrl ? (
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <code className="text-sm text-slate-700 flex-1 truncate">{referralUrl}</code>
            <button onClick={copyLink}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600 transition-colors flex-shrink-0">
              {copied ? <><Check size={12} className="text-green-500" /> Copied!</> : <><Copy size={12} /> Copy</>}
            </button>
          </div>
        ) : (
          <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-xl">No rep code is linked to your account yet — contact your admin.</p>
        )}
      </div>

      {/* Accounts */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-700 text-sm">My Accounts</h3>
            <p className="text-xs text-slate-400 mt-0.5">Communities referred by you</p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">{orgs.length}</span>
        </div>

        {orgs.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Building2 size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No accounts yet</p>
            <p className="text-sm mt-1">Share your referral link to start earning credit for signups.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Community', 'Plan', 'Status', 'Onboarded', 'Renews'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orgs.map(org => (
                <tr key={org.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-800 text-sm">{org.name}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-medium">
                      {PLAN_LABELS[org.plan] || org.plan || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[org.subscription_status] || 'bg-slate-100 text-slate-500'}`}>
                      {org.subscription_status?.replace('_', ' ') || 'inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500 flex items-center gap-1.5">
                    <Calendar size={12} className="text-slate-300" /> {fmtDate(org.onboarded_at || org.created_at)}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">{fmtDate(org.current_period_end)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {orgs.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <TrendingUp size={13} /> {orgs.filter(o => o.subscription_status === 'active').length} active of {orgs.length} referred
        </div>
      )}
    </div>
  )
}
