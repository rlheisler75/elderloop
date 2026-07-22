import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { Printer, Copy, Check } from 'lucide-react'

export default function BusinessCardTab() {
  const { profile } = useAuth()
  const [repCode, setRepCode] = useState(null)
  const [copied, setCopied] = useState(false)

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100">Business Card</h1>
          <p className="text-sm text-slate-500 mt-1">
            Your digital card — share the link on your phone, or print a physical card with a scannable QR code straight to your signup link.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl transition-colors">
            {copied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy Link</>}
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors">
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: letter; margin: 0.5in; }
          body * { visibility: hidden; }
          #biz-card-sheet, #biz-card-sheet * { visibility: visible; }
          #biz-card-sheet { position: absolute; top: 0; left: 0; }
        }
      `}</style>

      {/* Screen preview */}
      <div className="print:hidden flex flex-wrap gap-8 items-start">
        {/* Front */}
        <div className="rounded-2xl shadow-xl overflow-hidden relative"
          style={{ width: '3.5in', height: '2in', background: 'linear-gradient(135deg, #0c2340 0%, #16324f 100%)', flexShrink: 0 }}>
          <div className="absolute" style={{ top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(12,144,225,0.35), transparent 70%)' }} />
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

        {/* Back */}
        <div className="rounded-2xl shadow-xl overflow-hidden flex items-center justify-center gap-4 p-5"
          style={{ width: '3.5in', height: '2in', background: '#ffffff', border: '1px solid #e1e6e9', flexShrink: 0 }}>
          <img src={qrSrc} alt="Scan to start your free trial" width={90} height={90} style={{ borderRadius: 8, flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#55636f', fontWeight: 700, marginBottom: 4 }}>Scan to start your<br />free 14-day trial</div>
            <div style={{ fontFamily: 'SF Mono, Consolas, monospace', fontSize: 10.5, color: '#076bb0', wordBreak: 'break-all' }}>{signupDisplay}</div>
          </div>
        </div>
      </div>

      {!repCode && (
        <p className="text-xs text-amber-600 mt-4 print:hidden">Your rep code hasn't loaded yet — the QR code and link above will use your personal code once it's found.</p>
      )}

      {/* Print sheet: front + back, actual size */}
      <div id="biz-card-sheet" className="hidden print:flex" style={{ gap: '0.3in' }}>
        <div className="relative overflow-hidden"
          style={{ width: '3.5in', height: '2in', background: 'linear-gradient(135deg, #0c2340 0%, #16324f 100%)' }}>
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
        <div className="flex items-center justify-center gap-4 p-5" style={{ width: '3.5in', height: '2in', background: '#ffffff', border: '1px solid #e1e6e9' }}>
          <img src={qrSrc} alt="Scan to start your free trial" width={90} height={90} style={{ borderRadius: 8, flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#55636f', fontWeight: 700, marginBottom: 4 }}>Scan to start your<br />free 14-day trial</div>
            <div style={{ fontFamily: 'SF Mono, Consolas, monospace', fontSize: 10.5, color: '#076bb0', wordBreak: 'break-all' }}>{signupDisplay}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
