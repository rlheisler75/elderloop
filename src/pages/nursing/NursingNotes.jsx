import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Heart, Pill, FileText, Plus, X, Edit2, Trash2,
  Search, ChevronDown, ChevronUp, AlertTriangle,
  Activity, Thermometer, Weight, Droplets, Wind,
  TrendingUp, TrendingDown, Minus, Clock, Flag,
  ChevronRight, Check, User, Calendar, Filter
} from 'lucide-react'

// ── Constants ──────────────────────────────────────────────────
const SHIFTS = [
  { key: 'day',     label: 'Day',     time: '7am–3pm',  color: 'bg-amber-100 text-amber-700' },
  { key: 'evening', label: 'Evening', time: '3pm–11pm', color: 'bg-indigo-100 text-indigo-700' },
  { key: 'night',   label: 'Night',   time: '11pm–7am', color: 'bg-slate-100 text-slate-600' },
]

const NOTE_CATEGORIES = [
  { key: 'general',        label: 'General' },
  { key: 'behavioral',     label: 'Behavioral' },
  { key: 'skin_integrity', label: 'Skin Integrity' },
  { key: 'nutrition',      label: 'Nutrition' },
  { key: 'elimination',    label: 'Elimination' },
  { key: 'respiratory',    label: 'Respiratory' },
  { key: 'pain',           label: 'Pain' },
  { key: 'fall_risk',      label: 'Fall Risk' },
  { key: 'wound_care',     label: 'Wound Care' },
  { key: 'social',         label: 'Social / Family' },
]

const MED_FORMS = ['tablet','capsule','liquid','injection','patch','inhaler','cream','drops','suppository','other']
const MED_ROUTES = ['oral','topical','sublingual','inhaled','IV','IM','subcutaneous','transdermal','ophthalmic','otic']

const fmtDate = (d) => d
  ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : '—'

const fmtTime = (ts) => ts
  ? new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  : '—'

const fmtDateTime = (ts) => ts
  ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + fmtTime(ts)
  : '—'

const getShift = (key) => SHIFTS.find(s => s.key === key) || SHIFTS[0]
const getCat   = (key) => NOTE_CATEGORIES.find(c => c.key === key) || NOTE_CATEGORIES[0]

// ── BP classification helper ───────────────────────────────────
const bpClass = (sys, dia) => {
  if (!sys || !dia) return null
  if (sys < 120 && dia < 80)  return { label: 'Normal',     color: 'text-green-600' }
  if (sys < 130 && dia < 80)  return { label: 'Elevated',   color: 'text-amber-600' }
  if (sys < 140 || dia < 90)  return { label: 'High Stage 1',color: 'text-orange-600' }
  if (sys >= 180 || dia >= 120) return { label: 'Crisis',   color: 'text-red-700' }
  return { label: 'High Stage 2', color: 'text-red-600' }
}

// ── Trend icon ─────────────────────────────────────────────────
const Trend = ({ curr, prev, higherIsBetter = false }) => {
  if (!curr || !prev) return null
  const up = curr > prev
  if (curr === prev) return <Minus size={12} className="text-slate-300" />
  if (up === higherIsBetter) return <TrendingUp size={12} className="text-green-500" />
  return <TrendingDown size={12} className="text-red-500" />
}

// ── Mini sparkline (SVG) ───────────────────────────────────────
function Sparkline({ data, color = '#0c90e1' }) {
  if (!data || data.length < 2) return null
  const w = 80, h = 30, pad = 2
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2)
    const y = h - pad - ((v - min) / range) * (h - pad * 2)
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts.split(' ').pop().split(',')[0]} cy={pts.split(' ').pop().split(',')[1]}
        r="2.5" fill={color} />
    </svg>
  )
}

// ── Vitals Entry Modal ─────────────────────────────────────────
function VitalsModal({ resident, orgId, profile, onClose, onSaved }) {
  const [form, setForm] = useState({
    shift: 'day', bp_systolic: '', bp_diastolic: '', pulse: '',
    temperature: '', weight: '', o2_sat: '', blood_sugar: '',
    respirations: '', pain_level: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      organization_id: orgId,
      resident_id:     resident.id,
      recorded_by:     profile.id,
      recorded_at:     new Date().toISOString(),
      shift:           form.shift,
      bp_systolic:     form.bp_systolic  ? parseInt(form.bp_systolic)    : null,
      bp_diastolic:    form.bp_diastolic ? parseInt(form.bp_diastolic)   : null,
      pulse:           form.pulse        ? parseInt(form.pulse)          : null,
      temperature:     form.temperature  ? parseFloat(form.temperature)  : null,
      weight:          form.weight       ? parseFloat(form.weight)       : null,
      o2_sat:          form.o2_sat       ? parseInt(form.o2_sat)         : null,
      blood_sugar:     form.blood_sugar  ? parseInt(form.blood_sugar)    : null,
      respirations:    form.respirations ? parseInt(form.respirations)   : null,
      pain_level:      form.pain_level !== '' ? parseInt(form.pain_level): null,
      notes:           form.notes        || null,
    }
    const { error: err } = await supabase.from('resident_vitals').insert(payload)
    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  const bp = bpClass(parseInt(form.bp_systolic), parseInt(form.bp_diastolic))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-display font-semibold text-slate-800">Record Vitals</h2>
            <p className="text-xs text-slate-400 mt-0.5">{resident.first_name} {resident.last_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          {/* Shift selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Shift</label>
            <div className="flex gap-2">
              {SHIFTS.map(s => (
                <button key={s.key} onClick={() => set('shift', s.key)}
                  className={`flex-1 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${form.shift === s.key ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-200 text-slate-600 hover:border-brand-300'}`}>
                  {s.label}<br /><span className="font-normal opacity-70">{s.time}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Vitals grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Blood Pressure */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <Heart size={11} /> Blood Pressure (mmHg)
                {bp && <span className={`ml-auto text-xs font-medium ${bp.color}`}>{bp.label}</span>}
              </label>
              <div className="flex gap-2 items-center">
                <input type="number" value={form.bp_systolic} onChange={e => set('bp_systolic', e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-center font-semibold"
                  placeholder="Systolic" min="60" max="250" />
                <span className="text-slate-400 font-bold text-lg">/</span>
                <input type="number" value={form.bp_diastolic} onChange={e => set('bp_diastolic', e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-center font-semibold"
                  placeholder="Diastolic" min="40" max="150" />
              </div>
            </div>

            {[
              { key: 'pulse',       label: 'Pulse (bpm)',      icon: Activity,    min: 30,  max: 200, placeholder: '72' },
              { key: 'temperature', label: 'Temp (°F)',        icon: Thermometer, min: 94,  max: 106, placeholder: '98.6', step: '0.1' },
              { key: 'weight',      label: 'Weight (lbs)',     icon: Weight,      min: 50,  max: 600, placeholder: '142.5', step: '0.1' },
              { key: 'o2_sat',      label: 'O₂ Sat (%)',       icon: Droplets,    min: 70,  max: 100, placeholder: '97' },
              { key: 'blood_sugar', label: 'Blood Sugar (mg/dL)', icon: Droplets, min: 40, max: 600, placeholder: '110' },
              { key: 'respirations',label: 'Respirations/min', icon: Wind,        min: 8,   max: 40,  placeholder: '16' },
            ].map(v => {
              const Icon = v.icon
              return (
                <div key={v.key}>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <Icon size={10} /> {v.label}
                  </label>
                  <input type="number" value={form[v.key]} onChange={e => set(v.key, e.target.value)}
                    step={v.step || '1'} min={v.min} max={v.max}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-center font-semibold"
                    placeholder={v.placeholder} />
                </div>
              )
            })}
          </div>

          {/* Pain scale */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Pain Level {form.pain_level !== '' && <span className={`ml-1 font-bold ${parseInt(form.pain_level) >= 7 ? 'text-red-600' : parseInt(form.pain_level) >= 4 ? 'text-amber-600' : 'text-green-600'}`}>{form.pain_level}/10</span>}
            </label>
            <div className="flex gap-1">
              {Array.from({ length: 11 }).map((_, i) => (
                <button key={i} onClick={() => set('pain_level', i.toString())}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border-2 ${form.pain_level === i.toString()
                    ? i >= 7 ? 'bg-red-500 border-red-500 text-white' : i >= 4 ? 'bg-amber-500 border-amber-500 text-white' : 'bg-green-500 border-green-500 text-white'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  {i}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1 px-1">
              <span>No pain</span><span>Worst pain</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Any observations or relevant notes..." />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving...' : 'Save Vitals'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Medication Modal ───────────────────────────────────────────
function MedModal({ med, resident, orgId, profile, onClose, onSaved }) {
  const isNew = !med
  const [form, setForm] = useState({
    name:        med?.name        || '',
    generic_name:med?.generic_name|| '',
    dosage:      med?.dosage      || '',
    form:        med?.form        || 'tablet',
    route:       med?.route       || 'oral',
    frequency:   med?.frequency   || '',
    indication:  med?.indication  || '',
    prescriber:  med?.prescriber  || '',
    pharmacy:    med?.pharmacy    || '',
    start_date:  med?.start_date  || '',
    end_date:    med?.end_date    || '',
    is_prn:      med?.is_prn      || false,
    notes:       med?.notes       || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Medication name required'); return }
    setSaving(true)
    const payload = {
      ...form,
      organization_id: orgId,
      resident_id:     resident.id,
      added_by:        profile.id,
      start_date:      form.start_date || null,
      end_date:        form.end_date   || null,
      is_active:       true,
      updated_at:      new Date().toISOString(),
    }
    const { error: err } = med?.id
      ? await supabase.from('resident_medications').update(payload).eq('id', med.id)
      : await supabase.from('resident_medications').insert(payload)
    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-display font-semibold text-slate-800">{isNew ? 'Add Medication' : 'Edit Medication'}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{resident.first_name} {resident.last_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Medication Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. Lisinopril" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Generic Name</label>
              <input value={form.generic_name} onChange={e => set('generic_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Generic name" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Dosage</label>
              <input value={form.dosage} onChange={e => set('dosage', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. 10mg" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Form</label>
              <select value={form.form} onChange={e => set('form', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 capitalize">
                {MED_FORMS.map(f => <option key={f} value={f} className="capitalize">{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Route</label>
              <select value={form.route} onChange={e => set('route', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase">
                {MED_ROUTES.map(r => <option key={r} value={r} className="uppercase">{r}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Frequency</label>
              <input value={form.frequency} onChange={e => set('frequency', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. Twice daily, Every 8 hours, PRN" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Indication (What it's for)</label>
              <input value={form.indication} onChange={e => set('indication', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. Hypertension, Type 2 Diabetes" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Prescriber</label>
              <input value={form.prescriber} onChange={e => set('prescriber', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Dr. Name" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Pharmacy</label>
              <input value={form.pharmacy} onChange={e => set('pharmacy', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Pharmacy name" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Start Date</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">End Date</label>
              <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_prn} onChange={e => set('is_prn', e.target.checked)} className="w-4 h-4 rounded text-brand-600" />
            <span className="text-sm text-slate-700 font-medium">PRN (As Needed)</span>
          </label>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Special instructions, allergies, notes..." />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving...' : isNew ? 'Add Medication' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Care Note Modal ────────────────────────────────────────────
function NoteModal({ note, resident, orgId, profile, onClose, onSaved }) {
  const isNew = !note
  const [form, setForm] = useState({
    shift:      note?.shift    || 'day',
    category:   note?.category || 'general',
    body:       note?.body     || '',
    is_flagged: note?.is_flagged || false,
    flag_reason:note?.flag_reason || '',
    note_date:  note?.note_date || new Date().toISOString().split('T')[0],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.body.trim()) { setError('Note content is required'); return }
    setSaving(true)
    const payload = {
      organization_id: orgId,
      resident_id:     resident.id,
      authored_by:     profile.id,
      note_date:       form.note_date,
      shift:           form.shift,
      category:        form.category,
      body:            form.body.trim(),
      is_flagged:      form.is_flagged,
      flag_reason:     form.is_flagged ? (form.flag_reason || null) : null,
      is_active:       true,
    }
    const { error: err } = note?.id
      ? await supabase.from('care_notes').update(payload).eq('id', note.id)
      : await supabase.from('care_notes').insert(payload)
    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-display font-semibold text-slate-800">{isNew ? 'Add Care Note' : 'Edit Note'}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{resident.first_name} {resident.last_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Date</label>
              <input type="date" value={form.note_date} onChange={e => set('note_date', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Shift</label>
              <div className="flex gap-1">
                {SHIFTS.map(s => (
                  <button key={s.key} onClick={() => set('shift', s.key)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-all ${form.shift === s.key ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {NOTE_CATEGORIES.map(c => (
                <button key={c.key} onClick={() => set('category', c.key)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${form.category === c.key ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-200 text-slate-600 hover:border-brand-300'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Note *</label>
            <textarea value={form.body} onChange={e => set('body', e.target.value)} rows={6}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Document your observations, interventions, and resident response..." />
            <div className="text-xs text-slate-400 mt-1 text-right">{form.body.length} chars</div>
          </div>

          <label className={`flex items-start gap-3 cursor-pointer p-3 rounded-xl border-2 transition-all ${form.is_flagged ? 'bg-red-50 border-red-300' : 'border-slate-200'}`}>
            <input type="checkbox" checked={form.is_flagged} onChange={e => set('is_flagged', e.target.checked)} className="w-4 h-4 rounded text-red-600 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-1.5 font-medium text-slate-800 text-sm">
                <Flag size={13} className={form.is_flagged ? 'text-red-500' : 'text-slate-400'} />
                Flag for supervisor review
              </div>
              {form.is_flagged && (
                <input value={form.flag_reason} onChange={e => set('flag_reason', e.target.value)}
                  className="mt-2 w-full px-3 py-1.5 border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                  placeholder="Reason for flagging..." />
              )}
            </div>
          </label>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving...' : isNew ? 'Add Note' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Resident Detail Panel ──────────────────────────────────────
function ResidentPanel({ resident, orgId, profile, canEdit }) {
  const [tab, setTab]       = useState('vitals')
  const [vitals, setVitals] = useState([])
  const [meds, setMeds]     = useState([])
  const [notes, setNotes]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showVitals, setShowVitals] = useState(false)
  const [showMed, setShowMed]     = useState(false)
  const [editMed, setEditMed]     = useState(null)
  const [showNote, setShowNote]   = useState(false)
  const [editNote, setEditNote]   = useState(null)

  useEffect(() => { fetchAll() }, [resident.id])

  async function fetchAll() {
    setLoading(true)
    const [v, m, n] = await Promise.all([
      supabase.from('resident_vitals').select('*, profiles(first_name,last_name)')
        .eq('resident_id', resident.id).order('recorded_at', { ascending: false }).limit(30),
      supabase.from('resident_medications').select('*')
        .eq('resident_id', resident.id).eq('is_active', true).order('name'),
      supabase.from('care_notes').select('*, profiles(first_name,last_name)')
        .eq('resident_id', resident.id).eq('is_active', true)
        .order('note_date', { ascending: false }).order('created_at', { ascending: false }).limit(50),
    ])
    setVitals(v.data || [])
    setMeds(m.data || [])
    setNotes(n.data || [])
    setLoading(false)
  }

  const latestVitals = vitals[0] || null
  const prevVitals   = vitals[1] || null

  // Spark data (last 10 readings)
  const bpSysData = vitals.slice(0, 10).reverse().map(v => v.bp_systolic).filter(Boolean)
  const weightData = vitals.slice(0, 10).reverse().map(v => v.weight).filter(Boolean)
  const o2Data     = vitals.slice(0, 10).reverse().map(v => v.o2_sat).filter(Boolean)

  const activeMeds = meds.filter(m => !m.end_date || m.end_date >= new Date().toISOString().split('T')[0])
  const prnMeds    = activeMeds.filter(m => m.is_prn)
  const scheduledMeds = activeMeds.filter(m => !m.is_prn)

  const todayStr = new Date().toISOString().split('T')[0]
  const todayNotes = notes.filter(n => n.note_date === todayStr)
  const flaggedNotes = notes.filter(n => n.is_flagged)

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Resident header */}
      <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0 bg-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-700 font-display font-bold">
            {resident.first_name?.[0]}
          </div>
          <div>
            <h2 className="font-display font-semibold text-slate-800">{resident.first_name} {resident.last_name}</h2>
            <p className="text-xs text-slate-400 capitalize">{resident.care_level?.replace('_',' ')} · Room {resident.room_number || '—'}</p>
          </div>
        </div>

        {/* Latest vitals summary bar */}
        {latestVitals && (
          <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50 rounded-xl text-xs">
            {[
              { label: 'BP', value: latestVitals.bp_systolic && latestVitals.bp_diastolic ? `${latestVitals.bp_systolic}/${latestVitals.bp_diastolic}` : '—', trend: null, special: bpClass(latestVitals.bp_systolic, latestVitals.bp_diastolic) },
              { label: 'Pulse', value: latestVitals.pulse ? `${latestVitals.pulse}` : '—', prev: prevVitals?.pulse, curr: latestVitals.pulse },
              { label: 'O₂', value: latestVitals.o2_sat ? `${latestVitals.o2_sat}%` : '—', prev: prevVitals?.o2_sat, curr: latestVitals.o2_sat, higherBetter: true },
              { label: 'Pain', value: latestVitals.pain_level != null ? `${latestVitals.pain_level}/10` : '—', special: latestVitals.pain_level >= 7 ? { color: 'text-red-600' } : latestVitals.pain_level >= 4 ? { color: 'text-amber-600' } : null },
            ].map(v => (
              <div key={v.label} className="text-center">
                <div className={`font-bold text-sm ${v.special?.color || 'text-slate-800'}`}>{v.value}</div>
                <div className="text-slate-400">{v.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 mt-3">
          {[
            { key: 'vitals', label: `Vitals${vitals.length ? ` (${vitals.length})` : ''}` },
            { key: 'meds',   label: `Medications (${activeMeds.length})` },
            { key: 'notes',  label: `Notes${flaggedNotes.length ? ` 🚩${flaggedNotes.length}` : notes.length ? ` (${notes.length})` : ''}` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === t.key ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="text-center py-10 text-slate-400 text-sm">Loading...</div>
        ) : (
          <>
            {/* ── VITALS TAB ── */}
            {tab === 'vitals' && (
              <div>
                {canEdit && (
                  <button onClick={() => setShowVitals(true)}
                    className="w-full mb-4 flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
                    <Plus size={15} /> Record Vitals
                  </button>
                )}

                {/* Trend charts */}
                {vitals.length >= 2 && (
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: 'BP Systolic', data: bpSysData, color: '#ef4444', unit: 'mmHg' },
                      { label: 'Weight',      data: weightData, color: '#8b5cf6', unit: 'lbs' },
                      { label: 'O₂ Sat',      data: o2Data,    color: '#22c55e', unit: '%' },
                    ].filter(c => c.data.length >= 2).map(chart => (
                      <div key={chart.label} className="bg-white border border-slate-100 rounded-xl p-3">
                        <div className="text-xs font-semibold text-slate-500 mb-2">{chart.label}</div>
                        <Sparkline data={chart.data} color={chart.color} />
                        <div className="text-xs text-slate-400 mt-1">{chart.data[chart.data.length-1]} {chart.unit}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Vitals history table */}
                {vitals.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">No vitals recorded yet.</div>
                ) : (
                  <div className="space-y-2">
                    {vitals.map((v, idx) => {
                      const shift = getShift(v.shift)
                      const bp    = bpClass(v.bp_systolic, v.bp_diastolic)
                      const prev  = vitals[idx + 1]
                      return (
                        <div key={v.id} className="bg-white border border-slate-100 rounded-2xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${shift.color}`}>{shift.label}</span>
                              <span className="text-xs text-slate-400">{fmtDateTime(v.recorded_at)}</span>
                              {v.profiles && <span className="text-xs text-slate-400">by {v.profiles.first_name} {v.profiles.last_name}</span>}
                            </div>
                            {v.pain_level != null && (
                              <span className={`text-xs font-bold ${v.pain_level >= 7 ? 'text-red-600' : v.pain_level >= 4 ? 'text-amber-600' : 'text-green-600'}`}>
                                Pain {v.pain_level}/10
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-xs">
                            {[
                              { label: 'BP', value: v.bp_systolic && v.bp_diastolic ? `${v.bp_systolic}/${v.bp_diastolic}` : null, extra: bp?.label, extraColor: bp?.color },
                              { label: 'Pulse', value: v.pulse ? `${v.pulse} bpm` : null },
                              { label: 'Temp', value: v.temperature ? `${v.temperature}°F` : null, alert: v.temperature >= 100.4 },
                              { label: 'Weight', value: v.weight ? `${v.weight} lbs` : null },
                              { label: 'O₂ Sat', value: v.o2_sat ? `${v.o2_sat}%` : null, alert: v.o2_sat < 94 },
                              { label: 'Blood Sugar', value: v.blood_sugar ? `${v.blood_sugar} mg/dL` : null, alert: v.blood_sugar > 180 || v.blood_sugar < 70 },
                              { label: 'Resp.', value: v.respirations ? `${v.respirations}/min` : null },
                            ].filter(f => f.value).map(f => (
                              <div key={f.label}>
                                <div className="text-slate-400">{f.label}</div>
                                <div className={`font-semibold ${f.alert ? 'text-red-600' : f.extraColor || 'text-slate-800'}`}>{f.value}</div>
                                {f.extra && <div className={`text-xs ${f.extraColor}`}>{f.extra}</div>}
                              </div>
                            ))}
                          </div>
                          {v.notes && <p className="mt-2 text-xs text-slate-500 italic border-t border-slate-50 pt-2">{v.notes}</p>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── MEDICATIONS TAB ── */}
            {tab === 'meds' && (
              <div>
                {canEdit && (
                  <button onClick={() => { setEditMed(null); setShowMed(true) }}
                    className="w-full mb-4 flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
                    <Plus size={15} /> Add Medication
                  </button>
                )}

                {activeMeds.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">No active medications on file.</div>
                ) : (
                  <div className="space-y-4">
                    {scheduledMeds.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Scheduled Medications</h3>
                        <div className="space-y-2">
                          {scheduledMeds.map(m => (
                            <div key={m.id} className="bg-white border border-slate-100 rounded-2xl p-4 hover:border-brand-200 transition-all">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1">
                                  <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <Pill size={15} className="text-blue-600" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-semibold text-slate-800 text-sm">{m.name} {m.dosage && <span className="font-normal text-slate-500">{m.dosage}</span>}</div>
                                    {m.generic_name && <div className="text-xs text-slate-400">{m.generic_name}</div>}
                                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-2">
                                      <span className="capitalize">{m.form} · {m.route?.toUpperCase()}</span>
                                      <span className="font-medium text-brand-600">{m.frequency}</span>
                                    </div>
                                    {m.indication && <div className="text-xs text-slate-400 mt-0.5">For: {m.indication}</div>}
                                    {m.prescriber && <div className="text-xs text-slate-400">Prescribed by: {m.prescriber}</div>}
                                    {m.start_date && <div className="text-xs text-slate-400">Since: {fmtDate(m.start_date)}</div>}
                                  </div>
                                </div>
                                {canEdit && (
                                  <div className="flex gap-1 flex-shrink-0">
                                    <button onClick={() => { setEditMed(m); setShowMed(true) }}
                                      className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg transition-colors"><Edit2 size={13} /></button>
                                    <button onClick={async () => {
                                      if (!confirm('Discontinue this medication?')) return
                                      await supabase.from('resident_medications').update({ is_active: false }).eq('id', m.id)
                                      fetchAll()
                                    }} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"><X size={13} /></button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {prnMeds.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">PRN (As Needed)</h3>
                        <div className="space-y-2">
                          {prnMeds.map(m => (
                            <div key={m.id} className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1">
                                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                                    <Pill size={15} className="text-amber-600" />
                                  </div>
                                  <div>
                                    <div className="font-semibold text-slate-800 text-sm">
                                      {m.name} {m.dosage && <span className="font-normal text-slate-500">{m.dosage}</span>}
                                      <span className="ml-2 text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-medium">PRN</span>
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5">{m.frequency}</div>
                                    {m.indication && <div className="text-xs text-slate-400">For: {m.indication}</div>}
                                  </div>
                                </div>
                                {canEdit && (
                                  <button onClick={() => { setEditMed(m); setShowMed(true) }}
                                    className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg transition-colors flex-shrink-0"><Edit2 size={13} /></button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── NOTES TAB ── */}
            {tab === 'notes' && (
              <div>
                {canEdit && (
                  <button onClick={() => { setEditNote(null); setShowNote(true) }}
                    className="w-full mb-4 flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
                    <Plus size={15} /> Add Care Note
                  </button>
                )}

                {notes.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">No care notes yet.</div>
                ) : (
                  <div className="space-y-3">
                    {notes.map(n => {
                      const shift = getShift(n.shift)
                      const cat   = getCat(n.category)
                      return (
                        <div key={n.id} className={`bg-white rounded-2xl border p-4 ${n.is_flagged ? 'border-red-200' : 'border-slate-100'}`}>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {n.is_flagged && <Flag size={12} className="text-red-500 flex-shrink-0" />}
                              <span className="text-xs font-semibold text-slate-700">{fmtDate(n.note_date)}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${shift.color}`}>{shift.label}</span>
                              <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{cat.label}</span>
                              {n.profiles && <span className="text-xs text-slate-400">{n.profiles.first_name} {n.profiles.last_name}</span>}
                            </div>
                            {canEdit && (
                              <div className="flex gap-1 flex-shrink-0">
                                <button onClick={() => { setEditNote(n); setShowNote(true) }}
                                  className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg transition-colors"><Edit2 size={13} /></button>
                                <button onClick={async () => {
                                  if (!confirm('Delete this note?')) return
                                  await supabase.from('care_notes').update({ is_active: false }).eq('id', n.id)
                                  fetchAll()
                                }} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"><X size={13} /></button>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed">{n.body}</p>
                          {n.is_flagged && n.flag_reason && (
                            <div className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                              <Flag size={10} /> {n.flag_reason}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showVitals && <VitalsModal resident={resident} orgId={orgId} profile={profile} onClose={() => setShowVitals(false)} onSaved={() => { setShowVitals(false); fetchAll() }} />}
      {showMed    && <MedModal    med={editMed}   resident={resident} orgId={orgId} profile={profile} onClose={() => { setShowMed(false); setEditMed(null) }} onSaved={() => { setShowMed(false); setEditMed(null); fetchAll() }} />}
      {showNote   && <NoteModal   note={editNote} resident={resident} orgId={orgId} profile={profile} onClose={() => { setShowNote(false); setEditNote(null) }} onSaved={() => { setShowNote(false); setEditNote(null); fetchAll() }} />}
    </div>
  )
}

// ── Main Nursing Notes Page ────────────────────────────────────
export default function NursingNotes() {
  const { profile, organization, canEdit } = useAuth()
  const [residents, setResidents]     = useState([])
  const [selected, setSelected]       = useState(null)
  const [search, setSearch]           = useState('')
  const [loading, setLoading]         = useState(true)
  const [todayStats, setTodayStats]   = useState({ vitalsToday: 0, notesToday: 0, flagged: 0 })

  const canEditNursing = canEdit('nursing') ||
    ['org_admin','ceo','super_admin','supervisor','manager','nursing'].includes(profile?.role)

  useEffect(() => { if (organization) fetchAll() }, [organization])

  async function fetchAll() {
    setLoading(true)
    const todayStr = new Date().toISOString().split('T')[0]
    const [resRes, statsRes] = await Promise.all([
      supabase.from('residents').select('id,first_name,last_name,room_number,care_level,is_active')
        .eq('organization_id', organization.id).eq('is_active', true)
        .order('last_name').order('first_name'),
      Promise.all([
        supabase.from('resident_vitals').select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .gte('recorded_at', todayStr + 'T00:00:00').lte('recorded_at', todayStr + 'T23:59:59'),
        supabase.from('care_notes').select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.id).eq('note_date', todayStr).eq('is_active', true),
        supabase.from('care_notes').select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.id).eq('is_flagged', true).eq('is_active', true),
      ])
    ])
    setResidents(resRes.data || [])
    setTodayStats({
      vitalsToday: statsRes[0].count || 0,
      notesToday:  statsRes[1].count || 0,
      flagged:     statsRes[2].count || 0,
    })
    setLoading(false)
  }

  const filtered = residents.filter(r =>
    !search || `${r.first_name} ${r.last_name} ${r.room_number}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto flex gap-6" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Left panel — resident list */}
      <div className="w-72 flex-shrink-0 flex flex-col">
        <div className="mb-4">
          <h1 className="font-display text-2xl font-semibold text-slate-800">Nursing Notes</h1>
          <p className="text-slate-500 text-sm mt-0.5">Vitals, medications, and care notes</p>
        </div>

        {/* Today's stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Vitals Today",  value: todayStats.vitalsToday, color: 'text-brand-600', bg: 'bg-brand-50' },
            { label: "Notes Today",   value: todayStats.notesToday,  color: 'text-green-600', bg: 'bg-green-50' },
            { label: "Flagged",       value: todayStats.flagged,     color: todayStats.flagged > 0 ? 'text-red-600' : 'text-slate-400', bg: todayStats.flagged > 0 ? 'bg-red-50' : 'bg-slate-100' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-2.5 text-center`}>
              <div className={`text-xl font-display font-bold ${s.color}`}>{s.value}</div>
              <div className="text-slate-400 text-xs leading-tight mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search residents..."
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>

        {/* Resident list */}
        <div className="flex-1 overflow-y-auto space-y-1">
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-sm">Loading...</div>
          ) : filtered.map(r => (
            <button key={r.id} onClick={() => setSelected(r)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${selected?.id === r.id ? 'bg-brand-600 text-white' : 'hover:bg-slate-100 text-slate-700'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${selected?.id === r.id ? 'bg-brand-500 text-white' : 'bg-brand-100 text-brand-700'}`}>
                {r.first_name?.[0]}{r.last_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold truncate ${selected?.id === r.id ? 'text-white' : 'text-slate-800'}`}>
                  {r.first_name} {r.last_name}
                </div>
                <div className={`text-xs truncate capitalize ${selected?.id === r.id ? 'text-brand-200' : 'text-slate-400'}`}>
                  {r.room_number ? `Room ${r.room_number} · ` : ''}{r.care_level?.replace('_',' ')}
                </div>
              </div>
            </button>
          ))}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">No residents found.</div>
          )}
        </div>
      </div>

      {/* Right panel — resident detail */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <Heart size={48} className="text-slate-200 mx-auto mb-4" />
              <p className="font-display text-lg text-slate-400">Select a resident</p>
              <p className="text-slate-400 text-sm mt-1">Choose a resident from the left to view vitals, medications, and care notes</p>
            </div>
          </div>
        ) : (
          <ResidentPanel
            key={selected.id}
            resident={selected}
            orgId={organization.id}
            profile={profile}
            canEdit={canEditNursing} />
        )}
      </div>
    </div>
  )
}
