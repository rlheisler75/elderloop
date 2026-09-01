import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import CycleMenuBuilder from './CycleMenuBuilder'
import { resolveMealItem } from './mealResolution'
import {
  Users, BookOpen, Printer, Plus, X, Edit2, Search, Eye,
  ChevronLeft, ChevronRight, AlertTriangle, Check,
  UtensilsCrossed, RefreshCw, ArrowRight, Clipboard, Link2
} from 'lucide-react'
import { DIETARY_STATE_REFS } from '../../lib/dietaryStateRefs'
import RegRefBanner from '../../components/ui/RegRefBanner'

// ── Constants ─────────────────────────────────────────────────
// Diet types — aligned with AND (Academy of Nutrition and Dietetics) current terminology
const DIET_TYPES = [
  { key: 'regular',      label: 'Regular',                    desc: 'No dietary restrictions' },
  { key: 'heart_healthy',label: 'Heart Healthy',              desc: 'Low saturated fat, low cholesterol' },
  { key: 'low_sodium',   label: 'Low Sodium',                 desc: '≤ 2,000mg sodium/day' },
  { key: 'diabetic',     label: 'Consistent Carbohydrate',    desc: 'Controlled carb intake (ADA guidelines)' },
  { key: 'ncs',          label: 'No Concentrated Sweets',     desc: 'Avoids added sugars and sweets' },
  { key: 'renal',        label: 'Renal / CKD',                desc: 'Low potassium, phosphorus, fluid-restricted' },
  { key: 'lo_carb',      label: 'Low Carbohydrate',           desc: '< 130g carbs/day' },
  { key: 'low_fat',      label: 'Low Fat',                    desc: '< 30% calories from fat' },
  { key: 'low_residue',  label: 'Low Fiber / Low Residue',    desc: 'Reduced fiber for GI conditions' },
  { key: 'dash',         label: 'DASH',                       desc: 'Dietary Approaches to Stop Hypertension' },
  { key: 'gluten_free',  label: 'Gluten Free',                desc: 'Celiac disease or gluten sensitivity' },
  { key: 'vegetarian',   label: 'Vegetarian',                 desc: 'No meat; dairy/eggs permitted' },
  { key: 'vegan',        label: 'Vegan',                      desc: 'No animal products' },
  { key: 'neutropenic',  label: 'Neutropenic',                desc: 'Immunocompromised — food safety restrictions' },
  { key: 'other',        label: 'Other / Custom',             desc: 'See resident notes' },
]

// Texture & consistency levels — IDDSI Framework (International Dysphagia Diet Standardisation Initiative)
// https://iddsi.org — adopted by ASHA, AND, and most SNF dietitians
const CONSISTENCIES = [
  // Food textures
  { key: 'regular',          label: 'Regular',              iddsi: '7', desc: 'Normal foods — no modification' },
  { key: 'easy_to_chew',     label: 'Easy to Chew',         iddsi: '7', desc: 'Tender, moist foods; no tough skins or chunks' },
  { key: 'soft_bite_sized',  label: 'Soft & Bite-Sized',    iddsi: '6', desc: 'Soft, tender pieces ≤ 1.5cm' },
  { key: 'minced_moist',     label: 'Minced & Moist',       iddsi: '5', desc: 'Minced to 4mm; cohesive with sauce or gravy' },
  { key: 'mechanical_soft',  label: 'Mechanical Soft',      iddsi: '6', desc: 'Legacy term — equivalent to Soft & Bite-Sized (IDDSI 6)' },
  { key: 'pureed',           label: 'Pureed',               iddsi: '4', desc: 'Smooth, no lumps, holds shape on spoon' },
  { key: 'liquid',           label: 'Liquidized / Thin',    iddsi: '3', desc: 'Smooth, pourable, no lumps' },
  // Drink/liquid thicknesses
  { key: 'slightly_thick',   label: 'Slightly Thick',       iddsi: '1', desc: 'Slightly thicker than water; flows fast' },
  { key: 'mildly_thick',     label: 'Mildly Thick',         iddsi: '2', desc: 'Flows off spoon; drizzles' },
  { key: 'moderately_thick', label: 'Moderately Thick',     iddsi: '3', desc: 'Pours slowly; drops off spoon' },
  { key: 'extremely_thick',  label: 'Extremely Thick',      iddsi: '4', desc: 'Cannot be drunk from cup; eaten with spoon' },
  { key: 'thickened_liquid', label: 'Thickened Liquid',     iddsi: '2-4', desc: 'Legacy term — specify level 1-4 in notes' },
]

const ALLERGENS = [
  { key: 'milk',       label: 'Milk' },
  { key: 'eggs',       label: 'Eggs' },
  { key: 'fish',       label: 'Fish' },
  { key: 'shellfish',  label: 'Shellfish' },
  { key: 'tree_nuts',  label: 'Tree Nuts' },
  { key: 'peanuts',    label: 'Peanuts' },
  { key: 'wheat',      label: 'Wheat' },
  { key: 'gluten',     label: 'Gluten' },
  { key: 'soy',        label: 'Soy' },
  { key: 'sesame',     label: 'Sesame' },
]

const MEAL_PERIODS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'am_snack',  label: 'AM Snack' },
  { key: 'lunch',     label: 'Lunch' },
  { key: 'pm_snack',  label: 'PM Snack' },
  { key: 'dinner',    label: 'Dinner' },
]

const CARE_LABELS = {
  independent: 'Independent',
  assisted:    'Assisted Living',
  memory_care: 'Memory Care',
  skilled:     'Skilled Nursing',
  rehab:       'Rehab',
}

const getDiet = (key) => DIET_TYPES.find(d => d.key === key)?.label || key
const getCons = (key) => CONSISTENCIES.find(c => c.key === key)?.label || key

// ── Resident Directory Picker ──────────────────────────────────
function ResidentPicker({ orgId, value, onSelect }) {
  const [search, setSearch]   = useState('')
  const [options, setOptions] = useState([])
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef()

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!search || search.length < 2) { setOptions([]); setOpen(false); return }
    setLoading(true)
    supabase.from('residents')
      .select('id, first_name, last_name, room, unit, care_level')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,room.ilike.%${search}%`)
      .order('last_name')
      .limit(10)
      .then(({ data }) => {
        setOptions(data || [])
        setLoading(false)
        setOpen(true)
      })
  }, [search, orgId])

  // Linked state — show the chosen resident
  if (value) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 bg-brand-50 border border-brand-200 rounded-xl">
        <div className="w-9 h-9 rounded-full bg-brand-200 flex items-center justify-center text-brand-700 font-bold text-sm flex-shrink-0">
          {value.first_name?.[0]}{value.last_name?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{value.first_name} {value.last_name}</p>
          <p className="text-xs text-slate-500">
            Room {value.room}{value.care_level ? ` · ${CARE_LABELS[value.care_level] || value.care_level}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1 text-brand-600 text-xs font-medium flex-shrink-0">
          <Link2 size={12} /> Linked
        </div>
        <button
          onClick={() => onSelect(null)}
          className="text-xs text-slate-400 hover:text-slate-600 font-medium ml-1"
        >
          Change
        </button>
      </div>
    )
  }

  return (
    <div className="relative" ref={wrapRef}>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or room number..."
          className="w-full pl-8 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Searching…</span>
        )}
      </div>

      {open && (
        <div className="absolute z-30 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden">
          {options.length > 0 ? options.map(r => (
            <button
              key={r.id}
              onClick={() => { onSelect(r); setSearch(''); setOpen(false) }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-brand-50 dark:hover:bg-slate-800 text-left transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold text-xs flex-shrink-0">
                {r.first_name?.[0]}{r.last_name?.[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{r.first_name} {r.last_name}</p>
                <p className="text-xs text-slate-500">
                  Room {r.room}{r.care_level ? ` · ${CARE_LABELS[r.care_level] || r.care_level}` : ''}
                </p>
              </div>
            </button>
          )) : (
            <div className="px-4 py-3 text-sm text-slate-400">
              No residents found. You can still fill in the name below manually.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Resident Profile Card ──────────────────────────────────────
function ResidentCard({ resident, onEdit, onPrint, canEdit }) {
  const hasAllergens = resident.allergens?.length > 0
  const dir = resident.residents  // joined directory record
  const dietColor = {
    regular:      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    heart_healthy:'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
    low_sodium:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400',
    diabetic:     'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
    ncs:          'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400',
    renal:        'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400',
    lo_carb:      'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400',
    low_fat:      'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400',
    low_residue:  'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
    dash:         'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
    gluten_free:  'bg-lime-100 text-lime-700 dark:bg-lime-950/50 dark:text-lime-400',
    vegetarian:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
    vegan:        'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400',
    neutropenic:  'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400',
    other:        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  }[resident.diet_type] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Avatar / initials */}
          {dir?.photo_url ? (
            <img src={dir.photo_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-semibold text-sm flex-shrink-0">
              {resident.first_name?.[0]}{resident.last_name?.[0]}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 truncate">
                {resident.first_name} {resident.last_name}
              </h3>
              {resident.resident_id && (
                <Link2 size={11} className="text-brand-400 flex-shrink-0" title="Linked to Resident Directory" />
              )}
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              {[
                resident.room && `Room ${resident.room}`,
                resident.dining_location,
                dir?.care_level && (CARE_LABELS[dir.care_level] || dir.care_level),
              ].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <button onClick={() => onPrint(resident)} className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors" title="Print ticket">
            <Printer size={14} />
          </button>
          <button onClick={() => onEdit(resident)} className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors" title={canEdit ? 'Edit profile' : 'View profile'}>
            {canEdit ? <Edit2 size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dietColor}`}>{getDiet(resident.diet_type)}</span>
        {(() => {
          const c = CONSISTENCIES.find(c => c.key === resident.consistency)
          return (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1">
              {c?.label || resident.consistency}
              {c?.iddsi && resident.consistency !== 'regular' && (
                <span className="font-mono text-slate-400">IDDSI {c.iddsi}</span>
              )}
            </span>
          )
        })()}
        {resident.fluid_restriction && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400">Fluid Restriction</span>}
        {resident.assistance_needed && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">Assist Needed</span>}
      </div>

      {hasAllergens && (
        <div className="flex items-start gap-1.5 mb-2">
          <AlertTriangle size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-600 font-medium">
            {resident.allergens.map(a => ALLERGENS.find(al => al.key === a)?.label || a).join(', ')}
          </p>
        </div>
      )}

      {resident.dislikes && (
        <p className="text-xs text-slate-500 truncate"><span className="font-medium">Dislikes:</span> {resident.dislikes}</p>
      )}
    </div>
  )
}

// ── Resident Profile Modal ─────────────────────────────────────
function ResidentProfileModal({ resident, menus, canEdit, onClose, onSave }) {
  const { profile, organization } = useAuth()
  const readOnly = !canEdit

  // If editing an existing profile that has a joined residents record, restore it
  const initialLinked = resident?.residents || null

  const [linkedResident, setLinkedResident] = useState(initialLinked)
  const [form, setForm] = useState({
    first_name:        resident?.first_name        || '',
    last_name:         resident?.last_name         || '',
    unit:              resident?.unit              || '',
    room:              resident?.room              || '',
    resident_id:       resident?.resident_id       || null,
    diet_type:         resident?.diet_type         || 'regular',
    consistency:       resident?.consistency       || 'regular',
    allergens:         resident?.allergens         || [],
    allergy_notes:     resident?.allergy_notes     || '',
    likes:             resident?.likes             || '',
    dislikes:          resident?.dislikes          || '',
    fluid_restriction: resident?.fluid_restriction || false,
    fluid_notes:       resident?.fluid_notes       || '',
    dining_location:   resident?.dining_location   || '',
    assistance_needed: resident?.assistance_needed || false,
    assistance_notes:  resident?.assistance_notes  || '',
    general_notes:     resident?.general_notes     || '',
    cycle_menu_id:     resident?.cycle_menu_id     || null,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function handleResidentSelect(r) {
    setLinkedResident(r)
    if (r) {
      setForm(f => ({
        ...f,
        resident_id: r.id,
        first_name:  r.first_name,
        last_name:   r.last_name,
        room:        r.room || '',
        unit:        r.unit || '',
      }))
    } else {
      setForm(f => ({ ...f, resident_id: null }))
    }
  }

  const toggleAllergen = (key) => {
    set('allergens', form.allergens.includes(key)
      ? form.allergens.filter(a => a !== key)
      : [...form.allergens, key])
  }

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) { setError('Name is required'); return }
    setSaving(true)
    const payload = {
      ...form,
      resident_id:     form.resident_id || null,
      organization_id: profile.organization_id,
      updated_at:      new Date().toISOString(),
    }
    let err
    if (resident?.id) {
      ({ error: err } = await supabase.from('resident_dietary_profiles').update(payload).eq('id', resident.id))
    } else {
      ({ error: err } = await supabase.from('resident_dietary_profiles').insert(payload))
    }
    if (err) { setError(err.message); setSaving(false); return }
    onSave()
  }

  const isLinked = !!linkedResident

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100">{resident ? 'Edit Dietary Profile' : 'New Resident Profile'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
        <fieldset disabled={readOnly} className="space-y-5 disabled:opacity-75">
          {error && <div className="px-4 py-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 rounded-lg text-red-700 dark:text-red-400 text-sm">{error}</div>}

          {/* ── Link to Resident Directory ── */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Link to Resident Directory
            </label>
            <ResidentPicker
              orgId={organization.id}
              value={linkedResident}
              onSelect={handleResidentSelect}
            />
            {isLinked && (
              <p className="text-xs text-brand-500 mt-1.5 flex items-center gap-1">
                <Link2 size={11} /> Name and room are synced from the directory record.
              </p>
            )}
            {!isLinked && (
              <p className="text-xs text-slate-400 mt-1.5">
                Search to link this profile to an existing directory resident, or fill in the name below manually.
              </p>
            )}
          </div>

          {/* ── Name / Location ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                First Name *
              </label>
              <input
                value={form.first_name}
                onChange={e => set('first_name', e.target.value)}
                readOnly={isLinked}
                className={`w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${isLinked ? 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-default' : 'dark:bg-slate-800 dark:text-slate-100'}`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Last Name *
              </label>
              <input
                value={form.last_name}
                onChange={e => set('last_name', e.target.value)}
                readOnly={isLinked}
                className={`w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${isLinked ? 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-default' : 'dark:bg-slate-800 dark:text-slate-100'}`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Room</label>
              <input
                value={form.room}
                onChange={e => set('room', e.target.value)}
                readOnly={isLinked}
                className={`w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${isLinked ? 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-default' : 'dark:bg-slate-800 dark:text-slate-100'}`}
                placeholder="Room number"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Dining Location</label>
              <input
                value={form.dining_location}
                onChange={e => set('dining_location', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. Dining Room, Room Tray"
              />
            </div>
          </div>

          {/* ── Diet Type ── */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Diet Type</label>
            <p className="text-xs text-slate-400 mb-2">Based on Academy of Nutrition and Dietetics (AND) terminology</p>
            <div className="grid grid-cols-2 gap-2">
              {DIET_TYPES.map(d => (
                <button key={d.key} onClick={() => set('diet_type', d.key)}
                  className={`px-3 py-2.5 rounded-xl border text-left transition-all ${form.diet_type === d.key ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 dark:border-slate-700 hover:border-brand-300'}`}>
                  <div className={`text-xs font-semibold ${form.diet_type === d.key ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>{d.label}</div>
                  <div className={`text-xs mt-0.5 ${form.diet_type === d.key ? 'text-brand-100' : 'text-slate-400'}`}>{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Consistency ── */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Texture & Liquid Consistency</label>
            <p className="text-xs text-slate-400 mb-2">Based on IDDSI Framework (International Dysphagia Diet Standardisation Initiative)</p>
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Food Textures</div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {CONSISTENCIES.filter(c => !['slightly_thick','mildly_thick','moderately_thick','extremely_thick','thickened_liquid','liquid'].includes(c.key)).map(c => (
                  <button key={c.key} onClick={() => set('consistency', c.key)}
                    className={`px-3 py-2.5 rounded-xl border text-left transition-all ${form.consistency === c.key ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 dark:border-slate-700 hover:border-brand-300'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${form.consistency === c.key ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>{c.label}</span>
                      {c.iddsi && <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${form.consistency === c.key ? 'bg-brand-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>IDDSI {c.iddsi}</span>}
                    </div>
                    <div className={`text-xs mt-0.5 ${form.consistency === c.key ? 'text-brand-100' : 'text-slate-400'}`}>{c.desc}</div>
                  </button>
                ))}
              </div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Liquid Thickness</div>
              <div className="grid grid-cols-2 gap-2">
                {CONSISTENCIES.filter(c => ['slightly_thick','mildly_thick','moderately_thick','extremely_thick','thickened_liquid','liquid'].includes(c.key)).map(c => (
                  <button key={c.key} onClick={() => set('consistency', c.key)}
                    className={`px-3 py-2.5 rounded-xl border text-left transition-all ${form.consistency === c.key ? 'bg-teal-600 text-white border-teal-600' : 'border-slate-200 dark:border-slate-700 hover:border-teal-300'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${form.consistency === c.key ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>{c.label}</span>
                      {c.iddsi && <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${form.consistency === c.key ? 'bg-teal-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>IDDSI {c.iddsi}</span>}
                    </div>
                    <div className={`text-xs mt-0.5 ${form.consistency === c.key ? 'text-teal-100' : 'text-slate-400'}`}>{c.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Allergens ── */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Allergens</label>
            <div className="grid grid-cols-5 gap-2 mb-2">
              {ALLERGENS.map(a => (
                <button key={a.key} onClick={() => toggleAllergen(a.key)}
                  className={`px-2 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1 ${form.allergens.includes(a.key) ? 'bg-red-500 text-white border-red-500' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-red-300'}`}>
                  {form.allergens.includes(a.key) && <Check size={10} />}{a.label}
                </button>
              ))}
            </div>
            <textarea value={form.allergy_notes} onChange={e => set('allergy_notes', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Additional allergy notes..." />
          </div>

          {/* ── Likes / Dislikes ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Likes</label>
              <textarea value={form.likes} onChange={e => set('likes', e.target.value)} rows={2}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                placeholder="Foods resident enjoys..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Dislikes</label>
              <textarea value={form.dislikes} onChange={e => set('dislikes', e.target.value)} rows={2}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                placeholder="Foods to avoid..." />
            </div>
          </div>

          {/* ── Fluid / Assistance ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl">
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input type="checkbox" checked={form.fluid_restriction} onChange={e => set('fluid_restriction', e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Fluid Restriction</span>
              </label>
              {form.fluid_restriction && (
                <input value={form.fluid_notes} onChange={e => set('fluid_notes', e.target.value)}
                  className="w-full px-3 py-1.5 border border-blue-200 dark:border-blue-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-slate-800 dark:text-slate-100"
                  placeholder="Restriction details..." />
              )}
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-xl">
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input type="checkbox" checked={form.assistance_needed} onChange={e => set('assistance_needed', e.target.checked)} className="w-4 h-4 rounded text-amber-600" />
                <span className="text-sm font-medium text-amber-800 dark:text-amber-300">Assistance Needed</span>
              </label>
              {form.assistance_needed && (
                <input value={form.assistance_notes} onChange={e => set('assistance_notes', e.target.value)}
                  className="w-full px-3 py-1.5 border border-amber-200 dark:border-amber-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white dark:bg-slate-800 dark:text-slate-100"
                  placeholder="Type of assistance..." />
              )}
            </div>
          </div>

          {/* ── General Notes ── */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">General Notes</label>
            <textarea value={form.general_notes} onChange={e => set('general_notes', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Any other dietary notes..." />
          </div>

          {/* ── Cycle Menu Assignment ── */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Assigned Cycle Menu</label>
            <select value={form.cycle_menu_id || ''} onChange={e => set('cycle_menu_id', e.target.value || null)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 dark:text-slate-100">
              <option value="">Default to active menu</option>
              {(menus || []).map(m => (
                <option key={m.id} value={m.id}>{m.name}{m.is_current ? ' ✓ Active' : ''}</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">Leave blank to use the org's active menu automatically.</p>
          </div>
        </fieldset>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 font-medium">{readOnly ? 'Close' : 'Cancel'}</button>
          {!readOnly && (
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Print Ticket ───────────────────────────────────────────────
function PrintTicket({ resident, menus, onClose }) {
  const printRef  = useRef()
  const todayDate = new Date()
  const today     = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`
  const [date, setDate]       = useState(today)
  const [period, setPeriod]   = useState('lunch')
  const [courses, setCourses] = useState(null)
  const [loading, setLoading] = useState(false)

  // Calculate which week + day-of-week a given date falls on in the cycle
  function calcCycleDay(menu, dateStr) {
    if (!menu?.start_date) return null
    const start   = new Date(menu.start_date + 'T12:00:00')
    const target  = new Date(dateStr + 'T12:00:00')
    const diffDays = Math.floor((target - start) / 86400000)
    if (diffDays < 0) return null
    const totalWeeks  = Math.floor(diffDays / 7)
    const cycleWeek   = (totalWeeks % menu.cycle_length) + 1   // 1-indexed
    const dayOfWeek   = target.getDay()                         // 0=Sun … 6=Sat
    return { cycleWeek, dayOfWeek }
  }

  useEffect(() => {
    const menu = menus?.find(m => m.id === resident.cycle_menu_id) || menus?.find(m => m.is_current) || null
    if (!menu) { setCourses(null); return }
    const pos = calcCycleDay(menu, date)
    if (!pos) { setCourses(null); return }
    fetchMeal(menu.id, pos.cycleWeek, pos.dayOfWeek, period)
  }, [date, period, resident.cycle_menu_id, menus])

  async function fetchMeal(menuId, weekNum, dayOfWeek, mealPeriod) {
    setLoading(true)
    const { data: dayRows } = await supabase.from('cycle_menu_days')
      .select('id').eq('cycle_menu_id', menuId).eq('week_number', weekNum).eq('day_of_week', dayOfWeek).limit(1)
    const day = dayRows?.[0]
    if (!day) { setCourses([]); setLoading(false); return }
    const { data: mealRows } = await supabase.from('cycle_menu_meals')
      .select('id').eq('cycle_menu_day_id', day.id).eq('meal_period', mealPeriod).limit(1)
    const meal = mealRows?.[0]
    if (!meal) { setCourses([]); setLoading(false); return }
    const { data: courseData } = await supabase.from('meal_courses')
      .select('*, menu_items:menu_items!meal_courses_menu_item_id_fkey(name,allergens,suitable_diets,suitable_consistencies)')
      .eq('meal_id', meal.id).order('sort_order')

    // Fetch alternates by source_item_id (menu item level) so alternates apply
    // across all cycle days, not just the one instance where they were originally defined
    const menuItemIds = courseData?.map(d => d.menu_item_id) || []
    let altData = []
    if (menuItemIds.length > 0) {
      const { data: alts } = await supabase.from('course_alternates')
        .select('id, source_item_id, priority, conditions, item:menu_items!course_alternates_menu_item_id_fkey(id,name,allergens,suitable_diets,suitable_consistencies)')
        .in('source_item_id', menuItemIds)
        .order('priority')
      altData = alts || []
    }

    const merged = (courseData || []).map(course => ({
      ...course,
      alternates: altData.filter(a => a.source_item_id === course.menu_item_id)
    }))
    setCourses(merged)
    setLoading(false)
  }

  const handlePrint = () => {
    const content = printRef.current.innerHTML
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>Meal Ticket - ${resident.first_name} ${resident.last_name}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; }
        h2 { margin: 0 0 4px; font-size: 18px; }
        .sub { color: #666; font-size: 13px; margin-bottom: 10px; }
        .badges { margin-bottom: 8px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; margin: 2px; }
        .diet { background: #e0f2fe; color: #0369a1; }
        .cons { background: #f0fdf4; color: #166534; }
        .allergy { background: #fee2e2; color: #dc2626; }
        .section { margin-top: 10px; }
        .section label { font-weight: bold; font-size: 12px; color: #444; display: block; margin-bottom: 4px; }
        .item { padding: 4px 0; border-bottom: 1px solid #eee; font-size: 13px; }
        .course-name { font-weight: bold; font-size: 11px; color: #888; text-transform: uppercase; }
        .backup { color: #999; font-style: italic; font-size: 11px; }
        hr { margin: 12px 0; }
        @media print { button { display: none; } }
      </style></head>
      <body>${content}</body></html>`)
    win.document.close()
    win.print()
  }

  const allergenLabels = resident.allergens?.map(a => ALLERGENS.find(al => al.key === a)?.label || a) || []
  const menu = menus?.find(m => m.id === resident.cycle_menu_id) || menus?.find(m => m.is_current) || null
  const cyclePos = menu ? calcCycleDay(menu, date) : null
  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100">Meal Ticket Preview</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        {/* Date + Period pickers */}
        <div className="px-6 pt-4 pb-2 flex gap-3 flex-shrink-0">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1">Meal Period</label>
            <select value={period} onChange={e => setPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 dark:text-slate-100">
              {MEAL_PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
        </div>

        {/* Cycle info */}
        {menu && cyclePos && (
          <div className="px-6 py-1 flex-shrink-0">
            <p className="text-xs text-slate-400">{menu.name} · Week {cyclePos.cycleWeek} of {menu.cycle_length}</p>
          </div>
        )}
        {!menu && (
          <div className="px-6 py-1 flex-shrink-0">
            <p className="text-xs text-amber-500">No cycle menu assigned and no active menu set for this org.</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div ref={printRef}>
            <h2>{resident.first_name} {resident.last_name}</h2>
            <div className="sub">
              {[resident.room && `Room ${resident.room}`, resident.dining_location].filter(Boolean).join(' · ')}
              {' · '}{dateLabel}{' · '}{MEAL_PERIODS.find(m => m.key === period)?.label}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
              <span className="badge diet">{getDiet(resident.diet_type)}</span>
              <span className="badge cons">{getCons(resident.consistency)}</span>
              {allergenLabels.map(a => <span key={a} className="badge allergy">⚠ {a}</span>)}
              {resident.fluid_restriction && <span className="badge allergy">Fluid Restriction</span>}
            </div>
            <hr />
            {loading ? (
              <p style={{ color: '#999', fontSize: 13 }}>Loading menu...</p>
            ) : !menu ? (
              <p style={{ color: '#999', fontSize: 13 }}>No cycle menu assigned to this resident.</p>
            ) : !cyclePos ? (
              <p style={{ color: '#999', fontSize: 13 }}>Selected date is before the menu start date.</p>
            ) : courses?.length > 0 ? (
              <div className="section">
                <label>Menu Items</label>
                {courses.map((course, i) => {
                  const item = course.menu_items
                  const { servedItem, substitutedFor } = resolveMealItem(item, course.alternates, resident)

                  return (
                    <div key={i} className="item">
                      <div className="course-name">{course.course_name}</div>
                      <div>{servedItem?.name || item?.name || '—'}</div>
                      {substitutedFor && servedItem && <div className="backup">Sub for: {substitutedFor.name}</div>}
                      {substitutedFor && !servedItem && <div className="backup" style={{color:'#dc2626'}}>⚠ No suitable alternate — verify with kitchen</div>}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p style={{ color: '#999', fontSize: 13 }}>No menu items set for this meal.</p>
            )}
            {resident.general_notes && (
              <div className="section">
                <label>Notes</label>
                <div style={{ fontSize: 13 }}>{resident.general_notes}</div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 font-medium">Close</button>
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors">
            <Printer size={15} /> Print Ticket
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Dietary Page ──────────────────────────────────────────
export default function Dietary() {
  const { profile, organization, canEdit } = useAuth()
  // Dietary/kitchen staff, supervisors, and managers get edit by default;
  // org admins can override per-user via Admin Panel > Module Access
  const canEditDietary = canEdit('dietary', ['dietary','supervisor','manager'])
  const [tab, setTab]               = useState('residents')
  const [residents, setResidents]   = useState([])
  const [menus, setMenus]           = useState([])
  const [menuItems, setMenuItems]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [editResident, setEditResident]         = useState(null)
  const [printResident, setPrintResident]       = useState(null)
  const [filterDiet, setFilterDiet] = useState('all')

  useEffect(() => { if (organization) fetchAll() }, [organization])

  async function fetchAll() {
    setLoading(true)
    const [resRes, menuRes, itemsRes] = await Promise.all([
      supabase.from('resident_dietary_profiles')
        // Join residents table to get live directory data (photo, care level, etc.)
        .select('*, residents(id, first_name, last_name, room, unit, care_level, photo_url)')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('last_name'),
      supabase.from('cycle_menus')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true),
      supabase.from('menu_items')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('name'),
    ])
    setResidents(resRes.data || [])
    setMenus(menuRes.data || [])
    setMenuItems(itemsRes.data || [])
    setLoading(false)
  }

  const handleEdit   = (r) => { setEditResident(r); setShowProfileModal(true) }
  const handleNew    = () => { setEditResident(null); setShowProfileModal(true) }
  const handleSave   = () => { setShowProfileModal(false); fetchAll() }
  const handlePrint  = (r) => { setPrintResident(r) }

  const filtered = residents.filter(r => {
    const matchSearch = !search || `${r.first_name} ${r.last_name} ${r.room}`.toLowerCase().includes(search.toLowerCase())
    const matchDiet   = filterDiet === 'all' || r.diet_type === filterDiet
    return matchSearch && matchDiet
  })

  // Diet type counts
  const dietCounts = DIET_TYPES.reduce((acc, d) => {
    acc[d.key] = residents.filter(r => r.diet_type === d.key).length
    return acc
  }, {})

  const tabs = [
    { key: 'residents', label: 'Resident Profiles', icon: Users },
    { key: 'menus',     label: 'Cycle Menus',       icon: BookOpen },
  ]

  const stateRef = DIETARY_STATE_REFS[organization?.compliance_state] || DIETARY_STATE_REFS.OTHER

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800 dark:text-slate-100">Dietary</h1>
          <p className="text-slate-500 text-sm mt-0.5">Resident profiles, dietary restrictions, and cycle menus</p>
        </div>
        {tab === 'residents' && canEditDietary && (
          <button onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus size={16} /> New Resident Profile
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white dark:bg-slate-900 text-brand-700 dark:text-brand-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              <Icon size={15} />{t.label}
            </button>
          )
        })}
      </div>

      {/* RESIDENTS TAB */}
      {tab === 'residents' && (
        <>
          {/* Diet summary */}
          <div className="flex flex-wrap gap-2 mb-5">
            <button onClick={() => setFilterDiet('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterDiet === 'all' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'}`}>
              All ({residents.length})
            </button>
            {DIET_TYPES.filter(d => dietCounts[d.key] > 0).map(d => (
              <button key={d.key} onClick={() => setFilterDiet(d.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterDiet === d.key ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'}`}>
                {d.label} ({dietCounts[d.key]})
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or room..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>

          {loading ? (
            <div className="text-center py-16 text-slate-400">Loading profiles...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <UtensilsCrossed size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-display text-lg">No profiles yet</p>
              <p className="text-sm mt-1">Click "New Resident Profile" to add one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(r => (
                <ResidentCard key={r.id} resident={r} onEdit={handleEdit} onPrint={handlePrint} canEdit={canEditDietary} />
              ))}
            </div>
          )}
        </>
      )}

      {/* MENUS TAB */}
      {tab === 'menus' && (
        <>
          <RegRefBanner
            label={`${stateRef.label} Food Safety Code`}
            statute={stateRef.foodCode.statute}
            summary={stateRef.foodCode.summary}
            confidence={stateRef.foodCode.confidence}
            note={stateRef.foodCode.note}
          />
          <RegRefBanner
            label={`${stateRef.label} Menu / Therapeutic Diet Requirements`}
            statute={stateRef.menuRequirements.statute}
            summary={stateRef.menuRequirements.summary}
            confidence={stateRef.menuRequirements.confidence}
            note={stateRef.menuRequirements.note}
          />
          <RegRefBanner
            label={`${stateRef.label} Dietitian / CDM Oversight`}
            statute={stateRef.dietitianOversight.statute}
            summary={stateRef.dietitianOversight.summary}
            confidence={stateRef.dietitianOversight.confidence}
            note={stateRef.dietitianOversight.note}
          />
          <CycleMenuBuilder
            menus={menus}
            items={menuItems}
            onRefresh={fetchAll}
            orgId={organization.id}
            userId={profile.id}
            canEdit={canEditDietary}
          />
        </>
      )}

      {/* Modals */}
      {showProfileModal && (
        <ResidentProfileModal resident={editResident} menus={menus} canEdit={canEditDietary} onClose={() => setShowProfileModal(false)} onSave={handleSave} />
      )}
      {printResident && (
        <PrintTicket resident={printResident} menus={menus} onClose={() => setPrintResident(null)} />
      )}
    </div>
  )
}
