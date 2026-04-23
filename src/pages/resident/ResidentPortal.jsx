import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Wrench, Megaphone, Church, Calendar, Clock,
  Play, Radio, Plus, X, ChevronRight, Bell,
  Home, LogOut, AlertTriangle, CheckCircle2,
  Cake, Star, CloudSun, UtensilsCrossed, Maximize
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const formatTime = (t) => {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

const extractYouTubeId = (url) => {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : url.length === 11 ? url : null
}

const WO_STATUS_COLOR = {
  open:             'bg-blue-50 text-blue-700 border-blue-200',
  pending_approval: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  assigned:         'bg-indigo-50 text-indigo-700 border-indigo-200',
  in_progress:      'bg-brand-50 text-brand-700 border-brand-200',
  awaiting_vendor:  'bg-orange-50 text-orange-700 border-orange-200',
  on_hold:          'bg-slate-100 text-slate-600 border-slate-200',
  cancelled:        'bg-red-50 text-red-600 border-red-200',
  closed:           'bg-green-50 text-green-700 border-green-200',
}

const WO_STATUS_LABEL = {
  open: 'Open', pending_approval: 'Pending', assigned: 'Assigned',
  in_progress: 'In Progress', awaiting_vendor: 'Awaiting Vendor',
  on_hold: 'On Hold', cancelled: 'Cancelled', closed: 'Completed',
}

const ANNOUNCEMENT_ICONS = {
  general: Megaphone, birthday: Cake, resident_spotlight: Star,
  event: Calendar, weather: CloudSun, chapel: Church,
  menu: UtensilsCrossed, alert: AlertTriangle,
}

// ── Submit Work Request Modal ──────────────────────────────────
function SubmitRequestModal({ onClose, onSave }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({ title: '', description: '', category: 'other', location_detail: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const CATEGORIES = [
    'plumbing','electrical','hvac','appliance','carpentry',
    'painting','cleaning','grounds','safety','other'
  ]

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Please describe the issue'); return }
    setSaving(true)
    const { error: err } = await supabase.from('work_orders').insert({
      title: form.title.trim(),
      description: form.description || null,
      category: form.category,
      location_detail: form.location_detail || null,
      unit: profile.unit || null,
      organization_id: profile.organization_id,
      submitted_by: profile.id,
      status: 'open',
      priority: 'normal',
    })
    if (err) { setError(err.message); setSaving(false); return }
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-display font-semibold text-slate-800">Submit a Request</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">What's the issue? *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Leaky faucet in bathroom" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 capitalize">
              {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Location Detail</label>
            <input value={form.location_detail} onChange={e => set('location_detail', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Master bathroom, kitchen sink" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Additional Details</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Any other details that might help..." />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Resident Portal ───────────────────────────────────────
export default function ResidentPortal() {
  const { profile, organization, hasModule, signOut } = useAuth()
  const navigate = useNavigate()
  const [workOrders, setWorkOrders]           = useState([])
  const [announcements, setAnnouncements]     = useState([])
  const [chapelServices, setChapelServices]   = useState([])
  const [liveService, setLiveService]         = useState(null)
  const [activities, setActivities]           = useState([])
  const chapelRef = useRef(null)
  const [loading, setLoading]                 = useState(true)
  const [showWOModal, setShowWOModal]         = useState(false)

  // Module flags — controls what gets fetched AND rendered
  const showWorkOrders  = hasModule('work_orders')
  const showActivities  = hasModule('activities')
  const showChapel      = hasModule('chapel')
  // Announcements are always shown (org-wide communication, not module-gated)

  useEffect(() => { if (organization) fetchAll() }, [organization])

  async function fetchAll() {
    setLoading(true)
    const now      = new Date().toISOString()
    const todayStr = new Date().toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const queries = [
      // Always fetch announcements
      supabase.from('announcements').select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .lte('starts_at', now)
        .or(`expires_at.is.null,expires_at.gte.${now}`)
        .order('pinned', { ascending: false })
        .order('starts_at', { ascending: false }).limit(10),
    ]

    // Conditionally fetch based on enabled modules
    if (showWorkOrders) {
      queries.push(
        supabase.from('work_orders').select('*')
          .eq('organization_id', organization.id)
          .eq('submitted_by', profile.id)
          .order('created_at', { ascending: false }).limit(10)
      )
    }

    if (showChapel) {
      queries.push(
        supabase.from('chapel_services').select('*')
          .eq('organization_id', organization.id)
          .eq('is_active', true)
          .order('service_date', { ascending: false }).limit(20)
      )
    }

    if (showActivities) {
      queries.push(
        supabase.from('activities').select('*')
          .eq('organization_id', organization.id)
          .eq('is_active', true)
          .eq('show_on_portal', true)
          .gte('start_date', todayStr)
          .lte('start_date', nextWeek)
          .order('start_date').order('start_time').limit(20)
      )
    }

    const results = await Promise.all(queries)

    // results[0] is always announcements
    setAnnouncements(results[0].data || [])

    let idx = 1
    if (showWorkOrders)  { setWorkOrders(results[idx]?.data || []);  idx++ }
    if (showChapel) {
      const services = results[idx]?.data || []
      setChapelServices(services)
      setLiveService(services.find(s => s.is_live) || null)
      idx++
    }
    if (showActivities)  { setActivities(results[idx]?.data || []);  idx++ }

    setLoading(false)
  }

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  const today = new Date()
  const upcomingServices = chapelServices
    .filter(s => new Date(s.service_date) >= today)
    .reverse().slice(0, 5)
  const pastServices = chapelServices
    .filter(s => new Date(s.service_date) < today && s.recording_youtube_id)
    .slice(0, 5)

  const activeOrders = workOrders.filter(w => !['closed','cancelled'].includes(w.status))

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Church size={20} className="text-brand-600" />
            <span className="font-display font-semibold text-brand-800">ElderLoop</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 hidden sm:block">{organization?.name}</span>
            <button onClick={handleSignOut}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold text-slate-800">
            Welcome, {profile?.first_name} 👋
          </h1>
          {profile?.unit && <p className="text-slate-500 mt-1">Unit {profile.unit}</p>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left column — 3/5 */}
          <div className="lg:col-span-3 space-y-6">

            {/* My Requests — only if work_orders module is enabled */}
            {showWorkOrders && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-semibold text-slate-800 flex items-center gap-2">
                    <Wrench size={18} className="text-brand-600" /> My Requests
                  </h2>
                  <button onClick={() => setShowWOModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors">
                    <Plus size={14} /> Submit Work Request
                  </button>
                </div>

                {loading ? (
                  <div className="text-slate-400 text-sm py-4 text-center">Loading...</div>
                ) : workOrders.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Wrench size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No requests yet. Submit one above!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {workOrders.slice(0, 5).map(wo => (
                      <div key={wo.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${wo.status === 'closed' ? 'bg-green-100' : 'bg-orange-100'}`}>
                            {wo.status === 'closed'
                              ? <CheckCircle2 size={15} className="text-green-600" />
                              : <Clock size={15} className="text-orange-500" />}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-800">{wo.title}</div>
                            <div className="text-xs text-slate-400 capitalize">{wo.category?.replace('_', ' ')}</div>
                          </div>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium flex-shrink-0 ${WO_STATUS_COLOR[wo.status] || 'bg-slate-100 text-slate-600'}`}>
                          {WO_STATUS_LABEL[wo.status] || wo.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Announcements — always visible */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="font-display font-semibold text-slate-800 flex items-center gap-2 mb-4">
                <Bell size={18} className="text-brand-600" /> Announcements
              </h2>
              {loading ? (
                <div className="text-slate-400 text-sm py-4 text-center">Loading...</div>
              ) : announcements.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No announcements at this time.</div>
              ) : (
                <div className="space-y-2">
                  {announcements.map(a => {
                    const Icon = ANNOUNCEMENT_ICONS[a.category] || Megaphone
                    return (
                      <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon size={15} className="text-brand-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-800 text-sm">{a.title}</div>
                          {a.body && <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{a.body}</div>}
                          <div className="text-xs text-slate-400 mt-1">
                            {new Date(a.starts_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                        {a.image_url && (
                          <img src={a.image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right column — 2/5 */}
          <div className="lg:col-span-2 space-y-6">

            {/* This Week's Activities — only if activities module is enabled */}
            {showActivities && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="font-display font-semibold text-slate-800 flex items-center gap-2 mb-4">
                  <Calendar size={18} className="text-purple-600" /> This Week's Activities
                </h2>
                {loading ? (
                  <div className="text-slate-400 text-sm py-4 text-center">Loading...</div>
                ) : activities.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4">No activities scheduled this week.</p>
                ) : (
                  <div className="space-y-2">
                    {activities.map(act => {
                      const fmt12 = (t) => {
                        if (!t) return ''
                        const [h, m] = t.split(':')
                        const hour = parseInt(h)
                        return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
                      }
                      const isToday = act.start_date === new Date().toISOString().split('T')[0]
                      return (
                        <div key={act.id}
                          className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${isToday ? 'bg-purple-50 border-purple-200' : 'border-slate-100'}`}>
                          <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                            style={{ background: act.color || '#8b5cf6' }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-800 text-sm">{act.title}</span>
                              {isToday && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">Today</span>}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                              <span>{new Date(act.start_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                              {act.start_time && <span>· {fmt12(act.start_time)}</span>}
                              {act.location && <span>· {act.location}</span>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Chapel / Live Stream — only if chapel module is enabled */}
            {showChapel && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="font-display font-semibold text-slate-800 flex items-center gap-2 mb-4">
                  <Radio size={18} className="text-purple-600" /> Chapel Service Live
                </h2>

                {liveService ? (
                  <>
                    <div className="relative mb-3 group">
                      <div className="w-full aspect-video rounded-xl overflow-hidden bg-black" ref={chapelRef}>
                        <iframe
                          className="w-full h-full"
                          src={`https://www.youtube.com/embed/${liveService.stream_youtube_id}?autoplay=1`}
                          title="Chapel Live"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                          allowFullScreen />
                      </div>
                      {/* LIVE badge */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
                      </div>
                      {/* Fullscreen button */}
                      <button
                        onClick={() => {
                          const el = chapelRef.current
                          if (!el) return
                          if (el.requestFullscreen) el.requestFullscreen()
                          else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
                          else if (el.mozRequestFullScreen) el.mozRequestFullScreen()
                        }}
                        className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-black/60 hover:bg-black/80 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors backdrop-blur-sm">
                        <Maximize size={13} /> Full Screen
                      </button>
                    </div>
                    <div className="text-sm font-medium text-purple-700">Now Streaming: {liveService.title}</div>
                    {liveService.stream_started_at && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        Started at {new Date(liveService.stream_started_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full aspect-video rounded-xl bg-slate-900 flex flex-col items-center justify-center gap-2 mb-3">
                    <Radio size={24} className="text-slate-600" />
                    <p className="text-slate-500 text-xs">No live stream at this time</p>
                  </div>
                )}

                {/* Upcoming */}
                {upcomingServices.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Upcoming</h3>
                    <div className="space-y-2">
                      {upcomingServices.map(s => (
                        <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                          <div>
                            <div className="text-sm font-medium text-slate-700">{s.title}</div>
                            <div className="text-xs text-slate-400">
                              {new Date(s.service_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {formatTime(s.start_time)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Past Services */}
                {pastServices.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Past Services</h3>
                    <div className="space-y-2">
                      {pastServices.map(s => (
                        <a key={s.id}
                          href={`https://youtube.com/watch?v=${s.recording_youtube_id}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors group">
                          <div>
                            <div className="text-sm text-slate-700 group-hover:text-brand-600 transition-colors">{s.title}</div>
                            <div className="text-xs text-slate-400">
                              {new Date(s.service_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                          <Play size={14} className="text-slate-300 group-hover:text-brand-500 transition-colors flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showWOModal && (
        <SubmitRequestModal
          onClose={() => setShowWOModal(false)}
          onSave={() => { setShowWOModal(false); fetchAll() }} />
      )}
    </div>
  )
}
