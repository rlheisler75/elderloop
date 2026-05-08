import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Mail, Building, ChevronDown, Check, Users,
  TrendingUp, Calendar, DollarSign, MessageSquare,
  Clock, Star, XCircle, Phone, ExternalLink, Plus,
} from 'lucide-react'

// ── Pipeline stages ───────────────────────────────────────────
const STAGES = [
  { key: 'new',           label: 'New',            color: 'bg-blue-500',    text: 'text-blue-400',   badge: 'bg-blue-900/40 text-blue-300 border-blue-700/40' },
  { key: 'contacted',     label: 'Contacted',      color: 'bg-amber-500',   text: 'text-amber-400',  badge: 'bg-amber-900/40 text-amber-300 border-amber-700/40' },
  { key: 'demo_scheduled',label: 'Demo Scheduled', color: 'bg-purple-500',  text: 'text-purple-400', badge: 'bg-purple-900/40 text-purple-300 border-purple-700/40' },
  { key: 'pilot',         label: 'Pilot',          color: 'bg-cyan-500',    text: 'text-cyan-400',   badge: 'bg-cyan-900/40 text-cyan-300 border-cyan-700/40' },
  { key: 'trial',         label: 'Trial',          color: 'bg-indigo-500',  text: 'text-indigo-400', badge: 'bg-indigo-900/40 text-indigo-300 border-indigo-700/40' },
  { key: 'active',        label: 'Active',         color: 'bg-green-500',   text: 'text-green-400',  badge: 'bg-green-900/40 text-green-300 border-green-700/40' },
  { key: 'cancelled',     label: 'Cancelled',      color: 'bg-rose-500',    text: 'text-rose-400',   badge: 'bg-rose-900/40 text-rose-300 border-rose-700/40' },
  { key: 'not_interested',label: 'Not Interested', color: 'bg-slate-500',   text: 'text-slate-400',  badge: 'bg-slate-800 text-slate-400 border-slate-700' },
  { key: 'not_a_fit',     label: 'Not a Fit',      color: 'bg-slate-600',   text: 'text-slate-500',  badge: 'bg-slate-800 text-slate-500 border-slate-700' },
]

const getStage = (key) => STAGES.find(s => s.key === key) || STAGES[0]

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null
const fmtRelative = (iso) => {
  if (!iso) return null
  const days = Math.floor((Date.now() - new Date(iso)) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7)  return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

// ── Lead detail drawer ────────────────────────────────────────
function LeadDrawer({ lead, onClose, onSave }) {
  const [form, setForm] = useState({
    status:         lead.status,
    notes:          lead.notes || '',
    next_follow_up: lead.next_follow_up || '',
    arr:            lead.arr || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const stage = getStage(form.status)

  const handleSave = async () => {
    setSaving(true)
    const updates = {
      status:         form.status,
      notes:          form.notes || null,
      next_follow_up: form.next_follow_up || null,
      arr:            form.arr ? parseFloat(form.arr) : null,
      updated_at:     new Date().toISOString(),
    }
    // Auto-stamp timestamps on stage transitions
    if (form.status === 'contacted' && !lead.contacted_at)  updates.contacted_at  = new Date().toISOString()
    if (form.status === 'demo_scheduled' && !lead.demo_at)  updates.demo_at       = new Date().toISOString()
    if (form.status === 'active' && !lead.converted_at)     updates.converted_at  = new Date().toISOString()

    await supabase.from('waitlist').update(updates).eq('id', lead.id)
    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/60" onClick={onClose} />
      {/* Drawer */}
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-700 flex flex-col h-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-800 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-white font-semibold text-lg">{lead.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${stage.badge}`}>
                {stage.label}
              </span>
            </div>
            {lead.role && <div className="text-slate-400 text-sm">{lead.role}</div>}
            {lead.community && (
              <div className="flex items-center gap-1.5 text-slate-400 text-sm mt-0.5">
                <Building size={12} /> {lead.community}
                {lead.community_size && <span className="text-slate-600">· {lead.community_size}</span>}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white ml-4 flex-shrink-0">
            <XCircle size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Contact */}
          <div className="flex gap-2">
            <a href={`mailto:${lead.email}?subject=Following up on ElderLoop&body=Hi ${lead.name.split(' ')[0]},%0D%0A%0D%0A`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-xl transition-colors">
              <Mail size={14} /> Email
            </a>
            <a href={`tel:`}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-slate-700 text-slate-300 text-sm font-medium rounded-xl hover:border-slate-500 transition-colors">
              <Phone size={14} />
            </a>
          </div>

          {/* Timeline */}
          <div className="bg-slate-800/50 rounded-xl p-4 space-y-2 text-xs">
            <div className="text-slate-500 uppercase tracking-wider font-semibold mb-2">Timeline</div>
            {[
              { label: 'Submitted',       date: lead.created_at },
              { label: 'Contacted',       date: lead.contacted_at },
              { label: 'Demo',            date: lead.demo_at },
              { label: 'Converted',       date: lead.converted_at },
            ].map(({ label, date }) => date && (
              <div key={label} className="flex items-center justify-between">
                <span className="text-slate-400">{label}</span>
                <span className="text-slate-300">{fmtDate(date)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Submitted</span>
              <span className="text-slate-300">{fmtDate(lead.created_at)}</span>
            </div>
          </div>

          {/* Pain point */}
          {lead.message && (
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Their Pain Point</div>
              <div className="bg-slate-800/50 rounded-xl p-4 text-slate-300 text-sm italic leading-relaxed">
                "{lead.message}"
              </div>
            </div>
          )}

          {/* Stage */}
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Pipeline Stage</label>
            <div className="grid grid-cols-3 gap-1.5">
              {STAGES.map(s => (
                <button key={s.key} onClick={() => set('status', s.key)}
                  className={`py-2 px-2 rounded-lg border text-xs font-semibold transition-all text-center ${
                    form.status === s.key
                      ? `${s.badge} border-current`
                      : 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* ARR */}
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
              Estimated ARR <span className="text-slate-600 font-normal normal-case">(annual contract value)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
              <input type="number" value={form.arr} onChange={e => set('arr', e.target.value)}
                placeholder="0"
                className="w-full pl-7 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
            </div>
          </div>

          {/* Follow-up */}
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Next Follow-Up</label>
            <input type="date" value={form.next_follow_up} onChange={e => set('next_follow_up', e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500"
              style={{ colorScheme: 'dark' }} />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={5}
              placeholder="Conversation notes, objections, next steps..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 resize-none placeholder-slate-600" />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 flex-shrink-0">
          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-800 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
            <Check size={16} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Leads Tab ────────────────────────────────────────────
export default function LeadsTab() {
  const [leads, setLeads]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)
  const [filterStage, setFilterStage] = useState('all')
  const [search, setSearch]       = useState('')

  useEffect(() => { fetchLeads() }, [])

  async function fetchLeads() {
    setLoading(true)
    const { data } = await supabase.from('waitlist')
      .select('*').order('created_at', { ascending: false })
    setLeads(data || [])
    setLoading(false)
  }

  const filtered = leads.filter(l => {
    const matchStage = filterStage === 'all' || l.status === filterStage
    const matchSearch = !search || [l.name, l.email, l.community].filter(Boolean)
      .some(f => f.toLowerCase().includes(search.toLowerCase()))
    return matchStage && matchSearch
  })

  // Pipeline stats
  const active    = leads.filter(l => l.status === 'active').length
  const inPipeline = leads.filter(l => !['cancelled','not_interested','not_a_fit'].includes(l.status)).length
  const totalArr  = leads.filter(l => l.arr).reduce((sum, l) => sum + (l.arr || 0), 0)
  const followUpToday = leads.filter(l => l.next_follow_up === new Date().toISOString().split('T')[0]).length

  return (
    <>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Leads',      value: leads.length,  color: 'text-brand-400',  bg: 'bg-brand-900/30' },
            { label: 'In Pipeline',      value: inPipeline,    color: 'text-blue-400',   bg: 'bg-blue-900/30' },
            { label: 'Active',           value: active,        color: 'text-green-400',  bg: 'bg-green-900/30' },
            { label: 'Follow Up Today',  value: followUpToday, color: 'text-amber-400',  bg: 'bg-amber-900/30' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border border-white/5 rounded-2xl p-4`}>
              <div className={`text-2xl font-bold ${s.color}`} style={{ fontFamily: '"Playfair Display", serif' }}>{s.value}</div>
              <div className="text-slate-500 text-xs mt-0.5 font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 items-center flex-wrap">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, community..."
            className="flex-1 min-w-48 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 placeholder-slate-600" />
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setFilterStage('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStage === 'all' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
              All ({leads.length})
            </button>
            {STAGES.map(s => {
              const count = leads.filter(l => l.status === s.key).length
              if (!count) return null
              return (
                <button key={s.key} onClick={() => setFilterStage(s.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStage === s.key ? `${s.badge} border` : 'text-slate-500 hover:text-slate-300'}`}>
                  {s.label} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-16 text-slate-500">Loading leads...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Users size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-lg" style={{ fontFamily: '"Playfair Display", serif' }}>No leads yet</p>
            <p className="text-sm mt-1">Submissions from <a href="https://elderloop.xyz/early-access" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">elderloop.xyz/early-access</a> will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(lead => {
              const stage = getStage(lead.status)
              const overdue = lead.next_follow_up && lead.next_follow_up < new Date().toISOString().split('T')[0]
              const dueToday = lead.next_follow_up === new Date().toISOString().split('T')[0]
              return (
                <button key={lead.id} onClick={() => setSelected(lead)}
                  className="w-full bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 rounded-2xl p-4 flex items-center gap-4 text-left transition-all group">
                  {/* Stage dot */}
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${stage.color}`} />

                  {/* Avatar */}
                  <div className="w-9 h-9 bg-brand-800/60 rounded-xl flex items-center justify-center text-brand-400 font-bold text-sm flex-shrink-0">
                    {lead.name?.[0]?.toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-sm font-semibold">{lead.name}</span>
                      {lead.role && <span className="text-slate-500 text-xs">{lead.role}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 flex-wrap">
                      <span>{lead.email}</span>
                      {lead.community && <><span>·</span><span>{lead.community}</span></>}
                      {lead.community_size && <><span>·</span><span>{lead.community_size}</span></>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* ARR */}
                    {lead.arr > 0 && (
                      <span className="text-green-400 text-xs font-semibold">
                        ${lead.arr.toLocaleString()}/yr
                      </span>
                    )}
                    {/* Follow-up indicator */}
                    {(overdue || dueToday) && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${overdue ? 'bg-red-900/40 text-red-400' : 'bg-amber-900/40 text-amber-400'}`}>
                        {overdue ? 'Overdue' : 'Today'}
                      </span>
                    )}
                    {/* Stage badge */}
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${stage.badge}`}>
                      {stage.label}
                    </span>
                    {/* Submitted */}
                    <span className="text-slate-600 text-xs">{fmtRelative(lead.created_at)}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Drawer */}
      {selected && (
        <LeadDrawer
          lead={selected}
          onClose={() => setSelected(null)}
          onSave={() => { setSelected(null); fetchLeads() }}
        />
      )}
    </>
  )
}
