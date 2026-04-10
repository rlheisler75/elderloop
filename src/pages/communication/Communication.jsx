import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, Pin, Cake, Star, Calendar, CloudSun,
  Church, UtensilsCrossed, Bell, Megaphone,
  X, Edit2, Trash2, Search, Monitor, Clock,
  Image, Palette, Upload
} from 'lucide-react'

const CATEGORIES = [
  { key: 'general',            label: 'General',            icon: Megaphone,       color: 'bg-slate-100 text-slate-600 border-slate-200' },
  { key: 'birthday',           label: 'Birthday',           icon: Cake,            color: 'bg-pink-50 text-pink-600 border-pink-200' },
  { key: 'resident_spotlight', label: 'Resident Spotlight', icon: Star,            color: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
  { key: 'event',              label: 'Event',              icon: Calendar,        color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { key: 'weather',            label: 'Weather',            icon: CloudSun,        color: 'bg-sky-50 text-sky-600 border-sky-200' },
  { key: 'chapel',             label: 'Chapel',             icon: Church,          color: 'bg-purple-50 text-purple-600 border-purple-200' },
  { key: 'menu',               label: 'Menu',               icon: UtensilsCrossed, color: 'bg-green-50 text-green-600 border-green-200' },
  { key: 'alert',              label: 'Alert',              icon: Bell,            color: 'bg-red-50 text-red-600 border-red-200' },
]

const BG_PRESETS = [
  { label: 'Category Default', value: '' },
  { label: 'Navy',        value: '#0a406b' },
  { label: 'Forest',      value: '#1a3a2a' },
  { label: 'Burgundy',    value: '#5a1a2a' },
  { label: 'Slate',       value: '#1e293b' },
  { label: 'Charcoal',    value: '#1c1917' },
  { label: 'Midnight',    value: '#0f172a' },
  { label: 'Plum',        value: '#3b1a5a' },
  { label: 'Custom',      value: 'custom' },
]

const getCat   = (key) => CATEGORIES.find(c => c.key === key) || CATEGORIES[0]
const toDateInput = (iso) => iso ? iso.split('T')[0] : ''
const today    = () => new Date().toISOString().split('T')[0]
const isScheduled = (item) => item.starts_at && new Date(item.starts_at) > new Date()
const isExpired   = (item) => item.expires_at && new Date(item.expires_at) < new Date()

function AnnouncementCard({ item, canEdit, canDelete, onEdit, onDelete }) {
  const cat = getCat(item.category)
  const Icon = cat.icon
  const scheduled = isScheduled(item)
  const expired   = isExpired(item)

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 flex gap-4 transition-all hover:shadow-md
      ${expired ? 'opacity-50' : ''}
      ${scheduled ? 'border-dashed border-amber-300 bg-amber-50/30' : item.pinned ? 'border-brand-300 ring-1 ring-brand-200' : 'border-slate-100'}`}>
      {/* Thumbnail */}
      {item.image_url && (
        <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-slate-100">
          <img src={item.image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className={`flex-shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center ${cat.color} ${item.image_url ? 'hidden' : ''}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {item.pinned && !scheduled && <Pin size={13} className="text-brand-500 flex-shrink-0" />}
            {scheduled && <Clock size={13} className="text-amber-500 flex-shrink-0" />}
            <h3 className="font-display font-semibold text-slate-800 text-base leading-tight">{item.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cat.color}`}>{cat.label}</span>
            {item.bg_custom && (
              <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-slate-50 text-slate-500 border-slate-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: item.bg_custom }} />
                Custom BG
              </span>
            )}
            {item.image_url && (
              <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-slate-50 text-slate-500 border-slate-200 flex items-center gap-1">
                <Image size={10} /> Photo
              </span>
            )}
            {scheduled && (
              <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-amber-50 text-amber-600 border-amber-200">
                Posts {new Date(item.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
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
        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
          <span>Created {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          {item.expires_at && <span>Expires {new Date(item.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
          {item.profiles && <span>by {item.profiles.first_name} {item.profiles.last_name}</span>}
        </div>
      </div>
    </div>
  )
}

function AnnouncementModal({ item, onClose, onSave }) {
  const { organization, user } = useAuth()
  const fileRef = useRef()
  const [form, setForm] = useState({
    title:      item?.title || '',
    body:       item?.body  || '',
    category:   item?.category  || 'general',
    pinned:     item?.pinned    || false,
    starts_at:  item?.starts_at  ? toDateInput(item.starts_at)  : today(),
    expires_at: item?.expires_at ? toDateInput(item.expires_at) : '',
    bg_custom:  item?.bg_custom  || '',
    image_url:  item?.image_url  || '',
  })
  const [bgMode, setBgMode]       = useState(item?.bg_custom ? (BG_PRESETS.find(p => p.value === item.bg_custom) ? item.bg_custom : 'custom') : '')
  const [customHex, setCustomHex] = useState(item?.bg_custom || '#0a406b')
  const [imagePreview, setImagePreview] = useState(item?.image_url || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleBgSelect = (val) => {
    setBgMode(val)
    if (val === 'custom') { set('bg_custom', customHex) }
    else { set('bg_custom', val) }
  }

  const handleCustomHex = (hex) => {
    setCustomHex(hex)
    set('bg_custom', hex)
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    const ext  = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('announcement-images').upload(path, file)
    if (upErr) { setError('Image upload failed: ' + upErr.message); setUploading(false); return }
    const { data } = supabase.storage.from('announcement-images').getPublicUrl(path)
    set('image_url', data.publicUrl)
    setImagePreview(data.publicUrl)
    setUploading(false)
  }

  const removeImage = () => { set('image_url', ''); setImagePreview('') }

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required'); return }
    if (form.expires_at && form.starts_at && form.expires_at < form.starts_at) {
      setError('Expiration date must be after the post date'); return
    }
    setSaving(true)
    const payload = {
      title:           form.title.trim(),
      body:            form.body.trim() || null,
      category:        form.category,
      pinned:          form.pinned,
      starts_at:       form.starts_at || new Date().toISOString(),
      expires_at:      form.expires_at || null,
      bg_custom:       form.bg_custom  || null,
      image_url:       form.image_url  || null,
      organization_id: organization.id,
      updated_at:      new Date().toISOString(),
    }
    let err
    if (item?.id) {
      ({ error: err } = await supabase.from('announcements').update(payload).eq('id', item.id))
    } else {
      ({ error: err } = await supabase.from('announcements').insert({ ...payload, is_active: true }))
    }
    if (err) { setError(err.message); setSaving(false); return }
    onSave()
  }

  const isScheduledPost = form.starts_at && form.starts_at > today()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="font-display font-semibold text-slate-800">{item ? 'Edit Announcement' : 'New Announcement'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Announcement title" />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon
                return (
                  <button key={cat.key} onClick={() => set('category', cat.key)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition-all
                      ${form.category === cat.key ? cat.color + ' ring-2 ring-offset-1 ring-brand-400' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    <Icon size={16} /><span className="leading-tight text-center">{cat.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
            <textarea value={form.body} onChange={e => set('body', e.target.value)} rows={3}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Optional message body..." />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
              <Image size={14} /> Photo
            </label>
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200">
                <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover" />
                <button onClick={removeImage}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg transition-colors">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current.click()} disabled={uploading}
                className="w-full h-28 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors">
                {uploading
                  ? <><div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" /><span className="text-xs">Uploading...</span></>
                  : <><Upload size={20} /><span className="text-xs font-medium">Click to upload photo</span><span className="text-xs">JPG, PNG, GIF up to 5MB</span></>
                }
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>

          {/* Background Color */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
              <Palette size={14} /> Background Color <span className="text-slate-400 font-normal">(signage display)</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {BG_PRESETS.map(preset => (
                <button key={preset.value} onClick={() => handleBgSelect(preset.value)}
                  className={`px-2 py-2 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5
                    ${bgMode === preset.value ? 'ring-2 ring-brand-500 border-brand-400' : 'border-slate-200 hover:border-slate-300'}`}>
                  {preset.value && preset.value !== 'custom'
                    ? <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: preset.value }} />
                    : preset.value === 'custom'
                    ? <span className="w-3 h-3 rounded-full flex-shrink-0 bg-gradient-to-br from-pink-400 to-purple-500" />
                    : <span className="w-3 h-3 rounded-full flex-shrink-0 border border-slate-300" />
                  }
                  {preset.label}
                </button>
              ))}
            </div>
            {bgMode === 'custom' && (
              <div className="mt-3 flex items-center gap-3">
                <input type="color" value={customHex} onChange={e => handleCustomHex(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5" />
                <input value={customHex} onChange={e => handleCustomHex(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="#000000" maxLength={7} />
                <div className="w-10 h-10 rounded-lg border border-slate-200 flex-shrink-0" style={{ background: customHex }} />
              </div>
            )}
            {form.bg_custom && (
              <div className="mt-2 px-3 py-2 rounded-lg flex items-center gap-2 text-xs text-white font-medium" style={{ background: form.bg_custom }}>
                <span>Preview background</span>
              </div>
            )}
          </div>

          {/* Scheduling */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Scheduling</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Post Date</label>
                <input type="date" value={form.starts_at} onChange={e => set('starts_at', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                <p className="text-xs text-slate-400 mt-1">When it becomes visible</p>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Expiration Date</label>
                <input type="date" value={form.expires_at} onChange={e => set('expires_at', e.target.value)}
                  min={form.starts_at || today()}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                <p className="text-xs text-slate-400 mt-1">Leave blank to never expire</p>
              </div>
            </div>
            {isScheduledPost && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                <Clock size={14} className="text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  Hidden until <strong>{new Date(form.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</strong>
                </p>
              </div>
            )}
          </div>

          {/* Pin */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.pinned} onChange={e => set('pinned', e.target.checked)}
              className="w-4 h-4 rounded text-brand-600" />
            <span className="text-sm font-medium text-slate-700">Pin to top of board</span>
          </label>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving || uploading}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving...' : isScheduledPost ? 'Schedule Announcement' : item ? 'Save Changes' : 'Post Announcement'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Communication() {
  const { profile, organization } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [filterCat, setFilterCat]         = useState('all')
  const [showScheduled, setShowScheduled] = useState(false)
  const [showModal, setShowModal]         = useState(false)
  const [editItem, setEditItem]           = useState(null)

  const canPost    = profile && ['super_admin','org_admin','supervisor','manager','staff','maintenance','dietary','housekeeping'].includes(profile.role)
  const canDelete  = profile && ['super_admin','org_admin','supervisor','manager'].includes(profile.role)
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
      .order('starts_at', { ascending: false })
    setAnnouncements(data || [])
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this announcement?')) return
    await supabase.from('announcements').update({ is_active: false }).eq('id', id)
    fetchAnnouncements()
  }

  const handleEdit = (item) => { setEditItem(item); setShowModal(true) }
  const handleNew  = () => { setEditItem(null); setShowModal(true) }
  const handleSave = () => { setShowModal(false); fetchAnnouncements() }

  const live      = announcements.filter(a => !isScheduled(a))
  const scheduled = announcements.filter(a =>  isScheduled(a))

  const applyFilters = (list) => list.filter(a => {
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.body?.toLowerCase().includes(search.toLowerCase())
    const matchCat    = filterCat === 'all' || a.category === filterCat
    return matchSearch && matchCat
  })

  const filteredLive      = applyFilters(live)
  const filteredScheduled = applyFilters(scheduled)
  const pinnedLive        = filteredLive.filter(a => a.pinned)
  const regularLive       = filteredLive.filter(a => !a.pinned)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800">Communication</h1>
          <p className="text-slate-500 text-sm mt-0.5">Announcements, events, and community updates</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/signage?org=maranatha-village" target="_blank"
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

      {/* Scheduled banner */}
      {canPost && filteredScheduled.length > 0 && (
        <button onClick={() => setShowScheduled(s => !s)}
          className="w-full flex items-center justify-between px-4 py-3 mb-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 font-medium hover:bg-amber-100 transition-colors">
          <div className="flex items-center gap-2">
            <Clock size={15} />
            <span>{filteredScheduled.length} scheduled announcement{filteredScheduled.length > 1 ? 's' : ''} waiting to post</span>
          </div>
          <span className="text-xs">{showScheduled ? 'Hide' : 'Show'}</span>
        </button>
      )}

      {showScheduled && filteredScheduled.length > 0 && (
        <div className="mb-6 space-y-3">
          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wide flex items-center gap-2">
            <Clock size={13} /> Scheduled
          </div>
          {filteredScheduled.map(a => (
            <AnnouncementCard key={a.id} item={a}
              canEdit={canEditAll || a.created_by === profile?.id}
              canDelete={canDelete} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading announcements...</div>
      ) : filteredLive.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Megaphone size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-display text-lg">No announcements yet</p>
          {canPost && <p className="text-sm mt-1">Click "New Announcement" to post the first one.</p>}
        </div>
      ) : (
        <div className="space-y-6">
          {pinnedLive.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Pin size={14} className="text-brand-500" />
                <span className="text-xs font-semibold text-brand-600 uppercase tracking-wide">Pinned</span>
              </div>
              <div className="space-y-3">
                {pinnedLive.map(a => (
                  <AnnouncementCard key={a.id} item={a}
                    canEdit={canEditAll || a.created_by === profile?.id}
                    canDelete={canDelete} onEdit={handleEdit} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}
          {regularLive.length > 0 && (
            <div>
              {pinnedLive.length > 0 && <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Recent</div>}
              <div className="space-y-3">
                {regularLive.map(a => (
                  <AnnouncementCard key={a.id} item={a}
                    canEdit={canEditAll || a.created_by === profile?.id}
                    canDelete={canDelete} onEdit={handleEdit} onDelete={handleDelete} />
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
