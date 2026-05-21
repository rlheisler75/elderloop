import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, Search, X, Edit2, Trash2, Package,
  AlertTriangle, CheckCircle2, XCircle, ChevronDown,
  QrCode, MapPin, Tag, DollarSign, BarChart2,
  Truck, Eye, EyeOff, Filter, ScanLine
} from 'lucide-react'

// ── Constants ──────────────────────────────────────────────────
const UNITS = ['each','box','case','pack','pair','bag','roll','carton','bottle','gallon','lb','oz']

const DEFAULT_CATEGORIES = [
  'Incontinence','Wound Care','Personal Care','Nursing / Medical',
  'Housekeeping','Dietary','Maintenance','Office / Admin','General',
]

const DEPARTMENTS = [
  'Nursing','Housekeeping','Dietary','Maintenance','Administration','Activities','Transportation',
]

// ── Stock status helpers ───────────────────────────────────────
function stockStatus(item) {
  const qty = Number(item.quantity_on_hand)
  const reorder = Number(item.reorder_point)
  const par = Number(item.par_level)
  if (qty <= 0)              return 'out'
  if (reorder > 0 && qty <= reorder) return 'critical'
  if (par > 0 && qty < par) return 'low'
  return 'ok'
}

const STATUS_CONFIG = {
  ok:       { label: 'In Stock',  color: 'bg-green-100 text-green-700',  icon: CheckCircle2,  dot: 'bg-green-500'  },
  low:      { label: 'Low',       color: 'bg-amber-100 text-amber-700',  icon: AlertTriangle, dot: 'bg-amber-500'  },
  critical: { label: 'Critical',  color: 'bg-red-100 text-red-700',      icon: AlertTriangle, dot: 'bg-red-500'    },
  out:      { label: 'Out',       color: 'bg-slate-100 text-slate-500',  icon: XCircle,       dot: 'bg-slate-400'  },
}

const fmt$ = (v) => v != null && v !== '' ? `$${Number(v).toFixed(2)}` : '—'

// ── Item Modal ─────────────────────────────────────────────────
function ItemModal({ item, vendors, orgId, profileId, onClose, onSaved }) {
  const isNew = !item
  const [tab, setTab] = useState('details')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const [form, setForm] = useState({
    name:                  item?.name                  || '',
    description:           item?.description           || '',
    category:              item?.category              || 'General',
    barcode:               item?.barcode               || '',
    sku:                   item?.sku                   || '',
    location:              item?.location              || '',
    notes:                 item?.notes                 || '',
    unit:                  item?.unit                  || 'each',
    quantity_on_hand:      item?.quantity_on_hand      ?? 0,
    par_level:             item?.par_level             ?? 0,
    reorder_point:         item?.reorder_point         ?? 0,
    reorder_quantity:      item?.reorder_quantity      ?? 0,
    cost_per_unit:         item?.cost_per_unit         ?? '',
    sale_price:            item?.sale_price            ?? '',
    is_resident_chargeable:item?.is_resident_chargeable ?? false,
    is_active:             item?.is_active             ?? true,
    preferred_vendor_id:   item?.preferred_vendor_id   || '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Item name is required'); setTab('details'); return }
    if (!form.category.trim()) { setError('Category is required'); setTab('details'); return }
    setSaving(true)
    setError('')

    const payload = {
      ...form,
      organization_id:    orgId,
      quantity_on_hand:   Number(form.quantity_on_hand) || 0,
      par_level:          Number(form.par_level)        || 0,
      reorder_point:      Number(form.reorder_point)    || 0,
      reorder_quantity:   Number(form.reorder_quantity) || 0,
      cost_per_unit:      form.cost_per_unit !== '' ? Number(form.cost_per_unit) : null,
      sale_price:         form.sale_price    !== '' ? Number(form.sale_price)    : null,
      preferred_vendor_id:form.preferred_vendor_id || null,
      updated_at:         new Date().toISOString(),
    }

    const { error: err } = item?.id
      ? await supabase.from('supply_items').update(payload).eq('id', item.id)
      : await supabase.from('supply_items').insert(payload)

    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  const handleDelete = async () => {
    if (!confirm(`Remove "${item.name}" from the catalog? This cannot be undone.`)) return
    await supabase.from('supply_items').delete().eq('id', item.id)
    onSaved()
  }

  const MODAL_TABS = [
    { key: 'details',  label: 'Details' },
    { key: 'stock',    label: 'Stock & Pricing' },
    { key: 'vendor',   label: 'Vendor' },
  ]

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
  const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-display font-semibold text-slate-800">
              {isNew ? 'Add Supply Item' : 'Edit Item'}
            </h2>
            {!isNew && (
              <p className="text-xs text-slate-400 mt-0.5">{item.name}</p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-slate-100 px-6 flex-shrink-0">
          {MODAL_TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${
                tab === t.key
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* ── DETAILS TAB ── */}
          {tab === 'details' && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Item Name *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)}
                  className={inputCls} placeholder="e.g. Adult Brief Large" autoFocus />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Category *</label>
                  <input list="category-list" value={form.category}
                    onChange={e => set('category', e.target.value)}
                    className={inputCls} placeholder="Select or type..." />
                  <datalist id="category-list">
                    {DEFAULT_CATEGORIES.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className={labelCls}>Location</label>
                  <input value={form.location} onChange={e => set('location', e.target.value)}
                    className={inputCls} placeholder="e.g. Shelf A3" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Barcode / UPC</label>
                  <input value={form.barcode} onChange={e => set('barcode', e.target.value)}
                    className={inputCls} placeholder="Scan or type" />
                </div>
                <div>
                  <label className={labelCls}>SKU / Item #</label>
                  <input value={form.sku} onChange={e => set('sku', e.target.value)}
                    className={inputCls} placeholder="Internal code" />
                </div>
              </div>

              <div>
                <label className={labelCls}>Description</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  rows={2} className={inputCls + ' resize-none'}
                  placeholder="Optional details about this item" />
              </div>

              <div>
                <label className={labelCls}>Notes</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                  rows={2} className={inputCls + ' resize-none'}
                  placeholder="Internal notes, handling instructions, etc." />
              </div>

              {/* Flags */}
              <div className="space-y-2 pt-1">
                {[
                  { key: 'is_resident_chargeable', label: 'Resident-chargeable', desc: 'Can be charged to a resident account' },
                  { key: 'is_active',              label: 'Active',              desc: 'Show in catalog and allow transactions' },
                ].map(flag => (
                  <div key={flag.key}
                    onClick={() => set(flag.key, !form[flag.key])}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      form[flag.key] ? 'bg-brand-50 border-brand-200' : 'bg-slate-50 border-slate-200'
                    }`}>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      form[flag.key] ? 'bg-brand-600 border-brand-600' : 'border-slate-300 bg-white'
                    }`}>
                      {form[flag.key] && <X size={10} className="text-white rotate-45" style={{ transform: 'rotate(0deg)' }} />}
                      {form[flag.key] && <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-700">{flag.label}</div>
                      <div className="text-xs text-slate-400">{flag.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STOCK & PRICING TAB ── */}
          {tab === 'stock' && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Unit of Measure</label>
                <select value={form.unit} onChange={e => set('unit', e.target.value)} className={inputCls}>
                  {UNITS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Qty On Hand</label>
                  <input type="number" min="0" step="0.01"
                    value={form.quantity_on_hand} onChange={e => set('quantity_on_hand', e.target.value)}
                    className={inputCls} />
                  <p className="text-xs text-slate-400 mt-1">Set initial stock level here. Transactions will update it going forward.</p>
                </div>
                <div>
                  <label className={labelCls}>Par Level</label>
                  <input type="number" min="0" step="0.01"
                    value={form.par_level} onChange={e => set('par_level', e.target.value)}
                    className={inputCls} placeholder="Desired minimum" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Reorder Point</label>
                  <input type="number" min="0" step="0.01"
                    value={form.reorder_point} onChange={e => set('reorder_point', e.target.value)}
                    className={inputCls} placeholder="Triggers alert" />
                </div>
                <div>
                  <label className={labelCls}>Reorder Qty</label>
                  <input type="number" min="0" step="0.01"
                    value={form.reorder_quantity} onChange={e => set('reorder_quantity', e.target.value)}
                    className={inputCls} placeholder="Suggested order qty" />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 leading-relaxed">
                  <span className="font-semibold text-slate-600">Par level</span> is the desired minimum stock.
                  Items below par show as <span className="font-semibold text-amber-600">Low</span>.
                  Items at or below the <span className="font-semibold text-slate-600">reorder point</span> show as <span className="font-semibold text-red-600">Critical</span>.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className={labelCls}>Pricing</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5">Cost Per Unit ($)</label>
                    <input type="number" min="0" step="0.01"
                      value={form.cost_per_unit} onChange={e => set('cost_per_unit', e.target.value)}
                      className={inputCls} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5">Cash Sale Price ($)</label>
                    <input type="number" min="0" step="0.01"
                      value={form.sale_price} onChange={e => set('sale_price', e.target.value)}
                      className={inputCls} placeholder="0.00" />
                    <p className="text-xs text-slate-400 mt-1">Used for employee cash sales.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── VENDOR TAB ── */}
          {tab === 'vendor' && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Preferred Vendor</label>
                {vendors.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-sm text-slate-400">
                    No vendors set up yet. Add vendors in the Vendors tab.
                  </div>
                ) : (
                  <select value={form.preferred_vendor_id} onChange={e => set('preferred_vendor_id', e.target.value)}
                    className={inputCls}>
                    <option value="">— No preferred vendor —</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}{v.account_number ? ` (Acct: ${v.account_number})` : ''}</option>
                    ))}
                  </select>
                )}
              </div>

              {form.preferred_vendor_id && (() => {
                const v = vendors.find(vv => vv.id === form.preferred_vendor_id)
                if (!v) return null
                return (
                  <div className="p-4 bg-brand-50 rounded-xl border border-brand-100 space-y-1.5 text-sm">
                    {v.contact_name && <div className="flex gap-2"><span className="text-slate-400 w-28 flex-shrink-0">Contact</span><span className="text-slate-700">{v.contact_name}</span></div>}
                    {v.phone        && <div className="flex gap-2"><span className="text-slate-400 w-28 flex-shrink-0">Phone</span><span className="text-slate-700">{v.phone}</span></div>}
                    {v.email        && <div className="flex gap-2"><span className="text-slate-400 w-28 flex-shrink-0">Email</span><span className="text-slate-700">{v.email}</span></div>}
                    {v.lead_time_days && <div className="flex gap-2"><span className="text-slate-400 w-28 flex-shrink-0">Lead time</span><span className="text-slate-700">{v.lead_time_days} day{v.lead_time_days !== 1 ? 's' : ''}</span></div>}
                  </div>
                )
              })()}

              <div className="pt-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500">
                  The preferred vendor will be pre-selected when creating stock purchase orders for this item.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>
            {!isNew && (
              <button onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-sm transition-colors">
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
              {saving ? 'Saving...' : isNew ? 'Add Item' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Item Row ───────────────────────────────────────────────────
function ItemRow({ item, onEdit }) {
  const status = stockStatus(item)
  const cfg    = STATUS_CONFIG[status]
  const StatusIcon = cfg.icon
  const qty    = Number(item.quantity_on_hand)
  const par    = Number(item.par_level)

  return (
    <tr
      onClick={() => onEdit(item)}
      className="hover:bg-slate-50 cursor-pointer transition-colors group border-b border-slate-100 last:border-0">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
          <div>
            <div className="text-sm font-medium text-slate-800 leading-tight">{item.name}</div>
            {item.location && (
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                <MapPin size={10} />
                {item.location}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
          {item.category}
        </span>
      </td>
      <td className="px-4 py-3">
        {item.barcode
          ? <span className="flex items-center gap-1 text-xs text-slate-500 font-mono"><QrCode size={11} />{item.barcode}</span>
          : <span className="text-xs text-slate-300">—</span>
        }
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${
            status === 'out'      ? 'text-slate-400' :
            status === 'critical' ? 'text-red-600'   :
            status === 'low'      ? 'text-amber-600'  :
            'text-slate-800'
          }`}>
            {qty % 1 === 0 ? qty : qty.toFixed(1)}
          </span>
          <span className="text-xs text-slate-400">{item.unit}</span>
          {par > 0 && (
            <span className="text-xs text-slate-300">/ {par % 1 === 0 ? par : par.toFixed(1)} par</span>
          )}
        </div>
        {/* Stock bar */}
        {par > 0 && (
          <div className="w-20 h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                status === 'out'      ? 'bg-slate-300'  :
                status === 'critical' ? 'bg-red-400'    :
                status === 'low'      ? 'bg-amber-400'  :
                'bg-green-400'
              }`}
              style={{ width: `${Math.min(100, (qty / par) * 100)}%` }}
            />
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">{fmt$(item.cost_per_unit)}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
          <StatusIcon size={10} />
          {cfg.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {item.is_resident_chargeable && (
            <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">Chargeable</span>
          )}
          <button onClick={e => { e.stopPropagation(); onEdit(item) }}
            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
            <Edit2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── Main Inventory Page ────────────────────────────────────────
export default function SupplyInventory() {
  const { organization, profile } = useAuth()
  const [items,    setItems]    = useState([])
  const [vendors,  setVendors]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [catFilter,setCatFilter]= useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showInactive, setShowInactive] = useState(false)
  const [selected, setSelected] = useState(null)   // item being edited
  const [showModal,setShowModal]= useState(false)

  useEffect(() => { if (organization) fetchAll() }, [organization])

  async function fetchAll() {
    setLoading(true)
    const [itemsRes, vendorsRes] = await Promise.all([
      supabase.from('supply_items')
        .select('*, supply_vendors(id, name, account_number, contact_name, phone, email, lead_time_days)')
        .eq('organization_id', organization.id)
        .order('category')
        .order('name'),
      supabase.from('supply_vendors')
        .select('id, name, account_number, contact_name, phone, email, lead_time_days')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('name'),
    ])
    setItems(itemsRes.data || [])
    setVendors(vendorsRes.data || [])
    setLoading(false)
  }

  const handleSaved = () => {
    setShowModal(false)
    setSelected(null)
    fetchAll()
  }

  const handleNew  = () => { setSelected(null); setShowModal(true) }
  const handleEdit = (item) => { setSelected(item); setShowModal(true) }

  // Derived categories from actual items
  const categories = ['all', ...Array.from(new Set(items.map(i => i.category))).sort()]

  // Status counts for filter bar
  const counts = {
    all:      items.filter(i => showInactive || i.is_active).length,
    ok:       items.filter(i => i.is_active && stockStatus(i) === 'ok').length,
    low:      items.filter(i => i.is_active && stockStatus(i) === 'low').length,
    critical: items.filter(i => i.is_active && (stockStatus(i) === 'critical' || stockStatus(i) === 'out')).length,
  }

  // Filtered items
  const filtered = items.filter(item => {
    if (!showInactive && !item.is_active) return false
    if (catFilter !== 'all' && item.category !== catFilter) return false
    if (statusFilter === 'ok'       && stockStatus(item) !== 'ok') return false
    if (statusFilter === 'low'      && stockStatus(item) !== 'low') return false
    if (statusFilter === 'critical' && !['critical','out'].includes(stockStatus(item))) return false
    if (search) {
      const q = search.toLowerCase()
      return item.name.toLowerCase().includes(q)
          || item.category?.toLowerCase().includes(q)
          || item.barcode?.toLowerCase().includes(q)
          || item.sku?.toLowerCase().includes(q)
          || item.location?.toLowerCase().includes(q)
    }
    return true
  })

  const totalValue = items
    .filter(i => i.is_active)
    .reduce((sum, i) => sum + (Number(i.quantity_on_hand) * Number(i.cost_per_unit || 0)), 0)

  const lowCount = items.filter(i => i.is_active && ['low','critical','out'].includes(stockStatus(i))).length

  return (
    <div className="p-6">

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Items',   value: items.filter(i => i.is_active).length, sub: 'active in catalog', color: 'text-slate-800' },
          { label: 'Needs Attention', value: lowCount, sub: 'low, critical or out', color: lowCount > 0 ? 'text-red-600' : 'text-green-600' },
          { label: 'Inventory Value', value: `$${totalValue.toFixed(2)}`, sub: 'at cost', color: 'text-slate-800' },
          { label: 'Vendors', value: vendors.length, sub: 'active vendors', color: 'text-slate-800' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3">
            <div className={`text-2xl font-display font-bold ${card.color}`}>{card.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{card.label}</div>
            <div className="text-xs text-slate-300">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, barcode, SKU, location..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status filter */}
        <div className="flex gap-1.5">
          {[
            { key: 'all',      label: `All (${counts.all})` },
            { key: 'critical', label: `⚠ Alert (${counts.critical})`, warn: true },
            { key: 'low',      label: `Low (${counts.low})` },
            { key: 'ok',       label: `In Stock (${counts.ok})` },
          ].map(f => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all whitespace-nowrap ${
                statusFilter === f.key
                  ? f.warn ? 'bg-red-600 text-white border-red-600' : 'bg-brand-600 text-white border-brand-600'
                  : f.warn && counts.critical > 0 ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Inactive toggle + Add */}
        <div className="flex gap-2">
          <button onClick={() => setShowInactive(!showInactive)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
              showInactive ? 'bg-slate-700 text-white border-slate-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}>
            {showInactive ? <Eye size={13} /> : <EyeOff size={13} />}
            {showInactive ? 'Hiding inactive' : 'Show inactive'}
          </button>
          <button onClick={handleNew}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
            <Plus size={15} /> Add Item
          </button>
        </div>
      </div>

      {/* ── Category filter pills ── */}
      {categories.length > 2 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {categories.map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                catFilter === cat
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
              }`}>
              {cat === 'all' ? 'All categories' : cat}
            </button>
          ))}
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-400">
            <Package size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Loading inventory...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Package size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-display text-lg text-slate-600">
              {items.length === 0 ? 'No items yet' : 'No items match your filters'}
            </p>
            <p className="text-sm mt-1">
              {items.length === 0
                ? 'Click "Add Item" to start building your supply catalog.'
                : 'Try adjusting your search or filters.'}
            </p>
            {items.length === 0 && (
              <button onClick={handleNew}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors">
                <Plus size={15} /> Add First Item
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Item', 'Category', 'Barcode', 'Stock', 'Cost', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <ItemRow key={item.id} item={item} onEdit={handleEdit} />
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400">
              {filtered.length} item{filtered.length !== 1 ? 's' : ''}
              {filtered.length !== items.length ? ` of ${items.length} total` : ' in catalog'}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <ItemModal
          item={selected}
          vendors={vendors}
          orgId={organization.id}
          profileId={profile.id}
          onClose={() => { setShowModal(false); setSelected(null) }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
