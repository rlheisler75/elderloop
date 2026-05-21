import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, X, ChevronRight, ClipboardList, Check, AlertTriangle,
  Package, Truck, Search, CheckCircle2, Clock, XCircle,
  ArrowLeft, PackagePlus, Edit2
} from 'lucide-react'

const STATUS_CFG = {
  draft:              { label: 'Draft',             color: 'bg-slate-100 text-slate-600',  icon: Edit2 },
  submitted:          { label: 'Submitted',         color: 'bg-blue-100 text-blue-700',    icon: Clock },
  partially_received: { label: 'Partial',           color: 'bg-amber-100 text-amber-700',  icon: AlertTriangle },
  received:           { label: 'Received',          color: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  cancelled:          { label: 'Cancelled',         color: 'bg-red-100 text-red-700',      icon: XCircle },
}

const TYPE_CFG = {
  stock:     { label: 'Stock PO',     color: 'bg-brand-100 text-brand-700' },
  non_stock: { label: 'Non-Stock',    color: 'bg-purple-100 text-purple-700' },
}

function poTotal(lines) {
  return lines.reduce((s, l) => s + (Number(l.quantity_ordered) * Number(l.unit_cost || 0)), 0)
}

// ── Create PO Modal ────────────────────────────────────────────
function CreatePOModal({ orgId, profileId, vendors, items, onClose, onSaved }) {
  const [poType, setPoType]   = useState('stock')
  const [vendorId, setVendorId] = useState('')
  const [vendorFree, setVendorFree] = useState('')
  const [orderedDate, setOrderedDate] = useState(new Date().toISOString().split('T')[0])
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes]     = useState('')
  const [lines, setLines]     = useState([{ supply_item_id: '', description: '', unit: 'each', quantity_ordered: 1, unit_cost: '' }])
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

  const addLine = () => setLines(l => [...l, { supply_item_id: '', description: '', unit: 'each', quantity_ordered: 1, unit_cost: '' }])
  const removeLine = (i) => setLines(l => l.filter((_, idx) => idx !== i))
  const setLine = (i, k, v) => setLines(l => l.map((line, idx) => idx === i ? { ...line, [k]: v } : line))

  const handleItemSelect = (i, itemId) => {
    const item = items.find(it => it.id === itemId)
    if (item) {
      setLine(i, 'supply_item_id', itemId)
      setLine(i, 'description', item.name)
      setLine(i, 'unit', item.unit)
      setLine(i, 'unit_cost', item.cost_per_unit ?? '')
    } else {
      setLine(i, 'supply_item_id', '')
    }
  }

  const handleSave = async (status = 'draft') => {
    if (lines.every(l => !l.description.trim())) { setError('Add at least one line item'); return }
    setSaving(true); setError('')

    // Generate PO number
    const { count } = await supabase.from('supply_purchase_orders').select('*', { count: 'exact', head: true }).eq('organization_id', orgId)
    const poNumber = `PO-${1000 + (count || 0) + 1}`

    const { data: po, error: err } = await supabase.from('supply_purchase_orders').insert({
      organization_id: orgId,
      po_number: poNumber,
      po_type: poType,
      status,
      vendor_id: vendorId || null,
      vendor_name_free: vendorFree || null,
      ordered_by: profileId,
      ordered_date: orderedDate,
      expected_date: expectedDate || null,
      notes: notes || null,
    }).select().single()

    if (err) { setError(err.message); setSaving(false); return }

    const validLines = lines.filter(l => l.description.trim())
    await supabase.from('supply_po_line_items').insert(
      validLines.map((l, idx) => ({
        po_id: po.id,
        organization_id: orgId,
        supply_item_id: l.supply_item_id || null,
        description: l.description,
        unit: l.unit,
        quantity_ordered: Number(l.quantity_ordered) || 1,
        quantity_received: 0,
        unit_cost: l.unit_cost !== '' ? Number(l.unit_cost) : 0,
        is_received: false,
        add_to_inventory: poType === 'non_stock',
        sort_order: idx,
      }))
    )
    onSaved()
  }

  const total = lines.reduce((s, l) => s + (Number(l.quantity_ordered || 0) * Number(l.unit_cost || 0)), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[94vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800">New Purchase Order</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          {/* PO Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">PO Type</label>
            <div className="flex gap-2">
              {[{ k: 'stock', label: 'Stock Reorder', desc: 'Reorder catalog items' }, { k: 'non_stock', label: 'Non-Stock / One-Time', desc: 'Custom purchase, no catalog link' }].map(t => (
                <button key={t.k} onClick={() => setPoType(t.k)}
                  className={`flex-1 p-3 rounded-xl border text-left transition-all ${poType === t.k ? 'bg-brand-50 border-brand-300' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className={`text-sm font-medium ${poType === t.k ? 'text-brand-700' : 'text-slate-700'}`}>{t.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Vendor + dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Vendor</label>
              {vendors.length > 0
                ? <select value={vendorId} onChange={e => setVendorId(e.target.value)} className={inputCls}>
                    <option value="">— Select vendor —</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                : <input value={vendorFree} onChange={e => setVendorFree(e.target.value)} className={inputCls} placeholder="Vendor name" />
              }
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Order Date</label>
                <input type="date" value={orderedDate} onChange={e => setOrderedDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Expected</label>
                <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Line items */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Line Items</label>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="flex gap-2 items-start p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex-1 space-y-2">
                    {poType === 'stock' ? (
                      <select value={line.supply_item_id} onChange={e => handleItemSelect(i, e.target.value)} className={inputCls}>
                        <option value="">— Select item from catalog —</option>
                        {items.map(it => <option key={it.id} value={it.id}>{it.name} ({it.category})</option>)}
                      </select>
                    ) : (
                      <input value={line.description} onChange={e => setLine(i, 'description', e.target.value)} className={inputCls} placeholder="Item description" />
                    )}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <input type="number" min="1" value={line.quantity_ordered} onChange={e => setLine(i, 'quantity_ordered', e.target.value)} className={inputCls} placeholder="Qty" />
                      </div>
                      <div>
                        <select value={line.unit} onChange={e => setLine(i, 'unit', e.target.value)} className={inputCls}>
                          {['each','box','case','pack','pair','bag','roll','carton','bottle','gallon','lb','oz'].map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div>
                        <input type="number" min="0" step="0.01" value={line.unit_cost} onChange={e => setLine(i, 'unit_cost', e.target.value)} className={inputCls} placeholder="Unit cost $" />
                      </div>
                    </div>
                  </div>
                  <button onClick={() => removeLine(i)} className="text-slate-400 hover:text-red-500 transition-colors mt-1 flex-shrink-0"><X size={16} /></button>
                </div>
              ))}
            </div>
            <button onClick={addLine} className="mt-2 flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"><Plus size={14} /> Add Line</button>
          </div>

          {total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-sm text-slate-600">Estimated Total</span>
              <span className="font-display font-semibold text-slate-800">${total.toFixed(2)}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputCls + ' resize-none'} placeholder="Optional notes..." />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium hover:bg-slate-50 rounded-lg">Cancel</button>
          <div className="flex gap-2">
            <button onClick={() => handleSave('draft')} disabled={saving} className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50">
              Save as Draft
            </button>
            <button onClick={() => handleSave('submitted')} disabled={saving} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg">
              {saving ? 'Saving...' : 'Submit PO'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── PO Detail / Receive View ───────────────────────────────────
function PODetail({ po, orgId, profileId, onBack, onRefresh }) {
  const [lines, setLines]     = useState([])
  const [loading, setLoading] = useState(true)
  const [receiving, setReceiving] = useState(false)
  const cfg = STATUS_CFG[po.status] || STATUS_CFG.draft

  useEffect(() => { fetchLines() }, [po.id])

  async function fetchLines() {
    setLoading(true)
    const { data } = await supabase.from('supply_po_line_items').select('*, supply_items(name, unit)').eq('po_id', po.id).order('sort_order')
    setLines(data || [])
    setLoading(false)
  }

  async function receiveAll() {
    if (!confirm('Mark all lines as received and update inventory?')) return
    setReceiving(true)
    const unreceived = lines.filter(l => !l.is_received)
    const now = new Date().toISOString()

    for (const line of unreceived) {
      // Mark line received
      await supabase.from('supply_po_line_items').update({ is_received: true, quantity_received: line.quantity_ordered, received_at: now }).eq('id', line.id)
      // Update inventory if linked to a catalog item
      if (line.supply_item_id) {
        const { data: item } = await supabase.from('supply_items').select('quantity_on_hand').eq('id', line.supply_item_id).single()
        if (item) {
          const newQty = Number(item.quantity_on_hand) + Number(line.quantity_ordered)
          await supabase.from('supply_items').update({ quantity_on_hand: newQty }).eq('id', line.supply_item_id)
          // Log transaction
          await supabase.from('supply_transactions').insert({
            organization_id: orgId, supply_item_id: line.supply_item_id,
            transaction_type: 'receive', quantity: Number(line.quantity_ordered),
            quantity_before: Number(item.quantity_on_hand), quantity_after: newQty,
            unit_cost: line.unit_cost, po_id: po.id, po_line_item_id: line.id,
            performed_by: profileId, reference_number: po.po_number,
          })
        }
      }
    }

    // Update PO status
    await supabase.from('supply_purchase_orders').update({ status: 'received', received_date: now.split('T')[0], received_by: profileId }).eq('id', po.id)
    setReceiving(false)
    fetchLines()
    onRefresh()
  }

  async function receiveLine(line) {
    const now = new Date().toISOString()
    await supabase.from('supply_po_line_items').update({ is_received: true, quantity_received: line.quantity_ordered, received_at: now }).eq('id', line.id)
    if (line.supply_item_id) {
      const { data: item } = await supabase.from('supply_items').select('quantity_on_hand').eq('id', line.supply_item_id).single()
      if (item) {
        const newQty = Number(item.quantity_on_hand) + Number(line.quantity_ordered)
        await supabase.from('supply_items').update({ quantity_on_hand: newQty }).eq('id', line.supply_item_id)
        await supabase.from('supply_transactions').insert({
          organization_id: orgId, supply_item_id: line.supply_item_id,
          transaction_type: 'receive', quantity: Number(line.quantity_ordered),
          quantity_before: Number(item.quantity_on_hand), quantity_after: newQty,
          unit_cost: line.unit_cost, po_id: po.id, po_line_item_id: line.id,
          performed_by: profileId, reference_number: po.po_number,
        })
      }
    }
    // Check if all received → update status
    const updated = lines.map(l => l.id === line.id ? { ...l, is_received: true } : l)
    const allDone = updated.every(l => l.is_received)
    await supabase.from('supply_purchase_orders').update({ status: allDone ? 'received' : 'partially_received', ...(allDone ? { received_date: now.split('T')[0], received_by: profileId } : {}) }).eq('id', po.id)
    fetchLines()
    onRefresh()
  }

  const total = lines.reduce((s, l) => s + (Number(l.quantity_ordered) * Number(l.unit_cost || 0)), 0)
  const allReceived = lines.length > 0 && lines.every(l => l.is_received)
  const anyPending  = lines.some(l => !l.is_received)

  return (
    <div className="p-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-5 transition-colors">
        <ArrowLeft size={15} /> Back to Purchase Orders
      </button>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="font-display font-bold text-slate-800 text-xl">{po.po_number}</h2>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${TYPE_CFG[po.po_type]?.color}`}>{TYPE_CFG[po.po_type]?.label}</span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
            </div>
            <div className="text-sm text-slate-500 space-y-0.5">
              {po.supply_vendors?.name && <div>Vendor: <span className="text-slate-700 font-medium">{po.supply_vendors.name}</span></div>}
              {po.ordered_date && <div>Ordered: <span className="text-slate-700">{new Date(po.ordered_date).toLocaleDateString()}</span></div>}
              {po.expected_date && <div>Expected: <span className="text-slate-700">{new Date(po.expected_date).toLocaleDateString()}</span></div>}
              {po.notes && <div className="mt-2 text-slate-600 italic">{po.notes}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-display font-bold text-slate-800">${total.toFixed(2)}</div>
            <div className="text-xs text-slate-400">Estimated total</div>
          </div>
        </div>
      </div>

      {/* Receive All button */}
      {anyPending && po.status !== 'cancelled' && (
        <div className="flex justify-end mb-4">
          <button onClick={receiveAll} disabled={receiving}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-medium rounded-xl shadow-sm transition-colors">
            <PackagePlus size={16} />
            {receiving ? 'Receiving...' : 'Receive All'}
          </button>
        </div>
      )}

      {/* Line items table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Item / Description', 'Qty Ordered', 'Qty Received', 'Unit Cost', 'Line Total', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">Loading...</td></tr>
            ) : lines.map(line => (
              <tr key={line.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-slate-800">{line.description}</div>
                  {line.supply_items?.name && line.supply_items.name !== line.description && <div className="text-xs text-slate-400">{line.supply_items.name}</div>}
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">{line.quantity_ordered} {line.unit}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{line.quantity_received} {line.unit}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{line.unit_cost ? `$${Number(line.unit_cost).toFixed(2)}` : '—'}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-800">${(Number(line.quantity_ordered) * Number(line.unit_cost || 0)).toFixed(2)}</td>
                <td className="px-4 py-3">
                  {line.is_received
                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"><Check size={10} /> Received</span>
                    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700"><Clock size={10} /> Pending</span>}
                </td>
                <td className="px-4 py-3">
                  {!line.is_received && po.status !== 'cancelled' && (
                    <button onClick={() => receiveLine(line)} className="text-xs px-2.5 py-1 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg font-medium transition-colors">
                      Receive
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {allReceived && (
          <div className="flex items-center gap-2 px-5 py-3 bg-green-50 border-t border-green-100 text-green-700 text-sm font-medium">
            <CheckCircle2 size={16} /> All items received
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Purchase Orders page ──────────────────────────────────
export default function SupplyPurchaseOrders() {
  const { organization, profile } = useAuth()
  const [pos,      setPos]      = useState([])
  const [vendors,  setVendors]  = useState([])
  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedPO, setSelectedPO] = useState(null)

  useEffect(() => { if (organization) fetchAll() }, [organization])

  async function fetchAll() {
    setLoading(true)
    const [posRes, vendorsRes, itemsRes] = await Promise.all([
      supabase.from('supply_purchase_orders').select('*, supply_vendors(name)').eq('organization_id', organization.id).order('created_at', { ascending: false }),
      supabase.from('supply_vendors').select('id, name').eq('organization_id', organization.id).eq('is_active', true).order('name'),
      supabase.from('supply_items').select('id, name, category, unit, cost_per_unit').eq('organization_id', organization.id).eq('is_active', true).order('name'),
    ])
    setPos(posRes.data || [])
    setVendors(vendorsRes.data || [])
    setItems(itemsRes.data || [])
    setLoading(false)
  }

  if (selectedPO) {
    return <PODetail po={selectedPO} orgId={organization.id} profileId={profile.id} onBack={() => setSelectedPO(null)} onRefresh={() => { fetchAll(); setSelectedPO(null) }} />
  }

  const filtered = pos.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return p.po_number.toLowerCase().includes(q) || p.supply_vendors?.name?.toLowerCase().includes(q) || p.notes?.toLowerCase().includes(q)
    }
    return true
  })

  const statusCounts = Object.fromEntries(Object.keys(STATUS_CFG).map(k => [k, pos.filter(p => p.status === k).length]))

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search PO number, vendor..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors">
          <Plus size={15} /> New PO
        </button>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap mb-5">
        <button onClick={() => setStatusFilter('all')} className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${statusFilter === 'all' ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
          All ({pos.length})
        </button>
        {Object.entries(STATUS_CFG).map(([k, v]) => (
          <button key={k} onClick={() => setStatusFilter(k)} className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${statusFilter === k ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
            {v.label} ({statusCounts[k] || 0})
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-400"><ClipboardList size={32} className="mx-auto mb-3 opacity-30" /><p className="text-sm">Loading...</p></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <ClipboardList size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-display text-lg text-slate-600">{pos.length === 0 ? 'No purchase orders yet' : 'No POs match'}</p>
            <p className="text-sm mt-1">{pos.length === 0 ? 'Create your first PO to get started.' : 'Try adjusting filters.'}</p>
            {pos.length === 0 && <button onClick={() => setShowCreate(true)} className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl"><Plus size={15} /> New PO</button>}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['PO #', 'Type', 'Vendor', 'Date', 'Expected', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(po => {
                const cfg = STATUS_CFG[po.status] || STATUS_CFG.draft
                return (
                  <tr key={po.id} onClick={() => setSelectedPO(po)} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors group">
                    <td className="px-4 py-3 font-medium text-slate-800 text-sm">{po.po_number}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_CFG[po.po_type]?.color}`}>{TYPE_CFG[po.po_type]?.label}</span></td>
                    <td className="px-4 py-3 text-sm text-slate-600">{po.supply_vendors?.name || po.vendor_name_free || <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{po.ordered_date ? new Date(po.ordered_date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{po.expected_date ? new Date(po.expected_date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span></td>
                    <td className="px-4 py-3"><ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors" /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && <CreatePOModal orgId={organization.id} profileId={profile.id} vendors={vendors} items={items} onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); fetchAll() }} />}
    </div>
  )
}
