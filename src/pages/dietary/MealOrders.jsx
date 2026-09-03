// Staff-side view of meal_delivery_orders — submitted by residents (their
// own portal) or family members (ordering on a resident's behalf). This
// table already existed with correct RLS for dietary/supervisor/manager to
// view and update, but no screen anywhere read it: every order submitted
// through either portal disappeared into it silently. This is that screen.
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { MEAL_TYPES, MEAL_STATUS } from '../../components/MealOrderModal'
import { UtensilsCrossed, Clock, ChevronRight } from 'lucide-react'

const STATUS_FLOW = { pending: 'preparing', preparing: 'delivered' }
const STATUS_ORDER = ['pending', 'preparing', 'delivered', 'cancelled']

export default function MealOrders({ orgId, canManage }) {
  const [orders, setOrders] = useState([])
  const [residentNames, setResidentNames] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('active')

  useEffect(() => { if (orgId) fetchAll() }, [orgId])

  async function fetchAll() {
    setLoading(true)
    const { data: orderData } = await supabase.from('meal_delivery_orders')
      .select('*').eq('organization_id', orgId).order('created_at', { ascending: false })
    const list = orderData || []
    setOrders(list)

    // Residents are readable by dietary staff directly (unlike profiles —
    // see submitted_by_name/submitted_by_role on the order row for why the
    // submitter isn't looked up the same way).
    const residentIds = [...new Set(list.map(o => o.resident_id).filter(Boolean))]
    const residentsRes = residentIds.length > 0
      ? await supabase.from('residents').select('id, first_name, last_name, room').in('id', residentIds)
      : { data: [] }
    setResidentNames(new Map((residentsRes.data || []).map(r => [r.id, r])))
    setLoading(false)
  }

  const handleAdvance = async (order) => {
    const next = STATUS_FLOW[order.status]
    if (!next) return
    await supabase.from('meal_delivery_orders').update({ status: next, updated_at: new Date().toISOString() }).eq('id', order.id)
    setOrders(os => os.map(o => o.id === order.id ? { ...o, status: next } : o))
  }

  const handleCancel = async (order) => {
    await supabase.from('meal_delivery_orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', order.id)
    setOrders(os => os.map(o => o.id === order.id ? { ...o, status: 'cancelled' } : o))
  }

  const filtered = orders.filter(o => statusFilter === 'all' ? true : statusFilter === 'active' ? (o.status === 'pending' || o.status === 'preparing') : o.status === statusFilter)
  const counts = { pending: 0, preparing: 0, delivered: 0 }
  orders.forEach(o => { if (counts[o.status] != null) counts[o.status]++ })

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <UtensilsCrossed size={17} className="text-brand-600" />
            <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100">Meal Delivery Orders</h3>
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="active">Active (pending + preparing)</option>
            <option value="all">All statuses</option>
            <option value="pending">Received only</option>
            <option value="preparing">Preparing only</option>
            <option value="delivered">Delivered only</option>
            <option value="cancelled">Cancelled only</option>
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
            <div className="text-xl font-display font-bold text-amber-700 dark:text-amber-400">{counts.pending}</div>
            <div className="text-xs text-amber-600 dark:text-amber-500">Received</div>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
            <div className="text-xl font-display font-bold text-blue-700 dark:text-blue-400">{counts.preparing}</div>
            <div className="text-xs text-blue-600 dark:text-blue-500">Preparing</div>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-xl">
            <div className="text-xl font-display font-bold text-green-700 dark:text-green-400">{counts.delivered}</div>
            <div className="text-xs text-green-600 dark:text-green-500">Delivered</div>
          </div>
        </div>

        {loading ? (
          <div className="text-slate-400 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-slate-400 text-sm py-6 text-center">No orders match this filter.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(order => {
              const resident = residentNames.get(order.resident_id)
              const mt = MEAL_TYPES.find(m => m.key === order.meal_type)
              const st = MEAL_STATUS[order.status] || MEAL_STATUS.pending
              const Icon = mt?.icon || UtensilsCrossed
              const next = STATUS_FLOW[order.status]
              return (
                <div key={order.id} className="flex items-start gap-3 p-3 border border-slate-100 dark:border-slate-800 rounded-xl">
                  <div className={`w-9 h-9 ${st.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon size={16} className={st.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {resident ? `${resident.first_name} ${resident.last_name}` : 'Unknown resident'}{resident?.room ? ` — Room ${resident.room}` : ''}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>{st.label}</span>
                    </div>
                    <div className="text-sm text-slate-700 dark:text-slate-300 mt-1">{order.items}</div>
                    {order.special_requests && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">Note: {order.special_requests}</div>
                    )}
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <Clock size={11} />
                      {mt?.label} · {order.delivery_time}
                      {order.submitted_by_name && ` · ordered by ${order.submitted_by_name}${order.submitted_by_role === 'family' ? ' (family)' : order.submitted_by_role === 'resident' ? ' (resident)' : ''}`}
                      {' · '}{new Date(order.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                  {canManage && order.status !== 'delivered' && order.status !== 'cancelled' && (
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      {next && (
                        <button onClick={() => handleAdvance(order)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-lg transition-colors">
                          Mark {MEAL_STATUS[next].label} <ChevronRight size={12} />
                        </button>
                      )}
                      <button onClick={() => handleCancel(order)}
                        className="px-2.5 py-1 text-xs text-slate-500 hover:text-red-500 font-medium">Cancel</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
