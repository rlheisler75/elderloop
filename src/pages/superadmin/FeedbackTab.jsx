// Super Admin → Help & Feedback: help requests and suggestions sent from the
// "Help & Feedback" button (staff sidebar, family portal, resident portal).
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { LifeBuoy, Lightbulb, Loader2, Mail, Trash2 } from 'lucide-react'

const STATUS_TABS = [
  { key: 'new',         label: 'New' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done',        label: 'Done' },
  { key: 'all',         label: 'All' },
]
const STATUS_COLOR = {
  new:         'bg-blue-900/50 text-blue-300 border-blue-700',
  in_progress: 'bg-amber-900/50 text-amber-300 border-amber-700',
  done:        'bg-green-900/50 text-green-300 border-green-700',
}
const ROLE_LABEL = { family: 'Family', resident: 'Resident', ceo: 'Administrator', org_admin: 'Org Admin', super_admin: 'Super Admin' }
const roleLabel = (r) => ROLE_LABEL[r] ?? (r ? r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—')
const fmtDateTime = (d) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

function FeedbackCard({ item, onChange, onDelete }) {
  const [note, setNote] = useState(item.admin_note ?? '')
  const sender = item.profiles
  const Icon = item.kind === 'help' ? LifeBuoy : Lightbulb
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${item.kind === 'help' ? 'bg-red-900/40 text-red-300' : 'bg-purple-900/40 text-purple-300'}`}>
          <Icon size={17} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-semibold">{item.subject}</span>
            <span className="text-xs text-slate-500">{item.kind === 'help' ? 'Help request' : 'Suggestion'}</span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {sender ? `${sender.first_name ?? ''} ${sender.last_name ?? ''}`.trim() : 'Unknown sender'}
            {' · '}{roleLabel(item.role)}
            {' · '}{item.organizations?.name ?? 'No community'}
            {' · '}{fmtDateTime(item.created_at)}
          </div>
        </div>
        <select value={item.status} onChange={e => onChange(item.id, { status: e.target.value })}
          className={`text-xs font-semibold border rounded-lg px-2 py-1 bg-transparent ${STATUS_COLOR[item.status]}`}>
          <option value="new" className="bg-slate-900">New</option>
          <option value="in_progress" className="bg-slate-900">In Progress</option>
          <option value="done" className="bg-slate-900">Done</option>
        </select>
      </div>

      <p className="text-sm text-slate-300 whitespace-pre-wrap mt-3 ml-12">{item.message}</p>
      {item.page && <p className="text-xs text-slate-600 mt-2 ml-12">Sent from {item.page}</p>}

      <div className="flex items-center gap-2 mt-4 ml-12">
        <input value={note} onChange={e => setNote(e.target.value)}
          onBlur={() => { if (note !== (item.admin_note ?? '')) onChange(item.id, { admin_note: note || null }) }}
          placeholder="Private note (only you see this)"
          className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-brand-600" />
        {sender?.email && (
          <a href={`mailto:${sender.email}?subject=${encodeURIComponent('Re: ' + item.subject)}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-brand-300 hover:text-white hover:bg-slate-800 rounded-lg" title={sender.email}>
            <Mail size={13} /> Reply
          </a>
        )}
        <button onClick={() => onDelete(item.id)} className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-slate-800 rounded-lg" title="Delete">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

export default function FeedbackTab({ onCountChange }) {
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('new')
  const [kind, setKind]     = useState('all')
  const [error, setError]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    const { data, error } = await supabase.from('platform_feedback')
      .select('*, profiles(first_name, last_name, email), organizations(name)')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) setError(error.message)
    setItems(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { onCountChange?.(items.filter(i => i.status === 'new').length) }, [items, onCountChange])

  async function update(id, patch) {
    setItems(list => list.map(i => i.id === id ? { ...i, ...patch } : i))
    const { error } = await supabase.from('platform_feedback').update(patch).eq('id', id)
    if (error) { setError(error.message); load() }
  }

  async function remove(id) {
    if (!window.confirm('Delete this message for good?')) return
    const { error } = await supabase.from('platform_feedback').delete().eq('id', id)
    if (error) { setError(error.message); return }
    setItems(list => list.filter(i => i.id !== id))
  }

  const shown = items.filter(i => (status === 'all' || i.status === status) && (kind === 'all' || i.kind === kind))
  const countFor = (s) => s === 'all' ? items.length : items.filter(i => i.status === s).length

  return (
    <div className="space-y-5">
      <div>
        <h2 style={{ fontFamily: '"Playfair Display", serif' }} className="text-xl font-semibold text-white">Help &amp; Feedback</h2>
        <p className="text-slate-500 text-sm mt-0.5">Help requests and improvement suggestions from staff, families, and residents in every community.</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_TABS.map(t => (
          <button key={t.key} onClick={() => setStatus(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${status === t.key ? 'bg-brand-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            {t.label} <span className="opacity-60">{countFor(t.key)}</span>
          </button>
        ))}
        <select value={kind} onChange={e => setKind(e.target.value)}
          className="ml-auto bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-300">
          <option value="all">Help &amp; suggestions</option>
          <option value="help">Help requests</option>
          <option value="suggestion">Suggestions</option>
        </select>
      </div>

      {error && <div className="text-sm text-red-400">{error}</div>}

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500 py-10 justify-center"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : shown.length === 0 ? (
        <div className="text-center text-slate-500 py-16 border border-dashed border-slate-800 rounded-xl">Nothing here.</div>
      ) : (
        <div className="space-y-3">
          {shown.map(item => <FeedbackCard key={item.id} item={item} onChange={update} onDelete={remove} />)}
        </div>
      )}
    </div>
  )
}
