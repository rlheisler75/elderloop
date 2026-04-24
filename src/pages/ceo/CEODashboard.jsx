import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Users, AlertTriangle, Wrench, CalendarDays, TrendingUp,
  Shield, Gauge, Car, ChevronRight, LogOut, Settings,
  CheckCircle2, Clock, ArrowUpRight, Building2, Activity,
  Church, UtensilsCrossed, ClipboardList, Wifi, WifiOff,
  Radio, AlertCircle, Home, Star
} from 'lucide-react'

const today = () => new Date().toISOString().split('T')[0]

const fmtTime = (t) => {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h), ampm = hr >= 12 ? 'PM' : 'AM'
  return `${hr % 12 || 12}:${m} ${ampm}`
}

// ── KPI Card ───────────────────────────────────────────────────
function KPICard({ icon: Icon, label, value, sub, color, bg, to, alert }) {
  const navigate = useNavigate()
  return (
    <button onClick={() => to && navigate(to)}
      className={`${bg} rounded-2xl p-5 text-left hover:shadow-md transition-all group border-2 ${alert ? 'border-red-300' : 'border-transparent'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-xl bg-white/50"><Icon size={18} className={color} /></div>
        {to && <ArrowUpRight size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />}
      </div>
      <div className={`text-3xl font-bold ${color}`} style={{ fontFamily: '"Playfair Display", serif' }}>{value}</div>
      <div className="text-slate-600 text-xs font-medium mt-1">{label}</div>
      {sub && <div className="text-slate-400 text-xs mt-0.5">{sub}</div>}
    </button>
  )
}

// ── Status Badge ───────────────────────────────────────────────
function StatusBadge({ live, label, sublabel }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${live
      ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${live ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
      <div>
        <div className={`text-xs font-semibold ${live ? 'text-green-700' : 'text-slate-600'}`}>{label}</div>
        {sublabel && <div className="text-xs text-slate-400">{sublabel}</div>}
      </div>
    </div>
  )
}

export default function CEODashboard() {
  const { profile, organization, signOut, hasModule } = useAuth()
  const navigate = useNavigate()
  const [data, setData]     = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (organization) fetchAll() }, [organization])

  async function fetchAll() {
    setLoading(true)
    const orgId    = organization.id
    const todayStr = today()
    const now      = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [
      resRes, woRes, incRes, tripRes, actRes, meterRes,
      chapelRes, secRes, complianceRes, pmRes, dietRes,
      surveyRes, careRes
    ] = await Promise.all([
      // Residents
      supabase.from('residents').select('id,care_level').eq('organization_id', orgId).eq('is_active', true),
      // Work orders — open statuses
      supabase.from('work_orders').select('id,status,priority')
        .eq('organization_id', orgId)
        .in('status', ['open','pending_approval','assigned','in_progress','awaiting_vendor','on_hold']),
      // Incidents
      supabase.from('incident_reports').select('id,severity,status,created_at')
        .eq('organization_id', orgId).eq('is_active', true),
      // Trips today
      supabase.from('trips').select('id,status').eq('organization_id', orgId).eq('trip_date', todayStr),
      // Activities today
      supabase.from('activities').select('id,start_date,start_time,recur_type,title')
        .eq('organization_id', orgId).eq('is_active', true).eq('show_on_signage', true),
      // Meter readings this month
      supabase.from('meter_readings').select('estimated_cost').eq('organization_id', orgId).gte('created_at', monthStart),
      // Chapel — today's service + next upcoming
      supabase.from('chapel_services').select('id,title,service_date,start_time,is_live')
        .eq('organization_id', orgId).eq('is_active', true)
        .gte('service_date', todayStr).order('service_date').limit(1),
      // Security — most recent round
      supabase.from('security_rounds').select('id,status,started_at,completed_at')
        .eq('organization_id', orgId).order('started_at', { ascending: false }).limit(1),
      // Compliance — overdue inspections
      supabase.from('compliance_inspections').select('id,next_due_date,status')
        .eq('organization_id', orgId).lt('next_due_date', todayStr),
      // PM schedules overdue
      supabase.from('pm_schedules').select('id,next_due,title')
        .eq('organization_id', orgId).eq('is_active', true).lt('next_due', todayStr),
      // Dietary profiles
      supabase.from('resident_dietary_profiles').select('id,diet_type')
        .eq('organization_id', orgId).eq('is_active', true),
      // Survey responses this month
      supabase.from('survey_responses').select('id,submitted_at')
        .eq('organization_id', orgId).gte('submitted_at', monthStart),
      // Care notes last 24h
      supabase.from('care_notes').select('id')
        .eq('organization_id', orgId)
        .gte('created_at', new Date(Date.now() - 86400000).toISOString()),
    ])

    const residents    = resRes.data    || []
    const workOrders   = woRes.data     || []
    const incidents    = incRes.data    || []
    const trips        = tripRes.data   || []
    const activities   = actRes.data    || []
    const readings     = meterRes.data  || []
    const chapel       = chapelRes.data?.[0] || null
    const lastRound    = secRes.data?.[0] || null
    const overdueComp  = complianceRes.data || []
    const overduePM    = pmRes.data     || []
    const dietProfiles = dietRes.data   || []
    const surveys      = surveyRes.data || []
    const careNotes    = careRes.data   || []

    const thisMonth = new Date()
    const monthIncidents = incidents.filter(i => {
      const d = new Date(i.created_at)
      return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear()
    })

    const todayActs = activities.filter(a => a.start_date === todayStr || a.recur_type !== 'none')

    const monthCost = readings.reduce((sum, r) => sum + (parseFloat(r.estimated_cost) || 0), 0)

    const byLevel = residents.reduce((acc, r) => {
      const k = r.care_level || 'independent'
      acc[k] = (acc[k] || 0) + 1
      return acc
    }, {})

    // Security status
    const secActive = lastRound?.status === 'in_progress'
    const lastRoundTime = lastRound?.completed_at
      ? new Date(lastRound.completed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : null

    // Chapel status
    const chapelIsToday = chapel?.service_date === todayStr
    const chapelIsLive  = chapel?.is_live === true

    // Diet breakdown
    const specialDiets = dietProfiles.filter(d => d.diet_type && d.diet_type !== 'regular').length

    setData({
      totalResidents: residents.length,
      byLevel,
      openWO:          workOrders.length,
      urgentWO:        workOrders.filter(w => w.priority === 'urgent').length,
      inProgressWO:    workOrders.filter(w => w.status === 'in_progress').length,
      openIncidents:   incidents.filter(i => ['submitted','under_review'].includes(i.status)).length,
      monthIncidents:  monthIncidents.length,
      criticalInc:     incidents.filter(i => i.severity === 'critical' && i.status !== 'closed').length,
      todayTrips:      trips.length,
      todayActs:       todayActs.length,
      monthCost,
      // Security
      secActive, lastRoundTime,
      lastRoundStatus: lastRound?.status || null,
      // Chapel
      chapel, chapelIsToday, chapelIsLive,
      // Compliance
      overdueCompliance: overdueComp.length,
      overduePM: overduePM.length,
      // Dietary
      dietProfiles: dietProfiles.length,
      specialDiets,
      // Engagement
      surveyResponses: surveys.length,
      careNotes24h: careNotes.length,
    })
    setLoading(false)
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const hasAlerts = data.criticalInc > 0 || data.urgentWO > 0 || data.overdueCompliance > 0 || data.overduePM > 0

  return (
    <div className="min-h-screen bg-slate-50">
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="bg-brand-950 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              {organization?.logo_url
                ? <img src={organization.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                : <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center flex-shrink-0"><span className="text-white font-bold text-sm">EL</span></div>
              }
              <div>
                <div className="text-white font-semibold leading-tight" style={{ fontFamily: '"Playfair Display", serif' }}>
                  {organization?.name ?? 'Sunrise Gardens Senior Living'}
                </div>
                <div className="text-brand-400 text-xs">Powered by ElderLoop</div>
              </div>
            </div>
            <h1 className="text-white text-2xl font-bold mt-2" style={{ fontFamily: '"Playfair Display", serif' }}>
              {greeting()}, {profile?.first_name} 👋
            </h1>
            <p className="text-brand-400 text-sm mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/app/dashboard')}
              className="flex items-center gap-2 px-4 py-2 bg-brand-800 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors">
              <Activity size={15} /> Operations
            </button>
            <button onClick={() => navigate('/app/admin')}
              className="flex items-center gap-2 px-4 py-2 bg-brand-800 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors">
              <Settings size={15} /> Admin
            </button>
            <button onClick={async () => { await signOut(); navigate('/login') }}
              className="p-2 text-brand-400 hover:text-red-400 rounded-xl transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        {loading ? (
          <div className="text-center py-20 text-slate-400">Loading executive summary...</div>
        ) : (
          <>
            {/* Alert Banner */}
            {hasAlerts && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-4">
                <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-red-800 text-sm mb-1">Attention Required</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-red-600 text-xs">
                    {data.criticalInc > 0 && <span>⚠ {data.criticalInc} critical incident{data.criticalInc > 1 ? 's' : ''} open</span>}
                    {data.urgentWO > 0 && <span>🔧 {data.urgentWO} urgent maintenance request{data.urgentWO > 1 ? 's' : ''}</span>}
                    {data.overdueCompliance > 0 && <span>📋 {data.overdueCompliance} compliance inspection{data.overdueCompliance > 1 ? 's' : ''} overdue</span>}
                    {data.overduePM > 0 && <span>🛠 {data.overduePM} PM schedule{data.overduePM > 1 ? 's' : ''} overdue</span>}
                  </div>
                </div>
              </div>
            )}

            {/* ── KPI Grid ── */}
            <div>
              <h2 className="font-semibold text-slate-500 mb-4 text-xs uppercase tracking-widest">Key Metrics</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPICard icon={Users}         label="Total Residents"     value={data.totalResidents}  sub="Active census"                   color="text-brand-600"  bg="bg-brand-50"   to="/directory" />
                <KPICard icon={Wrench}        label="Open Work Orders"    value={data.openWO}          sub={`${data.urgentWO} urgent · ${data.inProgressWO} in progress`} color="text-amber-600"  bg="bg-amber-50"   to="/maintenance" alert={data.urgentWO > 0} />
                <KPICard icon={AlertTriangle} label="Open Incidents"      value={data.openIncidents}   sub="Awaiting review"                 color="text-red-600"    bg="bg-red-50"     to="/incidents"   alert={data.criticalInc > 0} />
                <KPICard icon={CalendarDays}  label="Today's Activities"  value={data.todayActs}       sub="On schedule today"               color="text-purple-600" bg="bg-purple-50"  to="/activities" />
                <KPICard icon={ClipboardList} label="Compliance Overdue"  value={data.overdueCompliance} sub={data.overduePM > 0 ? `+ ${data.overduePM} PM overdue` : 'Inspections past due'} color={data.overdueCompliance > 0 ? "text-red-600" : "text-green-600"} bg={data.overdueCompliance > 0 ? "bg-red-50" : "bg-green-50"} to="/maintenance" alert={data.overdueCompliance > 0} />
                <KPICard icon={TrendingUp}    label="Incidents This Month" value={data.monthIncidents} sub="Last 30 days"                    color="text-orange-600" bg="bg-orange-50"  to="/incidents" />
                <KPICard icon={UtensilsCrossed} label="Dietary Profiles"  value={data.dietProfiles}   sub={`${data.specialDiets} special diet${data.specialDiets !== 1 ? 's' : ''}`} color="text-green-600" bg="bg-green-50" to="/dietary" />
                <KPICard icon={Gauge}         label="Utility Cost (MTD)"  value={data.monthCost > 0 ? `$${data.monthCost.toFixed(0)}` : '—'} sub="Month to date" color="text-slate-600" bg="bg-slate-100" to="/meters" />
              </div>
            </div>

            {/* ── Live Status Row ── */}
            <div>
              <h2 className="font-semibold text-slate-500 mb-4 text-xs uppercase tracking-widest">Live Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Security */}
                <button onClick={() => navigate('/app/security')}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-left hover:shadow-md transition-all group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-indigo-600" />
                      <span className="font-semibold text-slate-700 text-sm">Security</span>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </div>
                  {data.secActive ? (
                    <StatusBadge live label="Round In Progress" sublabel="Guard currently on round" />
                  ) : data.lastRoundStatus === 'completed' ? (
                    <StatusBadge live={false} label="No Active Round"
                      sublabel={data.lastRoundTime ? `Last completed at ${data.lastRoundTime}` : 'Last round completed'} />
                  ) : (
                    <StatusBadge live={false} label="No Rounds Today" sublabel="No security rounds logged" />
                  )}
                </button>

                {/* Chapel */}
                <button onClick={() => navigate('/app/chapel')}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-left hover:shadow-md transition-all group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Church size={16} className="text-purple-600" />
                      <span className="font-semibold text-slate-700 text-sm">Chapel</span>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </div>
                  {data.chapelIsLive ? (
                    <StatusBadge live label="Live Now"
                      sublabel={data.chapel?.title || 'Service in progress'} />
                  ) : data.chapel ? (
                    <StatusBadge live={false} label={data.chapelIsToday ? 'Service Today' : 'Next Service'}
                      sublabel={`${data.chapel.title} · ${data.chapelIsToday ? fmtTime(data.chapel.start_time) : new Date(data.chapel.service_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`} />
                  ) : (
                    <StatusBadge live={false} label="No Services Scheduled" sublabel="Nothing upcoming" />
                  )}
                </button>

                {/* Care Activity */}
                <button onClick={() => navigate('/app/nursing')}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-left hover:shadow-md transition-all group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Activity size={16} className="text-rose-600" />
                      <span className="font-semibold text-slate-700 text-sm">Care Activity</span>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </div>
                  <StatusBadge
                    live={data.careNotes24h > 0}
                    label={data.careNotes24h > 0 ? `${data.careNotes24h} Note${data.careNotes24h !== 1 ? 's' : ''} Last 24h` : 'No Notes Last 24h'}
                    sublabel={data.careNotes24h > 0 ? 'Care documentation active' : 'No recent care documentation'} />
                </button>
              </div>
            </div>

            {/* ── Bottom Row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Census breakdown */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2 text-sm"
                  style={{ fontFamily: '"Playfair Display", serif' }}>
                  <Building2 size={15} className="text-brand-600" /> Census by Care Level
                </h2>
                {[
                  { key: 'independent',     label: 'Independent',    color: 'bg-green-500' },
                  { key: 'assisted',        label: 'Assisted Living', color: 'bg-blue-500' },
                  { key: 'memory_care',     label: 'Memory Care',    color: 'bg-purple-500' },
                  { key: 'skilled_nursing', label: 'Skilled Nursing', color: 'bg-orange-500' },
                  { key: 'rehab',           label: 'Rehab',          color: 'bg-cyan-500' },
                ].map(level => {
                  const count = data.byLevel?.[level.key] || 0
                  const pct   = data.totalResidents > 0 ? Math.round((count / data.totalResidents) * 100) : 0
                  return (
                    <div key={level.key} className="flex items-center gap-3 mb-3">
                      <div className="text-xs text-slate-500 w-32 flex-shrink-0">{level.label}</div>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${level.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-xs font-semibold text-slate-700 w-6 text-right">{count}</div>
                    </div>
                  )
                })}
                {data.totalResidents === 0 && <p className="text-slate-400 text-sm">No residents on file.</p>}
              </div>

              {/* Maintenance snapshot */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2 text-sm"
                  style={{ fontFamily: '"Playfair Display", serif' }}>
                  <Wrench size={15} className="text-amber-600" /> Maintenance Snapshot
                </h2>
                {[
                  { label: 'Open Requests',     value: data.openWO,          color: 'text-amber-600' },
                  { label: 'In Progress',        value: data.inProgressWO,    color: 'text-blue-600' },
                  { label: 'Urgent Priority',    value: data.urgentWO,        color: 'text-red-600' },
                  { label: 'PM Schedules Overdue', value: data.overduePM,     color: data.overduePM > 0 ? 'text-red-600' : 'text-green-600' },
                  { label: 'Compliance Overdue', value: data.overdueCompliance, color: data.overdueCompliance > 0 ? 'text-red-600' : 'text-green-600' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <span className="text-xs text-slate-500">{row.label}</span>
                    <span className={`text-sm font-bold ${row.color}`}>{row.value ?? '—'}</span>
                  </div>
                ))}
              </div>

              {/* Quick links */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="font-semibold text-slate-800 mb-4 text-sm"
                  style={{ fontFamily: '"Playfair Display", serif' }}>Quick Navigation</h2>
                <div className="space-y-0.5">
                  {[
                    { label: 'Operations Dashboard', to: '/app/dashboard',      icon: Activity,      color: 'text-brand-600' },
                    { label: 'Resident Directory',    to: '/app/directory',      icon: Users,         color: 'text-green-600' },
                    { label: 'Incident Reports',      to: '/app/incidents',      icon: AlertTriangle, color: 'text-red-600' },
                    { label: 'Maintenance',           to: '/app/maintenance',    icon: Wrench,        color: 'text-amber-600' },
                    { label: 'Chapel',                to: '/app/chapel',         icon: Church,        color: 'text-purple-600' },
                    { label: 'Security Rounds',       to: '/app/security',       icon: Shield,        color: 'text-indigo-600' },
                    { label: 'Admin Panel',           to: '/app/admin',          icon: Settings,      color: 'text-slate-600' },
                  ].map(item => {
                    const Icon = item.icon
                    return (
                      <button key={item.to} onClick={() => navigate(item.to)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors group text-left">
                        <Icon size={15} className={item.color} />
                        <span className="text-sm text-slate-600 group-hover:text-slate-900 flex-1">{item.label}</span>
                        <ChevronRight size={13} className="text-slate-300 group-hover:text-slate-400 transition-colors" />
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
