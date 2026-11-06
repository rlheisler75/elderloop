// QR check-in landing page: /app/education/checkin?t=<token>. The poster in the
// classroom links here; a signed-out phone goes through sign-in and comes back
// (the ?t= keeps the return address). edu_checkin() marks the person Present
// when the class is open for check-in.
import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function EducationCheckin() {
  const [params] = useSearchParams()
  const token = params.get('t') || ''
  const [result, setResult] = useState(null)

  useEffect(() => {
    let live = true
    if (!token) { setResult({ ok: false, error: 'This check-in link is missing its code. Scan the QR code again.' }); return }
    supabase.rpc('edu_checkin', { p_token: token }).then(({ data, error }) => {
      if (!live) return
      setResult(error ? { ok: false, error: 'Check-in did not go through. Please try again or tell the instructor.' } : data)
    })
    return () => { live = false }
  }, [token])

  return (
    <div className="max-w-md mx-auto mt-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-8 text-center">
      {!result ? (
        <><Loader2 size={36} className="mx-auto animate-spin text-brand-500 mb-3" /><p className="text-slate-500">Checking you in…</p></>
      ) : result.ok ? (
        <>
          <CheckCircle2 size={48} className="mx-auto text-green-500 mb-3" />
          <h1 className="font-display text-xl font-semibold text-slate-800 dark:text-slate-100">You're checked in</h1>
          <p className="text-slate-600 dark:text-slate-300 mt-2"><b>{result.title}</b></p>
          <p className="text-sm text-slate-400 mt-1">{result.name} · marked Present</p>
        </>
      ) : (
        <>
          <AlertCircle size={48} className="mx-auto text-amber-500 mb-3" />
          <h1 className="font-display text-xl font-semibold text-slate-800 dark:text-slate-100">Not checked in</h1>
          {result.title && <p className="text-slate-600 dark:text-slate-300 mt-2"><b>{result.title}</b></p>}
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{result.error}</p>
          <p className="text-xs text-slate-400 mt-3">Ask the instructor to mark you on the sign-in sheet.</p>
        </>
      )}
      <Link to="/app/education" className="inline-block mt-6 text-sm font-medium text-brand-600 hover:underline">My in-services</Link>
    </div>
  )
}
