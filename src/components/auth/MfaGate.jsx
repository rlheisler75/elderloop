import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Loader2, AlertCircle, ShieldCheck } from 'lucide-react'
import TotpEnroll from './TotpEnroll'

// Full-screen step between the password and the app (App.jsx renders it while
// AuthContext's mfaStep is set). The database enforces the same rule (mfa_ok()),
// so nothing loads until this is done.
//   mode 'challenge': the person has an authenticator, enter its code
//   mode 'enroll':    their role requires two-factor and they haven't set it up
export default function MfaGate({ mode }) {
  const { user, signOut, recheckMfa } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-brand-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4 overflow-hidden">
            <img src="/icon-192.png" alt="ElderLoop" className="w-full h-full object-cover" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-white">ElderLoop</h1>
          <p className="text-brand-400 mt-1 text-sm">{user?.email}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={18} className="text-brand-600" />
            <h2 className="font-display text-xl font-semibold text-slate-800">
              {mode === 'challenge' ? 'Enter your code' : 'Set up two-factor sign-in'}
            </h2>
          </div>

          {mode === 'challenge'
            ? <Challenge onDone={recheckMfa} />
            : <>
                <p className="text-slate-500 text-sm mb-5">
                  Your account works with resident health information, so it needs a code from your
                  phone at each sign-in. Setting it up takes about a minute.
                </p>
                <TotpEnroll onDone={recheckMfa} />
              </>}

          <button onClick={async () => { await signOut(); navigate('/login') }}
            className="w-full mt-5 text-sm text-slate-400 hover:text-slate-600 transition-colors">
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

function Challenge({ onDone }) {
  const [factors, setFactors] = useState([])
  const [factorId, setFactorId] = useState('')
  const [code, setCode]   = useState('')
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const verified = data?.totp || []
      setFactors(verified)
      setFactorId(verified[0]?.id || '')
    })
  }, [])

  const verify = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() })
    setBusy(false)
    if (err) {
      setCode('')
      setError(err.message.includes('Invalid') ? 'That code didn\'t match. Try the newest code in your app.' : err.message)
      try {
        await supabase.rpc('log_audit_event', { p_action: 'MFA_FAILED', p_notes: 'Wrong two-factor code' })
      } catch (_) { /* non-blocking */ }
      return
    }
    onDone?.()
  }

  return (
    <form onSubmit={verify} className="space-y-4">
      <p className="text-slate-500 text-sm">Open your authenticator app and type the 6-digit code for ElderLoop.</p>

      {factors.length > 1 && (
        <select value={factorId} onChange={e => setFactorId(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm">
          {factors.map(f => <option key={f.id} value={f.id}>{f.friendly_name || 'Authenticator'}</option>)}
        </select>
      )}

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
          <AlertCircle size={14} className="flex-shrink-0" /> {error}
        </div>
      )}

      <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric" autoComplete="one-time-code" autoFocus placeholder="6-digit code"
        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-center text-lg tracking-[0.4em] font-mono focus:outline-none focus:ring-2 focus:ring-brand-500" />

      <button type="submit" disabled={busy || code.length !== 6 || !factorId}
        className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2">
        {busy ? <><Loader2 size={15} className="animate-spin" /> Checking…</> : 'Continue'}
      </button>

      <p className="text-xs text-slate-400 text-center">
        Lost your phone? Ask your community's administrator to reset your two-factor sign-in.
      </p>
    </form>
  )
}
