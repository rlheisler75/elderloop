// src/components/communication/ComposeModal.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  X, Send, Bell, Mail, MessageSquare, Users, ChevronDown,
  AlertTriangle, Clock, Calendar, UtensilsCrossed, Activity,
  Megaphone, Loader2, Lock, Zap
} from 'lucide-react'

const CATEGORIES = [
  { key: 'general',  label: 'General',  icon: Megaphone,       color: 'bg-slate-100 text-slate-600 border-slate-200'    },
  { key: 'urgent',   label: 'Urgent',   icon: AlertTriangle,   color: 'bg-red-100 text-red-700 border-red-200'          },
  { key: 'reminder', label: 'Reminder', icon: Clock,           color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { key: 'activity', label: 'Activity', icon: Calendar,        color: 'bg-blue-100 text-blue-700 border-blue-200'       },
  { key: 'meal',     label: 'Meal',     icon: UtensilsCrossed, color: 'bg-amber-100 text-amber-700 border-amber-200'    },
  { key: 'health',   label: 'Health',   icon: Activity,        color: 'bg-purple-100 text-purple-700 border-purple-200' },
]

const AUDIENCE_OPTIONS = [
  { key: 'all',           label: 'Everyone',       sub: 'Staff, residents, and family' },
  { key: 'all_staff',     label: 'All Staff',      sub: 'All active staff members'     },
  { key: 'all_residents', label: 'All Residents',  sub: 'All active residents'         },
  { key: 'all_family',    label: 'Family Members', sub: 'Family portal users'          },
  { key: 'department',    label: 'Department',     sub: 'Specific department only'     },
  { key: 'individual',    label: 'Individuals',    sub: 'Select specific people'       },
]

const DEPARTMENTS = [
  'administration', 'nursing', 'dietary', 'maintenance',
  'housekeeping', 'security', 'activities', 'other',
]

export default function ComposeModal({ prefill, isStarter = false, onClose, onSent }) {
  const { profile, organization } = useAuth()

  const [form, setForm] = useState({
    subject:       prefill?.subject   || '',
    body:          prefill?.body      || '',
    category:      prefill?.category  || 'general',
    audience_type: 'all_staff',
    audience_dept: '',
    audience_ids:  [],
    channels:      ['push', 'email'],  // SMS excluded from default
  })

  const [residents,  setResidents]  = useState([])
  const [staffList,  setStaffList]  = useState([])
  const [sending,    setSending]    = useState(false)
  const [error,      setError]      = useState('')
  const [charCount,  setCharCount]  = useState(0)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { fetchPeople() }, [])
  useEffect(() => { setCharCount(form.body.length) }, [form.body])

  async function fetchPeople() {
    const [{ data: res }, { data: staff }] = await Promise.all([
      supabase.from('residents').select('id, first_name, last_name, room')
        .eq('organization_id', organization.id).eq('is_active', true).order('last_name'),
      supabase.from('profiles').select('id, first_name, last_name, role, department')
        .eq('organization_id', organization.id).eq('is_active', true)
        .not('role', 'in', '(resident,family,super_admin)').order('last_name'),
    ])
    setResidents(res || [])
    setStaffList(staff || [])
  }

  const toggleChannel = (ch) => {
    if (isStarter && ch === 'sms') return // blocked for starter
    set('channels', form.channels.includes(ch)
      ? form.channels.filter(c => c !== ch)
      : [...form.channels, ch]
    )
  }

  const togglePerson = (id) => {
    set('audience_ids', form.audience_ids.includes(id)
      ? form.audience_ids.filter(i => i !== id)
      : [...form.audience_ids, id]
    )
  }

  const handleSend = async () => {
    if (!form.subject.trim()) { setError('Subject is required'); return }
    if (!form.body.trim())    { setError('Message body is required'); return }
    if (form.channels.length === 0) { setError('Select at least one channel'); return }
    if (form.audience_type === 'department' && !form.audience_dept) {
      setError('Select a department'); return
    }
    if (form.audience_type === 'individual' && form.audience_ids.length === 0) {
      setError('Select at least one recipient'); return
    }

    setSending(true); setError('')

    // Ensure SMS is not sent on Starter regardless of UI state
    const channels = isStarter
      ? form.channels.filter(c => c !== 'sms')
      : form.channels

    const { data: msg, error: insertErr } = await supabase
      .from('broadcast_messages')
      .insert({
        org_id:        organization.id,
        sender_id:     profile.id,
        subject:       form.subject.trim(),
        body:          form.body.trim(),
        category:      form.category,
        channels,
        audience_type: form.audience_type,
        audience_dept: form.audience_type === 'department' ? form.audience_dept : null,
        audience_ids:  form.audience_type === 'individual' ? form.audience_ids : null,
        status:        'sending',
        sent_at:       new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertErr) { setError(insertErr.message); setSending(false); return }

    // Call send-broadcast edge function
    const { error: fnErr } = await supabase.functions.invoke('send-broadcast', {
      body: { message_id: msg.id },
    })

    setSending(false)
    if (fnErr) { setError('Message saved but delivery failed: ' + fnErr.message); return }
    onSent()
  }

  const selectedAudience = AUDIENCE_OPTIONS.find(a => a.key === form.audience_type)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800">New Broadcast Message</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertTriangle size={14} className="flex-shrink-0" /> {error}
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Category</label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon
                return (
                  <button key={cat.key} onClick={() => set('category', cat.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all
                      ${form.category === cat.key ? cat.color + ' ring-2 ring-offset-1 ring-brand-400' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    <Icon size={12} /> {cat.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Subject *</label>
            <input
              value={form.subject}
              onChange={e => set('subject', e.target.value)}
              placeholder="Message subject..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Message *</label>
            <textarea
              value={form.body}
              onChange={e => set('body', e.target.value)}
              rows={4}
              placeholder="Write your message here..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-slate-400">SMS truncates at 160 chars</span>
              <span className={`text-xs font-medium ${charCount > 160 ? 'text-amber-500' : 'text-slate-400'}`}>
                {charCount} chars
              </span>
            </div>
          </div>

          {/* Channels */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Channels *</label>
            <div className="grid grid-cols-3 gap-2">

              {/* Push */}
              <button onClick={() => toggleChannel('push')}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all
                  ${form.channels.includes('push')
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                <Bell size={18} />
                <span className="text-xs font-semibold">App Push</span>
                <span className="text-[10px] text-slate-400 leading-tight text-center">In-app + device</span>
              </button>

              {/* Email */}
              <button onClick={() => toggleChannel('email')}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all
                  ${form.channels.includes('email')
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                <Mail size={18} />
                <span className="text-xs font-semibold">Email</span>
                <span className="text-[10px] text-slate-400 leading-tight text-center">Via Resend</span>
              </button>

              {/* SMS — gated for Starter */}
              {isStarter ? (
                <div className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-300 relative cursor-not-allowed">
                  <div className="relative">
                    <MessageSquare size={18} />
                    <Lock size={10} className="absolute -top-1 -right-1 text-slate-400" />
                  </div>
                  <span className="text-xs font-semibold text-slate-400">SMS</span>
                  <span className="text-[10px] text-slate-400 leading-tight text-center">Essential+</span>
                </div>
              ) : (
                <button onClick={() => toggleChannel('sms')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all
                    ${form.channels.includes('sms')
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  <MessageSquare size={18} />
                  <span className="text-xs font-semibold">SMS</span>
                  <span className="text-[10px] text-slate-400 leading-tight text-center">Via Twilio</span>
                </button>
              )}
            </div>

            {/* Starter SMS upsell */}
            {isStarter && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                <Zap size={13} className="text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  SMS requires the <strong>Essential plan</strong>.{' '}
                  <a href="/app/billing" className="underline hover:text-amber-900 font-medium">Upgrade →</a>
                </p>
              </div>
            )}
          </div>

          {/* Audience */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Send To *</label>
            <div className="grid grid-cols-2 gap-2">
              {AUDIENCE_OPTIONS.map(opt => (
                <button key={opt.key} onClick={() => set('audience_type', opt.key)}
                  className={`flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all
                    ${form.audience_type === opt.key
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-slate-200 hover:border-slate-300'}`}>
                  <span className={`text-xs font-semibold ${form.audience_type === opt.key ? 'text-brand-700' : 'text-slate-700'}`}>
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">{opt.sub}</span>
                </button>
              ))}
            </div>

            {/* Department selector */}
            {form.audience_type === 'department' && (
              <div className="mt-3">
                <label className="block text-xs text-slate-500 mb-1.5">Select Department</label>
                <div className="flex gap-2 flex-wrap">
                  {DEPARTMENTS.map(dept => (
                    <button key={dept} onClick={() => set('audience_dept', dept)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium capitalize transition-all
                        ${form.audience_dept === dept
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'border-slate-200 text-slate-600 hover:border-brand-300'}`}>
                      {dept}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Individual selector */}
            {form.audience_type === 'individual' && (
              <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-semibold sticky top-0">
                  Staff ({staffList.length}) — click to select
                </div>
                {staffList.map(s => (
                  <button key={s.id} onClick={() => togglePerson(s.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0
                      ${form.audience_ids.includes(s.id) ? 'bg-brand-50' : ''}`}>
                    <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors
                      ${form.audience_ids.includes(s.id) ? 'bg-brand-600 border-brand-600' : 'border-slate-300'}`}>
                      {form.audience_ids.includes(s.id) && (
                        <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 text-white fill-white">
                          <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{s.first_name} {s.last_name}</div>
                      <div className="text-xs text-slate-400 capitalize">{s.role?.replace(/_/g, ' ')}{s.department ? ` · ${s.department}` : ''}</div>
                    </div>
                  </button>
                ))}
                {staffList.length === 0 && (
                  <div className="px-3 py-4 text-xs text-slate-400 text-center">No staff found</div>
                )}
                {form.audience_ids.length > 0 && (
                  <div className="px-3 py-2 bg-brand-50 text-xs text-brand-700 font-medium sticky bottom-0 border-t border-brand-100">
                    {form.audience_ids.length} recipient{form.audience_ids.length > 1 ? 's' : ''} selected
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-400">
            {form.channels.length > 0
              ? `Sending via: ${form.channels.map(c => c === 'push' ? 'App' : c === 'email' ? 'Email' : 'SMS').join(' + ')}`
              : 'No channels selected'}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium hover:text-slate-800 transition-colors">
              Cancel
            </button>
            <button onClick={handleSend} disabled={sending || form.channels.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-colors">
              {sending ? <><Loader2 size={15} className="animate-spin" /> Sending...</> : <><Send size={15} /> Send Message</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
