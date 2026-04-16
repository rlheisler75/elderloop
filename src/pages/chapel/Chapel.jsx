import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Calendar, Users, Video, Radio, Plus, X, Edit2,
  Trash2, Play, Clock, ChevronRight, Wifi, WifiOff,
  Church, Upload, Save, AlertCircle
} from 'lucide-react'

const SERVICE_TYPES = [
  { key: 'sunday_service',    label: 'Sunday Service' },
  { key: 'wednesday_prayer',  label: 'Wednesday Prayer' },
  { key: 'bible_study',       label: 'Bible Study' },
  { key: 'special_event',     label: 'Special Event' },
  { key: 'holiday',           label: 'Holiday Service' },
  { key: 'other',             label: 'Other' },
]

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

const extractYouTubeId = (url) => {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : url.length === 11 ? url : null
}

const formatTime = (t) => {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

// ── YouTube Embed ──────────────────────────────────────────────
function YouTubeEmbed({ videoId, isLive, offline }) {
  if (offline || !videoId) {
    return (
      <div className="w-full aspect-video bg-slate-900 rounded-2xl flex flex-col items-center justify-center gap-3">
        <Video size={40} className="text-slate-600" />
        <p className="text-slate-500 text-sm">{offline ? 'Stream offline' : 'No video set'}</p>
      </div>
    )
  }
  return (
    <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black">
      <iframe
        className="w-full h-full"
        src={`https://www.youtube.com/embed/${videoId}${isLive ? '?autoplay=1' : ''}`}
        title="Chapel Service"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}

// ── Service Modal ──────────────────────────────────────────────
function ServiceModal({ service, onClose, onSave }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    title:        service?.title        || '',
    service_type: service?.service_type || 'sunday_service',
    description:  service?.description  || '',
    officiant:    service?.officiant    || '',
    service_date: service?.service_date || '',
    start_time:   service?.start_time   || '',
    end_time:     service?.end_time     || '',
    stream_youtube_id: service?.stream_youtube_id || '',
    recording_youtube_id: service?.recording_youtube_id || '',
    attendance_count: service?.attendance_count || '',
    is_recurring: service?.is_recurring || false,
    recur_day_of_week: service?.recur_day_of_week ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.title.trim() || !form.service_date || !form.start_time) {
      setError('Title, date and start time are required'); return
    }
    setSaving(true)
    const payload = {
      ...form,
      organization_id: profile.organization_id,
      created_by: profile.id,
      start_time:           form.start_time            || null,
      end_time:             form.end_time              || null,
      stream_youtube_id:    extractYouTubeId(form.stream_youtube_id) || null,
      recording_youtube_id: extractYouTubeId(form.recording_youtube_id) || null,
      attendance_count:     form.attendance_count      || null,
      recur_day_of_week:    form.is_recurring ? form.recur_day_of_week : null,
      speaker:              form.speaker               || null,
      description:          form.description           || null,
      updated_at:           new Date().toISOString(),
    }
    let err
    if (service?.id) {
      ({ error: err } = await supabase.from('chapel_services').update(payload).eq('id', service.id))
    } else {
      ({ error: err } = await supabase.from('chapel_services').insert({ ...payload, is_active: true }))
    }
    if (err) { setError(err.message); setSaving(false); return }
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800">{service ? 'Edit Service' : 'New Chapel Service'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Sunday Morning Service" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Service Type</label>
              <select value={form.service_type} onChange={e => set('service_type', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                {SERVICE_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Officiant / Pastor</label>
              <input value={form.officiant} onChange={e => set('officiant', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Name" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Date *</label>
              <input type="date" value={form.service_date} onChange={e => set('service_date', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Start *</label>
              <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">End</label>
              <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Optional description or message topic..." />
          </div>

          <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl space-y-3">
            <label className="block text-xs font-semibold text-purple-700 uppercase tracking-wide flex items-center gap-1.5">
              <Video size={13} /> YouTube Streaming
            </label>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Live Stream URL or Video ID</label>
              <input value={form.stream_youtube_id} onChange={e => set('stream_youtube_id', e.target.value)}
                className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                placeholder="https://youtube.com/live/... or video ID" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Past Recording URL or Video ID</label>
              <input value={form.recording_youtube_id} onChange={e => set('recording_youtube_id', e.target.value)}
                className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                placeholder="https://youtube.com/watch?v=... or video ID" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Attendance</label>
              <input type="number" value={form.attendance_count} onChange={e => set('attendance_count', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Number attended" />
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_recurring} onChange={e => set('is_recurring', e.target.checked)} className="w-4 h-4 rounded text-brand-600" />
              <span className="text-sm font-medium text-slate-700">Recurring service</span>
            </label>
            {form.is_recurring && (
              <div className="mt-3">
                <label className="block text-xs text-slate-500 mb-1">Repeats every</label>
                <select value={form.recur_day_of_week} onChange={e => set('recur_day_of_week', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">Select day</option>
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving...' : 'Save Service'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Chapel Page (Staff/Chaplain view) ─────────────────────
export default function Chapel() {
  const { profile, organization } = useAuth()
  const [services, setServices]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editService, setEditService] = useState(null)
  const [liveService, setLiveService] = useState(null)

  useEffect(() => { if (organization) fetchServices() }, [organization])

  async function fetchServices() {
    setLoading(true)
    const { data } = await supabase.from('chapel_services')
      .select('*').eq('organization_id', organization.id)
      .eq('is_active', true).order('service_date', { ascending: false })
    setServices(data || [])
    setLiveService(data?.find(s => s.is_live) || null)
    setLoading(false)
  }

  async function toggleLive(service) {
    const goingLive = !service.is_live
    // Turn off any other live service first
    if (goingLive) {
      await supabase.from('chapel_services').update({ is_live: false }).eq('organization_id', organization.id).eq('is_live', true)
    }
    await supabase.from('chapel_services').update({
      is_live: goingLive,
      stream_started_at: goingLive ? new Date().toISOString() : null
    }).eq('id', service.id)
    fetchServices()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this service?')) return
    await supabase.from('chapel_services').update({ is_active: false }).eq('id', id)
    fetchServices()
  }

  const now = new Date()
  const upcoming = services.filter(s => new Date(s.service_date) >= now).reverse()
  const past     = services.filter(s => new Date(s.service_date) < now)

  const avgAttendance = past.filter(s => s.attendance_count).length > 0
    ? Math.round(past.filter(s => s.attendance_count).reduce((a, s) => a + s.attendance_count, 0) / past.filter(s => s.attendance_count).length)
    : 0

  const thisMonthCount = services.filter(s => {
    const d = new Date(s.service_date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800">Chapel Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">Chaplain Portal — Manage services and live streams</p>
        </div>
        <button onClick={() => { setEditService(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={16} /> New Service
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Upcoming Services', value: upcoming.length, icon: Calendar, color: 'text-brand-600' },
          { label: 'Avg Attendance',    value: avgAttendance,   icon: Users,    color: 'text-purple-600' },
          { label: 'Stream Status',     value: liveService ? 'Live' : 'Offline', icon: Radio, color: liveService ? 'text-red-600' : 'text-slate-500', isText: true },
          { label: 'This Month',        value: thisMonthCount,  icon: Church,   color: 'text-green-600' },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={18} className={s.color} />
                <span className="text-xs text-slate-500">{s.label}</span>
              </div>
              <div className={`font-display text-3xl font-bold ${s.color}`}>{s.value}</div>
              {s.isText && liveService && (
                <div className="text-xs text-red-500 mt-1">{liveService.title}</div>
              )}
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Live Stream Control */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-slate-800">Live Stream Control</h2>
            {liveService ? (
              <button onClick={() => toggleLive(liveService)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                Stop Stream
              </button>
            ) : (
              <div className="text-xs text-slate-400">Select a service below to go live</div>
            )}
          </div>
          <YouTubeEmbed
            videoId={liveService?.stream_youtube_id}
            isLive={true}
            offline={!liveService} />
          {liveService && (
            <div className="mt-3 space-y-1 text-sm text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Now Streaming</span>
                <span className="font-medium">{liveService.title}</span>
              </div>
              {liveService.stream_started_at && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Started at</span>
                  <span>{new Date(liveService.stream_started_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick go-live picker */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-display font-semibold text-slate-800 mb-4">Go Live</h2>
          <p className="text-xs text-slate-400 mb-4">Select a service to start streaming. Make sure you've added a YouTube live URL first.</p>
          <div className="space-y-2">
            {upcoming.slice(0, 5).map(s => (
              <div key={s.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${s.is_live ? 'bg-red-50 border-red-200' : 'border-slate-100 hover:border-brand-200'}`}>
                <div>
                  <div className="text-sm font-medium text-slate-800">{s.title}</div>
                  <div className="text-xs text-slate-400">
                    {new Date(s.service_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {formatTime(s.start_time)}
                  </div>
                </div>
                <button onClick={() => toggleLive(s)}
                  disabled={!s.stream_youtube_id && !s.is_live}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    s.is_live ? 'bg-red-500 text-white hover:bg-red-600'
                    : s.stream_youtube_id ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}>
                  {s.is_live ? 'Stop' : s.stream_youtube_id ? 'Go Live' : 'No URL'}
                </button>
              </div>
            ))}
            {upcoming.length === 0 && <p className="text-sm text-slate-400 italic">No upcoming services scheduled.</p>}
          </div>
        </div>
      </div>

      {/* Upcoming Services */}
      <div className="mb-8">
        <h2 className="font-display font-semibold text-slate-800 mb-4">Upcoming Services</h2>
        {upcoming.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
            <Church size={32} className="mx-auto mb-2 opacity-30" />
            <p>No upcoming services — add one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(s => (
              <div key={s.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.is_live ? 'bg-red-100' : 'bg-purple-100'}`}>
                  {s.is_live ? <Radio size={18} className="text-red-600" /> : <Church size={18} className="text-purple-600" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800 text-sm">{s.title}</span>
                    {s.is_live && <span className="flex items-center gap-1 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-medium"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />LIVE</span>}
                    {s.is_recurring && <span className="text-xs text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded">Recurring</span>}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {new Date(s.service_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · {formatTime(s.start_time)}
                    {s.officiant && ` · ${s.officiant}`}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => { setEditService(s); setShowModal(true) }}
                    className="p-2 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(s.id)}
                    className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Services */}
      <div>
        <h2 className="font-display font-semibold text-slate-800 mb-4">Past Services</h2>
        {past.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">No past services yet.</div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Officiant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Attendance</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Recording</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {past.map(s => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{s.title}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(s.service_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{s.officiant || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {s.attendance_count ? `${s.attendance_count} attended` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {s.recording_youtube_id
                        ? <a href={`https://youtube.com/watch?v=${s.recording_youtube_id}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium">
                            <Play size={12} /> Watch
                          </a>
                        : <span className="text-xs text-slate-300">No recording</span>}
                    </td>
                    <td className="px-4 py-3 flex items-center gap-1 justify-end">
                      <button onClick={() => { setEditService(s); setShowModal(true) }}
                        className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg transition-colors"><Edit2 size={13} /></button>
                      <button onClick={() => handleDelete(s.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && <ServiceModal service={editService} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchServices() }} />}
    </div>
  )
}
