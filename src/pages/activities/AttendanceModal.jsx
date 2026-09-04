import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { X, Search, Check, ClipboardCheck, CalendarCheck } from 'lucide-react'

export default function AttendanceModal({ activity, orgId, onClose }) {
  const { profile } = useAuth()
  const [residents, setResidents] = useState([])
  const [attended, setAttended] = useState(new Set()) // resident_id set
  const [rsvpd, setRsvpd] = useState(new Set()) // resident_id set — who said they were coming
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pending, setPending] = useState(new Set()) // resident_id currently being toggled

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [residentsRes, attendanceRes, rsvpRes] = await Promise.all([
      supabase.from('residents').select('id, first_name, last_name, room').eq('organization_id', orgId).eq('is_active', true).order('last_name'),
      supabase.from('activity_attendance').select('resident_id').eq('activity_id', activity.id).eq('occurrence_date', activity._date),
      supabase.from('activity_rsvps').select('resident_id').eq('activity_id', activity.id).eq('occurrence_date', activity._date),
    ])
    setResidents(residentsRes.data || [])
    setAttended(new Set((attendanceRes.data || []).map(r => r.resident_id)))
    setRsvpd(new Set((rsvpRes.data || []).map(r => r.resident_id)))
    setLoading(false)
  }

  const toggle = async (residentId) => {
    if (pending.has(residentId)) return
    setPending(p => new Set(p).add(residentId))
    const isAttended = attended.has(residentId)
    if (isAttended) {
      await supabase.from('activity_attendance').delete()
        .eq('activity_id', activity.id).eq('occurrence_date', activity._date).eq('resident_id', residentId)
      setAttended(s => { const next = new Set(s); next.delete(residentId); return next })
    } else {
      await supabase.from('activity_attendance').insert({
        organization_id: orgId,
        activity_id: activity.id,
        occurrence_date: activity._date,
        resident_id: residentId,
        recorded_by: profile.id,
        recorded_by_name: `${profile.first_name} ${profile.last_name}`,
      })
      setAttended(s => new Set(s).add(residentId))
    }
    setPending(p => { const next = new Set(p); next.delete(residentId); return next })
  }

  const filtered = residents.filter(r =>
    !search.trim() || `${r.first_name} ${r.last_name}`.toLowerCase().includes(search.toLowerCase()) || (r.room || '').toLowerCase().includes(search.toLowerCase()))

  const dateLabel = new Date(activity._date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div>
            <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ClipboardCheck size={16} className="text-brand-600" /> Attendance
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{activity.title} · {dateLabel}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="px-6 pt-4">
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or room..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <p className="text-xs text-slate-400 mb-2">{attended.size} of {residents.length} attended</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-1.5">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-sm">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">No residents match.</div>
          ) : filtered.map(r => {
            const isAttended = attended.has(r.id)
            const isPending = pending.has(r.id)
            return (
              <button key={r.id} onClick={() => toggle(r.id)} disabled={isPending}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${isAttended ? 'bg-brand-50 dark:bg-brand-950/30 border-brand-200 dark:border-brand-800' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'} ${isPending ? 'opacity-50' : ''}`}>
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${isAttended ? 'bg-brand-600 border-brand-600' : 'border-slate-300 dark:border-slate-600'}`}>
                  {isAttended && <Check size={12} className="text-white" />}
                </div>
                <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">{r.first_name} {r.last_name}</span>
                {rsvpd.has(r.id) && <CalendarCheck size={13} className="text-brand-500 dark:text-brand-400 flex-shrink-0" title="RSVP'd" />}
                {r.room && <span className="text-xs text-slate-400">Rm {r.room}</span>}
              </button>
            )
          })}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 font-medium">Done</button>
        </div>
      </div>
    </div>
  )
}
