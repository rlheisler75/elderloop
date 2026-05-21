import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { DollarSign, Search, ScanLine, X, CheckCircle2, User, Printer } from 'lucide-react'
import BarcodeScanner from './BarcodeScanner'

export default function SupplyCashSales() {
  const { organization, profile } = useAuth()
  const [items,    setItems]    = useState([])
  const [staff,    setStaff]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [itemSearch,  setItemSearch]   = useState('')
  const [staffSearch, setStaffSearch]  = useState('')
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [lines,    setLines]    = useState([])
  const [tendered, setTendered] = useState('')
  const [notes,    setNotes]    = useState('')
  const [saving,   setSaving]   = useState(false)
  const [receipt,  setReceipt]  = useState(null)
  const [showScanner, setShowScanner] = useState(false)

  useEffect(() => { if (organization) fetchData() }, [organization])

  async function fetchData() {
    setLoading(true)
    const [itemsRes, staffRes] = await Promise.all([
      supabase.from('supply_items').select('id, name, category, barcode, sku, unit, sale_price, quantity_on_hand').eq('organization_id', organization.id).eq('is_active', true).gt('sale_price', 0).order('name'),
      supabase.from('profiles').select('id, first_name, last_name, role').eq('organization_id', organization.id).eq('is_active', true).order('last_name'),
    ])
    setItems(itemsRes.data || [])
    setStaff(staffRes.data || [])
    setLoading(false)
  }

  const handleScan = (barcode) => {
    setShowScanner(false)
    const item = items.find(i => i.barcode === barcode || i.sku === barcode)
    if (item) addLine(item)
    else alert(`No item found with barcode: ${barcode}`)
  }

  const addLine = (item) => {
    const existing = lines.find(l => l.supply_item_id === item.id)
    if (existing) {
      setLines(l => l.map(line => line.supply_item_id === item.id ? { ...line, quantity: Number(line.quantity) + 1 } : line))
    } else {
      setLines(l => [...l, { supply_item_id: item.id, description: item.name, unit: item.unit, quantity: 1, sale_price: item.sale_price, quantity_on_hand: item.quantity_on_hand }])
    }
    setItemSearch('')
  }

  const removeLine   = (idx) => setLines(l => l.filter((_, i) => i !== idx))
  const setLineQty   = (idx, v) => setLines(l => l.map((line, i) => i === idx ? { ...line, quantity: v } : line))
  const setLinePrice = (idx, v) => setLines(l => l.map((line, i) => i === idx ? { ...line, sale_price: v } : line))

  const total    = lines.reduce((s, l) => s + (Number(l.quantity) * Number(l.sale_price || 0)), 0)
  const change   = Number(tendered) - total
  const canSubmit = lines.length > 0 && selectedStaff && Number(tendered) >= total

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSaving(true)

    for (const line of lines) {
      const qty    = Number(line.quantity)
      const before = Number(line.quantity_on_hand)
      const after  = Math.max(0, before - qty)
      await supabase.from('supply_items').update({ quantity_on_hand: after }).eq('id', line.supply_item_id)
      await supabase.from('supply_transactions').insert({
        organization_id: organization.id,
        supply_item_id:  line.supply_item_id,
        transaction_type: 'cash_sale',
        quantity:        -qty,
        quantity_before: before,
        quantity_after:  after,
        sale_price:      Number(line.sale_price),
        amount_tendered: Number(tendered) / lines.length,
        staff_id:        selectedStaff.id,
        performed_by:    profile.id,
        notes:           notes || null,
      })
    }

    const receiptData = {
      date: new Date().toLocaleString(),
      buyer: `${selectedStaff.first_name} ${selectedStaff.last_name}`,
      lines: [...lines],
      total,
      tendered: Number(tendered),
      change: Math.max(0, change),
      notes,
    }

    setSaving(false)
    setReceipt(receiptData)
    setLines([])
    setTendered('')
    setNotes('')
    setSelectedStaff(null)
    fetchData()
  }

  const filteredItems = items.filter(i => {
    if (!itemSearch) return false
    const q = itemSearch.toLowerCase()
    return i.name.toLowerCase().includes(q) || i.barcode?.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q)
  })

  const filteredStaff = staff.filter(s => {
    if (!staffSearch) return false
    const q = staffSearch.toLowerCase()
    return `${s.first_name} ${s.last_name}`.toLowerCase().includes(q)
  })

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

  return (
    <div className="p-6 max-w-4xl">
      <h2 className="font-display font-semibold text-slate-800 text-lg mb-1">Cash Sales</h2>
      <p className="text-sm text-slate-400 mb-5">Record personal purchases by employees. Items must have a sale price set.</p>

      {/* Receipt modal */}
      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-5 border-b border-slate-100 text-center">
              <CheckCircle2 size={32} className="mx-auto mb-2 text-green-500" />
              <h2 className="font-display font-semibold text-slate-800 text-lg">Sale Complete</h2>
              <p className="text-xs text-slate-400 mt-0.5">{receipt.date}</p>
            </div>
            <div className="px-6 py-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Buyer</span><span className="font-medium text-slate-800">{receipt.buyer}</span></div>
              <div className="border-t border-slate-100 pt-2 mt-2 space-y-1">
                {receipt.lines.map((l, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-600">{l.description} × {l.quantity}</span>
                    <span className="text-slate-800">${(Number(l.quantity) * Number(l.sale_price)).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 pt-2 space-y-1">
                <div className="flex justify-between text-sm font-semibold"><span>Total</span><span>${receipt.total.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Tendered</span><span>${receipt.tendered.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm font-semibold text-green-600"><span>Change</span><span>${receipt.change.toFixed(2)}</span></div>
              </div>
              {receipt.notes && <div className="text-xs text-slate-400 italic">{receipt.notes}</div>}
            </div>
            <div className="px-6 pb-5 flex gap-2">
              <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50"><Printer size={14} /> Print</button>
              <button onClick={() => setReceipt(null)} className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">New Sale</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Item selection */}
        <div>
          {/* Staff buyer */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Buyer (Staff)</label>
            {selectedStaff ? (
              <div className="flex items-center gap-3 p-3 bg-brand-50 border border-brand-200 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {selectedStaff.first_name[0]}{selectedStaff.last_name[0]}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-800 text-sm">{selectedStaff.first_name} {selectedStaff.last_name}</div>
                  <div className="text-xs text-slate-400 capitalize">{selectedStaff.role?.replace('_', ' ')}</div>
                </div>
                <button onClick={() => setSelectedStaff(null)} className="text-slate-400 hover:text-red-500"><X size={16} /></button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={staffSearch} onChange={e => setStaffSearch(e.target.value)} placeholder="Search staff member..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
                </div>
                {staffSearch && (
                  <div className="mt-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden max-h-36 overflow-y-auto">
                    {filteredStaff.slice(0, 6).map(s => (
                      <button key={s.id} onClick={() => { setSelectedStaff(s); setStaffSearch('') }} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 text-left">
                        <span className="text-sm font-medium text-slate-800">{s.first_name} {s.last_name}</span>
                        <span className="text-xs text-slate-400 capitalize">{s.role?.replace('_', ' ')}</span>
                      </button>
                    ))}
                    {filteredStaff.length === 0 && <div className="px-4 py-3 text-sm text-slate-400">No staff found</div>}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Item search */}
          <div className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder="Search items for sale..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
            </div>
            <button onClick={() => setShowScanner(true)} className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-medium transition-colors">
              <ScanLine size={15} /> Scan
            </button>
          </div>
          {itemSearch && (
            <div className="mb-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden max-h-48 overflow-y-auto">
              {filteredItems.slice(0, 8).map(item => (
                <button key={item.id} onClick={() => addLine(item)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 text-left">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{item.name}</div>
                    <div className="text-xs text-slate-400">{item.unit}</div>
                  </div>
                  <span className="text-sm font-semibold text-green-700">${Number(item.sale_price).toFixed(2)}</span>
                </button>
              ))}
              {filteredItems.length === 0 && <div className="px-4 py-3 text-sm text-slate-400">No saleable items found</div>}
            </div>
          )}

          {items.length === 0 && !loading && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
              No items have a sale price set. Add a sale price to items in the Inventory tab to enable cash sales.
            </div>
          )}
        </div>

        {/* Right: Cart / checkout */}
        <div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-4">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cart</span>
              {lines.length > 0 && <button onClick={() => setLines([])} className="text-xs text-red-500 hover:text-red-700">Clear all</button>}
            </div>
            {lines.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <DollarSign size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No items added yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {lines.map((line, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-800">{line.description}</div>
                    </div>
                    <input type="number" min="1" value={line.quantity} onChange={e => setLineQty(idx, e.target.value)} className="w-14 px-2 py-1 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500" />
                    <span className="text-xs text-slate-400">×</span>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                      <input type="number" min="0" step="0.01" value={line.sale_price} onChange={e => setLinePrice(idx, e.target.value)} className="w-20 pl-5 pr-2 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                    </div>
                    <span className="text-sm font-semibold text-slate-800 w-16 text-right">${(Number(line.quantity) * Number(line.sale_price || 0)).toFixed(2)}</span>
                    <button onClick={() => removeLine(idx)} className="text-slate-400 hover:text-red-500 flex-shrink-0"><X size={14} /></button>
                  </div>
                ))}
                <div className="px-4 py-3 bg-slate-50 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Total</span>
                  <span className="font-display font-bold text-slate-800 text-lg">${total.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {lines.length > 0 && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Amount Tendered ($)</label>
                <input type="number" min={total} step="0.01" value={tendered} onChange={e => setTendered(e.target.value)} className={inputCls} placeholder="0.00" />
                {tendered && Number(tendered) >= total && (
                  <div className="mt-1.5 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Change due</span>
                    <span className="font-semibold text-green-600">${Math.max(0, change).toFixed(2)}</span>
                  </div>
                )}
                {tendered && Number(tendered) < total && (
                  <p className="mt-1 text-xs text-red-500">Amount is less than total</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} placeholder="Optional notes..." />
              </div>
              <button onClick={handleSubmit} disabled={!canSubmit || saving}
                className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium rounded-xl shadow-sm transition-colors">
                <DollarSign size={16} />
                {saving ? 'Processing...' : `Complete Sale — $${total.toFixed(2)}`}
              </button>
            </div>
          )}
        </div>
      </div>

      {showScanner && <BarcodeScanner title="Scan Item Barcode" onScan={handleScan} onClose={() => setShowScanner(false)} />}
    </div>
  )
}
