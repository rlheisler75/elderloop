import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, X, Search, Check, AlertTriangle, Monitor, Wifi,
  Printer, Phone, Server, Package, HelpCircle, Edit2,
  User, Calendar, Tag, MapPin, Wrench, Laptop, Tv,
  ToggleLeft, ToggleRight, ChevronRight, RefreshCw,
  ClipboardList, Box, AlertCircle, Clock
} from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────
const fmtDate = (ts) => ts
  ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : '—'
const fmtDateShort = (ts) => ts
  ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  : '—'

const STATUS_COLORS = {
  open:        'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
  waiting:     'bg-purple-100 text-purple-700 border-purple-200',
  resolved:    'bg-green-100 text-green-700 border-green-200',
  closed:      'bg-slate-100 text-slate-500 border-slate-200',
}
const STATUS_LABELS = {
  open: 'Open', in_progress: 'In Progress', waiting: 'Waiting',
  resolved: 'Resolved', closed: 'Closed',
}
const PRIORITY_COLORS = {
  low:    'bg-slate-100 text-slate-600 border-slate-200',
  normal: 'bg-blue-100 text-blue-700 border-blue-200',
  high:   'bg-amber-100 text-amber-700 border-amber-200',
  urgent: 'bg-red-100 text-red-700 border-red-200',
}
const ASSET_STATUS_COLORS = {
  active:  'bg-green-100 text-green-700',
  retired: 'bg-slate-100 text-slate-500',
  repair:  'bg-amber-100 text-amber-700',
  missing: 'bg-red-100 text-red-700',
  storage: 'bg-blue-100 text-blue-600',
}

// ── New Ticket Modal ───────────────────────────────────────────
function NewTicketModal({ orgId, userId, categories, assets, staffList, onClose, onSave }) {
  const [form, setForm] = useState({
    title: '', description: '', category: categories[0]?.value || 'other',
    priority: 'normal', asset_id: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required'); return }
    setSaving(true)
    const { error: err } = await supabase.from('it_tickets').insert({
      organization_id: orgId,
      submitted_by:    userId,
      title:           form.title.trim(),
      description:     form.description || null,
      category:        form.category,
      priority:        form.priority,
      asset_id:        form.asset_id || null,
      status:          'open',
    })
    if (err) { setError(err.message); setSaving(false) } else onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800">Submit IT Ticket</h2>
          <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <div>
            <label className="label">Title</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Brief description of the issue..."
              className="input w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className="input w-full">
                {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)} className="input w-full">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Related Asset (optional)</label>
            <select value={form.asset_id} onChange={e => set('asset_id', e.target.value)} className="input w-full">
              <option value="">No specific asset</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.asset_tag ? `[${a.asset_tag}] ` : ''}{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Details</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="Error messages, steps to reproduce, urgency..."
              className="input w-full resize-none" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Ticket Detail / Edit Modal ─────────────────────────────────
function TicketModal({ ticket, categories, assets, staffList, isAdmin, onClose, onSave }) {
  const [status,   setStatus]   = useState(ticket.status)
  const [assignee, setAssignee] = useState(ticket.assigned_to || '')
  const [notes,    setNotes]    = useState(ticket.resolution_notes || '')
  const [priority, setPriority] = useState(ticket.priority)
  const [saving,   setSaving]   = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('it_tickets').update({
      status, assigned_to: assignee || null, priority,
      resolution_notes: notes || null,
      resolved_at: ['resolved','closed'].includes(status) ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', ticket.id)
    setSaving(false); onSave()
  }

  const catLabel = categories.find(c => c.value === ticket.category)?.label || ticket.category
  const relAsset = assets.find(a => a.id === ticket.asset_id)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="font-display font-semibold text-slate-800 truncate">{ticket.title}</h2>
            <div className="text-xs text-slate-400 mt-0.5">#{ticket.id.slice(-8).toUpperCase()} · {catLabel} · {fmtDate(ticket.created_at)}</div>
          </div>
          <button onClick={onClose}><X size={20} className="text-slate-400 flex-shrink-0" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {ticket.description && (
            <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-600 leading-relaxed">{ticket.description}</div>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <User size={12} /> Submitted by {ticket.submitter?.first_name} {ticket.submitter?.last_name}
            {relAsset && <><span>·</span><Monitor size={12} /> {relAsset.name}</>}
          </div>

          {isAdmin ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="input w-full">
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Priority</label>
                  <select value={priority} onChange={e => setPriority(e.target.value)} className="input w-full">
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Assign To</label>
                <select value={assignee} onChange={e => setAssignee(e.target.value)} className="input w-full">
                  <option value="">Unassigned</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.role?.replace('_',' ')})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Resolution Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  rows={3} placeholder="What was done to resolve this?"
                  className="input w-full resize-none" />
              </div>
            </>
          ) : (
            <>
              <div className="flex gap-2 flex-wrap">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[ticket.status]}`}>{STATUS_LABELS[ticket.status]}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${PRIORITY_COLORS[ticket.priority]}`}>{ticket.priority}</span>
              </div>
              {ticket.resolution_notes && (
                <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-800">
                  <div className="font-semibold text-xs text-green-600 mb-1">Resolution</div>
                  {ticket.resolution_notes}
                </div>
              )}
            </>
          )}
        </div>

        {isAdmin && (
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Asset Modal ────────────────────────────────────────────────
function AssetModal({ asset, orgId, assetTypes, locations, staffList, onClose, onSave }) {
  const isNew = !asset
  const [form, setForm] = useState(asset || {
    asset_tag: '', name: '', asset_type: assetTypes[0]?.value || 'desktop',
    make: '', model: '', serial_number: '',
    purchase_date: '', warranty_expiry: '',
    location: locations[0]?.value || '',
    assigned_to: '', status: 'active', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      organization_id: orgId,
      asset_tag:       form.asset_tag  || null,
      name:            form.name.trim(),
      asset_type:      form.asset_type,
      make:            form.make        || null,
      model:           form.model       || null,
      serial_number:   form.serial_number || null,
      purchase_date:   form.purchase_date  || null,
      warranty_expiry: form.warranty_expiry || null,
      location:        form.location    || null,
      assigned_to:     form.assigned_to || null,
      status:          form.status,
      notes:           form.notes       || null,
      updated_at:      new Date().toISOString(),
    }
    if (isNew) await supabase.from('it_assets').insert(payload)
    else       await supabase.from('it_assets').update(payload).eq('id', asset.id)
    setSaving(false); onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800">{isNew ? 'Add Asset' : 'Edit Asset'}</h2>
          <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Asset Tag</label>
              <input value={form.asset_tag || ''} onChange={e => set('asset_tag', e.target.value)}
                placeholder="e.g. SG-025" className="input w-full" />
            </div>
            <div>
              <label className="label">Asset Type</label>
              <select value={form.asset_type} onChange={e => set('asset_type', e.target.value)} className="input w-full">
                {assetTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Asset Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Nursing Station PC #3" className="input w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Make / Brand</label>
              <input value={form.make || ''} onChange={e => set('make', e.target.value)}
                placeholder="Dell, HP, Apple..." className="input w-full" />
            </div>
            <div>
              <label className="label">Model</label>
              <input value={form.model || ''} onChange={e => set('model', e.target.value)}
                placeholder="OptiPlex 7090..." className="input w-full" />
            </div>
          </div>
          <div>
            <label className="label">Serial Number</label>
            <input value={form.serial_number || ''} onChange={e => set('serial_number', e.target.value)}
              className="input w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Purchase Date</label>
              <input type="date" value={form.purchase_date || ''} onChange={e => set('purchase_date', e.target.value)}
                className="input w-full" />
            </div>
            <div>
              <label className="label">Warranty Expires</label>
              <input type="date" value={form.warranty_expiry || ''} onChange={e => set('warranty_expiry', e.target.value)}
                className="input w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Location</label>
              <select value={form.location || ''} onChange={e => set('location', e.target.value)} className="input w-full">
                <option value="">— Select —</option>
                {locations.map(l => <option key={l.value} value={l.label}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="input w-full">
                <option value="active">Active</option>
                <option value="repair">In Repair</option>
                <option value="storage">In Storage</option>
                <option value="retired">Retired</option>
                <option value="missing">Missing</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Assigned To</label>
            <select value={form.assigned_to || ''} onChange={e => set('assigned_to', e.target.value)} className="input w-full">
              <option value="">Unassigned / Shared</option>
              {staffList.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)}
              rows={2} className="input w-full resize-none" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving...' : isNew ? 'Add Asset' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────
export default function ITTickets() {
  const { profile, organization, isOrgAdmin } = useAuth()
  const [tickets, setTickets]       = useState([])
  const [assets, setAssets]         = useState([])
  const [staffList, setStaffList]   = useState([])
  // Org-defined dropdowns
  const [categories, setCategories] = useState([])
  const [assetTypes, setAssetTypes] = useState([])
  const [assetLocations, setAssetLocations] = useState([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('tickets')
  const [ticketView, setTicketView] = useState('all') // 'all' | 'mine' | 'assigned'
  const [filterStatus, setFilterStatus]   = useState('open')
  const [filterPriority, setFilterPriority] = useState('all')
  const [search, setSearch]         = useState('')
  const [showNew, setShowNew]       = useState(false)
  const [viewTicket, setViewTicket] = useState(null)
  const [viewAsset, setViewAsset]   = useState(null)
  const [newAsset, setNewAsset]     = useState(false)
  const [assetSearch, setAssetSearch] = useState('')
  const [assetTypeFilter, setAssetTypeFilter] = useState('all')

  const admin  = isOrgAdmin()
  const orgId  = organization?.id
  const userId = profile?.id

  useEffect(() => { if (orgId) fetchAll() }, [orgId])

  async function fetchAll() {
    setLoading(true)
    const [ticketRes, assetRes, staffRes, dropdownRes] = await Promise.all([
      supabase.from('it_tickets')
        .select('*, submitter:submitted_by(first_name,last_name), assignee:assigned_to(first_name,last_name)')
        .eq('organization_id', orgId).order('created_at', { ascending: false }),
      supabase.from('it_assets').select('*, assignee:assigned_to(first_name,last_name)')
        .eq('organization_id', orgId).eq('is_active', true).order('asset_tag'),
      supabase.from('profiles').select('id,first_name,last_name,role')
        .eq('organization_id', orgId).not('role','in','(resident,family)').order('last_name'),
      supabase.from('org_dropdown_items')
        .select('*').eq('organization_id', orgId).eq('is_active', true)
        .in('list_type', ['it_category','asset_type','asset_location'])
        .order('sort_order'),
    ])

    setTickets(ticketRes.data || [])
    setAssets(assetRes.data || [])
    setStaffList(staffRes.data || [])

    const dropdowns = dropdownRes.data || []
    setCategories(dropdowns.filter(d => d.list_type === 'it_category'))
    setAssetTypes(dropdowns.filter(d => d.list_type === 'asset_type'))
    setAssetLocations(dropdowns.filter(d => d.list_type === 'asset_location'))
    setLoading(false)
  }

  const filteredTickets = tickets.filter(t => {
    if (ticketView === 'mine'     && t.submitted_by !== userId) return false
    if (ticketView === 'assigned' && t.assigned_to  !== userId) return false
    if (filterStatus !== 'all'   && t.status   !== filterStatus)  return false
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const filteredAssets = assets.filter(a => {
    if (assetTypeFilter !== 'all' && a.asset_type !== assetTypeFilter) return false
    if (assetSearch && ![a.name, a.asset_tag, a.make, a.model, a.location, a.serial_number]
      .filter(Boolean).some(f => f.toLowerCase().includes(assetSearch.toLowerCase()))) return false
    return true
  })

  const counts = {
    open:        tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    my_open:     tickets.filter(t => t.assigned_to === userId && !['resolved','closed'].includes(t.status)).length,
  }

  // css helpers (Tailwind classes can't be dynamic so we inline)
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5"
  const inputClass = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"

  return (
    <div className="max-w-6xl mx-auto">
      <style>{`.label{display:block;font-size:.65rem;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.375rem}.input{width:100%;padding:.5rem .75rem;border:1px solid #e2e8f0;border-radius:.5rem;font-size:.875rem;outline:none}.input:focus{ring:2px solid #0c90e1}`}</style>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800">IT & Technology</h1>
          <p className="text-slate-500 text-sm mt-0.5">Support tickets and device inventory</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={16} /> New Ticket
        </button>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <div className="text-2xl font-bold text-blue-600" style={{ fontFamily: '"Playfair Display", serif' }}>{counts.open}</div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">Open Tickets</div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <div className="text-2xl font-bold text-amber-600" style={{ fontFamily: '"Playfair Display", serif' }}>{counts.in_progress}</div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">In Progress</div>
        </div>
        <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4">
          <div className="text-2xl font-bold text-brand-600" style={{ fontFamily: '"Playfair Display", serif' }}>{assets.length}</div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">Tracked Assets</div>
        </div>
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { key: 'tickets', label: 'Tickets',  icon: ClipboardList },
          { key: 'assets',  label: 'Assets',   icon: Monitor },
        ].map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Icon size={15} />{t.label}
            </button>
          )
        })}
      </div>

      {/* ── TICKETS TAB ── */}
      {tab === 'tickets' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              {[
                { key: 'all',      label: 'All' },
                { key: 'mine',     label: 'My Tickets' },
                ...(admin ? [{ key: 'assigned', label: 'Assigned to Me' }] : []),
              ].map(v => (
                <button key={v.key} onClick={() => setTicketView(v.key)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${ticketView === v.key ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}>
                  {v.label}
                </button>
              ))}
            </div>
            <div className="relative flex-1 min-w-44">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none">
              <option value="all">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none">
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-16 text-slate-400">Loading tickets...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <ClipboardList size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-display text-lg">No tickets found</p>
              <p className="text-sm mt-1">
                {filterStatus !== 'all' ? `No ${STATUS_LABELS[filterStatus]?.toLowerCase()} tickets` : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTickets.map(t => {
                const relAsset = assets.find(a => a.id === t.asset_id)
                const catLabel = categories.find(c => c.value === t.category)?.label || t.category
                return (
                  <button key={t.id} onClick={() => setViewTicket(t)}
                    className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 text-left hover:border-brand-200 hover:shadow-md transition-all group">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                      <Monitor size={18} className="text-brand-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-800 text-sm truncate">{t.title}</span>
                        {t.priority === 'urgent' && <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                        <span>{catLabel}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><User size={10} />{t.submitter?.first_name} {t.submitter?.last_name}</span>
                        <span>·</span>
                        <span>{fmtDateShort(t.created_at)}</span>
                        {relAsset && <><span>·</span><span className="flex items-center gap-1"><Monitor size={10} />{relAsset.asset_tag || relAsset.name}</span></>}
                        {t.assignee && <><span>·</span><span className="flex items-center gap-1 text-brand-500"><User size={10} />{t.assignee.first_name}</span></>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${PRIORITY_COLORS[t.priority]}`}>
                        {t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}
                      </span>
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[t.status]}`}>
                        {STATUS_LABELS[t.status]}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── ASSETS TAB ── */}
      {tab === 'assets' && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-44">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={assetSearch} onChange={e => setAssetSearch(e.target.value)} placeholder="Search by name, tag, serial..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <select value={assetTypeFilter} onChange={e => setAssetTypeFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none">
              <option value="all">All Types</option>
              {assetTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {admin && (
              <button onClick={() => setNewAsset(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors">
                <Plus size={15} /> Add Asset
              </button>
            )}
          </div>

          {filteredAssets.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Monitor size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-display text-lg">No assets found</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {['Tag','Name','Type','Make / Model','Location','Assigned To','Warranty','Status',''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map(a => {
                    const typeLabel = assetTypes.find(t => t.value === a.asset_type)?.label || a.asset_type
                    const now = new Date()
                    const warrantyExpired = a.warranty_expiry && new Date(a.warranty_expiry) < now
                    const warrantySoon = a.warranty_expiry && !warrantyExpired && new Date(a.warranty_expiry) < new Date(now.getTime() + 90*24*60*60*1000)
                    return (
                      <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{a.asset_tag || '—'}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800 max-w-48 truncate">{a.name}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{typeLabel}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {[a.make, a.model].filter(Boolean).join(' ') || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{a.location || '—'}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                          {a.assignee ? `${a.assignee.first_name} ${a.assignee.last_name}` : <span className="text-slate-300">Shared</span>}
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          {a.warranty_expiry ? (
                            <span className={warrantyExpired ? 'text-red-500' : warrantySoon ? 'text-amber-600' : 'text-slate-400'}>
                              {warrantyExpired ? '⚠ Expired' : fmtDate(a.warranty_expiry)}
                            </span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ASSET_STATUS_COLORS[a.status]}`}>
                            {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {admin && (
                            <button onClick={() => setViewAsset(a)}
                              className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                              <Edit2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showNew && (
        <NewTicketModal orgId={orgId} userId={userId} categories={categories} assets={assets} staffList={staffList}
          onClose={() => setShowNew(false)} onSave={() => { setShowNew(false); fetchAll() }} />
      )}
      {viewTicket && (
        <TicketModal ticket={viewTicket} categories={categories} assets={assets} staffList={staffList} isAdmin={admin}
          onClose={() => setViewTicket(null)} onSave={() => { setViewTicket(null); fetchAll() }} />
      )}
      {(viewAsset || newAsset) && (
        <AssetModal
          asset={newAsset ? null : viewAsset} orgId={orgId}
          assetTypes={assetTypes} locations={assetLocations} staffList={staffList}
          onClose={() => { setViewAsset(null); setNewAsset(false) }}
          onSave={() => { setViewAsset(null); setNewAsset(false); fetchAll() }} />
      )}
    </div>
  )
}
