import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Heart, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [showPw,      setShowPw]      = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [done,        setDone]        = useState(false)
  const [error,       setError]       = useState('')
  const [validSession, setValidSession] = useState(false)
  const [checking,    setChecking]    = useState(true)

  useEffect(() => {
    // Supabase automatically handles the recovery token in the URL hash
    // and fires a PASSWORD_RECOVERY auth state change event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setValidSession(true)
        setChecking(false)
      } else if (event === 'SIGNED_IN' && session) {
        // Already signed in — allow reset
        setValidSession(true)
        setChecking(false)
      }
    })

    // Also check if there's already a valid session from the URL hash
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setValidSession(true)
      }
      setChecking(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (err) {
      setError(err.message)
      return
    }

    setDone(true)

    // Sign out so they log in fresh with the new password
    await supabase.auth.signOut()

    // Redirect to login after 3 seconds
    setTimeout(() => navigate('/login'), 3000)
  }

  // Loading — checking for valid reset session
  if (checking) {
    return (
      <div className="min-h-screen bg-brand-950 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand-400" />
      </div>
    )
  }

  // Invalid / expired link
  if (!validSession) {
    return (
      <div className="min-h-screen bg-brand-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Heart size={22} className="text-white fill-white" />
            </div>
            <h1 className="font-display text-3xl font-semibold text-white">ElderLoop</h1>
          </div>
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <h2 className="font-display text-xl font-semibold text-slate-800 mb-2">Link Expired</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              This password reset link has expired or is invalid. Reset links expire after 1 hour.
            </p>
            <Link to="/forgot-password"
              className="block w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm transition-colors text-center">
              Request a New Link
            </Link>
            <Link to="/login" className="block mt-3 text-sm text-slate-400 hover:text-slate-600 transition-colors">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Heart size={22} className="text-white fill-white" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-white">ElderLoop</h1>
          <p className="text-brand-400 mt-1 text-sm">Set New Password</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {done ? (
            /* Success state */
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-green-600" />
              </div>
              <h2 className="font-display text-xl font-semibold text-slate-800 mb-2">Password Updated</h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Your password has been changed successfully. Redirecting you to sign in...
              </p>
              <div className="mt-4">
                <Link to="/login" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                  Sign in now →
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h2 className="font-display text-xl font-semibold text-slate-800 mb-1">Set a new password</h2>
              <p className="text-slate-500 text-sm mb-6">Choose a strong password with at least 8 characters.</p>

              {error && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle size={14} className="flex-shrink-0" /> {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoFocus
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {/* Password strength indicator */}
                  {password.length > 0 && (
                    <div className="mt-1.5 flex gap-1">
                      {[1,2,3,4].map(n => (
                        <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${
                          password.length >= n * 3
                            ? n <= 1 ? 'bg-red-400' : n <= 2 ? 'bg-amber-400' : n <= 3 ? 'bg-yellow-400' : 'bg-green-500'
                            : 'bg-slate-200'
                        }`} />
                      ))}
                      <span className="text-xs text-slate-400 ml-1">
                        {password.length < 4 ? 'Too short' : password.length < 7 ? 'Weak' : password.length < 10 ? 'Fair' : 'Strong'}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors ${
                      confirm && password !== confirm
                        ? 'border-red-300 bg-red-50'
                        : confirm && password === confirm
                          ? 'border-green-300 bg-green-50'
                          : 'border-slate-200'
                    }`} />
                  {confirm && password !== confirm && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>

                <button type="submit" disabled={loading || !password || !confirm}
                  className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                  {loading ? <><Loader2 size={15} className="animate-spin" /> Updating...</> : 'Set New Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
