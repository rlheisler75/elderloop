// Resolves which item a resident actually receives for a course — the main
// item if it's suitable for them, otherwise the best-matching alternate in
// priority order. Shared between the meal ticket (single resident), bulk
// tray-ticket printing, and Cook's Count (aggregated headcount) so this
// safety logic never drifts.

import { supabase } from '../../lib/supabase'

// Which cycle week + day-of-week a given date falls on for a cycle menu.
export function calcCycleDay(menu, dateStr) {
  if (!menu?.start_date) return null
  const start   = new Date(menu.start_date + 'T12:00:00')
  const target  = new Date(dateStr + 'T12:00:00')
  const diffDays = Math.floor((target - start) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return null
  const totalWeeks = Math.floor(diffDays / 7)
  const cycleWeek  = (totalWeeks % menu.cycle_length) + 1
  const dayOfWeek  = target.getDay() // 0=Sun … 6=Sat, matches cycle_menu_days.day_of_week
  return { cycleWeek, dayOfWeek }
}

// Fetches the courses (with main item + item-level alternates) for one meal
// on a cycle menu day. Returns [] if no menu/day/meal exists for that slot.
export async function fetchMealCourses(menuId, weekNum, dayOfWeek, mealPeriod) {
  const { data: dayRows } = await supabase.from('cycle_menu_days')
    .select('id').eq('cycle_menu_id', menuId).eq('week_number', weekNum).eq('day_of_week', dayOfWeek).limit(1)
  const day = dayRows?.[0]
  if (!day) return []

  const { data: mealRows } = await supabase.from('cycle_menu_meals')
    .select('id').eq('cycle_menu_day_id', day.id).eq('meal_period', mealPeriod).limit(1)
  const meal = mealRows?.[0]
  if (!meal) return []

  const { data: courseData } = await supabase.from('meal_courses')
    .select('*, menu_items:menu_items!meal_courses_menu_item_id_fkey(name,allergens,suitable_diets,suitable_consistencies)')
    .eq('meal_id', meal.id).order('sort_order')

  // Alternates by source_item_id (item-level, reusable across every cycle day
  // that uses the same main item), not the single course instance.
  const menuItemIds = (courseData || []).map(c => c.menu_item_id).filter(Boolean)
  let altData = []
  if (menuItemIds.length > 0) {
    const { data: alts } = await supabase.from('course_alternates')
      .select('id, source_item_id, priority, conditions, item:menu_items!course_alternates_menu_item_id_fkey(id,name,allergens,suitable_diets,suitable_consistencies)')
      .in('source_item_id', menuItemIds)
      .order('priority')
    altData = alts || []
  }

  return (courseData || []).map(course => ({
    ...course,
    alternates: altData.filter(a => a.source_item_id === course.menu_item_id),
  }))
}

export function itemSuitableForResident(item, resident) {
  if (!item) return false
  if (resident.allergens?.some(a => item.allergens?.includes(a))) return false
  if (item.suitable_diets?.length > 0 && !item.suitable_diets.includes(resident.diet_type)) return false
  if (item.suitable_consistencies?.length > 0 && !item.suitable_consistencies.includes(resident.consistency)) return false
  if (resident.dislikes && item.name && resident.dislikes.toLowerCase().includes(item.name.toLowerCase())) return false
  return true
}

function altSafeForResident(altItem, resident) {
  if (!altItem) return false
  if (resident.allergens?.some(a => altItem.allergens?.includes(a))) return false
  return true
}

// alternates: array of { priority, conditions, item }
// Returns { servedItem, substitutedFor } — substitutedFor is set whenever the
// main item wasn't suitable, even if no safe alternate was found either
// (servedItem null in that case — the resident needs manual kitchen attention).
export function resolveMealItem(mainItem, alternates, resident) {
  if (itemSuitableForResident(mainItem, resident)) {
    return { servedItem: mainItem, substitutedFor: null }
  }

  const sortedAlts = (alternates || []).slice().sort((a, b) => a.priority - b.priority)

  // Pass 1: first alternate whose conditions match this resident AND is allergen-safe
  for (const alt of sortedAlts) {
    const altItem = alt.item
    if (!altItem || !altSafeForResident(altItem, resident)) continue
    const hasDietCond = alt.conditions?.diets?.length > 0
    const hasAlgCond  = alt.conditions?.allergens?.length > 0
    const dietMatch = !hasDietCond || alt.conditions.diets.includes(resident.diet_type)
    const algMatch  = !hasAlgCond  || resident.allergens?.some(a => alt.conditions.allergens.includes(a))
    if (dietMatch && algMatch) return { servedItem: altItem, substitutedFor: mainItem }
  }

  // Pass 2: no condition matched — fall back to any allergen-safe alternate
  for (const alt of sortedAlts) {
    if (altSafeForResident(alt.item, resident)) return { servedItem: alt.item, substitutedFor: mainItem }
  }

  return { servedItem: null, substitutedFor: mainItem }
}
