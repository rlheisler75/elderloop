import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { Printer } from 'lucide-react'

const MODULES = [
  'Communication & Signage', 'Activities & Events', 'Chapel & Streaming', 'Resident Directory',
  'Nursing & Clinical', 'Maintenance & Work Orders', 'Dietary & Cycle Menus', 'Housekeeping',
  'Security & Guard Rounds', 'Transportation', 'Meter Readings', 'Incident Reports',
  'Surveys & Analytics', 'Staff Management', 'Time Clock', 'IT & Technology', 'Family Portal',
]

export default function SalesSheetTab() {
  const { profile } = useAuth()
  const [repCode, setRepCode] = useState(null)

  useEffect(() => {
    if (!profile?.id) return
    supabase.from('rep_codes').select('code').eq('rep_id', profile.id).single()
      .then(({ data }) => setRepCode(data?.code || null))
  }, [profile?.id])

  const repName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Your ElderLoop Rep'
  const repPhone = profile?.phone || '(add your phone in My Profile)'
  const repEmail = profile?.email || ''
  const signupLink = repCode ? `elderloop.xyz/signup?rep=${repCode}` : 'elderloop.xyz/signup'

  return (
    <div>
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100">Sales Sheet</h1>
          <p className="text-sm text-slate-500 mt-1">
            Your one-page overview, auto-filled with your name, phone, and signup link. Print it, save it as a PDF, or email it straight from here.
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
          #sales-sheet, #sales-sheet * { visibility: visible; }
          #sales-sheet { position: absolute; top: 0; left: 0; width: 100%; box-shadow: none !important; }
        }
      `}</style>

      <div id="sales-sheet" className="mx-auto bg-white shadow-xl" style={{ width: '8.5in', minHeight: '11in', padding: '0.55in 0.6in', color: '#16202b', fontFamily: '"Source Sans 3", system-ui, sans-serif' }}>

        <div className="flex items-center justify-between pb-4 mb-4" style={{ borderBottom: '2px solid #0c2340' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-extrabold text-xs flex-shrink-0" style={{ background: '#0c90e1' }}>EL</div>
            <div style={{ fontFamily: 'Georgia, "Playfair Display", serif', fontSize: 22, fontWeight: 700, color: '#0c2340' }}>ElderLoop</div>
          </div>
          <div className="text-right">
            <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#076bb0', fontWeight: 700, margin: '0 0 3px' }}>Senior Living Software</p>
            <p style={{ margin: 0, color: '#55636f', fontSize: 13, maxWidth: 260 }}>Built by someone who's worked every department — dietary, maintenance, supply, and IT.</p>
          </div>
        </div>

        <h1 style={{ fontFamily: 'Georgia, "Playfair Display", serif', fontSize: 25, lineHeight: 1.28, color: '#0c2340', margin: '0 0 6px', fontWeight: 700 }}>
          One platform for everything<br />your community runs on — <em style={{ color: '#076bb0', fontStyle: 'italic' }}>not five.</em>
        </h1>
        <p style={{ color: '#55636f', fontSize: 13.5, lineHeight: 1.5, margin: '0 0 16px', maxWidth: '66ch' }}>
          ElderLoop replaces the scheduling tool, the paper charts, the texting app, and the spreadsheet with a single system built specifically for senior living communities. Set up in a day, not a quarter.
        </p>

        <div className="grid grid-cols-3 rounded-xl overflow-hidden mb-4" style={{ background: '#0c2340' }}>
          {[
            ['12+', 'Years senior living experience'],
            ['$8K', 'Avg. annual savings vs. legacy tools'],
            ['1 day', 'Average time to go live'],
          ].map(([v, l], i) => (
            <div key={l} className="text-center py-3.5 px-2" style={{ borderRight: i < 2 ? '1px solid rgba(255,255,255,0.12)' : 'none' }}>
              <div style={{ fontFamily: 'Georgia, "Playfair Display", serif', fontSize: 22, fontWeight: 700, color: '#fff' }}>{v}</div>
              <div style={{ fontSize: 10.5, color: '#a9c3d8', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>

        <div className="grid mb-4" style={{ gridTemplateColumns: '1.05fr 1.35fr', gap: 22 }}>
          <div>
            <h2 style={{ fontFamily: 'Georgia, "Playfair Display", serif', fontSize: 14, color: '#0c2340', margin: '0 0 8px', paddingBottom: 5, borderBottom: '1px solid #e1e6e9' }}>17 modules, one login</h2>
            <div className="grid grid-cols-2" style={{ gap: '3px 10px' }}>
              {MODULES.map(m => (
                <div key={m} className="relative" style={{ fontSize: 11.3, color: '#16202b', padding: '3px 0 3px 13px' }}>
                  <span className="absolute rounded-full" style={{ left: 0, top: 8, width: 5, height: 5, background: '#0c90e1' }} />
                  {m}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 10.5, color: '#55636f', marginTop: 8, fontStyle: 'italic' }}>Every new module we build is included at no extra cost — no add-on pricing, ever.</p>
          </div>

          <div>
            <h2 style={{ fontFamily: 'Georgia, "Playfair Display", serif', fontSize: 14, color: '#0c2340', margin: '0 0 8px', paddingBottom: 5, borderBottom: '1px solid #e1e6e9' }}>Plans built for every size community</h2>
            <div className="flex flex-col gap-2">
              <div style={{ border: '1px solid #e1e6e9', borderRadius: 10, padding: '10px 13px' }}>
                <div className="flex items-baseline justify-between">
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#0c2340' }}>Starter</span>
                  <span style={{ fontFamily: 'Georgia, "Playfair Display", serif', fontWeight: 700, fontSize: 16, color: '#076bb0' }}>Free <span style={{ fontSize: 10, fontWeight: 400, color: '#55636f' }}>forever</span></span>
                </div>
                <p style={{ fontSize: 10.5, color: '#55636f', margin: '2px 0 5px' }}>Up to 50 residents & 10 staff — everything you need for the basics.</p>
                <ul className="grid grid-cols-2" style={{ fontSize: 10.3, color: '#16202b', margin: 0, padding: 0, listStyle: 'none', gap: '0 8px' }}>
                  {['Resident Directory', 'Staff Management', 'Communication', 'Family Messaging'].map(f => (
                    <li key={f} className="relative" style={{ paddingLeft: 11, marginBottom: 1 }}>
                      <span className="absolute" style={{ left: 0, color: '#3a653f', fontWeight: 700, fontSize: 10 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ border: '1px solid #e1e6e9', borderRadius: 10, padding: '10px 13px' }}>
                <div className="flex items-baseline justify-between">
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#0c2340' }}>Essential</span>
                  <span style={{ fontFamily: 'Georgia, "Playfair Display", serif', fontWeight: 700, fontSize: 16, color: '#076bb0' }}>$299 <span style={{ fontSize: 10, fontWeight: 400, color: '#55636f' }}>/mo</span></span>
                </div>
                <p style={{ fontSize: 10.5, color: '#55636f', margin: '2px 0 5px' }}>Everything in Starter, no limits, plus clinical & programming.</p>
                <ul className="grid grid-cols-2" style={{ fontSize: 10.3, color: '#16202b', margin: 0, padding: 0, listStyle: 'none', gap: '0 8px' }}>
                  {['SMS messaging', 'Nursing Notes & Vitals', 'Incident Reports', 'Chapel & Activities'].map(f => (
                    <li key={f} className="relative" style={{ paddingLeft: 11, marginBottom: 1 }}>
                      <span className="absolute" style={{ left: 0, color: '#3a653f', fontWeight: 700, fontSize: 10 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative" style={{ border: '1.5px solid #0c90e1', borderRadius: 10, padding: '10px 13px', background: '#eaf5fd' }}>
                <span className="absolute text-white font-bold" style={{ top: -8, right: 12, background: '#0c90e1', fontSize: 9, padding: '2px 8px', borderRadius: 999, letterSpacing: '0.03em' }}>Most Popular</span>
                <div className="flex items-baseline justify-between">
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#0c2340' }}>Professional</span>
                  <span style={{ fontFamily: 'Georgia, "Playfair Display", serif', fontWeight: 700, fontSize: 16, color: '#076bb0' }}>$999 <span style={{ fontSize: 10, fontWeight: 400, color: '#55636f' }}>/mo</span></span>
                </div>
                <p style={{ fontSize: 10.5, color: '#55636f', margin: '2px 0 5px' }}>The full platform — every module, every update, included.</p>
                <ul className="grid grid-cols-2" style={{ fontSize: 10.3, color: '#16202b', margin: 0, padding: 0, listStyle: 'none', gap: '0 8px' }}>
                  {['Dietary & Scheduling', 'Maintenance & Supply', 'Security & Transportation', 'Dedicated onboarding'].map(f => (
                    <li key={f} className="relative" style={{ paddingLeft: 11, marginBottom: 1 }}>
                      <span className="absolute" style={{ left: 0, color: '#3a653f', fontWeight: 700, fontSize: 10 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4" style={{ background: '#eef5ee', border: '1px solid #cfe0d0', borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ fontSize: 12.5, color: '#16202b' }}>
            <strong style={{ color: '#3a653f' }}>Try any plan free for 14 days.</strong> No contract, cancel any time.
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
