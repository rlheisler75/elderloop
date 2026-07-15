import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { PackageMinus, Search, ScanLine, CheckCircle2, X, User, Building2, QrCode } from 'lucide-react'
import BarcodeScanner from './BarcodeScanner'

const DEPARTMENTS = ['Nursing','Housekeeping','Dietary','Maintenance','Administration','Activities','Transportation']

export default function SupplyIssue() {
  const { organization, profile } = useAuth()
  const [issueType, setIssueType]   = useState('dept')  // 'dept' | 'resident'
  const [items,     setItems]       = useState([])
  const [residents, setResidents]   = useState([])
  const [loading,   setLoading]     = useState(true)
  const [itemSearch, setItemSearch] = useState('')
  const [resSearch,  setResSearch]  = useState('')
  const [selectedResident, setSelectedResident] = useState(null)
  const [selectedDept,     setSelectedDept]     = useState('')
  const [lines,    setLines]        = useState([])
  const [notes,    setNotes]        = useState('')
  const [saving,   setSaving]       = useState(false)
  const [success,  setSuccess]      = useState(false)
  const [scanMode, setScanMode]     = useState(null) // 'item' | 'resident'

  useEffect(() => { if (organization) fetchData() }, [organization])

  async function fetchData() {
    setLoading(true)
    const [itemsRes, residentsRes] = await Promise.all([
      supabase.from('supply_items').select('id, name, category, barcode, sku, unit, quantity_on_hand, is_resident_chargeable').eq('organization_id', organization.id).eq('is_active', true).order('name'),
      supabase.from('residents').select('id, first_name, last_name, room, barcode').eq('organization_id', organization.id).eq('is_active', true).order('last_name'),
    ])
    setItems(itemsRes.data || [])
    setResidents(residentsRes.data || [])
    setLoading(false)
  }

  const handleScan = (barcode) => {
    setScanMode(null)
    if (scanMode === 'resident') {
      const res = residents.find(r => r.barcode === barcode)
      if (res) setSelectedResident(res)
      else alert(`No resident found with barcode: ${barcode}`)
    } else {
      const item = items.find(i => i.barcode === barcode || i.sku === barcode)
      if (item) addLine(item)
      else alert(`No item found with barcode: ${barcode}`)
    }
  }

  const addLine = (item) => {
    if (lines.find(l => l.supply_item_id === item.id)) return
    setLines(l => [...l, { supply_item_id: item.id, description: item.name, unit: item.unit, quantity: 1, quantity_on_hand: item.quantity_on_hand }])
    setItemSearch('')
  }

  const removeLine   = (idx) => setLines(l => l.filter((_, i) => i !== idx))
  const setLineQty   = (idx, v) => setLines(l => l.map((line, i) => i === idx ? { ...line, quantity: v } : line))

  const handleSubmit = async () => {
    const validLines = lines.filter(l => l.supply_item_id && Number(l.quantity) > 0)
    if (validLines.length === 0) { alert('Add at least one item.'); return }
    if (issueType === 'dept' && !selectedDept) { alert('Select a department.'); return }
    if (issueType === 'resident' && !selectedResident) { alert('Select a resident.'); return }
    setSaving(true)

    for (const line of validLines) {
      const qty    = Number(line.quantity)
      const before = Number(line.quantity_on_hand)
      const after  = Math.max(0, before - qty)
      await supabase.from('supply_items').update({ quantity_on_hand: after }).eq('id', line.supply_item_id)
      await supabase.from('supply_transactions').insert({
        organization_id: organization.id,
        supply_item_id: line.supply_item_id,
        transaction_type: issueType === 'resident' ? 'issue_resident' : 'issue_dept',
        quantity: -qty,
        quantity_before: before,
        quantity_after: after,
        department: issueType === 'dept' ? selectedDept : null,
        resident_id: issueType === 'resident' ? selectedResident.id : null,
        performed_by: profile.id,
        notes: notes || null,
      })
    }

    setSaving(false)
    setSuccess(true)
    setLines([])
    setNotes('')
    setSelectedResident(null)
    setSelectedDept('')
    fetchData()
    setTimeout(() => setSuccess(false), 3000)
  }

  const filteredItems = items.filter(i => {
    if (issueType === 'resident' && !i.is_resident_chargeable) return false
    if (!itemSearch) return false
    const q = itemSearch.toLowerCase()
    return i.name.toLowerCase().includes(q) || i.barcode?.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q)
  })

  const filteredResidents = residents.filter(r => {
    if (!resSearch) return false
    const q = resSearch.toLowerCase()
    return `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) || r.room?.toLowerCase().includes(q)
  })

  return (
    <div className="p-6 max-w-4xl">
      <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-lg mb-1">Issue / Checkout</h2>
      <p className="text-sm text-slate-400 mb-5">Issue supplies to a department or charge to a resident.</p>

      {success && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-900 rounded-xl text-green-700 dark:text-green-400 text-sm font-medium mb-5">
          <CheckCircle2 size={16} /> Items issued and inventory updated.
        </div>
      )}

      {/* Issue type */}
      <div className="flex gap-2 mb-6">
        {[{ k: 'dept', label: 'Department', icon: Building2 }, { k: 'resident', label: 'Resident', icon: User }].map(m => (
          <button key={m.k} onClick={() => { setIssueType(m.k); setLines([]) }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${issueType === m.k ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            <m.icon size={15} />{m.label}
          </button>
        ))}
      </div>

      {/* Department selector */}
      {issueType === 'dept' && (
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Department</label>
          <div className="flex gap-2 flex-wrap">
            {DEPARTMENTS.map(d => (
              <button key={d} onClick={() => setSelectedDept(d)}
                className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-all ${selectedDept === d ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resident selector */}
      {issueType === 'resident' && (
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Resident</label>
          {selectedResident ? (
            <div className="flex items-center gap-3 p-3 bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {selectedResident.first_name[0]}{selectedResident.last_name[0]}
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-800 dark:text-slate-100">{selectedResident.first_name} {selectedResident.last_name}</div>
                {selectedResident.room && <div className="text-xs text-slate-500 dark:text-slate-400">Room {selectedResident.room}</div>}
              </div>
              <button onClick={() => setSelectedResident(null)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={16} /></button>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={resSearch} onChange={e => setResSearch(e.target.value)} placeholder="Search resident by name or room..." className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 dark:text-slate-100" />
              </div>
              <button onClick={() => setScanMode('resident')} className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-medium transition-colors">
                <QrCode size={15} /> Scan ID
              </button>
            </div>
          )}
          {resSearch && !selectedResident && (
            <div className="mt-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden max-h-40 overflow-y-auto">
              {filteredResidents.slice(0, 6).map(r => (
                <button key={r.id} onClick={() => { setSelectedResident(r); setResSearch('') }}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 text-left">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{r.first_name} {r.last_name}</div>
                  {r.room && <span className="text-xs text-slate-400">Room {r.room}</span>}
                </button>
              ))}
              {filteredResidents.length === 0 && <div className="px-4 py-3 text-sm text-slate-400">No residents found</div>}
            </div>
          )}
        </div>
      )}

      {/* Item search + scan */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={itemSearch} onChange={e => setItemSearch(e.target.value)}
            placeholder={issueType === 'resident' ? 'Search chargeable items...' : 'Search items to issue...'}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 dark:text-slate-100" />
        </div>
        <button onClick={() => setScanMode('item')} className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-medium transition-colors">
          <ScanLine size={15} /> Scan
        </button>
      </div>

      {/* Item search results */}
      {itemSearch && (
        <div className="mb-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden max-h-48 overflow-y-auto">
          {filteredItems.slice(0, 8).map(item => (
            <button key={item.id} onClick={() => addLine(item)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 text-left transition-colors">
              <div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.name}</div>
                <div className="text-xs text-slate-400">{item.category} · {item.unit}</div>
              </div>
              <span className={`text-xs font-medium ${Number(item.quantity_on_hand) <= 0 ? 'text-red-500' : 'text-slate-400'}`}>
                {Number(item.quantity_on_hand) <= 0 ? 'Out of stock' : `On hand: ${item.quantity_on_hand}`}
              </span>
            </button>
          ))}
          {filteredItems.length === 0 && <div className="px-4 py-3 text-sm text-slate-400">{issueType === 'resident' ? 'No chargeable items found' : 'No items found'}</div>}
        </div>
      )}

      {/* Issue lines */}
      {lines.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Items to Issue</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {lines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{line.description}</div>
                  <div className="text-xs text-slate-400">On hand: {line.quantity_on_hand} {line.unit}</div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400">Qty</label>
                  <input type="number" min="1" max={line.quantity_on_hand} value={line.quantity} onChange={e => setLineQty(idx, e.target.value)}
                    className="w-20 px-2 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-center" />
                  <span className="text-xs text-slate-400">{line.unit}</span>
                </div>
                {Number(line.quantity) > Number(line.quantity_on_hand) && (
                  <span className="text-xs text-amber-600 font-medium">Over stock!</span>
                )}
                <button onClick={() => removeLine(idx)} className="text-slate-400 hover:text-red-500 flex-shrink-0 transition-colors"><X size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {lines.length > 0 && (
        <>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" placeholder="Optional notes..." />
          </div>
          <button onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white font-medium rounded-xl shadow-sm transition-colors">
            <PackageMinus size={16} />
            {saving ? 'Saving...' : `Issue ${lines.length} Item${lines.length !== 1 ? 's' : ''}${issueType === 'dept' ? ` to ${selectedDept || 'Department'}` : selectedResident ? ` to ${selectedResident.first_name}` : ''}`}
          </button>
        </>
      )}

      {scanMode && <BarcodeScanner title={scanMode === 'resident' ? 'Scan Resident ID' : 'Scan Item Barcode'} onScan={handleScan} onClose={() => setScanMode(null)} />}
    </div>
  )
}
