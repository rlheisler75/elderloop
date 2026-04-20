import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Wrench, MessageSquare, UtensilsCrossed, SprayCan,
  Settings, LogOut, Menu, X, ChevronRight, Megaphone, Home, Church,
  CalendarDays, BookUser, Car, Gauge, Shield, UserCheck, CalendarCheck,
  Stethoscope, HeartHandshake, ClipboardList, AlertTriangle, Clock,
  Monitor, TrendingUp
} from 'lucide-react'
import { useState } from 'react'

const ALL_NAV = [
  { to: '/dashboard',           label: 'Dashboard',        icon: LayoutDashboard, module: null },
  { to: '/communication',       label: 'Communication',    icon: MessageSquare,   module: 'communication' },
  { to: '/chapel',              label: 'Chapel',           icon: Church,          module: 'chapel' },
  { to: '/activities',          label: 'Activities',       icon: CalendarDays,    module: 'activities' },
  { to: '/directory',           label: 'Residents',        icon: BookUser,        module: 'directory' },
  { to: '/maintenance',         label: 'Maintenance',      icon: Wrench,          module: 'work_orders' },
  { to: '/dietary',             label: 'Dietary',          icon: UtensilsCrossed, module: 'dietary' },
  { to: '/housekeeping',        label: 'Housekeeping',     icon: SprayCan,        module: 'housekeeping' },
  { to: '/transportation',      label: 'Transportation',   icon: Car,             module: 'transportation' },
  { to: '/meters',              label: 'Meter Readings',   icon: Gauge,           module: 'meters' },
  { to: '/security',            label: 'Security',         icon: Shield,          module: 'security' },
  { to: '/staff',               label: 'Staff',            icon: UserCheck,       module: 'staff' },
  { to: '/directory-staff',     label: 'Staff Directory',  icon: BookUser,        module: 'staff' },
  { to: '/scheduling',          label: 'Scheduling',       icon: CalendarCheck,   module: 'staff' },
  { to: '/nursing',             label: 'Nursing Notes',    icon: Stethoscope,     module: 'nursing' },
  { to: '/family',              label: 'Family Messaging', icon: HeartHandshake,  module: 'family' },
  { to: '/surveys',             label: 'Surveys',          icon: ClipboardList,   module: 'surveys' },
  { to: '/incidents',           label: 'Incident Reports', icon: AlertTriangle,   module: 'incidents' },
  { to: '/timeclock',           label: 'Time Clock',       icon: Clock,           module: 'timeclock' },
  { to: '/it',                  label: 'IT & Technology',  icon: Monitor,         module: 'it' },
  { to: '/marketing',           label: 'Marketing',        icon: Megaphone,       module: 'marketing' },
  { to: '/property-management', label: 'Property Mgmt',    icon: Home,            module: 'property_management' },
]

export default function Layout() {
  const { profile, organization, hasModule, isOrgAdmin, isSuperAdmin, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const handleSignOut = async () => { await signOut(); navigate('/login') }

  const visibleNav = ALL_NAV.filter(item => !item.module || hasModule(item.module))

  return (
    <div className="flex h-screen bg-slate-50">
      {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-brand-950 flex flex-col transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-brand-800">
          <div className="flex items-center gap-3 min-w-0">
            {organization?.logo_url ? (
              <img src={organization.logo_url} alt={organization.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-brand-700 flex items-center justify-center flex-shrink-0 font-display text-white font-bold text-sm">
                {organization?.name?.[0] ?? 'E'}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-display text-sm font-semibold text-white truncate">{organization?.name ?? 'ElderLoop'}</div>
              <div className="text-brand-400 text-xs mt-0.5 truncate">Powered by ElderLoop</div>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-brand-400 hover:text-white ml-2"><X size={18} /></button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleNav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${isActive ? 'bg-brand-700 text-white' : 'text-brand-300 hover:bg-brand-800 hover:text-white'}`}>
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              <ChevronRight size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-brand-800 space-y-0.5">
          {profile?.role === 'ceo' && (
            <NavLink to="/ceo"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-purple-700 text-white' : 'text-purple-400 hover:bg-purple-900/50 hover:text-white'}`}>
              <TrendingUp size={18} /><span>Executive Dashboard</span>
            </NavLink>
          )}

          {isOrgAdmin() && (
            <NavLink to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-brand-700 text-white' : 'text-brand-300 hover:bg-brand-800 hover:text-white'}`}>
              <Settings size={18} /><span>Admin</span>
            </NavLink>
          )}

          {isSuperAdmin() && (
            <NavLink to="/superadmin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-purple-700 text-white' : 'text-purple-400 hover:bg-purple-900/50 hover:text-white'}`}>
              <Shield size={18} /><span>Super Admin</span>
            </NavLink>
          )}

          <div className="flex items-center gap-3 px-3 py-2.5 mt-1">
            <div className="w-7 h-7 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {profile?.first_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate">{profile?.first_name} {profile?.last_name}</div>
              <div className="text-brand-400 text-xs capitalize">{profile?.role?.replace('_', ' ')}</div>
            </div>
            <button onClick={handleSignOut} className="text-brand-400 hover:text-red-400 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-500 hover:text-slate-700"><Menu size={22} /></button>
          <span className="font-display font-semibold text-brand-800">ElderLoop</span>
        </div>
        <main className="flex-1 overflow-y-auto p-6"><Outlet /></main>
      </div>
    </div>
  )
}
