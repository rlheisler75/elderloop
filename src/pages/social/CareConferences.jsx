import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Plus, X, Users, Loader2, AlertCircle, Check, ChevronDown, Calendar } from 'lucide-react'

const STATUSES = [
  { key: 'scheduled',  label: 'Scheduled',  color: 'bg-blue-100 text-blue-700'    },
  { key: 'completed',  label: 'Completed',  color: 'bg-green-100 text-green-700'  },
  { key: 'cancelled',  label: 'Cancelled',  color: 'bg-slate-100 text-slate-500'  },
]

function getStatus(key) { return STATUSES.find(s => s.key === key) || STATUSES[0] }

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function ConferenceModal({ residents, staff, orgId, conference, canWrite, onClose, onSaved }) {
  const { profile } = useAuth()
  const isNew = !conference
  const [form, setForm] = useState({
    resident_id:         conference?.resident_id || '',
    scheduled_date:      conference?.scheduled_date || today(),
    completed_date:      conference?.completed_date || '',
    facilitated_by:      conference?.facilitated_by || profile?.id || '',
    attendees:           conference?.attendees || '',
    summary:             conference?.summary || '',
    goals_reviewed:      conference?.goals_reviewed || '',
    new_goals:           conference?.new_goals || '',
    follow_up_items:     conference?.follow_up_items || '',
    next_conference_date: conference?.next_conference_date || '',
    status:              conference?.status || 'scheduled',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const readOnly = !canWrite

  const handleSave = async () => {
    if (!form.resident_id || !form.scheduled_date) { setError('Resident and scheduled date are required.'); return }
    setSaving(true); setError('')
    const payload = {
      ...form,
      organization_id: orgId,
      resident_id:     form.resident_id,
      facilitated_by:  form.facilitated_by || null,
      completed_date:  form.completed_date || null,
      next_conference_date: form.next_conference_date || null,
      updated_at:      new Date().toISOString(),
    }
    let err
    if (isNew) {
      const { error: e } = await supabase.from('ss_care_conferences').insert({ ...payload, created_by: profile?.id })
      err = e
    } else {
      const { error: e } = await supabase.from('ss_care_conferences').update(payload).eq('id', conference.id)
      err = e
    }
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-display font-bold text-slate-800">
            {isNew ? 'Schedule Care Conference' : 'Care Conference'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Resident & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Resident *</label>
              <select value={form.resident_id} onChange={e => set('resident_id', e.target.value)} disabled={readOnly}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white disabled:bg-slate-50">
                <option value="">Select resident...</option>
                {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name} (Rm {r.room})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Scheduled Date *</label>
              <input type="date" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} disabled={readOnly}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Facilitated By</label>
              <select value={form.facilitated_by} onChange={e => set('facilitated_by', e.target.value)} disabled={readOnly}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white disabled:bg-slate-50">
                <option value="">— Select —</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
              <div className="flex gap-2">
                {STATUSES.map(s => (
                  <button key={s.key} onClick={() => !readOnly && set('status', s.key)} disabled={readOnly}
                    className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-all
                      ${form.status === s.key ? s.color + ' border-current' : 'bg-white text-slate-400 border-slate-200'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Attendees</label>
            <textarea value={form.attendees} onChange={e => set('attendees', e.target.value)} readOnly={readOnly} rows={2}
              placeholder="e.g. Social Services Director, DON, Dietary Manager, Resident, Family Member (Jane Smith)"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none disabled:bg-slate-50" />
          </div>

          {/* Summary */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Meeting Summary</label>
            <textarea value={form.summary} onChange={e => set('summary', e.target.value)} readOnly={readOnly} rows={4}
              placeholder="Summary of discussion, resident and family concerns, care updates..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none disabled:bg-slate-50" />
          </div>

          {/* Goals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Goals Reviewed</label>
              <textarea value={form.goals_reviewed} onChange={e => set('goals_reviewed', e.target.value)} readOnly={readOnly} rows={3}
                placeholder="Previous goals reviewed at this conference..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none disabled:bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">New Goals Set</label>
              <textarea value={form.new_goals} onChange={e => set('new_goals', e.target.value)} readOnly={readOnly} rows={3}
                placeholder="New care goals established at this conference..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none disabled:bg-slate-50" />
            </div>
          </div>

          {/* Follow-up */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Follow-up Action Items</label>
            <textarea value={form.follow_up_items} onChange={e => set('follow_up_items', e.target.value)} readOnly={readOnly} rows={3}
              placeholder="Action items, who is responsible, and target dates..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none disabled:bg-slate-50" />
          </div>

          {/* Completion & next date */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Completed Date</label>
              <input type="date" value={form.completed_date} onChange={e => set('completed_date', e.target.value)} disabled={readOnly}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Next Conference Date</label>
              <input type="date" value={form.next_conference_date} onChange={e => set('next_conference_date', e.target.value)} disabled={readOnly}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50" />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">{readOnly ? 'Close' : 'Cancel'}</button>
          {!readOnly && (
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Saving...' : isNew ? 'Schedule Conference' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CareConferences({ canWrite }) {
  const { organization } = useAuth()
  const [conferences, setConferences] = useState([])
  const [residents,   setResidents]   = useState([])
  const [staff,       setStaff]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)
  const [editing,     setEditing]     = useState(null)
  const [filter,      setFilter]      = useState({ status: '' })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: conf }, { data: res }, { data: st }] = await Promise.all([
      supabase.from('ss_care_conferences')
        .select('*, residents(first_name, last_name, room), facilitator:facilitated_by(first_name, last_name)')
        .eq('organization_id', organization.id)
        .order('scheduled_date', { ascending: false }),
      supabase.from('residents').select('id, first_name, last_name, room')
        .eq('organization_id', organization.id).eq('is_active', true).order('last_name'),
      supabase.from('profiles').select('id, first_name, last_name')
        .eq('organization_id', organization.id).eq('is_active', true)
        .in('role', ['social_services','supervisor','manager','org_admin','ceo']).order('last_name')
    ])
    setConferences(conf || [])
    setResidents(res || [])
    setStaff(st || [])
    setLoading(false)
  }

  const filtered = conferences.filter(c => !filter.status || c.status === filter.status)

  const formatDate = (d) => {
    if (!d) return '—'
    const [y, m, day] = d.split('-')
    return new Date(+y, +m-1, +day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const upcoming = conferences.filter(c => c.status === 'scheduled').length
  const completed = conferences.filter(c => c.status === 'completed').length
  const needsFollowUp = conferences.filter(c => c.status === 'completed' && c.follow_up_items).length

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Scheduled',      value: upcoming,      color: 'text-blue-600 bg-blue-50'   },
          { label: 'Completed',      value: completed,     color: 'text-green-600 bg-green-50' },
          { label: 'With Follow-ups', value: needsFollowUp, color: 'text-amber-600 bg-amber-50' },
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
            <Plus size={16} /> Schedule Conference
          </button>
        )}
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} conferences</span>
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-brand-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center text-slate-400">
          <Users size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No care conferences found</p>
          {canWrite && <p className="text-sm mt-1">Click "Schedule Conference" to add one</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(conf => {
            const status = getStatus(conf.status)
            return (
              <button key={conf.id} onClick={() => { setEditing(conf); setShowModal(true) }}
                className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-4 text-left">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calendar size={18} className="text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-slate-800 text-sm">
                        {conf.residents ? `${conf.residents.first_name} ${conf.residents.last_name}` : 'Unknown Resident'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>{status.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span>Scheduled: {formatDate(conf.scheduled_date)}</span>
                      {conf.completed_date && <span>Completed: {formatDate(conf.completed_date)}</span>}
                      {conf.facilitator && <span>Facilitated by: {conf.facilitator.first_name} {conf.facilitator.last_name}</span>}
                      {conf.residents?.room && <span>Room {conf.residents.room}</span>}
                    </div>
                    {conf.summary && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{conf.summary}</p>
                    )}
                    {conf.follow_up_items && (
                      <p className="text-xs text-amber-600 mt-1">⚡ {conf.follow_up_items.split('\n')[0]}</p>
                    )}
                  </div>
                  <ChevronDown size={14} className="text-slate-300 flex-shrink-0 -rotate-90" />
                </div>
              </button>
            )
          })}
        </div>
      )}

      {showModal && (
        <ConferenceModal
          residents={residents}
          staff={staff}
          orgId={organization.id}
          conference={editing}
          canWrite={canWrite}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => { setShowModal(false); setEditing(null); fetchAll() }}
        />
      )}
    </div>
  )
}
