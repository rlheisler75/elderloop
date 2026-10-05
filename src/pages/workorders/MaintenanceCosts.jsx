import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ChevronLeft, ChevronRight, Loader2, AlertTriangle } from 'lucide-react'
import BudgetStatusCard from '../../components/budgets/BudgetStatusCard'
import { money, firstOfMonth, monthLabel, shiftMonth } from '../../lib/budgets'

// Maintenance costs (budget layer Phase 4). Costs are parts + vendor cost entered
// when a job is closed; labor hours are shown but never priced. Repair-or-replace
// flags an asset once its lifetime repairs reach half its replacement cost;
// depreciation is a straight-line estimate for capital planning only.
// maintenance_cost_report / maintenance_asset_costs return rows only to people who
// may see the Maintenance budget (Maintenance Manager, Administrator, Org Admin).

const shortMonth = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
const pct = (v) => v == null ? '—' : `${Number(v)}%`

function Tile({ label, value, sub }) {
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
      <div className="text-xl font-display font-bold text-slate-800 dark:text-slate-100">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
      {sub && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</div>}
    </div>
  )
}

export default function MaintenanceCosts({ orgId }) {
  const [month, setMonth] = useState(firstOfMonth())
  const [trend, setTrend] = useState(null)
  const [status, setStatus] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [assets, setAssets] = useState(null)

  useEffect(() => {
    setTrend(null)
    Promise.all([
      supabase.rpc('maintenance_cost_report', { p_month: month, p_months: 6, p_org: orgId }),
      supabase.rpc('budget_status', { p_month: month, p_org: orgId }),
      supabase.from('budget_alerts').select('department, kind, created_at')
        .eq('organization_id', orgId).eq('month', month).eq('department', 'maintenance').eq('suppressed', false),
    ]).then(([r, s, a]) => {
      setTrend(r.data || [])
      setStatus((s.data || []).find(x => x.department === 'maintenance') || null)
      setAlerts(a.data || [])
    })
  }, [month, orgId])
  useEffect(() => {
    supabase.rpc('maintenance_asset_costs', { p_org: orgId }).then(({ data }) => setAssets(data || []))
  }, [orgId])

  const cur = trend?.[trend.length - 1]
  const flagged = (assets || []).filter(a => a.replace_flag)
  const costed = (assets || []).filter(a => a.replacement_cost != null || Number(a.lifetime_repairs) > 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-lg">Maintenance costs</h2>
          <p className="text-sm text-slate-400">Parts and vendor cost from closed jobs, against the Maintenance budget.</p>
        </div>
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-1">
          <button onClick={() => setMonth(m => shiftMonth(m, -1))} className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"><ChevronLeft size={16} /></button>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 w-36 text-center">{monthLabel(month)}</span>
          <button onClick={() => setMonth(m => shiftMonth(m, 1))} className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"><ChevronRight size={16} /></button>
        </div>
      </div>

      {!trend ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div> : (
        <>
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4">
            {status && <BudgetStatusCard row={status} month={month} orgId={orgId} alerts={alerts} />}
            <div className="grid grid-cols-2 gap-3 content-start">
              <Tile label="Emergency vendor spend" value={money(cur?.emergency_vendor_cost, 2)} sub={`of ${money(cur?.vendor_cost, 2)} vendor spend`} />
              <Tile label="Reactive share of job costs" value={pct(cur?.reactive_pct)} sub="Routine + emergency vs. planned" />
              <Tile label="PM completion" value={pct(cur?.pm_completion_pct)} sub={cur?.pm_due ? `${cur.pm_done} of ${cur.pm_due} PM jobs due this month` : 'No PM jobs due this month'} />
              <Tile label="Jobs closed" value={cur?.closed_jobs ?? 0} sub={`${Number(cur?.labor_hours || 0)} labor hours recorded`} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Last 6 months</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="py-2">Month</th><th className="py-2 text-right">Parts</th><th className="py-2 text-right">Vendor</th>
                  <th className="py-2 text-right">Emergency vendor</th><th className="py-2 text-right">Reactive share</th>
                  <th className="py-2 text-right">PM completion</th><th className="py-2 text-right">Labor hours</th>
                </tr></thead>
                <tbody>
                  {trend.map(r => (
                    <tr key={r.month} className={`border-b border-slate-50 dark:border-slate-800 ${r.month === month ? 'font-semibold' : ''}`}>
                      <td className="py-2 text-slate-700 dark:text-slate-200">{shortMonth(r.month)}</td>
                      <td className="py-2 text-right text-slate-600 dark:text-slate-300">{money(r.parts_cost)}</td>
                      <td className="py-2 text-right text-slate-600 dark:text-slate-300">{money(r.vendor_cost)}</td>
                      <td className="py-2 text-right text-slate-800 dark:text-slate-100">{money(r.emergency_vendor_cost)}</td>
                      <td className="py-2 text-right text-slate-500">{pct(r.reactive_pct)}</td>
                      <td className="py-2 text-right text-slate-500">{pct(r.pm_completion_pct)}</td>
                      <td className="py-2 text-right text-slate-500">{Number(r.labor_hours || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400 mt-3">Reactive share falling over time is the measured payoff of preventive maintenance. Parts taken from Central Supply stock count in the Maintenance budget when issued, not here.</p>
          </div>
        </>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Repair or replace</h3>
          {flagged.length > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded-full">
              <AlertTriangle size={12} /> {flagged.length} asset{flagged.length === 1 ? '' : 's'} cheaper to replace
            </span>
          )}
        </div>
        {!assets ? <Loader2 className="animate-spin text-slate-400" /> : costed.length === 0 ? (
          <p className="text-sm text-slate-400">Add a replacement cost and expected life to assets (Assets tab) to see repair-or-replace and depreciation here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="py-2">Asset</th><th className="py-2 text-right">Age</th><th className="py-2 text-right">Lifetime repairs</th>
                <th className="py-2 text-right">Replacement</th><th className="py-2 text-right">Repairs / replacement</th>
                <th className="py-2 text-right">Est. value today</th><th className="py-2 text-right">Life used</th>
              </tr></thead>
              <tbody>
                {costed.map(a => (
                  <tr key={a.asset_id} className={`border-b border-slate-50 dark:border-slate-800 ${a.replace_flag ? 'bg-red-50/50 dark:bg-red-950/20' : ''}`}>
                    <td className="py-2 text-slate-700 dark:text-slate-200">
                      {a.name}{a.replace_flag && <span className="ml-2 text-xs font-semibold text-red-700 dark:text-red-400">Replace?</span>}
                      {a.location && <div className="text-xs text-slate-400">{a.location}</div>}
                    </td>
                    <td className="py-2 text-right text-slate-500">{a.age_years != null ? `${a.age_years} yr` : '—'}</td>
                    <td className="py-2 text-right text-slate-600 dark:text-slate-300">{money(a.lifetime_repairs)}{Number(a.repair_jobs) > 0 && <span className="text-xs text-slate-400"> · {a.repair_jobs} job{Number(a.repair_jobs) === 1 ? '' : 's'}</span>}</td>
                    <td className="py-2 text-right text-slate-600 dark:text-slate-300">{money(a.replacement_cost)}</td>
                    <td className={`py-2 text-right font-semibold ${a.replace_flag ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}>{pct(a.repair_pct)}</td>
                    <td className="py-2 text-right text-slate-500">{money(a.est_book_value)}{a.annual_depreciation != null && <div className="text-xs text-slate-400">−{money(a.annual_depreciation)}/yr</div>}</td>
                    <td className="py-2 text-right text-slate-500">{a.life_used_pct != null ? `${a.life_used_pct}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-slate-400 mt-3">Flagged when lifetime repairs (parts + vendor, from closed jobs) reach 50% of replacement cost. Estimated value is straight-line from purchase cost to salvage value over the expected life, for capital planning only; your accounting system stays the source of truth.</p>
      </div>
    </div>
  )
}
