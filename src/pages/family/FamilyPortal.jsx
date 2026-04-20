import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  Heart, MessageSquare, Bell, Calendar, UtensilsCrossed,
  Activity, LogOut, ChevronRight, Send, Paperclip, X,
  Check, CheckCheck, Clock, Star, Camera, FileText,
  User, Phone, AlertCircle, Smile, Award, Plus, Upload
} from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────
const DEPARTMENTS = [
  { key: 'nursing',        label: 'Nursing' },
  { key: 'dietary',        label: 'Dietary' },
  { key: 'administration', label: 'Administration' },
  { key: 'activities',     label: 'Activities' },
  { key: 'social_work',    label: 'Social Work' },
]

const UPDATE_ICONS = {
  general:   { icon: Bell,           color: 'text-brand-600',  bg: 'bg-brand-50' },
  health:    { icon: Heart,          color: 'text-red-500',    bg: 'bg-red-50' },
  mood:      { icon: Smile,          color: 'text-amber-500',  bg: 'bg-amber-50' },
  activity:  { icon: Activity,       color: 'text-green-600',  bg: 'bg-green-50' },
  meal:      { icon: UtensilsCrossed,color: 'text-orange-500', bg: 'bg-orange-50' },
  photo:     { icon: Camera,         color: 'text-purple-600', bg: 'bg-purple-50' },
  milestone: { icon: Award,          color: 'text-yellow-500', bg: 'bg-yellow-50' },
}

const relativeTime = (ts) => {
  const diff = Date.now() - new Date(ts)
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (mins < 1)   return 'Just now'
  if (mins < 60)  return `${mins}m ago`
  if (hrs < 24)   return `${hrs}h ago`
  if (days < 7)   return `${days}d ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Message Thread ─────────────────────────────────────────────
function MessageThread({ thread, profile, onReply, onClose }) {
  const [reply, setReply]   = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [thread])

  const handleSend = async () => {
    if (!reply.trim()) return
    setSending(true)
    await onReply(reply)
    setReply('')
    setSending(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 flex-shrink-0">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">{thread[0]?.subject || 'Message Thread'}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {DEPARTMENTS.find(d => d.key === thread[0]?.to_department)?.label || 'Staff'} · {thread.length} message{thread.length !== 1 ? 's' : ''}
          </p>
        </div>
        {onClose && <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {thread.map(msg => {
          const isOwn = msg.sender_id === profile.id
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                {!isOwn && (
                  <span className="text-xs text-slate-400 px-1">{msg.sender_name || 'Staff'}</span>
                )}
                <div className={`px-4 py-3 rounded-2xl text-sm ${isOwn
                  ? 'bg-brand-600 text-white rounded-br-sm'
                  : 'bg-slate-100 text-slate-800 rounded-bl-sm'}`}>
                  {msg.body}
                  {msg.attachment_url && (
                    <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer"
                      className={`flex items-center gap-1.5 mt-2 text-xs underline ${isOwn ? 'text-brand-200' : 'text-brand-600'}`}>
                      <Paperclip size={11} /> {msg.attachment_name || 'Attachment'}
                    </a>
                  )}
                </div>
                <div className={`flex items-center gap-1 text-xs text-slate-400 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                  <span>{relativeTime(msg.created_at)}</span>
                  {isOwn && (
                    msg.is_read_by_staff
                      ? <CheckCheck size={11} className="text-brand-500" />
                      : <Check size={11} />
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply box */}
      <div className="p-4 border-t border-slate-100 flex-shrink-0">
        <div className="flex gap-2 items-end">
          <textarea value={reply} onChange={e => setReply(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            rows={2} placeholder="Type a message... (Enter to send)"
            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          <button onClick={handleSend} disabled={!reply.trim() || sending}
            className="p-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white rounded-xl transition-colors flex-shrink-0">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── New Message Modal ──────────────────────────────────────────
function NewMessageModal({ resident, orgId, profile, onClose, onSent }) {
  const fileRef = useRef()
  const [form, setForm] = useState({ subject: '', body: '', to_department: 'nursing' })
  const [file, setFile] = useState(null)
  const [sending, setSending] = useState(false)
  const [error, setError]    = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  const handleSend = async () => {
    if (!form.body.trim()) { setError('Message body is required'); return }
    setSending(true)

    let attachmentUrl = null, attachmentName = null, attachmentType = null
    if (file) {
      const ext  = file.name.split('.').pop()
      const path = `messages/${orgId}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('announcement-images').upload(path, file)
      if (!upErr) {
        const { data } = supabase.storage.from('announcement-images').getPublicUrl(path)
        attachmentUrl  = data.publicUrl
        attachmentName = file.name
        attachmentType = file.type.startsWith('image') ? 'image' : 'document'
      }
    }

    const msgId = crypto.randomUUID()
    const { error: err } = await supabase.from('messages').insert({
      id:              msgId,
      thread_id:       msgId,
      organization_id: orgId,
      resident_id:     resident.id,
      sender_id:       profile.id,
      sender_type:     'family',
      to_department:   form.to_department,
      subject:         form.subject || null,
      body:            form.body,
      attachment_url:  attachmentUrl,
      attachment_name: attachmentName,
      attachment_type: attachmentType,
      is_read_by_family: true,
    })

    if (err) { setError(err.message); setSending(false); return }
    onSent()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800">New Message</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Send To Department</label>
            <div className="flex flex-wrap gap-2">
              {DEPARTMENTS.map(d => (
                <button key={d.key} onClick={() => set('to_department', d.key)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${form.to_department === d.key ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-200 text-slate-600 hover:border-brand-300'}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Subject (optional)</label>
            <input value={form.subject} onChange={e => set('subject', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Question about medications" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Message *</label>
            <textarea value={form.body} onChange={e => set('body', e.target.value)} rows={5}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder={`Write your message to the ${DEPARTMENTS.find(d=>d.key===form.to_department)?.label || 'Staff'} team...`} />
          </div>
          {/* Attachment */}
          <div>
            {file ? (
              <div className="flex items-center gap-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <Paperclip size={14} className="text-green-600" />
                <span className="text-sm text-green-700 flex-1 truncate">{file.name}</span>
                <button onClick={() => setFile(null)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
              </div>
            ) : (
              <button onClick={() => fileRef.current.click()}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-brand-600 transition-colors">
                <Paperclip size={13} /> Attach a file (photo or document)
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFile} />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
          <button onClick={handleSend} disabled={sending}
            className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            <Send size={14} /> {sending ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Family Portal ─────────────────────────────────────────
export default function FamilyPortal() {
  const { profile, organization, signOut } = useAuth()
  const navigate = useNavigate()
  const [residents, setResidents]     = useState([])  // linked residents
  const [selectedResident, setSelectedResident] = useState(null)
  const [updates, setUpdates]         = useState([])
  const [messages, setMessages]       = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [activities, setActivities]   = useState([])
  const [threads, setThreads]         = useState([])  // grouped messages
  const [activeThread, setActiveThread] = useState(null)
  const [loading, setLoading]         = useState(true)
  const [tab, setTab]                 = useState('updates')
  const [showNewMsg, setShowNewMsg]   = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => { if (profile?.id) fetchLinkedResidents() }, [profile?.id])
  useEffect(() => { if (selectedResident) fetchResidentData() }, [selectedResident])

  async function fetchLinkedResidents() {
    const { data: links, error } = await supabase
      .from('family_resident_links')
      .select('*, residents(*)')
      .eq('family_user_id', profile.id)
    if (error) { console.error('family links error', error); setLoading(false); return }
    const linked = links?.filter(l => l.residents)?.map(l => ({ ...l.residents, link: l })) || []
    setResidents(linked)
    if (linked.length > 0) setSelectedResident(linked[0])
    else setLoading(false)
  }

  async function fetchResidentData() {
    setLoading(true)
    const now     = new Date().toISOString()
    const todayStr = new Date().toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]

    const [updatesRes, msgsRes, annRes, actRes] = await Promise.all([
      supabase.from('resident_updates').select('*, profiles(first_name,last_name,role)')
        .eq('resident_id', selectedResident.id)
        .eq('is_family_visible', true).eq('is_active', true)
        .order('created_at', { ascending: false }).limit(30),
      supabase.from('messages').select('*')
        .eq('organization_id', organization?.id || profile?.organization_id)
        .eq('resident_id', selectedResident.id)
        .eq('is_active', true)
        .order('created_at'),
      supabase.from('announcements').select('*')
        .eq('organization_id', organization?.id || profile?.organization_id)
        .eq('is_active', true)
        .lte('starts_at', now)
        .or(`expires_at.is.null,expires_at.gte.${now}`)
        .order('pinned', { ascending: false })
        .order('starts_at', { ascending: false }).limit(5),
      supabase.from('activities').select('*')
        .eq('organization_id', organization?.id || profile?.organization_id)
        .eq('is_active', true)
        .eq('show_on_portal', true)
        .gte('start_date', todayStr)
        .lte('start_date', nextWeek)
        .order('start_date').order('start_time').limit(10),
    ])

    setUpdates(updatesRes.data || [])
    setAnnouncements(annRes.data || [])
    setActivities(actRes.data || [])

    // Group messages into threads
    const msgList = msgsRes.data || []
    const threadMap = {}
    msgList.forEach(m => {
      const tid = m.thread_id || m.id
      if (!threadMap[tid]) threadMap[tid] = []
      threadMap[tid].push(m)
    })
    const threadList = Object.values(threadMap).sort((a,b) =>
      new Date(b[b.length-1].created_at) - new Date(a[a.length-1].created_at)
    )
    setThreads(threadList)

    // Count unread (staff replied but family hasn't read)
    const unread = msgList.filter(m => m.sender_type === 'staff' && !m.is_read_by_family).length
    setUnreadCount(unread)

    setLoading(false)
  }

  const handleReply = async (threadId, body) => {
    const parentThread = threads.find(t => t[0].thread_id === threadId || t[0].id === threadId)
    const first = parentThread?.[0]
    await supabase.from('messages').insert({
      thread_id:       threadId,
      organization_id: organization?.id || profile?.organization_id,
      resident_id:     selectedResident.id,
      sender_id:       profile.id,
      sender_type:     'family',
      to_department:   first?.to_department,
      subject:         first?.subject,
      body,
      is_read_by_family: true,
    })
    // Mark staff messages as read
    await supabase.from('messages')
      .update({ is_read_by_family: true, read_by_family_at: new Date().toISOString() })
      .eq('thread_id', threadId).eq('sender_type', 'staff')
    fetchResidentData()
  }

  const handleNewMsgSent = () => {
    setShowNewMsg(false)
    fetchResidentData()
    setTab('messages')
  }

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  if (loading && residents.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400">Loading your family portal...</div>
      </div>
    )
  }

  if (!selectedResident && !loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Heart size={40} className="text-slate-300 mx-auto mb-4" />
          <h2 className="font-display text-xl font-semibold text-slate-800 mb-2">No Residents Linked</h2>
          <p className="text-slate-500 text-sm">Your account hasn't been linked to a resident yet. Please contact the facility.</p>
          <button onClick={handleSignOut} className="mt-6 px-5 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium">Sign Out</button>
        </div>
      </div>
    )
  }

  const fmt12 = (t) => {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hour = parseInt(h)
    return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
  }

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: '"Source Sans 3", system-ui, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="bg-brand-950 px-5 py-4 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center">
              <Heart size={16} className="text-white" />
            </div>
            <div>
              <div className="text-white text-sm font-semibold" style={{ fontFamily: '"Playfair Display", serif' }}>
                {organization?.name}
              </div>
              <div className="text-brand-400 text-xs">Family Portal</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={() => setTab('messages')}
                className="relative p-2 text-brand-400 hover:text-white transition-colors">
                <MessageSquare size={18} />
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              </button>
            )}
            <button onClick={handleSignOut} className="p-2 text-brand-400 hover:text-red-400 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {/* Resident selector (if multiple) */}
        {residents.length > 1 && (
          <div className="flex gap-2 mb-5 overflow-x-auto">
            {residents.map(r => (
              <button key={r.id} onClick={() => setSelectedResident(r)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${selectedResident?.id === r.id ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-200 text-slate-600'}`}>
                {r.first_name} {r.last_name}
              </button>
            ))}
          </div>
        )}

        {/* Resident card */}
        {selectedResident && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-700 text-xl font-bold flex-shrink-0" style={{ fontFamily: '"Playfair Display", serif' }}>
                {selectedResident.first_name?.[0]}
              </div>
              <div className="flex-1">
                <h2 className="font-display font-semibold text-slate-800 text-lg">
                  {selectedResident.first_name} {selectedResident.last_name}
                </h2>
                <div className="text-slate-500 text-sm capitalize">{selectedResident.care_level?.replace('_',' ')} · Room {selectedResident.room_number || 'TBD'}</div>
                <div className="text-slate-400 text-xs mt-0.5 capitalize">
                  Your relationship: {selectedResident.link?.relationship || 'Family'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Status</div>
                <div className={`text-sm font-semibold mt-0.5 ${selectedResident.is_active ? 'text-green-600' : 'text-slate-400'}`}>
                  {selectedResident.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl mb-5">
          {[
            { key: 'updates',       label: 'Updates',      badge: updates.length },
            { key: 'messages',      label: 'Messages',     badge: unreadCount },
            { key: 'activities',    label: 'Activities',   badge: null },
            { key: 'announcements', label: 'Notices',      badge: null },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all relative ${tab === t.key ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}>
              {t.label}
              {t.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {t.badge > 9 ? '9+' : t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading...</div>
        ) : (
          <>
            {/* ── UPDATES TAB ── */}
            {tab === 'updates' && (
              <div className="space-y-3">
                {updates.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Bell size={32} className="mx-auto mb-3 opacity-30" />
                    <p>No updates yet. Check back soon.</p>
                  </div>
                ) : updates.map(u => {
                  const config = UPDATE_ICONS[u.category] || UPDATE_ICONS.general
                  const Icon   = config.icon
                  return (
                    <div key={u.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 ${config.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <Icon size={16} className={config.color} />
                        </div>
                        <div className="flex-1">
                          {u.title && <div className="font-semibold text-slate-800 text-sm mb-1">{u.title}</div>}
                          <p className="text-slate-600 text-sm leading-relaxed">{u.body}</p>
                          {u.photo_url && (
                            <img src={u.photo_url} alt="" className="mt-3 rounded-xl w-full object-cover max-h-48" />
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

            {/* ── MESSAGES TAB ── */}
            {tab === 'messages' && (
              <div className="space-y-3">
                <div className="flex justify-end mb-2">
                  <button onClick={() => setShowNewMsg(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
                    <Plus size={14} /> New Message
                  </button>
                </div>

                {activeThread ? (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" style={{ height: '60vh' }}>
                    <MessageThread
                      thread={activeThread}
                      profile={profile}
                      onReply={(body) => handleReply(activeThread[0].thread_id || activeThread[0].id, body)}
                      onClose={() => { setActiveThread(null); fetchResidentData() }} />
                  </div>
                ) : (
                  threads.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
                      <p>No messages yet.</p>
                      <p className="text-sm mt-1">Send a message to the care team.</p>
                    </div>
                  ) : (
                    threads.map(thread => {
                      const last   = thread[thread.length - 1]
                      const first  = thread[0]
                      const dept   = DEPARTMENTS.find(d => d.key === first.to_department)
                      const unread = thread.filter(m => m.sender_type === 'staff' && !m.is_read_by_family).length
                      return (
                        <button key={first.id} onClick={() => setActiveThread(thread)}
                          className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-left hover:shadow-md hover:border-brand-200 transition-all">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="w-9 h-9 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <MessageSquare size={15} className="text-brand-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-semibold truncate ${unread > 0 ? 'text-slate-900' : 'text-slate-700'}`}>
                                    {first.subject || `Message to ${dept?.label || 'Staff'}`}
                                  </span>
                                  {unread > 0 && <span className="w-2 h-2 bg-brand-600 rounded-full flex-shrink-0" />}
                                </div>
                                <p className="text-xs text-slate-400 truncate mt-0.5">{last.body}</p>
                                <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                                  <span className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">{dept?.label || 'Staff'}</span>
                                  <span>{relativeTime(last.created_at)}</span>
                                  <span>{thread.length} message{thread.length !== 1 ? 's' : ''}</span>
                                </div>
                              </div>
                            </div>
                            <ChevronRight size={16} className="text-slate-300 flex-shrink-0 mt-1" />
                          </div>
                        </button>
                      )
                    })
                  )
                )}
              </div>
            )}

            {/* ── ACTIVITIES TAB ── */}
            {tab === 'activities' && (
              <div className="space-y-3">
                {activities.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Activity size={32} className="mx-auto mb-3 opacity-30" />
                    <p>No upcoming activities this week.</p>
                  </div>
                ) : activities.map(a => {
                  const isToday = a.start_date === new Date().toISOString().split('T')[0]
                  return (
                    <div key={a.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${isToday ? 'border-brand-200' : 'border-slate-100'}`}>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: a.color || '#0c90e1' }} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800 text-sm">{a.title}</span>
                            {isToday && <span className="text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-medium">Today</span>}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {new Date(a.start_date+'T12:00:00').toLocaleDateString('en-US',{ weekday:'short',month:'short',day:'numeric' })}
                            {a.start_time && ` · ${fmt12(a.start_time)}`}
                            {a.location && ` · ${a.location}`}
                          </div>
                          {a.description && <p className="text-xs text-slate-500 mt-1">{a.description}</p>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── ANNOUNCEMENTS TAB ── */}
            {tab === 'announcements' && (
              <div className="space-y-3">
                {announcements.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Bell size={32} className="mx-auto mb-3 opacity-30" />
                    <p>No announcements at this time.</p>
                  </div>
                ) : announcements.map(a => (
                  <div key={a.id} className={`bg-white rounded-2xl border shadow-sm p-5 ${a.pinned ? 'border-amber-200' : 'border-slate-100'}`}>
                    {a.pinned && <div className="text-xs text-amber-600 font-semibold mb-2 flex items-center gap-1"><Star size={11} className="fill-amber-400 text-amber-400" /> Pinned</div>}
                    <h3 className="font-semibold text-slate-800 text-sm mb-1">{a.title}</h3>
                    {a.body && <p className="text-slate-600 text-sm leading-relaxed">{a.body}</p>}
                    {a.image_url && <img src={a.image_url} alt="" className="mt-3 rounded-xl w-full object-cover max-h-40" />}
                    <div className="text-xs text-slate-400 mt-3">
                      {new Date(a.starts_at).toLocaleDateString('en-US',{ month:'short', day:'numeric', year:'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showNewMsg && selectedResident && (
        <NewMessageModal
          resident={selectedResident}
          orgId={organization?.id || profile?.organization_id}
          profile={profile}
          onClose={() => setShowNewMsg(false)}
          onSent={handleNewMsgSent} />
      )}
    </div>
  )
}
