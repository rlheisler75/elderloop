// Physician diet order tracking — a manual documentation workflow, not an
// EHR sync. No real PointClickCare (or any EHR) integration exists in this
// codebase today: pcc_facility_id is a manually-typed field and the only
// PCC-related code is a static authorization-letter generator, no API
// client or webhook receiver anywhere. This gives Dietary the audit trail
// an EHR-driven feed would provide (who ordered what, when, from where) for
// orders that come in the way they actually do — phone, fax, a chart note —
// with a deliberate human "Apply" step before it changes a resident's
// dietary profile, since that's a clinical safety-relevant change.
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { ClipboardCheck, Plus, X, Check, XCircle } from 'lucide-react'

// Must match the diet_type / consistency_level Postgres enums exactly — same
// lists duplicated (by established convention in this codebase) in
// Dietary.jsx and CycleMenuBuilder.jsx.
const DIET_TYPES = [
  { key: 'regular',      label: 'Regular' },
  { key: 'heart_healthy',label: 'Heart Healthy' },
  { key: 'low_sodium',   label: 'Low Sodium' },
  { key: 'diabetic',     label: 'Consistent Carbohydrate' },
  { key: 'ncs',          label: 'No Concentrated Sweets' },
  { key: 'renal',        label: 'Renal / CKD' },
  { key: 'lo_carb',      label: 'Low Carbohydrate' },
  { key: 'low_fat',      label: 'Low Fat' },
  { key: 'low_residue',  label: 'Low Fiber / Low Residue' },
  { key: 'dash',         label: 'DASH' },
  { key: 'gluten_free',  label: 'Gluten Free' },
  { key: 'vegetarian',   label: 'Vegetarian' },
  { key: 'vegan',        label: 'Vegan' },
  { key: 'neutropenic',  label: 'Neutropenic' },
  { key: 'other',        label: 'Other / Custom' },
]

const CONSISTENCIES = [
  { key: 'regular',          label: 'Regular' },
  { key: 'easy_to_chew',     label: 'Easy to Chew' },
  { key: 'soft_bite_sized',  label: 'Soft & Bite-Sized' },
  { key: 'minced_moist',     label: 'Minced & Moist' },
  { key: 'mechanical_soft',  label: 'Mechanical Soft' },
  { key: 'pureed',           label: 'Pureed' },
  { key: 'liquid',           label: 'Liquidized / Thin' },
  { key: 'slightly_thick',   label: 'Slightly Thick' },
  { key: 'mildly_thick',     label: 'Mildly Thick' },
  { key: 'moderately_thick', label: 'Moderately Thick' },
  { key: 'extremely_thick',  label: 'Extremely Thick' },
  { key: 'thickened_liquid', label: 'Thickened Liquid' },
]

const ALLERGENS = ['milk','eggs','fish','shellfish','tree_nuts','peanuts','wheat','gluten','soy','sesame']

const ORDER_TYPES = [
  { key: 'diet_change',        label: 'Diet Change' },
  { key: 'consistency_change', label: 'Consistency Change' },
  { key: 'allergen_update',    label: 'Allergen Update' },
  { key: 'fluid_restriction',  label: 'Fluid Restriction' },
  { key: 'other',              label: 'Other' },
]

const SOURCES = [
  { key: 'phone',       label: 'Phone' },
  { key: 'fax',         label: 'Fax' },
  { key: 'chart_note',  label: 'Chart Note' },
  { key: 'ehr',         label: 'EHR' },
  { key: 'other',       label: 'Other' },
]

const getDiet = (key) => DIET_TYPES.find(d => d.key === key)?.label || key
const getCons = (key) => CONSISTENCIES.find(c => c.key === key)?.label || key

// ── Log Order modal ──────────────────────────────────────────
function LogOrderModal({ orgId, profile, allResidents, onClose, onSaved }) {
  const [residentId, setResidentId] = useState('')
  const [orderingPhysician, setOrderingPhysician] = useState('')
  const [orderDate, setOrderDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [orderType, setOrderType] = useState('diet_change')
  const [source, setSource] = useState('phone')
  const [newDietType, setNewDietType] = useState('')
  const [newConsistency, setNewConsistency] = useState('')
  const [newAllergens, setNewAllergens] = useState([])
  const [fluidRestriction, setFluidRestriction] = useState(false)
  const [orderDetails, setOrderDetails] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggleAllergen = (a) => setNewAllergens(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])

  const handleSave = async () => {
    if (!residentId || !orderingPhysician.trim() || !orderDetails.trim()) {
      setError('Resident, ordering physician, and order details are required.')
      return
    }
    setSaving(true)
    const { error: err } = await supabase.from('physician_diet_orders').insert({
      organization_id: orgId,
      resident_id: residentId,
      ordering_physician: orderingPhysician.trim(),
      order_date: orderDate,
      order_type: orderType,
      source,
      new_diet_type: orderType === 'diet_change' ? newDietType || null : null,
      new_consistency: orderType === 'consistency_change' ? newConsistency || null : null,
      new_allergens: orderType === 'allergen_update' ? newAllergens : null,
      fluid_restriction: orderType === 'fluid_restriction' ? fluidRestriction : null,
      order_details: orderDetails.trim(),
      logged_by: profile.id,
      logged_by_name: `${profile.first_name} ${profile.last_name}`,
      status: 'pending',
    })
    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  const inputCls = 'w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100">Log Physician Diet Order</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && <div className="px-3 py-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-400 text-sm">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Resident</label>
            <select value={residentId} onChange={e => setResidentId(e.target.value)} className={inputCls}>
              <option value="">Select a resident...</option>
              {allResidents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}{r.room ? ` (Rm ${r.room})` : ''}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Ordering Physician</label>
              <input value={orderingPhysician} onChange={e => setOrderingPhysician(e.target.value)} placeholder="Dr. Name" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Order Date</label>
              <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Received Via</label>
            <div className="flex flex-wrap gap-1.5">
              {SOURCES.map(s => (
                <button key={s.key} onClick={() => setSource(s.key)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${source === s.key ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-300'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Order Type</label>
            <div className="flex flex-wrap gap-1.5">
              {ORDER_TYPES.map(t => (
                <button key={t.key} onClick={() => setOrderType(t.key)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${orderType === t.key ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-300'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {orderType === 'diet_change' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">New Diet Type</label>
              <select value={newDietType} onChange={e => setNewDietType(e.target.value)} className={inputCls}>
                <option value="">Select...</option>
                {DIET_TYPES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            </div>
          )}
          {orderType === 'consistency_change' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">New Consistency</label>
              <select value={newConsistency} onChange={e => setNewConsistency(e.target.value)} className={inputCls}>
                <option value="">Select...</option>
                {CONSISTENCIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
          )}
          {orderType === 'allergen_update' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">New Allergen List (replaces existing)</label>
              <div className="flex flex-wrap gap-1.5">
                {ALLERGENS.map(a => (
                  <button key={a} onClick={() => toggleAllergen(a)}
                    className={`px-2 py-1 rounded-lg border text-xs font-medium transition-all capitalize ${newAllergens.includes(a) ? 'bg-red-500 text-white border-red-500' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-red-300'}`}>
                    {a.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}
          {orderType === 'fluid_restriction' && (
            <div onClick={() => setFluidRestriction(v => !v)}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${fluidRestriction ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${fluidRestriction ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600'}`}>
                {fluidRestriction && <Check size={12} className="text-white" />}
              </div>
              <span className="text-sm text-slate-700 dark:text-slate-300">Fluid restriction now in effect</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Order Details <span className="text-red-500">*</span></label>
            <textarea value={orderDetails} onChange={e => setOrderDetails(e.target.value)} rows={3}
              placeholder="What the order says, in the physician's/nurse's own words..."
              className={inputCls + ' resize-none'} />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving...' : 'Log Order'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PhysicianOrders({ orgId, canManage }) {
  const { profile } = useAuth()
  const [orders, setOrders] = useState([])
  const [allResidents, setAllResidents] = useState([])
  const [residentLookup, setResidentLookup] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [showLogModal, setShowLogModal] = useState(false)
  const [declining, setDeclining] = useState(null) // order id currently entering a decline reason
  const [declineReason, setDeclineReason] = useState('')

  useEffect(() => { if (orgId) fetchAll() }, [orgId])

  async function fetchAll() {
    setLoading(true)
    const [ordersRes, residentsRes] = await Promise.all([
      supabase.from('physician_diet_orders').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }),
      supabase.from('residents').select('id, first_name, last_name, room').eq('organization_id', orgId).eq('is_active', true).order('last_name'),
    ])
    setOrders(ordersRes.data || [])
    setAllResidents(residentsRes.data || [])
    setResidentLookup(new Map((residentsRes.data || []).map(r => [r.id, r])))
    setLoading(false)
  }

  async function handleApply(order) {
    if (!confirm('Apply this order to the resident\'s dietary profile now?')) return

    const { data: existing } = await supabase.from('resident_dietary_profiles')
      .select('id').eq('resident_id', order.resident_id).eq('is_active', true).limit(1)

    const changes = {}
    if (order.order_type === 'diet_change' && order.new_diet_type) changes.diet_type = order.new_diet_type
    if (order.order_type === 'consistency_change' && order.new_consistency) changes.consistency = order.new_consistency
    if (order.order_type === 'allergen_update' && order.new_allergens) changes.allergens = order.new_allergens
    if (order.order_type === 'fluid_restriction' && order.fluid_restriction != null) changes.fluid_restriction = order.fluid_restriction

    if (existing?.[0]) {
      await supabase.from('resident_dietary_profiles').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', existing[0].id)
    } else {
      const resident = residentLookup.get(order.resident_id)
      await supabase.from('resident_dietary_profiles').insert({
        organization_id: orgId, resident_id: order.resident_id,
        first_name: resident?.first_name || '', last_name: resident?.last_name || '', room: resident?.room || null,
        diet_type: changes.diet_type || 'regular', consistency: changes.consistency || 'regular',
        allergens: changes.allergens || [], fluid_restriction: changes.fluid_restriction || false,
        is_active: true,
      })
    }

    await supabase.from('physician_diet_orders').update({
      status: 'applied', applied_by: profile.id, applied_by_name: `${profile.first_name} ${profile.last_name}`, applied_at: new Date().toISOString(),
    }).eq('id', order.id)
    fetchAll()
  }

  async function handleDecline(order) {
    await supabase.from('physician_diet_orders').update({
      status: 'declined', decline_reason: declineReason.trim() || null,
      applied_by: profile.id, applied_by_name: `${profile.first_name} ${profile.last_name}`, applied_at: new Date().toISOString(),
    }).eq('id', order.id)
    setDeclining(null); setDeclineReason('')
    fetchAll()
  }

  const filtered = statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter)
  const pendingCount = orders.filter(o => o.status === 'pending').length

  const describeChange = (o) => {
    if (o.order_type === 'diet_change' && o.new_diet_type) return `→ ${getDiet(o.new_diet_type)} diet`
    if (o.order_type === 'consistency_change' && o.new_consistency) return `→ ${getCons(o.new_consistency)} texture`
    if (o.order_type === 'allergen_update') return `→ Allergens: ${o.new_allergens?.length ? o.new_allergens.join(', ') : 'none'}`
    if (o.order_type === 'fluid_restriction') return `→ Fluid restriction ${o.fluid_restriction ? 'ON' : 'OFF'}`
    return ORDER_TYPES.find(t => t.key === o.order_type)?.label || o.order_type
  }

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={17} className="text-brand-600" />
            <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100">Physician Diet Orders</h3>
            {pendingCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">{pendingCount} pending</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="pending">Pending review</option>
              <option value="applied">Applied</option>
              <option value="declined">Declined</option>
              <option value="all">All</option>
            </select>
            {canManage && (
              <button onClick={() => setShowLogModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
                <Plus size={15} /> Log Order
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          No live EHR/PointClickCare feed exists — orders here are logged manually as they come in (phone, fax, chart note) and reviewed before they change a resident's dietary profile.
        </p>

        {loading ? (
          <div className="text-slate-400 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-slate-400 text-sm py-6 text-center">No orders match this filter.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(order => {
              const resident = residentLookup.get(order.resident_id)
              return (
                <div key={order.id} className="p-3 border border-slate-100 dark:border-slate-800 rounded-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {resident ? `${resident.first_name} ${resident.last_name}` : 'Unknown resident'}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          order.status === 'pending' ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400' :
                          order.status === 'applied' ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400' :
                          'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                          {order.status === 'pending' ? 'Pending' : order.status === 'applied' ? 'Applied' : 'Declined'}
                        </span>
                      </div>
                      <div className="text-sm text-brand-700 dark:text-brand-400 font-medium mt-1">{describeChange(order)}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">{order.order_details}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Dr. {order.ordering_physician} · {SOURCES.find(s => s.key === order.source)?.label} · {new Date(order.order_date + 'T12:00:00').toLocaleDateString()}
                        {order.logged_by_name && ` · logged by ${order.logged_by_name}`}
                        {order.status === 'applied' && order.applied_by_name && ` · applied by ${order.applied_by_name}`}
                        {order.status === 'declined' && order.applied_by_name && ` · declined by ${order.applied_by_name}`}
                      </div>
                      {order.decline_reason && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 italic mt-1">Reason: {order.decline_reason}</div>
                      )}
                    </div>
                    {canManage && order.status === 'pending' && (
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <button onClick={() => handleApply(order)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-lg transition-colors">
                          <Check size={12} /> Apply
                        </button>
                        <button onClick={() => setDeclining(declining === order.id ? null : order.id)}
                          className="flex items-center gap-1 px-2.5 py-1 text-slate-500 hover:text-red-500 text-xs font-medium">
                          <XCircle size={12} /> Decline
                        </button>
                      </div>
                    )}
                  </div>
                  {declining === order.id && (
                    <div className="mt-2 flex gap-2">
                      <input value={declineReason} onChange={e => setDeclineReason(e.target.value)} placeholder="Reason (optional)"
                        className="flex-1 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                      <button onClick={() => handleDecline(order)} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg">Confirm Decline</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showLogModal && (
        <LogOrderModal orgId={orgId} profile={profile} allResidents={allResidents}
          onClose={() => setShowLogModal(false)}
          onSaved={() => { setShowLogModal(false); fetchAll() }} />
      )}
    </div>
  )
}
