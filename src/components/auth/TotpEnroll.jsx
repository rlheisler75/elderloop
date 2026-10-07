import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Loader2, AlertCircle, Copy, Check } from 'lucide-react'

// Adds an authenticator app (TOTP) to the signed-in user: QR code → 6-digit code → done.
// Works in any authenticator: Google or Microsoft Authenticator, 1Password, Duo Mobile…
// Supabase upgrades the session to aal2 when the code is verified.
export default function TotpEnroll({ onDone, onCancel }) {
  const [factor, setFactor] = useState(null)   // { id, qr, secret }
  const [code, setCode]     = useState('')
  const [busy, setBusy]     = useState(false)
  const [error, setError]   = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // An abandoned earlier attempt leaves an unverified factor behind; clear it first.
      const { data: list } = await supabase.auth.mfa.listFactors()
      for (const f of (list?.all || []).filter(f => f.status !== 'verified')) {
        await supabase.auth.mfa.unenroll({ factorId: f.id })
      }
      const { data, error: err } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Authenticator ${new Date().toLocaleDateString('en-US')} ${Date.now() % 10000}`,
      })
      if (cancelled) return
      if (err) { setError(err.message); return }
      setFactor({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret })
    })()
    return () => { cancelled = true }
  }, [])

  const verify = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() })
    if (err) {
      setBusy(false)
      setError(err.message.includes('Invalid') ? 'That code didn\'t match. Check the app and try the newest code.' : err.message)
      return
    }
    try {
      await supabase.rpc('log_audit_event', { p_action: 'MFA_ENROLLED', p_notes: 'Authenticator app added' })
    } catch (_) { /* non-blocking */ }
    setBusy(false)
    onDone?.()
  }

  const copySecret = async () => {
    try { await navigator.clipboard.writeText(factor.secret); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch (_) {}
  }

  if (!factor) {
    return error
      ? <ErrorLine text={error} />
      : <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={15} className="animate-spin" /> Preparing…</div>
  }

  return (
    <div className="space-y-4">
      <ol className="text-sm text-slate-600 dark:text-slate-300 space-y-1 list-decimal pl-5">
        <li>Open an authenticator app on your phone (Google or Microsoft Authenticator, 1Password, Duo Mobile).</li>
        <li>Add an account and scan this code.</li>
        <li>Type the 6-digit code the app shows.</li>
      </ol>

      <div className="flex justify-center">
        <img src={factor.qr} alt="QR code for your authenticator app" className="w-44 h-44 bg-white p-2 rounded-xl border border-slate-200" />
      </div>

      <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
        Can't scan? Enter this key instead:
        <div className="mt-1 flex items-center justify-center gap-2">
          <code className="font-mono text-slate-700 dark:text-slate-200 break-all">{factor.secret}</code>
          <button type="button" onClick={copySecret} className="text-slate-400 hover:text-brand-600" title="Copy key">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {error && <ErrorLine text={error} />}

      <form onSubmit={verify} className="space-y-3">
        <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric" autoComplete="one-time-code" autoFocus placeholder="6-digit code"
          className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-center text-lg tracking-[0.4em] font-mono focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <div className="flex gap-2">
          {onCancel && (
            <button type="button" onClick={async () => { await supabase.auth.mfa.unenroll({ factorId: factor.id }); onCancel() }}
              className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
              Cancel
            </button>
          )}
          <button type="submit" disabled={busy || code.length !== 6}
            className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2">
            {busy ? <><Loader2 size={15} className="animate-spin" /> Checking…</> : 'Turn on'}
          </button>
        </div>
      </form>
    </div>
  )
}

function ErrorLine({ text }) {
  return (
    <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
      <AlertCircle size={14} className="flex-shrink-0" /> {text}
    </div>
  )
}
