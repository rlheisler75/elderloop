import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { resolveMealItem } from './mealResolution'
import { scaleIngredients } from './recipeScaling'
import {
  Plus, X, Edit2, Trash2, ChevronLeft, ChevronRight,
  BookOpen, Package, Save, ArrowLeft, RefreshCw, Check, ShieldCheck,
  ChefHat, ChevronDown, ChevronUp
} from 'lucide-react'

const MEAL_PERIODS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'am_snack',  label: 'AM Snack'  },
  { key: 'lunch',     label: 'Lunch'     },
  { key: 'pm_snack',  label: 'PM Snack'  },
  { key: 'dinner',    label: 'Dinner'    },
]

const DAYS     = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const ALLERGENS = ['milk','eggs','fish','shellfish','tree_nuts','peanuts','wheat','gluten','soy','sesame']

// Sensible per-resident serving units — a subset of the Central Supply
// `supply_unit` enum (which also has purchase-batch units like case/box/pallet
// that don't make sense for a single portion).
const PORTION_UNITS = ['oz', 'fl_oz', 'cup', 'lb', 'each']

// Units sensible for a recipe ingredient quantity — portion units plus the
// small-quantity cooking measures (tsp/tbsp) that portions don't need.
const RECIPE_UNITS = ['tsp', 'tbsp', 'oz', 'fl_oz', 'cup', 'lb', 'gallon', 'each']

// Must match the diet_type / consistency_level Postgres enums exactly — same
// lists as Dietary.jsx's DIET_TYPES / CONSISTENCIES, kept in sync there.
const DIET_TYPES = [
  { key: 'regular',      label: 'Regular' },
  { key: 'heart_healthy',label: 'Heart Healthy' },
  { key: 'low_sodium',   label: 'Low Sodium' },
  { key: 'diabetic',     label: 'Consistent Carbohydrate' },
  { key: 'ncs',          label: 'No Concentrated Sweets' },
  { key: 'renal',        label: 'Renal / CKD' },
  { key: 'lo_carb',      label: 'Low Carbohydrate' },
  { key: 'low_fat',      label: 'Low Fat' },
  { key: 'low_residue',  label: 'Low Fiber / Low Residue' },
  { key: 'dash',         label: 'DASH' },
  { key: 'gluten_free',  label: 'Gluten Free' },
  { key: 'vegetarian',   label: 'Vegetarian' },
  { key: 'vegan',        label: 'Vegan' },
  { key: 'neutropenic',  label: 'Neutropenic' },
  { key: 'other',        label: 'Other / Custom' },
]

const CONSISTENCY_LEVELS = [
  { key: 'regular',          label: 'Regular' },
  { key: 'easy_to_chew',     label: 'Easy to Chew' },
  { key: 'soft_bite_sized',  label: 'Soft & Bite-Sized' },
  { key: 'minced_moist',     label: 'Minced & Moist' },
  { key: 'mechanical_soft',  label: 'Mechanical Soft' },
  { key: 'pureed',           label: 'Pureed' },
  { key: 'liquid',           label: 'Liquidized / Thin' },
  { key: 'slightly_thick',   label: 'Slightly Thick' },
  { key: 'mildly_thick',     label: 'Mildly Thick' },
  { key: 'moderately_thick', label: 'Moderately Thick' },
  { key: 'extremely_thick',  label: 'Extremely Thick' },
  { key: 'thickened_liquid', label: 'Thickened Liquid' },
]

// ── Item Picker Dropdown ───────────────────────────────────────
function ItemPicker({ items, value, onChange, placeholder = 'Select item...' }) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const selected = items.find(i => i.id === value)
  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="w-full text-left px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-sm hover:border-brand-400 transition-colors flex items-center justify-between gap-2">
        <span className={selected ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}>{selected?.name || placeholder}</span>
        <ChevronRight size={14} className={`text-slate-400 transition-transform flex-shrink-0 ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg">
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Search..." />
          </div>
          <div className="max-h-48 overflow-y-auto">
            <button onClick={() => { onChange(null); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 italic">
              None
            </button>
            {filtered.map(item => (
              <button key={item.id} onClick={() => { onChange(item.id); setOpen(false); setSearch('') }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-brand-50 dark:hover:bg-slate-800 flex items-center justify-between ${value === item.id ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-700 dark:text-slate-300'}`}>
                <span>{item.name}</span>
                {value === item.id && <Check size={13} className="text-brand-600" />}
              </button>
            ))}
            {filtered.length === 0 && <div className="px-3 py-4 text-sm text-slate-400 text-center">No items found</div>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Recipe (yield + ingredients) ────────────────────────────────
function RecipeModal({ item, orgId, canEdit, onClose, onSaved }) {
  const [yieldServings, setYieldServings] = useState(item.yield_servings ?? '')
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    supabase.from('recipe_ingredients').select('*').eq('menu_item_id', item.id).order('sort_order')
      .then(({ data }) => {
        setIngredients((data || []).map(i => ({ id: i.id, ingredient_name: i.ingredient_name, quantity: i.quantity, unit: i.unit })))
        setLoading(false)
      })
  }, [item.id])

  const addRow    = () => setIngredients(rows => [...rows, { ingredient_name: '', quantity: '', unit: 'oz' }])
  const removeRow = (idx) => setIngredients(rows => rows.filter((_, i) => i !== idx))
  const updateRow = (idx, key, val) => setIngredients(rows => rows.map((r, i) => i === idx ? { ...r, [key]: val } : r))

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('menu_items').update({ yield_servings: yieldServings !== '' ? Number(yieldServings) : null }).eq('id', item.id)
    await supabase.from('recipe_ingredients').delete().eq('menu_item_id', item.id)
    const validRows = ingredients.filter(r => r.ingredient_name.trim() && r.quantity !== '')
    if (validRows.length > 0) {
      await supabase.from('recipe_ingredients').insert(validRows.map((r, idx) => ({
        organization_id: orgId, menu_item_id: item.id,
        ingredient_name: r.ingredient_name.trim(), quantity: Number(r.quantity), unit: r.unit, sort_order: idx,
      })))
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div>
            <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><ChefHat size={17} className="text-brand-600" /> Recipe</h2>
            <p className="text-xs text-slate-400">{item.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Recipe Yield</label>
            <div className="flex items-center gap-2">
              <input type="number" min="1" step="1" disabled={!canEdit} value={yieldServings} onChange={e => setYieldServings(e.target.value)}
                placeholder="e.g. 25"
                className="w-28 px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60" />
              <span className="text-sm text-slate-500 dark:text-slate-400">servings, as written below</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Ingredients</label>
              {canEdit && (
                <button onClick={addRow} className="text-xs text-brand-600 hover:underline flex items-center gap-1"><Plus size={11} /> Add ingredient</button>
              )}
            </div>
            {loading ? (
              <div className="text-slate-400 text-sm py-2">Loading...</div>
            ) : ingredients.length === 0 ? (
              <div className="text-slate-400 text-sm py-2">No ingredients yet.</div>
            ) : (
              <div className="space-y-2">
                {ingredients.map((row, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input value={row.ingredient_name} onChange={e => updateRow(idx, 'ingredient_name', e.target.value)} disabled={!canEdit}
                      placeholder="Ingredient (e.g. Ground Beef)"
                      className="flex-1 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60" />
                    <input type="number" min="0" step="0.01" value={row.quantity} onChange={e => updateRow(idx, 'quantity', e.target.value)} disabled={!canEdit}
                      placeholder="Qty"
                      className="w-20 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60" />
                    <select value={row.unit} onChange={e => updateRow(idx, 'unit', e.target.value)} disabled={!canEdit}
                      className="w-24 px-2 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60">
                      {RECIPE_UNITS.map(u => <option key={u} value={u}>{u.replace('_', ' ')}</option>)}
                    </select>
                    {canEdit && (
                      <button onClick={() => removeRow(idx)} className="text-slate-400 hover:text-red-500 flex-shrink-0"><X size={14} /></button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 font-medium">{canEdit ? 'Cancel' : 'Close'}</button>
          {canEdit && (
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
              {saving ? 'Saving...' : 'Save Recipe'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Menu Items Catalog ─────────────────────────────────────────
function MenuItemsCatalog({ items, onRefresh, orgId, canEdit }) {
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [recipeItem, setRecipeItem] = useState(null)
  const blankForm = { name: '', description: '', allergens: [], suitable_diets: [], suitable_consistencies: [], portion_qty: '', portion_unit: '', calories: '', protein_g: '', carbs_g: '', fat_g: '', sodium_mg: '' }
  const [form, setForm]         = useState(blankForm)
  const [saving, setSaving]     = useState(false)
  const [search, setSearch]     = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const openNew  = () => { setForm(blankForm); setEditItem(null); setShowForm(true) }
  const openEdit = (item) => { setForm({
    name: item.name, description: item.description || '', allergens: item.allergens || [],
    suitable_diets: item.suitable_diets || [], suitable_consistencies: item.suitable_consistencies || [],
    portion_qty: item.portion_qty ?? '', portion_unit: item.portion_unit || '',
    calories: item.calories ?? '', protein_g: item.protein_g ?? '', carbs_g: item.carbs_g ?? '',
    fat_g: item.fat_g ?? '', sodium_mg: item.sodium_mg ?? '',
  }); setEditItem(item); setShowForm(true) }

  const toggleAllergen  = (key) => set('allergens', form.allergens.includes(key) ? form.allergens.filter(a => a !== key) : [...form.allergens, key])
  const toggleDiet      = (key) => set('suitable_diets', form.suitable_diets.includes(key) ? form.suitable_diets.filter(d => d !== key) : [...form.suitable_diets, key])
  const toggleCons      = (key) => set('suitable_consistencies', form.suitable_consistencies.includes(key) ? form.suitable_consistencies.filter(c => c !== key) : [...form.suitable_consistencies, key])

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      name: form.name.trim(), description: form.description || null, allergens: form.allergens,
      suitable_diets: form.suitable_diets, suitable_consistencies: form.suitable_consistencies,
      portion_qty: form.portion_qty !== '' ? Number(form.portion_qty) : null,
      portion_unit: form.portion_unit || null,
      calories: form.calories !== '' ? Number(form.calories) : null,
      protein_g: form.protein_g !== '' ? Number(form.protein_g) : null,
      carbs_g: form.carbs_g !== '' ? Number(form.carbs_g) : null,
      fat_g: form.fat_g !== '' ? Number(form.fat_g) : null,
      sodium_mg: form.sodium_mg !== '' ? Number(form.sodium_mg) : null,
      organization_id: orgId,
    }
    if (editItem) {
      await supabase.from('menu_items').update(payload).eq('id', editItem.id)
    } else {
      await supabase.from('menu_items').insert(payload)
    }
    setSaving(false)
    setShowForm(false)
    onRefresh()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this item? It will be removed from any menus using it.')) return
    await supabase.from('menu_items').update({ is_active: false }).eq('id', id)
    onRefresh()
  }

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="relative flex-1 max-w-sm">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..."
            className="w-full pl-4 pr-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        {canEdit && (
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus size={15} /> Add Item
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
          <h4 className="font-medium text-slate-800 dark:text-slate-100 mb-3 text-sm">{editItem ? 'Edit Item' : 'New Menu Item'}</h4>
          <div className="space-y-3">
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Item name (e.g. Grilled Chicken)" />
            <input value={form.description} onChange={e => set('description', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Description (optional)" />
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Serving / Portion Size</label>
              <div className="flex gap-2">
                <input type="number" min="0" step="0.25" value={form.portion_qty} onChange={e => set('portion_qty', e.target.value)}
                  className="w-28 px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. 3" />
                <select value={form.portion_unit} onChange={e => set('portion_unit', e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">No unit</option>
                  {PORTION_UNITS.map(u => <option key={u} value={u}>{u.replace('_', ' ')}</option>)}
                </select>
              </div>
              <p className="text-xs text-slate-400 mt-1">Optional — used by the Order Guide to forecast how much of this item to buy from a resident count.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Nutrition Facts (per serving)</label>
              <div className="grid grid-cols-5 gap-2">
                <div>
                  <input type="number" min="0" step="1" value={form.calories} onChange={e => set('calories', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="0" />
                  <span className="text-[10px] text-slate-400">Calories</span>
                </div>
                <div>
                  <input type="number" min="0" step="0.1" value={form.protein_g} onChange={e => set('protein_g', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="0" />
                  <span className="text-[10px] text-slate-400">Protein (g)</span>
                </div>
                <div>
                  <input type="number" min="0" step="0.1" value={form.carbs_g} onChange={e => set('carbs_g', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="0" />
                  <span className="text-[10px] text-slate-400">Carbs (g)</span>
                </div>
                <div>
                  <input type="number" min="0" step="0.1" value={form.fat_g} onChange={e => set('fat_g', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="0" />
                  <span className="text-[10px] text-slate-400">Fat (g)</span>
                </div>
                <div>
                  <input type="number" min="0" step="1" value={form.sodium_mg} onChange={e => set('sodium_mg', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="0" />
                  <span className="text-[10px] text-slate-400">Sodium (mg)</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1">Optional — shown as a per-meal total on printed meal tickets.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Contains Allergens</label>
              <div className="flex flex-wrap gap-1.5">
                {ALLERGENS.map(a => (
                  <button key={a} onClick={() => toggleAllergen(a)}
                    className={`px-2 py-1 rounded-lg border text-xs font-medium transition-all capitalize ${form.allergens.includes(a) ? 'bg-red-500 text-white border-red-500' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-red-300'}`}>
                    {a.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Suitable For Diets</label>
              <div className="flex flex-wrap gap-1.5">
                {DIET_TYPES.map(d => (
                  <button key={d.key} onClick={() => toggleDiet(d.key)}
                    className={`px-2 py-1 rounded-lg border text-xs font-medium transition-all ${form.suitable_diets.includes(d.key) ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-300'}`}>
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1">Select all diets this item is appropriate for.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Suitable Consistencies</label>
              <div className="flex flex-wrap gap-1.5">
                {CONSISTENCY_LEVELS.map(cl => (
                  <button key={cl.key} onClick={() => toggleCons(cl.key)}
                    className={`px-2 py-1 rounded-lg border text-xs font-medium transition-all ${form.suitable_consistencies.includes(cl.key) ? 'bg-teal-600 text-white border-teal-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-300'}`}>
                    {cl.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1">Select all texture levels this item can be served at.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 font-medium">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-1.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:bg-brand-300 transition-colors">
                {saving ? 'Saving...' : 'Save Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(item => (
          <div key={item.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex items-start justify-between gap-2 hover:shadow-sm transition-all">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-800 dark:text-slate-100 text-sm">{item.name}</div>
              {item.description && <div className="text-xs text-slate-500 mt-0.5 truncate">{item.description}</div>}
              {item.portion_qty && item.portion_unit && (
                <div className="text-xs text-slate-400 mt-0.5">{item.portion_qty} {item.portion_unit.replace('_', ' ')} / serving</div>
              )}
              {item.yield_servings && (
                <div className="text-xs text-slate-400 mt-0.5">Recipe yields {item.yield_servings} servings</div>
              )}
              {item.calories != null && (
                <div className="text-xs text-slate-400 mt-0.5">
                  {item.calories} cal
                  {item.protein_g != null && ` · ${item.protein_g}g protein`}
                  {item.sodium_mg != null && ` · ${item.sodium_mg}mg sodium`}
                </div>
              )}
              {item.allergens?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {item.allergens.map(a => (
                    <span key={a} className="text-xs px-1.5 py-0.5 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded border border-red-100 dark:border-red-900/50 capitalize">{a.replace('_',' ')}</span>
                  ))}
                </div>
              )}
              {item.suitable_diets?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.suitable_diets.map(d => (
                    <span key={d} className="text-xs px-1.5 py-0.5 bg-brand-50 text-brand-600 rounded border border-brand-100 capitalize">{d.replace('_',' ')}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => setRecipeItem(item)} className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors" title={canEdit ? 'Edit recipe' : 'View recipe'}><ChefHat size={13} /></button>
              {canEdit && (
                <>
                  <button onClick={() => openEdit(item)} className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors"><Edit2 size={13} /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
                </>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-10 text-slate-400 text-sm">No items yet — add your first menu item above.</div>
        )}
      </div>

      {recipeItem && (
        <RecipeModal item={recipeItem} orgId={orgId} canEdit={canEdit}
          onClose={() => setRecipeItem(null)}
          onSaved={() => { setRecipeItem(null); onRefresh() }} />
      )}
    </div>
  )
}

// ── Day Cell (one meal period in the grid) ─────────────────────
function DayMealCell({ weekNum, dayIdx, period, dayData, items, onSave, canEdit }) {
  const [open, setOpen]     = useState(false)
  const [courses, setCourses] = useState([])
  const [saving, setSaving] = useState(false)

  const meal = dayData?.meals?.find(m => m.meal_period === period.key)

  useEffect(() => {
    if (open && meal) {
      setCourses(meal.courses?.map(c => ({
        id: c.id, course_name: c.course_name,
        menu_item_id: c.menu_item_id, sort_order: c.sort_order,
        alternates: (c.alternates || []).sort((a,b) => a.priority - b.priority).map(a => ({
          id: a.id, menu_item_id: a.menu_item_id, priority: a.priority,
          conditions: a.conditions || {}
        }))
      })) || [])
    } else if (open && !meal) {
      setCourses([{ course_name: 'Entree', menu_item_id: null, sort_order: 0, alternates: [] }])
    }
  }, [open])

  const addCourse = () => setCourses(cs => [...cs, { course_name: '', menu_item_id: null, sort_order: cs.length, alternates: [] }])
  const removeCourse = (idx) => setCourses(cs => cs.filter((_, i) => i !== idx))
  const updateCourse = (idx, key, val) => setCourses(cs => cs.map((course, i) => i === idx ? { ...course, [key]: val } : course))
  const addAlternate = (idx) => setCourses(cs => cs.map((course, i) => i === idx
    ? { ...course, alternates: [...course.alternates, { menu_item_id: null, priority: course.alternates.length + 1, conditions: {} }] }
    : course))
  const removeAlternate = (cIdx, aIdx) => setCourses(cs => cs.map((course, i) => i === cIdx
    ? { ...course, alternates: course.alternates.filter((_, j) => j !== aIdx).map((a, j) => ({ ...a, priority: j + 1 })) }
    : course))
  const updateAlternate = (cIdx, aIdx, key, val) => setCourses(cs => cs.map((course, i) => i === cIdx
    ? { ...course, alternates: course.alternates.map((a, j) => j === aIdx ? { ...a, [key]: val } : a) }
    : course))
  const toggleAltCondition = (cIdx, aIdx, type, key) => {
    setCourses(cs => cs.map((course, i) => {
      if (i !== cIdx) return course
      return { ...course, alternates: course.alternates.map((a, j) => {
        if (j !== aIdx) return a
        const existing = a.conditions?.[type] || []
        const updated  = existing.includes(key) ? existing.filter(k => k !== key) : [...existing, key]
        return { ...a, conditions: { ...a.conditions, [type]: updated } }
      })}
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave(weekNum, dayIdx, period.key, courses)
    setSaving(false)
    setOpen(false)
  }

  const courseCount = meal?.courses?.length || 0
  const hasItems = courseCount > 0

  return (
    <>
      <button onClick={() => setOpen(true)}
        className={`w-full text-left p-2 rounded-lg border transition-all min-h-[52px] ${hasItems ? 'border-brand-200 bg-brand-50 hover:bg-brand-100' : 'border-dashed border-slate-200 dark:border-slate-700 hover:border-brand-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
        {hasItems ? (
          <div>
            {meal.courses.slice(0, 2).map((c, i) => (
              <div key={i} className="text-xs text-brand-700 truncate leading-tight">
                {items.find(it => it.id === c.menu_item_id)?.name || '—'}
              </div>
            ))}
            {meal.courses.length > 2 && <div className="text-xs text-brand-400">+{meal.courses.length - 2} more</div>}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-300">
            <Plus size={16} />
          </div>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-900 rounded-t-2xl flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 z-10">
              <div>
                <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-base">
                  {period.label} — Week {weekNum}, {DAYS[dayIdx]}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Set menu items and backup substitutions</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <fieldset disabled={!canEdit} className="px-5 py-4 space-y-3 disabled:opacity-75">
              {courses.map((course, idx) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <input value={course.course_name} onChange={e => updateCourse(idx, 'course_name', e.target.value)}
                      className="flex-1 px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-900 dark:text-slate-100"
                      placeholder="Course name (e.g. Entree, Vegetable, Dessert)" />
                    <button onClick={() => removeCourse(idx)} className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"><X size={15} /></button>
                  </div>
                  <div className="mb-2">
                    <label className="block text-xs text-slate-500 mb-1">Menu Item</label>
                    <ItemPicker items={items} value={course.menu_item_id}
                      onChange={v => updateCourse(idx, 'menu_item_id', v)} placeholder="Select item..." />
                  </div>
                  {/* Alternates */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Alternates / Substitutions</label>
                      <button onClick={() => addAlternate(idx)}
                        className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium">
                        <Plus size={11} /> Add Alternate
                      </button>
                    </div>
                    {course.alternates?.length === 0 && (
                      <p className="text-xs text-slate-400 italic">No alternates — click "Add Alternate" to set substitutions.</p>
                    )}
                    {course.alternates?.map((alt, aIdx) => (
                      <div key={aIdx} className="mb-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-bold text-slate-400 w-5 text-center">{aIdx + 1}</span>
                          <div className="flex-1">
                            <ItemPicker items={items} value={alt.menu_item_id}
                              onChange={v => updateAlternate(idx, aIdx, 'menu_item_id', v)} placeholder="Select alternate item..." />
                          </div>
                          <button onClick={() => removeAlternate(idx, aIdx)} className="text-slate-300 hover:text-red-400"><X size={13} /></button>
                        </div>
                        {/* Conditions */}
                        <div className="pl-7 space-y-1.5">
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Use for diets: <span className="text-slate-300">(blank = all diets)</span></p>
                            <div className="flex flex-wrap gap-1">
                              {DIET_TYPES.map(d => (
                                <button key={d.key} onClick={() => toggleAltCondition(idx, aIdx, 'diets', d.key)}
                                  className={`px-1.5 py-0.5 rounded text-xs border transition-all ${(alt.conditions?.diets || []).includes(d.key) ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-brand-300'}`}>
                                  {d.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Use for allergens:</p>
                            <div className="flex flex-wrap gap-1">
                              {ALLERGENS.map(a => (
                                <button key={a} onClick={() => toggleAltCondition(idx, aIdx, 'allergens', a)}
                                  className={`px-1.5 py-0.5 rounded text-xs border transition-all capitalize ${(alt.conditions?.allergens || []).includes(a) ? 'bg-red-500 text-white border-red-500' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-red-300'}`}>
                                  {a.replace('_',' ')}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={addCourse}
                className="w-full py-2 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors flex items-center justify-center gap-1.5">
                <Plus size={14} /> Add Course
              </button>
            </fieldset>

            <div className="sticky bottom-0 bg-white dark:bg-slate-900 rounded-b-2xl px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 font-medium">{canEdit ? 'Cancel' : 'Close'}</button>
              {canEdit && (
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
                  <Save size={14} />{saving ? 'Saving...' : 'Save Meal'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Cook's Count ───────────────────────────────────────────────
// Real kitchen prep counts: for each course, resolves what every resident on
// this menu would actually be served (main item, or their best-matching
// alternate) using the same logic as the printed meal ticket, then tallies
// how many portions of each item the kitchen needs to prepare.
function CooksCount({ weekNum, dayIdx, menu, orgId }) {
  const [result, setResult]   = useState(null)
  const [recipes, setRecipes] = useState(new Map()) // menu_item_id -> { yieldServings, ingredients }
  const [expanded, setExpanded] = useState(new Set()) // item ids currently showing a scaled recipe
  const [loading, setLoading] = useState(true)
  const [period, setPeriod]   = useState('lunch')

  useEffect(() => { fetchCounts() }, [weekNum, dayIdx, period, menu.id])

  async function fetchCounts() {
    setLoading(true)
    const { data: dayData } = await supabase.from('cycle_menu_days')
      .select('id').eq('cycle_menu_id', menu.id).eq('week_number', weekNum).eq('day_of_week', dayIdx).limit(1)
    const day = dayData?.[0] || null
    if (!day) { setResult(null); setLoading(false); return }
    const { data: mealRows } = await supabase.from('cycle_menu_meals')
      .select('id').eq('cycle_menu_day_id', day.id).eq('meal_period', period).limit(1)
    const meal = mealRows?.[0] || null
    if (!meal) { setResult(null); setLoading(false); return }

    const [{ data: courseData }, { data: residentProfiles }] = await Promise.all([
      supabase.from('meal_courses')
        .select('*, menu_items:menu_items!meal_courses_menu_item_id_fkey(id,name,allergens,suitable_diets,suitable_consistencies,yield_servings)')
        .eq('meal_id', meal.id).order('sort_order'),
      supabase.from('resident_dietary_profiles')
        .select('resident_id, diet_type, consistency, allergens, dislikes, cycle_menu_id')
        .eq('organization_id', orgId)
        .eq('is_active', true),
    ])

    // Alternates by source_item_id (item-level, reusable across every cycle day
    // that uses the same main item) — matches how the meal ticket resolves them.
    const menuItemIds = (courseData || []).map(c => c.menu_item_id).filter(Boolean)
    let altData = []
    if (menuItemIds.length > 0) {
      const { data: alts } = await supabase.from('course_alternates')
        .select('id, source_item_id, priority, conditions, item:menu_items!course_alternates_menu_item_id_fkey(id,name,allergens,suitable_diets,suitable_consistencies,yield_servings)')
        .in('source_item_id', menuItemIds)
        .order('priority')
      altData = alts || []
    }

    // Only residents actually on this menu: explicitly assigned to it, or
    // unassigned while this is the org's current menu (same fallback the
    // meal ticket uses).
    const residents = (residentProfiles || []).filter(r =>
      r.cycle_menu_id === menu.id || (!r.cycle_menu_id && menu.is_current)
    )

    const yieldById = new Map() // item id -> yield_servings, for every item that could get served
    const rows = (courseData || []).map(course => {
      const alternates = altData.filter(a => a.source_item_id === course.menu_item_id)
      const tally = new Map() // item id -> { id, name, count }
      let unresolved = 0
      residents.forEach(resident => {
        const { servedItem } = resolveMealItem(course.menu_items, alternates, resident)
        if (!servedItem) { unresolved++; return }
        if (servedItem.yield_servings) yieldById.set(servedItem.id, servedItem.yield_servings)
        const key = servedItem.id || servedItem.name
        const existing = tally.get(key)
        tally.set(key, { id: servedItem.id, name: servedItem.name, count: (existing?.count || 0) + 1 })
      })
      return {
        course_name: course.course_name,
        mainName: course.menu_items?.name || null,
        tally: Array.from(tally.values()).sort((a, b) => b.count - a.count),
        unresolved,
      }
    })

    // Fetch ingredient lists for every served item that has a recipe yield set.
    const recipeItemIds = Array.from(yieldById.keys())
    const recipeMap = new Map()
    if (recipeItemIds.length > 0) {
      const { data: ingredientRows } = await supabase.from('recipe_ingredients')
        .select('*').in('menu_item_id', recipeItemIds).order('sort_order')
      recipeItemIds.forEach(id => {
        recipeMap.set(id, {
          yieldServings: yieldById.get(id),
          ingredients: (ingredientRows || []).filter(i => i.menu_item_id === id),
        })
      })
    }

    setRecipes(recipeMap)
    setExpanded(new Set())
    setResult({ rows, totalResidents: residents.length })
    setLoading(false)
  }

  const toggleExpanded = (id) => setExpanded(s => {
    const next = new Set(s)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100">Cook's Count</h3>
        <select value={period} onChange={e => setPeriod(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500">
          {MEAL_PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        Week {weekNum}, {DAYS[dayIdx]}
        {result && ` · ${result.totalResidents} resident${result.totalResidents !== 1 ? 's' : ''} on this menu`}
      </p>
      {loading ? <div className="text-slate-400 text-sm">Loading...</div>
        : !result || result.rows.length === 0 ? <div className="text-slate-400 text-sm">No menu set for this meal.</div>
        : result.totalResidents === 0 ? <div className="text-slate-400 text-sm">No residents are assigned to this menu yet — link residents from their dietary profile to get real counts here.</div>
        : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="text-left text-xs font-semibold text-slate-500 pb-2">Course</th>
                <th className="text-left text-xs font-semibold text-slate-500 pb-2">Item</th>
                <th className="text-right text-xs font-semibold text-slate-500 pb-2">Count</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r, i) => (
                <tr key={i} className="border-b border-slate-50 dark:border-slate-800 align-top">
                  <td className="py-2 text-xs font-medium text-slate-700 dark:text-slate-300">{r.course_name}</td>
                  <td className="py-2 text-xs">
                    {r.tally.length === 0 && r.unresolved === 0
                      ? <span className="text-slate-400">—</span>
                      : r.tally.map((t, j) => {
                          const recipe = t.id ? recipes.get(t.id) : null
                          const isExpanded = expanded.has(t.id)
                          const scaled = recipe && isExpanded ? scaleIngredients(recipe.ingredients, recipe.yieldServings, t.count) : null
                          return (
                            <div key={j} className="mb-1">
                              <div className={`flex items-center gap-1.5 ${t.name === r.mainName ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400 italic'}`}>
                                {t.name}{t.name !== r.mainName && ' (alt)'}
                                {recipe && (
                                  <button onClick={() => toggleExpanded(t.id)}
                                    className="not-italic flex items-center gap-0.5 text-brand-600 dark:text-brand-400 font-medium flex-shrink-0">
                                    <ChefHat size={11} /> Recipe {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                  </button>
                                )}
                              </div>
                              {scaled && (
                                <div className="mt-1 mb-2 pl-3 border-l-2 border-brand-100 dark:border-brand-900 space-y-0.5">
                                  <div className="text-slate-400 not-italic">
                                    Yields {recipe.yieldServings} → scaled to {t.count} ({(t.count / recipe.yieldServings).toFixed(2)}x)
                                  </div>
                                  {scaled.map((ing, k) => (
                                    <div key={k} className="text-slate-600 dark:text-slate-300 not-italic">
                                      {ing.scaledQuantity} {ing.unit.replace('_', ' ')} {ing.ingredient_name}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                    {r.unresolved > 0 && (
                      <div className="text-red-600 dark:text-red-400 font-medium">⚠ Verify with kitchen</div>
                    )}
                  </td>
                  <td className="py-2 text-xs text-right">
                    {r.tally.map((t, j) => (
                      <div key={j} className="text-slate-700 dark:text-slate-300 font-semibold">{t.count}</div>
                    ))}
                    {r.unresolved > 0 && (
                      <div className="text-red-600 dark:text-red-400 font-semibold">{r.unresolved}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </div>
  )
}

// ── Cycle Menu Grid ────────────────────────────────────────────
function CycleMenuGrid({ menu, items, onBack, canEdit, orgId }) {
  const { profile } = useAuth()
  const [week, setWeek]     = useState(1)
  const [gridData, setGridData] = useState({})
  const [loading, setLoading]   = useState(true)
  const [showCount, setShowCount] = useState(false)
  const [countDay, setCountDay]   = useState(0)
  const [approval, setApproval] = useState({
    approved_by: menu.approved_by || null,
    approved_at: menu.approved_at || null,
    approverName: null,
  })

  useEffect(() => {
    setApproval({ approved_by: menu.approved_by || null, approved_at: menu.approved_at || null, approverName: null })
    if (menu.approved_by) {
      supabase.from('profiles').select('first_name,last_name').eq('id', menu.approved_by).single()
        .then(({ data }) => setApproval(a => ({ ...a, approverName: data ? `${data.first_name} ${data.last_name}` : null })))
    }
  }, [menu.id, menu.approved_by])

  async function handleApprove() {
    const now = new Date().toISOString()
    const { error } = await supabase.from('cycle_menus').update({ approved_by: profile.id, approved_at: now }).eq('id', menu.id)
    if (error) { console.error('Failed to approve menu:', error.message); return }
    setApproval({ approved_by: profile.id, approved_at: now, approverName: `${profile.first_name} ${profile.last_name}` })
  }

  useEffect(() => { fetchWeekData() }, [week, menu.id])

  async function fetchWeekData() {
    setLoading(true)
    const { data: days } = await supabase.from('cycle_menu_days')
      .select(`id, day_of_week, cycle_menu_meals(id, meal_period, courses:meal_courses(id, course_name, sort_order, menu_item_id, alternates:course_alternates(id, menu_item_id, priority, conditions, item:menu_items!course_alternates_menu_item_id_fkey(id,name,suitable_diets,suitable_consistencies,allergens))))`)
      .eq('cycle_menu_id', menu.id).eq('week_number', week)
    const grid = {}
    days?.forEach(d => { grid[d.day_of_week] = { id: d.id, meals: d.cycle_menu_meals } })
    setGridData(grid)
    setLoading(false)
  }

  async function handleSaveMeal(weekNum, dayIdx, periodKey, courses) {
    // Get or create day
    const { data: dayRows } = await supabase.from('cycle_menu_days')
      .select('id').eq('cycle_menu_id', menu.id).eq('week_number', weekNum).eq('day_of_week', dayIdx).limit(1)
    let day = dayRows?.[0] || null
    if (!day) {
      const { data: newDay, error: newDayErr } = await supabase.from('cycle_menu_days')
        .insert({ cycle_menu_id: menu.id, week_number: weekNum, day_of_week: dayIdx }).select().single()
      if (newDayErr) { console.error('Failed to create day:', newDayErr.message); return }
      day = newDay
    }
    // Get or create meal
    const { data: mealRows } = await supabase.from('cycle_menu_meals')
      .select('id').eq('cycle_menu_day_id', day.id).eq('meal_period', periodKey).limit(1)
    let meal = mealRows?.[0] || null
    if (!meal) {
      const { data: newMeal, error: newMealErr } = await supabase.from('cycle_menu_meals')
        .insert({ cycle_menu_day_id: day.id, meal_period: periodKey }).select().single()
      if (newMealErr) { console.error('Failed to create meal:', newMealErr.message); return }
      meal = newMeal
    }
    // Delete old courses and re-insert
    await supabase.from('meal_courses').delete().eq('meal_id', meal.id)
    const validCourses = courses.filter(c => c.course_name.trim())
    if (validCourses.length > 0) {
      const { data: savedCourses, error: insertErr } = await supabase.from('meal_courses').insert(
        validCourses.map((c, i) => ({
          meal_id: meal.id, course_name: c.course_name,
          menu_item_id: c.menu_item_id || null,
          sort_order: i
        }))
      ).select()
      if (insertErr) { console.error('Failed to save courses:', insertErr.message); return }

      // Save alternates for each course. source_item_id (not meal_course_id) is
      // what every reader (meal ticket, Cook's Count) actually resolves against —
      // it's what makes an alternate apply to every cycle day that uses this same
      // main item, not just the one instance it was defined on — so it has to be
      // set here or the insert fails the column's not-null constraint.
      const alternateRows = []
      savedCourses.forEach((savedCourse, i) => {
        const origCourse = validCourses[i]
        if (!savedCourse.menu_item_id) return
        origCourse.alternates?.filter(a => a.menu_item_id).forEach((a, j) => {
          alternateRows.push({
            meal_course_id:  savedCourse.id,
            source_item_id:  savedCourse.menu_item_id,
            menu_item_id:    a.menu_item_id,
            priority:        j + 1,
            conditions:      a.conditions || {}
          })
        })
      })
      if (alternateRows.length > 0) {
        const { error: altErr } = await supabase.from('course_alternates').insert(alternateRows)
        if (altErr) { console.error('Failed to save alternates:', altErr.message); return }
      }
    }
    // A previously-approved menu that just changed needs a fresh sign-off —
    // an approval that silently survives edits isn't worth anything.
    if (approval.approved_at) {
      await supabase.from('cycle_menus').update({ approved_by: null, approved_at: null }).eq('id', menu.id)
      setApproval({ approved_by: null, approved_at: null, approverName: null })
    }
    fetchWeekData()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-lg">{menu.name}</h2>
          <p className="text-slate-400 text-xs">{menu.cycle_length}-week rotation</p>
        </div>
        <button onClick={() => setShowCount(s => !s)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${showCount ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-300'}`}>
          Cook's Count
        </button>
      </div>

      {/* Approval status */}
      <div className={`flex items-center justify-between gap-3 mb-4 px-4 py-2.5 rounded-xl border text-sm ${
        approval.approved_at
          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400'
          : 'bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50 text-amber-700 dark:text-amber-400'}`}>
        <span className="flex items-center gap-2">
          <ShieldCheck size={15} />
          {approval.approved_at
            ? `Approved${approval.approverName ? ` by ${approval.approverName}` : ''} on ${new Date(approval.approved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
            : 'Not yet approved for nutritional adequacy'}
        </span>
        {canEdit && !approval.approved_at && (
          <button onClick={handleApprove}
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex-shrink-0">
            <Check size={12} /> Approve Menu
          </button>
        )}
      </div>

      {/* Week nav */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setWeek(w => Math.max(1, w - 1))} disabled={week === 1}
          className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 flex gap-1 overflow-x-auto">
          {Array.from({ length: menu.cycle_length }, (_, i) => i + 1).map(w => (
            <button key={w} onClick={() => setWeek(w)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${week === w ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              Wk {w}
            </button>
          ))}
        </div>
        <button onClick={() => setWeek(w => Math.min(menu.cycle_length, w + 1))} disabled={week === menu.cycle_length}
          className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Cook's count panel */}
      {showCount && (
        <div className="mb-4">
          <div className="flex gap-2 mb-3">
            {DAYS.map((d, i) => (
              <button key={i} onClick={() => setCountDay(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${countDay === i ? 'bg-brand-600 text-white' : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
                {d}
              </button>
            ))}
          </div>
          <CooksCount weekNum={week} dayIdx={countDay} menu={menu} orgId={orgId} />
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading week {week}...</div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Meal</th>
                  {DAYS.map(d => (
                    <th key={d} className="px-2 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MEAL_PERIODS.map(period => (
                  <tr key={period.key} className="border-b border-slate-50 dark:border-slate-800">
                    <td className="px-3 py-2">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{period.label}</span>
                    </td>
                    {DAYS.map((_, dayIdx) => (
                      <td key={dayIdx} className="px-1.5 py-1.5">
                        <DayMealCell
                          weekNum={week} dayIdx={dayIdx}
                          period={period} dayData={gridData[dayIdx]}
                          items={items} onSave={handleSaveMeal}
                          canEdit={canEdit}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="text-xs text-slate-400 mt-3 text-center">Click any cell to set menu items and backup substitutions for that meal</p>
    </div>
  )
}

// ── Cycle Menu List ────────────────────────────────────────────
function CycleMenuList({ menus, onSelect, onCreate, onDelete, onSetCurrent, canEdit }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{menus.length} cycle menu{menus.length !== 1 ? 's' : ''}</p>
        {canEdit && (
          <button onClick={onCreate}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus size={15} /> New Cycle Menu
          </button>
        )}
      </div>

      {menus.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-display text-lg">No cycle menus yet</p>
          <p className="text-sm mt-1">Create your first rotating menu above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {menus.map(menu => (
            <div key={menu.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md transition-all cursor-pointer group"
              onClick={() => onSelect(menu)}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">{menu.name}</h3>
                  <p className="text-slate-400 text-sm mt-0.5 flex items-center gap-1.5">
                    <RefreshCw size={12} /> {menu.cycle_length}-week rotation
                  </p>
                  {menu.start_date && (
                    <p className="text-slate-400 text-xs mt-1">
                      Started {new Date(menu.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                  <p className={`text-xs mt-1 flex items-center gap-1 ${menu.approved_at ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    <ShieldCheck size={11} /> {menu.approved_at ? 'Approved' : 'Not yet approved'}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => { e.stopPropagation(); onDelete(menu.id) }}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-brand-600 font-medium">
                  <span>Open menu builder</span>
                  <ChevronRight size={13} />
                </div>
                {menu.is_current
                  ? <span className="px-2 py-0.5 bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full">✓ Active</span>
                  : canEdit
                    ? <button onClick={e => { e.stopPropagation(); onSetCurrent(menu.id) }}
                        className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-brand-100 text-slate-500 dark:text-slate-400 hover:text-brand-700 text-xs font-medium rounded-full transition-colors">
                        Set Active
                      </button>
                    : <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-medium rounded-full">Inactive</span>
                }
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── New Menu Modal ─────────────────────────────────────────────
function NewMenuModal({ onClose, onSave, orgId, userId }) {
  const [form, setForm] = useState({ name: '', cycle_length: 16, start_date: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    await supabase.from('cycle_menus').insert({
      name: form.name.trim(), cycle_length: form.cycle_length,
      start_date: form.start_date || null,
      organization_id: orgId, created_by: userId, is_active: true
    })
    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100">New Cycle Menu</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Menu Name</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. 16-Week Summer Rotation" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Cycle Length (weeks)</label>
            <input type="number" min={1} max={52} value={form.cycle_length} onChange={e => set('cycle_length', parseInt(e.target.value))}
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Cycle Start Date</label>
            <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <p className="text-xs text-slate-400 mt-1">Used to calculate which week of the cycle today falls on</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Creating...' : 'Create Menu'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Export ────────────────────────────────────────────────
export default function CycleMenuBuilder({ menus, items, onRefresh, orgId, userId, canEdit }) {
  const [view, setView]         = useState('list') // 'list' | 'grid' | 'items'
  const [activeMenu, setActiveMenu] = useState(null)
  const [showNewMenu, setShowNewMenu] = useState(false)

  const handleSelectMenu = (menu) => { setActiveMenu(menu); setView('grid') }
  const handleBack       = () => { setActiveMenu(null); setView('list'); onRefresh() }
  const handleCreate     = () => { if (canEdit) setShowNewMenu(true) }
  const handleCreated    = () => { setShowNewMenu(false); onRefresh() }
  const handleDelete     = async (id) => {
    if (!canEdit) return
    if (!confirm('Delete this cycle menu and all its meals?')) return
    await supabase.from('cycle_menus').update({ is_active: false }).eq('id', id)
    onRefresh()
  }

  const handleSetCurrent = async (id) => {
    if (!canEdit) return
    // Clear current flag on all org menus, then set on selected
    await supabase.from('cycle_menus').update({ is_current: false }).eq('organization_id', orgId)
    await supabase.from('cycle_menus').update({ is_current: true }).eq('id', id)
    onRefresh()
  }

  return (
    <div>
      {/* Sub-tabs */}
      {view === 'list' && (
        <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
          <button onClick={() => setView('list')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-slate-900 text-brand-700 dark:text-brand-400 shadow-sm">
            <BookOpen size={14} /> Cycle Menus
          </button>
          <button onClick={() => setView('items')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            <Package size={14} /> Menu Items
          </button>
        </div>
      )}

      {view === 'items' && (
        <div>
          <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
            <button onClick={() => setView('list')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
              <BookOpen size={14} /> Cycle Menus
            </button>
            <button onClick={() => setView('items')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-slate-900 text-brand-700 dark:text-brand-400 shadow-sm">
              <Package size={14} /> Menu Items
            </button>
          </div>
          <MenuItemsCatalog items={items} onRefresh={onRefresh} orgId={orgId} canEdit={canEdit} />
        </div>
      )}

      {view === 'list' && (
        <CycleMenuList menus={menus} onSelect={handleSelectMenu} onCreate={handleCreate} onDelete={handleDelete} onSetCurrent={handleSetCurrent} canEdit={canEdit} />
      )}

      {view === 'grid' && activeMenu && (
        <CycleMenuGrid menu={activeMenu} items={items} onBack={handleBack} canEdit={canEdit} orgId={orgId} />
      )}

      {showNewMenu && (
        <NewMenuModal onClose={() => setShowNewMenu(false)} onSave={handleCreated} orgId={orgId} userId={userId} />
      )}
    </div>
  )
}
