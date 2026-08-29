import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { Printer } from 'lucide-react'

const ROWS = [
  ['Family communication', 'Phone tag and printed newsletters', 'Family Portal — real-time updates, photos, and messaging'],
  ['Staff scheduling & records', 'Paper binders or a generic spreadsheet', 'Built for senior living — scheduling, time clock, and staff records in one place'],
  ['Compliance & incident tracking', 'Manual forms, easy to lose, hard to audit', 'Digital incident reports with a full audit trail, survey-ready'],
  ['Getting started', 'Weeks to months of manual setup', 'Live in about a day — we help migrate your existing data'],
  ['Pricing', 'Per-seat or per-module add-ons that creep up over time', 'One flat price per plan, every module included, no surprise charges'],
  ['Contract terms', 'Annual contracts that are hard to exit', 'No contract — 14-day free trial, cancel any time'],
  ['Your current clinical/billing system', '—', "Runs alongside it — ElderLoop isn't a rip-and-replace"],
]

const FAQS = [
  {
    q: 'We already have an EMR for clinical documentation and billing.',
    a: "ElderLoop isn't a replacement for that — it runs alongside whatever you use today and covers what it doesn't: family communication, activities, maintenance, dietary, housekeeping, and more.",
  },
  {
    q: 'What about our current resident data?',
    a: "We help migrate it directly. You're not left re-entering rosters and records by hand.",
  },
  {
    q: 'Will this get more expensive as we grow or use more features?',
    a: "No. Pricing is flat per plan, not per module or per seat — every feature in your plan is included, forever.",
  },
  {
    q: "We're locked into a contract with our current vendor.",
    a: "There's no long-term contract with ElderLoop. Start a free 14-day trial with zero commitment and decide when you're ready.",
  },
]

export default function ComparisonSheetTab() {
  const { profile } = useAuth()
  const [repCode, setRepCode] = useState(null)

  useEffect(() => {
    if (!profile?.id) return
    supabase.from('rep_codes').select('code').eq('rep_id', profile.id).single()
      .then(({ data }) => setRepCode(data?.code || null))
  }, [profile?.id])

  const repName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Your ElderLoop Rep'
  const repPhone = profile?.phone || '(add your phone in My Settings)'
  const repEmail = profile?.email || ''
  const signupLink = repCode ? `elderloop.xyz/signup?rep=${repCode}` : 'elderloop.xyz/signup'

  return (
    <div>
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100">Comparison Sheet</h1>
          <p className="text-sm text-slate-500 mt-1">
            A one-pager for prospects still weighing paper, spreadsheets, or a patchwork of tools — auto-filled with your info. Print it, save it as a PDF, or email it straight from here.
          </p>
        </div>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors">
          <Printer size={15} /> Print / Save as PDF
        </button>
      </div>

      <style>{`
        @media print {
          @page { size: letter; margin: 0.35in; }
          body * { visibility: hidden; }
          #comparison-sheet, #comparison-sheet * { visibility: visible; }
          #comparison-sheet { position: absolute; top: 0; left: 0; width: 100%; box-shadow: none !important; }
        }
      `}</style>

      <div id="comparison-sheet" className="mx-auto bg-white shadow-xl" style={{ width: '8.5in', minHeight: '11in', padding: '0.55in 0.6in', color: '#16202b', fontFamily: '"Source Sans 3", system-ui, sans-serif' }}>

        <div className="flex items-center justify-between pb-4 mb-4" style={{ borderBottom: '2px solid #0c2340' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-extrabold text-xs flex-shrink-0" style={{ background: '#0c90e1' }}>EL</div>
            <div style={{ fontFamily: 'Georgia, "Playfair Display", serif', fontSize: 22, fontWeight: 700, color: '#0c2340' }}>ElderLoop</div>
          </div>
          <div className="text-right">
            <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#076bb0', fontWeight: 700, margin: '0 0 3px' }}>How We Compare</p>
            <p style={{ margin: 0, color: '#55636f', fontSize: 13, maxWidth: 260 }}>Built by someone who's worked every department — dietary, maintenance, supply, and IT.</p>
          </div>
        </div>

        <h1 style={{ fontFamily: 'Georgia, "Playfair Display", serif', fontSize: 24, lineHeight: 1.28, color: '#0c2340', margin: '0 0 6px', fontWeight: 700 }}>
          Still running on paper, spreadsheets,<br />and <em style={{ color: '#076bb0', fontStyle: 'italic' }}>five different logins?</em>
        </h1>
        <p style={{ color: '#55636f', fontSize: 13.5, lineHeight: 1.5, margin: '0 0 16px', maxWidth: '68ch' }}>
          Here's how most communities are running things today — and what changes on ElderLoop.
        </p>

        <div className="mb-4" style={{ border: '1px solid #e1e6e9', borderRadius: 12, overflow: 'hidden' }}>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', background: '#0c2340' }}>
            <div style={{ padding: '8px 12px', fontSize: 10.5, fontWeight: 700, color: '#a9c3d8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>&nbsp;</div>
            <div style={{ padding: '8px 12px', fontSize: 10.5, fontWeight: 700, color: '#a9c3d8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>What most have today</div>
            <div style={{ padding: '8px 12px', fontSize: 10.5, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ElderLoop</div>
          </div>
          {ROWS.map(([label, before, after], i) => (
            <div key={label} className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', background: i % 2 === 0 ? '#fff' : '#f7f9fa', borderTop: '1px solid #e1e6e9' }}>
              <div style={{ padding: '8px 12px', fontSize: 11.5, fontWeight: 700, color: '#0c2340' }}>{label}</div>
              <div style={{ padding: '8px 12px', fontSize: 11, color: '#7a8794', lineHeight: 1.35 }}>{before}</div>
              <div className="relative" style={{ padding: '8px 12px 8px 20px', fontSize: 11, color: '#16202b', lineHeight: 1.35, background: '#eaf5fd' }}>
                {after !== '—' && <span className="absolute" style={{ left: 8, top: 9, color: '#3a653f', fontWeight: 700, fontSize: 10 }}>✓</span>}
                {after}
              </div>
            </div>
          ))}
        </div>

        <h2 style={{ fontFamily: 'Georgia, "Playfair Display", serif', fontSize: 14, color: '#0c2340', margin: '0 0 8px', paddingBottom: 5, borderBottom: '1px solid #e1e6e9' }}>Questions we hear a lot</h2>
        <div className="grid grid-cols-2 mb-4" style={{ gap: '10px 22px' }}>
          {FAQS.map(f => (
            <div key={f.q}>
              <p style={{ fontSize: 11.5, fontWeight: 700, color: '#0c2340', margin: '0 0 2px' }}>{f.q}</p>
              <p style={{ fontSize: 11, color: '#55636f', margin: 0, lineHeight: 1.45 }}>{f.a}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4" style={{ background: '#eef5ee', border: '1px solid #cfe0d0', borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ fontSize: 12.5, color: '#16202b' }}>
            <strong style={{ color: '#3a653f' }}>Try it free for 14 days.</strong> No contract, cancel any time.
            <div style={{ fontSize: 10.5, color: '#55636f', marginTop: 2 }}>Most communities are fully onboarded and live within a single day.</div>
          </div>
        </div>

        <div className="flex items-end justify-between pt-3.5" style={{ borderTop: '2px solid #0c2340' }}>
          <div style={{ fontSize: 11.5, color: '#16202b', lineHeight: 1.7 }}>
            <div style={{ color: '#076bb0', fontWeight: 600 }}>{repName}</div>
            <div>{repPhone}{repEmail ? ` · ${repEmail}` : ''}</div>
            <div>ElderLoop Sales Representative</div>
          </div>
          <div className="text-right">
            <div style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#55636f', marginBottom: 3 }}>Start your free trial</div>
            <div style={{ fontFamily: 'SF Mono, Consolas, monospace', fontSize: 12, color: '#076bb0', background: '#eaf5fd', padding: '5px 10px', borderRadius: 7, display: 'inline-block' }}>{signupLink}</div>
          </div>
        </div>

      </div>
    </div>
  )
}
