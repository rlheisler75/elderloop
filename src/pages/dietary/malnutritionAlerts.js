// Flags clinically significant unplanned weight loss using the standard
// long-term-care thresholds: 5% in 30 days, 7.5% in 90 days, 10% in 180 days
// (whichever window is most severe wins). Reads resident_vitals — the same
// weight history already recorded in Nursing — rather than tracking weight
// separately in Dietary. A resident needs a weight reading old enough to
// reach back across a given window before that window can trigger at all;
// someone with only two weeks of history simply can't fail the 30-day check
// yet, and that's correct, not a gap.

const WINDOWS = [
  { days: 30,  threshold: 5,   label: '30 days' },
  { days: 90,  threshold: 7.5, label: '90 days' },
  { days: 180, threshold: 10,  label: '180 days' },
]

// vitals: array of { weight, recorded_at } for ONE resident, any order.
// Returns the single most severe triggered window, or null if none trigger.
export function computeWeightAlert(vitals) {
  const sorted = (vitals || [])
    .filter(v => v.weight != null)
    .slice()
    .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))
  if (sorted.length < 2) return null

  const latest = sorted[0]
  const latestDate = new Date(latest.recorded_at)

  let worst = null
  for (const w of WINDOWS) {
    const cutoff = new Date(latestDate)
    cutoff.setDate(cutoff.getDate() - w.days)
    const baseline = sorted.find(v => new Date(v.recorded_at) <= cutoff)
    if (!baseline) continue
    const pctLoss = ((baseline.weight - latest.weight) / baseline.weight) * 100
    if (pctLoss >= w.threshold && (!worst || pctLoss > worst.pctLoss)) {
      worst = {
        windowLabel: w.label,
        thresholdPct: w.threshold,
        pctLoss: +pctLoss.toFixed(1),
        baselineWeight: baseline.weight,
        baselineDate: baseline.recorded_at,
        latestWeight: latest.weight,
        latestDate: latest.recorded_at,
      }
    }
  }
  return worst
}

// Groups a flat multi-resident vitals list by resident_id and returns a Map
// of resident_id -> alert, containing only residents with a triggered alert.
export function computeWeightAlerts(vitalsRows) {
  const byResident = new Map()
  ;(vitalsRows || []).forEach(v => {
    if (!byResident.has(v.resident_id)) byResident.set(v.resident_id, [])
    byResident.get(v.resident_id).push(v)
  })
  const alerts = new Map()
  byResident.forEach((vitals, residentId) => {
    const alert = computeWeightAlert(vitals)
    if (alert) alerts.set(residentId, alert)
  })
  return alerts
}
