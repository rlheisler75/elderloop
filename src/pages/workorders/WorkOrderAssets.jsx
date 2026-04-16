import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, X, Edit2, Trash2, Search, AlertTriangle,
  Wrench, Calendar, ChevronRight, CheckCircle2,
  Clock, Package, Settings, Upload, Eye
} from 'lucide-react'

const ASSET_CATEGORIES = [
  { key: 'hvac',       label: 'HVAC',             color: 'bg-blue-100 text-blue-700' },
  { key: 'bed',        label: 'Bed / Furniture',  color: 'bg-green-100 text-green-700' },
  { key: 'lift',       label: 'Patient Lift',     color: 'bg-purple-100 text-purple-700' },
  { key: 'equipment',  label: 'Equipment',        color: 'bg-amber-100 text-amber-700' },
  { key: 'electrical', label: 'Electrical',       color: 'bg-yellow-100 text-yellow-700' },
  { key: 'plumbing',   label: 'Plumbing',         color: 'bg-cyan-100 text-cyan-700' },
  { key: 'vehicle',    label: 'Vehicle',          color: 'bg-orange-100 text-orange-700' },
  { key: 'room',       label: 'Room',             color: 'bg-slate-100 text-slate-600' },
  { key: 'other',      label: 'Other',            color: 'bg-slate-100 text-slate-500' },
]

const ASSET_STATUSES = [
  { key: 'active',          label: 'Active',          color: 'bg-green-100 text-green-700' },
  { key: 'out_of_service',  label: 'Out of Service',  color: 'bg-red-100 text-red-700' },
  { key: 'retired',         label: 'Retired',         color: 'bg-slate-100 text-slate-500' },
]

const fmt = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const getCat = (key) => ASSET_CATEGORIES.find(c => c.key === key) || ASSET_CATEGORIES.find(c => c.key === 'other')

function AssetModal({ asset, orgId, profile, onClose, onSaved }) {
  const fileRef = useRef()
  const isNew = !asset
  const [form, setForm] = useState({
    asset_number:   asset?.asset_number   || '',
    name:           asset?.name           || '',
    category:       asset?.category       || 'equipment',
    location:       asset?.location       || '',
    building:       asset?.building       || '',
    manufacturer:   asset?.manufacturer   || '',
    model:          asset?.model          || '',
    serial_number:  asset?.serial_number  || '',
    purchase_date:  asset?.purchase_date  || '',
    warranty_expiry:asset?.warranty_expiry|| '',
    last_service_date: asset?.last_service_date || '',
    next_service_date: asset?.next_service_date || '',
    status:         asset?.status         || 'active',
    notes:          asset?.notes          || '',
    photo_url:      asset?.photo_url      || '',
  })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    const path = `assets/${orgId}/${Date.now()}.${file.name.split('.').pop()}`
    const { error: upErr } = await supabase.storage.from('announcement-images').upload(path, file)
    if (!upErr) {
      const { data } = supabase.storage.from('announcement-images').getPublicUrl(path)
      set('photo_url', data.publicUrl)
    }
    setUploading(false)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Asset name required'); return }
    setSaving(true)
    const payload = {
      ...form,
      organization_id:   orgId,
      purchase_date:     form.purchase_date     || null,
      warranty_expiry:   form.warranty_expiry   || null,
      last_service_date: form.last_service_date || null,
      next_service_date: form.next_service_date || null,
      photo_url:         form.photo_url         || null,
      updated_at:        new Date().toISOString(),
    }
    const { error: err } = asset?.id
      ? await supabase.from('maintenance_assets').update(payload).eq('id', asset.id)
      : await supabase.from('maintenance_assets').insert({ ...payload, is_active: true })
    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800">{isNew ? 'Add Asset' : 'Edit Asset'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Asset Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. Main Building HVAC Unit" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Asset Number</label>
              <input value={form.asset_number} onChange={e => set('asset_number', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. HVAC-001" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                {ASSET_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                {ASSET_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Location</label>
              <input value={form.location} onChange={e => set('location', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Room / Area" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Building</label>
              <input value={form.building} onChange={e => set('building', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Building name or wing" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Manufacturer</label>
              <input value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. Carrier, Hoyer" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Model</label>
              <input value={form.model} onChange={e => set('model', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Model number" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Serial Number</label>
              <input value={form.serial_number} onChange={e => set('serial_number', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Serial number" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Purchase Date</label>
              <input type="date" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Warranty Expires</label>
              <input type="date" value={form.warranty_expiry} onChange={e => set('warranty_expiry', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Last Service Date</label>
              <input type="date" value={form.last_service_date} onChange={e => set('last_service_date', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Next Service Due</label>
              <input type="date" value={form.next_service_date} onChange={e => set('next_service_date', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Maintenance notes, special instructions..." />
          </div>
          {/* Photo */}
          {form.photo_url ? (
            <div className="relative rounded-xl overflow-hidden">
              <img src={form.photo_url} alt="" className="w-full max-h-40 object-cover" />
              <button onClick={() => set('photo_url', '')}
                className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full"><X size={14} /></button>
            </div>
          ) : (
            <button onClick={() => fileRef.current.click()} disabled={uploading}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors">
              <Upload size={15} /> {uploading ? 'Uploading...' : 'Add Photo (optional)'}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving...' : isNew ? 'Add Asset' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function WorkOrderAssets({ orgId, profile }) {
  const [assets, setAssets]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [editAsset, setEditAsset] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => { if (orgId) fetchAssets() }, [orgId])

  async function fetchAssets() {
    setLoading(true)
    const { data } = await supabase.from('maintenance_assets')
      .select('*').eq('organization_id', orgId).eq('is_active', true).order('name')
    setAssets(data || [])
    setLoading(false)
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const filtered = assets.filter(a => {
    const matchSearch = !search || `${a.name} ${a.asset_number} ${a.location} ${a.manufacturer}`.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'all' || a.category === filterCat
    return matchSearch && matchCat
  })

  const overdue  = assets.filter(a => a.next_service_date && a.next_service_date < todayStr).length
  const dueSoon  = assets.filter(a => a.next_service_date && a.next_service_date >= todayStr && a.next_service_date <= soon).length
  const outOfSvc = assets.filter(a => a.status === 'out_of_service').length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display font-semibold text-slate-800">Asset Registry</h2>
          <p className="text-slate-400 text-xs mt-0.5">Track equipment, HVAC, lifts, and facility assets</p>
        </div>
        <button onClick={() => { setEditAsset(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={14} /> Add Asset
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Assets',    value: assets.length, color: 'text-brand-600',  bg: 'bg-brand-50' },
          { label: 'Service Overdue', value: overdue,       color: overdue > 0 ? 'text-red-600' : 'text-slate-400', bg: overdue > 0 ? 'bg-red-50' : 'bg-slate-100', alert: overdue > 0 },
          { label: 'Due Within 30d',  value: dueSoon,       color: dueSoon > 0 ? 'text-amber-600' : 'text-slate-400', bg: dueSoon > 0 ? 'bg-amber-50' : 'bg-slate-100' },
          { label: 'Out of Service',  value: outOfSvc,      color: outOfSvc > 0 ? 'text-red-600' : 'text-slate-400', bg: outOfSvc > 0 ? 'bg-red-50' : 'bg-slate-100' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 ${s.alert ? 'ring-2 ring-red-200' : ''}`}>
            <div className={`text-3xl font-display font-bold ${s.color}`}>{s.value}</div>
            <div className="text-slate-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white">
          <option value="all">All Categories</option>
          {ASSET_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>

      {/* Asset grid */}
      {loading ? (
        <div className="text-center py-10 text-slate-400 text-sm">Loading assets...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">
          <Package size={32} className="mx-auto mb-3 opacity-30" />
          <p>No assets found. Add your first asset above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(asset => {
            const cat    = getCat(asset.category)
            const status = ASSET_STATUSES.find(s => s.key === asset.status) || ASSET_STATUSES[0]
            const overdue = asset.next_service_date && asset.next_service_date < todayStr
            const soon    = asset.next_service_date && asset.next_service_date >= todayStr && asset.next_service_date <= new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]
            return (
              <div key={asset.id}
                className={`bg-white rounded-2xl border shadow-sm p-4 hover:shadow-md transition-all ${overdue ? 'border-red-200' : soon ? 'border-amber-200' : 'border-slate-100'}`}>
                {/* Asset photo */}
                {asset.photo_url && (
                  <img src={asset.photo_url} alt="" className="w-full h-28 object-cover rounded-xl mb-3" />
                )}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 text-sm truncate">{asset.name}</div>
                    {asset.asset_number && <div className="text-xs text-slate-400">{asset.asset_number}</div>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.color}`}>{cat.label}</span>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-slate-400 mb-3">
                  {asset.location && <div>📍 {asset.location}{asset.building ? ` · ${asset.building}` : ''}</div>}
                  {asset.manufacturer && <div>🏭 {asset.manufacturer} {asset.model}</div>}
                  {asset.serial_number && <div>🔢 SN: {asset.serial_number}</div>}
                </div>
                <div className={`flex items-center justify-between text-xs ${overdue ? 'text-red-600 font-medium' : soon ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                  <span className="flex items-center gap-1">
                    <Calendar size={11} />
                    {overdue ? `Service overdue since ${fmt(asset.next_service_date)}` :
                     asset.next_service_date ? `Next service: ${fmt(asset.next_service_date)}` : 'No service date set'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => { setEditAsset(asset); setShowModal(true) }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:border-brand-300 hover:text-brand-600 transition-colors">
                    <Edit2 size={11} /> Edit
                  </button>
                  <button onClick={async () => {
                    if (!confirm('Remove this asset?')) return
                    await supabase.from('maintenance_assets').update({ is_active: false }).eq('id', asset.id)
                    fetchAssets()
                  }} className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <AssetModal asset={editAsset} orgId={orgId} profile={profile}
          onClose={() => { setShowModal(false); setEditAsset(null) }}
          onSaved={() => { setShowModal(false); setEditAsset(null); fetchAssets() }} />
      )}
    </div>
  )
}
