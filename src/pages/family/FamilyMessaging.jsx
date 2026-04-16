import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  MessageSquare, Send, X, Search, Filter, Check,
  CheckCheck, Heart, Bell, Camera, Award, Activity,
  UtensilsCrossed, Smile, Plus, Paperclip, Upload,
  ChevronRight, Users, Clock, RefreshCw, Eye
} from 'lucide-react'

const DEPARTMENTS = [
  { key: 'nursing',        label: 'Nursing' },
  { key: 'dietary',        label: 'Dietary' },
  { key: 'administration', label: 'Administration' },
  { key: 'activities',     label: 'Activities' },
  { key: 'social_work',    label: 'Social Work' },
]

const UPDATE_CATEGORIES = [
  { key: 'general',   label: 'General',   icon: Bell },
  { key: 'mood',      label: 'Mood',      icon: Smile },
  { key: 'activity',  label: 'Activity',  icon: Activity },
  { key: 'meal',      label: 'Meal',      icon: UtensilsCrossed },
  { key: 'health',    label: 'Health',    icon: Heart },
  { key: 'photo',     label: 'Photo',     icon: Camera },
  { key: 'milestone', label: 'Milestone', icon: Award },
]

const relativeTime = (ts) => {
  const diff = Date.now() - new Date(ts)
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24)  return `${hrs}h ago`
  if (days < 7)  return `${days}d ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Post Resident Update Modal ─────────────────────────────────
function PostUpdateModal({ residents, orgId, profile, onClose, onSaved }) {
  const fileRef = useRef()
  const [form, setForm] = useState({ resident_id: '', category: 'general', title: '', body: '', is_family_visible: true })
  const [photoUrl, setPhotoUrl]     = useState('')
  const [uploading, setUploading]   = useState(false)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    const path = `resident-updates/${orgId}/${Date.now()}.${file.name.split('.').pop()}`
    const { error: upErr } = await supabase.storage.from('announcement-images').upload(path, file)
    if (!upErr) {
      const { data } = supabase.storage.from('announcement-images').getPublicUrl(path)
      setPhotoUrl(data.publicUrl)
    }
    setUploading(false)
  }

  const handleSave = async () => {
    if (!form.resident_id) { setError('Select a resident'); return }
    if (!form.body.trim()) { setError('Update body is required'); return }
    setSaving(true)
    const { error: err } = await supabase.from('resident_updates').insert({
      ...form,
      organization_id: orgId,
      posted_by: profile.id,
      photo_url: photoUrl || null,
      is_active: true,
    })
    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  const CatIcon = UPDATE_CATEGORIES.find(c => c.key === form.category)?.icon || Bell

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800">Post Resident Update</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Resident *</label>
            <select value={form.resident_id} onChange={e => set('resident_id', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">Select resident</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              {UPDATE_CATEGORIES.map(c => {
                const Icon = c.icon
                return (
                  <button key={c.key} onClick={() => set('category', c.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${form.category === c.key ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-200 text-slate-600 hover:border-brand-300'}`}>
                    <Icon size={11} /> {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Title (optional)</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Great Day Today" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Update *</label>
            <textarea value={form.body} onChange={e => set('body', e.target.value)} rows={4}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Share what's happening with the resident today..." />
          </div>

          {/* Photo */}
          <div>
            {photoUrl ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={photoUrl} alt="" className="w-full max-h-40 object-cover" />
                <button onClick={() => setPhotoUrl('')}
                  className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current.click()} disabled={uploading}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors">
                <Camera size={15} /> {uploading ? 'Uploading...' : 'Add Photo (optional)'}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </div>

          <label className={`flex items-start gap-3 cursor-pointer p-3 rounded-xl border-2 transition-all ${form.is_family_visible ? 'bg-green-50 border-green-200' : 'border-slate-200'}`}>
            <input type="checkbox" checked={form.is_family_visible} onChange={e => set('is_family_visible', e.target.checked)} className="w-4 h-4 rounded text-brand-600 mt-0.5" />
            <div>
              <div className="font-medium text-slate-800 text-sm">Visible to Family</div>
              <div className="text-xs text-slate-400 mt-0.5">Family members will see this update in their portal</div>
            </div>
          </label>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Posting...' : 'Post Update'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Family Messaging (Staff Side) ─────────────────────────
export default function FamilyMessaging() {
  const { profile, organization } = useAuth()
  const fileRef = useRef()
  const [threads, setThreads]       = useState([])
  const [residents, setResidents]   = useState([])
  const [updates, setUpdates]       = useState([])
  const [activeThread, setActiveThread] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('messages') // 'messages' | 'updates'
  const [filterDept, setFilterDept] = useState('all')
  const [reply, setReply]           = useState('')
  const [sending, setSending]       = useState(false)
  const [showPostUpdate, setShowPostUpdate] = useState(false)
  const [attachment, setAttachment] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => { if (organization) fetchAll() }, [organization])

  async function fetchAll() {
    setLoading(true)
    const [msgsRes, residentsRes, updatesRes] = await Promise.all([
      supabase.from('messages').select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('created_at'),
      supabase.from('residents').select('id,first_name,last_name,room_number,care_level')
        .eq('organization_id', organization.id)
        .eq('is_active', true).order('last_name'),
      supabase.from('resident_updates')
        .select('*, profiles(first_name,last_name), residents(first_name,last_name)')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false }).limit(50),
    ])

    const msgList = msgsRes.data || []

    // Group into threads
    const threadMap = {}
    msgList.forEach(m => {
      const tid = m.thread_id || m.id
      if (!threadMap[tid]) threadMap[tid] = []
      threadMap[tid].push(m)
    })

    let threadList = Object.values(threadMap)
      .sort((a,b) => new Date(b[b.length-1].created_at) - new Date(a[a.length-1].created_at))

    // Filter by dept
    if (filterDept !== 'all') {
      threadList = threadList.filter(t => t[0].to_department === filterDept)
    }

    setThreads(threadList)
    setResidents(residentsRes.data || [])
    setUpdates(updatesRes.data || [])

    // Count unread from family
    const unread = msgList.filter(m => m.sender_type === 'family' && !m.is_read_by_staff).length
    setUnreadCount(unread)

    // Refresh active thread
    if (activeThread) {
      const tid = activeThread[0].thread_id || activeThread[0].id
      const refreshed = threadMap[tid]
      if (refreshed) setActiveThread(refreshed)
    }

    setLoading(false)
  }

  useEffect(() => { if (organization) fetchAll() }, [filterDept])

  const handleOpenThread = async (thread) => {
    setActiveThread(thread)
    // Mark family messages as read
    const tid = thread[0].thread_id || thread[0].id
    await supabase.from('messages')
      .update({ is_read_by_staff: true, read_by_staff_at: new Date().toISOString() })
      .eq('thread_id', tid).eq('sender_type', 'family')
    fetchAll()
  }

  const handleReply = async () => {
    if (!reply.trim() || !activeThread) return
    setSending(true)
    const first = activeThread[0]

    let attachmentUrl = null, attachmentName = null, attachmentType = null
    if (attachment) {
      const ext  = attachment.name.split('.').pop()
      const path = `messages/${organization.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('announcement-images').upload(path, attachment)
      if (!upErr) {
        const { data } = supabase.storage.from('announcement-images').getPublicUrl(path)
        attachmentUrl  = data.publicUrl
        attachmentName = attachment.name
        attachmentType = attachment.type.startsWith('image') ? 'image' : 'document'
      }
    }

    await supabase.from('messages').insert({
      thread_id:       first.thread_id || first.id,
      organization_id: organization.id,
      resident_id:     first.resident_id,
      sender_id:       profile.id,
      sender_type:     'staff',
      to_department:   first.to_department,
      subject:         first.subject,
      body:            reply,
      attachment_url:  attachmentUrl,
      attachment_name: attachmentName,
      attachment_type: attachmentType,
      is_read_by_staff: true,
    })

    setReply(''); setAttachment(null); setSending(false)
    fetchAll()
  }

  const residentMap = Object.fromEntries(residents.map(r => [r.id, r]))

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800">Family Communication</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage family messages and resident updates</p>
        </div>
        <button onClick={() => setShowPostUpdate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={15} /> Post Resident Update
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Unread Messages',   value: unreadCount, color: unreadCount > 0 ? 'text-red-600' : 'text-slate-400', bg: unreadCount > 0 ? 'bg-red-50' : 'bg-slate-100' },
          { label: 'Total Threads',     value: threads.length, color: 'text-brand-600', bg: 'bg-brand-50' },
          { label: 'Updates Posted',    value: updates.length, color: 'text-green-600',  bg: 'bg-green-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
            <div className={`text-3xl font-display font-bold ${s.color}`}>{s.value}</div>
            <div className="text-slate-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-5 w-fit">
        {[{ key:'messages',label:`Messages${unreadCount > 0 ? ` (${unreadCount})` : ''}`},{ key:'updates',label:'Resident Updates'}].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* MESSAGES */}
      {tab === 'messages' && (
        <div className="grid grid-cols-5 gap-5" style={{ height: '65vh' }}>
          {/* Thread list */}
          <div className="col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
            <div className="p-3 border-b border-slate-100 flex-shrink-0">
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="all">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            </div>
            <div className="flex-1 overflow-y-auto">
              {threads.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm p-4">
                  <MessageSquare size={24} className="mx-auto mb-2 opacity-30" />
                  No messages yet
                </div>
              ) : threads.map(thread => {
                const first   = thread[0]
                const last    = thread[thread.length - 1]
                const dept    = DEPARTMENTS.find(d => d.key === first.to_department)
                const unread  = thread.filter(m => m.sender_type === 'family' && !m.is_read_by_staff).length
                const res     = residentMap[first.resident_id]
                const isActive = activeThread?.[0]?.id === first.id
                return (
                  <button key={first.id} onClick={() => handleOpenThread(thread)}
                    className={`w-full p-4 text-left border-b border-slate-50 hover:bg-slate-50 transition-colors ${isActive ? 'bg-brand-50 border-l-4 border-l-brand-600' : ''}`}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className={`text-sm font-semibold truncate ${unread > 0 ? 'text-slate-900' : 'text-slate-600'}`}>
                        {first.subject || `Message to ${dept?.label || 'Staff'}`}
                      </span>
                      {unread > 0 && <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1" />}
                    </div>
                    <p className="text-xs text-slate-400 truncate mb-1">{last.body}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      {res && <span className="font-medium text-slate-500">{res.first_name} {res.last_name}</span>}
                      <span>·</span>
                      <span>{dept?.label}</span>
                      <span>·</span>
                      <span>{relativeTime(last.created_at)}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Thread detail */}
          <div className="col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
            {!activeThread ? (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <MessageSquare size={40} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">Select a conversation to read and reply</p>
                </div>
              </div>
            ) : (
              <>
                {/* Thread header */}
                <div className="p-4 border-b border-slate-100 flex-shrink-0">
                  <div className="font-semibold text-slate-800 text-sm">{activeThread[0].subject || 'Message Thread'}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {DEPARTMENTS.find(d => d.key === activeThread[0].to_department)?.label} ·
                    Resident: {residentMap[activeThread[0].resident_id]?.first_name} {residentMap[activeThread[0].resident_id]?.last_name} ·
                    {activeThread.length} message{activeThread.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {activeThread.map(msg => {
                    const isStaff = msg.sender_type === 'staff'
                    return (
                      <div key={msg.id} className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] flex flex-col gap-1 ${isStaff ? 'items-end' : 'items-start'}`}>
                          {!isStaff && <span className="text-xs text-slate-400 px-1">Family Member</span>}
                          <div className={`px-4 py-3 rounded-2xl text-sm ${isStaff ? 'bg-brand-600 text-white rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm'}`}>
                            {msg.body}
                            {msg.attachment_url && (
                              <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer"
                                className={`flex items-center gap-1.5 mt-2 text-xs underline ${isStaff ? 'text-brand-200' : 'text-brand-600'}`}>
                                <Paperclip size={11} /> {msg.attachment_name || 'Attachment'}
                              </a>
                            )}
                          </div>
                          <div className={`flex items-center gap-1 text-xs text-slate-400 px-1 ${isStaff ? 'flex-row-reverse' : ''}`}>
                            <span>{relativeTime(msg.created_at)}</span>
                            {isStaff && (msg.is_read_by_family ? <CheckCheck size={11} className="text-brand-500" /> : <Check size={11} />)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Reply box */}
                <div className="p-4 border-t border-slate-100 flex-shrink-0">
                  {attachment && (
                    <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-xs">
                      <Paperclip size={12} className="text-green-600" />
                      <span className="flex-1 truncate text-green-700">{attachment.name}</span>
                      <button onClick={() => setAttachment(null)} className="text-slate-400 hover:text-red-500"><X size={12} /></button>
                    </div>
                  )}
                  <div className="flex gap-2 items-end">
                    <button onClick={() => fileRef.current.click()}
                      className="p-2 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors flex-shrink-0">
                      <Paperclip size={16} />
                    </button>
                    <textarea value={reply} onChange={e => setReply(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply() } }}
                      rows={2} placeholder="Reply to family... (Enter to send)"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
                    <button onClick={handleReply} disabled={!reply.trim() || sending}
                      className="p-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white rounded-xl transition-colors flex-shrink-0">
                      <Send size={16} />
                    </button>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx" className="hidden"
                    onChange={e => setAttachment(e.target.files?.[0] || null)} />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* UPDATES */}
      {tab === 'updates' && (
        <div className="space-y-3">
          {updates.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Bell size={32} className="mx-auto mb-3 opacity-30" />
              <p>No updates posted yet.</p>
            </div>
          ) : updates.map(u => {
            const config = {
              general:   { label: 'General',   color: 'bg-brand-100 text-brand-700' },
              mood:      { label: 'Mood',      color: 'bg-amber-100 text-amber-700' },
              activity:  { label: 'Activity',  color: 'bg-green-100 text-green-700' },
              meal:      { label: 'Meal',      color: 'bg-orange-100 text-orange-700' },
              health:    { label: 'Health',    color: 'bg-red-100 text-red-700' },
              photo:     { label: 'Photo',     color: 'bg-purple-100 text-purple-700' },
              milestone: { label: 'Milestone', color: 'bg-yellow-100 text-yellow-700' },
            }[u.category] || { label: 'General', color: 'bg-slate-100 text-slate-600' }
            return (
              <div key={u.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.color}`}>{config.label}</span>
                      <span className="text-xs text-slate-400">
                        {u.residents?.first_name} {u.residents?.last_name}
                      </span>
                      {!u.is_family_visible && <span className="text-xs text-slate-400 italic">— internal only</span>}
                    </div>
                    {u.title && <h3 className="font-semibold text-slate-800 text-sm mb-1">{u.title}</h3>}
                    <p className="text-slate-600 text-sm">{u.body}</p>
                    {u.photo_url && <img src={u.photo_url} alt="" className="mt-3 rounded-xl max-h-32 object-cover" />}
                    <div className="text-xs text-slate-400 mt-2">
                      Posted by {u.profiles?.first_name} {u.profiles?.last_name} · {relativeTime(u.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {u.is_family_visible
                      ? <span className="flex items-center gap-1 text-xs text-green-600"><Eye size={11} /> Visible</span>
                      : <span className="text-xs text-slate-400">Internal</span>
                    }
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showPostUpdate && (
        <PostUpdateModal
          residents={residents}
          orgId={organization.id}
          profile={profile}
          onClose={() => setShowPostUpdate(false)}
          onSaved={() => { setShowPostUpdate(false); fetchAll() }} />
      )}
    </div>
  )
}
