import { useAuth } from '../../context/AuthContext'
import { Wrench, MessageSquare, UtensilsCrossed, SprayCan, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const moduleCards = [
  { key: 'communication', label: 'Communication',  icon: MessageSquare,   path: '/communication', color: 'bg-blue-50 text-blue-600 border-blue-100',   desc: 'Announcements, chapel schedule, digital signage' },
  { key: 'work_orders',   label: 'Work Orders',    icon: Wrench,          path: '/work-orders',   color: 'bg-amber-50 text-amber-600 border-amber-100', desc: 'Maintenance requests, inspections, scheduling' },
  { key: 'dietary',       label: 'Dietary',        icon: UtensilsCrossed, path: '/dietary',       color: 'bg-green-50 text-green-600 border-green-100', desc: 'Meal plans, dietary restrictions, allergies' },
  { key: 'housekeeping',  label: 'Housekeeping',   icon: SprayCan,        path: '/housekeeping',  color: 'bg-purple-50 text-purple-600 border-purple-100', desc: 'Room schedules, task tracking, inspections' },
]

export default function Dashboard() {
  const { profile, organization, hasModule } = useAuth()
  const navigate = useNavigate()

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-slate-800">
          {greeting()}, {profile?.first_name ?? 'there'} 👋
        </h1>
        <p className="text-slate-500 mt-1">{organization?.name} &mdash; {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {moduleCards.filter(m => hasModule(m.key)).map(({ key, label, icon: Icon, path, color, desc }) => (
          <button
            key={key}
            onClick={() => navigate(path)}
            className="group text-left p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-200 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-xl border ${color}`}>
                <Icon size={22} />
              </div>
              <ArrowRight size={18} className="text-slate-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all mt-1" />
            </div>
            <div className="mt-4">
              <div className="font-display font-semibold text-slate-800 text-lg">{label}</div>
              <div className="text-slate-500 text-sm mt-1">{desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Coming soon placeholder */}
      {moduleCards.filter(m => hasModule(m.key)).length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="font-display text-xl">No modules enabled yet.</p>
          <p className="text-sm mt-2">Contact your administrator to get started.</p>
        </div>
      )}
    </div>
  )
}
