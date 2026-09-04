// Flags a resident whose activity participation has dropped off after a real
// baseline of engagement — not chronic non-participation (that's a different
// signal, already surfaced by the Participation Report's least-engaged sort)
// and not a data gap. Compares a recent window against the equal-length
// window before it: zero attendance now, but real attendance before, wins.
// The longer confirmed-silence window is the more severe one.
//
// Guard against false positives from a reporting gap: if NO resident had
// attendance recorded org-wide during the recent window, staff simply
// weren't taking attendance that stretch — that's not an engagement signal
// for any one resident, so the window is skipped entirely rather than
// flagging everyone.

const WINDOWS = [
  { days: 30, minPriorCount: 3, label: '30 days' },
  { days: 14, minPriorCount: 2, label: '14 days' },
]

// residentRows: array of { occurrence_date } attendance rows for ONE resident.
// orgDates: array/Set of occurrence_date strings where ANY resident in the
// org had attendance recorded (used only for the reporting-gap guard).
export function computeEngagementAlert(residentRows, orgDates, referenceDate) {
  const now = referenceDate ? new Date(referenceDate) : new Date()
  const dates = (residentRows || []).map(r => new Date(r.occurrence_date + 'T12:00:00'))
  const orgDateList = Array.from(orgDates || []).map(d => new Date(d + 'T12:00:00'))

  let worst = null
  for (const w of WINDOWS) {
    const recentCutoff = new Date(now); recentCutoff.setDate(recentCutoff.getDate() - w.days)
    const priorCutoff  = new Date(now); priorCutoff.setDate(priorCutoff.getDate() - w.days * 2)

    const recentCount = dates.filter(d => d > recentCutoff && d <= now).length
    const priorCount  = dates.filter(d => d > priorCutoff && d <= recentCutoff).length
    const orgTookAttendanceRecently = orgDateList.some(d => d > recentCutoff && d <= now)

    if (recentCount === 0 && priorCount >= w.minPriorCount && orgTookAttendanceRecently) {
      if (!worst || w.days > worst.windowDays) {
        worst = { windowLabel: w.label, windowDays: w.days, priorCount }
      }
    }
  }
  return worst
}

// attendanceRows: flat list of { resident_id, occurrence_date } across all
// residents, covering at least 2x the longest window (60+ days).
// Returns a Map of resident_id -> alert, only residents with a triggered alert.
export function computeEngagementAlerts(attendanceRows, referenceDate) {
  const orgDates = new Set((attendanceRows || []).map(r => r.occurrence_date))
  const byResident = new Map()
  ;(attendanceRows || []).forEach(r => {
    if (!byResident.has(r.resident_id)) byResident.set(r.resident_id, [])
    byResident.get(r.resident_id).push(r)
  })
  const alerts = new Map()
  byResident.forEach((rows, residentId) => {
    const alert = computeEngagementAlert(rows, orgDates, referenceDate)
    if (alert) alerts.set(residentId, alert)
  })
  return alerts
}
