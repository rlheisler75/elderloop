import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { Printer } from 'lucide-react'

const TOOL_ROWS = [
  'Scheduling / staffing software',
  'Mass texting or robocall service',
  'Family portal or newsletter service',
  'Compliance / incident tracking software',
  'Printing & paper costs',
]

const BlankLine = ({ width = '100%' }) => (
  <div style={{ borderBottom: '1.5px dotted #9aa7b1', width, height: 20, flexShrink: 0 }} />
)

const Row = ({ label, suffix }) => (
  <div className="flex items-baseline gap-2 mb-2.5">
    <span style={{ fontSize: 12, color: '#16202b', flexShrink: 0, minWidth: 210 }}>{label}</span>
    <span style={{ fontSize: 12, color: '#7a8794', flexShrink: 0 }}>$</span>
    <BlankLine width={90} />
    {suffix && <span style={{ fontSize: 11, color: '#7a8794', flexShrink: 0 }}>{suffix}</span>}
  </div>
)

export default function ROIWorksheetTab() {
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
          <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100">ROI Worksheet</h1>
          <p className="text-sm text-slate-500 mt-1">
            A fillable one-pager to work through with a prospect live — their numbers, not ours. Print it, save it as a PDF, or email it straight from here.
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
          #roi-worksheet, #roi-worksheet * { visibility: visible; }
          #roi-worksheet { position: absolute; top: 0; left: 0; width: 100%; box-shadow: none !important; }
        }
      `}</style>

      <div id="roi-worksheet" className="mx-auto bg-white shadow-xl" style={{ width: '8.5in', minHeight: '11in', padding: '0.55in 0.6in', color: '#16202b', fontFamily: '"Source Sans 3", system-ui, sans-serif' }}>

        <div className="flex items-center justify-between pb-4 mb-4" style={{ borderBottom: '2px solid #0c2340' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-extrabold text-xs flex-shrink-0" style={{ background: '#0c90e1' }}>EL</div>
            <div style={{ fontFamily: 'Georgia, "Playfair Display", serif', fontSize: 22, fontWeight: 700, color: '#0c2340' }}>ElderLoop</div>
          </div>
          <div className="text-right">
            <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#076bb0', fontWeight: 700, margin: '0 0 3px' }}>ROI Worksheet</p>
            <p style={{ margin: 0, color: '#55636f', fontSize: 13, maxWidth: 260 }}>Built by someone who's worked every department — dietary, maintenance, supply, and IT.</p>
          </div>
        </div>

        <h1 style={{ fontFamily: 'Georgia, "Playfair Display", serif', fontSize: 24, lineHeight: 1.28, color: '#0c2340', margin: '0 0 6px', fontWeight: 700 }}>
          What is switching costing you?<br /><em style={{ color: '#076bb0', fontStyle: 'italic' }}>See your numbers, not ours.</em>
        </h1>
        <p style={{ color: '#55636f', fontSize: 13, lineHeight: 1.5, margin: '0 0 16px', maxWidth: '68ch' }}>
          Grab a pen and fill this out together — it only takes a couple minutes, and most communities are surprised by the total.
        </p>

        <div className="grid mb-4" style={{ gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          <div>
            <h2 style={{ fontFamily: 'Georgia, "Playfair Display", serif', fontSize: 13.5, color: '#0c2340', margin: '0 0 10px', paddingBottom: 5, borderBottom: '1px solid #e1e6e9' }}>
              A. Tools you're probably paying for separately
            </h2>
            {TOOL_ROWS.map(label => <Row key={label} label={label} suffix="/mo" />)}
            <div className="flex items-baseline gap-2 mt-3 pt-2" style={{ borderTop: '1px solid #e1e6e9' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0c2340', minWidth: 210 }}>Total separate tool spend</span>
              <span style={{ fontSize: 12, color: '#7a8794' }}>$</span>
              <BlankLine width={90} />
              <span style={{ fontSize: 11, color: '#7a8794' }}>/mo</span>
            </div>
          </div>

          <div>
            <h2 style={{ fontFamily: 'Georgia, "Playfair Display", serif', fontSize: 13.5, color: '#0c2340', margin: '0 0 10px', paddingBottom: 5, borderBottom: '1px solid #e1e6e9' }}>
              B. Staff time lost switching systems
            </h2>
            <div className="flex items-baseline gap-2 mb-2.5">
              <span style={{ fontSize: 12, color: '#16202b', minWidth: 175 }}>Hours / week, per staff member</span>
              <BlankLine width={60} />
              <span style={{ fontSize: 11, color: '#7a8794' }}>hrs</span>
            </div>
            <div className="flex items-baseline gap-2 mb-2.5">
              <span style={{ fontSize: 12, color: '#16202b', minWidth: 175 }}>Staff members affected</span>
              <BlankLine width={60} />
            </div>
            <div className="flex items-baseline gap-2 mb-2.5">
              <span style={{ fontSize: 12, color: '#16202b', minWidth: 175 }}>Average hourly wage</span>
              <span style={{ fontSize: 12, color: '#7a8794' }}>$</span>
              <BlankLine width={60} />
            </div>
            <div className="flex items-baseline gap-2 mt-3 pt-2" style={{ borderTop: '1px solid #e1e6e9' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0c2340', minWidth: 175 }}>Monthly cost of lost time</span>
              <span style={{ fontSize: 12, color: '#7a8794' }}>$</span>
              <BlankLine width={90} />
            </div>
            <p style={{ fontSize: 10, color: '#7a8794', margin: '4px 0 0', fontStyle: 'italic' }}>hrs/wk × staff × wage × 4.3 weeks</p>
          </div>
        </div>

        <div className="mb-4" style={{ background: '#0c2340', borderRadius: 14, padding: '16px 20px' }}>
          <div className="grid items-center" style={{ gridTemplateColumns: '1fr auto 1fr auto 1fr', gap: 10 }}>
            <div className="text-center">
              <div style={{ fontSize: 10, color: '#a9c3d8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Separate tools (A)</div>
              <div style={{ fontFamily: 'Georgia, "Playfair Display", serif', fontSize: 18, color: '#fff', fontWeight: 700 }}>$______</div>
            </div>
            <div style={{ color: '#a9c3d8', fontSize: 18 }}>+</div>
            <div className="text-center">
              <div style={{ fontSize: 10, color: '#a9c3d8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Lost time (B)</div>
              <div style={{ fontFamily: 'Georgia, "Playfair Display", serif', fontSize: 18, color: '#fff', fontWeight: 700 }}>$______</div>
            </div>
            <div style={{ color: '#a9c3d8', fontSize: 18 }}>&minus;</div>
            <div className="text-center">
              <div style={{ fontSize: 10, color: '#a9c3d8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>ElderLoop plan</div>
              <div style={{ fontFamily: 'Georgia, "Playfair Display", serif', fontSize: 18, color: '#fff', fontWeight: 700 }}>$______</div>
            </div>
          </div>
          <div className="text-center mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
            <div style={{ fontSize: 10.5, color: '#a9c3d8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Estimated monthly savings</div>
            <div style={{ fontFamily: 'Georgia, "Playfair Display", serif', fontSize: 26, color: '#fff', fontWeight: 700 }}>$_____________</div>
          </div>
        </div>

        <p style={{ fontSize: 10.5, color: '#55636f', margin: '0 0 4px', fontStyle: 'italic' }}>
          For reference, communities that switch to ElderLoop report an average of $8,000/year in savings versus their prior mix of tools.
        </p>

        <div className="flex items-center justify-between mb-4" style={{ background: '#eef5ee', border: '1px solid #cfe0d0', borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ fontSize: 12.5, color: '#16202b' }}>
            <strong style={{ color: '#3a653f' }}>Try it free for 14 days.</strong> No contract, cancel any time.
            <div style={{ fontSize: 10.5, color: '#55636f', marginTop: 2 }}>See if the numbers hold up before you commit to anything.</div>
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
