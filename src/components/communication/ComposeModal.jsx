// src/components/communication/ComposeModal.jsx
import { useState, useEffect } from 'react'
import { X, Mail, MessageSquare, Bell, ChevronDown, ChevronUp, Send, Loader2,
         Users, User, Building2, Heart, Stethoscope, Wrench, UtensilsCrossed,
         SprayCan, AlertTriangle, Calendar, Megaphone, Activity, Clock, Search } from 'lucide-react'
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
  { name: 'Meal Ready',        subject: 'Dining room is now open',         body: 'The dining room is now open and serving. Please make your way to the dining area at your convenience.', category: 'meal' },
  { name: 'Activity Starting', subject: 'Activity starting in 30 minutes', body: 'A community activity is starting in 30 minutes. We hope to see you there!',                           category: 'activity' },
  { name: 'Emergency Alert',   subject: '⚠️ Important Alert',             body: 'Please pay attention to the following important announcement from our community team.',                 category: 'urgent' },
  { name: 'Med Reminder',      subject: 'Medication reminder',             body: 'This is a reminder to take your scheduled medication. Please contact nursing if you have any questions.', category: 'health' },
  { name: 'Visitor Policy',    subject: 'Visitor policy update',           body: 'We have an update regarding our visitor policies. Please review the following information carefully.',   category: 'general' },
  { name: 'Maintenance Notice',subject: 'Scheduled maintenance notice',    body: 'Please be aware of scheduled maintenance in your area. We apologize for any inconvenience.',           category: 'reminder' },
]

const ROLE_LABELS = {
  org_admin: 'Admin', ceo: 'CEO', manager: 'Manager', supervisor: 'Supervisor',
  maintenance: 'Maintenance', dietary: 'Dietary', housekeeping: 'Housekeeping',
  nursing: 'Nursing', staff: 'Staff', family: 'Family',
}

export default function ComposeModal({ onClose, onSent, prefill = null }) {
  const { profile, organization } = useAuth()

  const [form, setForm] = useState({
    subject:       prefill?.subject  || '',
    body:          prefill?.body     || '',
    category:      prefill?.category || 'general',
    channels:      ['push'],
    audience_type: 'all',
    audience_dept: '',
  })

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const [staffList, setStaffList]           = useState([])
  const [residentList, setResidentList]     = useState([])
  const [familyList, setFamilyList]         = useState([])
  const [selectedPeople, setSelectedPeople] = useState([])
  const [searchTerm, setSearchTerm]         = useState('')
  const [showTemplates, setShowTemplates]   = useState(false)
  const [sending, setSending]               = useState(false)
  const [error, setError]                   = useState('')
  const [smsWarning, setSmsWarning]         = useState(false)

  useEffect(() => {
    if (!organization) return
    loadPeople()
  }, [organization])

  async function loadPeople() {
    // Staff + family come from profiles (they have auth accounts)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, email, cell_phone, phone')
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .not('role', 'in', '(super_admin,resident)')
      .order('last_name')

    // Residents are in a separate table
    const { data: resData } = await supabase
      .from('residents')
      .select('id, first_name, last_name, phone, unit, room')
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .order('last_name')

    if (profileData) {
      setFamilyList(profileData.filter(p => p.role === 'family'))
      setStaffList(profileData.filter(p => p.role !== 'family'))
    }
    if (resData) {
      setResidentList(resData.map(r => ({ ...r, _table: 'residents' })))
    }
  }

  function toggleChannel(ch) {
    if (ch === 'sms') setSmsWarning(true)
    setForm(f => ({
      ...f,
      channels: f.channels.includes(ch)
        ? f.channels.filter(c => c !== ch)
        : [...f.channels, ch],
    }))
  }

  function applyTemplate(t) {
    setForm(f => ({ ...f, subject: t.subject, body: t.body, category: t.category }))
    setShowTemplates(false)
  }

  function personKey(p) {
    return `${p._table || 'profile'}-${p.id}`
  }

  function togglePerson(person) {
    const key = personKey(person)
    setSelectedPeople(prev =>
      prev.some(p => personKey(p) === key)
        ? prev.filter(p => personKey(p) !== key)
        : [...prev, person]
    )
  }

  function isSelected(person) {
    return selectedPeople.some(p => personKey(p) === personKey(person))
  }

  function getFilteredPeople() {
    const allPeople = [
      ...residentList.map(r => ({ ...r, _typeLabel: `Resident${r.unit ? ` · Rm ${r.unit}` : r.room ? ` · Rm ${r.room}` : ''}` })),
      ...familyList.map(p  => ({ ...p, _typeLabel: ROLE_LABELS[p.role] || p.role })),
      ...staffList.map(p   => ({ ...p, _typeLabel: ROLE_LABELS[p.role] || p.role })),
    ]
    if (!searchTerm.trim()) return allPeople
    const s = searchTerm.toLowerCase()
    return allPeople.filter(p =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(s) ||
      p.email?.toLowerCase().includes(s) ||
      p.unit?.toLowerCase().includes(s) ||
      p.room?.toLowerCase().includes(s)
    )
  }

  const audienceCounts = {
    all:           staffList.length + residentList.length + familyList.length,
    all_staff:     staffList.length,
    all_residents: residentList.length,
    all_family:    familyList.length,
  }

  function audienceSummary() {
    if (form.audience_type === 'all')           return `Everyone (${audienceCounts.all})`
    if (form.audience_type === 'all_staff')     return `All Staff (${audienceCounts.all_staff})`
    if (form.audience_type === 'all_residents') return `All Residents (${audienceCounts.all_residents})`
    if (form.audience_type === 'all_family')    return `All Family (${audienceCounts.all_family})`
    if (form.audience_type === 'department')    return form.audience_dept ? `${form.audience_dept} dept.` : 'Select dept...'
    return selectedPeople.length ? `${selectedPeople.length} selected` : 'Pick recipients...'
  }

  async function handleSend() {
    if (!form.subject.trim())  { setError('Subject is required'); return }
    if (!form.body.trim())     { setError('Message body is required'); return }
    if (!form.channels.length) { setError('Select at least one channel'); return }
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
          audience_ids:  form.audience_type === 'individual'
            ? selectedPeople.map(p => p.id)
            : null,
          status: 'sending',
        })
        .select()
        .single()

      if (insertErr) throw insertErr

      try {
        await supabase.functions.invoke('send-broadcast', { body: { message_id: msg.id } })
      } catch {
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
    { key: 'all',           label: 'Everyone',      icon: Users,     desc: `${audienceCounts.all} total` },
    { key: 'all_staff',     label: 'All Staff',     icon: Building2, desc: `${audienceCounts.all_staff} members` },
    { key: 'all_residents', label: 'All Residents', icon: Users,     desc: `${audienceCounts.all_residents} residents` },
    { key: 'all_family',    label: 'All Family',    icon: Heart,     desc: `${audienceCounts.all_family} contacts` },
    { key: 'department',    label: 'Department',    icon: Building2, desc: 'One department' },
    { key: 'individual',    label: 'Individuals',   icon: User,      desc: 'Pick specific people' },
  ]

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

        {/* Templates dropdown */}
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

        {/* Body */}
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
                    <Icon size={15} />{ch.label}
                    {ch.key === 'sms' && active && (
                      <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-semibold">Pending A2P</span>
                    )}
                  </button>
                )
              })}
            </div>
            {smsWarning && form.channels.includes('sms') && (
              <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mt-2">
                ⚠️ SMS requires Twilio A2P 10DLC registration (~2–4 weeks). Messages queued until approved.
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
                      <Icon size={14} />{d.label}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Individual picker */}
            {form.audience_type === 'individual' && (
              <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden">
                {/* Search */}
                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                  <Search size={13} className="text-slate-400 flex-shrink-0" />
                  <input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search by name, room, or email..."
                    className="flex-1 bg-transparent text-sm outline-none text-slate-700 placeholder-slate-400"
                    autoFocus
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Results */}
                <div className="max-h-52 overflow-y-auto divide-y divide-slate-50">
                  {getFilteredPeople().length === 0 ? (
                    <div className="px-3 py-8 text-center">
                      <User size={24} className="mx-auto text-slate-200 mb-2" />
                      <p className="text-sm text-slate-400">
                        {searchTerm ? `No results for "${searchTerm}"` : 'Start typing to find people'}
                      </p>
                    </div>
                  ) : (
                    getFilteredPeople().map(p => {
                      const name     = `${p.first_name} ${p.last_name}`
                      const selected = isSelected(p)
                      const isRes    = p._table === 'residents'
                      const isFam    = p.role === 'family'
                      const avatarColor = isRes ? 'bg-green-100 text-green-700'
                                        : isFam ? 'bg-pink-100 text-pink-700'
                                        : 'bg-brand-100 text-brand-700'
                      return (
                        <label key={personKey(p)}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-slate-50
                            ${selected ? 'bg-brand-50' : ''}`}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => togglePerson(p)}
                            className="rounded text-brand-600 flex-shrink-0"
                          />
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor}`}>
                            {p.first_name?.[0]}{p.last_name?.[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-800">{name}</div>
                            <div className="text-xs text-slate-400">{p._typeLabel}</div>
                          </div>
                          {selected && <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />}
                        </label>
                      )
                    })
                  )}
                </div>

                {/* Selected count bar */}
                {selectedPeople.length > 0 && (
                  <div className="px-3 py-2 border-t border-slate-100 bg-brand-50 flex items-center justify-between">
                    <span className="text-xs font-medium text-brand-700">
                      {selectedPeople.length} recipient{selectedPeople.length !== 1 ? 's' : ''} selected
                    </span>
                    <button onClick={() => setSelectedPeople([])} className="text-xs text-slate-400 hover:text-red-500 transition-colors">
                      Clear all
                    </button>
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
              <p className="text-xs text-slate-400 mt-1">{form.body.length}/160 chars (SMS)</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <div className="text-xs text-slate-400 truncate max-w-xs">
            {form.channels.map(c => c === 'push' ? '🔔 In-App' : c === 'email' ? '✉️ Email' : '💬 SMS').join(' + ')}
            {' → '}{audienceSummary()}
          </div>
          <div className="flex gap-2 flex-shrink-0">
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
