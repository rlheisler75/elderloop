import { useState, useEffect, useCallback, Fragment } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Activity, Loader2, ChevronDown, ChevronRight, Search,
  LogIn, LogOut, ShieldAlert, Clock, FilePlus, FilePen, Trash2
} from 'lucide-react'

const PAGE_SIZE = 50

const CATEGORY_TABS = [
  { key: 'all',    label: 'All' },
  { key: 'auth',   label: 'Auth Events',  actions: ['LOGIN', 'LOGOUT', 'AUTO_LOGOFF', 'LOGIN_FAILED'] },
  { key: 'data',   label: 'Data Changes', actions: ['INSERT', 'UPDATE', 'DELETE'] },
  { key: 'failed', label: 'Failed Logins', actions: ['LOGIN_FAILED'] },
]

const ACTION_CONFIG = {
  LOGIN:        { label: 'Login',        icon: LogIn,      color: 'bg-green-900/50 text-green-400 border-green-700' },
  LOGOUT:       { label: 'Logout',       icon: LogOut,     color: 'bg-slate-800 text-slate-400 border-slate-700' },
  AUTO_LOGOFF:  { label: 'Auto Logoff',  icon: Clock,      color: 'bg-amber-900/50 text-amber-400 border-amber-700' },
  LOGIN_FAILED: { label: 'Login Failed', icon: ShieldAlert,color: 'bg-red-900/50 text-red-400 border-red-700' },
  INSERT:       { label: 'Created',      icon: FilePlus,   color: 'bg-blue-900/50 text-blue-400 border-blue-700' },
  UPDATE:       { label: 'Updated',      icon: FilePen,    color: 'bg-purple-900/50 text-purple-400 border-purple-700' },
  DELETE:       { label: 'Deleted',      icon: Trash2,     color: 'bg-red-900/50 text-red-400 border-red-700' },
}

const NOISY_KEYS = new Set(['updated_at', 'created_at'])

const fmtDateTime = (d) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

const fmtVal = (v) => {
  if (v === null || v === undefined) return '—'
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
  return s.length > 100 ? s.slice(0, 100) + '…' : s
}

// ── Expandable diff for INSERT/UPDATE/DELETE rows ──
function RecordDiff({ event }) {
  const { action, old_values, new_values } = event
  if (action === 'INSERT' && new_values) {
    const keys = Object.keys(new_values).filter(k => !NOISY_KEYS.has(k) && new_values[k] !== null)
    return (
      <div className="space-y-1">
        {keys.map(k => (
          <div key={k} className="flex gap-2 text-xs">
            <span className="text-slate-500 font-mono flex-shrink-0">{k}:</span>
            <span className="text-slate-300 truncate">{fmtVal(new_values[k])}</span>
          </div>
        ))}
      </div>
    )
  }
  if (action === 'DELETE' && old_values) {
    const keys = Object.keys(old_values).filter(k => !NOISY_KEYS.has(k) && old_values[k] !== null)
    return (
      <div className="space-y-1">
        {keys.map(k => (
          <div key={k} className="flex gap-2 text-xs">
            <span className="text-slate-500 font-mono flex-shrink-0">{k}:</span>
            <span className="text-red-300/70 truncate line-through">{fmtVal(old_values[k])}</span>
          </div>
        ))}
      </div>
    )
  }
  if (action === 'UPDATE' && old_values && new_values) {
    const keys = new Set([...Object.keys(old_values), ...Object.keys(new_values)])
    const changed = [...keys].filter(k => !NOISY_KEYS.has(k) && JSON.stringify(old_values[k]) !== JSON.stringify(new_values[k]))
    if (changed.length === 0) return <p className="text-xs text-slate-600">No field-level changes captured.</p>
    return (
      <div className="space-y-1.5">
        {changed.map(k => (
          <div key={k} className="text-xs">
            <span className="text-slate-500 font-mono">{k}:</span>{' '}
            <span className="text-red-300/70 line-through">{fmtVal(old_values[k])}</span>{' '}
            <span className="text-slate-600">→</span>{' '}
            <span className="text-green-300">{fmtVal(new_values[k])}</span>
          </div>
        ))}
      </div>
    )
  }
  return <p className="text-xs text-slate-600">No record details captured for this event.</p>
}

export default function PlatformActivityTab() {
  const [events, setEvents]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore]   = useState(true)
  const [category, setCategory] = useState('all')
  const [search, setSearch]     = useState('')
  const [expanded, setExpanded] = useState(null)
  const [stats, setStats]       = useState({ total: null, failedLogins: null, dataChanges: null })

  const buildQuery = useCallback((from, to) => {
    let q = supabase.from('audit_log').select('*, organizations(name)').order('created_at', { ascending: false }).range(from, to)
    const cat = CATEGORY_TABS.find(c => c.key === category)
    if (cat?.actions) q = q.in('action', cat.actions)
    if (search.trim()) q = q.ilike('user_email', `%${search.trim()}%`)
    return q
  }, [category, search])

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    const { data } = await buildQuery(0, PAGE_SIZE - 1)
    setEvents(data || [])
    setHasMore((data || []).length === PAGE_SIZE)
    setLoading(false)
  }, [buildQuery])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  useEffect(() => {
    (async () => {
      const [{ count: total }, { count: failedLogins }, { count: dataChanges }] = await Promise.all([
        supabase.from('audit_log').select('id', { count: 'exact', head: true }),
        supabase.from('audit_log').select('id', { count: 'exact', head: true }).eq('action', 'LOGIN_FAILED'),
        supabase.from('audit_log').select('id', { count: 'exact', head: true }).in('action', ['INSERT', 'UPDATE', 'DELETE']),
      ])
      setStats({ total: total ?? 0, failedLogins: failedLogins ?? 0, dataChanges: dataChanges ?? 0 })
    })()
  }, [])

  const loadMore = async () => {
    setLoadingMore(true)
    const { data } = await buildQuery(events.length, events.length + PAGE_SIZE - 1)
    setEvents(prev => [...prev, ...(data || [])])
    setHasMore((data || []).length === PAGE_SIZE)
    setLoadingMore(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 style={{ fontFamily: '"Playfair Display", serif' }} className="text-xl font-semibold text-white">
          Platform Activity
        </h2>
        <p className="text-slate-500 text-sm mt-0.5">Cross-org login events and PHI-relevant data changes</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Events (All Time)', value: stats.total,        icon: Activity,    color: 'text-brand-400' },
          { label: 'Failed Logins',           value: stats.failedLogins, icon: ShieldAlert, color: 'text-red-400' },
          { label: 'Data Changes',            value: stats.dataChanges,  icon: FilePen,     color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <s.icon size={18} className={s.color} />
            </div>
            <div className={`text-2xl font-bold font-display ${s.color}`}>
              {s.value === null ? <Loader2 size={20} className="animate-spin" /> : s.value.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 border-b border-slate-800 flex-1">
          {CATEGORY_TABS.map(t => (
            <button key={t.key} onClick={() => setCategory(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                category === t.key ? 'border-brand-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by email…"
            className="pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 w-56" />
        </div>
      </div>

      {/* Event list */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin text-brand-400" />
          </div>
        ) : events.length === 0 ? (
          <div className="py-16 text-center text-slate-600">
            <Activity size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No matching events</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="border-b border-slate-800">
                <tr>
                  {['', 'When', 'User', 'Action', 'Record', 'Org'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map(e => {
                  const cfg = ACTION_CONFIG[e.action] || { label: e.action, icon: Activity, color: 'bg-slate-800 text-slate-500 border-slate-700' }
                  const Icon = cfg.icon
                  const expandable = e.old_values || e.new_values
                  const isOpen = expanded === e.id
                  return (
                    <Fragment key={e.id}>
                      <tr
                        onClick={() => expandable && setExpanded(isOpen ? null : e.id)}
                        className={`border-b border-slate-800/60 transition-colors ${expandable ? 'cursor-pointer hover:bg-slate-800/30' : ''}`}>
                        <td className="pl-5 py-3 w-6">
                          {expandable && (isOpen ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />)}
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">{fmtDateTime(e.created_at)}</td>
                        <td className="px-5 py-3">
                          <div className="text-sm text-slate-200">{e.user_email || 'Unknown'}</div>
                          {e.user_role && <div className="text-xs text-slate-500 capitalize">{e.user_role.replace('_', ' ')}</div>}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium border ${cfg.color}`}>
                            <Icon size={11} /> {cfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-400">
                          {e.table_name ? <span className="font-mono">{e.table_name}</span> : (e.notes || '—')}
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-500">{e.organizations?.name || '—'}</td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-slate-950/50 border-b border-slate-800/60">
                          <td />
                          <td colSpan={5} className="px-5 py-4">
                            <RecordDiff event={e} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
            {hasMore && (
              <div className="py-4 flex justify-center border-t border-slate-800">
                <button onClick={loadMore} disabled={loadingMore}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                  {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
                  {loadingMore ? 'Loading…' : 'Load 50 more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
