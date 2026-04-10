import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Cake, Star, Calendar, CloudSun, Church,
  UtensilsCrossed, Bell, Megaphone, Wifi, WifiOff
} from 'lucide-react'

// How long each slide shows (ms)
const SLIDE_DURATION = 8000
// How long the transition takes (ms)
const TRANSITION_MS  = 800

const CATEGORIES = {
  general:            { label: 'Announcement',      icon: Megaphone,       bg: 'from-brand-900 to-brand-700',       accent: '#36aaf5' },
  birthday:           { label: 'Happy Birthday!',   icon: Cake,            bg: 'from-pink-900 to-pink-700',         accent: '#f472b6' },
  resident_spotlight: { label: 'Resident Spotlight',icon: Star,            bg: 'from-yellow-900 to-amber-700',      accent: '#fbbf24' },
  event:              { label: 'Upcoming Event',     icon: Calendar,        bg: 'from-blue-900 to-blue-700',         accent: '#60a5fa' },
  weather:            { label: 'Weather',            icon: CloudSun,        bg: 'from-sky-900 to-sky-700',           accent: '#38bdf8' },
  chapel:             { label: 'Chapel',             icon: Church,          bg: 'from-purple-900 to-purple-700',     accent: '#a78bfa' },
  menu:               { label: "Today's Menu",       icon: UtensilsCrossed, bg: 'from-green-900 to-green-700',       accent: '#4ade80' },
  alert:              { label: 'Important Notice',   icon: Bell,            bg: 'from-red-900 to-red-700',           accent: '#f87171' },
}

const getCat = (key) => CATEGORIES[key] || CATEGORIES.general

function Clock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="text-right">
      <div className="text-4xl font-light tracking-widest text-white">
        {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="text-sm text-white/60 mt-1">
        {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      </div>
    </div>
  )
}

function ProgressBar({ duration, active }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!active) { setWidth(0); return }
    setWidth(0)
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setWidth(100))
    })
    return () => cancelAnimationFrame(raf)
  }, [active, duration])

  return (
    <div className="h-1 bg-white/20 rounded-full overflow-hidden">
      <div
        className="h-full bg-white/70 rounded-full"
        style={{ width: `${width}%`, transition: active ? `width ${duration}ms linear` : 'none' }}
      />
    </div>
  )
}

export default function Signage() {
  const [announcements, setAnnouncements] = useState([])
  const [orgName, setOrgName]             = useState('ElderLoop')
  const [current, setCurrent]             = useState(0)
  const [visible, setVisible]             = useState(true)
  const [online, setOnline]               = useState(navigator.onLine)
  const [slug, setSlug]                   = useState(null)
  const timerRef = useRef(null)

  // Get org slug from URL: /signage?org=maranatha-village
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const s = params.get('org') || 'maranatha-village'
    setSlug(s)
  }, [])

  useEffect(() => {
    window.addEventListener('online',  () => setOnline(true))
    window.addEventListener('offline', () => setOnline(false))
  }, [])

  // Fetch org info
  useEffect(() => {
    if (!slug) return
    supabase.from('organizations').select('name').eq('slug', slug).single()
      .then(({ data }) => { if (data) setOrgName(data.name) })
  }, [slug])

  // Fetch announcements & subscribe to realtime
  useEffect(() => {
    if (!slug) return
    fetchAnnouncements()

    const channel = supabase
      .channel('signage-announcements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        fetchAnnouncements()
      })
      .subscribe()

    // Refresh every 5 minutes as backup
    const refresh = setInterval(fetchAnnouncements, 5 * 60 * 1000)
    return () => { supabase.removeChannel(channel); clearInterval(refresh) }
  }, [slug])

  async function fetchAnnouncements() {
    if (!slug) return
    const { data: org } = await supabase.from('organizations').select('id').eq('slug', slug).single()
    if (!org) return
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .eq('organization_id', org.id)
      .eq('is_active', true)
      .lte('starts_at', now)
      .or(`expires_at.is.null,expires_at.gte.${now}`)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
    setAnnouncements(data || [])
    setCurrent(0)
  }

  // Auto-advance slides
  useEffect(() => {
    if (announcements.length <= 1) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setVisible(false)
      setTimeout(() => {
        setCurrent(c => (c + 1) % announcements.length)
        setVisible(true)
      }, TRANSITION_MS)
    }, SLIDE_DURATION)
    return () => clearTimeout(timerRef.current)
  }, [current, announcements])

  const slide = announcements[current]
  const cat   = slide ? getCat(slide.category) : null
  const Icon  = cat?.icon || Megaphone

  // No announcements state
  if (!slide) {
    return (
      <div className="fixed inset-0 bg-brand-950 flex flex-col items-center justify-center" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
        <div className="text-white/20 text-6xl mb-6">📺</div>
        <div className="text-white/40 text-2xl font-light">{orgName}</div>
        <div className="text-white/20 text-lg mt-2">No announcements at this time</div>
        <Clock />
      </div>
    )
  }

  return (
    <div
      className={`fixed inset-0 bg-gradient-to-br ${cat.bg} flex flex-col overflow-hidden select-none`}
      style={{ fontFamily: '"Playfair Display", Georgia, serif', transition: `opacity ${TRANSITION_MS}ms ease`, opacity: visible ? 1 : 0 }}
    >
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: cat.accent, filter: 'blur(80px)', transform: 'translate(30%, -30%)' }} />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10" style={{ background: cat.accent, filter: 'blur(60px)', transform: 'translate(-30%, 30%)' }} />

      {/* Header bar */}
      <div className="flex items-center justify-between px-12 pt-8 pb-0 relative z-10">
        <div>
          <div className="text-white/40 text-sm tracking-widest uppercase font-sans">{orgName}</div>
          <div className="text-white text-2xl font-semibold mt-0.5">ElderLoop</div>
        </div>
        <Clock />
      </div>

      {/* Main slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-16 relative z-10">
        {/* Category badge */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: cat.accent + '33', border: `2px solid ${cat.accent}55` }}>
            <Icon size={28} style={{ color: cat.accent }} />
          </div>
          <div className="text-lg tracking-widest uppercase font-sans font-medium" style={{ color: cat.accent }}>
            {cat.label}
          </div>
        </div>

        {/* Title */}
        <h1 className="text-white text-center font-bold leading-tight mb-6"
          style={{ fontSize: slide.title.length > 40 ? '3.5rem' : slide.title.length > 25 ? '4.5rem' : '5.5rem' }}>
          {slide.title}
        </h1>

        {/* Body */}
        {slide.body && (
          <p className="text-white/70 text-center text-2xl leading-relaxed max-w-4xl font-sans font-light">
            {slide.body}
          </p>
        )}

        {/* Dates */}
        {slide.expires_at && (
          <div className="mt-8 text-white/40 text-base font-sans">
            Through {new Date(slide.expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-12 pb-8 relative z-10">
        {/* Progress bar */}
        <ProgressBar duration={SLIDE_DURATION} active={visible} />

        {/* Slide dots */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            {online
              ? <Wifi size={14} className="text-white/30" />
              : <WifiOff size={14} className="text-red-400" />
            }
            <span className="text-white/20 text-xs font-sans">Live</span>
          </div>
          <div className="flex items-center gap-2">
            {announcements.map((_, i) => (
              <button key={i} onClick={() => { setVisible(false); setTimeout(() => { setCurrent(i); setVisible(true) }, TRANSITION_MS) }}
                className="rounded-full transition-all"
                style={{
                  width: i === current ? 24 : 8,
                  height: 8,
                  background: i === current ? cat.accent : 'rgba(255,255,255,0.25)'
                }} />
            ))}
          </div>
          <div className="text-white/20 text-xs font-sans">{current + 1} / {announcements.length}</div>
        </div>
      </div>
    </div>
  )
}
