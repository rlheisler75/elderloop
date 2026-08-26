import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Check, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'

// ── Plan definitions ────────────────────────────────────────────
const PLANS = [
  {
    key:   'starter',
    name:  'Starter',
    price: 'Free',
    desc:  'Core modules to get started',
    color: 'border-slate-200',
    features: ['Resident Directory', 'Staff Management', 'Communication', 'Family Messaging'],
    note: '50 residents · 10 staff',
  },
  {
    key:   'essential',
    name:  'Essential',
    price: '$299/mo',
    desc:  'Starter + clinical and programming',
    color: 'border-brand-300',
    features: ['Everything in Starter — no limits', 'SMS messaging', 'Chapel', 'Activities', 'Incident Reports', 'Nursing Notes'],
    note: null,
  },
  {
    key:   'professional',
    name:  'Professional',
    price: '$999/mo',
    desc:  'The full platform — every module',
    color: 'border-brand-500',
    badge: 'Most Popular',
    features: ['Everything in Essential', 'Dietary & Maintenance', 'Scheduling & Housekeeping', 'Central Supply', 'Property Management', '+ every new module we build'],
    note: null,
  },
]

export default function Signup() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const repCode = params.get('rep') || ''
  const promoCode = params.get('promo') || ''
  const planParam = params.get('plan') || 'starter'

  const [step, setStep]   = useState(1) // 1 = plan select, 2 = details
  const [plan, setPlan]   = useState(PLANS.find(p => p.key === planParam) || PLANS[0])
  const [form, setForm]   = useState({
    first_name: '', last_name: '', email: '',
    password: '', community_name: '',
  })
  useEffect(() => {
    if (!repCode) return
    supabase.rpc('increment_rep_code_click', { p_code: repCode })
      .then(({ error }) => { if (error) console.error('increment_rep_code_click failed:', error) })
  }, [repCode])

  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')

    // Basic validation
    if (!form.first_name.trim() || !form.last_name.trim())
      return setError('Please enter your first and last name.')
    if (!form.email.trim())
      return setError('Please enter your email address.')
    if (!form.password || form.password.length < 8)
      return setError('Password must be at least 8 characters.')
    if (!form.community_name.trim())
      return setError('Please enter your community name.')

    setLoading(true)

    try {
      // 1. Create org + user via edge function
      const res = await fetch(`${supabaseUrl}/functions/v1/create-org`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:          form.email.trim().toLowerCase(),
          password:       form.password,
          first_name:     form.first_name.trim(),
          last_name:      form.last_name.trim(),
          community_name: form.community_name.trim(),
          plan:           plan.key,
          rep_code:       repCode || null,
          promo_code:     promoCode || null,
        }),
      })
      const result = await res.json()

      if (!result.success) {
        setError(result.error || 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      // 2. Sign in the newly created user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email:    form.email.trim().toLowerCase(),
        password: form.password,
      })
      if (signInError) {
        // Account created but sign-in failed — send to login
        navigate('/login?welcome=1')
        return
      }

      // 3. If paid plan, redirect to Stripe Checkout
      if (plan.key !== 'starter') {
        const { data: { session } } = await supabase.auth.getSession()
        const checkoutRes = await fetch(`${supabaseUrl}/functions/v1/create-checkout`, {
          method:  'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({ plan: plan.key, promo_code: promoCode || null }),
        })
        const checkoutResult = await checkoutRes.json()

        if (checkoutResult.checkout_url) {
          window.location.href = checkoutResult.checkout_url
          return
        }
        // If checkout creation failed, still land in app — billing can be sorted later
      }

      // 4. Starter or checkout failed — land in app
      navigate('/app/dashboard')

    } catch (err) {
      setError('Network error — please check your connection and try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-[#0a1628] to-slate-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center overflow-hidden">
            <img src="/icon-192.png" alt="ElderLoop" className="w-full h-full object-cover" />
          </div>
          <span className="text-white font-semibold text-lg" style={{ fontFamily: '"Playfair Display", serif' }}>
            ElderLoop
          </span>
        </Link>
        <p className="text-white/40 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">

          {/* Step 1 — Plan selection */}
          {step === 1 && (
            <div>
              <h1 className="text-white text-3xl font-bold text-center mb-2"
                style={{ fontFamily: '"Playfair Display", serif' }}>
                Choose your plan
              </h1>
              <p className="text-white/50 text-center mb-8">You can upgrade any time from inside the app.</p>

              <div className="grid gap-4">
                {PLANS.map(p => (
                  <button key={p.key} onClick={() => setPlan(p)}
                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
                      plan.key === p.key
                        ? 'border-brand-500 bg-brand-900/40'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-semibold">{p.name}</span>
                          {p.badge && (
                            <span className="text-xs px-2 py-0.5 bg-brand-600 text-white rounded-full font-medium">
                              {p.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-white/50 text-sm mb-3">{p.desc}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {p.features.map(f => (
                            <div key={f} className="flex items-center gap-1.5">
                              <Check size={11} className="text-brand-400 flex-shrink-0" />
                              <span className="text-white/60 text-xs">{f}</span>
                            </div>
                          ))}
                        </div>
                        {p.note && <p className="text-white/30 text-xs mt-2">{p.note}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-white font-bold text-lg">{p.price}</div>
                        <div className={`w-5 h-5 rounded-full border-2 mt-2 ml-auto flex items-center justify-center transition-all ${
                          plan.key === p.key ? 'border-brand-500 bg-brand-500' : 'border-white/20'
                        }`}>
                          {plan.key === p.key && <Check size={11} className="text-white" />}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <button onClick={() => setStep(2)}
                className="w-full mt-6 py-4 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg">
                Continue with {plan.name}
                <ArrowRight size={18} />
              </button>

              {repCode && (
                <p className="text-center text-white/30 text-xs mt-4">
                  Referred by: <span className="text-brand-400 font-mono">{repCode}</span>
                </p>
              )}
              {promoCode && (
                <p className="text-center text-white/30 text-xs mt-1">
                  Promo code applied: <span className="text-brand-400 font-mono">{promoCode}</span>
                </p>
              )}
            </div>
          )}

          {/* Step 2 — Account details */}
          {step === 2 && (
            <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-3xl p-8">
              <button onClick={() => setStep(1)} className="text-white/40 hover:text-white/70 text-sm mb-6 flex items-center gap-1 transition-colors">
                ← Change plan
              </button>

              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-white font-bold text-xl" style={{ fontFamily: '"Playfair Display", serif' }}>
                    Create your account
                  </h2>
                  <p className="text-white/40 text-sm mt-0.5">Setting up: <span className="text-brand-400">{plan.name}</span> plan</p>
                </div>
              </div>

              {error && (
                <div className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                      First Name *
                    </label>
                    <input value={form.first_name} onChange={e => set('first_name', e.target.value)}
                      placeholder="Jane" autoFocus
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 text-sm focus:outline-none focus:border-brand-500/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                      Last Name *
                    </label>
                    <input value={form.last_name} onChange={e => set('last_name', e.target.value)}
                      placeholder="Smith"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 text-sm focus:outline-none focus:border-brand-500/50 transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                    Community / Organization Name *
                  </label>
                  <input value={form.community_name} onChange={e => set('community_name', e.target.value)}
                    placeholder="Sunrise Gardens Senior Living"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 text-sm focus:outline-none focus:border-brand-500/50 transition-all" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                    Work Email *
                  </label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    placeholder="jane@community.com"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 text-sm focus:outline-none focus:border-brand-500/50 transition-all" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => set('password', e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 text-sm focus:outline-none focus:border-brand-500/50 transition-all" />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-4 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-800 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-base shadow-lg">
                  {loading ? (
                    <><Loader2 size={18} className="animate-spin" /> Setting up your account...</>
                  ) : plan.key === 'starter' ? (
                    <>Create Free Account <ArrowRight size={18} /></>
                  ) : (
                    <>Continue to Payment <ArrowRight size={18} /></>
                  )}
                </button>

                <p className="text-center text-white/25 text-xs">
                  By creating an account you agree to our{' '}
                  <a href="/terms" target="_blank" rel="noreferrer" className="text-white/40 hover:text-white/70 underline transition-colors">Terms of Service</a>
                  {' '}and{' '}
                  <a href="/privacy" target="_blank" rel="noreferrer" className="text-white/40 hover:text-white/70 underline transition-colors">Privacy Policy</a>.
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
