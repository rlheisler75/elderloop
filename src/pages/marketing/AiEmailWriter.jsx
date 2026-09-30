import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAiSection } from '../../hooks/useAiSection'
import { Sparkles, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { inputCls } from './ui'

const TONES = [
  { key: 'warm',         label: 'Warm' },
  { key: 'professional', label: 'Professional' },
  { key: 'short',        label: 'Short & direct' },
]

// AI Add-on (Marketing section): write a campaign email / template from a short
// brief, or improve the current draft. Only the brief, audience filters, and the
// current draft are sent — never lead names or contact info. Nothing changes until
// "Use this draft" (with Undo).
export default function AiEmailWriter({ orgId, subject, body, onApply, statuses = [], careLevels = [] }) {
  const enabled = useAiSection('marketing')
  const [open, setOpen]       = useState(false)
  const [brief, setBrief]     = useState('')
  const [tone, setTone]       = useState('warm')
  const [loading, setLoading] = useState(null) // 'write' | 'improve'
  const [draft, setDraft]     = useState(null) // { subject, body } or { error }
  const [before, setBefore]   = useState(null) // { subject, body } before "Use this draft", for Undo

  if (!enabled) return null

  const hasDraft = !!(subject?.trim() || body?.trim())

  async function run(mode) {
    setLoading(mode); setDraft(null); setBefore(null)
    const { data, error } = await supabase.functions.invoke('ai-assist', {
      body: {
        task: 'mk_email_draft', mode, brief, tone, organization_id: orgId,
        statuses, care_levels: careLevels,
        ...(mode === 'improve' ? { subject, body } : {}),
      },
    })
    setDraft(error || !data?.suggestion
      ? { error: 'Couldn’t write a draft right now — your email is unchanged.' }
      : data.suggestion)
    setLoading(null)
  }

  const btn = 'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div className="border border-brand-200 dark:border-brand-900 bg-brand-50/50 dark:bg-brand-950/20 rounded-xl">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-brand-700 dark:text-brand-400">
        <Sparkles size={14} />
        <span className="flex-1 text-left">Write with AI</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          <textarea className={inputCls} rows={3} value={brief} onChange={e => setBrief(e.target.value)}
            placeholder="What's this email about? e.g. Spring open house Sat May 3, 1–4pm, tours of assisted living, lunch provided" />

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Tone:</span>
            {TONES.map(t => (
              <button key={t.key} type="button" onClick={() => setTone(t.key)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${tone === t.key
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-300'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => run('write')} disabled={!!loading || !brief.trim()}
              className={`${btn} text-white bg-brand-600 hover:bg-brand-700`}>
              <Sparkles size={13} className={loading === 'write' ? 'animate-pulse' : ''} />
              {loading === 'write' ? 'Writing...' : 'Write draft'}
            </button>
            {hasDraft && (
              <button type="button" onClick={() => run('improve')} disabled={!!loading}
                className={`${btn} text-brand-700 dark:text-brand-400 bg-white dark:bg-slate-900 border border-brand-200 dark:border-brand-900 hover:bg-brand-50`}>
                <Sparkles size={13} className={loading === 'improve' ? 'animate-pulse' : ''} />
                {loading === 'improve' ? 'Improving...' : 'Improve my current draft'}
              </button>
            )}
          </div>

          {draft?.error && <p className="text-xs text-red-600">{draft.error}</p>}

          {draft?.body && before === null && (
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
              <div className="text-xs font-semibold text-brand-700 dark:text-brand-400 mb-1">Suggested draft — review before sending</div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{draft.subject}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap mt-1">{draft.body}</p>
              {/\[[A-Z][A-Z ]*\]/.test(draft.subject + draft.body) && (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">Fill in the [BRACKETED] placeholders before sending.</p>
              )}
              <button type="button"
                onClick={() => { setBefore({ subject, body }); onApply(draft.subject, draft.body) }}
                className={`${btn} mt-2 text-white bg-brand-600 hover:bg-brand-700`}>
                <Check size={13} /> Use this draft
              </button>
            </div>
          )}

          {before !== null && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Subject and body replaced with the AI draft.{' '}
              <button type="button" onClick={() => { onApply(before.subject, before.body); setBefore(null) }}
                className="font-semibold text-brand-600 hover:underline">Undo</button>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
