import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, Wrench, UtensilsCrossed, MessageSquare, Car,
  CalendarDays, Gauge, ChevronRight, Check,
  ArrowRight, Church, BookUser, AlertTriangle, SprayCan,
  Menu, X, MapPin, Mail, Clock, Monitor,
  ClipboardList, Users, HeartHandshake, Stethoscope,
  Package, Building2, GraduationCap, Megaphone, Wallet, UserRound,
  Lock, Eye, BellRing, KeyRound, Timer, FileCheck, Layers, History
} from 'lucide-react'

// baa: health-record module, turned on only after a signed BAA (phi_module_keys in the database)
// addon: sold separately on Essential / Plus, included with Professional
const MODULES = [
  { icon: MessageSquare,  label: 'Communication',       desc: 'Digital signage, in-house TV channel, announcements, and community messaging' },
  { icon: CalendarDays,   label: 'Activities',          desc: 'Event calendar, resident programming, printable schedules, signage integration' },
  { icon: Church,         label: 'Chapel',              desc: 'Live streaming, service schedule, past recordings, attendance tracking' },
  { icon: BookUser,       label: 'Resident Directory',  desc: 'Profiles, emergency contacts, care levels, family portal access' },
  { icon: Stethoscope,    label: 'Nursing & Clinical',  desc: 'Care notes, vitals trending, medication lists, shift documentation', baa: true },
  { icon: HeartHandshake, label: 'Social Services',     desc: 'Psychosocial profiles, case notes, care plans, discharge planning, and grievances with Missouri response deadlines', baa: true },
  { icon: AlertTriangle,  label: 'Incident Reports',    desc: 'Incident reporting, review workflow, and state-report countdown clocks', baa: true },
  { icon: Wrench,         label: 'Maintenance',         desc: 'Work orders, PM schedules, asset registry, vendor costs, and your work-order history brought over' },
  { icon: UtensilsCrossed,label: 'Dietary',             desc: 'Resident dietary profiles, IDDSI textures, 4-week cycle menus, meal tickets, allergen alerts' },
  { icon: SprayCan,       label: 'Housekeeping',        desc: 'Room inspections, compliance checklists, linen tracking, audit-ready reports' },
  { icon: Package,        label: 'Central Supply',      desc: 'Inventory, checkout, purchase orders with approvals, vendor ordering, resident charges' },
  { icon: Building2,      label: 'Independent Living',  desc: 'IL homes, tenants, leases and rent, plus maintenance walkthroughs' },
  { icon: Shield,         label: 'Security',            desc: 'GPS-verified guard rounds, geofenced checkpoints, round history and alerts' },
  { icon: Car,            label: 'Transportation',      desc: 'Medical trip scheduling, ride requests, daily trip sheets, driver assignments, mileage logs' },
  { icon: Gauge,          label: 'Meter Readings',      desc: 'Utility tracking for communities that resell electric, gas, and water' },
  { icon: ClipboardList,  label: 'Surveys',             desc: 'Resident, family, and staff satisfaction surveys with response analytics' },
  { icon: Users,          label: 'Staff Management',    desc: 'Staff profiles, shift scheduling, department assignments, certification tracking' },
  { icon: GraduationCap,  label: 'Education & In-Services', desc: 'In-service sessions, QR check-in, CE hours, required training and makeups' },
  { icon: Clock,          label: 'Time Clock',          desc: 'GPS-verified clock in/out, geofence enforcement, payroll hour summaries' },
  { icon: Monitor,        label: 'IT & Technology',     desc: 'Support ticket system, device asset inventory, warranty tracking' },
  { icon: Megaphone,      label: 'Marketing & Leads',   desc: 'Lead tracking, email campaigns, and landing pages for move-ins' },
  { icon: Wallet,         label: 'Budgets',             desc: 'Monthly department budgets, food cost per resident day, pace alerts, over-budget approvals', addon: true },
  { icon: UserRound,      label: 'Family & Resident Portals', desc: 'Family messaging, resident updates, visit scheduling, and a resident portal for menus and ride requests' },
]

const BAA_NOTE = 'Nursing, Social Services, and Incident Reports hold health records, so they turn on after we sign a Business Associate Agreement (BAA) with your community.'

const PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    period: 'forever',
    desc: 'Get started at no cost — everything you need to run the basics.',
    badge: null,
    features: [
      'Up to 50 residents & 10 staff',
      'Resident Directory',
      'Staff Management & Staff Directory',
      'Communication (announcements & signage)',
      'Family Messaging',
      'Community support',
    ],
    note: 'SMS messaging requires Essential or higher.',
    cta: 'Start Free',
    ctaLink: '/signup?plan=starter',
    highlight: false,
  },
  {
    name: 'Essential',
    price: '$299',
    period: '/mo',
    desc: 'The full platform — every module — for communities up to 100 residents.',
    badge: null,
    features: [
      'Up to 100 residents & 40 staff',
      'Every module, including SMS messaging',
      'Nursing, Incidents & Social Services (with a signed BAA)',
      'Activities, Chapel & Dietary',
      'Maintenance, Housekeeping & Scheduling',
      'Security, Transportation & Central Supply',
      'Marketing, Surveys & Property Management',
      'Time Clock, IT, Meters & Resident Portal',
      'AI and Budgets add-ons available',
      'Priority email support',
    ],
    note: null,
    cta: 'Get Started',
    ctaLink: '/signup?plan=essential',
    highlight: false,
  },
  {
    name: 'Plus',
    price: '$599',
    period: '/mo',
    desc: 'The full platform for growing communities up to 200 residents.',
    badge: null,
    features: [
      'Everything in Essential',
      'Up to 200 residents & 75 staff',
      'Priority email support',
    ],
    note: null,
    cta: 'Get Started',
    ctaLink: '/signup?plan=plus',
    highlight: false,
  },
  {
    name: 'Professional',
    price: '$999',
    period: '/mo',
    desc: 'The full platform with no limits — add-ons included.',
    badge: 'Everything included',
    features: [
      'Everything in Plus',
      'Unlimited residents & staff',
      'AI and Budgets add-ons included',
      'Every new module we build — included',
      'Dedicated onboarding & phone support',
    ],
    note: null,
    cta: 'Get Started',
    ctaLink: '/signup?plan=professional',
    highlight: true,
  },
]

const DEMO_ACCOUNTS = [
  { role: 'Administrator', email: 'demo.ceo@elderloop.xyz',          desc: 'Nursing Home Administrator — Administrator Dashboard, KPIs, all modules', featured: true },
  { role: 'Manager',      email: 'demo.manager@elderloop.xyz',      desc: 'Maintenance Director — department queue, PM schedules, assets, vendor costs', featured: true },
  { role: 'Family',       email: 'demo.family@elderloop.xyz',       desc: 'Family portal — updates and messaging for Eleanor Hartmann', featured: true },
  { role: 'Corporate',    email: 'demo.corporate@elderloop.xyz',    desc: 'Multi-community executive — portfolio KPIs across communities (counts only), chain-wide announcements' },
  { role: 'Org Admin',    email: 'demo.admin@elderloop.xyz',        desc: 'Full platform admin — users, modules, settings, all data' },
  { role: 'Dietary Manager', email: 'demo.dietarymanager@elderloop.xyz', desc: 'Dietary Manager — menus, ordering, food cost per resident day, Dietary budget' },
  { role: 'Supply Manager', email: 'demo.supplymanager@elderloop.xyz', desc: 'Central Supply Manager — inventory, purchase orders, resident charges and billing leakage' },
  { role: 'Supervisor',   email: 'demo.supervisor@elderloop.xyz',   desc: 'Shift supervisor — staff management, approvals, operational view' },
  { role: 'Social Worker', email: 'demo.socialworker@elderloop.xyz', desc: 'Social Services — psychosocial profiles, case notes, care plans, grievances' },
  { role: 'Nursing',      email: 'demo.nursing@elderloop.xyz',      desc: 'LPN view — care notes, vitals, medications, nursing documentation' },
  { role: 'Maintenance',  email: 'demo.maintenance@elderloop.xyz',  desc: 'Maintenance tech — work orders, assets, PM schedules' },
  { role: 'Dietary',      email: 'demo.dietary@elderloop.xyz',      desc: 'Dietary aide — resident profiles, cycle menus, meal service' },
  { role: 'Housekeeping', email: 'demo.housekeeping@elderloop.xyz', desc: 'Housekeeping aide — room inspections, schedules, checklists' },
  { role: 'Staff',        email: 'demo.staff@elderloop.xyz',        desc: 'General CNA — floor staff view with assigned module access' },
  { role: 'Resident',     email: 'demo.resident@elderloop.xyz',     desc: 'Resident portal — activities, announcements, dining info' },
]

const SECURITY = [
  { icon: Lock,      title: 'Two-factor sign-in',             desc: 'Require an authenticator app for administrators and for the nursing, social services, and dietary teams.' },
  { icon: Eye,       title: 'Every health-record view logged', desc: 'See who opened which resident\'s records and when, in a report your administrators can review.' },
  { icon: BellRing,  title: 'Unusual-access alerts',          desc: 'Get alerted when someone opens many residents\' records at once, after hours, or after their last day.' },
  { icon: KeyRound,  title: 'Access by job role',             desc: 'Each person sees only what their job needs. Family and resident logins see only their own resident.' },
  { icon: Timer,     title: 'Automatic sign-out',             desc: 'Idle sessions sign out on their own, so a shared nurses\' station computer doesn\'t stay open.' },
  { icon: FileCheck, title: 'BAA before health records',      desc: 'Nursing, Social Services, and Incident Reports stay off until we sign a BAA with your community.' },
]

// Founding community facts, shared with Brian Miller for approval before publishing
const FOUNDING = { name: 'Maranatha Village', place: 'Springfield, MO', since: 'November 2026', workOrders: '44,000+', historyFrom: '2016' }

export default function LandingPage() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [allRoles, setAllRoles] = useState(false)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])

  const demoAccounts = allRoles ? DEMO_ACCOUNTS : DEMO_ACCOUNTS.filter(a => a.featured)
  const navItems = ['Features', 'Demo', 'Security', 'Pricing', 'About']

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Source Sans 3", system-ui, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400&family=Source+Sans+3:wght@300;400;500;600&display=swap" rel="stylesheet" />

      {/* ── Nav ── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/96 backdrop-blur shadow-sm border-b border-slate-100' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img src="/icon-192.png" alt="ElderLoop" className="w-full h-full object-cover" />
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
            {navItems.map(item => (
              <a key={item} href={`#${item.toLowerCase()}`}
                className={`text-sm font-medium transition-colors hover:text-brand-500 ${scrolled ? 'text-slate-600' : 'text-white/80'}`}>
                {item}
              </a>
            ))}
            <button onClick={() => navigate('/training')}
              className={`text-sm font-medium transition-colors hover:text-brand-500 ${scrolled ? 'text-slate-600' : 'text-white/80'}`}>
              Training
            </button>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => navigate('/login')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${scrolled ? 'text-slate-600 hover:text-brand-600' : 'text-white/80 hover:text-white'}`}>
              Sign In
            </button>
            <button onClick={() => navigate('/early-access')}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
              Request a Demo
            </button>
          </div>
          <button onClick={() => setMenuOpen(o => !o)} className={`md:hidden ${scrolled ? 'text-slate-700' : 'text-white'}`}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-6 py-5 space-y-3 shadow-lg">
            {navItems.map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMenuOpen(false)}
                className="block text-slate-700 font-medium py-1.5 text-sm">{item}</a>
            ))}
            <button onClick={() => { setMenuOpen(false); navigate('/training') }}
              className="block text-slate-700 font-medium py-1.5 text-sm">Training</button>
            <div className="flex flex-col gap-2 mt-2">
              <button onClick={() => navigate('/early-access')}
                className="w-full py-3 bg-brand-600 text-white font-semibold rounded-xl text-sm">
                Request a Demo
              </button>
              <button onClick={() => navigate('/login')}
                className="w-full py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm">
                Sign In
              </button>
            </div>
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
            Live at {FOUNDING.name} in Springfield, Missouri
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
            <a href="#demo"
              className="group flex items-center justify-center gap-2 px-8 py-4 bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded-2xl transition-all shadow-xl shadow-brand-900/40 text-base">
              Try the Live Demo
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <button onClick={() => navigate('/early-access')}
              className="flex items-center justify-center gap-2 px-8 py-4 text-white/80 hover:text-white font-medium rounded-2xl border border-white/20 hover:border-white/40 transition-all text-base">
              Request a Demo
            </button>
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
            Live at {FOUNDING.name} since {FOUNDING.since}
          </div>
          <h3 style={{ fontFamily: '"Playfair Display", serif' }}
            className="text-slate-800 text-2xl font-semibold mb-3">
            Built with operators, for operators
          </h3>
          <p className="text-slate-500 text-base max-w-xl mx-auto leading-relaxed">
            ElderLoop grew out of 12 years of hands-on work across dietary, maintenance, housekeeping,
            central supply, IT, and administration in a Missouri senior living community.
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
              {MODULES.length} modules, fully integrated. Turn on only what you need, add more as you grow.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {MODULES.map(m => {
              const Icon = m.icon
              return (
                <div key={m.label}
                  className="group p-6 rounded-2xl border border-slate-100 hover:border-brand-200 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-10 h-10 bg-brand-50 group-hover:bg-brand-100 rounded-xl flex items-center justify-center transition-colors">
                      <Icon size={18} className="text-brand-600" />
                    </div>
                    {m.baa && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap">
                        Needs signed BAA
                      </span>
                    )}
                    {m.addon && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap">
                        Add-on
                      </span>
                    )}
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
          <p className="text-slate-400 text-xs mb-10 max-w-3xl">
            {BAA_NOTE} Budgets is an add-on on Essential and Plus and included with Professional.
          </p>

          {/* Why communities switch */}
          <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 to-brand-950 p-8 md:p-10">
            <div className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-4">Why communities switch</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: Layers,
                  title: 'One login instead of four',
                  desc: 'Maintenance, dietary menus, activities, the in-house TV channel, and more share one system and one staff list. Nothing gets typed twice.',
                },
                {
                  icon: History,
                  title: 'Your history comes with you',
                  desc: `${FOUNDING.name} brought over ${FOUNDING.workOrders} work orders going back to ${FOUNDING.historyFrom}, so their maintenance team kept the history they rely on.`,
                },
                {
                  icon: ClipboardList,
                  title: 'Ready when the surveyor walks in',
                  desc: 'In-service hours and makeups, audit-ready housekeeping inspections, and PM records in one place. With a signed BAA, incidents get state-report countdown clocks and grievances track Missouri response deadlines.',
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
            <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-white/40 text-sm">14-day free trial. No contract required. Cancel any time.</p>
              <button onClick={() => navigate('/login?email=demo.ceo@elderloop.xyz&demo=1')}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded-xl transition-colors text-sm whitespace-nowrap">
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
              Live demo accounts — pick a role to sign in instantly. No setup required.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {demoAccounts.map(account => (
              <div key={account.role}
                className="bg-white rounded-2xl border border-slate-100 p-5 hover:border-brand-200 hover:shadow-md transition-all flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-brand-600 uppercase tracking-wide bg-brand-50 px-2.5 py-1 rounded-full">
                    {account.role}
                  </span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed flex-1">{account.desc}</p>
                <button
                  onClick={() => navigate(`/login?email=${encodeURIComponent(account.email)}&demo=1`)}
                  className="mt-4 w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
                  <span>Log In as {account.role}</span>
                  <span className="text-brand-200">→</span>
                </button>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <button onClick={() => setAllRoles(v => !v)}
              className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              {allRoles ? 'Show fewer roles' : `Show all ${DEMO_ACCOUNTS.length} roles`}
            </button>
          </div>
        </div>
      </section>

      {/* ── Security ── */}
      <section id="security" className="py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700 }}
              className="text-slate-900 mb-4">
              Built to protect resident information
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              The safeguards your compliance officer will ask about are built in, not bolted on.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SECURITY.map(s => {
              const Icon = s.icon
              return (
                <div key={s.title} className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50">
                  <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center mb-4">
                    <Icon size={18} className="text-brand-600" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1.5" style={{ fontFamily: '"Playfair Display", serif', fontSize: '1rem' }}>
                    {s.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-28 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700 }}
              className="text-slate-900 mb-4">
              Transparent pricing
            </h2>
            <p className="text-slate-500 text-lg">No setup fees. No contracts. Start free and grow when you're ready.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {PLANS.map(plan => (
              <div key={plan.name}
                className={`rounded-3xl p-8 flex flex-col ${plan.highlight
                  ? 'bg-brand-950 ring-4 ring-brand-500/30 shadow-2xl shadow-brand-900/30'
                  : 'bg-white border border-slate-200'}`}>
                {plan.badge && (
                  <div className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-3">{plan.badge}</div>
                )}
                <h3 style={{ fontFamily: '"Playfair Display", serif' }}
                  className={`text-xl font-bold mb-2 ${plan.highlight ? 'text-white' : 'text-slate-800'}`}>
                  {plan.name}
                </h3>
                <div className="flex items-end gap-1.5 mb-2">
                  <span style={{ fontFamily: '"Playfair Display", serif' }}
                    className={`text-4xl font-bold ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>
                    {plan.price}
                  </span>
                  {plan.period && <span className={`text-sm mb-1.5 ${plan.highlight ? 'text-white/50' : 'text-slate-400'}`}>{plan.period}</span>}
                </div>
                <p className={`text-sm mb-6 ${plan.highlight ? 'text-white/60' : 'text-slate-500'}`}>{plan.desc}</p>
                <div className="flex-1 space-y-3 mb-4">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-start gap-2.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${plan.highlight ? 'bg-brand-500' : 'bg-brand-100'}`}>
                        <Check size={11} className={plan.highlight ? 'text-white' : 'text-brand-600'} />
                      </div>
                      <span className={`text-sm ${plan.highlight ? 'text-white/75' : 'text-slate-600'}`}>{f}</span>
                    </div>
                  ))}
                </div>
                {plan.note && (
                  <p className={`text-xs mb-6 italic ${plan.highlight ? 'text-white/40' : 'text-slate-400'}`}>{plan.note}</p>
                )}
                {!plan.note && <div className="mb-6" />}
                <button onClick={() => navigate(plan.ctaLink)}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${plan.highlight
                    ? 'bg-brand-500 hover:bg-brand-400 text-white shadow-lg shadow-brand-900/30'
                    : plan.price === 'Free'
                      ? 'bg-white border-2 border-slate-200 hover:border-brand-400 text-slate-800 hover:text-brand-700'
                      : 'bg-slate-900 hover:bg-slate-700 text-white'}`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
          <div className="text-center text-slate-400 text-sm mt-8 space-y-1.5 max-w-3xl mx-auto">
            <p>Starter is free forever — no credit card required. Essential, Plus, and Professional plans billed monthly, cancel any time.</p>
            <p>Groups with 3 or more communities get 15% off every community's plan.</p>
            <p>{BAA_NOTE}</p>
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="py-28 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-4">Our Story</div>
              <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 700 }}
                className="text-slate-900 mb-6">
                Built by someone who's worked every department
              </h2>
              <p className="text-slate-600 leading-relaxed mb-5">
                ElderLoop was created by Robert Heisler, who spent 12 years working in dietary, maintenance,
                housekeeping, central supply, IT, and administration at a senior living community in
                Springfield, Missouri.
              </p>
              <p className="text-slate-600 leading-relaxed mb-5">
                The frustration of juggling four different software subscriptions — none of which talked
                to each other — was the catalyst. ElderLoop is the platform we always wished existed:
                purpose-built for senior living, priced so smaller communities can finally afford it.
              </p>
              <p className="text-slate-600 leading-relaxed">
                {FOUNDING.name}, our founding community in Springfield, first asked for a replacement
                for their in-house TV channel. That request became something much bigger.
              </p>
            </div>
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Building2 size={22} className="text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">{FOUNDING.name}</div>
                    <div className="text-xs text-slate-400">Founding Community · {FOUNDING.place} · Live since {FOUNDING.since}</div>
                  </div>
                </div>
                <div className="flex justify-around text-center">
                  {[
                    { v: FOUNDING.workOrders, l: 'Work orders brought over' },
                    { v: FOUNDING.historyFrom, l: 'History goes back to' },
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
                  { icon: Mail,  text: 'info@loopwaresolutions.com', href: 'mailto:info@loopwaresolutions.com' },
                  { icon: MapPin,text: 'Springfield, Missouri' },
                ].map(c => {
                  const Icon = c.icon
                  return (
                    <div key={c.text} className="flex items-center gap-2.5 text-sm text-slate-600">
                      <Icon size={14} className="text-brand-500 flex-shrink-0" />
                      {c.href ? <a href={c.href} className="hover:text-brand-600">{c.text}</a> : c.text}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Demo request CTA ── */}
      <section className="py-24 bg-brand-950">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 text-white/60 text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Now onboarding new communities
          </div>
          <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 700 }}
            className="text-white mb-6">
            Ready to modernize<br />
            <em style={{ color: '#36aaf5', fontStyle: 'italic' }}>your community?</em>
          </h2>
          <p className="text-white/65 text-lg mb-10 max-w-xl mx-auto">
            Join {FOUNDING.name} in Springfield. We'll set up your community with you, help bring over
            your work-order history, and train your staff.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/early-access')}
              className="group flex items-center gap-2 px-8 py-4 bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded-2xl text-base transition-all shadow-xl shadow-brand-900/50">
              Request a Demo <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <a href="mailto:info@loopwaresolutions.com"
              className="px-8 py-4 text-white/75 hover:text-white font-medium rounded-2xl border border-white/20 hover:border-white/40 transition-all text-base">
              info@loopwaresolutions.com
            </a>
          </div>

          {/* Social proof strip */}
          <div className="mt-14 pt-10 border-t border-white/10 grid grid-cols-3 gap-8 text-center">
            {[
              { value: '12+', label: 'Years working in senior living' },
              { value: FOUNDING.workOrders, label: `Work orders moved for ${FOUNDING.name}` },
              { value: String(MODULES.length), label: 'Modules on one platform' },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="text-3xl font-bold text-white mb-1" style={{ fontFamily: '"Playfair Display", serif' }}>{value}</div>
                <div className="text-white/40 text-xs">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-950 py-10 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center overflow-hidden">
              <img src="/icon-192.png" alt="ElderLoop" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-white font-semibold leading-none" style={{ fontFamily: '"Playfair Display", serif' }}>ElderLoop</span>
              <span className="text-slate-500 text-xs leading-none mt-0.5">by Loopware Solutions</span>
            </div>
          </div>
          <p className="text-slate-600 text-xs">© {new Date().getFullYear()} Loopware Solutions LLC · Springfield, Missouri</p>
          <div className="flex gap-6 flex-wrap justify-center">
            <button onClick={() => navigate('/login')} className="text-slate-500 hover:text-white text-sm transition-colors">Sign In</button>
            <button onClick={() => navigate('/early-access')} className="text-slate-500 hover:text-white text-sm transition-colors">Request a Demo</button>
            <a href="mailto:info@loopwaresolutions.com" className="text-slate-500 hover:text-white text-sm transition-colors">Contact</a>
            <a href="#pricing" className="text-slate-500 hover:text-white text-sm transition-colors">Pricing</a>
            <button onClick={() => navigate('/training')} className="text-slate-500 hover:text-white text-sm transition-colors">Training</button>
            <button onClick={() => navigate('/terms')} className="text-slate-500 hover:text-white text-sm transition-colors">Terms</button>
            <button onClick={() => navigate('/privacy')} className="text-slate-500 hover:text-white text-sm transition-colors">Privacy</button>
          </div>
        </div>
      </footer>
    </div>
  )
}
