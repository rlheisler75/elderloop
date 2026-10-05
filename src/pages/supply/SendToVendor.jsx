import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Download, Printer, Mail, Send, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { downloadOrderCsv, printOrder, CHANNEL_LABELS } from '../../lib/vendorOrder'

// Send a submitted order to the vendor: download a CSV, print / save a PDF, or email it
// (send-purchase-order Edge Function, CSV attached, replies to the sender). Every send
// is logged in po_messages by record_po_message(), which is also where the permission
// and "submitted first" checks live. The history below is that log.
export default function SendToVendor({ po, vendorEmail, canSend }) {
  const [history, setHistory] = useState(null)
  const [to, setTo] = useState(vendorEmail || '')
  const [ccMe, setCcMe] = useState(true)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('po_messages')
      .select('id, direction, channel, message_type, status, recipient, error, created_at, profiles:created_by(first_name, last_name)')
      .eq('po_id', po.id).order('created_at', { ascending: false })
    setHistory(data || [])
  }, [po.id])
  useEffect(() => { load() }, [load])
  useEffect(() => { setTo(vendorEmail || '') }, [vendorEmail])

  const record = async (channel) => {
    const { data, error } = await supabase.rpc('record_po_message', { p_po: po.id, p_channel: channel })
    if (error) { setError(error.message); return null }
    return data?.[0]?.payload
  }

  const download = async () => {
    setBusy('download'); setError(''); setNotice('')
    const doc = await record('download')
    if (doc) downloadOrderCsv(doc)
    setBusy(null); load()
  }
  const print = async () => {
    setBusy('print'); setError(''); setNotice('')
    const doc = await record('print')
    if (doc && !printOrder(doc)) setError('Your browser blocked the print window. Allow pop-ups for ElderLoop and try again.')
    setBusy(null); load()
  }
  const email = async () => {
    setBusy('email'); setError(''); setNotice('')
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-purchase-order`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ po_id: po.id, to: to.trim(), cc_me: ccMe }),
      })
      const data = await res.json()
      if (!data.success) setError(data.error || 'The email could not be sent.')
      else setNotice(`Sent to ${to.trim()}.${ccMe ? ' A copy went to you.' : ''} Replies come to your email.`)
    } catch {
      setError('Something went wrong. Try again, or download the order and send it yourself.')
    }
    setBusy(null); load()
  }

  const sent = (history || []).filter(h => h.direction === 'outbound' && h.status !== 'failed')
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 mb-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Send size={16} className="text-brand-600" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Send to vendor</h3>
          {sent.length > 0
            ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400">Sent</span>
            : <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">Not sent yet</span>}
        </div>
      </div>

      {canSend && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button onClick={download} disabled={!!busy}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
              {busy === 'download' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download CSV
            </button>
            <button onClick={print} disabled={!!busy}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
              {busy === 'print' ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />} Print / Save PDF
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input type="email" value={to} onChange={e => setTo(e.target.value)} placeholder="Vendor's order email"
              className="flex-1 min-w-[220px] px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <label className="flex items-center gap-1.5 text-xs text-slate-500">
              <input type="checkbox" checked={ccMe} onChange={e => setCcMe(e.target.checked)} /> Copy me
            </label>
            <button onClick={email} disabled={!!busy || !to.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl">
              {busy === 'email' ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />} Email order
            </button>
          </div>
          <p className="text-xs text-slate-400">The CSV lists the vendor's item codes (from each item's Vendor Item Code), quantities, and expected prices. Email attaches the CSV; replies go to you.</p>
        </div>
      )}

      {error && <div className="mt-3 px-3 py-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-400 text-sm flex items-center gap-2"><AlertTriangle size={14} /> {error}</div>}
      {notice && <div className="mt-3 px-3 py-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg text-green-700 dark:text-green-400 text-sm flex items-center gap-2"><CheckCircle2 size={14} /> {notice}</div>}

      {history?.length > 0 && (
        <ul className="mt-4 space-y-1 text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3">
          {history.map(h => (
            <li key={h.id} className={h.status === 'failed' ? 'text-red-600 dark:text-red-400' : ''}>
              {new Date(h.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              {' · '}{CHANNEL_LABELS[h.channel] ?? h.channel}{h.recipient ? ` to ${h.recipient}` : ''}
              {h.profiles && ` by ${[h.profiles.first_name, h.profiles.last_name].filter(Boolean).join(' ')}`}
              {h.status === 'failed' && ' · failed'}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
