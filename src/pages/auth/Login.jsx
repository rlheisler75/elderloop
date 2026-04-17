import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const DEMO_PASSWORD = 'Demo2024!'

const DEMO_ROLES = [
  { role: 'Org Admin',    email: 'demo.admin@elderloop.xyz',       color: 'bg-brand-600 hover:bg-brand-700' },
  { role: 'Staff',        email: 'demo.staff@elderloop.xyz',       color: 'bg-slate-700 hover:bg-slate-600' },
  { role: 'Maintenance',  email: 'demo.maintenance@elderloop.xyz', color: 'bg-amber-600 hover:bg-amber-700' },
  { role: 'Dietary',      email: 'demo.dietary@elderloop.xyz',     color: 'bg-green-700 hover:bg-green-600' },
]

export default function Login() {
  const [searchParams] = useSearchParams()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [isDemo, setIsDemo]     = useState(false)

  // Pre-fill from URL params (?email=...&demo=1)
  useEffect(() => {
    const paramEmail = searchParams.get('email')
    const paramDemo  = searchParams.get('demo')
    if (paramEmail) {
      setEmail(paramEmail)
      setPassword(DEMO_PASSWORD)
      setIsDemo(true)
      // Auto-submit after a brief moment so user sees it fill in
      if (paramDemo) {
        const timer = setTimeout(() => {
          handleAutoLogin(paramEmail, DEMO_PASSWORD)
        }, 600)
        return () => clearTimeout(timer)
      }
    }
  }, [searchParams])

  const handleAutoLogin = async (e, p) => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: e, password: p })
    if (error) { setError('Demo login failed — please try again.'); setLoading(false) }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
  }

  const handleDemoClick = (demoEmail) => {
    setEmail(demoEmail)
    setPassword(DEMO_PASSWORD)
    setIsDemo(true)
    setError('')
    setLoading(true)
    supabase.auth.signInWithPassword({ email: demoEmail, password: DEMO_PASSWORD })
      .then(({ error }) => {
        if (error) { setError('Demo login failed — please try again.'); setLoading(false) }
      })
  }

  return (
    <div className="min-h-screen bg-brand-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-semibold text-white tracking-wide">ElderLoop</h1>
          <p className="text-brand-400 mt-2 text-sm">Senior Living Management Platform</p>
        </div>

        {/* Loading overlay for auto-login */}
        {loading && isDemo && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center mb-4">
            <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600 text-sm font-medium">Signing you in to the demo...</p>
            <p className="text-slate-400 text-xs mt-1">{email}</p>
          </div>
        )}

        {/* Main login card */}
        {(!loading || !isDemo) && (
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="font-display text-xl font-semibold text-slate-800 mb-6">Sign in to your account</h2>

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {isDemo && !error && (
              <div className="mb-4 px-4 py-2.5 bg-brand-50 border border-brand-200 rounded-lg text-brand-700 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse flex-shrink-0" />
                Demo account pre-filled — click Sign In to continue
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input type="email" value={email} onChange={e => { setEmail(e.target.value); setIsDemo(false) }}
                  required autoComplete="username"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <input type="password" value={password} onChange={e => { setPassword(e.target.value); setIsDemo(false) }}
                  required autoComplete="current-password"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="••••••••" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white font-medium rounded-lg text-sm transition-colors mt-2">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Quick demo buttons */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-xs text-slate-400 text-center mb-3 font-medium">Or try a demo account</p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ROLES.map(d => (
                  <button key={d.role} onClick={() => handleDemoClick(d.email)}
                    disabled={loading}
                    className={`py-2 rounded-lg text-white text-xs font-semibold transition-colors disabled:opacity-50 ${d.color}`}>
                    {d.role}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-brand-500 text-xs mt-6">
          &copy; {new Date().getFullYear()} Loopware Solutions LLC
        </p>
      </div>
    </div>
  )
}
