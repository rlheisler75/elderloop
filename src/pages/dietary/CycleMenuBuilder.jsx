import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, X, Edit2, Trash2, ChevronLeft, ChevronRight,
  BookOpen, Package, Save, ArrowLeft, RefreshCw, Check
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

// ── Menu Items Catalog ─────────────────────────────────────────
function MenuItemsCatalog({ items, onRefresh, orgId, canEdit }) {
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm]         = useState({ name: '', description: '', allergens: [], suitable_diets: [], suitable_consistencies: [] })
  const [saving, setSaving]     = useState(false)
  const [search, setSearch]     = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const openNew  = () => { setForm({ name: '', description: '', allergens: [], suitable_diets: [], suitable_consistencies: [] }); setEditItem(null); setShowForm(true) }
  const openEdit = (item) => { setForm({ name: item.name, description: item.description || '', allergens: item.allergens || [], suitable_diets: item.suitable_diets || [], suitable_consistencies: item.suitable_consistencies || [] }); setEditItem(item); setShowForm(true) }

  const toggleAllergen  = (key) => set('allergens', form.allergens.includes(key) ? form.allergens.filter(a => a !== key) : [...form.allergens, key])
  const toggleDiet      = (key) => set('suitable_diets', form.suitable_diets.includes(key) ? form.suitable_diets.filter(d => d !== key) : [...form.suitable_diets, key])
  const toggleCons      = (key) => set('suitable_consistencies', form.suitable_consistencies.includes(key) ? form.suitable_consistencies.filter(c => c !== key) : [...form.suitable_consistencies, key])

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = { name: form.name.trim(), description: form.description || null, allergens: form.allergens, suitable_diets: form.suitable_diets, suitable_consistencies: form.suitable_consistencies, organization_id: orgId }
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
            {canEdit && (
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => openEdit(item)} className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors"><Edit2 size={13} /></button>
                <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-10 text-slate-400 text-sm">No items yet — add your first menu item above.</div>
        )}
      </div>
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
function CooksCount({ weekNum, dayIdx, menuId, items }) {
  const [counts, setCounts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod]   = useState('lunch')

  useEffect(() => { fetchCounts() }, [weekNum, dayIdx, period, menuId])

  async function fetchCounts() {
    setLoading(true)
    const { data: dayData } = await supabase.from('cycle_menu_days')
      .select('id').eq('cycle_menu_id', menuId).eq('week_number', weekNum).eq('day_of_week', dayIdx).limit(1)
    const day = dayData?.[0] || null
    if (!day) { setCounts(null); setLoading(false); return }
    const { data: mealRows } = await supabase.from('cycle_menu_meals')
      .select('id').eq('cycle_menu_day_id', day.id).eq('meal_period', period).limit(1)
    const meal = mealRows?.[0] || null
    if (!meal) { setCounts(null); setLoading(false); return }
    const { data: courses } = await supabase.from('meal_courses')
      .select('*, menu_items:menu_items!meal_courses_menu_item_id_fkey(name), alternates:course_alternates(priority, item:menu_items!course_alternates_menu_item_id_fkey(name))')
      .eq('meal_id', meal.id).order('sort_order')
    setCounts(courses || [])
    setLoading(false)
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100">Cook's Count</h3>
        <select value={period} onChange={e => setPeriod(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500">
          {MEAL_PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </div>
      <p className="text-xs text-slate-400 mb-3">Week {weekNum}, {DAYS[dayIdx]}</p>
      {loading ? <div className="text-slate-400 text-sm">Loading...</div>
        : !counts || counts.length === 0 ? <div className="text-slate-400 text-sm">No menu set for this meal.</div>
        : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="text-left text-xs font-semibold text-slate-500 pb-2">Course</th>
                <th className="text-left text-xs font-semibold text-slate-500 pb-2">Item</th>
                <th className="text-left text-xs font-semibold text-slate-500 pb-2">Alternates</th>
              </tr>
            </thead>
            <tbody>
              {counts.map((c, i) => (
                <tr key={i} className="border-b border-slate-50 dark:border-slate-800">
                  <td className="py-2 text-xs font-medium text-slate-700 dark:text-slate-300">{c.course_name}</td>
                  <td className="py-2 text-xs text-slate-600 dark:text-slate-300">{c.menu_items?.name || '—'}</td>
                  <td className="py-2 text-xs text-slate-400 italic">
                    {c.alternates?.length > 0
                      ? c.alternates.sort((a,b) => a.priority - b.priority).map(a => a.item?.name).filter(Boolean).join(' → ')
                      : '—'}
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
function CycleMenuGrid({ menu, items, onBack, canEdit }) {
  const [week, setWeek]     = useState(1)
  const [gridData, setGridData] = useState({})
  const [loading, setLoading]   = useState(true)
  const [showCount, setShowCount] = useState(false)
  const [countDay, setCountDay]   = useState(0)

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

      // Save alternates for each course
      const alternateRows = []
      savedCourses.forEach((savedCourse, i) => {
        const origCourse = validCourses[i]
        origCourse.alternates?.filter(a => a.menu_item_id).forEach((a, j) => {
          alternateRows.push({
            meal_course_id: savedCourse.id,
            menu_item_id:   a.menu_item_id,
            priority:       j + 1,
            conditions:     a.conditions || {}
          })
        })
      })
      if (alternateRows.length > 0) {
        const { error: altErr } = await supabase.from('course_alternates').insert(alternateRows)
        if (altErr) { console.error('Failed to save alternates:', altErr.message); return }
      }
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
          <CooksCount weekNum={week} dayIdx={countDay} menuId={menu.id} items={items} />
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
        <CycleMenuGrid menu={activeMenu} items={items} onBack={handleBack} canEdit={canEdit} />
      )}

      {showNewMenu && (
        <NewMenuModal onClose={() => setShowNewMenu(false)} onSave={handleCreated} orgId={orgId} userId={userId} />
      )}
    </div>
  )
}
