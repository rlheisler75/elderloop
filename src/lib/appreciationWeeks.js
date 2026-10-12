// "Celebrate" accent: the app takes on a color during senior-living staff
// appreciation weeks and falls back to the default (blue) the rest of the year.
// Weeks run Sunday–Saturday; a "full week" lies entirely inside the month.
// When two overlap, the one that started most recently wins (ties: list order).
// Accent keys must exist in src/index.css.

const day = (y, m, d) => new Date(y, m, d)
const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n)

// nth full Sunday–Saturday week of a month (n = -1 for the last one)
function fullWeek(y, m, n) {
  const first = day(y, m, 1)
  const firstSunday = addDays(first, (7 - first.getDay()) % 7)
  const weeks = []
  for (let s = firstSunday; addDays(s, 6).getMonth() === m; s = addDays(s, 7)) weeks.push(s)
  const start = n === -1 ? weeks[weeks.length - 1] : weeks[n - 1]
  return [start, addDays(start, 6)]
}

// Mother's Day: second Sunday of May
function mothersDay(y) {
  const first = day(y, 4, 1)
  return addDays(first, ((7 - first.getDay()) % 7) + 7)
}

export const APPRECIATION_WEEKS = [
  { name: 'National Activity Professionals Week', emoji: '🎨', accent: 'berry',  range: y => fullWeek(y, 0, -1) },
  { name: "National Dietary Managers' Week",      emoji: '🍎', accent: 'gold',   range: y => fullWeek(y, 1, 1) },
  { name: 'National Social Work Month',           emoji: '🤝', accent: 'teal',   range: y => [day(y, 2, 1), day(y, 2, 31)] },
  { name: "Long-Term Care Administrators' Week",  emoji: '🏢', accent: 'navy',   range: y => fullWeek(y, 2, 2) },
  { name: 'Healthcare HR Week',                   emoji: '🧑‍💼', accent: 'indigo', range: y => fullWeek(y, 2, 3) },
  { name: 'Administrative Professionals Week',    emoji: '📋', accent: 'violet', range: y => fullWeek(y, 3, -1) },
  { name: 'National Nurses Week',                 emoji: '🩺', accent: 'rose',   range: y => [day(y, 4, 6), day(y, 4, 12)] },
  { name: 'National Skilled Nursing Care Week',   emoji: '💜', accent: 'purple', range: y => [mothersDay(y), addDays(mothersDay(y), 6)] },
  { name: 'National CNA Week',                    emoji: '💪', accent: 'coral',  range: y => fullWeek(y, 5, 3) },
  { name: 'EVS, Housekeeping & Laundry Week',     emoji: '🧹', accent: 'green',  range: y => fullWeek(y, 8, 2) },
  { name: 'National Rehabilitation Awareness Week', emoji: '🦵', accent: 'copper', range: y => fullWeek(y, 8, 3) },
  { name: 'Healthcare Foodservice Workers Week',  emoji: '🍽️', accent: 'cherry', range: y => fullWeek(y, 9, 1) },
  { name: 'Healthcare Facilities & Maintenance Week', emoji: '🔧', accent: 'cocoa', range: y => fullWeek(y, 9, 4) },
  { name: 'National Respiratory Care Week',       emoji: '🫁', accent: 'teal',   range: y => fullWeek(y, 9, -1) },
]

const DEFAULT_ACCENT = 'blue'

function weeksFor(y) {
  return APPRECIATION_WEEKS.map(w => {
    const [start, end] = w.range(y)
    return { ...w, start, end }
  })
}

// Every observance running on `date`, most recently started first.
export function activeWeeks(date = new Date()) {
  const today = day(date.getFullYear(), date.getMonth(), date.getDate())
  return weeksFor(today.getFullYear())
    .map((w, i) => ({ ...w, i }))
    .filter(w => w.start <= today && today <= w.end)
    .sort((a, b) => (b.start - a.start) || (a.i - b.i))
}

export function nextWeek(date = new Date()) {
  const today = day(date.getFullYear(), date.getMonth(), date.getDate())
  return [...weeksFor(today.getFullYear()), ...weeksFor(today.getFullYear() + 1)]
    .filter(w => w.start > today)
    .sort((a, b) => a.start - b.start)[0]
}

// The accent to show for a saved preference ('celebrate' resolves by date).
export function resolveAccent(pref, date = new Date()) {
  if (pref !== 'celebrate') return pref || DEFAULT_ACCENT
  return activeWeeks(date)[0]?.accent || DEFAULT_ACCENT
}
