import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Plus, X, Edit2, Trash2, Check, Car, Home, ClipboardList,
  Users, Gauge, Shield, Heart, Award, Link, MapPin, Mail,
  Phone, AlertTriangle, Upload, Monitor, Tag
} from 'lucide-react'
import ResidentImport from './ResidentImport'

// ── Generic editable list ──────────────────────────────────────
function EditableList({ items, onAdd, onUpdate, onDelete, addPlaceholder, columns, renderRow }) {
  const [adding, setAdding]       = useState(false)
  const [newVals, setNewVals]     = useState({})
  const [editId, setEditId]       = useState(null)
  const [editVals, setEditVals]   = useState({})

  const handleAdd = async () => {
    if (!newVals[columns[0].key]?.trim()) return
    await onAdd(newVals); setAdding(false); setNewVals({})
  }
  const startEdit = (item) => {
    setEditId(item.id)
    const v = {}; columns.forEach(c => { v[c.key] = item[c.key] || '' }); setEditVals(v)
  }
  const handleUpdate = async () => { await onUpdate(editId, editVals); setEditId(null) }

  return (
    <div>
      <div className="space-y-2 mb-3">
        {items.map(item => (
          <div key={item.id}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${item.is_active === false ? 'opacity-40 border-slate-100 bg-slate-50' : 'border-slate-100 bg-white hover:border-brand-200'}`}>
            {editId === item.id ? (
              <>
                <div className="flex-1 flex gap-2 flex-wrap">
                  {columns.map(col => col.type === 'select' ? (
                    <select key={col.key} value={editVals[col.key] || ''}
                      onChange={e => setEditVals(v => ({ ...v, [col.key]: e.target.value }))}
                      className="flex-1 px-2 py-1.5 border border-brand-300 rounded-lg text-sm focus:outline-none">
                      {col.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input key={col.key} value={editVals[col.key] || ''}
                      onChange={e => setEditVals(v => ({ ...v, [col.key]: e.target.value }))}
                      className="flex-1 px-2 py-1.5 border border-brand-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder={col.label} />
                  ))}
                </div>
                <button onClick={handleUpdate} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Check size={15} /></button>
                <button onClick={() => setEditId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={15} /></button>
              </>
            ) : (
              <>
                <div className="flex-1">{renderRow(item)}</div>
                <button onClick={() => startEdit(item)} className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 flex-shrink-0"><Edit2 size={14} /></button>
                <button onClick={() => onDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 flex-shrink-0"><Trash2 size={14} /></button>
              </>
            )}
          </div>
        ))}
        {items.length === 0 && !adding && (
          <div className="text-center py-6 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">No items yet — add one below.</div>
        )}
      </div>

      {adding ? (
        <div className="flex items-center gap-2 p-3 rounded-xl border-2 border-brand-300 bg-brand-50 flex-wrap">
          {columns.map(col => col.type === 'select' ? (
            <select key={col.key} value={newVals[col.key] || ''}
              onChange={e => setNewVals(v => ({ ...v, [col.key]: e.target.value }))}
              className="flex-1 px-3 py-2 border border-brand-300 rounded-lg text-sm focus:outline-none bg-white">
              <option value="">{col.label}</option>
              {col.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input key={col.key} value={newVals[col.key] || ''}
              onChange={e => setNewVals(v => ({ ...v, [col.key]: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              autoFocus={col === columns[0]}
              className="flex-1 px-3 py-2 border border-brand-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              placeholder={col.label} />
          ))}
          <button onClick={handleAdd} className="px-3 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 flex-shrink-0">Add</button>
          <button onClick={() => { setAdding(false); setNewVals({}) }} className="p-2 text-slate-400 flex-shrink-0"><X size={15} /></button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors flex items-center justify-center gap-1.5">
          <Plus size={14} /> {addPlaceholder}
        </button>
      )}
    </div>
  )
}

// ── Family Links Section ───────────────────────────────────────
function FamilyLinks({ orgId }) {
  const [links, setLinks]       = useState([])
  const [residents, setResidents] = useState([])
  const [familyUsers, setFamilyUsers] = useState([])
  const [loading, setLoading]   = useState(true)
  const [adding, setAdding]     = useState(false)
  const [form, setForm]         = useState({ family_user_id: '', resident_id: '', relationship: 'child', is_primary: false })
  const [saving, setSaving]     = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { fetchAll() }, [orgId])

  async function fetchAll() {
    setLoading(true)
    const [linksRes, residentsRes, usersRes] = await Promise.all([
      supabase.from('family_resident_links')
        .select('*, profiles!family_user_id(first_name,last_name,email), residents(first_name,last_name,room_number)')
        .eq('organization_id', orgId),
      supabase.from('residents').select('id,first_name,last_name,room_number')
        .eq('organization_id', orgId).eq('is_active', true).order('last_name'),
      supabase.from('profiles').select('id,first_name,last_name,email')
        .eq('organization_id', orgId).eq('role', 'family').order('last_name'),
    ])
    setLinks(linksRes.data || [])
    setResidents(residentsRes.data || [])
    setFamilyUsers(usersRes.data || [])
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!form.family_user_id || !form.resident_id) return
    setSaving(true)
    await supabase.from('family_resident_links').upsert({
      organization_id: orgId,
      family_user_id:  form.family_user_id,
      resident_id:     form.resident_id,
      relationship:    form.relationship || 'family',
      is_primary:      form.is_primary,
      can_view_activities: true,
      can_view_dietary:    true,
    }, { onConflict: 'family_user_id,resident_id' })
    setForm({ family_user_id: '', resident_id: '', relationship: 'child', is_primary: false })
    setAdding(false); setSaving(false); fetchAll()
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this family link? The family member will lose access to this resident.')) return
    await supabase.from('family_resident_links').delete().eq('id', id)
    fetchAll()
  }

  const RELATIONSHIPS = ['spouse','child','sibling','parent','grandchild','friend','guardian','other']

  if (loading) return <div className="text-center py-6 text-slate-400 text-sm">Loading...</div>

  return (
    <div>
      <div className="mb-4">
        <h3 className="font-display font-semibold text-slate-800">Family → Resident Links</h3>
        <p className="text-slate-400 text-xs mt-0.5">
          Connect family member accounts to their resident. Family members can only see linked residents in the Family Portal.
        </p>
        {familyUsers.length === 0 && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-start gap-2">
            <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
            No family accounts found. Create user accounts with the "Family" role in the Users tab first.
          </div>
        )}
      </div>

      {/* Existing links */}
      <div className="space-y-2 mb-3">
        {links.map(link => {
          const fam = link.profiles
          const res = link.residents
          return (
            <div key={link.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:border-brand-200 transition-all">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Heart size={14} className="text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">
                    {fam ? `${fam.first_name} ${fam.last_name}` : 'Unknown'}
                    <span className="text-slate-400 font-normal mx-2">→</span>
                    {res ? `${res.first_name} ${res.last_name}` : 'Unknown'}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                    <span className="capitalize">{link.relationship || 'family'}</span>
                    {link.is_primary && <span className="bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded text-xs font-medium">Primary Contact</span>}
                    {res?.room_number && <span>Room {res.room_number}</span>}
                    {fam?.email && <span>{fam.email}</span>}
                  </div>
                </div>
              </div>
              <button onClick={() => handleDelete(link.id)}
                className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          )
        })}
        {links.length === 0 && !adding && (
          <div className="text-center py-6 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
            No family links yet. Add one below.
          </div>
        )}
      </div>

      {/* Add form */}
      {adding ? (
        <div className="p-4 rounded-xl border-2 border-brand-300 bg-brand-50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Family Member *</label>
              <select value={form.family_user_id} onChange={e => set('family_user_id', e.target.value)}
                className="w-full px-3 py-2 border border-brand-300 rounded-lg text-sm focus:outline-none bg-white">
                <option value="">Select family user</option>
                {familyUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.first_name} {u.last_name} — {u.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Resident *</label>
              <select value={form.resident_id} onChange={e => set('resident_id', e.target.value)}
                className="w-full px-3 py-2 border border-brand-300 rounded-lg text-sm focus:outline-none bg-white">
                <option value="">Select resident</option>
                {residents.map(r => (
                  <option key={r.id} value={r.id}>{r.first_name} {r.last_name}{r.room_number ? ` — Room ${r.room_number}` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Relationship</label>
              <select value={form.relationship} onChange={e => set('relationship', e.target.value)}
                className="w-full px-3 py-2 border border-brand-300 rounded-lg text-sm focus:outline-none bg-white capitalize">
                {RELATIONSHIPS.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input type="checkbox" checked={form.is_primary} onChange={e => set('is_primary', e.target.checked)} className="w-4 h-4 rounded text-brand-600" />
                <span className="text-sm text-slate-700">Primary contact</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setAdding(false)} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
            <button onClick={handleAdd} disabled={saving || !form.family_user_id || !form.resident_id}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
              {saving ? 'Linking...' : 'Link Family to Resident'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors flex items-center justify-center gap-1.5">
          <Plus size={14} /> Link Family Member to Resident
        </button>
      )}
    </div>
  )
}

// ── Main AdminLists ────────────────────────────────────────────
export default function AdminLists({ orgId }) {
  const [section, setSection]       = useState('vehicles')
  const [vehicles, setVehicles]     = useState([])
  const [residents, setResidents]   = useState([])
  const [areas, setAreas]           = useState([])
  const [checklist, setChecklist]   = useState([])
  const [utilityTypes, setUtilityTypes] = useState([])
  const [certTypes, setCertTypes]   = useState([])
  const [checkpoints, setCheckpoints] = useState([])
  // IT org dropdowns
  const [itCategories, setItCategories]     = useState([])
  const [itAssetTypes, setItAssetTypes]     = useState([])
  const [itAssetLocations, setItAssetLocations] = useState([])
  const [loading, setLoading]       = useState(true)
  const [showImport, setShowImport] = useState(false)

  useEffect(() => { if (orgId) fetchAll() }, [orgId])

  async function fetchAll() {
    setLoading(true)
    const [v, r, a, c, u, ct, cp, dd] = await Promise.all([
      supabase.from('vehicles').select('*').eq('organization_id', orgId).order('name'),
      supabase.from('residents').select('*').eq('organization_id', orgId).eq('is_active', true).order('last_name'),
      supabase.from('inspection_areas').select('*').eq('organization_id', orgId).eq('is_active', true).order('sort_order'),
      supabase.from('inspection_checklist_items').select('*').eq('organization_id', orgId).eq('is_active', true).order('sort_order'),
      supabase.from('utility_types').select('*').eq('organization_id', orgId).eq('is_active', true).order('name'),
      supabase.from('certification_types').select('*').eq('organization_id', orgId).eq('is_active', true).order('sort_order'),
      supabase.from('security_checkpoints').select('*').eq('organization_id', orgId).eq('is_active', true).order('name'),
      supabase.from('org_dropdown_items').select('*').eq('organization_id', orgId).eq('is_active', true)
        .in('list_type', ['it_category','asset_type','asset_location']).order('sort_order'),
    ])
    setVehicles(v.data || [])
    setResidents(r.data || [])
    setAreas(a.data || [])
    setChecklist(c.data || [])
    setUtilityTypes(u.data || [])
    setCertTypes(ct.data || [])
    setCheckpoints(cp.data || [])
    const drops = dd.data || []
    setItCategories(drops.filter(d => d.list_type === 'it_category'))
    setItAssetTypes(drops.filter(d => d.list_type === 'asset_type'))
    setItAssetLocations(drops.filter(d => d.list_type === 'asset_location'))
    setLoading(false)
  }

  // ── CRUD helpers ──────────────────────────────────────────────
  const crud = (table, setter) => ({
    add: async (vals) => {
      await supabase.from(table).insert({ organization_id: orgId, ...vals, is_active: true })
      fetchAll()
    },
    update: async (id, vals) => {
      await supabase.from(table).update(vals).eq('id', id)
      fetchAll()
    },
    del: async (id, msg = 'Remove this item?') => {
      if (!confirm(msg)) return
      await supabase.from(table).update({ is_active: false }).eq('id', id)
      fetchAll()
    },
  })

  // Crud for org_dropdown_items by list_type
  const dropdownCrud = (listType, setter) => ({
    add: async (vals) => {
      const sortOrder = (listType === 'it_category' ? itCategories
        : listType === 'asset_type' ? itAssetTypes : itAssetLocations).length + 1
      await supabase.from('org_dropdown_items').insert({
        organization_id: orgId, list_type: listType,
        label: vals.label, value: vals.label.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        sort_order: sortOrder, is_active: true
      })
      fetchAll()
    },
    update: async (id, vals) => {
      await supabase.from('org_dropdown_items').update({ label: vals.label }).eq('id', id)
      fetchAll()
    },
    del: async (id) => {
      if (!confirm('Remove this option?')) return
      await supabase.from('org_dropdown_items').update({ is_active: false }).eq('id', id)
      fetchAll()
    },
  })

  const veh  = crud('vehicles', setVehicles)
  const res  = crud('residents', setResidents)
  const area = crud('inspection_areas', setAreas)
  const chk  = crud('inspection_checklist_items', setChecklist)
  const util = crud('utility_types', setUtilityTypes)
  const cert = crud('certification_types', setCertTypes)
  const cp   = crud('security_checkpoints', setCheckpoints)
  const itCat  = dropdownCrud('it_category', setItCategories)
  const itType = dropdownCrud('asset_type', setItAssetTypes)
  const itLoc  = dropdownCrud('asset_location', setItAssetLocations)

  const sections = [
    { key: 'vehicles',       label: 'Vehicles',            icon: Car,           count: vehicles.length },
    { key: 'residents',      label: 'Residents',            icon: Users,         count: residents.length },
    { key: 'family',         label: 'Family Links',         icon: Heart,         count: null },
    { key: 'utilities',      label: 'Utility Types',        icon: Gauge,         count: utilityTypes.length },
    { key: 'checkpoints',    label: 'Security Checkpoints', icon: MapPin,        count: checkpoints.length },
    { key: 'certs',          label: 'Certification Types',  icon: Award,         count: certTypes.length },
    { key: 'areas',          label: 'Inspection Areas',     icon: Home,          count: areas.length },
    { key: 'checklist',      label: 'Inspect. Checklist',   icon: ClipboardList, count: checklist.length },
    { key: 'it_categories',  label: 'IT Categories',        icon: Monitor,       count: itCategories.length },
    { key: 'asset_types',    label: 'Asset Types',          icon: Tag,           count: itAssetTypes.length },
    { key: 'asset_locations',label: 'Asset Locations',      icon: MapPin,        count: itAssetLocations.length },
  ]

  return (
    <div>
      {/* Section tabs — wrap on small screens */}
      <div className="flex flex-wrap gap-2 mb-6">
        {sections.map(s => {
          const Icon = s.icon
          return (
            <button key={s.key} onClick={() => setSection(s.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${section === s.key ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-slate-200 text-slate-600 hover:border-brand-300'}`}>
              <Icon size={13} />
              {s.label}
              {s.count !== null && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${section === s.key ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {s.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400 text-sm">Loading...</div>
      ) : (
        <>
          {/* VEHICLES */}
          {section === 'vehicles' && (
            <div>
              <div className="mb-4">
                <h3 className="font-display font-semibold text-slate-800">Vehicles</h3>
                <p className="text-slate-400 text-xs mt-0.5">Vehicles available for transportation scheduling. Only this org's vehicles.</p>
              </div>
              <EditableList items={vehicles} onAdd={veh.add} onUpdate={veh.update} onDelete={veh.del}
                addPlaceholder="Add vehicle"
                columns={[
                  { key: 'name',          label: 'Vehicle name (e.g. Community Van)' },
                  { key: 'license_plate', label: 'License plate' },
                  { key: 'capacity',      label: 'Capacity' },
                ]}
                renderRow={item => (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                      <Car size={15} className="text-brand-600" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-800 text-sm">{item.name}</div>
                      <div className="text-xs text-slate-400">
                        {[item.license_plate, item.capacity && `${item.capacity} passenger${item.capacity !== 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {/* RESIDENTS */}
          {section === 'residents' && (
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-display font-semibold text-slate-800">Residents</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Master resident list. Used across work orders, transportation, dietary, and family portal. Only this org's residents.</p>
                </div>
                <button onClick={() => setShowImport(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-lg transition-colors flex-shrink-0 ml-3">
                  <Upload size={13} /> Import from CSV/Excel
                </button>
              </div>
              <EditableList items={residents} onAdd={res.add} onUpdate={res.update} onDelete={(id) => res.del(id, 'Remove this resident? This will not delete their work orders or dietary profile.')}
                addPlaceholder="Add resident"
                columns={[
                  { key: 'first_name', label: 'First name' },
                  { key: 'last_name',  label: 'Last name' },
                  { key: 'room_number',label: 'Room #' },
                  { key: 'phone',      label: 'Phone' },
                ]}
                renderRow={item => (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold flex-shrink-0">
                      {item.first_name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-slate-800 text-sm">{item.first_name} {item.last_name}</div>
                      <div className="text-xs text-slate-400">
                        {[item.room_number && `Room ${item.room_number}`, item.phone].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {/* FAMILY LINKS */}
          {section === 'family' && <FamilyLinks orgId={orgId} />}

          {/* UTILITY TYPES */}
          {section === 'utilities' && (
            <div>
              <div className="mb-4">
                <h3 className="font-display font-semibold text-slate-800">Utility Types</h3>
                <p className="text-slate-400 text-xs mt-0.5">Utility meter types tracked in Meter Readings. Each org manages their own — Electric, Water, Gas, or custom types.</p>
              </div>
              <EditableList items={utilityTypes} onAdd={util.add} onUpdate={util.update} onDelete={util.del}
                addPlaceholder="Add utility type"
                columns={[
                  { key: 'name', label: 'Utility name (e.g. Electric, Solar)' },
                  { key: 'unit', label: 'Unit (e.g. kWh, Gal, CCF)' },
                ]}
                renderRow={item => (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Gauge size={15} className="text-amber-600" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-800 text-sm">{item.name}</div>
                      <div className="text-xs text-slate-400">{item.unit || 'No unit set'}</div>
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {/* SECURITY CHECKPOINTS */}
          {section === 'checkpoints' && (
            <div>
              <div className="mb-4">
                <h3 className="font-display font-semibold text-slate-800">Security Checkpoints</h3>
                <p className="text-slate-400 text-xs mt-0.5">GPS checkpoints for security guard rounds. Staff must be within the set radius to check in. Only this org's checkpoints.</p>
              </div>
              <EditableList items={checkpoints} onAdd={cp.add} onUpdate={cp.update} onDelete={cp.del}
                addPlaceholder="Add checkpoint"
                columns={[
                  { key: 'name',           label: 'Checkpoint name (e.g. Main Entrance)' },
                  { key: 'latitude',       label: 'Latitude (e.g. 37.2182)' },
                  { key: 'longitude',      label: 'Longitude (e.g. -93.2906)' },
                  { key: 'radius_feet',    label: 'Radius (feet, default 100)' },
                ]}
                renderRow={item => (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <MapPin size={15} className="text-indigo-600" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-800 text-sm">{item.name}</div>
                      <div className="text-xs text-slate-400">
                        {item.latitude && item.longitude
                          ? `${parseFloat(item.latitude).toFixed(4)}, ${parseFloat(item.longitude).toFixed(4)} · ${item.radius_feet || 100}ft radius`
                          : 'No GPS coordinates set'}
                      </div>
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {/* CERTIFICATION TYPES */}
          {section === 'certs' && (
            <div>
              <div className="mb-4">
                <h3 className="font-display font-semibold text-slate-800">Custom Certification Types</h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Add org-specific certification types here. Platform defaults (CNA License, CPR, etc.) are always available.
                  These custom types appear alongside them in Staff Management.
                </p>
              </div>
              <EditableList items={certTypes} onAdd={cert.add} onUpdate={cert.update} onDelete={cert.del}
                addPlaceholder="Add certification type"
                columns={[
                  { key: 'name',       label: 'Certification name (e.g. Dementia Care Training)' },
                  { key: 'alert_days', label: 'Alert days before expiry (e.g. 30)' },
                ]}
                renderRow={item => (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Award size={15} className="text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-800 text-sm">{item.name}</div>
                      <div className="text-xs text-slate-400">
                        Alert {item.alert_days || 30} days before expiry
                        {item.is_required && <span className="ml-2 text-red-500 font-medium">Required</span>}
                      </div>
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {/* INSPECTION AREAS */}
          {section === 'areas' && (
            <div>
              <div className="mb-4">
                <h3 className="font-display font-semibold text-slate-800">Inspection Areas</h3>
                <p className="text-slate-400 text-xs mt-0.5">Rooms and common areas for housekeeping LTC inspections. Only this org's areas.</p>
              </div>
              <EditableList items={areas} onAdd={area.add} onUpdate={area.update} onDelete={area.del}
                addPlaceholder="Add area"
                columns={[
                  { key: 'name',      label: 'Area name (e.g. Room 101, Main Hallway)' },
                  { key: 'area_type', label: 'Type (room or common)',
                    type: 'select', options: [{ value:'room', label:'Room'}, { value:'common', label:'Common Area'}] },
                  { key: 'building',  label: 'Building (optional)' },
                ]}
                renderRow={item => (
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.area_type === 'common' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                      <Home size={15} className={item.area_type === 'common' ? 'text-purple-600' : 'text-blue-600'} />
                    </div>
                    <div>
                      <div className="font-medium text-slate-800 text-sm">{item.name}</div>
                      <div className="text-xs text-slate-400 capitalize">
                        {[item.area_type?.replace('_',' '), item.building].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {/* INSPECTION CHECKLIST */}
          {section === 'checklist' && (
            <div>
              <div className="mb-4">
                <h3 className="font-display font-semibold text-slate-800">Inspection Checklist Items</h3>
                <p className="text-slate-400 text-xs mt-0.5">Items on every housekeeping inspection — pass or fail per item. Only this org's checklist.</p>
              </div>
              <EditableList items={checklist} onAdd={chk.add} onUpdate={chk.update} onDelete={chk.del}
                addPlaceholder="Add checklist item"
                columns={[{ key: 'label', label: 'Checklist item (e.g. Floor swept/mopped)' }]}
                renderRow={item => (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded border-2 border-slate-300 flex-shrink-0" />
                    <span className="text-sm text-slate-700">{item.label}</span>
                  </div>
                )}
              />
            </div>
          )}
          {section === 'it_categories' && (
            <div>
              <div className="mb-4">
                <h3 className="font-display font-semibold text-slate-800">IT Ticket Categories</h3>
                <p className="text-slate-400 text-xs mt-0.5">Categories staff can choose when submitting an IT support ticket.</p>
              </div>
              <EditableList items={itCategories} onAdd={itCat.add} onUpdate={itCat.update} onDelete={itCat.del}
                addPlaceholder="New category name (e.g. Badge Reader)"
                columns={[{ key: 'label', label: 'Category Name' }]}
                renderRow={item => (
                  <div className="flex items-center gap-3">
                    <Monitor size={14} className="text-brand-500 flex-shrink-0" />
                    <span className="text-sm text-slate-700">{item.label}</span>
                    <span className="text-xs text-slate-400 font-mono">{item.value}</span>
                  </div>
                )} />
            </div>
          )}

          {section === 'asset_types' && (
            <div>
              <div className="mb-4">
                <h3 className="font-display font-semibold text-slate-800">IT Asset Types</h3>
                <p className="text-slate-400 text-xs mt-0.5">Device types used in the asset inventory. Add anything specific to your community.</p>
              </div>
              <EditableList items={itAssetTypes} onAdd={itType.add} onUpdate={itType.update} onDelete={itType.del}
                addPlaceholder="New asset type (e.g. Barcode Scanner)"
                columns={[{ key: 'label', label: 'Asset Type' }]}
                renderRow={item => (
                  <div className="flex items-center gap-3">
                    <Tag size={14} className="text-brand-500 flex-shrink-0" />
                    <span className="text-sm text-slate-700">{item.label}</span>
                  </div>
                )} />
            </div>
          )}

          {section === 'asset_locations' && (
            <div>
              <div className="mb-4">
                <h3 className="font-display font-semibold text-slate-800">Asset Locations</h3>
                <p className="text-slate-400 text-xs mt-0.5">Physical locations where devices are deployed. Used in the asset inventory dropdown.</p>
              </div>
              <EditableList items={itAssetLocations} onAdd={itLoc.add} onUpdate={itLoc.update} onDelete={itLoc.del}
                addPlaceholder="New location (e.g. East Wing Nurses Station)"
                columns={[{ key: 'label', label: 'Location Name' }]}
                renderRow={item => (
                  <div className="flex items-center gap-3">
                    <MapPin size={14} className="text-brand-500 flex-shrink-0" />
                    <span className="text-sm text-slate-700">{item.label}</span>
                  </div>
                )} />
            </div>
          )}
        </>
      )}

      {showImport && (
        <ResidentImport
          orgId={orgId}
          onImported={() => fetchAll()}
          onClose={() => setShowImport(false)} />
      )}
    </div>
  )
}
