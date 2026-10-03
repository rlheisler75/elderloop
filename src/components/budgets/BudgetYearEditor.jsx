import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Loader2, Save, Check, AlertCircle, Copy, Equal } from 'lucide-react'
import { BUDGET_DEPARTMENTS, MONTHS, money } from '../../lib/budgets'

// Twelve monthly budgets per department for one community and year. Used by the
// community Budgets page (standalone communities: NHA / Org Admin) and the
// Corporate Portal (chain communities). Saves through set_budget_year(), which
// re-checks who may set this community's budgets.
export default function BudgetYearEditor({ orgId }) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [grid, setGrid] = useState(null) // { dept: [12 strings] }
  const [annual, setAnnual] = useState({})
  const [saving, setSaving] = useState(null)
  const [saved, setSaved] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setGrid(null); setError('')
    const { data, error } = await supabase.rpc('budget_year', { p_org: orgId, p_year: year })
    if (error) { setError(error.message); setGrid({}); return }
    const g = Object.fromEntries(BUDGET_DEPARTMENTS.map(d => [d.key, Array(12).fill('')]))
    ;(data || []).forEach(r => { if (g[r.department]) g[r.department][r.month - 1] = String(Number(r.amount)) })
    setGrid(g)
  }, [orgId, year])
  useEffect(() => { if (orgId) load() }, [orgId, load])

  const setCell = (dept, i, v) => setGrid(g => ({ ...g, [dept]: g[dept].map((x, j) => (j === i ? v : x)) }))

  const spread = (dept) => {
    const total = Number(annual[dept])
    if (!total || total < 0) return
    const each = Math.round((total / 12) * 100) / 100
    // put the rounding remainder in December so the year adds up exactly
    const last = Math.round((total - each * 11) * 100) / 100
    setGrid(g => ({ ...g, [dept]: [...Array(11).fill(String(each)), String(last)] }))
  }

  const fromLastYear = async (dept) => {
    setError('')
    const { data, error } = await supabase.rpc('budget_actuals_by_month', { p_department: dept, p_year: year - 1, p_org: orgId })
    if (error) return setError(error.message)
    setGrid(g => ({ ...g, [dept]: (data || []).map(v => (Number(v) ? String(Math.round(Number(v))) : '')) }))
  }

  const save = async (dept) => {
    setSaving(dept); setError(''); setSaved(null)
    const amounts = grid[dept].map(v => (v === '' || v == null ? null : Number(v)))
    if (amounts.some(v => v != null && (isNaN(v) || v < 0))) {
      setSaving(null); return setError('Budgets must be zero or more.')
    }
    const { error } = await supabase.rpc('set_budget_year', { p_org: orgId, p_department: dept, p_year: year, p_amounts: amounts })
    setSaving(null)
    if (error) return setError(error.message)
    setSaved(dept)
    setTimeout(() => setSaved(s => (s === dept ? null : s)), 2500)
  }

  const cellCls = 'w-full min-w-[72px] px-2 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs text-right focus:outline-none focus:ring-2 focus:ring-brand-500'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setYear(y => y - 1)} className="px-2 py-1 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">‹</button>
        <span className="font-semibold text-slate-800 dark:text-slate-100">{year}</span>
        <button onClick={() => setYear(y => y + 1)} className="px-2 py-1 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">›</button>
        <span className="text-xs text-slate-400 ml-2">Calendar months. Leave a month blank to keep it as it is.</span>
      </div>
      {error && <div className="px-3 py-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-400 text-sm flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}
      {!grid ? <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" /></div> : (
        BUDGET_DEPARTMENTS.map(d => {
          const total = grid[d.key].reduce((s, v) => s + (Number(v) || 0), 0)
          return (
            <div key={d.key} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="font-semibold text-slate-800 dark:text-slate-100">{d.label} <span className="text-xs font-normal text-slate-400">· year {money(total)}</span></div>
                <div className="flex flex-wrap items-center gap-2">
                  <input type="number" min="0" placeholder="Annual $" value={annual[d.key] ?? ''} onChange={e => setAnnual(a => ({ ...a, [d.key]: e.target.value }))}
                    className="w-28 px-2 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  <button onClick={() => spread(d.key)} className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><Equal size={12} /> Spread evenly</button>
                  <button onClick={() => fromLastYear(d.key)} className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><Copy size={12} /> Start from {year - 1} actuals</button>
                  <button onClick={() => save(d.key)} disabled={saving === d.key}
                    className="flex items-center gap-1 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium">
                    {saving === d.key ? <Loader2 size={12} className="animate-spin" /> : saved === d.key ? <Check size={12} /> : <Save size={12} />} {saved === d.key ? 'Saved' : 'Save'}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-2">
                {MONTHS.map((m, i) => (
                  <label key={m} className="block">
                    <span className="block text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">{m}</span>
                    <input type="number" min="0" step="1" value={grid[d.key][i]} onChange={e => setCell(d.key, i, e.target.value)} className={cellCls} />
                  </label>
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
