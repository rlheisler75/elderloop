import { supabase } from './supabase'

// Global starter categories have organization_id = null and are visible/usable by
// every org but can never be edited or deactivated by them (see wo_categories RLS).
export async function fetchWOCategories(orgId, { activeOnly = true } = {}) {
  let query = supabase
    .from('wo_categories')
    .select('*')
    .or(`organization_id.is.null,organization_id.eq.${orgId}`)
    .order('sort_order')
  if (activeOnly) query = query.eq('is_active', true)
  const { data } = await query
  return data || []
}

export const topLevelCategories = (cats) => cats.filter(c => !c.parent_id)
export const subcategoriesOf = (cats, parentId) => cats.filter(c => c.parent_id === parentId)
export const categoryLabel = (cats, key) => cats.find(c => c.key === key)?.label ?? key
