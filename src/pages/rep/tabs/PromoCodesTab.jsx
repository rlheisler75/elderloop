import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient' // adjust to your actual client path

const PLAN_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'essential', label: 'Essential' },
  { value: 'professional', label: 'Professional' },
]

function formatExpiry(dateStr) {
  if (!dateStr) return 'No expiration'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default function PromoCodesTab() {
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const [form, setForm] = useState({
    code: '',
    discount_type: 'percent',
    discount_value: '',
    duration_months: '',
    applies_to_plan: '',
    max_redemptions: '',
    expires_at: '',
  })

  const loadCodes = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('rep_promo_codes')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setCodes(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadCodes() }, [loadCodes])

  function resetForm() {
    setForm({
      code: '',
      discount_type: 'percent',
      discount_value: '',
      duration_months: '',
      applies_to_plan: '',
      max_redemptions: '',
      expires_at: '',
    })
    setFormError('')
  }

  async function handleCreate(e) {
    e.preventDefault()
    setFormError('')

    if (!form.code.trim()) {
      setFormError('Promo code is required')
      return
    }
    const discountValue = parseFloat(form.discount_value)
    if (!discountValue || discountValue <= 0) {
      setFormError('Enter a valid discount amount')
      return
    }

    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setFormError('Your session expired, please sign in again')
        setSubmitting(false)
        return
      }

      const payload = {
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: discountValue,
        duration_months: form.duration_months ? parseInt(form.duration_months, 10) : null,
        applies_to_plan: form.applies_to_plan || null,
        max_redemptions: form.max_redemptions ? parseInt(form.max_redemptions, 10) : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-rep-promo-code`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      )

      const result = await res.json()

      if (!result.success) {
        setFormError(result.error || 'Failed to create promo code')
        setSubmitting(false)
        return
      }

      setCodes((prev) => [result.promo_code, ...prev])
      setShowModal(false)
      resetForm()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900">Promo Codes & My Link</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create discount codes for prospects, backed by real Stripe coupons
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg font-medium hover:bg-blue-800"
        >
          + New Promo Code
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-200">
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Discount</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Redemptions</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Expires</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Loading...</td></tr>
            )}
            {!loading && codes.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No promo codes yet</td></tr>
            )}
            {codes.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-mono font-semibold text-slate-800">{c.code}</td>
                <td className="px-4 py-3 text-slate-600">
                  {c.discount_type === 'percent' ? `${c.discount_value}% off` : `$${c.discount_value} off`}
                  {c.duration_months ? ` - ${c.duration_months}mo` : ' - forever'}
                </td>
                <td className="px-4 py-3 text-blue-600">{c.applies_to_plan || 'Any'}</td>
                <td className="px-4 py-3 text-slate-600">
                  {c.times_redeemed}{c.max_redemptions ? ` / ${c.max_redemptions}` : ''}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    c.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">{formatExpiry(c.expires_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">New Promo Code</h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Code</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="RH26SAVE50-6M"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Discount Type</label>
                  <select
                    value={form.discount_type}
                    onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="percent">Percent off</option>
                    <option value="amount">Dollar amount off</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    {form.discount_type === 'percent' ? 'Percent (%)' : 'Amount ($)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step={form.discount_type === 'percent' ? '1' : '0.01'}
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Duration (months)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Forever if blank"
                    value={form.duration_months}
                    onChange={(e) => setForm({ ...form, duration_months: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Applies to Plan</label>
                  <select
                    value={form.applies_to_plan}
                    onChange={(e) => setForm({ ...form, applies_to_plan: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {PLAN_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Max Redemptions</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited if blank"
                    value={form.max_redemptions}
                    onChange={(e) => setForm({ ...form, max_redemptions: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Expires</label>
                  <input
                    type="date"
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
