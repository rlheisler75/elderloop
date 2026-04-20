import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const SLIDE_DURATION = 10000 // 10 seconds per slide

// ── helpers ────────────────────────────────────────────────────────────────
function formatTime(date) {
  let h = date.getHours()
  const m = String(date.getMinutes()).padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${ampm}`
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function getOrdinal(n) {
  const s = ['th','st','nd','rd'], v = n % 100
  return n + (s[(v-20)%10] || s[v] || s[0])
}

// Returns today's menu items from cycle menus via day-of-cycle math
async function fetchTodayMenu(orgId) {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=Sun

  // Get active cycle menu
  const { data: menus } = await supabase
    .from('cycle_menus')
    .select('id, name, cycle_length, start_date')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (!menus) return null

  // Calculate which cycle day we're on
  const start = new Date(menus.start_date)
  const diffDays = Math.floor((today - start) / 86400000)
  const cycleDay = ((diffDays % (menus.cycle_length * 7)) + (menus.cycle_length * 7)) % (menus.cycle_length * 7)
  const weekNum = Math.floor(cycleDay / 7) + 1
  const dayNum = dayOfWeek === 0 ? 7 : dayOfWeek

  // Get the menu day
  const { data: menuDay } = await supabase
    .from('cycle_menu_days')
    .select('id')
    .eq('cycle_menu_id', menus.id)
    .eq('week_number', weekNum)
    .eq('day_of_week', dayNum)
    .single()

  if (!menuDay) return null

  // Get lunch meal
  const { data: meals } = await supabase
    .from('cycle_menu_meals')
    .select('id, meal_period')
    .eq('cycle_menu_day_id', menuDay.id)
    .in('meal_period', ['lunch', 'dinner'])

  if (!meals?.length) return null

  const lunch = meals.find(m => m.meal_period === 'lunch') || meals[0]

  // Get courses for that meal
  const { data: courses } = await supabase
    .from('meal_courses')
    .select('course_name, menu_items(name)')
    .eq('meal_id', lunch.id)
    .order('sort_order')

  return {
    period: lunch.meal_period === 'lunch' ? 'Lunch' : 'Dinner',
    courses: (courses || []).map(c => c.menu_items?.name || c.course_name).filter(Boolean),
  }
}

// ── slide builders ──────────────────────────────────────────────────────────
function buildSlides(announcements, activities, chapelServices, today) {
  const slides = []

  // Announcements → slides
  for (const a of announcements) {
    slides.push({
      type: 'announcement',
      category: a.category,
      title: a.title,
      body: a.body,
      image: a.image_url,
      pinned: a.pinned,
    })
  }

  // Today's activities → slides
  const todayStr = today.toISOString().slice(0, 10)
  const todayActivities = activities.filter(a => a.start_date === todayStr)
  for (const a of todayActivities) {
    const time = a.start_time
      ? new Date(`1970-01-01T${a.start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : null
    slides.push({
      type: 'activity',
      category: a.category,
      title: a.title,
      body: a.description || '',
      meta: [time, a.location].filter(Boolean).join(' · '),
    })
  }

  // Upcoming chapel services
  const upcoming = chapelServices.filter(s => s.service_date >= todayStr).slice(0, 2)
  for (const s of upcoming) {
    const d = new Date(s.service_date + 'T12:00:00')
    const dateLabel = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    const time = s.start_time
      ? new Date(`1970-01-01T${s.start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : null
    slides.push({
      type: 'chapel',
      category: s.service_type,
      title: s.title,
      body: s.description || (s.officiant ? `Led by ${s.officiant}` : ''),
      meta: [dateLabel, time].filter(Boolean).join(' · '),
    })
  }

  // Sort: pinned first, then rest
  slides.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))

  return slides.length > 0 ? slides : [{
    type: 'announcement',
    category: 'general',
    title: 'Welcome',
    body: 'Good day! Check back soon for announcements and activities.',
  }]
}

// ── tag config ──────────────────────────────────────────────────────────────
const TAG_CONFIG = {
  general:          { label: 'Announcement',   bg: 'rgba(12,144,225,0.18)',  text: '#6bc8f5' },
  birthday:         { label: 'Birthday',        bg: 'rgba(224,124,12,0.18)', text: '#f5b06b' },
  resident_spotlight:{ label: 'Spotlight',      bg: 'rgba(213,90,127,0.18)', text: '#f59bb8' },
  event:            { label: 'Event',           bg: 'rgba(128,90,213,0.18)', text: '#c39cf5' },
  weather:          { label: 'Weather',         bg: 'rgba(26,158,92,0.18)',  text: '#5dcaa5' },
  chapel:           { label: 'Chapel',          bg: 'rgba(128,90,213,0.18)', text: '#c39cf5' },
  sunday_service:   { label: 'Sunday Service',  bg: 'rgba(128,90,213,0.18)', text: '#c39cf5' },
  wednesday_prayer: { label: 'Prayer',          bg: 'rgba(128,90,213,0.18)', text: '#c39cf5' },
  bible_study:      { label: 'Bible Study',     bg: 'rgba(128,90,213,0.18)', text: '#c39cf5' },
  special_event:    { label: 'Special Event',   bg: 'rgba(224,124,12,0.18)', text: '#f5b06b' },
  holiday:          { label: 'Holiday',         bg: 'rgba(213,90,47,0.18)',  text: '#f5916b' },
  menu:             { label: 'Menu',            bg: 'rgba(26,158,92,0.18)',  text: '#5dcaa5' },
  alert:            { label: 'Alert',           bg: 'rgba(213,60,60,0.18)',  text: '#f57070' },
  activity:         { label: 'Activity',        bg: 'rgba(26,158,92,0.18)', text: '#5dcaa5' },
  fitness:          { label: 'Fitness',         bg: 'rgba(26,158,92,0.18)', text: '#5dcaa5' },
  arts_crafts:      { label: 'Arts & Crafts',   bg: 'rgba(213,90,127,0.18)', text: '#f59bb8' },
  games:            { label: 'Games',           bg: 'rgba(224,124,12,0.18)', text: '#f5b06b' },
  social:           { label: 'Social',          bg: 'rgba(12,144,225,0.18)', text: '#6bc8f5' },
  music:            { label: 'Music',           bg: 'rgba(128,90,213,0.18)', text: '#c39cf5' },
  spiritual:        { label: 'Spiritual',       bg: 'rgba(128,90,213,0.18)', text: '#c39cf5' },
  entertainment:    { label: 'Entertainment',   bg: 'rgba(12,144,225,0.18)', text: '#6bc8f5' },
}

function getTag(type, category) {
  if (type === 'activity') return TAG_CONFIG[category] || TAG_CONFIG.activity
  if (type === 'chapel') return TAG_CONFIG[category] || TAG_CONFIG.chapel
  return TAG_CONFIG[category] || TAG_CONFIG.general
}

// ── component ───────────────────────────────────────────────────────────────
export default function TV() {
  const { slug } = useParams()
  const [org, setOrg] = useState(null)
  const [slides, setSlides] = useState([])
  const [menu, setMenu] = useState(null)
  const [upcomingActivities, setUpcomingActivities] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [now, setNow] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const startRef = useRef(Date.now())
  const rafRef = useRef(null)
  const indexRef = useRef(0)
  const slidesRef = useRef([])

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [])

  // Load data
  useEffect(() => {
    if (!slug) return
    loadData()
  }, [slug])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      // Resolve org by slug
      const { data: orgData, error: orgErr } = await supabase
        .from('organizations')
        .select('id, name, slug, primary_color, logo_url, logo_icon_url')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

      if (orgErr || !orgData) { setError('Community not found.'); setLoading(false); return }
      setOrg(orgData)

      const today = new Date()
      const todayStr = today.toISOString().slice(0, 10)
      const weekFromNow = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10)

      // Parallel fetches
      const [annRes, actRes, chapRes, menuData] = await Promise.all([
        supabase.from('announcements')
          .select('id, title, body, category, image_url, pinned, starts_at, expires_at')
          .eq('organization_id', orgData.id)
          .eq('is_active', true)
          .order('pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10),

        supabase.from('activities')
          .select('id, title, description, category, start_date, start_time, end_time, location')
          .eq('organization_id', orgData.id)
          .eq('is_active', true)
          .eq('show_on_signage', true)
          .gte('start_date', todayStr)
          .lte('start_date', weekFromNow)
          .order('start_date')
          .order('start_time'),

        supabase.from('chapel_services')
          .select('id, title, service_type, description, officiant, service_date, start_time')
          .eq('organization_id', orgData.id)
          .eq('is_active', true)
          .gte('service_date', todayStr)
          .order('service_date')
          .limit(3),

        fetchTodayMenu(orgData.id),
      ])

      setMenu(menuData)

      // Next 3 activities for sidebar
      const allActs = actRes.data || []
      setUpcomingActivities(allActs.slice(0, 3))

      const built = buildSlides(annRes.data || [], allActs, chapRes.data || [], today)
      slidesRef.current = built
      setSlides(built)
    } catch (e) {
      setError('Unable to load signage data.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Slide progress animation
  useEffect(() => {
    if (!slides.length) return

    function tick() {
      const elapsed = Date.now() - startRef.current
      const pct = Math.min(100, (elapsed / SLIDE_DURATION) * 100)
      setProgress(pct)
      if (elapsed >= SLIDE_DURATION) {
        const next = (indexRef.current + 1) % slidesRef.current.length
        indexRef.current = next
        setCurrentIndex(next)
        startRef.current = Date.now()
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    startRef.current = Date.now()
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [slides.length])

  // Refresh data every 5 minutes
  useEffect(() => {
    const id = setInterval(loadData, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [slug])

  const orgColor = org?.primary_color || '#0c90e1'
  const initials = org ? org.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '??'
  const slide = slides[currentIndex]

  if (loading) return (
    <div style={styles.fullscreen}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ ...styles.logoCircle, background: '#0c90e1', width: 56, height: 56, fontSize: 20, margin: '0 auto 16px' }}>EL</div>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Loading signage…</p>
      </div>
    </div>
  )

  if (error) return (
    <div style={styles.fullscreen}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#f57070', fontSize: 18 }}>{error}</p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 8 }}>elderloop.xyz/tv/{slug}</p>
      </div>
    </div>
  )

  const tag = slide ? getTag(slide.type, slide.category) : TAG_CONFIG.general

  return (
    <div style={styles.fullscreen}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {org?.logo_icon_url
            ? <img src={org.logo_icon_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
            : <div style={{ ...styles.logoCircle, background: orgColor }}>{initials}</div>
          }
          <div>
            <div style={styles.orgName}>{org?.name}</div>
            <div style={styles.orgUrl}>elderloop.xyz/tv/{slug}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={styles.clock}>{formatTime(now)}</div>
          <div style={styles.dateStr}>{formatDate(now)}</div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={styles.body}>
        {/* Main slide */}
        <div style={styles.mainSlide}>
          {slide?.image && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 12,
              backgroundImage: `url(${slide.image})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              opacity: 0.18,
            }} />
          )}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <span style={{ ...styles.tag, background: tag.bg, color: tag.text }}>
              {tag.label}
            </span>
            <h1 style={styles.slideTitle}>{slide?.title}</h1>
            {slide?.body && <p style={styles.slideBody}>{slide.body}</p>}
            {slide?.meta && <p style={styles.slideMeta}>{slide.meta}</p>}
          </div>
          <div style={styles.slideCounter}>
            {currentIndex + 1} / {slides.length}
          </div>
        </div>

        {/* Side panel */}
        <div style={styles.sidePanel}>
          {/* Today's menu */}
          {menu && (
            <div style={styles.sideCard}>
              <div style={styles.sideLabel}>Today's {menu.period}</div>
              {menu.courses.slice(0, 4).map((item, i) => (
                <div key={i} style={{ ...styles.sideItem, borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                  {item}
                </div>
              ))}
            </div>
          )}

          {/* Upcoming activities */}
          {upcomingActivities.length > 0 && (
            <div style={styles.sideCard}>
              <div style={styles.sideLabel}>Coming Up</div>
              {upcomingActivities.slice(0, 3).map((a, i) => {
                const time = a.start_time
                  ? new Date(`1970-01-01T${a.start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                  : null
                const dateLabel = a.start_date === new Date().toISOString().slice(0, 10)
                  ? (time || 'Today')
                  : new Date(a.start_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                return (
                  <div key={a.id} style={{ ...styles.sideItem, borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 500 }}>{a.title}</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>{dateLabel}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={styles.footer}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {slides.map((_, i) => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: i === currentIndex ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.18)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
          ElderLoop
        </div>
      </div>
    </div>
  )
}

// ── styles ──────────────────────────────────────────────────────────────────
const styles = {
  fullscreen: {
    position: 'fixed', inset: 0,
    background: '#080c14',
    display: 'flex', flexDirection: 'column',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '18px 36px 14px',
    background: 'rgba(0,0,0,0.4)',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    flexShrink: 0,
  },
  logoCircle: {
    width: 40, height: 40, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 600, fontSize: 15, color: '#fff',
  },
  orgName: { fontSize: 18, fontWeight: 600, color: '#fff' },
  orgUrl: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  clock: { fontSize: 30, fontWeight: 600, color: 'rgba(255,255,255,0.92)', fontVariantNumeric: 'tabular-nums' },
  dateStr: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 1 },
  body: {
    flex: 1, display: 'flex', gap: 16,
    padding: '20px 24px 16px',
    overflow: 'hidden',
  },
  mainSlide: {
    flex: 1,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: '32px 36px',
    display: 'flex', flexDirection: 'column', justifyContent: 'center',
    position: 'relative', overflow: 'hidden',
  },
  tag: {
    display: 'inline-block',
    fontSize: 11, fontWeight: 600,
    letterSpacing: '0.07em', textTransform: 'uppercase',
    padding: '4px 12px', borderRadius: 20,
    marginBottom: 16,
  },
  slideTitle: {
    fontSize: 32, fontWeight: 600, color: '#fff',
    lineHeight: 1.25, marginBottom: 12,
    textShadow: '0 1px 3px rgba(0,0,0,0.4)',
  },
  slideBody: {
    fontSize: 16, color: 'rgba(255,255,255,0.65)',
    lineHeight: 1.65, maxWidth: 680,
  },
  slideMeta: {
    marginTop: 18, fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  slideCounter: {
    position: 'absolute', top: 14, right: 16,
    fontSize: 11, color: 'rgba(255,255,255,0.25)',
    fontVariantNumeric: 'tabular-nums',
  },
  sidePanel: {
    width: 230, display: 'flex', flexDirection: 'column', gap: 12,
    overflow: 'hidden',
  },
  sideCard: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10, padding: '12px 14px',
    flexShrink: 0,
  },
  sideLabel: {
    fontSize: 10, fontWeight: 600,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.35)',
    marginBottom: 8,
  },
  sideItem: {
    padding: '7px 0',
    fontSize: 13, color: 'rgba(255,255,255,0.75)',
    lineHeight: 1.4,
  },
  footer: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '8px 24px',
    background: 'rgba(0,0,0,0.3)',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    flexShrink: 0,
  },
  progressBar: {
    flex: 1, height: 2,
    background: 'rgba(255,255,255,0.08)',
    borderRadius: 1, overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
    transition: 'width 0.1s linear',
  },
}
