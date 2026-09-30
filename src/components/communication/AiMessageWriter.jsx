import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAiSection } from '../../hooks/useAiSection'
import { Sparkles, Check, ChevronDown, ChevronUp, Languages } from 'lucide-react'

// Must match LANGUAGES in the ai-assist Edge Function
const LANGUAGES = ['Spanish', 'Chinese (Simplified)', 'Vietnamese', 'Tagalog', 'Korean', 'Russian']

const inputCls = 'w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
const btn = 'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

// AI Add-on (Communication section): write a broadcast / announcement from a brief,
// improve the current draft, or translate it. Only the brief, the current draft,
// the audience TYPE, and channels are sent — never recipient names. Nothing changes
// until "Use this" (with Undo).
//   kind:     'broadcast' | 'announcement'
//   audience: ComposeModal audience_type, or 'board' for announcements
//   onApply({ title, body, category })
export default function AiMessageWriter({ kind, audience, channels = [], title, body, category, onApply }) {
  const enabled = useAiSection('communication')
  const [open, setOpen]         = useState(false)
  const [brief, setBrief]       = useState('')
  const [language, setLanguage] = useState('Spanish')
  const [loading, setLoading]   = useState(null) // 'write' | 'improve' | 'translate'
  const [draft, setDraft]       = useState(null) // { title, body, category } or { error }
  const [before, setBefore]     = useState(null) // { title, body, category } before "Use this", for Undo

  if (!enabled) return null

  const hasDraft = !!(title?.trim() || body?.trim())
  const sms = channels.includes('sms')

  async function run(mode) {
    setLoading(mode); setDraft(null); setBefore(null)
    const { data, error } = await supabase.functions.invoke('ai-assist', {
      body: {
        task: 'comm_draft', mode, kind, audience, channels, brief, language,
        ...(mode !== 'write' ? { title, body } : {}),
      },
    })
    setDraft(error || !data?.suggestion
      ? { error: 'Couldn’t write a draft right now — your message is unchanged.' }
      : { ...data.suggestion, mode })
    setLoading(null)
  }

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
          <textarea className={inputCls + ' resize-none'} rows={2} value={brief} onChange={e => setBrief(e.target.value)}
            placeholder={hasDraft
              ? 'What should it say? (or leave blank and use Improve / Translate below)'
              : 'What should it say? e.g. Water off in Building B tomorrow 9–noon for repairs; bottled water at front desk'} />

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => run('write')} disabled={!!loading || !brief.trim()}
              className={`${btn} text-white bg-brand-600 hover:bg-brand-700`}>
              <Sparkles size={13} className={loading === 'write' ? 'animate-pulse' : ''} />
              {loading === 'write' ? 'Writing...' : 'Write it'}
            </button>
            {hasDraft && (
              <>
                <button type="button" onClick={() => run('improve')} disabled={!!loading}
                  className={`${btn} text-brand-700 dark:text-brand-400 bg-white dark:bg-slate-900 border border-brand-200 dark:border-brand-900 hover:bg-brand-50`}>
                  <Sparkles size={13} className={loading === 'improve' ? 'animate-pulse' : ''} />
                  {loading === 'improve' ? 'Improving...' : 'Improve my draft'}
                </button>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => run('translate')} disabled={!!loading}
                    className={`${btn} text-brand-700 dark:text-brand-400 bg-white dark:bg-slate-900 border border-brand-200 dark:border-brand-900 hover:bg-brand-50`}>
                    <Languages size={13} className={loading === 'translate' ? 'animate-pulse' : ''} />
                    {loading === 'translate' ? 'Translating...' : 'Translate to'}
                  </button>
                  <select value={language} onChange={e => setLanguage(e.target.value)} disabled={!!loading}
                    className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg">
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>

          {draft?.error && <p className="text-xs text-red-600">{draft.error}</p>}

          {draft?.body && before === null && (
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
              <div className="text-xs font-semibold text-brand-700 dark:text-brand-400 mb-1">
                {draft.mode === 'translate' ? `${language} translation` : 'Suggested message'} — review before {kind === 'announcement' ? 'posting' : 'sending'}
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{draft.title}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap mt-1">{draft.body}</p>
              <p className="mt-1 text-[11px] text-slate-400">
                Category: {draft.category}{sms ? ` · ${draft.body.length}/160 characters` : ''}
              </p>
              {/\[[A-Z][A-Z ]*\]/.test(draft.title + draft.body) && (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Fill in the [BRACKETED] placeholders first.</p>
              )}
              <button type="button"
                onClick={() => {
                  setBefore({ title, body, category })
                  onApply({ title: draft.title, body: draft.body, category: draft.category })
                }}
                className={`${btn} mt-2 text-white bg-brand-600 hover:bg-brand-700`}>
                <Check size={13} /> Use this
              </button>
            </div>
          )}

          {before !== null && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Message replaced with the AI {draft?.mode === 'translate' ? 'translation' : 'draft'}.{' '}
              <button type="button" onClick={() => { onApply(before); setBefore(null) }}
                className="font-semibold text-brand-600 hover:underline">Undo</button>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
