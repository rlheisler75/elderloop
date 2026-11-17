import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Plug, Check, X, RotateCcw, Send, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { PCC_KIND_LABELS, PCC_STATUS, pccError, fmtStamp } from './pccOutbound'

// The PointClickCare outbound queue: everything waiting to be written into PCC,
// with Approve / Cancel / Retry for the people allowed to approve each kind
// (pcc_can_approve) and "Send approved now" (send-pcc-outbound Edge Function).
// Used in Admin Panel → PointClickCare (all kinds), Social Services → PointClickCare
// (notes and contacts) and Meter billing (charges).

const FILTERS = [
  { key: 'open',   label: 'Needs attention', statuses: ['pending', 'approved', 'sending', 'failed'] },
  { key: 'sent',   label: 'Sent',            statuses: ['sent'] },
  { key: 'closed', label: 'Cancelled',       statuses: ['cancelled'] },
  { key: 'all',    label: 'All',             statuses: null },
]
const money = (n) => n == null ? '—' : `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function Preview({ item }) {
  const p = item.payload || {}
  if (item.kind === 'progress_note') {
    return (
      <div className="text-xs text-slate-600 dark:text-slate-300">
        <div className="text-slate-400 mb-1">{p.note_type} progress note · effective {p.effective_date}{p.author_name ? ` · written by ${p.author_name}` : ''}</div>
        <div className="whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3">{p.text}</div>
      </div>
    )
  }
  if (item.kind === 'charge') {
    return (
      <table className="w-full text-xs">
        <thead className="text-slate-400"><tr>
          <th className="text-left py-1">Date</th><th className="text-left py-1">Utility / meter</th>
          <th className="text-right py-1">Usage</th><th className="text-right py-1">Amount</th>
        </tr></thead>
        <tbody className="text-slate-600 dark:text-slate-300">
          {(p.lines || []).map((l, i) => (
            <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
              <td className="py-1">{l.reading_date}</td>
              <td className="py-1">{l.utility || 'Utility'}{l.meter_number ? ` · ${l.meter_number}` : ''}</td>
              <td className="py-1 text-right">{l.usage ?? ''} {l.usage_unit || ''}</td>
              <td className="py-1 text-right">{money(l.amount)}</td>
            </tr>
          ))}
          <tr className="border-t border-slate-200 dark:border-slate-700 font-semibold">
            <td colSpan={3} className="py-1 text-right">Total</td><td className="py-1 text-right">{money(p.total)}</td>
          </tr>
        </tbody>
      </table>
    )
  }
  return (
    <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
      {(p.contacts || []).map((c, i) => (
        <li key={i}>
          <span className="font-medium">{c.name}</span>{c.relationship ? ` (${c.relationship})` : ''}{c.is_primary ? ' · primary' : ''}
          {[c.phone, c.alt_phone, c.email].filter(Boolean).length > 0 && <span className="text-slate-400"> · {[c.phone, c.alt_phone, c.email].filter(Boolean).join(' · ')}</span>}
        </li>
      ))}
      <li className="text-slate-400">{p.note}</li>
    </ul>
  )
}

export default function PccOutboundQueue({ kinds = ['progress_note', 'charge', 'contact_update'], title = 'Sending to PointClickCare' }) {
  const { organization, profile } = useAuth()
  const connected = !!organization?.pcc_facility_id?.trim?.()
  const [cancelling, setCancelling]     = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [filter, setFilter]     = useState('open')
  const [items, setItems]       = useState(null)
  const [names, setNames]       = useState({})
  const [perms, setPerms]       = useState({ approve: [], queue: [] })
  const [expanded, setExpanded] = useState(null)
  const [busyId, setBusyId]     = useState(null)
  const [sending, setSending]   = useState(false)
  const [message, setMessage]   = useState(null)
  const kindsKey = kinds.join(',')

  const load = useCallback(async () => {
    const statuses = FILTERS.find(f => f.key === filter)?.statuses
    let q = supabase.from('pcc_outbound').select('*').in('kind', kindsKey.split(','))
      .order('created_at', { ascending: false }).limit(200)
    if (statuses) q = q.in('status', statuses)
    const [{ data, error }, { data: p }] = await Promise.all([q, supabase.rpc('pcc_my_permissions')])
    if (error) { setMessage({ type: 'error', text: error.message }); setItems([]); return }
    setItems(data || [])
    setPerms(p || { approve: [], queue: [] })
    const ids = [...new Set((data || []).map(i => i.resident_id).filter(Boolean))]
    if (ids.length) {
      const { data: rs } = await supabase.from('residents').select('id,first_name,last_name').in('id', ids)
      setNames(Object.fromEntries((rs || []).map(r => [r.id, `${r.first_name} ${r.last_name}`])))
    }
  }, [filter, kindsKey])

  useEffect(() => { load() }, [load])

  const decide = async (item, decision, reason = null) => {
    setBusyId(item.id); setMessage(null)
    const { error } = await supabase.rpc('pcc_outbound_decide', { p_id: item.id, p_decision: decision, p_reason: reason })
    setBusyId(null)
    setCancelling(null); setCancelReason('')
    if (error) setMessage({ type: 'error', text: pccError(error) })
    load()
  }

  const sendNow = async () => {
    setSending(true); setMessage(null)
    const { data, error } = await supabase.functions.invoke('send-pcc-outbound', { body: {} })
    setSending(false)
    if (error || data?.success === false) setMessage({ type: 'error', text: data?.error || error.message })
    else {
      const recovered = data.recovered
        ? ` ${data.recovered} item${data.recovered === 1 ? ' was' : 's were'} stuck sending and marked Failed: check PointClickCare before retrying.`
        : ''
      setMessage({
        type: data.failed || data.recovered ? 'error' : 'info',
        text: (data.message || `Sent ${data.sent}${data.failed ? `, ${data.failed} failed` : ''}. ${data.waiting} still waiting.`) + recovered,
      })
    }
    load()
  }

  const canApprove = (kind) => perms.approve?.includes(kind)
  // Also offer the button when something has been stuck at "Sending" past the
  // sender's 15-minute limit, so running it marks those Failed (self-recovery).
  const stuck = (i) => i.status === 'sending' && Date.now() - new Date(i.updated_at).getTime() > 15 * 60 * 1000
  const approvedWaiting = (items || []).some(i => (i.status === 'approved' || stuck(i)) && canApprove(i.kind))

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h3 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Plug size={17} className="text-brand-600" /> {title}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Nothing goes into PointClickCare until someone allowed to approve it says so. What you approve is exactly what is sent,
            and ElderLoop only adds records in PointClickCare; it never changes or deletes them.
          </p>
          {!connected && (
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
              PointClickCare isn't connected for this community yet, so nothing can be queued. Add the PCC Facility ID in Org Settings once the partnership is set up.
            </p>
          )}
        </div>
        {approvedWaiting && (
          <button onClick={sendNow} disabled={sending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white">
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send approved now
          </button>
        )}
      </div>

      <div className="flex gap-1 mb-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === f.key ? 'bg-white dark:bg-slate-900 text-brand-700 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {message && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm border ${message.type === 'error'
          ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-400'
          : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300'}`}>{message.text}</div>
      )}

      {items === null ? (
        <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-400">Nothing here.</div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map(item => {
            const s = PCC_STATUS[item.status] || {}
            const open = expanded === item.id
            const mayApprove = canApprove(item.kind)
            return (
              <div key={item.id} className="py-3">
                <div className="flex items-start gap-3">
                  <button onClick={() => setExpanded(open ? null : item.id)} className="mt-0.5 text-slate-400 hover:text-slate-600" title="Show what will be sent">
                    {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{names[item.resident_id] || 'Resident'}</span>
                      <span className="text-xs text-slate-500">{PCC_KIND_LABELS[item.kind]} · {item.summary}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full border text-xs font-medium ${s.cls}`}>{s.label}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Queued by {item.created_by_name || 'someone'} · {fmtStamp(item.created_at)}
                      {item.decided_by_name && ` · ${item.status === 'cancelled' ? 'Cancelled' : 'Approved'} by ${item.decided_by_name} · ${fmtStamp(item.decided_at)}`}
                      {item.sent_at && ` · Sent ${fmtStamp(item.sent_at)}${item.pcc_ref ? ` (PCC ${item.pcc_ref})` : ''}`}
                    </div>
                    {item.cancel_reason && <div className="text-xs text-slate-500 mt-1">Reason: {item.cancel_reason}</div>}
                    {item.error && <div className="text-xs text-red-600 dark:text-red-400 mt-1">{item.error}</div>}
                    {open && <div className="mt-3"><Preview item={item} /></div>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {item.status === 'pending' && mayApprove && (
                      <button onClick={() => decide(item, 'approve')} disabled={busyId === item.id}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50">
                        <Check size={12} /> Approve
                      </button>
                    )}
                    {item.status === 'failed' && mayApprove && (
                      <button onClick={() => decide(item, 'retry')} disabled={busyId === item.id}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                        <RotateCcw size={12} /> Retry
                      </button>
                    )}
                    {((['pending', 'approved', 'failed'].includes(item.status) && mayApprove) || (item.status === 'pending' && item.created_by === profile?.id)) && cancelling !== item.id ? (
                      <button onClick={() => { setCancelling(item.id); setCancelReason('') }} disabled={busyId === item.id}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-500 hover:text-red-600">
                        <X size={12} /> Cancel
                      </button>
                    ) : null}
                  </div>
                </div>
                {cancelling === item.id && (
                  <div className="mt-2 ml-7 flex flex-wrap items-center gap-2">
                    <input autoFocus value={cancelReason} onChange={e => setCancelReason(e.target.value)} maxLength={300}
                      placeholder="Reason (optional)"
                      className="flex-1 min-w-[200px] px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 dark:text-slate-100" />
                    <button onClick={() => decide(item, 'cancel', cancelReason)} disabled={busyId === item.id}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50">Cancel this item</button>
                    <button onClick={() => setCancelling(null)} className="px-2 py-1.5 text-xs text-slate-500">Keep it</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
