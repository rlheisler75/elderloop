// Date-only database columns (Postgres `date`: due dates, review dates, booked dates,
// discharge dates) are calendar days. `new Date('2026-10-01')` reads them as UTC
// midnight, which is the evening before in US time zones: the date shows a day early
// and "overdue" flips the evening before. Use these instead.

// The calendar day as a Date at local noon (safe to format or compare by day)
export const parseDay = (d) => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00`) : null)

// Whole days from today to that day: 0 = today, 1 = tomorrow, -1 = yesterday
export function daysUntil(d) {
  if (!d) return null
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)
  return Math.round((parseDay(d) - today) / 86400000)
}
