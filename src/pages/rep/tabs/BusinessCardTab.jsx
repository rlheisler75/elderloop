import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { Printer, Copy, Check, LayoutGrid, CreditCard } from 'lucide-react'

function FrontCard({ repName, repPhone, repEmail }) {
  return (
    <div className="relative overflow-hidden" style={{ width: '3.5in', height: '2in', background: 'linear-gradient(135deg, #0c2340 0%, #16324f 100%)' }}>
      <div className="relative h-full flex flex-col justify-between p-5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-white font-extrabold" style={{ background: '#0c90e1', fontSize: 10 }}>EL</div>
          <span className="text-white font-semibold" style={{ fontFamily: 'Georgia, "Playfair Display", serif', fontSize: 15 }}>ElderLoop</span>
        </div>
        <div>
          <div className="text-white font-semibold" style={{ fontSize: 17 }}>{repName}</div>
          <div style={{ color: '#8fc4ee', fontSize: 11 }}>Sales Representative</div>
          <div className="mt-2" style={{ color: '#cfe0ee', fontSize: 11, lineHeight: 1.6 }}>
            {repPhone && <div>{repPhone}</div>}
            {repEmail && <div>{repEmail}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

function BackCard({ qrSrc, signupDisplay }) {
  return (
    <div className="flex items-center justify-center gap-4 p-5" style={{ width: '3.5in', height: '2in', background: '#ffffff', border: '1px solid #e1e6e9' }}>
      <img src={qrSrc} alt="Scan to start your free trial" width={90} height={90} style={{ borderRadius: 8, flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#55636f', fontWeight: 700, marginBottom: 4 }}>Scan to start your<br />free 14-day trial</div>
        <div style={{ fontFamily: 'SF Mono, Consolas, monospace', fontSize: 10.5, color: '#076bb0', wordBreak: 'break-all' }}>{signupDisplay}</div>
      </div>
    </div>
  )
}

export default function BusinessCardTab() {
  const { profile } = useAuth()
  const [repCode, setRepCode] = useState(null)
  const [copied, setCopied] = useState(false)
  const [printMode, setPrintMode] = useState('single') // 'single' | 'sheet'

  useEffect(() => {
    if (!profile?.id) return
    supabase.from('rep_codes').select('code').eq('rep_id', profile.id).single()
      .then(({ data }) => setRepCode(data?.code || null))
  }, [profile?.id])

  const repName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Your ElderLoop Rep'
  const repPhone = profile?.phone || ''
  const repEmail = profile?.email || ''
  const signupUrl = repCode ? `https://elderloop.xyz/signup?rep=${repCode}` : 'https://elderloop.xyz/signup'
  const signupDisplay = signupUrl.replace('https://', '')
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&color=12-35-64&data=${encodeURIComponent(signupUrl)}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(signupUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const cardProps = { repName, repPhone, repEmail }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 print:hidden">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100">Business Card</h1>
          <p className="text-sm text-slate-500 mt-1">
            Your digital card — share the link on your phone, or print physical cards with a scannable QR code straight to your signup link.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl transition-colors">
            {copied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy Link</>}
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors">
            <Printer size={15} /> Print {printMode === 'sheet' ? 'Sheet' : 'Card'}
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 print:hidden">
        <button onClick={() => setPrintMode('single')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            printMode === 'single' ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}>
          <CreditCard size={13} /> Single Card Preview
        </button>
        <button onClick={() => setPrintMode('sheet')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            printMode === 'sheet' ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}>
          <LayoutGrid size={13} /> Print Sheet (10-up)
        </button>
      </div>

      <style>{`
        @media print {
          @page { size: letter; margin: 0; }
          body * { visibility: hidden; }
          #biz-card-print, #biz-card-print * { visibility: visible; }
          #biz-card-print { position: absolute; top: 0; left: 0; }
        }
      `}</style>

      {!repCode && (
        <p className="text-xs text-amber-600 mb-4 print:hidden">Your rep code hasn't loaded yet — the QR code and link below will use your personal code once it's found.</p>
      )}

      {printMode === 'single' ? (
        <>
          {/* Screen preview — single pair */}
          <div className="print:hidden flex flex-wrap gap-8 items-start">
            <FrontCard {...cardProps} />
            <BackCard qrSrc={qrSrc} signupDisplay={signupDisplay} />
          </div>

          {/* Print output — single pair, actual size */}
          <div id="biz-card-print" className="hidden print:flex" style={{ margin: '0.5in', gap: '0.3in' }}>
            <FrontCard {...cardProps} />
            <BackCard qrSrc={qrSrc} signupDisplay={signupDisplay} />
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-slate-500 mb-4 print:hidden max-w-2xl">
            Two full sheets, 10 cards each, sized and positioned for standard perforated business card stock (Avery 5371/8371 or equivalent — 2&nbsp;×&nbsp;3.5in cards, 2 columns × 5 rows). Print the front sheet first, flip the stack and re-feed it, then print the back sheet so each card lines up front-to-back.
          </p>

          {/* Screen preview — mini versions of both sheets side by side */}
          <div className="print:hidden flex gap-10 flex-wrap items-start">
            {[{ label: 'Front Sheet', node: <FrontCard {...cardProps} /> }, { label: 'Back Sheet', node: <BackCard qrSrc={qrSrc} signupDisplay={signupDisplay} /> }].map(({ label, node }) => (
              <div key={label}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{label}</p>
                <div className="bg-white shadow-lg" style={{ width: '4.25in', padding: '0.25in 0.375in', transform: 'scale(1)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1.75in)', gridTemplateRows: 'repeat(5, 1in)', gap: 0 }}>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} style={{ width: '1.75in', height: '1in', overflow: 'hidden', transform: 'scale(0.5)', transformOrigin: 'top left' }}>
                        {node}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Print output — two full-size 10-up sheets, page break between */}
          <div id="biz-card-print" className="hidden print:block">
            <div style={{ padding: '0.5in 0.75in', pageBreakAfter: 'always' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 3.5in)', gridTemplateRows: 'repeat(5, 2in)', gap: 0 }}>
                {Array.from({ length: 10 }).map((_, i) => <FrontCard key={i} {...cardProps} />)}
              </div>
            </div>
            <div style={{ padding: '0.5in 0.75in' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 3.5in)', gridTemplateRows: 'repeat(5, 2in)', gap: 0 }}>
                {Array.from({ length: 10 }).map((_, i) => <BackCard key={i} qrSrc={qrSrc} signupDisplay={signupDisplay} />)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
