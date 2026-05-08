import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Users, Mail, Building, ChevronDown, X, Check, Clock, Phone, XCircle, TrendingUp } from 'lucide-react'

const STATUS_CONFIG = {
  new:            { label: 'New',            color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500' },
  contacted:      { label: 'Contacted',      color: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500' },
  demo_scheduled: { label: 'Demo Scheduled', color: 'bg-purple-100 text-purple-700',dot: 'bg-purple-500' },
  converted:      { label: 'Converted',      color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  not_a_fit:      { label: 'Not a Fit',      color: 'bg-slate-100 text-slate-500',  dot: 'bg-slate-400' },
}

function WaitlistRow({ lead, onUpdate }) {
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState(lead.notes || '')
  const [status, setStatus] = useState(lead.status)
  const [saving, setSaving] = useState(false)
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('waitlist').update({
      status, notes, updated_at: new Date().toISOString()
    }).eq('id', lead.id)
    setSaving(false)
    onUpdate()
    setExpanded(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 transition-colors">
        {/* Avatar */}
        <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center text-brand-700 font-bold text-sm flex-shrink-0">
          {lead.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800 text-sm">{lead.name}</span>
            {lead.role && <span className="text-xs text-slate-400">{lead.role}</span>}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400 flex-wrap">
            <span className="flex items-center gap-1"><Mail size={10} />{lead.email}</span>
            {lead.community && <span className="flex items-center gap-1"><Building size={10} />{lead.community}</span>}
            {lead.community_size && <span>{lead.community_size}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 ${cfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
          <span className="text-xs text-slate-400">
            {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          <ChevronDown size={14} className={`text-slate-300 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
          {lead.message && (
            <div className="p-3 bg-slate-50 rounded-xl text-sm text-slate-600 italic">
              "{lead.message}"
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Quick Email</label>
              <a href={`mailto:${lead.email}?subject=Your ElderLoop Request&body=Hi ${lead.name.split(' ')[0]},%0D%0A%0D%0AThanks for your interest in ElderLoop!`}
                className="flex items-center justify-center gap-1.5 w-full px-3 py-2 border border-brand-200 text-brand-600 rounded-xl text-sm hover:bg-brand-50 transition-colors">
                <Mail size={13} /> Email {lead.name.split(' ')[0]}
              </a>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Internal Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Notes on this lead..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setExpanded(false)}
              className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-1.5">
              <Check size={13} /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function WaitlistViewer() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => { fetchLeads() }, [])

  async function fetchLeads() {
    setLoading(true)
    const { data } = await supabase.from('waitlist')
      .select('*').order('created_at', { ascending: false })
    setLeads(data || [])
    setLoading(false)
  }

  const filtered = filterStatus === 'all'
    ? leads
    : leads.filter(l => l.status === filterStatus)

  const stats = {
    total:     leads.length,
    new:       leads.filter(l => l.status === 'new').length,
    demo:      leads.filter(l => l.status === 'demo_scheduled').length,
    converted: leads.filter(l => l.status === 'converted').length,
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Leads',     value: stats.total,     color: 'text-brand-600',  bg: 'bg-brand-50' },
          { label: 'New',             value: stats.new,       color: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: 'Demo Scheduled',  value: stats.demo,      color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Converted',       value: stats.converted, color: 'text-green-600',  bg: 'bg-green-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
            <div className={`text-3xl font-bold font-display ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          All ({leads.length})
        </button>
        {Object.entries(STATUS_CONFIG).map(([key, { label }]) => {
          const count = leads.filter(l => l.status === key).length
          if (!count) return null
          return (
            <button key={key} onClick={() => setFilterStatus(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === key ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {label} ({count})
            </button>
          )
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Users size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-display text-lg text-slate-500">No leads yet</p>
          <p className="text-sm mt-1">Submissions from the early access form will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(lead => (
            <WaitlistRow key={lead.id} lead={lead} onUpdate={fetchLeads} />
          ))}
        </div>
      )}
    </div>
  )
}
