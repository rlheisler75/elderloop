import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { CalendarClock, CheckCircle2 } from 'lucide-react'
import { Badge } from '../ui'
import { fmt, getLeadStatus } from '../constants'
import { ActivityModal } from './PipelineTab'

const BUCKETS = [
  { key: 'overdue',  label: 'Overdue',  badge: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900' },
  { key: 'today',    label: 'Due Today', badge: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900' },
  { key: 'upcoming', label: 'Upcoming', badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
]

function bucketFor(scheduledAt) {
  const t = new Date(scheduledAt).getTime()
  const now = Date.now()
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999)
  if (t < now) return 'overdue'
  if (t <= endOfToday.getTime()) return 'today'
  return 'upcoming'
}

export default function FollowUpsTab({ orgId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activityLead, setActivityLead] = useState(null)

  const fetchItems = useCallback(async () => {
    if (!orgId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase.from('lead_activities')
      .select('*, lead:leads(id,first_name,last_name,email,phone,status,organization_id)')
      .eq('organization_id', orgId)
      .is('completed_at', null)
      .not('scheduled_at', 'is', null)
      .order('scheduled_at', { ascending: true })
    setItems((data || []).filter(a => a.lead))
    setLoading(false)
  }, [orgId])

  useEffect(() => { fetchItems() }, [fetchItems])

  const markDone = async (id) => {
    await supabase.from('lead_activities').update({ completed_at: new Date().toISOString() }).eq('id', id)
    fetchItems()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <CheckCircle2 size={40} className="mx-auto text-slate-200 mb-3" />
        <p className="text-slate-400 font-medium">All caught up</p>
        <p className="text-slate-300 text-sm mt-1">Scheduled follow-ups will show up here — set one from a lead's activity log</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {BUCKETS.map(bucket => {
        const bucketItems = items.filter(a => bucketFor(a.scheduled_at) === bucket.key)
        if (bucketItems.length === 0) return null
        return (
          <div key={bucket.key}>
            <div className="flex items-center gap-2 mb-3">
              <Badge color={bucket.badge}>{bucket.label}</Badge>
              <span className="text-xs text-slate-400">{bucketItems.length} follow-up{bucketItems.length === 1 ? '' : 's'}</span>
            </div>
            <div className="space-y-2">
              {bucketItems.map(a => {
                const st = getLeadStatus(a.lead.status)
                return (
                  <div key={a.id} className="flex items-center justify-between gap-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <CalendarClock size={16} className="text-slate-300 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-800 dark:text-slate-100 text-sm">{a.lead.first_name} {a.lead.last_name}</p>
                          <Badge color={st.color}>{st.label}</Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {fmt(a.activity_type)}{a.subject ? ` — ${a.subject}` : ''} · {new Date(a.scheduled_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setActivityLead(a.lead)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        Open
                      </button>
                      <button onClick={() => markDone(a.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900 hover:bg-green-100 transition-colors">
                        Mark Done
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {activityLead && (
        <ActivityModal lead={activityLead} onClose={() => { setActivityLead(null); fetchItems() }} />
      )}
    </div>
  )
}
