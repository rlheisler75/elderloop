import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, X, ChevronRight, ClipboardList, Check, AlertTriangle,
  Package, Truck, Search, CheckCircle2, Clock, XCircle,
  ArrowLeft, PackagePlus, Edit2, Undo2
} from 'lucide-react'

const STATUS_CFG = {
  draft:              { label: 'Draft',             color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',  icon: Edit2 },
  submitted:          { label: 'Submitted',         color: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400',    icon: Clock },
  partially_received: { label: 'Partial',           color: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400',  icon: AlertTriangle },
  received:           { label: 'Received',          color: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400',  icon: CheckCircle2 },
  cancelled:          { label: 'Cancelled',         color: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400',      icon: XCircle },
}

const TYPE_CFG = {
  stock:     { label: 'Stock PO',     color: 'bg-brand-100 text-brand-700' },
  non_stock: { label: 'Non-Stock',    color: 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400' },
}

function poTotal(lines) {
  return lines.reduce((s, l) => s + (Number(l.quantity_ordered) * Number(l.unit_cost || 0)), 0)
}

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

// ── Create PO Modal ────────────────────────────────────────────
function CreatePOModal({ orgId, profileId, vendors, items, editPO, editLines, onClose, onSaved }) {
  const isEdit = !!editPO
  const [poType, setPoType]   = useState(editPO?.po_type || 'stock')
  const [vendorId, setVendorId] = useState(editPO?.vendor_id || '')
  const [vendorFree, setVendorFree] = useState(editPO?.vendor_name_free || '')
  const [orderedDate, setOrderedDate] = useState(editPO?.ordered_date || today())
  const [expectedDate, setExpectedDate] = useState(editPO?.expected_date || '')
  const [notes, setNotes]     = useState(editPO?.notes || '')
  const [lines, setLines]     = useState(editLines?.length ? editLines.map(l => ({ supply_item_id: l.supply_item_id || '', description: l.description, unit: l.unit, quantity_ordered: l.quantity_ordered, unit_cost: l.unit_cost ?? '' })) : [{ supply_item_id: '', description: '', unit: 'each', quantity_ordered: 1, unit_cost: '' }])
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const inputCls = 'w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

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

    const poPayload = {
      po_type: poType, status,
      vendor_id: vendorId || null,
      vendor_name_free: vendorFree || null,
      ordered_date: orderedDate,
      expected_date: expectedDate || null,
      notes: notes || null,
    }

    let poId
    if (isEdit) {
      // Update existing PO
      const { error: err } = await supabase.from('supply_purchase_orders').update(poPayload).eq('id', editPO.id)
      if (err) { setError(err.message); setSaving(false); return }
      poId = editPO.id
      // Replace line items
      await supabase.from('supply_po_line_items').delete().eq('po_id', poId)
    } else {
      // Generate PO number and insert
      const { count } = await supabase.from('supply_purchase_orders').select('*', { count: 'exact', head: true }).eq('organization_id', orgId)
      const poNumber = `PO-${1000 + (count || 0) + 1}`
      const { data: po, error: err } = await supabase.from('supply_purchase_orders').insert({
        ...poPayload, organization_id: orgId, po_number: poNumber, ordered_by: profileId,
      }).select().single()
      if (err) { setError(err.message); setSaving(false); return }
      poId = po.id
    }

    const validLines = lines.filter(l => l.description.trim())
    await supabase.from('supply_po_line_items').insert(
      validLines.map((l, idx) => ({
        po_id: poId,
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[94vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100">{isEdit ? `Edit ${editPO.po_number}` : 'New Purchase Order'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && <div className="px-4 py-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-400 text-sm">{error}</div>}

          {/* PO Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">PO Type</label>
            <div className="flex gap-2">
              {[{ k: 'stock', label: 'Stock Reorder', desc: 'Reorder catalog items' }, { k: 'non_stock', label: 'Non-Stock / One-Time', desc: 'Custom purchase, no catalog link' }].map(t => (
                <button key={t.k} onClick={() => setPoType(t.k)}
                  className={`flex-1 p-3 rounded-xl border text-left transition-all ${poType === t.k ? 'bg-brand-50 dark:bg-brand-950/30 border-brand-300 dark:border-brand-700' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                  <div className={`text-sm font-medium ${poType === t.k ? 'text-brand-700' : 'text-slate-700 dark:text-slate-300'}`}>{t.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Vendor + dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Vendor</label>
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
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Order Date</label>
                <input type="date" value={orderedDate} onChange={e => setOrderedDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Expected</label>
                <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Line items */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Line Items</label>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="flex gap-2 items-start p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
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
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
              <span className="text-sm text-slate-600 dark:text-slate-300">Estimated Total</span>
              <span className="font-display font-semibold text-slate-800 dark:text-slate-100">${total.toFixed(2)}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputCls + ' resize-none'} placeholder="Optional notes..." />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-between flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
          <div className="flex gap-2">
            <button onClick={() => handleSave('draft')} disabled={saving} className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
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

// ── Inline Receive Input ───────────────────────────────────────
function ReceiveLineRow({ line, po, orgId, profileId, canEdit, onDone }) {
  const received  = Number(line.quantity_received)
  const ordered   = Number(line.quantity_ordered)
  const remaining = ordered - received

  const [receiveQty, setReceiveQty] = useState(remaining)
  const [reverseQty, setReverseQty] = useState(received)
  const [mode,   setMode]   = useState('idle')   // 'idle' | 'receive' | 'reverse'
  const [saving, setSaving] = useState(false)

  // Reset inputs whenever line data changes
  useEffect(() => {
    setReceiveQty(ordered - received)
    setReverseQty(received)
    setMode('idle')
  }, [received, ordered])

  const lineStatus = () => {
    if (received <= 0)      return 'pending'
    if (received >= ordered) return 'received'
    return 'partial'
  }
  const status = lineStatus()

  // ── Receive ──────────────────────────────────────────────────
  const handleReceive = async () => {
    const qty = Number(receiveQty)
    if (!qty || qty <= 0) return
    setSaving(true)
    const now = new Date().toISOString()
    const newReceived   = received + qty
    const fullyReceived = newReceived >= ordered

    await supabase.from('supply_po_line_items').update({
      quantity_received: newReceived,
      is_received: fullyReceived,
      received_at: fullyReceived ? now : line.received_at,
    }).eq('id', line.id)

    if (line.supply_item_id) {
      const { data: item } = await supabase.from('supply_items')
        .select('quantity_on_hand').eq('id', line.supply_item_id).single()
      if (item) {
        const newQty = Number(item.quantity_on_hand) + qty
        await supabase.from('supply_items').update({ quantity_on_hand: newQty }).eq('id', line.supply_item_id)
        await supabase.from('supply_transactions').insert({
          organization_id: orgId, supply_item_id: line.supply_item_id,
          transaction_type: 'receive', quantity: qty,
          quantity_before: Number(item.quantity_on_hand), quantity_after: newQty,
          unit_cost: line.unit_cost, po_id: po.id, po_line_item_id: line.id,
          performed_by: profileId, reference_number: po.po_number,
          notes: `Received via ${po.po_number}`,
        })
      }
    }
    setSaving(false)
    onDone()
  }

  // ── Reverse ──────────────────────────────────────────────────
  const handleReverse = async () => {
    const qty = Number(reverseQty)
    if (!qty || qty <= 0 || qty > received) return
    if (!confirm(`Reverse ${qty} ${line.unit} of "${line.description}"? This will reduce inventory by ${qty}.`)) return
    setSaving(true)

    const newReceived = received - qty
    await supabase.from('supply_po_line_items').update({
      quantity_received: newReceived,
      is_received: false,
      received_at: newReceived > 0 ? line.received_at : null,
    }).eq('id', line.id)

    if (line.supply_item_id) {
      const { data: item } = await supabase.from('supply_items')
        .select('quantity_on_hand').eq('id', line.supply_item_id).single()
      if (item) {
        const newQty = Math.max(0, Number(item.quantity_on_hand) - qty)
        await supabase.from('supply_items').update({ quantity_on_hand: newQty }).eq('id', line.supply_item_id)
        await supabase.from('supply_transactions').insert({
          organization_id: orgId, supply_item_id: line.supply_item_id,
          transaction_type: 'adjustment', quantity: -qty,
          quantity_before: Number(item.quantity_on_hand), quantity_after: newQty,
          unit_cost: line.unit_cost, po_id: po.id, po_line_item_id: line.id,
          performed_by: profileId, reference_number: po.po_number,
          notes: `Receive reversed on ${po.po_number}`,
        })
      }
    }
    setSaving(false)
    onDone()
  }

  return (
    <tr className="border-b border-slate-100 dark:border-slate-800 last:border-0">
      <td className="px-4 py-3">
        <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{line.description}</div>
        {line.supply_items?.name && line.supply_items.name !== line.description &&
          <div className="text-xs text-slate-400">{line.supply_items.name}</div>}
      </td>
      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{ordered} {line.unit}</td>
      <td className="px-4 py-3 text-sm">
        <span className={status === 'partial' ? 'text-amber-600 font-medium' : 'text-slate-700 dark:text-slate-300'}>
          {received} {line.unit}
        </span>
        {status === 'partial' && (
          <div className="text-xs text-slate-400">{remaining} remaining</div>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{line.unit_cost ? `$${Number(line.unit_cost).toFixed(2)}` : '—'}</td>
      <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-100">
        ${(ordered * Number(line.unit_cost || 0)).toFixed(2)}
      </td>
      <td className="px-4 py-3">
        {status === 'received' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400">
            <Check size={10} /> Received
          </span>
        )}
        {status === 'partial' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">
            <Clock size={10} /> Partial
          </span>
        )}
        {status === 'pending' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            <Clock size={10} /> Pending
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        {po.status !== 'cancelled' && canEdit && (
          <div className="flex flex-col gap-1.5">

            {/* Receive row */}
            {status !== 'received' && mode !== 'reverse' && (
              <div className="flex items-center gap-1.5">
                {mode === 'receive' ? (
                  <>
                    <input type="number" min="1" max={remaining} value={receiveQty}
                      onChange={e => setReceiveQty(Math.min(remaining, Math.max(1, Number(e.target.value))))}
                      className="w-16 px-2 py-1 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs text-center focus:outline-none focus:ring-2 focus:ring-green-400" />
                    <span className="text-xs text-slate-400">{line.unit}</span>
                    <button onClick={handleReceive} disabled={saving}
                      className="text-xs px-2.5 py-1 bg-green-600 text-white hover:bg-green-700 rounded-lg font-medium transition-colors disabled:opacity-50">
                      {saving ? '...' : '✓ Confirm'}
                    </button>
                    <button onClick={() => setMode('idle')} className="text-xs text-slate-400 hover:text-slate-600"><X size={13} /></button>
                  </>
                ) : (
                  <button onClick={() => setMode('receive')}
                    className="text-xs px-2.5 py-1 bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 border border-green-200 dark:border-green-900 rounded-lg font-medium transition-colors whitespace-nowrap">
                    {status === 'partial' ? 'Receive More' : 'Receive'}
                  </button>
                )}
              </div>
            )}

            {/* Reverse row — only when something has been received */}
            {received > 0 && mode !== 'receive' && (
              <div className="flex items-center gap-1.5">
                {mode === 'reverse' ? (
                  <>
                    <input type="number" min="1" max={received} value={reverseQty}
                      onChange={e => setReverseQty(Math.min(received, Math.max(1, Number(e.target.value))))}
                      className="w-16 px-2 py-1 border border-red-200 dark:border-red-900 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs text-center focus:outline-none focus:ring-2 focus:ring-red-400" />
                    <span className="text-xs text-slate-400">{line.unit}</span>
                    <button onClick={handleReverse} disabled={saving}
                      className="text-xs px-2.5 py-1 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium transition-colors disabled:opacity-50">
                      {saving ? '...' : 'Undo'}
                    </button>
                    <button onClick={() => setMode('idle')} className="text-xs text-slate-400 hover:text-slate-600"><X size={13} /></button>
                  </>
                ) : (
                  <button onClick={() => setMode('reverse')}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-900 rounded-lg font-medium transition-colors">
                    <Undo2 size={11} /> Reverse
                  </button>
                )}
              </div>
            )}

          </div>
        )}
      </td>
    </tr>
  )
}

// ── PO Detail / Receive View ───────────────────────────────────
function PODetail({ po, orgId, profileId, canEdit, onBack, onRefresh, onEdit }) {
  const [lines,    setLines]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [receiving,setReceiving]= useState(false)
  const cfg = STATUS_CFG[po.status] || STATUS_CFG.draft

  useEffect(() => { fetchLines() }, [po.id])

  async function fetchLines() {
    setLoading(true)
    const { data } = await supabase
      .from('supply_po_line_items')
      .select('*, supply_items(name, unit)')
      .eq('po_id', po.id)
      .order('sort_order')
    setLines(data || [])
    setLoading(false)
  }

  async function updatePOStatus() {
    const { data: fresh } = await supabase
      .from('supply_po_line_items').select('quantity_ordered, quantity_received, is_received').eq('po_id', po.id)
    if (!fresh) return
    const allDone    = fresh.every(l => Number(l.quantity_received) >= Number(l.quantity_ordered))
    const anyStarted = fresh.some(l => Number(l.quantity_received) > 0)
    const now = new Date().toISOString()
    await supabase.from('supply_purchase_orders').update({
      status: allDone ? 'received' : anyStarted ? 'partially_received' : 'submitted',
      ...(allDone ? { received_date: now.split('T')[0], received_by: profileId } : {}),
    }).eq('id', po.id)
  }

  async function receiveAll() {
    if (!confirm('Receive all remaining quantities and update inventory?')) return
    setReceiving(true)
    const now = new Date().toISOString()
    const incomplete = lines.filter(l => Number(l.quantity_received) < Number(l.quantity_ordered))

    for (const line of incomplete) {
      const remaining  = Number(line.quantity_ordered) - Number(line.quantity_received)
      const newReceived = Number(line.quantity_ordered)

      await supabase.from('supply_po_line_items').update({
        quantity_received: newReceived,
        is_received: true,
        received_at: now,
      }).eq('id', line.id)

      if (line.supply_item_id && remaining > 0) {
        const { data: item } = await supabase.from('supply_items')
          .select('quantity_on_hand').eq('id', line.supply_item_id).single()
        if (item) {
          const newQty = Number(item.quantity_on_hand) + remaining
          await supabase.from('supply_items').update({ quantity_on_hand: newQty }).eq('id', line.supply_item_id)
          await supabase.from('supply_transactions').insert({
            organization_id: orgId, supply_item_id: line.supply_item_id,
            transaction_type: 'receive', quantity: remaining,
            quantity_before: Number(item.quantity_on_hand), quantity_after: newQty,
            unit_cost: line.unit_cost, po_id: po.id, po_line_item_id: line.id,
            performed_by: profileId, reference_number: po.po_number,
          })
        }
      }
    }

    await supabase.from('supply_purchase_orders').update({
      status: 'received',
      received_date: now.split('T')[0],
      received_by: profileId,
    }).eq('id', po.id)

    setReceiving(false)
    fetchLines()
    onRefresh()
  }

  const handleLineDone = async () => {
    await updatePOStatus()
    fetchLines()
    onRefresh()
  }

  const total       = lines.reduce((s, l) => s + (Number(l.quantity_ordered) * Number(l.unit_cost || 0)), 0)
  const allReceived = lines.length > 0 && lines.every(l => Number(l.quantity_received) >= Number(l.quantity_ordered))
  const anyPending  = lines.some(l => Number(l.quantity_received) < Number(l.quantity_ordered))

  return (
    <div className="p-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 mb-5 transition-colors">
        <ArrowLeft size={15} /> Back to Purchase Orders
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="font-display font-bold text-slate-800 dark:text-slate-100 text-xl">{po.po_number}</h2>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${TYPE_CFG[po.po_type]?.color}`}>{TYPE_CFG[po.po_type]?.label}</span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 space-y-0.5">
              {po.supply_vendors?.name && <div>Vendor: <span className="text-slate-700 dark:text-slate-300 font-medium">{po.supply_vendors.name}</span></div>}
              {po.ordered_date && <div>Ordered: <span className="text-slate-700 dark:text-slate-300">{new Date(po.ordered_date).toLocaleDateString()}</span></div>}
              {po.expected_date && <div>Expected: <span className="text-slate-700 dark:text-slate-300">{new Date(po.expected_date).toLocaleDateString()}</span></div>}
              {po.notes && <div className="mt-2 text-slate-600 dark:text-slate-300 italic">{po.notes}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-display font-bold text-slate-800 dark:text-slate-100">${total.toFixed(2)}</div>
            <div className="text-xs text-slate-400">Estimated total</div>
          </div>
        </div>
      </div>

      {/* Draft actions */}
      {po.status === 'draft' && canEdit && (
        <div className="flex items-center gap-2 mb-4">
          <button onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 border border-brand-200 text-brand-700 hover:bg-brand-50 dark:hover:bg-brand-950/30 text-sm font-medium rounded-xl transition-colors">
            <Edit2 size={14} /> Edit PO
          </button>
          <button onClick={async () => {
            if (!confirm('Submit this PO to the vendor?')) return
            await supabase.from('supply_purchase_orders').update({ status: 'submitted' }).eq('id', po.id)
            onRefresh()
          }} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors">
            <Check size={14} /> Submit PO
          </button>
          <button onClick={async () => {
            if (!confirm('Delete this draft PO? This cannot be undone.')) return
            await supabase.from('supply_po_line_items').delete().eq('po_id', po.id)
            await supabase.from('supply_purchase_orders').delete().eq('id', po.id)
            onBack()
          }} className="flex items-center gap-2 px-4 py-2 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 text-sm font-medium rounded-xl transition-colors ml-auto">
            <XCircle size={14} /> Delete Draft
          </button>
        </div>
      )}

      {/* Receive All button */}
      {anyPending && po.status !== 'cancelled' && po.status !== 'draft' && canEdit && (
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
              {['Item / Description', 'Qty Ordered', 'Qty Received', 'Unit Cost', 'Line Total', 'Status', 'Receive'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">Loading...</td></tr>
            ) : lines.map(line => (
              <ReceiveLineRow
                key={line.id}
                line={line}
                po={po}
                orgId={orgId}
                profileId={profileId}
                canEdit={canEdit}
                onDone={handleLineDone}
              />
            ))}
          </tbody>
        </table>
        {allReceived && (
          <div className="flex items-center gap-2 px-5 py-3 bg-green-50 border-t border-green-100 text-green-700 text-sm font-medium">
            <CheckCircle2 size={16} /> All items fully received
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Purchase Orders page ──────────────────────────────────
export default function SupplyPurchaseOrders() {
  const { organization, profile, canEdit } = useAuth()
  const canEditSupply = canEdit('central_supply', ['supervisor','manager'])
  const [pos,      setPos]      = useState([])
  const [vendors,  setVendors]  = useState([])
  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [editPOData, setEditPOData]   = useState(null)
  const [editPOLines, setEditPOLines] = useState([])
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

  const handleEditDraft = async (po) => {
    const { data } = await supabase.from('supply_po_line_items')
      .select('*').eq('po_id', po.id).order('sort_order')
    setEditPOData(po)
    setEditPOLines(data || [])
    setSelectedPO(null)
  }

  if (selectedPO) {
    return <PODetail po={selectedPO} orgId={organization.id} profileId={profile.id} canEdit={canEditSupply} onBack={() => setSelectedPO(null)} onRefresh={() => { fetchAll(); setSelectedPO(null) }} onEdit={() => handleEditDraft(selectedPO)} />
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
        {canEditSupply && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors">
            <Plus size={15} /> New PO
          </button>
        )}
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
            {pos.length === 0 && canEditSupply && <button onClick={() => setShowCreate(true)} className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl"><Plus size={15} /> New PO</button>}
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
      {editPOData && <CreatePOModal orgId={organization.id} profileId={profile.id} vendors={vendors} items={items} editPO={editPOData} editLines={editPOLines} onClose={() => { setEditPOData(null); setEditPOLines([]) }} onSaved={() => { setEditPOData(null); setEditPOLines([]); fetchAll() }} />}
    </div>
  )
}
