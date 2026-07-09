// MeterBarcodeLabels.jsx
// Requires: npm install qrcode --legacy-peer-deps
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import QRCode from 'qrcode'
import { X, Printer, Gauge, Search, CheckSquare, Square, AlertCircle } from 'lucide-react'

const LABEL_SIZES = [
  { key: 'small',  label: 'Small  2.5" × 1"',  cols: 3, w: '2.5in', h: '1in',   qr: 64,  fontSize: 7  },
  { key: 'medium', label: 'Medium 4" × 2"',     cols: 2, w: '4in',  h: '2in',   qr: 100, fontSize: 9  },
  { key: 'large',  label: 'Large  4" × 3"',     cols: 2, w: '4in',  h: '3in',   qr: 130, fontSize: 11 },
]

function Label({ meter, utilityType, qrDataUrl, orgName, size }) {
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
        <div style={{ fontSize: s.fontSize - 1, color: '#1e3a5f', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {orgName}
        </div>
        <div style={{ fontWeight: 700, fontSize: s.fontSize + 2, lineHeight: 1.2, margin: '2px 0', wordBreak: 'break-word' }}>
          {meter.resident_name || `Unit ${meter.unit}`}
        </div>
        {(meter.building || meter.unit) && (
          <div style={{ fontSize: s.fontSize, color: '#555' }}>{[meter.building, meter.unit ? `Unit ${meter.unit}` : null].filter(Boolean).join(' · ')}</div>
        )}
        {utilityType && (
          <div style={{ fontSize: s.fontSize, color: '#555' }}>{utilityType.name}</div>
        )}
        <div style={{ fontSize: s.fontSize, color: '#444', fontFamily: 'monospace' }}>#{meter.meter_number}</div>
      </div>
    </div>
  )
}

export default function MeterBarcodeLabels({ onClose }) {
  const { organization } = useAuth()
  const [meters,       setMeters]       = useState([])
  const [utilityTypes, setUtilityTypes] = useState([])
  const [selected,     setSelected]     = useState(new Set())
  const [qrMap,        setQrMap]        = useState({})
  const [size,         setSize]         = useState('small')
  const [copies,       setCopies]       = useState(1)
  const [search,       setSearch]       = useState('')
  const [typeFilter,   setTypeFilter]   = useState('all')
  const [loading,      setLoading]      = useState(true)
  const [generating,   setGenerating]   = useState(false)

  useEffect(() => { fetchMeters() }, [])

  async function fetchMeters() {
    const [mRes, utRes] = await Promise.all([
      supabase.from('meters').select('id, meter_number, resident_name, unit, building, utility_type_id')
        .eq('organization_id', organization.id).eq('is_active', true).order('unit'),
      supabase.from('utility_types').select('id, name').eq('organization_id', organization.id),
    ])
    const meterList = mRes.data || []
    setMeters(meterList)
    setUtilityTypes(utRes.data || [])
    // Select all meters that already have a meter number
    setSelected(new Set(meterList.filter(m => m.meter_number).map(m => m.id)))
    setLoading(false)
  }

  async function generateQRCodes(meterList) {
    setGenerating(true)
    const map = {}
    for (const m of meterList) {
      if (!m.meter_number) continue
      try {
        map[m.id] = await QRCode.toDataURL(m.meter_number, {
          width: 200, margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        })
      } catch (e) { map[m.id] = null }
    }
    setQrMap(map)
    setGenerating(false)
  }

  useEffect(() => {
    if (meters.length > 0) generateQRCodes(meters)
  }, [meters])

  const toggleMeter = (id) => setSelected(s => {
    const n = new Set(s)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  const toggleAll = () => {
    const selectable = filtered.filter(m => m.meter_number).map(m => m.id)
    if (selectable.every(id => selected.has(id)) && selectable.length > 0) {
      setSelected(s => { const n = new Set(s); selectable.forEach(id => n.delete(id)); return n })
    } else {
      setSelected(s => new Set([...s, ...selectable]))
    }
  }

  const filtered = meters.filter(m => {
    if (typeFilter !== 'all' && m.utility_type_id !== typeFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return `${m.resident_name || ''} ${m.unit || ''} ${m.building || ''} ${m.meter_number || ''}`.toLowerCase().includes(q)
  })

  const noNumberCount = filtered.filter(m => !m.meter_number).length
  const selectedMeters = meters.filter(m => selected.has(m.id))
  const printMeters = []
  selectedMeters.forEach(m => { for (let c = 0; c < copies; c++) printMeters.push(m) })

  const s = LABEL_SIZES.find(l => l.key === size) || LABEL_SIZES[0]
  const typeOf = (m) => utilityTypes.find(t => t.id === m.utility_type_id)

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    const labelsHtml = printMeters.map(m => {
      const qr = qrMap[m.id]
      const t = typeOf(m)
      return `
        <div style="width:${s.w};height:${s.h};border:1px solid #ccc;border-radius:4px;display:flex;align-items:center;gap:8px;padding:6px;box-sizing:border-box;page-break-inside:avoid;break-inside:avoid;background:#fff;">
          <div style="flex-shrink:0;">
            ${qr ? `<img src="${qr}" style="width:${s.qr}px;height:${s.qr}px;display:block;" />` : `<div style="width:${s.qr}px;height:${s.qr}px;background:#eee;"></div>`}
          </div>
          <div style="flex:1;min-width:0;overflow:hidden;font-family:sans-serif;">
            <div style="font-size:${s.fontSize - 1}px;color:#1e3a5f;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">${organization.name}</div>
            <div style="font-weight:700;font-size:${s.fontSize + 2}px;line-height:1.2;margin:2px 0;word-break:break-word;">${m.resident_name || `Unit ${m.unit}`}</div>
            ${(m.building || m.unit) ? `<div style="font-size:${s.fontSize}px;color:#555;">${[m.building, m.unit ? `Unit ${m.unit}` : null].filter(Boolean).join(' · ')}</div>` : ''}
            ${t ? `<div style="font-size:${s.fontSize}px;color:#555;">${t.name}</div>` : ''}
            <div style="font-size:${s.fontSize}px;color:#444;font-family:monospace;">#${m.meter_number}</div>
          </div>
        </div>
      `
    }).join('')

    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Meter Labels</title>
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[94vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-display font-semibold text-slate-800">Print Meter Barcodes</h2>
            <p className="text-xs text-slate-400 mt-0.5">{selected.size} meter{selected.size !== 1 ? 's' : ''} selected · {printMeters.length} label{printMeters.length !== 1 ? 's' : ''} total</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        {noNumberCount > 0 && (
          <div className="mx-6 mt-4 flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm flex-shrink-0">
            <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-medium text-amber-800">{noNumberCount} meter{noNumberCount > 1 ? 's' : ''} don't have a meter number yet.</span>
              <span className="text-amber-700"> Add the physical meter number to the meter before printing its barcode.</span>
            </div>
          </div>
        )}

        <div className="flex flex-1 min-h-0 mt-4">
          {/* Left — meter selector */}
          <div className="w-64 flex-shrink-0 border-r border-slate-100 flex flex-col">
            <div className="p-3 border-b border-slate-100 space-y-2">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search meters..." className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="all">All utility types</option>
                {utilityTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <button onClick={toggleAll} className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium">
                <CheckSquare size={13} /> Select / deselect all
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? <div className="p-4 text-xs text-slate-400">Loading...</div> :
                filtered.map(m => (
                  <button key={m.id} onClick={() => m.meter_number && toggleMeter(m.id)} disabled={!m.meter_number}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left border-b border-slate-50 transition-colors ${!m.meter_number ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'} ${selected.has(m.id) ? 'bg-brand-50' : ''}`}>
                    <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${selected.has(m.id) ? 'bg-brand-600 border-brand-600' : 'border-slate-300'}`}>
                      {selected.has(m.id) && <svg width="8" height="8" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-700 truncate">{m.resident_name || `Unit ${m.unit}`}</div>
                      <div className="text-xs text-slate-400">{m.meter_number ? `#${m.meter_number}` : 'No meter number'}</div>
                    </div>
                  </button>
                ))
              }
            </div>
          </div>

          {/* Right — options + preview */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-5 flex-wrap">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Label Size</label>
                <select value={size} onChange={e => setSize(e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  {LABEL_SIZES.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Copies per Meter</label>
                <input type="number" min="1" max="10" value={copies} onChange={e => setCopies(Math.max(1, Math.min(10, Number(e.target.value))))}
                  className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-center" />
              </div>
            </div>

            <div className="flex-1 overflow-auto p-5 bg-slate-50">
              {generating ? (
                <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Generating QR codes...</div>
              ) : printMeters.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                  <Gauge size={28} className="mb-2 opacity-30" />
                  <p className="text-sm">Select meters to preview labels</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(s.cols, 2)}, auto)`, gap: '8px' }}>
                  {printMeters.slice(0, 12).map((m, i) => (
                    <Label key={`${m.id}-${i}`} meter={m} utilityType={typeOf(m)} qrDataUrl={qrMap[m.id]} orgName={organization.name} size={size} />
                  ))}
                  {printMeters.length > 12 && (
                    <div className="col-span-2 text-center text-xs text-slate-400 pt-2">
                      + {printMeters.length - 12} more label{printMeters.length - 12 !== 1 ? 's' : ''} (not shown in preview)
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-slate-400">
            Labels print {s.cols} across · scan with "Scan Meter" to jump straight to entering a reading
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium hover:bg-slate-50 rounded-lg">Cancel</button>
            <button onClick={handlePrint} disabled={printMeters.length === 0 || generating}
              className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
              <Printer size={15} /> Print {printMeters.length} Label{printMeters.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
