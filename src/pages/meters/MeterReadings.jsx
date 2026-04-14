import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, X, Edit2, Trash2, Search, Zap, Droplets,
  Flame, Thermometer, Gauge, ChevronRight, Settings,
  TrendingUp, TrendingDown, Minus, Calendar, Building2,
  Check, AlertCircle, Download
} from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────
const ICON_MAP = {
  zap:         Zap,
  droplets:    Droplets,
  flame:       Flame,
  thermometer: Thermometer,
  gauge:       Gauge,
}

const getIcon = (icon) => ICON_MAP[icon] || Gauge

const fmtNum = (n, decimals = 2) => n != null ? Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : '—'
const fmtCost = (n) => n != null ? `$${fmtNum(n)}` : '—'
const today = () => new Date().toISOString().split('T')[0]
const monthName = (d) => new Date(d + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

// ── Utility Type Manager ───────────────────────────────────────
function UtilityTypeManager({ orgId, types, onRefresh, onClose }) {
  const [form, setForm]   = useState({ name: '', unit: '', rate_per_unit: '', icon: 'zap', color: '#0c90e1' })
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleAdd = async () => {
    if (!form.name.trim() || !form.unit.trim()) return
    setSaving(true)
    await supabase.from('utility_types').insert({
      organization_id: orgId,
      name: form.name.trim(), unit: form.unit.trim(),
      rate_per_unit: form.rate_per_unit || null,
      icon: form.icon, color: form.color,
      sort_order: types.length, is_active: true
    })
    setForm({ name: '', unit: '', rate_per_unit: '', icon: 'zap', color: '#0c90e1' })
    setAdding(false)
    setSaving(false)
    onRefresh()
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this utility type? All meters and readings for it will be affected.')) return
    await supabase.from('utility_types').update({ is_active: false }).eq('id', id)
    onRefresh()
  }

  const updateRate = async (id, rate) => {
    await supabase.from('utility_types').update({ rate_per_unit: parseFloat(rate) || null }).eq('id', id)
    onRefresh()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800">Utility Types</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {types.map(t => {
            const Icon = getIcon(t.icon)
            return (
              <div key={t.id} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: t.color + '22' }}>
                  <Icon size={18} style={{ color: t.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800 text-sm">{t.name}</div>
                  <div className="text-xs text-slate-400">per {t.unit}</div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400">$</span>
                  <input
                    type="number" step="0.0001" defaultValue={t.rate_per_unit || ''}
                    onBlur={e => updateRate(t.id, e.target.value)}
                    className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-xs text-right focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="0.0000" />
                  <span className="text-xs text-slate-400">/{t.unit}</span>
                </div>
                <button onClick={() => handleDelete(t.id)}
                  className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg transition-colors flex-shrink-0">
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })}

          {adding ? (
            <div className="p-4 bg-brand-50 border-2 border-brand-200 rounded-xl space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input value={form.name} onChange={e => set('name', e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Utility name *" />
                <input value={form.unit} onChange={e => set('unit', e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Unit (kWh, Gal...) *" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" step="0.0001" value={form.rate_per_unit} onChange={e => set('rate_per_unit', e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Rate per unit ($)" />
                <div className="flex gap-2">
                  <select value={form.icon} onChange={e => set('icon', e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="zap">⚡ Electric</option>
                    <option value="droplets">💧 Water</option>
                    <option value="flame">🔥 Gas</option>
                    <option value="thermometer">🌡 Heat</option>
                    <option value="gauge">📊 Other</option>
                  </select>
                  <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
                    className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setAdding(false)} className="px-3 py-1.5 text-sm text-slate-600 font-medium">Cancel</button>
                <button onClick={handleAdd} disabled={saving}
                  className="px-4 py-1.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:bg-brand-300 transition-colors">
                  {saving ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)}
              className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors flex items-center justify-center gap-2">
              <Plus size={14} /> Add Utility Type
            </button>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors">Done</button>
        </div>
      </div>
    </div>
  )
}

// ── Add Reading Modal ──────────────────────────────────────────
function AddReadingModal({ meter, lastReading, utilityType, onClose, onSave }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    reading_date:  today(),
    reading_value: '',
    notes: '',
  })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const prevValue = lastReading?.reading_value
  const usage     = form.reading_value && prevValue != null
    ? Math.max(0, parseFloat(form.reading_value) - parseFloat(prevValue))
    : null
  const cost      = usage != null && utilityType?.rate_per_unit
    ? usage * parseFloat(utilityType.rate_per_unit)
    : null

  const handleSave = async () => {
    if (!form.reading_value || isNaN(parseFloat(form.reading_value))) {
      setError('Reading value is required'); return
    }
    if (prevValue != null && parseFloat(form.reading_value) < parseFloat(prevValue)) {
      if (!confirm(`Reading (${form.reading_value}) is lower than previous (${prevValue}). Proceed?`)) return
    }
    setSaving(true)
    const { error: err } = await supabase.from('meter_readings').insert({
      meter_id:        meter.id,
      organization_id: meter.organization_id,
      reading_date:    form.reading_date,
      reading_value:   parseFloat(form.reading_value),
      previous_value:  prevValue ?? null,
      usage:           usage,
      rate_per_unit:   utilityType?.rate_per_unit || null,
      estimated_cost:  cost,
      notes:           form.notes || null,
      read_by:         profile.id,
    })
    if (err) { setError(err.message); setSaving(false); return }
    onSave()
  }

  const Icon = getIcon(utilityType?.icon)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: (utilityType?.color || '#0c90e1') + '22' }}>
              <Icon size={18} style={{ color: utilityType?.color || '#0c90e1' }} />
            </div>
            <div>
              <h2 className="font-display font-semibold text-slate-800">Enter Reading</h2>
              <p className="text-xs text-slate-400">{meter.resident_name || 'Unknown'} · Unit {meter.unit || '—'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          {prevValue != null && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-sm">
              <span className="text-slate-500">Previous reading</span>
              <span className="font-semibold text-slate-800">{fmtNum(prevValue, 0)} {utilityType?.unit}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Current Reading *</label>
            <div className="flex items-center gap-2">
              <input type="number" step="0.01" value={form.reading_value} onChange={e => set('reading_value', e.target.value)}
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-xl font-mono text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="0.00" autoFocus />
              <span className="text-slate-400 text-sm font-medium">{utilityType?.unit}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Reading Date</label>
            <input type="date" value={form.reading_date} onChange={e => set('reading_date', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>

          {/* Live usage preview */}
          {usage != null && (
            <div className="p-4 rounded-xl border-2 space-y-2"
              style={{ borderColor: (utilityType?.color || '#0c90e1') + '44', background: (utilityType?.color || '#0c90e1') + '08' }}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 font-medium">Usage this period</span>
                <span className="font-bold text-slate-800">{fmtNum(usage, 2)} {utilityType?.unit}</span>
              </div>
              {cost != null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Estimated cost</span>
                  <span className="font-semibold" style={{ color: utilityType?.color }}>{fmtCost(cost)}</span>
                </div>
              )}
              {utilityType?.rate_per_unit && (
                <div className="text-xs text-slate-400">Rate: ${fmtNum(utilityType.rate_per_unit, 4)} per {utilityType?.unit}</div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
            <input value={form.notes} onChange={e => set('notes', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Optional notes about this reading" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving...' : 'Save Reading'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Meter Modal ────────────────────────────────────────────
function AddMeterModal({ orgId, utilityTypes, residents, onClose, onSave }) {
  const [form, setForm] = useState({ utility_type_id: utilityTypes[0]?.id || '', resident_name: '', unit: '', building: '', meter_number: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.utility_type_id || !form.unit.trim()) { return }
    setSaving(true)
    const selectedResident = residents.find(r => `${r.first_name} ${r.last_name}` === form.resident_name)
    await supabase.from('meters').insert({
      organization_id: orgId,
      utility_type_id: form.utility_type_id,
      resident_id:   selectedResident?.id || null,
      resident_name: form.resident_name || null,
      unit:          form.unit.trim(),
      building:      form.building || null,
      meter_number:  form.meter_number || null,
      is_active:     true,
    })
    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-display font-semibold text-slate-800">Add Meter</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Utility Type *</label>
            <div className="grid grid-cols-2 gap-2">
              {utilityTypes.map(t => {
                const Icon = getIcon(t.icon)
                return (
                  <button key={t.id} onClick={() => set('utility_type_id', t.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${form.utility_type_id === t.id ? 'ring-2 ring-offset-1 ring-brand-400 border-transparent' : 'border-slate-200 hover:border-slate-300'}`}
                    style={form.utility_type_id === t.id ? { background: t.color + '22', color: t.color } : {}}>
                    <Icon size={16} style={{ color: t.color }} />
                    {t.name}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Unit *</label>
              <input value={form.unit} onChange={e => set('unit', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. 101, 204A" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Building</label>
              <input value={form.building} onChange={e => set('building', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Building name" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Resident</label>
              <input list="resident-list" value={form.resident_name} onChange={e => set('resident_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Search resident..." />
              <datalist id="resident-list">
                {residents.map(r => <option key={r.id} value={`${r.first_name} ${r.last_name}`} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Meter Number</label>
              <input value={form.meter_number} onChange={e => set('meter_number', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Physical meter ID" />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.utility_type_id || !form.unit}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Adding...' : 'Add Meter'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Meter History Modal ────────────────────────────────────────
function MeterHistoryModal({ meter, utilityType, onClose }) {
  const [readings, setReadings] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => { fetchReadings() }, [])

  async function fetchReadings() {
    const { data } = await supabase.from('meter_readings')
      .select('*, profiles(first_name, last_name)')
      .eq('meter_id', meter.id)
      .order('reading_date', { ascending: false })
      .limit(24)
    setReadings(data || [])
    setLoading(false)
  }

  const Icon = getIcon(utilityType?.icon)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: (utilityType?.color || '#0c90e1') + '22' }}>
              <Icon size={18} style={{ color: utilityType?.color || '#0c90e1' }} />
            </div>
            <div>
              <h2 className="font-display font-semibold text-slate-800">{meter.resident_name || 'Unit ' + meter.unit}</h2>
              <p className="text-xs text-slate-400">{utilityType?.name} · Unit {meter.unit}{meter.meter_number ? ` · #${meter.meter_number}` : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-sm">Loading...</div>
          ) : readings.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">No readings yet.</div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Reading</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Usage</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Est. Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Read By</th>
                </tr>
              </thead>
              <tbody>
                {readings.map((r, i) => {
                  const isHighest = i === 0
                  return (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {new Date(r.reading_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {r.notes && <div className="text-xs text-slate-400 italic">{r.notes}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-slate-800">{fmtNum(r.reading_value, 2)}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        {r.usage != null ? (
                          <span className="font-mono text-slate-700">{fmtNum(r.usage, 2)} <span className="text-slate-400 text-xs">{utilityType?.unit}</span></span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium" style={{ color: utilityType?.color }}>
                        {fmtCost(r.estimated_cost)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {r.profiles ? `${r.profiles.first_name} ${r.profiles.last_name}` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors">Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Meter Readings Page ───────────────────────────────────
export default function MeterReadings() {
  const { profile, organization } = useAuth()
  const [utilityTypes, setUtilityTypes] = useState([])
  const [meters, setMeters]             = useState([])
  const [residents, setResidents]       = useState([])
  const [lastReadings, setLastReadings] = useState({})
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [filterType, setFilterType]     = useState('all')
  const [activeTab, setActiveTab]       = useState(null)

  // Modals
  const [showUtilityManager, setShowUtilityManager] = useState(false)
  const [showAddMeter, setShowAddMeter]             = useState(false)
  const [readingMeter, setReadingMeter]             = useState(null)
  const [historyMeter, setHistoryMeter]             = useState(null)

  useEffect(() => { if (organization) fetchAll() }, [organization])

  async function fetchAll() {
    setLoading(true)
    const [utRes, mRes, rRes] = await Promise.all([
      supabase.from('utility_types').select('*').eq('organization_id', organization.id).eq('is_active', true).order('sort_order'),
      supabase.from('meters').select('*').eq('organization_id', organization.id).eq('is_active', true).order('unit'),
      supabase.from('residents').select('id,first_name,last_name,unit').eq('organization_id', organization.id).eq('is_active', true),
    ])
    const types = utRes.data || []
    const meterList = mRes.data || []
    setUtilityTypes(types)
    setMeters(meterList)
    setResidents(rRes.data || [])
    if (types.length && !activeTab) setActiveTab(types[0]?.id)

    // Fetch last reading per meter
    if (meterList.length) {
      const { data: readings } = await supabase.from('meter_readings')
        .select('*')
        .in('meter_id', meterList.map(m => m.id))
        .order('reading_date', { ascending: false })
      if (readings) {
        const latest = {}
        readings.forEach(r => {
          if (!latest[r.meter_id]) latest[r.meter_id] = r
        })
        setLastReadings(latest)
      }
    }
    setLoading(false)
  }

  const handleDeleteMeter = async (id) => {
    if (!confirm('Remove this meter?')) return
    await supabase.from('meters').update({ is_active: false }).eq('id', id)
    fetchAll()
  }

  const activeType  = utilityTypes.find(t => t.id === activeTab)
  const typeMeters  = meters.filter(m => {
    const matchType   = m.utility_type_id === activeTab
    const matchSearch = !search || `${m.resident_name} ${m.unit} ${m.building} ${m.meter_number}`.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  // Stats for active type
  const typeReadings = Object.values(lastReadings).filter(r =>
    typeMeters.some(m => m.id === r.meter_id)
  )
  const totalUsage = typeReadings.reduce((a, r) => a + (parseFloat(r.usage) || 0), 0)
  const totalCost  = typeReadings.reduce((a, r) => a + (parseFloat(r.estimated_cost) || 0), 0)
  const unread     = typeMeters.filter(m => !lastReadings[m.id]).length
  const Icon       = activeType ? getIcon(activeType.icon) : Gauge

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800">Meter Readings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Utility tracking and usage calculation</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowUtilityManager(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600 rounded-xl text-sm font-medium transition-colors">
            <Settings size={15} /> Utility Types
          </button>
          <button onClick={() => setShowAddMeter(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus size={15} /> Add Meter
          </button>
        </div>
      </div>

      {/* Utility type tabs */}
      {utilityTypes.length > 0 ? (
        <>
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {utilityTypes.map(t => {
              const TIcon = getIcon(t.icon)
              const count = meters.filter(m => m.utility_type_id === t.id).length
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl border text-sm font-medium flex-shrink-0 transition-all ${activeTab === t.id ? 'ring-2 ring-offset-1 ring-brand-400 border-transparent' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                  style={activeTab === t.id ? { background: t.color + '18', color: t.color, borderColor: t.color + '44' } : {}}>
                  <TIcon size={16} style={{ color: t.color }} />
                  {t.name}
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                    style={activeTab === t.id ? { background: t.color + '33', color: t.color } : { background: '#f1f5f9', color: '#64748b' }}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {activeType && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Meters',      value: typeMeters.length,           unit: '' },
                  { label: 'Unread',      value: unread,                      unit: '', alert: unread > 0 },
                  { label: 'Total Usage', value: fmtNum(totalUsage, 1),       unit: activeType.unit },
                  { label: 'Est. Total',  value: fmtCost(totalCost || null),  unit: '' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <div className="flex items-end gap-1">
                      <span className={`text-2xl font-display font-bold ${s.alert ? 'text-amber-600' : 'text-slate-800'}`}>{s.value}</span>
                      {s.unit && <span className="text-xs text-slate-400 mb-1">{s.unit}</span>}
                    </div>
                    <div className="text-slate-400 text-xs mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by resident, unit, or meter number..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>

              {/* Meter cards */}
              {loading ? (
                <div className="text-center py-16 text-slate-400">Loading...</div>
              ) : typeMeters.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Gauge size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-display text-lg">No {activeType.name} meters</p>
                  <p className="text-sm mt-1">Click "Add Meter" to set one up.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {typeMeters.map(meter => {
                    const last = lastReadings[meter.id]
                    const hasReading = !!last
                    return (
                      <div key={meter.id}
                        className={`bg-white rounded-2xl border shadow-sm p-4 hover:shadow-md transition-all ${!hasReading ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100'}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="font-semibold text-slate-800 text-sm">{meter.resident_name || '—'}</div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {[meter.building, `Unit ${meter.unit}`].filter(Boolean).join(' · ')}
                              {meter.meter_number && <span className="ml-1 text-slate-300">#{meter.meter_number}</span>}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => setHistoryMeter(meter)}
                              className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors" title="View history">
                              <TrendingUp size={13} />
                            </button>
                            <button onClick={() => handleDeleteMeter(meter.id)}
                              className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {hasReading ? (
                          <div className="space-y-1.5 mb-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Last reading</span>
                              <span className="font-mono font-semibold text-slate-800">{fmtNum(last.reading_value, 2)} {activeType.unit}</span>
                            </div>
                            {last.usage != null && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Usage</span>
                                <span className="font-mono text-slate-600">{fmtNum(last.usage, 2)} {activeType.unit}</span>
                              </div>
                            )}
                            {last.estimated_cost != null && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Est. cost</span>
                                <span className="font-medium" style={{ color: activeType.color }}>{fmtCost(last.estimated_cost)}</span>
                              </div>
                            )}
                            <div className="text-xs text-slate-300">
                              {new Date(last.reading_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 mb-3 text-xs text-amber-600">
                            <AlertCircle size={12} /> No readings yet
                          </div>
                        )}

                        <button onClick={() => setReadingMeter(meter)}
                          className="w-full py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border-2"
                          style={{
                            borderColor: activeType.color + '66',
                            color: activeType.color,
                            background: activeType.color + '0a'
                          }}>
                          <Gauge size={13} /> Enter Reading
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div className="text-center py-20 text-slate-400">
          <Gauge size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-display text-xl text-slate-600">No utility types set up yet</p>
          <p className="text-sm mt-1 mb-6">Add the utilities you resell — electric, water, gas, or custom.</p>
          <button onClick={() => setShowUtilityManager(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors">
            <Settings size={15} /> Set Up Utility Types
          </button>
        </div>
      )}

      {/* Modals */}
      {showUtilityManager && (
        <UtilityTypeManager
          orgId={organization.id} types={utilityTypes}
          onRefresh={fetchAll} onClose={() => setShowUtilityManager(false)} />
      )}
      {showAddMeter && (
        <AddMeterModal
          orgId={organization.id} utilityTypes={utilityTypes} residents={residents}
          onClose={() => setShowAddMeter(false)} onSave={() => { setShowAddMeter(false); fetchAll() }} />
      )}
      {readingMeter && (
        <AddReadingModal
          meter={readingMeter}
          lastReading={lastReadings[readingMeter.id]}
          utilityType={utilityTypes.find(t => t.id === readingMeter.utility_type_id)}
          onClose={() => setReadingMeter(null)}
          onSave={() => { setReadingMeter(null); fetchAll() }} />
      )}
      {historyMeter && (
        <MeterHistoryModal
          meter={historyMeter}
          utilityType={utilityTypes.find(t => t.id === historyMeter.utility_type_id)}
          onClose={() => setHistoryMeter(null)} />
      )}
    </div>
  )
}
