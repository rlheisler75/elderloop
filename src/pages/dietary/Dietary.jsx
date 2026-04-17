import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Users, BookOpen, Printer, Plus, X, Edit2, Search,
  ChevronLeft, ChevronRight, AlertTriangle, Check,
  UtensilsCrossed, RefreshCw, ArrowRight, Clipboard
} from 'lucide-react'

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

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const getDiet = (key) => DIET_TYPES.find(d => d.key === key)?.label || key
const getCons = (key) => CONSISTENCIES.find(c => c.key === key)?.label || key

// ── Resident Profile Card ──────────────────────────────────────
function ResidentCard({ resident, onEdit, onPrint }) {
  const hasAllergens = resident.allergens?.length > 0
  const dietColor = {
    regular:      'bg-slate-100 text-slate-700',
    heart_healthy:'bg-red-100 text-red-700',
    low_sodium:   'bg-yellow-100 text-yellow-700',
    diabetic:     'bg-blue-100 text-blue-700',
    ncs:          'bg-sky-100 text-sky-700',
    renal:        'bg-purple-100 text-purple-700',
    lo_carb:      'bg-orange-100 text-orange-700',
    low_fat:      'bg-green-100 text-green-700',
    low_residue:  'bg-amber-100 text-amber-700',
    dash:         'bg-rose-100 text-rose-700',
    gluten_free:  'bg-lime-100 text-lime-700',
    vegetarian:   'bg-emerald-100 text-emerald-700',
    vegan:        'bg-teal-100 text-teal-700',
    neutropenic:  'bg-indigo-100 text-indigo-700',
    other:        'bg-slate-100 text-slate-600',
  }[resident.diet_type] || 'bg-slate-100 text-slate-700'

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-display font-semibold text-slate-800">{resident.first_name} {resident.last_name}</h3>
          <p className="text-slate-400 text-xs mt-0.5">
            {[resident.room && `Room ${resident.room}`, resident.unit && `Unit ${resident.unit}`, resident.dining_location].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => onPrint(resident)} className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors" title="Print ticket">
            <Printer size={14} />
          </button>
          <button onClick={() => onEdit(resident)} className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors">
            <Edit2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dietColor}`}>{getDiet(resident.diet_type)}</span>
        {(() => {
          const c = CONSISTENCIES.find(c => c.key === resident.consistency)
          return (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 flex items-center gap-1">
              {c?.label || resident.consistency}
              {c?.iddsi && resident.consistency !== 'regular' && (
                <span className="font-mono text-slate-400">IDDSI {c.iddsi}</span>
              )}
            </span>
          )
        })()}
        {resident.fluid_restriction && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">Fluid Restriction</span>}
        {resident.assistance_needed && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">Assist Needed</span>}
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
function ResidentProfileModal({ resident, onClose, onSave }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    first_name: resident?.first_name || '',
    last_name:  resident?.last_name  || '',
    unit:       resident?.unit       || '',
    room:       resident?.room       || '',
    diet_type:  resident?.diet_type  || 'regular',
    consistency:resident?.consistency|| 'regular',
    allergens:  resident?.allergens  || [],
    allergy_notes: resident?.allergy_notes || '',
    likes:      resident?.likes      || '',
    dislikes:   resident?.dislikes   || '',
    fluid_restriction: resident?.fluid_restriction || false,
    fluid_notes: resident?.fluid_notes || '',
    dining_location: resident?.dining_location || '',
    assistance_needed: resident?.assistance_needed || false,
    assistance_notes: resident?.assistance_notes || '',
    general_notes: resident?.general_notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleAllergen = (key) => {
    set('allergens', form.allergens.includes(key)
      ? form.allergens.filter(a => a !== key)
      : [...form.allergens, key])
  }

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) { setError('Name is required'); return }
    setSaving(true)
    const payload = { ...form, organization_id: profile.organization_id, updated_at: new Date().toISOString() }
    let err
    if (resident?.id) {
      ({ error: err } = await supabase.from('resident_dietary_profiles').update(payload).eq('id', resident.id))
    } else {
      ({ error: err } = await supabase.from('resident_dietary_profiles').insert(payload))
    }
    if (err) { setError(err.message); setSaving(false); return }
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800">{resident ? 'Edit Dietary Profile' : 'New Resident Profile'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          {/* Name / Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">First Name *</label>
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Last Name *</label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Room</label>
              <input value={form.room} onChange={e => set('room', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Room number" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Dining Location</label>
              <input value={form.dining_location} onChange={e => set('dining_location', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. Dining Room, Room Tray" />
            </div>
          </div>

          {/* Diet Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Diet Type</label>
            <p className="text-xs text-slate-400 mb-2">Based on Academy of Nutrition and Dietetics (AND) terminology</p>
            <div className="grid grid-cols-2 gap-2">
              {DIET_TYPES.map(d => (
                <button key={d.key} onClick={() => set('diet_type', d.key)}
                  className={`px-3 py-2.5 rounded-xl border text-left transition-all ${form.diet_type === d.key ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 hover:border-brand-300'}`}>
                  <div className={`text-xs font-semibold ${form.diet_type === d.key ? 'text-white' : 'text-slate-800'}`}>{d.label}</div>
                  <div className={`text-xs mt-0.5 ${form.diet_type === d.key ? 'text-brand-100' : 'text-slate-400'}`}>{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Consistency */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Texture & Liquid Consistency</label>
            <p className="text-xs text-slate-400 mb-2">Based on IDDSI Framework (International Dysphagia Diet Standardisation Initiative)</p>
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Food Textures</div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {CONSISTENCIES.filter(c => !['slightly_thick','mildly_thick','moderately_thick','extremely_thick','thickened_liquid','liquid'].includes(c.key)).map(c => (
                  <button key={c.key} onClick={() => set('consistency', c.key)}
                    className={`px-3 py-2.5 rounded-xl border text-left transition-all ${form.consistency === c.key ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 hover:border-brand-300'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${form.consistency === c.key ? 'text-white' : 'text-slate-800'}`}>{c.label}</span>
                      {c.iddsi && <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${form.consistency === c.key ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500'}`}>IDDSI {c.iddsi}</span>}
                    </div>
                    <div className={`text-xs mt-0.5 ${form.consistency === c.key ? 'text-brand-100' : 'text-slate-400'}`}>{c.desc}</div>
                  </button>
                ))}
              </div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Liquid Thickness</div>
              <div className="grid grid-cols-2 gap-2">
                {CONSISTENCIES.filter(c => ['slightly_thick','mildly_thick','moderately_thick','extremely_thick','thickened_liquid','liquid'].includes(c.key)).map(c => (
                  <button key={c.key} onClick={() => set('consistency', c.key)}
                    className={`px-3 py-2.5 rounded-xl border text-left transition-all ${form.consistency === c.key ? 'bg-teal-600 text-white border-teal-600' : 'border-slate-200 hover:border-teal-300'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${form.consistency === c.key ? 'text-white' : 'text-slate-800'}`}>{c.label}</span>
                      {c.iddsi && <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${form.consistency === c.key ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-500'}`}>IDDSI {c.iddsi}</span>}
                    </div>
                    <div className={`text-xs mt-0.5 ${form.consistency === c.key ? 'text-teal-100' : 'text-slate-400'}`}>{c.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Allergens */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Allergens</label>
            <div className="grid grid-cols-5 gap-2 mb-2">
              {ALLERGENS.map(a => (
                <button key={a.key} onClick={() => toggleAllergen(a.key)}
                  className={`px-2 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1 ${form.allergens.includes(a.key) ? 'bg-red-500 text-white border-red-500' : 'border-slate-200 text-slate-600 hover:border-red-300'}`}>
                  {form.allergens.includes(a.key) && <Check size={10} />}{a.label}
                </button>
              ))}
            </div>
            <textarea value={form.allergy_notes} onChange={e => set('allergy_notes', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Additional allergy notes..." />
          </div>

          {/* Likes / Dislikes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Likes</label>
              <textarea value={form.likes} onChange={e => set('likes', e.target.value)} rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                placeholder="Foods resident enjoys..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Dislikes</label>
              <textarea value={form.dislikes} onChange={e => set('dislikes', e.target.value)} rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                placeholder="Foods to avoid..." />
            </div>
          </div>

          {/* Fluid / Assistance */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input type="checkbox" checked={form.fluid_restriction} onChange={e => set('fluid_restriction', e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Fluid Restriction</span>
              </label>
              {form.fluid_restriction && (
                <input value={form.fluid_notes} onChange={e => set('fluid_notes', e.target.value)}
                  className="w-full px-3 py-1.5 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  placeholder="Restriction details..." />
              )}
            </div>
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input type="checkbox" checked={form.assistance_needed} onChange={e => set('assistance_needed', e.target.checked)} className="w-4 h-4 rounded text-amber-600" />
                <span className="text-sm font-medium text-amber-800">Assistance Needed</span>
              </label>
              {form.assistance_needed && (
                <input value={form.assistance_notes} onChange={e => set('assistance_notes', e.target.value)}
                  className="w-full px-3 py-1.5 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                  placeholder="Type of assistance..." />
              )}
            </div>
          </div>

          {/* General Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">General Notes</label>
            <textarea value={form.general_notes} onChange={e => set('general_notes', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Any other dietary notes..." />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Print Ticket ───────────────────────────────────────────────
function PrintTicket({ resident, meal, period, onClose }) {
  const printRef = useRef()

  const handlePrint = () => {
    const content = printRef.current.innerHTML
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>Meal Ticket - ${resident.first_name} ${resident.last_name}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; }
        h2 { margin: 0; font-size: 18px; }
        .sub { color: #666; font-size: 13px; margin-bottom: 12px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; margin: 2px; }
        .diet { background: #e0f2fe; color: #0369a1; }
        .cons { background: #f0fdf4; color: #166534; }
        .allergy { background: #fee2e2; color: #dc2626; }
        .section { margin-top: 10px; }
        .section label { font-weight: bold; font-size: 12px; color: #444; display: block; margin-bottom: 4px; }
        .item { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #eee; font-size: 13px; }
        .backup { color: #999; font-style: italic; font-size: 11px; }
        hr { margin: 12px 0; }
        @media print { button { display: none; } }
      </style></head>
      <body>${content}</body></html>`)
    win.document.close()
    win.print()
  }

  const allergenLabels = resident.allergens?.map(a => ALLERGENS.find(al => al.key === a)?.label || a) || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-display font-semibold text-slate-800">Meal Ticket Preview</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="px-6 py-4">
          <div ref={printRef}>
            <h2>{resident.first_name} {resident.last_name}</h2>
            <div className="sub">
              {[resident.room && `Room ${resident.room}`, resident.dining_location].filter(Boolean).join(' · ')}
              {' · '}{MEAL_PERIODS.find(m => m.key === period)?.label}
            </div>
            <span className="badge diet">{getDiet(resident.diet_type)}</span>
            <span className="badge cons">{getCons(resident.consistency)}</span>
            {allergenLabels.map(a => <span key={a} className="badge allergy">⚠ {a}</span>)}
            {resident.fluid_restriction && <span className="badge allergy">Fluid Restriction</span>}
            <hr />
            {meal?.courses?.length > 0 ? (
              <div className="section">
                <label>Menu Items</label>
                {meal.courses.map((course, i) => {
                  const item = course.menu_items
                  const backup = course.backup_items
                  const needsBackup = item && (
                    resident.allergens?.some(a => item.allergens?.includes(a)) ||
                    resident.dislikes?.toLowerCase().includes(item.name?.toLowerCase())
                  )
                  return (
                    <div key={i} className="item">
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: 12 }}>{course.course_name}</div>
                        <div>{needsBackup && backup ? backup.name : item?.name || '—'}</div>
                        {needsBackup && backup && <div className="backup">Sub for: {item?.name}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p style={{ color: '#999', fontSize: 13 }}>No menu assigned for this meal</p>
            )}
            {resident.general_notes && (
              <div className="section">
                <label>Notes</label>
                <div style={{ fontSize: 13 }}>{resident.general_notes}</div>
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Close</button>
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
  const { profile, organization } = useAuth()
  const [tab, setTab]               = useState('residents')
  const [residents, setResidents]   = useState([])
  const [menus, setMenus]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [editResident, setEditResident]         = useState(null)
  const [printResident, setPrintResident]       = useState(null)
  const [printPeriod, setPrintPeriod]           = useState('lunch')
  const [filterDiet, setFilterDiet] = useState('all')

  useEffect(() => { if (organization) fetchAll() }, [organization])

  async function fetchAll() {
    setLoading(true)
    const [resRes, menuRes] = await Promise.all([
      supabase.from('resident_dietary_profiles')
        .select('*').eq('organization_id', organization.id)
        .eq('is_active', true).order('last_name'),
      supabase.from('cycle_menus')
        .select('*').eq('organization_id', organization.id)
        .eq('is_active', true)
    ])
    setResidents(resRes.data || [])
    setMenus(menuRes.data || [])
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

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800">Dietary</h1>
          <p className="text-slate-500 text-sm mt-0.5">Resident profiles, dietary restrictions, and cycle menus</p>
        </div>
        {tab === 'residents' && (
          <button onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus size={16} /> New Resident Profile
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
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
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterDiet === 'all' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-slate-200 text-slate-600'}`}>
              All ({residents.length})
            </button>
            {DIET_TYPES.filter(d => dietCounts[d.key] > 0).map(d => (
              <button key={d.key} onClick={() => setFilterDiet(d.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterDiet === d.key ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-slate-200 text-slate-600'}`}>
                {d.label} ({dietCounts[d.key]})
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or room..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
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
                <ResidentCard key={r.id} resident={r} onEdit={handleEdit} onPrint={handlePrint} />
              ))}
            </div>
          )}
        </>
      )}

      {/* MENUS TAB */}
      {tab === 'menus' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
          <BookOpen size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="font-display text-lg text-slate-700">Cycle Menu Builder</p>
          <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">
            Create rotating cycle menus, assign items per meal period, and set backup substitutions. Coming in the next build.
          </p>
        </div>
      )}

      {/* Modals */}
      {showProfileModal && (
        <ResidentProfileModal resident={editResident} onClose={() => setShowProfileModal(false)} onSave={handleSave} />
      )}
      {printResident && (
        <PrintTicket resident={printResident} meal={null} period={printPeriod} onClose={() => setPrintResident(null)} />
      )}
    </div>
  )
}
