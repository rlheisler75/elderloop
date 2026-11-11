// The community's dining menu for the resident and family portals: today and
// the next six days, from the active cycle menu (same one the TV screens use).
import { useEffect, useMemo, useState } from 'react'
import { UtensilsCrossed } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { calcCycleDay } from '../../pages/dietary/mealResolution'

const MEAL_PERIODS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'am_snack',  label: 'Morning Snack' },
  { key: 'lunch',     label: 'Lunch' },
  { key: 'pm_snack',  label: 'Afternoon Snack' },
  { key: 'dinner',    label: 'Dinner' },
]

const localDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export default function PortalMenu({ orgId }) {
  const [loading, setLoading] = useState(true)
  const [menu, setMenu] = useState(null)
  const [days, setDays] = useState([])
  const [picked, setPicked] = useState(0)

  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); return localDateStr(d)
  }), [])

  useEffect(() => {
    if (!orgId) return
    ;(async () => {
      const { data: menus } = await supabase.from('cycle_menus')
        .select('id, cycle_length, start_date').eq('organization_id', orgId).eq('is_active', true).limit(1)
      const m = menus?.[0]
      if (m) {
        const { data } = await supabase.from('cycle_menu_days')
          .select('week_number, day_of_week, cycle_menu_meals(meal_period, meal_courses(course_name, sort_order, menu_items:menu_items!meal_courses_menu_item_id_fkey(name)))')
          .eq('cycle_menu_id', m.id)
        setDays(data || [])
      }
      setMenu(m || null)
      setLoading(false)
    })()
  }, [orgId])

  const meals = useMemo(() => {
    const cd = menu && calcCycleDay(menu, dates[picked])
    const day = cd && days.find(d => d.week_number === cd.cycleWeek && d.day_of_week === cd.dayOfWeek)
    if (!day) return []
    return MEAL_PERIODS.map(p => {
      const meal = day.cycle_menu_meals?.find(x => x.meal_period === p.key)
      const items = (meal?.meal_courses || []).slice().sort((a, b) => a.sort_order - b.sort_order)
        .map(c => c.menu_items?.name || c.course_name).filter(Boolean)
      return { ...p, items }
    }).filter(p => p.items.length)
  }, [menu, days, dates, picked])

  const dayLabel = (s, i) => i === 0 ? 'Today' : i === 1 ? 'Tomorrow'
    : new Date(s + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="px-5 py-3 border-b border-slate-50 dark:border-slate-800 flex items-center gap-2">
        <UtensilsCrossed size={15} className="text-orange-600" />
        <h4 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Dining Menu</h4>
      </div>
      {loading ? (
        <div className="py-10 flex justify-center"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : !menu ? (
        <p className="text-sm text-slate-400 text-center py-10 px-5">The dining menu hasn't been posted yet.</p>
      ) : (
        <div className="p-4 space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {dates.map((s, i) => (
              <button key={s} onClick={() => setPicked(i)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${picked === i ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                <div>{dayLabel(s, i)}</div>
                <div className={`text-xs ${picked === i ? 'text-white/80' : 'text-slate-400'}`}>
                  {new Date(s + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </button>
            ))}
          </div>
          {meals.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No menu posted for this day.</p>
          ) : meals.map(p => (
            <div key={p.key}>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{p.label}</div>
              <ul className="space-y-1">
                {p.items.map((name, i) => (
                  <li key={i} className="text-sm text-slate-800 dark:text-slate-100 flex gap-2"><span className="text-slate-300">•</span><span className="min-w-0 break-words">{name}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
