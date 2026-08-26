import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import {
  DollarSign, Clock, CheckCircle2, Loader2, ClipboardList,
  ChevronRight, X, Save
} from 'lucide-react'

const STATUS_TABS = [
  { key: 'all',      label: 'All' },
  { key: 'pending',  label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'paid',     label: 'Paid' },
]

const STATUS_STYLES = {
  pending:  'bg-amber-900/50 text-amber-400 border-amber-700',
  approved: 'bg-blue-900/50 text-blue-400 border-blue-700',
  paid:     'bg-green-900/50 text-green-400 border-green-700',
}

const EVENT_LABELS = { signup_bonus: 'Signup Bonus', residual: 'Monthly Residual' }

const fmtMoney = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

// ── Note editor modal (used when marking an event paid) ──
function NoteModal({ title, initialNote, onClose, onConfirm }) {
  const [note, setNote] = useState(initialNote || '')
  const [saving, setSaving] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h3 className="text-white font-semibold" style={{ fontFamily: '"Playfair Display", serif' }}>{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-6 py-5">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Note (optional)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
            placeholder="e.g. Paid via ACH 8/26"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
        </div>
        <div className="px-6 py-4 border-t border-slate-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 font-medium">Cancel</button>
          <button onClick={async () => { setSaving(true); await onConfirm(note); setSaving(false) }} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-900 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RepCommissionsTab() {
  const [events, setEvents]   = useState([])
  const [repMeta, setRepMeta] = useState({}) // { rep_id: code }
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('pending')
  const [marking, setMarking] = useState(null) // event being marked paid

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    const [{ data }, { data: codes }] = await Promise.all([
      supabase.from('rep_commission_events')
        .select('*, organizations(name), profiles(first_name, last_name)')
        .order('created_at', { ascending: false }),
      supabase.from('rep_codes').select('rep_id, code'),
    ])
    setEvents(data || [])
    const meta = {}
    ;(codes || []).forEach(c => { meta[c.rep_id] = c.code })
    setRepMeta(meta)
    setLoading(false)
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const approve = async (id) => {
    await supabase.from('rep_commission_events').update({ status: 'approved' }).eq('id', id)
    fetchEvents()
  }

  const markPaid = async (note) => {
    const payload = { status: 'paid' }
    if (note.trim()) payload.notes = note.trim()
    await supabase.from('rep_commission_events').update(payload).eq('id', marking.id)
    setMarking(null)
    fetchEvents()
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 size={28} className="animate-spin text-brand-400" />
    </div>
  )

  const filtered = tab === 'all' ? events : events.filter(e => e.status === tab)
  const totals = {
    pending:  events.filter(e => e.status === 'pending').reduce((s, e) => s + Number(e.amount), 0),
    approved: events.filter(e => e.status === 'approved').reduce((s, e) => s + Number(e.amount), 0),
    paid:     events.filter(e => e.status === 'paid').reduce((s, e) => s + Number(e.amount), 0),
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 style={{ fontFamily: '"Playfair Display", serif' }} className="text-xl font-semibold text-white">
          Rep Commissions
        </h2>
        <p className="text-slate-500 text-sm mt-0.5">Review and pay out signup bonuses and monthly residuals</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Pending Approval', value: fmtMoney(totals.pending),  icon: Clock,        color: 'text-amber-400' },
          { label: 'Approved / Owed',  value: fmtMoney(totals.approved), icon: ChevronRight, color: 'text-blue-400' },
          { label: 'Paid (All Time)',  value: fmtMoney(totals.paid),     icon: CheckCircle2, color: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <s.icon size={18} className={s.color} />
            </div>
            <div className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b border-slate-800">
        {STATUS_TABS.map(t => {
          const count = t.key === 'all' ? events.length : events.filter(e => e.status === t.key).length
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? 'border-brand-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}>
              {t.label} <span className="text-xs text-slate-600">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Ledger */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-600">
            <ClipboardList size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No {tab === 'all' ? '' : tab} commission events</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-slate-800">
              <tr>
                {['Rep', 'Account', 'Type', 'Period', 'Amount', 'Status', 'Notes', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="text-white text-sm font-medium">{e.profiles?.first_name} {e.profiles?.last_name}</div>
                    {repMeta[e.rep_id] && <div className="text-xs text-slate-500 font-mono">{repMeta[e.rep_id]}</div>}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-300">{e.organizations?.name || '—'}</td>
                  <td className="px-5 py-3">
                    <div className="text-sm text-slate-300">{EVENT_LABELS[e.event_type] || e.event_type}</div>
                    <div className="text-xs text-slate-500 capitalize">{e.plan || '—'}</div>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-400">
                    {e.period_start ? `${fmtDate(e.period_start)} – ${fmtDate(e.period_end)}` : 'One-time'}
                  </td>
                  <td className="px-5 py-3 text-sm font-semibold text-white">{fmtMoney(e.amount)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize border ${STATUS_STYLES[e.status] || 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500 max-w-[160px] truncate" title={e.notes || ''}>{e.notes || '—'}</td>
                  <td className="px-5 py-3">
                    {e.status === 'pending' && (
                      <button onClick={() => approve(e.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-blue-900/50 text-blue-400 border border-blue-700 hover:bg-blue-900 transition-colors">
                        Approve
                      </button>
                    )}
                    {e.status === 'approved' && (
                      <button onClick={() => setMarking(e)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-green-900/50 text-green-400 border border-green-700 hover:bg-green-900 transition-colors">
                        Mark Paid
                      </button>
                    )}
                    {e.status === 'paid' && <span className="text-xs text-slate-600">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {marking && (
        <NoteModal
          title={`Mark ${fmtMoney(marking.amount)} paid?`}
          initialNote={marking.notes}
          onClose={() => setMarking(null)}
          onConfirm={markPaid}
        />
      )}
    </div>
  )
}
