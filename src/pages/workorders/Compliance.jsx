import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronUp, ChevronRight, Plus, X, Upload,
  FileText, Calendar, User, Award, Eye, Check, Minus,
  AlertCircle, Info, ExternalLink, ClipboardCheck
} from 'lucide-react'

const FREQ_LABELS = {
  weekly:    { label: 'Weekly',    color: 'bg-red-100 text-red-700' },
  monthly:   { label: 'Monthly',  color: 'bg-orange-100 text-orange-700' },
  quarterly: { label: 'Quarterly',color: 'bg-amber-100 text-amber-700' },
  annual:    { label: 'Annual',   color: 'bg-blue-100 text-blue-700' },
}

const STATUS_CONFIG = {
  pass:                { label: 'Pass',                icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200' },
  pass_with_conditions:{ label: 'Pass w/ Conditions', icon: AlertCircle,  color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  fail:                { label: 'Fail',               icon: XCircle,      color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
  pending:             { label: 'Pending',            icon: Clock,        color: 'text-slate-500',  bg: 'bg-slate-50',  border: 'border-slate-200' },
}

const RESULT_OPTIONS = [
  { key: 'pass',            label: 'Pass',            icon: Check,  color: 'text-green-600 bg-green-50 border-green-300' },
  { key: 'fail',            label: 'Fail',            icon: X,      color: 'text-red-600 bg-red-50 border-red-300' },
  { key: 'needs_attention', label: 'Needs Attention', icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 border-amber-300' },
  { key: 'na',              label: 'N/A',             icon: Minus,  color: 'text-slate-400 bg-slate-50 border-slate-200' },
]

const daysUntil = (dateStr) => {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
}

const fmt = (dateStr) => dateStr
  ? new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : '—'

// ── Conduct Inspection Modal ───────────────────────────────────
function InspectionModal({ category, orgId, profile, onClose, onSaved }) {
  const fileRef = useRef()
  const [items, setItems]       = useState([])
  const [results, setResults]   = useState({}) // itemId -> { result, notes }
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
      .select('*')
      .eq('category_id', category.id)
      .eq('is_active', true)
      .order('sort_order')
    setItems(data || [])
    // Default all to pass
    const defaults = {}
    data?.forEach(item => { defaults[item.id] = { result: 'pass', notes: '' } })
    setResults(defaults)
  }

  const setItemResult = (itemId, field, value) => {
    setResults(r => ({ ...r, [itemId]: { ...r[itemId], [field]: value } }))
  }

  // Auto-calculate overall status from item results
  const calcStatus = () => {
    const vals = Object.values(results).map(r => r.result)
    if (vals.includes('fail'))            return 'fail'
    if (vals.includes('needs_attention')) return 'pass_with_conditions'
    return 'pass'
  }

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
    const autoStatus = calcStatus()

    const { data: inspection, error: err } = await supabase.from('compliance_inspections').insert({
      organization_id: orgId,
      category_id:     category.id,
      conducted_by:    profile.id,
      inspector_name:  form.inspector_name,
      inspection_date: form.inspection_date,
      next_due_date:   form.next_due_date || null,
      status:          autoStatus,
      overall_notes:   form.overall_notes || null,
      report_url:      reportUrl || null,
      report_name:     reportName || null,
      created_by:      profile.id,
    }).select().single()

    if (err || !inspection) { setError(err?.message || 'Failed to save'); setSaving(false); return }

    // Save item results
    const resultRows = items.map(item => ({
      inspection_id: inspection.id,
      item_id:       item.id,
      result:        results[item.id]?.result || 'pass',
      notes:         results[item.id]?.notes  || null,
    }))
    await supabase.from('compliance_inspection_results').insert(resultRows)

    setSaving(false); onSaved()
  }

  const passCount  = Object.values(results).filter(r => r.result === 'pass').length
  const failCount  = Object.values(results).filter(r => r.result === 'fail').length
  const warnCount  = Object.values(results).filter(r => r.result === 'needs_attention').length
  const autoStatus = calcStatus()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: category.color + '22' }}>
              <ShieldCheck size={20} style={{ color: category.color }} />
            </div>
            <div>
              <h2 className="font-display font-semibold text-slate-800">{category.label} Inspection</h2>
              <p className="text-xs text-slate-400">{category.authority} · {category.frequency}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          {/* Inspection meta */}
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
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Inspector Name</label>
              <input value={form.inspector_name} onChange={e => set('inspector_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Internal or external inspector" />
            </div>
          </div>

          {/* Live status summary */}
          <div className="flex items-center gap-3 p-3 rounded-xl border-2"
            style={{ borderColor: autoStatus === 'pass' ? '#86efac' : autoStatus === 'fail' ? '#fca5a5' : '#fcd34d', background: autoStatus === 'pass' ? '#f0fdf4' : autoStatus === 'fail' ? '#fef2f2' : '#fffbeb' }}>
            <div className="flex gap-3 text-sm font-medium">
              <span className="text-green-700">{passCount} Pass</span>
              {warnCount > 0 && <span className="text-amber-700">{warnCount} Need Attention</span>}
              {failCount > 0 && <span className="text-red-700">{failCount} Fail</span>}
            </div>
            <div className="ml-auto">
              {(() => { const s = STATUS_CONFIG[autoStatus]; const Icon = s.icon
                return <span className={`flex items-center gap-1.5 text-sm font-semibold ${s.color}`}><Icon size={15} /> Auto: {s.label}</span>
              })()}
            </div>
          </div>

          {/* Checklist items */}
          <div>
            <h3 className="font-semibold text-slate-700 text-sm mb-3">Inspection Checklist ({items.length} items)</h3>
            <div className="space-y-2">
              {items.map((item, idx) => {
                const itemResult = results[item.id] || { result: 'pass', notes: '' }
                return (
                  <div key={item.id}
                    className={`p-4 rounded-xl border transition-all ${
                      itemResult.result === 'fail'            ? 'border-red-200 bg-red-50' :
                      itemResult.result === 'needs_attention' ? 'border-amber-200 bg-amber-50' :
                      itemResult.result === 'na'              ? 'border-slate-200 bg-slate-50 opacity-60' :
                      'border-slate-100 bg-white'
                    }`}>
                    <div className="flex items-start gap-3 mb-2">
                      <span className="text-xs font-bold text-slate-400 w-5 flex-shrink-0 mt-0.5">{idx + 1}</span>
                      <p className="text-sm text-slate-800 flex-1">{item.item_label}</p>
                      {item.is_required && <span className="text-red-500 text-xs font-bold flex-shrink-0">*</span>}
                    </div>
                    {/* Result buttons */}
                    <div className="flex gap-1.5 ml-8 mb-2">
                      {RESULT_OPTIONS.map(opt => {
                        const Icon = opt.icon
                        return (
                          <button key={opt.key} onClick={() => setItemResult(item.id, 'result', opt.key)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${itemResult.result === opt.key ? opt.color + ' ring-2 ring-offset-1 ring-slate-400' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                            <Icon size={10} /> {opt.label}
                          </button>
                        )
                      })}
                    </div>
                    {/* Notes (show when not pass) */}
                    {itemResult.result !== 'pass' && itemResult.result !== 'na' && (
                      <input value={itemResult.notes || ''} onChange={e => setItemResult(item.id, 'notes', e.target.value)}
                        className="w-full ml-8 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                        placeholder="Describe the issue or corrective action needed..." />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Overall notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Overall Notes / Inspector Comments</label>
            <textarea value={form.overall_notes} onChange={e => set('overall_notes', e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="General observations, conditions noted, corrective actions planned..." />
          </div>

          {/* File upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Attach Report / Documentation</label>
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
          <p className="text-xs text-slate-400">* Required items</p>
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
            const s    = STATUS_CONFIG[insp.status] || STATUS_CONFIG.pending
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
                      Inspector: {insp.inspector_name || (insp.profiles ? `${insp.profiles.first_name} ${insp.profiles.last_name}` : 'Unknown')}
                      {insp.next_due_date && ` · Next due: ${fmt(insp.next_due_date)}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {insp.report_url && (
                      <a href={insp.report_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        className="p-1.5 text-brand-500 hover:text-brand-700 rounded-lg hover:bg-brand-50 transition-colors">
                        <FileText size={14} />
                      </a>
                    )}
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                    {insp.overall_notes && (
                      <p className="text-sm text-slate-600 italic mb-3 bg-slate-50 px-3 py-2 rounded-lg">"{insp.overall_notes}"</p>
                    )}
                    <div className="space-y-1.5">
                      {(itemResults[insp.id] || []).map(result => {
                        const resultCfg = {
                          pass:            { icon: Check,         color: 'text-green-600' },
                          fail:            { icon: X,             color: 'text-red-600' },
                          needs_attention: { icon: AlertTriangle, color: 'text-amber-600' },
                          na:              { icon: Minus,         color: 'text-slate-400' },
                        }[result.result] || { icon: Check, color: 'text-green-600' }
                        const RIcon = resultCfg.icon
                        return (
                          <div key={result.id} className="flex items-start gap-2 text-xs">
                            <RIcon size={12} className={`${resultCfg.color} flex-shrink-0 mt-0.5`} />
                            <span className="text-slate-700 flex-1">{result.compliance_checklist_items?.item_label}</span>
                            {result.notes && <span className="text-slate-400 italic">— {result.notes}</span>}
                          </div>
                        )
                      })}
                    </div>
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
  const [categories, setCategories]     = useState([])
  const [lastInspections, setLastInspections] = useState({}) // categoryId -> inspection
  const [loading, setLoading]           = useState(true)
  const [showInspect, setShowInspect]   = useState(null)   // category
  const [showHistory, setShowHistory]   = useState(null)   // category

  useEffect(() => { if (orgId) fetchAll() }, [orgId])

  async function fetchAll() {
    setLoading(true)
    const { data: cats } = await supabase.from('compliance_categories')
      .select('*').order('sort_order')

    // Get most recent inspection per category
    const { data: inspections } = await supabase.from('compliance_inspections')
      .select('*').eq('organization_id', orgId)
      .order('inspection_date', { ascending: false })

    // Build last-inspection map
    const lastMap = {}
    inspections?.forEach(i => {
      if (!lastMap[i.category_id]) lastMap[i.category_id] = i
    })

    setCategories(cats || [])
    setLastInspections(lastMap)
    setLoading(false)
  }

  // Overall compliance score
  const totalCats     = categories.length
  const compliantCats = categories.filter(c => {
    const last = lastInspections[c.id]
    if (!last) return false
    if (['fail'].includes(last.status)) return false
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
    if (!last) return false
    if (!last.next_due_date) return false
    const d = daysUntil(last.next_due_date)
    return d >= 0 && d <= 30
  }).length

  if (loading) return <div className="text-center py-16 text-slate-400">Loading compliance data...</div>

  return (
    <div>
      {/* Compliance Score */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Compliant',   value: compliantCats, color: 'text-green-600',  bg: 'bg-green-50' },
          { label: 'Due Soon',    value: dueSoonCats,   color: dueSoonCats > 0 ? 'text-amber-600' : 'text-slate-400', bg: dueSoonCats > 0 ? 'bg-amber-50' : 'bg-slate-100' },
          { label: 'Overdue',     value: overdueCats,   color: overdueCats > 0 ? 'text-red-600' : 'text-slate-400',   bg: overdueCats > 0 ? 'bg-red-50' : 'bg-slate-100', alert: overdueCats > 0 },
          { label: 'Not Started', value: totalCats - compliantCats - dueSoonCats - overdueCats, color: 'text-slate-400', bg: 'bg-slate-100' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 ${s.alert ? 'ring-2 ring-red-300' : ''}`}>
            <div className={`text-3xl font-display font-bold ${s.color}`}>{s.value}</div>
            <div className="text-slate-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Authority reference */}
      <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3">
        <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800">
          <span className="font-semibold">Missouri Nursing Home Compliance Reference:</span> Inspections follow NFPA 101 Life Safety Code (2012 edition), Missouri DHSS §19 CSR 30-85, NFPA 10/25/72/110, CMS Conditions of Participation, and Missouri DOLIR elevator regulations. Maintain all completed inspection records for a minimum of 3 years.
        </div>
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

          return (
            <div key={cat.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-all ${
              urgencyBadge && (days === null || days < 0) ? 'border-red-200' :
              urgencyBadge && days <= 7 ? 'border-red-200' :
              urgencyBadge && days <= 30 ? 'border-amber-200' :
              'border-slate-100'}`}>
              <div className="flex items-center gap-4 p-4">
                {/* Color indicator */}
                <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: cat.color }} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-display font-semibold text-slate-800">{cat.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${freq.color}`}>{freq.label}</span>
                    {urgencyBadge && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${urgencyBadge.color}`}>{urgencyBadge.label}</span>
                    )}
                    {status && (
                      <span className={`flex items-center gap-1 text-xs font-medium ${status.color}`}>
                        <StatusIcon size={11} /> {status.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{cat.description}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span className="font-medium text-slate-500">{cat.authority}</span>
                    {last && (
                      <>
                        <span>Last: {fmt(last.inspection_date)}</span>
                        {last.next_due_date && <span>Next due: {fmt(last.next_due_date)}</span>}
                        {last.inspector_name && <span>by {last.inspector_name}</span>}
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => setShowHistory(cat)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600 transition-colors">
                    <Eye size={12} /> History
                  </button>
                  <button onClick={() => setShowInspect(cat)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium transition-colors">
                    <ClipboardCheck size={12} /> Conduct
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showInspect && (
        <InspectionModal
          category={showInspect}
          orgId={orgId}
          profile={profile}
          onClose={() => setShowInspect(null)}
          onSaved={() => { setShowInspect(null); fetchAll() }} />
      )}
      {showHistory && (
        <InspectionHistory
          category={showHistory}
          orgId={orgId}
          onClose={() => setShowHistory(null)} />
      )}
    </div>
  )
}
