import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { Copy, Check, Mail } from 'lucide-react'

const TEMPLATES = [
  {
    key: 'cold_intro',
    label: 'Cold Introduction',
    description: 'First outreach to a community you haven\'t talked to yet',
    subject: 'A quicker way to run {{community_placeholder}}',
    body: `Hi {{contact_first_name}},

I work with ElderLoop, software built specifically for senior living communities — resident records, staff scheduling, incident reports, and family communication all in one place instead of five different logins, working right alongside whatever EMR you already use for clinical billing.

I don't know what you're using today, but if it's a mix of paper, spreadsheets, and a system that wasn't built for senior living, I'd like to show you what a single afternoon on ElderLoop looks like.

There's a 14-day free trial, no contract, and you can see the whole platform here:
{{signup_link}}

Happy to jump on a quick call this week if that's easier — just reply and let me know a good time.

Best,
{{rep_name}}
ElderLoop`,
  },
  {
    key: 'warm_followup',
    label: 'Warm Follow-Up',
    description: 'After a call, demo request, or conversation at an event',
    subject: 'Following up — ElderLoop for {{community_placeholder}}',
    body: `Hi {{contact_first_name}},

Great talking with you — following up like I promised.

Here's your direct link to start a free 14-day trial of ElderLoop, no card required to look around:
{{signup_link}}

A few things worth remembering from our conversation:
- Everything is org-specific, so your team only sees your community's data
- Family members get their own portal — no more "can you email me a photo" requests
- Setup takes a day, not a quarter

If it's easier, I'm glad to walk your team through it live first. Just let me know what works.

Best,
{{rep_name}}
ElderLoop`,
  },
  {
    key: 'trial_checkin',
    label: 'Trial Check-In',
    description: 'Partway through someone\'s 14-day trial, or after a demo',
    subject: 'How\'s the ElderLoop trial going?',
    body: `Hi {{contact_first_name}},

Wanted to check in — you're a few days into your ElderLoop trial and I didn't want to leave you to figure it all out alone.

A couple of things people usually ask about around now:
- Yes, you can import your current resident roster — just reply and I'll help you get it in
- Every plan includes the Family Portal and Communication tools out of the box
- If you're not sure which plan fits your community's size, I'm happy to walk through it together

If you haven't started yet, your trial link is still good:
{{signup_link}}

Let me know if you'd like 15 minutes this week to go through anything live.

Best,
{{rep_name}}
ElderLoop`,
  },
]

function TemplateCard({ template, repName, signupLink }) {
  const [copiedField, setCopiedField] = useState(null)

  const fill = (text) => text
    .replaceAll('{{rep_name}}', repName || 'Your ElderLoop Rep')
    .replaceAll('{{signup_link}}', signupLink || '')
    .replaceAll('{{community_placeholder}}', '[Community Name]')
    .replaceAll('{{contact_first_name}}', '[First Name]')

  const filledSubject = fill(template.subject)
  const filledBody = fill(template.body)

  const copy = async (text, field) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-slate-800">{template.label}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{template.description}</p>
        </div>
        <button
          onClick={() => copy(`Subject: ${filledSubject}\n\n${filledBody}`, 'all')}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-lg transition-colors">
          {copiedField === 'all' ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy Email</>}
        </button>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-slate-500">Subject</label>
          <button onClick={() => copy(filledSubject, 'subject')} className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
            {copiedField === 'subject' ? <Check size={11} /> : <Copy size={11} />} Copy
          </button>
        </div>
        <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2">{filledSubject}</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-slate-500">Body</label>
          <button onClick={() => copy(filledBody, 'body')} className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
            {copiedField === 'body' ? <Check size={11} /> : <Copy size={11} />} Copy
          </button>
        </div>
        <pre className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-3 whitespace-pre-wrap font-sans leading-relaxed">{filledBody}</pre>
      </div>
    </div>
  )
}

export default function EmailTemplatesTab() {
  const { profile } = useAuth()
  const [repCode, setRepCode] = useState(null)

  useEffect(() => {
    if (!profile?.id) return
    supabase.from('rep_codes').select('code').eq('rep_id', profile.id).single()
      .then(({ data }) => setRepCode(data?.code || null))
  }, [profile?.id])

  const repName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
  const signupLink = repCode ? `https://elderloop.xyz/signup?rep=${repCode}` : ''

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-serif font-bold text-slate-900 flex items-center gap-2">
          <Mail size={22} className="text-brand-600" /> Sales Email Templates
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Copy-paste templates with your signup link already filled in. Swap the bracketed placeholders for the prospect's name and community before sending.
        </p>
      </div>

      <div className="space-y-4">
        {TEMPLATES.map(t => (
          <TemplateCard key={t.key} template={t} repName={repName} signupLink={signupLink} />
        ))}
      </div>
    </div>
  )
}
