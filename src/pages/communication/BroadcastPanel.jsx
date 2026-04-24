// src/pages/communication/BroadcastPanel.jsx
// ── Drop this as a NEW file, do NOT replace your existing Communication.jsx ──
// Then add a tab in your existing Communication.jsx that renders <BroadcastPanel />
// OR add it as a separate route: /app/broadcast
//
// This avoids any collision with the existing Communication.jsx file entirely.

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import ComposeModal from '../../components/communication/ComposeModal'
import {
  Send, Bell, Mail, MessageSquare, Plus, Search,
  Users, Clock, AlertTriangle, ChevronRight,
  Calendar, UtensilsCrossed, Activity, Megaphone, RefreshCw, Lock
} from 'lucide-react'

const CATEGORY_META = {
  general:  { label: 'General',   color: 'bg-slate-100 text-slate-600',   icon: Megaphone },
  urgent:   { label: 'Urgent',    color: 'bg-red-100 text-red-700',       icon: AlertTriangle },
  reminder: { label: 'Reminder',  color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  activity: { label: 'Activity',  color: 'bg-blue-100 text-blue-700',     icon: Calendar },
  meal:     { label: 'Meal',      color: 'bg-amber-100 text-amber-700',   icon: UtensilsCrossed },
  health:   { label: 'Health',    color: 'bg-purple-100 text-purple-700', icon: Activity },
}

const AUDIENCE_LABELS = {
  all:           'Everyone',
  all_staff:     'All Staff',
  all_residents: 'All Residents',
  all_family:    'All Family',
  department:    'Department',
  individual:    'Individuals',
}

const CAN_ACCESS_ROLES = ['super_admin', 'org_admin', 'ceo', 'manager', 'supervisor']

function ChannelBadge({ channels }) {
  return (
    <div className="flex gap-1">
      {channels?.includes('push')  && <span className="px-1.5 py-0.5 bg-brand-100 text-brand-700 rounded text-[10px] font-medium">🔔 App</span>}
      {channels?.includes('email') && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">✉️ Email</span>}
      {channels?.includes('sms')   && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium">💬 SMS</span>}
    </div>
  )
}

function relativeTime(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-3`}>
        <Icon size={17} />
      </div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className="text-sm text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function BroadcastPanel() {
  const { profile, organization, hasModule, userPerms } = useAuth()

  // ── Access control ──────────────────────────────────────────
  // Check role first, then fall back to explicit user_module_permissions
  const hasRoleAccess = CAN_ACCESS_ROLES.includes(profile?.role)
  const hasPermAccess = userPerms?.some(p => p.module_key === 'communication' && ['edit','view'].includes(p.access_level))
  const hasAccess     = hasModule('communication') && (hasRoleAccess || hasPermAccess)

  // Can send = role-based OR explicit edit permission
  const hasEditPerm = userPerms?.some(p => p.module_key === 'communication' && p.access_level === 'edit')
  const canSend     = hasRoleAccess || hasEditPerm

  const [messages, setMessages]           = useState([])
  const [loading, setLoading]             = useState(true)
  const [showCompose, setShowCompose]     = useState(false)
  const [search, setSearch]               = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [expandedId, setExpandedId]       = useState(null)
  const [stats, setStats]                 = useState({ total: 0, today: 0, emailSent: 0, smsSent: 0, pushSent: 0 })

  useEffect(() => {
    if (organization && hasAccess) fetchMessages()
  }, [organization, hasAccess])

  async function fetchMessages() {
    setLoading(true)
    const { data } = await supabase
      .from('broadcast_messages')
      .select('*, sender:profiles!sender_id(full_name, role)')
      .eq('org_id', organization.id)
      .order('sent_at', { ascending: false })
      .limit(100)

    if (data) {
      setMessages(data)
      const todayStart = new Date(); todayStart.setHours(0,0,0,0)
      setStats({
        total:     data.length,
        today:     data.filter(m => new Date(m.sent_at) >= todayStart).length,
        emailSent: data.reduce((s, m) => s + (m.email_sent || 0), 0),
        smsSent:   data.reduce((s, m) => s + (m.sms_sent  || 0), 0),
        pushSent:  data.reduce((s, m) => s + (m.push_sent || 0), 0),
      })
    }
    setLoading(false)
  }

  // ── No access gate ──────────────────────────────────────────
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center px-4">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <Lock size={28} className="text-slate-300" />
        </div>
        <h2 className="text-xl font-semibold text-slate-700">Access Restricted</h2>
        <p className="text-slate-400 mt-2 max-w-sm text-sm">
          The Broadcast Messaging module is restricted. Contact your administrator to request access.
        </p>
      </div>
    )
  }

  const filtered = messages.filter(m => {
    const matchSearch = !search ||
      m.subject?.toLowerCase().includes(search.toLowerCase()) ||
      m.body?.toLowerCase().includes(search.toLowerCase()) ||
      m.sender?.full_name?.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCategory === 'all' || m.category === filterCategory
    return matchSearch && matchCat
  })

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Broadcast Messaging</h1>
          <p className="text-slate-400 text-sm mt-0.5">Send email, push, and SMS messages to residents, family, and staff</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchMessages} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
            <RefreshCw size={16} />
          </button>
          {canSend && (
            <button
              onClick={() => setShowCompose(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              <Plus size={16} /> New Message
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Send}  label="Total Sent"      value={stats.total}     color="bg-brand-50 text-brand-600" />
        <StatCard icon={Clock} label="Sent Today"      value={stats.today}     color="bg-blue-50 text-blue-600" />
        <StatCard icon={Bell}  label="Push Delivered"  value={stats.pushSent}  color="bg-purple-50 text-purple-600" />
        <StatCard icon={Mail}  label="Emails Sent"     value={stats.emailSent}
          sub={stats.smsSent > 0 ? `+ ${stats.smsSent} SMS` : 'SMS pending A2P'}
          color="bg-green-50 text-green-600" />
      </div>

      {/* Quick-send */}
      {canSend && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Quick Send</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: 'Meal is ready',     subject: 'Dining room is now open',         body: 'The dining room is now open and serving. Please make your way to the dining area.',        category: 'meal',     icon: UtensilsCrossed },
              { label: 'Activity starting', subject: 'Activity starting in 30 minutes', body: 'A community activity is starting soon! We hope to see you there.',                       category: 'activity', icon: Calendar },
              { label: 'Emergency alert',   subject: '⚠️ Important Alert',             body: 'Please pay attention to the following important announcement from our community team.',    category: 'urgent',   icon: AlertTriangle },
              { label: 'Staff reminder',    subject: 'Staff reminder',                  body: 'This is a reminder for all staff members. Please check the bulletin board for details.',  category: 'reminder', icon: Users },
            ].map(q => {
              const Icon = q.icon
              return (
                <button key={q.label}
                  onClick={() => setShowCompose({ subject: q.subject, body: q.body, category: q.category })}
                  className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 hover:bg-brand-50 border border-slate-200 hover:border-brand-300 rounded-xl text-left transition-all group">
                  <Icon size={14} className="text-slate-400 group-hover:text-brand-600 flex-shrink-0" />
                  <span className="text-xs font-medium text-slate-600 group-hover:text-brand-700">{q.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Message Log */}
      <div className="bg-white rounded-2xl border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center gap-3 p-4 border-b border-slate-100">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search messages..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setFilterCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterCategory === 'all' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              All
            </button>
            {Object.entries(CATEGORY_META).map(([key, meta]) => (
              <button key={key} onClick={() => setFilterCategory(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterCategory === key ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {meta.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <MessageSquare size={32} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 text-sm">No messages sent yet</p>
            {canSend && (
              <button onClick={() => setShowCompose(true)} className="mt-3 text-sm text-brand-600 hover:text-brand-700 font-medium">
                Send your first message →
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map(msg => {
              const cat     = CATEGORY_META[msg.category] || CATEGORY_META.general
              const CatIcon = cat.icon
              const isExpanded = expandedId === msg.id

              return (
                <div key={msg.id} className="hover:bg-slate-50/50 transition-colors">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                    className="w-full text-left px-5 py-4 flex items-start gap-4"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${cat.color}`}>
                      <CatIcon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 text-sm">{msg.subject}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cat.color}`}>{cat.label}</span>
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{msg.body}</p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-xs text-slate-400">
                          {msg.sender?.full_name} · {relativeTime(msg.sent_at)}
                        </span>
                        <span className="text-xs text-slate-400">
                          → {AUDIENCE_LABELS[msg.audience_type] || msg.audience_type}
                          {msg.audience_type === 'department' && msg.audience_dept && ` (${msg.audience_dept})`}
                        </span>
                        <ChannelBadge channels={msg.channels} />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right hidden md:block">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          {msg.push_sent  > 0 && <span>🔔 {msg.push_sent}</span>}
                          {msg.email_sent > 0 && <span>✉️ {msg.email_sent}</span>}
                          {msg.sms_sent   > 0 && <span>💬 {msg.sms_sent}</span>}
                        </div>
                        <div className={`text-[10px] mt-0.5 font-medium ${
                          msg.status === 'sent'    ? 'text-green-600'  :
                          msg.status === 'failed'  ? 'text-red-500'    : 'text-yellow-600'
                        }`}>
                          {msg.status === 'sent' ? '✓ Sent' : msg.status === 'failed' ? '✗ Failed' : '⏳ Sending'}
                        </div>
                      </div>
                      <ChevronRight size={16} className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-4 ml-13">
                      <div className="pl-4 border-l-2 border-brand-100">
                        <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                        <div className="flex gap-4 mt-3 text-xs text-slate-400">
                          <span>Recipients: {msg.recipient_count || '—'}</span>
                          {msg.email_sent > 0 && <span>Email: {msg.email_sent} delivered</span>}
                          {msg.sms_sent   > 0 && <span>SMS: {msg.sms_sent} delivered</span>}
                          {msg.push_sent  > 0 && <span>Push: {msg.push_sent} delivered</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showCompose && (
        <ComposeModal
          prefill={typeof showCompose === 'object' ? showCompose : null}
          onClose={() => setShowCompose(false)}
          onSent={() => { setShowCompose(false); fetchMessages() }}
        />
      )}
    </div>
  )
}
