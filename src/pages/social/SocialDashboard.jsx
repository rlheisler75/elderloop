import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  AlertTriangle, CheckCircle, Clock, Users, FileText,
  TrendingUp, AlertCircle, Loader2, RefreshCw, Shield
} from 'lucide-react'

// ── Access guard — directors and admins only ──────────────────
const DIRECTOR_ROLES = ['social_services','supervisor','manager','org_admin','ceo','super_admin']

// ── Mood config matching MoodTracker.jsx ─────────────────────
const MOOD_CONFIG = {
  happy:     { label: 'Happy',     color: '#16a34a', emoji: '😊' },
  content:   { label: 'Content',   color: '#0d9488', emoji: '😌' },
  neutral:   { label: 'Neutral',   color: '#64748b', emoji: '😐' },
  anxious:   { label: 'Anxious',   color: '#ca8a04', emoji: '😟' },
  sad:       { label: 'Sad',       color: '#2563eb', emoji: '😢' },
  agitated:  { label: 'Agitated',  color: '#ea580c', emoji: '😠' },
  confused:  { label: 'Confused',  color: '#9333ea', emoji: '😕' },
  withdrawn: { label: 'Withdrawn', color: '#4f46e5', emoji: '😶' },
  combative: { label: 'Combative', color: '#dc2626', emoji: '😤' },
  other:     { label: 'Other',     color: '#94a3b8', emoji: '🔵' },
}

// ── Mini components ───────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color = 'text-brand-600', bg = 'bg-brand-50', urgent }) {
  return (
    <div className={`rounded-2xl p-4 border ${urgent ? 'border-red-200 bg-red-50' : 'bg-white border-slate-100 shadow-sm'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className={`text-3xl font-bold font-display ${urgent ? 'text-red-600' : color}`}>{value}</div>
          <div className="text-xs font-medium text-slate-500 mt-0.5">{label}</div>
          {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${urgent ? 'bg-red-100' : bg}`}>
          <Icon size={16} className={urgent ? 'text-red-500' : color} />
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ title, sub }) {
  return (
    <div className="mb-4">
      <h2 className="font-display font-bold text-slate-800 text-base">{title}</h2>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// Horizontal bar chart using CSS
function HBar({ label, value, max, color, emoji }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-6 text-center flex-shrink-0 text-base leading-none">{emoji}</div>
      <div className="w-20 text-xs text-slate-600 flex-shrink-0 truncate">{label}</div>
      <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="w-8 text-right text-xs font-semibold text-slate-600 flex-shrink-0">{value}</div>
    </div>
  )
}

// Stacked monthly bars for grievances
function StackedMonthBar({ label, open, resolved, max }) {
  const openH    = max > 0 ? Math.round((open    / max) * 80) : 0
  const resolvedH = max > 0 ? Math.round((resolved / max) * 80) : 0
  const total = open + resolved
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <div className="flex flex-col-reverse gap-0.5 w-full items-center" style={{ height: 88 }}>
        {open > 0 && (
          <div className="w-8 rounded-sm bg-blue-400 transition-all"
            style={{ height: openH }} title={`Open: ${open}`} />
        )}
        {resolved > 0 && (
          <div className="w-8 rounded-sm bg-green-400 transition-all"
            style={{ height: resolvedH }} title={`Resolved: ${resolved}`} />
        )}
      </div>
      <div className="text-xs text-slate-400 text-center leading-tight">{label}</div>
      {total > 0 && <div className="text-xs font-semibold text-slate-600">{total}</div>}
    </div>
  )
}

// Behavioral concerns trend (dot-connected line using CSS/flexbox)
function TrendDots({ weeks }) {
  if (!weeks.length) return <div className="text-xs text-slate-400 py-4 text-center">No data yet</div>
  const max = Math.max(...weeks.map(w => w.concerns), 1)
  return (
    <div className="flex items-end gap-1 h-20 px-2">
      {weeks.map((w, i) => {
        const h = Math.round((w.concerns / max) * 72)
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1" title={`Week of ${w.label}: ${w.concerns} concerns`}>
            <div className="w-full flex items-end justify-center" style={{ height: 72 }}>
              <div className={`w-full max-w-[24px] rounded-t-sm transition-all ${w.concerns > 0 ? 'bg-orange-400' : 'bg-slate-100'}`}
                style={{ height: Math.max(h, w.concerns > 0 ? 4 : 2) }} />
            </div>
            <div className="text-xs text-slate-400 truncate w-full text-center" style={{ fontSize: 9 }}>{w.label}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function SocialDashboard() {
  const { profile, organization } = useAuth()
  const isDirector = DIRECTOR_ROLES.includes(profile?.role)

  // Hooks must all be declared before any conditional return
  const [loading,       setLoading]       = useState(true)
  const [refreshing,    setRefreshing]    = useState(false)
  const [compliance,    setCompliance]    = useState(null)
  const [caseload,      setCaseload]      = useState([])
  const [moodData,      setMoodData]      = useState([])
  const [grievanceData, setGrievanceData] = useState([])
  const [concernTrend,  setConcernTrend]  = useState([])
  const [triggerData,   setTriggerData]   = useState([])

  useEffect(() => { if (isDirector) fetchAll() }, [isDirector])

  async function fetchAll(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true)
    const orgId = organization?.id

    await Promise.all([
      fetchCompliance(orgId),
      fetchCaseload(orgId),
      fetchMoodDistribution(orgId),
      fetchGrievanceTrend(orgId),
      fetchConcernTrend(orgId),
      fetchTriggerFrequency(orgId),
    ])

    if (isRefresh) setRefreshing(false); else setLoading(false)
  }

  async function fetchCompliance(orgId) {
    const { data } = await supabase.rpc('get_ss_compliance_summary', { p_org_id: orgId })
    setCompliance(data)
  }

  async function fetchCaseload(orgId) {
    const { data } = await supabase.rpc('get_ss_caseload', { p_org_id: orgId })
    setCaseload(data || [])
  }

  async function fetchMoodDistribution(orgId) {
    // Last 30 days mood counts
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('ss_mood_logs')
      .select('mood')
      .eq('organization_id', orgId)
      .gte('logged_at', since)

    if (!data) return
    const counts = {}
    data.forEach(r => { counts[r.mood] = (counts[r.mood] || 0) + 1 })
    const total = data.length
    const sorted = Object.entries(counts)
      .sort(([,a],[,b]) => b - a)
      .map(([mood, count]) => ({ mood, count, pct: total > 0 ? Math.round((count/total)*100) : 0 }))
    setMoodData(sorted)
  }

  async function fetchGrievanceTrend(orgId) {
    // Last 6 months of grievances grouped by month
    const since = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('ss_grievances')
      .select('status, filed_at')
      .eq('organization_id', orgId)
      .gte('filed_at', since)

    if (!data) return

    // Build last 6 months
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      months.push({
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        year:  d.getFullYear(),
        month: d.getMonth(),
        open: 0, resolved: 0
      })
    }

    data.forEach(g => {
      const d = new Date(g.filed_at)
      const m = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth())
      if (!m) return
      if (['resolved','withdrawn'].includes(g.status)) m.resolved++
      else m.open++
    })

    setGrievanceData(months)
  }

  async function fetchConcernTrend(orgId) {
    // Last 8 weeks of behavioral concerns
    const since = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('ss_mood_logs')
      .select('logged_at, behavioral_concerns')
      .eq('organization_id', orgId)
      .gte('logged_at', since)

    if (!data) return

    const weeks = []
    for (let i = 7; i >= 0; i--) {
      const start = new Date(Date.now() - (i+1) * 7 * 24 * 60 * 60 * 1000)
      const end   = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000)
      weeks.push({
        label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        concerns: 0, total: 0, start, end
      })
    }

    data.forEach(r => {
      const d = new Date(r.logged_at)
      const w = weeks.find(w => d >= w.start && d < w.end)
      if (!w) return
      w.total++
      if (r.behavioral_concerns) w.concerns++
    })

    setConcernTrend(weeks)
  }

  async function fetchTriggerFrequency(orgId) {
    // Mood logs with triggers, last 30 days — group by mood for now
    // (triggers are free text, so we aggregate by mood + behavioral_concerns flag)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('ss_mood_logs')
      .select('triggers')
      .eq('organization_id', orgId)
      .eq('behavioral_concerns', true)
      .gte('logged_at', since)
      .not('triggers', 'is', null)

    if (!data) return

    // Simple word frequency from trigger text
    const freq = {}
    data.forEach(r => {
      if (!r.triggers) return
      // Extract meaningful words (3+ chars, not common stopwords)
      const words = r.triggers.toLowerCase()
        .replace(/[^a-z\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 4 && !['with','from','that','this','when','they','were','have','been','will','their','than','then'].includes(w))
      words.forEach(w => { freq[w] = (freq[w] || 0) + 1 })
    })

    const sorted = Object.entries(freq)
      .sort(([,a],[,b]) => b - a)
      .slice(0, 8)
      .map(([word, count]) => ({ word, count }))
    setTriggerData(sorted)
  }

  // Access guard — rendered conditionally (not as early return) to respect Rules of Hooks
  if (!isDirector) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
        <Shield size={32} className="text-amber-500 mx-auto mb-3" />
        <h3 className="font-display font-bold text-slate-800 mb-1">Director Access Required</h3>
        <p className="text-slate-500 text-sm">This dashboard is restricted to Social Services Directors and Administrators.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-brand-400" />
      </div>
    )
  }

  const moodMax  = moodData.length ? Math.max(...moodData.map(m => m.count)) : 1
  const grievMax = grievanceData.length ? Math.max(...grievanceData.map(m => m.open + m.resolved), 1) : 1
  const trigMax  = triggerData.length ? triggerData[0].count : 1

  const hasAlerts = compliance && (
    +compliance.missing_assessment > 0 ||
    +compliance.overdue_review > 0 ||
    +compliance.overdue_grievances > 0 ||
    +compliance.missing_advance_directive > 0
  )

  const profilePct = compliance && +compliance.total_residents > 0
    ? Math.round((+compliance.total_with_profiles / +compliance.total_residents) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-slate-800 text-lg">Director Dashboard</h2>
          <p className="text-xs text-slate-400 mt-0.5">Compliance and facility-wide social services metrics</p>
        </div>
        <button onClick={() => fetchAll(true)} disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-brand-50">
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ── 1. COMPLIANCE ALERT BANNER ─────────────────────────── */}
      {compliance && (
        <div className={`rounded-2xl border p-5 ${hasAlerts ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center gap-2 mb-4">
            {hasAlerts
              ? <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
              : <CheckCircle size={18} className="text-green-600 flex-shrink-0" />}
            <h3 className={`font-display font-bold text-base ${hasAlerts ? 'text-amber-800' : 'text-green-800'}`}>
              {hasAlerts ? 'Compliance Alerts Require Attention' : 'All Compliance Checks Passed'}
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={`rounded-xl p-3 text-center ${+compliance.missing_assessment > 0 ? 'bg-red-50 border border-red-200' : 'bg-white border border-green-100'}`}>
              <div className={`text-3xl font-bold font-display ${+compliance.missing_assessment > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {compliance.missing_assessment}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 leading-tight">Missing Initial Assessment</div>
              {+compliance.missing_assessment > 0 && (
                <div className="text-xs text-red-500 font-medium mt-1">Action required</div>
              )}
            </div>

            <div className={`rounded-xl p-3 text-center ${+compliance.overdue_review > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-white border border-green-100'}`}>
              <div className={`text-3xl font-bold font-display ${+compliance.overdue_review > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {compliance.overdue_review}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 leading-tight">Annual Review Overdue</div>
              {+compliance.overdue_review > 0 && (
                <div className="text-xs text-amber-600 font-medium mt-1">{'>'} 365 days</div>
              )}
            </div>

            <div className={`rounded-xl p-3 text-center ${+compliance.missing_advance_directive > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-white border border-green-100'}`}>
              <div className={`text-3xl font-bold font-display ${+compliance.missing_advance_directive > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {compliance.missing_advance_directive}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 leading-tight">No Advance Directive on File</div>
            </div>

            <div className={`rounded-xl p-3 text-center ${+compliance.overdue_grievances > 0 ? 'bg-red-50 border border-red-200' : 'bg-white border border-green-100'}`}>
              <div className={`text-3xl font-bold font-display ${+compliance.overdue_grievances > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {compliance.overdue_grievances}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 leading-tight">Grievances {'>'} 30 Days Open</div>
              {+compliance.overdue_grievances > 0 && (
                <div className="text-xs text-red-500 font-medium mt-1">Overdue resolution</div>
              )}
            </div>
          </div>

          {/* Assessment completion bar */}
          <div className="mt-4 pt-4 border-t border-amber-100">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
              <span className="font-medium">Psycho-Social Assessment Completion</span>
              <span className="font-bold">{compliance.total_with_profiles} / {compliance.total_residents} residents ({profilePct}%)</span>
            </div>
            <div className="h-3 bg-white rounded-full overflow-hidden border border-slate-200">
              <div className={`h-full rounded-full transition-all duration-700 ${
                profilePct === 100 ? 'bg-green-500' :
                profilePct >= 75  ? 'bg-amber-400' : 'bg-red-400'
              }`} style={{ width: `${profilePct}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* ── 2. TREND ANALYTICS ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Mood Distribution — last 30 days */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <SectionHeader title="Mood Distribution" sub="All logged moods — last 30 days" />
          {moodData.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">No mood logs in the last 30 days</div>
          ) : (
            <div className="space-y-0.5">
              {moodData.map(({ mood, count }) => {
                const cfg = MOOD_CONFIG[mood] || { label: mood, color: '#94a3b8', emoji: '🔵' }
                return (
                  <HBar key={mood}
                    label={cfg.label} value={count}
                    max={moodMax} color={cfg.color} emoji={cfg.emoji} />
                )
              })}
            </div>
          )}
        </div>

        {/* Grievances by Month */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <SectionHeader title="Grievances by Month" sub="Open vs. resolved — last 6 months" />
          <div className="flex items-end gap-1 px-2 py-2">
            {grievanceData.map((m, i) => (
              <StackedMonthBar key={i}
                label={m.label} open={m.open}
                resolved={m.resolved} max={grievMax} />
            ))}
          </div>
          <div className="flex items-center gap-4 justify-center mt-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-3 h-3 rounded-sm bg-green-400" /> Resolved
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-3 h-3 rounded-sm bg-blue-400" /> Open
            </div>
          </div>
        </div>

        {/* Behavioral Concerns Trend — last 8 weeks */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <SectionHeader title="Behavioral Concerns Trend" sub="Weekly count — last 8 weeks" />
          <TrendDots weeks={concernTrend} />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-slate-50 rounded-xl">
              <div className="text-xl font-bold font-display text-orange-500">
                {concernTrend.reduce((a, w) => a + w.concerns, 0)}
              </div>
              <div className="text-xs text-slate-400">Total Concerns (8 wks)</div>
            </div>
            <div className="text-center p-2 bg-slate-50 rounded-xl">
              <div className="text-xl font-bold font-display text-slate-600">
                {concernTrend.reduce((a, w) => a + w.total, 0) > 0
                  ? Math.round((concernTrend.reduce((a, w) => a + w.concerns, 0) /
                      concernTrend.reduce((a, w) => a + w.total, 0)) * 100)
                  : 0}%
              </div>
              <div className="text-xs text-slate-400">Entries with Concerns</div>
            </div>
          </div>
        </div>

        {/* Top Behavioral Triggers */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <SectionHeader title="Common Trigger Keywords" sub="From behavioral concern entries — last 30 days" />
          {triggerData.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">No trigger data yet — log mood entries with behavioral concerns noted to populate this chart</div>
          ) : (
            <div className="space-y-0.5">
              {triggerData.map(({ word, count }) => (
                <div key={word} className="flex items-center gap-3 py-1.5">
                  <div className="w-24 text-xs text-slate-600 capitalize truncate">{word}</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className="h-full rounded-full bg-orange-400 transition-all duration-500"
                      style={{ width: `${Math.round((count / trigMax) * 100)}%` }} />
                  </div>
                  <div className="w-6 text-right text-xs font-semibold text-slate-600">{count}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 3. CASELOAD SUMMARY ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <SectionHeader title="Caseload Summary" sub="Active residents per social services staff member" />
        </div>

        {caseload.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            <Users size={28} className="mx-auto mb-2 opacity-30" />
            <p>No social services staff found</p>
            <p className="text-xs mt-1">Assign the "Social Services" role to staff in Admin → Users</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Staff Member', 'Role', 'Assigned Residents', 'Open Grievances', 'Scheduled Conferences', 'Workload'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {caseload.map((row, i) => {
                const workload = Math.min(+row.assigned * 10 + +row.open_grievances * 5 + +row.open_conferences * 3, 100)
                const workloadColor = workload > 70 ? 'bg-red-400' : workload > 40 ? 'bg-amber-400' : 'bg-green-400'
                return (
                  <tr key={row.worker_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-brand-100 rounded-xl flex items-center justify-center text-brand-700 font-bold text-xs flex-shrink-0">
                          {row.first_name?.[0]}{row.last_name?.[0]}
                        </div>
                        <span className="font-medium text-slate-800 text-sm">{row.first_name} {row.last_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-lg capitalize">
                        {row.role?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold font-display text-brand-600">{row.assigned}</span>
                        <span className="text-xs text-slate-400">residents</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {+row.open_grievances > 0
                        ? <span className="text-sm font-semibold text-red-600 flex items-center gap-1"><AlertCircle size={13} />{row.open_grievances}</span>
                        : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {+row.open_conferences > 0
                        ? <span className="text-sm font-semibold text-blue-600 flex items-center gap-1"><Clock size={13} />{row.open_conferences}</span>
                        : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 w-32">
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${workloadColor}`}
                          style={{ width: `${workload}%` }} />
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{workload > 70 ? 'High' : workload > 40 ? 'Moderate' : 'Low'}</div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
