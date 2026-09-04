import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import UserProfileModal from '../../components/UserProfileModal'
import MealOrderModal, { MEAL_TYPES, MEAL_STATUS } from '../../components/MealOrderModal'
import RSVPButton from '../../components/RSVPButton'
import {
  Heart, Bell, MessageSquare, CalendarDays, ChevronRight,
  Plus, X, Send, Star, Activity, ArrowLeft, LogOut,
  Wrench, Camera, Phone, User, Home, ChevronDown,
  CheckCircle2, Clock, AlertCircle, Image, Users,
  Cake, MapPin, HeartHandshake, Shield, ClipboardList,
  Church, Play, Radio, UtensilsCrossed,
} from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────
const relativeTime = (iso) => {
  const diff = (Date.now() - new Date(iso)) / 1000
  if (diff < 60)      return 'just now'
  if (diff < 3600)    return `${Math.floor(diff/60)}m ago`
  if (diff < 86400)   return `${Math.floor(diff/3600)}h ago`
  if (diff < 604800)  return `${Math.floor(diff/86400)}d ago`
  return new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric'})
}

const fmt12 = (t) => {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr > 12 ? hr-12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
}

const extractYouTubeId = (url) => {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : url.length === 11 ? url : null
}

const CARE_LEVEL_LABELS = {
  independent:    'Independent Living',
  assisted:       'Assisted Living',
  memory_care:    'Memory Care',
  skilled_nursing:'Skilled Nursing',
  rehab:          'Rehabilitation',
}

const CARE_LEVEL_COLORS = {
  independent:    'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400',
  assisted:       'bg-brand-100 dark:bg-brand-950/50 text-brand-700 dark:text-brand-400',
  memory_care:    'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400',
  skilled_nursing:'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400',
  rehab:          'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400',
}

const WO_STATUS_CONFIG = {
  open:        { label: 'Open',        color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-950/50',  icon: Clock },
  in_progress: { label: 'In Progress', color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-950/50',   icon: Activity },
  on_hold:     { label: 'On Hold',     color: 'text-slate-500',  bg: 'bg-slate-50 dark:bg-slate-800',  icon: AlertCircle },
  closed:      { label: 'Completed',   color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-950/50',  icon: CheckCircle2 },
}

const WO_CATEGORIES = [
  { key: 'plumbing',      label: 'Plumbing',       emoji: '🔧' },
  { key: 'electrical',    label: 'Electrical',     emoji: '⚡' },
  { key: 'hvac',          label: 'HVAC / Heating', emoji: '🌡️' },
  { key: 'appliance',     label: 'Appliance',      emoji: '🏠' },
  { key: 'pest',          label: 'Pest Control',   emoji: '🐛' },
  { key: 'general',       label: 'General',        emoji: '🔨' },
  { key: 'housekeeping',  label: 'Housekeeping',   emoji: '🧹' },
  { key: 'other',         label: 'Other',          emoji: '📋' },
]

const UPDATE_ICONS = {
  health:      { icon: Heart,          bg: 'bg-red-50 dark:bg-red-950/50',    color: 'text-red-500' },
  activity:    { icon: CalendarDays,   bg: 'bg-purple-50 dark:bg-purple-950/50', color: 'text-purple-500' },
  dining:      { icon: Activity,       bg: 'bg-orange-50 dark:bg-orange-950/50', color: 'text-orange-500' },
  general:     { icon: Bell,           bg: 'bg-brand-50 dark:bg-brand-950/50',  color: 'text-brand-500' },
  milestone:   { icon: Star,           bg: 'bg-amber-50 dark:bg-amber-950/50',  color: 'text-amber-500' },
  photo:       { icon: Camera,         bg: 'bg-pink-50 dark:bg-pink-950/50',   color: 'text-pink-500' },
}

// Departments are fetched dynamically from org settings (organization.departments,
// managed in Admin Panel > Lists & Pick Lists > Departments), falling back to
// DEPARTMENTS_DEFAULT below if not configured.
const DEPARTMENTS_DEFAULT = [
  { key: 'nursing',        label: 'Nursing' },
  { key: 'maintenance',    label: 'Maintenance' },
  { key: 'dietary',        label: 'Dietary' },
  { key: 'housekeeping',   label: 'Housekeeping' },
  { key: 'transportation', label: 'Transportation' },
  { key: 'administration', label: 'Administration' },
  { key: 'activities',     label: 'Activities' },
  { key: 'security',       label: 'Security' },
  { key: 'other',          label: 'Other' },
]

// ── Maintenance Request Modal ─────────────────────────────────
function MaintenanceModal({ resident, orgId, profile, onClose, onSubmitted }) {
  const [form, setForm] = useState({
    title: '', description: '', category: 'general', priority: 'normal',
    unit: resident?.unit || '', building: resident?.building || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Please describe the issue'); return }
    setSaving(true)
    const { error: err } = await supabase.from('work_orders').insert({
      organization_id: orgId,
      title:           form.title.trim(),
      description:     form.description.trim() || null,
      category:        form.category,
      priority:        form.priority,
      status:          'open',
      resident_id:     resident.id,
      unit:            form.unit || null,
      building:        form.building || null,
      location_detail: `Resident room: ${resident.room || resident.unit || 'See resident record'}`,
      submitted_by:    profile.id,
      submitted_by_name: `${profile.first_name} ${profile.last_name} (Family)`,
      source:          'family',
    })
    if (err) { setError(err.message); setSaving(false); return }
    onSubmitted()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-base">Maintenance Request</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              For {resident.first_name} {resident.last_name} · Room {resident.room || resident.unit || 'N/A'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && (
            <div className="px-3 py-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-400 text-sm">{error}</div>
          )}

          {/* What's the issue */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              What needs to be fixed? <span className="text-red-500">*</span>
            </label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Dripping faucet in bathroom, Heat not working..."
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {WO_CATEGORIES.map(cat => (
                <button key={cat.key} onClick={() => set('category', cat.key)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-center ${
                    form.category === cat.key
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/50'
                      : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                  }`}>
                  <span className="text-lg leading-none">{cat.emoji}</span>
                  <span className="text-xs text-slate-600 dark:text-slate-300 leading-tight">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Urgency</label>
            <div className="flex gap-2">
              {[
                { key: 'low',    label: 'Not Urgent', color: 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700', active: 'border-slate-500 bg-slate-50 dark:bg-slate-800' },
                { key: 'normal',  label: 'Normal',     color: 'text-amber-600 border-amber-200 dark:border-amber-900',  active: 'border-amber-500 bg-amber-50 dark:bg-amber-950/50' },
                { key: 'high',   label: 'Urgent',     color: 'text-red-600 border-red-200 dark:border-red-900',      active: 'border-red-500 bg-red-50 dark:bg-red-950/50' },
              ].map(p => (
                <button key={p.key} onClick={() => set('priority', p.key)}
                  className={`flex-1 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                    form.priority === p.key ? p.active + ' ' + p.color : 'border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Additional Details <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Any extra details that would help maintenance..."
              rows={3}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 rounded-xl">
            <AlertCircle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Your request will go directly to the maintenance team. For emergencies, please call the front desk.
            </p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 font-medium">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
            {saving ? 'Submitting...' : <><Wrench size={14} /> Submit Request</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── New Message Modal ─────────────────────────────────────────
function NewMessageModal({ resident, orgId, profile, onClose, onSent }) {
  const { organization } = useAuth()
  const [form, setForm] = useState({ department: 'administration', subject: '', body: '' })
  const [sending, setSending] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const depts = organization?.departments?.length ? organization.departments : DEPARTMENTS_DEFAULT

  const handleSend = async () => {
    if (!form.body.trim()) return
    setSending(true)
    const threadId = crypto.randomUUID()
    await supabase.from('messages').insert({
      thread_id:       threadId,
      organization_id: orgId,
      resident_id:     resident.id,
      sender_id:       profile.id,
      sender_type:     'family',
      to_department:   form.department,
      subject:         form.subject || `Message about ${resident.first_name}`,
      body:            form.body.trim(),
      is_read_by_staff:   false,
      is_read_by_family:  true,
      is_active:          true,
    })
    setSending(false)
    onSent()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">New Message</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Send To</label>
            <select value={form.department} onChange={e => set('department', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              {depts.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Subject (optional)</label>
            <input value={form.subject} onChange={e => set('subject', e.target.value)}
              placeholder={`Message about ${resident.first_name}...`}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Message</label>
            <textarea value={form.body} onChange={e => set('body', e.target.value)}
              placeholder="Type your message..."
              rows={4}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 font-medium">Cancel</button>
          <button onClick={handleSend} disabled={sending || !form.body.trim()}
            className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
            <Send size={13} /> {sending ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Thread View ───────────────────────────────────────────────
function ThreadView({ thread, profile, onReply, onBack }) {
  const { organization: threadOrg } = useAuth()
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const first = thread[0]
  const _depts = threadOrg?.departments?.length ? threadOrg.departments : DEPARTMENTS_DEFAULT
  const dept  = _depts.find(d => d.key === first?.to_department)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [thread.length])

  const handleSend = async () => {
    if (!reply.trim()) return
    setSending(true)
    await onReply(first.thread_id || first.id, reply.trim())
    setReply('')
    setSending(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
        <button onClick={onBack} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{first?.subject || 'Message Thread'}</div>
          <div className="text-xs text-slate-400">To: {dept?.label || 'Staff'} · {thread.length} message{thread.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {thread.map(msg => {
          const isFamily = msg.sender_type === 'family'
          return (
            <div key={msg.id} className={`flex ${isFamily ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                isFamily
                  ? 'bg-brand-600 text-white rounded-br-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-md'
              }`}>
                {!isFamily && (
                  <div className="text-xs font-semibold mb-1 text-brand-600 dark:text-brand-400">{dept?.label || 'Staff'}</div>
                )}
                <p className="text-sm leading-relaxed">{msg.body}</p>
                {msg.image_url && (
                  <img src={msg.image_url} alt="" className="mt-2 rounded-xl w-full object-cover max-h-48" />
                )}
                <div className={`text-xs mt-1 ${isFamily ? 'text-brand-200' : 'text-slate-400'}`}>
                  {relativeTime(msg.created_at)}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply box */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
        <div className="flex gap-2">
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Reply..."
            rows={1}
            className="flex-1 px-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
          <button onClick={handleSend} disabled={sending || !reply.trim()}
            className="px-3 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-200 text-white rounded-xl transition-colors flex-shrink-0">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Profile Tab ───────────────────────────────────────────────
function ProfileTab({ resident, emergencyContacts, medicalContacts, link }) {
  const careLabel = CARE_LEVEL_LABELS[resident.care_level] || resident.care_level || 'N/A'
  const careColor = CARE_LEVEL_COLORS[resident.care_level] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'

  return (
    <div className="space-y-4">
      {/* Resident hero card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="h-16 bg-gradient-to-r from-brand-500 to-brand-700" />
        <div className="px-5 pb-5 -mt-8">
          <div className="flex items-end gap-4 mb-4">
            {resident.photo_url ? (
              <img src={resident.photo_url} alt=""
                className="w-16 h-16 rounded-2xl object-cover border-2 border-white dark:border-slate-900 shadow-md flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-brand-100 dark:bg-brand-950/50 border-2 border-white dark:border-slate-900 shadow-md flex items-center justify-center text-brand-700 dark:text-brand-400 text-2xl font-bold flex-shrink-0"
                style={{ fontFamily: '"Playfair Display", serif' }}>
                {resident.first_name?.[0]}
              </div>
            )}
            <div className="pb-1">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base leading-tight">
                {resident.first_name} {resident.middle_name ? resident.middle_name + ' ' : ''}{resident.last_name}
              </h3>
              <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${careColor}`}>
                {careLabel}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {resident.room && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <Home size={13} className="text-slate-400 flex-shrink-0" />
                <span>Room {resident.room}{resident.building ? ` · ${resident.building}` : ''}</span>
              </div>
            )}
            {resident.date_of_birth && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <Cake size={13} className="text-slate-400 flex-shrink-0" />
                <span>{new Date(resident.date_of_birth + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
            )}
            {resident.admission_date && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <CalendarDays size={13} className="text-slate-400 flex-shrink-0" />
                <span>Admitted {new Date(resident.admission_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
              </div>
            )}
            {link && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <HeartHandshake size={13} className="text-slate-400 flex-shrink-0" />
                <span className="capitalize">{link.relationship || 'Family'}{link.is_primary ? ' · Primary' : ''}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Emergency Contacts */}
      {emergencyContacts.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="px-5 py-3 border-b border-slate-50 dark:border-slate-800">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2">
              <Shield size={14} className="text-red-500" /> Emergency Contacts
            </h4>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {emergencyContacts.map(ec => (
              <div key={ec.id} className="px-5 py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-100 text-sm">
                      {ec.name}
                      {ec.is_primary && (
                        <span className="ml-2 text-xs bg-brand-100 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 px-1.5 py-0.5 rounded font-medium">Primary</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 capitalize">{ec.relationship}</div>
                  </div>
                  {ec.phone && (
                    <a href={`tel:${ec.phone}`}
                      className="flex items-center gap-1 text-brand-600 dark:text-brand-400 text-xs font-medium px-2 py-1 bg-brand-50 dark:bg-brand-950/50 rounded-lg">
                      <Phone size={11} /> {ec.phone}
                    </a>
                  )}
                </div>
                {ec.email && <div className="text-xs text-slate-400 mt-1">{ec.email}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Medical Contacts */}
      {medicalContacts.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="px-5 py-3 border-b border-slate-50 dark:border-slate-800">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2">
              <ClipboardList size={14} className="text-blue-500" /> Medical Contacts
            </h4>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {medicalContacts.map(mc => (
              <div key={mc.id} className="px-5 py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-100 text-sm">{mc.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {mc.contact_type && <span className="capitalize">{mc.contact_type.replace('_', ' ')}</span>}
                      {mc.practice && <span> · {mc.practice}</span>}
                    </div>
                  </div>
                  {mc.phone && (
                    <a href={`tel:${mc.phone}`}
                      className="flex items-center gap-1 text-brand-600 dark:text-brand-400 text-xs font-medium px-2 py-1 bg-brand-50 dark:bg-brand-950/50 rounded-lg">
                      <Phone size={11} /> {mc.phone}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {emergencyContacts.length === 0 && medicalContacts.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center text-slate-400 text-sm">
          <Users size={24} className="mx-auto mb-2 opacity-30" />
          Contact information will appear here once added by staff.
        </div>
      )}
    </div>
  )
}

// ── Photos Tab ────────────────────────────────────────────────
function PhotosTab({ photos }) {
  const [lightbox, setLightbox] = useState(null)

  if (photos.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Camera size={36} className="mx-auto mb-3 opacity-30" />
        <p className="font-medium text-slate-500 dark:text-slate-400">No photos yet</p>
        <p className="text-sm mt-1">Photos shared by staff will appear here.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {photos.map(p => (
          <button key={p.id} onClick={() => setLightbox(p)}
            className="aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 relative group">
            <img src={p.photo_url} alt={p.title || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            {p.category === 'milestone' && (
              <div className="absolute top-2 left-2 bg-amber-400 rounded-lg px-1.5 py-0.5">
                <Star size={10} className="text-white fill-white" />
              </div>
            )}
          </button>
        ))}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <div className="max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <img src={lightbox.photo_url} alt="" className="w-full rounded-2xl object-contain max-h-[60vh]" />
            {(lightbox.title || lightbox.body) && (
              <div className="mt-3 text-white">
                {lightbox.title && <div className="font-semibold">{lightbox.title}</div>}
                {lightbox.body  && <p className="text-sm text-white/70 mt-1">{lightbox.body}</p>}
                <div className="text-xs text-white/50 mt-2">{relativeTime(lightbox.created_at)}</div>
              </div>
            )}
            <button onClick={() => setLightbox(null)}
              className="mt-4 w-full py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-medium transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ── Maintenance Tab ───────────────────────────────────────────
function MaintenanceTab({ myWorkOrders, onNewRequest }) {
  const openCount = myWorkOrders.filter(w => w.status !== 'closed').length

  return (
    <div className="space-y-4">
      {/* Submit button */}
      <button onClick={onNewRequest}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-2xl transition-colors shadow-sm">
        <Plus size={18} /> New Maintenance Request
      </button>

      {/* Status summary */}
      {myWorkOrders.length > 0 && (
        <div className="flex gap-2">
          <div className="flex-1 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{openCount}</div>
            <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">Open</div>
          </div>
          <div className="flex-1 bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{myWorkOrders.length - openCount}</div>
            <div className="text-xs text-green-600 dark:text-green-400 font-medium">Completed</div>
          </div>
        </div>
      )}

      {/* Work order list */}
      {myWorkOrders.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
          <Wrench size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-slate-500 dark:text-slate-400">No requests yet</p>
          <p className="text-sm mt-1">Submit a request above and we'll take care of it.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1">Your Requests</h4>
          {myWorkOrders.map(wo => {
            const cfg = WO_STATUS_CONFIG[wo.status] || WO_STATUS_CONFIG.open
            const Icon = cfg.icon
            const cat  = WO_CATEGORIES.find(c => c.key === wo.category)
            return (
              <div key={wo.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 ${cfg.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon size={16} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-800 dark:text-slate-100 text-sm truncate">{wo.title}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      {cat && <span>{cat.emoji} {cat.label}</span>}
                      <span>·</span>
                      <span>#{wo.wo_number || wo.id.slice(0,6)}</span>
                      <span>·</span>
                      <span>{relativeTime(wo.created_at)}</span>
                    </div>
                    {wo.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{wo.description}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs text-slate-500 dark:text-slate-400 text-center">
        For urgent emergencies, please call the front desk directly.
      </div>
    </div>
  )
}

// ── Dining Tab (order meal delivery for the selected resident) ─
function DiningTab({ resident, dietProfile, mealOrders, onNewOrder }) {
  return (
    <div className="space-y-4">
      <button onClick={onNewOrder}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-2xl transition-colors shadow-sm">
        <UtensilsCrossed size={18} /> Order Meal Delivery for {resident?.first_name}
      </button>

      {dietProfile && (dietProfile.diet_type || dietProfile.allergens?.length > 0) && (
        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300 space-y-1">
          {dietProfile.diet_type && (
            <div><span className="font-semibold">Diet type:</span> <span className="capitalize">{dietProfile.diet_type.replace('_', ' ')}</span></div>
          )}
          {dietProfile.consistency && (
            <div><span className="font-semibold">Texture:</span> <span className="capitalize">{dietProfile.consistency.replace(/_/g, ' ')}</span></div>
          )}
          {dietProfile.allergens?.length > 0 && (
            <div><span className="font-semibold">Allergies:</span> {dietProfile.allergens.join(', ')}</div>
          )}
        </div>
      )}

      {mealOrders.length > 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="px-5 py-3 border-b border-slate-50 dark:border-slate-800">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Recent Orders</h4>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {mealOrders.slice(0, 5).map(o => {
              const st = MEAL_STATUS[o.status] || MEAL_STATUS.pending
              const mt = MEAL_TYPES.find(m => m.key === o.meal_type)
              return (
                <div key={o.id} className="px-5 py-3 flex items-center gap-3">
                  <div className={`w-8 h-8 ${st.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    {mt && <mt.icon size={14} className={st.color} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{o.items}</div>
                    <div className="text-xs text-slate-400">{mt?.label} · {relativeTime(o.created_at)}</div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.color} flex-shrink-0`}>{st.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
          <UtensilsCrossed size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-slate-500 dark:text-slate-400">No orders yet</p>
          <p className="text-sm mt-1">Order a meal delivery above and the kitchen will be notified.</p>
        </div>
      )}
    </div>
  )
}

// ── Main Family Portal ─────────────────────────────────────────
export default function FamilyPortal() {
  const { profile, organization, orgModules, signOut } = useAuth()
  const navigate = useNavigate()

  const [residents, setResidents]           = useState([])
  const [selectedResident, setSelectedResident] = useState(null)
  const [updates, setUpdates]               = useState([])
  const [announcements, setAnnouncements]   = useState([])
  const [activities, setActivities]         = useState([])
  const [rsvps, setRsvps]                   = useState(new Set())
  const [threads, setThreads]               = useState([])
  const [activeThread, setActiveThread]     = useState(null)
  const [photos, setPhotos]                 = useState([])
  const [myWorkOrders, setMyWorkOrders]     = useState([])
  const [chapelServices, setChapelServices] = useState([])
  const [liveService, setLiveService]       = useState(null)
  const [emergencyContacts, setEmergencyContacts] = useState([])
  const [medicalContacts, setMedicalContacts]     = useState([])
  const [dietProfile, setDietProfile]       = useState(null)
  const [mealOrders, setMealOrders]         = useState([])
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [loading, setLoading]               = useState(true)
  const [showProfile, setShowProfile]       = useState(false)
  const [notifs, setNotifs]         = useState([])
  const [showNotifs, setShowNotifs] = useState(false)
  const notifRef = useRef(null)
  const unread = notifs.filter(n => !n.is_read).length

  useEffect(() => {
    if (profile?.id) fetchPortalNotifs()
    const interval = setInterval(() => { if (profile?.id) fetchPortalNotifs() }, 30000)
    return () => clearInterval(interval)
  }, [profile?.id])

  useEffect(() => {
    const handleClick = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function fetchPortalNotifs() {
    const { data } = await supabase.from('push_notifications')
      .select('*, broadcast_messages(subject, body, created_at)')
      .eq('recipient_id', profile.id)
      .order('created_at', { ascending: false }).limit(20)
    setNotifs(data || [])
  }

  async function markAllRead() {
    const ids = notifs.filter(n => !n.is_read).map(n => n.id)
    if (!ids.length) return
    await supabase.from('push_notifications').update({ is_read: true }).in('id', ids)
    setNotifs(ns => ns.map(n => ({ ...n, is_read: true })))
  }

  const handleOpenNotifs = () => { setShowNotifs(v => !v); if (!showNotifs) markAllRead() }
  const [tab, setTab]                       = useState('updates')
  const [showNewMsg, setShowNewMsg]         = useState(false)
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false)
  const [unreadCount, setUnreadCount]       = useState(0)
  const [openWOCount, setOpenWOCount]       = useState(0)

  useEffect(() => { if (profile?.id) fetchLinkedResidents() }, [profile?.id])
  useEffect(() => { if (selectedResident) fetchResidentData() }, [selectedResident])

  async function fetchLinkedResidents() {
    const { data: links } = await supabase
      .from('family_resident_links')
      .select('*, residents(*)')
      .eq('family_user_id', profile.id)
    const linked = links?.filter(l => l.residents)?.map(l => ({ ...l.residents, link: l })) || []
    setResidents(linked)
    if (linked.length > 0) setSelectedResident(linked[0])
    else setLoading(false)
  }

  async function fetchResidentData() {
    setLoading(true)
    const orgId   = organization?.id || profile?.organization_id
    const now     = new Date().toISOString()
    const _today = new Date()
    const todayStr = `${_today.getFullYear()}-${String(_today.getMonth()+1).padStart(2,'0')}-${String(_today.getDate()).padStart(2,'0')}`
    const _next = new Date(Date.now() + 7*24*60*60*1000)
    const nextWeek = `${_next.getFullYear()}-${String(_next.getMonth()+1).padStart(2,'0')}-${String(_next.getDate()).padStart(2,'0')}`

    const [updatesRes, msgsRes, annRes, actRes, ecRes, mcRes, woRes, chapRes, dietRes, mealRes, rsvpRes] = await Promise.all([
      supabase.from('resident_updates')
        .select('*, profiles(first_name,last_name,role)')
        .eq('resident_id', selectedResident.id)
        .eq('is_family_visible', true).eq('is_active', true)
        .order('created_at', { ascending: false }).limit(40),
      supabase.from('messages').select('*')
        .eq('organization_id', orgId)
        .eq('resident_id', selectedResident.id)
        .eq('is_active', true)
        .order('created_at'),
      supabase.from('announcements').select('*')
        .eq('organization_id', orgId).eq('is_active', true)
        .lte('starts_at', now)
        .or(`expires_at.is.null,expires_at.gte.${now}`)
        .order('pinned', { ascending: false }).order('starts_at', { ascending: false }).limit(5),
      supabase.from('activities').select('*')
        .eq('organization_id', orgId).eq('is_active', true)
        .eq('show_on_portal', true)
        .gte('start_date', todayStr).lte('start_date', nextWeek)
        .order('start_date').order('start_time').limit(10),
      supabase.from('resident_emergency_contacts')
        .select('*').eq('resident_id', selectedResident.id).order('sort_order').order('is_primary', { ascending: false }),
      supabase.from('resident_medical_contacts')
        .select('*').eq('resident_id', selectedResident.id).order('sort_order'),
      supabase.from('work_orders')
        .select('id,title,description,category,priority,status,wo_number,created_at')
        .eq('submitted_by', profile.id)
        .eq('resident_id', selectedResident.id)
        .eq('source', 'family')
        .order('created_at', { ascending: false }),
      supabase.from('chapel_services').select('*')
        .eq('organization_id', orgId).eq('is_active', true)
        .order('service_date', { ascending: false }).limit(20),
      supabase.from('resident_dietary_profiles')
        .select('*').eq('resident_id', selectedResident.id).eq('is_active', true).limit(1),
      supabase.from('meal_delivery_orders')
        .select('*').eq('resident_id', selectedResident.id)
        .order('created_at', { ascending: false }).limit(10),
      supabase.from('activity_rsvps')
        .select('activity_id, occurrence_date').eq('resident_id', selectedResident.id),
    ])

    setUpdates(updatesRes.data || [])
    setAnnouncements(annRes.data || [])
    setActivities(actRes.data || [])
    setRsvps(new Set((rsvpRes.data || []).map(r => `${r.activity_id}|${r.occurrence_date}`)))
    setEmergencyContacts(ecRes.data || [])
    setMedicalContacts(mcRes.data || [])

    const wos = woRes.data || []
    setMyWorkOrders(wos)
    setOpenWOCount(wos.filter(w => w.status !== 'closed').length)

    const svcs = chapRes.data || []
    setChapelServices(svcs)
    setLiveService(svcs.find(s => s.is_live) || null)

    setDietProfile(dietRes.data?.[0] || null)
    setMealOrders(mealRes.data || [])

    // Photos: extract updates with photos
    const photoUpdates = (updatesRes.data || []).filter(u => u.photo_url)
    setPhotos(photoUpdates)

    // Thread grouping
    const msgList = msgsRes.data || []
    const threadMap = {}
    msgList.forEach(m => {
      const tid = m.thread_id || m.id
      if (!threadMap[tid]) threadMap[tid] = []
      threadMap[tid].push(m)
    })
    const threadList = Object.values(threadMap).sort((a, b) =>
      new Date(b[b.length-1].created_at) - new Date(a[a.length-1].created_at)
    )
    setThreads(threadList)

    const unread = msgList.filter(m => m.sender_type === 'staff' && !m.is_read_by_family).length
    setUnreadCount(unread)

    setLoading(false)
  }

  const handleReply = async (threadId, body) => {
    const parentThread = threads.find(t => t[0].thread_id === threadId || t[0].id === threadId)
    const first = parentThread?.[0]
    const orgId = organization?.id || profile?.organization_id
    await supabase.from('messages').insert({
      thread_id: threadId, organization_id: orgId,
      resident_id: selectedResident.id,
      sender_id: profile.id, sender_type: 'family',
      to_department: first?.to_department, subject: first?.subject,
      body, is_read_by_family: true, is_read_by_staff: false, is_active: true,
    })
    await supabase.from('messages')
      .update({ is_read_by_family: true, read_by_family_at: new Date().toISOString() })
      .eq('thread_id', threadId).eq('sender_type', 'staff')
    fetchResidentData()
  }

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  const toggleRsvpLocal = (key) => {
    setRsvps(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const TAB_CONFIG = [
    { key: 'updates',      label: 'Updates',      badge: null },
    { key: 'profile',      label: 'Profile',      badge: null },
    { key: 'messages',     label: 'Messages',     badge: unreadCount },
    { key: 'maintenance',  label: 'Requests',     badge: openWOCount },
    ...(orgModules.includes('dietary') ? [{ key: 'dining', label: 'Dining', badge: null }] : []),
    { key: 'photos',       label: 'Photos',       badge: null },
    { key: 'activities',   label: 'Activities',   badge: null },
    { key: 'chapel',       label: 'Chapel',       badge: liveService ? 1 : null, badgePulse: true },
  ]

  if (loading && residents.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading your family portal...</div>
      </div>
    )
  }

  if (!selectedResident && !loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <Heart size={40} className="text-slate-300 mx-auto mb-4" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-xl mb-2">No Residents Linked</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Your account hasn't been linked to a resident yet. Please contact the community office.</p>
        </div>
      </div>
    )
  }

  // Is viewing an active thread in messages tab?
  const viewingThread = tab === 'messages' && activeThread

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center overflow-hidden">
              <img src="/icon-192.png" alt="ElderLoop" className="w-full h-full object-cover" />
            </div>
            <span className="font-semibold text-slate-800 dark:text-slate-100" style={{ fontFamily: '"Playfair Display", serif' }}>
              ElderLoop
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div ref={notifRef} className="relative">
              <button onClick={handleOpenNotifs}
                className="relative p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <Bell size={16} />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Notifications</span>
                    {unread === 0 && <span className="text-xs text-slate-400">All caught up</span>}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
                    {notifs.length === 0 ? (
                      <div className="px-4 py-8 text-center text-slate-400 text-sm">No notifications yet</div>
                    ) : notifs.map(n => {
                      const msg = n.broadcast_messages
                      const ago = (() => {
                        const diff = Math.floor((Date.now() - new Date(n.created_at)) / 60000)
                        if (diff < 1) return 'Just now'
                        if (diff < 60) return `${diff}m ago`
                        if (diff < 1440) return `${Math.floor(diff/60)}h ago`
                        return `${Math.floor(diff/1440)}d ago`
                      })()
                      return (
                        <div key={n.id} className={`px-4 py-3 ${n.is_read ? '' : 'bg-brand-50 dark:bg-brand-950/30'}`}>
                          <div className="flex items-start gap-2">
                            {!n.is_read && <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{n.title || msg?.subject}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.body || msg?.body}</p>
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
            <button onClick={() => setShowProfile(true)}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="My Account">
              <User size={16} />
            </button>
            <button onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </div>
      </div>

      {showProfile && <UserProfileModal onClose={() => setShowProfile(false)} />}

      <div className="max-w-lg mx-auto px-4 pb-8">
        {/* Resident switcher (if multiple residents) */}
        {residents.length > 1 && (
          <div className="flex gap-2 pt-4 pb-2 overflow-x-auto no-scrollbar">
            {residents.map(r => (
              <button key={r.id} onClick={() => { setSelectedResident(r); setActiveThread(null) }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                  selectedResident?.id === r.id
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                {r.first_name} {r.last_name}
              </button>
            ))}
          </div>
        )}

        {/* Resident mini-card (compact, shown in all tabs except profile) */}
        {selectedResident && tab !== 'profile' && (
          <div className="mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 flex items-center gap-3">
            {selectedResident.photo_url ? (
              <img src={selectedResident.photo_url} alt=""
                className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-950/50 flex items-center justify-center text-brand-700 dark:text-brand-400 text-lg font-bold flex-shrink-0"
                style={{ fontFamily: '"Playfair Display", serif' }}>
                {selectedResident.first_name?.[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                {selectedResident.first_name} {selectedResident.last_name}
              </div>
              <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                {selectedResident.room && <span>Room {selectedResident.room}</span>}
                {selectedResident.care_level && (
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${CARE_LEVEL_COLORS[selectedResident.care_level] || 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                    {CARE_LEVEL_LABELS[selectedResident.care_level] || selectedResident.care_level}
                  </span>
                )}
              </div>
            </div>
            <button onClick={() => setTab('profile')}
              className="text-xs text-brand-600 dark:text-brand-400 font-medium flex items-center gap-1 flex-shrink-0 hover:text-brand-700 dark:hover:text-brand-300">
              Profile <ChevronRight size={12} />
            </button>
          </div>
        )}

        {/* Tab bar — scrollable on mobile */}
        <div className="mt-4 flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto no-scrollbar">
          {TAB_CONFIG.map(t => (
            <button key={t.key}
              onClick={() => { setTab(t.key); if (t.key !== 'messages') setActiveThread(null) }}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all relative ${
                tab === t.key ? 'bg-white dark:bg-slate-900 text-brand-700 dark:text-brand-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'
              }`}>
              {t.label}
              {t.badge > 0 && (
                <span className={`absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center leading-none ${t.badgePulse ? 'animate-pulse' : ''}`}>
                  {t.badgePulse ? '●' : t.badge > 9 ? '9+' : t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {loading ? (
            <div className="text-center py-16 text-slate-400">Loading...</div>
          ) : (
            <>
              {/* ── UPDATES ── */}
              {tab === 'updates' && (
                <div className="space-y-3">
                  {updates.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                      <Bell size={32} className="mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No updates yet</p>
                      <p className="text-sm mt-1">Staff will post updates here about {selectedResident.first_name}.</p>
                    </div>
                  ) : updates.map(u => {
                    const config = UPDATE_ICONS[u.category] || UPDATE_ICONS.general
                    const Icon   = config.icon
                    return (
                      <div key={u.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 ${config.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                            <Icon size={16} className={config.color} />
                          </div>
                          <div className="flex-1">
                            {u.title && <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm mb-1">{u.title}</div>}
                            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{u.body}</p>
                            {u.photo_url && (
                              <img src={u.photo_url} alt="" className="mt-3 rounded-xl w-full object-cover max-h-52" />
                            )}
                            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                              <span>{u.profiles ? `${u.profiles.first_name} ${u.profiles.last_name}` : 'Staff'}</span>
                              <span>·</span>
                              <span>{relativeTime(u.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ── PROFILE ── */}
              {tab === 'profile' && (
                <ProfileTab
                  resident={selectedResident}
                  emergencyContacts={emergencyContacts}
                  medicalContacts={medicalContacts}
                  link={selectedResident.link}
                />
              )}

              {/* ── MESSAGES ── */}
              {tab === 'messages' && (
                viewingThread ? (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden" style={{ minHeight: '60vh' }}>
                    <ThreadView
                      thread={activeThread}
                      profile={profile}
                      onReply={handleReply}
                      onBack={() => setActiveThread(null)}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <button onClick={() => setShowNewMsg(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors">
                        <Plus size={14} /> New Message
                      </button>
                    </div>
                    {threads.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No messages yet</p>
                        <p className="text-sm mt-1">Start a conversation with any department.</p>
                      </div>
                    ) : threads.map(thread => {
                      const first = thread[0]
                      const last  = thread[thread.length - 1]
                      const _depts = organization?.departments?.length ? organization.departments : DEPARTMENTS_DEFAULT
                      const dept  = _depts.find(d => d.key === first?.to_department)
                      const unread = thread.filter(m => m.sender_type === 'staff' && !m.is_read_by_family).length
                      return (
                        <button key={first.thread_id || first.id}
                          onClick={() => setActiveThread(thread)}
                          className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 text-left hover:border-brand-200 dark:hover:border-brand-800 hover:shadow-md transition-all">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 bg-brand-50 dark:bg-brand-950/50 rounded-xl flex items-center justify-center flex-shrink-0">
                              <MessageSquare size={16} className="text-brand-600 dark:text-brand-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm truncate ${unread > 0 ? 'font-semibold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                                  {first.subject || `Message to ${dept?.label || 'Staff'}`}
                                </span>
                                {unread > 0 && <span className="w-2 h-2 bg-brand-600 rounded-full flex-shrink-0" />}
                              </div>
                              <p className="text-xs text-slate-400 truncate mt-0.5">{last.body}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">{dept?.label || 'Staff'}</span>
                                <span>{relativeTime(last.created_at)}</span>
                                <span>{thread.length} msg{thread.length !== 1 ? 's' : ''}</span>
                              </div>
                            </div>
                            <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 flex-shrink-0 mt-1" />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              )}

              {/* ── MAINTENANCE ── */}
              {tab === 'maintenance' && (
                <MaintenanceTab
                  myWorkOrders={myWorkOrders}
                  onNewRequest={() => setShowMaintenanceModal(true)}
                />
              )}

              {/* ── DINING ── */}
              {tab === 'dining' && (
                <DiningTab
                  resident={selectedResident}
                  dietProfile={dietProfile}
                  mealOrders={mealOrders}
                  onNewOrder={() => setShowOrderModal(true)}
                />
              )}

              {/* ── PHOTOS ── */}
              {tab === 'photos' && <PhotosTab photos={photos} />}

              {/* ── ACTIVITIES ── */}
              {tab === 'activities' && (
                <div className="space-y-3">
                  {activities.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                      <CalendarDays size={32} className="mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No upcoming activities</p>
                      <p className="text-sm mt-1">Check back for this week's schedule.</p>
                    </div>
                  ) : activities.map(a => {
                    const _now = new Date()
                    const todayLocal = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`
                    const isToday = a.start_date === todayLocal
                    return (
                      <div key={a.id} className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm p-4 ${isToday ? 'border-brand-200 dark:border-brand-800' : 'border-slate-100 dark:border-slate-800'}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: a.color || '#0c90e1' }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{a.title}</span>
                              {isToday && <span className="text-xs bg-brand-100 dark:bg-brand-950/50 text-brand-700 dark:text-brand-400 px-1.5 py-0.5 rounded-full font-medium">Today</span>}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {new Date(a.start_date+'T12:00:00').toLocaleDateString('en-US',{ weekday:'short',month:'short',day:'numeric' })}
                              {a.start_time && ` · ${fmt12(a.start_time)}`}
                              {a.location && ` · ${a.location}`}
                            </div>
                            {a.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{a.description}</p>}
                          </div>
                          <RSVPButton activity={a} occurrenceDate={a.start_date} resident={selectedResident} profile={profile}
                            orgId={organization?.id || profile?.organization_id}
                            isRSVPd={rsvps.has(`${a.id}|${a.start_date}`)}
                            onToggled={() => toggleRsvpLocal(`${a.id}|${a.start_date}`)} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ── CHAPEL ── */}
              {tab === 'chapel' && (() => {
                const today = new Date()
                const upcoming = chapelServices
                  .filter(s => new Date(s.service_date + 'T12:00:00') >= today)
                  .slice(0, 3).reverse()
                const past = chapelServices
                  .filter(s => new Date(s.service_date + 'T12:00:00') < today && s.recording_youtube_id)
                  .slice(0, 5)
                return (
                  <div className="space-y-4">
                    {/* Live stream embed */}
                    {liveService && (
                      <div className="bg-brand-900 rounded-2xl overflow-hidden shadow-lg">
                        <div className="aspect-video w-full">
                          <iframe
                            src={`https://www.youtube.com/embed/${extractYouTubeId(liveService.stream_youtube_id || liveService.recording_youtube_id)}?autoplay=1&rel=0`}
                            className="w-full h-full" frameBorder="0" allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                        </div>
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs bg-red-500 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">LIVE</span>
                            <span className="text-white font-semibold text-sm">{liveService.title}</span>
                          </div>
                          {liveService.description && <p className="text-brand-200 text-xs">{liveService.description}</p>}
                          <p className="text-brand-300 text-xs mt-1">
                            Watch your loved one's chapel service live from home.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Not live — promo card */}
                    {!liveService && (
                      <div className="bg-gradient-to-br from-brand-800 to-brand-950 rounded-2xl p-5 flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                          <Church size={22} className="text-white" />
                        </div>
                        <div className="text-white">
                          <div className="font-semibold text-sm">Chapel Services</div>
                          <p className="text-brand-200 text-xs mt-0.5">
                            Watch services live or catch up on past recordings — stay connected to your loved one's community.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Upcoming services */}
                    {upcoming.length > 0 && (
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="px-5 py-3 border-b border-slate-50 dark:border-slate-800">
                          <h4 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Upcoming Services</h4>
                        </div>
                        <div className="divide-y divide-slate-50 dark:divide-slate-800">
                          {upcoming.map(s => (
                            <div key={s.id} className="px-5 py-3">
                              <div className="font-medium text-slate-800 dark:text-slate-100 text-sm">{s.title}</div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {new Date(s.service_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                {s.service_time ? ` · ${fmt12(s.service_time)}` : ''}
                              </div>
                              {s.speaker && <div className="text-xs text-slate-400 mt-0.5">Speaker: {s.speaker}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Past recordings */}
                    {past.length > 0 && (
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="px-5 py-3 border-b border-slate-50 dark:border-slate-800">
                          <h4 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Past Services</h4>
                        </div>
                        <div className="divide-y divide-slate-50 dark:divide-slate-800">
                          {past.map(s => (
                            <a key={s.id}
                              href={`https://youtube.com/watch?v=${s.recording_youtube_id}`}
                              target="_blank" rel="noopener noreferrer"
                              className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                              <div>
                                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{s.title}</div>
                                <div className="text-xs text-slate-400">
                                  {new Date(s.service_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 font-medium flex-shrink-0 group-hover:text-brand-700 dark:group-hover:text-brand-300">
                                <Play size={12} className="fill-brand-600 dark:fill-brand-400 group-hover:fill-brand-700 dark:group-hover:fill-brand-300" /> Watch
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {!liveService && upcoming.length === 0 && past.length === 0 && (
                      <div className="text-center py-12 text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        <Church size={32} className="mx-auto mb-3 opacity-30" />
                        <p className="font-medium text-slate-500 dark:text-slate-400">No chapel services yet</p>
                        <p className="text-sm mt-1">Services and recordings will appear here.</p>
                      </div>
                    )}
                  </div>
                )
              })()}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showNewMsg && selectedResident && (
        <NewMessageModal
          resident={selectedResident}
          orgId={organization?.id || profile?.organization_id}
          profile={profile}
          onClose={() => setShowNewMsg(false)}
          onSent={() => { setShowNewMsg(false); fetchResidentData(); setTab('messages') }}
        />
      )}

      {showMaintenanceModal && selectedResident && (
        <MaintenanceModal
          resident={selectedResident}
          orgId={organization?.id || profile?.organization_id}
          profile={profile}
          onClose={() => setShowMaintenanceModal(false)}
          onSubmitted={() => { setShowMaintenanceModal(false); fetchResidentData() }}
        />
      )}

      {showOrderModal && selectedResident && (
        <MealOrderModal
          resident={selectedResident}
          profile={profile}
          orgId={organization?.id || profile?.organization_id}
          onClose={() => setShowOrderModal(false)}
          onSaved={() => { setShowOrderModal(false); fetchResidentData() }}
        />
      )}
    </div>
  )
}
