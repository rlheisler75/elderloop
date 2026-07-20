import { Link } from 'react-router-dom'
import { HeartHandshake, ArrowRight, UtensilsCrossed, Stethoscope, Wrench, SprayCan, CalendarDays, Church, Megaphone, MessageSquare, Car, Building2 } from 'lucide-react'

const GUIDES = [
  {
    to: '/training/social-services',
    icon: HeartHandshake,
    title: 'Social Services',
    desc: 'Social profiles, mood & behavior tracking, case notes, grievances, care conferences, discharge planning, and the community resource directory.',
    tag: '8 sections',
  },
  {
    to: '/training/dietary',
    icon: UtensilsCrossed,
    title: 'Dietary',
    desc: 'Resident dietary profiles, meal ticket printing, cycle menu building, Cook’s Count, and the menu items catalog behind automatic substitutions.',
    tag: '7 sections',
  },
  {
    to: '/training/nursing',
    icon: Stethoscope,
    title: 'Nursing Notes',
    desc: 'Resident vitals with automatic BP classification, scheduled and PRN medications, and shift-by-shift care notes with supervisor flagging.',
    tag: '4 sections',
  },
  {
    to: '/training/maintenance',
    icon: Wrench,
    title: 'Maintenance',
    desc: 'Work orders with SLA tracking, the asset registry, preventive maintenance schedules, and Life Safety compliance with a one-click surveyor report.',
    tag: '5 sections',
  },
  {
    to: '/training/housekeeping',
    icon: SprayCan,
    title: 'Housekeeping',
    desc: 'LTC room and common-area inspection checklists, plus booking, completing, and billing independent living cleaning requests.',
    tag: '2 sections',
  },
  {
    to: '/training/activities',
    icon: CalendarDays,
    title: 'Activities',
    desc: 'Building the activity calendar, setting up recurring classes, the Upcoming list view, and printing a monthly schedule.',
    tag: '4 sections',
  },
  {
    to: '/training/chapel',
    icon: Church,
    title: 'Chapel',
    desc: 'The Chaplain Portal — scheduling services, streaming them live to YouTube, and keeping a record of attendance and recordings.',
    tag: '4 sections',
  },
  {
    to: '/training/marketing',
    icon: Megaphone,
    title: 'Marketing',
    desc: 'The lead pipeline, activity logging, campaign budget and goal tracking, and referral source management.',
    tag: '5 sections',
  },
  {
    to: '/training/communication',
    icon: MessageSquare,
    title: 'Communication',
    desc: 'The announcements board and Digital Signage, plus broadcast messaging over push, email, and SMS to residents, family, and staff.',
    tag: '4 sections',
  },
  {
    to: '/training/transportation',
    icon: Car,
    title: 'Transportation',
    desc: 'Medical transport scheduling by month or day, the trip log for actual times and mileage, and printing a daily driver trip sheet.',
    tag: '5 sections',
  },
  {
    to: '/training/property-management',
    icon: Building2,
    title: 'Property Management',
    desc: 'Independent living units, tenants, leases and the rent ledger, key tracking, move-in/move-out walkthroughs, and legal notices.',
    tag: '6 sections',
  },
]

export default function TrainingHub() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-brand-950 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center overflow-hidden">
              <img src="/icon-192.png" alt="ElderLoop" className="w-full h-full object-cover" />
            </div>
            <span className="text-white font-semibold" style={{ fontFamily: '"Playfair Display", serif' }}>ElderLoop</span>
          </Link>
          <Link to="/" className="text-brand-300 hover:text-white text-sm transition-colors">← Back to home</Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-14">
        <div className="text-xs font-semibold tracking-widest uppercase text-brand-600 mb-3">Staff Training</div>
        <h1 className="font-display font-bold text-slate-900 text-4xl mb-4">Training Library</h1>
        <p className="text-slate-500 text-lg max-w-2xl mb-10">
          Practical, step-by-step guides to every module in ElderLoop — written for the people who use it every shift, not the people who built it.
        </p>

        <div className="grid gap-4">
          {GUIDES.map(g => {
            const Icon = g.icon
            return (
              <Link key={g.to} to={g.to}
                className="group flex items-center gap-5 bg-white border border-slate-200 rounded-2xl p-6 hover:border-brand-300 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <Icon size={22} className="text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-display font-bold text-slate-900 text-lg">{g.title}</h2>
                    <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{g.tag}</span>
                  </div>
                  <p className="text-slate-500 text-sm">{g.desc}</p>
                </div>
                <ArrowRight size={18} className="text-slate-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </Link>
            )
          })}
        </div>

        <p className="text-slate-400 text-sm mt-12">
          More module guides are on the way. Have a request? <a href="mailto:info@loopwaresolutions.com" className="text-brand-600 hover:underline">Let us know</a>.
        </p>
      </div>
    </div>
  )
}
