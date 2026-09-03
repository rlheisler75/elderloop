// Food cost/budget reporting: total purchase spend (from the same
// supply_purchase_orders / supply_po_line_items the Order Guide already
// creates, filtered to food-category items) plus waste cost (from the Food
// Waste log), measured against an editable monthly budget target.
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { DollarSign, Save, TrendingDown, TrendingUp } from 'lucide-react'

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function firstOfMonth(d) { return localDateStr(new Date(d.getFullYear(), d.getMonth(), 1)) }

export default function CostReport({ orgId, canManage }) {
  const today = localDateStr(new Date())
  const [dateFrom, setDateFrom] = useState(firstOfMonth(new Date()))
  const [dateTo, setDateTo] = useState(today)
  const [budget, setBudget] = useState(null)
  const [budgetInput, setBudgetInput] = useState('')
  const [savingBudget, setSavingBudget] = useState(false)
  const [purchaseLines, setPurchaseLines] = useState([])
  const [wasteCost, setWasteCost] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { if (orgId) fetchBudget() }, [orgId])
  useEffect(() => { if (orgId) fetchReport() }, [orgId, dateFrom, dateTo])

  async function fetchBudget() {
    const { data } = await supabase.from('dietary_settings').select('monthly_food_budget').eq('organization_id', orgId).maybeSingle()
    const val = data?.monthly_food_budget ?? null
    setBudget(val)
    setBudgetInput(val ?? '')
  }

  async function fetchReport() {
    setLoading(true)
    setError('')
    const [linesRes, wasteRes] = await Promise.all([
      supabase.from('supply_po_line_items')
        .select('quantity_ordered, unit_cost, po:supply_purchase_orders!inner(ordered_date, status, vendor:supply_vendors(name)), item:supply_items!inner(category, name)')
        .eq('organization_id', orgId)
        .eq('item.category', 'Food')
        .neq('po.status', 'cancelled')
        .gte('po.ordered_date', dateFrom)
        .lte('po.ordered_date', dateTo),
      supabase.from('food_waste_logs').select('estimated_cost')
        .eq('organization_id', orgId).gte('waste_date', dateFrom).lte('waste_date', dateTo),
    ])
    if (linesRes.error) setError(linesRes.error.message)
    setPurchaseLines(linesRes.data || [])
    setWasteCost((wasteRes.data || []).reduce((s, w) => s + (w.estimated_cost || 0), 0))
    setLoading(false)
  }

  const handleSaveBudget = async () => {
    setSavingBudget(true)
    const val = budgetInput !== '' ? Number(budgetInput) : null
    const { error: err } = await supabase.from('dietary_settings')
      .upsert({ organization_id: orgId, monthly_food_budget: val, updated_at: new Date().toISOString() }, { onConflict: 'organization_id' })
    if (err) { setError(err.message); setSavingBudget(false); return }
    setBudget(val)
    setSavingBudget(false)
  }

  const totalPurchases = purchaseLines.reduce((s, l) => s + Number(l.quantity_ordered) * Number(l.unit_cost || 0), 0)
  const daysInRange = Math.max(1, Math.round((new Date(dateTo + 'T12:00:00') - new Date(dateFrom + 'T12:00:00')) / 86400000) + 1)
  const proRatedBudget = budget != null ? budget * (daysInRange / 30.44) : null
  const remaining = proRatedBudget != null ? proRatedBudget - totalPurchases : null

  const byVendor = new Map()
  purchaseLines.forEach(l => {
    const vendorName = l.po?.vendor?.name || 'No vendor set'
    const cost = Number(l.quantity_ordered) * Number(l.unit_cost || 0)
    byVendor.set(vendorName, (byVendor.get(vendorName) || 0) + cost)
  })
  const vendorRows = Array.from(byVendor.entries()).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <DollarSign size={17} className="text-brand-600" />
            <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100">Food Cost Report</h3>
          </div>
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
        </div>

        {canManage && (
          <div className="flex items-end gap-2 mb-5 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl w-fit">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Monthly Food Budget</label>
              <div className="flex items-center gap-1">
                <span className="text-slate-400">$</span>
                <input type="number" min="0" step="1" value={budgetInput} onChange={e => setBudgetInput(e.target.value)}
                  placeholder="Not set"
                  className="w-28 px-2 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>
            <button onClick={handleSaveBudget} disabled={savingBudget}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-xs font-medium rounded-lg transition-colors">
              <Save size={13} /> {savingBudget ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-400 text-xs">{error}</div>
        )}

        {loading ? (
          <div className="text-slate-400 text-sm">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="text-xl font-display font-bold text-slate-800 dark:text-slate-100">${totalPurchases.toFixed(2)}</div>
                <div className="text-xs text-slate-400">Food Purchases</div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="text-xl font-display font-bold text-slate-800 dark:text-slate-100">${wasteCost.toFixed(2)}</div>
                <div className="text-xs text-slate-400">Waste Cost</div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="text-xl font-display font-bold text-slate-800 dark:text-slate-100">
                  {proRatedBudget != null ? `$${proRatedBudget.toFixed(2)}` : '—'}
                </div>
                <div className="text-xs text-slate-400">Budget (pro-rated, {daysInRange}d)</div>
              </div>
              <div className={`p-4 rounded-xl ${remaining != null && remaining < 0 ? 'bg-red-50 dark:bg-red-950/30' : 'bg-slate-50 dark:bg-slate-800'}`}>
                <div className={`text-xl font-display font-bold flex items-center gap-1 ${remaining != null && remaining < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}>
                  {remaining != null && (remaining < 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />)}
                  {remaining != null ? `$${Math.abs(remaining).toFixed(2)}` : '—'}
                </div>
                <div className="text-xs text-slate-400">{remaining != null && remaining < 0 ? 'Over Budget' : 'Under Budget'}</div>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Food Purchases counts every non-cancelled purchase order line item for a food-category item, ordered within this range — including draft POs not yet submitted to a vendor.
            </p>

            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">By Vendor</h4>
            {vendorRows.length === 0 ? (
              <div className="text-slate-400 text-sm py-4 text-center">No food purchases in this range.</div>
            ) : (
              <table className="w-full">
                <tbody>
                  {vendorRows.map(([vendor, cost]) => (
                    <tr key={vendor} className="border-b border-slate-50 dark:border-slate-800">
                      <td className="py-2 text-sm text-slate-700 dark:text-slate-300">{vendor}</td>
                      <td className="py-2 text-sm text-right font-semibold text-slate-800 dark:text-slate-100">${cost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  )
}
