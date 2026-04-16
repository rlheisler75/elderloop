import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Upload, X, Check, AlertTriangle, Download, ChevronRight,
  FileSpreadsheet, Users, RefreshCw, Info, ChevronDown
} from 'lucide-react'

// ── All importable resident fields ────────────────────────────
const RESIDENT_FIELDS = [
  { key: 'first_name',     label: 'First Name',      required: true },
  { key: 'last_name',      label: 'Last Name',        required: true },
  { key: 'middle_name',    label: 'Middle Name',      required: false },
  { key: 'date_of_birth',  label: 'Date of Birth',    required: false, hint: 'MM/DD/YYYY or YYYY-MM-DD' },
  { key: 'room',           label: 'Room Number',      required: false },
  { key: 'unit',           label: 'Unit',             required: false },
  { key: 'building',       label: 'Building',         required: false },
  { key: 'care_level',     label: 'Care Level',       required: false, hint: 'independent, assisted, memory_care, skilled_nursing, rehab' },
  { key: 'phone',          label: 'Phone',            required: false },
  { key: 'admission_date', label: 'Admission Date',   required: false, hint: 'MM/DD/YYYY or YYYY-MM-DD' },
]

// Common column name aliases from EMRs / spreadsheets
const FIELD_ALIASES = {
  first_name:     ['first name','firstname','first','fname','given name','given'],
  last_name:      ['last name','lastname','last','lname','surname','family name'],
  middle_name:    ['middle name','middlename','middle','mname'],
  date_of_birth:  ['dob','date of birth','birthdate','birth date','birthday','born'],
  room:           ['room','room number','room #','room no','bed','unit room','rm'],
  unit:           ['unit','apt','apartment','suite'],
  building:       ['building','bldg','wing','facility'],
  care_level:     ['care level','level of care','care type','loc','status'],
  phone:          ['phone','phone number','telephone','tel','cell','mobile','contact'],
  admission_date: ['admission date','admit date','admission','admitted','start date'],
}

// Normalize a date string to YYYY-MM-DD
const parseDate = (val) => {
  if (!val) return null
  const s = val.toString().trim()
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // MM/DD/YYYY
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2,'0')}-${mdy[2].padStart(2,'0')}`
  // MM-DD-YYYY
  const mdy2 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (mdy2) return `${mdy2[3]}-${mdy2[1].padStart(2,'0')}-${mdy2[2].padStart(2,'0')}`
  return null
}

// Normalize care level
const parseCareLevel = (val) => {
  if (!val) return null
  const v = val.toString().toLowerCase().replace(/[\s_-]/g,'')
  if (v.includes('independent') || v === 'il')   return 'independent'
  if (v.includes('assisted')    || v === 'al')   return 'assisted'
  if (v.includes('memory')      || v === 'mc')   return 'memory_care'
  if (v.includes('skilled')     || v === 'snf')  return 'skilled_nursing'
  if (v.includes('rehab')       || v === 'stu')  return 'rehab'
  return null
}

// Auto-detect which DB field a CSV column header maps to
const detectField = (header) => {
  const h = header.toLowerCase().trim()
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.includes(h) || h === field.replace('_',' ')) return field
  }
  return null
}

// Parse CSV text into array of objects
const parseCSV = (text) => {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g,'').trim())
  const rows = lines.slice(1).map(line => {
    // Handle quoted fields
    const vals = []
    let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = '' }
      else cur += ch
    }
    vals.push(cur.trim())
    const obj = {}
    headers.forEach((h, i) => { obj[h] = vals[i] || '' })
    return obj
  }).filter(r => Object.values(r).some(v => v))
  return { headers, rows }
}

export default function ResidentImport({ orgId, onImported, onClose }) {
  const fileRef = useRef()
  const [step, setStep]         = useState('upload')   // upload → map → preview → done
  const [file, setFile]         = useState(null)
  const [headers, setHeaders]   = useState([])
  const [rawRows, setRawRows]   = useState([])
  const [mapping, setMapping]   = useState({})         // dbField → csvHeader
  const [preview, setPreview]   = useState([])         // mapped rows ready to import
  const [errors, setErrors]     = useState([])         // row-level errors
  const [importing, setImporting] = useState(false)
  const [results, setResults]   = useState(null)       // { imported, skipped, errors }
  const [duplicateMode, setDuplicateMode] = useState('skip') // skip | update

  // ── Step 1: File upload ──────────────────────────────────────
  const handleFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      const { headers, rows } = parseCSV(text)
      setHeaders(headers)
      setRawRows(rows)
      // Auto-detect mapping
      const autoMap = {}
      RESIDENT_FIELDS.forEach(field => {
        const match = headers.find(h => detectField(h) === field.key)
        if (match) autoMap[field.key] = match
      })
      setMapping(autoMap)
      setStep('map')
    }
    reader.readAsText(f)
  }

  const handleExcelFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return
    // Try to use SheetJS from CDN if available
    try {
      // Load SheetJS dynamically from CDN
      await new Promise((resolve, reject) => {
        if (window.XLSX) { resolve(); return }
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
      })
      const XLSX = window.XLSX
      const ab   = await f.arrayBuffer()
      const wb   = XLSX.read(ab)
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const csv  = XLSX.utils.sheet_to_csv(ws)
      setFile(f)
      const { headers, rows } = parseCSV(csv)
      setHeaders(headers)
      setRawRows(rows)
      const autoMap = {}
      RESIDENT_FIELDS.forEach(field => {
        const match = headers.find(h => detectField(h) === field.key)
        if (match) autoMap[field.key] = match
      })
      setMapping(autoMap)
      setStep('map')
    } catch {
      alert('Could not load Excel parser. Please save your spreadsheet as CSV (File → Save As → CSV) and import that instead.')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (!f) return
    if (f.name.endsWith('.csv')) {
      handleFile({ target: { files: [f] } })
    } else {
      handleExcelFile({ target: { files: [f] } })
    }
  }

  // ── Step 2: Mapping → build preview ─────────────────────────
  const buildPreview = () => {
    const rowErrors = []
    const mapped = rawRows.map((row, idx) => {
      const r = {}
      RESIDENT_FIELDS.forEach(field => {
        const csvCol = mapping[field.key]
        r[field.key] = csvCol ? row[csvCol] : ''
      })
      // Normalize
      r.date_of_birth  = parseDate(r.date_of_birth)
      r.admission_date = parseDate(r.admission_date)
      r.care_level     = parseCareLevel(r.care_level)

      const rowNum = idx + 2
      if (!r.first_name?.trim()) rowErrors.push({ row: rowNum, msg: 'Missing first name' })
      if (!r.last_name?.trim())  rowErrors.push({ row: rowNum, msg: 'Missing last name' })

      return r
    }).filter(r => r.first_name?.trim() || r.last_name?.trim())

    setPreview(mapped)
    setErrors(rowErrors)
    setStep('preview')
  }

  // ── Step 3: Import ───────────────────────────────────────────
  const handleImport = async () => {
    setImporting(true)
    let imported = 0, skipped = 0, errored = 0
    const importErrors = []

    // Fetch existing residents to detect duplicates
    const { data: existing } = await supabase
      .from('residents').select('first_name,last_name,room')
      .eq('organization_id', orgId)

    for (const row of preview) {
      if (!row.first_name?.trim()) { skipped++; continue }

      // Duplicate check: same first + last name
      const isDup = existing?.some(e =>
        e.first_name?.toLowerCase() === row.first_name?.toLowerCase() &&
        e.last_name?.toLowerCase()  === row.last_name?.toLowerCase()
      )

      if (isDup && duplicateMode === 'skip') { skipped++; continue }

      const payload = {
        organization_id: orgId,
        first_name:      row.first_name?.trim()  || '',
        last_name:       row.last_name?.trim()   || '',
        middle_name:     row.middle_name?.trim() || null,
        date_of_birth:   row.date_of_birth       || null,
        room:            row.room?.trim()         || null,
        unit:            row.unit?.trim()         || null,
        building:        row.building?.trim()     || null,
        care_level:      row.care_level           || 'independent',
        phone:           row.phone?.trim()        || null,
        admission_date:  row.admission_date       || null,
        is_active:       true,
        show_in_directory: true,
      }

      if (isDup && duplicateMode === 'update') {
        const { error } = await supabase.from('residents')
          .update(payload)
          .eq('organization_id', orgId)
          .eq('first_name', row.first_name.trim())
          .eq('last_name', row.last_name.trim())
        if (error) { errored++; importErrors.push({ name: `${row.first_name} ${row.last_name}`, error: error.message }) }
        else imported++
      } else {
        const { error } = await supabase.from('residents').insert(payload)
        if (error) { errored++; importErrors.push({ name: `${row.first_name} ${row.last_name}`, error: error.message }) }
        else imported++
      }
    }

    setResults({ imported, skipped, errored, importErrors })
    setStep('done')
    setImporting(false)
    if (imported > 0) onImported()
  }

  // ── Template download ────────────────────────────────────────
  const downloadTemplate = () => {
    const headers = RESIDENT_FIELDS.map(f => f.label).join(',')
    const example = 'Jane,Doe,Marie,01/15/1942,Room 101,,East Wing,assisted,417-555-0100,03/15/2023'
    const csv = `${headers}\n${example}\n`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'elderloop_resident_import_template.csv'
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-display font-semibold text-slate-800">Import Residents</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {step === 'upload'  && 'Upload a CSV or Excel file'}
              {step === 'map'    && `${rawRows.length} rows found — map your columns`}
              {step === 'preview'&& `${preview.length} residents ready to import`}
              {step === 'done'   && 'Import complete'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 px-6 py-3 border-b border-slate-100 flex-shrink-0">
          {['Upload', 'Map Columns', 'Preview', 'Done'].map((s, i) => {
            const stepKeys = ['upload','map','preview','done']
            const isActive = stepKeys[i] === step
            const isDone   = stepKeys.indexOf(step) > i
            return (
              <div key={s} className="flex items-center flex-1">
                <div className={`flex items-center gap-2 text-xs font-semibold ${isActive ? 'text-brand-600' : isDone ? 'text-green-600' : 'text-slate-400'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-brand-600 text-white' : isDone ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {isDone ? <Check size={11} /> : i + 1}
                  </div>
                  <span className="hidden sm:block">{s}</span>
                </div>
                {i < 3 && <div className="flex-1 h-px bg-slate-200 mx-2" />}
              </div>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── STEP 1: UPLOAD ── */}
          {step === 'upload' && (
            <div className="space-y-5">
              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current.click()}
                className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-all group">
                <FileSpreadsheet size={40} className="text-slate-300 group-hover:text-brand-500 mx-auto mb-4 transition-colors" />
                <p className="font-semibold text-slate-700 group-hover:text-brand-700 transition-colors">Drop your file here or click to browse</p>
                <p className="text-sm text-slate-400 mt-1">CSV or Excel (.xlsx, .xls) — up to 5,000 residents</p>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    if (f.name.endsWith('.csv')) handleFile(e)
                    else handleExcelFile(e)
                  }} />
              </div>

              {/* EMR placeholder */}
              <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50">
                <h3 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">
                  <Users size={15} className="text-brand-600" /> Import from EMR
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {['PointClickCare','MatrixCare','Yardi'].map(emr => (
                    <button key={emr} disabled
                      className="px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-400 bg-white cursor-not-allowed flex items-center justify-center gap-1.5">
                      {emr} <span className="text-xs text-slate-300">(coming soon)</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-3">Direct EMR integration coming in a future release. For now, export a CSV from your EMR and import it here.</p>
              </div>

              {/* Template download */}
              <div className="flex items-center justify-between p-4 bg-brand-50 border border-brand-100 rounded-2xl">
                <div className="flex items-start gap-3">
                  <Info size={15} className="text-brand-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-brand-800">Need a template?</p>
                    <p className="text-xs text-brand-600 mt-0.5">Download our CSV template with all supported columns and an example row.</p>
                  </div>
                </div>
                <button onClick={downloadTemplate}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-lg transition-colors flex-shrink-0 ml-3">
                  <Download size={13} /> Template
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: MAP COLUMNS ── */}
          {step === 'map' && (
            <div className="space-y-5">
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800">
                <Info size={14} className="flex-shrink-0 mt-0.5 text-blue-600" />
                <span>We auto-detected your column mapping below. Review and adjust if needed, then click <strong>Build Preview</strong>.</span>
              </div>

              <div className="space-y-2">
                {RESIDENT_FIELDS.map(field => (
                  <div key={field.key} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:border-brand-200 transition-all">
                    <div className="w-36 flex-shrink-0">
                      <div className="text-sm font-medium text-slate-700 flex items-center gap-1">
                        {field.label}
                        {field.required && <span className="text-red-500 text-xs">*</span>}
                      </div>
                      {field.hint && <div className="text-xs text-slate-400 mt-0.5">{field.hint}</div>}
                    </div>
                    <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
                    <select value={mapping[field.key] || ''}
                      onChange={e => setMapping(m => ({ ...m, [field.key]: e.target.value || undefined }))}
                      className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${mapping[field.key] ? 'border-green-300 bg-green-50' : 'border-slate-200'}`}>
                      <option value="">— Not mapped —</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    {mapping[field.key] && <Check size={14} className="text-green-500 flex-shrink-0" />}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-slate-400">
                  {Object.values(mapping).filter(Boolean).length} of {RESIDENT_FIELDS.length} columns mapped
                </div>
                <button onClick={buildPreview}
                  disabled={!mapping.first_name && !mapping.last_name}
                  className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
                  Build Preview <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: PREVIEW ── */}
          {step === 'preview' && (
            <div className="space-y-4">
              {errors.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="font-semibold text-amber-800 text-sm mb-2 flex items-center gap-2">
                    <AlertTriangle size={14} /> {errors.length} row{errors.length > 1 ? 's' : ''} have issues (will be skipped)
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {errors.map((e, i) => (
                      <div key={i} className="text-xs text-amber-700">Row {e.row}: {e.msg}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Duplicate handling */}
              <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-sm font-medium text-slate-700 flex-shrink-0">Duplicate residents:</div>
                <div className="flex gap-2">
                  {[{ key: 'skip', label: 'Skip (keep existing)' }, { key: 'update', label: 'Update existing' }].map(opt => (
                    <button key={opt.key} onClick={() => setDuplicateMode(opt.key)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${duplicateMode === opt.key ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview table */}
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide grid grid-cols-5 gap-2">
                  <span>First Name</span><span>Last Name</span><span>Room</span><span>Care Level</span><span>DOB</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {preview.slice(0, 100).map((r, i) => (
                    <div key={i} className="px-4 py-2.5 grid grid-cols-5 gap-2 text-sm border-t border-slate-50 hover:bg-slate-50">
                      <span className="font-medium text-slate-800 truncate">{r.first_name}</span>
                      <span className="text-slate-700 truncate">{r.last_name}</span>
                      <span className="text-slate-500">{r.room || '—'}</span>
                      <span className="text-slate-500 capitalize">{r.care_level?.replace('_',' ') || '—'}</span>
                      <span className="text-slate-500">{r.date_of_birth || '—'}</span>
                    </div>
                  ))}
                  {preview.length > 100 && (
                    <div className="px-4 py-2 text-xs text-slate-400 border-t border-slate-50">
                      + {preview.length - 100} more rows (all will be imported)
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button onClick={() => setStep('map')} className="text-sm text-slate-500 hover:text-slate-700">← Back to mapping</button>
                <button onClick={handleImport} disabled={importing || preview.length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
                  {importing ? <><RefreshCw size={15} className="animate-spin" /> Importing...</> : <><Upload size={15} /> Import {preview.length} Residents</>}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: DONE ── */}
          {step === 'done' && results && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <Check size={32} className="text-green-600" />
              </div>
              <h3 className="font-display font-bold text-slate-800 text-xl mb-2">Import Complete</h3>

              <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto mt-5 mb-5">
                {[
                  { label: 'Imported',  value: results.imported, color: 'text-green-600', bg: 'bg-green-50' },
                  { label: 'Skipped',   value: results.skipped,  color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Errors',    value: results.errored,  color: results.errored > 0 ? 'text-red-600' : 'text-slate-400', bg: results.errored > 0 ? 'bg-red-50' : 'bg-slate-100' },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
                    <div className={`text-3xl font-display font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-slate-500 text-xs mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              {results.importErrors.length > 0 && (
                <div className="text-left bg-red-50 border border-red-200 rounded-xl p-4 mb-4 max-h-32 overflow-y-auto">
                  <p className="text-xs font-semibold text-red-700 mb-2">Import errors:</p>
                  {results.importErrors.map((e, i) => (
                    <p key={i} className="text-xs text-red-600">{e.name}: {e.error}</p>
                  ))}
                </div>
              )}

              <p className="text-slate-400 text-sm mb-6">
                {results.imported > 0 ? `${results.imported} residents added to your directory.` : 'No new residents were imported.'}
                {results.skipped > 0 ? ` ${results.skipped} duplicates skipped.` : ''}
              </p>

              <button onClick={onClose}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
