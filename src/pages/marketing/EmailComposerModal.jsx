import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Modal, Field, inputCls } from './ui'

export default function EmailComposerModal({ campaign, recipientCount, onClose }) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const send = async () => {
    if (!subject || !body) return
    setSending(true)
    setError('')
    const { data: { session } } = await supabase.auth.getSession()
    const { data, error: fnError } = await supabase.functions.invoke('send-marketing-email', {
      body: { campaign_id: campaign.id, subject, body },
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    setSending(false)
    if (fnError || data?.success === false) {
      setError(data?.error || fnError?.message || 'Failed to send')
      return
    }
    setResult(data)
  }

  return (
    <Modal title={`Send Email — ${campaign.name}`} onClose={onClose} wide>
      {result ? (
        <div className="text-center py-6">
          <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {result.sent} sent{result.skipped ? `, ${result.skipped} skipped` : ''}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {result.skipped ? 'Skipped leads had no email on file or had opted out.' : 'All eligible leads were emailed.'}
          </p>
          <button onClick={onClose} className="mt-6 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
            Done
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-500 mb-4">
            Sending to leads attached to this campaign ({recipientCount} with an email on file, excluding opt-outs).
          </p>
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-400 text-sm">{error}</div>
          )}
          <div className="space-y-4">
            <Field label="Subject" required>
              <input className={inputCls} value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Come tour our community this spring" />
            </Field>
            <Field label="Body" required>
              <textarea className={inputCls} rows={8} value={body} onChange={e=>setBody(e.target.value)}
                placeholder="Hi {{first_name}}, ..." />
              <p className="text-xs text-slate-400 mt-1.5">
                Merge tags: <code>{'{{first_name}}'}</code> <code>{'{{last_name}}'}</code> <code>{'{{prospect_first_name}}'}</code>
              </p>
            </Field>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
            <button onClick={send} disabled={sending || !subject || !body}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
              {sending ? 'Sending…' : 'Send Email'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
