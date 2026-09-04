import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Plus, X, ClipboardList, Search, Loader2, AlertCircle, Check,
         Phone, Users, Mail, MessageSquare, ChevronDown, ShieldCheck } from 'lucide-react'

const CONTACT_TYPES = [
  { key: 'in_person',     label: 'In Person',     icon: Users },
  { key: 'phone_call',    label: 'Phone Call',    icon: Phone },
  { key: 'family_meeting',label: 'Family Meeting',icon: Users },
  { key: 'email',         label: 'Email',         icon: Mail },
  { key: 'other',         label: 'Other',         icon: MessageSquare },
]

const getContactType = (key) => CONTACT_TYPES.find(c => c.key === key) || CONTACT_TYPES[0]
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
const inputCls = 'w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 dark:text-slate-100'

function CaseNoteModal({ note, residents, orgId, canWrite, onClose, onSaved }) {
  const { profile } = useAuth()
  const isNew = !note
  const [form, setForm] = useState({
    resident_id:       note?.resident_id       || '',
    contact_date:       note?.contact_date       || today(),
    contact_type:       note?.contact_type       || 'in_person',
    duration_minutes:   note?.duration_minutes   || '',
    summary:             note?.summary             || '',
    follow_up_needed:   note?.follow_up_needed   || false,
    follow_up_date:      note?.follow_up_date      || '',
    documented_in_emr:  note?.documented_in_emr  || false,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const readOnly = !canWrite

  const handleSave = async () => {
    if (!form.resident_id) { setError('Resident is required.'); return }
    if (!form.summary.trim()) { setError('Summary is required.'); return }
    setSaving(true); setError('')
    const payload = {
      ...form,
      organization_id:   orgId,
      duration_minutes:   form.duration_minutes ? parseInt(form.duration_minutes) : null,
      follow_up_date:      form.follow_up_needed ? (form.follow_up_date || null) : null,
      updated_at: new Date().toISOString(),
    }
    let err
    if (isNew) {
      ({ error: err } = await supabase.from('ss_case_notes').insert({ ...payload, created_by: profile?.id }))
    } else {
      ({ error: err } = await supabase.from('ss_case_notes').update(payload).eq('id', note.id))
    }
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <h2 className="font-display font-bold text-slate-800 dark:text-slate-100">{isNew ? 'New Case Note' : 'Case Note'}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-400 text-sm">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Resident *</label>
            <select value={form.resident_id} onChange={e => set('resident_id', e.target.value)} disabled={readOnly} className={inputCls}>
              <option value="">Select resident...</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name} (Rm {r.room})</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
              <input type="date" value={form.contact_date} onChange={e => set('contact_date', e.target.value)} disabled={readOnly} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Duration (min)</label>
              <input type="number" min="0" value={form.duration_minutes} onChange={e => set('duration_minutes', e.target.value)} readOnly={readOnly}
                placeholder="Optional" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Contact Type</label>
            <div className="flex gap-2 flex-wrap">
              {CONTACT_TYPES.map(t => {
                const Icon = t.icon
                return (
                  <button key={t.key} onClick={() => !readOnly && set('contact_type', t.key)} disabled={readOnly}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all
                      ${form.contact_type === t.key ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
                    <Icon size={12} /> {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Summary *</label>
            <textarea value={form.summary} onChange={e => set('summary', e.target.value)} readOnly={readOnly} rows={5}
              placeholder="What was discussed / observed / done..." className={inputCls + ' resize-none'} />
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Follow-up needed</span>
              <button onClick={() => !readOnly && set('follow_up_needed', !form.follow_up_needed)} disabled={readOnly}
                className={`w-11 h-6 rounded-full transition-colors relative ${form.follow_up_needed ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.follow_up_needed ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            {form.follow_up_needed && (
              <input type="date" value={form.follow_up_date} onChange={e => set('follow_up_date', e.target.value)} disabled={readOnly} className={inputCls} />
            )}
          </div>

          <div className="flex items-start gap-2.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <button onClick={() => !readOnly && set('documented_in_emr', !form.documented_in_emr)} disabled={readOnly}
              className={`mt-0.5 w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${form.documented_in_emr ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.documented_in_emr ? 'translate-x-5' : ''}`} />
            </button>
            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><ShieldCheck size={13} className="text-slate-400" /> Also documented in EMR</div>
              <div className="text-xs text-slate-400 mt-0.5">Flag if this same contact is also charted in PointClickCare / MatrixCare, so this stays a quick internal log rather than duplicate charting.</div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 font-medium">{readOnly ? 'Close' : 'Cancel'}</button>
          {!readOnly && (
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Saving...' : isNew ? 'Save Note' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CaseNotes({ canWrite }) {
  const { organization } = useAuth()
  const [notes, setNotes] = useState([])
  const [residents, setResidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [residentFilter, setResidentFilter] = useState('')
  const [followUpOnly, setFollowUpOnly] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: n }, { data: res }] = await Promise.all([
      supabase.from('ss_case_notes')
        .select('*, residents(first_name, last_name, room), author:created_by(first_name, last_name)')
        .eq('organization_id', organization.id)
        .order('contact_date', { ascending: false })
        .limit(200),
      supabase.from('residents').select('id, first_name, last_name, room')
        .eq('organization_id', organization.id).eq('is_active', true).order('last_name'),
    ])
    setNotes(n || [])
    setResidents(res || [])
    setLoading(false)
  }

  const filtered = notes.filter(n => {
    if (residentFilter && n.resident_id !== residentFilter) return false
    if (followUpOnly && !n.follow_up_needed) return false
    if (!search) return true
    return n.summary?.toLowerCase().includes(search.toLowerCase())
  })

  const formatDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
  const thisWeek = notes.filter(n => new Date(n.contact_date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length
  const followUps = notes.filter(n => n.follow_up_needed).length

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Logged',  value: notes.length, color: 'text-brand-600 bg-brand-50 dark:bg-brand-950/40' },
          { label: 'This Week',     value: thisWeek,      color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/50' },
          { label: 'Follow-Ups',    value: followUps,     color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-2xl p-4`}>
            <div className={`text-3xl font-bold font-display ${s.color.split(' ')[0]}`}>{s.value}</div>
            <div className="text-xs font-medium text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {canWrite && (
          <button onClick={() => { setEditing(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors">
            <Plus size={16} /> New Case Note
          </button>
        )}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes..."
            className="pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 w-48" />
        </div>
        <select value={residentFilter} onChange={e => setResidentFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Residents</option>
          {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
        </select>
        <button onClick={() => setFollowUpOnly(f => !f)}
          className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${followUpOnly ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
          Follow-ups only
        </button>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} notes</span>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm py-16 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-brand-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm py-16 text-center text-slate-400">
          <ClipboardList size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No case notes found</p>
          {canWrite && <p className="text-sm mt-1">Click "New Case Note" to log a contact or encounter</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => {
            const type = getContactType(n.contact_type)
            const Icon = type.icon
            return (
              <button key={n.id} onClick={() => { setEditing(n); setShowModal(true) }}
                className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all p-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <Icon size={14} className="text-slate-500 dark:text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                        {n.residents ? `${n.residents.first_name} ${n.residents.last_name}` : 'Unknown resident'}
                      </span>
                      <span className="text-xs text-slate-400">{type.label}</span>
                      {n.follow_up_needed && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 font-medium">Follow-up {formatDate(n.follow_up_date)}</span>
                      )}
                      {n.documented_in_emr && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1"><ShieldCheck size={10} /> In EMR</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{n.summary}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                      <span>{formatDate(n.contact_date)}</span>
                      {n.duration_minutes && <span>{n.duration_minutes} min</span>}
                      {n.author && <span>by {n.author.first_name} {n.author.last_name}</span>}
                    </div>
                  </div>
                  <ChevronDown size={14} className="text-slate-300 flex-shrink-0 -rotate-90 mt-1" />
                </div>
              </button>
            )
          })}
        </div>
      )}

      {showModal && (
        <CaseNoteModal
          note={editing}
          residents={residents}
          orgId={organization.id}
          canWrite={canWrite}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => { setShowModal(false); setEditing(null); fetchAll() }}
        />
      )}
    </div>
  )
}
