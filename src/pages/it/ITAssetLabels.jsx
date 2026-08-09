// ITAssetLabels.jsx — print QR labels for IT assets, mirrors src/pages/supply/SupplyBarcodeLabels.jsx
// Requires: npm install qrcode --legacy-peer-deps (already a dependency)
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import QRCode from 'qrcode'
import { X, Printer, Monitor, Search, CheckSquare, Square } from 'lucide-react'

const LABEL_SIZES = [
  { key: 'small',  label: 'Small  2.5" × 1"',  cols: 3, w: '2.5in', h: '1in',   qr: 64,  fontSize: 7  },
  { key: 'medium', label: 'Medium 4" × 2"',     cols: 2, w: '4in',  h: '2in',   qr: 100, fontSize: 9  },
  { key: 'large',  label: 'Large  4" × 3"',     cols: 2, w: '4in',  h: '3in',   qr: 130, fontSize: 11 },
]

function Label({ item, typeLabel, qrDataUrl, size }) {
  const s = LABEL_SIZES.find(l => l.key === size) || LABEL_SIZES[0]
  return (
    <div style={{
      width: s.w, height: s.h,
      border: '1px solid #ccc', borderRadius: 4,
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px', boxSizing: 'border-box',
      pageBreakInside: 'avoid', breakInside: 'avoid',
      backgroundColor: '#fff', fontFamily: 'sans-serif',
    }}>
      <div style={{ flexShrink: 0 }}>
        {qrDataUrl
          ? <img src={qrDataUrl} alt="QR" style={{ width: s.qr, height: s.qr, display: 'block' }} />
          : <div style={{ width: s.qr, height: s.qr, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#aaa' }}>No code</div>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div style={{ fontWeight: 700, fontSize: s.fontSize + 2, lineHeight: 1.2, marginBottom: 2, wordBreak: 'break-word' }}>
          {item.name}
        </div>
        {typeLabel && (
          <div style={{ fontSize: s.fontSize, color: '#555', marginBottom: 1 }}>{typeLabel}</div>
        )}
        {item.asset_tag && (
          <div style={{ fontSize: s.fontSize, color: '#444', fontFamily: 'monospace' }}>Tag: {item.asset_tag}</div>
        )}
        {item.barcode && item.barcode !== item.asset_tag && (
          <div style={{ fontSize: s.fontSize, color: '#444', fontFamily: 'monospace' }}>{item.barcode}</div>
        )}
        {item.location && (
          <div style={{ fontSize: s.fontSize, color: '#777', marginTop: 1 }}>📍 {item.location}</div>
        )}
      </div>
    </div>
  )
}

export default function ITAssetLabels({ assetTypes, onClose }) {
  const { organization } = useAuth()
  const [items,    setItems]    = useState([])
  const [selected, setSelected] = useState(new Set())
  const [qrMap,    setQrMap]    = useState({})
  const [size,     setSize]     = useState('small')
  const [copies,   setCopies]   = useState(1)
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    const { data } = await supabase.from('it_assets')
      .select('id, name, asset_type, asset_tag, barcode, location')
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .order('asset_tag')
    setItems(data || [])
    setSelected(new Set((data || []).map(i => i.id)))
    setLoading(false)
  }

  async function generateQRCodes(itemList) {
    setGenerating(true)
    const map = {}
    for (const item of itemList) {
      const code = item.barcode || item.asset_tag || item.id
      try {
        map[item.id] = await QRCode.toDataURL(code, {
          width: 200, margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        })
      } catch (e) { map[item.id] = null }
    }
    setQrMap(map)
    setGenerating(false)
  }

  useEffect(() => {
    if (items.length > 0) generateQRCodes(items)
  }, [items])

  const typeLabelFor = (value) => assetTypes.find(t => t.value === value)?.label || value

  const toggleItem = (id) => setSelected(s => {
    const n = new Set(s)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(i => i.id)))
  }

  const filtered = items.filter(i => {
    if (!search) return true
    const q = search.toLowerCase()
    return i.name.toLowerCase().includes(q) || i.asset_tag?.toLowerCase().includes(q) || i.location?.toLowerCase().includes(q)
  })

  const selectedItems = items.filter(i => selected.has(i.id))
  const printItems = []
  selectedItems.forEach(item => {
    for (let c = 0; c < copies; c++) printItems.push(item)
  })

  const s = LABEL_SIZES.find(l => l.key === size) || LABEL_SIZES[0]

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    const labelsHtml = printItems.map(item => {
      const qr = qrMap[item.id]
      const typeLabel = typeLabelFor(item.asset_type)
      return `
        <div style="width:${s.w};height:${s.h};border:1px solid #ccc;border-radius:4px;display:flex;align-items:center;gap:8px;padding:6px;box-sizing:border-box;page-break-inside:avoid;break-inside:avoid;background:#fff;">
          <div style="flex-shrink:0;">
            ${qr ? `<img src="${qr}" style="width:${s.qr}px;height:${s.qr}px;display:block;" />` : `<div style="width:${s.qr}px;height:${s.qr}px;background:#eee;"></div>`}
          </div>
          <div style="flex:1;min-width:0;overflow:hidden;font-family:sans-serif;">
            <div style="font-weight:700;font-size:${s.fontSize + 2}px;line-height:1.2;margin-bottom:2px;word-break:break-word;">${item.name}</div>
            ${typeLabel ? `<div style="font-size:${s.fontSize}px;color:#555;margin-bottom:1px;">${typeLabel}</div>` : ''}
            ${item.asset_tag ? `<div style="font-size:${s.fontSize}px;color:#444;font-family:monospace;">Tag: ${item.asset_tag}</div>` : ''}
            ${item.barcode && item.barcode !== item.asset_tag ? `<div style="font-size:${s.fontSize}px;color:#444;font-family:monospace;">${item.barcode}</div>` : ''}
            ${item.location ? `<div style="font-size:${s.fontSize}px;color:#777;margin-top:1px;">📍 ${item.location}</div>` : ''}
          </div>
        </div>
      `
    }).join('')

    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>IT Asset Labels</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: sans-serif; background: #fff; }
        @page { margin: 0.4in; }
        .grid { display: grid; grid-template-columns: repeat(${s.cols}, auto); gap: 0.15in; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
      <div class="grid">${labelsHtml}</div>
      <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
      </body></html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[94vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div>
            <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100">Print Asset Labels</h2>
            <p className="text-xs text-slate-400 mt-0.5">{selected.size} asset{selected.size !== 1 ? 's' : ''} selected · {printItems.length} label{printItems.length !== 1 ? 's' : ''} total</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={20} /></button>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-64 flex-shrink-0 border-r border-slate-100 dark:border-slate-800 flex flex-col">
            <div className="p-3 border-b border-slate-100 dark:border-slate-800">
              <div className="relative mb-2">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets..." className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <button onClick={toggleAll} className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium">
                {selected.size === filtered.length ? <CheckSquare size={13} /> : <Square size={13} />}
                {selected.size === filtered.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? <div className="p-4 text-xs text-slate-400">Loading...</div> :
                filtered.map(item => (
                  <button key={item.id} onClick={() => toggleItem(item.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-50 dark:border-slate-800 transition-colors ${selected.has(item.id) ? 'bg-brand-50 dark:bg-brand-950/30' : ''}`}>
                    <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${selected.has(item.id) ? 'bg-brand-600 border-brand-600' : 'border-slate-300 dark:border-slate-600'}`}>
                      {selected.has(item.id) && <svg width="8" height="8" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{item.name}</div>
                      <div className="text-xs text-slate-400">{item.asset_tag || '—'}</div>
                    </div>
                  </button>
                ))
              }
            </div>
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-5 flex-wrap">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Label Size</label>
                <select value={size} onChange={e => setSize(e.target.value)} className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  {LABEL_SIZES.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Copies per Asset</label>
                <input type="number" min="1" max="10" value={copies} onChange={e => setCopies(Math.max(1, Math.min(10, Number(e.target.value))))}
                  className="w-20 px-2 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-center" />
              </div>
            </div>

            {/* Preview — chrome background darkens; the label cards themselves stay hardcoded white/light since they mirror the printed output */}
            <div className="flex-1 overflow-auto p-5 bg-slate-50 dark:bg-slate-800">
              {generating ? (
                <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Generating QR codes...</div>
              ) : printItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                  <Monitor size={28} className="mb-2 opacity-30" />
                  <p className="text-sm">Select assets to preview labels</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(s.cols, 2)}, auto)`, gap: '8px' }}>
                  {printItems.slice(0, 12).map((item, i) => (
                    <Label key={`${item.id}-${i}`} item={item} typeLabel={typeLabelFor(item.asset_type)} qrDataUrl={qrMap[item.id]} size={size} />
                  ))}
                  {printItems.length > 12 && (
                    <div className="col-span-2 text-center text-xs text-slate-400 pt-2">
                      + {printItems.length - 12} more label{printItems.length - 12 !== 1 ? 's' : ''} (not shown in preview)
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-slate-400">
            Labels print {s.cols} across · fits standard Avery label sheets
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
            <button onClick={handlePrint} disabled={printItems.length === 0 || generating}
              className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
              <Printer size={15} /> Print {printItems.length} Label{printItems.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
