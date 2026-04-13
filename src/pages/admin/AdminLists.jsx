import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, X, Edit2, Trash2, Check, GripVertical, Car, Home, ClipboardList, Users } from 'lucide-react'

// ── Generic inline editable list ──────────────────────────────
function EditableList({ items, onAdd, onUpdate, onDelete, addPlaceholder, columns, renderRow }) {
  const [adding, setAdding]       = useState(false)
  const [newValues, setNewValues] = useState({})
  const [editId, setEditId]       = useState(null)
  const [editValues, setEditValues] = useState({})

  const startAdd = () => { setNewValues({}); setAdding(true) }
  const cancelAdd = () => { setAdding(false); setNewValues({}) }

  const handleAdd = async () => {
    if (!newValues[columns[0].key]?.trim()) return
    await onAdd(newValues)
    setAdding(false)
    setNewValues({})
  }

  const startEdit = (item) => {
    setEditId(item.id)
    const vals = {}
    columns.forEach(c => { vals[c.key] = item[c.key] || '' })
    setEditValues(vals)
  }

  const handleUpdate = async () => {
    await onUpdate(editId, editValues)
    setEditId(null)
  }

  return (
    <div>
      <div className="space-y-2 mb-3">
        {items.map(item => (
          <div key={item.id}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${item.is_active === false ? 'opacity-40 border-slate-100 bg-slate-50' : 'border-slate-100 bg-white hover:border-brand-200'}`}>
            {editId === item.id ? (
              <>
                <div className="flex-1 flex gap-2">
                  {columns.map(col => (
                    <input key={col.key} value={editValues[col.key] || ''} onChange={e => setEditValues(v => ({ ...v, [col.key]: e.target.value }))}
                      className="flex-1 px-2 py-1.5 border border-brand-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder={col.label} />
                  ))}
                </div>
                <button onClick={handleUpdate} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"><Check size={15} /></button>
                <button onClick={() => setEditId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><X size={15} /></button>
              </>
            ) : (
              <>
                <div className="flex-1">{renderRow(item)}</div>
                <button onClick={() => startEdit(item)} className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors flex-shrink-0"><Edit2 size={14} /></button>
                <button onClick={() => onDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"><Trash2 size={14} /></button>
              </>
            )}
          </div>
        ))}

        {items.length === 0 && !adding && (
          <div className="text-center py-6 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
            No items yet — add one below.
          </div>
        )}
      </div>

      {/* Add row */}
      {adding ? (
        <div className="flex items-center gap-2 p-3 rounded-xl border-2 border-brand-300 bg-brand-50">
          {columns.map(col => (
            <input key={col.key} value={newValues[col.key] || ''}
              onChange={e => setNewValues(v => ({ ...v, [col.key]: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              autoFocus={col === columns[0]}
              className="flex-1 px-3 py-2 border border-brand-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              placeholder={col.label} />
          ))}
          <button onClick={handleAdd} className="px-3 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors flex-shrink-0">Add</button>
          <button onClick={cancelAdd} className="p-2 text-slate-400 hover:text-slate-600 flex-shrink-0"><X size={15} /></button>
        </div>
      ) : (
        <button onClick={startAdd}
          className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors flex items-center justify-center gap-1.5">
          <Plus size={14} /> {addPlaceholder}
        </button>
      )}
    </div>
  )
}

// ── Main Lists Panel ───────────────────────────────────────────
export default function AdminLists({ orgId }) {
  const [section, setSection]     = useState('vehicles')
  const [vehicles, setVehicles]   = useState([])
  const [residents, setResidents] = useState([])
  const [areas, setAreas]         = useState([])
  const [checklist, setChecklist] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => { if (orgId) fetchAll() }, [orgId])

  async function fetchAll() {
    setLoading(true)
    const [v, r, a, c] = await Promise.all([
      supabase.from('vehicles').select('*').eq('organization_id', orgId).order('name'),
      supabase.from('residents').select('*').eq('organization_id', orgId).eq('is_active', true).order('last_name'),
      supabase.from('inspection_areas').select('*').eq('organization_id', orgId).eq('is_active', true).order('sort_order'),
      supabase.from('inspection_checklist_items').select('*').eq('organization_id', orgId).eq('is_active', true).order('sort_order'),
    ])
    setVehicles(v.data || [])
    setResidents(r.data || [])
    setAreas(a.data || [])
    setChecklist(c.data || [])
    setLoading(false)
  }

  // ── Vehicles ──
  const addVehicle = async (vals) => {
    await supabase.from('vehicles').insert({ organization_id: orgId, name: vals.name.trim(), license_plate: vals.license_plate || null, capacity: parseInt(vals.capacity) || 1, is_active: true })
    fetchAll()
  }
  const updateVehicle = async (id, vals) => {
    await supabase.from('vehicles').update({ name: vals.name, license_plate: vals.license_plate || null, capacity: parseInt(vals.capacity) || 1 }).eq('id', id)
    fetchAll()
  }
  const deleteVehicle = async (id) => {
    if (!confirm('Remove this vehicle?')) return
    await supabase.from('vehicles').update({ is_active: false }).eq('id', id)
    fetchAll()
  }

  // ── Residents ──
  const addResident = async (vals) => {
    await supabase.from('residents').insert({ organization_id: orgId, first_name: vals.first_name.trim(), last_name: vals.last_name?.trim() || '', unit: vals.unit || null, building: vals.building || null, phone: vals.phone || null, is_active: true })
    fetchAll()
  }
  const updateResident = async (id, vals) => {
    await supabase.from('residents').update({ first_name: vals.first_name, last_name: vals.last_name, unit: vals.unit || null, building: vals.building || null, phone: vals.phone || null }).eq('id', id)
    fetchAll()
  }
  const deleteResident = async (id) => {
    if (!confirm('Remove this resident? This will not delete their dietary profile or work orders.')) return
    await supabase.from('residents').update({ is_active: false }).eq('id', id)
    fetchAll()
  }

  // ── Inspection Areas ──
  const addArea = async (vals) => {
    await supabase.from('inspection_areas').insert({ organization_id: orgId, name: vals.name.trim(), area_type: vals.area_type || 'room', building: vals.building || null, sort_order: areas.length, is_active: true })
    fetchAll()
  }
  const updateArea = async (id, vals) => {
    await supabase.from('inspection_areas').update({ name: vals.name, area_type: vals.area_type || 'room', building: vals.building || null }).eq('id', id)
    fetchAll()
  }
  const deleteArea = async (id) => {
    if (!confirm('Remove this area?')) return
    await supabase.from('inspection_areas').update({ is_active: false }).eq('id', id)
    fetchAll()
  }

  // ── Checklist Items ──
  const addChecklist = async (vals) => {
    await supabase.from('inspection_checklist_items').insert({ organization_id: orgId, label: vals.label.trim(), sort_order: checklist.length, is_active: true })
    fetchAll()
  }
  const updateChecklist = async (id, vals) => {
    await supabase.from('inspection_checklist_items').update({ label: vals.label }).eq('id', id)
    fetchAll()
  }
  const deleteChecklist = async (id) => {
    if (!confirm('Remove this checklist item?')) return
    await supabase.from('inspection_checklist_items').update({ is_active: false }).eq('id', id)
    fetchAll()
  }

  const sections = [
    { key: 'vehicles',   label: 'Vehicles',           icon: Car,           count: vehicles.length },
    { key: 'residents',  label: 'Residents',           icon: Users,         count: residents.length },
    { key: 'areas',      label: 'Inspection Areas',    icon: Home,          count: areas.length },
    { key: 'checklist',  label: 'Inspection Checklist',icon: ClipboardList, count: checklist.length },
  ]

  return (
    <div>
      {/* Section tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {sections.map(s => {
          const Icon = s.icon
          return (
            <button key={s.key} onClick={() => setSection(s.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${section === s.key ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-slate-200 text-slate-600 hover:border-brand-300'}`}>
              <Icon size={14} />
              {s.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${section === s.key ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{s.count}</span>
            </button>
          )
        })}
      </div>

      {loading ? <div className="text-center py-10 text-slate-400 text-sm">Loading...</div> : (
        <>
          {/* VEHICLES */}
          {section === 'vehicles' && (
            <div>
              <div className="mb-4">
                <h3 className="font-display font-semibold text-slate-800">Vehicles</h3>
                <p className="text-slate-400 text-xs mt-0.5">Vehicles available for transportation scheduling</p>
              </div>
              <EditableList
                items={vehicles}
                onAdd={addVehicle} onUpdate={updateVehicle} onDelete={deleteVehicle}
                addPlaceholder="Add vehicle"
                columns={[
                  { key: 'name', label: 'Vehicle name (e.g. Community Van)' },
                  { key: 'license_plate', label: 'License plate' },
                  { key: 'capacity', label: 'Capacity' },
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
              <div className="mb-4">
                <h3 className="font-display font-semibold text-slate-800">Residents</h3>
                <p className="text-slate-400 text-xs mt-0.5">Master resident list used across work orders, transportation, and dietary</p>
              </div>
              <EditableList
                items={residents}
                onAdd={addResident} onUpdate={updateResident} onDelete={deleteResident}
                addPlaceholder="Add resident"
                columns={[
                  { key: 'first_name', label: 'First name' },
                  { key: 'last_name',  label: 'Last name' },
                  { key: 'unit',       label: 'Unit' },
                  { key: 'building',   label: 'Building' },
                  { key: 'phone',      label: 'Phone' },
                ]}
                renderRow={item => (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center text-sage-700 text-xs font-semibold flex-shrink-0">
                      {item.first_name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-slate-800 text-sm">{item.first_name} {item.last_name}</div>
                      <div className="text-xs text-slate-400">
                        {[item.building && `${item.building}`, item.unit && `Unit ${item.unit}`, item.phone].filter(Boolean).join(' · ')}
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
                <p className="text-slate-400 text-xs mt-0.5">Rooms and common areas that appear in housekeeping LTC inspections</p>
              </div>
              <EditableList
                items={areas}
                onAdd={addArea} onUpdate={updateArea} onDelete={deleteArea}
                addPlaceholder="Add area"
                columns={[
                  { key: 'name',      label: 'Area name (e.g. Room 101, Main Hallway)' },
                  { key: 'area_type', label: 'Type: room or common' },
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
                        {[item.area_type?.replace('_', ' '), item.building].filter(Boolean).join(' · ')}
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
                <p className="text-slate-400 text-xs mt-0.5">Items that appear on every housekeeping inspection — pass or fail per item</p>
              </div>
              <EditableList
                items={checklist}
                onAdd={addChecklist} onUpdate={updateChecklist} onDelete={deleteChecklist}
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
        </>
      )}
    </div>
  )
}
