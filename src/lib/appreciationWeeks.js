// "Celebrate Our Staff" accent: the app takes on a color during staff
// appreciation weeks and falls back to the default (blue) the rest of the year.
// A community's Org Admin can replace this calendar (Admin Panel → Celebrations,
// table org_celebrations); a community with no rows uses DEFAULT_CELEBRATIONS.
// When two overlap, the one that started most recently wins (ties: list order).
//
// Rules (months 1–12, same shape as an org_celebrations row):
//   dates    month/day → end_month/end_day, every year
//   week     the nth full work week (Mon–Fri inside the month; n = -1 last),
//            shown Sunday–Saturday — how most of these observances are set
//   sunweek  the nth full Sunday–Saturday week (Administrative Professionals Week)
//   weekday  starts on the nth `weekday` (0 = Sunday) of the month, runs `days`

export const DEFAULT_CELEBRATIONS = [
  { name: 'National Activity Professionals Week', emoji: '🎨', accent: 'berry',  kind: 'week', month: 1, n: -1 },
  { name: 'Pride in Foodservice Week (Dietary Managers)', emoji: '🍎', accent: 'gold', kind: 'week', month: 2, n: 1 },
  { name: 'National Social Work Month',           emoji: '🤝', accent: 'teal',   kind: 'dates', month: 3, day: 1, end_month: 3, end_day: 31 },
  { name: 'Long-Term Care Administrators Week',   emoji: '🏢', accent: 'navy',   kind: 'week', month: 3, n: 2 },
  { name: 'Healthcare HR Week',                   emoji: '🧑‍💼', accent: 'indigo', kind: 'week', month: 3, n: 3 },
  { name: 'Administrative Professionals Week',    emoji: '📋', accent: 'violet', kind: 'sunweek', month: 4, n: -1 },
  { name: 'National Nurses Week',                 emoji: '🩺', accent: 'rose',   kind: 'dates', month: 5, day: 6, end_month: 5, end_day: 12 },
  { name: 'National Skilled Nursing Care Week',   emoji: '💜', accent: 'purple', kind: 'weekday', month: 5, n: 2, weekday: 0, days: 7 },
  { name: 'National Nursing Assistants (CNA) Week', emoji: '💪', accent: 'coral', kind: 'weekday', month: 6, n: 2, weekday: 4, days: 7 },
  { name: 'Environmental Services (EVS) Week',    emoji: '🧹', accent: 'green',  kind: 'week', month: 9, n: 2 },
  { name: 'National Rehabilitation Awareness Week', emoji: '🦵', accent: 'copper', kind: 'week', month: 9, n: 3 },
  { name: 'Healthcare Foodservice Workers Week',  emoji: '🍽️', accent: 'cherry', kind: 'week', month: 10, n: 1 },
  { name: 'Healthcare Facilities & Engineering Week', emoji: '🔧', accent: 'cocoa', kind: 'week', month: 10, n: -1 },
  { name: 'National Respiratory Care Week',       emoji: '🫁', accent: 'teal',   kind: 'week', month: 10, n: -1 },
]

export const ORDINALS = [[1, '1st'], [2, '2nd'], [3, '3rd'], [4, '4th'], [-1, 'Last']]
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const DEFAULT_ACCENT = 'blue'
const day = (y, m, d) => new Date(y, m - 1, d)
const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n)
const pick = (list, n) => (n === -1 ? list[list.length - 1] : list[n - 1])

// Start and end (inclusive) of a rule in year y, or null if it doesn't occur.
export function rangeFor(rule, y) {
  const m = Number(rule.month)
  if (rule.kind === 'dates') {
    const start = day(y, m, rule.day)
    let end = day(y, rule.end_month, rule.end_day)
    if (end < start) end = day(y + 1, rule.end_month, rule.end_day) // e.g. Dec 28 – Jan 3
    return [start, end]
  }
  if (rule.kind === 'week') {
    const mondays = []
    for (let d = day(y, m, 1); d.getMonth() === m - 1; d = addDays(d, 1)) {
      if (d.getDay() === 1 && addDays(d, 4).getMonth() === m - 1) mondays.push(d)
    }
    const mon = pick(mondays, Number(rule.n))
    return mon ? [addDays(mon, -1), addDays(mon, 5)] : null
  }
  if (rule.kind === 'sunweek') {
    const sundays = []
    for (let d = day(y, m, 1); d.getMonth() === m - 1; d = addDays(d, 1)) {
      if (d.getDay() === 0 && addDays(d, 6).getMonth() === m - 1) sundays.push(d)
    }
    const sun = pick(sundays, Number(rule.n))
    return sun ? [sun, addDays(sun, 6)] : null
  }
  if (rule.kind === 'weekday') {
    const hits = []
    for (let d = day(y, m, 1); d.getMonth() === m - 1; d = addDays(d, 1)) {
      if (d.getDay() === Number(rule.weekday)) hits.push(d)
    }
    const start = pick(hits, Number(rule.n))
    return start ? [start, addDays(start, Math.max(1, Number(rule.days) || 7) - 1)] : null
  }
  return null
}

// Plain-English rule, e.g. "2nd full week of March" — used in the Admin Panel.
export function describeRule(rule) {
  const ord = (ORDINALS.find(([n]) => n === Number(rule.n))?.[1] || '').toLowerCase()
  if (rule.kind === 'dates') return `${MONTHS[rule.month - 1]} ${rule.day} – ${MONTHS[rule.end_month - 1]} ${rule.end_day}, every year`
  if (rule.kind === 'week') return `${ord === 'last' ? 'Last' : ord} full week of ${MONTHS[rule.month - 1]}`
  if (rule.kind === 'sunweek') return `${ord === 'last' ? 'Last' : ord} full Sunday–Saturday week of ${MONTHS[rule.month - 1]}`
  if (rule.kind === 'weekday') return `${rule.days} days from the ${ord} ${WEEKDAYS[rule.weekday]} of ${MONTHS[rule.month - 1]}`
  return ''
}

function occurrences(list, years) {
  return years.flatMap(y => list.map((c, i) => {
    const r = rangeFor(c, y)
    return r && { ...c, i, start: r[0], end: r[1] }
  })).filter(Boolean)
}

const midnight = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

// Every celebration running on `date`, most recently started first.
export function activeWeeks(list = DEFAULT_CELEBRATIONS, date = new Date()) {
  const today = midnight(date), y = today.getFullYear()
  return occurrences(list, [y - 1, y])
    .filter(w => w.start <= today && today <= w.end)
    .sort((a, b) => (b.start - a.start) || (a.i - b.i))
}

export function nextWeek(list = DEFAULT_CELEBRATIONS, date = new Date()) {
  const today = midnight(date), y = today.getFullYear()
  return occurrences(list, [y, y + 1])
    .filter(w => w.start > today)
    .sort((a, b) => (a.start - b.start) || (a.i - b.i))[0]
}

// The accent to show for a saved preference ('celebrate' resolves by date).
export function resolveAccent(pref, list = DEFAULT_CELEBRATIONS, date = new Date()) {
  if (pref !== 'celebrate') return pref || DEFAULT_ACCENT
  return activeWeeks(list, date)[0]?.accent || DEFAULT_ACCENT
}
