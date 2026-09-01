import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Search, Plus, ChevronRight, User, Save, X, Check,
         Shield, Heart, Book, Loader2, AlertCircle, UserCheck, CalendarCheck, ClipboardCheck } from 'lucide-react'

const COGNITIVE_LEVELS = [
  { key: 'intact',              label: 'Intact' },
  { key: 'mild_impairment',     label: 'Mild Impairment' },
  { key: 'moderate_impairment', label: 'Moderate Impairment' },
  { key: 'severe_impairment',   label: 'Severe Impairment' },
]

const DIRECTIVE_TYPES = [
  { key: 'dnr',              label: 'DNR' },
  { key: 'polst',            label: 'POLST' },
  { key: 'living_will',      label: 'Living Will' },
  { key: 'healthcare_proxy', label: 'Healthcare Proxy' },
  { key: 'poa',              label: 'Power of Attorney' },
]

function TextArea({ label, value, onChange, rows = 3, readOnly, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
      <textarea
        value={value || ''} onChange={e => onChange(e.target.value)}
        rows={rows} readOnly={readOnly} placeholder={placeholder}
        className={`w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none transition-colors
          ${readOnly ? 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 cursor-default' : 'bg-white dark:bg-slate-800 dark:text-slate-100'}`} />
    </div>
  )
}

function FieldGroup({ title, icon: Icon, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
      <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <Icon size={15} className="text-brand-500" /> {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function ProfileEditor({ resident, orgId, profile: existingProfile, staff, canWrite, onSaved, onCancel }) {
  const { profile: authProfile } = useAuth()
  const [form, setForm] = useState({
    cognitive_level:             existingProfile?.cognitive_level || '',
    cognitive_notes:             existingProfile?.cognitive_notes || '',
    education_level:             existingProfile?.education_level || '',
    occupation_history:          existingProfile?.occupation_history || '',
    hobbies_interests:           existingProfile?.hobbies_interests || '',
    spiritual_religious:         existingProfile?.spiritual_religious || '',
    personality_notes:           existingProfile?.personality_notes || '',
    family_dynamics:             existingProfile?.family_dynamics || '',
    support_system:              existingProfile?.support_system || '',
    psychosocial_history:        existingProfile?.psychosocial_history || '',
    strengths:                   existingProfile?.strengths || '',
    goals:                       existingProfile?.goals || '',
    advance_directive_on_file:   existingProfile?.advance_directive_on_file || false,
    advance_directive_types:     existingProfile?.advance_directive_types || [],
    advance_directive_location:  existingProfile?.advance_directive_location || '',
    legal_guardian:              existingProfile?.legal_guardian || '',
    legal_guardian_phone:        existingProfile?.legal_guardian_phone || '',
    legal_guardian_relationship: existingProfile?.legal_guardian_relationship || '',
    assigned_to:                 existingProfile?.assigned_to || '',
    last_reviewed_at:            existingProfile?.last_reviewed_at || '',
    review_due_date:             existingProfile?.review_due_date || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleDirective = (key) => {
    const current = form.advance_directive_types || []
    set('advance_directive_types', current.includes(key) ? current.filter(k => k !== key) : [...current, key])
  }

  const readOnly = !canWrite

  const markReviewed = () => {
    if (readOnly) return
    const today = new Date()
    const due = new Date(today); due.setDate(due.getDate() + 365)
    // Local calendar date, not toISOString() — that converts to UTC first and
    // silently rolls to the wrong day for several hours around local midnight.
    const toLocalDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    setForm(f => ({ ...f, last_reviewed_at: toLocalDate(today), review_due_date: toLocalDate(due) }))
  }

  const handleSave = async () => {
    setSaving(true); setError('')
    const payload = {
      ...form,
      cognitive_level:  form.cognitive_level || null,
      assigned_to:      form.assigned_to || null,
      last_reviewed_at: form.last_reviewed_at || null,
      review_due_date:  form.review_due_date || null,
      organization_id: orgId,
      resident_id:     resident.id,
      updated_by:      authProfile?.id,
      updated_at:      new Date().toISOString(),
    }
    let err
    if (existingProfile?.id) {
      const { error: e } = await supabase.from('ss_social_profiles').update(payload).eq('id', existingProfile.id)
      err = e
    } else {
      const { error: e } = await supabase.from('ss_social_profiles').insert({ ...payload, created_by: authProfile?.id })
      err = e
    }
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-400 text-sm">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Case Management */}
      <FieldGroup title="Case Management & Review" icon={ClipboardCheck}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <UserCheck size={12} /> Assigned Social Worker
            </label>
            <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} disabled={readOnly}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 dark:text-slate-100">
              <option value="">Unassigned</option>
              {(staff || []).map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <CalendarCheck size={12} /> Review Due Date
            </label>
            <input type="date" value={form.review_due_date} onChange={e => set('review_due_date', e.target.value)} disabled={readOnly}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 dark:text-slate-100" />
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs text-slate-400">
            {form.last_reviewed_at ? `Last reviewed ${new Date(form.last_reviewed_at + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Not yet reviewed'}
          </div>
          {!readOnly && (
            <button onClick={markReviewed} type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 rounded-lg text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors">
              <Check size={12} /> Mark Reviewed Today
            </button>
          )}
        </div>
      </FieldGroup>

      {/* Cognitive */}
      <FieldGroup title="Cognitive & Functional Status" icon={Book}>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Cognitive Level</label>
          <div className="flex gap-2 flex-wrap">
            {COGNITIVE_LEVELS.map(l => (
              <button key={l.key} onClick={() => !readOnly && set('cognitive_level', l.key)} disabled={readOnly}
                className={`px-3 py-1.5 rounded-xl text-sm border font-medium transition-all
                  ${form.cognitive_level === l.key
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-brand-300'}`}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <TextArea label="Cognitive Notes" value={form.cognitive_notes} onChange={v => set('cognitive_notes', v)} readOnly={readOnly} />
      </FieldGroup>

      {/* Background */}
      <FieldGroup title="Personal Background" icon={User}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextArea label="Education Level" value={form.education_level} onChange={v => set('education_level', v)} rows={2} readOnly={readOnly} placeholder="e.g. High school, Bachelor's degree" />
          <TextArea label="Occupation History" value={form.occupation_history} onChange={v => set('occupation_history', v)} rows={2} readOnly={readOnly} placeholder="Career / work background" />
        </div>
        <TextArea label="Hobbies & Interests" value={form.hobbies_interests} onChange={v => set('hobbies_interests', v)} readOnly={readOnly} placeholder="Activities they enjoy or enjoyed" />
        <TextArea label="Spiritual / Religious Preferences" value={form.spiritual_religious} onChange={v => set('spiritual_religious', v)} readOnly={readOnly} placeholder="Faith background, worship preferences, chaplain request" />
        <TextArea label="Personality & Social Preferences" value={form.personality_notes} onChange={v => set('personality_notes', v)} readOnly={readOnly} placeholder="Disposition, introvert/extrovert, social comfort level" />
      </FieldGroup>

      {/* Family & Support */}
      <FieldGroup title="Family & Support System" icon={Heart}>
        <TextArea label="Family Dynamics" value={form.family_dynamics} onChange={v => set('family_dynamics', v)} readOnly={readOnly} placeholder="Family structure, involvement level, key relationships" />
        <TextArea label="Support System" value={form.support_system} onChange={v => set('support_system', v)} readOnly={readOnly} placeholder="Who is actively involved in care decisions" />
      </FieldGroup>

      {/* Clinical */}
      <FieldGroup title="Psycho-Social Assessment" icon={Book}>
        <TextArea label="Psycho-Social History" value={form.psychosocial_history} onChange={v => set('psychosocial_history', v)} rows={5} readOnly={readOnly} placeholder="Full psycho-social narrative including life history, significant events, mental health history" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextArea label="Strengths & Abilities" value={form.strengths} onChange={v => set('strengths', v)} readOnly={readOnly} placeholder="What the resident does well" />
          <TextArea label="Social / Emotional Goals" value={form.goals} onChange={v => set('goals', v)} readOnly={readOnly} placeholder="Goals for social engagement, emotional wellbeing" />
        </div>
      </FieldGroup>

      {/* Advance Directives */}
      <FieldGroup title="Advance Directives & Legal" icon={Shield}>
        <div className="flex items-center gap-3">
          <button onClick={() => !readOnly && set('advance_directive_on_file', !form.advance_directive_on_file)} disabled={readOnly}
            className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0
              ${form.advance_directive_on_file ? 'bg-brand-600' : 'bg-slate-200'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
              ${form.advance_directive_on_file ? 'translate-x-5' : ''}`} />
          </button>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Advance Directive on File</span>
        </div>

        {form.advance_directive_on_file && (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Document Types</label>
              <div className="flex gap-2 flex-wrap">
                {DIRECTIVE_TYPES.map(d => (
                  <button key={d.key} onClick={() => !readOnly && toggleDirective(d.key)} disabled={readOnly}
                    className={`px-3 py-1.5 rounded-xl text-sm border font-medium transition-all
                      ${(form.advance_directive_types || []).includes(d.key)
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-green-300'}`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <TextArea label="Document Location" value={form.advance_directive_location} onChange={v => set('advance_directive_location', v)} rows={2} readOnly={readOnly} placeholder="Where is the document stored?" />
          </>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Legal Guardian</label>
            <input value={form.legal_guardian || ''} onChange={e => set('legal_guardian', e.target.value)} readOnly={readOnly}
              placeholder="Full name" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Phone</label>
            <input value={form.legal_guardian_phone || ''} onChange={e => set('legal_guardian_phone', e.target.value)} readOnly={readOnly}
              placeholder="(555) 000-0000" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Relationship</label>
            <input value={form.legal_guardian_relationship || ''} onChange={e => set('legal_guardian_relationship', e.target.value)} readOnly={readOnly}
              placeholder="e.g. Daughter" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </div>
      </FieldGroup>

      {/* Footer */}
      {canWrite && (
        <div className="flex justify-end gap-3 pt-2">
          {onCancel && (
            <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 font-medium">Cancel</button>
          )}
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-colors">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving...' : existingProfile ? 'Save Changes' : 'Create Profile'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function SocialProfile({ canWrite }) {
  const { organization } = useAuth()
  const [residents,  setResidents]  = useState([])
  const [staff,      setStaff]      = useState([])
  const [search,     setSearch]     = useState('')
  const [selected,   setSelected]   = useState(null)
  const [ssProfile,  setSsProfile]  = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [profLoading,setProfLoading] = useState(false)

  useEffect(() => { fetchResidents() }, [])

  async function fetchResidents() {
    setLoading(true)
    const [{ data }, { data: staffData }] = await Promise.all([
      supabase.from('residents')
        .select('id, first_name, last_name, room, care_level')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('last_name'),
      supabase.from('profiles').select('id, first_name, last_name')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .in('role', ['social_services', 'supervisor', 'manager', 'org_admin', 'ceo'])
        .order('last_name'),
    ])
    setStaff(staffData || [])
    setResidents(data || [])
    setLoading(false)
  }

  async function selectResident(r) {
    setSelected(r); setSsProfile(null); setProfLoading(true)
    const { data } = await supabase.from('ss_social_profiles')
      .select('*').eq('resident_id', r.id).limit(1)
    setSsProfile(data?.[0] || null)
    setProfLoading(false)
  }

  const filtered = residents.filter(r =>
    `${r.first_name} ${r.last_name} ${r.room}`.toLowerCase().includes(search.toLowerCase())
  )

  const CARE_COLORS = {
    independent:     'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400',
    assisted:        'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
    memory_care:     'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400',
    skilled_nursing: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400',
    rehab:           'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400',
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Resident list */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search residents..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: 600 }}>
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading residents...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No residents found</div>
          ) : filtered.map(r => (
            <button key={r.id} onClick={() => selectResident(r)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors
                ${selected?.id === r.id ? 'bg-brand-50 border-l-2 border-l-brand-500' : ''}`}>
              <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm flex-shrink-0">
                {r.first_name[0]}{r.last_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 dark:text-slate-100 text-sm truncate">{r.first_name} {r.last_name}</div>
                <div className="text-xs text-slate-400">Room {r.room}</div>
              </div>
              <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Profile panel */}
      <div className="lg:col-span-2">
        {!selected ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm h-64 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <User size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Select a resident to view their social profile</p>
            </div>
          </div>
        ) : profLoading ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm h-64 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-brand-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resident header */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm px-5 py-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-lg">
                {selected.first_name[0]}{selected.last_name[0]}
              </div>
              <div>
                <h2 className="font-display font-bold text-slate-800 dark:text-slate-100 text-lg">{selected.first_name} {selected.last_name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-400">Room {selected.room}</span>
                  {selected.care_level && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CARE_COLORS[selected.care_level] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                      {selected.care_level.replace(/_/g, ' ')}
                    </span>
                  )}
                  {ssProfile ? (
                    <span className="text-xs text-green-600 bg-green-50 dark:bg-green-950/50 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">Profile on file</span>
                  ) : (
                    <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">No profile yet</span>
                  )}
                  {ssProfile?.review_due_date && (() => {
                    const days = Math.floor((new Date(ssProfile.review_due_date) - new Date()) / (1000 * 60 * 60 * 24))
                    if (days < 0) return <span className="text-xs text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">Review overdue</span>
                    if (days <= 30) return <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">Review due in {days}d</span>
                    return null
                  })()}
                </div>
              </div>
            </div>

            <ProfileEditor
              resident={selected}
              orgId={organization.id}
              profile={ssProfile}
              staff={staff}
              canWrite={canWrite}
              onSaved={() => selectResident(selected)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
