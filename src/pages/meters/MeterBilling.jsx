import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { X, Download, Printer, CheckCircle, Undo2, AlertCircle, Loader2, ImageOff, Receipt } from 'lucide-react'

// Billing Export for utility meters. ElderLoop doesn't keep resident accounts: the
// business office bills elsewhere (Maranatha: statements on letterhead, then GP and
// PCC) from this summary, then marks the period billed (mark_meter_readings_billed).
// A billed reading's numbers are frozen by meter_billing_guard.

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const lastMonth = () => {
  const now = new Date()
  return { from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: iso(new Date(now.getFullYear(), now.getMonth(), 0)) }
}
const num = (n, d = 2) => n == null ? '' : Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
const money = (n) => n == null ? '—' : `$${num(n)}`
const fmtDate = (s) => s ? new Date(s + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const csvCell = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }

export default function MeterBilling({ meters, utilityTypes, onClose }) {
  const { organization } = useAuth()
  const [range, setRange]       = useState(lastMonth())
  const [readings, setReadings] = useState(null)
  const [unbilledOnly, setUnbilledOnly] = useState(true)
  const [reference, setReference] = useState('')
  const [busy, setBusy]         = useState(false)
  const [message, setMessage]   = useState(null)

  const typeById = useMemo(() => Object.fromEntries(utilityTypes.map(t => [t.id, t])), [utilityTypes])

  async function load() {
    setReadings(null)
    const { data, error } = await supabase.from('meter_readings')
      .select('id, meter_id, reading_date, reading_value, previous_value, usage, rate_per_unit, estimated_cost, photo_url, billed_at, billing_reference')
      .eq('organization_id', organization.id)
      .gte('reading_date', range.from).lte('reading_date', range.to)
      .order('reading_date')
    if (error) setMessage({ type: 'error', text: error.message })
    setReadings(data || [])
  }
  useEffect(() => { if (range.from && range.to) load() }, [range.from, range.to])

  // One line per meter that has readings in the period
  const lines = useMemo(() => {
    if (!readings) return []
    const byMeter = {}
    readings.forEach(r => { (byMeter[r.meter_id] ||= []).push(r) })
    return meters.filter(m => byMeter[m.id]).map(m => {
      const all = byMeter[m.id]
      const rs = unbilledOnly ? all.filter(r => !r.billed_at) : all
      if (!rs.length) return null
      const first = rs[0], last = rs[rs.length - 1]
      const type = typeById[m.utility_type_id]
      const charge = rs.reduce((s, r) => s + (r.estimated_cost != null ? Number(r.estimated_cost) : 0), 0)
      return {
        meter: m, type, readings: rs,
        resident: m.resident_name || '',
        start: first.previous_value ?? null, startDate: first.reading_date,
        end: last.reading_value, endDate: last.reading_date,
        usage: rs.reduce((s, r) => s + (Number(r.usage) || 0), 0),
        rate: last.rate_per_unit ?? type?.rate_per_unit ?? null,
        charge: rs.some(r => r.estimated_cost != null) ? charge : null,
        missingPhotos: rs.filter(r => !r.photo_url).length,
        photoUrl: last.photo_url,
        billed: rs.every(r => r.billed_at),
        reference: rs.find(r => r.billing_reference)?.billing_reference || '',
      }
    }).filter(Boolean).sort((a, b) => (a.resident || 'zzz').localeCompare(b.resident || 'zzz') || String(a.meter.unit).localeCompare(String(b.meter.unit)))
  }, [readings, meters, typeById, unbilledOnly])

  // Statements group a resident's (or an unassigned unit's) meters together
  const statements = useMemo(() => {
    const groups = {}
    lines.forEach(l => {
      const key = l.meter.resident_id || l.resident || `unit:${l.meter.building || ''}|${l.meter.unit}`
      ;(groups[key] ||= { resident: l.resident, unit: l.meter.unit, building: l.meter.building, lines: [] }).lines.push(l)
    })
    return Object.values(groups)
  }, [lines])

  const unread   = readings ? meters.filter(m => !readings.some(r => r.meter_id === m.id)) : []
  const total    = lines.reduce((s, l) => s + (l.charge || 0), 0)
  const noRate   = lines.filter(l => l.charge == null).length
  const noPhoto  = lines.reduce((s, l) => s + l.missingPhotos, 0)
  const toMark   = lines.filter(l => !l.billed).flatMap(l => l.readings.filter(r => !r.billed_at).map(r => r.id))
  const toUnmark = lines.filter(l => l.billed).flatMap(l => l.readings.map(r => r.id))

  function downloadCsv() {
    const head = ['Resident', 'Building', 'Unit', 'Utility', 'Meter Number', 'Period Start', 'Period End',
      'Start Reading', 'End Reading', 'Usage', 'Unit of Measure', 'Rate', 'Charge', 'Billed', 'Billing Reference', 'Photo']
    const rows = lines.map(l => [l.resident, l.meter.building, l.meter.unit, l.type?.name, l.meter.meter_number,
      l.startDate, l.endDate, l.start ?? '', l.end, l.usage.toFixed(2), l.type?.unit, l.rate ?? '',
      l.charge != null ? l.charge.toFixed(2) : '', l.billed ? 'Yes' : 'No', l.reference, l.photoUrl || ''])
    const csv = [head, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url; a.download = `utility-billing-${range.from}-to-${range.to}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  function printStatements() {
    const o = organization
    const addr = [o.address, [o.city, o.state].filter(Boolean).join(', ') + (o.zip ? ` ${o.zip}` : '')].filter(s => s && s.trim()).join('<br>')
    const pages = statements.map(s => {
      const sub = s.lines.reduce((t, l) => t + (l.charge || 0), 0)
      return `<section class="page">
        <header>
          <div>${o.logo_url ? `<img src="${esc(o.logo_url)}" class="logo">` : ''}<div class="org">${esc(o.name)}</div>
            <div class="small">${addr}${o.phone ? `<br>${esc(o.phone)}` : ''}</div></div>
          <div class="right"><div class="title">Utility Statement</div>
            <div class="small">Service period ${esc(fmtDate(range.from))} – ${esc(fmtDate(range.to))}</div></div>
        </header>
        <div class="to"><div class="label">Resident</div><div class="name">${esc(s.resident || 'Unassigned')}</div>
          <div class="small">${esc([s.building, s.unit && `Unit ${s.unit}`].filter(Boolean).join(' · '))}</div></div>
        <table><thead><tr><th>Utility</th><th>Meter</th><th>Dates</th><th class="n">Previous</th><th class="n">Current</th><th class="n">Usage</th><th class="n">Rate</th><th class="n">Amount</th></tr></thead>
        <tbody>${s.lines.map(l => `<tr><td>${esc(l.type?.name)}</td><td>${esc(l.meter.meter_number || '')}</td>
          <td>${esc(fmtDate(l.startDate))}${l.startDate !== l.endDate ? ` – ${esc(fmtDate(l.endDate))}` : ''}</td>
          <td class="n">${l.start != null ? num(l.start) : '—'}</td><td class="n">${num(l.end)}</td>
          <td class="n">${num(l.usage)} ${esc(l.type?.unit || '')}</td><td class="n">${l.rate != null ? '$' + num(l.rate, 4) : '—'}</td>
          <td class="n">${money(l.charge)}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td colspan="7" class="n">Total due</td><td class="n">${money(sub)}</td></tr></tfoot></table>
      </section>`
    }).join('')
    const w = window.open('', '_blank')
    if (!w) { setMessage({ type: 'error', text: 'Allow pop-ups to print statements.' }); return }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Utility Statements</title><style>
      body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;margin:0}
      .page{padding:40px 48px;page-break-after:always}
      header{display:flex;justify-content:space-between;border-bottom:2px solid #0c90e1;padding-bottom:14px;margin-bottom:22px}
      .logo{max-height:56px;max-width:220px;display:block;margin-bottom:6px}.org{font-size:18px;font-weight:bold}
      .right{text-align:right}.title{font-size:20px;font-weight:bold;color:#0c90e1}.small{font-size:12px;color:#64748b;line-height:1.5}
      .to{margin-bottom:20px}.label{font-size:11px;text-transform:uppercase;color:#94a3b8;letter-spacing:.05em}.name{font-size:16px;font-weight:bold}
      table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f1f5f9;text-align:left;padding:8px;font-size:11px;text-transform:uppercase;color:#64748b}
      td{padding:8px;border-bottom:1px solid #e2e8f0}.n{text-align:right}tfoot td{font-weight:bold;font-size:15px;border-top:2px solid #1e293b;border-bottom:none}
      @media print{.page{padding:24px 32px}}</style></head><body>${pages}</body></html>`)
    w.document.close()
    w.onload = () => w.print()
  }

  async function mark(billed) {
    const ids = billed ? toMark : toUnmark
    if (!ids.length) return
    if (!billed && !confirm(`Mark ${ids.length} reading${ids.length === 1 ? '' : 's'} as not billed? Do this only if the bills were never sent.`)) return
    setBusy(true); setMessage(null)
    const { data, error } = await supabase.rpc('mark_meter_readings_billed', { p_ids: ids, p_billed: billed, p_reference: reference || null })
    setBusy(false)
    if (error) { setMessage({ type: 'error', text: error.message }); return }
    setMessage({ type: 'ok', text: billed ? `${data} reading${data === 1 ? '' : 's'} marked billed.` : `${data} reading${data === 1 ? '' : 's'} marked not billed.` })
    load()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 sm:rounded-2xl shadow-2xl w-full max-w-5xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2"><Receipt size={18} className="text-brand-600" />
            <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100">Billing Export</h2></div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">From</label>
            <input type="date" value={range.from} onChange={e => setRange(r => ({ ...r, from: e.target.value }))}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">To</label>
            <input type="date" value={range.to} onChange={e => setRange(r => ({ ...r, to: e.target.value }))}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 pb-2">
            <input type="checkbox" checked={unbilledOnly} onChange={e => setUnbilledOnly(e.target.checked)} /> Not yet billed only
          </label>
          <div className="ml-auto flex gap-2 flex-wrap">
            <button onClick={downloadCsv} disabled={!lines.length}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-300 disabled:opacity-40 rounded-xl text-sm font-medium">
              <Download size={15} /> Download CSV
            </button>
            <button onClick={printStatements} disabled={!lines.length}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-300 disabled:opacity-40 rounded-xl text-sm font-medium">
              <Printer size={15} /> Print Statements
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {message && (
            <div className={`px-4 py-2 rounded-xl text-sm ${message.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>{message.text}</div>
          )}
          {readings && (unread.length > 0 || noRate > 0 || noPhoto > 0) && (
            <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-sm text-amber-800 dark:text-amber-300 space-y-1">
              {unread.length > 0 && <div className="flex gap-2"><AlertCircle size={15} className="flex-shrink-0 mt-0.5" />{unread.length} meter{unread.length === 1 ? ' has' : 's have'} no reading in this period: {unread.slice(0, 6).map(m => m.resident_name || `Unit ${m.unit}`).join(', ')}{unread.length > 6 ? '…' : ''}</div>}
              {noRate > 0 && <div className="flex gap-2"><AlertCircle size={15} className="flex-shrink-0 mt-0.5" />{noRate} line{noRate === 1 ? ' has' : 's have'} no rate, so no charge. Set the rate under Utility Types.</div>}
              {noPhoto > 0 && <div className="flex gap-2"><ImageOff size={15} className="flex-shrink-0 mt-0.5" />{noPhoto} reading{noPhoto === 1 ? '' : 's'} without a photo. Check those numbers before billing.</div>}
            </div>
          )}

          {!readings ? (
            <div className="py-16 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" size={22} /></div>
          ) : lines.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">{unbilledOnly ? 'Nothing left to bill for these dates.' : 'No readings in these dates.'}</div>
          ) : (
            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="px-3 py-2 text-left">Resident</th><th className="px-3 py-2 text-left">Unit</th><th className="px-3 py-2 text-left">Utility</th>
                    <th className="px-3 py-2 text-right">Previous</th><th className="px-3 py-2 text-right">Current</th><th className="px-3 py-2 text-right">Usage</th>
                    <th className="px-3 py-2 text-right">Rate</th><th className="px-3 py-2 text-right">Charge</th><th className="px-3 py-2 text-center">Photo</th><th className="px-3 py-2 text-left">Billed</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map(l => (
                    <tr key={l.meter.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2 text-slate-800 dark:text-slate-100">{l.resident || <span className="text-slate-400">Unassigned</span>}</td>
                      <td className="px-3 py-2 text-slate-500">{[l.meter.building, l.meter.unit].filter(Boolean).join(' · ')}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{l.type?.name}</td>
                      <td className="px-3 py-2 text-right font-mono">{l.start != null ? num(l.start) : '—'}</td>
                      <td className="px-3 py-2 text-right font-mono">{num(l.end)}</td>
                      <td className="px-3 py-2 text-right font-mono">{num(l.usage)} <span className="text-xs text-slate-400">{l.type?.unit}</span></td>
                      <td className="px-3 py-2 text-right font-mono text-slate-500">{l.rate != null ? `$${num(l.rate, 4)}` : '—'}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-800 dark:text-slate-100">{money(l.charge)}</td>
                      <td className="px-3 py-2 text-center">
                        {l.photoUrl
                          ? <a href={l.photoUrl} target="_blank" rel="noreferrer"><img src={l.photoUrl} alt="Meter" className="w-8 h-8 object-cover rounded inline-block border border-slate-200" /></a>
                          : <ImageOff size={15} className="inline text-slate-300" />}
                      </td>
                      <td className="px-3 py-2 text-xs">{l.billed ? <span className="text-green-700 dark:text-green-400">Yes{l.reference ? ` · ${l.reference}` : ''}</span> : <span className="text-slate-400">No</span>}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                    <td colSpan={7} className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">{statements.length} statement{statements.length === 1 ? '' : 's'} · Total</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-800 dark:text-slate-100">{money(total)}</td><td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
          <input value={reference} onChange={e => setReference(e.target.value)} placeholder="Billing reference (e.g. GP batch Oct 2026)"
            className="flex-1 min-w-[220px] px-3 py-2 border border-slate-200 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" />
          {toUnmark.length > 0 && (
            <button onClick={() => mark(false)} disabled={busy}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 font-medium"><Undo2 size={15} /> Mark not billed</button>
          )}
          <button onClick={() => mark(true)} disabled={busy || !toMark.length}
            className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-xl">
            <CheckCircle size={15} /> Mark {toMark.length || ''} billed
          </button>
        </div>
      </div>
    </div>
  )
}
