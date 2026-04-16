import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Save, Check, AlertTriangle, Users, Clock } from 'lucide-react'

const PRIORITIES = [
  { key: 'urgent', label: 'Urgent', color: 'text-red-600', desc: 'Safety hazard, resident at risk' },
  { key: 'high',   label: 'High',   color: 'text-orange-600', desc: 'Significant disruption' },
  { key: 'medium', label: 'Medium', color: 'text-amber-600',  desc: 'Normal maintenance request' },
  { key: 'low',    label: 'Low',    color: 'text-slate-500',  desc: 'Routine, can wait' },
]

const WO_CATEGORIES = [
  { key: 'plumbing',     label: 'Plumbing' },
  { key: 'electrical',   label: 'Electrical' },
  { key: 'hvac',         label: 'HVAC' },
  { key: 'structural',   label: 'Structural' },
  { key: 'safety',       label: 'Safety' },
  { key: 'cleaning',     label: 'Cleaning' },
  { key: 'equipment',    label: 'Equipment' },
  { key: 'grounds',      label: 'Grounds' },
  { key: 'it_telecom',   label: 'IT / Telecom' },
  { key: 'inspection',   label: 'Inspection' },
  { key: 'pest_control', label: 'Pest Control' },
  { key: 'other',        label: 'Other' },
]

export default function MaintenanceSettings({ orgId, profile }) {
  const [slaRules, setSlaRules]       = useState({})
  const [autoAssign, setAutoAssign]   = useState({})
  const [staff, setStaff]             = useState([])
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [loading, setLoading]         = useState(true)

  useEffect(() => { if (orgId) fetchAll() }, [orgId])

  async function fetchAll() {
    const [slaRes, aaRes, staffRes] = await Promise.all([
      supabase.from('wo_sla_rules').select('*').eq('organization_id', orgId),
      supabase.from('wo_auto_assign_rules').select('*').eq('organization_id', orgId).eq('is_active', true),
      supabase.from('profiles').select('id,first_name,last_name,department')
        .eq('organization_id', orgId).not('role','in','(resident,family)').order('last_name'),
    ])
    // Build SLA map
    const sla = {}
    slaRes.data?.forEach(r => { sla[r.priority] = { response_hours: r.response_hours, completion_hours: r.completion_hours, id: r.id } })
    // Defaults if missing
    PRIORITIES.forEach(p => {
      if (!sla[p.key]) {
        sla[p.key] = { response_hours: p.key === 'urgent' ? 1 : p.key === 'high' ? 4 : p.key === 'medium' ? 24 : 48,
                       completion_hours: p.key === 'urgent' ? 4 : p.key === 'high' ? 24 : p.key === 'medium' ? 72 : 168 }
      }
    })
    setSlaRules(sla)

    const aa = {}
    aaRes.data?.forEach(r => { aa[r.category] = { assign_to: r.assign_to, id: r.id } })
    setAutoAssign(aa)
    setStaff(staffRes.data || [])
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    // Upsert SLA rules
    for (const priority of PRIORITIES) {
      const rule = slaRules[priority.key]
      if (!rule) continue
      if (rule.id) {
        await supabase.from('wo_sla_rules').update({
          response_hours: parseInt(rule.response_hours),
          completion_hours: parseInt(rule.completion_hours),
        }).eq('id', rule.id)
      } else {
        const { data } = await supabase.from('wo_sla_rules').insert({
          organization_id: orgId,
          priority: priority.key,
          response_hours: parseInt(rule.response_hours),
          completion_hours: parseInt(rule.completion_hours),
        }).select().single()
        if (data) setSlaRules(s => ({ ...s, [priority.key]: { ...s[priority.key], id: data.id } }))
      }
    }
    // Upsert auto-assign rules
    for (const cat of WO_CATEGORIES) {
      const rule = autoAssign[cat.key]
      const staffId = rule?.assign_to || null
      if (rule?.id) {
        await supabase.from('wo_auto_assign_rules').update({ assign_to: staffId }).eq('id', rule.id)
      } else if (staffId) {
        const { data } = await supabase.from('wo_auto_assign_rules').insert({
          organization_id: orgId, category: cat.key, assign_to: staffId, is_active: true,
        }).select().single()
        if (data) setAutoAssign(a => ({ ...a, [cat.key]: { ...a[cat.key], id: data.id } }))
      }
    }
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="text-center py-10 text-slate-400 text-sm">Loading settings...</div>

  return (
    <div className="max-w-3xl space-y-8">
      {/* SLA Rules */}
      <div>
        <div className="mb-4">
          <h2 className="font-display font-semibold text-slate-800 flex items-center gap-2">
            <Clock size={16} className="text-brand-600" /> SLA Response Times
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">Set target response and completion times per priority level. Work orders that breach these targets are flagged.</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="grid grid-cols-4 gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <span>Priority</span><span>Response Target</span><span>Completion Target</span><span>Notes</span>
          </div>
          {PRIORITIES.map(p => {
            const rule = slaRules[p.key] || {}
            return (
              <div key={p.key} className="grid grid-cols-4 gap-4 items-center px-5 py-4 border-b border-slate-50 last:border-0">
                <div>
                  <div className={`font-semibold text-sm ${p.color}`}>{p.label}</div>
                  <div className="text-xs text-slate-400">{p.desc}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <input type="number" value={rule.response_hours || ''}
                    onChange={e => setSlaRules(s => ({ ...s, [p.key]: { ...s[p.key], response_hours: e.target.value } }))}
                    className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
                    min="0" placeholder="4" />
                  <span className="text-xs text-slate-400">hours</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input type="number" value={rule.completion_hours || ''}
                    onChange={e => setSlaRules(s => ({ ...s, [p.key]: { ...s[p.key], completion_hours: e.target.value } }))}
                    className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
                    min="0" placeholder="24" />
                  <span className="text-xs text-slate-400">hours</span>
                </div>
                <div className="text-xs text-slate-400">
                  {rule.completion_hours ? `${Math.floor(rule.completion_hours / 24) > 0 ? Math.floor(rule.completion_hours / 24) + 'd ' : ''}${rule.completion_hours % 24 > 0 ? rule.completion_hours % 24 + 'h' : ''}` : ''}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Auto-assign rules */}
      <div>
        <div className="mb-4">
          <h2 className="font-display font-semibold text-slate-800 flex items-center gap-2">
            <Users size={16} className="text-brand-600" /> Auto-Assignment Rules
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">Automatically assign new work orders to a staff member based on category. Override is always possible on individual work orders.</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="grid grid-cols-2 gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <span>Category</span><span>Auto-Assign To</span>
          </div>
          {WO_CATEGORIES.map(cat => {
            const rule = autoAssign[cat.key] || {}
            return (
              <div key={cat.key} className="grid grid-cols-2 gap-4 items-center px-5 py-3 border-b border-slate-50 last:border-0">
                <div className="text-sm font-medium text-slate-700">{cat.label}</div>
                <select value={rule.assign_to || ''}
                  onChange={e => setAutoAssign(a => ({ ...a, [cat.key]: { ...a[cat.key], assign_to: e.target.value || null } }))}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">No auto-assign</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                </select>
              </div>
            )
          })}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white font-medium rounded-xl transition-colors">
        {saved ? <><Check size={16} /> Saved!</> : saving ? 'Saving...' : <><Save size={16} /> Save Settings</>}
      </button>
    </div>
  )
}
