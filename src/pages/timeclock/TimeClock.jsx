import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Clock, MapPin, CheckCircle2, XCircle, AlertTriangle,
  Navigation, Users, Download, ChevronDown, LogIn, LogOut,
  Wifi, WifiOff, Settings, TrendingUp, Calendar
} from 'lucide-react'

const fmtDuration = (ms) => {
  if (!ms || ms < 0) return '—'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const fmtTime = (ts) => ts
  ? new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  : '—'

const fmtDate = (ts) => ts
  ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  : '—'

const haversineMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

const mToFt = (m) => Math.round(m * 3.28084)

// ── Live Clock ─────────────────────────────────────────────────
function LiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])
  return (
    <div className="text-center">
      <div className="text-5xl font-light text-slate-800 tracking-wide" style={{ fontFamily: '"Playfair Display", serif' }}>
        {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div className="text-slate-400 text-sm mt-1">
        {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>
    </div>
  )
}

// ── GPS Status ─────────────────────────────────────────────────
function GPSStatus({ gps, geofence }) {
  if (!gps) return (
    <div className="flex items-center gap-2 text-slate-400 text-sm">
      <Navigation size={14} className="animate-pulse" />
      <span>Locating...</span>
    </div>
  )
  if (gps.error) return (
    <div className="flex items-center gap-2 text-red-500 text-sm">
      <WifiOff size={14} />
      <span>{gps.error}</span>
    </div>
  )
  const dist = geofence
    ? haversineMeters(gps.lat, gps.lng, geofence.lat, geofence.lng)
    : null
  const inside = dist !== null && dist <= (geofence?.radius_meters || 150)
  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 text-sm font-medium ${inside ? 'text-green-600' : 'text-red-500'}`}>
        <div className={`w-2 h-2 rounded-full ${inside ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        {inside ? 'On-site' : 'Off-site'}
        {dist !== null && <span className="text-slate-400 font-normal">· {mToFt(dist)} ft from facility</span>}
      </div>
      {geofence && !inside && (
        <div className="text-xs text-red-400 bg-red-50 px-3 py-1.5 rounded-lg">
          Must be within {mToFt(geofence.radius_meters)} ft to clock in/out
        </div>
      )}
    </div>
  )
}

// ── Leaflet Map Picker ─────────────────────────────────────────
function GeofenceMap({ lat, lng, radius, mapRef, circleRef, leafletMapRef, onChange }) {
  const containerRef = useRef(null)
  const initRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current || initRef.current) return
    initRef.current = true

    // Load Leaflet CSS + JS dynamically
    const loadLeaflet = async () => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
        document.head.appendChild(link)
      }

      if (!window.L) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
          script.onload = resolve
          script.onerror = reject
          document.head.appendChild(script)
        })
      }

      const L = window.L

      // Init map
      const map = L.map(containerRef.current, { zoomControl: true }).setView([lat, lng], 18)
      leafletMapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      // Draggable marker
      const marker = L.marker([lat, lng], {
        draggable: true,
        icon: L.divIcon({
          className: '',
          html: `<div style="width:28px;height:28px;background:#0c90e1;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:grab"></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).addTo(map)
      mapRef.current = marker

      // Geofence circle
      const circle = L.circle([lat, lng], {
        radius,
        color: '#0c90e1',
        fillColor: '#0c90e1',
        fillOpacity: 0.12,
        weight: 2,
      }).addTo(map)
      circleRef.current = circle

      // On marker drag
      marker.on('dragend', () => {
        const pos = marker.getLatLng()
        circle.setLatLng(pos)
        onChange(
          Math.round(pos.lat * 100000) / 100000,
          Math.round(pos.lng * 100000) / 100000
        )
      })

      // Click map to move marker
      map.on('click', (e) => {
        const { lat: newLat, lng: newLng } = e.latlng
        marker.setLatLng([newLat, newLng])
        circle.setLatLng([newLat, newLng])
        onChange(
          Math.round(newLat * 100000) / 100000,
          Math.round(newLng * 100000) / 100000
        )
      })
    }

    loadLeaflet().catch(console.error)

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
        initRef.current = false
      }
    }
  }, [])

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
        Map — drag the pin or click to set location
      </label>
      <div
        ref={containerRef}
        className="w-full rounded-xl overflow-hidden border border-slate-200"
        style={{ height: 280 }}
      />
      <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
        <MapPin size={11} /> Drag the blue dot or click anywhere on the map to place the geofence center
      </p>
    </div>
  )
}

export default function TimeClock() {
  const { profile, organization, isOrgAdmin } = useAuth()
  const [tab, setTab] = useState('clock')
  const [punches, setPunches] = useState([])
  const [allPunches, setAllPunches] = useState([])
  const [profiles, setProfiles] = useState([])
  const [geofence, setGeofence] = useState(null)
  const [gps, setGps] = useState(null)
  const [status, setStatus] = useState(null) // 'in' | 'out' | null
  const [lastPunch, setLastPunch] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [geofenceForm, setGeofenceForm] = useState(null)
  const admin = isOrgAdmin()
  const orgId = organization?.id
  // Map refs for geofence settings
  const mapRef        = useRef(null)
  const circleRef     = useRef(null)
  const leafletMapRef = useRef(null)

  useEffect(() => { if (orgId) fetchAll() }, [orgId])

  useEffect(() => {
    if (!navigator.geolocation) {
      setGps({ error: 'GPS not supported on this device' })
      return
    }
    const watch = navigator.geolocation.watchPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => setGps({ error: 'Location access denied — enable GPS to clock in' }),
      { enableHighAccuracy: true, maximumAge: 10000 }
    )
    return () => navigator.geolocation.clearWatch(watch)
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [punchRes, geoRes, allRes, profileRes] = await Promise.all([
      supabase.from('time_punches').select('*')
        .eq('organization_id', orgId).eq('user_id', profile.id)
        .order('punched_at', { ascending: false }).limit(30),
      supabase.from('geofence_settings').select('*').eq('organization_id', orgId).single(),
      admin ? supabase.from('time_punches').select('*, profiles(first_name,last_name,role)')
        .eq('organization_id', orgId).order('punched_at', { ascending: false }).limit(200) : null,
      admin ? supabase.from('profiles').select('id,first_name,last_name,role')
        .eq('organization_id', orgId).not('role','in','(resident,family)').order('last_name') : null,
    ])

    const myPunches = punchRes.data || []
    setPunches(myPunches)
    if (allRes) setAllPunches(allRes.data || [])
    if (profileRes) setProfiles(profileRes.data || [])

    const lastIn  = myPunches.find(p => p.punch_type === 'in')
    const lastOut = myPunches.find(p => p.punch_type === 'out')
    if (lastIn && (!lastOut || new Date(lastIn.punched_at) > new Date(lastOut.punched_at))) {
      setStatus('in')
      setLastPunch(lastIn)
    } else {
      setStatus('out')
      setLastPunch(lastOut || null)
    }

    if (geoRes.data) {
      setGeofence(geoRes.data)
      setGeofenceForm(geoRes.data)
    }
    setLoading(false)
  }

  const handlePunch = async () => {
    if (!gps || gps.error) { setMsg({ type: 'error', text: 'GPS required to punch. Enable location access.' }); return }

    const dist = geofence ? haversineMeters(gps.lat, gps.lng, geofence.lat, geofence.lng) : 0
    const inside = !geofence?.require_geofence || dist <= (geofence?.radius_meters || 150)

    if (!inside) {
      setMsg({ type: 'error', text: `You are ${mToFt(dist)} ft from the facility. Must be within ${mToFt(geofence.radius_meters)} ft.` })
      return
    }

    setSaving(true)
    const punchType = status === 'in' ? 'out' : 'in'
    const { error } = await supabase.from('time_punches').insert({
      organization_id: orgId,
      user_id:         profile.id,
      punch_type:      punchType,
      lat:             gps.lat,
      lng:             gps.lng,
      accuracy_meters: gps.accuracy,
      within_geofence: inside,
      distance_meters: dist,
    })
    if (error) { setMsg({ type: 'error', text: error.message }) }
    else {
      setMsg({ type: 'success', text: punchType === 'in' ? '✓ Clocked in successfully' : '✓ Clocked out successfully' })
      await fetchAll()
    }
    setSaving(false)
    setTimeout(() => setMsg(null), 4000)
  }

  const saveGeofence = async () => {
    const { error } = await supabase.from('geofence_settings')
      .upsert({ ...geofenceForm, organization_id: orgId, updated_at: new Date().toISOString() }, { onConflict: 'organization_id' })
    if (!error) { setGeofence(geofenceForm); setMsg({ type: 'success', text: 'Geofence settings saved' }) }
    else setMsg({ type: 'error', text: error.message })
    setTimeout(() => setMsg(null), 3000)
  }

  // Compute payroll summary per person
  const payrollMap = {}
  const sortedPunches = [...allPunches].sort((a, b) => new Date(a.punched_at) - new Date(b.punched_at))
  const openIns = {}
  sortedPunches.forEach(p => {
    const uid = p.user_id
    if (!payrollMap[uid]) payrollMap[uid] = { ms: 0, profile: p.profiles, onShift: false }
    if (p.punch_type === 'in') { openIns[uid] = new Date(p.punched_at); payrollMap[uid].onShift = true }
    else if (openIns[uid]) {
      payrollMap[uid].ms += new Date(p.punched_at) - openIns[uid]
      delete openIns[uid]; payrollMap[uid].onShift = false
    }
  })

  const dist = gps && !gps.error && geofence
    ? haversineMeters(gps.lat, gps.lng, geofence.lat, geofence.lng)
    : null
  const canPunch = gps && !gps.error && (!geofence?.require_geofence || (dist !== null && dist <= geofence.radius_meters))

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800">Time Clock</h1>
          <p className="text-slate-500 text-sm mt-0.5">GPS-verified clock in/out</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { key: 'clock', label: 'My Clock', icon: Clock },
          { key: 'history', label: 'My History', icon: Calendar },
          ...(admin ? [
            { key: 'team', label: 'Team', icon: Users },
            { key: 'settings', label: 'Settings', icon: Settings },
          ] : []),
        ].map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Icon size={15} />{t.label}
            </button>
          )
        })}
      </div>

      {/* Message */}
      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {msg.text}
        </div>
      )}

      {/* ── CLOCK TAB ── */}
      {tab === 'clock' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Clock card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex flex-col items-center gap-6">
            <LiveClock />

            <GPSStatus gps={gps} geofence={geofence} />

            {/* Status indicator */}
            <div className={`w-full py-3 px-4 rounded-xl text-center text-sm font-semibold border ${status === 'in' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
              {status === 'in'
                ? `On Shift · Clocked in at ${fmtTime(lastPunch?.punched_at)}`
                : lastPunch ? `Last punch: ${fmtDate(lastPunch?.punched_at)} at ${fmtTime(lastPunch?.punched_at)}` : 'Not clocked in'}
            </div>

            {/* Punch button */}
            <button
              onClick={handlePunch}
              disabled={saving || !canPunch}
              className={`w-full py-4 rounded-2xl text-white text-lg font-bold transition-all flex items-center justify-center gap-3 ${
                saving ? 'bg-slate-300' :
                !canPunch ? 'bg-slate-200 text-slate-400 cursor-not-allowed' :
                status === 'in' ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200' : 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-200'
              }`}
              style={{ fontFamily: '"Playfair Display", serif' }}>
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
              ) : status === 'in' ? (
                <><LogOut size={22} /> Clock Out</>
              ) : (
                <><LogIn size={22} /> Clock In</>
              )}
            </button>
          </div>

          {/* Recent punches */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-700 mb-4 text-sm">Recent Punches</h3>
            {punches.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">No punches yet</div>
            ) : (
              <div className="space-y-2">
                {punches.slice(0, 10).map((p, i) => {
                  // Pair in/out to compute duration
                  const isIn = p.punch_type === 'in'
                  const nextOut = !isIn ? null : punches.slice(0, i).find(pp => pp.punch_type === 'out')
                  const dur = isIn && nextOut ? new Date(nextOut.punched_at) - new Date(p.punched_at) : null

                  return (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isIn ? 'bg-green-100' : 'bg-red-100'}`}>
                        {isIn ? <LogIn size={14} className="text-green-600" /> : <LogOut size={14} className="text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-700">
                          {isIn ? 'Clock In' : 'Clock Out'} · {fmtTime(p.punched_at)}
                        </div>
                        <div className="text-xs text-slate-400">
                          {fmtDate(p.punched_at)}
                          {p.within_geofence && <span className="ml-1 text-green-500">· On-site</span>}
                          {p.distance_meters && <span className="ml-1">· {mToFt(p.distance_meters)} ft</span>}
                        </div>
                      </div>
                      {dur && <div className="text-xs text-brand-600 font-medium flex-shrink-0">{fmtDuration(dur)}</div>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">My Punch History</h3>
            <div className="text-xs text-slate-400">{punches.length} records</div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100">
              {['Type','Date','Time','Location','Distance','Duration'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {punches.map((p, i) => {
                const isIn = p.punch_type === 'in'
                const prev = punches[i - 1]
                const dur = !isIn && prev?.punch_type === 'in'
                  ? new Date(p.punched_at) - new Date(prev.punched_at) : null
                return (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isIn ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {isIn ? 'IN' : 'OUT'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{fmtDate(p.punched_at)}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">{fmtTime(p.punched_at)}</td>
                    <td className="px-5 py-3">
                      {p.within_geofence
                        ? <span className="text-green-600 text-xs flex items-center gap-1"><CheckCircle2 size={12} /> On-site</span>
                        : <span className="text-red-500 text-xs flex items-center gap-1"><XCircle size={12} /> Off-site</span>}
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{p.distance_meters ? `${mToFt(p.distance_meters)} ft` : '—'}</td>
                    <td className="px-5 py-3 text-brand-600 font-medium text-xs">{dur ? fmtDuration(dur) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {punches.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">No punch history yet</div>}
        </div>
      )}

      {/* ── TEAM TAB (admin) ── */}
      {tab === 'team' && admin && (
        <div className="space-y-6">
          {/* Currently on shift */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Currently On Shift
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.values(payrollMap).filter(u => u.onShift).map((u, i) => {
                const lastIn = sortedPunches.filter(p => p.user_id === Object.keys(payrollMap)[i] && p.punch_type === 'in').pop()
                return (
                  <div key={i} className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-green-700 text-sm font-bold flex-shrink-0">
                      {u.profile?.first_name?.[0]}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-800">{u.profile?.first_name} {u.profile?.last_name}</div>
                      <div className="text-xs text-green-600">Since {fmtTime(lastIn?.punched_at)}</div>
                    </div>
                  </div>
                )
              })}
              {Object.values(payrollMap).filter(u => u.onShift).length === 0 && (
                <div className="col-span-3 text-slate-400 text-sm">Nobody currently clocked in</div>
              )}
            </div>
          </div>

          {/* Payroll summary */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-700">Payroll Summary — All Time</h3>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100">
                {['Staff Member','Role','Total Hours','Status'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {Object.entries(payrollMap).map(([uid, u]) => (
                  <tr key={uid} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800">{u.profile?.first_name} {u.profile?.last_name}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-500 capitalize text-xs">{u.profile?.role?.replace('_',' ')}</td>
                    <td className="px-5 py-3 font-semibold text-brand-600">{fmtDuration(u.ms)}</td>
                    <td className="px-5 py-3">
                      {u.onShift
                        ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">On Shift</span>
                        : <span className="text-xs text-slate-400">Off</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SETTINGS TAB (admin) ── */}
      {tab === 'settings' && admin && geofenceForm && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-2xl">
          <h3 className="font-semibold text-slate-700 mb-5 flex items-center gap-2">
            <MapPin size={16} className="text-brand-600" /> Geofence Settings
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Facility Name</label>
              <input value={geofenceForm.name || ''} onChange={e => setGeofenceForm(f => ({...f, name: e.target.value}))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Latitude</label>
                <input type="number" step="0.00001" value={geofenceForm.lat}
                  onChange={e => {
                    const v = parseFloat(e.target.value)
                    if (!isNaN(v)) {
                      setGeofenceForm(f => ({...f, lat: v}))
                      if (mapRef.current) mapRef.current.setLatLng([v, geofenceForm.lng])
                      if (circleRef.current) circleRef.current.setLatLng([v, geofenceForm.lng])
                      if (leafletMapRef.current) leafletMapRef.current.panTo([v, geofenceForm.lng])
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Longitude</label>
                <input type="number" step="0.00001" value={geofenceForm.lng}
                  onChange={e => {
                    const v = parseFloat(e.target.value)
                    if (!isNaN(v)) {
                      setGeofenceForm(f => ({...f, lng: v}))
                      if (mapRef.current) mapRef.current.setLatLng([geofenceForm.lat, v])
                      if (circleRef.current) circleRef.current.setLatLng([geofenceForm.lat, v])
                      if (leafletMapRef.current) leafletMapRef.current.panTo([geofenceForm.lat, v])
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono" />
              </div>
            </div>

            {/* Map picker */}
            <GeofenceMap
              lat={geofenceForm.lat}
              lng={geofenceForm.lng}
              radius={geofenceForm.radius_meters}
              mapRef={mapRef}
              circleRef={circleRef}
              leafletMapRef={leafletMapRef}
              onChange={(lat, lng) => setGeofenceForm(f => ({...f, lat, lng}))}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Geofence Radius: {mToFt(geofenceForm.radius_meters)} ft ({Math.round(geofenceForm.radius_meters)} m)
              </label>
              <input type="range" min="30" max="500" step="5" value={geofenceForm.radius_meters}
                onChange={e => {
                  const v = parseInt(e.target.value)
                  setGeofenceForm(f => ({...f, radius_meters: v}))
                  if (circleRef.current) circleRef.current.setRadius(v)
                }}
                className="w-full accent-brand-600" />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>100 ft</span><span>500 ft</span><span>1,640 ft</span>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={geofenceForm.require_geofence} onChange={e => setGeofenceForm(f => ({...f, require_geofence: e.target.checked}))}
                className="w-4 h-4 rounded text-brand-600" />
              <div>
                <div className="text-sm font-medium text-slate-700">Require on-site GPS to punch</div>
                <div className="text-xs text-slate-400">Disable to allow remote clock-in</div>
              </div>
            </label>

            <button onClick={saveGeofence}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors">
              Save Geofence Settings
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
