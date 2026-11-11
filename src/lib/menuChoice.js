// Which cycle menu a resident, a portal, or a signage screen uses. No
// imports, so the signed-out TV screens can use it without the app client.

// Care levels a cycle menu can be marked as serving (cycle_menus.care_levels),
// same keys as residents.care_level
export const MENU_CARE_LEVELS = [
  { key: 'independent',     label: 'Independent Living' },
  { key: 'assisted',        label: 'Assisted Living / RC' },
  { key: 'memory_care',     label: 'Memory Care' },
  { key: 'skilled_nursing', label: 'Skilled Nursing / LTC' },
  { key: 'rehab',           label: 'Rehab' },
]

// Which cycle menu a resident eats from: the menu assigned on their diet
// profile, else the menu marked for their care level (the current one if
// several are), else the community's current menu (Set Active). With only one
// menu in use it's that one even if nobody pressed Set Active. Used by meal
// tickets, Cook's Count, the Order Guide, Snacks & Drinks and the portals,
// so they always agree.
export function menuFor(menus, { assignedId, careLevel } = {}) {
  const live = (menus || []).filter(m => m.is_active !== false)
  const forLevel = careLevel ? live.filter(m => m.care_levels?.includes(careLevel)) : []
  return live.find(m => m.id === assignedId)
    || forLevel.find(m => m.is_current) || forLevel[0]
    || live.find(m => m.is_current)
    || (live.length === 1 ? live[0] : null)
}

// menuFor for a resident_dietary_profiles row (care level from its joined
// residents row when there is one)
export const menuForProfile = (menus, profile) =>
  menuFor(menus, { assignedId: profile?.cycle_menu_id, careLevel: profile?.residents?.care_level ?? profile?.care_level })

// A signage screen's menu: the one picked for that screen (Communication →
// Digital Signage), else the community's Active menu
export const screenMenu = (menus, menuId) =>
  (menus || []).find(m => m.id === menuId && m.is_active !== false) || menuFor(menus)
