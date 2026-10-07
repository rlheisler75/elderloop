import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ShieldCheck, Smartphone, Trash2, Plus, Loader2, AlertCircle } from 'lucide-react'
import TotpEnroll from './TotpEnroll'

// Settings → Two-factor sign-in. Anyone may turn it on; people whose role requires it
// (mfa_required()) can add a second phone but can't remove their last one.
export default function TwoFactorCard() {
  const { mfaStatus, recheckMfa } = useAuth()
  const [factors, setFactors] = useState(null)
  const [adding, setAdding]   = useState(false)
  const [busyId, setBusyId]   = useState('')
  const [error, setError]     = useState('')

  const load = async () => {
    const { data } = await supabase.auth.mfa.listFactors()
    setFactors(data?.totp || [])
  }
  useEffect(() => { load() }, [])

  const required = !!mfaStatus?.required
  const demo     = !!mfaStatus?.demo

  const remove = async (f) => {
    if (required && factors.length <= 1) return
    if (!confirm('Remove this authenticator? You will no longer be asked for its code.')) return
    setError('')
    setBusyId(f.id)
    const { error: err } = await supabase.auth.mfa.unenroll({ factorId: f.id })
    setBusyId('')
    if (err) { setError(err.message); return }
    try {
      await supabase.rpc('log_audit_event', { p_action: 'MFA_REMOVED', p_notes: 'Authenticator app removed' })
    } catch (_) { /* non-blocking */ }
    await load()
    recheckMfa()
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 mb-5">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck size={16} className="text-brand-600" />
        <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100">Two-Factor Sign-In</h2>
        {factors?.length > 0 && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">On</span>
        )}
      </div>
      <p className="text-slate-400 text-sm mb-4">
        After your password, enter a 6-digit code from an authenticator app on your phone
        (Google or Microsoft Authenticator, 1Password, Duo Mobile).
        {required && ' Your role requires it.'}
      </p>

      {error && (
        <div className="mb-3 flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {demo ? (
        <p className="text-sm text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3">
          Not available on demo accounts, since their password is shared.
        </p>
      ) : factors === null ? (
        <Loader2 size={18} className="animate-spin text-slate-400" />
      ) : adding ? (
        <TotpEnroll onDone={async () => { setAdding(false); await load(); recheckMfa() }}
          onCancel={() => setAdding(false)} />
      ) : (
        <div className="space-y-3">
          {factors.map(f => (
            <div key={f.id} className="flex items-center justify-between gap-3 px-4 py-3 border border-slate-100 dark:border-slate-800 rounded-xl">
              <div className="flex items-center gap-3">
                <Smartphone size={18} className="text-slate-400" />
                <div>
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Authenticator app</div>
                  <div className="text-xs text-slate-400">
                    Added {new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>
              {!(required && factors.length <= 1) && (
                <button onClick={() => remove(f)} disabled={busyId === f.id} title="Remove"
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                  {busyId === f.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              )}
            </div>
          ))}
          <button onClick={() => { setError(''); setAdding(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus size={15} /> {factors.length ? 'Add another phone' : 'Turn on two-factor sign-in'}
          </button>
          {required && factors.length <= 1 && factors.length > 0 && (
            <p className="text-xs text-slate-400">
              Changing phones? Add the new one first, then remove the old one. If you lose your phone,
              your community's administrator can reset it.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
