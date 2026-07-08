import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import {
  Plus, X, Loader2, Tag, AlertCircle, Copy, Check, Ban
} from 'lucide-react'

const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'

function NewPromoCodeModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    code: '', discount_type: 'percent', discount_value: '',
    duration_months: '', applies_to_plan: '', max_redemptions: '', expires_at: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleCreate = async () => {
    setError('')
    if (!form.code.trim()) return setError('Code is required.')
    if (!form.discount_value || Number(form.discount_value) <= 0) return setError('Enter a discount value.')

    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/rep/create-promo-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          code:             form.code.trim().toUpperCase(),
          discount_type:    form.discount_type,
          discount_value:   Number(form.discount_value),
          duration_months:  form.duration_months ? Number(form.duration_months) : null,
          applies_to_plan:  form.applies_to_plan || null,
          max_redemptions:  form.max_redemptions ? Number(form.max_redemptions) : null,
          expires_at:       form.expires_at || null,
        }),
      })
      const result = await res.json()
      if (!res.ok || !result.success) {
        const detail = [result.type, result.param && `param: ${result.param}`].filter(Boolean).join(', ')
        setError((result.error || 'Failed to create promo code.') + (detail ? ` (${detail})` : ''))
        setSaving(false)
        return
      }
      onCreated()
    } catch (e) {
      setError('Network error — please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-display font-bold text-slate-800">New Promo Code</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Code *</label>
            <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())}
              placeholder="e.g. SMITH10" maxLength={20} className={inputCls + ' font-mono'} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Discount Type</label>
              <select value={form.discount_type} onChange={e => set('discount_type', e.target.value)} className={inputCls}>
                <option value="percent">Percent off</option>
                <option value="amount">Amount off ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                {form.discount_type === 'percent' ? 'Percent Off (%)' : 'Amount Off ($)'} *
              </label>
              <input type="number" min="0" value={form.discount_value} onChange={e => set('discount_value', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Duration (months)</label>
              <input type="number" min="0" value={form.duration_months} onChange={e => set('duration_months', e.target.value)}
                placeholder="Blank = forever" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Applies to Plan</label>
              <select value={form.applies_to_plan} onChange={e => set('applies_to_plan', e.target.value)} className={inputCls}>
                <option value="">Any plan</option>
                <option value="essential">Essential</option>
                <option value="professional">Professional</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Max Redemptions</label>
              <input type="number" min="0" value={form.max_redemptions} onChange={e => set('max_redemptions', e.target.value)}
                placeholder="Unlimited" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Expires</label>
              <input type="date" value={form.expires_at} onChange={e => set('expires_at', e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
          <button onClick={handleCreate} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-colors">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Creating...' : 'Create Code'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PromoCodesTab() {
  const [codes, setCodes]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [copied, setCopied]   = useState(null)

  useEffect(() => { fetchCodes() }, [])

  async function fetchCodes() {
    setLoading(true)
    const { data } = await supabase.from('rep_promo_codes').select('*').order('created_at', { ascending: false })
    setCodes(data || [])
    setLoading(false)
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 size={28} className="animate-spin text-brand-400" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-slate-800 text-lg">Promo Codes & My Link</h2>
          <p className="text-xs text-slate-400 mt-0.5">Create discount codes for prospects — backed by real Stripe coupons</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors">
          <Plus size={15} /> New Promo Code
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {codes.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Tag size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No promo codes yet</p>
            <p className="text-sm mt-1">Create one to offer prospects a discount at signup.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Code', 'Discount', 'Plan', 'Redemptions', 'Status', 'Expires'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {codes.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-800 text-sm">{c.code}</span>
                      <button onClick={() => copyCode(c.code)} className="text-slate-300 hover:text-brand-600">
                        {copied === c.code ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600">
                    {c.discount_type === 'percent' ? `${c.discount_value}% off` : `$${c.discount_value} off`}
                    {c.duration_months ? ` · ${c.duration_months}mo` : ' · forever'}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500 capitalize">{c.applies_to_plan || 'Any'}</td>
                  <td className="px-5 py-3 text-sm text-slate-600">
                    {c.times_redeemed}{c.max_redemptions ? ` / ${c.max_redemptions}` : ''}
                  </td>
                  <td className="px-5 py-3">
                    {c.is_active ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Active</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium flex items-center gap-1 w-fit">
                        <Ban size={10} /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-400">
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showNew && (
        <NewPromoCodeModal
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); fetchCodes() }}
        />
      )}
    </div>
  )
}
