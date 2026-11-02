// src/components/FeedbackModal.jsx
// "Help & Feedback": staff, family, and residents send a help request or an
// improvement suggestion to the ElderLoop team (Super Admin → Help & Feedback).
// Sender, community, and role are stamped server-side by platform_feedback_stamp.
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { X, LifeBuoy, Lightbulb, CheckCircle2, AlertCircle, Loader2, Send } from 'lucide-react'

const KINDS = [
  { key: 'help',       label: 'I need help',         icon: LifeBuoy,  hint: 'Something isn\'t working or you can\'t find how to do something.' },
  { key: 'suggestion', label: 'I have a suggestion', icon: Lightbulb, hint: 'An idea that would make ElderLoop better for you.' },
]

export default function FeedbackModal({ onClose }) {
  const [kind, setKind]       = useState('help')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError]     = useState(null)
  const [sent, setSent]       = useState(false)

  const canSend = subject.trim().length >= 3 && message.trim().length >= 3 && !sending

  async function send() {
    if (!canSend) return
    setSending(true); setError(null)
    const { error } = await supabase.from('platform_feedback').insert({
      kind,
      subject: subject.trim().slice(0, 150),
      message: message.trim().slice(0, 5000),
      page: window.location.pathname,
    })
    setSending(false)
    if (error) { setError('Your message didn\'t send. Please try again in a moment.'); return }
    setSent(true)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-display font-semibold text-lg text-slate-900 dark:text-slate-100">Help &amp; Feedback</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {sent ? (
          <div className="px-5 py-10 text-center">
            <CheckCircle2 size={40} className="mx-auto text-green-500 mb-3" />
            <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Thank you! Your message was sent.</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">The ElderLoop team will look at it and follow up if needed.</p>
            <button onClick={onClose} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl">Done</button>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {KINDS.map(k => {
                const Icon = k.icon
                const active = kind === k.key
                return (
                  <button key={k.key} onClick={() => setKind(k.key)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${active
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <Icon size={16} className="flex-shrink-0" />{k.label}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">{KINDS.find(k => k.key === kind).hint}</p>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Subject</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} maxLength={150}
                placeholder={kind === 'help' ? 'e.g. I can\'t find the menu for this week' : 'e.g. Let me print the activity calendar'}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Details</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} maxLength={5000}
                placeholder={kind === 'help' ? 'What were you trying to do, and what happened?' : 'What would you like to see, and how would it help?'}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y" />
            </div>

            <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg px-3 py-2">
              This goes to the ElderLoop software team, not your community's staff. Please don't include health or medical information. For emergencies, call the front desk or use your call button.
            </p>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle size={15} className="flex-shrink-0" />{error}
              </div>
            )}

            <div className="flex justify-end gap-2 pb-1">
              <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">Cancel</button>
              <button onClick={send} disabled={!canSend}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl">
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
