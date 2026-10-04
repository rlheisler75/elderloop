import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { departmentLabel, categoryLabel, SOURCE_LABELS, money, budgetTone, ALERT_LABELS, alertDate } from '../../lib/budgets'

const TONE = {
  ok:   { bar: 'bg-brand-600', text: 'text-slate-800 dark:text-slate-100', chip: 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400', label: 'On track' },
  warn: { bar: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400', chip: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400', label: 'Watch' },
  over: { bar: 'bg-red-600',   text: 'text-red-700 dark:text-red-400',     chip: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',         label: 'Over budget' },
  none: { bar: 'bg-slate-400', text: 'text-slate-800 dark:text-slate-100', chip: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',   label: 'No budget set' },
}

// One department's month: spent vs. budget with the projected month-end marker.
// The bar spans 0–150% of budget so an over-budget projection stays visible.
export default function BudgetStatusCard({ row, month, orgId, alerts = [] }) {
  const [open, setOpen] = useState(false)
  const [lines, setLines] = useState(null)
  const tone = TONE[budgetTone(row)]
  const scale = (pct) => `${Math.min(Math.max(pct || 0, 0) / 150, 1) * 100}%`
  const currentMonth = row.days_elapsed > 0 && row.days_elapsed < row.days_in_month

  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (next && !lines) {
      const { data } = await supabase.rpc('budget_spend_breakdown', { p_department: row.department, p_month: month, p_org: orgId ?? null })
      setLines(data || [])
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-100">{departmentLabel(row.department)}</div>
          <div className={`text-2xl font-display font-bold ${tone.text}`}>
            {money(row.spent)} <span className="text-sm font-sans font-normal text-slate-400">of {money(row.budget)}</span>
          </div>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${tone.chip}`}>{tone.label}</span>
      </div>

      {row.budget != null && (
        <div className="relative h-3 bg-slate-100 dark:bg-slate-800 rounded-full mb-1" role="img"
          aria-label={`${row.pct_used ?? 0}% spent${currentMonth ? `, projected ${row.projected_pct}%` : ''}`}>
          <div className={`absolute inset-y-0 left-0 rounded-full ${tone.bar}`} style={{ width: scale(row.pct_used) }} />
          <div className="absolute inset-y-0 w-px bg-slate-400" style={{ left: scale(100) }} title="Budget" />
          {currentMonth && (
            <div className="absolute -top-1 -bottom-1 w-0.5 bg-slate-800 dark:bg-slate-200 rounded" style={{ left: scale(row.projected_pct) }} title="Projected month-end" />
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm">
        <div><div className="text-xs text-slate-400">Spent</div><div className="font-semibold text-slate-700 dark:text-slate-200">{row.pct_used != null ? `${row.pct_used}%` : '—'}</div></div>
        <div><div className="text-xs text-slate-400">{currentMonth ? 'Projected month-end' : 'Month total'}</div><div className="font-semibold text-slate-700 dark:text-slate-200">{money(row.projected)}{row.projected_pct != null && currentMonth ? ` (${row.projected_pct}%)` : ''}</div></div>
        {currentMonth && row.daily_to_land != null && (
          <div><div className="text-xs text-slate-400">Daily spend to land on budget</div><div className="font-semibold text-slate-700 dark:text-slate-200">{money(row.daily_to_land)}/day</div></div>
        )}
        <div><div className="text-xs text-slate-400">Per resident day</div><div className="font-semibold text-slate-700 dark:text-slate-200">{row.spend_ppd != null ? money(row.spend_ppd, 2) : '—'}</div></div>
      </div>

      {alerts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {alerts.map(a => (
            <span key={a.kind} className={`text-xs px-2 py-0.5 rounded-full ${a.kind === 'pct100' ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'}`}>
              {ALERT_LABELS[a.kind]} · alerted {alertDate(a.created_at)}
            </span>
          ))}
        </div>
      )}

      <button onClick={toggle} className="mt-4 flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Where the money went
      </button>
      {open && (
        <div className="mt-2">
          {!lines ? <Loader2 size={16} className="animate-spin text-slate-400" /> : lines.length === 0 ? (
            <p className="text-xs text-slate-400">No spending recorded this month.</p>
          ) : (
            <table className="w-full text-xs">
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-1.5 text-slate-600 dark:text-slate-300">{categoryLabel(l.category)}</td>
                    <td className="py-1.5 text-slate-400">{SOURCE_LABELS[l.source] ?? l.source} · {l.entries}</td>
                    <td className="py-1.5 text-right font-semibold text-slate-700 dark:text-slate-200">{money(l.amount, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
