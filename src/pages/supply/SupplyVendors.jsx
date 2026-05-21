import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, Search, X, Edit2, Trash2, Truck,
  Phone, Mail, Globe, Hash, Clock, FileText
} from 'lucide-react'

function VendorModal({ vendor, orgId, onClose, onSaved }) {
  const isNew = !vendor
  const [form, setForm] = useState({
    name:           vendor?.name           || '',
    contact_name:   vendor?.contact_name   || '',
    phone:          vendor?.phone          || '',
    email:          vendor?.email          || '',
    account_number: vendor?.account_number || '',
    website:        vendor?.website        || '',
    address:        vendor?.address        || '',
    lead_time_days: vendor?.lead_time_days ?? 3,
    notes:          vendor?.notes          || '',
    is_active:      vendor?.is_active      ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
  const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5'

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Vendor name is required'); return }
    setSaving(true); setError('')
    const payload = { ...form, organization_id: orgId, lead_time_days: Number(form.lead_time_days) || 3, updated_at: new Date().toISOString() }
    const { error: err } = vendor?.id
      ? await supabase.from('supply_vendors').update(payload).eq('id', vendor.id)
      : await supabase.from('supply_vendors').insert(payload)
    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  const handleDelete = async () => {
    if (!confirm(`Remove "${vendor.name}"? This cannot be undone.`)) return
    await supabase.from('supply_vendors').delete().eq('id', vendor.id)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800">{isNew ? 'Add Vendor' : 'Edit Vendor'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <div>
            <label className={labelCls}>Vendor Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} autoFocus placeholder="e.g. McKesson Medical" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Contact Name</label>
              <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Account Number</label>
              <input value={form.account_number} onChange={e => set('account_number', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} type="tel" />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} type="email" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Website</label>
              <input value={form.website} onChange={e => set('website', e.target.value)} className={inputCls} placeholder="https://..." />
            </div>
            <div>
              <label className={labelCls}>Lead Time (days)</label>
              <input value={form.lead_time_days} onChange={e => set('lead_time_days', e.target.value)} className={inputCls} type="number" min="0" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Address</label>
            <input value={form.address} onChange={e => set('address', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} className={inputCls + ' resize-none'} />
          </div>
          <div onClick={() => set('is_active', !form.is_active)}
            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${form.is_active ? 'bg-brand-50 border-brand-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${form.is_active ? 'bg-brand-600 border-brand-600' : 'border-slate-300 bg-white'}`}>
              {form.is_active && <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <div>
              <div className="text-sm font-medium text-slate-700">Active vendor</div>
              <div className="text-xs text-slate-400">Show in vendor lists and purchase orders</div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>{!isNew && <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-sm transition-colors"><Trash2 size={14} /> Delete</button>}</div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium hover:bg-slate-50 rounded-lg">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
              {saving ? 'Saving...' : isNew ? 'Add Vendor' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SupplyVendors() {
  const { organization } = useAuth()
  const [vendors,  setVendors]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [selected, setSelected] = useState(null)
  const [showModal,setShowModal]= useState(false)

  useEffect(() => { if (organization) fetchVendors() }, [organization])

  async function fetchVendors() {
    setLoading(true)
    const { data } = await supabase.from('supply_vendors').select('*').eq('organization_id', organization.id).order('name')
    setVendors(data || [])
    setLoading(false)
  }

  const filtered = vendors.filter(v => {
    if (!showInactive && !v.is_active) return false
    if (search) {
      const q = search.toLowerCase()
      return v.name.toLowerCase().includes(q) || v.contact_name?.toLowerCase().includes(q) || v.account_number?.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowInactive(!showInactive)} className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${showInactive ? 'bg-slate-700 text-white border-slate-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
            {showInactive ? 'Showing inactive' : 'Show inactive'}
          </button>
          <button onClick={() => { setSelected(null); setShowModal(true) }} className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
            <Plus size={15} /> Add Vendor
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-3 text-center py-16 text-slate-400"><Truck size={32} className="mx-auto mb-3 opacity-30" /><p className="text-sm">Loading vendors...</p></div>
        ) : filtered.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-slate-400">
            <Truck size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-display text-lg text-slate-600">{vendors.length === 0 ? 'No vendors yet' : 'No vendors match'}</p>
            <p className="text-sm mt-1">{vendors.length === 0 ? 'Add your first vendor to get started.' : 'Try adjusting your search.'}</p>
            {vendors.length === 0 && <button onClick={() => { setSelected(null); setShowModal(true) }} className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl"><Plus size={15} /> Add Vendor</button>}
          </div>
        ) : filtered.map(v => (
          <div key={v.id} className={`bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow ${!v.is_active ? 'opacity-60' : 'border-slate-100'}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display font-semibold text-slate-800">{v.name}</div>
                {!v.is_active && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Inactive</span>}
              </div>
              <button onClick={() => { setSelected(v); setShowModal(true) }} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"><Edit2 size={14} /></button>
            </div>
            <div className="space-y-1.5 text-sm text-slate-600">
              {v.contact_name    && <div className="flex items-center gap-2"><FileText size={13} className="text-slate-400 flex-shrink-0" />{v.contact_name}</div>}
              {v.phone           && <div className="flex items-center gap-2"><Phone    size={13} className="text-slate-400 flex-shrink-0" />{v.phone}</div>}
              {v.email           && <div className="flex items-center gap-2"><Mail     size={13} className="text-slate-400 flex-shrink-0" />{v.email}</div>}
              {v.account_number  && <div className="flex items-center gap-2"><Hash     size={13} className="text-slate-400 flex-shrink-0" />Acct: {v.account_number}</div>}
              {v.website         && <div className="flex items-center gap-2"><Globe    size={13} className="text-slate-400 flex-shrink-0" /><a href={v.website} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline truncate">{v.website.replace(/^https?:\/\//, '')}</a></div>}
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
              <Clock size={12} className="text-slate-400" />
              <span className="text-xs text-slate-400">Lead time: <span className="font-medium text-slate-600">{v.lead_time_days ?? 3} day{(v.lead_time_days ?? 3) !== 1 ? 's' : ''}</span></span>
            </div>
          </div>
        ))}
      </div>

      {showModal && <VendorModal vendor={selected} orgId={organization.id} onClose={() => { setShowModal(false); setSelected(null) }} onSaved={() => { setShowModal(false); setSelected(null); fetchVendors() }} />}
    </div>
  )
}
