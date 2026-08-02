import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Modal, Field, inputCls, selectCls } from './ui'
import { LEAD_STATUSES, CARE_LEVELS, fmt } from './constants'

export default function EmailComposerModal({ campaign, leads, onClose }) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [templates, setTemplates] = useState([])
  const [templateId, setTemplateId] = useState('')
  const [statusFilter, setStatusFilter] = useState([])
  const [careLevelFilter, setCareLevelFilter] = useState([])
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!campaign.organization_id) return
    supabase.from('email_templates').select('*').eq('organization_id', campaign.organization_id).order('name')
      .then(({ data }) => setTemplates(data || []))
  }, [campaign.organization_id])

  const applyTemplate = (id) => {
    setTemplateId(id)
    const t = templates.find(t => t.id === id)
    if (t) { setSubject(t.subject); setBody(t.body) }
  }

  const toggleFilter = (setter) => (value) => setter(f => f.includes(value) ? f.filter(x => x !== value) : [...f, value])

  const eligibleLeads = leads.filter(l =>
    l.email && !l.email_opt_out &&
    (statusFilter.length === 0 || statusFilter.includes(l.status)) &&
    (careLevelFilter.length === 0 || (l.care_level_interest || []).some(c => careLevelFilter.includes(c)))
  )

  const send = async () => {
    if (!subject || !body || !eligibleLeads.length) return
    setSending(true)
    setError('')
    const { data: { session } } = await supabase.auth.getSession()
    const { data, error: fnError } = await supabase.functions.invoke('send-marketing-email', {
      body: { campaign_id: campaign.id, subject, body, lead_ids: eligibleLeads.map(l => l.id) },
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
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-400 text-sm">{error}</div>
          )}

          <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Filter by status</p>
              <div className="flex flex-wrap gap-1.5">
                {LEAD_STATUSES.map(s => (
                  <button key={s.key} type="button" onClick={() => toggleFilter(setStatusFilter)(s.key)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      statusFilter.includes(s.key) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-300'
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Filter by care level interest</p>
              <div className="flex flex-wrap gap-1.5">
                {CARE_LEVELS.map(lvl => (
                  <button key={lvl} type="button" onClick={() => toggleFilter(setCareLevelFilter)(lvl)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      careLevelFilter.includes(lvl) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-300'
                    }`}>
                    {fmt(lvl)}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{eligibleLeads.length}</span> recipient{eligibleLeads.length === 1 ? '' : 's'} match{eligibleLeads.length === 1 ? 'es' : ''} (email on file, not opted out{statusFilter.length || careLevelFilter.length ? ', filters applied' : ''}).
            </p>
          </div>

          <div className="space-y-4">
            {templates.length > 0 && (
              <Field label="Start from a Template">
                <select className={selectCls} value={templateId} onChange={e => applyTemplate(e.target.value)}>
                  <option value="">— Blank —</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
            )}
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
            <button onClick={send} disabled={sending || !subject || !body || !eligibleLeads.length}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
              {sending ? 'Sending…' : `Send to ${eligibleLeads.length}`}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
