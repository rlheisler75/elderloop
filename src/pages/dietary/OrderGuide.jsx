// Forecasts how much of each food item to buy from a vendor, from the cycle
// menu + resident counts — "next week we're serving Roast Beef and 20
// residents have it, so we need 20 x 3oz servings" — using the same
// resolveMealItem engine as Cook's Count so it never drifts from what
// residents actually receive. Vendor items and purchase orders live in the
// existing Central Supply tables (supply_vendors / supply_items /
// supply_purchase_orders) rather than a parallel dietary-only system, so an
// order placed here shows up alongside every other department's POs.
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { calcCycleDay, fetchMealCourses, resolveMealItem } from './mealResolution'
import {
  ClipboardList, Plus, X, Edit2, Trash2, Truck, Calculator,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react'

const ALL_PERIODS = ['breakfast', 'am_snack', 'lunch', 'pm_snack', 'dinner']
const FOOD_CATEGORY = 'Food'
const PACK_UNITS = ['each', 'box', 'case', 'pack', 'pair', 'bag', 'roll', 'carton', 'bottle', 'gallon', 'lb', 'oz', 'fl_oz', 'cup']

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return localDateStr(d)
}
function enumerateDates(start, end) {
  const dates = []
  let cur = start
  let guard = 0
  while (cur <= end && guard < 62) { dates.push(cur); cur = addDays(cur, 1); guard++ }
  return dates
}

// Converts a quantity between units in the same measurement family (e.g. oz
// -> lb) so a raw quantity computed in a menu item's portion unit can be
// expressed in a food item's purchase unit. Returns null when the two units
// aren't in the same family (e.g. oz -> case) — there is no safe conversion,
// so the caller must not silently order a wrong quantity.
const UNIT_FAMILY = { oz: 'weight', lb: 'weight', fl_oz: 'volume', cup: 'volume', gallon: 'volume' }
const UNIT_TO_BASE = { oz: 1, lb: 16, fl_oz: 1, cup: 8, gallon: 128 }
function convertUnit(qty, fromUnit, toUnit) {
  if (fromUnit === toUnit) return qty
  const family1 = UNIT_FAMILY[fromUnit], family2 = UNIT_FAMILY[toUnit]
  if (!family1 || !family2 || family1 !== family2) return null
  return qty * UNIT_TO_BASE[fromUnit] / UNIT_TO_BASE[toUnit]
}

// ── Food Item form (Central Supply supply_items, category=Food) ──────────
function ItemForm({ item, vendors, menuItems, orgId, onClose, onSaved, onAddVendor }) {
  const isNew = !item
  const [form, setForm] = useState({
    name: item?.name || '',
    preferred_vendor_id: item?.preferred_vendor_id || '',
    sku: item?.sku || '',
    unit: item?.unit || 'case',
    cost_per_unit: item?.cost_per_unit ?? '',
    quantity_on_hand: item?.quantity_on_hand ?? 0,
    par_level: item?.par_level ?? '',
    menu_item_id: item?.menu_item_id || '',
  })
  const [newVendorName, setNewVendorName] = useState('')
  const [addingVendor, setAddingVendor] = useState(false)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const inputCls = 'w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

  const handleAddVendor = async () => {
    if (!newVendorName.trim()) return
    setAddingVendor(true)
    const { data } = await supabase.from('supply_vendors')
      .insert({ organization_id: orgId, name: newVendorName.trim(), is_active: true })
      .select().single()
    setAddingVendor(false)
    setNewVendorName('')
    if (data) { onAddVendor(data); set('preferred_vendor_id', data.id) }
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      organization_id: orgId, name: form.name.trim(), category: FOOD_CATEGORY,
      sku: form.sku || null, unit: form.unit,
      cost_per_unit: form.cost_per_unit !== '' ? Number(form.cost_per_unit) : null,
      quantity_on_hand: Number(form.quantity_on_hand) || 0,
      par_level: form.par_level !== '' ? Number(form.par_level) : null,
      preferred_vendor_id: form.preferred_vendor_id || null,
      menu_item_id: form.menu_item_id || null,
      is_active: true,
    }
    if (item) await supabase.from('supply_items').update(payload).eq('id', item.id)
    else await supabase.from('supply_items').insert(payload)
    setSaving(false)
    onSaved()
  }

  return (
    <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
      <h4 className="font-medium text-slate-800 dark:text-slate-100 text-sm">{isNew ? 'New Food Item' : 'Edit Food Item'}</h4>
      <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="Item name (e.g. Roast Beef, 10lb case)" />

      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Vendor</label>
        <div className="flex gap-2">
          <select value={form.preferred_vendor_id} onChange={e => set('preferred_vendor_id', e.target.value)} className={inputCls}>
            <option value="">No vendor set</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2 mt-1.5">
          <input value={newVendorName} onChange={e => setNewVendorName(e.target.value)} placeholder="+ quick-add a new vendor"
            className="flex-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <button onClick={handleAddVendor} disabled={addingVendor || !newVendorName.trim()}
            className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg disabled:opacity-50">Add</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Vendor Item Code / SKU</label>
          <input value={form.sku} onChange={e => set('sku', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Pack / Purchase Unit</label>
          <select value={form.unit} onChange={e => set('unit', e.target.value)} className={inputCls}>
            {PACK_UNITS.map(u => <option key={u} value={u}>{u.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Cost / Unit</label>
          <input type="number" min="0" step="0.01" value={form.cost_per_unit} onChange={e => set('cost_per_unit', e.target.value)} className={inputCls} placeholder="$" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">On Hand</label>
          <input type="number" min="0" step="1" value={form.quantity_on_hand} onChange={e => set('quantity_on_hand', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Par Level</label>
          <input type="number" min="0" step="1" value={form.par_level} onChange={e => set('par_level', e.target.value)} className={inputCls} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Used To Prepare (Menu Item)</label>
        <select value={form.menu_item_id} onChange={e => set('menu_item_id', e.target.value)} className={inputCls}>
          <option value="">Not linked — won't appear in demand forecasts</option>
          {menuItems.map(mi => (
            <option key={mi.id} value={mi.id}>
              {mi.name}{mi.portion_qty && mi.portion_unit ? ` (${mi.portion_qty} ${mi.portion_unit.replace('_', ' ')}/serving)` : ' — no portion size set'}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-400 mt-1">Links this vendor item to the menu item it's used for, so the Order Guide can forecast how much you'll need from the cycle menu.</p>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onClose} className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 font-medium">Cancel</button>
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-1.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:bg-brand-300 transition-colors">
          {saving ? 'Saving...' : 'Save Item'}
        </button>
      </div>
    </div>
  )
}

export default function OrderGuide({ orgId, residents, menus, menuItems, canManage }) {
  const { profile, hasModule } = useAuth()
  const today = localDateStr(new Date())
  const [vendors, setVendors]   = useState([])
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [showItems, setShowItems] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)

  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate]     = useState(addDays(today, 6))
  const [vendorFilter, setVendorFilter] = useState('all')
  const [demand, setDemand]       = useState(null)
  const [calculating, setCalculating] = useState(false)
  const [poBusy, setPoBusy]       = useState(null) // vendor id currently creating a PO
  const [poResults, setPoResults] = useState({})   // vendor id -> po_number

  useEffect(() => { if (orgId) fetchAll() }, [orgId])

  async function fetchAll() {
    setLoading(true)
    const [vRes, iRes] = await Promise.all([
      supabase.from('supply_vendors').select('*').eq('organization_id', orgId).eq('is_active', true).order('name'),
      supabase.from('supply_items').select('*').eq('organization_id', orgId).eq('is_active', true).eq('category', FOOD_CATEGORY).order('name'),
    ])
    setVendors(vRes.data || [])
    setItems(iRes.data || [])
    setLoading(false)
  }

  const handleDeleteItem = async (id) => {
    if (!confirm('Remove this food item?')) return
    await supabase.from('supply_items').update({ is_active: false }).eq('id', id)
    fetchAll()
  }

  async function calculateDemand() {
    setCalculating(true)
    setPoResults({})
    const dates = enumerateDates(startDate, endDate)

    const menuGroups = new Map()
    residents.forEach(r => {
      const menu = menus?.find(m => m.id === r.cycle_menu_id) || menus?.find(m => m.is_current) || null
      if (!menu) return
      if (!menuGroups.has(menu.id)) menuGroups.set(menu.id, { menu, group: [] })
      menuGroups.get(menu.id).group.push(r)
    })

    const tasks = []
    for (const dateStr of dates) {
      for (const period of ALL_PERIODS) {
        for (const { menu, group } of menuGroups.values()) {
          const pos = calcCycleDay(menu, dateStr)
          if (!pos) continue
          tasks.push(fetchMealCourses(menu.id, pos.cycleWeek, pos.dayOfWeek, period).then(courses => ({ courses, group })))
        }
      }
    }
    const results = await Promise.all(tasks)

    const tally = new Map()
    results.forEach(({ courses, group }) => {
      if (!courses.length) return
      group.forEach(resident => {
        courses.forEach(course => {
          const { servedItem } = resolveMealItem(course.menu_items, course.alternates, resident)
          if (!servedItem?.id) return
          tally.set(servedItem.id, (tally.get(servedItem.id) || 0) + 1)
        })
      })
    })
    setDemand(tally)
    setCalculating(false)
  }

  const demandRows = (demand ? items.filter(it => it.menu_item_id) : [])
    .filter(it => vendorFilter === 'all' || it.preferred_vendor_id === vendorFilter)
    .map(it => {
      const mi = menuItems.find(m => m.id === it.menu_item_id)
      const servings = demand.get(it.menu_item_id) || 0
      const rawQty = mi?.portion_qty ? +(servings * mi.portion_qty).toFixed(2) : null
      return { item: it, menuItem: mi, servings, rawQty }
    })
    .sort((a, b) => b.servings - a.servings)

  const byVendor = new Map()
  demandRows.forEach(row => {
    const key = row.item.preferred_vendor_id || 'none'
    if (!byVendor.has(key)) byVendor.set(key, [])
    byVendor.get(key).push(row)
  })

  async function handleCreatePO(vendorId) {
    const rows = (byVendor.get(vendorId) || []).filter(r => r.servings > 0)
    if (!rows.length) return
    setPoBusy(vendorId)
    const { count } = await supabase.from('supply_purchase_orders').select('*', { count: 'exact', head: true }).eq('organization_id', orgId)
    const poNumber = `PO-${1000 + (count || 0) + 1}`
    const { data: po, error } = await supabase.from('supply_purchase_orders').insert({
      organization_id: orgId, po_number: poNumber, po_type: 'stock', status: 'draft',
      vendor_id: vendorId, ordered_by: profile.id, ordered_date: today,
      notes: `Auto-generated from Dietary Order Guide, ${startDate} to ${endDate}`,
    }).select().single()
    if (error) { setPoBusy(null); return }
    await supabase.from('supply_po_line_items').insert(rows.map((r, idx) => {
      // Only auto-fill a real quantity when the raw need converts cleanly into
      // this item's purchase unit (e.g. oz -> lb). Different measurement
      // families (e.g. oz needed vs. a "case" purchase unit) have no safe
      // conversion — guessing one risks a wildly wrong order quantity, so
      // fall back to a flagged placeholder instead.
      const converted = r.rawQty != null ? convertUnit(r.rawQty, r.menuItem.portion_unit, r.item.unit) : null
      const quantity_ordered = converted != null ? Math.ceil(converted) : 1
      const description = converted != null
        ? r.item.name
        : `${r.item.name} — VERIFY QTY (needed: ${r.servings} servings${r.rawQty != null ? `, ~${r.rawQty} ${r.menuItem.portion_unit.replace('_', ' ')}` : ''})`
      return {
        po_id: po.id, organization_id: orgId, supply_item_id: r.item.id, description,
        unit: r.item.unit, quantity_ordered,
        quantity_received: 0, unit_cost: r.item.cost_per_unit || 0, is_received: false,
        add_to_inventory: false, sort_order: idx,
      }
    }))
    setPoResults(p => ({ ...p, [vendorId]: poNumber }))
    setPoBusy(null)
  }

  const vendorName = (id) => id === 'none' ? 'No vendor set' : vendors.find(v => v.id === id)?.name || 'Unknown vendor'

  return (
    <div className="space-y-5">
      {/* Food Items catalog */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
        <button onClick={() => setShowItems(s => !s)} className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck size={17} className="text-brand-600" />
            <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100">Food Items & Vendors</h3>
            <span className="text-xs text-slate-400">({items.length})</span>
          </div>
          {showItems ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {showItems && (
          <div className="mt-4">
            {canManage && (
              <div className="flex justify-end mb-3">
                <button onClick={() => { setEditItem(null); setShowForm(true) }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-medium transition-colors">
                  <Plus size={14} /> Add Food Item
                </button>
              </div>
            )}
            {showForm && canManage && (
              <ItemForm item={editItem} vendors={vendors} menuItems={menuItems} orgId={orgId}
                onClose={() => setShowForm(false)}
                onAddVendor={(v) => setVendors(vs => [...vs, v].sort((a, b) => a.name.localeCompare(b.name)))}
                onSaved={() => { setShowForm(false); fetchAll() }} />
            )}
            {loading ? (
              <div className="text-slate-400 text-sm">Loading...</div>
            ) : items.length === 0 ? (
              <div className="text-slate-400 text-sm py-4 text-center">No food items yet — add one and link it to a menu item to start forecasting.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map(it => (
                  <div key={it.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-800 dark:text-slate-100 text-sm truncate">{it.name}</div>
                      <div className="text-xs text-slate-400">
                        {vendors.find(v => v.id === it.preferred_vendor_id)?.name || 'No vendor'} · {it.unit.replace('_', ' ')}
                        {it.cost_per_unit != null && ` · $${Number(it.cost_per_unit).toFixed(2)}`}
                      </div>
                      <div className="text-xs mt-0.5">
                        {it.menu_item_id
                          ? <span className="text-emerald-600 dark:text-emerald-400">→ {menuItems.find(m => m.id === it.menu_item_id)?.name || 'linked menu item'}</span>
                          : <span className="text-amber-600 dark:text-amber-400">⚠ Not linked to a menu item</span>}
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => { setEditItem(it); setShowForm(true) }} className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 dark:hover:bg-slate-800"><Edit2 size={13} /></button>
                        <button onClick={() => handleDeleteItem(it.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-slate-800"><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Demand calculator */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calculator size={17} className="text-brand-600" />
          <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100">Order Guide</h3>
        </div>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Vendor</label>
            <select value={vendorFilter} onChange={e => setVendorFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="all">All Vendors</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <button onClick={calculateDemand} disabled={calculating || startDate > endDate}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            <Calculator size={15} /> {calculating ? 'Calculating...' : 'Calculate Demand'}
          </button>
        </div>

        {!demand ? (
          <div className="text-slate-400 text-sm py-6 text-center">Pick a date range and click Calculate Demand to see what you'll need to order.</div>
        ) : demandRows.length === 0 ? (
          <div className="text-slate-400 text-sm py-6 text-center">
            No food items are linked to a menu item{vendorFilter !== 'all' && ' for this vendor'} yet — link one above to forecast demand.
          </div>
        ) : (
          <div className="space-y-5">
            {Array.from(byVendor.entries()).map(([vendorId, rows]) => (
              <div key={vendorId}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{vendorName(vendorId)}</h4>
                  {vendorId !== 'none' && canManage && rows.some(r => r.servings > 0) && (
                    poResults[vendorId] ? (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 size={13} /> Created {poResults[vendorId]}
                        {!hasModule('central_supply') && ' — enable Central Supply (Admin Panel) to view/manage it'}
                      </span>
                    ) : (
                      <button onClick={() => handleCreatePO(vendorId)} disabled={poBusy === vendorId}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-xs font-medium rounded-lg disabled:opacity-60 transition-colors">
                        <ClipboardList size={13} /> {poBusy === vendorId ? 'Creating...' : 'Create Purchase Order'}
                      </button>
                    )
                  )}
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className="text-left text-xs font-semibold text-slate-500 pb-2">Item</th>
                      <th className="text-right text-xs font-semibold text-slate-500 pb-2">Servings Needed</th>
                      <th className="text-right text-xs font-semibold text-slate-500 pb-2">Raw Qty Needed</th>
                      <th className="text-right text-xs font-semibold text-slate-500 pb-2">On Hand</th>
                      <th className="text-right text-xs font-semibold text-slate-500 pb-2">Par</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ item, menuItem, servings, rawQty }) => (
                      <tr key={item.id} className="border-b border-slate-50 dark:border-slate-800">
                        <td className="py-2 text-xs">
                          <div className="text-slate-700 dark:text-slate-300 font-medium">{item.name}</div>
                          <div className="text-slate-400">for {menuItem?.name || '—'}</div>
                        </td>
                        <td className="py-2 text-xs text-right text-slate-700 dark:text-slate-300 font-semibold">{servings}</td>
                        <td className="py-2 text-xs text-right">
                          {rawQty != null
                            ? <span className="text-slate-700 dark:text-slate-300">{rawQty} {menuItem.portion_unit.replace('_', ' ')}</span>
                            : <span className="text-amber-600 dark:text-amber-400 flex items-center justify-end gap-1"><AlertTriangle size={11} /> set portion size</span>}
                        </td>
                        <td className="py-2 text-xs text-right text-slate-500">{item.quantity_on_hand} {item.unit.replace('_', ' ')}</td>
                        <td className="py-2 text-xs text-right text-slate-500">{item.par_level ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
