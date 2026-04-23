import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  MapPin, ChevronRight, ChevronDown, Search, X, Check,
  Building2, Layers, DoorOpen, Trees, LayoutGrid
} from 'lucide-react'

const TYPE_ICONS = {
  building:       Building2,
  wing:           Layers,
  floor:          Layers,
  room:           DoorOpen,
  outdoor:        Trees,
  common_area:    LayoutGrid,
  equipment_room: DoorOpen,
  other:          MapPin,
}

const TYPE_COLORS = {
  building:       'text-brand-600',
  wing:           'text-indigo-500',
  floor:          'text-indigo-500',
  room:           'text-slate-500',
  outdoor:        'text-green-600',
  common_area:    'text-amber-600',
  equipment_room: 'text-orange-500',
  other:          'text-slate-400',
}

// Build a flat list → nested tree
function buildTree(flat) {
  const map = {}
  flat.forEach(n => { map[n.id] = { ...n, children: [] } })
  const roots = []
  flat.forEach(n => {
    if (n.parent_id && map[n.parent_id]) {
      map[n.parent_id].children.push(map[n.id])
    } else {
      roots.push(map[n.id])
    }
  })
  // sort by sort_order
  const sort = (nodes) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order)
    nodes.forEach(n => sort(n.children))
  }
  sort(roots)
  return roots
}

// Get full breadcrumb path for a node given flat list
function getPath(flat, nodeId) {
  const map = {}
  flat.forEach(n => { map[n.id] = n })
  const parts = []
  let cur = map[nodeId]
  while (cur) {
    parts.unshift(cur.name)
    cur = cur.parent_id ? map[cur.parent_id] : null
  }
  return parts.join(' > ')
}

// Flatten tree for search
function flattenTree(nodes, acc = []) {
  nodes.forEach(n => { acc.push(n); flattenTree(n.children, acc) })
  return acc
}

// Check if node or any descendant matches search
function nodeMatchesSearch(node, q) {
  if (node.name.toLowerCase().includes(q)) return true
  return node.children.some(c => nodeMatchesSearch(c, q))
}

// ── Tree Node ─────────────────────────────────────────────────
function TreeNode({ node, selected, onSelect, searchQuery, depth = 0 }) {
  const hasChildren = node.children.length > 0
  const isSelected  = selected?.id === node.id
  const matchesSearch = searchQuery
    ? node.name.toLowerCase().includes(searchQuery.toLowerCase())
    : false

  // Auto-expand if search matches a descendant
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (searchQuery && nodeMatchesSearch(node, searchQuery.toLowerCase())) {
      setOpen(true)
    } else if (!searchQuery) {
      setOpen(depth < 1) // top level open by default, rest collapsed
    }
  }, [searchQuery])

  if (searchQuery && !nodeMatchesSearch(node, searchQuery.toLowerCase())) return null

  const Icon = TYPE_ICONS[node.location_type] || MapPin
  const iconColor = TYPE_COLORS[node.location_type] || 'text-slate-400'

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all group
          ${isSelected
            ? 'bg-brand-600 text-white'
            : matchesSearch && searchQuery
              ? 'bg-amber-50 hover:bg-amber-100'
              : 'hover:bg-slate-100'
          }`}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
        onClick={() => onSelect(node)}
      >
        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <button
            onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
            className={`flex-shrink-0 p-0.5 rounded transition-colors ${isSelected ? 'text-brand-200 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}>
            {open
              ? <ChevronDown size={13} />
              : <ChevronRight size={13} />}
          </button>
        ) : (
          <span className="w-5 flex-shrink-0" />
        )}

        <Icon size={14} className={`flex-shrink-0 ${isSelected ? 'text-brand-200' : iconColor}`} />
        <span className={`flex-1 text-sm truncate ${isSelected ? 'text-white font-medium' : matchesSearch && searchQuery ? 'text-amber-900 font-medium' : 'text-slate-700'}`}>
          {node.name}
        </span>
        {isSelected && <Check size={14} className="text-white flex-shrink-0" />}
      </div>

      {open && hasChildren && (
        <div>
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              selected={selected}
              onSelect={onSelect}
              searchQuery={searchQuery}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main LocationPicker Modal ─────────────────────────────────
export default function LocationPicker({ value, onChange, onClose }) {
  const { organization } = useAuth()
  const [locations, setLocations] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState(value || null)
  const searchRef = useRef()

  useEffect(() => {
    fetchLocations()
    setTimeout(() => searchRef.current?.focus(), 100)
  }, [])

  async function fetchLocations() {
    const { data } = await supabase
      .from('locations')
      .select('*')
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .order('sort_order')
    setLocations(data || [])
    setLoading(false)
  }

  const tree  = useMemo(() => buildTree(locations), [locations])
  const total = locations.length

  const handleConfirm = () => {
    if (!selected) return
    const path = getPath(locations, selected.id)
    onChange({ ...selected, path })
    onClose()
  }

  const handleClear = () => {
    onChange(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: '85vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-brand-600" />
            <h2 className="font-display font-semibold text-slate-800">Select Location</h2>
            <span className="text-xs text-slate-400">{total} locations</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search locations..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Selected preview */}
        {selected && (
          <div className="px-4 py-2 bg-brand-50 border-b border-brand-100 flex items-center gap-2 flex-shrink-0">
            <Check size={13} className="text-brand-600 flex-shrink-0" />
            <span className="text-xs text-brand-700 font-medium truncate">
              {getPath(locations, selected.id)}
            </span>
          </div>
        )}

        {/* Tree */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-sm">Loading locations...</div>
          ) : tree.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No locations configured yet.
            </div>
          ) : (
            tree.map(node => (
              <TreeNode
                key={node.id}
                node={node}
                selected={selected}
                onSelect={setSelected}
                searchQuery={search}
                depth={0}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            onClick={handleClear}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
            Clear location
          </button>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 font-medium border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selected}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-200 text-white text-sm font-medium rounded-xl transition-colors">
              Choose Location
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
