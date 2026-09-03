// Food waste log: what was wasted, how much, why, and an estimated dollar
// cost when it's linked to a purchasable Central Supply food item with a
// cost set. Cost is snapshotted at log time (not recomputed live) so later
// price changes don't retroactively alter historical reports.
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  Trash2, Plus, X, DollarSign, ChevronDown
} from 'lucide-react'

const CATEGORIES = [
  { key: 'over_production', label: 'Over-Production' },
  { key: 'plate_waste',     label: 'Plate Waste' },
  { key: 'spoilage',        label: 'Spoilage' },
  { key: 'expired',         label: 'Expired' },
  { key: 'other',           label: 'Other' },
]

const WASTE_UNITS = ['lb', 'oz', 'fl_oz', 'cup', 'gallon', 'each', 'tsp', 'tbsp']

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return localDateStr(d)
}

// ── Log Waste modal ─────────────────────────────────────────────
function LogWasteModal({ orgId, profileId, menuItems, supplyItems, onClose, onSaved }) {
  const today = localDateStr(new Date())
  const [category, setCategory] = useState('plate_waste')
  const [sourceType, setSourceType] = useState('menu_item') // 'menu_item' | 'supply_item' | 'other'
  const [menuItemId, setMenuItemId] = useState('')
  const [supplyItemId, setSupplyItemId] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('lb')
  const [wasteDate, setWasteDate] = useState(today)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedSupplyItem = supplyItems.find(i => i.id === supplyItemId)

  const handleSupplyItemSelect = (id) => {
    setSupplyItemId(id)
    const item = supplyItems.find(i => i.id === id)
    if (item) setUnit(item.unit)
  }

  const handleSave = async () => {
    if (!quantity || Number(quantity) <= 0) return
    setSaving(true)
    const estimated_cost = sourceType === 'supply_item' && selectedSupplyItem?.cost_per_unit != null
      ? +(Number(quantity) * selectedSupplyItem.cost_per_unit).toFixed(2)
      : null
    await supabase.from('food_waste_logs').insert({
      organization_id: orgId, logged_by: profileId, waste_date: wasteDate, category,
      menu_item_id: sourceType === 'menu_item' ? (menuItemId || null) : null,
      supply_item_id: sourceType === 'supply_item' ? (supplyItemId || null) : null,
      description: sourceType === 'other' ? (description.trim() || null) : null,
      quantity: Number(quantity), unit, estimated_cost, notes: notes.trim() || null,
    })
    setSaving(false)
    onSaved()
  }

  const inputCls = 'w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100">Log Food Waste</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => (
                <button key={c.key} onClick={() => setCategory(c.key)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${category === c.key ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-300'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">What Was Wasted</label>
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mb-2 w-fit">
              {[['menu_item', 'Menu Item'], ['supply_item', 'Purchased Item'], ['other', 'Other']].map(([key, label]) => (
                <button key={key} onClick={() => setSourceType(key)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${sourceType === key ? 'bg-white dark:bg-slate-900 text-brand-700 dark:text-brand-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                  {label}
                </button>
              ))}
            </div>
            {sourceType === 'menu_item' && (
              <select value={menuItemId} onChange={e => setMenuItemId(e.target.value)} className={inputCls}>
                <option value="">Select a menu item...</option>
                {menuItems.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            )}
            {sourceType === 'supply_item' && (
              <select value={supplyItemId} onChange={e => handleSupplyItemSelect(e.target.value)} className={inputCls}>
                <option value="">Select a purchased item...</option>
                {supplyItems.map(i => <option key={i.id} value={i.id}>{i.name}{i.cost_per_unit != null ? ` — $${Number(i.cost_per_unit).toFixed(2)}/${i.unit}` : ''}</option>)}
              </select>
            )}
            {sourceType === 'other' && (
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Unopened milk cartons, expired"
                className={inputCls} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Quantity</label>
              <div className="flex gap-2">
                <input type="number" min="0" step="0.1" value={quantity} onChange={e => setQuantity(e.target.value)}
                  className="w-20 px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="0" />
                <select value={unit} onChange={e => setUnit(e.target.value)} disabled={sourceType === 'supply_item'}
                  className="flex-1 px-2 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60">
                  {WASTE_UNITS.map(u => <option key={u} value={u}>{u.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Date</label>
              <input type="date" value={wasteDate} onChange={e => setWasteDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          {sourceType === 'supply_item' && selectedSupplyItem?.cost_per_unit != null && quantity && (
            <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 rounded-lg text-xs text-amber-700 dark:text-amber-400">
              Estimated cost: ${(Number(quantity) * selectedSupplyItem.cost_per_unit).toFixed(2)}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className={inputCls + ' resize-none'} placeholder="Anything else worth noting" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving || !quantity || Number(quantity) <= 0}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving...' : 'Log Waste'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FoodWaste({ orgId, menuItems, canManage }) {
  const { profile } = useAuth()
  const today = localDateStr(new Date())
  const [logs, setLogs] = useState([])
  const [supplyItems, setSupplyItems] = useState([])
  const [profileNames, setProfileNames] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [showLogModal, setShowLogModal] = useState(false)
  const [dateFrom, setDateFrom] = useState(addDays(today, -30))
  const [dateTo, setDateTo] = useState(today)
  const [categoryFilter, setCategoryFilter] = useState('all')

  useEffect(() => { if (orgId) fetchAll() }, [orgId, dateFrom, dateTo])

  async function fetchAll() {
    setLoading(true)
    const [logsRes, itemsRes] = await Promise.all([
      supabase.from('food_waste_logs').select('*')
        .eq('organization_id', orgId).gte('waste_date', dateFrom).lte('waste_date', dateTo)
        .order('waste_date', { ascending: false }),
      supabase.from('supply_items').select('*').eq('organization_id', orgId).eq('is_active', true).eq('category', 'Food').order('name'),
    ])
    const logData = logsRes.data || []
    setLogs(logData)
    setSupplyItems(itemsRes.data || [])

    const loggerIds = [...new Set(logData.map(l => l.logged_by).filter(Boolean))]
    if (loggerIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name').in('id', loggerIds)
      setProfileNames(new Map((profiles || []).map(p => [p.id, `${p.first_name} ${p.last_name}`])))
    } else {
      setProfileNames(new Map())
    }
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this waste log entry?')) return
    await supabase.from('food_waste_logs').delete().eq('id', id)
    setLogs(l => l.filter(x => x.id !== id))
  }

  const itemName = (log) => {
    if (log.menu_item_id) return menuItems.find(m => m.id === log.menu_item_id)?.name || 'Menu item'
    if (log.supply_item_id) return supplyItems.find(i => i.id === log.supply_item_id)?.name || 'Purchased item'
    return log.description || 'Unspecified'
  }

  const filtered = categoryFilter === 'all' ? logs : logs.filter(l => l.category === categoryFilter)
  const totalCost = filtered.reduce((s, l) => s + (l.estimated_cost || 0), 0)
  const hasCostData = filtered.some(l => l.estimated_cost != null)

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Trash2 size={17} className="text-brand-600" />
            <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100">Food Waste Log</h3>
          </div>
          {canManage && (
            <button onClick={() => setShowLogModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
              <Plus size={15} /> Log Waste
            </button>
          )}
        </div>

        <div className="flex items-end gap-3 mb-4 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <div className="text-2xl font-display font-bold text-slate-800 dark:text-slate-100">{filtered.length}</div>
            <div className="text-xs text-slate-400">Waste Events</div>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <div className="text-2xl font-display font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
              <DollarSign size={18} className="text-slate-400" />{totalCost.toFixed(2)}
            </div>
            <div className="text-xs text-slate-400">{hasCostData ? 'Estimated Cost' : 'Estimated Cost (no priced items logged)'}</div>
          </div>
        </div>

        {loading ? (
          <div className="text-slate-400 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-slate-400 text-sm py-6 text-center">No waste logged in this range.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(log => (
              <div key={log.id} className="flex items-start justify-between gap-3 p-3 border border-slate-100 dark:border-slate-800 rounded-xl">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{itemName(log)}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {CATEGORIES.find(c => c.key === log.category)?.label || log.category}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {log.quantity} {log.unit.replace('_', ' ')} · {new Date(log.waste_date + 'T12:00:00').toLocaleDateString()}
                    {log.logged_by && ` · ${profileNames.get(log.logged_by) || 'Staff'}`}
                    {log.estimated_cost != null && ` · $${Number(log.estimated_cost).toFixed(2)}`}
                  </div>
                  {log.notes && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">{log.notes}</div>}
                </div>
                {canManage && (
                  <button onClick={() => handleDelete(log.id)} className="text-slate-400 hover:text-red-500 flex-shrink-0"><X size={14} /></button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showLogModal && (
        <LogWasteModal orgId={orgId} profileId={profile?.id} menuItems={menuItems} supplyItems={supplyItems}
          onClose={() => setShowLogModal(false)}
          onSaved={() => { setShowLogModal(false); fetchAll() }} />
      )}
    </div>
  )
}
