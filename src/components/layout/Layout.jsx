import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Wrench, MessageSquare, UtensilsCrossed, SprayCan,
  Settings, LogOut, Menu, X, ChevronRight, Megaphone, Home, Church,
  CalendarDays, BookUser, Car, Gauge, Shield, UserCheck, CalendarCheck,
  Stethoscope, HeartHandshake, ClipboardList, AlertTriangle, Clock,
  Monitor, TrendingUp
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { ShoppingBag } from 'lucide-react'

const ALL_NAV = [
  { to: '/app/dashboard',           label: 'Dashboard',        icon: LayoutDashboard, module: null },
  { to: '/app/communication',       label: 'Communication',    icon: MessageSquare,   module: 'communication' },
  { to: '/app/chapel',              label: 'Chapel',           icon: Church,          module: 'chapel' },
  { to: '/app/activities',          label: 'Activities',       icon: CalendarDays,    module: 'activities' },
  { to: '/app/directory',           label: 'Residents',        icon: BookUser,        module: 'directory' },
  { to: '/app/maintenance',         label: 'Maintenance',      icon: Wrench,          module: 'work_orders' },
  { to: '/app/dietary',             label: 'Dietary',          icon: UtensilsCrossed, module: 'dietary' },
  { to: '/app/housekeeping',        label: 'Housekeeping',     icon: SprayCan,        module: 'housekeeping' },
  { to: '/app/transportation',      label: 'Transportation',   icon: Car,             module: 'transportation' },
  { to: '/app/meters',              label: 'Meter Readings',   icon: Gauge,           module: 'meters' },
  { to: '/app/security',            label: 'Security',         icon: Shield,          module: 'security' },
  { to: '/app/staff',               label: 'Staff',            icon: UserCheck,       module: 'staff' },
  { to: '/app/directory-staff',     label: 'Staff Directory',  icon: BookUser,        module: 'staff' },
  { to: '/app/scheduling',          label: 'Scheduling',       icon: CalendarCheck,   module: 'staff' },
  { to: '/app/nursing',             label: 'Nursing Notes',    icon: Stethoscope,     module: 'nursing' },
  { to: '/app/family',              label: 'Family Messaging', icon: HeartHandshake,  module: 'family' },
  { to: '/app/surveys',             label: 'Surveys',          icon: ClipboardList,   module: 'surveys' },
  { to: '/app/incidents',           label: 'Incident Reports', icon: AlertTriangle,   module: 'incidents' },
  { to: '/app/timeclock',           label: 'Time Clock',       icon: Clock,           module: 'timeclock' },
  { to: '/app/it',                  label: 'IT & Technology',  icon: Monitor,         module: 'it' },
  { to: '/app/marketing',           label: 'Marketing',        icon: Megaphone,       module: 'marketing' },
  { to: '/app/property-management', label: 'Property Mgmt',    icon: Home,            module: 'property_management' },
  { to: '/app/central-supply',          label: 'Central Supply',   icon: ShoppingBag,     module: 'central_supply' },
]

export default function Layout() {
  const { profile, organization, hasModule, isOrgAdmin, isSuperAdmin, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifs, setNotifs]       = useState([])
  const [showNotifs, setShowNotifs] = useState(false)
  const notifRef = useRef(null)

  const unread = notifs.filter(n => !n.is_read).length

  useEffect(() => {
    if (profile?.id) fetchNotifs()
    const interval = setInterval(() => { if (profile?.id) fetchNotifs() }, 30000)
    return () => clearInterval(interval)
  }, [profile?.id])

  useEffect(() => {
    const handleClick = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function fetchNotifs() {
    const { supabase } = await import('../../lib/supabase')
    const { data } = await supabase.from('push_notifications')
      .select('*, broadcast_messages(subject, body, category, created_at)')
      .eq('recipient_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifs(data || [])
  }

  async function markAllRead() {
    const { supabase } = await import('../../lib/supabase')
    const unreadIds = notifs.filter(n => !n.is_read).map(n => n.id)
    if (!unreadIds.length) return
    await supabase.from('push_notifications').update({ is_read: true }).in('id', unreadIds)
    setNotifs(ns => ns.map(n => ({ ...n, is_read: true })))
  }

  const handleOpenNotifs = () => {
    setShowNotifs(v => !v)
    if (!showNotifs) markAllRead()
  }
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
            <NavLink to="/app/ceo"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-purple-700 text-white' : 'text-purple-400 hover:bg-purple-900/50 hover:text-white'}`}>
              <TrendingUp size={18} /><span>Executive Dashboard</span>
            </NavLink>
          )}

          {isOrgAdmin && (
            <NavLink to="/app/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-brand-700 text-white' : 'text-brand-300 hover:bg-brand-800 hover:text-white'}`}>
              <Settings size={18} /><span>Admin</span>
            </NavLink>
          )}

          {isSuperAdmin && (
            <NavLink to="/app/superadmin"
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
          <span className="font-display font-semibold text-brand-800 flex-1">ElderLoop</span>
          <div ref={notifRef} className="relative lg:hidden">
            <button onClick={handleOpenNotifs} className="relative p-2 text-slate-400 hover:text-slate-700 rounded-lg">
              <Bell size={18} />
              {unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
            </button>
            {showNotifs && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <span className="font-semibold text-slate-800 text-sm">Notifications</span>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                  {notifs.length === 0 ? (
                    <div className="px-4 py-8 text-center text-slate-400 text-sm">No notifications yet</div>
                  ) : notifs.map(n => {
                    const msg = n.broadcast_messages
                    return (
                      <div key={n.id} className={`px-4 py-3 ${n.is_read ? '' : 'bg-brand-50'}`}>
                        <p className="text-sm font-medium text-slate-800 truncate">{n.title || msg?.subject}</p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body || msg?.body}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Desktop top bar */}
        <div className="hidden lg:flex items-center justify-end px-6 py-3 bg-white border-b border-slate-100">
          <div ref={notifRef} className="relative">
            <button onClick={handleOpenNotifs}
              className="relative p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            {showNotifs && (
              <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <span className="font-semibold text-slate-800 text-sm">Notifications</span>
                  {unread === 0 && <span className="text-xs text-slate-400">All caught up</span>}
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
                  {notifs.length === 0 ? (
                    <div className="px-4 py-8 text-center text-slate-400 text-sm">No notifications yet</div>
                  ) : notifs.map(n => {
                    const msg = n.broadcast_messages
                    const ago = (() => {
                      const d = new Date(n.created_at)
                      const diff = Math.floor((Date.now() - d) / 60000)
                      if (diff < 1) return 'Just now'
                      if (diff < 60) return `${diff}m ago`
                      if (diff < 1440) return `${Math.floor(diff/60)}h ago`
                      return `${Math.floor(diff/1440)}d ago`
                    })()
                    return (
                      <div key={n.id} className={`px-4 py-3 ${n.is_read ? '' : 'bg-brand-50'}`}>
                        <div className="flex items-start gap-2">
                          {!n.is_read && <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{n.title || msg?.subject}</p>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body || msg?.body}</p>
                            <p className="text-xs text-slate-400 mt-1">{ago}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        <main className="flex-1 overflow-y-auto p-6"><Outlet /></main>
      </div>
    </div>
  )
}
