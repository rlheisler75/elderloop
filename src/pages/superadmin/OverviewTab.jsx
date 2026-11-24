// Super Admin → Overview: one dashboard that sums up the other tabs, with a
// "Needs attention" list at the top. Every card opens its tab. Counts come from the
// same tables the tabs read (organizations, waitlist, platform_feedback, rep_codes,
// rep_commission_events, corporations, surveys, audit_log).
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { STAGES } from './LeadsTab'
import {
  Building2, Users, TrendingUp, LifeBuoy, DollarSign, Landmark, ClipboardList,
  Activity, ChevronRight, AlertTriangle, CheckCircle2, ShieldAlert, Inbox, Loader2,
} from 'lucide-react'

const OPEN_STAGES = ['new', 'contacted', 'demo_scheduled', 'pilot', 'trial']
const BILLING = [
  { key: 'active',    label: 'Active',    bar: 'bg-green-500' },
  { key: 'pilot',     label: 'Pilot',     bar: 'bg-blue-500' },
  { key: 'trial',     label: 'Trial',     bar: 'bg-amber-500' },
  { key: 'past_due',  label: 'Past due',  bar: 'bg-red-500' },
  { key: 'cancelled', label: 'Cancelled', bar: 'bg-slate-600' },
]
const PLAN_LABEL = { starter: 'Starter', essential: 'Essential', plus: 'Plus', professional: 'Professional', pilot: 'Pilot' }
const FEEDBACK_STATUS = { new: 'text-blue-300', in_progress: 'text-amber-300', done: 'text-green-300' }

const money = (n) => `$${Math.round(n || 0).toLocaleString()}`
const fmtShort = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const todayCentral = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

function Card({ icon: Icon, title, onOpen, children }) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col min-w-0">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className="text-brand-400 flex-shrink-0" />
        <h2 className="text-white font-semibold truncate" style={{ fontFamily: '"Playfair Display", serif' }}>{title}</h2>
        <button onClick={onOpen} className="ml-auto flex items-center gap-0.5 text-xs text-slate-400 hover:text-white flex-shrink-0">
          Open <ChevronRight size={13} />
        </button>
      </div>
      {children}
    </section>
  )
}

function Mini({ label, value, tone = 'text-white' }) {
  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2.5 min-w-0">
      <div className={`text-lg font-bold ${tone}`}>{value}</div>
      <div className="text-[11px] text-slate-500 truncate">{label}</div>
    </div>
  )
}

export default function OverviewTab({ orgs, stats, platformSurveys, surveyResponses, onOpen }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const head = (q) => q.then(r => r.count ?? 0)
    Promise.all([
      supabase.from('waitlist').select('id, name, community, status, next_follow_up, arr, created_at').order('created_at', { ascending: false }),
      supabase.from('platform_feedback').select('id, kind, subject, status, created_at, organizations(name)').order('created_at', { ascending: false }),
      supabase.from('rep_codes').select('code, is_active, click_count'),
      supabase.from('rep_commission_events').select('status, amount'),
      supabase.from('corporations').select('id, name'),
      head(supabase.from('audit_log').select('id', { count: 'exact', head: true }).gte('created_at', since)),
      head(supabase.from('audit_log').select('id', { count: 'exact', head: true }).gte('created_at', since).eq('action', 'LOGIN')),
      head(supabase.from('audit_log').select('id', { count: 'exact', head: true }).gte('created_at', since).eq('action', 'LOGIN_FAILED')),
      supabase.from('audit_log').select('created_at').order('created_at', { ascending: false }).limit(1),
    ]).then(([leads, feedback, repCodes, commissions, corps, events24, logins24, failed24, lastEvent]) => {
      setData({
        leads: leads.data || [],
        feedback: feedback.data || [],
        repCodes: repCodes.data || [],
        commissions: commissions.data || [],
        corps: corps.data || [],
        events24, logins24, failed24,
        lastEvent: lastEvent.data?.[0]?.created_at ?? null,
      })
    })
  }, [])

  if (!data) {
    return <div className="flex items-center justify-center py-20 text-slate-500"><Loader2 size={22} className="animate-spin" /></div>
  }

  // ── Figures ────────────────────────────────────────────────
  const today = todayCentral()
  const openLeads = data.leads.filter(l => OPEN_STAGES.includes(l.status))
  const followUpsDue = openLeads.filter(l => l.next_follow_up && l.next_follow_up <= today)
  const newLeads = data.leads.filter(l => l.status === 'new')
  const pipelineArr = openLeads.reduce((s, l) => s + Number(l.arr || 0), 0)

  const fbCount = (s) => data.feedback.filter(f => f.status === s).length
  const commissionSum = (s) => data.commissions.filter(c => c.status === s).reduce((t, c) => t + Number(c.amount || 0), 0)
  const pendingCommissions = data.commissions.filter(c => c.status === 'pending')

  const byBilling = (k) => orgs.filter(o => (o.billing_status || 'pilot') === k).length
  const pastDue = orgs.filter(o => o.billing_status === 'past_due')
  const phiNoMfa = orgs.filter(o => o.phi_allowed && !o.require_mfa && !o.is_demo)
  const planCounts = orgs.reduce((m, o) => ({ ...m, [o.plan || 'pilot']: (m[o.plan || 'pilot'] || 0) + 1 }), {})

  const activeReps = data.repCodes.filter(r => r.is_active).length
  const repSourced = orgs.filter(o => o.rep_code).length
  const linkClicks = data.repCodes.reduce((s, r) => s + (r.click_count || 0), 0)

  const corpMembers = data.corps.map(c => orgs.filter(o => o.corporation_id === c.id).length)
  const linkedCommunities = corpMembers.reduce((a, b) => a + b, 0)
  const enterpriseCorps = corpMembers.filter(n => n >= 3).length

  const totalResponses = Object.values(surveyResponses || {}).reduce((a, b) => a + b, 0)

  const attention = [
    fbCount('new') > 0 && { tab: 'feedback', icon: Inbox, tone: 'text-blue-300', text: `${plural(fbCount('new'), 'new Help & Feedback message')}` },
    followUpsDue.length > 0 && { tab: 'leads', icon: Users, tone: 'text-amber-300', text: `${plural(followUpsDue.length, 'lead follow-up')} due today or overdue` },
    newLeads.length > 0 && { tab: 'leads', icon: Users, tone: 'text-blue-300', text: `${plural(newLeads.length, 'new lead')} not contacted yet` },
    pastDue.length > 0 && { tab: 'organizations', icon: AlertTriangle, tone: 'text-red-300', text: `${plural(pastDue.length, 'community', 'communities')} past due: ${pastDue.map(o => o.name).join(', ')}` },
    phiNoMfa.length > 0 && { tab: 'organizations', icon: ShieldAlert, tone: 'text-amber-300', text: `Health data on without required 2FA: ${phiNoMfa.map(o => o.name).join(', ')}` },
    pendingCommissions.length > 0 && { tab: 'commissions', icon: DollarSign, tone: 'text-amber-300', text: `${plural(pendingCommissions.length, 'rep commission')} waiting for approval (${money(commissionSum('pending'))})` },
    data.failed24 > 0 && { tab: 'activity', icon: ShieldAlert, tone: 'text-red-300', text: `${plural(data.failed24, 'failed sign-in')} in the last 24 hours` },
  ].filter(Boolean)

  const kpis = [
    { icon: Building2,  label: 'Communities',   value: stats.total_orgs ?? orgs.length, sub: `${byBilling('active')} paying · ${byBilling('pilot')} pilot`, color: 'text-brand-400', tab: 'organizations' },
    { icon: TrendingUp, label: 'MRR',           value: money(stats.mrr), sub: 'active subscriptions', color: 'text-emerald-400', tab: 'organizations' },
    { icon: Users,      label: 'Users',         value: stats.total_users ?? 0, sub: 'all community logins', color: 'text-purple-400', tab: 'organizations' },
    { icon: Users,      label: 'Open leads',    value: openLeads.length, sub: pipelineArr ? `${money(pipelineArr)} ARR in pipeline` : 'in the pipeline', color: 'text-amber-400', tab: 'leads' },
    { icon: LifeBuoy,   label: 'New feedback',  value: fbCount('new'), sub: `${fbCount('in_progress')} in progress`, color: 'text-blue-400', tab: 'feedback' },
    { icon: DollarSign, label: 'Commissions due', value: money(commissionSum('pending') + commissionSum('approved')), sub: 'pending + approved', color: 'text-rose-400', tab: 'commissions' },
  ]

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map(k => (
          <button key={k.label} onClick={() => onOpen(k.tab)}
            className="text-left bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl p-4 transition-colors min-w-0">
            <k.icon size={16} className={`${k.color} mb-2`} />
            <div className={`text-2xl font-bold ${k.color} truncate`} style={{ fontFamily: '"Playfair Display", serif' }}>{k.value}</div>
            <div className="text-slate-300 text-xs font-medium mt-0.5">{k.label}</div>
            <div className="text-slate-500 text-[11px] truncate">{k.sub}</div>
          </button>
        ))}
      </div>

      {/* Needs attention */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-3" style={{ fontFamily: '"Playfair Display", serif' }}>Needs attention</h2>
        {attention.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-green-300"><CheckCircle2 size={16} /> Nothing needs attention right now.</div>
        ) : (
          <ul className="divide-y divide-slate-800">
            {attention.map((a, i) => (
              <li key={i}>
                <button onClick={() => onOpen(a.tab)} className="w-full flex items-center gap-3 py-2.5 text-left group">
                  <a.icon size={15} className={`${a.tone} flex-shrink-0`} />
                  <span className="text-sm text-slate-200 flex-1 min-w-0">{a.text}</span>
                  <ChevronRight size={14} className="text-slate-600 group-hover:text-white flex-shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Section cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card icon={Building2} title="Communities" onOpen={() => onOpen('organizations')}>
          {orgs.length > 0 && (
            <div className="flex h-2 rounded-full overflow-hidden bg-slate-800 mb-3">
              {BILLING.map(b => byBilling(b.key) > 0 && (
                <div key={b.key} className={b.bar} style={{ width: `${(byBilling(b.key) / orgs.length) * 100}%` }} title={`${b.label}: ${byBilling(b.key)}`} />
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mb-4">
            {BILLING.filter(b => byBilling(b.key) > 0).map(b => (
              <span key={b.key} className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${b.bar}`} />{b.label} {byBilling(b.key)}</span>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Mini label="Health data on" value={orgs.filter(o => o.phi_allowed).length} />
            <Mini label="2FA required" value={orgs.filter(o => o.require_mfa).length} />
            <Mini label="Users" value={stats.total_users ?? 0} />
          </div>
          <div className="text-xs text-slate-500 mt-3">
            {Object.entries(planCounts).map(([p, n]) => `${PLAN_LABEL[p] || p} ${n}`).join(' · ')}
          </div>
        </Card>

        <Card icon={Users} title="Leads & Pipeline" onOpen={() => onOpen('leads')}>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Mini label="Open leads" value={openLeads.length} tone="text-amber-300" />
            <Mini label="Follow-ups due" value={followUpsDue.length} tone={followUpsDue.length ? 'text-amber-300' : 'text-white'} />
            <Mini label="Pipeline ARR" value={money(pipelineArr)} />
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs mb-3">
            {STAGES.filter(s => data.leads.some(l => l.status === s.key)).map(s => (
              <span key={s.key} className={s.text}>{s.label} {data.leads.filter(l => l.status === s.key).length}</span>
            ))}
          </div>
          <ul className="space-y-1.5 mt-auto">
            {data.leads.slice(0, 3).map(l => (
              <li key={l.id} className="flex items-center gap-2 text-sm min-w-0">
                <span className="text-slate-200 truncate">{l.community || l.name}</span>
                <span className="ml-auto text-xs text-slate-500 flex-shrink-0">{fmtShort(l.created_at)}</span>
              </li>
            ))}
            {data.leads.length === 0 && <li className="text-sm text-slate-500">No leads yet.</li>}
          </ul>
        </Card>

        <Card icon={LifeBuoy} title="Help & Feedback" onOpen={() => onOpen('feedback')}>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Mini label="New" value={fbCount('new')} tone={fbCount('new') ? 'text-blue-300' : 'text-white'} />
            <Mini label="In progress" value={fbCount('in_progress')} tone="text-amber-300" />
            <Mini label="Done" value={fbCount('done')} tone="text-green-300" />
          </div>
          <ul className="space-y-2 mt-auto">
            {data.feedback.slice(0, 4).map(f => (
              <li key={f.id} className="min-w-0">
                <div className="flex items-center gap-2 text-sm min-w-0">
                  <span className="text-slate-200 truncate">{f.subject}</span>
                  <span className={`ml-auto text-[11px] flex-shrink-0 ${FEEDBACK_STATUS[f.status] || 'text-slate-400'}`}>{(f.status || '').replace('_', ' ')}</span>
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {f.kind === 'help' ? 'Help request' : 'Suggestion'} · {f.organizations?.name ?? 'No community'} · {fmtShort(f.created_at)}
                </div>
              </li>
            ))}
            {data.feedback.length === 0 && <li className="text-sm text-slate-500">No messages yet.</li>}
          </ul>
        </Card>

        <Card icon={TrendingUp} title="Sales Reps" onOpen={() => onOpen('reps')}>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Mini label="Active reps" value={activeReps} tone="text-purple-300" />
            <Mini label="Rep-sourced" value={repSourced} />
            <Mini label="Link clicks" value={linkClicks} />
          </div>
          <div className="text-xs text-slate-400 mb-1">Commissions</div>
          <div className="grid grid-cols-3 gap-2">
            <Mini label="Pending" value={money(commissionSum('pending'))} tone="text-amber-300" />
            <Mini label="Approved" value={money(commissionSum('approved'))} tone="text-blue-300" />
            <Mini label="Paid" value={money(commissionSum('paid'))} tone="text-green-300" />
          </div>
          <div className="flex flex-wrap gap-3 mt-4 text-xs">
            <button onClick={() => onOpen('rep_accounts')} className="text-brand-400 hover:text-brand-300">Rep Accounts</button>
            <button onClick={() => onOpen('commissions')} className="text-brand-400 hover:text-brand-300">Commissions</button>
            <button onClick={() => onOpen('rep_resources')} className="text-brand-400 hover:text-brand-300">Promo Materials</button>
          </div>
        </Card>

        <Card icon={Landmark} title="Corporations" onOpen={() => onOpen('corporations')}>
          <div className="grid grid-cols-3 gap-2">
            <Mini label="Corporations" value={data.corps.length} />
            <Mini label="Linked communities" value={linkedCommunities} />
            <Mini label="Enterprise (3+)" value={enterpriseCorps} tone="text-emerald-300" />
          </div>
          <ul className="space-y-1.5 mt-4">
            {data.corps.slice(0, 3).map((c, i) => (
              <li key={c.id} className="flex items-center gap-2 text-sm">
                <span className="text-slate-200 truncate">{c.name}</span>
                <span className="ml-auto text-xs text-slate-500 flex-shrink-0">{plural(corpMembers[i], 'community', 'communities')}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card icon={ClipboardList} title="Platform Surveys" onOpen={() => onOpen('surveys')}>
          <div className="grid grid-cols-2 gap-2">
            <Mini label="Active surveys" value={platformSurveys.length} />
            <Mini label="Responses" value={totalResponses} />
          </div>
          <ul className="space-y-1.5 mt-4">
            {platformSurveys.slice(0, 3).map(s => (
              <li key={s.id} className="flex items-center gap-2 text-sm">
                <span className="text-slate-200 truncate">{s.title}</span>
                <span className="ml-auto text-xs text-slate-500 flex-shrink-0">{plural(surveyResponses?.[s.id] || 0, 'response')}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card icon={Activity} title="Platform Activity" onOpen={() => onOpen('activity')}>
          <div className="grid grid-cols-3 gap-2">
            <Mini label="Events, 24 h" value={data.events24.toLocaleString()} />
            <Mini label="Sign-ins, 24 h" value={data.logins24} tone="text-green-300" />
            <Mini label="Failed, 24 h" value={data.failed24} tone={data.failed24 ? 'text-red-300' : 'text-white'} />
          </div>
          {data.lastEvent && (
            <div className="text-xs text-slate-500 mt-4">
              Last event {new Date(data.lastEvent).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
