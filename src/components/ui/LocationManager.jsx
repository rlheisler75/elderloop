import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, X, Edit2, Trash2, ChevronRight, ChevronDown,
  MapPin, Building2, Layers, DoorOpen, Trees, LayoutGrid,
  Check, AlertTriangle, GripVertical
} from 'lucide-react'

const LOCATION_TYPES = [
  { key: 'building',       label: 'Building' },
  { key: 'wing',           label: 'Wing / Hall' },
  { key: 'floor',          label: 'Floor' },
  { key: 'room',           label: 'Room / Unit' },
  { key: 'common_area',    label: 'Common Area' },
  { key: 'outdoor',        label: 'Outdoor / Grounds' },
  { key: 'equipment_room', label: 'Equipment Room' },
  { key: 'other',          label: 'Other' },
]

const TYPE_ICONS = {
  building: Building2, wing: Layers, floor: Layers,
  room: DoorOpen, outdoor: Trees, common_area: LayoutGrid,
  equipment_room: DoorOpen, other: MapPin,
}

const TYPE_COLORS = {
  building: 'text-brand-600', wing: 'text-indigo-500', floor: 'text-indigo-500',
  room: 'text-slate-500', outdoor: 'text-green-600', common_area: 'text-amber-600',
  equipment_room: 'text-orange-500', other: 'text-slate-400',
}

function buildTree(flat) {
  const map = {}
  flat.forEach(n => { map[n.id] = { ...n, children: [] } })
  const roots = []
  flat.forEach(n => {
    if (n.parent_id && map[n.parent_id]) map[n.parent_id].children.push(map[n.id])
    else roots.push(map[n.id])
  })
  const sort = nodes => { nodes.sort((a,b) => a.sort_order - b.sort_order); nodes.forEach(n => sort(n.children)) }
  sort(roots)
  return roots
}

// ── Add/Edit Modal ────────────────────────────────────────────
function LocationModal({ loc, parentId, parentName, locations, orgId, onClose, onSaved }) {
  const isNew = !loc
  const [form, setForm] = useState({
    name:          loc?.name          || '',
    location_type: loc?.location_type || (parentId ? 'room' : 'building'),
    parent_id:     loc?.parent_id     ?? parentId ?? null,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Build flat parent options (exclude self and descendants)
  const parentOptions = locations.filter(l => l.id !== loc?.id)

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    const payload = {
      organization_id: orgId,
      name:            form.name.trim(),
      location_type:   form.location_type,
      parent_id:       form.parent_id || null,
      updated_at:      new Date().toISOString(),
    }
    const { error: err } = isNew
      ? await supabase.from('locations').insert(payload)
      : await supabase.from('locations').update(payload).eq('id', loc.id)
    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-display font-semibold text-slate-800">
            {isNew ? 'Add Location' : 'Edit Location'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Location Name *
            </label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Building A, Room 101, West Wing..." />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Location Type *
            </label>
            <select value={form.location_type} onChange={e => set('location_type', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              {LOCATION_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Parent Location <span className="text-slate-400 font-normal">(optional — leave blank for top level)</span>
            </label>
            <select value={form.parent_id || ''} onChange={e => set('parent_id', e.target.value || null)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">— Top Level —</option>
              {parentOptions.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving...' : isNew ? 'Add Location' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tree Row ──────────────────────────────────────────────────
function LocationRow({ node, depth, onEdit, onAddChild, onDelete }) {
  const [open, setOpen]         = useState(depth < 1)
  const [confirmDel, setConfirm] = useState(false)
  const hasChildren = node.children.length > 0
  const Icon = TYPE_ICONS[node.location_type] || MapPin
  const iconColor = TYPE_COLORS[node.location_type] || 'text-slate-400'

  return (
    <>
      <div
        className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-slate-50 group transition-colors"
        style={{ paddingLeft: `${12 + depth * 24}px` }}>

        {hasChildren ? (
          <button onClick={() => setOpen(o => !o)}
            className="text-slate-400 hover:text-slate-600 flex-shrink-0">
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        <Icon size={14} className={`flex-shrink-0 ${iconColor}`} />

        <span className="flex-1 text-sm text-slate-700">{node.name}</span>

        <span className="text-xs text-slate-400 capitalize hidden group-hover:inline">
          {LOCATION_TYPES.find(t => t.key === node.location_type)?.label}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onAddChild(node)}
            className="p-1 text-slate-400 hover:text-brand-600 rounded transition-colors" title="Add child location">
            <Plus size={13} />
          </button>
          <button onClick={() => onEdit(node)}
            className="p-1 text-slate-400 hover:text-brand-600 rounded transition-colors" title="Edit">
            <Edit2 size={13} />
          </button>
          {confirmDel ? (
            <div className="flex items-center gap-1">
              <button onClick={() => onDelete(node)}
                className="px-2 py-0.5 bg-red-600 text-white text-xs rounded font-medium">Delete</button>
              <button onClick={() => setConfirm(false)}
                className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs rounded">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setConfirm(true)}
              className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors" title="Delete">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {open && hasChildren && node.children.map(child => (
        <LocationRow key={child.id} node={child} depth={depth + 1}
          onEdit={onEdit} onAddChild={onAddChild} onDelete={onDelete} />
      ))}
    </>
  )
}

// ── Main LocationManager ──────────────────────────────────────
export default function LocationManager({ orgId }) {
  const [locations, setLocations] = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null) // null | { loc, parentId, parentName }

  useEffect(() => { fetchLocations() }, [])

  async function fetchLocations() {
    const { data } = await supabase
      .from('locations').select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('sort_order')
    setLocations(data || [])
    setLoading(false)
  }

  async function handleDelete(node) {
    await supabase.from('locations').update({ is_active: false }).eq('id', node.id)
    fetchLocations()
  }

  const tree = useMemo(() => buildTree(locations), [locations])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-semibold text-slate-800 flex items-center gap-2">
            <MapPin size={16} className="text-brand-600" /> Location Manager
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Build your facility's location hierarchy. These appear in the work order location picker.
          </p>
        </div>
        <button
          onClick={() => setModal({ loc: null, parentId: null, parentName: null })}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={14} /> Add Top-Level Location
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-8 text-slate-400 text-sm">Loading locations...</div>
        ) : tree.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <MapPin size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No locations yet.</p>
            <p className="text-xs mt-1">Add a building to get started.</p>
          </div>
        ) : (
          <div className="p-2">
            {tree.map(node => (
              <LocationRow
                key={node.id}
                node={node}
                depth={0}
                onEdit={loc => setModal({ loc, parentId: null, parentName: null })}
                onAddChild={parent => setModal({ loc: null, parentId: parent.id, parentName: parent.name })}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-3">
        {locations.length} location{locations.length !== 1 ? 's' : ''} configured · Hover a row to edit or add children
      </p>

      {modal !== null && (
        <LocationModal
          loc={modal.loc}
          parentId={modal.parentId}
          parentName={modal.parentName}
          locations={locations}
          orgId={orgId}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchLocations() }}
        />
      )}
    </div>
  )
}
