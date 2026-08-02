import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { Plus } from 'lucide-react'
import { Field, inputCls, selectCls } from '../ui'
import { SOURCE_CATEGORIES, fmt } from '../constants'

export default function SourcesTab({ orgId, leads }) {
  const [sources, setSources] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'other' })
  const [saving, setSaving] = useState(false)

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('referral_sources').select('*').eq('organization_id', orgId).order('name')
    setSources(data || [])
  }, [orgId])

  useEffect(() => { fetch() }, [fetch])

  const save = async () => {
    if (!form.name) return
    setSaving(true)
    await supabase.from('referral_sources').insert({ ...form, organization_id: orgId })
    setForm({ name: '', category: 'other' })
    setShowForm(false)
    setSaving(false)
    fetch()
  }

  const toggle = async (id, is_active) => {
    await supabase.from('referral_sources').update({ is_active: !is_active }).eq('id', id)
    fetch()
  }

  const sourceStats = (id) => {
    const srcLeads = leads.filter(l => l.referral_source_id === id)
    const tours = srcLeads.filter(l => ['tour_scheduled', 'tour_completed'].includes(l.status)).length
    const moveIns = srcLeads.filter(l => l.status === 'move_in').length
    const conversion = srcLeads.length ? Math.round((moveIns / srcLeads.length) * 100) : null
    return { leadCount: srcLeads.length, tours, moveIns, conversion }
  }

  const sortedSources = [...sources].sort((a, b) => sourceStats(b.id).leadCount - sourceStats(a.id).leadCount)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{sources.length} referral sources configured</p>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={15} /> Add Source
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-end gap-3">
          <Field label="Source Name">
            <input className={inputCls} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Dr. Johnson's Practice" />
          </Field>
          <Field label="Category">
            <select className={selectCls} value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
              {SOURCE_CATEGORIES.map(c => <option key={c} value={c}>{fmt(c)}</option>)}
            </select>
          </Field>
          <button onClick={save} disabled={saving || !form.name}
            className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 whitespace-nowrap">
            {saving ? 'Saving…' : 'Add'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sortedSources.map(s => {
          const stats = sourceStats(s.id)
          return (
            <div key={s.id} className={`p-4 bg-white dark:bg-slate-900 rounded-xl border transition-all ${s.is_active ? 'border-slate-200 dark:border-slate-700' : 'border-slate-100 dark:border-slate-800 opacity-60'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100 text-sm">{s.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{fmt(s.category)}</p>
                </div>
                <button onClick={() => toggle(s.id, s.is_active)}
                  className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${s.is_active ? 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/50 hover:bg-red-50 hover:text-red-500 hover:border-red-200' : 'text-slate-400 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-green-50 hover:text-green-600 hover:border-green-200'}`}>
                  {s.is_active ? 'Active' : 'Inactive'}
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2 mt-3">
                {[
                  { label: 'Leads', value: stats.leadCount },
                  { label: 'Tours', value: stats.tours },
                  { label: 'Move-ins', value: stats.moveIns },
                  { label: 'Convert', value: stats.conversion != null ? `${stats.conversion}%` : '—' },
                ].map(m => (
                  <div key={m.label} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{m.label}</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm mt-0.5">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
