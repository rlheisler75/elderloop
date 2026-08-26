import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import {
  Plus, X, Loader2, Phone, Mail, MapPin, Calendar,
  Edit2, Trash2, Building2, MessageSquare, Video, Users, HelpCircle, Send
} from 'lucide-react'

export const ACTIVITY_TYPES = [
  { key: 'call',    label: 'Call',    icon: Phone },
  { key: 'email',   label: 'Email',   icon: Mail },
  { key: 'demo',    label: 'Demo',    icon: Video },
  { key: 'meeting', label: 'Meeting', icon: Users },
  { key: 'note',    label: 'Note',    icon: MessageSquare },
  { key: 'other',   label: 'Other',   icon: HelpCircle },
]

export const STATUSES = [
  { key: 'new',              label: 'New',              color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { key: 'contacted',        label: 'Contacted',        color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { key: 'demo_scheduled',   label: 'Demo Scheduled',   color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { key: 'demo_completed',   label: 'Demo Completed',   color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { key: 'proposal_sent',    label: 'Proposal Sent',    color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { key: 'won',              label: 'Won',              color: 'bg-green-100 text-green-700 border-green-200' },
  { key: 'lost',             label: 'Lost',             color: 'bg-red-100 text-red-700 border-red-200' },
]

const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'

const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null

const fmtDateTime = (d) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

// ── Activity log (call/email/demo notes) for an existing prospect ──
function ActivityLog({ prospectId }) {
  const { profile } = useAuth()
  const [activities, setActivities] = useState([])
  const [loading, setLoading]       = useState(true)
  const [type, setType]             = useState('call')
  const [note, setNote]             = useState('')
  const [logging, setLogging]       = useState(false)

  useEffect(() => { fetchActivities() }, [prospectId])

  async function fetchActivities() {
    setLoading(true)
    const { data } = await supabase
      .from('rep_prospect_activities')
      .select('*')
      .eq('prospect_id', prospectId)
      .order('created_at', { ascending: false })
    setActivities(data || [])
    setLoading(false)
  }

  const logActivity = async () => {
    setLogging(true)
    const { error } = await supabase.from('rep_prospect_activities').insert({
      prospect_id: prospectId,
      rep_id: profile.id,
      activity_type: type,
      notes: note.trim() || null,
    })
    setLogging(false)
    if (error) return
    setNote('')
    fetchActivities()
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Activity Log</label>

      <div className="flex gap-2 mb-3">
        <select value={type} onChange={e => setType(e.target.value)}
          className="px-2.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent">
          {ACTIVITY_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <input value={note} onChange={e => setNote(e.target.value)}
          placeholder="What happened?" className={inputCls + ' flex-1'}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); logActivity() } }} />
        <button onClick={logActivity} disabled={logging}
          className="px-3 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white rounded-xl transition-colors flex-shrink-0">
          <Send size={14} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-brand-400" /></div>
      ) : activities.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-3">No activity logged yet.</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {activities.map(a => {
            const cfg = ACTIVITY_TYPES.find(t => t.key === a.activity_type) || ACTIVITY_TYPES.at(-1)
            const Icon = cfg.icon
            return (
              <div key={a.id} className="flex items-start gap-2.5 bg-slate-50 rounded-xl px-3 py-2">
                <Icon size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">{cfg.label}</span>
                    <span className="text-xs text-slate-400">{fmtDateTime(a.created_at)}</span>
                  </div>
                  {a.notes && <p className="text-xs text-slate-500 mt-0.5">{a.notes}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function ProspectForm({ prospect, onClose, onSaved }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    community_name:  prospect?.community_name  || '',
    contact_name:    prospect?.contact_name     || '',
    contact_email:   prospect?.contact_email    || '',
    contact_phone:   prospect?.contact_phone    || '',
    city:            prospect?.city             || '',
    state:           prospect?.state            || '',
    status:          prospect?.status           || 'new',
    source:          prospect?.source           || '',
    notes:           prospect?.notes            || '',
    next_follow_up:  prospect?.next_follow_up   || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.community_name.trim()) { setError('Community name is required.'); return }
    setSaving(true)
    const payload = { ...form, next_follow_up: form.next_follow_up || null, rep_id: profile.id }
    const { error: err } = prospect
      ? await supabase.from('rep_prospects').update(payload).eq('id', prospect.id)
      : await supabase.from('rep_prospects').insert(payload)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-display font-bold text-slate-800">{prospect ? 'Edit Prospect' : 'New Prospect'}</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Community Name *</label>
            <input value={form.community_name} onChange={e => set('community_name', e.target.value)}
              placeholder="e.g. Sunrise Gardens" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Contact Name</label>
              <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
                {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
              <input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Phone</label>
              <input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">City</label>
              <input value={form.city} onChange={e => set('city', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">State</label>
              <input value={form.state} onChange={e => set('state', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Source</label>
              <input value={form.source} onChange={e => set('source', e.target.value)}
                placeholder="e.g. MHCA conference" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Next Follow-up</label>
              <input type="date" value={form.next_follow_up || ''} onChange={e => set('next_follow_up', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} className={inputCls + ' resize-none'} />
          </div>

          {prospect && <ActivityLog prospectId={prospect.id} />}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-colors">
            {saving ? 'Saving...' : prospect ? 'Save Changes' : 'Create Prospect'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProspectsTab() {
  const [prospects, setProspects] = useState([])
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState(null)   // prospect or 'new' or null
  const [dragOverStatus, setDragOverStatus] = useState(null)

  useEffect(() => { fetchProspects() }, [])

  async function fetchProspects() {
    setLoading(true)
    const { data } = await supabase.from('rep_prospects').select('*').order('created_at', { ascending: false })
    setProspects(data || [])
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this prospect?')) return
    await supabase.from('rep_prospects').delete().eq('id', id)
    fetchProspects()
  }

  const handleDrop = async (status) => {
    setDragOverStatus(null)
    const id = window.__draggedProspectId
    if (!id) return
    await supabase.from('rep_prospects').update({ status }).eq('id', id)
    fetchProspects()
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 size={28} className="animate-spin text-brand-400" />
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-slate-800 text-lg">Prospecting Pipeline</h2>
          <p className="text-xs text-slate-400 mt-0.5">Communities you're working to sign up</p>
        </div>
        <button onClick={() => setEditing('new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors">
          <Plus size={15} /> New Prospect
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {STATUSES.map(status => {
          const items = prospects.filter(p => p.status === status.key)
          return (
            <div key={status.key}
              onDragOver={e => { e.preventDefault(); setDragOverStatus(status.key) }}
              onDragLeave={() => setDragOverStatus(null)}
              onDrop={() => handleDrop(status.key)}
              className={`flex-shrink-0 w-64 rounded-2xl border transition-colors ${
                dragOverStatus === status.key ? 'border-brand-400 bg-brand-50/50' : 'border-slate-100 bg-slate-50'
              }`}>
              <div className={`px-3 py-2.5 border-b ${status.color} rounded-t-2xl flex items-center justify-between`}>
                <span className="text-xs font-semibold">{status.label}</span>
                <span className="text-xs font-bold">{items.length}</span>
              </div>
              <div className="p-2 space-y-2 min-h-24 max-h-[60vh] overflow-y-auto">
                {items.map(p => (
                  <div key={p.id}
                    draggable
                    onDragStart={() => { window.__draggedProspectId = p.id }}
                    className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 cursor-grab active:cursor-grabbing group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-slate-800 text-sm flex items-center gap-1.5 min-w-0">
                        <Building2 size={12} className="text-slate-300 flex-shrink-0" />
                        <span className="truncate">{p.community_name}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button onClick={() => setEditing(p)} className="p-1 text-slate-400 hover:text-brand-600"><Edit2 size={11} /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={11} /></button>
                      </div>
                    </div>
                    {p.contact_name && <div className="text-xs text-slate-500 mt-1">{p.contact_name}</div>}
                    {(p.city || p.state) && (
                      <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                        <MapPin size={10} /> {[p.city, p.state].filter(Boolean).join(', ')}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      {p.contact_phone && <Phone size={11} className="text-slate-300" title={p.contact_phone} />}
                      {p.contact_email && <Mail size={11} className="text-slate-300" title={p.contact_email} />}
                      {p.next_follow_up && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 ml-auto">
                          <Calendar size={10} /> {fmtDate(p.next_follow_up)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="text-center py-6 text-xs text-slate-300">Drop here</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {editing && (
        <ProspectForm
          prospect={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); fetchProspects() }}
        />
      )}
    </div>
  )
}
