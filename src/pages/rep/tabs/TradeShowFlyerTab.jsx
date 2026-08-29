import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { Printer } from 'lucide-react'

const HIGHLIGHTS = ['17 Modules', 'Live in a Day', 'No Contract', 'Free 14-Day Trial']

export default function TradeShowFlyerTab() {
  const { profile } = useAuth()
  const [repCode, setRepCode] = useState(null)

  useEffect(() => {
    if (!profile?.id) return
    supabase.from('rep_codes').select('code').eq('rep_id', profile.id).single()
      .then(({ data }) => setRepCode(data?.code || null))
  }, [profile?.id])

  const repName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Your ElderLoop Rep'
  const repPhone = profile?.phone || ''
  const signupUrl = repCode ? `https://elderloop.xyz/signup?rep=${repCode}` : 'https://elderloop.xyz/signup'
  const signupDisplay = repCode ? `elderloop.xyz/signup?rep=${repCode}` : 'elderloop.xyz/signup'
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=10&color=12-35-64&data=${encodeURIComponent(signupUrl)}`

  return (
    <div>
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100">Trade Show Flyer</h1>
          <p className="text-sm text-slate-500 mt-1">
            A booth/table poster built to be read from across the room — big QR code straight to your signup link. Print it, save it as a PDF, or email it straight from here.
          </p>
        </div>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors">
          <Printer size={15} /> Print / Save as PDF
        </button>
      </div>

      <style>{`
        @media print {
          @page { size: letter; margin: 0.3in; }
          body * { visibility: hidden; }
          #tradeshow-flyer, #tradeshow-flyer * { visibility: visible; }
          #tradeshow-flyer { position: absolute; top: 0; left: 0; width: 100%; box-shadow: none !important; }
        }
      `}</style>

      <div id="tradeshow-flyer" className="mx-auto bg-white shadow-xl flex flex-col items-center text-center"
        style={{ width: '8.5in', minHeight: '11in', padding: '0.6in 0.55in', color: '#16202b', fontFamily: '"Source Sans 3", system-ui, sans-serif' }}>

        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0" style={{ background: '#0c90e1' }}>EL</div>
          <div style={{ fontFamily: 'Georgia, "Playfair Display", serif', fontSize: 26, fontWeight: 700, color: '#0c2340' }}>ElderLoop</div>
        </div>

        <p style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#076bb0', fontWeight: 700, margin: '0 0 14px' }}>
          Senior Living Software
        </p>

        <h1 style={{ fontFamily: 'Georgia, "Playfair Display", serif', fontSize: 42, lineHeight: 1.15, color: '#0c2340', fontWeight: 700, margin: '0 0 14px', maxWidth: '9.5in' }}>
          One platform for<br />everything your<br />community runs on.
        </h1>

        <p style={{ fontSize: 15, color: '#55636f', margin: '0 0 30px', maxWidth: 460 }}>
          Resident records, staff scheduling, family communication, and more — one login, no add-on pricing.
        </p>

        <div className="flex justify-center mb-3" style={{ padding: 14, border: '2px solid #0c2340', borderRadius: 20 }}>
          <img src={qrSrc} alt="Scan to start your free trial" width={220} height={220} style={{ display: 'block' }} />
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#0c2340', margin: '0 0 4px' }}>Scan to start your free trial</p>
        <p style={{ fontFamily: 'SF Mono, Consolas, monospace', fontSize: 14, color: '#076bb0', background: '#eaf5fd', padding: '6px 14px', borderRadius: 8, display: 'inline-block', margin: '0 0 28px' }}>
          {signupDisplay}
        </p>

        <div className="flex flex-wrap justify-center gap-2.5 mb-8">
          {HIGHLIGHTS.map(h => (
            <span key={h} style={{ fontSize: 13, fontWeight: 700, color: '#3a653f', background: '#eef5ee', border: '1px solid #cfe0d0', borderRadius: 999, padding: '6px 16px' }}>
              {h}
            </span>
          ))}
        </div>

        <div className="flex-1" />

        <div className="pt-5 w-full" style={{ borderTop: '2px solid #0c2340' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#076bb0' }}>{repName}</div>
          {repPhone && <div style={{ fontSize: 12.5, color: '#55636f', marginTop: 2 }}>{repPhone}</div>}
        </div>
      </div>
    </div>
  )
}
