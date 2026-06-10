import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Bell, Wrench, UtensilsCrossed, Calendar, Church,
  Play, Plus, X, LogOut, ChevronRight, Clock,
  CheckCircle2, AlertCircle, Activity, Send,
  ThumbsUp, ThumbsDown, Save, Home, Radio,
  Maximize, Star, Sun, Coffee, Soup, Cookie,
  MapPin, Heart
} from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────
const relativeTime = (iso) => {
  const diff = (Date.now() - new Date(iso)) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const fmt12 = (t) => {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
}

const extractYouTubeId = (url) => {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : url.length === 11 ? url : null
}

const WO_CATEGORIES = [
  { key: 'plumbing',     label: 'Plumbing',     emoji: '🔧' },
  { key: 'electrical',   label: 'Electrical',   emoji: '⚡' },
  { key: 'hvac',         label: 'HVAC',         emoji: '🌡️' },
  { key: 'appliance',    label: 'Appliance',    emoji: '🏠' },
  { key: 'housekeeping', label: 'Housekeeping', emoji: '🧹' },
  { key: 'general',      label: 'General',      emoji: '🔨' },
  { key: 'pest',         label: 'Pest Control', emoji: '🐛' },
  { key: 'other',        label: 'Other',        emoji: '📋' },
]

const WO_STATUS = {
  open:        { label: 'Submitted',   color: 'text-amber-600',  bg: 'bg-amber-50',  icon: Clock },
  in_progress: { label: 'In Progress', color: 'text-blue-600',   bg: 'bg-blue-50',   icon: Activity },
  on_hold:     { label: 'On Hold',     color: 'text-slate-500',  bg: 'bg-slate-50',  icon: AlertCircle },
  closed:      { label: 'Completed',   color: 'text-green-600',  bg: 'bg-green-50',  icon: CheckCircle2 },
}

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', icon: Coffee,         time: '7–9 AM' },
  { key: 'lunch',     label: 'Lunch',     icon: UtensilsCrossed, time: '11 AM–1 PM' },
  { key: 'dinner',    label: 'Dinner',    icon: Soup,           time: '4:30–6:30 PM' },
  { key: 'snack',     label: 'Snack',     icon: Cookie,         time: 'Anytime' },
]

const MEAL_STATUS = {
  pending:   { label: 'Received',  color: 'text-amber-600',  bg: 'bg-amber-50' },
  preparing: { label: 'Preparing', color: 'text-blue-600',   bg: 'bg-blue-50' },
  delivered: { label: 'Delivered', color: 'text-green-600',  bg: 'bg-green-50' },
  cancelled: { label: 'Cancelled', color: 'text-slate-500',  bg: 'bg-slate-100' },
}

// ── Maintenance Request Modal ─────────────────────────────────
function MaintenanceModal({ resident, profile, orgId, onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', description: '', category: 'general', priority: 'normal' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Please describe the issue'); return }
    setSaving(true)
    const { error: err } = await supabase.from('work_orders').insert({
      organization_id: orgId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      priority: form.priority,
      status: 'open',
      resident_id: resident.id,
      unit: resident.unit || resident.room,
      building: resident.building || null,
      location_detail: `Room ${resident.room || resident.unit}`,
      submitted_by: profile.id,
      submitted_by_name: `${profile.first_name} ${profile.last_name} (Resident)`,
      source: 'resident',
    })
    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-slate-800">Maintenance Request</h2>
            <p className="text-xs text-slate-400 mt-0.5">Room {resident?.room || resident?.unit || 'N/A'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">What needs fixing? <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="e.g. Dripping faucet, light bulb out, heat not working..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {WO_CATEGORIES.map(cat => (
                <button key={cat.key} onClick={() => set('category', cat.key)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${form.category === cat.key ? 'border-brand-500 bg-brand-50' : 'border-slate-100 hover:border-slate-200'}`}>
                  <span className="text-lg leading-none">{cat.emoji}</span>
                  <span className="text-xs text-slate-600 leading-tight text-center">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Urgency</label>
            <div className="flex gap-2">
              {[
                { key: 'low', label: 'Not Urgent', cls: 'border-slate-400 bg-slate-50 text-slate-700' },
                { key: 'normal', label: 'Normal', cls: 'border-amber-400 bg-amber-50 text-amber-700' },
                { key: 'high', label: 'Urgent', cls: 'border-red-400 bg-red-50 text-red-700' },
              ].map(p => (
                <button key={p.key} onClick={() => set('priority', p.key)}
                  className={`flex-1 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${form.priority === p.key ? p.cls : 'border-slate-100 text-slate-400'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Details <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Any extra details that would help maintenance..." rows={3}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
            <AlertCircle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">For emergencies, please call the front desk or press your call button.</p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 font-medium">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
            {saving ? 'Submitting...' : <><Wrench size={14} /> Submit</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Meal Order Modal ──────────────────────────────────────────
function MealOrderModal({ resident, profile, orgId, onClose, onSaved }) {
  const [form, setForm] = useState({ meal_type: 'lunch', items: '', special_requests: '', delivery_time: 'ASAP' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.items.trim()) { setError('Please tell us what you would like to eat'); return }
    setSaving(true)
    const { error: err } = await supabase.from('meal_delivery_orders').insert({
      organization_id: orgId,
      resident_id: resident.id,
      submitted_by: profile.id,
      meal_type: form.meal_type,
      items: form.items.trim(),
      special_requests: form.special_requests.trim() || null,
      delivery_time: form.delivery_time,
      status: 'pending',
    })
    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-slate-800">Order Meal Delivery</h2>
            <p className="text-xs text-slate-400 mt-0.5">Room {resident?.room || resident?.unit || 'N/A'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Meal</label>
            <div className="grid grid-cols-2 gap-2">
              {MEAL_TYPES.map(m => {
                const Icon = m.icon
                return (
                  <button key={m.key} onClick={() => set('meal_type', m.key)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${form.meal_type === m.key ? 'border-brand-500 bg-brand-50' : 'border-slate-100 hover:border-slate-200'}`}>
                    <Icon size={18} className={form.meal_type === m.key ? 'text-brand-600' : 'text-slate-400'} />
                    <div>
                      <div className={`text-sm font-semibold ${form.meal_type === m.key ? 'text-brand-700' : 'text-slate-700'}`}>{m.label}</div>
                      <div className="text-xs text-slate-400">{m.time}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">What would you like? <span className="text-red-500">*</span></label>
            <textarea value={form.items} onChange={e => set('items', e.target.value)}
              placeholder="e.g. Chicken soup, a roll, and orange juice..." rows={3}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Special Requests <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
            <input value={form.special_requests} onChange={e => set('special_requests', e.target.value)}
              placeholder="e.g. No onions, extra napkins, decaf coffee..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Delivery Time</label>
            <div className="flex gap-2">
              {['ASAP', 'In 30 min', 'In 1 hour'].map(t => (
                <button key={t} onClick={() => set('delivery_time', t)}
                  className={`flex-1 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${form.delivery_time === t ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-100 text-slate-500'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-brand-50 border border-brand-100 rounded-xl">
            <UtensilsCrossed size={14} className="text-brand-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-brand-700">Your order will be sent to the kitchen. The dietary team will do their best to accommodate your request.</p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 font-medium">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
            {saving ? 'Placing Order...' : <><Send size={14} /> Place Order</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Dining Preferences Tab ────────────────────────────────────
function DiningTab({ resident, orgId }) {
  const [dietProfile, setDietProfile] = useState(null)
  const [likes, setLikes] = useState('')
  const [dislikes, setDislikes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [orders, setOrders] = useState([])
  const [showOrderModal, setShowOrderModal] = useState(false)
  const { profile, organization } = useAuth()

  useEffect(() => { if (resident) fetchDining() }, [resident])

  async function fetchDining() {
    const [dpRes, ordRes] = await Promise.all([
      supabase.from('resident_dietary_profiles')
        .select('*').eq('resident_id', resident.id).limit(1),
      supabase.from('meal_delivery_orders')
        .select('*').eq('resident_id', resident.id)
        .order('created_at', { ascending: false }).limit(10),
    ])
    if (dpRes.data) {
      setDietProfile(dpRes.data)
      setLikes(dpRes.data.likes || '')
      setDislikes(dpRes.data.dislikes || '')
    }
    setOrders(ordRes.data || [])
  }

  const handleSavePrefs = async () => {
    if (!dietProfile) return
    setSaving(true)
    await supabase.from('resident_dietary_profiles')
      .update({ likes, dislikes, updated_at: new Date().toISOString() })
      .eq('id', dietProfile.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-4">
      {/* Order button */}
      <button onClick={() => setShowOrderModal(true)}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-2xl transition-colors shadow-sm">
        <UtensilsCrossed size={18} /> Order Meal Delivery
      </button>

      {/* Recent orders */}
      {orders.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-5 py-3 border-b border-slate-50">
            <h4 className="font-semibold text-slate-700 text-sm">Recent Orders</h4>
          </div>
          <div className="divide-y divide-slate-50">
            {orders.slice(0, 5).map(o => {
              const st = MEAL_STATUS[o.status] || MEAL_STATUS.pending
              const mt = MEAL_TYPES.find(m => m.key === o.meal_type)
              return (
                <div key={o.id} className="px-5 py-3 flex items-center gap-3">
                  <div className={`w-8 h-8 ${st.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    {mt && <mt.icon size={14} className={st.color} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{o.items}</div>
                    <div className="text-xs text-slate-400">{mt?.label} · {relativeTime(o.created_at)}</div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.color} flex-shrink-0`}>{st.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Food preferences */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="px-5 py-3 border-b border-slate-50">
          <h4 className="font-semibold text-slate-700 text-sm">My Food Preferences</h4>
          <p className="text-xs text-slate-400 mt-0.5">Tell the kitchen what you love and what to avoid</p>
        </div>
        <div className="px-5 py-4 space-y-4">
          {dietProfile ? (
            <>
              {/* Diet type / allergens — read only */}
              {(dietProfile.diet_type || (dietProfile.allergens?.length > 0)) && (
                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-1">
                  {dietProfile.diet_type && (
                    <div><span className="font-semibold">Diet type:</span> <span className="capitalize">{dietProfile.diet_type.replace('_', ' ')}</span></div>
                  )}
                  {dietProfile.consistency && (
                    <div><span className="font-semibold">Texture:</span> <span className="capitalize">{dietProfile.consistency.replace('_', ' ')}</span></div>
                  )}
                  {dietProfile.allergens?.length > 0 && (
                    <div><span className="font-semibold">Allergies:</span> {dietProfile.allergens.join(', ')}</div>
                  )}
                </div>
              )}

              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-green-700 uppercase tracking-wide mb-1.5">
                  <ThumbsUp size={12} /> Foods I Love
                </label>
                <textarea value={likes} onChange={e => setLikes(e.target.value)} rows={3}
                  placeholder="e.g. Chicken soup, apple pie, sweet tea, scrambled eggs..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-red-600 uppercase tracking-wide mb-1.5">
                  <ThumbsDown size={12} /> Foods I Don't Like
                </label>
                <textarea value={dislikes} onChange={e => setDislikes(e.target.value)} rows={3}
                  placeholder="e.g. Liver, Brussels sprouts, spicy food..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
              </div>

              <button onClick={handleSavePrefs} disabled={saving}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  saved ? 'bg-green-500 text-white' : 'bg-brand-600 hover:bg-brand-700 text-white'
                }`}>
                {saved ? <><CheckCircle2 size={14} /> Saved!</> : saving ? 'Saving...' : <><Save size={14} /> Save Preferences</>}
              </button>
            </>
          ) : (
            <div className="text-center py-6 text-slate-400">
              <UtensilsCrossed size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Your dietary profile hasn't been set up yet. Contact the dietary team to get started.</p>
            </div>
          )}
        </div>
      </div>

      {showOrderModal && resident && (
        <MealOrderModal
          resident={resident}
          profile={profile}
          orgId={orgId}
          onClose={() => setShowOrderModal(false)}
          onSaved={() => { setShowOrderModal(false); fetchDining() }}
        />
      )}
    </div>
  )
}

// ── Main Resident Portal ──────────────────────────────────────
export default function ResidentPortal() {
  const { profile, organization, signOut } = useAuth()
  const navigate = useNavigate()

  const [resident, setResident]         = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [activities, setActivities]     = useState([])
  const [chapelServices, setChapelServices] = useState([])
  const [liveService, setLiveService]   = useState(null)
  const [workOrders, setWorkOrders]     = useState([])
  const [loading, setLoading]           = useState(true)
  const [tab, setTab]                   = useState('home')
  const [showWOModal, setShowWOModal]   = useState(false)
  const [openWOs, setOpenWOs]           = useState(0)

  const orgId = organization?.id || profile?.organization_id

  useEffect(() => { if (profile?.id && orgId) fetchAll() }, [profile?.id, orgId])

  async function fetchAll() {
    setLoading(true)
    const now = new Date().toISOString()
    const _today = new Date()
    const todayStr = `${_today.getFullYear()}-${String(_today.getMonth()+1).padStart(2,'0')}-${String(_today.getDate()).padStart(2,'0')}`
    const _next = new Date(Date.now() + 7*24*60*60*1000)
    const nextWeek = `${_next.getFullYear()}-${String(_next.getMonth()+1).padStart(2,'0')}-${String(_next.getDate()).padStart(2,'0')}`

    const [residentRes, annRes, actRes, chapRes, woRes] = await Promise.all([
      // Find resident record linked to this auth user
      supabase.from('residents').select('*')
        .eq('profile_id', profile.id).limit(1),
      supabase.from('announcements').select('*')
        .eq('organization_id', orgId).eq('is_active', true)
        .lte('starts_at', now).or(`expires_at.is.null,expires_at.gte.${now}`)
        .order('pinned', { ascending: false }).order('starts_at', { ascending: false }).limit(15),
      supabase.from('activities').select('*')
        .eq('organization_id', orgId).eq('is_active', true).eq('show_on_portal', true)
        .gte('start_date', todayStr).lte('start_date', nextWeek)
        .order('start_date').order('start_time').limit(20),
      supabase.from('chapel_services').select('*')
        .eq('organization_id', orgId).eq('is_active', true)
        .order('service_date', { ascending: false }).limit(20),
      supabase.from('work_orders').select('id,title,category,status,priority,wo_number,created_at')
        .eq('submitted_by', profile.id).eq('source', 'resident')
        .order('created_at', { ascending: false }).limit(20),
    ])

    setResident(residentRes.data?.[0] || null)
    setAnnouncements(annRes.data || [])
    setActivities(actRes.data || [])

    const svcs = chapRes.data || []
    setChapelServices(svcs)
    setLiveService(svcs.find(s => s.is_live) || null)

    const wos = woRes.data || []
    setWorkOrders(wos)
    setOpenWOs(wos.filter(w => w.status !== 'closed').length)

    setLoading(false)
  }

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  const today = new Date()
  const upcomingChapel = chapelServices
    .filter(s => new Date(s.service_date + 'T12:00:00') >= today)
    .slice(0, 3).reverse()
  const pastChapel = chapelServices
    .filter(s => new Date(s.service_date + 'T12:00:00') < today && s.recording_youtube_id)
    .slice(0, 5)

  const todayActivities = activities.filter(a => a.start_date === todayStr)
  const laterActivities = activities.filter(a => a.start_date !== todayStr)
  const _t2 = new Date()
  const todayStr = `${_t2.getFullYear()}-${String(_t2.getMonth()+1).padStart(2,'0')}-${String(_t2.getDate()).padStart(2,'0')}`

  const TABS = [
    { key: 'home',        label: 'Home',        icon: Home },
    { key: 'maintenance', label: 'Maintenance',  icon: Wrench,         badge: openWOs },
    { key: 'dining',      label: 'Dining',       icon: UtensilsCrossed },
    { key: 'activities',  label: 'Activities',   icon: Calendar },
    { key: 'chapel',      label: 'Chapel',       icon: Church },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
              <Heart size={14} className="text-white fill-white" />
            </div>
            <span className="font-semibold text-slate-800" style={{ fontFamily: '"Playfair Display", serif' }}>ElderLoop</span>
          </div>
          <div className="flex items-center gap-3">
            {organization?.name && <span className="text-xs text-slate-400 hidden sm:block">{organization.name}</span>}
            <button onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100">
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-8">
        {/* Welcome bar */}
        <div className="mt-5 mb-4">
          <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: '"Playfair Display", serif' }}>
            Welcome, {profile?.first_name} 👋
          </h1>
          {resident && (
            <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
              <MapPin size={13} className="text-slate-400" />
              <span>Room {resident.room || resident.unit}</span>
              {liveService && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="flex items-center gap-1 text-red-600 font-medium text-xs">
                    <Radio size={11} className="animate-pulse" /> Chapel is LIVE
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl mb-5 overflow-x-auto no-scrollbar">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all relative ${tab === t.key ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}>
                <Icon size={14} />
                {t.label}
                {t.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center leading-none">
                    {t.badge > 9 ? '9+' : t.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading...</div>
        ) : (
          <>
            {/* ── HOME ── */}
            {tab === 'home' && (
              <div className="space-y-3">
                {/* Quick action cards */}
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <button onClick={() => setShowWOModal(true)}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-left hover:border-brand-200 hover:shadow-md transition-all group">
                    <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
                      <Wrench size={18} className="text-amber-600" />
                    </div>
                    <div className="font-semibold text-slate-800 text-sm">Request Repair</div>
                    <div className="text-xs text-slate-400 mt-0.5">Submit a maintenance request</div>
                  </button>
                  <button onClick={() => setTab('dining')}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-left hover:border-brand-200 hover:shadow-md transition-all group">
                    <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center mb-3">
                      <UtensilsCrossed size={18} className="text-orange-600" />
                    </div>
                    <div className="font-semibold text-slate-800 text-sm">Order Food</div>
                    <div className="text-xs text-slate-400 mt-0.5">Meal delivery to your room</div>
                  </button>
                </div>

                {/* Live chapel banner */}
                {liveService && (
                  <button onClick={() => setTab('chapel')}
                    className="w-full bg-gradient-to-r from-brand-700 to-brand-900 rounded-2xl p-4 text-left flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Radio size={20} className="text-white animate-pulse" />
                    </div>
                    <div className="flex-1 text-white">
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-red-500 text-white font-bold px-2 py-0.5 rounded-full">LIVE</span>
                        <span className="text-sm font-semibold">{liveService.title}</span>
                      </div>
                      <div className="text-xs text-brand-200 mt-0.5">Tap to watch the chapel service</div>
                    </div>
                    <ChevronRight size={16} className="text-brand-300 flex-shrink-0" />
                  </button>
                )}

                {/* Today's activities preview */}
                {todayActivities.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="px-5 py-3 border-b border-slate-50 flex items-center justify-between">
                      <h4 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                        <Sun size={14} className="text-amber-500" /> Today's Activities
                      </h4>
                      <button onClick={() => setTab('activities')} className="text-xs text-brand-600 font-medium">See all</button>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {todayActivities.slice(0, 3).map(a => (
                        <div key={a.id} className="px-5 py-3 flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.color || '#0c90e1' }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-800">{a.title}</div>
                            <div className="text-xs text-slate-400">{a.start_time ? fmt12(a.start_time) : 'All day'}{a.location ? ` · ${a.location}` : ''}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Announcements */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1">Announcements</h4>
                  {announcements.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                      <Bell size={28} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No announcements right now.</p>
                    </div>
                  ) : announcements.map(a => (
                    <div key={a.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                      {a.pinned && (
                        <div className="flex items-center gap-1 text-xs text-amber-600 font-semibold mb-2">
                          <Star size={11} className="fill-amber-500 text-amber-500" /> Pinned
                        </div>
                      )}
                      <div className="font-semibold text-slate-800 text-sm mb-1">{a.title}</div>
                      <p className="text-slate-600 text-sm leading-relaxed">{a.body}</p>
                      <div className="text-xs text-slate-400 mt-2">
                        {new Date(a.starts_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── MAINTENANCE ── */}
            {tab === 'maintenance' && (
              <div className="space-y-4">
                <button onClick={() => setShowWOModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-2xl transition-colors">
                  <Plus size={18} /> New Maintenance Request
                </button>

                {workOrders.length > 0 && (
                  <div className="flex gap-2">
                    <div className="flex-1 bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-amber-700">{openWOs}</div>
                      <div className="text-xs text-amber-600 font-medium">Open</div>
                    </div>
                    <div className="flex-1 bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-green-700">{workOrders.filter(w => w.status === 'closed').length}</div>
                      <div className="text-xs text-green-600 font-medium">Completed</div>
                    </div>
                  </div>
                )}

                {workOrders.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                    <Wrench size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium text-slate-500">No requests yet</p>
                    <p className="text-sm mt-1">Tap above to let us know what needs fixing.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {workOrders.map(wo => {
                      const cfg = WO_STATUS[wo.status] || WO_STATUS.open
                      const Icon = cfg.icon
                      const cat = WO_CATEGORIES.find(c => c.key === wo.category)
                      return (
                        <div key={wo.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-9 h-9 ${cfg.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                              <Icon size={16} className={cfg.color} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium text-slate-800 text-sm truncate">{wo.title}</p>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                                {cat && <span>{cat.emoji} {cat.label}</span>}
                                <span>·</span>
                                <span>{relativeTime(wo.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="p-4 bg-slate-50 rounded-2xl text-xs text-slate-500 text-center">
                  For emergencies, call the front desk or press your call button.
                </div>
              </div>
            )}

            {/* ── DINING ── */}
            {tab === 'dining' && resident && <DiningTab resident={resident} orgId={orgId} />}
            {tab === 'dining' && !resident && (
              <div className="text-center py-16 text-slate-400">
                <UtensilsCrossed size={32} className="mx-auto mb-3 opacity-30" />
                <p>Your resident record hasn't been linked yet. Please contact the front desk.</p>
              </div>
            )}

            {/* ── ACTIVITIES ── */}
            {tab === 'activities' && (
              <div className="space-y-4">
                {activities.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                    <Calendar size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium text-slate-500">No upcoming activities</p>
                    <p className="text-sm mt-1">Check back soon for this week's schedule.</p>
                  </div>
                ) : (
                  <>
                    {todayActivities.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1 mb-2 flex items-center gap-2">
                          <Sun size={12} className="text-amber-500" /> Today
                        </h4>
                        <div className="space-y-2">
                          {todayActivities.map(a => (
                            <div key={a.id} className="bg-white rounded-2xl border-l-4 border-slate-100 shadow-sm p-4"
                              style={{ borderLeftColor: a.color || '#0c90e1' }}>
                              <div className="font-semibold text-slate-800 text-sm">{a.title}</div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {a.start_time ? fmt12(a.start_time) : 'All day'}
                                {a.end_time ? ` – ${fmt12(a.end_time)}` : ''}
                                {a.location ? ` · ${a.location}` : ''}
                              </div>
                              {a.description && <p className="text-xs text-slate-500 mt-1">{a.description}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {laterActivities.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1 mb-2">Coming Up</h4>
                        <div className="space-y-2">
                          {laterActivities.map(a => {
                            const isThisWeek = new Date(a.start_date) <= new Date(Date.now() + 6 * 86400000)
                            return (
                              <div key={a.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: a.color || '#0c90e1' }} />
                                <div className="flex-1">
                                  <div className="font-semibold text-slate-800 text-sm">{a.title}</div>
                                  <div className="text-xs text-slate-400 mt-0.5">
                                    {new Date(a.start_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    {a.start_time ? ` · ${fmt12(a.start_time)}` : ''}
                                    {a.location ? ` · ${a.location}` : ''}
                                  </div>
                                  {a.description && <p className="text-xs text-slate-500 mt-1">{a.description}</p>}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── CHAPEL ── */}
            {tab === 'chapel' && (
              <div className="space-y-4">
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
                        <span className="text-xs bg-red-500 text-white font-bold px-2 py-0.5 rounded-full">LIVE</span>
                        <span className="text-white font-semibold text-sm">{liveService.title}</span>
                      </div>
                      {liveService.description && <p className="text-brand-200 text-xs">{liveService.description}</p>}
                    </div>
                  </div>
                )}

                {upcomingChapel.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="px-5 py-3 border-b border-slate-50">
                      <h4 className="font-semibold text-slate-700 text-sm">Upcoming Services</h4>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {upcomingChapel.map(s => (
                        <div key={s.id} className="px-5 py-3">
                          <div className="font-medium text-slate-800 text-sm">{s.title}</div>
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

                {pastChapel.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="px-5 py-3 border-b border-slate-50">
                      <h4 className="font-semibold text-slate-700 text-sm">Watch Past Services</h4>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {pastChapel.map(s => (
                        <a key={s.id}
                          href={`https://youtube.com/watch?v=${s.recording_youtube_id}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors group">
                          <div>
                            <div className="text-sm text-slate-700 group-hover:text-brand-600 font-medium transition-colors">{s.title}</div>
                            <div className="text-xs text-slate-400">
                              {new Date(s.service_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          </div>
                          <Play size={14} className="text-slate-300 group-hover:text-brand-500 transition-colors flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {!liveService && upcomingChapel.length === 0 && pastChapel.length === 0 && (
                  <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                    <Church size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium text-slate-500">No chapel services scheduled</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Maintenance modal */}
      {showWOModal && resident && (
        <MaintenanceModal
          resident={resident}
          profile={profile}
          orgId={orgId}
          onClose={() => setShowWOModal(false)}
          onSaved={() => { setShowWOModal(false); fetchAll() }}
        />
      )}
      {showWOModal && !resident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <AlertCircle size={32} className="text-amber-500 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-800 mb-2">Account Not Linked</h3>
            <p className="text-sm text-slate-500 mb-4">Your account isn't linked to a resident record yet. Please contact the front desk.</p>
            <button onClick={() => setShowWOModal(false)} className="w-full py-2.5 bg-brand-600 text-white rounded-xl font-medium text-sm">Got It</button>
          </div>
        </div>
      )}
    </div>
  )
}
