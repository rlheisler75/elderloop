// ResidentBarcodeLabels.jsx
// Requires: npm install qrcode --legacy-peer-deps
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import QRCode from 'qrcode'
import { X, Printer, User, Search, CheckSquare, Square, AlertCircle } from 'lucide-react'

const LABEL_SIZES = [
  { key: 'badge',  label: 'ID Badge  3.5" × 2.25"', cols: 2, w: '3.5in', h: '2.25in', qr: 110, fontSize: 11 },
  { key: 'small',  label: 'Small     2.5" × 1.5"',  cols: 3, w: '2.5in', h: '1.5in',  qr: 72,  fontSize: 8  },
  { key: 'large',  label: 'Large     4" × 3"',       cols: 2, w: '4in',  h: '3in',    qr: 150, fontSize: 13 },
]

// Generate a random barcode string for residents who don't have one
function genBarcode() {
  return 'RES-' + Math.random().toString(36).substring(2, 10).toUpperCase()
}

function ResidentLabel({ resident, qrDataUrl, orgName, size }) {
  const s = LABEL_SIZES.find(l => l.key === size) || LABEL_SIZES[0]
  const name = `${resident.first_name} ${resident.last_name}`
  return (
    <div style={{
      width: s.w, height: s.h,
      border: '2px solid #1e3a5f', borderRadius: 8,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 6, padding: '10px',
      boxSizing: 'border-box', pageBreakInside: 'avoid',
      breakInside: 'avoid', backgroundColor: '#fff',
      fontFamily: 'sans-serif', textAlign: 'center',
    }}>
      {/* Community name */}
      <div style={{ fontSize: s.fontSize - 3, color: '#1e3a5f', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
        {orgName}
      </div>
      {/* QR code */}
      {qrDataUrl
        ? <img src={qrDataUrl} alt="QR" style={{ width: s.qr, height: s.qr, display: 'block' }} />
        : <div style={{ width: s.qr, height: s.qr, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#999', borderRadius: 4 }}>No code</div>
      }
      {/* Resident name */}
      <div style={{ fontWeight: 700, fontSize: s.fontSize + 1, lineHeight: 1.2, color: '#111' }}>
        {name}
      </div>
      {/* Room */}
      {resident.room && (
        <div style={{ fontSize: s.fontSize - 1, color: '#555' }}>
          Room {resident.room}
        </div>
      )}
      {/* Barcode value small text */}
      {resident.barcode && (
        <div style={{ fontSize: s.fontSize - 3, color: '#aaa', fontFamily: 'monospace', marginTop: 2 }}>
          {resident.barcode}
        </div>
      )}
    </div>
  )
}

export default function ResidentBarcodeLabels({ onClose }) {
  const { organization } = useAuth()
  const [residents, setResidents] = useState([])
  const [selected,  setSelected]  = useState(new Set())
  const [qrMap,     setQrMap]     = useState({})
  const [size,      setSize]      = useState('badge')
  const [search,    setSearch]    = useState('')
  const [loading,   setLoading]   = useState(true)
  const [generating, setGenerating] = useState(false)
  const [assigning,  setAssigning]  = useState(false)
  const [noBarcode,  setNoBarcode]  = useState([])

  useEffect(() => { fetchResidents() }, [])

  async function fetchResidents() {
    const { data } = await supabase.from('residents')
      .select('id, first_name, last_name, room, barcode')
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .order('last_name')
    setResidents(data || [])
    setSelected(new Set((data || []).map(r => r.id)))
    setNoBarcode((data || []).filter(r => !r.barcode).map(r => r.id))
    setLoading(false)
  }

  // Auto-assign barcodes to residents who don't have one and save to DB
  async function assignMissingBarcodes() {
    setAssigning(true)
    const missing = residents.filter(r => !r.barcode)
    const updates = []
    for (const r of missing) {
      const code = genBarcode()
      await supabase.from('residents').update({ barcode: code }).eq('id', r.id)
      updates.push({ id: r.id, barcode: code })
    }
    setResidents(prev => prev.map(r => {
      const u = updates.find(u => u.id === r.id)
      return u ? { ...r, barcode: u.barcode } : r
    }))
    setNoBarcode([])
    setAssigning(false)
  }

  async function generateQRCodes(residentList) {
    setGenerating(true)
    const map = {}
    for (const r of residentList) {
      const code = r.barcode || r.id
      try {
        map[r.id] = await QRCode.toDataURL(code, {
          width: 200, margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'H',
        })
      } catch (e) { map[r.id] = null }
    }
    setQrMap(map)
    setGenerating(false)
  }

  useEffect(() => {
    if (residents.length > 0) generateQRCodes(residents)
  }, [residents])

  const toggleResident = (id) => setSelected(s => {
    const n = new Set(s)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(r => r.id)))
  }

  const filtered = residents.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    return `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) || r.room?.toLowerCase().includes(q)
  })

  const selectedResidents = residents.filter(r => selected.has(r.id))
  const s = LABEL_SIZES.find(l => l.key === size) || LABEL_SIZES[0]

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    const labelsHtml = selectedResidents.map(r => {
      const qr   = qrMap[r.id]
      const name = `${r.first_name} ${r.last_name}`
      return `
        <div style="width:${s.w};height:${s.h};border:2px solid #1e3a5f;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:10px;box-sizing:border-box;page-break-inside:avoid;break-inside:avoid;background:#fff;font-family:sans-serif;text-align:center;">
          <div style="font-size:${s.fontSize - 3}px;color:#1e3a5f;font-weight:600;letter-spacing:1px;text-transform:uppercase;">${organization.name}</div>
          ${qr ? `<img src="${qr}" style="width:${s.qr}px;height:${s.qr}px;display:block;" />` : `<div style="width:${s.qr}px;height:${s.qr}px;background:#f0f0f0;border-radius:4px;"></div>`}
          <div style="font-weight:700;font-size:${s.fontSize + 1}px;line-height:1.2;color:#111;">${name}</div>
          ${r.room ? `<div style="font-size:${s.fontSize - 1}px;color:#555;">Room ${r.room}</div>` : ''}
          ${r.barcode ? `<div style="font-size:${s.fontSize - 3}px;color:#aaa;font-family:monospace;">${r.barcode}</div>` : ''}
        </div>
      `
    }).join('')

    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Resident ID Labels</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: sans-serif; background: #fff; }
        @page { margin: 0.4in; }
        .grid { display: grid; grid-template-columns: repeat(${s.cols}, auto); gap: 0.2in; }
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

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div>
            <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100">Print Resident ID Labels</h2>
            <p className="text-xs text-slate-400 mt-0.5">{selected.size} resident{selected.size !== 1 ? 's' : ''} selected</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={20} /></button>
        </div>

        {/* No barcode warning */}
        {noBarcode.length > 0 && (
          <div className="mx-6 mt-4 flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 rounded-xl text-sm">
            <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-medium text-amber-800 dark:text-amber-400">{noBarcode.length} resident{noBarcode.length > 1 ? 's' : ''} don't have a barcode yet.</span>
              <span className="text-amber-700 dark:text-amber-400"> QR codes will use their internal ID until a barcode is assigned.</span>
            </div>
            <button onClick={assignMissingBarcodes} disabled={assigning}
              className="flex-shrink-0 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50">
              {assigning ? 'Assigning...' : 'Auto-assign all'}
            </button>
          </div>
        )}

        <div className="flex flex-1 min-h-0 mt-4">
          {/* Left — resident selector */}
          <div className="w-56 flex-shrink-0 border-r border-slate-100 dark:border-slate-800 flex flex-col">
            <div className="p-3 border-b border-slate-100 dark:border-slate-800">
              <div className="relative mb-2">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search residents..." className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <button onClick={toggleAll} className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium">
                {selected.size === filtered.length ? <CheckSquare size={13} /> : <Square size={13} />}
                {selected.size === filtered.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? <div className="p-4 text-xs text-slate-400">Loading...</div> :
                filtered.map(r => (
                  <button key={r.id} onClick={() => toggleResident(r.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-50 dark:border-slate-800 transition-colors ${selected.has(r.id) ? 'bg-brand-50 dark:bg-brand-950/30' : ''}`}>
                    <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${selected.has(r.id) ? 'bg-brand-600 border-brand-600' : 'border-slate-300 dark:border-slate-600'}`}>
                      {selected.has(r.id) && <svg width="8" height="8" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{r.first_name} {r.last_name}</div>
                      <div className="flex items-center gap-1">
                        {r.room && <span className="text-xs text-slate-400">Room {r.room}</span>}
                        {!r.barcode && <span className="text-xs text-amber-500">No barcode</span>}
                      </div>
                    </div>
                  </button>
                ))
              }
            </div>
          </div>

          {/* Right — options + preview */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Options */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Label Size</label>
              <div className="flex gap-2 flex-wrap">
                {LABEL_SIZES.map(l => (
                  <button key={l.key} onClick={() => setSize(l.key)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${size === l.key ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview — chrome background darkens; the label cards themselves stay hardcoded white/light since they mirror the printed output */}
            <div className="flex-1 overflow-auto p-5 bg-slate-50 dark:bg-slate-800">
              {generating ? (
                <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Generating QR codes...</div>
              ) : selectedResidents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                  <User size={28} className="mb-2 opacity-30" />
                  <p className="text-sm">Select residents to preview labels</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(s.cols, 2)}, auto)`, gap: '12px' }}>
                  {selectedResidents.slice(0, 6).map(r => (
                    <ResidentLabel key={r.id} resident={r} qrDataUrl={qrMap[r.id]} orgName={organization.name} size={size} />
                  ))}
                  {selectedResidents.length > 6 && (
                    <div className="col-span-2 text-center text-xs text-slate-400 pt-2">
                      + {selectedResidents.length - 6} more (not shown in preview)
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-slate-400">
            Scan printed QR codes in Issue / Checkout to charge supplies to residents
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
            <button onClick={handlePrint} disabled={selectedResidents.length === 0 || generating}
              className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
              <Printer size={15} /> Print {selectedResidents.length} Label{selectedResidents.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
