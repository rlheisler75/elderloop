import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Users, AlertTriangle, Wrench, CalendarDays, TrendingUp,
  Shield, Gauge, Car, ChevronRight, LogOut, Settings,
  CheckCircle2, Clock, ArrowUpRight, Building2, Activity
} from 'lucide-react'

const today = () => new Date().toISOString().split('T')[0]

function KPICard({ icon: Icon, label, value, sub, color, bg, trend, to }) {
  const navigate = useNavigate()
  return (
    <button onClick={() => to && navigate(to)}
      className={`${bg} rounded-2xl p-5 text-left hover:shadow-md transition-all group border-2 border-transparent`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-xl bg-white/50`}><Icon size={18} className={color} /></div>
        {to && <ArrowUpRight size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />}
      </div>
      <div className={`text-3xl font-bold ${color}`} style={{ fontFamily: '"Playfair Display", serif' }}>{value}</div>
      <div className="text-slate-600 text-xs font-medium mt-1">{label}</div>
      {sub && <div className="text-slate-400 text-xs mt-0.5">{sub}</div>}
    </button>
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
    const orgId = organization.id
    const todayStr = today()

    const [resRes, woRes, incRes, tripRes, actRes, meterRes] = await Promise.all([
      supabase.from('residents').select('id,care_level').eq('organization_id', orgId).eq('is_active', true),
      supabase.from('work_orders').select('id,status,priority').eq('organization_id', orgId).neq('status','closed').neq('status','cancelled'),
      supabase.from('incident_reports').select('id,severity,status,created_at').eq('organization_id', orgId).eq('is_active', true),
      supabase.from('trips').select('id,status').eq('organization_id', orgId).eq('trip_date', todayStr),
      supabase.from('activities').select('id,start_date,recur_type').eq('organization_id', orgId).eq('is_active', true),
      supabase.from('meter_readings').select('estimated_cost,created_at').eq('organization_id', orgId).gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    ])

    const residents   = resRes.data  || []
    const workOrders  = woRes.data   || []
    const incidents   = incRes.data  || []
    const trips       = tripRes.data || []
    const activities  = actRes.data  || []
    const readings    = meterRes.data || []

    // This month incidents
    const thisMonth = new Date()
    const monthIncidents = incidents.filter(i => {
      const d = new Date(i.created_at)
      return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear()
    })

    // Today activities (simple check)
    const todayActs = activities.filter(a => a.start_date === todayStr || a.recur_type !== 'none')

    // Meter cost this month
    const monthCost = readings.reduce((sum, r) => sum + (parseFloat(r.estimated_cost) || 0), 0)

    // Care level breakdown
    const byLevel = residents.reduce((acc, r) => {
      const k = r.care_level || 'independent'
      acc[k] = (acc[k] || 0) + 1
      return acc
    }, {})

    setData({
      totalResidents: residents.length,
      byLevel,
      openWO:       workOrders.length,
      urgentWO:     workOrders.filter(w => w.priority === 'urgent').length,
      openIncidents: incidents.filter(i => ['submitted','under_review'].includes(i.status)).length,
      monthIncidents: monthIncidents.length,
      criticalInc:   incidents.filter(i => i.severity === 'critical' && i.status !== 'closed').length,
      todayTrips:    trips.length,
      todayActs:     todayActs.length,
      monthCost,
    })
    setLoading(false)
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="bg-brand-950 px-8 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">EL</span>
              </div>
              <span className="text-white font-semibold" style={{ fontFamily: '"Playfair Display", serif' }}>ElderLoop</span>
              <span className="text-brand-400 text-xs ml-2">· {organization?.name}</span>
            </div>
            <h1 className="text-white text-2xl font-bold mt-2" style={{ fontFamily: '"Playfair Display", serif' }}>
              {greeting()}, {profile?.first_name} 👋
            </h1>
            <p className="text-brand-400 text-sm mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-4 py-2 bg-brand-800 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors">
              <Activity size={15} /> Operations
            </button>
            <button onClick={() => navigate('/admin')}
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

      <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">
        {loading ? (
          <div className="text-center py-20 text-slate-400">Loading executive summary...</div>
        ) : (
          <>
            {/* Executive Summary Banner */}
            {(data.criticalInc > 0 || data.urgentWO > 0) && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center gap-4">
                <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold text-red-800 text-sm">Attention Required</div>
                  <div className="text-red-600 text-xs mt-0.5">
                    {data.criticalInc > 0 && `${data.criticalInc} critical incident${data.criticalInc > 1 ? 's' : ''} open`}
                    {data.criticalInc > 0 && data.urgentWO > 0 && ' · '}
                    {data.urgentWO > 0 && `${data.urgentWO} urgent maintenance request${data.urgentWO > 1 ? 's' : ''}`}
                  </div>
                </div>
                <button onClick={() => navigate('/incidents')}
                  className="flex items-center gap-1 text-xs text-red-600 font-medium hover:text-red-800">
                  View <ChevronRight size={13} />
                </button>
              </div>
            )}

            {/* KPI Grid */}
            <div>
              <h2 className="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">Key Metrics</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPICard icon={Users}         label="Total Residents"     value={data.totalResidents} sub="Active census"             color="text-brand-600"  bg="bg-brand-50"  to="/directory" />
                <KPICard icon={Wrench}        label="Open Maintenance"    value={data.openWO}         sub={`${data.urgentWO} urgent`} color="text-amber-600"  bg="bg-amber-50"  to="/maintenance" />
                <KPICard icon={AlertTriangle} label="Open Incidents"      value={data.openIncidents}  sub="Awaiting review"           color="text-red-600"    bg="bg-red-50"    to="/incidents" />
                <KPICard icon={CalendarDays}  label="Today's Activities"  value={data.todayActs}      sub="Scheduled today"           color="text-purple-600" bg="bg-purple-50" to="/activities" />
                <KPICard icon={Car}           label="Today's Trips"       value={data.todayTrips}     sub="Medical transport"         color="text-green-600"  bg="bg-green-50"  to="/transportation" />
                <KPICard icon={TrendingUp}    label="Incidents This Month" value={data.monthIncidents} sub="Last 30 days"             color="text-orange-600" bg="bg-orange-50" to="/incidents" />
                <KPICard icon={Gauge}         label="Utility Cost (MTD)"  value={data.monthCost > 0 ? `$${data.monthCost.toFixed(0)}` : '—'} sub="Month to date" color="text-slate-600" bg="bg-slate-100" to="/meters" />
                <KPICard icon={Shield}        label="Security"            value="Active"              sub="GPS rounds enabled"        color="text-indigo-600" bg="bg-indigo-50" to="/security" />
              </div>
            </div>

            {/* Census breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"
                  style={{ fontFamily: '"Playfair Display", serif' }}>
                  <Building2 size={16} className="text-brand-600" /> Census by Care Level
                </h2>
                {[
                  { key: 'independent',    label: 'Independent Living',  color: 'bg-green-500' },
                  { key: 'assisted',       label: 'Assisted Living',     color: 'bg-blue-500' },
                  { key: 'memory_care',    label: 'Memory Care',         color: 'bg-purple-500' },
                  { key: 'skilled_nursing',label: 'Skilled Nursing',     color: 'bg-orange-500' },
                  { key: 'rehab',          label: 'Rehab',               color: 'bg-cyan-500' },
                ].map(level => {
                  const count = data.byLevel?.[level.key] || 0
                  const pct   = data.totalResidents > 0 ? Math.round((count / data.totalResidents) * 100) : 0
                  return (
                    <div key={level.key} className="flex items-center gap-3 mb-3">
                      <div className="text-xs text-slate-500 w-36 flex-shrink-0">{level.label}</div>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${level.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-xs font-semibold text-slate-700 w-8 text-right">{count}</div>
                      <div className="text-xs text-slate-400 w-8">{pct}%</div>
                    </div>
                  )
                })}
                {data.totalResidents === 0 && <p className="text-slate-400 text-sm">No residents on file yet.</p>}
              </div>

              {/* Quick links */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="font-semibold text-slate-800 mb-4" style={{ fontFamily: '"Playfair Display", serif' }}>
                  Quick Navigation
                </h2>
                <div className="space-y-1">
                  {[
                    { label: 'Operational Dashboard', to: '/dashboard',      icon: Activity,      color: 'text-brand-600' },
                    { label: 'Resident Directory',    to: '/directory',      icon: Users,         color: 'text-green-600' },
                    { label: 'Incident Reports',      to: '/incidents',      icon: AlertTriangle, color: 'text-red-600' },
                    { label: 'Maintenance Requests',  to: '/maintenance',    icon: Wrench,        color: 'text-amber-600' },
                    { label: 'Transportation',        to: '/transportation', icon: Car,           color: 'text-blue-600' },
                    { label: 'Security Rounds',       to: '/security',       icon: Shield,        color: 'text-indigo-600' },
                    { label: 'Admin Panel',           to: '/admin',          icon: Settings,      color: 'text-slate-600' },
                  ].map(item => {
                    const Icon = item.icon
                    return (
                      <button key={item.to} onClick={() => navigate(item.to)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group text-left">
                        <Icon size={16} className={item.color} />
                        <span className="text-sm text-slate-600 group-hover:text-slate-900 flex-1">{item.label}</span>
                        <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-400 transition-colors" />
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
