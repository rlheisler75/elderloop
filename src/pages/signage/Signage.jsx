import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Cake, Star, Calendar, CloudSun, Church,
  UtensilsCrossed, Bell, Megaphone, Wifi, WifiOff,
  Clock as ClockIcon, MapPin, ChevronLeft, ChevronRight,
  Heart, Sun, Utensils
} from 'lucide-react'

const SLIDE_DURATION  = 9000   // ms per slide
const TRANSITION_MS   = 500

const CATEGORIES = {
  general:            { label: 'Announcement',       icon: Megaphone,       bg: 'from-slate-900 to-slate-800',   accent: '#36aaf5' },
  birthday:           { label: 'Happy Birthday!',    icon: Cake,            bg: 'from-pink-950 to-pink-900',     accent: '#f472b6' },
  resident_spotlight: { label: 'Resident Spotlight', icon: Star,            bg: 'from-amber-950 to-amber-900',   accent: '#fbbf24' },
  event:              { label: 'Upcoming Event',      icon: Calendar,        bg: 'from-blue-950 to-blue-900',     accent: '#60a5fa' },
  weather:            { label: 'Weather',             icon: CloudSun,        bg: 'from-sky-950 to-sky-900',       accent: '#38bdf8' },
  chapel:             { label: 'Chapel',              icon: Church,          bg: 'from-purple-950 to-purple-900', accent: '#a78bfa' },
  menu:               { label: "Today's Menu",        icon: UtensilsCrossed, bg: 'from-green-950 to-green-900',   accent: '#4ade80' },
  alert:              { label: 'Important Notice',    icon: Bell,            bg: 'from-red-950 to-red-900',       accent: '#f87171' },
}
const getCat = (key) => CATEGORIES[key] || CATEGORIES.general

const fmtTime = (t) => {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h), ampm = hr >= 12 ? 'PM' : 'AM', h12 = hr % 12 || 12
  return `${h12}:${m} ${ampm}`
}

// ── Live Clock ─────────────────────────────────────────────────
function LiveClock({ large }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])
  return (
    <div className="text-right select-none">
      <div className={`font-light tracking-widest text-white ${large ? 'text-5xl' : 'text-2xl'}`}>
        {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className={`text-white/50 mt-0.5 ${large ? 'text-base' : 'text-xs'}`}>
        {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      </div>
    </div>
  )
}

// ── Progress Bar ───────────────────────────────────────────────
function ProgressBar({ duration, active, accent }) {
  const [w, setW] = useState(0)
  useEffect(() => {
    if (!active) { setW(0); return }
    setW(0)
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setW(100)))
    return () => cancelAnimationFrame(raf)
  }, [active, duration])
  return (
    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
      <div className="h-full rounded-full"
        style={{ width: `${w}%`, background: accent, transition: active ? `width ${duration}ms linear` : 'none', opacity: 0.7 }} />
    </div>
  )
}

// ── Dot Nav ────────────────────────────────────────────────────
function DotNav({ total, current, setCurrent, accent }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <button key={i} onClick={() => setCurrent(i)} className="rounded-full transition-all"
          style={{ width: i === current ? 28 : 8, height: 8,
            background: i === current ? accent : 'rgba(255,255,255,0.2)' }} />
      ))}
    </div>
  )
}

// ── "Today at a Glance" slide — activities + time ─────────────
function TodaySlide({ activities, orgName, orgLogo, visible }) {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const todayActs = activities
    .filter(a => a.start_date === todayStr)
    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))

  return (
    <div className="fixed inset-0 overflow-hidden select-none flex flex-col"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        opacity: visible ? 1 : 0, transition: `opacity ${TRANSITION_MS}ms ease`
      }}>
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: '#818cf8', filter: 'blur(120px)', opacity: 0.08, transform: 'translate(30%,-30%)' }} />
      <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: '#38bdf8', filter: 'blur(100px)', opacity: 0.07, transform: 'translate(-30%,30%)' }} />

      {/* Header */}
      <div className="flex items-center justify-between px-12 pt-8 relative z-10">
        <div className="flex items-center gap-4">
          {orgLogo
            ? <img src={orgLogo} alt={orgName} className="h-10 object-contain" />
            : <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white font-bold">{orgName[0]}</div>
          }
          <div>
            <div className="text-white font-semibold text-lg" style={{ fontFamily: '"Playfair Display", serif' }}>{orgName}</div>
            <div className="text-white/40 text-xs tracking-widest uppercase">Today's Schedule</div>
          </div>
        </div>
        <LiveClock large />
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center px-12 gap-12 relative z-10">
        {/* Left: Big time + greeting */}
        <div className="w-1/3 flex flex-col justify-center">
          <div className="mb-6">
            {now.getHours() < 12
              ? <><Sun size={40} className="text-amber-300 mb-3" /><div className="text-amber-300 text-xl font-medium">Good Morning!</div></>
              : now.getHours() < 17
              ? <><Heart size={40} className="text-rose-300 mb-3" /><div className="text-rose-300 text-xl font-medium">Good Afternoon!</div></>
              : <><ClockIcon size={40} className="text-indigo-300 mb-3" /><div className="text-indigo-300 text-xl font-medium">Good Evening!</div></>
            }
          </div>
          <div className="text-white/80 text-base leading-relaxed" style={{ fontFamily: '"Playfair Display", serif' }}>
            {todayActs.length > 0
              ? `${todayActs.length} activit${todayActs.length > 1 ? 'ies' : 'y'} planned for today`
              : 'No activities scheduled for today'}
          </div>
        </div>

        {/* Right: Activity list */}
        <div className="flex-1">
          {todayActs.length === 0 ? (
            <div className="text-white/30 text-xl text-center py-12">Check back tomorrow for activities</div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-hidden">
              {todayActs.slice(0, 6).map((act, i) => (
                <div key={act.id}
                  className="flex items-center gap-4 p-4 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="w-2 h-10 rounded-full flex-shrink-0"
                    style={{ background: act.color || '#818cf8' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-lg truncate" style={{ fontFamily: '"Playfair Display", serif' }}>
                      {act.title}
                    </div>
                    <div className="flex items-center gap-3 text-white/50 text-sm mt-0.5">
                      {act.start_time && <span className="flex items-center gap-1"><ClockIcon size={12} />{fmtTime(act.start_time)}{act.end_time ? ` – ${fmtTime(act.end_time)}` : ''}</span>}
                      {act.location && <span className="flex items-center gap-1"><MapPin size={12} />{act.location}</span>}
                    </div>
                  </div>
                </div>
              ))}
              {todayActs.length > 6 && (
                <div className="text-white/30 text-sm text-center">+ {todayActs.length - 6} more activities</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-12 pb-6 relative z-10">
        <div className="text-center text-white/20 text-xs tracking-widest uppercase">Powered by ElderLoop</div>
      </div>
    </div>
  )
}

// ── Menu slide ─────────────────────────────────────────────────
function MenuSlide({ menu, orgName, orgLogo, visible }) {
  const accent = '#4ade80'
  return (
    <div className="fixed inset-0 overflow-hidden select-none flex flex-col"
      style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 50%, #052e16 100%)',
        opacity: visible ? 1 : 0, transition: `opacity ${TRANSITION_MS}ms ease` }}>
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: '#4ade80', filter: 'blur(120px)', opacity: 0.07, transform: 'translate(30%,-30%)' }} />

      {/* Header */}
      <div className="flex items-center justify-between px-12 pt-8 relative z-10">
        <div className="flex items-center gap-4">
          {orgLogo
            ? <img src={orgLogo} alt={orgName} className="h-10 object-contain" />
            : <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white font-bold">{orgName[0]}</div>
          }
          <div>
            <div className="text-white font-semibold text-lg" style={{ fontFamily: '"Playfair Display", serif' }}>{orgName}</div>
            <div className="flex items-center gap-2 text-green-400 text-xs tracking-widest uppercase">
              <Utensils size={12} /> Today's Dining
            </div>
          </div>
        </div>
        <LiveClock large />
      </div>

      {/* Meal columns */}
      <div className="flex-1 flex items-stretch gap-4 px-12 pb-8 pt-4 relative z-10">
        {menu.map(meal => (
          <div key={meal.period} className="flex-1 flex flex-col rounded-3xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(74,222,128,0.15)' }}>
            <div className="px-6 py-4 border-b border-white/10">
              <div className="text-green-400 font-semibold text-base tracking-widest uppercase">{meal.period}</div>
              {meal.time && <div className="text-white/40 text-xs mt-0.5">{meal.time}</div>}
            </div>
            <div className="flex-1 px-6 py-4 space-y-3 overflow-hidden">
              {meal.courses.map((course, i) => (
                <div key={i}>
                  <div className="text-white/40 text-xs uppercase tracking-wide">{course.course_name}</div>
                  <div className="text-white font-medium text-base mt-0.5" style={{ fontFamily: '"Playfair Display", serif' }}>
                    {course.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Announcement slide ─────────────────────────────────────────
function AnnouncementSlide({ slide, orgName, orgLogo, visible, accent }) {
  const cat  = getCat(slide.category)
  const Icon = cat.icon
  const bg   = slide.bg_custom ? { background: slide.bg_custom } : null

  return (
    <div className={`fixed inset-0 flex flex-col overflow-hidden select-none ${!bg ? `bg-gradient-to-br ${cat.bg}` : ''}`}
      style={{ opacity: visible ? 1 : 0, transition: `opacity ${TRANSITION_MS}ms ease`, ...(bg || {}) }}>
      {/* Blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: accent, filter: 'blur(100px)', opacity: 0.1, transform: 'translate(30%,-30%)' }} />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: accent, filter: 'blur(80px)', opacity: 0.08, transform: 'translate(-30%,30%)' }} />

      {/* Header */}
      <div className="flex items-center justify-between px-12 pt-8 relative z-10">
        <div className="flex items-center gap-4">
          {orgLogo
            ? <img src={orgLogo} alt={orgName} className="h-10 object-contain" />
            : <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white font-bold"
                style={{ fontFamily: '"Playfair Display", serif' }}>{orgName[0]}</div>
          }
          <div className="text-white/30 text-xs tracking-widest uppercase font-sans">{orgName}</div>
        </div>
        <LiveClock large />
      </div>

      {/* Content */}
      {slide.image_url ? (
        <div className="flex-1 flex items-center px-12 gap-14 relative z-10">
          <div className="flex-shrink-0 w-2/5 h-3/4 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10">
            <img src={slide.image_url} alt={slide.title} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: accent + '22', border: `2px solid ${accent}44` }}>
                <Icon size={24} style={{ color: accent }} />
              </div>
              <div className="text-base tracking-widest uppercase font-sans font-medium" style={{ color: accent }}>{cat.label}</div>
            </div>
            <h1 className="text-white font-bold leading-tight mb-6"
              style={{ fontFamily: '"Playfair Display", serif',
                fontSize: slide.title.length > 40 ? '2.75rem' : slide.title.length > 25 ? '3.5rem' : '4.5rem' }}>
              {slide.title}
            </h1>
            {slide.body && <p className="text-white/70 text-xl leading-relaxed font-sans font-light">{slide.body}</p>}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-16 relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: accent + '22', border: `2px solid ${accent}44` }}>
              <Icon size={32} style={{ color: accent }} />
            </div>
            <div className="text-xl tracking-widest uppercase font-sans font-medium" style={{ color: accent }}>{cat.label}</div>
          </div>
          <h1 className="text-white text-center font-bold leading-tight mb-8"
            style={{ fontFamily: '"Playfair Display", serif',
              fontSize: slide.title.length > 40 ? '3.5rem' : slide.title.length > 25 ? '4.5rem' : '6rem' }}>
            {slide.title}
          </h1>
          {slide.body && (
            <p className="text-white/70 text-center text-2xl leading-relaxed max-w-4xl font-sans font-light">
              {slide.body}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Signage ───────────────────────────────────────────────
export default function Signage() {
  const [org, setOrg]                   = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [activities, setActivities]     = useState([])
  const [todayMenu, setTodayMenu]       = useState([])
  const [slides, setSlides]             = useState([])
  const [current, setCurrent]           = useState(0)
  const [visible, setVisible]           = useState(true)
  const [online, setOnline]             = useState(navigator.onLine)
  const [screenSize, setScreenSize]     = useState('tv')
  const timerRef = useRef(null)

  // Screen size
  useEffect(() => {
    const check = () => setScreenSize(window.innerWidth < 1024 ? 'tablet' : 'tv')
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Network
  useEffect(() => {
    window.addEventListener('online',  () => setOnline(true))
    window.addEventListener('offline', () => setOnline(false))
    return () => {}
  }, [])

  // Fetch org by slug
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get('org') || 'sunrise-gardens'
    supabase.from('organizations').select('id,name,slug,logo_url')
      .eq('slug', slug).single()
      .then(({ data }) => { if (data) setOrg(data) })
  }, [])

  // Fetch all data when org loaded
  useEffect(() => {
    if (!org) return
    fetchAll()
    // Realtime subscription
    const ch = supabase.channel('signage-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, fetchAll)
      .subscribe()
    const interval = setInterval(fetchAll, 5 * 60 * 1000)
    return () => { supabase.removeChannel(ch); clearInterval(interval) }
  }, [org])

  const fetchAll = useCallback(async () => {
    if (!org) return
    const now = new Date().toISOString()
    const todayStr = new Date().toISOString().split('T')[0]

    const [annRes, actRes, menuRes] = await Promise.all([
      supabase.from('announcements').select('*')
        .eq('organization_id', org.id).eq('is_active', true)
        .lte('starts_at', now)
        .or(`expires_at.is.null,expires_at.gte.${now}`)
        .order('pinned', { ascending: false }).order('created_at', { ascending: false }),

      supabase.from('activities').select('*')
        .eq('organization_id', org.id).eq('is_active', true)
        .eq('show_on_signage', true),

      // Get today's meal from cycle menu
      supabase.from('cycle_menus').select(`
        id, start_date, cycle_length,
        cycle_menu_days(id, week_number, day_of_week,
          cycle_menu_meals(id, meal_period,
            meal_courses(course_name, sort_order,
              menu_items(name))))
      `).eq('organization_id', org.id).eq('is_active', true).single()
    ])

    setAnnouncements(annRes.data || [])
    setActivities(actRes.data || [])

    // Calculate which day of the cycle we're on
    if (menuRes.data) {
      const menu  = menuRes.data
      const start = new Date(menu.start_date + 'T12:00:00')
      const today = new Date(todayStr + 'T12:00:00')
      const dayDiff  = Math.floor((today - start) / (1000 * 60 * 60 * 24))
      const cycleDays = menu.cycle_length * 7
      const dayInCycle = ((dayDiff % cycleDays) + cycleDays) % cycleDays
      const weekNum  = Math.floor(dayInCycle / 7) + 1
      const dayOfWeek = (today.getDay() + 1) // 1=Sun … 7=Sat

      const dayEntry = menu.cycle_menu_days?.find(
        d => d.week_number === weekNum && d.day_of_week === dayOfWeek
      )

      if (dayEntry) {
        const PERIODS = [
          { key: 'breakfast', label: 'Breakfast', time: '7:30 – 9:00 AM' },
          { key: 'lunch',     label: 'Lunch',     time: '11:30 AM – 1:00 PM' },
          { key: 'dinner',    label: 'Dinner',    time: '5:00 – 6:30 PM' },
        ]
        const mealSlides = PERIODS.map(p => {
          const meal = dayEntry.cycle_menu_meals?.find(m => m.meal_period === p.key)
          const courses = (meal?.meal_courses || [])
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(c => ({ course_name: c.course_name, name: c.menu_items?.name }))
            .filter(c => c.name)
          return { period: p.label, time: p.time, courses }
        }).filter(m => m.courses.length > 0)
        setTodayMenu(mealSlides)
      }
    }
  }, [org])

  // Build slide deck: today + announcements + menu (if populated)
  useEffect(() => {
    const deck = [
      { type: 'today' },
      ...announcements.slice(0, 8).map(a => ({ type: 'announcement', data: a })),
      ...(todayMenu.length > 0 ? [{ type: 'menu' }] : []),
    ]
    setSlides(deck)
    setCurrent(0)
  }, [announcements, todayMenu, activities])

  // Auto-advance
  useEffect(() => {
    if (slides.length <= 1) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setVisible(false)
      setTimeout(() => { setCurrent(c => (c + 1) % slides.length); setVisible(true) }, TRANSITION_MS)
    }, SLIDE_DURATION)
    return () => clearTimeout(timerRef.current)
  }, [current, slides])

  const goTo = (i) => {
    clearTimeout(timerRef.current)
    setVisible(false)
    setTimeout(() => { setCurrent(i); setVisible(true) }, TRANSITION_MS)
  }

  const slide = slides[current]
  const curAnnouncement = slide?.type === 'announcement' ? slide.data : null
  const accent = curAnnouncement ? getCat(curAnnouncement.category).accent : '#818cf8'
  const orgName = org?.name || 'ElderLoop'
  const orgLogo = org?.logo_url || null

  if (!org || slides.length === 0) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center gap-4"
        style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
        <div className="text-white/10 text-8xl">📺</div>
        <div className="text-white/40 text-3xl font-light">{orgName}</div>
        <div className="text-white/20 text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-slate-950 overflow-hidden">
      {/* Slides */}
      {slide?.type === 'today' && (
        <TodaySlide activities={activities} orgName={orgName} orgLogo={orgLogo} visible={visible} />
      )}
      {slide?.type === 'announcement' && (
        <AnnouncementSlide slide={slide.data} orgName={orgName} orgLogo={orgLogo} visible={visible} accent={accent} />
      )}
      {slide?.type === 'menu' && (
        <MenuSlide menu={todayMenu} orgName={orgName} orgLogo={orgLogo} visible={visible} />
      )}

      {/* Global footer overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-50 px-12 pb-6 pointer-events-none">
        <ProgressBar duration={SLIDE_DURATION} active={visible} accent={accent} />
        <div className="flex items-center justify-between mt-3 pointer-events-auto">
          <div className="flex items-center gap-2">
            {online
              ? <Wifi size={13} className="text-white/20" />
              : <WifiOff size={13} className="text-red-400" />
            }
            {!online && <span className="text-red-400 text-xs">Offline</span>}
          </div>
          <DotNav total={slides.length} current={current} setCurrent={goTo} accent={accent} />
          <div className="text-white/20 text-xs font-sans">{current + 1} / {slides.length}</div>
        </div>
      </div>
    </div>
  )
}
