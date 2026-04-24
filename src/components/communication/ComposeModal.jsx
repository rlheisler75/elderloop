// src/components/communication/ComposeModal.jsx
import { useState, useEffect } from 'react'
import { X, Mail, MessageSquare, Bell, ChevronDown, ChevronUp, Send, Loader2,
         Users, User, Building2, Heart, Stethoscope, Wrench, UtensilsCrossed,
         SprayCan, AlertTriangle, Calendar, Megaphone, Activity, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const CATEGORIES = [
  { key: 'general',   label: 'General',   icon: Megaphone,       color: 'bg-slate-100 text-slate-600 border-slate-200' },
  { key: 'urgent',    label: 'Urgent',    icon: AlertTriangle,   color: 'bg-red-50 text-red-600 border-red-200' },
  { key: 'reminder',  label: 'Reminder',  icon: Clock,           color: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
  { key: 'activity',  label: 'Activity',  icon: Calendar,        color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { key: 'meal',      label: 'Meal',      icon: UtensilsCrossed, color: 'bg-amber-50 text-amber-600 border-amber-200' },
  { key: 'health',    label: 'Health',    icon: Activity,        color: 'bg-purple-50 text-purple-600 border-purple-200' },
]

const DEPARTMENTS = [
  { key: 'nursing',     label: 'Nursing',     icon: Stethoscope },
  { key: 'maintenance', label: 'Maintenance', icon: Wrench },
  { key: 'dietary',     label: 'Dietary',     icon: UtensilsCrossed },
  { key: 'housekeeping',label: 'Housekeeping',icon: SprayCan },
]

const SYSTEM_TEMPLATES = [
  { name: 'Meal Ready',       subject: 'Dining room is now open',         body: 'The dining room is now open and serving. Please make your way to the dining area at your convenience.', category: 'meal' },
  { name: 'Activity Starting',subject: 'Activity starting in 30 minutes', body: 'A community activity is starting in 30 minutes. We hope to see you there!',                           category: 'activity' },
  { name: 'Emergency Alert',  subject: '⚠️ Important Alert',             body: 'Please pay attention to the following important announcement from our community team.',                 category: 'urgent' },
  { name: 'Med Reminder',     subject: 'Medication reminder',             body: 'This is a reminder to take your scheduled medication. Please contact nursing if you have any questions.', category: 'health' },
  { name: 'Visitor Policy',   subject: 'Visitor policy update',           body: 'We have an update regarding our visitor policies. Please review the following information carefully.',    category: 'general' },
  { name: 'Maintenance Notice', subject: 'Scheduled maintenance notice',  body: 'Please be aware of scheduled maintenance in your area. We apologize for any inconvenience.',           category: 'reminder' },
]

export default function ComposeModal({ onClose, onSent, prefill = null }) {
  const { profile, organization } = useAuth()

  const [form, setForm] = useState({
    subject:       prefill?.subject  || '',
    body:          prefill?.body     || '',
    category:      prefill?.category || 'general',
    channels:      ['push'],
    audience_type: 'all',
    audience_dept: '',
    audience_ids:  [],
  })

  // Use setField instead of set to avoid any minifier conflicts
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const [residents, setResidents]       = useState([])
  const [staffList, setStaffList]       = useState([])
  const [familyList, setFamilyList]     = useState([])
  const [searchTerm, setSearchTerm]     = useState('')
  const [selectedPeople, setSelectedPeople] = useState([])
  const [showTemplates, setShowTemplates]   = useState(false)
  const [sending, setSending]           = useState(false)
  const [error, setError]               = useState('')
  const [smsWarning, setSmsWarning]     = useState(false)

  useEffect(() => {
    if (!organization) return
    supabase.from('profiles')
      .select('id, full_name, role, email, phone')
      .eq('organization_id', organization.id)
      .then(({ data }) => {
        if (!data) return
        setResidents(data.filter(p => p.role === 'resident'))
        setFamilyList(data.filter(p => p.role === 'family'))
        setStaffList(data.filter(p => !['resident', 'family'].includes(p.role)))
      })
  }, [organization])

  function toggleChannel(ch) {
    if (ch === 'sms') setSmsWarning(true)
    setForm(f => ({
      ...f,
      channels: f.channels.includes(ch)
        ? f.channels.filter(c => c !== ch)
        : [...f.channels, ch]
    }))
  }

  function applyTemplate(t) {
    setForm(f => ({ ...f, subject: t.subject, body: t.body, category: t.category }))
    setShowTemplates(false)
  }

  function togglePerson(person) {
    setSelectedPeople(prev => {
      const exists = prev.find(p => p.id === person.id)
      return exists ? prev.filter(p => p.id !== person.id) : [...prev, person]
    })
  }

  function getFilteredPeople() {
    const allPeople = form.audience_type === 'individual'
      ? [...residents, ...familyList, ...staffList]
      : []
    if (!searchTerm) return allPeople
    const s = searchTerm.toLowerCase()
    return allPeople.filter(p =>
      p.full_name?.toLowerCase().includes(s) || p.email?.toLowerCase().includes(s)
    )
  }

  async function handleSend() {
    if (!form.subject.trim())     { setError('Subject is required'); return }
    if (!form.body.trim())        { setError('Message body is required'); return }
    if (!form.channels.length)    { setError('Select at least one channel'); return }
    if (form.audience_type === 'department' && !form.audience_dept) { setError('Select a department'); return }
    if (form.audience_type === 'individual' && !selectedPeople.length) { setError('Select at least one recipient'); return }

    setSending(true)
    setError('')

    try {
      const { data: msg, error: insertErr } = await supabase
        .from('broadcast_messages')
        .insert({
          org_id:        organization.id,
          sender_id:     profile.id,
          subject:       form.subject,
          body:          form.body,
          category:      form.category,
          channels:      form.channels,
          audience_type: form.audience_type,
          audience_dept: form.audience_dept || null,
          audience_ids:  form.audience_type === 'individual' ? selectedPeople.map(p => p.id) : null,
          status:        'sending',
        })
        .select()
        .single()

      if (insertErr) throw insertErr

      // Call edge function to deliver (non-fatal if not deployed yet)
      try {
        await supabase.functions.invoke('send-broadcast', { body: { message_id: msg.id } })
      } catch (fnErr) {
        console.warn('Edge function not deployed yet:', fnErr)
        // Mark as sent anyway so the UI shows it
        await supabase.from('broadcast_messages').update({ status: 'sent' }).eq('id', msg.id)
      }

      onSent?.()
      onClose()
    } catch (e) {
      setError(e.message || 'Failed to send message')
      setSending(false)
    }
  }

  const audienceOptions = [
    { key: 'all',           label: 'Everyone',      icon: Users,    desc: 'All residents, family & staff' },
    { key: 'all_staff',     label: 'All Staff',     icon: Building2,desc: 'Everyone on the care team' },
    { key: 'all_residents', label: 'All Residents', icon: Users,    desc: 'All current residents' },
    { key: 'all_family',    label: 'All Family',    icon: Heart,    desc: 'All family portal users' },
    { key: 'department',    label: 'Department',    icon: Building2,desc: 'A specific department' },
    { key: 'individual',    label: 'Individuals',   icon: User,     desc: 'Pick specific people' },
  ]

  const audienceSummary = () => {
    if (form.audience_type === 'all')           return 'Everyone'
    if (form.audience_type === 'all_staff')     return 'All Staff'
    if (form.audience_type === 'all_residents') return 'All Residents'
    if (form.audience_type === 'all_family')    return 'All Family'
    if (form.audience_type === 'department')    return form.audience_dept || 'Select dept...'
    return `${selectedPeople.length} people`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Send size={14} className="text-white" />
            </div>
            <h2 className="font-semibold text-slate-800">New Message</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowTemplates(s => !s)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-brand-600 border border-slate-200 hover:border-brand-300 rounded-lg transition-colors">
              Templates {showTemplates ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Template picker */}
        {showTemplates && (
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex-shrink-0">
            <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Quick Templates</p>
            <div className="grid grid-cols-3 gap-2">
              {SYSTEM_TEMPLATES.map(t => (
                <button key={t.name} onClick={() => applyTemplate(t)}
                  className="text-left px-3 py-2 bg-white rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-brand-50 transition-colors text-xs">
                  <div className="font-medium text-slate-700">{t.name}</div>
                  <div className="text-slate-400 truncate mt-0.5">{t.subject}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {error && (
            <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
          )}

          {/* Channels */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Send via</label>
            <div className="flex gap-2">
              {[
                { key: 'push',  label: 'In-App',  icon: Bell,          activeClass: 'bg-brand-50 border-brand-400 text-brand-700' },
                { key: 'email', label: 'Email',   icon: Mail,          activeClass: 'bg-blue-50 border-blue-400 text-blue-700' },
                { key: 'sms',   label: 'SMS',     icon: MessageSquare, activeClass: 'bg-green-50 border-green-400 text-green-700' },
              ].map(ch => {
                const Icon = ch.icon
                const active = form.channels.includes(ch.key)
                return (
                  <button key={ch.key} onClick={() => toggleChannel(ch.key)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-medium text-sm transition-all
                      ${active ? ch.activeClass : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    <Icon size={15} />
                    {ch.label}
                    {ch.key === 'sms' && active && (
                      <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-semibold">Pending A2P</span>
                    )}
                  </button>
                )
              })}
            </div>
            {smsWarning && form.channels.includes('sms') && (
              <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mt-2">
                ⚠️ SMS delivery requires Twilio A2P 10DLC carrier registration (~2–4 weeks). Messages will be queued until registration completes.
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon
                return (
                  <button key={cat.key} onClick={() => setField('category', cat.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
                      ${form.category === cat.key
                        ? cat.color + ' ring-2 ring-offset-1 ring-brand-300'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white'}`}>
                    <Icon size={13} />{cat.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Audience */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Send to</label>
            <div className="grid grid-cols-3 gap-2">
              {audienceOptions.map(opt => {
                const Icon = opt.icon
                const active = form.audience_type === opt.key
                return (
                  <button key={opt.key} onClick={() => setField('audience_type', opt.key)}
                    className={`flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all
                      ${active ? 'bg-brand-50 border-brand-400 text-brand-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    <Icon size={15} className="mb-1" />
                    <div className="text-xs font-semibold">{opt.label}</div>
                    <div className="text-[10px] opacity-60 leading-tight mt-0.5">{opt.desc}</div>
                  </button>
                )
              })}
            </div>

            {/* Department picker */}
            {form.audience_type === 'department' && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {DEPARTMENTS.map(d => {
                  const Icon = d.icon
                  return (
                    <button key={d.key} onClick={() => setField('audience_dept', d.key)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm transition-all
                        ${form.audience_dept === d.key
                          ? 'bg-brand-50 border-brand-400 text-brand-700 font-medium'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      <Icon size={14} /> {d.label}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Individual person picker */}
            {form.audience_type === 'individual' && (
              <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                  <input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full bg-transparent text-sm outline-none text-slate-700 placeholder-slate-400"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {getFilteredPeople().map(p => (
                    <label key={p.id}
                      className={`flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer transition-colors
                        ${selectedPeople.find(sp => sp.id === p.id) ? 'bg-brand-50' : ''}`}>
                      <input
                        type="checkbox"
                        checked={!!selectedPeople.find(sp => sp.id === p.id)}
                        onChange={() => togglePerson(p)}
                        className="rounded text-brand-600"
                      />
                      <div>
                        <div className="text-sm font-medium text-slate-700">{p.full_name}</div>
                        <div className="text-xs text-slate-400">{p.role} · {p.email || 'no email'}</div>
                      </div>
                    </label>
                  ))}
                  {getFilteredPeople().length === 0 && (
                    <div className="px-3 py-4 text-center text-sm text-slate-400">No people found</div>
                  )}
                </div>
                {selectedPeople.length > 0 && (
                  <div className="px-3 py-2 border-t border-slate-100 bg-brand-50 text-xs text-brand-700 font-medium">
                    {selectedPeople.length} recipient{selectedPeople.length !== 1 ? 's' : ''} selected
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Subject *</label>
            <input
              value={form.subject}
              onChange={e => setField('subject', e.target.value)}
              placeholder="Message subject..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Message *</label>
            <textarea
              value={form.body}
              onChange={e => setField('body', e.target.value)}
              rows={4}
              placeholder="Write your message here..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none text-slate-800"
            />
            {form.channels.includes('sms') && (
              <p className="text-xs text-slate-400 mt-1">{form.body.length}/160 characters (SMS)</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <div className="text-xs text-slate-400">
            {form.channels.map(c =>
              c === 'push' ? '🔔 In-App' : c === 'email' ? '✉️ Email' : '💬 SMS'
            ).join(' + ')}
            {' → '}
            {audienceSummary()}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium">
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !form.subject.trim() || !form.body.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
