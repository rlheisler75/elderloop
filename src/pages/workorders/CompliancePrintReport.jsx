import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { X, Printer, FileText, CheckCircle2, XCircle, AlertTriangle, Clock, Calendar } from 'lucide-react'

const STATUS_CONFIG = {
  pass:                 { label: 'PASS',              color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  pass_with_conditions: { label: 'PASS W/ CONDITIONS', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  fail:                 { label: 'FAIL',              color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  pending:              { label: 'PENDING',           color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
}

const FREQ_LABELS = {
  daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',
  quarterly: 'Quarterly', biannual: 'Bi-Annual', annual: 'Annual',
}

const fmt = (dateStr) => dateStr
  ? new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  : '—'

const fmtShort = (dateStr) => dateStr
  ? new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : '—'

// ── Print Report Modal ────────────────────────────────────────
export default function CompliancePrintReport({ orgId, orgName, stateCode, stateRef, categories, onClose }) {
  const [dateFrom, setDateFrom]     = useState(() => {
    const d = new Date(); d.setFullYear(d.getFullYear() - 1)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo]         = useState(() => new Date().toISOString().split('T')[0])
  const [inspections, setInspections] = useState([])
  const [itemResults, setItemResults] = useState({}) // inspectionId -> results
  const [loading, setLoading]       = useState(false)
  const [loaded, setLoaded]         = useState(false)
  const printRef = useRef()

  const handleLoad = async () => {
    setLoading(true)
    // Fetch all inspections in date range
    const { data: inspData } = await supabase
      .from('compliance_inspections')
      .select('*, profiles!conducted_by(first_name, last_name)')
      .eq('organization_id', orgId)
      .gte('inspection_date', dateFrom)
      .lte('inspection_date', dateTo)
      .order('inspection_date', { ascending: false })

    const insp = inspData || []
    setInspections(insp)

    // Fetch checklist results for all inspections
    if (insp.length > 0) {
      const ids = insp.map(i => i.id)
      const { data: resultsData } = await supabase
        .from('compliance_inspection_results')
        .select('*, compliance_checklist_items(item_label)')
        .in('inspection_id', ids)

      const map = {}
      resultsData?.forEach(r => {
        if (!map[r.inspection_id]) map[r.inspection_id] = []
        map[r.inspection_id].push(r)
      })
      setItemResults(map)
    }

    setLoading(false)
    setLoaded(true)
  }

  const handlePrint = () => {
    const printContent = printRef.current
    const win = window.open('', '_blank', 'width=900,height=700')
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Life Safety Compliance Report — ${orgName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11pt; color: #1e293b; background: white; }
          .report { max-width: 800px; margin: 0 auto; padding: 32px; }

          /* Cover header */
          .cover-header { border-bottom: 3px solid #1e3a5f; padding-bottom: 20px; margin-bottom: 24px; }
          .cover-header h1 { font-size: 22pt; font-weight: 700; color: #1e3a5f; margin-bottom: 4px; }
          .cover-header h2 { font-size: 14pt; font-weight: 600; color: #334155; margin-bottom: 12px; }
          .cover-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 9pt; color: #64748b; }
          .cover-meta span strong { color: #334155; }

          /* Authority banner */
          .authority-banner { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 12px 16px; margin-bottom: 24px; font-size: 9pt; color: #1e40af; line-height: 1.5; }
          .authority-banner strong { color: #1d4ed8; }

          /* Summary table */
          .summary-section { margin-bottom: 28px; }
          .summary-section h3 { font-size: 11pt; font-weight: 700; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
          .summary-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; text-align: center; }
          .summary-card .val { font-size: 22pt; font-weight: 700; }
          .summary-card .lbl { font-size: 8pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }
          .summary-card.pass { border-color: #86efac; background: #f0fdf4; }
          .summary-card.pass .val { color: #16a34a; }
          .summary-card.fail { border-color: #fca5a5; background: #fef2f2; }
          .summary-card.fail .val { color: #dc2626; }
          .summary-card.warn { border-color: #fcd34d; background: #fffbeb; }
          .summary-card.warn .val { color: #d97706; }
          .summary-card.none { border-color: #e2e8f0; background: #f8fafc; }
          .summary-card.none .val { color: #94a3b8; }

          /* Category sections */
          .category-section { margin-bottom: 28px; page-break-inside: avoid; }
          .category-header { display: flex; align-items: center; justify-content: space-between; background: #1e3a5f; color: white; padding: 10px 14px; border-radius: 6px 6px 0 0; }
          .category-header h3 { font-size: 11pt; font-weight: 600; }
          .category-header .meta { font-size: 9pt; opacity: 0.8; }
          .category-no-records { padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 6px 6px; font-size: 9pt; color: #94a3b8; font-style: italic; }

          /* Inspection record */
          .inspection-record { border: 1px solid #e2e8f0; border-top: none; }
          .inspection-record:last-child { border-radius: 0 0 6px 6px; }
          .inspection-header { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
          .status-badge { padding: 3px 10px; border-radius: 12px; font-size: 8pt; font-weight: 700; letter-spacing: 0.05em; border: 1px solid; }
          .inspection-meta { font-size: 9pt; color: #64748b; flex: 1; }
          .inspection-meta strong { color: #334155; }
          .report-link { font-size: 9pt; color: #3b82f6; }

          /* Checklist results */
          .checklist { padding: 10px 14px; }
          .checklist-item { display: flex; align-items: flex-start; gap: 10px; padding: 5px 0; border-bottom: 1px solid #f1f5f9; font-size: 9pt; }
          .checklist-item:last-child { border-bottom: none; }
          .item-result { min-width: 48px; padding: 2px 6px; border-radius: 3px; font-size: 8pt; font-weight: 700; text-align: center; }
          .item-result.pass { background: #f0fdf4; color: #16a34a; border: 1px solid #86efac; }
          .item-result.fail { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
          .item-result.needs_attention { background: #fffbeb; color: #d97706; border: 1px solid #fcd34d; }
          .item-label { color: #334155; flex: 1; }
          .item-notes { color: #64748b; font-style: italic; margin-left: 4px; }

          /* Notes */
          .overall-notes { padding: 8px 14px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 9pt; color: #475569; font-style: italic; }

          /* Footer */
          .report-footer { margin-top: 32px; padding-top: 16px; border-top: 2px solid #e2e8f0; font-size: 8.5pt; color: #64748b; display: flex; justify-content: space-between; }

          @media print {
            body { font-size: 10pt; }
            .report { padding: 0; }
            .category-section { page-break-inside: avoid; }
            .inspection-record { page-break-inside: avoid; }
            @page { margin: 0.75in 0.75in 0.75in 0.75in; size: letter; }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `)
    win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 300)
  }

  // Group inspections by category
  const catMap = {}
  categories.forEach(c => { catMap[c.id] = c })

  const inspByCategory = {}
  inspections.forEach(i => {
    const catId = i.category_id
    if (!inspByCategory[catId]) inspByCategory[catId] = []
    inspByCategory[catId].push(i)
  })

  // Stats
  const passCount = inspections.filter(i => i.status === 'pass').length
  const failCount = inspections.filter(i => i.status === 'fail').length
  const warnCount = inspections.filter(i => i.status === 'pass_with_conditions').length
  const noneCount = categories.filter(c => !inspByCategory[c.id]).length

  // Categories that have inspections in range
  const catsWithInspections = categories.filter(c => inspByCategory[c.id]?.length > 0)
  const catsWithoutInspections = categories.filter(c => !inspByCategory[c.id] || inspByCategory[c.id].length === 0)

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[92vh]">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Printer size={20} className="text-brand-600" />
            <div>
              <h2 className="font-display font-semibold text-slate-800">Surveyor Compliance Report</h2>
              <p className="text-xs text-slate-400 mt-0.5">Select a date range and generate a printable inspection record</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        {/* Date Range Controls */}
        <div className="px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-end gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">From Date</label>
              <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setLoaded(false) }}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">To Date</label>
              <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setLoaded(false) }}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div className="flex gap-2">
              {/* Quick ranges */}
              {[
                { label: 'Last 6 mo', months: 6 },
                { label: 'Last year', months: 12 },
                { label: 'Last 3 years', months: 36 },
              ].map(r => (
                <button key={r.label}
                  onClick={() => {
                    const d = new Date(); d.setMonth(d.getMonth() - r.months)
                    setDateFrom(d.toISOString().split('T')[0])
                    setDateTo(new Date().toISOString().split('T')[0])
                    setLoaded(false)
                  }}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 hover:border-brand-300 hover:text-brand-600 transition-colors">
                  {r.label}
                </button>
              ))}
            </div>
            <button onClick={handleLoad} disabled={loading}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors ml-auto">
              {loading ? 'Loading...' : 'Generate Report'}
            </button>
          </div>
        </div>

        {/* Report Preview */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!loaded && !loading && (
            <div className="text-center py-16 text-slate-400">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a date range and click Generate Report</p>
              <p className="text-xs mt-1 text-slate-300">Report includes all inspection records within the selected period</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-16 text-slate-400">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm">Loading inspection records...</p>
            </div>
          )}

          {loaded && (
            <>
              {/* Print button */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-500">
                  <span className="font-medium text-slate-700">{inspections.length}</span> inspection record{inspections.length !== 1 ? 's' : ''} found
                  {inspections.length === 0 && ' — report will show categories with no records'}
                </p>
                <button onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-xl transition-colors">
                  <Printer size={15} /> Print / Save as PDF
                </button>
              </div>

              {/* Printable content (hidden from screen, rendered to print window) */}
              <div ref={printRef} style={{ display: 'none' }}>
                <div className="report">
                  {/* Cover */}
                  <div className="cover-header">
                    <h1>Life Safety Compliance Report</h1>
                    <h2>{orgName}</h2>
                    <div className="cover-meta">
                      <span><strong>Report Period:</strong> {fmtShort(dateFrom)} — {fmtShort(dateTo)}</span>
                      <span><strong>State:</strong> {stateRef?.label || stateCode}</span>
                      <span><strong>Regulatory Authority:</strong> {stateRef?.authority || 'CMS Federal'}</span>
                      <span><strong>Report Generated:</strong> {today}</span>
                      <span><strong>Total Inspections:</strong> {inspections.length}</span>
                      <span><strong>Categories Tracked:</strong> {categories.length}</span>
                    </div>
                  </div>

                  {/* Authority reference */}
                  <div className="authority-banner">
                    <strong>Compliance Reference ({stateRef?.label || stateCode}):</strong> {stateRef?.summary || 'Federal CMS requirements apply.'} {stateRef?.retention}
                  </div>

                  {/* Summary */}
                  <div className="summary-section">
                    <h3>Inspection Summary</h3>
                    <div className="summary-grid">
                      <div className="summary-card pass"><div className="val">{passCount}</div><div className="lbl">Passed</div></div>
                      <div className="summary-card warn"><div className="val">{warnCount}</div><div className="lbl">Pass w/ Conditions</div></div>
                      <div className="summary-card fail"><div className="val">{failCount}</div><div className="lbl">Failed</div></div>
                      <div className="summary-card none"><div className="val">{noneCount}</div><div className="lbl">No Records</div></div>
                    </div>
                  </div>

                  {/* Categories with inspections */}
                  {catsWithInspections.map(cat => (
                    <div key={cat.id} className="category-section">
                      <div className="category-header">
                        <h3>{cat.label}</h3>
                        <div className="meta">
                          {cat.authority_ref && <span>{cat.authority_ref} · </span>}
                          {FREQ_LABELS[cat.frequency] || cat.frequency} · {inspByCategory[cat.id]?.length || 0} record{(inspByCategory[cat.id]?.length || 0) !== 1 ? 's' : ''}
                        </div>
                      </div>
                      {(inspByCategory[cat.id] || []).map(insp => {
                        const s = STATUS_CONFIG[insp.status] || STATUS_CONFIG.pending
                        const inspector = insp.inspector_name || (insp.profiles ? `${insp.profiles.first_name} ${insp.profiles.last_name}` : '—')
                        const results = itemResults[insp.id] || []
                        return (
                          <div key={insp.id} className="inspection-record">
                            <div className="inspection-header">
                              <div className="status-badge" style={{ background: s.bg, color: s.color, borderColor: s.border }}>
                                {s.label}
                              </div>
                              <div className="inspection-meta">
                                <strong>{fmt(insp.inspection_date)}</strong>
                                {insp.next_due_date && <span style={{ marginLeft: '12px' }}>Next due: {fmt(insp.next_due_date)}</span>}
                                <span style={{ marginLeft: '12px' }}>Inspector: {inspector}</span>
                              </div>
                              {insp.report_url && (
                                <div className="report-link">📎 Report attached</div>
                              )}
                            </div>

                            {results.length > 0 && (
                              <div className="checklist">
                                {results.map((r, idx) => (
                                  <div key={idx} className="checklist-item">
                                    <span className={`item-result ${r.result === 'needs_attention' ? 'needs_attention' : r.result}`}>
                                      {r.result === 'pass' ? 'PASS' : r.result === 'fail' ? 'FAIL' : 'ATTN'}
                                    </span>
                                    <span className="item-label">
                                      {r.compliance_checklist_items?.item_label}
                                      {r.notes && <span className="item-notes"> — {r.notes}</span>}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {insp.overall_notes && (
                              <div className="overall-notes">
                                <strong>Notes:</strong> {insp.overall_notes}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}

                  {/* Categories with no inspections in range */}
                  {catsWithoutInspections.length > 0 && (
                    <div className="category-section">
                      <div className="category-header" style={{ background: '#64748b' }}>
                        <h3>No Records in Selected Period</h3>
                        <div className="meta">{catsWithoutInspections.length} categories</div>
                      </div>
                      {catsWithoutInspections.map(cat => (
                        <div key={cat.id} className="category-no-records">
                          <strong>{cat.label}</strong>
                          {cat.authority_ref && <span style={{ marginLeft: '8px', color: '#94a3b8' }}>{cat.authority_ref}</span>}
                          <span style={{ marginLeft: '8px' }}>({FREQ_LABELS[cat.frequency] || cat.frequency})</span>
                          <span style={{ marginLeft: '8px' }}>— No inspection records found for this period</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="report-footer">
                    <span>ElderLoop Life Safety Compliance Report · Generated {today}</span>
                    <span>{orgName} · Retain records per {stateRef?.label || 'federal'} requirements</span>
                  </div>
                </div>
              </div>

              {/* Screen preview (simplified) */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                {/* Preview header */}
                <div className="bg-slate-800 text-white px-5 py-3">
                  <div className="font-semibold text-sm">Life Safety Compliance Report — {orgName}</div>
                  <div className="text-slate-400 text-xs mt-0.5">{fmtShort(dateFrom)} – {fmtShort(dateTo)} · {stateRef?.label || stateCode}</div>
                </div>

                {/* Summary row */}
                <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100">
                  {[
                    { label: 'Passed', value: passCount, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Pass w/ Conditions', value: warnCount, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Failed', value: failCount, color: 'text-red-600', bg: 'bg-red-50' },
                    { label: 'No Records', value: noneCount, color: 'text-slate-400', bg: 'bg-slate-50' },
                  ].map(s => (
                    <div key={s.label} className={`${s.bg} px-4 py-3 text-center`}>
                      <div className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-slate-500 text-xs">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Category list preview */}
                <div className="divide-y divide-slate-50">
                  {categories.map(cat => {
                    const catInspections = inspByCategory[cat.id] || []
                    const latest = catInspections[0]
                    const s = latest ? STATUS_CONFIG[latest.status] : null
                    return (
                      <div key={cat.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800">{cat.label}</div>
                          <div className="text-xs text-slate-400">
                            {cat.authority_ref && <span className="font-mono mr-2">{cat.authority_ref}</span>}
                            {FREQ_LABELS[cat.frequency] || cat.frequency}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {latest ? (
                            <>
                              <div className="text-xs font-semibold" style={{ color: s?.color }}>{s?.label}</div>
                              <div className="text-xs text-slate-400">{catInspections.length} record{catInspections.length !== 1 ? 's' : ''} · Last: {fmtShort(latest.inspection_date)}</div>
                            </>
                          ) : (
                            <div className="text-xs text-slate-400 italic">No records in range</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
