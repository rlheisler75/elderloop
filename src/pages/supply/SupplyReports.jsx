import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  BarChart2, AlertTriangle, TrendingDown, DollarSign,
  Package, ArrowUpCircle, ArrowDownCircle, RefreshCw,
  User, Building2
} from 'lucide-react'

const TYPE_CFG = {
  receive:       { label: 'Received',       color: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400',   icon: ArrowUpCircle },
  issue_dept:    { label: 'Dept Issue',     color: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400',     icon: ArrowDownCircle },
  issue_resident:{ label: 'Resident Charge',color: 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400', icon: User },
  cash_sale:     { label: 'Cash Sale',      color: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400',   icon: DollarSign },
  adjustment:    { label: 'Adjustment',     color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',   icon: RefreshCw },
}

function stockStatus(item) {
  const qty = Number(item.quantity_on_hand)
  const reorder = Number(item.reorder_point)
  const par = Number(item.par_level)
  if (qty <= 0)                       return 'out'
  if (reorder > 0 && qty <= reorder)  return 'critical'
  if (par > 0 && qty < par)          return 'low'
  return 'ok'
}

export default function SupplyReports() {
  const { organization } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [items,        setItems]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [days,         setDays]         = useState(30)
  const [txType,       setTxType]       = useState('all')
  const [reportTab,    setReportTab]    = useState('overview')

  useEffect(() => { if (organization) fetchData() }, [organization, days])

  async function fetchData() {
    setLoading(true)
    const since = new Date()
    since.setDate(since.getDate() - days)
    const [txRes, itemsRes] = await Promise.all([
      supabase.from('supply_transactions')
        .select('*, supply_items(name, category), residents(first_name, last_name), profiles!supply_transactions_performed_by_fkey(first_name, last_name)')
        .eq('organization_id', organization.id)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(500),
      supabase.from('supply_items').select('*').eq('organization_id', organization.id).eq('is_active', true).order('category').order('name'),
    ])
    setTransactions(txRes.data || [])
    setItems(itemsRes.data || [])
    setLoading(false)
  }

  // ── Computed stats ──────────────────────────────────────────
  const totalValue   = items.reduce((s, i) => s + (Number(i.quantity_on_hand) * Number(i.cost_per_unit || 0)), 0)
  const lowItems     = items.filter(i => ['low','critical','out'].includes(stockStatus(i)))
  const totalIssued  = transactions.filter(t => ['issue_dept','issue_resident'].includes(t.transaction_type)).reduce((s, t) => s + Math.abs(Number(t.quantity)), 0)
  const totalReceived= transactions.filter(t => t.transaction_type === 'receive').reduce((s, t) => s + Number(t.quantity), 0)
  const cashSalesTotal = transactions.filter(t => t.transaction_type === 'cash_sale').reduce((s, t) => s + (Math.abs(Number(t.quantity)) * Number(t.sale_price || 0)), 0)

  // Dept usage breakdown
  const deptUsage = transactions.filter(t => t.transaction_type === 'issue_dept').reduce((acc, t) => {
    const dept = t.department || 'Unknown'
    acc[dept] = (acc[dept] || 0) + Math.abs(Number(t.quantity))
    return acc
  }, {})

  // Category usage
  const categoryUsage = transactions.filter(t => ['issue_dept','issue_resident'].includes(t.transaction_type)).reduce((acc, t) => {
    const cat = t.supply_items?.category || 'Unknown'
    acc[cat] = (acc[cat] || 0) + Math.abs(Number(t.quantity))
    return acc
  }, {})

  // Filtered transactions for history tab
  const filteredTx = txType === 'all' ? transactions : transactions.filter(t => t.transaction_type === txType)

  const REPORT_TABS = [
    { k: 'overview', label: 'Overview' },
    { k: 'low_stock', label: `Low Stock (${lowItems.length})` },
    { k: 'history',  label: 'Transaction History' },
    { k: 'usage',    label: 'Usage by Dept' },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-lg">Reports</h2>
          <p className="text-sm text-slate-400">Supply usage, stock levels, and spending</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">Period:</span>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${days === d ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Inventory Value',  value: `$${totalValue.toFixed(2)}`, sub: 'at cost',             color: 'text-slate-800 dark:text-slate-100', icon: Package },
          { label: 'Items Issued',     value: totalIssued,                 sub: `last ${days} days`,   color: 'text-blue-600',  icon: ArrowDownCircle },
          { label: 'Items Received',   value: totalReceived,               sub: `last ${days} days`,   color: 'text-green-600', icon: ArrowUpCircle },
          { label: 'Cash Sales',       value: `$${cashSalesTotal.toFixed(2)}`, sub: `last ${days} days`,color: 'text-amber-600', icon: DollarSign },
        ].map(c => (
          <div key={c.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm px-4 py-3">
            <div className="flex items-start justify-between mb-1">
              <div className={`text-2xl font-display font-bold ${c.color}`}>{c.value}</div>
              <c.icon size={16} className={`${c.color} opacity-60 mt-1`} />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{c.label}</div>
            <div className="text-xs text-slate-300">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Report tabs */}
      <div className="flex gap-0 border-b border-slate-100 dark:border-slate-800 mb-5 overflow-x-auto">
        {REPORT_TABS.map(t => (
          <button key={t.k} onClick={() => setReportTab(t.k)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${reportTab === t.k ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {reportTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
            <h3 className="font-display font-semibold text-slate-700 dark:text-slate-300 mb-3">Usage by Category</h3>
            {Object.keys(categoryUsage).length === 0 ? <p className="text-sm text-slate-400">No issues recorded in this period.</p> : (
              <div className="space-y-2">
                {Object.entries(categoryUsage).sort((a,b) => b[1]-a[1]).map(([cat, qty]) => {
                  const maxQty = Math.max(...Object.values(categoryUsage))
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-700 dark:text-slate-300">{cat}</span>
                        <span className="font-medium text-slate-800 dark:text-slate-100">{qty} units</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-400 rounded-full" style={{ width: `${(qty / maxQty) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
            <h3 className="font-display font-semibold text-slate-700 dark:text-slate-300 mb-3">Usage by Department</h3>
            {Object.keys(deptUsage).length === 0 ? <p className="text-sm text-slate-400">No department issues recorded.</p> : (
              <div className="space-y-2">
                {Object.entries(deptUsage).sort((a,b) => b[1]-a[1]).map(([dept, qty]) => {
                  const maxQty = Math.max(...Object.values(deptUsage))
                  return (
                    <div key={dept}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-700 dark:text-slate-300">{dept}</span>
                        <span className="font-medium text-slate-800 dark:text-slate-100">{qty} units</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(qty / maxQty) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LOW STOCK ── */}
      {reportTab === 'low_stock' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          {lowItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Package size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-display text-slate-600 dark:text-slate-300">All items are at or above par level</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                  {['Item', 'Category', 'On Hand', 'Par', 'Reorder Point', 'Status'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lowItems.map(item => {
                  const status = stockStatus(item)
                  return (
                    <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-100">{item.name}</td>
                      <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{item.category}</span></td>
                      <td className={`px-4 py-3 text-sm font-semibold ${status === 'out' ? 'text-slate-400' : status === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>{item.quantity_on_hand} {item.unit}</td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{item.par_level} {item.unit}</td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{item.reorder_point} {item.unit}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status === 'out' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' : status === 'critical' ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'}`}>
                          {status === 'out' ? 'Out of Stock' : status === 'critical' ? 'Critical' : 'Low'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── HISTORY ── */}
      {reportTab === 'history' && (
        <>
          <div className="flex gap-2 flex-wrap mb-4">
            <button onClick={() => setTxType('all')} className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${txType === 'all' ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>All</button>
            {Object.entries(TYPE_CFG).map(([k, v]) => (
              <button key={k} onClick={() => setTxType(k)} className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${txType === k ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>{v.label}</button>
            ))}
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            {loading ? (
              <div className="text-center py-10 text-slate-400 text-sm">Loading...</div>
            ) : filteredTx.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">No transactions in this period.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                    {['Date', 'Item', 'Type', 'Qty', 'To / From', 'By'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTx.slice(0, 100).map(tx => {
                    const cfg = TYPE_CFG[tx.transaction_type] || TYPE_CFG.adjustment
                    const TIcon = cfg.icon
                    const qty = Number(tx.quantity)
                    return (
                      <tr key={tx.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">{new Date(tx.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300">{tx.supply_items?.name || '—'}</td>
                        <td className="px-4 py-2.5"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}><TIcon size={10} />{cfg.label}</span></td>
                        <td className={`px-4 py-2.5 text-sm font-semibold ${qty > 0 ? 'text-green-600' : 'text-red-600'}`}>{qty > 0 ? `+${qty}` : qty}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                          {tx.department || (tx.residents ? `${tx.residents.first_name} ${tx.residents.last_name}` : '—')}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-400">{tx.profiles ? `${tx.profiles.first_name} ${tx.profiles.last_name}` : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── USAGE BY DEPT ── */}
      {reportTab === 'usage' && (
        <div className="space-y-4">
          {Object.entries(deptUsage).length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <Building2 size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No department issues recorded in this period.</p>
            </div>
          ) : Object.entries(deptUsage).sort((a,b) => b[1]-a[1]).map(([dept, total]) => {
            const deptTx = transactions.filter(t => t.transaction_type === 'issue_dept' && t.department === dept)
            const itemBreakdown = deptTx.reduce((acc, t) => {
              const name = t.supply_items?.name || 'Unknown'
              acc[name] = (acc[name] || 0) + Math.abs(Number(t.quantity))
              return acc
            }, {})
            return (
              <div key={dept} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100">{dept}</h3>
                  <span className="text-sm font-medium text-brand-600">{total} units total</span>
                </div>
                <div className="space-y-1.5">
                  {Object.entries(itemBreakdown).sort((a,b) => b[1]-a[1]).slice(0, 8).map(([item, qty]) => (
                    <div key={item} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-300">{item}</span>
                      <span className="font-medium text-slate-800 dark:text-slate-100">{qty} units</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
