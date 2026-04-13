import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Cake, Star, Calendar, CloudSun, Church,
  UtensilsCrossed, Bell, Megaphone, Wifi, WifiOff,
  ChevronLeft, ChevronRight
} from 'lucide-react'

const SLIDE_DURATION = 8000
const TRANSITION_MS  = 600

const CATEGORIES = {
  general:            { label: 'Announcement',       icon: Megaphone,       bg: 'from-brand-900 to-brand-700',   accent: '#36aaf5' },
  birthday:           { label: 'Happy Birthday!',    icon: Cake,            bg: 'from-pink-900 to-pink-700',     accent: '#f472b6' },
  resident_spotlight: { label: 'Resident Spotlight', icon: Star,            bg: 'from-yellow-900 to-amber-700',  accent: '#fbbf24' },
  event:              { label: 'Upcoming Event',      icon: Calendar,        bg: 'from-blue-900 to-blue-700',     accent: '#60a5fa' },
  weather:            { label: 'Weather',             icon: CloudSun,        bg: 'from-sky-900 to-sky-700',       accent: '#38bdf8' },
  chapel:             { label: 'Chapel',              icon: Church,          bg: 'from-purple-900 to-purple-700', accent: '#a78bfa' },
  menu:               { label: "Today's Menu",        icon: UtensilsCrossed, bg: 'from-green-900 to-green-700',   accent: '#4ade80' },
  alert:              { label: 'Important Notice',    icon: Bell,            bg: 'from-red-900 to-red-700',       accent: '#f87171' },
}

const getCat = (key) => CATEGORIES[key] || CATEGORIES.general

// ── Clock ──────────────────────────────────────────────────────
function Clock({ small }) {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className={small ? 'text-right' : 'text-right'}>
      <div className={`font-light tracking-widest text-white ${small ? 'text-xl' : 'text-4xl'}`}>
        {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className={`text-white/60 mt-0.5 ${small ? 'text-xs' : 'text-sm'}`}>
        {time.toLocaleDateString('en-US', { weekday: small ? 'short' : 'long', month: 'long', day: 'numeric', year: small ? undefined : 'numeric' })}
      </div>
    </div>
  )
}

// ── Progress Bar ───────────────────────────────────────────────
function ProgressBar({ duration, active }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!active) { setWidth(0); return }
    setWidth(0)
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setWidth(100)))
    return () => cancelAnimationFrame(raf)
  }, [active, duration])
  return (
    <div className="h-1 bg-white/20 rounded-full overflow-hidden">
      <div className="h-full bg-white/70 rounded-full"
        style={{ width: `${width}%`, transition: active ? `width ${duration}ms linear` : 'none' }} />
    </div>
  )
}

// ── TV / Desktop Full Screen Slide ─────────────────────────────
function TVSlide({ slide, announcements, current, setCurrent, visible, online }) {
  const cat   = getCat(slide.category)
  const Icon  = cat.icon
  const accent = cat.accent
  const hasPhoto = !!slide.image_url
  const bgStyle = slide.bg_custom ? { background: slide.bg_custom } : null

  const goTo = (i) => setCurrent(i)

  return (
    <div
      className={`fixed inset-0 flex flex-col overflow-hidden select-none ${!slide.bg_custom ? `bg-gradient-to-br ${cat.bg}` : ''}`}
      style={{ fontFamily: '"Playfair Display", Georgia, serif', opacity: visible ? 1 : 0, transition: `opacity ${TRANSITION_MS}ms ease`, ...(bgStyle || {}) }}>

      {!hasPhoto && (
        <>
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 pointer-events-none"
            style={{ background: accent, filter: 'blur(80px)', transform: 'translate(30%,-30%)' }} />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10 pointer-events-none"
            style={{ background: accent, filter: 'blur(60px)', transform: 'translate(-30%,30%)' }} />
        </>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-12 pt-8 relative z-10">
        <div>
          <div className="text-white/40 text-sm tracking-widest uppercase font-sans">ElderLoop</div>
        </div>
        <Clock />
      </div>

      {/* Content */}
      {hasPhoto ? (
        <div className="flex-1 flex items-center px-12 gap-12 relative z-10">
          <div className="flex-shrink-0 w-2/5 h-3/4 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20">
            <img src={slide.image_url} alt={slide.title} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: accent + '33', border: `2px solid ${accent}55` }}>
                <Icon size={24} style={{ color: accent }} />
              </div>
              <div className="text-base tracking-widest uppercase font-sans font-medium" style={{ color: accent }}>{cat.label}</div>
            </div>
            <h1 className="text-white font-bold leading-tight mb-5"
              style={{ fontSize: slide.title.length > 40 ? '3rem' : slide.title.length > 25 ? '4rem' : '5rem' }}>
              {slide.title}
            </h1>
            {slide.body && <p className="text-white/70 text-xl leading-relaxed font-sans font-light">{slide.body}</p>}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-16 relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: accent + '33', border: `2px solid ${accent}55` }}>
              <Icon size={28} style={{ color: accent }} />
            </div>
            <div className="text-lg tracking-widest uppercase font-sans font-medium" style={{ color: accent }}>{cat.label}</div>
          </div>
          <h1 className="text-white text-center font-bold leading-tight mb-6"
            style={{ fontSize: slide.title.length > 40 ? '3.5rem' : slide.title.length > 25 ? '4.5rem' : '5.5rem' }}>
            {slide.title}
          </h1>
          {slide.body && <p className="text-white/70 text-center text-2xl leading-relaxed max-w-4xl font-sans font-light">{slide.body}</p>}
        </div>
      )}

      {/* Footer */}
      <div className="px-12 pb-8 relative z-10">
        <ProgressBar duration={SLIDE_DURATION} active={visible} />
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            {online ? <Wifi size={14} className="text-white/30" /> : <WifiOff size={14} className="text-red-400" />}
            <span className="text-white/20 text-xs font-sans">Live</span>
          </div>
          <div className="flex items-center gap-2">
            {announcements.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} className="rounded-full transition-all"
                style={{ width: i === current ? 24 : 8, height: 8, background: i === current ? accent : 'rgba(255,255,255,0.25)' }} />
            ))}
          </div>
          <div className="text-white/20 text-xs font-sans">{current + 1} / {announcements.length}</div>
        </div>
      </div>
    </div>
  )
}

// ── Mobile Card Feed ──────────────────────────────────────────
function MobileFeed({ announcements, orgName, online }) {
  return (
    <div className="min-h-screen bg-slate-900" style={{ fontFamily: '"Source Sans 3", system-ui, sans-serif' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-white font-semibold text-sm" style={{ fontFamily: '"Playfair Display", serif' }}>ElderLoop</div>
          <div className="text-white/40 text-xs">{orgName}</div>
        </div>
        <div className="flex items-center gap-2">
          {online ? <Wifi size={13} className="text-white/30" /> : <WifiOff size={13} className="text-red-400" />}
          <div className="text-right">
            <MobileClock />
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="px-3 py-3 space-y-3 max-w-md mx-auto">
        {announcements.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            <Megaphone size={28} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">No announcements at this time</p>
          </div>
        ) : (
          announcements.map((item) => {
            const cat    = getCat(item.category)
            const Icon   = cat.icon
            const accent = cat.accent
            const bgStyle = item.bg_custom ? { background: item.bg_custom } : null

            return (
              <div key={item.id}
                className={`rounded-2xl overflow-hidden shadow-lg ${!item.bg_custom ? `bg-gradient-to-br ${cat.bg}` : ''}`}
                style={bgStyle || {}}>

                {/* Side-by-side layout if photo */}
                {item.image_url ? (
                  <div className="flex">
                    <img src={item.image_url} alt={item.title}
                      className="w-28 flex-shrink-0 object-cover" style={{ minHeight: 120 }} />
                    <div className="flex-1 p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Icon size={12} style={{ color: accent }} />
                        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: accent, fontFamily: 'system-ui' }}>
                          {cat.label}
                        </span>
                      </div>
                      <h2 className="text-white font-bold leading-snug text-base mb-1"
                        style={{ fontFamily: '"Playfair Display", serif' }}>
                        {item.title}
                      </h2>
                      {item.body && (
                        <p className="text-white/65 text-xs leading-relaxed line-clamp-3" style={{ fontFamily: 'system-ui' }}>
                          {item.body}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: accent + '33' }}>
                        <Icon size={13} style={{ color: accent }} />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: accent, fontFamily: 'system-ui' }}>
                        {cat.label}
                      </span>
                      {item.pinned && <span className="ml-auto text-xs text-white/30">📌</span>}
                    </div>
                    <h2 className="text-white font-bold leading-snug text-lg mb-1.5"
                      style={{ fontFamily: '"Playfair Display", serif' }}>
                      {item.title}
                    </h2>
                    {item.body && (
                      <p className="text-white/65 text-sm leading-relaxed" style={{ fontFamily: 'system-ui' }}>{item.body}</p>
                    )}
                  </div>
                )}

                {/* Footer strip */}
                <div className="px-4 py-2 flex items-center justify-between border-t border-white/10">
                  <span className="text-white/30 text-xs" style={{ fontFamily: 'system-ui' }}>
                    {new Date(item.starts_at || item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  {item.expires_at && (
                    <span className="text-white/30 text-xs" style={{ fontFamily: 'system-ui' }}>
                      Until {new Date(item.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
      <div className="text-center py-5 text-white/15 text-xs" style={{ fontFamily: 'system-ui' }}>
        ElderLoop · Updates automatically
      </div>
    </div>
  )
}

// Compact clock for mobile header
function MobileClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="text-right">
      <div className="text-white text-sm font-medium">
        {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="text-white/40 text-xs">
        {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
      </div>
    </div>
  )
}

// ── Tablet Slideshow (medium screens) ─────────────────────────
function TabletSlide({ slide, announcements, current, setCurrent, visible, online }) {
  const cat    = getCat(slide.category)
  const Icon   = cat.icon
  const accent = cat.accent
  const bgStyle = slide.bg_custom ? { background: slide.bg_custom } : null

  return (
    <div
      className={`fixed inset-0 flex flex-col overflow-hidden select-none ${!slide.bg_custom ? `bg-gradient-to-br ${cat.bg}` : ''}`}
      style={{ fontFamily: '"Playfair Display", Georgia, serif', opacity: visible ? 1 : 0, transition: `opacity ${TRANSITION_MS}ms ease`, ...(bgStyle || {}) }}>

      {/* Decorative blob */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
        style={{ background: accent, filter: 'blur(60px)', transform: 'translate(30%,-30%)' }} />

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 relative z-10">
        <div className="text-white/40 text-xs tracking-widest uppercase font-sans">ElderLoop</div>
        <Clock small />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10 gap-4">
        {slide.image_url && (
          <div className="w-full max-w-xs h-44 rounded-2xl overflow-hidden shadow-xl border-2 border-white/20">
            <img src={slide.image_url} alt={slide.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: accent + '33', border: `2px solid ${accent}55` }}>
            <Icon size={18} style={{ color: accent }} />
          </div>
          <span className="text-sm tracking-widest uppercase font-sans font-medium" style={{ color: accent }}>{cat.label}</span>
        </div>
        <h1 className="text-white text-center font-bold leading-tight"
          style={{ fontSize: slide.title.length > 30 ? '2rem' : '2.75rem' }}>
          {slide.title}
        </h1>
        {slide.body && (
          <p className="text-white/70 text-center text-base leading-relaxed max-w-sm font-sans font-light">{slide.body}</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 pb-5 relative z-10">
        <ProgressBar duration={SLIDE_DURATION} active={visible} />
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5">
            {online ? <Wifi size={12} className="text-white/30" /> : <WifiOff size={12} className="text-red-400" />}
          </div>
          <div className="flex items-center gap-1.5">
            {announcements.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} className="rounded-full transition-all"
                style={{ width: i === current ? 18 : 6, height: 6, background: i === current ? accent : 'rgba(255,255,255,0.25)' }} />
            ))}
          </div>
          <div className="text-white/20 text-xs font-sans">{current + 1}/{announcements.length}</div>
        </div>
      </div>
    </div>
  )
}

// ── Main Signage Component ─────────────────────────────────────
export default function Signage() {
  const [announcements, setAnnouncements] = useState([])
  const [orgName, setOrgName]             = useState('ElderLoop')
  const [current, setCurrent]             = useState(0)
  const [visible, setVisible]             = useState(true)
  const [online, setOnline]               = useState(navigator.onLine)
  const [slug, setSlug]                   = useState(null)
  const [screenSize, setScreenSize]       = useState('tv') // 'mobile' | 'tablet' | 'tv'
  const timerRef = useRef(null)

  // Detect screen size — use 768px as mobile/tablet split, 1200px as tablet/tv
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth
      if (w < 768)   setScreenSize('mobile')
      else if (w < 1200) setScreenSize('tablet')
      else setScreenSize('tv')
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setSlug(params.get('org') || 'maranatha-village')
    window.addEventListener('online',  () => setOnline(true))
    window.addEventListener('offline', () => setOnline(false))
  }, [])

  useEffect(() => {
    if (!slug) return
    supabase.from('organizations').select('name').eq('slug', slug).single()
      .then(({ data }) => { if (data) setOrgName(data.name) })
  }, [slug])

  useEffect(() => {
    if (!slug) return
    fetchAnnouncements()
    const channel = supabase.channel('signage')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, fetchAnnouncements)
      .subscribe()
    const refresh = setInterval(fetchAnnouncements, 5 * 60 * 1000)
    return () => { supabase.removeChannel(channel); clearInterval(refresh) }
  }, [slug])

  async function fetchAnnouncements() {
    if (!slug) return
    const { data: org } = await supabase.from('organizations').select('id').eq('slug', slug).single()
    if (!org) return
    const now = new Date().toISOString()
    const { data } = await supabase.from('announcements').select('*')
      .eq('organization_id', org.id).eq('is_active', true)
      .lte('starts_at', now)
      .or(`expires_at.is.null,expires_at.gte.${now}`)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
    setAnnouncements(data || [])
    setCurrent(0)
  }

  // Auto-advance for slideshow modes
  useEffect(() => {
    if (screenSize === 'mobile' || announcements.length <= 1) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setVisible(false)
      setTimeout(() => { setCurrent(c => (c + 1) % announcements.length); setVisible(true) }, TRANSITION_MS)
    }, SLIDE_DURATION)
    return () => clearTimeout(timerRef.current)
  }, [current, announcements, screenSize])

  const slide = announcements[current]

  // Mobile — scrollable feed
  if (screenSize === 'mobile') {
    return <MobileFeed announcements={announcements} orgName={orgName} online={online} />
  }

  // No slides state
  if (!slide) {
    return (
      <div className="fixed inset-0 bg-brand-950 flex flex-col items-center justify-center gap-4"
        style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
        <div className="text-white/20 text-6xl">📺</div>
        <div className="text-white/40 text-2xl font-light">{orgName}</div>
        <div className="text-white/20 text-base">No announcements at this time</div>
      </div>
    )
  }

  // Tablet — smaller slideshow
  if (screenSize === 'tablet') {
    return <TabletSlide slide={slide} announcements={announcements} current={current}
      setCurrent={setCurrent} visible={visible} online={online} />
  }

  // TV / Desktop — full screen
  return <TVSlide slide={slide} announcements={announcements} current={current}
    setCurrent={setCurrent} visible={visible} online={online} />
}
