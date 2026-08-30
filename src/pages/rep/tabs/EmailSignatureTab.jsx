import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { Copy, Check, Mail } from 'lucide-react'

const escapeHtml = (s) => String(s ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;')

function buildSignatureHtml({ repName, repPhone, repEmail, signupUrl, signupDisplay }) {
  const contactLine = [repPhone, repEmail].filter(Boolean).map(escapeHtml).join(' &middot; ')
  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td style="padding-right:12px;vertical-align:top;">
      <img src="https://elderloop.xyz/icon-192.png" width="44" height="44" alt="ElderLoop" style="display:block;border-radius:8px;" />
    </td>
    <td style="border-left:2px solid #0c2340;padding-left:12px;vertical-align:top;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-weight:bold;font-size:15px;color:#0c2340;line-height:1.3;">${escapeHtml(repName)}</div>
      <div style="font-size:12px;color:#55636f;margin-top:1px;">ElderLoop Sales Representative</div>
      ${contactLine ? `<div style="font-size:12px;color:#16202b;margin-top:4px;">${contactLine}</div>` : ''}
      <div style="margin-top:7px;">
        <a href="${escapeHtml(signupUrl)}" style="font-size:12px;font-weight:bold;color:#ffffff;background-color:#0c90e1;padding:6px 12px;border-radius:6px;text-decoration:none;display:inline-block;">Start a Free Trial &rarr;</a>
      </div>
      <div style="font-size:10.5px;color:#9aa7b1;margin-top:5px;">${escapeHtml(signupDisplay)}</div>
    </td>
  </tr>
</table>`
}

export default function EmailSignatureTab() {
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
  const signupDisplay = repCode ? `elderloop.xyz/signup?rep=${repCode}` : 'elderloop.xyz/signup'

  const signatureHtml = buildSignatureHtml({ repName, repPhone, repEmail, signupUrl, signupDisplay })

  const copySignature = async () => {
    try {
      const blob = new Blob([signatureHtml], { type: 'text/html' })
      const textBlob = new Blob([signatureHtml], { type: 'text/plain' })
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': blob, 'text/plain': textBlob }),
      ])
    } catch {
      await navigator.clipboard.writeText(signatureHtml)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-serif font-bold text-slate-900 flex items-center gap-2">
          <Mail size={22} className="text-brand-600" /> Email Signature
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Auto-filled with your name, phone, and signup link. Copy it and paste it straight into your email client's signature settings.
        </p>
      </div>

      {!repPhone && (
        <div className="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Your phone number isn't set yet — click your name at the bottom of the sidebar to add it.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-5">
        <div className="flex items-center gap-3">
          <img src="/icon-192.png" alt="ElderLoop" width={44} height={44} style={{ borderRadius: 8, display: 'block' }} />
          <div style={{ borderLeft: '2px solid #0c2340', paddingLeft: 12 }}>
            <div style={{ fontFamily: 'Georgia, "Playfair Display", serif', fontWeight: 700, fontSize: 15, color: '#0c2340', lineHeight: 1.3 }}>{repName}</div>
            <div style={{ fontSize: 12, color: '#55636f', marginTop: 1 }}>ElderLoop Sales Representative</div>
            {(repPhone || repEmail) && (
              <div style={{ fontSize: 12, color: '#16202b', marginTop: 4 }}>{[repPhone, repEmail].filter(Boolean).join(' · ')}</div>
            )}
            <div style={{ marginTop: 7 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: '#0c90e1', padding: '6px 12px', borderRadius: 6, display: 'inline-block' }}>
                Start a Free Trial →
              </span>
            </div>
            <div style={{ fontSize: 10.5, color: '#9aa7b1', marginTop: 5 }}>{signupDisplay}</div>
          </div>
        </div>
      </div>

      <button onClick={copySignature}
        className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors mb-6">
        {copied ? <><Check size={15} /> Copied — go paste it!</> : <><Copy size={15} /> Copy Signature</>}
      </button>

      <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 text-sm text-slate-600 space-y-3">
        <p className="font-semibold text-slate-700">How to add it</p>
        <p><strong>Gmail</strong> — Settings (gear icon) → See all settings → General → scroll to Signature → click Create new → paste (Ctrl/Cmd+V) into the box → Save Changes.</p>
        <p><strong>Outlook (desktop)</strong> — File → Options → Mail → Signatures → New → paste into the editor → set it as your default for new messages and replies.</p>
        <p><strong>Outlook (web)</strong> — Settings → Mail → Compose and reply → paste into the signature box.</p>
        <p><strong>Apple Mail</strong> — Mail → Settings → Signatures → select your account → click + → paste into the signature box.</p>
        <p className="text-xs text-slate-400 pt-1">If a paste comes through as plain text instead of the styled version, click into the signature box first so it's ready for rich text, then paste again.</p>
      </div>
    </div>
  )
}
