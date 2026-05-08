import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Check, ArrowRight, Heart, Shield, Zap, Users } from 'lucide-react'

const COMMUNITY_SIZES = [
  'Under 50 residents',
  '50–100 residents',
  '100–200 residents',
  '200–500 residents',
  '500+ residents / Multi-site',
]

const ROLES = [
  'Executive Director / CEO',
  'Administrator',
  'Department Manager',
  'IT / Technology',
  'Owner / Operator',
  'Other',
]

export default function EarlyAccess() {
  const [form, setForm] = useState({
    name: '', email: '', community: '', role: '', community_size: '', message: ''
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required.')
      return
    }
    setLoading(true)
    setError('')

    const { error: err } = await supabase.from('waitlist').insert({
      name:           form.name.trim(),
      email:          form.email.trim().toLowerCase(),
      community:      form.community.trim() || null,
      role:           form.role || null,
      community_size: form.community_size || null,
      message:        form.message.trim() || null,
      source:         'landing',
      status:         'new',
    })

    if (err) {
      if (err.code === '23505') {
        setError("You're already on the list! We'll be in touch soon.")
      } else {
        setError('Something went wrong. Please try again or email info@loopwaresolutions.com')
      }
      setLoading(false)
      return
    }

    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-950 via-[#0a1628] to-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          {/* Success animation */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
            <div className="relative w-24 h-24 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center">
              <Check size={40} className="text-green-400" />
            </div>
          </div>
          <h2 className="text-white text-3xl font-bold mb-4" style={{ fontFamily: '"Playfair Display", serif' }}>
            You're on the list.
          </h2>
          <p className="text-white/60 text-lg leading-relaxed mb-8">
            Thanks for your interest in ElderLoop. I'll personally reach out within 2 business days to learn more about your community.
          </p>
          <div className="p-5 bg-white/5 border border-white/10 rounded-2xl text-left mb-8">
            <div className="text-xs text-brand-400 font-semibold uppercase tracking-wider mb-3">What happens next</div>
            {[
              'You\'ll get a confirmation email shortly',
              'I\'ll reach out to schedule a 30-min discovery call',
              'We\'ll walk through a live demo tailored to your community',
              'If it\'s a fit, you can be live within a day',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3 mb-2 last:mb-0">
                <div className="w-5 h-5 rounded-full bg-brand-600/30 text-brand-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
                <p className="text-white/70 text-sm">{step}</p>
              </div>
            ))}
          </div>
          <a href="/" className="text-brand-400 hover:text-brand-300 text-sm transition-colors">← Back to elderloop.xyz</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-[#0a1628] to-slate-950">
      {/* Subtle grid overlay */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <div className="relative max-w-5xl mx-auto px-6 py-16">
        {/* Logo */}
        <a href="/" className="inline-flex items-center gap-2.5 mb-16 group">
          <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center">
            <Heart size={16} className="text-white fill-white" />
          </div>
          <span className="text-white font-semibold text-lg" style={{ fontFamily: '"Playfair Display", serif' }}>ElderLoop</span>
        </a>

        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left — pitch */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-white/60 text-xs font-medium mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Currently onboarding select communities
            </div>

            <h1 className="text-white mb-6 leading-tight" style={{
              fontFamily: '"Playfair Display", serif',
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
              fontWeight: 700,
            }}>
              Request early<br />
              <em style={{ color: '#36aaf5', fontStyle: 'italic' }}>access.</em>
            </h1>

            <p className="text-white/60 text-lg leading-relaxed mb-10" style={{ fontWeight: 300 }}>
              ElderLoop is the all-in-one platform built for senior living communities — maintenance, dietary, activities, nursing, and more. Built by someone who's worked every department.
            </p>

            {/* Value props */}
            <div className="space-y-4 mb-10">
              {[
                { icon: Zap,    text: 'Live within one day — no lengthy implementation' },
                { icon: Shield, text: 'HIPAA-ready infrastructure from day one' },
                { icon: Users,  text: 'Replaces TheWorxHub, eMenuCHOICE, IRIS, and more' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-brand-600/20 border border-brand-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon size={14} className="text-brand-400" />
                  </div>
                  <span className="text-white/70 text-sm">{text}</span>
                </div>
              ))}
            </div>

            {/* Social proof */}
            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-brand-600/20 rounded-full flex items-center justify-center text-brand-400 font-bold text-sm">BM</div>
                <div>
                  <div className="text-white text-sm font-semibold">Brian Miller</div>
                  <div className="text-white/40 text-xs">CEO, Maranatha Village · Springfield, MO</div>
                </div>
              </div>
              <p className="text-white/60 text-sm leading-relaxed italic">
                "ElderLoop is replacing TheWorxHub for us — saving around $8,000 a year and finally giving us meter readings we never had before."
              </p>
            </div>
          </div>

          {/* Right — form */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-3xl p-8">
            <h2 className="text-white font-semibold text-xl mb-1" style={{ fontFamily: '"Playfair Display", serif' }}>
              Get early access
            </h2>
            <p className="text-white/40 text-sm mb-7">No commitment. I'll reach out personally within 2 business days.</p>

            {error && (
              <div className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                    Your Name <span className="text-brand-400">*</span>
                  </label>
                  <input
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 text-sm focus:outline-none focus:border-brand-500/50 focus:bg-white/8 transition-all"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                    Work Email <span className="text-brand-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder="jane@community.com"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 text-sm focus:outline-none focus:border-brand-500/50 focus:bg-white/8 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Community Name</label>
                <input
                  value={form.community}
                  onChange={e => set('community', e.target.value)}
                  placeholder="Sunrise Gardens Senior Living"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 text-sm focus:outline-none focus:border-brand-500/50 focus:bg-white/8 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Your Role</label>
                  <select
                    value={form.role}
                    onChange={e => set('role', e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500/50 transition-all appearance-none"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="" className="bg-slate-900">Select role...</option>
                    {ROLES.map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Community Size</label>
                  <select
                    value={form.community_size}
                    onChange={e => set('community_size', e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500/50 transition-all appearance-none"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="" className="bg-slate-900">Select size...</option>
                    {COMMUNITY_SIZES.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                  What's your biggest pain point? <span className="text-white/20 font-normal normal-case">(optional)</span>
                </label>
                <textarea
                  value={form.message}
                  onChange={e => set('message', e.target.value)}
                  rows={3}
                  placeholder="e.g. We're paying for 5 different systems and none of them talk to each other..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 text-sm focus:outline-none focus:border-brand-500/50 focus:bg-white/8 transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-800 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-base shadow-lg shadow-brand-900/40 group"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Request Early Access
                    <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>

              <p className="text-center text-white/25 text-xs">
                No spam. No sales pressure. Just a real conversation.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
