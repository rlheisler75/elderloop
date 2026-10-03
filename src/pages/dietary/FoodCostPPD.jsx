import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { DollarSign, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { money, monthLabel, shiftMonth, categoryLabel } from '../../lib/budgets'

// Food cost per resident day (budget layer Phase 2). Spend is the dietary rows of
// the spend ledger, the same numbers as the Dietary budget on the Budgets page:
// submitted purchase orders, stock issued to Dietary, and off-system purchases.
// Resident days come from the nightly census. dietary_cost_report() returns rows only
// to people who may see Dietary's budget (Dietary Manager, Administrator, Org Admin).

const shortMonth = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', year: '2-digit' })

function Tile({ label, value, sub, tone }) {
  const color = tone === 'warn' ? 'text-amber-700 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100'
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
      <div className={`text-xl font-display font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
      {sub && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</div>}
    </div>
  )
}

export default function FoodCostPPD({ orgId, month: initialMonth }) {
  const [month, setMonth] = useState(initialMonth)
  const [trend, setTrend] = useState(null)
  const [top, setTop] = useState(null)

  useEffect(() => {
    setTrend(null); setTop(null)
    Promise.all([
      supabase.rpc('dietary_cost_report', { p_month: month, p_months: 6, p_org: orgId }),
      supabase.rpc('dietary_top_items', { p_month: month, p_limit: 10, p_org: orgId }),
    ]).then(([r, t]) => { setTrend(r.data || []); setTop(t.data || []) })
  }, [month, orgId])

  const cur = trend?.[trend.length - 1]
  const prev = trend?.[trend.length - 2]
  const ppdChange = cur?.food_ppd != null && prev?.food_ppd != null && Number(prev.food_ppd) > 0
    ? Math.round((cur.food_ppd - prev.food_ppd) / prev.food_ppd * 100) : null
  const overBudgetPpd = cur?.dietary_ppd != null && cur?.budget_ppd != null && Number(cur.dietary_ppd) > Number(cur.budget_ppd)

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <DollarSign size={17} className="text-brand-600" />
            <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100">Food Cost per Resident Day</h3>
          </div>
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-1">
            <button onClick={() => setMonth(m => shiftMonth(m, -1))} className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"><ChevronLeft size={16} /></button>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 w-36 text-center">{monthLabel(month)}</span>
            <button onClick={() => setMonth(m => shiftMonth(m, 1))} className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"><ChevronRight size={16} /></button>
          </div>
        </div>

        {!trend ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-400" /></div> : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <Tile label="Food cost per resident day" value={cur?.food_ppd != null ? money(cur.food_ppd, 2) : '—'}
                sub={ppdChange != null ? `${ppdChange > 0 ? '+' : ''}${ppdChange}% vs. ${shortMonth(prev.month)}` : null} />
              <Tile label="All Dietary spend per resident day" value={cur?.dietary_ppd != null ? money(cur.dietary_ppd, 2) : '—'}
                sub={cur?.budget_ppd != null ? `Budget: ${money(cur.budget_ppd, 2)} per day` : 'No Dietary budget set'} tone={overBudgetPpd ? 'warn' : null} />
              <Tile label="Food spend" value={money(cur?.food_spend, 2)} sub={Number(cur?.other_spend) > 0 ? `+ ${money(cur.other_spend, 2)} other Dietary` : null} />
              <Tile label="Waste share of food spend" value={cur?.waste_pct != null ? `${cur.waste_pct}%` : '—'} sub={`${money(cur?.waste_cost, 2)} logged as waste`} />
            </div>
            {cur && cur.census_days < cur.days_in_month && (
              <p className="text-xs text-slate-400 mb-4">
                {cur.census_days === 0 ? 'No census recorded for this month yet, so per-resident-day figures are blank.'
                  : `Based on ${cur.census_days} day${cur.census_days === 1 ? '' : 's'} of census (${Number(cur.resident_days).toLocaleString()} resident days) so far.`}
              </p>
            )}

            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-5 mb-2">Last 6 months</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="py-2">Month</th><th className="py-2 text-right">Food spend</th><th className="py-2 text-right">Resident days</th>
                  <th className="py-2 text-right">Food / day</th><th className="py-2 text-right">Waste</th><th className="py-2 text-right">All Dietary / day</th><th className="py-2 text-right">Budget / day</th>
                </tr></thead>
                <tbody>
                  {trend.map(r => (
                    <tr key={r.month} className={`border-b border-slate-50 dark:border-slate-800 ${r.month === month ? 'font-semibold' : ''}`}>
                      <td className="py-2 text-slate-700 dark:text-slate-200">{shortMonth(r.month)}</td>
                      <td className="py-2 text-right text-slate-600 dark:text-slate-300">{money(r.food_spend)}</td>
                      <td className="py-2 text-right text-slate-500">{Number(r.resident_days) > 0 ? Number(r.resident_days).toLocaleString() : '—'}</td>
                      <td className="py-2 text-right text-slate-800 dark:text-slate-100">{r.food_ppd != null ? money(r.food_ppd, 2) : '—'}</td>
                      <td className="py-2 text-right text-slate-500">{r.waste_pct != null ? `${r.waste_pct}%` : '—'}</td>
                      <td className={`py-2 text-right ${r.budget_ppd != null && r.dietary_ppd != null && Number(r.dietary_ppd) > Number(r.budget_ppd) ? 'text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'}`}>{r.dietary_ppd != null ? money(r.dietary_ppd, 2) : '—'}</td>
                      <td className="py-2 text-right text-slate-500">{r.budget_ppd != null ? money(r.budget_ppd, 2) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-6 mb-2">Top items by spend, {monthLabel(month)}</h4>
            {!top?.length ? <div className="text-slate-400 text-sm py-4 text-center">No Dietary spending recorded this month.</div> : (
              <table className="w-full text-sm">
                <tbody>
                  {top.map((t, i) => (
                    <tr key={t.item + i} className="border-b border-slate-50 dark:border-slate-800">
                      <td className="py-2 text-slate-400 w-6">{i + 1}</td>
                      <td className="py-2 text-slate-700 dark:text-slate-300">{t.item} <span className="text-xs text-slate-400">· {categoryLabel(t.category)}</span></td>
                      <td className="py-2 text-right text-slate-500">{t.quantity != null ? Number(t.quantity).toLocaleString() : ''}</td>
                      <td className="py-2 text-right font-semibold text-slate-800 dark:text-slate-100">{money(t.amount, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <p className="text-xs text-slate-400 mt-4">
              Spend matches the Dietary budget on the Budgets page: submitted purchase orders (drafts don't count), stock issued to Dietary, and off-system purchases. Food is anything with the Food spend category. Budget per resident day is the monthly Dietary budget divided by the average daily census times the days in the month.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
