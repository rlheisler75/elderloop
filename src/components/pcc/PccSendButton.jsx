import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Send, Loader2 } from 'lucide-react'
import { PCC_STATUS, pccError, fmtStamp } from './pccOutbound'

// "Send to PointClickCare" for one source record. Queues it for approval
// (pcc_queue_note / pcc_queue_contacts) and shows where it stands. Hidden until the
// community has a PCC Facility ID. Props:
//   kind="progress_note" sourceTable="ss_case_notes|ss_discharge_plans" sourceId
//   kind="contact_update" residentId
export default function PccSendButton({ kind, sourceTable, sourceId, residentId }) {
  const { organization } = useAuth()
  const connected = !!organization?.pcc_facility_id?.trim?.()
  const [item, setItem]   = useState(undefined) // undefined = loading, null = none
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    let q = supabase.from('pcc_outbound')
      .select('id,status,created_at,created_by_name,decided_by_name,decided_at,sent_at,pcc_ref,error,cancel_reason')
      .eq('kind', kind).order('created_at', { ascending: false }).limit(1)
    q = sourceId ? q.eq('source_table', sourceTable).eq('source_id', sourceId) : q.eq('resident_id', residentId)
    const { data } = await q
    setItem(data?.[0] || null)
  }, [kind, sourceTable, sourceId, residentId])

  useEffect(() => { if (connected && (sourceId || residentId)) load() }, [connected, sourceId, residentId, load])

  if (!connected || !(sourceId || residentId)) return null

  const queue = async () => {
    setBusy(true); setError('')
    const { error: err } = kind === 'contact_update'
      ? await supabase.rpc('pcc_queue_contacts', { p_resident: residentId })
      : await supabase.rpc('pcc_queue_note', { p_table: sourceTable, p_id: sourceId })
    setBusy(false)
    if (err) setError(pccError(err))
    else load()
  }

  // A note goes once; contacts can be sent again after the last update finished.
  const open = item && ['pending', 'approved', 'sending'].includes(item.status)
  const canQueue = !open && !(kind === 'progress_note' && item?.status === 'sent')
  const s = item && PCC_STATUS[item.status]

  return (
    <div className="flex flex-col items-start gap-1">
      {s && (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${s.cls}`}
          title={[
            item.created_by_name && `Queued by ${item.created_by_name} · ${fmtStamp(item.created_at)}`,
            item.decided_by_name && `${item.status === 'cancelled' ? 'Cancelled' : 'Approved'} by ${item.decided_by_name} · ${fmtStamp(item.decided_at)}`,
            item.sent_at && `Sent ${fmtStamp(item.sent_at)}${item.pcc_ref ? ` · PCC ${item.pcc_ref}` : ''}`,
            item.error, item.cancel_reason,
          ].filter(Boolean).join('\n')}>
          PointClickCare: {s.label}
        </span>
      )}
      {canQueue && item !== undefined && (
        <button type="button" onClick={queue} disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-brand-200 dark:border-brand-900 text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-950/40 disabled:opacity-50">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          {item?.status === 'sent' ? 'Send updated contacts to PointClickCare' : 'Send to PointClickCare'}
        </button>
      )}
      {error && <span className="text-xs text-red-600 dark:text-red-400 max-w-xs">{error}</span>}
    </div>
  )
}
