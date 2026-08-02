import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { Modal } from './ui'
import { CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react'

// Batched sends share a subject and land within seconds of each other, so
// bucketing by subject + a 10-minute window groups per-recipient rows back
// into the single "blast" the user actually triggered.
const BUCKET_MS = 10 * 60 * 1000

export default function EmailHistoryModal({ campaign, onClose }) {
  const [sends, setSends] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    supabase.from('email_sends')
      .select('*, lead:leads(first_name,last_name,email)')
      .eq('campaign_id', campaign.id)
      .order('sent_at', { ascending: false })
      .then(({ data }) => { setSends(data || []); setLoading(false) })
  }, [campaign.id])

  const blasts = useMemo(() => {
    const groups = new Map()
    for (const s of sends) {
      const bucket = Math.floor(new Date(s.sent_at).getTime() / BUCKET_MS)
      const key = `${s.subject}__${bucket}`
      if (!groups.has(key)) groups.set(key, { subject: s.subject, sent_at: s.sent_at, recipients: [] })
      groups.get(key).recipients.push(s)
    }
    return [...groups.values()].sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))
  }, [sends])

  return (
    <Modal title={`Email History — ${campaign.name}`} onClose={onClose} wide>
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : blasts.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No emails sent for this campaign yet.</p>
      ) : (
        <div className="space-y-3">
          {blasts.map((b, i) => {
            const sentCount = b.recipients.filter(r => r.status === 'sent').length
            const failedCount = b.recipients.filter(r => r.status === 'failed').length
            const isOpen = expanded === i
            return (
              <div key={i} className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => setExpanded(isOpen ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-2 text-left min-w-0">
                    {isOpen ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{b.subject}</p>
                      <p className="text-xs text-slate-400">{new Date(b.sent_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs shrink-0 ml-3">
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><CheckCircle size={12} />{sentCount}</span>
                    {failedCount > 0 && <span className="flex items-center gap-1 text-red-500"><XCircle size={12} />{failedCount}</span>}
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-50 dark:divide-slate-800 max-h-64 overflow-y-auto">
                    {b.recipients.map(r => (
                      <div key={r.id} className="px-4 py-2 flex items-center justify-between text-xs gap-3">
                        <span className="text-slate-600 dark:text-slate-300 truncate">
                          {r.lead ? `${r.lead.first_name} ${r.lead.last_name}` : 'Unknown lead'}
                          <span className="text-slate-400 ml-1">{r.lead?.email}</span>
                        </span>
                        {r.status === 'sent'
                          ? <span className="text-green-600 dark:text-green-400 shrink-0">Sent</span>
                          : <span className="text-red-500 shrink-0" title={r.error}>Failed</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
