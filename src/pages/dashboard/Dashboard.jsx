import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  MessageSquare, Wrench, UtensilsCrossed, SprayCan,
  Car, CalendarDays, AlertTriangle, BookUser, Gauge,
  Church, ArrowRight, Clock, CheckCircle2, TrendingUp,
  Bell, Users, Activity, Zap, Shield
} from 'lucide-react'

// ── Stat Card ──────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, bg, to, alert }) {
  const navigate = useNavigate()
  return (
    <button onClick={() => to && navigate(to)}
      className={`${bg} rounded-2xl p-5 text-left hover:shadow-md transition-all group border-2 ${alert ? 'border-red-300 animate-pulse' : 'border-transparent'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-xl ${bg === 'bg-white' ? 'bg-slate-100' : 'bg-white/40'}`}>
          <Icon size={18} className={color} />
        </div>
        {to && <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all mt-1" />}
      </div>
      <div className={`text-3xl font-display font-bold ${color}`}>{value}</div>
      <div className="text-slate-600 text-xs font-medium mt-1">{label}</div>
      {sub && <div className="text-slate-400 text-xs mt-0.5">{sub}</div>}
    </button>
  )
}

// ── Alert Row ──────────────────────────────────────────────────
function AlertRow({ icon: Icon, color, bg, label, count, to }) {
  const navigate = useNavigate()
  return (
    <button onClick={() => navigate(to)}
      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group text-left">
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={15} className={color} />
      </div>
      <span className="flex-1 text-sm text-slate-700">{label}</span>
      <span className={`text-xs font-bold px-2 py-1 rounded-full ${bg} ${color}`}>{count}</span>
      <ArrowRight size={13} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
    </button>
  )
}

// ── Activity Feed Item ─────────────────────────────────────────
function FeedItem({ icon: Icon, color, title, sub, time }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${color}`}>
        <Icon size={13} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 font-medium leading-snug">{title}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
      <span className="text-xs text-slate-300 flex-shrink-0 mt-0.5">{time}</span>
    </div>
  )
}

const timeAgo = (ts) => {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const today = () => new Date().toISOString().split('T')[0]

// ── Main Dashboard ─────────────────────────────────────────────
export default function Dashboard() {
  const { profile, organization, hasModule } = useAuth()
  const navigate = useNavigate()
  const [data, setData]     = useState({})
  const [feed, setFeed]     = useState([])
  const [loading, setLoading] = useState(true)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  useEffect(() => { if (organization) fetchAll() }, [organization])

  async function fetchAll() {
    setLoading(true)
    const orgId = organization.id
    const todayStr = today()

    const queries = []

    if (hasModule('work_orders')) {
      queries.push(
        supabase.from('work_orders').select('id,status,priority,created_at,title').eq('organization_id', orgId).neq('status','closed').neq('status','cancelled'),
      )
    } else queries.push(Promise.resolve({ data: [] }))

    if (hasModule('communication')) {
      queries.push(
        supabase.from('announcements').select('id,title,created_at,category').eq('organization_id', orgId).eq('is_active', true).lte('starts_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(5)
      )
    } else queries.push(Promise.resolve({ data: [] }))

    if (hasModule('incidents')) {
      queries.push(
        supabase.from('incident_reports').select('id,status,severity,incident_type,resident_name,created_at').eq('organization_id', orgId).neq('status','closed').eq('is_active', true)
      )
    } else queries.push(Promise.resolve({ data: [] }))

    if (hasModule('transportation')) {
      queries.push(
        supabase.from('trips').select('id,status,resident_name,pickup_time,trip_date').eq('organization_id', orgId).eq('trip_date', todayStr).order('pickup_time')
      )
    } else queries.push(Promise.resolve({ data: [] }))

    if (hasModule('activities')) {
      queries.push(
        supabase.from('activities').select('id,title,start_time,start_date,category,recur_type,recur_end_date').eq('organization_id', orgId).eq('is_active', true)
      )
    } else queries.push(Promise.resolve({ data: [] }))

    if (hasModule('housekeeping')) {
      queries.push(
        supabase.from('il_cleaning_requests').select('id,status,resident_name').eq('organization_id', orgId).in('status', ['pending','booked'])
      )
    } else queries.push(Promise.resolve({ data: [] }))

    if (hasModule('directory')) {
      queries.push(
        supabase.from('residents').select('id,care_level').eq('organization_id', orgId).eq('is_active', true)
      )
    } else queries.push(Promise.resolve({ data: [] }))

    if (hasModule('security')) {
      queries.push(
        supabase.from('security_rounds').select('id,status,started_at')
          .eq('organization_id', orgId)
          .gte('started_at', new Date(Date.now() - 24*60*60*1000).toISOString()),
        supabase.from('security_reports').select('id,status,priority')
          .eq('organization_id', orgId).eq('is_active', true)
          .in('status', ['open','under_review'])
      )
    } else { queries.push(Promise.resolve({ data: [] })); queries.push(Promise.resolve({ data: [] })) }

    if (hasModule('meters')) {
      queries.push(
        supabase.from('meters').select('id').eq('organization_id', orgId).eq('is_active', true)
      )
    } else queries.push(Promise.resolve({ data: [] }))

    const [woRes, annRes, incRes, tripRes, actRes, ilRes, resRes, secRoundsRes, secReportsRes, meterRes] = await Promise.all(queries)

    const workOrders    = woRes.data    || []
    const announcements = annRes.data   || []
    const incidents     = incRes.data   || []
    const todayTrips    = tripRes.data  || []
    const activities    = actRes.data   || []
    const ilRequests    = ilRes.data    || []
    const residents     = resRes.data   || []
    const secRounds     = secRoundsRes.data  || []
    const secReports    = secReportsRes.data || []
    const meters        = meterRes.data || []

    // Expand recurring activities for today
    const todayActs = activities.filter(a => {
      if (a.start_date === todayStr) return true
      if (a.recur_type === 'none') return false
      const start = new Date(a.start_date + 'T00:00:00')
      const end   = a.recur_end_date ? new Date(a.recur_end_date + 'T23:59:59') : new Date()
      const todayD = new Date(todayStr + 'T00:00:00')
      if (todayD < start || todayD > end) return false
      if (a.recur_type === 'daily') return true
      if (a.recur_type === 'weekly') {
        return start.getDay() === todayD.getDay()
      }
      if (a.recur_type === 'biweekly') {
        const diff = Math.floor((todayD - start) / (7 * 24 * 60 * 60 * 1000))
        return diff % 2 === 0 && start.getDay() === todayD.getDay()
      }
      if (a.recur_type === 'monthly') return start.getDate() === todayD.getDate()
      return false
    })

    setData({
      openWO:      workOrders.filter(w => w.status === 'open').length,
      urgentWO:    workOrders.filter(w => w.priority === 'urgent').length,
      inProgressWO:workOrders.filter(w => w.status === 'in_progress').length,
      openIncidents: incidents.filter(i => i.status === 'submitted').length,
      criticalInc:   incidents.filter(i => i.severity === 'critical').length,
      todayTrips:    todayTrips.length,
      tripsInProgress: todayTrips.filter(t => t.status === 'in_progress').length,
      todayActivities: todayActs.length,
      ilPending:     ilRequests.filter(r => r.status === 'pending').length,
      totalResidents: residents.length,
      recentAnnouncements: announcements.slice(0, 3),
      // Security
      todayRounds:     secRounds.length,
      openSecReports:  secReports.filter(r => r.status === 'open').length,
      urgentSecReports:secReports.filter(r => r.priority === 'urgent').length,
      // Meters
      meterCount: meters.length,
      // Arrays for rendering
      workOrders,
      incidents,
      tripsList: todayTrips,
      todayActs,
    })

    // Build activity feed from recent items
    const feedItems = []
    workOrders.slice(0, 3).forEach(w => feedItems.push({ type: 'wo', icon: Wrench, color: 'bg-brand-500', title: w.title, sub: `Maintenance · ${w.status.replace('_',' ')}`, ts: w.created_at }))
    announcements.slice(0, 2).forEach(a => feedItems.push({ type: 'ann', icon: Bell, color: 'bg-purple-500', title: a.title, sub: `Announcement · ${a.category}`, ts: a.created_at }))
    incidents.slice(0, 2).forEach(i => feedItems.push({ type: 'inc', icon: AlertTriangle, color: 'bg-red-500', title: `${i.incident_type?.replace('_',' ')} — ${i.resident_name || 'Unknown'}`, sub: `Incident · ${i.status}`, ts: i.created_at }))
    feedItems.sort((a, b) => new Date(b.ts) - new Date(a.ts))
    setFeed(feedItems.slice(0, 8))

    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400">Loading dashboard...</div>
  )

  const alerts = []
  if (data.urgentWO > 0)     alerts.push({ icon: Wrench,        color: 'text-red-600',    bg: 'bg-red-100',    label: `${data.urgentWO} urgent maintenance request${data.urgentWO > 1 ? 's' : ''}`, to: '/app/maintenance' })
  if (data.criticalInc > 0)  alerts.push({ icon: AlertTriangle, color: 'text-red-700',    bg: 'bg-red-100',    label: `${data.criticalInc} critical incident${data.criticalInc > 1 ? 's' : ''} open`, to: '/app/incidents' })
  if (data.openIncidents > 0) alerts.push({ icon: AlertTriangle, color: 'text-amber-700',  bg: 'bg-amber-100',  label: `${data.openIncidents} incident report${data.openIncidents > 1 ? 's' : ''} awaiting review`, to: '/app/incidents' })
  if (data.ilPending > 0)    alerts.push({ icon: SprayCan,      color: 'text-orange-600', bg: 'bg-orange-100', label: `${data.ilPending} housekeeping request${data.ilPending > 1 ? 's' : ''} pending`, to: '/housekeeping' })
  if (data.urgentSecReports > 0) alerts.push({ icon: Shield,   color: 'text-red-700',    bg: 'bg-red-100',    label: `${data.urgentSecReports} urgent security report${data.urgentSecReports > 1 ? 's' : ''}`, to: '/app/security' })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800">
            {greeting()}, {profile?.first_name} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {organization?.name} &nbsp;·&nbsp;
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {data.todayActivities > 0 && (
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-brand-50 border border-brand-200 rounded-xl text-sm text-brand-700">
            <CalendarDays size={15} />
            <span><strong>{data.todayActivities}</strong> activit{data.todayActivities > 1 ? 'ies' : 'y'} today</span>
          </div>
        )}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={15} className="text-red-500" />
            <span className="text-sm font-semibold text-slate-700">Needs Attention</span>
          </div>
          <div className="space-y-1">
            {alerts.map((a, i) => (
              <AlertRow key={i} {...a} />
            ))}
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {hasModule('work_orders') && (
          <StatCard icon={Wrench} label="Open Maintenance" value={data.openWO}
            sub={data.inProgressWO > 0 ? `${data.inProgressWO} in progress` : 'No items in progress'}
            color="text-brand-600" bg="bg-brand-50" to="/maintenance"
            alert={data.urgentWO > 0} />
        )}
        {hasModule('incidents') && (
          <StatCard icon={AlertTriangle} label="Open Incidents" value={data.openIncidents}
            sub={data.criticalInc > 0 ? `${data.criticalInc} critical` : 'No critical incidents'}
            color="text-red-600" bg="bg-red-50" to="/incidents"
            alert={data.criticalInc > 0} />
        )}
        {hasModule('transportation') && (
          <StatCard icon={Car} label="Today's Trips" value={data.todayTrips}
            sub={data.tripsInProgress > 0 ? `${data.tripsInProgress} in progress` : 'None in progress'}
            color="text-green-600" bg="bg-green-50" to="/transportation" />
        )}
        {hasModule('activities') && (
          <StatCard icon={CalendarDays} label="Today's Activities" value={data.todayActivities}
            sub="Scheduled for today"
            color="text-purple-600" bg="bg-purple-50" to="/activities" />
        )}
        {hasModule('directory') && (
          <StatCard icon={BookUser} label="Residents" value={data.totalResidents}
            sub="Active residents on file"
            color="text-slate-600" bg="bg-slate-100" to="/directory" />
        )}
        {hasModule('security') && (
          <StatCard icon={Shield} label="Security Rounds" value={data.todayRounds}
            sub={data.openSecReports > 0 ? `${data.openSecReports} open report${data.openSecReports > 1 ? 's' : ''}` : 'No open reports'}
            color="text-indigo-600" bg="bg-indigo-50" to="/security"
            alert={data.urgentSecReports > 0} />
        )}
        {hasModule('meters') && data.meterCount > 0 && (
          <StatCard icon={Gauge} label="Meters" value={data.meterCount}
            sub="Active utility meters"
            color="text-amber-600" bg="bg-amber-50" to="/meters" />
        )}
        {hasModule('housekeeping') && data.ilPending > 0 && (
          <StatCard icon={SprayCan} label="Housekeeping Pending" value={data.ilPending}
            sub="IL requests awaiting booking"
            color="text-orange-600" bg="bg-orange-50" to="/housekeeping" />
        )}
        {hasModule('chapel') && (
          <StatCard icon={Church} label="Chapel" value="Live?"
            sub="Click to manage services"
            color="text-indigo-600" bg="bg-indigo-50" to="/chapel" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's schedule */}
        <div className="lg:col-span-2 space-y-4">

          {/* Today's trips */}
          {hasModule('transportation') && data.tripsList?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-slate-800 flex items-center gap-2">
                  <Car size={16} className="text-green-600" /> Today's Trips
                </h2>
                <button onClick={() => navigate('/app/transportation')} className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                  View all <ArrowRight size={12} />
                </button>
              </div>
              <div className="space-y-2">
                {data.tripsList.map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100">
                    <div className="w-12 text-center flex-shrink-0">
                      <div className="text-xs font-bold text-slate-700">{t.pickup_time ? t.pickup_time.slice(0,5) : '—'}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{t.resident_name}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      t.status === 'completed' ? 'bg-green-100 text-green-700' :
                      t.status === 'in_progress' ? 'bg-brand-100 text-brand-700' :
                      'bg-slate-100 text-slate-600'}`}>
                      {t.status.replace('_',' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today's activities */}
          {hasModule('activities') && data.todayActs?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-slate-800 flex items-center gap-2">
                  <CalendarDays size={16} className="text-purple-600" /> Today's Activities
                </h2>
                <button onClick={() => navigate('/app/activities')} className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                  Calendar <ArrowRight size={12} />
                </button>
              </div>
              <div className="space-y-2">
                {data.todayActs.slice(0, 5).map((a, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: a.color || '#0c90e1' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{a.title}</div>
                    </div>
                    {a.start_time && (
                      <span className="text-xs text-slate-400 flex-shrink-0">
                        {(() => { const [h,m] = a.start_time.split(':'); const hr = parseInt(h); return `${hr>12?hr-12:hr||12}:${m} ${hr>=12?'PM':'AM'}` })()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Open maintenance */}
          {hasModule('work_orders') && data.workOrders?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-slate-800 flex items-center gap-2">
                  <Wrench size={16} className="text-brand-600" /> Open Maintenance
                </h2>
                <button onClick={() => navigate('/app/maintenance')} className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                  View all <ArrowRight size={12} />
                </button>
              </div>
              <div className="space-y-2">
                {data.workOrders.slice(0, 5).map(w => (
                  <div key={w.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${w.priority === 'urgent' ? 'bg-red-500' : w.priority === 'high' ? 'bg-orange-400' : 'bg-slate-300'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{w.title}</div>
                    </div>
                    <span className="text-xs text-slate-400 capitalize flex-shrink-0">{w.status.replace('_',' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Recent announcements */}
          {hasModule('communication') && data.recentAnnouncements?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-slate-800 flex items-center gap-2">
                  <Bell size={15} className="text-purple-600" /> Announcements
                </h2>
                <button onClick={() => navigate('/app/communication')} className="text-xs text-brand-600 font-medium flex items-center gap-1">
                  All <ArrowRight size={12} />
                </button>
              </div>
              <div className="space-y-3">
                {data.recentAnnouncements.map(a => (
                  <div key={a.id} className="text-sm">
                    <div className="font-medium text-slate-800 leading-snug">{a.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5 capitalize">{a.category?.replace('_',' ')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity feed */}
          {feed.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-display font-semibold text-slate-800 flex items-center gap-2 mb-3">
                <Activity size={15} className="text-brand-600" /> Recent Activity
              </h2>
              <div>
                {feed.map((item, i) => (
                  <FeedItem key={i} icon={item.icon} color={item.color}
                    title={item.title} sub={item.sub} time={timeAgo(item.ts)} />
                ))}
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-display font-semibold text-slate-800 mb-3">Quick Links</h2>
            <div className="space-y-1">
              {[
                hasModule('communication')  && { label: 'Post Announcement',    to: '/app/communication',  icon: MessageSquare, color: 'text-purple-600' },
                hasModule('work_orders')    && { label: 'New Work Order',       to: '/app/maintenance',    icon: Wrench,        color: 'text-brand-600' },
                hasModule('transportation') && { label: 'Schedule a Trip',      to: '/app/transportation', icon: Car,           color: 'text-green-600' },
                hasModule('incidents')      && { label: 'File Incident Report', to: '/app/incidents',      icon: AlertTriangle, color: 'text-red-600' },
                hasModule('meters')         && { label: 'Enter Meter Reading',  to: '/app/meters',         icon: Gauge,         color: 'text-amber-600' },
              ].filter(Boolean).map((link, i) => {
                const Icon = link.icon
                return (
                  <button key={i} onClick={() => navigate(link.to)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors group text-left">
                    <Icon size={15} className={link.color} />
                    <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">{link.label}</span>
                    <ArrowRight size={12} className="ml-auto text-slate-300 group-hover:text-slate-400 transition-colors" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
