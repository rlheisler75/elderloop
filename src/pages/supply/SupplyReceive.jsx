import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { PackagePlus, Search, ScanLine, CheckCircle2, X, ClipboardList } from 'lucide-react'
import BarcodeScanner from './BarcodeScanner'

export default function SupplyReceive() {
  const { organization, profile } = useAuth()
  const [mode, setMode]         = useState('manual') // 'manual' | 'po'
  const [items, setItems]       = useState([])
  const [openPOs, setOpenPOs]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [lines, setLines]       = useState([])
  const [notes, setNotes]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [success, setSuccess]   = useState(false)
  const [selectedPO, setSelectedPO] = useState(null)
  const [poLines, setPOLines]   = useState([])

  useEffect(() => { if (organization) fetchData() }, [organization])

  async function fetchData() {
    setLoading(true)
    const [itemsRes, posRes] = await Promise.all([
      supabase.from('supply_items').select('id, name, category, barcode, sku, unit, cost_per_unit, quantity_on_hand').eq('organization_id', organization.id).eq('is_active', true).order('name'),
      supabase.from('supply_purchase_orders').select('id, po_number, supply_vendors(name)').eq('organization_id', organization.id).in('status', ['submitted', 'partially_received']).order('ordered_date'),
    ])
    setItems(itemsRes.data || [])
    setOpenPOs(posRes.data || [])
    setLoading(false)
  }

  async function loadPOLines(poId) {
    const { data } = await supabase.from('supply_po_line_items').select('*, supply_items(name, unit, quantity_on_hand)').eq('po_id', poId).eq('is_received', false).order('sort_order')
    setPOLines(data || [])
    setLines((data || []).map(l => ({ ...l, receive_qty: l.quantity_ordered - l.quantity_received, checked: false })))
  }

  const handleSelectPO = (po) => {
    setSelectedPO(po)
    loadPOLines(po.id)
  }

  const handleScan = (barcode) => {
    setShowScanner(false)
    const item = items.find(i => i.barcode === barcode || i.sku === barcode)
    if (item) addLine(item)
    else alert(`No item found with barcode: ${barcode}`)
  }

  const addLine = (item) => {
    if (lines.find(l => l.supply_item_id === item.id || l.id === item.id)) return
    setLines(l => [...l, { supply_item_id: item.id, description: item.name, unit: item.unit, receive_qty: 1, unit_cost: item.cost_per_unit || '', quantity_on_hand: item.quantity_on_hand }])
  }

  const removeLine = (idx) => setLines(l => l.filter((_, i) => i !== idx))
  const setLineVal = (idx, k, v) => setLines(l => l.map((line, i) => i === idx ? { ...line, [k]: v } : line))

  const handleSubmit = async () => {
    const validLines = mode === 'manual'
      ? lines.filter(l => l.supply_item_id && Number(l.receive_qty) > 0)
      : lines.filter(l => l.checked && Number(l.receive_qty) > 0)

    if (validLines.length === 0) { alert('Add at least one item to receive.'); return }
    setSaving(true)

    for (const line of validLines) {
      const itemId  = line.supply_item_id || line.supply_item_id
      const qty     = Number(line.receive_qty)
      const before  = Number(line.quantity_on_hand ?? line.supply_items?.quantity_on_hand ?? 0)
      const after   = before + qty
      const cost    = line.unit_cost !== '' ? Number(line.unit_cost) : null

      await supabase.from('supply_items').update({ quantity_on_hand: after, updated_at: new Date().toISOString() }).eq('id', itemId)
      await supabase.from('supply_transactions').insert({
        organization_id: organization.id, supply_item_id: itemId,
        transaction_type: 'receive', quantity: qty,
        quantity_before: before, quantity_after: after,
        unit_cost: cost, po_id: selectedPO?.id || null,
        performed_by: profile.id, notes: notes || null,
      })

      if (line.po_line_item_id || line.id) {
        const lineId = line.po_line_item_id || line.id
        if (selectedPO) {
          await supabase.from('supply_po_line_items').update({ is_received: true, quantity_received: qty, received_at: new Date().toISOString() }).eq('id', lineId)
        }
      }
    }

    if (selectedPO) {
      const { data: allLines } = await supabase.from('supply_po_line_items').select('is_received').eq('po_id', selectedPO.id)
      const allDone = allLines?.every(l => l.is_received)
      await supabase.from('supply_purchase_orders').update({ status: allDone ? 'received' : 'partially_received', ...(allDone ? { received_date: new Date().toISOString().split('T')[0], received_by: profile.id } : {}) }).eq('id', selectedPO.id)
    }

    setSaving(false)
    setSuccess(true)
    setLines([])
    setNotes('')
    setSelectedPO(null)
    fetchData()
    setTimeout(() => setSuccess(false), 3000)
  }

  const filteredItems = items.filter(i => {
    if (!search) return true
    const q = search.toLowerCase()
    return i.name.toLowerCase().includes(q) || i.barcode?.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q)
  })

  const inputCls = 'w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

  return (
    <div className="p-6 max-w-4xl">
      <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-lg mb-1">Receive Stock</h2>
      <p className="text-sm text-slate-400 mb-5">Add inventory from a purchase order or manually enter items received.</p>

      {success && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-900 rounded-xl text-green-700 dark:text-green-400 text-sm font-medium mb-5">
          <CheckCircle2 size={16} /> Stock received and inventory updated successfully.
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-2 mb-6">
        {[{ k: 'manual', label: 'Manual Receive', icon: PackagePlus }, { k: 'po', label: 'Receive from PO', icon: ClipboardList }].map(m => (
          <button key={m.k} onClick={() => { setMode(m.k); setLines([]); setSelectedPO(null) }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${mode === m.k ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            <m.icon size={15} />{m.label}
          </button>
        ))}
      </div>

      {/* PO selector */}
      {mode === 'po' && (
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Select Open PO</label>
          {openPOs.length === 0 ? (
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-400 text-center">No open purchase orders found.</div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {openPOs.map(po => (
                <button key={po.id} onClick={() => handleSelectPO(po)}
                  className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${selectedPO?.id === po.id ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                  {po.po_number} {po.supply_vendors?.name ? `— ${po.supply_vendors.name}` : ''}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual: search + scan to add items */}
      {mode === 'manual' && (
        <div className="mb-5 flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items to add..." className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 dark:text-slate-100" />
          </div>
          <button onClick={() => setShowScanner(true)} className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-medium transition-colors">
            <ScanLine size={15} /> Scan
          </button>
        </div>
      )}

      {/* Item search results (manual mode) */}
      {mode === 'manual' && search && (
        <div className="mb-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden max-h-48 overflow-y-auto">
          {filteredItems.slice(0, 8).map(item => (
            <button key={item.id} onClick={() => { addLine(item); setSearch('') }}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 text-left transition-colors">
              <div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.name}</div>
                <div className="text-xs text-slate-400">{item.category} · {item.unit}</div>
              </div>
              <span className="text-xs text-slate-400">On hand: {item.quantity_on_hand}</span>
            </button>
          ))}
          {filteredItems.length === 0 && <div className="px-4 py-3 text-sm text-slate-400">No items found</div>}
        </div>
      )}

      {/* Lines to receive */}
      {lines.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Items to Receive</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {lines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-3 px-5 py-3">
                {mode === 'po' && (
                  <input type="checkbox" checked={line.checked || false} onChange={e => setLineVal(idx, 'checked', e.target.checked)} className="w-4 h-4 accent-brand-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{line.description}</div>
                  <div className="text-xs text-slate-400">{line.unit} · Ordered: {line.quantity_ordered ?? '—'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400">Qty</label>
                  <input type="number" min="0" step="0.01" value={line.receive_qty} onChange={e => setLineVal(idx, 'receive_qty', e.target.value)} className="w-20 px-2 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-center" />
                  {mode === 'manual' && (
                    <>
                      <label className="text-xs text-slate-400">Cost $</label>
                      <input type="number" min="0" step="0.01" value={line.unit_cost ?? ''} onChange={e => setLineVal(idx, 'unit_cost', e.target.value)} className="w-24 px-2 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-center" />
                    </>
                  )}
                </div>
                <button onClick={() => removeLine(idx)} className="text-slate-400 hover:text-red-500 flex-shrink-0 transition-colors"><X size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {lines.length > 0 && (
        <>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputCls + ' resize-none'} placeholder="e.g. Partial shipment, invoice #12345..." />
          </div>
          <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium rounded-xl shadow-sm transition-colors">
            <PackagePlus size={16} />
            {saving ? 'Saving...' : `Receive ${mode === 'po' ? lines.filter(l => l.checked).length || 'All' : lines.length} Item${lines.length !== 1 ? 's' : ''}`}
          </button>
        </>
      )}

      {showScanner && <BarcodeScanner title="Scan Item Barcode" onScan={handleScan} onClose={() => setShowScanner(false)} />}
    </div>
  )
}
