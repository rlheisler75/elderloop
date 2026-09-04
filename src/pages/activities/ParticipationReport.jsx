// Participation reporting: reads the activity_attendance rows staff record
// from the Upcoming list (see AttendanceModal.jsx) and rolls them up into
// activity/department popularity and per-resident engagement, for any date
// range. Nothing here is logged separately — it's all derived from
// attendance already being taken.
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { computeEngagementAlerts } from './engagementAlerts'
import { BarChart3, Users, CalendarCheck, TrendingUp, UserX } from 'lucide-react'

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return localDateStr(d) }

export default function ParticipationReport({ orgId }) {
  const today = localDateStr(new Date())
  const [dateFrom, setDateFrom] = useState(daysAgo(30))
  const [dateTo, setDateTo] = useState(today)
  const [attendance, setAttendance] = useState([])
  const [activities, setActivities] = useState([])
  const [residents, setResidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [residentSort, setResidentSort] = useState('asc') // 'asc' surfaces low engagement first
  const [engagementAlerts, setEngagementAlerts] = useState(new Map())

  useEffect(() => { if (orgId) fetchReport() }, [orgId, dateFrom, dateTo])

  async function fetchReport() {
    setLoading(true)
    const alertCutoff = new Date()
    alertCutoff.setDate(alertCutoff.getDate() - 65) // independent of the picked range — always looks at "now"
    const [attRes, actRes, resRes, alertAttRes] = await Promise.all([
      supabase.from('activity_attendance').select('activity_id, occurrence_date, resident_id')
        .eq('organization_id', orgId).gte('occurrence_date', dateFrom).lte('occurrence_date', dateTo),
      supabase.from('activities').select('id, title, category, department').eq('organization_id', orgId),
      supabase.from('residents').select('id, first_name, last_name, room').eq('organization_id', orgId).eq('is_active', true),
      supabase.from('activity_attendance').select('resident_id, occurrence_date')
        .eq('organization_id', orgId).gte('occurrence_date', `${alertCutoff.getFullYear()}-${String(alertCutoff.getMonth()+1).padStart(2,'0')}-${String(alertCutoff.getDate()).padStart(2,'0')}`),
    ])
    setAttendance(attRes.data || [])
    setActivities(actRes.data || [])
    setResidents(resRes.data || [])
    setEngagementAlerts(computeEngagementAlerts(alertAttRes.data || []))
    setLoading(false)
  }

  const activityLookup = new Map(activities.map(a => [a.id, a]))
  const residentLookup = new Map(residents.map(r => [r.id, r]))

  const uniqueResidents = new Set(attendance.map(a => a.resident_id)).size
  const uniqueOccurrences = new Set(attendance.map(a => `${a.activity_id}|${a.occurrence_date}`)).size
  const avgPerOccurrence = uniqueOccurrences > 0 ? (attendance.length / uniqueOccurrences).toFixed(1) : '—'

  const byActivity = new Map()
  attendance.forEach(a => {
    const title = activityLookup.get(a.activity_id)?.title || 'Unknown Activity'
    byActivity.set(title, (byActivity.get(title) || 0) + 1)
  })
  const activityRows = Array.from(byActivity.entries()).sort((a, b) => b[1] - a[1])

  const byDept = new Map()
  attendance.forEach(a => {
    const dept = activityLookup.get(a.activity_id)?.department?.trim() || 'Unassigned'
    byDept.set(dept, (byDept.get(dept) || 0) + 1)
  })
  const deptRows = Array.from(byDept.entries()).sort((a, b) => b[1] - a[1])

  const byResident = new Map(residents.map(r => [r.id, 0]))
  attendance.forEach(a => { if (byResident.has(a.resident_id)) byResident.set(a.resident_id, byResident.get(a.resident_id) + 1) })
  const residentRows = Array.from(byResident.entries())
    .map(([id, count]) => ({ resident: residentLookup.get(id), count }))
    .filter(r => r.resident)
    .sort((a, b) => residentSort === 'asc' ? a.count - b.count : b.count - a.count)

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={17} className="text-brand-600" />
            <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100">Participation Report</h3>
          </div>
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-slate-400 text-sm">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="text-xl font-display font-bold text-slate-800 dark:text-slate-100">{attendance.length}</div>
                <div className="text-xs text-slate-400">Total Check-ins</div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="text-xl font-display font-bold text-slate-800 dark:text-slate-100">{uniqueResidents}</div>
                <div className="text-xs text-slate-400">Residents Engaged</div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="text-xl font-display font-bold text-slate-800 dark:text-slate-100">{uniqueOccurrences}</div>
                <div className="text-xs text-slate-400">Occurrences w/ Attendance Taken</div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="text-xl font-display font-bold text-slate-800 dark:text-slate-100">{avgPerOccurrence}</div>
                <div className="text-xs text-slate-400">Avg per Occurrence</div>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-5">
              Only reflects occurrences where staff actually took attendance from the Upcoming list — an activity with no bar here may have happened without attendance being recorded, not necessarily with zero attendees.
            </p>

            <div className="grid sm:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5"><TrendingUp size={13} /> Most Attended Activities</h4>
                {activityRows.length === 0 ? (
                  <div className="text-slate-400 text-sm py-4 text-center">No attendance recorded in this range.</div>
                ) : (
                  <table className="w-full">
                    <tbody>
                      {activityRows.slice(0, 8).map(([title, count]) => (
                        <tr key={title} className="border-b border-slate-50 dark:border-slate-800">
                          <td className="py-2 text-sm text-slate-700 dark:text-slate-300">{title}</td>
                          <td className="py-2 text-sm text-right font-semibold text-slate-800 dark:text-slate-100">{count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5"><CalendarCheck size={13} /> By Department</h4>
                {deptRows.length === 0 ? (
                  <div className="text-slate-400 text-sm py-4 text-center">No attendance recorded in this range.</div>
                ) : (
                  <table className="w-full">
                    <tbody>
                      {deptRows.map(([dept, count]) => (
                        <tr key={dept} className="border-b border-slate-50 dark:border-slate-800">
                          <td className="py-2 text-sm text-slate-700 dark:text-slate-300">{dept}</td>
                          <td className="py-2 text-sm text-right font-semibold text-slate-800 dark:text-slate-100">{count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Users size={13} /> Resident Participation</h4>
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                <button onClick={() => setResidentSort('asc')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${residentSort === 'asc' ? 'bg-white dark:bg-slate-900 text-brand-700 shadow-sm' : 'text-slate-500'}`}>
                  Least Engaged First
                </button>
                <button onClick={() => setResidentSort('desc')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${residentSort === 'desc' ? 'bg-white dark:bg-slate-900 text-brand-700 shadow-sm' : 'text-slate-500'}`}>
                  Most Engaged First
                </button>
              </div>
            </div>
            {residentRows.length === 0 ? (
              <div className="text-slate-400 text-sm py-4 text-center">No active residents.</div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full">
                  <tbody>
                    {residentRows.map(({ resident, count }) => {
                      const alert = engagementAlerts.get(resident.id)
                      return (
                        <tr key={resident.id} className="border-b border-slate-50 dark:border-slate-800">
                          <td className="py-2 text-sm text-slate-700 dark:text-slate-300">
                            {resident.first_name} {resident.last_name}{resident.room && <span className="text-slate-400"> · Rm {resident.room}</span>}
                            {alert && (
                              <span className="inline-flex items-center gap-1 ml-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded-full"
                                title={`Attended ${alert.priorCount}x in the prior ${alert.windowLabel}, zero since`}>
                                <UserX size={11} /> {alert.windowLabel} silent
                              </span>
                            )}
                          </td>
                          <td className={`py-2 text-sm text-right font-semibold ${count === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100'}`}>{count} {count === 1 ? 'session' : 'sessions'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
