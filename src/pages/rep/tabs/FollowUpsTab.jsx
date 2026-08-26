import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { CalendarClock, CheckCircle2, Phone, Mail, Building2 } from 'lucide-react'
import { ProspectForm, STATUSES } from './ProspectsTab'

const BUCKETS = [
  { key: 'overdue',  label: 'Overdue',   badge: 'bg-red-100 text-red-700 border-red-200' },
  { key: 'today',    label: 'Due Today', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  { key: 'upcoming', label: 'Upcoming',  badge: 'bg-slate-100 text-slate-600 border-slate-200' },
]

const todayStr = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD, local time

function bucketFor(dateStr) {
  const today = todayStr()
  if (dateStr < today) return 'overdue'
  if (dateStr === today) return 'today'
  return 'upcoming'
}

const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null

export default function FollowUpsTab() {
  const [prospects, setProspects] = useState([])
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState(null)

  const fetchProspects = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('rep_prospects')
      .select('*')
      .not('next_follow_up', 'is', null)
      .not('status', 'in', '(won,lost)')
      .order('next_follow_up', { ascending: true })
    setProspects(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchProspects() }, [fetchProspects])

  const markDone = async (id) => {
    await supabase.from('rep_prospects').update({ next_follow_up: null }).eq('id', id)
    fetchProspects()
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  )

  if (prospects.length === 0) {
    return (
      <div className="text-center py-24">
        <CheckCircle2 size={40} className="mx-auto text-slate-200 mb-3" />
        <p className="text-slate-400 font-medium">All caught up</p>
        <p className="text-slate-300 text-sm mt-1">Set a "Next Follow-up" date on a prospect and it'll show up here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-slate-800 text-lg">Follow-Ups Due</h2>
        <p className="text-xs text-slate-400 mt-0.5">Prospects with a scheduled follow-up, soonest first</p>
      </div>

      {BUCKETS.map(bucket => {
        const items = prospects.filter(p => bucketFor(p.next_follow_up) === bucket.key)
        if (items.length === 0) return null
        return (
          <div key={bucket.key}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${bucket.badge}`}>{bucket.label}</span>
              <span className="text-xs text-slate-400">{items.length} follow-up{items.length === 1 ? '' : 's'}</span>
            </div>
            <div className="space-y-2">
              {items.map(p => {
                const status = STATUSES.find(s => s.key === p.status)
                return (
                  <div key={p.id} className="flex items-center justify-between gap-4 bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <CalendarClock size={16} className="text-slate-300 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-800 text-sm flex items-center gap-1.5 min-w-0">
                            <Building2 size={12} className="text-slate-300 flex-shrink-0" />
                            <span className="truncate">{p.community_name}</span>
                          </p>
                          {status && (
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${status.color}`}>{status.label}</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                          {fmtDate(p.next_follow_up)}
                          {p.contact_name && <span className="truncate">· {p.contact_name}</span>}
                          {p.contact_phone && <Phone size={11} className="text-slate-300 flex-shrink-0" title={p.contact_phone} />}
                          {p.contact_email && <Mail size={11} className="text-slate-300 flex-shrink-0" title={p.contact_email} />}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => setEditing(p)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                        Open
                      </button>
                      <button onClick={() => markDone(p.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors">
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

      {editing && (
        <ProspectForm
          prospect={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); fetchProspects() }}
        />
      )}
    </div>
  )
}
