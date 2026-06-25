import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Heart, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'

export default function ForgotPassword() {
  const [email,     setEmail]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [sent,      setSent]      = useState(false)
  const [error,     setError]     = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) { setError('Please enter your email address.'); return }
    setLoading(true); setError('')

    const { error: err } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/reset-password` }
    )

    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setSent(true)
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
          <p className="text-brand-400 mt-1 text-sm">Password Reset</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {sent ? (
            /* Success state */
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-green-600" />
              </div>
              <h2 className="font-display text-xl font-semibold text-slate-800 mb-2">Check your email</h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-2">
                We've sent a password reset link to:
              </p>
              <p className="font-semibold text-slate-700 text-sm mb-4">{email}</p>
              <p className="text-slate-400 text-xs leading-relaxed mb-6">
                Click the link in the email to set a new password. The link expires in 1 hour. Check your spam folder if you don't see it.
              </p>
              <Link to="/login"
                className="flex items-center justify-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors">
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          ) : (
            /* Form state */
            <>
              <h2 className="font-display text-xl font-semibold text-slate-800 mb-1">Forgot your password?</h2>
              <p className="text-slate-500 text-sm mb-6">Enter your email and we'll send you a reset link.</p>

              {error && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoFocus
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                  {loading ? <><Loader2 size={15} className="animate-spin" /> Sending...</> : 'Send Reset Link'}
                </button>
              </form>

              <div className="mt-5 pt-5 border-t border-slate-100 text-center">
                <Link to="/login"
                  className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-brand-600 transition-colors">
                  <ArrowLeft size={13} /> Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
