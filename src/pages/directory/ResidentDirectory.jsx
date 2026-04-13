import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, X, Edit2, Trash2, Search, Printer, Phone,
  Mail, MapPin, User, Heart, Stethoscope, Calendar,
  ChevronRight, Upload, Camera, Shield, Building2,
  AlertTriangle, Check
} from 'lucide-react'

const CARE_LEVELS = [
  { key: 'independent',    label: 'Independent Living',  color: 'bg-green-100 text-green-700 border-green-200' },
  { key: 'assisted',       label: 'Assisted Living',     color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { key: 'memory_care',    label: 'Memory Care',         color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { key: 'skilled_nursing',label: 'Skilled Nursing',     color: 'bg-orange-100 text-orange-700 border-orange-200' },
]

const MEDICAL_TYPES = [
  { key: 'physician',   label: 'Primary Physician' },
  { key: 'specialist',  label: 'Specialist' },
  { key: 'dentist',     label: 'Dentist' },
  { key: 'pharmacy',    label: 'Pharmacy' },
  { key: 'hospital',    label: 'Hospital' },
  { key: 'other',       label: 'Other' },
]

const getCareLevel = (key) => CARE_LEVELS.find(c => c.key === key) || CARE_LEVELS[0]

const calcAge = (dob) => {
  if (!dob) return null
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

// ── Resident Print Card ────────────────────────────────────────
function PrintResidentCard({ resident, emergencyContacts, medicalContacts, orgName, onClose }) {
  const printRef = useRef()
  const handlePrint = () => {
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>${resident.first_name} ${resident.last_name} — Resident Profile</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;font-size:12px;max-width:700px;margin:0 auto}
        h2{margin:0;font-size:18px;color:#1e293b}
        .sub{color:#64748b;font-size:12px;margin-bottom:16px}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .section{margin-bottom:14px}
        .section-title{font-weight:bold;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:3px;margin-bottom:8px}
        .row{display:flex;gap:8px;margin-bottom:4px}
        .label{color:#94a3b8;min-width:100px;font-size:11px}
        .contact{border:1px solid #e2e8f0;border-radius:6px;padding:8px;margin-bottom:6px}
        .primary{border-color:#0c90e1;background:#f0f9ff}
        @media print{button{display:none}}
      </style></head>
      <body>
        <h2>${resident.first_name} ${resident.last_name}</h2>
        <div class="sub">${orgName} · ${getCareLevel(resident.care_level).label}${resident.room ? ` · Room ${resident.room}` : ''}${resident.unit ? ` · Unit ${resident.unit}` : ''}</div>
        <div class="grid">
          <div>
            <div class="section">
              <div class="section-title">Personal Information</div>
              ${resident.date_of_birth ? `<div class="row"><span class="label">Date of Birth</span><span>${new Date(resident.date_of_birth + 'T12:00:00').toLocaleDateString()} (Age ${calcAge(resident.date_of_birth)})</span></div>` : ''}
              ${resident.phone ? `<div class="row"><span class="label">Phone</span><span>${resident.phone}</span></div>` : ''}
              ${resident.admission_date ? `<div class="row"><span class="label">Admission</span><span>${new Date(resident.admission_date + 'T12:00:00').toLocaleDateString()}</span></div>` : ''}
              ${resident.building ? `<div class="row"><span class="label">Building</span><span>${resident.building}</span></div>` : ''}
            </div>
          </div>
          <div>
            <div class="section">
              <div class="section-title">Emergency Contacts</div>
              ${emergencyContacts.map(c => `
                <div class="contact ${c.is_primary ? 'primary' : ''}">
                  <strong>${c.name}</strong>${c.relationship ? ` (${c.relationship})` : ''}${c.is_primary ? ' ★ Primary' : ''}<br>
                  ${c.phone ? `📞 ${c.phone}` : ''}${c.alt_phone ? ` / ${c.alt_phone}` : ''}
                  ${c.email ? `<br>✉ ${c.email}` : ''}
                </div>`).join('') || '<p style="color:#94a3b8;font-size:11px">No emergency contacts on file</p>'}
            </div>
          </div>
        </div>
        <div class="section">
          <div class="section-title">Medical Contacts</div>
          <div class="grid">
            ${medicalContacts.map(c => `
              <div class="contact">
                <strong>${c.name}</strong> — ${MEDICAL_TYPES.find(t=>t.key===c.contact_type)?.label || c.contact_type}<br>
                ${c.practice ? `${c.practice}<br>` : ''}
                ${c.phone ? `📞 ${c.phone}` : ''}
                ${c.address ? `<br>📍 ${c.address}` : ''}
              </div>`).join('') || '<p style="color:#94a3b8;font-size:11px">No medical contacts on file</p>'}
          </div>
        </div>
        <div style="margin-top:16px;font-size:10px;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0;padding-top:8px">
          CONFIDENTIAL — ElderLoop Resident Directory · ${orgName} · Printed ${new Date().toLocaleDateString()}
        </div>
      </body></html>`)
    win.document.close()
    win.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-display font-semibold text-slate-800">Print Resident Profile</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl mb-4">
            <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-display font-bold text-lg flex-shrink-0">
              {resident.first_name[0]}
            </div>
            <div>
              <div className="font-semibold text-slate-800">{resident.first_name} {resident.last_name}</div>
              <div className="text-xs text-slate-400">{getCareLevel(resident.care_level).label}{resident.room ? ` · Room ${resident.room}` : ''}</div>
            </div>
          </div>
          <div className="text-xs text-slate-500 space-y-1">
            <div className="flex justify-between"><span>Emergency contacts</span><span className="font-medium">{emergencyContacts.length}</span></div>
            <div className="flex justify-between"><span>Medical contacts</span><span className="font-medium">{medicalContacts.length}</span></div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors">
            <Printer size={15} /> Print Profile
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Resident Detail / Edit ─────────────────────────────────────
function ResidentDetail({ resident, onClose, onSave }) {
  const { profile } = useAuth()
  const fileRef = useRef()
  const isNew = !resident

  const [form, setForm] = useState({
    first_name:     resident?.first_name     || '',
    middle_name:    resident?.middle_name    || '',
    last_name:      resident?.last_name      || '',
    date_of_birth:  resident?.date_of_birth  || '',
    phone:          resident?.phone          || '',
    room:           resident?.room           || '',
    unit:           resident?.unit           || '',
    building:       resident?.building       || '',
    admission_date: resident?.admission_date || '',
    care_level:     resident?.care_level     || 'independent',
    photo_url:      resident?.photo_url      || '',
  })
  const [emergencyContacts, setEmergencyContacts] = useState([])
  const [medicalContacts, setMedicalContacts]     = useState([])
  const [tab, setTab]         = useState('info')
  const [saving, setSaving]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError]     = useState('')
  const [showPrint, setShowPrint] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (resident?.id) {
      fetchContacts()
    }
  }, [resident?.id])

  async function fetchContacts() {
    const [ecRes, mcRes] = await Promise.all([
      supabase.from('resident_emergency_contacts').select('*').eq('resident_id', resident.id).order('is_primary', { ascending: false }).order('sort_order'),
      supabase.from('resident_medical_contacts').select('*').eq('resident_id', resident.id).order('sort_order'),
    ])
    setEmergencyContacts(ecRes.data || [])
    setMedicalContacts(mcRes.data || [])
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `residents/${profile.organization_id}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('announcement-images').upload(path, file)
    if (upErr) { setError('Photo upload failed'); setUploading(false); return }
    const { data } = supabase.storage.from('announcement-images').getPublicUrl(path)
    set('photo_url', data.publicUrl)
    setUploading(false)
  }

  const handleSaveInfo = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) { setError('First and last name required'); return }
    setSaving(true)
    const payload = {
      ...form,
      organization_id: profile.organization_id,
      date_of_birth:  form.date_of_birth  || null,
      admission_date: form.admission_date || null,
      is_active: true,
    }
    let err, data
    if (resident?.id) {
      ({ error: err } = await supabase.from('residents').update(payload).eq('id', resident.id))
    } else {
      ({ data, error: err } = await supabase.from('residents').insert(payload).select().single())
    }
    if (err) { setError(err.message); setSaving(false); return }
    setSaving(false)
    onSave(data?.id || resident?.id)
  }

  // Emergency contact helpers
  const addEmergencyContact = async () => {
    if (!resident?.id) { await handleSaveInfo(); return }
    await supabase.from('resident_emergency_contacts').insert({
      resident_id: resident.id, name: 'New Contact',
      is_primary: emergencyContacts.length === 0, sort_order: emergencyContacts.length
    })
    fetchContacts()
  }

  const updateEC = async (id, field, val) => {
    await supabase.from('resident_emergency_contacts').update({ [field]: val }).eq('id', id)
    fetchContacts()
  }

  const deleteEC = async (id) => {
    await supabase.from('resident_emergency_contacts').delete().eq('id', id)
    fetchContacts()
  }

  const setPrimaryEC = async (id) => {
    await supabase.from('resident_emergency_contacts').update({ is_primary: false }).eq('resident_id', resident.id)
    await supabase.from('resident_emergency_contacts').update({ is_primary: true }).eq('id', id)
    fetchContacts()
  }

  // Medical contact helpers
  const addMedicalContact = async () => {
    if (!resident?.id) return
    await supabase.from('resident_medical_contacts').insert({
      resident_id: resident.id, name: 'New Contact',
      contact_type: 'physician', sort_order: medicalContacts.length
    })
    fetchContacts()
  }

  const updateMC = async (id, field, val) => {
    await supabase.from('resident_medical_contacts').update({ [field]: val }).eq('id', id)
    fetchContacts()
  }

  const deleteMC = async (id) => {
    await supabase.from('resident_medical_contacts').delete().eq('id', id)
    fetchContacts()
  }

  const age = calcAge(form.date_of_birth)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {form.photo_url ? (
              <img src={form.photo_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-display font-bold flex-shrink-0">
                {form.first_name?.[0] || '?'}
              </div>
            )}
            <div>
              <h2 className="font-display font-semibold text-slate-800">
                {isNew ? 'Add Resident' : `${form.first_name} ${form.last_name}`}
              </h2>
              {!isNew && age && <p className="text-xs text-slate-400">Age {age}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isNew && (
              <button onClick={() => setShowPrint(true)}
                className="p-2 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors">
                <Printer size={16} />
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 border-b border-slate-100 flex-shrink-0">
          {[
            { key: 'info',      label: 'Info',              icon: User },
            { key: 'emergency', label: 'Emergency Contacts', icon: AlertTriangle },
            { key: 'medical',   label: 'Medical Contacts',  icon: Stethoscope },
          ].map(t => {
            const Icon = t.icon
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                <Icon size={14} />{t.label}
              </button>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          {/* INFO TAB */}
          {tab === 'info' && (
            <div className="space-y-4">
              {/* Photo */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  {form.photo_url ? (
                    <img src={form.photo_url} alt="" className="w-20 h-20 rounded-2xl object-cover border border-slate-200" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-700 font-display font-bold text-3xl border border-slate-200">
                      {form.first_name?.[0] || '?'}
                    </div>
                  )}
                  <button onClick={() => fileRef.current.click()}
                    className="absolute -bottom-2 -right-2 w-7 h-7 bg-brand-600 text-white rounded-full flex items-center justify-center shadow hover:bg-brand-700 transition-colors">
                    <Camera size={13} />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </div>
                <div className="text-xs text-slate-400">
                  {uploading ? 'Uploading...' : 'Click the camera to upload a photo'}
                </div>
              </div>

              {/* Name */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">First Name *</label>
                  <input value={form.first_name} onChange={e => set('first_name', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Middle</label>
                  <input value={form.middle_name} onChange={e => set('middle_name', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Last Name *</label>
                  <input value={form.last_name} onChange={e => set('last_name', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>

              {/* DOB + Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Date of Birth</label>
                  <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  {age && <p className="text-xs text-slate-400 mt-1">Age {age}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Phone</label>
                  <input value={form.phone} onChange={e => set('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Resident's phone" />
                </div>
              </div>

              {/* Location */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Room</label>
                  <input value={form.room} onChange={e => set('room', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Unit</label>
                  <input value={form.unit} onChange={e => set('unit', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Building</label>
                  <input value={form.building} onChange={e => set('building', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>

              {/* Care level + Admission */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Care Level</label>
                  <div className="space-y-1.5">
                    {CARE_LEVELS.map(c => (
                      <button key={c.key} onClick={() => set('care_level', c.key)}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${form.care_level === c.key ? c.color + ' ring-2 ring-offset-1 ring-brand-400' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Admission Date</label>
                  <input type="date" value={form.admission_date} onChange={e => set('admission_date', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
            </div>
          )}

          {/* EMERGENCY CONTACTS TAB */}
          {tab === 'emergency' && (
            <div className="space-y-3">
              {isNew && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                  Save the resident info first before adding contacts.
                </div>
              )}
              {emergencyContacts.map(c => (
                <div key={c.id} className={`p-4 rounded-2xl border ${c.is_primary ? 'bg-brand-50 border-brand-200' : 'bg-white border-slate-100'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Heart size={14} className={c.is_primary ? 'text-brand-600' : 'text-slate-400'} />
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        {c.is_primary ? 'Primary Contact' : 'Contact'}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {!c.is_primary && (
                        <button onClick={() => setPrimaryEC(c.id)}
                          className="text-xs px-2 py-1 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                          Set Primary
                        </button>
                      )}
                      <button onClick={() => deleteEC(c.id)} className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={c.name} onChange={e => updateEC(c.id, 'name', e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Full name" />
                    <input value={c.relationship || ''} onChange={e => updateEC(c.id, 'relationship', e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Relationship (e.g. Son, Daughter)" />
                    <input value={c.phone || ''} onChange={e => updateEC(c.id, 'phone', e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Primary phone" />
                    <input value={c.alt_phone || ''} onChange={e => updateEC(c.id, 'alt_phone', e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Alt phone" />
                    <input value={c.email || ''} onChange={e => updateEC(c.id, 'email', e.target.value)}
                      className="col-span-2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Email address" />
                  </div>
                </div>
              ))}
              {!isNew && (
                <button onClick={addEmergencyContact}
                  className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-sm text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors flex items-center justify-center gap-2">
                  <Plus size={15} /> Add Emergency Contact
                </button>
              )}
            </div>
          )}

          {/* MEDICAL CONTACTS TAB */}
          {tab === 'medical' && (
            <div className="space-y-3">
              {isNew && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                  Save the resident info first before adding contacts.
                </div>
              )}
              {medicalContacts.map(c => (
                <div key={c.id} className="p-4 bg-white rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <Stethoscope size={14} className="text-slate-400" />
                    <button onClick={() => deleteMC(c.id)} className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={13} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={c.contact_type} onChange={e => updateMC(c.id, 'contact_type', e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                      {MEDICAL_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                    <input value={c.name} onChange={e => updateMC(c.id, 'name', e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Doctor / provider name" />
                    <input value={c.practice || ''} onChange={e => updateMC(c.id, 'practice', e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Practice / clinic name" />
                    <input value={c.phone || ''} onChange={e => updateMC(c.id, 'phone', e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Phone" />
                    <input value={c.address || ''} onChange={e => updateMC(c.id, 'address', e.target.value)}
                      className="col-span-2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Address" />
                    <input value={c.notes || ''} onChange={e => updateMC(c.id, 'notes', e.target.value)}
                      className="col-span-2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Notes" />
                  </div>
                </div>
              ))}
              {!isNew && (
                <button onClick={addMedicalContact}
                  className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-sm text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors flex items-center justify-center gap-2">
                  <Plus size={15} /> Add Medical Contact
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer — only show save on info tab */}
        {tab === 'info' && (
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
            <button onClick={handleSaveInfo} disabled={saving}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
              {saving ? 'Saving...' : isNew ? 'Add Resident' : 'Save Changes'}
            </button>
          </div>
        )}
        {tab !== 'info' && (
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end flex-shrink-0">
            <button onClick={onClose} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors">Done</button>
          </div>
        )}
      </div>

      {showPrint && resident && (
        <PrintResidentCard
          resident={{ ...resident, ...form }}
          emergencyContacts={emergencyContacts}
          medicalContacts={medicalContacts}
          orgName=""
          onClose={() => setShowPrint(false)} />
      )}
    </div>
  )
}

// ── Main Directory Page ────────────────────────────────────────
export default function ResidentDirectory() {
  const { organization } = useAuth()
  const [residents, setResidents]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterCare, setFilterCare] = useState('all')
  const [selected, setSelected]     = useState(null)
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => { if (organization) fetchResidents() }, [organization])

  async function fetchResidents() {
    setLoading(true)
    const { data } = await supabase.from('residents')
      .select('*, resident_emergency_contacts(id, name, is_primary, phone, relationship)')
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .order('last_name').order('first_name')
    setResidents(data || [])
    setLoading(false)
  }

  const handleOpen   = (r) => { setSelected(r); setShowDetail(true) }
  const handleNew    = () => { setSelected(null); setShowDetail(true) }
  const handleSave   = () => { setShowDetail(false); setSelected(null); fetchResidents() }
  const handleDelete = async (id) => {
    if (!confirm('Remove this resident from the directory?')) return
    await supabase.from('residents').update({ is_active: false }).eq('id', id)
    fetchResidents()
  }

  const filtered = residents.filter(r => {
    const matchSearch = !search || `${r.first_name} ${r.last_name} ${r.room} ${r.unit}`.toLowerCase().includes(search.toLowerCase())
    const matchCare   = filterCare === 'all' || r.care_level === filterCare
    return matchSearch && matchCare
  })

  // Group by care level
  const grouped = CARE_LEVELS.reduce((acc, c) => {
    const group = filtered.filter(r => (r.care_level || 'independent') === c.key)
    if (group.length) acc[c.key] = group
    return acc
  }, {})

  const stats = CARE_LEVELS.reduce((acc, c) => {
    acc[c.key] = residents.filter(r => (r.care_level || 'independent') === c.key).length
    return acc
  }, {})

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800">Resident Directory</h1>
          <p className="text-slate-500 text-sm mt-0.5">{residents.length} resident{residents.length !== 1 ? 's' : ''} on file</p>
        </div>
        <button onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={15} /> Add Resident
        </button>
      </div>

      {/* Care level stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {CARE_LEVELS.map(c => (
          <button key={c.key} onClick={() => setFilterCare(filterCare === c.key ? 'all' : c.key)}
            className={`rounded-2xl p-4 text-left transition-all border-2 ${filterCare === c.key ? 'ring-2 ring-brand-400 border-brand-400' : 'border-transparent'} ${c.color.replace('text-', 'border-transparent bg-').split(' ')[0]}`}
            style={{ background: '' }}>
            <div className={`text-3xl font-display font-bold ${c.color.split(' ')[1]}`}>{stats[c.key] || 0}</div>
            <div className="text-slate-500 text-xs mt-1">{c.label}</div>
          </button>
        ))}
      </div>

      {/* Care level filter chips + search */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, room, or unit..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <button onClick={() => setFilterCare('all')}
          className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${filterCare === 'all' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-slate-200 text-slate-600'}`}>
          All
        </button>
        {CARE_LEVELS.map(c => (
          <button key={c.key} onClick={() => setFilterCare(filterCare === c.key ? 'all' : c.key)}
            className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${filterCare === c.key ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-slate-200 text-slate-600'}`}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <User size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-display text-lg">No residents found</p>
          <p className="text-sm mt-1">Click "Add Resident" to build the directory.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(grouped).map(careKey => {
            const careLevel = getCareLevel(careKey)
            return (
              <div key={careKey}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border ${careLevel.color}`}>{careLevel.label}</span>
                  <span className="text-xs text-slate-400">{grouped[careKey].length} resident{grouped[careKey].length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {grouped[careKey].map(r => {
                    const primaryContact = r.resident_emergency_contacts?.find(c => c.is_primary) || r.resident_emergency_contacts?.[0]
                    const age = calcAge(r.date_of_birth)
                    return (
                      <div key={r.id}
                        onClick={() => handleOpen(r)}
                        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-brand-200 transition-all group">
                        <div className="flex items-start gap-3">
                          {r.photo_url ? (
                            <img src={r.photo_url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center text-brand-700 font-display font-bold text-xl flex-shrink-0">
                              {r.first_name[0]}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-display font-semibold text-slate-800 group-hover:text-brand-700 transition-colors">
                              {r.first_name} {r.last_name}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {[r.room && `Room ${r.room}`, r.unit && `Unit ${r.unit}`, age && `Age ${age}`].filter(Boolean).join(' · ')}
                            </div>
                          </div>
                          <ChevronRight size={15} className="text-slate-300 group-hover:text-brand-400 flex-shrink-0 mt-1 transition-colors" />
                        </div>

                        {r.phone && (
                          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-slate-500">
                            <Phone size={11} className="text-slate-400" />{r.phone}
                          </div>
                        )}

                        {primaryContact && (
                          <div className="mt-2 pt-2 border-t border-slate-50">
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <Heart size={11} className="text-red-400 flex-shrink-0" />
                              <span className="truncate">{primaryContact.name}{primaryContact.relationship ? ` (${primaryContact.relationship})` : ''}</span>
                              {primaryContact.phone && <span className="text-slate-300 flex-shrink-0">· {primaryContact.phone}</span>}
                            </div>
                          </div>
                        )}

                        {!primaryContact && (
                          <div className="mt-2 pt-2 border-t border-slate-50">
                            <div className="flex items-center gap-1 text-xs text-amber-500">
                              <AlertTriangle size={11} /> No emergency contact on file
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showDetail && (
        <ResidentDetail
          resident={selected}
          onClose={() => { setShowDetail(false); setSelected(null) }}
          onSave={handleSave} />
      )}
    </div>
  )
}
