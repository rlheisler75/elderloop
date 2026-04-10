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

// ── Item Picker Dropdown ───────────────────────────────────────
function ItemPicker({ items, value, onChange, placeholder = 'Select item...' }) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const selected = items.find(i => i.id === value)
  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="w-full text-left px-3 py-2 border border-slate-200 rounded-lg text-sm hover:border-brand-400 transition-colors flex items-center justify-between gap-2">
        <span className={selected ? 'text-slate-800' : 'text-slate-400'}>{selected?.name || placeholder}</span>
        <ChevronRight size={14} className={`text-slate-400 transition-transform flex-shrink-0 ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg">
          <div className="p-2 border-b border-slate-100">
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Search..." />
          </div>
          <div className="max-h-48 overflow-y-auto">
            <button onClick={() => { onChange(null); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:bg-slate-50 italic">
              None
            </button>
            {filtered.map(item => (
              <button key={item.id} onClick={() => { onChange(item.id); setOpen(false); setSearch('') }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-brand-50 flex items-center justify-between ${value === item.id ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-700'}`}>
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
function MenuItemsCatalog({ items, onRefresh, orgId }) {
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm]         = useState({ name: '', description: '', allergens: [] })
  const [saving, setSaving]     = useState(false)
  const [search, setSearch]     = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const openNew  = () => { setForm({ name: '', description: '', allergens: [] }); setEditItem(null); setShowForm(true) }
  const openEdit = (item) => { setForm({ name: item.name, description: item.description || '', allergens: item.allergens || [] }); setEditItem(item); setShowForm(true) }

  const toggleAllergen = (key) => set('allergens',
    form.allergens.includes(key) ? form.allergens.filter(a => a !== key) : [...form.allergens, key])

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = { name: form.name.trim(), description: form.description || null, allergens: form.allergens, organization_id: orgId }
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
            className="w-full pl-4 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={15} /> Add Item
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <h4 className="font-medium text-slate-800 mb-3 text-sm">{editItem ? 'Edit Item' : 'New Menu Item'}</h4>
          <div className="space-y-3">
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Item name (e.g. Grilled Chicken)" />
            <input value={form.description} onChange={e => set('description', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Description (optional)" />
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Contains Allergens</label>
              <div className="flex flex-wrap gap-1.5">
                {ALLERGENS.map(a => (
                  <button key={a} onClick={() => toggleAllergen(a)}
                    className={`px-2 py-1 rounded-lg border text-xs font-medium transition-all capitalize ${form.allergens.includes(a) ? 'bg-red-500 text-white border-red-500' : 'border-slate-200 text-slate-600 hover:border-red-300'}`}>
                    {a.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-slate-600 font-medium">Cancel</button>
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
          <div key={item.id} className="bg-white border border-slate-100 rounded-xl p-4 flex items-start justify-between gap-2 hover:shadow-sm transition-all">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-800 text-sm">{item.name}</div>
              {item.description && <div className="text-xs text-slate-500 mt-0.5 truncate">{item.description}</div>}
              {item.allergens?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {item.allergens.map(a => (
                    <span key={a} className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded border border-red-100 capitalize">{a.replace('_',' ')}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => openEdit(item)} className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors"><Edit2 size={13} /></button>
              <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
            </div>
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
function DayMealCell({ weekNum, dayIdx, period, dayData, items, onSave }) {
  const [open, setOpen]     = useState(false)
  const [courses, setCourses] = useState([])
  const [saving, setSaving] = useState(false)

  const meal = dayData?.meals?.find(m => m.meal_period === period.key)

  useEffect(() => {
    if (open && meal) {
      setCourses(meal.courses?.map(c => ({
        id: c.id, course_name: c.course_name,
        menu_item_id: c.menu_item_id, backup_item_id: c.backup_item_id,
        sort_order: c.sort_order
      })) || [])
    } else if (open && !meal) {
      setCourses([{ course_name: 'Entree', menu_item_id: null, backup_item_id: null, sort_order: 0 }])
    }
  }, [open])

  const addCourse = () => setCourses(c => [...c, { course_name: '', menu_item_id: null, backup_item_id: null, sort_order: c.length }])
  const removeCourse = (idx) => setCourses(c => c.filter((_, i) => i !== idx))
  const updateCourse = (idx, key, val) => setCourses(c => c.map((course, i) => i === idx ? { ...course, [key]: val } : course))

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
        className={`w-full text-left p-2 rounded-lg border transition-all min-h-[52px] ${hasItems ? 'border-brand-200 bg-brand-50 hover:bg-brand-100' : 'border-dashed border-slate-200 hover:border-brand-300 hover:bg-slate-50'}`}>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
              <div>
                <h3 className="font-display font-semibold text-slate-800 text-base">
                  {period.label} — Week {weekNum}, {DAYS[dayIdx]}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Set menu items and backup substitutions</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {courses.map((course, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <input value={course.course_name} onChange={e => updateCourse(idx, 'course_name', e.target.value)}
                      className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                      placeholder="Course name (e.g. Entree, Vegetable, Dessert)" />
                    <button onClick={() => removeCourse(idx)} className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"><X size={15} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Menu Item</label>
                      <ItemPicker items={items} value={course.menu_item_id}
                        onChange={v => updateCourse(idx, 'menu_item_id', v)} placeholder="Select item..." />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Backup / Sub</label>
                      <ItemPicker items={items} value={course.backup_item_id}
                        onChange={v => updateCourse(idx, 'backup_item_id', v)} placeholder="Select backup..." />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addCourse}
                className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors flex items-center justify-center gap-1.5">
                <Plus size={14} /> Add Course
              </button>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
                <Save size={14} />{saving ? 'Saving...' : 'Save Meal'}
              </button>
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
    const { data: day } = await supabase.from('cycle_menu_days')
      .select('id').eq('cycle_menu_id', menuId).eq('week_number', weekNum).eq('day_of_week', dayIdx).single()
    if (!day) { setCounts(null); setLoading(false); return }
    const { data: meal } = await supabase.from('cycle_menu_meals')
      .select('id').eq('cycle_menu_day_id', day.id).eq('meal_period', period).single()
    if (!meal) { setCounts(null); setLoading(false); return }
    const { data: courses } = await supabase.from('meal_courses')
      .select('*, menu_items(name), backup_items:menu_items!meal_courses_backup_item_id_fkey(name)')
      .eq('meal_id', meal.id)
    setCounts(courses || [])
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-slate-800">Cook's Count</h3>
        <select value={period} onChange={e => setPeriod(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500">
          {MEAL_PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </div>
      <p className="text-xs text-slate-400 mb-3">Week {weekNum}, {DAYS[dayIdx]}</p>
      {loading ? <div className="text-slate-400 text-sm">Loading...</div>
        : !counts || counts.length === 0 ? <div className="text-slate-400 text-sm">No menu set for this meal.</div>
        : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-semibold text-slate-500 pb-2">Course</th>
                <th className="text-left text-xs font-semibold text-slate-500 pb-2">Item</th>
                <th className="text-left text-xs font-semibold text-slate-500 pb-2">Backup</th>
              </tr>
            </thead>
            <tbody>
              {counts.map((c, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="py-2 text-xs font-medium text-slate-700">{c.course_name}</td>
                  <td className="py-2 text-xs text-slate-600">{c.menu_items?.name || '—'}</td>
                  <td className="py-2 text-xs text-slate-400 italic">{c.backup_items?.name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </div>
  )
}

// ── Cycle Menu Grid ────────────────────────────────────────────
function CycleMenuGrid({ menu, items, onBack }) {
  const [week, setWeek]     = useState(1)
  const [gridData, setGridData] = useState({})
  const [loading, setLoading]   = useState(true)
  const [showCount, setShowCount] = useState(false)
  const [countDay, setCountDay]   = useState(0)

  useEffect(() => { fetchWeekData() }, [week, menu.id])

  async function fetchWeekData() {
    setLoading(true)
    const { data: days } = await supabase.from('cycle_menu_days')
      .select(`id, day_of_week, cycle_menu_meals(id, meal_period, meal_courses(id, course_name, sort_order, menu_item_id, backup_item_id, menu_items(id,name), backup_items:menu_items!meal_courses_backup_item_id_fkey(id,name)))`)
      .eq('cycle_menu_id', menu.id).eq('week_number', week)
    const grid = {}
    days?.forEach(d => { grid[d.day_of_week] = { id: d.id, meals: d.cycle_menu_meals } })
    setGridData(grid)
    setLoading(false)
  }

  async function handleSaveMeal(weekNum, dayIdx, periodKey, courses) {
    // Get or create day
    let { data: day } = await supabase.from('cycle_menu_days')
      .select('id').eq('cycle_menu_id', menu.id).eq('week_number', weekNum).eq('day_of_week', dayIdx).single()
    if (!day) {
      const { data: newDay } = await supabase.from('cycle_menu_days')
        .insert({ cycle_menu_id: menu.id, week_number: weekNum, day_of_week: dayIdx }).select().single()
      day = newDay
    }
    // Get or create meal
    let { data: meal } = await supabase.from('cycle_menu_meals')
      .select('id').eq('cycle_menu_day_id', day.id).eq('meal_period', periodKey).single()
    if (!meal) {
      const { data: newMeal } = await supabase.from('cycle_menu_meals')
        .insert({ cycle_menu_day_id: day.id, meal_period: periodKey }).select().single()
      meal = newMeal
    }
    // Delete old courses and re-insert
    await supabase.from('meal_courses').delete().eq('meal_id', meal.id)
    const validCourses = courses.filter(c => c.course_name.trim())
    if (validCourses.length > 0) {
      await supabase.from('meal_courses').insert(
        validCourses.map((c, i) => ({
          meal_id: meal.id, course_name: c.course_name,
          menu_item_id: c.menu_item_id || null,
          backup_item_id: c.backup_item_id || null,
          sort_order: i
        }))
      )
    }
    fetchWeekData()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="font-display font-semibold text-slate-800 text-lg">{menu.name}</h2>
          <p className="text-slate-400 text-xs">{menu.cycle_length}-week rotation</p>
        </div>
        <button onClick={() => setShowCount(s => !s)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${showCount ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 text-slate-600 hover:border-brand-300'}`}>
          Cook's Count
        </button>
      </div>

      {/* Week nav */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setWeek(w => Math.max(1, w - 1))} disabled={week === 1}
          className="p-2 text-slate-400 hover:text-slate-700 disabled:opacity-30 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 flex gap-1 overflow-x-auto">
          {Array.from({ length: menu.cycle_length }, (_, i) => i + 1).map(w => (
            <button key={w} onClick={() => setWeek(w)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${week === w ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              Wk {w}
            </button>
          ))}
        </div>
        <button onClick={() => setWeek(w => Math.min(menu.cycle_length, w + 1))} disabled={week === menu.cycle_length}
          className="p-2 text-slate-400 hover:text-slate-700 disabled:opacity-30 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Cook's count panel */}
      {showCount && (
        <div className="mb-4">
          <div className="flex gap-2 mb-3">
            {DAYS.map((d, i) => (
              <button key={i} onClick={() => setCountDay(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${countDay === i ? 'bg-brand-600 text-white' : 'border border-slate-200 text-slate-600'}`}>
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
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Meal</th>
                  {DAYS.map(d => (
                    <th key={d} className="px-2 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MEAL_PERIODS.map(period => (
                  <tr key={period.key} className="border-b border-slate-50">
                    <td className="px-3 py-2">
                      <span className="text-xs font-semibold text-slate-600">{period.label}</span>
                    </td>
                    {DAYS.map((_, dayIdx) => (
                      <td key={dayIdx} className="px-1.5 py-1.5">
                        <DayMealCell
                          weekNum={week} dayIdx={dayIdx}
                          period={period} dayData={gridData[dayIdx]}
                          items={items} onSave={handleSaveMeal}
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
function CycleMenuList({ menus, onSelect, onCreate, onDelete }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{menus.length} cycle menu{menus.length !== 1 ? 's' : ''}</p>
        <button onClick={onCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={15} /> New Cycle Menu
        </button>
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
            <div key={menu.id} className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md transition-all cursor-pointer group"
              onClick={() => onSelect(menu)}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display font-semibold text-slate-800 group-hover:text-brand-700 transition-colors">{menu.name}</h3>
                  <p className="text-slate-400 text-sm mt-0.5 flex items-center gap-1.5">
                    <RefreshCw size={12} /> {menu.cycle_length}-week rotation
                  </p>
                  {menu.start_date && (
                    <p className="text-slate-400 text-xs mt-1">
                      Started {new Date(menu.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={e => { e.stopPropagation(); onDelete(menu.id) }}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-brand-600 font-medium">
                <span>Open menu builder</span>
                <ChevronRight size={13} />
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-display font-semibold text-slate-800">New Cycle Menu</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Menu Name</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. 16-Week Summer Rotation" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Cycle Length (weeks)</label>
            <input type="number" min={1} max={52} value={form.cycle_length} onChange={e => set('cycle_length', parseInt(e.target.value))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Cycle Start Date</label>
            <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <p className="text-xs text-slate-400 mt-1">Used to calculate which week of the cycle today falls on</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
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
export default function CycleMenuBuilder({ menus, items, onRefresh, orgId, userId }) {
  const [view, setView]         = useState('list') // 'list' | 'grid' | 'items'
  const [activeMenu, setActiveMenu] = useState(null)
  const [showNewMenu, setShowNewMenu] = useState(false)

  const handleSelectMenu = (menu) => { setActiveMenu(menu); setView('grid') }
  const handleBack       = () => { setActiveMenu(null); setView('list'); onRefresh() }
  const handleCreate     = () => setShowNewMenu(true)
  const handleCreated    = () => { setShowNewMenu(false); onRefresh() }
  const handleDelete     = async (id) => {
    if (!confirm('Delete this cycle menu and all its meals?')) return
    await supabase.from('cycle_menus').update({ is_active: false }).eq('id', id)
    onRefresh()
  }

  return (
    <div>
      {/* Sub-tabs */}
      {view === 'list' && (
        <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
          <button onClick={() => setView('list')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white text-brand-700 shadow-sm">
            <BookOpen size={14} /> Cycle Menus
          </button>
          <button onClick={() => setView('items')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700">
            <Package size={14} /> Menu Items
          </button>
        </div>
      )}

      {view === 'items' && (
        <div>
          <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
            <button onClick={() => setView('list')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700">
              <BookOpen size={14} /> Cycle Menus
            </button>
            <button onClick={() => setView('items')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white text-brand-700 shadow-sm">
              <Package size={14} /> Menu Items
            </button>
          </div>
          <MenuItemsCatalog items={items} onRefresh={onRefresh} orgId={orgId} />
        </div>
      )}

      {view === 'list' && (
        <CycleMenuList menus={menus} onSelect={handleSelectMenu} onCreate={handleCreate} onDelete={handleDelete} />
      )}

      {view === 'grid' && activeMenu && (
        <CycleMenuGrid menu={activeMenu} items={items} onBack={handleBack} />
      )}

      {showNewMenu && (
        <NewMenuModal onClose={() => setShowNewMenu(false)} onSave={handleCreated} orgId={orgId} userId={userId} />
      )}
    </div>
  )
}
