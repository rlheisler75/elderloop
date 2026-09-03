// Meal delivery order form — shared between the Resident Portal and Family
// Portal so a resident ordering for themselves and a family member ordering
// on their behalf produce identical rows in meal_delivery_orders. Extracted
// from ResidentPortal.jsx (the original, resident-only implementation) so
// both portals stay in sync rather than drifting apart.
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { X, Send, UtensilsCrossed, Coffee, Soup, Cookie } from 'lucide-react'

export const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', icon: Coffee,          time: '7–9 AM' },
  { key: 'lunch',     label: 'Lunch',     icon: UtensilsCrossed, time: '11 AM–1 PM' },
  { key: 'dinner',    label: 'Dinner',    icon: Soup,            time: '4:30–6:30 PM' },
  { key: 'snack',     label: 'Snack',     icon: Cookie,          time: 'Anytime' },
]

export const MEAL_STATUS = {
  pending:   { label: 'Received',  color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-950/50' },
  preparing: { label: 'Preparing', color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-950/50' },
  delivered: { label: 'Delivered', color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-950/50' },
  cancelled: { label: 'Cancelled', color: 'text-slate-500',  bg: 'bg-slate-100 dark:bg-slate-800' },
}

// resident: { id, room, unit } — who the order is for.
// profile: the logged-in user (resident themselves, or the family member
// ordering on their behalf) — becomes submitted_by.
export default function MealOrderModal({ resident, profile, orgId, onClose, onSaved }) {
  const [form, setForm] = useState({ meal_type: 'lunch', items: '', special_requests: '', delivery_time: 'ASAP' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.items.trim()) { setError('Please describe what to order'); return }
    setSaving(true)
    const { error: err } = await supabase.from('meal_delivery_orders').insert({
      organization_id: orgId,
      resident_id: resident.id,
      submitted_by: profile.id,
      // Denormalized rather than joined from `profiles` on the staff side —
      // profiles' RLS doesn't grant the dietary role read access to other
      // users' rows, so a staff-side lookup would silently come back empty.
      submitted_by_name: `${profile.first_name} ${profile.last_name}`,
      submitted_by_role: profile.role,
      meal_type: form.meal_type,
      items: form.items.trim(),
      special_requests: form.special_requests.trim() || null,
      delivery_time: form.delivery_time,
      status: 'pending',
    })
    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Order Meal Delivery</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {resident?.first_name ? `${resident.first_name} ${resident.last_name} · ` : ''}Room {resident?.room || resident?.unit || 'N/A'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && <div className="px-3 py-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-400 text-sm">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Meal</label>
            <div className="grid grid-cols-2 gap-2">
              {MEAL_TYPES.map(m => {
                const Icon = m.icon
                return (
                  <button key={m.key} onClick={() => set('meal_type', m.key)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${form.meal_type === m.key ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/50' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}>
                    <Icon size={18} className={form.meal_type === m.key ? 'text-brand-600' : 'text-slate-400'} />
                    <div>
                      <div className={`text-sm font-semibold ${form.meal_type === m.key ? 'text-brand-700 dark:text-brand-400' : 'text-slate-700 dark:text-slate-300'}`}>{m.label}</div>
                      <div className="text-xs text-slate-400">{m.time}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">What would you like? <span className="text-red-500">*</span></label>
            <textarea value={form.items} onChange={e => set('items', e.target.value)}
              placeholder="e.g. Chicken soup, a roll, and orange juice..." rows={3}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Special Requests <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
            <input value={form.special_requests} onChange={e => set('special_requests', e.target.value)}
              placeholder="e.g. No onions, extra napkins, decaf coffee..."
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Delivery Time</label>
            <div className="flex gap-2">
              {['ASAP', 'In 30 min', 'In 1 hour'].map(t => (
                <button key={t} onClick={() => set('delivery_time', t)}
                  className={`flex-1 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${form.delivery_time === t ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-400' : 'border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-brand-50 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900 rounded-xl">
            <UtensilsCrossed size={14} className="text-brand-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-brand-700 dark:text-brand-400">Your order will be sent to the kitchen. The dietary team will do their best to accommodate your request.</p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 font-medium">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
            {saving ? 'Placing Order...' : <><Send size={14} /> Place Order</>}
          </button>
        </div>
      </div>
    </div>
  )
}
