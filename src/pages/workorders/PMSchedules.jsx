import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Plus, X, Edit2, Trash2, Calendar, Clock, Check,
  RefreshCw, AlertTriangle, Play, ChevronRight
} from 'lucide-react'

const FREQ_OPTIONS = [
  { key: 'weekly',    label: 'Weekly',    days: 7   },
  { key: 'monthly',   label: 'Monthly',   days: 30  },
  { key: 'quarterly', label: 'Quarterly', days: 90  },
  { key: 'annual',    label: 'Annual',    days: 365 },
  { key: 'custom',    label: 'Custom',    days: null},
]

const WO_CATEGORIES = [
  'plumbing','electrical','hvac','structural','safety','cleaning',
  'equipment','grounds','it_telecom','inspection','pest_control','other'
]

const fmt = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—'

function PMModal({ schedule, assets, staff, orgId, profile, onClose, onSaved }) {
  const isNew = !schedule
  const [form, setForm] = useState({
    title:          schedule?.title          || '',
    description:    schedule?.description    || '',
    category:       schedule?.category       || 'equipment',
    asset_id:       schedule?.asset_id       || '',
    frequency_type: schedule?.frequency_type || 'monthly',
    frequency_days: schedule?.frequency_days || 30,
    estimated_hours:schedule?.estimated_hours|| '',
    assign_to:      schedule?.assign_to      || '',
    next_due:       schedule?.next_due       || '',
    advance_days:   schedule?.advance_days   || 7,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFreqChange = (key) => {
    const opt = FREQ_OPTIONS.find(f => f.key === key)
    set('frequency_type', key)
    if (opt?.days) set('frequency_days', opt.days)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.next_due) { setError('Title and next due date are required'); return }
    setSaving(true)
    const payload = {
      organization_id: orgId,
      title:           form.title.trim(),
      description:     form.description || null,
      category:        form.category,
      asset_id:        form.asset_id || null,
      frequency_type:  form.frequency_type,
      frequency_days:  form.frequency_days ? parseInt(form.frequency_days) : null,
      estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
      assign_to:       form.assign_to || null,
      next_due:        form.next_due,
      advance_days:    parseInt(form.advance_days) || 7,
      is_active:       true,
    }
    const { error: err } = schedule?.id
      ? await supabase.from('pm_schedules').update(payload).eq('id', schedule.id)
      : await supabase.from('pm_schedules').insert(payload)
    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800">{isNew ? 'New PM Schedule' : 'Edit PM Schedule'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Task Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. HVAC Filter Replacement" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 capitalize">
                {WO_CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.replace('_',' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Linked Asset</label>
              <select value={form.asset_id} onChange={e => set('asset_id', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">No asset</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Frequency</label>
            <div className="flex gap-2 flex-wrap">
              {FREQ_OPTIONS.map(opt => (
                <button key={opt.key} onClick={() => handleFreqChange(opt.key)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${form.frequency_type === opt.key ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-200 text-slate-600 hover:border-brand-300'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
            {form.frequency_type === 'custom' && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-slate-500">Every</span>
                <input type="number" value={form.frequency_days} onChange={e => set('frequency_days', e.target.value)}
                  className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  min="1" placeholder="30" />
                <span className="text-xs text-slate-500">days</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Next Due *</label>
              <input type="date" value={form.next_due} onChange={e => set('next_due', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Advance (days)</label>
              <input type="number" value={form.advance_days} onChange={e => set('advance_days', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="7" min="0" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Est. Hours</label>
              <input type="number" step="0.5" value={form.estimated_hours} onChange={e => set('estimated_hours', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="1.0" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Assign To</label>
            <select value={form.assign_to} onChange={e => set('assign_to', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">Unassigned</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="What needs to be done, special instructions..." />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving...' : isNew ? 'Create Schedule' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PMSchedules({ orgId, profile }) {
  const [schedules, setSchedules] = useState([])
  const [assets, setAssets]       = useState([])
  const [staff, setStaff]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [editSchedule, setEditSchedule] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [generating, setGenerating] = useState(null)

  useEffect(() => { if (orgId) fetchAll() }, [orgId])

  async function fetchAll() {
    setLoading(true)
    const [schRes, assetRes, staffRes] = await Promise.all([
      supabase.from('pm_schedules').select('*, maintenance_assets(name,asset_number), profiles!assign_to(first_name,last_name)')
        .eq('organization_id', orgId).eq('is_active', true).order('next_due'),
      supabase.from('maintenance_assets').select('id,name,asset_number').eq('organization_id', orgId).eq('is_active', true),
      supabase.from('profiles').select('id,first_name,last_name').eq('organization_id', orgId)
        .not('role','in','(resident,family)').order('last_name'),
    ])
    setSchedules(schRes.data || [])
    setAssets(assetRes.data || [])
    setStaff(staffRes.data || [])
    setLoading(false)
  }

  // Generate a work order from a PM schedule
  const generateWO = async (schedule) => {
    setGenerating(schedule.id)
    const { data: wo, error } = await supabase.from('work_orders').insert({
      organization_id: orgId,
      title:           `[PM] ${schedule.title}`,
      description:     schedule.description || `Preventive maintenance task: ${schedule.title}`,
      category:        schedule.category || 'equipment',
      priority:        'medium',
      status:          'open',
      asset_id:        schedule.asset_id || null,
      assigned_to:     schedule.assign_to || null,
      due_date:        schedule.next_due,
      estimated_hours: schedule.estimated_hours || null,
      submitted_by:    profile.id,
    }).select().single()

    if (!error && wo) {
      await supabase.from('wo_activity').insert({
        work_order_id: wo.id,
        user_id: profile.id,
        action: `Work order generated from PM schedule: ${schedule.title}`,
        action_type: 'created',
      })
      // Update last_generated and calculate next_due
      const freqDays = schedule.frequency_days || 30
      const nextDue  = new Date(schedule.next_due + 'T12:00:00')
      nextDue.setDate(nextDue.getDate() + freqDays)
      await supabase.from('pm_schedules').update({
        last_generated: new Date().toISOString().split('T')[0],
        next_due: nextDue.toISOString().split('T')[0],
      }).eq('id', schedule.id)
      fetchAll()
    }
    setGenerating(null)
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const soonStr  = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const overdue  = schedules.filter(s => s.next_due < todayStr).length
  const dueSoon  = schedules.filter(s => s.next_due >= todayStr && s.next_due <= soonStr).length

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display font-semibold text-slate-800">Preventive Maintenance</h2>
          <p className="text-slate-400 text-xs mt-0.5">Recurring maintenance schedules with automatic work order generation</p>
        </div>
        <button onClick={() => { setEditSchedule(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={14} /> New Schedule
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total Schedules', value: schedules.length, color: 'text-brand-600', bg: 'bg-brand-50' },
          { label: 'Overdue',         value: overdue,           color: overdue > 0 ? 'text-red-600' : 'text-slate-400', bg: overdue > 0 ? 'bg-red-50' : 'bg-slate-100' },
          { label: 'Due This Month',  value: dueSoon,           color: dueSoon > 0 ? 'text-amber-600' : 'text-slate-400', bg: dueSoon > 0 ? 'bg-amber-50' : 'bg-slate-100' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
            <div className={`text-3xl font-display font-bold ${s.color}`}>{s.value}</div>
            <div className="text-slate-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400 text-sm">Loading...</div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">
          <RefreshCw size={32} className="mx-auto mb-3 opacity-30" />
          <p>No PM schedules yet. Create your first one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map(s => {
            const isOverdue = s.next_due < todayStr
            const isSoon    = !isOverdue && s.next_due <= soonStr
            const freq      = FREQ_OPTIONS.find(f => f.key === s.frequency_type)
            return (
              <div key={s.id}
                className={`bg-white rounded-2xl border shadow-sm p-4 hover:shadow-md transition-all ${isOverdue ? 'border-red-200' : isSoon ? 'border-amber-200' : 'border-slate-100'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-slate-800">{s.title}</span>
                      {isOverdue && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Overdue</span>}
                      {isSoon && !isOverdue && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Due Soon</span>}
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full capitalize">{freq?.label || s.frequency_type}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1"><Calendar size={11} /> Next due: <strong className={isOverdue ? 'text-red-600' : isSoon ? 'text-amber-600' : 'text-slate-700'}>{fmt(s.next_due)}</strong></span>
                      {s.maintenance_assets && <span>🔧 {s.maintenance_assets.name}</span>}
                      {s.profiles && <span>👤 {s.profiles.first_name} {s.profiles.last_name}</span>}
                      {s.estimated_hours && <span>⏱ {s.estimated_hours}h</span>}
                      {s.last_generated && <span>Last generated: {fmt(s.last_generated)}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => generateWO(s)} disabled={generating === s.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-xs font-medium rounded-lg transition-colors">
                      {generating === s.id ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                      Generate WO
                    </button>
                    <button onClick={() => { setEditSchedule(s); setShowModal(true) }}
                      className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg transition-colors"><Edit2 size={14} /></button>
                    <button onClick={async () => {
                      if (!confirm('Delete this PM schedule?')) return
                      await supabase.from('pm_schedules').update({ is_active: false }).eq('id', s.id)
                      fetchAll()
                    }} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <PMModal schedule={editSchedule} assets={assets} staff={staff} orgId={orgId} profile={profile}
          onClose={() => { setShowModal(false); setEditSchedule(null) }}
          onSaved={() => { setShowModal(false); setEditSchedule(null); fetchAll() }} />
      )}
    </div>
  )
}
