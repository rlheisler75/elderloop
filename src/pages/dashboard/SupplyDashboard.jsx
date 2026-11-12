// Dashboard section for Central Supply staff: what to reorder, what's on order,
// and what went out today. Shown to people in the Central Supply department and
// to Central Supply Managers (Dashboard.jsx).
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSupplyAccess } from '../../hooks/useSupplyAccess'
import { Package, PackageX, ClipboardList, Truck, PackageMinus, Receipt, ArrowRight } from 'lucide-react'

const OPEN_ORDER = ['submitted', 'partially_received']
const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const TX_LABEL = { issue_dept: 'Issued', issue_resident: 'Charged', receive: 'Received', cash_sale: 'Cash sale', adjustment: 'Count' }

function Tile({ icon: Icon, label, value, sub, to, color, bg, alert }) {
  return (
    <Link to={to} className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm p-4 hover:shadow-md transition-all ${alert ? 'border-red-200 dark:border-red-900/60' : 'border-slate-100 dark:border-slate-800'}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${bg}`}><Icon size={17} className={color} /></div>
      <div className="font-display text-2xl font-semibold text-slate-800 dark:text-slate-100">{value ?? '—'}</div>
      <div className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </Link>
  )
}

export default function SupplyDashboard({ orgId }) {
  const { canBill } = useSupplyAccess()
  const [d, setD] = useState(null)

  useEffect(() => { if (orgId) load() }, [orgId])

  async function load() {
    const start = new Date(); start.setHours(0, 0, 0, 0)
    const [itemsRes, posRes, txRes, chargesRes] = await Promise.all([
      supabase.from('supply_items').select('id, name, unit, quantity_on_hand, reorder_point, par_level')
        .eq('organization_id', orgId).eq('is_active', true),
      supabase.from('supply_purchase_orders').select('id, status, expected_date')
        .eq('organization_id', orgId).in('status', ['draft', 'awaiting_approval', ...OPEN_ORDER]),
      supabase.from('supply_transactions').select('id, transaction_type, quantity, department, created_at, supply_items(name, unit), residents(first_name, last_name)')
        .eq('organization_id', orgId).gte('created_at', start.toISOString()).order('created_at', { ascending: false }).limit(200),
      canBill
        ? supabase.from('supply_transactions').select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId).eq('transaction_type', 'issue_resident').is('billed_at', null)
        : Promise.resolve({ count: null }),
    ])
    const items = itemsRes.data || []
    const qty = i => Number(i.quantity_on_hand) || 0
    const out = items.filter(i => qty(i) <= 0)
    const low = items.filter(i => qty(i) > 0 && Number(i.reorder_point) > 0 && qty(i) <= Number(i.reorder_point))
    const pos = posRes.data || []
    const open = pos.filter(p => OPEN_ORDER.includes(p.status))
    const today = localDay()
    const tx = txRes.data || []
    setD({
      out, low,
      reorder: [...out, ...low].sort((a, b) => qty(a) - qty(b)),
      open,
      lateOrders: open.filter(p => p.expected_date && p.expected_date < today).length,
      dueToday: open.filter(p => p.expected_date === today).length,
      awaiting: pos.filter(p => p.status === 'awaiting_approval').length,
      drafts: pos.filter(p => p.status === 'draft').length,
      issuedToday: tx.filter(t => t.transaction_type === 'issue_dept' || t.transaction_type === 'issue_resident').length,
      recent: tx.slice(0, 8),
      unbilled: chargesRes.count,
    })
  }

  if (!d) return null
  const to = tab => `/app/central-supply?tab=${tab}`

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Package size={16} className="text-brand-600" />
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Central Supply</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Tile icon={PackageX} label="Out of stock" value={d.out.length} sub={d.low.length ? `${d.low.length} more at reorder point` : 'Nothing at reorder point'}
          to={to('inventory')} color="text-red-600" bg="bg-red-50 dark:bg-red-950/40" alert={d.out.length > 0} />
        <Tile icon={Truck} label="On order" value={d.open.length}
          sub={d.lateOrders ? `${d.lateOrders} past expected date` : d.dueToday ? `${d.dueToday} due today` : 'Nothing late'}
          to={to('receive')} color="text-brand-600" bg="bg-brand-50 dark:bg-brand-950/40" alert={d.lateOrders > 0} />
        <Tile icon={ClipboardList} label="Purchase orders" value={d.awaiting + d.drafts}
          sub={`${d.awaiting} awaiting approval · ${d.drafts} draft${d.drafts === 1 ? '' : 's'}`}
          to={to('pos')} color="text-amber-600" bg="bg-amber-50 dark:bg-amber-950/40" />
        <Tile icon={PackageMinus} label="Issued today" value={d.issuedToday} sub="To departments and residents"
          to={to('issue')} color="text-green-600" bg="bg-green-50 dark:bg-green-950/40" />
        {d.unbilled !== null && (
          <Tile icon={Receipt} label="Unbilled charges" value={d.unbilled} sub="Resident charges not marked billed"
            to={to('charges')} color="text-purple-600" bg="bg-purple-50 dark:bg-purple-950/40" alert={d.unbilled > 0} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Reorder list</span>
            <Link to={to('inventory')} className="text-xs text-brand-600 hover:text-brand-800 flex items-center gap-1">Inventory <ArrowRight size={12} /></Link>
          </div>
          {d.reorder.length === 0
            ? <p className="text-sm text-slate-400">Everything is above its reorder point.</p>
            : <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {d.reorder.slice(0, 8).map(i => (
                  <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-slate-700 dark:text-slate-200 truncate">{i.name}</span>
                    <span className={`text-xs font-medium flex-shrink-0 ml-3 ${Number(i.quantity_on_hand) <= 0 ? 'text-red-600' : 'text-amber-600'}`}>
                      {Number(i.quantity_on_hand) <= 0 ? 'Out' : `${Number(i.quantity_on_hand)} left`}
                      {Number(i.par_level) > 0 && <span className="text-slate-400 font-normal"> · par {Number(i.par_level)}</span>}
                    </span>
                  </li>
                ))}
                {d.reorder.length > 8 && <li className="pt-2 text-xs text-slate-400">and {d.reorder.length - 8} more</li>}
              </ul>}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Today's activity</span>
            <Link to={to('reports')} className="text-xs text-brand-600 hover:text-brand-800 flex items-center gap-1">Reports <ArrowRight size={12} /></Link>
          </div>
          {d.recent.length === 0
            ? <p className="text-sm text-slate-400">Nothing received or issued yet today.</p>
            : <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {d.recent.map(t => (
                  <li key={t.id} className="flex items-center justify-between py-2 text-sm gap-3">
                    <span className="text-slate-700 dark:text-slate-200 truncate">
                      <span className="text-slate-400">{TX_LABEL[t.transaction_type] || t.transaction_type}</span> {Math.abs(Number(t.quantity))} {t.supply_items?.unit} {t.supply_items?.name}
                    </span>
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      {t.department || (t.residents ? `${t.residents.first_name} ${t.residents.last_name}` : '')}
                      {' · '}{new Date(t.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </li>
                ))}
              </ul>}
        </div>
      </div>
    </section>
  )
}
