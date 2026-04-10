import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, Pin, Cake, Star, Calendar, CloudSun,
  Church, UtensilsCrossed, Bell, Megaphone,
  X, Edit2, Trash2, Search, Monitor
} from 'lucide-react'

const CATEGORIES = [
  { key: 'general',            label: 'General',            icon: Megaphone,      color: 'bg-slate-100 text-slate-600 border-slate-200' },
  { key: 'birthday',           label: 'Birthday',           icon: Cake,           color: 'bg-pink-50 text-pink-600 border-pink-200' },
  { key: 'resident_spotlight', label: 'Resident Spotlight', icon: Star,           color: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
  { key: 'event',              label: 'Event',              icon: Calendar,       color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { key: 'weather',            label: 'Weather',            icon: CloudSun,       color: 'bg-sky-50 text-sky-600 border-sky-200' },
  { key: 'chapel',             label: 'Chapel',             icon: Church,         color: 'bg-purple-50 text-purple-600 border-purple-200' },
  { key: 'menu',               label: 'Menu',               icon: UtensilsCrossed,color: 'bg-green-50 text-green-600 border-green-200' },
  { key: 'alert',              label: 'Alert',              icon: Bell,           color: 'bg-red-50 text-red-600 border-red-200' },
]

const getCat = (key) => CATEGORIES.find(c => c.key === key) || CATEGORIES[0]

function AnnouncementCard({ item, canEdit, canDelete, onEdit, onDelete }) {
  const cat = getCat(item.category)
  const Icon = cat.icon
  const isExpired = item.expires_at && new Date(item.expires_at) < new Date()

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 flex gap-4 transition-all hover:shadow-md ${isExpired ? 'opacity-50' : ''} ${item.pinned ? 'border-brand-300 ring-1 ring-brand-200' : 'border-slate-100'}`}>
      <div className={`flex-shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center ${cat.color}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {item.pinned && <Pin size={13} className="text-brand-500 flex-shrink-0" />}
            <h3 className="font-display font-semibold text-slate-800 text-base leading-tight">{item.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cat.color}`}>{cat.label}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {canEdit && (
              <button onClick={() => onEdit(item)} className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors">
                <Edit2 size={14} />
              </button>
            )}
            {canDelete && (
              <button onClick={() => onDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
        {item.body && <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">{item.body}</p>}
        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
          <span>{new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          {item.expires_at && <span>Expires {new Date(item.expires_at).toLocaleDateString()}</span>}
          {item.profiles && <span>by {item.profiles.first_name} {item.profiles.last_name}</span>}
        </div>
      </div>
    </div>
  )
}

function AnnouncementModal({ item, onClose, onSave }) {
  const { organization } = useAuth()
  const [form, setForm] = useState({
    title: item?.title || '',
    body: item?.body || '',
    category: item?.category || 'general',
    pinned: item?.pinned || false,
    expires_at: item?.expires_at ? item.expires_at.split('T')[0] : '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required'); return }
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      body: form.body.trim() || null,
      category: form.category,
      pinned: form.pinned,
      expires_at: form.expires_at || null,
      organization_id: organization.id,
      updated_at: new Date().toISOString(),
    }
    let error
    if (item?.id) {
      ({ error } = await supabase.from('announcements').update(payload).eq('id', item.id))
    } else {
      ({ error } = await supabase.from('announcements').insert({ ...payload, is_active: true }))
    }
    if (error) { setError(error.message); setSaving(false); return }
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-display font-semibold text-slate-800">{item ? 'Edit Announcement' : 'New Announcement'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Title *</label>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Announcement title" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon
                return (
                  <button key={cat.key} onClick={() => setForm({...form, category: cat.key})}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition-all ${form.category === cat.key ? cat.color + ' ring-2 ring-offset-1 ring-brand-400' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    <Icon size={16} />
                    <span className="leading-tight text-center">{cat.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
            <textarea value={form.body} onChange={e => setForm({...form, body: e.target.value})} rows={3}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Optional message body..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Expires On</label>
              <input type="date" value={form.expires_at} onChange={e => setForm({...form, expires_at: e.target.value})}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.pinned} onChange={e => setForm({...form, pinned: e.target.checked})}
                  className="w-4 h-4 rounded text-brand-600" />
                <span className="text-sm font-medium text-slate-700">Pin to top</span>
              </label>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving...' : item ? 'Save Changes' : 'Post Announcement'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Communication() {
  const { profile, organization } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)

  const canPost = profile && ['super_admin','org_admin','supervisor','manager','staff','maintenance','dietary','housekeeping'].includes(profile.role)
  const canDelete = profile && ['super_admin','org_admin','supervisor','manager'].includes(profile.role)
  const canEditAll = profile && ['super_admin','org_admin','supervisor','manager'].includes(profile.role)

  useEffect(() => { fetchAnnouncements() }, [organization])

  async function fetchAnnouncements() {
    if (!organization) return
    setLoading(true)
    const { data } = await supabase
      .from('announcements')
      .select('*, profiles(first_name, last_name)')
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
    setAnnouncements(data || [])
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this announcement?')) return
    await supabase.from('announcements').update({ is_active: false }).eq('id', id)
    fetchAnnouncements()
  }

  const handleEdit = (item) => { setEditItem(item); setShowModal(true) }
  const handleNew = () => { setEditItem(null); setShowModal(true) }
  const handleSave = () => { setShowModal(false); fetchAnnouncements() }

  const filtered = announcements.filter(a => {
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.body?.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'all' || a.category === filterCat
    return matchSearch && matchCat
  })

  const pinned = filtered.filter(a => a.pinned)
  const regular = filtered.filter(a => !a.pinned)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800">Communication</h1>
          <p className="text-slate-500 text-sm mt-0.5">Announcements, events, and community updates</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/signage" target="_blank"
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 hover:text-brand-600 hover:border-brand-300 rounded-xl text-sm font-medium transition-colors">
            <Monitor size={16} /> Digital Signage
          </a>
          {canPost && (
            <button onClick={handleNew}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
              <Plus size={16} /> New Announcement
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search announcements..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setFilterCat('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterCat === 'all' ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-brand-300'}`}>
            All
          </button>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            return (
              <button key={cat.key} onClick={() => setFilterCat(cat.key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterCat === cat.key ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-brand-300'}`}>
                <Icon size={12} />{cat.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading announcements...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Megaphone size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-display text-lg">No announcements yet</p>
          {canPost && <p className="text-sm mt-1">Click "New Announcement" to post the first one.</p>}
        </div>
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Pin size={14} className="text-brand-500" />
                <span className="text-xs font-semibold text-brand-600 uppercase tracking-wide">Pinned</span>
              </div>
              <div className="space-y-3">
                {pinned.map(a => (
                  <AnnouncementCard key={a.id} item={a}
                    canEdit={canEditAll || a.created_by === profile?.id}
                    canDelete={canDelete}
                    onEdit={handleEdit} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}
          {regular.length > 0 && (
            <div>
              {pinned.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Recent</span>
                </div>
              )}
              <div className="space-y-3">
                {regular.map(a => (
                  <AnnouncementCard key={a.id} item={a}
                    canEdit={canEditAll || a.created_by === profile?.id}
                    canDelete={canDelete}
                    onEdit={handleEdit} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showModal && <AnnouncementModal item={editItem} onClose={() => setShowModal(false)} onSave={handleSave} />}
    </div>
  )
}
