import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Plus, X, Target, Search, Loader2, AlertCircle, Check,
         Heart, Users, Home, Brain, Sparkles, MoreHorizontal, ChevronDown, CalendarClock } from 'lucide-react'

const GOAL_CATEGORIES = [
  { key: 'social_engagement',    label: 'Social Engagement',    icon: Users },
  { key: 'emotional_wellbeing',  label: 'Emotional Wellbeing',  icon: Heart },
  { key: 'family_relationships', label: 'Family Relationships', icon: Home },
  { key: 'independence_adl',     label: 'Independence / ADLs',  icon: Sparkles },
  { key: 'cognitive_behavioral', label: 'Cognitive / Behavioral', icon: Brain },
  { key: 'other',                label: 'Other',                icon: MoreHorizontal },
]

const GOAL_STATUSES = [
  { key: 'not_started', label: 'Not Started', color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' },
  { key: 'in_progress', label: 'In Progress',  color: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400' },
  { key: 'met',          label: 'Met',          color: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400' },
  { key: 'discontinued', label: 'Discontinued', color: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400' },
]

const getCategory = (key) => GOAL_CATEGORIES.find(c => c.key === key) || GOAL_CATEGORIES[GOAL_CATEGORIES.length - 1]
const getStatus   = (key) => GOAL_STATUSES.find(s => s.key === key) || GOAL_STATUSES[0]
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
const inputCls = 'w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 dark:text-slate-100'
const formatDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''

function GoalModal({ goal, residents, orgId, canWrite, onClose, onSaved }) {
  const { profile } = useAuth()
  const isNew = !goal
  const [form, setForm] = useState({
    resident_id:   goal?.resident_id   || '',
    category:      goal?.category      || 'social_engagement',
    title:         goal?.title         || '',
    description:   goal?.description   || '',
    status:        goal?.status        || 'in_progress',
    target_date:   goal?.target_date   || '',
    achieved_date: goal?.achieved_date || '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const readOnly = !canWrite

  const setStatus = (status) => {
    setForm(f => ({
      ...f,
      status,
      achieved_date: status === 'met' ? (f.achieved_date || today()) : '',
    }))
  }

  const handleSave = async () => {
    if (!form.resident_id) { setError('Resident is required.'); return }
    if (!form.title.trim()) { setError('Goal title is required.'); return }
    setSaving(true); setError('')
    const payload = {
      ...form,
      organization_id: orgId,
      target_date:      form.target_date   || null,
      achieved_date:     form.status === 'met' ? (form.achieved_date || null) : null,
      updated_at: new Date().toISOString(),
    }
    let err
    if (isNew) {
      ({ error: err } = await supabase.from('ss_goals').insert({ ...payload, created_by: profile?.id }))
    } else {
      ({ error: err } = await supabase.from('ss_goals').update(payload).eq('id', goal.id))
    }
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <h2 className="font-display font-bold text-slate-800 dark:text-slate-100">{isNew ? 'New Goal' : 'Goal'}</h2>
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

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Category</label>
            <div className="flex gap-2 flex-wrap">
              {GOAL_CATEGORIES.map(c => {
                const Icon = c.icon
                return (
                  <button key={c.key} onClick={() => !readOnly && set('category', c.key)} disabled={readOnly}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all
                      ${form.category === c.key ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
                    <Icon size={12} /> {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Goal *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} readOnly={readOnly}
              placeholder="e.g. Attend at least 2 group activities per week" className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Description / Plan</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} readOnly={readOnly} rows={3}
              placeholder="How this will be worked toward, interventions, supports involved..." className={inputCls + ' resize-none'} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Status</label>
            <div className="flex gap-2 flex-wrap">
              {GOAL_STATUSES.map(s => (
                <button key={s.key} onClick={() => !readOnly && setStatus(s.key)} disabled={readOnly}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all
                    ${form.status === s.key ? s.color + ' border-transparent ring-2 ring-offset-1 ring-brand-400 dark:ring-offset-slate-900' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Target Date</label>
              <input type="date" value={form.target_date} onChange={e => set('target_date', e.target.value)} disabled={readOnly} className={inputCls} />
            </div>
            {form.status === 'met' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Achieved Date</label>
                <input type="date" value={form.achieved_date} onChange={e => set('achieved_date', e.target.value)} disabled={readOnly} className={inputCls} />
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 font-medium">{readOnly ? 'Close' : 'Cancel'}</button>
          {!readOnly && (
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Saving...' : isNew ? 'Save Goal' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Goals({ canWrite }) {
  const { organization } = useAuth()
  const [goals, setGoals]         = useState([])
  const [residents, setResidents] = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [search, setSearch]       = useState('')
  const [residentFilter, setResidentFilter] = useState('')
  const [statusFilter, setStatusFilter]     = useState('active')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: g }, { data: res }] = await Promise.all([
      supabase.from('ss_goals')
        .select('*, residents(first_name, last_name, room), author:created_by(first_name, last_name)')
        .eq('organization_id', organization.id)
        .order('target_date', { ascending: true, nullsFirst: false })
        .limit(300),
      supabase.from('residents').select('id, first_name, last_name, room')
        .eq('organization_id', organization.id).eq('is_active', true).order('last_name'),
    ])
    setGoals(g || [])
    setResidents(res || [])
    setLoading(false)
  }

  const filtered = goals.filter(g => {
    if (residentFilter && g.resident_id !== residentFilter) return false
    if (statusFilter === 'active' && ['met', 'discontinued'].includes(g.status)) return false
    if (statusFilter !== 'active' && statusFilter !== 'all' && g.status !== statusFilter) return false
    if (!search) return true
    return g.title?.toLowerCase().includes(search.toLowerCase())
  })

  const todayStr = today()
  const active   = goals.filter(g => !['met', 'discontinued'].includes(g.status)).length
  const met      = goals.filter(g => g.status === 'met').length
  const overdue  = goals.filter(g => !['met', 'discontinued'].includes(g.status) && g.target_date && g.target_date < todayStr).length

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active Goals', value: active,  color: 'text-brand-600 bg-brand-50 dark:bg-brand-950/40' },
          { label: 'Met',           value: met,      color: 'text-green-600 bg-green-50 dark:bg-green-950/40' },
          { label: 'Overdue',       value: overdue,  color: overdue > 0 ? 'text-red-600 bg-red-50 dark:bg-red-950/40' : 'text-slate-400 bg-slate-100 dark:bg-slate-900' },
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
            <Plus size={16} /> New Goal
          </button>
        )}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search goals..."
            className="pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 w-48" />
        </div>
        <select value={residentFilter} onChange={e => setResidentFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All Residents</option>
          {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="active">Active (not started / in progress)</option>
          <option value="all">All statuses</option>
          {GOAL_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label} only</option>)}
        </select>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} goals</span>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm py-16 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-brand-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm py-16 text-center text-slate-400">
          <Target size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No goals found</p>
          {canWrite && <p className="text-sm mt-1">Click "New Goal" to set a trackable goal for a resident</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(g => {
            const cat = getCategory(g.category)
            const status = getStatus(g.status)
            const CatIcon = cat.icon
            const isOverdue = !['met', 'discontinued'].includes(g.status) && g.target_date && g.target_date < todayStr
            return (
              <button key={g.id} onClick={() => { setEditing(g); setShowModal(true) }}
                className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all p-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <CatIcon size={14} className="text-slate-500 dark:text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                        {g.residents ? `${g.residents.first_name} ${g.residents.last_name}` : 'Unknown resident'}
                      </span>
                      <span className="text-xs text-slate-400">{cat.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>{status.label}</span>
                      {isOverdue && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 font-medium flex items-center gap-1">
                          <CalendarClock size={10} /> Overdue
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{g.title}</p>
                    {g.description && <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{g.description}</p>}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                      {g.target_date && <span>Target: {formatDate(g.target_date)}</span>}
                      {g.status === 'met' && g.achieved_date && <span>Achieved: {formatDate(g.achieved_date)}</span>}
                      {g.author && <span>by {g.author.first_name} {g.author.last_name}</span>}
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
        <GoalModal
          goal={editing}
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
