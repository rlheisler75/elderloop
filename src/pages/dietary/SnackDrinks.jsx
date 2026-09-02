// Simplified snack/drink prep view for dietary aides — auto-scoped to today's
// date so there's no week/cycle navigation to learn, just "AM Snack" or
// "PM Snack." Reuses the same resolveMealItem/fetchMealCourses logic as
// Cook's Count and the meal tickets so counts never drift from what a
// resident actually receives.
import { useState, useEffect, useRef } from 'react'
import { calcCycleDay, fetchMealCourses, resolveMealItem } from './mealResolution'
import { Printer, Coffee } from 'lucide-react'

const SNACK_PERIODS = [
  { key: 'am_snack', label: 'AM Snack' },
  { key: 'pm_snack', label: 'PM Snack' },
]

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function SnackDrinks({ residents, menus, ALLERGENS, getDiet, getCons }) {
  const printRef = useRef()
  const today = localDateStr(new Date())
  const [date, setDate]       = useState(today)
  const [period, setPeriod]   = useState('am_snack')
  const [rows, setRows]       = useState(null)   // [{course_name, tally:[[itemName,count]], unresolved}]
  const [labels, setLabels]   = useState(null)   // [{resident, items:[{course_name, item}]}]
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [date, period, residents, menus])

  async function load() {
    if (!residents?.length) { setRows([]); setLabels([]); return }
    setLoading(true)

    // Group residents by their assigned (or org-current) menu so we only
    // fetch each menu's courses once.
    const menuGroups = new Map()
    residents.forEach(r => {
      const menu = menus?.find(m => m.id === r.cycle_menu_id) || menus?.find(m => m.is_current) || null
      if (!menu) return
      if (!menuGroups.has(menu.id)) menuGroups.set(menu.id, { menu, group: [] })
      menuGroups.get(menu.id).group.push(r)
    })

    const courseTally = new Map()  // course_name -> Map(itemName -> count)
    const unresolvedByCourse = new Map()
    const residentLabels = []

    for (const { menu, group } of menuGroups.values()) {
      const pos = calcCycleDay(menu, date)
      if (!pos) continue
      const courses = await fetchMealCourses(menu.id, pos.cycleWeek, pos.dayOfWeek, period)
      if (courses.length === 0) continue

      group.forEach(resident => {
        const items = []
        courses.forEach(course => {
          const { servedItem } = resolveMealItem(course.menu_items, course.alternates, resident)
          items.push({ course_name: course.course_name, item: servedItem })
          if (!servedItem) {
            unresolvedByCourse.set(course.course_name, (unresolvedByCourse.get(course.course_name) || 0) + 1)
            return
          }
          if (!courseTally.has(course.course_name)) courseTally.set(course.course_name, new Map())
          const tally = courseTally.get(course.course_name)
          tally.set(servedItem.name, (tally.get(servedItem.name) || 0) + 1)
        })
        residentLabels.push({ resident, items })
      })
    }

    setRows(Array.from(courseTally.entries()).map(([course_name, tally]) => ({
      course_name,
      tally: Array.from(tally.entries()).sort((a, b) => b[1] - a[1]),
      unresolved: unresolvedByCourse.get(course_name) || 0,
    })))
    setLabels(residentLabels)
    setLoading(false)
  }

  const handlePrint = () => {
    const content = printRef.current.innerHTML
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>Snack/Drink Labels - ${SNACK_PERIODS.find(p => p.key === period)?.label} - ${date}</title>
      <style>
        body { font-family: Arial, sans-serif; }
        .label { padding: 14px; max-width: 300px; border: 1px dashed #ccc; page-break-inside: avoid; margin: 0 0 10px; }
        h3 { margin: 0 0 2px; font-size: 15px; }
        .sub { color: #666; font-size: 11px; margin-bottom: 6px; }
        .badge { display: inline-block; padding: 2px 7px; border-radius: 10px; font-size: 10px; font-weight: bold; margin: 1px; }
        .diet { background: #e0f2fe; color: #0369a1; }
        .cons { background: #f0fdf4; color: #166534; }
        .allergy { background: #fee2e2; color: #dc2626; }
        .item { font-size: 13px; padding: 2px 0; }
        .course { color: #888; font-size: 10px; text-transform: uppercase; font-weight: bold; }
        .missing { color: #dc2626; font-style: italic; font-size: 11px; }
        @media print { button { display: none; } }
      </style></head>
      <body>${content}</body></html>`)
    win.document.close()
    win.print()
  }

  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Coffee size={17} className="text-brand-600" />
            <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100">Snack & Drink Counts</h3>
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              {SNACK_PERIODS.map(p => (
                <button key={p.key} onClick={() => setPeriod(p.key)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${period === p.key ? 'bg-white dark:bg-slate-900 text-brand-700 dark:text-brand-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-slate-400 text-sm">Loading...</div>
        ) : !rows || rows.length === 0 ? (
          <div className="text-slate-400 text-sm">
            No {SNACK_PERIODS.find(p => p.key === period)?.label.toLowerCase()} items set on the menu for {dateLabel}.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="text-left text-xs font-semibold text-slate-500 pb-2">Course</th>
                <th className="text-left text-xs font-semibold text-slate-500 pb-2">Item</th>
                <th className="text-right text-xs font-semibold text-slate-500 pb-2">Count</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-slate-50 dark:border-slate-800 align-top">
                  <td className="py-2 text-xs font-medium text-slate-700 dark:text-slate-300">{r.course_name}</td>
                  <td className="py-2 text-xs">
                    {r.tally.map(([name, count], j) => (
                      <div key={j} className="text-slate-700 dark:text-slate-300">{name}</div>
                    ))}
                    {r.unresolved > 0 && <div className="text-red-600 dark:text-red-400 font-medium">⚠ Verify with kitchen</div>}
                  </td>
                  <td className="py-2 text-xs text-right">
                    {r.tally.map(([name, count], j) => (
                      <div key={j} className="text-slate-700 dark:text-slate-300 font-semibold">{count}</div>
                    ))}
                    {r.unresolved > 0 && <div className="text-red-600 dark:text-red-400 font-semibold">{r.unresolved}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100">Labels</h3>
          <button onClick={handlePrint} disabled={loading || !labels?.length}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            <Printer size={15} /> Print {labels?.length || ''} Labels
          </button>
        </div>
        <p className="text-xs text-slate-400 mb-3">One label per resident — name, room, item(s), and diet/allergy flags.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto">
          <div ref={printRef} className="contents">
            {labels?.map(({ resident, items }) => {
              const allergenLabels = resident.allergens?.map(a => ALLERGENS.find(al => al.key === a)?.label || a) || []
              return (
                <div key={resident.id} className="label border border-slate-100 dark:border-slate-800 rounded-xl p-3">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{resident.first_name} {resident.last_name}</h3>
                  <div className="sub text-xs text-slate-400 mb-1.5">Room {resident.room || '—'}</div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    <span className="badge diet inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400">{getDiet(resident.diet_type)}</span>
                    <span className="badge cons inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">{getCons(resident.consistency)}</span>
                    {allergenLabels.map(a => (
                      <span key={a} className="badge allergy inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">⚠ {a}</span>
                    ))}
                  </div>
                  {items.map((it, i) => (
                    it.item
                      ? <div key={i} className="item text-sm py-0.5"><span className="course block text-[10px] font-bold uppercase tracking-wide text-slate-400">{it.course_name}</span>{it.item.name}</div>
                      : <div key={i} className="item missing text-sm py-0.5 text-red-600 dark:text-red-400 italic"><span className="course block text-[10px] font-bold uppercase tracking-wide text-slate-400">{it.course_name}</span>⚠ Verify with kitchen</div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
