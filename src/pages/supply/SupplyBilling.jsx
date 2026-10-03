import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useSupplyAccess } from '../../hooks/useSupplyAccess'
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, Receipt, Download, CheckCircle, Undo2, TrendingDown } from 'lucide-react'
import { money, firstOfMonth, monthLabel, shiftMonth } from '../../lib/budgets'

// Resident charges and billable leakage (budget layer Phase 2).
// ElderLoop doesn't keep resident accounts: the business office bills elsewhere and
// marks charges billed here (mark_supply_charges_billed). Leakage counts chargeable
// items issued to a department instead of a resident, plus resident charges not
// yet marked billed. The leakage totals need the Budgets add-on; the billing list
// doesn't.

const lastOfMonth = (iso) => {
  const d = new Date(iso + 'T12:00:00')
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
}

function LeakagePanel({ month, orgId }) {
  const { hasModule } = useAuth()
  const budgetsOn = hasModule('budgets')
  const [rows, setRows] = useState(null)
  const [ppd, setPpd] = useState(null)

  useEffect(() => {
    if (!budgetsOn) return
    setRows(null)
    Promise.all([
      supabase.rpc('supply_leakage', { p_month: month, p_org: orgId }),
      supabase.rpc('budget_status', { p_month: month, p_org: orgId }),
    ]).then(([leak, status]) => {
      setRows(leak.data || [])
      setPpd((status.data || []).find(r => r.department === 'central_supply') || null)
    })
  }, [month, orgId, budgetsOn])

  if (!budgetsOn || !rows || (rows.length === 0 && !ppd)) return null

  const chargeable = rows.reduce((s, r) => s + Number(r.chargeable_value), 0)
  const uncharged = rows.reduce((s, r) => s + Number(r.uncharged_value), 0)
  const noPrice = rows.reduce((s, r) => s + Number(r.lines_without_price), 0)
  const rate = chargeable > 0 ? Math.round(uncharged / chargeable * 1000) / 10 : null

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingDown size={16} className="text-brand-600" />
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Billable leakage</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div className="text-xl font-display font-bold text-slate-800 dark:text-slate-100">{money(chargeable, 2)}</div>
          <div className="text-xs text-slate-400">Chargeable items issued</div>
        </div>
        <div className={`p-3 rounded-xl ${uncharged > 0 ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-slate-50 dark:bg-slate-800'}`}>
          <div className={`text-xl font-display font-bold ${uncharged > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100'}`}>{money(uncharged, 2)}</div>
          <div className="text-xs text-slate-400">Not charged or not billed</div>
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div className="text-xl font-display font-bold text-slate-800 dark:text-slate-100">{rate != null ? `${rate}%` : '—'}</div>
          <div className="text-xs text-slate-400">Leakage rate</div>
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div className="text-xl font-display font-bold text-slate-800 dark:text-slate-100">{ppd?.spend_ppd != null ? money(ppd.spend_ppd, 2) : '—'}</div>
          <div className="text-xs text-slate-400">Supply spend per resident day</div>
        </div>
      </div>
      {rows.length > 0 && (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800">
            <th className="py-2">Went to</th><th className="py-2 text-right">Chargeable</th><th className="py-2 text-right">Not charged / not billed</th><th className="py-2 text-right">Rate</th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.kind + r.charged_to} className="border-b border-slate-50 dark:border-slate-800">
                <td className="py-2 text-slate-700 dark:text-slate-200">
                  {r.charged_to}
                  <span className="text-xs text-slate-400"> · {r.kind === 'resident' ? 'not marked billed' : 'issued to a department, never charged'}</span>
                </td>
                <td className="py-2 text-right text-slate-600 dark:text-slate-300">{money(r.chargeable_value, 2)}</td>
                <td className="py-2 text-right font-semibold text-slate-800 dark:text-slate-100">{money(r.uncharged_value, 2)}</td>
                <td className="py-2 text-right text-slate-500">{Number(r.chargeable_value) > 0 ? `${Math.round(r.uncharged_value / r.chargeable_value * 100)}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="text-xs text-slate-400 mt-3">
        Valued at the sale price recorded when the item was issued (or the item's current sale price for older issues).
        {noPrice > 0 && <span className="text-amber-600 dark:text-amber-400"> {noPrice} chargeable {noPrice === 1 ? 'line has' : 'lines have'} no sale price and {noPrice === 1 ? 'isn’t' : 'aren’t'} counted; set prices in Inventory.</span>}
      </p>
    </div>
  )
}

export default function SupplyBilling() {
  const { organization } = useAuth()
  const { canBill } = useSupplyAccess()
  const orgId = organization?.id
  const [month, setMonth] = useState(firstOfMonth())
  const [unbilledOnly, setUnbilledOnly] = useState(true)
  const [rows, setRows] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!orgId) return
    setRows(null); setError(''); setSelected(new Set())
    const { data, error } = await supabase.rpc('supply_resident_charges', {
      p_from: month, p_to: lastOfMonth(month), p_unbilled_only: unbilledOnly, p_org: orgId,
    })
    if (error) setError(error.message)
    setRows(data || [])
  }, [orgId, month, unbilledOnly])
  useEffect(() => { load() }, [load])

  const mark = async (ids, billed) => {
    setBusy(true); setError('')
    const { error } = await supabase.rpc('mark_supply_charges_billed', { p_ids: ids, p_billed: billed, p_reference: reference || null })
    setBusy(false)
    if (error) return setError(error.message)
    setReference('')
    load()
  }

  const toggle = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const unbilledRows = (rows || []).filter(r => !r.billed_at)
  const allSelected = unbilledRows.length > 0 && unbilledRows.every(r => selected.has(r.id))
  const selectedTotal = (rows || []).filter(r => selected.has(r.id)).reduce((s, r) => s + Number(r.amount || 0), 0)
  const listTotal = (rows || []).reduce((s, r) => s + Number(r.amount || 0), 0)

  const exportCsv = () => {
    const header = ['Date', 'Resident', 'Room', 'Item', 'Quantity', 'Unit price', 'Amount', 'Billed', 'Billing reference', 'Issued by']
    const lines = [header, ...(rows || []).map(r => [
      r.charged_on, r.resident_name ?? '', r.room ?? '', r.item ?? '', r.quantity, r.unit_price ?? '', r.amount ?? '',
      r.billed_at ? new Date(r.billed_at).toLocaleDateString() : '', r.billing_reference ?? '', r.issued_by ?? '',
    ])]
    const csv = lines.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `resident-charges-${month.slice(0, 7)}${unbilledOnly ? '-unbilled' : ''}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-5 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-lg">Resident charges</h2>
          <p className="text-sm text-slate-400">Bill these in your billing system, then mark them billed here so nothing slips through.</p>
        </div>
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-1">
          <button onClick={() => setMonth(m => shiftMonth(m, -1))} className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"><ChevronLeft size={16} /></button>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 w-36 text-center">{monthLabel(month)}</span>
          <button onClick={() => setMonth(m => shiftMonth(m, 1))} className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"><ChevronRight size={16} /></button>
        </div>
      </div>

      <LeakagePanel month={month} orgId={orgId} />

      {error && <div className="px-4 py-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-400 text-sm flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {[[true, 'Not billed'], [false, 'All charges']].map(([v, label]) => (
              <button key={label} onClick={() => setUnbilledOnly(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${unbilledOnly === v ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-400 shadow-sm' : 'text-slate-500'}`}>{label}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canBill && selected.size > 0 && (
              <>
                <input value={reference} onChange={e => setReference(e.target.value)} placeholder="Invoice or batch # (optional)"
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs w-52 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                <button onClick={() => mark([...selected], true)} disabled={busy}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg">
                  <CheckCircle size={13} /> Mark {selected.size} billed ({money(selectedTotal, 2)})
                </button>
              </>
            )}
            <button onClick={exportCsv} disabled={!rows?.length}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40">
              <Download size={13} /> Export CSV
            </button>
          </div>
        </div>

        {!rows ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div> : rows.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            <Receipt size={28} className="mx-auto mb-2 opacity-40" />
            {unbilledOnly ? 'Every resident charge this month is marked billed.' : 'No resident charges this month.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800">
                {canBill && <th className="px-4 py-3 w-8"><input type="checkbox" checked={allSelected} disabled={unbilledRows.length === 0}
                  onChange={() => setSelected(allSelected ? new Set() : new Set(unbilledRows.map(r => r.id)))} /></th>}
                <th className="px-4 py-3">Date</th><th className="px-4 py-3">Resident</th><th className="px-4 py-3">Item</th>
                <th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Billed</th>
              </tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b border-slate-50 dark:border-slate-800">
                    {canBill && <td className="px-4 py-3">{!r.billed_at && <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />}</td>}
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{r.charged_on}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.resident_name ?? '—'}{r.room && <span className="text-xs text-slate-400"> · {r.room}</span>}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.item}</td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{Number(r.quantity)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-100">
                      {r.amount != null ? money(r.amount, 2) : <span className="text-xs font-normal text-amber-600 dark:text-amber-400">No price</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.billed_at ? (
                        <span className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400">
                          {new Date(r.billed_at).toLocaleDateString()}{r.billing_reference && ` · ${r.billing_reference}`}
                          {canBill && <button onClick={() => mark([r.id], false)} disabled={busy} title="Mark not billed" className="text-slate-300 hover:text-slate-600"><Undo2 size={12} /></button>}
                        </span>
                      ) : <span className="text-xs text-amber-600 dark:text-amber-400">Not billed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={canBill ? 5 : 4} className="px-4 py-3 text-right text-xs text-slate-400">{rows.length} charges</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-100">{money(listTotal, 2)}</td><td /></tr></tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
