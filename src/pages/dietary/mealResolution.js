// Resolves which item a resident actually receives for a course — the main
// item if it's suitable for them, otherwise the best-matching alternate in
// priority order. Shared between the meal ticket (single resident) and
// Cook's Count (aggregated headcount) so this safety logic never drifts.

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
