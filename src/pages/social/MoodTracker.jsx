import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Plus, Search, Filter, Loader2, AlertCircle, ChevronDown, X, Check } from 'lucide-react'

const MOODS = [
  { key: 'happy',     label: 'Happy',     emoji: '😊', color: 'bg-green-100 text-green-700 border-green-200'  },
  { key: 'content',   label: 'Content',   emoji: '😌', color: 'bg-teal-100 text-teal-700 border-teal-200'    },
  { key: 'neutral',   label: 'Neutral',   emoji: '😐', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  { key: 'anxious',   label: 'Anxious',   emoji: '😟', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { key: 'sad',       label: 'Sad',       emoji: '😢', color: 'bg-blue-100 text-blue-700 border-blue-200'    },
  { key: 'agitated',  label: 'Agitated',  emoji: '😠', color: 'bg-orange-100 text-orange-700 border-orange-200'},
  { key: 'confused',  label: 'Confused',  emoji: '😕', color: 'bg-purple-100 text-purple-700 border-purple-200'},
  { key: 'withdrawn', label: 'Withdrawn', emoji: '😶', color: 'bg-indigo-100 text-indigo-700 border-indigo-200'},
  { key: 'combative', label: 'Combative', emoji: '😤', color: 'bg-red-100 text-red-700 border-red-200'       },
  { key: 'other',     label: 'Other',     emoji: '🔵', color: 'bg-slate-100 text-slate-600 border-slate-200' },
]

const SHIFTS = [
  { key: 'day',     label: 'Day'     },
  { key: 'evening', label: 'Evening' },
  { key: 'night',   label: 'Night'   },
]

function getMoodConfig(key) { return MOODS.find(m => m.key === key) || MOODS[2] }

function QuickLogModal({ residents, orgId, onClose, onSaved }) {
  const { profile } = useAuth()
  const [step,    setStep]    = useState(1) // 1=resident, 2=mood, 3=details
  const [search,  setSearch]  = useState('')
  const [form,    setForm]    = useState({
    resident_id: '', shift: 'day', mood: '', mood_score: null,
    behavioral_concerns: false, triggers: '', interventions: '',
    intervention_effective: null, follow_up_needed: false,
    follow_up_notes: '', notes: '',
  })
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const selectedResident = residents.find(r => r.id === form.resident_id)
  const filtered = residents.filter(r =>
    `${r.first_name} ${r.last_name} ${r.room}`.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = async () => {
    if (!form.resident_id || !form.mood) { setError('Resident and mood are required.'); return }
    setSaving(true); setError('')
    const _now = new Date()
    const { error: err } = await supabase.from('ss_mood_logs').insert({
      ...form,
      organization_id: orgId,
      logged_by: profile?.id,
      logged_at: _now.toISOString(),
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-display font-bold text-slate-800">Quick Mood Log</h2>
            <div className="flex gap-2 mt-1">
              {[1,2,3].map(s => (
                <div key={s} className={`h-1.5 w-8 rounded-full transition-colors ${step >= s ? 'bg-brand-600' : 'bg-slate-200'}`} />
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Step 1 — Resident */}
          {step === 1 && (
            <div className="p-5 space-y-3">
              <p className="text-sm text-slate-500 font-medium">Who are you logging for?</p>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} autoFocus
                  placeholder="Search by name or room..."
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {filtered.map(r => (
                  <button key={r.id} onClick={() => { set('resident_id', r.id); setStep(2); setSearch('') }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-brand-50 transition-colors text-left group">
                    <div className="w-9 h-9 bg-brand-100 rounded-xl flex items-center justify-center text-brand-700 font-bold text-sm flex-shrink-0">
                      {r.first_name[0]}{r.last_name[0]}
                    </div>
                    <div>
                      <div className="font-medium text-slate-800 text-sm">{r.first_name} {r.last_name}</div>
                      <div className="text-xs text-slate-400">Room {r.room}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 — Mood */}
          {step === 2 && (
            <div className="p-5 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center text-brand-700 font-bold">
                  {selectedResident?.first_name[0]}{selectedResident?.last_name[0]}
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{selectedResident?.first_name} {selectedResident?.last_name}</div>
                  <div className="text-xs text-slate-400">Room {selectedResident?.room}</div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-600 mb-3">How is {selectedResident?.first_name} feeling?</p>
                <div className="grid grid-cols-2 gap-2">
                  {MOODS.map(m => (
                    <button key={m.key} onClick={() => { set('mood', m.key); setStep(3) }}
                      className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all
                        ${form.mood === m.key ? m.color + ' border-current' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'}`}>
                      <span className="text-xl">{m.emoji}</span> {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-600 mb-2">Shift</p>
                <div className="flex gap-2">
                  {SHIFTS.map(s => (
                    <button key={s.key} onClick={() => set('shift', s.key)}
                      className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all
                        ${form.shift === s.key ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-500 border-slate-200 hover:border-brand-300'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Details */}
          {step === 3 && (
            <div className="p-5 space-y-4">
              {/* Mood score */}
              <div>
                <p className="text-sm font-medium text-slate-600 mb-2">
                  Mood selected: <span className="font-bold">{getMoodConfig(form.mood).emoji} {getMoodConfig(form.mood).label}</span>
                </p>
                <p className="text-xs text-slate-500 mb-2">Mood Score (1 = very low · 5 = very high)</p>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => set('mood_score', n)}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all
                        ${form.mood_score === n ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-400 border-slate-200 hover:border-brand-300'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Behavioral concern flag */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-sm font-medium text-slate-700">Behavioral Concerns Noted</span>
                <button onClick={() => set('behavioral_concerns', !form.behavioral_concerns)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${form.behavioral_concerns ? 'bg-red-500' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.behavioral_concerns ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Triggers / Contributing Factors</label>
                <textarea value={form.triggers} onChange={e => set('triggers', e.target.value)} rows={2}
                  placeholder="What may have caused this mood or behavior?"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Interventions Used</label>
                <textarea value={form.interventions} onChange={e => set('interventions', e.target.value)} rows={2}
                  placeholder="What was done in response?"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
              </div>

              {form.interventions && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <span className="text-sm text-slate-600">Intervention effective?</span>
                  <div className="flex gap-2 ml-auto">
                    {[true, false].map(v => (
                      <button key={String(v)} onClick={() => set('intervention_effective', v)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                          ${form.intervention_effective === v
                            ? v ? 'bg-green-600 text-white border-green-600' : 'bg-red-500 text-white border-red-500'
                            : 'bg-white text-slate-500 border-slate-200'}`}>
                        {v ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-sm font-medium text-slate-700">Follow-up Needed</span>
                <button onClick={() => set('follow_up_needed', !form.follow_up_needed)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${form.follow_up_needed ? 'bg-brand-600' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.follow_up_needed ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              {form.follow_up_needed && (
                <textarea value={form.follow_up_notes} onChange={e => set('follow_up_notes', e.target.value)} rows={2}
                  placeholder="Describe follow-up needed..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Additional Notes</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                  placeholder="Any other observations..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
              </div>

              {error && <p className="text-sm text-red-500 flex items-center gap-1.5"><AlertCircle size={13} />{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} className="px-4 py-2.5 text-sm text-slate-600 font-medium border border-slate-200 rounded-xl hover:bg-slate-50">
              ← Back
            </button>
          )}
          {step === 3 && (
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white font-semibold rounded-xl text-sm transition-colors">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {saving ? 'Saving...' : 'Save Mood Log'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function MoodBadge({ mood }) {
  const m = getMoodConfig(mood)
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${m.color}`}>
      {m.emoji} {m.label}
    </span>
  )
}

export default function MoodTracker({ canWrite }) {
  const { organization } = useAuth()
  const [logs,      setLogs]      = useState([])
  const [residents, setResidents] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filter,    setFilter]    = useState({ resident: '', shift: '', mood: '', concerns: '' })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: res }, { data: logs }] = await Promise.all([
      supabase.from('residents').select('id, first_name, last_name, room')
        .eq('organization_id', organization.id).eq('is_active', true).order('last_name'),
      supabase.from('ss_mood_logs')
        .select('*, residents(first_name, last_name, room), profiles:logged_by(first_name, last_name)')
        .eq('organization_id', organization.id)
        .order('logged_at', { ascending: false })
        .limit(100)
    ])
    setResidents(res || [])
    setLogs(logs || [])
    setLoading(false)
  }

  const filtered = logs.filter(l => {
    if (filter.resident && l.resident_id !== filter.resident) return false
    if (filter.shift    && l.shift !== filter.shift)          return false
    if (filter.mood     && l.mood  !== filter.mood)           return false
    if (filter.concerns === 'yes'  && !l.behavioral_concerns) return false
    if (filter.concerns === 'no'   && l.behavioral_concerns)  return false
    return true
  })

  const formatDate = (ts) => {
    if (!ts) return ''
    const d = new Date(ts)
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {canWrite && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
            <Plus size={16} /> Quick Log Mood
          </button>
        )}
        {/* Filters */}
        <select value={filter.resident} onChange={e => setFilter(f => ({ ...f, resident: e.target.value }))}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
          <option value="">All Residents</option>
          {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
        </select>
        <select value={filter.mood} onChange={e => setFilter(f => ({ ...f, mood: e.target.value }))}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
          <option value="">All Moods</option>
          {MOODS.map(m => <option key={m.key} value={m.key}>{m.emoji} {m.label}</option>)}
        </select>
        <select value={filter.shift} onChange={e => setFilter(f => ({ ...f, shift: e.target.value }))}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
          <option value="">All Shifts</option>
          {SHIFTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={filter.concerns} onChange={e => setFilter(f => ({ ...f, concerns: e.target.value }))}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
          <option value="">All</option>
          <option value="yes">Concerns Only</option>
          <option value="no">No Concerns</option>
        </select>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} entries</span>
      </div>

      {/* Log table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-brand-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center text-slate-400">
          <p className="font-medium">No mood logs found</p>
          {canWrite && <p className="text-sm mt-1">Click "Quick Log Mood" to add the first entry</p>}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Resident', 'Date / Shift', 'Mood', 'Score', 'Concerns', 'Triggers / Notes', 'Logged By'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800 text-sm">{log.residents?.first_name} {log.residents?.last_name}</div>
                    <div className="text-xs text-slate-400">Room {log.residents?.room}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    <div>{formatDate(log.logged_at)}</div>
                    {log.shift && <div className="capitalize font-medium text-slate-600">{log.shift}</div>}
                  </td>
                  <td className="px-4 py-3"><MoodBadge mood={log.mood} /></td>
                  <td className="px-4 py-3">
                    {log.mood_score && (
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(n => (
                          <div key={n} className={`w-3 h-3 rounded-full ${n <= log.mood_score ? 'bg-brand-500' : 'bg-slate-200'}`} />
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {log.behavioral_concerns
                      ? <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full font-semibold">⚠ Yes</span>
                      : <span className="text-xs text-slate-400">—</span>}
                    {log.follow_up_needed && (
                      <div className="text-xs text-amber-600 mt-1">Follow-up needed</div>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {log.triggers && <p className="text-xs text-slate-600 truncate" title={log.triggers}>Trigger: {log.triggers}</p>}
                    {log.notes    && <p className="text-xs text-slate-400 truncate" title={log.notes}>{log.notes}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {log.profiles ? `${log.profiles.first_name} ${log.profiles.last_name}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <QuickLogModal
          residents={residents}
          orgId={organization.id}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchAll() }}
        />
      )}
    </div>
  )
}
