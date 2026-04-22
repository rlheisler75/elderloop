import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, Wrench, UtensilsCrossed, MessageSquare, Car,
  CalendarDays, Gauge, ChevronRight, Check,
  ArrowRight, Church, BookUser, AlertTriangle, SprayCan,
  Menu, X, MapPin, Phone, Mail, Clock, Monitor,
  ClipboardList, Users, HeartHandshake, Stethoscope
} from 'lucide-react'

const MODULES = [
  { icon: MessageSquare,  label: 'Communication',       desc: 'Digital signage, TV channel replacement, announcements, and community messaging' },
  { icon: CalendarDays,   label: 'Activities',          desc: 'Event calendar, resident programming, printable schedules, signage integration' },
  { icon: Church,         label: 'Chapel',              desc: 'Live streaming, service schedule, past recordings, attendance tracking' },
  { icon: BookUser,       label: 'Resident Directory',  desc: 'Profiles, emergency contacts, care levels, family portal access' },
  { icon: Stethoscope,    label: 'Nursing & Clinical',  desc: 'Care notes, vitals trending, medication reference, shift documentation' },
  { icon: Wrench,         label: 'Maintenance',         desc: 'Work orders, PM schedules, asset registry, SLA tracking, vendor management' },
  { icon: UtensilsCrossed,label: 'Dietary',             desc: 'Resident dietary profiles, IDDSI textures, 4-week cycle menus, allergen alerts' },
  { icon: SprayCan,       label: 'Housekeeping',        desc: 'Room inspections, compliance checklists, scheduling, audit-ready reports' },
  { icon: Shield,         label: 'Security',            desc: 'GPS-verified guard rounds, geofenced checkpoints, round history and alerts' },
  { icon: Car,            label: 'Transportation',      desc: 'Medical trip scheduling, daily trip sheets, driver assignments, mileage logs' },
  { icon: Gauge,          label: 'Meter Readings',      desc: 'Utility tracking for communities that resell electric, gas, and water' },
  { icon: AlertTriangle,  label: 'Incident Reports',    desc: 'Documented incidents, severity tracking, review workflow, compliance records' },
  { icon: ClipboardList,  label: 'Surveys',             desc: 'Resident, family, and staff satisfaction surveys with response analytics' },
  { icon: Users,          label: 'Staff Management',    desc: 'Staff profiles, shift scheduling, department assignments, certification tracking' },
  { icon: Clock,          label: 'Time Clock',          desc: 'GPS-verified clock in/out, geofence enforcement, payroll hour summaries' },
  { icon: Monitor,        label: 'IT & Technology',     desc: 'Support ticket system, device asset inventory, warranty tracking' },
  { icon: HeartHandshake, label: 'Family Portal',       desc: 'Family messaging, resident updates, visit scheduling, care team communication' },
]

const PLANS = [
  {
    name: 'Starter',
    price: '$199',
    period: '/mo',
    desc: 'Great for smaller communities',
    features: ['Up to 75 residents', 'Communication & Signage', 'Activities Calendar', 'Maintenance Module', 'Resident Portal', 'Email support'],
    cta: 'Get Started',
    highlight: false,
  },
  {
    name: 'Community',
    price: '$349',
    period: '/mo',
    desc: 'Everything to run a full operation',
    features: ['Unlimited residents', 'All 17 modules included', 'GPS security rounds + time clock', 'Dietary & cycle menus', 'IT asset tracking', 'Priority support + onboarding'],
    cta: 'Start Free Trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'Multi-location operators',
    features: ['Multiple communities', 'Centralized admin dashboard', 'Custom module configuration', 'Dedicated account manager', 'SLA guarantee', 'API access'],
    cta: 'Contact Sales',
    highlight: false,
  },
]

const DEMO_ACCOUNTS = [
  { role: 'CEO',          email: 'demo.ceo@elderloop.xyz',          desc: 'Executive view — KPI dashboard, all modules, high-level reporting' },
  { role: 'Org Admin',    email: 'demo.admin@elderloop.xyz',        desc: 'Full platform admin — users, modules, settings, all data' },
  { role: 'Supervisor',   email: 'demo.supervisor@elderloop.xyz',   desc: 'Shift supervisor — staff management, approvals, operational view' },
  { role: 'Nursing',      email: 'demo.nursing@elderloop.xyz',      desc: 'LPN view — care notes, vitals, medications, nursing documentation' },
  { role: 'Maintenance',  email: 'demo.maintenance@elderloop.xyz',  desc: 'Maintenance tech — work orders, assets, PM schedules' },
  { role: 'Dietary',      email: 'demo.dietary@elderloop.xyz',      desc: 'Dietary aide — resident profiles, cycle menus, meal service' },
  { role: 'Housekeeping', email: 'demo.housekeeping@elderloop.xyz', desc: 'Housekeeping aide — room inspections, schedules, checklists' },
  { role: 'Staff',        email: 'demo.staff@elderloop.xyz',        desc: 'General CNA — floor staff view with assigned module access' },
  { role: 'Family',       email: 'demo.family@elderloop.xyz',       desc: 'Family portal — updates and messaging for Eleanor Hartmann' },
  { role: 'Resident',     email: 'demo.resident@elderloop.xyz',     desc: 'Resident portal — activities, announcements, dining info' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Source Sans 3", system-ui, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400&family=Source+Sans+3:wght@300;400;500;600&display=swap" rel="stylesheet" />

      {/* ── Nav ── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/96 backdrop-blur shadow-sm border-b border-slate-100' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm" style={{ fontFamily: '"Playfair Display", serif' }}>EL</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-semibold text-lg leading-none" style={{ fontFamily: '"Playfair Display", serif', color: scrolled ? '#1e293b' : 'white' }}>
                ElderLoop
              </span>
              <span className="text-xs leading-none mt-0.5" style={{ color: scrolled ? '#94a3b8' : 'rgba(255,255,255,0.5)' }}>
                by Loopware Solutions
              </span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {['Features','Pricing','Demo','About'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`}
                className={`text-sm font-medium transition-colors hover:text-brand-500 ${scrolled ? 'text-slate-600' : 'text-white/80'}`}>
                {item}
              </a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => navigate('/login')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${scrolled ? 'text-slate-600 hover:text-brand-600' : 'text-white/80 hover:text-white'}`}>
              Sign In
            </button>
            <button onClick={() => navigate('/login')}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
              Request Demo
            </button>
          </div>
          <button onClick={() => setMenuOpen(o => !o)} className={`md:hidden ${scrolled ? 'text-slate-700' : 'text-white'}`}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-6 py-5 space-y-3 shadow-lg">
            {['Features','Pricing','Demo','About'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMenuOpen(false)}
                className="block text-slate-700 font-medium py-1.5 text-sm">{item}</a>
            ))}
            <button onClick={() => navigate('/login')}
              className="w-full mt-2 py-3 bg-brand-600 text-white font-semibold rounded-xl text-sm">
              Sign In / Request Demo
            </button>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-950 via-[#0a1628] to-slate-950" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(ellipse 80% 60% at 20% 40%, rgba(12,144,225,0.15) 0%, transparent 60%), radial-gradient(ellipse 60% 60% at 80% 70%, rgba(74,222,128,0.08) 0%, transparent 50%)',
        }} />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
        {/* Bottom fade */}
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-white to-transparent" />

        <div className="relative max-w-5xl mx-auto px-6 py-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/8 text-white/70 text-xs font-medium mb-10 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Serving senior living communities in Missouri
          </div>

          <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', fontWeight: 700, lineHeight: 1.1, color: 'white' }}
            className="mb-8">
            One platform.<br />
            <em style={{ color: '#36aaf5', fontStyle: 'italic' }}>Every department.</em>
          </h1>

          <p className="text-white/65 text-xl max-w-2xl mx-auto mb-12 leading-relaxed" style={{ fontWeight: 300 }}>
            ElderLoop replaces the patchwork of disconnected software your community pays for —
            maintenance, dietary, activities, security, transportation, and more —
            in one affordable platform built by someone who's worked every department.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button onClick={() => navigate('/login')}
              className="group flex items-center justify-center gap-2 px-8 py-4 bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded-2xl transition-all shadow-xl shadow-brand-900/40 text-base">
              See It Live
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <a href="#features"
              className="flex items-center justify-center gap-2 px-8 py-4 text-white/80 hover:text-white font-medium rounded-2xl border border-white/20 hover:border-white/40 transition-all text-base">
              Explore Features
            </a>
          </div>

          {/* Module pills */}
          <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
            {MODULES.map(m => {
              const Icon = m.icon
              return (
                <div key={m.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/8 border border-white/12 rounded-full text-white/60 text-xs backdrop-blur-sm">
                  <Icon size={11} />{m.label}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Social Proof ── */}
      <section className="py-16 bg-brand-50 border-y border-brand-100">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-100 text-brand-700 rounded-full text-sm font-medium mb-5">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            Now in pilot with senior living communities in Missouri
          </div>
          <h3 style={{ fontFamily: '"Playfair Display", serif' }}
            className="text-slate-800 text-2xl font-semibold mb-3">
            Built with operators, for operators
          </h3>
          <p className="text-slate-500 text-base max-w-xl mx-auto leading-relaxed">
            ElderLoop was designed alongside 12 years of hands-on experience across dietary,
            maintenance, housekeeping, and administration in a Missouri senior living community.
            Every feature solves a real daily problem.
          </p>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700 }}
              className="text-slate-900 mb-4">
              Everything your community needs
            </h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              17 modules, fully integrated. Enable only what you need, add more as you grow.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {MODULES.map(m => {
              const Icon = m.icon
              return (
                <div key={m.label}
                  className="group p-6 rounded-2xl border border-slate-100 hover:border-brand-200 hover:shadow-lg transition-all">
                  <div className="w-10 h-10 bg-brand-50 group-hover:bg-brand-100 rounded-xl flex items-center justify-center mb-4 transition-colors">
                    <Icon size={18} className="text-brand-600" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1.5"
                    style={{ fontFamily: '"Playfair Display", serif', fontSize: '1rem' }}>
                    {m.label}
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{m.desc}</p>
                </div>
              )
            })}
          </div>

          {/* Differentiators spotlight */}
          <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 to-brand-950 p-8 md:p-10">
            <div className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-4">Built different</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: Shield,
                  title: 'GPS-Verified Security Rounds',
                  desc: 'Guards check in at geofenced checkpoints — the system verifies they\'re physically on-site before accepting. No other senior living platform has this built in.',
                },
                {
                  icon: Clock,
                  title: 'GPS Time Clock',
                  desc: 'Staff clock in and out with GPS verification. Geofence enforcement prevents off-site punches. Admin sees who\'s on shift in real time with payroll hour summaries.',
                },
                {
                  icon: Monitor,
                  title: 'Built-In IT Ticketing',
                  desc: 'Staff submit IT support tickets right inside ElderLoop. Track every device in your inventory — desktops, laptops, TVs, network gear — with warranty alerts.',
                },
              ].map(item => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="flex flex-col gap-3">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 flex-shrink-0">
                      <Icon size={22} className="text-brand-400" />
                    </div>
                    <div>
                      <div className="text-white font-semibold mb-1.5" style={{ fontFamily: '"Playfair Display", serif' }}>{item.title}</div>
                      <p className="text-white/60 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
              <p className="text-white/40 text-sm">14-day free trial. No contract required. Cancel any time.</p>
              <button onClick={() => navigate('/login?email=demo.ceo@elderloop.xyz&demo=1')}
                className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded-xl transition-colors text-sm whitespace-nowrap">
                See Live Demo <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Demo Accounts ── */}
      <section id="demo" className="py-28 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700 }}
              className="text-slate-900 mb-4">
              Try it right now
            </h2>
            <p className="text-slate-500 text-lg">
              Live demo accounts — click any role to sign in instantly. No setup required.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEMO_ACCOUNTS.map(account => (
              <div key={account.role}
                className="bg-white rounded-2xl border border-slate-100 p-5 hover:border-brand-200 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-brand-600 uppercase tracking-wide bg-brand-50 px-2.5 py-1 rounded-full">
                    {account.role}
                  </span>
                </div>
                <div className="font-mono text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg mb-3 break-all">
                  {account.email}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{account.desc}</p>
                <button
                  onClick={() => navigate(`/login?email=${encodeURIComponent(account.email)}&demo=1`)}
                  className="mt-4 w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
                  <span>Log In as {account.role}</span>
                  <span className="text-brand-200">→</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-28 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700 }}
              className="text-slate-900 mb-4">
              Transparent pricing
            </h2>
            <p className="text-slate-500 text-lg">No setup fees. No per-module charges. Cancel any time.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {PLANS.map(plan => (
              <div key={plan.name}
                className={`rounded-3xl p-8 flex flex-col ${plan.highlight
                  ? 'bg-brand-950 ring-4 ring-brand-500/30 shadow-2xl shadow-brand-900/30 scale-105'
                  : 'bg-white border border-slate-200'}`}>
                {plan.highlight && (
                  <div className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-3">Most Popular</div>
                )}
                <h3 style={{ fontFamily: '"Playfair Display", serif' }}
                  className={`text-xl font-bold mb-2 ${plan.highlight ? 'text-white' : 'text-slate-800'}`}>
                  {plan.name}
                </h3>
                <div className="flex items-end gap-1 mb-2">
                  <span style={{ fontFamily: '"Playfair Display", serif' }}
                    className={`text-4xl font-bold ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>
                    {plan.price}
                  </span>
                  {plan.period && <span className={`text-sm mb-1.5 ${plan.highlight ? 'text-white/50' : 'text-slate-400'}`}>{plan.period}</span>}
                </div>
                <p className={`text-sm mb-6 ${plan.highlight ? 'text-white/60' : 'text-slate-500'}`}>{plan.desc}</p>
                <div className="flex-1 space-y-3 mb-8">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-start gap-2.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${plan.highlight ? 'bg-brand-500' : 'bg-brand-100'}`}>
                        <Check size={11} className={plan.highlight ? 'text-white' : 'text-brand-600'} />
                      </div>
                      <span className={`text-sm ${plan.highlight ? 'text-white/75' : 'text-slate-600'}`}>{f}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate('/login')}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${plan.highlight
                    ? 'bg-brand-500 hover:bg-brand-400 text-white shadow-lg shadow-brand-900/30'
                    : 'bg-slate-900 hover:bg-slate-700 text-white'}`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
          <p className="text-center text-slate-400 text-sm mt-8">14-day free trial on all plans. Credit card required — cancel any time.</p>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="py-28 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-4">Our Story</div>
              <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 700 }}
                className="text-slate-900 mb-6">
                Built by someone who's worked every department
              </h2>
              <p className="text-slate-600 leading-relaxed mb-5">
                ElderLoop was created by a developer with 12 years of hands-on experience in dietary,
                maintenance, central supply, and IT at a senior living community in Springfield, Missouri.
              </p>
              <p className="text-slate-600 leading-relaxed mb-5">
                The frustration of juggling four different software subscriptions — none of which talked
                to each other — was the catalyst. ElderLoop is the platform we always wished existed:
                purpose-built for senior living, priced so smaller communities can finally afford it.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Our founding community in Springfield originally asked for a replacement
                for their in-house TV channel. That request became something much bigger.
              </p>
            </div>
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center text-white font-bold"
                    style={{ fontFamily: '"Playfair Display", serif' }}>EL</div>
                  <div>
                    <div className="font-semibold text-slate-800">Sunrise Gardens Senior Living</div>
                    <div className="text-xs text-slate-400">Founding Community · Springfield, MO</div>
                  </div>
                </div>
                <div className="flex justify-around text-center">
                  {[
                    { v: '17', l: 'Modules Available' },
                    { v: '12+', l: 'Years Experience' },
                    { v: '1', l: 'Platform vs. 4' },
                  ].map(s => (
                    <div key={s.l}>
                      <div className="text-2xl font-bold text-brand-600" style={{ fontFamily: '"Playfair Display", serif' }}>{s.v}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</div>
                {[
                  { icon: Mail,  text: 'hello@elderloop.xyz' },
                  { icon: MapPin,text: 'Springfield, Missouri' },
                  { icon: Phone, text: 'Available on request' },
                ].map(c => {
                  const Icon = c.icon
                  return (
                    <div key={c.text} className="flex items-center gap-2.5 text-sm text-slate-600">
                      <Icon size={14} className="text-brand-500 flex-shrink-0" />{c.text}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28 bg-brand-950 relative overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(ellipse 70% 80% at 20% 50%, rgba(12,144,225,0.2) 0%, transparent 60%)',
        }} />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700 }}
            className="text-white mb-5">
            Ready to simplify your operation?
          </h2>
          <p className="text-white/65 text-lg mb-12 max-w-xl mx-auto">
            Join communities like Sunrise Gardens. We'll have your team set up and running within a day.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/login')}
              className="group flex items-center gap-2 px-8 py-4 bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded-2xl text-base transition-all shadow-xl shadow-brand-900/50">
              Request a Demo <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <a href="mailto:hello@elderloop.xyz"
              className="px-8 py-4 text-white/75 hover:text-white font-medium rounded-2xl border border-white/20 hover:border-white/40 transition-all text-base">
              hello@elderloop.xyz
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-950 py-10 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">EL</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-white font-semibold leading-none" style={{ fontFamily: '"Playfair Display", serif' }}>ElderLoop</span>
              <span className="text-slate-500 text-xs leading-none mt-0.5">by Loopware Solutions</span>
            </div>
          </div>
          <p className="text-slate-600 text-xs">© {new Date().getFullYear()} Loopware Solutions LLC · Springfield, Missouri</p>
          <div className="flex gap-6">
            <button onClick={() => navigate('/login')} className="text-slate-500 hover:text-white text-sm transition-colors">Sign In</button>
            <a href="mailto:hello@elderloop.xyz" className="text-slate-500 hover:text-white text-sm transition-colors">Contact</a>
            <a href="#pricing" className="text-slate-500 hover:text-white text-sm transition-colors">Pricing</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
