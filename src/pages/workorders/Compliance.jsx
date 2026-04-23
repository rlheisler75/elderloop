import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import {
  ShieldCheck, CheckCircle2, XCircle, AlertTriangle, Clock,
  ClipboardCheck, FileText, Eye, Upload, X, Plus, Info,
  ChevronDown, ChevronUp, Edit2, Trash2, Check, Globe, Save
} from 'lucide-react'

// ── State compliance references ───────────────────────────────
const STATE_REFS = {
  MO: {
    label: 'Missouri',
    summary: 'Inspections follow NFPA 101 Life Safety Code (2012 edition), Missouri DHSS §19 CSR 30-85, NFPA 10/25/72/110, CMS Conditions of Participation, Missouri DOLIR elevator regulations, and §19 CSR 30-85.042(17) fire drill requirements.',
    retention: 'Maintain all completed inspection records for a minimum of 3 years.',
    authority: 'Missouri DHSS / CMS',
  },
  KS: {
    label: 'Kansas',
    summary: 'Inspections follow NFPA 101, Kansas KDHE K.A.R. 28-39, NFPA 10/25/72/110, and CMS Conditions of Participation.',
    retention: 'Maintain all inspection records for a minimum of 5 years per KDHE requirements.',
    authority: 'Kansas KDHE / CMS',
  },
  IL: {
    label: 'Illinois',
    summary: 'Inspections follow NFPA 101, Illinois IDPH 77 Ill. Adm. Code 300, NFPA 10/25/72/110, and CMS Conditions of Participation.',
    retention: 'Maintain all inspection records for a minimum of 5 years.',
    authority: 'Illinois IDPH / CMS',
  },
  AR: {
    label: 'Arkansas',
    summary: 'Inspections follow NFPA 101, Arkansas DPSQA Reg. 2000-F, NFPA 10/25/72/110, and CMS Conditions of Participation.',
    retention: 'Maintain all completed inspection records for a minimum of 3 years.',
    authority: 'Arkansas DPSQA / CMS',
  },
  OK: {
    label: 'Oklahoma',
    summary: 'Inspections follow NFPA 101, Oklahoma OSDH OAC 310:675, NFPA 10/25/72/110, and CMS Conditions of Participation.',
    retention: 'Maintain all inspection records for a minimum of 3 years.',
    authority: 'Oklahoma OSDH / CMS',
  },
  TX: {
    label: 'Texas',
    summary: 'Inspections follow NFPA 101, Texas HHSC 40 TAC §19, NFPA 10/25/72/110, and CMS Conditions of Participation.',
    retention: 'Maintain all inspection records for a minimum of 5 years per HHSC.',
    authority: 'Texas HHSC / CMS',
  },
  TN: {
    label: 'Tennessee',
    summary: 'Inspections follow NFPA 101, Tennessee TDH Rule 1200-08-06, NFPA 10/25/72/110, and CMS Conditions of Participation.',
    retention: 'Maintain all inspection records for a minimum of 5 years.',
    authority: 'Tennessee TDH / CMS',
  },
  IN: {
    label: 'Indiana',
    summary: 'Inspections follow NFPA 101, Indiana ISDH 410 IAC 16.2, NFPA 10/25/72/110, and CMS Conditions of Participation.',
    retention: 'Maintain all inspection records for a minimum of 3 years.',
    authority: 'Indiana ISDH / CMS',
  },
  OH: {
    label: 'Ohio',
    summary: 'Inspections follow NFPA 101, Ohio ODH OAC 3701-17, NFPA 10/25/72/110, and CMS Conditions of Participation.',
    retention: 'Maintain all inspection records for a minimum of 5 years.',
    authority: 'Ohio ODH / CMS',
  },
  FL: {
    label: 'Florida',
    summary: 'Inspections follow NFPA 101, Florida AHCA 59A-4 F.A.C., NFPA 10/25/72/110, and CMS Conditions of Participation.',
    retention: 'Maintain all inspection records for a minimum of 5 years per AHCA.',
    authority: 'Florida AHCA / CMS',
  },
  OTHER: {
    label: 'Other / Federal Only',
    summary: 'Inspections follow NFPA 101 Life Safety Code, NFPA 10/25/72/110, and CMS Conditions of Participation (42 CFR Part 483).',
    retention: 'Maintain all completed inspection records for a minimum of 3 years per CMS requirements.',
    authority: 'CMS Federal',
  },
}

const ALL_STATES = [
  { code: 'MO', label: 'Missouri' }, { code: 'KS', label: 'Kansas' },
  { code: 'IL', label: 'Illinois' }, { code: 'AR', label: 'Arkansas' },
  { code: 'OK', label: 'Oklahoma' }, { code: 'TX', label: 'Texas' },
  { code: 'TN', label: 'Tennessee' }, { code: 'IN', label: 'Indiana' },
  { code: 'OH', label: 'Ohio' }, { code: 'FL', label: 'Florida' },
  { code: 'AL', label: 'Alabama' }, { code: 'GA', label: 'Georgia' },
  { code: 'NC', label: 'North Carolina' }, { code: 'SC', label: 'South Carolina' },
  { code: 'VA', label: 'Virginia' }, { code: 'WV', label: 'West Virginia' },
  { code: 'KY', label: 'Kentucky' }, { code: 'MS', label: 'Mississippi' },
  { code: 'LA', label: 'Louisiana' }, { code: 'CA', label: 'California' },
  { code: 'AZ', label: 'Arizona' }, { code: 'CO', label: 'Colorado' },
  { code: 'NM', label: 'New Mexico' }, { code: 'NV', label: 'Nevada' },
  { code: 'WA', label: 'Washington' }, { code: 'OR', label: 'Oregon' },
  { code: 'ID', label: 'Idaho' }, { code: 'MT', label: 'Montana' },
  { code: 'WY', label: 'Wyoming' }, { code: 'UT', label: 'Utah' },
  { code: 'ND', label: 'North Dakota' }, { code: 'SD', label: 'South Dakota' },
  { code: 'NE', label: 'Nebraska' }, { code: 'MN', label: 'Minnesota' },
  { code: 'IA', label: 'Iowa' }, { code: 'WI', label: 'Wisconsin' },
  { code: 'MI', label: 'Michigan' }, { code: 'PA', label: 'Pennsylvania' },
  { code: 'NY', label: 'New York' }, { code: 'NJ', label: 'New Jersey' },
  { code: 'CT', label: 'Connecticut' }, { code: 'MA', label: 'Massachusetts' },
  { code: 'OTHER', label: 'Other / Federal Only' },
]

const FREQ_LABELS = {
  daily:     { label: 'Daily',     color: 'bg-red-100 text-red-700' },
  weekly:    { label: 'Weekly',    color: 'bg-orange-100 text-orange-700' },
  monthly:   { label: 'Monthly',   color: 'bg-amber-100 text-amber-700' },
  quarterly: { label: 'Quarterly', color: 'bg-blue-100 text-blue-700' },
  biannual:  { label: 'Bi-Annual', color: 'bg-indigo-100 text-indigo-700' },
  annual:    { label: 'Annual',    color: 'bg-slate-100 text-slate-600' },
}

const STATUS_CONFIG = {
  pass:                 { label: 'Pass',              color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200', icon: CheckCircle2 },
  pass_with_conditions: { label: 'Pass w/ Conditions',color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200', icon: AlertTriangle },
  fail:                 { label: 'Fail',              color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',   icon: XCircle },
  pending:              { label: 'Pending',           color: 'text-slate-500',  bg: 'bg-slate-50',  border: 'border-slate-200', icon: Clock },
}

const daysUntil = (dateStr) => {
  const today = new Date(); today.setHours(0,0,0,0)
  const due   = new Date(dateStr + 'T00:00:00')
  return Math.floor((due - today) / 86400000)
}

const fmt = (dateStr) => dateStr
  ? new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : '—'

// ── Add Custom Category Modal ─────────────────────────────────
function AddCategoryModal({ orgId, onClose, onSaved }) {
  const [form, setForm] = useState({
    label: '', description: '', authority: '', authority_ref: '',
    frequency: 'annual', color: 'bg-slate-100 text-slate-700',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const FREQ_OPTIONS = ['daily','weekly','monthly','quarterly','biannual','annual']
  const COLOR_OPTIONS = [
    { label: 'Gray',   value: 'bg-slate-100 text-slate-700' },
    { label: 'Blue',   value: 'bg-blue-100 text-blue-700' },
    { label: 'Green',  value: 'bg-green-100 text-green-700' },
    { label: 'Red',    value: 'bg-red-100 text-red-700' },
    { label: 'Orange', value: 'bg-orange-100 text-orange-700' },
    { label: 'Purple', value: 'bg-purple-100 text-purple-700' },
    { label: 'Amber',  value: 'bg-amber-100 text-amber-700' },
  ]

  const handleSave = async () => {
    if (!form.label.trim()) { setError('Name is required'); return }
    setSaving(true)
    const key = form.label.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + Date.now()
    const { error: err } = await supabase.from('compliance_categories').insert({
      organization_id: orgId,
      key,
      label:         form.label.trim(),
      description:   form.description || null,
      authority:     form.authority || null,
      authority_ref: form.authority_ref || null,
      frequency:     form.frequency,
      color:         form.color,
      is_custom:     true,
      sort_order:    999,
    })
    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-display font-semibold text-slate-800">Add Custom Inspection</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Inspection Name *</label>
            <input value={form.label} onChange={e => set('label', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Grease Trap Cleaning, Pool Safety Inspection" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="What does this inspection cover?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Frequency</label>
              <select value={form.frequency} onChange={e => set('frequency', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 capitalize">
                {FREQ_OPTIONS.map(f => <option key={f} value={f} className="capitalize">{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Color Tag</label>
              <select value={form.color} onChange={e => set('color', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Regulatory Authority <span className="font-normal text-slate-400">(optional)</span></label>
            <input value={form.authority} onChange={e => set('authority', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. State Health Dept, Local Fire Marshal" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Regulation / Code Reference <span className="font-normal text-slate-400">(optional)</span></label>
            <input value={form.authority_ref} onChange={e => set('authority_ref', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. §19 CSR 30-85, NFPA 96" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving...' : 'Add Inspection'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Conduct Inspection Modal ───────────────────────────────────
function InspectionModal({ category, orgId, profile, onClose, onSaved }) {
  const fileRef = useRef()
  const [items, setItems]       = useState([])
  const [results, setResults]   = useState({})
  const [form, setForm]         = useState({
    inspection_date: new Date().toISOString().split('T')[0],
    inspector_name:  `${profile.first_name} ${profile.last_name}`,
    next_due_date:   '',
    status:          'pass',
    overall_notes:   '',
  })
  const [reportUrl, setReportUrl]   = useState('')
  const [reportName, setReportName] = useState('')
  const [uploading, setUploading]   = useState(false)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { fetchItems() }, [category.id])

  async function fetchItems() {
    const { data } = await supabase.from('compliance_checklist_items')
      .select('*').eq('category_id', category.id).eq('is_active', true).order('sort_order')
    setItems(data || [])
    const defaults = {}
    data?.forEach(item => { defaults[item.id] = { result: 'pass', notes: '' } })
    setResults(defaults)
  }

  const setItemResult = (itemId, field, value) =>
    setResults(r => ({ ...r, [itemId]: { ...r[itemId], [field]: value } }))

  const passCount  = Object.values(results).filter(r => r.result === 'pass').length
  const failCount  = Object.values(results).filter(r => r.result === 'fail').length
  const warnCount  = Object.values(results).filter(r => r.result === 'needs_attention').length

  const calcStatus = () => {
    const vals = Object.values(results).map(r => r.result)
    if (vals.includes('fail')) return 'fail'
    if (vals.includes('needs_attention')) return 'pass_with_conditions'
    return 'pass'
  }
  const autoStatus = calcStatus()

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    const path = `compliance/${orgId}/${category.key}/${Date.now()}.${file.name.split('.').pop()}`
    const { error: upErr } = await supabase.storage.from('announcement-images').upload(path, file)
    if (!upErr) {
      const { data } = supabase.storage.from('announcement-images').getPublicUrl(path)
      setReportUrl(data.publicUrl); setReportName(file.name)
    }
    setUploading(false)
  }

  const handleSave = async () => {
    if (!form.inspection_date) { setError('Inspection date is required'); return }
    setSaving(true)
    const status = autoStatus
    const { data: insp, error: err } = await supabase.from('compliance_inspections').insert({
      organization_id: orgId,
      category_id:     category.id,
      conducted_by:    profile.id,
      inspection_date: form.inspection_date,
      next_due_date:   form.next_due_date || null,
      inspector_name:  form.inspector_name,
      status,
      overall_notes:   form.overall_notes || null,
      report_url:      reportUrl || null,
      report_name:     reportName || null,
    }).select().single()
    if (err) { setError(err.message); setSaving(false); return }

    // Save checklist item results
    if (insp && items.length > 0) {
      const rows = items.map(item => ({
        inspection_id: insp.id,
        checklist_item_id: item.id,
        result: results[item.id]?.result || 'pass',
        notes:  results[item.id]?.notes || null,
      }))
      await supabase.from('compliance_inspection_results').insert(rows)
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <ShieldCheck size={20} className="text-brand-600" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-slate-800">{category.label} Inspection</h2>
              <p className="text-xs text-slate-400">
                {category.authority_ref && <span>{category.authority_ref} · </span>}
                {FREQ_LABELS[category.frequency]?.label || category.frequency}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Inspection Date *</label>
              <input type="date" value={form.inspection_date} onChange={e => set('inspection_date', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Next Due Date</label>
              <input type="date" value={form.next_due_date} onChange={e => set('next_due_date', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Inspector</label>
              <input value={form.inspector_name} onChange={e => set('inspector_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>

          {/* Live status */}
          <div className="flex items-center gap-3 p-3 rounded-xl border-2"
            style={{
              borderColor: autoStatus === 'pass' ? '#86efac' : autoStatus === 'fail' ? '#fca5a5' : '#fcd34d',
              background:  autoStatus === 'pass' ? '#f0fdf4' : autoStatus === 'fail' ? '#fef2f2' : '#fffbeb'
            }}>
            <div className="flex gap-3 text-sm font-medium">
              <span className="text-green-700">{passCount} Pass</span>
              {warnCount > 0 && <span className="text-amber-700">{warnCount} Need Attention</span>}
              {failCount > 0 && <span className="text-red-700">{failCount} Fail</span>}
            </div>
            <div className="ml-auto text-sm font-semibold">
              {(() => { const s = STATUS_CONFIG[autoStatus]; const Icon = s.icon
                return <span className={`flex items-center gap-1.5 ${s.color}`}><Icon size={15} /> {s.label}</span>
              })()}
            </div>
          </div>

          {/* Checklist */}
          {items.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-700 text-sm mb-3">Checklist ({items.length} items)</h3>
              <div className="space-y-2">
                {items.map(item => {
                  const itemResult = results[item.id] || { result: 'pass', notes: '' }
                  return (
                    <div key={item.id} className={`p-4 rounded-xl border transition-all ${
                      itemResult.result === 'fail'            ? 'border-red-200 bg-red-50' :
                      itemResult.result === 'needs_attention' ? 'border-amber-200 bg-amber-50' :
                      'border-slate-100 bg-white'}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-800">{item.item_label}</div>
                          {item.notes_hint && <div className="text-xs text-slate-400 mt-0.5">{item.notes_hint}</div>}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {[
                            { val: 'pass',             label: 'Pass',  cls: 'bg-green-600 text-white' },
                            { val: 'needs_attention',  label: 'Attn',  cls: 'bg-amber-500 text-white' },
                            { val: 'fail',             label: 'Fail',  cls: 'bg-red-600 text-white' },
                          ].map(opt => (
                            <button key={opt.val} onClick={() => setItemResult(item.id, 'result', opt.val)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all
                                ${itemResult.result === opt.val ? opt.cls : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {(itemResult.result === 'needs_attention' || itemResult.result === 'fail') && (
                        <input value={itemResult.notes || ''} onChange={e => setItemResult(item.id, 'notes', e.target.value)}
                          className="mt-2 w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                          placeholder="Note what needs attention..." />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Overall notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Overall Notes</label>
            <textarea value={form.overall_notes} onChange={e => set('overall_notes', e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Summary observations, corrective actions taken..." />
          </div>

          {/* Report upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Attach Report <span className="font-normal text-slate-400">(optional)</span></label>
            {reportUrl ? (
              <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
                <FileText size={16} className="text-green-600 flex-shrink-0" />
                <span className="text-sm text-green-700 flex-1 truncate">{reportName}</span>
                <a href={reportUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-green-600 hover:text-green-800"><Eye size={14} /></a>
                <button onClick={() => { setReportUrl(''); setReportName('') }} className="p-1.5 text-slate-400 hover:text-red-500"><X size={14} /></button>
              </div>
            ) : (
              <button onClick={() => fileRef.current.click()} disabled={uploading}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors disabled:opacity-50">
                <Upload size={15} /> {uploading ? 'Uploading...' : 'Upload inspection report (PDF, JPG, PNG)'}
              </button>
            )}
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleUpload} />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-slate-400">* Required fields</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
              <ClipboardCheck size={15} /> {saving ? 'Saving...' : 'Save Inspection Record'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Inspection History Modal ───────────────────────────────────
function InspectionHistory({ category, orgId, onClose }) {
  const [inspections, setInspections] = useState([])
  const [loading, setLoading]         = useState(true)
  const [expandId, setExpandId]       = useState(null)
  const [itemResults, setItemResults] = useState({})

  useEffect(() => { fetchHistory() }, [])

  async function fetchHistory() {
    setLoading(true)
    const { data } = await supabase.from('compliance_inspections')
      .select('*, profiles!conducted_by(first_name,last_name)')
      .eq('organization_id', orgId).eq('category_id', category.id)
      .order('inspection_date', { ascending: false }).limit(20)
    setInspections(data || [])
    setLoading(false)
  }

  const fetchResults = async (inspectionId) => {
    if (itemResults[inspectionId]) { setExpandId(expandId === inspectionId ? null : inspectionId); return }
    const { data } = await supabase.from('compliance_inspection_results')
      .select('*, compliance_checklist_items(item_label)')
      .eq('inspection_id', inspectionId)
    setItemResults(r => ({ ...r, [inspectionId]: data || [] }))
    setExpandId(inspectionId)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-display font-semibold text-slate-800">{category.label} — History</h2>
            <p className="text-xs text-slate-400 mt-0.5">{inspections.length} inspection{inspections.length !== 1 ? 's' : ''} on record</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-sm">Loading...</div>
          ) : inspections.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">No inspections recorded yet.</div>
          ) : inspections.map(insp => {
            const s = STATUS_CONFIG[insp.status] || STATUS_CONFIG.pending
            const Icon = s.icon
            const isExpanded = expandId === insp.id
            return (
              <div key={insp.id} className={`border rounded-2xl overflow-hidden ${s.border}`}>
                <button onClick={() => fetchResults(insp.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                    <Icon size={18} className={s.color} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 text-sm">{fmt(insp.inspection_date)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.bg} ${s.color}`}>{s.label}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Inspector: {insp.inspector_name || (insp.profiles ? `${insp.profiles.first_name} ${insp.profiles.last_name}` : '—')}
                    </div>
                  </div>
                  {insp.report_url && (
                    <a href={insp.report_url} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 px-2 py-1 rounded-lg hover:bg-brand-50 transition-colors">
                      <FileText size={12} /> Report
                    </a>
                  )}
                  {isExpanded ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
                </button>
                {isExpanded && (
                  <div className="px-5 pb-4 border-t border-slate-100 pt-3">
                    {insp.overall_notes && <p className="text-sm text-slate-600 mb-3 italic">{insp.overall_notes}</p>}
                    {(itemResults[insp.id] || []).length > 0 && (
                      <div className="space-y-1">
                        {(itemResults[insp.id] || []).map(result => (
                          <div key={result.id} className="flex items-center gap-2 text-xs">
                            <span className={`w-12 text-center px-1.5 py-0.5 rounded-full font-medium flex-shrink-0
                              ${result.result === 'pass' ? 'bg-green-100 text-green-700' :
                                result.result === 'fail' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                              {result.result === 'needs_attention' ? 'Attn' : result.result}
                            </span>
                            <span className="text-slate-600">{result.compliance_checklist_items?.item_label}</span>
                            {result.notes && <span className="text-slate-400 italic">— {result.notes}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg">Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Compliance Panel ──────────────────────────────────────
export default function CompliancePanel({ orgId, profile }) {
  const [categories, setCategories]         = useState([])
  const [lastInspections, setLastInspections] = useState({})
  const [org, setOrg]                       = useState(null)
  const [loading, setLoading]               = useState(true)
  const [showInspect, setShowInspect]       = useState(null)
  const [showHistory, setShowHistory]       = useState(null)
  const [showAddCat, setShowAddCat]         = useState(false)
  const [showStateInfo, setShowStateInfo]   = useState(false)
  const [stateCode, setStateCode]           = useState('MO')
  const [savingState, setSavingState]       = useState(false)
  const [stateSaved, setStateSaved]         = useState(false)

  useEffect(() => { if (orgId) fetchAll() }, [orgId])

  async function fetchAll() {
    setLoading(true)
    const [orgRes, inspRes] = await Promise.all([
      supabase.from('organizations').select('compliance_state, compliance_notes').eq('id', orgId).single(),
      supabase.from('compliance_inspections')
        .select('*').eq('organization_id', orgId)
        .order('inspection_date', { ascending: false }),
    ])

    const orgData = orgRes.data
    setOrg(orgData)
    const currentState = orgData?.compliance_state || 'MO'
    setStateCode(currentState)

    await fetchCategories(currentState)

    const lastMap = {}
    inspRes.data?.forEach(i => { if (!lastMap[i.category_id]) lastMap[i.category_id] = i })
    setLastInspections(lastMap)
    setLoading(false)
  }

  async function fetchCategories(state) {
    // Fetch: universal (state_code null) + matching state + org-custom
    const { data } = await supabase.from('compliance_categories')
      .select('*')
      .or(
        `state_code.is.null,state_code.eq.${state},organization_id.eq.${orgId}`
      )
      .order('sort_order')
    setCategories(data || [])
  }

  const handleSaveState = async () => {
    setSavingState(true)
    const { error } = await supabase.from('organizations')
      .update({ compliance_state: stateCode })
      .eq('id', orgId)
    setSavingState(false)
    if (error) { console.error('State save error:', error); return }
    // Update local org without re-running fetchAll (which resets stateCode)
    setOrg(o => ({ ...o, compliance_state: stateCode }))
    setStateSaved(true)
    setTimeout(() => setStateSaved(false), 2500)
    // Refresh categories for the new state
    await fetchCategories(stateCode)
  }

  const handleDeleteCustom = async (cat) => {
    if (!confirm(`Remove "${cat.label}" from your compliance list?`)) return
    // Only delete org-owned custom categories, never global ones
    if (cat.organization_id === orgId && cat.is_custom) {
      await supabase.from('compliance_categories').delete().eq('id', cat.id)
      fetchCategories(stateCode)
    }
  }

  const stateRef = STATE_REFS[stateCode] || STATE_REFS.OTHER

  // Stats
  const totalCats     = categories.length
  const compliantCats = categories.filter(c => {
    const last = lastInspections[c.id]
    if (!last || last.status === 'fail') return false
    if (!last.next_due_date) return true
    return daysUntil(last.next_due_date) > 0
  }).length
  const overdueCats = categories.filter(c => {
    const last = lastInspections[c.id]
    if (!last) return true
    if (!last.next_due_date) return false
    return daysUntil(last.next_due_date) < 0
  }).length
  const dueSoonCats = categories.filter(c => {
    const last = lastInspections[c.id]
    if (!last || !last.next_due_date) return false
    const d = daysUntil(last.next_due_date)
    return d >= 0 && d <= 30
  }).length

  if (loading) return <div className="text-center py-16 text-slate-400">Loading compliance data...</div>

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Compliant',   value: compliantCats,                               color: 'text-green-600',  bg: 'bg-green-50' },
          { label: 'Due Soon',    value: dueSoonCats,   color: dueSoonCats > 0   ? 'text-amber-600' : 'text-slate-400', bg: dueSoonCats > 0   ? 'bg-amber-50'  : 'bg-slate-100' },
          { label: 'Overdue',     value: overdueCats,   color: overdueCats > 0   ? 'text-red-600'   : 'text-slate-400', bg: overdueCats > 0   ? 'bg-red-50'    : 'bg-slate-100', alert: overdueCats > 0 },
          { label: 'Not Started', value: totalCats - compliantCats - dueSoonCats - overdueCats, color: 'text-slate-400', bg: 'bg-slate-100' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 ${s.alert ? 'ring-2 ring-red-300' : ''}`}>
            <div className={`text-3xl font-display font-bold ${s.color}`}>{s.value}</div>
            <div className="text-slate-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* State selector + reference banner */}
      <div className="mb-5 bg-blue-50 border border-blue-200 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <Globe size={16} className="text-blue-600 flex-shrink-0" />
          <div className="flex-1 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-blue-800">Compliance State:</span>
            <select
              value={stateCode}
              onChange={e => setStateCode(e.target.value)}
              className="px-2 py-1 border border-blue-300 rounded-lg text-xs font-medium text-blue-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              {ALL_STATES.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
            </select>
            <button
              onClick={handleSaveState}
              disabled={savingState || stateCode === org?.compliance_state}
              className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-medium rounded-lg transition-colors">
              {stateSaved ? <><Check size={11} /> Saved</> : <><Save size={11} /> Save</>}
            </button>
          </div>
          <button onClick={() => setShowStateInfo(s => !s)} className="text-blue-600 hover:text-blue-800 flex-shrink-0">
            {showStateInfo ? <ChevronUp size={16} /> : <Info size={16} />}
          </button>
        </div>
        {showStateInfo && (
          <div className="px-4 pb-4 border-t border-blue-200 pt-3">
            <p className="text-xs text-blue-800 leading-relaxed"><span className="font-semibold">{stateRef.label} Reference:</span> {stateRef.summary}</p>
            <p className="text-xs text-blue-700 mt-1.5 italic">{stateRef.retention}</p>
          </div>
        )}
      </div>

      {/* Add custom + section header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-semibold text-slate-800 flex items-center gap-2">
          <ShieldCheck size={18} className="text-brand-600" /> Inspection Categories
          <span className="text-sm font-normal text-slate-400">({totalCats} total)</span>
        </h2>
        <button
          onClick={() => setShowAddCat(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-brand-300 text-brand-600 hover:bg-brand-50 rounded-xl text-xs font-medium transition-colors">
          <Plus size={13} /> Add Custom Inspection
        </button>
      </div>

      {/* Category cards */}
      <div className="space-y-3">
        {categories.map(cat => {
          const last    = lastInspections[cat.id]
          const days    = last?.next_due_date ? daysUntil(last.next_due_date) : null
          const freq    = FREQ_LABELS[cat.frequency] || { label: cat.frequency, color: 'bg-slate-100 text-slate-600' }
          const status  = last ? STATUS_CONFIG[last.status] : null
          const StatusIcon = status?.icon

          let urgencyBadge = null
          if (!last) {
            urgencyBadge = { label: 'No Record', color: 'bg-slate-100 text-slate-500' }
          } else if (days !== null && days < 0) {
            urgencyBadge = { label: `${Math.abs(days)}d overdue`, color: 'bg-red-100 text-red-700' }
          } else if (days !== null && days <= 7) {
            urgencyBadge = { label: `Due in ${days}d`, color: 'bg-red-100 text-red-700' }
          } else if (days !== null && days <= 30) {
            urgencyBadge = { label: `Due in ${days}d`, color: 'bg-amber-100 text-amber-700' }
          }

          const cardBorder = urgencyBadge && (days === null || days < 0)
            ? 'border-red-200' : urgencyBadge && days <= 7
            ? 'border-red-200' : urgencyBadge && days <= 30
            ? 'border-amber-200' : 'border-slate-100'

          return (
            <div key={cat.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-all ${cardBorder}`}>
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-display font-semibold text-slate-800">{cat.label}</h3>
                      {cat.is_custom && (
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">Custom</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${freq.color}`}>{freq.label}</span>
                      {urgencyBadge && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${urgencyBadge.color}`}>{urgencyBadge.label}</span>
                      )}
                    </div>
                    {cat.description && <p className="text-xs text-slate-500 mb-2">{cat.description}</p>}
                    <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400">
                      {cat.authority_ref && <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded">{cat.authority_ref}</span>}
                      {last && (
                        <>
                          {status && StatusIcon && (
                            <span className={`flex items-center gap-1 ${status.color}`}>
                              <StatusIcon size={11} /> {status.label}
                            </span>
                          )}
                          <span>Last: {fmt(last.inspection_date)}</span>
                          {last.next_due_date && <span>Next: {fmt(last.next_due_date)}</span>}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {cat.is_custom && (
                      <button onClick={() => handleDeleteCustom(cat)}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors" title="Remove">
                        <Trash2 size={14} />
                      </button>
                    )}
                    <button onClick={() => setShowHistory(cat)}
                      className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:border-slate-300 rounded-xl text-xs font-medium transition-colors">
                      History
                    </button>
                    <button onClick={() => setShowInspect(cat)}
                      className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-medium transition-colors">
                      Inspect
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modals */}
      {showAddCat && (
        <AddCategoryModal orgId={orgId} onClose={() => setShowAddCat(false)} onSaved={() => { setShowAddCat(false); fetchCategories(stateCode) }} />
      )}
      {showInspect && (
        <InspectionModal category={showInspect} orgId={orgId} profile={profile} onClose={() => setShowInspect(null)} onSaved={() => { setShowInspect(null); fetchAll() }} />
      )}
      {showHistory && (
        <InspectionHistory category={showHistory} orgId={orgId} onClose={() => setShowHistory(null)} />
      )}
    </div>
  )
}
