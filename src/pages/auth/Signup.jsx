import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Check, ArrowRight, Eye, EyeOff } from 'lucide-react'

const PLANS = [
  {
    key:     'starter',
    name:    'Starter',
    price:   '$199',
    period:  '/mo',
    desc:    'Up to 75 residents',
    highlight: false,
    features: ['Communication & Signage','Activities Calendar','Chapel','Resident Directory','Maintenance','Dietary','Housekeeping','Family Portal','Surveys'],
  },
  {
    key:     'community',
    name:    'Community',
    price:   '$349',
    period:  '/mo',
    desc:    'Unlimited residents, all modules',
    highlight: true,
    features: ['Everything in Starter','Nursing & Clinical','Marketing & Leads','Property Management','GPS Security Rounds','Staff Scheduling','Time Clock','IT Ticketing','+ more'],
  },
]

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function Signup() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const defaultPlan = searchParams.get('plan') || 'community'

  const [step, setStep]       = useState(1) // 1 = plan, 2 = account info
  const [plan, setPlan]       = useState(defaultPlan)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const [form, setForm] = useState({
    orgName:   '',
    firstName: '',
    lastName:  '',
    email:     '',
    password:  '',
    phone:     '',
    city:      '',
    state:     'MO',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSignup = async () => {
    setError('')
    if (!form.orgName || !form.firstName || !form.lastName || !form.email || !form.password) {
      setError('Please fill in all required fields.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

    try {
      // 1. Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email:    form.email,
        password: form.password,
        options: {
          data: {
            first_name: form.firstName,
            last_name:  form.lastName,
          }
        }
      })

      if (authError) throw authError
      const userId = authData.user?.id
      if (!userId) throw new Error('User creation failed.')

      // 2. Create organization
      const slug = slugify(form.orgName) + '-' + Math.random().toString(36).slice(2, 6)
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name:          form.orgName,
          slug,
          city:          form.city  || null,
          state:         form.state || null,
          phone:         form.phone || null,
          contact_name:  `${form.firstName} ${form.lastName}`,
          contact_email: form.email,
          plan,
          billing_status: 'inactive',
          is_active:      true,
        })
        .select()
        .single()

      if (orgError) throw orgError

      // 3. Update profile with org + role (profile created by trigger on auth signup)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          organization_id: org.id,
          role:            'org_admin',
          first_name:      form.firstName,
          last_name:       form.lastName,
          phone:           form.phone || null,
        })
        .eq('id', userId)

      if (profileError) throw profileError

      // 4. Enable default modules for the plan
      const STARTER_MODULES = [
        'communication','activities','chapel','directory',
        'work_orders','dietary','housekeeping','family','surveys'
      ]
      const COMMUNITY_MODULES = [
        ...STARTER_MODULES,
        'nursing','incidents','staff','scheduling','timeclock',
        'transportation','meters','security','it','marketing','property_management'
      ]
      const modules = plan === 'starter' ? STARTER_MODULES : COMMUNITY_MODULES

      await supabase.from('organization_modules').insert(
        modules.map(key => ({ organization_id: org.id, module_key: key, is_enabled: true }))
      )

      // 5. Kick off Stripe checkout
      const priceId = plan === 'starter'
        ? import.meta.env.VITE_STRIPE_PRICE_STARTER
        : import.meta.env.VITE_STRIPE_PRICE_COMMUNITY

      if (priceId) {
        const res = await fetch('/api/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId: org.id,
            priceId,
            orgName:      form.orgName,
            contactEmail: form.email,
          }),
        })
        const { url, error: stripeError } = await res.json()
        if (stripeError) throw new Error(stripeError)
        if (url) { window.location.href = url; return }
      }

      // Fallback if no Stripe price configured
      navigate('/app/dashboard')

    } catch (err) {
      console.error('Signup error:', err)
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white'

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" style={{ fontFamily: '"Source Sans 3", system-ui, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm" style={{ fontFamily: '"Playfair Display", serif' }}>EL</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-semibold text-slate-800" style={{ fontFamily: '"Playfair Display", serif' }}>ElderLoop</span>
              <span className="text-xs text-slate-400">by Loopware Solutions</span>
            </div>
          </button>
          <button onClick={() => navigate('/login')} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
            Already have an account? <span className="text-brand-600 font-medium">Sign in</span>
          </button>
        </div>
      </nav>

      <div className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-5xl">

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-3 mb-10">
            {['Choose Plan', 'Create Account'].map((label, i) => {
              const num = i + 1
              const active = step === num
              const done   = step > num
              return (
                <div key={label} className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      done   ? 'bg-green-500 text-white' :
                      active ? 'bg-brand-600 text-white' :
                               'bg-slate-200 text-slate-400'
                    }`}>
                      {done ? <Check size={14} /> : num}
                    </div>
                    <span className={`text-sm font-medium ${active ? 'text-slate-800' : 'text-slate-400'}`}>{label}</span>
                  </div>
                  {i < 1 && <div className={`w-12 h-px ${step > 1 ? 'bg-green-400' : 'bg-slate-200'}`} />}
                </div>
              )
            })}
          </div>

          {/* ── Step 1: Plan Selection ── */}
          {step === 1 && (
            <div>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2" style={{ fontFamily: '"Playfair Display", serif' }}>
                  Choose your plan
                </h1>
                <p className="text-slate-500">14-day free trial. Credit card required. Cancel any time.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-8">
                {PLANS.map(p => (
                  <button key={p.key} onClick={() => setPlan(p.key)}
                    className={`text-left rounded-3xl p-8 border-2 transition-all ${
                      plan === p.key
                        ? p.highlight
                          ? 'border-brand-500 bg-brand-950 shadow-2xl shadow-brand-900/30'
                          : 'border-brand-500 bg-white shadow-lg'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}>
                    {p.highlight && (
                      <div className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-3">Most Popular</div>
                    )}
                    <div className="flex items-start justify-between mb-1">
                      <h3 className={`text-xl font-bold ${p.highlight && plan === p.key ? 'text-white' : 'text-slate-800'}`}
                        style={{ fontFamily: '"Playfair Display", serif' }}>
                        {p.name}
                      </h3>
                      {plan === p.key && (
                        <div className="w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <Check size={13} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="mb-1">
                      <span className={`text-3xl font-bold ${p.highlight && plan === p.key ? 'text-white' : 'text-slate-900'}`}
                        style={{ fontFamily: '"Playfair Display", serif' }}>
                        {p.price}
                      </span>
                      <span className={`text-sm ${p.highlight && plan === p.key ? 'text-white/50' : 'text-slate-400'}`}>{p.period}</span>
                    </div>
                    <p className={`text-sm mb-5 ${p.highlight && plan === p.key ? 'text-white/60' : 'text-slate-500'}`}>{p.desc}</p>
                    <ul className="space-y-2">
                      {p.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <Check size={13} className="text-brand-400 flex-shrink-0" />
                          <span className={p.highlight && plan === p.key ? 'text-white/75' : 'text-slate-600'}>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>

              <div className="text-center">
                <button onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 px-10 py-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-2xl transition-colors shadow-lg shadow-brand-900/20 text-base">
                  Continue with {PLANS.find(p2 => p2.key === plan)?.name} <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Account Info ── */}
          {step === 2 && (
            <div className="max-w-xl mx-auto">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2" style={{ fontFamily: '"Playfair Display", serif' }}>
                  Create your account
                </h1>
                <p className="text-slate-500">
                  Setting up <span className="font-semibold text-brand-600 capitalize">{plan}</span> plan · {plan === 'starter' ? '$199' : '$349'}/mo
                </p>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                {error && (
                  <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Org name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Community / Organization Name <span className="text-red-400">*</span>
                    </label>
                    <input className={inputCls} value={form.orgName}
                      onChange={e => set('orgName', e.target.value)}
                      placeholder="Sunrise Gardens Senior Living" />
                  </div>

                  {/* Name */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">First Name <span className="text-red-400">*</span></label>
                      <input className={inputCls} value={form.firstName}
                        onChange={e => set('firstName', e.target.value)} placeholder="Jane" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Last Name <span className="text-red-400">*</span></label>
                      <input className={inputCls} value={form.lastName}
                        onChange={e => set('lastName', e.target.value)} placeholder="Smith" />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Email Address <span className="text-red-400">*</span>
                    </label>
                    <input className={inputCls} type="email" value={form.email}
                      onChange={e => set('email', e.target.value)}
                      placeholder="jane@yourcommunit.com" />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Password <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input className={inputCls + ' pr-11'} type={showPass ? 'text' : 'password'}
                        value={form.password} onChange={e => set('password', e.target.value)}
                        placeholder="Min. 8 characters" />
                      <button type="button" onClick={() => setShowPass(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Phone + Location */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                      <input className={inputCls} value={form.phone}
                        onChange={e => set('phone', e.target.value)} placeholder="417-555-0100" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
                      <input className={inputCls} value={form.city}
                        onChange={e => set('city', e.target.value)} placeholder="Springfield" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">State</label>
                    <select className={inputCls} value={form.state} onChange={e => set('state', e.target.value)}>
                      {['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Terms */}
                <p className="text-xs text-slate-400 mt-5 leading-relaxed">
                  By creating an account you agree to our Terms of Service and Privacy Policy.
                  Your 14-day free trial begins today — you won't be charged until the trial ends.
                </p>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(1)}
                    className="px-5 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
                    Back
                  </button>
                  <button onClick={handleSignup} disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 text-sm">
                    {loading
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating account…</>
                      : <>Create Account & Continue to Payment <ArrowRight size={16} /></>
                    }
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
